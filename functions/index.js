const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

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

// Callable: Add diary for the current challenge day (server authoritative)
exports.addDiaryForToday = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', '認証が必要です');
    }
    const uid = context.auth.uid;
    const content = (data && data.content ? String(data.content) : '').trim();
    if (!content) {
      throw new functions.https.HttpsError('invalid-argument', 'content は必須です');
    }

    // 1) Find active challenge
    const chSnap = await db
      .collection('challenges')
      .where('userId', '==', uid)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    if (chSnap.empty) {
      // match client error code
      throw new functions.https.HttpsError('failed-precondition', 'アクティブなチャレンジがありません', {
        code: 'no-active-challenge',
      });
    }
    const chDoc = chSnap.docs[0];
    const challengeId = chDoc.id;
    const chData = chDoc.data() || {};
    const startedAt = (chData.startedAt && chData.startedAt.toDate) ? chData.startedAt.toDate() : new Date(chData.startedAt);
    if (!startedAt || isNaN(startedAt.getTime())) {
      throw new functions.https.HttpsError('failed-precondition', 'チャレンジ開始日時が不正です');
    }

    // 2) Compute today day index based on elapsed 24h windows
    const now = new Date();
    const computedDay = Math.floor((now.getTime() - startedAt.getTime()) / (24 * 3600 * 1000)) + 1;
    if (computedDay <= 0) {
      throw new functions.https.HttpsError('failed-precondition', 'チャレンジ開始前です');
    }

    // 3) Enforce 1 entry per day per user/challenge
    const dupSnap = await db
      .collection('diaries')
      .where('userId', '==', uid)
      .where('challengeId', '==', challengeId)
      .where('day', '==', computedDay)
      .limit(1)
      .get();
    if (!dupSnap.empty) {
      throw new functions.https.HttpsError('already-exists', 'この日は既に投稿済みです', {
        code: 'already-exists',
      });
    }

    // 4) Create diary
    const ref = await db.collection('diaries').add({
      userId: uid,
      content,
      challengeId,
      day: computedDay,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  } catch (err) {
    console.error('[functions] addDiaryForToday error:', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', 'サーバーエラーが発生しました');
  }
});
