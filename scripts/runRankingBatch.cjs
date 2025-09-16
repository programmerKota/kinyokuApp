// Run ranking batch against Firebase Emulator using firebase-admin.
// Computes average time (seconds) per user from challenges and writes to `rankings`.

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-project' });
const db = getFirestore();

const COLLECTIONS = {
  USERS: 'users',
  CHALLENGES: 'challenges',
  RANKINGS: 'rankings',
  SYSTEM: 'system',
};

function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
}

function calcAverageTimeSeconds(challenges) {
  const valid = challenges.filter((c) => c && c.startedAt);
  if (valid.length === 0) return 0;
  const now = Date.now();
  let total = 0;
  for (const c of valid) {
    const start = toDate(c.startedAt)?.getTime?.() ?? now;
    let end = now;
    if (c.status === 'completed' && c.completedAt) end = toDate(c.completedAt).getTime();
    else if (c.status === 'failed' && c.failedAt) end = toDate(c.failedAt).getTime();
    total += (end - start) / 1000; // seconds
  }
  return total / valid.length;
}

async function main() {
  console.log('[ranking-batch] start');
  const chSnap = await db.collection(COLLECTIONS.CHALLENGES).get();
  console.log('[ranking-batch] challenges:', chSnap.size);

  const byUser = new Map();
  chSnap.docs.forEach((d) => {
    const c = d.data();
    if (!c.userId) return;
    const arr = byUser.get(c.userId) || [];
    arr.push(c);
    byUser.set(c.userId, arr);
  });

  const rankings = [];
  for (const [userId, list] of byUser.entries()) {
    const avgSec = calcAverageTimeSeconds(list);
    if (!avgSec || !isFinite(avgSec)) continue;
    const ended = list.filter((x) => x.status === 'completed' || x.status === 'failed').length;
    const successRate = list.length > 0 ? Math.round((list.filter((x) => x.status === 'completed').length / list.length) * 10000) / 100 : 0;

    let name = 'ユーザー';
    let avatar = null;
    try {
      const u = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      if (u.exists) {
        const d = u.data() || {};
        name = d.displayName || name;
        avatar = d.photoURL || null;
      }
    } catch {}

    rankings.push({
      id: userId,
      name,
      avatar,
      averageTime: avgSec,
      totalChallenges: list.length,
      completedChallenges: ended,
      successRate,
    });
  }

  rankings.sort((a, b) => b.averageTime - a.averageTime);
  rankings.forEach((r, i) => (r.rank = i + 1));

  // clear existing
  const existing = await db.collection(COLLECTIONS.RANKINGS).get();
  const delOps = existing.docs.map((d) => d.ref.delete());
  await Promise.all(delOps);

  // write new
  const writeOps = rankings.map((r) =>
    db.collection(COLLECTIONS.RANKINGS).doc(r.id).set({
      name: r.name,
      avatar: r.avatar,
      averageTime: r.averageTime,
      totalChallenges: r.totalChallenges,
      completedChallenges: r.completedChallenges,
      successRate: r.successRate,
      rank: r.rank,
      updatedAt: Timestamp.now(),
    })
  );
  await Promise.all(writeOps);

  // last update
  await db.collection(COLLECTIONS.SYSTEM).doc('ranking_update').set({ lastUpdate: Timestamp.now() }, { merge: true });

  console.log('[ranking-batch] finished. wrote', rankings.length, 'docs');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
