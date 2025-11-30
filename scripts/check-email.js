const nodemailer = require('nodemailer');
require('dotenv').config();

async function checkEmailConfig() {
    console.log('--- Email Configuration Check ---');

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    console.log(`GMAIL_USER: ${user ? 'Set' : 'Missing'}`);
    console.log(`GMAIL_APP_PASSWORD: ${pass ? 'Set' : 'Missing'}`);

    if (!user || !pass) {
        console.error('❌ Missing email configuration. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
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
