import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

const getTransporter = () => {
  if (!env.smtp.user || !env.smtp.pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: false,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
};

export const sendEmail = async ({ to, subject, html }) => {
  const transport = getTransporter();
  if (!transport) {
    console.log('Email skipped (SMTP not configured):', subject);
    return false;
  }
  await transport.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html,
  });
  return true;
};

export const notifyPaymentStatus = async (student, payment, status) => {
  const userEmail = student.user?.email;
  if (!userEmail) return;
  await sendEmail({
    to: userEmail,
    subject: `Payment ${status} - ${env.academyName}`,
    html: `<p>Hello ${student.fullName},</p><p>Your payment for ${payment.month} ${payment.year} has been <strong>${status}</strong>.</p>`,
  });
};
