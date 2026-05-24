const express = require('express');
const webpush = require('web-push');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.use(cors());
app.use(express.json());

// ── VAPID Keys ──────────────────────────────────────────
const VAPID_PUBLIC_KEY = 'BD8weuWNktThYNUkWKnkv5Hgz2-yiJyC_T1YVCrYomhOH2rJSys97xrRnm5BsrGNc9t8MRmqRaN2KHnF-zLjXlI';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const MONGO_URI = process.env.MONGO_URI;

// ── Cloud Sync JWT ──────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;

if (!VAPID_PRIVATE_KEY || !MONGO_URI || !JWT_SECRET) {
  console.error('Missing required environment variables: VAPID_PRIVATE_KEY, MONGO_URI, JWT_SECRET');
  process.exit(1);
}
const TOKEN_EXPIRY = '30d';

webpush.setVapidDetails('mailto:placeholder@email.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ── MongoDB ──────────────────────────────────────────────
let subsCollection;
let prayerCollection;
let usersCollection;
let syncDataCollection;
let friendsCollection;
let subscriptions = [];
let prayerSchedules = [];

async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI, { tls: true, tlsAllowInvalidCertificates: false });
    await client.connect();
    const db = client.db('presence');
    subsCollection = db.collection('subscriptions');
    prayerCollection = db.collection('prayer_schedules');
    usersCollection = db.collection('users');
    syncDataCollection = db.collection('sync_data');
    friendsCollection = db.collection('friends');
    
    subscriptions = await subsCollection.find({}).toArray();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (const sub of subscriptions) {
      if (sub.sessionStart && sub.sessionStart < cutoff) {
        sub.sessionStart = null;
        sub.lastFiredCycle = -1;
        await saveSub(sub);
      } else if (sub.sessionStart) {
        const elapsed = Math.floor((now - sub.sessionStart) / 1000);
        const interval = sub.intervalSec || 120;
        const currentCycle = Math.floor(elapsed / interval);
        if (currentCycle > (sub.lastFiredCycle ?? -1)) {
          sub.lastFiredCycle = currentCycle - 1;
          await saveSub(sub);
        }
      }
    }
    prayerSchedules = await prayerCollection.find({}).toArray();
    console.log(`Connected to MongoDB. ${subscriptions.length} subscribers, ${prayerSchedules.length} prayer schedules.`);
  } catch(err) {
    console.error('MongoDB connection failed:', err.message);
  }
}

async function saveSub(sub) {
  try {
    const { _id, ...data } = sub;
    await subsCollection.updateOne({ endpoint: sub.endpoint }, { $set: data }, { upsert: true });
  } catch(e) { console.error('Save sub error:', e.message); }
}

async function deleteSub(endpoint) {
  try { await subsCollection.deleteOne({ endpoint }); }
  catch(e) { console.error('Delete sub error:', e.message); }
}

async function savePrayerSchedule(schedule) {
  try {
    const { _id, ...data } = schedule;
    await prayerCollection.updateOne({ endpoint: schedule.endpoint }, { $set: data }, { upsert: true });
  } catch(e) { console.error('Save prayer schedule error:', e.message); }
}

// ── Cloud Sync Middleware ────────────────────────────────
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Prompts ──────────────────────────────────────────────
const PROMPTS = [
  "Are you here right now?", "Feel the weight of your body.",
  "What sounds surround you?", "Notice your breath — don't change it.",
  "Where has your mind just been?", "Return. You are here.",
  "Soften your jaw. Your shoulders.", "What is real in this exact moment?",
  "The mind drifts. Come back.", "Sense your feet on the ground.",
  "Notice without labeling.", "This moment will not come again.",
  "What are you actually doing right now?", "Let the thought pass. Stay.",
  "Feel the air on your skin.", "You drifted. That's fine. Return.",
  "Presence is not forced — it is remembered.",
  "What is the quality of your awareness right now?",
  "Drop the inner monologue. Just sense.", "Be here. Completely.",
];

const usedPrompts = new Map();
function randomPromptFor(endpoint) {
  const last = usedPrompts.get(endpoint) ?? -1;
  let idx;
  do { idx = Math.floor(Math.random() * PROMPTS.length); } while (idx === last);
  usedPrompts.set(endpoint, idx);
  return PROMPTS[idx];
}

// ── Push helpers ─────────────────────────────────────────
async function pushTo(sub, prompt, title) {
  const payload = JSON.stringify({
    title: title || 'Presence',
    body: prompt,
    url: 'https://chooch971-tech.github.io/Consciousness-App/presence.html'
  });
  try {
    await webpush.sendNotification(sub, payload);
    return true;
  } catch(err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`[Push] Subscription dead (${err.statusCode}) — endpoint ...${sub.endpoint ? sub.endpoint.slice(-20) : 'NONE'}`);
      return 'dead';
    }
    console.error(`[Push] Error: ${err.statusCode || 'no status'} — ${err.message}`);
    if (err.body) console.error(`[Push] Response body: ${err.body}`);
    return false;
  }
}

// ── Awareness session loop (every 5s) ────────────────────
setInterval(async () => {
  const now = Date.now();
  const dead = [];
  for (const sub of subscriptions) {
    if (!sub.sessionStart) continue;
    const elapsed = Math.floor((now - sub.sessionStart) / 1000);
    const totalDuration = sub.durationSec || 1800;
    const interval = sub.intervalSec || 120;

    if (elapsed >= totalDuration) {
      sub.sessionStart = null;
      sub.lastFiredCycle = -1;
      await saveSub(sub);
      console.log(`[${new Date().toISOString()}] Session expired after ${totalDuration}s`);
      continue;
    }

    const currentCycle = Math.floor(elapsed / interval);
    const lastFired = sub.lastFiredCycle ?? -1;

    if (currentCycle > lastFired && elapsed >= interval) {
      const prompt = randomPromptFor(sub.endpoint);
      console.log(`[${new Date().toISOString()}] Attempting push: cycle ${currentCycle}, elapsed ${elapsed}s, interval ${interval}s`);
      const result = await pushTo(sub, prompt);
      if (result === 'dead') {
        dead.push(sub.endpoint);
      } else if (result === true) {
        sub.lastFiredCycle = currentCycle;
        await saveSub(sub);
      }
    }
  }

  if (dead.length > 0) {
    subscriptions = subscriptions.filter(s => !dead.includes(s.endpoint));
    await Promise.all(dead.map(deleteSub));
  }
}, 5000);

// ── Prayer schedule loop (every 60s) ────────────────────
setInterval(async () => {
  if (!prayerSchedules.length) return;
  const nowUtc = new Date();
  for (const schedule of prayerSchedules) {
    if (!schedule.enabled) continue;
    if (!schedule.times || !schedule.times.length) continue;
    const tzOffset = schedule.tzOffset || 0;
    const localMs = nowUtc.getTime() + tzOffset * 60000;
    const localNow = new Date(localMs);
    const todayStr = localNow.toDateString();
    const nowH = localNow.getUTCHours();
    const nowM = localNow.getUTCMinutes();
    const nowTotalMin = nowH * 60 + nowM;
    if (!schedule.firedToday || schedule.firedToday.date !== todayStr) {
      schedule.firedToday = { date: todayStr, fired: {} };
    }
    const fired = schedule.firedToday.fired || {};
    for (let i = 0; i < schedule.times.length; i++) {
      const parts = schedule.times[i].split(':');
      const pH = parseInt(parts[0]);
      const pM = parseInt(parts[1]);
      const pTotalMin = pH * 60 + pM;
      const prayerWindowStart = pTotalMin;
      const prayerWindowEnd = pTotalMin + 20;
      if (nowTotalMin >= prayerWindowStart && nowTotalMin < prayerWindowEnd) {
        const slotIndex = Math.floor((nowTotalMin - prayerWindowStart) / 5);
        if (!fired[i]) fired[i] = [];
        if (!fired[i].includes(slotIndex)) {
          const sub = subscriptions.find(s => s.endpoint === schedule.endpoint);
          if (sub) {
            const result = await pushTo(sub, `Prayer time: ${schedule.times[i]}`, 'Prayer');
            if (result === true) {
              fired[i].push(slotIndex);
              if (fired[i].length >= 4) {
                fired[i] = [0, 1, 2, 3];
              }
            }
          }
        }
      }
    }
    await savePrayerSchedule(schedule);
  }
}, 60000);

// ── CLOUD SYNC ROUTES ────────────────────────────────────

// REGISTER
app.post('/api/sync/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });
    if (username) {
      const existingUsername = await usersCollection.findOne({ username });
      if (existingUsername) return res.status(400).json({ error: 'Username already taken' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const userDoc = { email, passwordHash, createdAt: new Date(), lastSync: null };
    if (username) userDoc.username = username;
    const result = await usersCollection.insertOne(userDoc);
    const token = jwt.sign({ userId: result.insertedId.toString(), email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ token, userId: result.insertedId, email, username: username || null });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// LOGIN
app.post('/api/sync/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ token, userId: user._id, email: user.email, username: user.username || null });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// REFRESH TOKEN
app.post('/api/sync/auth/refresh', verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) return res.status(401).json({ error: 'User not found' });
    const token = jwt.sign({ userId: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// LOGOUT
app.post('/api/sync/auth/logout', verifyToken, (req, res) => {
  res.json({ message: 'Logged out' });
});

// SET USERNAME — lets existing users claim a username post-registration
app.post('/api/sync/auth/set-username', verifyToken, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== 'string') return res.status(400).json({ error: 'Username required' });
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters (letters, numbers, underscores)' });
    if (clean.length > 24) return res.status(400).json({ error: 'Username too long (max 24 characters)' });
    const existing = await usersCollection.findOne({ username: clean });
    if (existing && existing._id.toString() !== req.user.userId) return res.status(400).json({ error: 'Username already taken' });
    await usersCollection.updateOne({ _id: new ObjectId(req.user.userId) }, { $set: { username: clean } });
    res.json({ username: clean });
  } catch (err) {
    console.error('Set username error:', err);
    res.status(500).json({ error: 'Failed to set username' });
  }
});

// HEARTBEAT — lightweight ping to mark user as online
app.post('/api/sync/auth/heartbeat', verifyToken, async (req, res) => {
  try {
    await usersCollection.updateOne({ _id: new ObjectId(req.user.userId) }, { $set: { lastActive: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

// GOOGLE SIGN-IN — exchanges authorization code for tokens, then finds/creates user
app.post('/api/sync/auth/google', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  try {
    // Exchange authorization code for tokens using client secret
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'postmessage',
        grant_type: 'authorization_code'
      })
    });
    const tokens = await tokenRes.json();
    if (!tokens.id_token) {
      console.error('[Google Auth] Token exchange failed:', tokens);
      return res.status(401).json({ error: 'Google token exchange failed' });
    }

    // Verify the ID token
    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { sub: googleId, email, name } = ticket.getPayload();

    // Find existing user by googleId or email
    let user = await usersCollection.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      const result = await usersCollection.insertOne({
        email, googleId, displayName: name || null,
        createdAt: new Date(), lastSync: null, lastActive: new Date()
      });
      const token = jwt.sign({ userId: result.insertedId.toString(), email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
      return res.json({ token, userId: result.insertedId, email, username: null });
    }

    if (!user.googleId) {
      await usersCollection.updateOne({ _id: user._id }, { $set: { googleId, lastActive: new Date() } });
    } else {
      await usersCollection.updateOne({ _id: user._id }, { $set: { lastActive: new Date() } });
    }

    const token = jwt.sign({ userId: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ token, userId: user._id, email: user.email, username: user.username || null });
  } catch (err) {
    console.error('[Google Auth] Error:', err.message);
    res.status(401).json({ error: 'Google sign-in failed' });
  }
});

// PUSH DATA
app.post('/api/sync/sync/push', verifyToken, async (req, res) => {
  try {
    const { data, deviceInfo } = req.body;
    if (!data) return res.status(400).json({ error: 'No data to sync' });
    const syncData = {
      userId: new ObjectId(req.user.userId),
      presence_v3: data.presence_v3,
      presence_conc_v1: data.presence_conc_v1,
      presence_prayer_v1: data.presence_prayer_v1,
      presence_journal_v1: data.presence_journal_v1,
      presence_soul_mirror_v1: data.presence_soul_mirror_v1,
      presence_guide_v1: data.presence_guide_v1,
      presence_omnia_v1: data.presence_omnia_v1,
      bardon_rpg_v2: data.bardon_rpg_v2,
      presence_visited: data.presence_visited,
      deviceInfo: deviceInfo || 'Unknown device',
      syncedAt: new Date(),
    };
    const result = await syncDataCollection.insertOne(syncData);
    await usersCollection.updateOne({ _id: new ObjectId(req.user.userId) }, { $set: { lastSync: new Date() } });
    res.json({ message: 'Data synced', syncId: result.insertedId });
  } catch (err) {
    console.error('Push sync error:', err);
    res.status(500).json({ error: 'Sync push failed' });
  }
});

// PULL DATA
app.get('/api/sync/sync/pull', verifyToken, async (req, res) => {
  try {
    const syncData = await syncDataCollection.find(
      { userId: new ObjectId(req.user.userId) }
    ).sort({ syncedAt: -1 }).limit(1).next();
    if (!syncData) return res.json({ data: null, message: 'No sync data found' });
    res.json({
      data: {
        presence_v3: syncData.presence_v3,
        presence_conc_v1: syncData.presence_conc_v1,
        presence_prayer_v1: syncData.presence_prayer_v1,
        presence_journal_v1: syncData.presence_journal_v1,
        presence_soul_mirror_v1: syncData.presence_soul_mirror_v1,
        presence_guide_v1: syncData.presence_guide_v1,
        presence_omnia_v1: syncData.presence_omnia_v1,
        bardon_rpg_v2: syncData.bardon_rpg_v2,
        presence_visited: syncData.presence_visited,
      },
      syncedAt: syncData.syncedAt,
      deviceInfo: syncData.deviceInfo,
    });
  } catch (err) {
    console.error('Pull sync error:', err);
    res.status(500).json({ error: 'Sync pull failed' });
  }
});

// SYNC HISTORY
app.get('/api/sync/sync/history', verifyToken, async (req, res) => {
  try {
    const history = await syncDataCollection.find({ userId: new ObjectId(req.user.userId) })
      .sort({ syncedAt: -1 })
      .limit(10)
      .project({ syncedAt: 1, deviceInfo: 1 })
      .toArray();
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ── FRIENDS ROUTES ──────────────────────────────────────

// LIST ACCEPTED FRIENDS
app.get('/api/sync/friends/list', verifyToken, async (req, res) => {
  try {
    const selfId = req.user.userId;
    const selfOid = new ObjectId(selfId);
    const docs = await friendsCollection.find({
      status: 'accepted',
      $or: [{ userId: selfId }, { friendId: selfId }]
    }).toArray();

    const friends = [];
    for (const doc of docs) {
      const otherId = doc.userId === selfId ? doc.friendId : doc.userId;
      let otherOid;
      try { otherOid = new ObjectId(otherId); } catch(e) { continue; }
      const otherUser = await usersCollection.findOne({ _id: otherOid });
      if (!otherUser) continue;

      const latestSync = await syncDataCollection.find({ userId: otherOid }).sort({ syncedAt: -1 }).limit(1).next();

      let streak = 0, concLevel = 1, concXp = 0, akasha = 0, bardonStep = 1;
      let bodies = { physical: 1, astral: 1, mental: 1 };

      if (latestSync) {
        try {
          const v3 = latestSync.presence_v3 ? JSON.parse(latestSync.presence_v3) : null;
          if (v3) streak = v3.streak || 0;
        } catch(e) {}
        try {
          const conc = latestSync.presence_conc_v1 ? JSON.parse(latestSync.presence_conc_v1) : null;
          if (conc) { concLevel = conc.level || 1; concXp = conc.xp || 0; }
        } catch(e) {}
        try {
          const omnia = latestSync.presence_omnia_v1 ? JSON.parse(latestSync.presence_omnia_v1) : null;
          if (omnia) {
            akasha = omnia.akasha || 0;
            bardonStep = omnia.bardonStep || 1;
            if (omnia.bodies) bodies = omnia.bodies;
          }
        } catch(e) {}
      }

      friends.push({
        userId: otherId,
        username: otherUser.username || otherUser.email,
        email: otherUser.email,
        lastSync: latestSync ? latestSync.syncedAt : null,
        lastActive: otherUser.lastActive || null,
        streak, concLevel, concXp, akasha, bardonStep, bodies
      });
    }
    res.json({ friends });
  } catch (err) {
    console.error('Friends list error:', err);
    res.status(500).json({ error: 'Failed to load friends' });
  }
});

// SEARCH USERS BY USERNAME PREFIX
app.get('/api/sync/friends/search', verifyToken, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ users: [] });
    const selfId = req.user.userId;
    const users = await usersCollection.find({
      username: { $regex: '^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      _id: { $ne: new ObjectId(selfId) }
    }).limit(8).project({ _id: 1, username: 1 }).toArray();
    res.json({ users: users.map(u => ({ userId: u._id.toString(), username: u.username })) });
  } catch (err) {
    console.error('Friends search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// SEND FRIEND REQUEST
app.post('/api/sync/friends/request', verifyToken, async (req, res) => {
  try {
    const selfId = req.user.userId;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    const target = await usersCollection.findOne({ username });
    if (!target) return res.status(404).json({ error: 'User not found' });
    const targetId = target._id.toString();
    if (targetId === selfId) return res.status(400).json({ error: 'Cannot add yourself' });
    const existing = await friendsCollection.findOne({
      $or: [
        { userId: selfId, friendId: targetId },
        { userId: targetId, friendId: selfId }
      ]
    });
    if (existing) return res.status(400).json({ error: 'Already friends or request pending' });
    await friendsCollection.insertOne({ userId: selfId, friendId: targetId, status: 'pending', createdAt: new Date() });
    res.json({ message: 'Friend request sent' });
  } catch (err) {
    console.error('Friend request error:', err);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// ACCEPT FRIEND REQUEST
app.post('/api/sync/friends/accept', verifyToken, async (req, res) => {
  try {
    const selfId = req.user.userId;
    const { requesterId } = req.body;
    if (!requesterId) return res.status(400).json({ error: 'requesterId required' });
    const result = await friendsCollection.updateOne(
      { userId: requesterId, friendId: selfId, status: 'pending' },
      { $set: { status: 'accepted' } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    console.error('Accept friend error:', err);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// DECLINE / REMOVE FRIEND
app.post('/api/sync/friends/decline', verifyToken, async (req, res) => {
  try {
    const selfId = req.user.userId;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    await friendsCollection.deleteMany({
      $or: [
        { userId: selfId, friendId: userId },
        { userId: userId, friendId: selfId }
      ]
    });
    res.json({ message: 'Friend removed' });
  } catch (err) {
    console.error('Decline friend error:', err);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// LIST PENDING INCOMING REQUESTS
app.get('/api/sync/friends/requests', verifyToken, async (req, res) => {
  try {
    const selfId = req.user.userId;
    const docs = await friendsCollection.find({ friendId: selfId, status: 'pending' }).toArray();
    const requests = [];
    for (const doc of docs) {
      let userOid;
      try { userOid = new ObjectId(doc.userId); } catch(e) { continue; }
      const user = await usersCollection.findOne({ _id: userOid });
      if (!user) continue;
      requests.push({ userId: doc.userId, username: user.username || user.email });
    }
    res.json({ requests });
  } catch (err) {
    console.error('Friend requests error:', err);
    res.status(500).json({ error: 'Failed to load requests' });
  }
});

// ── EXISTING ROUTES ──────────────────────────────────────

app.get('/ping', (req, res) => {
  const active = subscriptions.filter(s => s.sessionStart).length;
  res.json({
    status: 'alive',
    subscribers: subscriptions.length,
    activeSessions: active,
    prayerSchedules: prayerSchedules.length,
    time: new Date().toISOString()
  });
});

app.get('/debug', (req, res) => {
  const now = Date.now();
  const subs = subscriptions.map(s => ({
    endpointTail: s.endpoint ? '...' + s.endpoint.slice(-30) : 'NONE',
    hasKeys: !!(s.keys && s.keys.auth && s.keys.p256dh),
    sessionStart: s.sessionStart ? new Date(s.sessionStart).toISOString() : null,
    sessionActive: !!s.sessionStart,
    elapsedSec: s.sessionStart ? Math.floor((now - s.sessionStart) / 1000) : null,
    intervalSec: s.intervalSec || null,
    durationSec: s.durationSec || null,
  }));
  res.json({ serverTime: new Date().toISOString(), totalSubscribers: subscriptions.length, subscribers: subs });
});

app.get('/vapid-public-key', (req, res) => res.json({ publicKey: VAPID_PUBLIC_KEY }));

app.post('/subscribe', async (req, res) => {
  const subscription = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
  const idx = subscriptions.findIndex(s => s.endpoint === subscription.endpoint);
  if (idx === -1) {
    const newSub = { ...subscription, sessionStart: null, lastFiredCycle: -1 };
    subscriptions.push(newSub);
    await saveSub(newSub);
  }
  res.json({ success: true });
});

app.post('/unsubscribe', async (req, res) => {
  const { endpoint } = req.body;
  subscriptions = subscriptions.filter(s => s.endpoint !== endpoint);
  await deleteSub(endpoint);
  res.json({ success: true });
});

app.post('/session/start', async (req, res) => {
  const { endpoint, intervalSec, durationSec } = req.body;
  let sub = subscriptions.find(s => s.endpoint === endpoint);
  if (!sub) return res.status(404).json({ error: 'Subscriber not found' });
  sub.sessionStart = Date.now();
  sub.intervalSec = intervalSec || 120;
  sub.durationSec = durationSec || 1800;
  sub.lastFiredCycle = -1;
  await saveSub(sub);
  res.json({ success: true });
});

app.post('/session/end', async (req, res) => {
  const { endpoint } = req.body;
  const sub = subscriptions.find(s => s.endpoint === endpoint);
  if (!sub) return res.status(404).json({ error: 'Subscriber not found' });
  sub.sessionStart = null;
  sub.lastFiredCycle = -1;
  await saveSub(sub);
  res.json({ success: true });
});

app.post('/prayer/schedule', async (req, res) => {
  const { endpoint, times, enabled, tzOffset } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  const existing = prayerSchedules.find(s => s.endpoint === endpoint);
  if (existing) {
    if (times !== undefined) existing.times = times;
    if (enabled !== undefined) existing.enabled = enabled;
    if (tzOffset !== undefined) existing.tzOffset = tzOffset;
    await savePrayerSchedule(existing);
  } else {
    const newSchedule = { endpoint, times: times || ['06:00','09:00','12:00','15:00','18:00'], enabled: enabled !== undefined ? enabled : true, tzOffset: tzOffset || 0, firedToday: { date: '', fired: {} } };
    prayerSchedules.push(newSchedule);
    await savePrayerSchedule(newSchedule);
  }
  res.json({ success: true });
});

app.post('/prayer/done', async (req, res) => {
  const { endpoint, index } = req.body;
  const schedule = prayerSchedules.find(s => s.endpoint === endpoint);
  if (!schedule) return res.status(404).json({ error: 'No prayer schedule found' });
  const todayStr = new Date().toDateString();
  if (!schedule.firedToday || schedule.firedToday.date !== todayStr) {
    schedule.firedToday = { date: todayStr, fired: {} };
  }
  schedule.firedToday.fired[index] = [0, 1, 2, 3];
  await savePrayerSchedule(schedule);
  res.json({ success: true });
});

app.post('/notify', async (req, res) => {
  const { endpoint, title, body } = req.body;
  if (endpoint) {
    const sub = subscriptions.find(s => s.endpoint === endpoint);
    if (!sub) return res.status(404).json({ error: 'Not found' });
    const prompt = body || randomPromptFor(endpoint);
    const payload = JSON.stringify({ title: title || 'Presence', body: prompt, url: 'https://chooch971-tech.github.io/Consciousness-App/presence.html' });
    try { await webpush.sendNotification(sub, payload); } catch(e) { console.error(e.message); }
    return res.json({ success: true });
  }
  let sent = 0;
  for (const sub of subscriptions) {
    const result = await pushTo(sub, randomPromptFor(sub.endpoint));
    if (result === true) sent++;
  }
  res.json({ success: true, sent });
});

app.post('/reset-sessions', async (req, res) => {
  for (const sub of subscriptions) {
    sub.sessionStart = null;
    sub.lastFiredCycle = -1;
    await saveSub(sub);
  }
  res.json({ success: true });
});

app.post('/cleanup', async (req, res) => {
  const seen = new Map();
  const toDelete = [];
  for (const sub of subscriptions) {
    const key = sub.keys?.auth;
    if (!key) { toDelete.push(sub.endpoint); continue; }
    if (seen.has(key)) { toDelete.push(sub.endpoint); }
    else { seen.set(key, sub); }
  }
  for (const ep of toDelete) await deleteSub(ep);
  subscriptions = subscriptions.filter(s => !toDelete.includes(s.endpoint));
  res.json({ success: true, removed: toDelete.length, remaining: subscriptions.length });
});

app.post('/nuke', async (req, res) => {
  try {
    await subsCollection.deleteMany({});
    subscriptions = [];
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── START ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Presence server running on port ${PORT}`);
  });
});
