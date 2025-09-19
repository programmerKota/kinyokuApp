// Seed many diary entries across days for existing users
// Uses Firebase Emulator if available (default 127.0.0.1:8080)

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-project' });
const db = getFirestore();

const DIARIES = 'diaries';
const USERS = 'users';

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function pickUsers(limit) {
  const snap = await db.collection(USERS).get();
  const ids = snap.docs.map((d) => d.id);
  if (ids.length <= limit) return ids;
  // shuffle
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, limit);
}

async function seedDiariesForUser(userId, count, maxDay) {
  // Create up to `count` diaries with random days [1..maxDay]
  const ops = [];
  for (let i = 0; i < count; i++) {
    const day = randInt(1, maxDay);
    const createdAt = Timestamp.fromDate(new Date(Date.now() - randInt(0, 30) * 24 * 3600 * 1000));
    ops.push(
      db.collection(DIARIES).add({
        userId,
        content: `日記メモ ${i + 1}（テストデータ）`,
        challengeId: null,
        day,
        createdAt,
        updatedAt: createdAt,
      }),
    );
  }
  await Promise.all(ops);
}

async function main() {
  const usersLimit = Number(process.env.SEED_DIARY_USERS_LIMIT || 40);
  const perUser = Number(process.env.SEED_DIARIES_PER_USER || 30);
  const maxDay = Number(process.env.SEED_DIARY_MAX_DAY || 365);
  console.log(`[seed-diaries] usersLimit=${usersLimit} perUser=${perUser} maxDay=${maxDay}`);

  const users = await pickUsers(usersLimit);
  if (users.length === 0) {
    console.warn('[seed-diaries] no users found. Run npm run seed first.');
    return;
  }
  for (const uid of users) {
    await seedDiariesForUser(uid, perUser, maxDay);
  }
  console.log('[seed-diaries] completed');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

