var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const connectDB = require('./complyaiDB');
const cors = require("cors");
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/historyRoutes');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
connectDB();
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


const attachmentsDir = path.join(__dirname, 'attachments');
if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir, { recursive: true });

// Webhook receiver (for local testing)
app.post('/email-event', (req, res) => {
    const { attachments, ...emailData } = req.body;

    console.log('📨 Webhook Event Received:', emailData);
  
    if (attachments && Array.isArray(attachments)) {
      attachments.forEach((att, index) => {
        // att should have { filename, content } (base64 string)
        const fileName = `${Date.now()}_${att.filename || `attachment_${index}`}`;
        const filePath = path.join(attachmentsDir, fileName);
  
        // Save base64 content to file
        const buffer = Buffer.from(att.content, 'base64');
        fs.writeFileSync(filePath, buffer);
  
        console.log(`✅ Saved attachment: ${filePath}`);
      });
    }
  
    res.sendStatus(200);
});

app.listen(PORT, () => console.log(`🚀 Webhook server listening on port ${PORT}`));

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


module.exports = app;
