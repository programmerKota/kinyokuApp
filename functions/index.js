const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure mail transport via environment variables or functions config (kept server-side)
let transporter;
try {
  const cfg = (functions.config && functions.config()) || {};
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE !== 'false' : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  } else if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    });
  } else if (cfg.smtp && cfg.smtp.user && cfg.smtp.pass && cfg.smtp.host) {
    const cport = Number(cfg.smtp.port || 465);
    const csecure = cfg.smtp.secure !== undefined ? !!cfg.smtp.secure : cport === 465;
    transporter = nodemailer.createTransport({
      host: cfg.smtp.host,
      port: cport,
      secure: csecure,
      auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
    });
  } else if (cfg.gmail && cfg.gmail.user && cfg.gmail.pass) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: cfg.gmail.user, pass: cfg.gmail.pass },
    });
  } else {
    console.warn('[functions] Mail transport not configured. Set SMTP_* or GMAIL_* env.');
  }
} catch (e) {
  console.error('[functions] createTransport failed:', e);
}

// Firestore trigger: send email when a feedback doc is created
const DEFAULT_FEEDBACK_TO = 'programmerkota07@gmail.com';
exports.sendFeedbackEmail = functions.firestore
  .document('feedback/{docId}')
  .onCreate(async (snap) => {
    const data = snap.data() || {};
    const cfg = (functions.config && functions.config()) || {};
    const to =
      process.env.FEEDBACK_TO_EMAIL ||
      (cfg.mail && cfg.mail.to) ||
      DEFAULT_FEEDBACK_TO; // Hidden from clients; default set here
    if (!transporter || !to) {
      console.warn('[functions] Missing transporter or FEEDBACK_TO_EMAIL. Skipping email.');
      return;
    }

    const subject = `[Feedback] ${data.subject || '無題'}`;
    const text = [
      `User: ${data.userId || 'anonymous'}`,
      data.platform ? `Platform: ${data.platform}` : null,
      data.appVersion ? `AppVersion: ${data.appVersion}` : null,
      '',
      (data.message || '').toString(),
    ]
      .filter(Boolean)
      .join('\n');

    const from =
      process.env.MAIL_FROM ||
      (cfg.mail && cfg.mail.from) ||
      process.env.SMTP_USER ||
      process.env.GMAIL_USER ||
      'no-reply@example.com';

    try {
      await transporter.sendMail({ from, to, subject, text });
      console.log('[functions] Feedback email sent to', to);
    } catch (e) {
      console.error('[functions] Failed to send feedback email', e);
    }
  });
