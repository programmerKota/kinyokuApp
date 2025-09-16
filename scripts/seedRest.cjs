// Seed Firestore Emulator via REST (avoids gRPC/admin SDK)
// Usage: node scripts/seedRest.cjs [users] [challengesPerUser]
const http2 = require('http2');

const PROJECT = process.env.GCLOUD_PROJECT || 'demo-project';
const HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const USERS = Number(process.argv[2] || process.env.SEED_USERS || 30);
const CH_PER = Number(process.argv[3] || process.env.SEED_CHALLENGES || 5);

function randId(len = 20) {
  const s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += s[(Math.random() * s.length) | 0];
  return out;
}

function nowIso() {
  return new Date().toISOString();
}

function userWrite(id) {
  return {
    update: {
      name: `projects/${PROJECT}/databases/(default)/documents/users/${id}`,
      fields: {
        displayName: { stringValue: `User_${id.slice(0, 5)}` },
        photoURL: { stringValue: '' },
        createdAt: { timestampValue: nowIso() },
      },
    },
  };
}

function challengeWrite(id, userId, start, end, status) {
  return {
    update: {
      name: `projects/${PROJECT}/databases/(default)/documents/challenges/${id}`,
      fields: {
        userId: { stringValue: userId },
        goalDays: { integerValue: '7' },
        penaltyAmount: { integerValue: '0' },
        status: { stringValue: status },
        startedAt: { timestampValue: start.toISOString() },
        completedAt: status === 'completed' ? { timestampValue: end.toISOString() } : { nullValue: null },
        failedAt: status === 'failed' ? { timestampValue: end.toISOString() } : { nullValue: null },
        totalPenaltyPaid: { integerValue: '0' },
        createdAt: { timestampValue: nowIso() },
        updatedAt: { timestampValue: nowIso() },
      },
    },
  };
}

function postCommit(writes) {
  return new Promise((resolve, reject) => {
    const client = http2.connect(`http://${HOST}`);
    client.on('error', reject);
    const req = client.request({
      ':method': 'POST',
      ':path': `/v1/projects/${PROJECT}/databases/(default)/documents:commit`,
      'content-type': 'application/json',
      authorization: 'Bearer owner',
    });
    const chunks = [];
    req.on('response', (headers) => {
      const status = Number(headers[':status'] || 0);
      req.on('end', () => {
        client.close();
        const body = Buffer.concat(chunks).toString();
        if (status >= 200 && status < 300) resolve();
        else reject(new Error(`HTTP2 ${status}: ${body}`));
      });
    });
    req.on('data', (d) => chunks.push(d));
    req.on('error', (e) => {
      client.close();
      reject(e);
    });
    req.end(JSON.stringify({ writes }));
  });
}

async function main() {
  console.log(`[seedRest] start users=${USERS} chPer=${CH_PER} host=${HOST}`);
  const writes = [];
  const userIds = [];
  for (let i = 0; i < USERS; i++) {
    const uid = randId();
    userIds.push(uid);
    writes.push(userWrite(uid));
    // chunk commit every ~400 writes to avoid large payloads
    if (writes.length >= 400) {
      await postCommit(writes.splice(0, writes.length));
    }
  }
  // challenges
  for (const uid of userIds) {
    for (let c = 0; c < CH_PER; c++) {
      const start = new Date(Date.now() - Math.floor(Math.random() * 120) * 24 * 3600 * 1000);
      const dur = Math.floor(Math.random() * 7 * 24 * 3600 * 1000);
      const end = new Date(start.getTime() + dur);
      const status = Math.random() < 0.8 ? 'completed' : 'failed';
      writes.push(challengeWrite(randId(), uid, start, end, status));
      if (writes.length >= 400) {
        await postCommit(writes.splice(0, writes.length));
      }
    }
  }
  if (writes.length) await postCommit(writes);
  console.log('[seedRest] done');
}

main().catch((e) => {
  console.error('[seedRest] error', e);
  process.exit(1);
});
