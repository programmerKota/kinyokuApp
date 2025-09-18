// Seed join requests and participants for a specific tournament
// Usage (local): node scripts/seedTournamentMembers.cjs
// Env:
//   TID=<tournamentId>  (required)
//   REQ=<numRequests>   (default 5)
//   JOIN=<numParticipants> (default 8)
//   GCLOUD_PROJECT=demo-project
//   FIRESTORE_EMULATOR_HOST=localhost:8080

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const TID = process.env.TID;
const NUM_REQ = Number(process.env.REQ || 5);
const NUM_JOIN = Number(process.env.JOIN || 8);
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-project' });
const db = getFirestore();

async function pickRandomUsers(n) {
  const snap = await db.collection('users').get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, n);
}

async function seed() {
  if (!TID) throw new Error('TID env is required');
  const usersForReq = await pickRandomUsers(NUM_REQ);
  const usersForJoin = await pickRandomUsers(NUM_JOIN);

  for (const u of usersForReq) {
    await db.collection('tournamentJoinRequests').add({
      tournamentId: TID,
      userId: u.id,
      userName: u.displayName || 'ユーザー',
      userAvatar: u.photoURL || null,
      status: 'pending',
      requestedAt: Timestamp.now(),
    });
  }

  for (const u of usersForJoin) {
    await db.collection('tournamentParticipants').add({
      tournamentId: TID,
      userId: u.id,
      userName: u.displayName || 'ユーザー',
      userAvatar: u.photoURL || null,
      status: 'joined',
      joinedAt: Timestamp.now(),
      progressPercent: 0,
      currentDay: 0,
    });
  }

  console.log(
    `Seeded: requests=${usersForReq.length}, participants=${usersForJoin.length} for tournament ${TID}`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });



