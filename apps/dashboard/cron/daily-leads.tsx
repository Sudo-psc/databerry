import pMap from 'p-map';
import React from 'react';

import { DailyLeads, render } from '@chaindesk/emails';
import dotenv from 'dotenv';
import { generateExcelBuffer } from '@chaindesk/lib/export/excel-export';
import logger from '@chaindesk/lib/logger';
import nodemailer from 'nodemailer';
import { Lead, Organization, Prisma } from '@chaindesk/prisma';
import { prisma } from '@chaindesk/prisma/client';

const createReport = async (org: Organization) => {
  const now = new Date();
  const ystd = new Date();
  ystd.setDate(now.getDate() - 1);

  const leads = await prisma.lead.findMany({
    where: {
      organizationId: org.id,
      createdAt: {
        gte: ystd,
        lte: now,
      },
    },
    include: {
      agent: {
        select: {
          name: true,
        },
      },
    },
  });

  const ownerEmail = (org as any).memberships[0].user.email as string;
  if (leads?.length <= 0 && ownerEmail) {
    return;
  }

  const header = ['id', 'agent', 'email', 'created_at'];

  const rows = leads.map((each) => [
    each.id,
    each?.agent?.name || '',
    each.email,
    // each.name,
    // each.phone,
    each.createdAt,
  ]);

  const buffer = await generateExcelBuffer<Lead>({ header, rows });

  dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

await transporter.sendMail({
    from: {
      name: 'Chaindesk',
      address: process.env.EMAIL_FROM!,
    },
    to: ownerEmail,
    subject: `🎯 Your Daily Leads`,
    attachments: [
      {
        filename: 'leads.csv',
        content: buffer as Buffer,
      },
    ],
    html: render(
      <DailyLeads
        nbLeads={rows?.length}
        ctaLink={`${process.env.NEXT_PUBLIC_DASHBOARD_URL}/logs`}
      />
    ),
  });
};

(async () => {
  logger.info('Starting cron job: daily-leads');
  const orgs = await prisma.organization.findMany({
    where: {
      subscriptions: {
        some: {
          status: 'active',
        },
      },
    },
    include: {
      memberships: {
        where: {
          role: 'OWNER',
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  logger.info(`Found ${orgs.length} organizations`);

  await pMap(orgs, createReport, {
    concurrency: 1,
  });

  logger.info(`Finished cron job: daily-leads`);
})();
