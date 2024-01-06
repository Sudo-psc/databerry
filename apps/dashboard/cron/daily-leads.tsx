import pMap from 'p-map';
import React from 'react';

import { DailyLeads, render } from '@chaindesk/emails';
import { generateExcelBuffer } from '@chaindesk/lib/export/excel-export';
import logger from '@chaindesk/lib/logger';
const transporter = nodemailer.createTransport(
  {
    service: 'gmail',
    auth: {
      user: 'user@gmail.com',
      pass: 'password'
    }
  }
);
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

  await mailer.sendMail({
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
