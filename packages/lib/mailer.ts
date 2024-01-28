import nodemailer from 'nodemailer';
import { createTransport } from 'nodemailer';

const mailer = nodemailer.createTransport(process.env.EMAIL_SERVER);

export default mailer;
