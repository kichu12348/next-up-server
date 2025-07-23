import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SEND_GRID_API_KEY || '');

const FROM_EMAIL = process.env.SENDING_EMAIL || 'no-reply@example.com';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const msg = {
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject,
      html: options.html,
    };

    await sgMail.send(msg);
    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};

export const sendOTPEmail = async (to: string, otp: string): Promise<void> => {
  const subject = '🔐 Your Admin Login OTP';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">Admin Login OTP</h2>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <h1 style="color: #007bff; font-size: 2.5em; margin: 0; letter-spacing: 0.2em;">${otp}</h1>
      </div>
      <p style="color: #666; text-align: center;">This OTP will expire in 10 minutes.</p>
      <p style="color: #666; text-align: center; font-size: 0.9em;">If you didn't request this OTP, please ignore this email.</p>
    </div>
  `;

  await sendEmail({ to, subject, html });
};

export const sendParticipantOTPEmail = async (to: string, otp: string): Promise<void> => {
  const subject = '🔐 Your NextUp Login Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">NextUp Login Code</h2>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <h1 style="color: #007bff; font-size: 2.5em; margin: 0; letter-spacing: 0.2em;">${otp}</h1>
      </div>
      <p style="color: #666; text-align: center;">This code will expire in 5 minutes.</p>
      <p style="color: #666; text-align: center; font-size: 0.9em;">Enter this code to access your dashboard and submit tasks.</p>
      <p style="color: #666; text-align: center; font-size: 0.9em;">If you didn't request this code, please ignore this email.</p>
    </div>
  `;

  await sendEmail({ to, subject, html });
};

export const sendSubmissionApprovedEmail = async (
  to: string,
  name: string,
  taskName: string,
  points: number,
  note?: string
): Promise<void> => {
  const subject = '✅ Your Task Has Been Approved!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #28a745; text-align: center;">🎉 Congratulations ${name}!</h2>
      <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
        <h3 style="color: #155724; margin-top: 0;">Your submission has been approved!</h3>
        <p style="color: #155724; margin: 10px 0;"><strong>Task:</strong> ${taskName}</p>
        <p style="color: #155724; margin: 10px 0;"><strong>Points Awarded:</strong> ${points}</p>
        ${note ? `<p style="color: #155724; margin: 10px 0;"><strong>Admin Note:</strong> ${note}</p>` : ''}
      </div>
      <p style="color: #666; text-align: center;">Keep up the great work! Check the leaderboard to see your progress.</p>
    </div>
  `;

  await sendEmail({ to, subject, html });
};

export const sendSubmissionRejectedEmail = async (
  to: string,
  name: string,
  taskName: string,
  note?: string
): Promise<void> => {
  const subject = '❌ Task Submission Update';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc3545; text-align: center;">Task Submission Update</h2>
      <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545; margin: 20px 0;">
        <h3 style="color: #721c24; margin-top: 0;">Hi ${name},</h3>
        <p style="color: #721c24; margin: 10px 0;">Unfortunately, your submission for <strong>${taskName}</strong> could not be approved at this time.</p>
        ${note ? `<p style="color: #721c24; margin: 10px 0;"><strong>Feedback:</strong> ${note}</p>` : ''}
      </div>
    </div>
  `;

  await sendEmail({ to, subject, html });
};
