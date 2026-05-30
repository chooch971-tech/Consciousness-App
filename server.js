const express = require('express');
const helmet  = require('helmet');
const webpush = require('web-push');
const cors    = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const app = express();

// ── Security headers ────────────────────────────────────
app.use(helmet());

// ── CORS — explicit allowlist ───────────────────────────
const ALLOWED_ORIGINS = [
  'https://chooch971-tech.github.io',
  'https://thepresenceapp.com',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://localhost:8080',
];
app.use(cors({
  origin: function(origin, cb) {
    // allow server-to-server / curl with no Origin header
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

// ── Body parser — 1 MB cap ──────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── VAPID Keys ──────────────────────────────────────────
const VAPID_PUBLIC_KEY = 'BD8weuWNktThYNUkWKnkv5Hgz2-yiJyC_T1YVCrYomhOH2rJSys97xrRnm5BsrGNc9t8MRmqRaN2KHnF-zLjXlI';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const MONGO_URI = process.env.MONGO_URI;

// ── Cloud Sync JWT ──────────────────────────────────────
const JWT_SECRET    = process.env.JWT_SECRET;
const ADMIN_SECRET  = process.env.ADMIN_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!VAPID_PRIVATE_KEY || !MONGO_URI || !JWT_SECRET) {
  console.error('Missing required environment variables: VAPID_PRIVATE_KEY, MONGO_URI, JWT_SECRET');
  process.exit(1);
}
if (!ADMIN_SECRET) {
  console.warn('[Security] ADMIN_SECRET not set — admin routes will be inaccessible until it is.');
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

let mongoClient;
async function connectDB() {
  try {
    mongoClient = new MongoClient(MONGO_URI, { tls: true, tlsAllowInvalidCertificates: false });
    await mongoClient.connect();
    const db = mongoClient.db('presence');
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

// ── Admin Middleware ─────────────────────────────────────
// Protects destructive / broadcast routes.
// Set ADMIN_SECRET env var; pass as x-admin-secret header.
function verifyAdmin(req, res, next) {
  if (!ADMIN_SECRET) return res.status(403).json({ error: 'Admin access not configured' });
  const provided = req.headers['x-admin-secret'];
  if (!provided || provided !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
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

// ── AI helpers ────────────────────────────────────────────
const aiRateBuckets = new Map();
const AI_RATE_LIMIT = 30;
const AI_RATE_WINDOW_MS = 60 * 1000;

function aiRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.user?.userId || req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const bucket = aiRateBuckets.get(key) || { count: 0, resetAt: now + AI_RATE_WINDOW_MS };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + AI_RATE_WINDOW_MS;
  }
  bucket.count++;
  aiRateBuckets.set(key, bucket);
  if (bucket.count > AI_RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many AI requests. Try again shortly.' });
  }
  next();
}

// ── Auth rate limiter — throttles login/register brute force ──
const authRateBuckets = new Map();
const AUTH_RATE_LIMIT = 10;            // attempts per window
const AUTH_RATE_WINDOW_MS = 5 * 60 * 1000;
function authRateLimit(req, res, next) {
  const now = Date.now();
  const key = (req.ip || req.headers['x-forwarded-for'] || 'unknown') + ':' + ((req.body && req.body.email) || '');
  const bucket = authRateBuckets.get(key) || { count: 0, resetAt: now + AUTH_RATE_WINDOW_MS };
  if (now > bucket.resetAt) { bucket.count = 0; bucket.resetAt = now + AUTH_RATE_WINDOW_MS; }
  bucket.count++;
  authRateBuckets.set(key, bucket);
  if (bucket.count > AUTH_RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  }
  next();
}

// Periodically clear stale rate-limit + prompt buckets so the Maps don't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of aiRateBuckets) if (now > b.resetAt + AI_RATE_WINDOW_MS) aiRateBuckets.delete(k);
  for (const [k, b] of authRateBuckets) if (now > b.resetAt + AUTH_RATE_WINDOW_MS) authRateBuckets.delete(k);
  if (usedPrompts.size > 5000) usedPrompts.clear();
}, 10 * 60 * 1000);

// Server-derived report cache key — never trust a client-supplied periodKey.
// Mirrors the client's omniaReportPeriodKey() but computed here so the once-per-period
// cache can't be bypassed by sending arbitrary keys. offset is clamped to a sane range.
function serverPeriodKey(period, offset) {
  offset = parseInt(offset, 10);
  if (!Number.isFinite(offset)) offset = 0;
  offset = Math.max(-60, Math.min(0, offset)); // only current + recent past periods
  const now = new Date();
  if (period === 'daily') {
    const d = new Date(now); d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  }
  if (period === 'weekly') {
    const sun = new Date(now); sun.setUTCDate(now.getUTCDate() - now.getUTCDay() + offset * 7);
    return 'w-' + sun.toISOString().slice(0, 10);
  }
  // monthly
  const mo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  return 'm-' + mo.getUTCFullYear() + '-' + String(mo.getUTCMonth() + 1).padStart(2, '0');
}

function clampText(value, max) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function compactContext(value, depth = 0) {
  if (depth > 4) return null;
  if (Array.isArray(value)) return value.slice(0, 16).map(item => compactContext(item, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).slice(0, 36).forEach(key => {
      out[clampText(key, 40)] = compactContext(value[key], depth + 1);
    });
    return out;
  }
  if (typeof value === 'string') return clampText(value, 420);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  return null;
}

async function generateAiMessage(feature, context) {
  if (!OPENAI_API_KEY) {
    const err = new Error('OPENAI_API_KEY is not configured');
    err.status = 503;
    throw err;
  }

  const prompts = {
    progress_report:
      'You are Omnia, a deeply perceptive guide inside Presence who sees the user\'s growth clearly. Write a progress-report reflection that makes the user feel genuinely seen. Open by acknowledging a specific number or achievement from their data — not with atmosphere or metaphor, but with direct recognition. Then give real encouragement rooted in what they actually did. Close with one forward-looking thought that builds momentum. Be warm, direct, and enthusiastic — never generic, never poetic filler. The user should feel like Omnia truly watched and noticed them. Do not mention AI, data, or reports. STRICT word limits: daily 40-55 words, weekly 50-65 words, monthly 60-75 words, yearly 75-90 words.',
    omnia_report:
      'You are Omnia, a personalized concentration coach inside Presence, a serious mental-training app rooted in Franz Bardon\'s hermetic concentration exercises (Clock, Visualization, Auditory, Thought Control, Asana). Your focus is the user\'s CONCENTRATION training above all else. Center your commentary on their concentration work: cite a specific concentration number (best hold in seconds, sessions, or total time), comment on which exercises they trained and — when relevant — gently point to a concentration exercise in concentration_exercises_untried they haven\'t tried, framed as a next step. Treat seconds of unbroken focus as the core metric of progress. You may briefly mention awareness only if it is clearly being neglected. Be direct, knowledgeable, and honest — like a demanding but encouraging teacher, never a generic chatbot, never poetic filler. No greeting, no sign-off. 35-60 words.'
  };

  // Omnia's Candor (1–5): the user-set dial for how blunt the criticism is.
  const CANDOR_TONE = {
    1: 'TONE: Warm and encouraging. Lead with what went well, frame shortfalls gently as opportunities, and protect the user\'s motivation above all.',
    2: 'TONE: Honest but kind. Acknowledge effort, then name gaps plainly but with care. Stay supportive.',
    3: 'TONE: Direct coach. State weaknesses and missed work plainly with no cushioning. Praise only what is earned. Be matter-of-fact.',
    4: 'TONE: Demanding teacher. Expect more. Call out slippage, low numbers, and avoided exercises bluntly. Minimal praise — it must be earned. No coddling.',
    5: 'TONE: Pitiless. Be brutally honest and unsparing, in the spirit of Bardon\'s "be pitiless with yourself — no ego here." Confront every weakness, excuse, and avoided exercise head-on. Do not flatter. Demand rigor. Still factual and grounded in their numbers — harsh, never cruel for its own sake.'
  };
  let systemContent = prompts[feature] || prompts.progress_report;
  if (feature === 'omnia_report') {
    let candor = parseInt(context && context.omnia_candor, 10);
    if (!Number.isFinite(candor) || candor < 1 || candor > 5) candor = 1;
    systemContent += ' ' + CANDOR_TONE[candor];
  }

  const payload = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: JSON.stringify(compactContext(context)).slice(0, 4200) }
    ],
    max_tokens: 500
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error?.message || 'OpenAI request failed');
    err.status = response.status;
    throw err;
  }

  const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  const message = clampText(text.trim(), 360);
  if (!message) {
    const err = new Error('OpenAI returned an empty message');
    err.status = 502;
    throw err;
  }
  return message;
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
app.post('/api/sync/auth/register', authRateLimit, async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Email and password required' });
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (username !== undefined && typeof username !== 'string') return res.status(400).json({ error: 'Invalid username' });
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
app.post('/api/sync/auth/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(401).json({ error: 'Invalid credentials' });
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
      presence_ai_report_comments_v1: data.presence_ai_report_comments_v1,
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
// Returns true if a snapshot document has real user progress
function snapshotHasMeaningfulProgress(snap) {
  try {
    const v3 = snap.presence_v3 ? JSON.parse(snap.presence_v3) : null;
    const conc = snap.presence_conc_v1 ? JSON.parse(snap.presence_conc_v1) : null;
    const omnia = snap.presence_omnia_v1 ? JSON.parse(snap.presence_omnia_v1) : null;
    const hasAwareness = v3 && ((v3.xp || 0) > 0 || (v3.totalSessions || 0) > 0 || (v3.streak || 0) > 0);
    const hasConc = conc && ((conc.xp || 0) > 0 || (conc.totalSessions || 0) > 0);
    const hasOmnia = omnia && ((omnia.akasha || 0) > 0 || (omnia.totalAkashaEarned || 0) > 0
      || (omnia.bodies && (omnia.bodies.physical > 1 || omnia.bodies.astral > 1 || omnia.bodies.mental > 1)));
    const hasJournal = snap.presence_journal_v1 && snap.presence_journal_v1.length > 50;
    return hasAwareness || hasConc || hasOmnia || hasJournal;
  } catch (e) { return false; }
}

app.get('/api/sync/sync/pull', verifyToken, async (req, res) => {
  try {
    // Search the last 20 snapshots for the most recent one with real progress.
    // This recovers from cases where a sign-out cycle accidentally pushed empty
    // data, leaving a blank snapshot as the most recent document.
    const snapshots = await syncDataCollection.find(
      { userId: new ObjectId(req.user.userId) }
    ).sort({ syncedAt: -1 }).limit(20).toArray();

    if (!snapshots.length) return res.json({ data: null, message: 'No sync data found' });

    // Prefer the most recent snapshot with meaningful progress; fall back to newest
    const best = snapshots.find(s => snapshotHasMeaningfulProgress(s)) || snapshots[0];

    res.json({
      data: {
        presence_v3: best.presence_v3,
        presence_conc_v1: best.presence_conc_v1,
        presence_prayer_v1: best.presence_prayer_v1,
        presence_journal_v1: best.presence_journal_v1,
        presence_soul_mirror_v1: best.presence_soul_mirror_v1,
        presence_ai_report_comments_v1: best.presence_ai_report_comments_v1,
        presence_guide_v1: best.presence_guide_v1,
        presence_omnia_v1: best.presence_omnia_v1,
        bardon_rpg_v2: best.bardon_rpg_v2,
        presence_visited: best.presence_visited,
      },
      syncedAt: best.syncedAt,
      deviceInfo: best.deviceInfo,
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

// DIAGNOSTIC: inspect all stored snapshots with progress summary
app.get('/api/sync/sync/diagnose', verifyToken, async (req, res) => {
  try {
    const snapshots = await syncDataCollection.find(
      { userId: new ObjectId(req.user.userId) }
    ).sort({ syncedAt: -1 }).limit(50).toArray();

    const summary = snapshots.map((s, i) => {
      let v3info = null, concInfo = null;
      try {
        const v3 = s.presence_v3 ? JSON.parse(s.presence_v3) : null;
        if (v3) v3info = { level: v3.level, xp: v3.xp, totalSessions: v3.totalSessions, streak: v3.streak };
      } catch(e) { v3info = 'parse error'; }
      try {
        const conc = s.presence_conc_v1 ? JSON.parse(s.presence_conc_v1) : null;
        if (conc) concInfo = { level: conc.level, xp: conc.xp, totalSessions: conc.totalSessions };
      } catch(e) { concInfo = 'parse error'; }
      return {
        index: i,
        syncedAt: s.syncedAt,
        deviceInfo: s.deviceInfo,
        meaningful: snapshotHasMeaningfulProgress(s),
        awareness: v3info,
        concentration: concInfo,
      };
    });

    res.json({ total: snapshots.length, snapshots: summary });
  } catch (err) {
    console.error('Diagnose error:', err.message);
    res.status(500).json({ error: 'Diagnose failed' });
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
          if (v3) {
            streak = v3.streak || 0;
            // Decay a stale streak: a friend's stored streak reflects their last sync.
            // If they haven't practiced in more than one full day, the streak is broken —
            // mirror the client's checkStreakStatus() so we don't show a phantom streak.
            if (streak > 0 && v3.lastSessionDate) {
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const last = new Date(v3.lastSessionDate); last.setHours(0, 0, 0, 0);
              if (!isNaN(last.getTime())) {
                const diffDays = Math.round((today - last) / 86400000);
                if (diffDays > 1) streak = 0;
              }
            }
          }
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
        profilePic: otherUser.profilePic || null,
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
    if (!username || typeof username !== 'string') return res.status(400).json({ error: 'Username required' });
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
    if (!requesterId || typeof requesterId !== 'string') return res.status(400).json({ error: 'requesterId required' });
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
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
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

// UPLOAD / UPDATE OWN PROFILE PICTURE
app.put('/api/sync/profile-pic', verifyToken, async (req, res) => {
  try {
    const { pic } = req.body;
    if (!pic || typeof pic !== 'string') return res.status(400).json({ error: 'pic required' });
    if (pic.length > 200000) return res.status(413).json({ error: 'Image too large' });
    if (!pic.startsWith('data:image/')) return res.status(400).json({ error: 'Invalid image format' });
    await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { $set: { profilePic: pic } }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Profile pic upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
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

app.get('/debug', verifyAdmin, (req, res) => {
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

app.post('/api/ai/progress-comment', aiRateLimit, async (req, res) => {
  try {
    const message = await generateAiMessage('progress_report', req.body?.context || {});
    res.json({ message, model: OPENAI_MODEL });
  } catch (err) {
    console.error('[AI] progress-comment error:', err.message);
    res.status(err.status || 500).json({ error: 'AI comment unavailable' });
  }
});

app.post('/api/sync/omnia/report', aiRateLimit, async (req, res) => {
  const { period, context, deviceId } = req.body || {};
  if (!['daily','weekly','monthly'].includes(period)) {
    return res.status(400).json({ error: 'Invalid period' });
  }
  // Use JWT userId if logged in, otherwise fall back to deviceId
  let userId;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
      userId = decoded.id || decoded.userId;
    } catch(e) { /* not logged in, use deviceId */ }
  }
  if (!userId) {
    if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 8) {
      return res.status(400).json({ error: 'deviceId required' });
    }
    userId = 'device_' + deviceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  }

  try {
    const col = mongoClient.db('presence').collection('omnia_reports');

    // Cache key is derived server-side from period + offset (never the client's raw
    // periodKey string) so the once-per-period cache cannot be bypassed by abuse.
    const offset = context && context.offset;
    const periodKey = serverPeriodKey(period, offset);

    // Return cached if fresh — this is the once-per-period guard
    const cached = await col.findOne({ userId, period, periodKey });
    if (cached && cached.commentary) {
      return res.json({ commentary: cached.commentary });
    }

    const commentary = await generateAiMessage('omnia_report', context || {});

    // A past period (offset < 0) is immutable — its data will never change, so
    // cache it forever (no expiresAt) and never spend another API call on it.
    // Only the current period (offset 0) gets a TTL so it can refresh as the
    // period is still in progress.
    const isPast = Number.isFinite(parseInt(offset, 10)) && parseInt(offset, 10) < 0;
    const doc = { userId, period, periodKey, commentary, generatedAt: new Date() };
    if (!isPast) {
      const ttlMs = period === 'daily' ? 86400000 : period === 'weekly' ? 7 * 86400000 : 31 * 86400000;
      doc.expiresAt = new Date(Date.now() + ttlMs);
    }
    await col.updateOne(
      { userId, period, periodKey },
      { $set: doc, $unset: isPast ? { expiresAt: '' } : {} },
      { upsert: true }
    );
    // TTL index only affects docs that have an expiresAt field; permanent
    // (past) docs omit it and are never auto-deleted.
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    res.json({ commentary });
  } catch (err) {
    console.error('[Omnia] report error:', err.stack || err.message);
    res.status(err.status || 500).json({ error: 'Omnia commentary unavailable' });
  }
});

// ── Pavlok integration ────────────────────────────────────────────────────────
const PAVLOK_API = 'https://api.pavlok.com/api/v5';
const PAVLOK_VALID_TYPES = new Set(['vibe', 'beep', 'zap']);

// Exchange Pavlok email+password for a bearer token. Token is returned to the
// client and stored in localStorage — we never persist Pavlok credentials.
app.post('/api/pavlok/link', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const r = await fetch(`${PAVLOK_API}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { email, password } }),
    });
    const data = await r.json();
    console.log('Pavlok login response status:', r.status, 'body:', JSON.stringify(data));
    // Token field name varies — try all known variants
    const token = data?.token || data?.access_token || data?.auth_token || data?.data?.token || data?.data?.access_token;
    if (!r.ok || !token) {
      return res.status(401).json({ error: data?.message || data?.error || data?.detail || 'Pavlok login failed' });
    }
    res.json({ token });
  } catch (err) {
    console.error('Pavlok link error:', err);
    res.status(502).json({ error: 'Could not reach Pavlok servers' });
  }
});

// Proxy a stimulus to the Pavlok API.  Token comes from the client (stored
// in localStorage) so no server-side credential storage is needed.
app.post('/api/pavlok/stimulus', async (req, res) => {
  const { token, type, value } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token required' });
  if (!PAVLOK_VALID_TYPES.has(type)) return res.status(400).json({ error: 'Invalid stimulus type' });
  const intensity = Math.max(1, Math.min(100, parseInt(value, 10) || 50));
  try {
    const r = await fetch(`${PAVLOK_API}/stimulus/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ stimulus: { stimulusType: type, stimulusValue: intensity } }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data?.message || 'Pavlok stimulus failed' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Pavlok stimulus error:', err);
    res.status(502).json({ error: 'Could not reach Pavlok servers' });
  }
});

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
  sub.intervalSec = Math.max(30, Math.min(3600, parseInt(intervalSec) || 120));
  sub.durationSec = Math.max(60, Math.min(14400, parseInt(durationSec) || 1800));
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
    const prompt = clampText(body, 140) || randomPromptFor(endpoint);
    const payload = JSON.stringify({ title: clampText(title, 60) || 'Presence', body: prompt, url: 'https://chooch971-tech.github.io/Consciousness-App/presence.html' });
    try { await webpush.sendNotification(sub, payload); } catch(e) { console.error(e.message); }
    return res.json({ success: true });
  }
  // Broadcast to all subscribers — admin only
  if (!ADMIN_SECRET || req.headers['x-admin-secret'] !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  let sent = 0;
  for (const sub of subscriptions) {
    const result = await pushTo(sub, randomPromptFor(sub.endpoint));
    if (result === true) sent++;
  }
  res.json({ success: true, sent });
});

app.post('/reset-sessions', verifyAdmin, async (req, res) => {
  for (const sub of subscriptions) {
    sub.sessionStart = null;
    sub.lastFiredCycle = -1;
    await saveSub(sub);
  }
  res.json({ success: true });
});

app.post('/cleanup', verifyAdmin, async (req, res) => {
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

app.post('/nuke', verifyAdmin, async (req, res) => {
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
