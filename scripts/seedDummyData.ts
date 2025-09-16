import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { faker } from "@faker-js/faker";

// エミュレータに接続（本番に触れない）
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";

initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-project" });
const db = getFirestore();

const USERS = "users";
const CHALLENGES = "challenges";

const randomDurationMs = () => {
  // 30分〜7日の範囲でランダム
  const min = 30 * 60 * 1000;
  const max = 7 * 24 * 60 * 60 * 1000;
  return Math.floor(Math.random() * (max - min)) + min;
};

async function createUser(): Promise<string> {
  const doc = await db.collection(USERS).add({
    displayName: faker.person.firstName(),
    photoURL: faker.image.avatarGitHub(),
    createdAt: new Date(),
  });
  return doc.id;
}

async function createChallenges(userId: string, count: number) {
  for (let i = 0; i < count; i++) {
    const duration = randomDurationMs();
    const start = faker.date.recent({ days: 120 });
    const end = new Date(start.getTime() + duration);
    const status = Math.random() < 0.8 ? "completed" : "failed";
    await db.collection(CHALLENGES).add({
      userId,
      status,
      createdAt: start,
      startedAt: start,
      completedAt: status === "completed" ? end : null,
      failedAt: status === "failed" ? end : null,
    });
  }
}

async function main() {
  const users = Number(process.env.SEED_USERS || 50);
  const challengesPerUser = Number(process.env.SEED_CHALLENGES || 10);

  console.log(`Seeding users=${users}, challengesPerUser=${challengesPerUser}`);

  for (let i = 0; i < users; i++) {
    const userId = await createUser();
    await createChallenges(userId, challengesPerUser);
  }

  console.log("Seeding completed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
