import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

export const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'OTP Validation For LEGALBOT',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: left; padding: 20px;">
        <p>Hello,</p>
        <br>
        <p><strong>${otp}</strong> is your OTP to verify your email.</p>
        <p>OTP will expire in 10 minutes. On expiry of time, please regenerate the OTP.</p>
        <br>
        <p>Best Regards,<br>LEGALBOT Support</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}


export const sendOtpEmailResetPassword = async (email, otp) => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'OTP Validation For LEGALBOT',
    html: `
    <div style="font-family: Arial, sans-serif; text-align: left; padding: 20px;">
      <p>Hello,</p>
      <br>
      <p><strong>${otp}</strong> is your OTP to reset your password.</p>
      <p>OTP will expire in 10 minutes. On expiry of time, please regenerate the OTP.</p>
      <br>
      <p>Best Regards,<br>LEGALBOT Support</p>
    </div>
  `
  };

  await transporter.sendMail(mailOptions);
}

