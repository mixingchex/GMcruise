require('dotenv').config();

console.log('--- Email Config for Vercel ---');
console.log('EMAIL_SMTP_USER=' + (process.env.EMAIL_SMTP_USER || process.env.SMTP_USER || process.env.GMAIL_USER || 'Not Set'));
console.log('EMAIL_SMTP_PASSWORD=' + (process.env.EMAIL_SMTP_PASSWORD || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || 'Not Set'));
console.log('-------------------------------');
