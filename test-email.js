// Test email from Render credentials
const nodemailer = require('nodemailer');

const EMAIL_USER = 'davidrodrillejas40@gmail.com';
const EMAIL_PASS = 'ictz vhbd enrx uhvh';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

async function test() {
    console.log('Testing email configuration...');
    try {
        await transporter.verify();
        console.log('✅ Email transport verified - credentials work!');
        
        // Send a real test email
        await transporter.sendMail({
            from: `"BancoUM Test" <${EMAIL_USER}>`,
            to: EMAIL_USER, // send to self
            subject: 'BancoUM - Test Email from Render',
            html: '<h1>✅ Email working from Render!</h1><p>This test confirms the nodemailer transport is correctly configured.</p>'
        });
        console.log('✅ Test email sent to', EMAIL_USER);
    } catch (err) {
        console.error('❌ Email error:', err.message);
        console.error('Full error:', err);
    }
}

test();
