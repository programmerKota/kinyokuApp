// Update user rank fields on users/{uid} based on average duration from challenges.
// Fields written: rankAverageDays (number), rankTitle (string), rankEmoji (string), rankUpdatedAt (Timestamp)

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-project' });
const db = getFirestore();

const RANKS = [
  { min: 0, max: 0, title: '訓練兵', emoji: '🔰' },
  { min: 1, max: 1, title: '二等兵', emoji: '🔰⭐' },
  { min: 2, max: 2, title: '一等兵', emoji: '🔰⭐⭐' },
  { min: 3, max: 6, title: '上等兵', emoji: '🔰⭐⭐⭐' },
  { min: 7, max: 13, title: '兵長', emoji: '🪙' },
  { min: 14, max: 20, title: '伍長', emoji: '🛡️⭐' },
  { min: 21, max: 29, title: '軍曹', emoji: '🛡️⭐⭐' },
  { min: 30, max: 39, title: '軍長', emoji: '🛡️⭐⭐⭐' },
  { min: 40, max: 49, title: '准尉', emoji: '🎗️' },
  { min: 50, max: 59, title: '少尉', emoji: '🎖️⭐' },
  { min: 60, max: 69, title: '中尉', emoji: '🎖️⭐⭐' },
  { min: 70, max: 99, title: '大尉', emoji: '🎖️⭐⭐⭐' },
  { min: 100, max: 149, title: '少佐', emoji: '🏆⭐' },
  { min: 150, max: 199, title: '中佐', emoji: '🏆⭐⭐' },
  { min: 200, max: 299, title: '大佐', emoji: '🏆⭐⭐⭐' },
  { min: 300, max: 399, title: '小将', emoji: '🏵️⭐' },
  { min: 400, max: 499, title: '中将', emoji: '🏵️⭐⭐' },
  { min: 500, max: 999, title: '大将', emoji: '🏵️⭐⭐⭐' },
  { min: 1000, title: 'ナポレオン', emoji: '👑' },
];

function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
}

function calcAverageSeconds(list) {
  const valid = list.filter((c) => c && c.startedAt);
  if (valid.length === 0) return 0;
  const now = Date.now();
  let total = 0;
  for (const c of valid) {
    const start = toDate(c.startedAt)?.getTime?.() ?? now;
    let end = now;
    if (c.status === 'completed' && c.completedAt) end = toDate(c.completedAt).getTime();
    else if (c.status === 'failed' && c.failedAt) end = toDate(c.failedAt).getTime();
    total += (end - start) / 1000;
  }
  return total / valid.length;
}

function getRankByDays(days) {
  const d = Math.floor(days);
  for (const r of RANKS) {
    if (r.max == null) {
      if (d >= r.min) return r;
    } else {
      if (d >= r.min && d <= r.max) return r;
    }
  }
  return RANKS[0];
}

async function main() {
  console.log('[user-ranks] start');
  const chSnap = await db.collection('challenges').get();
  const byUser = new Map();
  chSnap.docs.forEach((d) => {
    const c = d.data();
    if (!c.userId) return;
    const arr = byUser.get(c.userId) || [];
    arr.push(c);
    byUser.set(c.userId, arr);
  });

  let updated = 0;
  for (const [uid, list] of byUser.entries()) {
    const avgSec = calcAverageSeconds(list);
    const avgDays = avgSec / (24 * 60 * 60);
    const rank = getRankByDays(avgDays);
    await db.collection('users').doc(uid).set(
      {
        rankAverageDays: avgDays,
        rankTitle: rank.title,
        rankEmoji: rank.emoji,
        rankUpdatedAt: Timestamp.now(),
      },
      { merge: true }
    );
    updated += 1;
  }
  console.log('[user-ranks] finished. updated', updated, 'users');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
