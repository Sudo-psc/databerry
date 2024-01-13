import nodemailer from 'nodemailer';

const mailer = nodemailer.createTransport({
  // Configure the transporter options here
});

export default mailer;
