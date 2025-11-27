import * as nodemailer from 'nodemailer';
import { Logger } from './logger';
import { loadConfigFromEnv } from './config';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  const config = loadConfigFromEnv();

  if (config.smtp) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user
        ? {
            user: config.smtp.user,
            pass: config.smtp.pass,
          }
        : undefined,
    });
    Logger.info(`SMTP configured: ${config.smtp.host}:${config.smtp.port}`);
  } else {
    // Fallback to Ethereal for development if no SMTP config
    Logger.warn('No SMTP configuration found. Using Ethereal Email for testing.');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    Logger.info(`Ethereal Email configured: ${testAccount.user}`);
  }

  return transporter;
};

export const sendVerificationEmail = async (
  to: string,
  token: string,
): Promise<boolean> => {
  try {
    const mailTransporter = await getTransporter();
    const config = loadConfigFromEnv();
    const from = config.smtp?.from || '"SuperSync" <noreply@example.com>';

    const verificationLink = `${config.publicUrl}/verify-email?token=${token}`;

    const info = await mailTransporter.sendMail({
      from,
      to,
      subject: 'Verify your SuperSync account',
      text: `Please verify your account by clicking the following link: ${verificationLink}\n\nToken: ${token}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to SuperSync!</h2>
          <p>Please verify your account by clicking the button below:</p>
          <a
            href="${verificationLink}"
            style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;"
          >
            Verify Email
          </a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; color: #666;">${verificationLink}</p>
          <p style="font-size: 12px; color: #666;">Token: ${token}</p>
        </div>
      `,
    });

    Logger.info(`Verification email sent to ${to}: ${info.messageId}`);

    // If using Ethereal, log the preview URL
    if (nodemailer.getTestMessageUrl(info)) {
      Logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return true;
  } catch (err) {
    Logger.error('Failed to send verification email:', err);
    return false;
  }
};
