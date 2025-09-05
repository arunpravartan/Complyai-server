const Imap = require('imap');
const { simpleParser } = require('mailparser');
const axios = require('axios');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// const app = express();
// app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3000;

const attachmentsDir = path.join(__dirname, 'attachments');
if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir, { recursive: true });

// Webhook receiver (for local testing)
// app.post('/email-event', (req, res) => {
//     const { attachments, ...emailData } = req.body;

//     console.log('📨 Webhook Event Received:', emailData);
  
//     if (attachments && Array.isArray(attachments)) {
//       attachments.forEach((att, index) => {
//         // att should have { filename, content } (base64 string)
//         const fileName = `${Date.now()}_${att.filename || `attachment_${index}`}`;
//         const filePath = path.join(attachmentsDir, fileName);
  
//         // Save base64 content to file
//         const buffer = Buffer.from(att.content, 'base64');
//         fs.writeFileSync(filePath, buffer);
  
//         console.log(`✅ Saved attachment: ${filePath}`);
//       });
//     }
  
//     res.sendStatus(200);
// });

// app.listen(PORT, () => console.log(`🚀 Webhook server listening on port ${PORT}`));

const imap = new Imap({
  user: process.env.EMAIL,
  password: process.env.PASSWORD,
  host: process.env.IMAP_HOST,
  port: process.env.IMAP_PORT,
  tls: true,
  tlsOptions: { rejectUnauthorized: false } // allow self-signed certs
});

function openInbox(cb) {
  imap.openBox('INBOX', false, cb);
}

imap.once('ready', () => {
  openInbox((err, box) => {
    if (err) throw err;
    console.log('📬 Listening for new emails...');

    imap.on('mail', () => {
      const fetch = imap.seq.fetch(box.messages.total + ':*', {
        bodies: '',
        markSeen: true
      });

      fetch.on('message', (msg) => {
        let buffer = '';

        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
          });
          stream.once('end', async () => {
            const parsed = await simpleParser(buffer);

            const payload = {
              from: parsed.from?.text,
              subject: parsed.subject,
              date: parsed.date,
              text: parsed.text,
              html: parsed.html,
              attachments: (parsed.attachments || []).map(att => ({
                filename: att.filename,
                contentType: att.contentType,
                size: att.size,
                content: att.content.toString('base64') // convert binary to base64
              }))
            };

            console.log(`New Email from: ${payload?.from}, Subject: ${payload?.subject}`);

            try {
              await axios.post(process.env.WEBHOOK_URL, payload);
              console.log('✅ Sent to webhook');
            } catch (err) {
              console.error('❌ Failed to send webhook:', err.message);
            }
          });
        });
      });
    });
  });
});

imap.once('error', (err) => {
  console.error('❌ IMAP Error:', err);
});

imap.once('end', () => {
  console.log('IMAP connection ended');
});

imap.connect();
