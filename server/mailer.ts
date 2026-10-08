import nodemailer, { Transporter } from 'nodemailer';
import { db } from './db';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function isSmtpConfigured(): boolean {
  const settings = db.getSettings();
  const smtp = settings.smtp;
  if (smtp && smtp.user && smtp.pass && smtp.user.trim() && smtp.pass.trim()) return true;
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return true;
  return false;
}

export async function sendEmail(options: MailOptions): Promise<{ success: boolean; isDemo?: boolean; messageId?: string; error?: string }> {
  try {
    const settings = db.getSettings();
    const smtp = settings.smtp;

    let transporter: Transporter;
    let isDemo = false;

    if (smtp && smtp.user && smtp.pass && smtp.user.trim() && smtp.pass.trim()) {
      const cleanUser = smtp.user.trim();
      const cleanPass = smtp.pass.replace(/\s+/g, ''); // Remove spaces from 16-char App Password!
      const isGmail = (smtp.host && smtp.host.includes('gmail')) || cleanUser.includes('@gmail.com');

      if (isGmail) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: cleanUser,
            pass: cleanPass,
          },
        });
      } else {
        transporter = nodemailer.createTransport({
          host: smtp.host || 'smtp.gmail.com',
          port: smtp.port || 587,
          secure: smtp.secure !== undefined ? smtp.secure : (smtp.port === 465),
          auth: {
            user: cleanUser,
            pass: cleanPass,
          },
        });
      }
    } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const cleanUser = process.env.SMTP_USER.trim();
      const cleanPass = process.env.SMTP_PASS.replace(/\s+/g, '');
      const isGmail = (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail')) || cleanUser.includes('@gmail.com');

      if (isGmail) {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: cleanUser,
            pass: cleanPass,
          },
        });
      } else {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
          secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
          auth: {
            user: cleanUser,
            pass: cleanPass,
          },
        });
      }
    } else {
      isDemo = true;
      transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      console.log(`[SMTP NOTICE: Not configured in Admin Panel yet] Code to: ${options.to}`);
    }

    const fromAddress = smtp?.from || smtp?.user || process.env.SMTP_FROM || process.env.SMTP_USER || '"FBStore" <noreply@fbstore.com>';

    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log(`Email dispatched to ${options.to} (MessageId: ${info.messageId || 'stream'}, isDemo: ${isDemo})`);
    return { success: true, isDemo, messageId: info.messageId };
  } catch (err: any) {
    console.error(`Failed to send email to ${options.to}:`, err.message || err);
    return { success: false, error: err.message || 'Email delivery failed' };
  }
}

export async function testSmtp(targetEmail?: string, customSmtp?: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const settings = db.getSettings();
    const smtp = customSmtp || settings.smtp;

    if (!smtp || !smtp.user || !smtp.pass || !smtp.user.trim() || !smtp.pass.trim()) {
      return { 
        success: false, 
        error: 'SMTP Sender Email and Password are required. Please enter your Gmail address and 16-character Google App Password in the fields above.' 
      };
    }

    const cleanUser = smtp.user.trim();
    const cleanPass = smtp.pass.replace(/\s+/g, '');
    const isGmail = (smtp.host && smtp.host.includes('gmail')) || cleanUser.includes('@gmail.com');

    let transporter: Transporter;
    if (isGmail) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: cleanUser,
          pass: cleanPass,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: smtp.host || 'smtp.gmail.com',
        port: smtp.port ? parseInt(String(smtp.port), 10) : 587,
        secure: smtp.secure !== undefined ? smtp.secure : (Number(smtp.port) === 465),
        auth: {
          user: cleanUser,
          pass: cleanPass,
        },
      });
    }

    // Verify SMTP connection handshake
    await transporter.verify();

    const recipient = (targetEmail && targetEmail.trim()) || cleanUser;

    const info = await transporter.sendMail({
      from: smtp.from || cleanUser,
      to: recipient,
      subject: 'FBStore - SMTP Connection Test Succeeded!',
      text: `Hello!\n\nYour SMTP email settings for FBStore are working perfectly.\n6-digit verification OTP codes and password reset codes will now be delivered directly to real user inboxes.\n\nSender: ${cleanUser}\nRecipient: ${recipient}\nTimestamp: ${new Date().toLocaleString()}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="background: #10b981; padding: 24px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 22px;">✅ SMTP Connection Verified</h2>
            <p style="margin: 6px 0 0; opacity: 0.9; font-size: 13px;">FBStore Email Service is Live</p>
          </div>
          <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
            <p style="margin-top: 0;">Congratulations! Your SMTP configuration is verified and fully operational.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 12px; margin: 16px 0;">
              <div><strong>Sender Account:</strong> ${cleanUser}</div>
              <div><strong>Recipient:</strong> ${recipient}</div>
              <div><strong>Service:</strong> ${isGmail ? 'Google Gmail (App Password)' : (smtp.host || 'Custom SMTP')}</div>
              <div><strong>Status:</strong> Active & Ready for OTPs</div>
            </div>
            <p style="margin-bottom: 0; font-size: 12px; color: #64748b;">
              All registration verification codes and password recovery codes will now be sent directly to customer inboxes in real-time.
            </p>
          </div>
        </div>
      `,
    });

    return { 
      success: true, 
      message: `Test email successfully sent to ${recipient}! Message ID: ${info.messageId || 'ok'}. Real OTP emails will now arrive in inboxes.` 
    };
  } catch (err: any) {
    console.error('SMTP test connection failed:', err);
    let msg = err.message || 'SMTP connection failed';
    if (msg.includes('Invalid login') || msg.includes('BadCredentials') || msg.includes('Username and Password not accepted') || msg.includes('535-5.7.8')) {
      msg = 'Gmail Authentication Failed: Google requires a 16-character "App Password", not your normal Google account password. Go to Google Account > Security > 2-Step Verification > App passwords to generate one.';
    }
    return { success: false, error: msg };
  }
}

export async function sendOtpEmail(toEmail: string, username: string, otp: string): Promise<{ success: boolean; isDemo?: boolean; messageId?: string; error?: string }> {
  const subject = `FBStore - Your 6-Digit Verification Code: ${otp}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #1877F2; padding: 30px 24px; text-align: center; color: #ffffff; }
        .logo { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
        .logo span { color: #dbeafe; }
        .content { padding: 32px 24px; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .text { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { background: #f0f7ff; border: 2px dashed #1877F2; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1877F2; font-family: 'Courier New', Courier, monospace; }
        .expiry { font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 500; }
        .warning { font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 20px; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">FB<span>Store</span></div>
          <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Email Verification Code</div>
        </div>
        <div class="content">
          <div class="title">Hello @${username},</div>
          <div class="text">
            Thank you for registering at <strong>FBStore</strong>. Please enter the 6-digit verification code below to verify your email address and activate your account.
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="expiry">Valid for 15 minutes</div>
          </div>
          <div class="text">
            If you did not initiate this request, you can safely ignore this email.
          </div>
          <div class="warning">
            Security note: Never share this verification code with anyone. FBStore staff will never ask for your code.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} FBStore • Facebook Accounts Marketplace
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello @${username},\n\nYour 6-digit FBStore verification code is: ${otp}\n\nThis code will expire in 15 minutes.\n\nNever share this code with anyone.\n\nFBStore Team`;

  return sendEmail({ to: toEmail, subject, html, text });
}

export async function sendPasswordResetEmail(toEmail: string, username: string, otp: string): Promise<{ success: boolean; isDemo?: boolean; messageId?: string; error?: string }> {
  const subject = `FBStore - Password Reset Code: ${otp}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #0f172a; padding: 30px 24px; text-align: center; color: #ffffff; }
        .logo { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
        .logo span { color: #1877F2; }
        .content { padding: 32px 24px; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .text { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { background: #eff6ff; border: 2px dashed #2563eb; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2563eb; font-family: 'Courier New', Courier, monospace; }
        .expiry { font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 500; }
        .warning { font-size: 12px; color: #dc2626; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 20px; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">FB<span>Store</span></div>
          <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Password Reset Request</div>
        </div>
        <div class="content">
          <div class="title">Hello @${username},</div>
          <div class="text">
            We received a request to reset the password for your <strong>FBStore</strong> account. Use the 6-digit code below to set your new password.
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="expiry">Valid for 15 minutes</div>
          </div>
          <div class="text">
            If you did not request a password reset, please change your credentials immediately or contact support.
          </div>
          <div class="warning">
            Security note: Do not share this code with anyone. FBStore staff will never ask for your password reset code.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} FBStore • Facebook Accounts Marketplace
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello @${username},\n\nWe received a request to reset your password on FBStore.\n\nYour 6-digit Reset Code is: ${otp}\n\nThis code will expire in 15 minutes.\n\nFBStore Team`;

  return sendEmail({ to: toEmail, subject, html, text });
}
