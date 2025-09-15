import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { faker } from "@faker-js/faker";

// エミュレータに接続（本番データは変更しない）
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";
initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-project" });
const db = getFirestore();

const USERS = "users";
const CH = "challenges";
const POSTS = "communityPosts";
const CMTS = "communityComments";
const FOLLOWS = "follows";
const TNS = "tournaments";
const PARTS = "tournamentParticipants";
const MSGS = "tournamentMessages";

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

async function createUsers(n: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const ref = await db.collection(USERS).add({
      displayName: faker.person.firstName(),
      photoURL: faker.image.avatarGitHub(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    ids.push(ref.id);
  }
  return ids;
}

async function seedChallenges(userId: string, k: number) {
  for (let i = 0; i < k; i++) {
    const start = faker.date.recent({ days: 120 });
    const dur = rand(30 * 60 * 1000, 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + dur);
    const status = Math.random() < 0.8 ? "completed" : "failed";
    await db.collection(CH).add({
      userId,
      goalDays: 7,
      penaltyAmount: 0,
      status,
      startedAt: start,
      completedAt: status === "completed" ? end : null,
      failedAt: status === "failed" ? end : null,
      totalPenaltyPaid: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
}

async function seedPosts(userId: string, name?: string, avatar?: string) {
  const count = rand(1, 5);
  for (let i = 0; i < count; i++) {
    const postRef = await db.collection(POSTS).add({
      authorId: userId,
      authorName: name || "ユーザー",
      authorAvatar: avatar || null,
      title: "",
      content: faker.lorem.sentence({ min: 6, max: 18 }),
      imageUrl: null,
      likes: rand(0, 20),
      comments: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const replyCount = rand(0, 3);
    for (let r = 0; r < replyCount; r++) {
      await db.collection(CMTS).add({
        postId: postRef.id,
        authorId: userId,
        authorName: name || "ユーザー",
        authorAvatar: avatar || null,
        content: faker.lorem.sentence({ min: 4, max: 14 }),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
    if (replyCount > 0) {
      await db.doc(`${POSTS}/${postRef.id}`).update({ comments: replyCount });
    }
  }
}

async function seedFollows(ids: string[]) {
  for (const a of ids) {
    const others = faker.helpers.arrayElements(
      ids.filter((b) => b !== a),
      rand(2, 5)
    );
    for (const b of others) {
      const id = `${a}_${b}`;
      await db.collection(FOLLOWS).doc(id).set({
        followerId: a,
        followeeId: b,
        createdAt: Timestamp.now(),
      });
    }
  }
}

async function seedTournaments(ids: string[]) {
  const tn = Math.min(2, Math.max(1, Math.floor(ids.length / 20)));
  for (let i = 0; i < tn; i++) {
    const tRef = await db.collection(TNS).add({
      name: `ダミー大会${i + 1}`,
      description: faker.lorem.sentence(),
      ownerId: ids[rand(0, ids.length - 1)],
      maxParticipants: 50,
      entryFee: 0,
      prizePool: 0,
      status: "active",
      startDate: Timestamp.now(),
      endDate: Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const participants = faker.helpers.arrayElements(ids, rand(5, 15));
    for (const uid of participants) {
      const userDoc = await db.collection(USERS).doc(uid).get();
      const u = userDoc.data() || ({} as any);
      await db.collection(PARTS).add({
        tournamentId: tRef.id,
        userId: uid,
        userName: (u as any).displayName || "ユーザー",
        userAvatar: (u as any).photoURL || null,
        status: "joined",
        joinedAt: Timestamp.now(),
      });
      if (Math.random() < 0.6) {
        await db.collection(MSGS).add({
          tournamentId: tRef.id,
          authorId: uid,
          authorName: (u as any).displayName || "ユーザー",
          authorAvatar: (u as any).photoURL || null,
          text: faker.lorem.sentence(),
          type: "text",
          createdAt: Timestamp.now(),
        });
      }
    }
  }
}

async function main() {
  const userCount = Number(process.env.SEED_USERS || 50);
  const chPerUser = Number(process.env.SEED_CHALLENGES || 8);
  const ids = await createUsers(userCount);
  const profiles: Record<string, any> = {};
  for (const id of ids) {
    const snap = await db.collection(USERS).doc(id).get();
    profiles[id] = snap.data();
  }
  await Promise.all(ids.map((id) => seedChallenges(id, chPerUser)));
  for (const id of ids) {
    const p = profiles[id] || {};
    await seedPosts(id, p.displayName || "ユーザー", p.photoURL || null);
  }
  await seedFollows(ids);
  await seedTournaments(ids);
  console.log("Related data seeding completed");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
