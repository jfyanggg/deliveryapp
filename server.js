require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/order', async (req, res) => {
  try {
    const { service, type, storeLabel, storeName, storeAddress, apartment, customerName, customerPhone, items, notes } = req.body;

    if (!storeName || !storeAddress || !apartment || !customerName || !customerPhone) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }

    const subject = `🚨 New Order — ${customerName} | ${type} from ${storeName}`;

    const html = `
      <div style="font-family: -apple-system, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #FF6B2B; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">🛵 New Order Received</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr><td style="padding: 10px 0; color: #888; width: 140px;">Service</td><td style="padding: 10px 0; font-weight: 600;">${service}</td></tr>
            <tr><td style="padding: 10px 0; color: #888;">Type</td><td style="padding: 10px 0; font-weight: 600;">${type}</td></tr>
            <tr style="background: #FFF8F4;"><td style="padding: 10px; color: #888;">${storeLabel}</td><td style="padding: 10px; font-weight: 600;">${storeName}</td></tr>
            <tr><td style="padding: 10px 0; color: #888;">${storeLabel} Address</td><td style="padding: 10px 0;">${storeAddress}</td></tr>
            <tr style="background: #FFF8F4;"><td style="padding: 10px; color: #888;">Deliver To</td><td style="padding: 10px; font-weight: 600;">AVA Arts District, Apt ${apartment}</td></tr>
            <tr><td style="padding: 10px 0; color: #888;">Customer</td><td style="padding: 10px 0; font-weight: 600;">${customerName}</td></tr>
            <tr style="background: #FFF8F4;"><td style="padding: 10px; color: #888;">Phone</td><td style="padding: 10px;"><a href="tel:${customerPhone}" style="color: #FF6B2B; font-weight: 600; text-decoration: none;">${customerPhone}</a></td></tr>
            ${items ? `<tr><td colspan="2" style="padding: 16px 0 6px; color: #888; font-size: 13px; text-transform: uppercase;">📋 Order Items</td></tr><tr><td colspan="2" style="padding: 12px 14px; background: #FFFDF5; border: 1px solid #F0E8D8; border-radius: 8px; white-space: pre-wrap; line-height: 1.7;">${items}</td></tr>` : ''}
            ${notes ? `<tr><td colspan="2" style="padding: 16px 0 6px; color: #888; font-size: 13px; text-transform: uppercase;">📝 Notes</td></tr><tr><td colspan="2" style="padding: 12px 14px; background: #F5F5F5; border-radius: 8px; font-style: italic;">${notes}</td></tr>` : ''}
          </table>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 13px; color: #aaa; text-align: center; margin: 0;">PickUp.Shop.Deliver. — Order received at ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}</p>
        </div>
      </div>`;

    let text = `NEW ORDER — PickUp.Shop.Deliver.\nService: ${service}\nType: ${type}\n${storeLabel}: ${storeName}\nAddress: ${storeAddress}\nDeliver to: AVA Arts District, Apt ${apartment}\nCustomer: ${customerName}\nPhone: ${customerPhone}`;
    if (items) text += `\nOrder:\n${items}`;
    if (notes) text += `\nNotes: ${notes}`;

    const { data, error } = await resend.emails.send({
      from: 'PickUp.Shop.Deliver. <onboarding@resend.dev>',
      to: process.env.NOTIFICATION_EMAIL,
      subject: subject,
      text: text,
      html: html
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return res.status(500).json({ success: false, error: 'Failed to send order. Please call us directly.' });
    }

    console.log(`✅ Order email sent — ${customerName} | ${storeName} (ID: ${data.id})`);
    res.json({ success: true, message: "Order received! We'll reach out shortly." });

  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send order. Please call us directly.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🛵 PickUp.Shop.Deliver. server running on http://localhost:${PORT}`);
  console.log(`   Orders will be emailed to: ${process.env.NOTIFICATION_EMAIL}\n`);
});
