// CJS seeder equivalent of scripts/seedDummyData.ts
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-project' });
const db = getFirestore();

const USERS = 'users';
const CHALLENGES = 'challenges';

const randomDurationMs = () => {
  const min = 30 * 60 * 1000; // 30分
  const max = 7 * 24 * 60 * 60 * 1000; // 7日
  return Math.floor(Math.random() * (max - min)) + min;
};

let faker;
async function createUser() {
  const doc = await db.collection(USERS).add({
    displayName: faker.person.firstName(),
    photoURL: faker.image.avatarGitHub(),
    createdAt: new Date(),
  });
  return doc.id;
}

async function createChallenges(userId, count) {
  for (let i = 0; i < count; i++) {
    const duration = randomDurationMs();
    const start = faker.date.recent({ days: 120 });
    const end = new Date(start.getTime() + duration);
    const status = Math.random() < 0.8 ? 'completed' : 'failed';
    await db.collection(CHALLENGES).add({
      userId,
      status,
      createdAt: start,
      startedAt: start,
      completedAt: status === 'completed' ? end : null,
      failedAt: status === 'failed' ? end : null,
    });
  }
}

async function main() {
  const users = Number(process.env.SEED_USERS || 50);
  const challengesPerUser = Number(process.env.SEED_CHALLENGES || 10);

  // Resolve ESM-only faker dynamically in CJS context
  ({ faker } = await import('@faker-js/faker'));

  console.log(`Seeding users=${users}, challengesPerUser=${challengesPerUser}`);
  for (let i = 0; i < users; i++) {
    const userId = await createUser();
    await createChallenges(userId, challengesPerUser);
  }
  console.log('Seeding completed');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
