import nodemailer from 'nodemailer';

if (!process.env.EMAIL_SERVER) {
  throw new Error('The EMAIL_SERVER environment variable is not set.');
}
const mailer = nodemailer.createTransport(process.env.EMAIL_SERVER);

export default mailer;
