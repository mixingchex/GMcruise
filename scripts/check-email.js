```
const nodemailer = require('nodemailer');
require('dotenv').config();

async function checkEmailConfig() {
  console.log('--- Email Configuration Check ---');
  
  // Check for variables used in lib/affiliate/contract-email.ts
  const host = process.env.EMAIL_SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_SMTP_PORT || process.env.SMTP_PORT || '587');
  const user = process.env.EMAIL_SMTP_USER || process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.EMAIL_SMTP_PASSWORD || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  
  console.log(`SMTP Host: ${ host } `);
  console.log(`SMTP Port: ${ port } `);
  console.log(`SMTP User: ${ user ? 'Set' : 'Missing' } (${ user })`);
  console.log(`SMTP Password: ${ pass ? 'Set' : 'Missing' } `);
  
  if (!user || !pass) {
    console.error('❌ Missing email configuration.');
    console.error('Please set EMAIL_SMTP_USER and EMAIL_SMTP_PASSWORD in .env');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP Connection Successful!');
  } catch (error) {
    console.error('❌ SMTP Connection Failed:', error);
  }
}

checkEmailConfig();
```
