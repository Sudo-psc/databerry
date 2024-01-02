import nodemailer from 'nodemailer';

if (!process.env.EMAIL_SERVER || process.env.EMAIL_SERVER.trim() === '') {
  throw new Error('The EMAIL_SERVER environment variable is not set or is an empty string');
}
const mailer = nodemailer.createTransport(process.env.EMAIL_SERVER);

export default mailer;
