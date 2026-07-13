const express = require('express');
const helmet  = require('helmet');
const webpush = require('web-push');
const cors    = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { enforceOmniaReportPolicy } = require('./omnia-report-policy');
const {
  moderateUsername,
  moderatePublicText,
  moderatePrivateText,
  normalizeSort,
  rankLodgePosts
} = require('./social-safety');

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
  // No cookies are used (auth is a Bearer header), so credentialed CORS is
  // unnecessary and only widens the surface.
  credentials: false,
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
const OMNIA_REPORT_VERSION = 2;

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
let beaconsCollection;
let practiceCollection;
let followsCollection;
let postsCollection;
let likesCollection;
let commentsCollection;
let blocksCollection;
let reportsCollection;
let notificationsCollection;
let conversationsCollection;
let messagesCollection;
let userPushSubsCollection;
let subscriptions = [];
let prayerSchedules = [];
let practiceSchedules = [];

let mongoClient;
// Sanitize legacy usernames that violate either the charset or community rule.
// The migration is idempotent and resolves replacement-name collisions.
async function migrateLegacyUsernames() {
  if (!usersCollection) return;
  const candidates = await usersCollection.find({
    username: { $exists: true, $ne: null, $type: 'string' }
  }).project({ _id: 1, username: 1 }).toArray();
  const bad = candidates.filter(u => !/^[a-z0-9_]{3,24}$/.test(u.username) || !moderateUsername(u.username).ok);
  if (!bad.length) return;
  let fixed = 0;
  for (const u of bad) {
    let clean = String(u.username).trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
    if (clean.length < 3 || !moderateUsername(clean).ok) clean = 'practitioner_' + String(u._id).slice(-5);
    // Resolve collisions against any OTHER user holding the cleaned name.
    let candidate = clean, n = 0;
    while (await usersCollection.findOne({ username: candidate, _id: { $ne: u._id } })) {
      const suffix = '_' + String(u._id).slice(-(2 + n));
      candidate = clean.slice(0, 24 - suffix.length) + suffix;
      if (++n > 6) { candidate = 'practitioner_' + String(u._id).slice(-6); break; }
    }
    await usersCollection.updateOne({ _id: u._id }, { $set: { username: candidate } });
    fixed++;
  }
  console.log(`[Migration] Replaced ${fixed} legacy username(s).`);
}

// Unified graph migration: each accepted friendship becomes two active follow
// edges. Idempotent ($setOnInsert upserts), runs every boot; "friend" is now a
// derived state — a mutual pair of active follows.
async function migrateFriendsToFollows() {
  const accepted = await friendsCollection.find({ status: 'accepted' }).toArray();
  if (!accepted.length) return;
  const ops = [];
  for (const f of accepted) {
    for (const [a, b] of [[f.userId, f.friendId], [f.friendId, f.userId]]) {
      ops.push({ updateOne: {
        filter: { followerId: a, followeeId: b },
        update: { $setOnInsert: { followerId: a, followeeId: b, status: 'active', createdAt: f.createdAt || new Date() } },
        upsert: true
      } });
    }
  }
  const res = await followsCollection.bulkWrite(ops, { ordered: false });
  if (res.upsertedCount) console.log(`[Migration] Created ${res.upsertedCount} follow edge(s) from friendships.`);
}

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
    beaconsCollection = db.collection('presence_beacons');
    practiceCollection = db.collection('practice_schedules');
    followsCollection = db.collection('follows');
    postsCollection = db.collection('posts');
    likesCollection = db.collection('likes');
    commentsCollection = db.collection('comments');
    try { await followsCollection.createIndex({ followerId: 1, followeeId: 1 }, { unique: true }); } catch(e) {}
    try { await postsCollection.createIndex({ userId: 1, createdAt: -1 }); } catch(e) {}
    try { await postsCollection.createIndex({ userId: 1, type: 1, createdAt: -1 }); } catch(e) {}
    try { await postsCollection.createIndex({ createdAt: -1 }); } catch(e) {}
    try { await likesCollection.createIndex({ postId: 1, userId: 1 }, { unique: true }); } catch(e) {}
    try { await commentsCollection.createIndex({ postId: 1, createdAt: 1 }); } catch(e) {}
    blocksCollection = db.collection('blocks');
    reportsCollection = db.collection('reports');
    notificationsCollection = db.collection('notifications');
    try { await blocksCollection.createIndex({ userId: 1, blockedId: 1 }, { unique: true }); } catch(e) {}
    try { await notificationsCollection.createIndex({ userId: 1, createdAt: -1 }); } catch(e) {}
    conversationsCollection = db.collection('conversations');
    messagesCollection = db.collection('messages');
    try { await conversationsCollection.createIndex({ participants: 1 }); } catch(e) {}
    try { await messagesCollection.createIndex({ convId: 1, createdAt: 1 }); } catch(e) {}
    try { await messagesCollection.createIndex({ convId: 1, senderId: 1, createdAt: 1 }); } catch(e) {}
    userPushSubsCollection = db.collection('user_push_subs');
    try { await userPushSubsCollection.createIndex({ endpoint: 1 }, { unique: true }); } catch(e) {}
    try { await userPushSubsCollection.createIndex({ userId: 1 }); } catch(e) {}
    // TTL: let MongoDB sweep stale beacons automatically (reads also guard on expiresAt)
    try { await beaconsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); } catch(e) {}
    // Compound index makes every pull O(1) instead of a full collection scan
    try { await syncDataCollection.createIndex({ userId: 1, syncedAt: -1 }); } catch(e) {}
    // Speed up push upserts and user lookups
    try { await usersCollection.createIndex({ email: 1 }, { unique: true, sparse: true }); } catch(e) {}
    try { await usersCollection.createIndex({ googleId: 1 }, { sparse: true }); } catch(e) {}

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
    practiceSchedules = await practiceCollection.find({}).toArray();
    try { await migrateLegacyUsernames(); } catch (e) { console.error('Username migration skipped:', e.message); }
    try { await migrateFriendsToFollows(); } catch (e) { console.error('Follows migration skipped:', e.message); }
    console.log(`Connected to MongoDB. ${subscriptions.length} subscribers, ${prayerSchedules.length} prayer schedules, ${practiceSchedules.length} practice schedules.`);
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

async function savePracticeSchedule(schedule) {
  try {
    const { _id, ...data } = schedule;
    await practiceCollection.updateOne({ endpoint: schedule.endpoint }, { $set: data }, { upsert: true });
  } catch(e) { console.error('Save practice schedule error:', e.message); }
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

// ── Push-ownership middleware ────────────────────────────
// The endpoint-keyed routes (session/schedule/notify) used to authenticate by
// mere knowledge of the push-endpoint URL — which is transmitted constantly and
// long-lived. Now the caller must also prove possession of the subscription's
// `auth` secret (sent at /subscribe, never in the URL). A captured endpoint
// alone can no longer start sessions, rewrite schedules, or send pushes.
function verifyPushOwner(req, res, next) {
  const endpoint = req.body && req.body.endpoint;
  const authKey = req.body && req.body.authKey;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  const sub = subscriptions.find(s => s.endpoint === endpoint);
  if (!sub) return res.status(404).json({ error: 'Subscriber not found' });
  const stored = sub.keys && sub.keys.auth;
  if (!stored || !authKey || authKey !== stored) return res.status(403).json({ error: 'Forbidden' });
  req.pushSub = sub;
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

// Hard global ceiling on real OpenAI generations per UTC day — bounds worst-
// case spend even against rotating deviceIds/IPs that defeat the per-key limit
// and the once-per-period cache. Cached reads don't count (they never reach
// generateAiMessage). Tune AI_GLOBAL_DAILY_CAP to your budget.
const AI_GLOBAL_DAILY_CAP = 3000;
let aiGlobalDay = { key: '', count: 0 };
function aiCurrentDayKey() { return new Date().toISOString().slice(0, 10); }
function aiGlobalBudget(req, res, next) {
  const k = aiCurrentDayKey();
  if (aiGlobalDay.key !== k) aiGlobalDay = { key: k, count: 0 };
  if (aiGlobalDay.count >= AI_GLOBAL_DAILY_CAP) {
    return res.status(429).json({ error: 'AI temporarily at capacity. Try again later.' });
  }
  next();
}

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
  const s = String(value).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  // Cut on a word boundary so we never truncate mid-word (e.g. "pushing yo").
  const slice = s.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return cut.replace(/[\s,;:—-]+$/, '') + '…';
}

function compactContext(value, depth = 0) {
  if (depth > 4) return null;
  if (Array.isArray(value)) return value.slice(0, 16).map(item => compactContext(item, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).slice(0, 64).forEach(key => {
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
      'You are Omnia, a personalized concentration coach inside Presence, a serious mental-training app rooted in Franz Bardon\'s hermetic concentration exercises. Examine completed_exercises for this report day and compare them with comparison_baseline, which is the preceding seven days for a daily report. Cite a specific real number: a best hold, session duration, total practice time, or session count. Treat both practicing for longer and achieving a longer unbroken focus as meaningful progress. Do not force an exercise recommendation into every report. '
      + 'GROUNDING — these rules override tone: progress_signals and comparison_baseline contain the real comparison. Only claim improvement when best_focus_improved, practice_duration_improved, or improved_exercises supports it. If has_previous_data is false, do not claim improvement, decline, stagnation, or "no progress"; recognize the completed work as it stands. Never invent a trend. '
      + 'RECOGNITION — always open with one specific earned recognition before critique. When progress_signals shows longer practice or longer focus, commend that progress clearly. If is_new_best_hold is true, celebrate it explicitly as a new personal best. '
      + 'RECOMMENDATIONS — only suggest an exercise in allowed_recommendations. Never recommend anything in recommendation_exclusions. If avoid_clock_recommendation is true or thought_control_stack_count is 2 or more, NEVER recommend Clock, even if Clock was untried; you may still praise a Clock result the user actually completed. Two Thought Control exercises already constitute substantial foundational focus work, so encourage depth in that existing stack or omit an exercise recommendation. If ready_for_new_exercises is false, do not suggest Visualization, Auditory, or Asana. '
      + 'CURRENT REGIMEN — current_regimen_exercises describes what is already scheduled now. Do not recommend adding an exercise already represented adequately in that stack. Only discuss regimen completion when regimen_complete is not null. '
      + 'PLATEAU — days_without_improvement counts consecutive practiced days without a longer focus or longer practice duration against a trailing seven-day baseline. Only when needs_push is true (five or more such practiced days) give a firm, concrete push. Name the plateau honestly, but do not shame or scold. When needs_push is false, do not manufacture concern. '
      + 'STREAK — mention a streak only when streak_worth_mentioning is true and a supplied streak is at least 3 days. Awareness is optional: acknowledge it only when awareness_sessions is above zero, and never frame zero awareness as a gap. ALWAYS finish with genuine encouragement or confidence in the user\'s capacity to improve, regardless of candor. Be direct, knowledgeable, and specific; no greeting, sign-off, generic filler, or invented facts. 40-65 words.'
  };

  // Omnia's Candor (1–5): the user-set dial for how blunt the criticism is.
  const CANDOR_TONE = {
    1: 'TONE: Warm and encouraging. Lead with what went well, frame shortfalls gently as opportunities, and protect the user\'s motivation above all.',
    2: 'TONE: Honest but kind. Acknowledge effort, then name gaps plainly but with care. Stay supportive.',
    3: 'TONE: Direct coach. State weaknesses and missed work plainly with no cushioning. Praise only what is earned. Be matter-of-fact.',
    4: 'TONE: Demanding teacher. Expect more. Call out slippage, low numbers, and avoided exercises bluntly. Minimal praise — it must be earned. No coddling.',
    5: 'TONE: Uncompromising but constructive. Confront demonstrated weakness directly, demand rigor, and do not flatter. Remain factual, never shame the user, and end with earned encouragement and a concrete sense that improvement is possible.'
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
      { role: 'user', content: JSON.stringify(compactContext(context)).slice(0, 9000) }
    ],
    max_tokens: 500
  };

  // Count this real generation toward the global daily budget.
  const _dk = aiCurrentDayKey();
  if (aiGlobalDay.key !== _dk) aiGlobalDay = { key: _dk, count: 0 };
  aiGlobalDay.count++;

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
  // 60-word reflections can run ~400 chars; clamp generously and on a word
  // boundary so the message is never sliced mid-word.
  let message = clampText(text.trim(), 600);
  if (feature === 'omnia_report') message = enforceOmniaReportPolicy(message, context || {});
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
    url: 'https://chooch971-tech.github.io/Consciousness-App/presence.html',
    // NOTE: Pavlok is fired server-side via firePavlokServer() — exactly once
    // per bell. Do NOT add pavlok creds to the payload; the service worker
    // would then ALSO fire, double-stimulating and tripping Pavlok's rate
    // limit (zaps land a couple times then go silent). Single source of truth.
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
      // Fire a final notification if one is due at the session boundary
      // (e.g. a 10-min session with 2-min intervals — the cycle that lands
      // exactly at 10:00 was always skipped because expiry ran first).
      const finalCycle = Math.floor(totalDuration / interval);
      const lastFired = sub.lastFiredCycle ?? -1;
      if (finalCycle > lastFired && totalDuration >= interval) {
        const prompt = randomPromptFor(sub.endpoint);
        console.log(`[${new Date().toISOString()}] Final-cycle push at session end: cycle ${finalCycle}`);
        const result = await pushTo(sub, prompt);
        if (sub.pavlok && sub.pavlok.token) {
          firePavlokServer(sub.pavlok.token, sub.pavlok.type, sub.pavlok.intensity);
        }
      }
      sub.sessionStart = null;
      sub.lastFiredCycle = -1;
      sub.pavlok = null;
      await saveSub(sub);
      console.log(`[${new Date().toISOString()}] Session expired after ${totalDuration}s`);
      continue;
    }

    const currentCycle = Math.floor(elapsed / interval);
    const lastFired = sub.lastFiredCycle ?? -1;

    if (currentCycle > lastFired && elapsed >= interval) {
      const prompt = randomPromptFor(sub.endpoint);
      console.log(`[${new Date().toISOString()}] Attempting push: cycle ${currentCycle}, elapsed ${elapsed}s, interval ${interval}s`);
      // Pavlok now fires from the service worker on push arrival (device IP,
      // not server IP) so the Pavlok credentials ride in the encrypted payload.
      // Also fire server-side as a belt-and-suspenders fallback.
      const result = await pushTo(sub, prompt);
      if (sub.pavlok && sub.pavlok.token) {
        console.log(`[Pavlok] Firing server stimulus: type=${sub.pavlok.type} intensity=${sub.pavlok.intensity}`);
        firePavlokServer(sub.pavlok.token, sub.pavlok.type, sub.pavlok.intensity);
      } else {
        console.log(`[Pavlok] Skipped — sub.pavlok is ${sub.pavlok ? 'present but missing token' : 'null'} for this session`);
      }
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

// Omnia's practice-reminder copy. One is picked per nudge so the reminders
// don't read identically every day.
const PRACTICE_REMINDER_MESSAGES = [
  'Time to train. Even a few minutes keeps the thread unbroken.',
  'Your mind is waiting. Sit with me for a session.',
  'A quiet moment now is worth an hour later. Shall we practice?',
  'The work compounds. Come, let\'s sharpen your attention.',
  'I\'m here when you\'re ready. One session keeps the streak alive.',
  'Stillness is a skill. Let\'s practice it together.',
];

// ── Practice reminder loop (every 60s) ───────────────────
// Fires a real push at each scheduled local time so users are reminded to
// practice even when the app is closed. Mirrors the prayer loop, but fires
// once per time per day (a single 15-minute window, one notification).
setInterval(async () => {
  if (!practiceSchedules.length) return;
  const nowUtc = new Date();
  for (const schedule of practiceSchedules) {
    if (!schedule.enabled) continue;
    if (!schedule.times || !schedule.times.length) continue;
    const tzOffset = schedule.tzOffset || 0;
    const localNow = new Date(nowUtc.getTime() + tzOffset * 60000);
    const todayStr = localNow.toDateString();
    const nowTotalMin = localNow.getUTCHours() * 60 + localNow.getUTCMinutes();
    if (!schedule.firedToday || schedule.firedToday.date !== todayStr) {
      schedule.firedToday = { date: todayStr, fired: {} };
    }
    const fired = schedule.firedToday.fired || {};
    for (let i = 0; i < schedule.times.length; i++) {
      const parts = schedule.times[i].split(':');
      const tTotalMin = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      // 15-minute catch-up window; fire only once per time per day.
      if (nowTotalMin >= tTotalMin && nowTotalMin < tTotalMin + 15 && !fired[i]) {
        const sub = subscriptions.find(s => s.endpoint === schedule.endpoint);
        if (sub) {
          const msg = PRACTICE_REMINDER_MESSAGES[Math.floor(Math.random() * PRACTICE_REMINDER_MESSAGES.length)];
          const result = await pushTo(sub, msg, 'Omnia');
          if (result === true) fired[i] = true;
        }
      }
    }
    await savePracticeSchedule(schedule);
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
    // Same charset rules as set-username — stored usernames are rendered on
    // other users' screens, so they must never carry markup.
    let cleanUsername = null;
    if (username) {
      cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleanUsername.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters (letters, numbers, underscores)' });
      if (cleanUsername.length > 24) return res.status(400).json({ error: 'Username too long (max 24 characters)' });
      if (!moderateUsername(cleanUsername).ok) return res.status(400).json({ error: 'Choose a different username' });
    }
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });
    if (cleanUsername) {
      const existingUsername = await usersCollection.findOne({ username: cleanUsername });
      if (existingUsername) return res.status(400).json({ error: 'Username already taken' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const userDoc = { email, passwordHash, createdAt: new Date(), lastSync: null };
    if (cleanUsername) userDoc.username = cleanUsername;
    const result = await usersCollection.insertOne(userDoc);
    const token = jwt.sign({ userId: result.insertedId.toString(), email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ token, userId: result.insertedId, email, username: cleanUsername || null, isPrivate: false });
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
    res.json({ token, userId: user._id, email: user.email, username: user.username || null, isPrivate: !!user.isPrivate });
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
    if (!moderateUsername(clean).ok) return res.status(400).json({ error: 'Choose a different username' });
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
  const { code, credential } = req.body;
  if (!code && !credential) return res.status(400).json({ error: 'code or credential required' });
  try {
    // New path: the client sends an ID-token `credential` straight from Google
    // Identity Services (google.accounts.id). This grants no access token, so
    // Google reports it as a plain sign-in rather than a data-sharing event —
    // and we never needed the access token anyway, only the verified identity.
    let idToken = credential;

    // Legacy path: authorization code → exchange for tokens (kept for older
    // clients still on the initCodeClient flow until they refresh).
    if (!idToken) {
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
      idToken = tokens.id_token;
    }

    // Verify the ID token
    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({
      idToken,
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
      return res.json({ token, userId: result.insertedId, email, username: null, isPrivate: false });
    }

    if (!user.googleId) {
      await usersCollection.updateOne({ _id: user._id }, { $set: { googleId, lastActive: new Date() } });
    } else {
      await usersCollection.updateOne({ _id: user._id }, { $set: { lastActive: new Date() } });
    }

    const token = jwt.sign({ userId: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ token, userId: user._id, email: user.email, username: user.username || null, isPrivate: !!user.isPrivate });
  } catch (err) {
    console.error('[Google Auth] Error:', err.message);
    res.status(401).json({ error: 'Google sign-in failed' });
  }
});

// Plausibility clamp for Omnia progression in incoming sync snapshots.
// Honest play tops out around ~15k akasha and ~12 body levels per day, so a
// generous 50k/day and 25 levels/day ceiling never touches real users but
// stops console-cheated values from leaking into friend profiles via sync.
//
// A brand-new account has no prevSnap to diff against, so its first-ever push
// used to go through completely unclamped — set a billion akasha before the
// first sync and it was accepted as the honest baseline forever after. Cap
// that first push against generous absolute ceilings (a very dedicated
// practitioner's first few days) instead of skipping the check entirely.
const FIRST_SYNC_CAPS = { akasha: 400000, totalAkashaEarned: 400000, darkMatter: 24000, totalDarkMatterEarned: 24000, bodyLevels: 90 };

function clampOmniaSnapshot(incomingStr, prevSnap) {
  if (!incomingStr) return { str: incomingStr, clamped: false };
  const isFirstSync = !prevSnap || !prevSnap.presence_omnia_v1;
  try {
    const incoming = JSON.parse(incomingStr);
    let clamped = false;

    if (isFirstSync) {
      const total = (b) => b ? (b.physical || 0) + (b.astral || 0) + (b.mental || 0) : 0;
      if ((incoming.akasha || 0) > FIRST_SYNC_CAPS.akasha) { incoming.akasha = FIRST_SYNC_CAPS.akasha; clamped = true; }
      if ((incoming.totalAkashaEarned || 0) > FIRST_SYNC_CAPS.totalAkashaEarned) { incoming.totalAkashaEarned = FIRST_SYNC_CAPS.totalAkashaEarned; clamped = true; }
      if ((incoming.darkMatter || 0) > FIRST_SYNC_CAPS.darkMatter) { incoming.darkMatter = FIRST_SYNC_CAPS.darkMatter; clamped = true; }
      if ((incoming.totalDarkMatterEarned || 0) > FIRST_SYNC_CAPS.totalDarkMatterEarned) { incoming.totalDarkMatterEarned = FIRST_SYNC_CAPS.totalDarkMatterEarned; clamped = true; }
      if (incoming.bodies && total(incoming.bodies) > FIRST_SYNC_CAPS.bodyLevels) {
        const scale = FIRST_SYNC_CAPS.bodyLevels / total(incoming.bodies);
        ['physical', 'astral', 'mental'].forEach((b) => { incoming.bodies[b] = Math.max(1, Math.floor((incoming.bodies[b] || 0) * scale)); });
        clamped = true;
      }
      if ((incoming.bardonStep || 1) > 3) { incoming.bardonStep = 3; clamped = true; }
      if ((incoming.prestige || 0) > 0) { incoming.prestige = 0; clamped = true; }
      return { str: clamped ? JSON.stringify(incoming) : incomingStr, clamped };
    }

    const prev = JSON.parse(prevSnap.presence_omnia_v1);
    const elapsedDays = Math.max(1 / 24, (Date.now() - new Date(prevSnap.syncedAt).getTime()) / 86400000);
    const maxAkashaGain = Math.ceil(elapsedDays * 50000);
    const prevEarned = prev.totalAkashaEarned || 0;
    if ((incoming.totalAkashaEarned || 0) > prevEarned + maxAkashaGain) {
      incoming.totalAkashaEarned = prevEarned + maxAkashaGain;
      clamped = true;
    }
    const prevAkasha = prev.akasha || 0;
    if ((incoming.akasha || 0) > prevAkasha + maxAkashaGain) {
      incoming.akasha = prevAkasha + maxAkashaGain;
      clamped = true;
    }
    const maxLevels = Math.ceil(elapsedDays * 25);
    const total = (b) => b ? (b.physical || 0) + (b.astral || 0) + (b.mental || 0) : 0;
    if (incoming.bodies && total(incoming.bodies) > total(prev.bodies) + maxLevels) {
      const scale = (total(prev.bodies) + maxLevels) / total(incoming.bodies);
      ['physical', 'astral', 'mental'].forEach((b) => {
        incoming.bodies[b] = Math.max(prev.bodies && prev.bodies[b] || 1, Math.floor((incoming.bodies[b] || 0) * scale));
      });
      clamped = true;
    }
    // Dark matter: honest play is a few hundred/day; 3000/day never touches
    // real users but stops console-cheated values from reaching friends.
    const maxDmGain = Math.ceil(elapsedDays * 3000);
    const prevDmEarned = prev.totalDarkMatterEarned || 0;
    if ((incoming.totalDarkMatterEarned || 0) > prevDmEarned + maxDmGain) {
      incoming.totalDarkMatterEarned = prevDmEarned + maxDmGain;
      clamped = true;
    }
    const prevDm = prev.darkMatter || 0;
    if ((incoming.darkMatter || 0) > prevDm + maxDmGain) {
      incoming.darkMatter = prevDm + maxDmGain;
      clamped = true;
    }
    // Bardon step: honest players advance one step roughly every 1-2 weeks at
    // minimum, so allow 1 step per 3 days — generous, but a friend seeing
    // "Step X" the day after adding someone is now impossible, not just rare.
    const maxStepGain = Math.max(1, Math.ceil(elapsedDays / 3));
    const prevStep = prev.bardonStep || 1;
    if ((incoming.bardonStep || 1) > prevStep + maxStepGain) {
      incoming.bardonStep = prevStep + maxStepGain;
      clamped = true;
    }
    // Prestige resets bardonStep to 1 and increments this counter — completing
    // Book I over again honestly takes a long time, so 1 per 14 days is ample.
    const maxPrestigeGain = Math.max(1, Math.ceil(elapsedDays / 14));
    const prevPrestige = prev.prestige || 0;
    if ((incoming.prestige || 0) > prevPrestige + maxPrestigeGain) {
      incoming.prestige = prevPrestige + maxPrestigeGain;
      clamped = true;
    }
    return { str: clamped ? JSON.stringify(incoming) : incomingStr, clamped };
  } catch (e) {
    return { str: incomingStr, clamped: false };
  }
}

// Plausibility clamp for Awareness (presence_v3) and Concentration
// (presence_conc_v1) — the streak and level numbers shown on friend cards
// and profiles. Same rate-of-change-since-last-sync pattern as Omnia.
// prevSyncedAt is the timestamp of the previous stored snapshot (the server's
// own record, not client-supplied data) so elapsed real time can't be forged.
function clampProgressSnapshot(incomingStr, prevStr, prevSyncedAt, opts) {
  if (!incomingStr) return { str: incomingStr, clamped: false };
  try {
    const incoming = JSON.parse(incomingStr);
    let clamped = false;
    if (!prevStr) {
      // First sync: no history to diff against — cap to generous absolutes.
      if (opts.streakKey && (incoming[opts.streakKey] || 0) > opts.firstStreakCap) { incoming[opts.streakKey] = opts.firstStreakCap; clamped = true; }
      if ((incoming.level || 0) > opts.firstLevelCap) { incoming.level = opts.firstLevelCap; clamped = true; }
      return { str: clamped ? JSON.stringify(incoming) : incomingStr, clamped };
    }
    const prev = JSON.parse(prevStr);
    const elapsedDays = Math.max(1 / 24, (Date.now() - new Date(prevSyncedAt).getTime()) / 86400000);
    // A streak can only ever gain at most 1 per real calendar day since the
    // last sync (plus 1 day of slack for timezone/boundary rounding).
    if (opts.streakKey) {
      const prevStreak = prev[opts.streakKey] || 0;
      const maxStreak = prevStreak + Math.ceil(elapsedDays) + 1;
      if ((incoming[opts.streakKey] || 0) > maxStreak) { incoming[opts.streakKey] = maxStreak; clamped = true; }
    }
    // Level: generous per-day cap, same pattern as Omnia's body levels.
    const maxLevelGain = Math.max(1, Math.ceil(elapsedDays * opts.maxLevelPerDay));
    const prevLevel = prev.level || 1;
    if ((incoming.level || 0) > prevLevel + maxLevelGain) { incoming.level = prevLevel + maxLevelGain; clamped = true; }
    return { str: clamped ? JSON.stringify(incoming) : incomingStr, clamped };
  } catch (e) {
    return { str: incomingStr, clamped: false };
  }
}

// Plausibility clamp for the lifetime achievements map (presence_ach_v1.earned)
// shown on friend profiles. Achievements are awarded client-side and can't be
// re-derived cheaply here, so — like the other clamps — we rate-limit the
// *count* of newly-earned achievements rather than validate each one. Friends
// read the latest single snapshot, so trimming it protects the friend-facing
// surface even though a pull re-unions the user's own history.
//
// Honest play adds a badge or two on a big day; flipping every achievement adds
// dozens at once. When over budget, keep everything already earned in the prior
// snapshot plus the oldest-timestamped new ones (a mass-flip stamps them all at
// once, so the oldest are the most likely genuine). Wrongly-trimmed badges are
// re-awarded client-side and return within a day as the budget grows.
const ACH_FIRST_SYNC_CAP = 25;     // brand-new account: absolute ceiling
const ACH_NEW_PER_SYNC = 8;        // base new-badge allowance per push
const ACH_NEW_PER_DAY = 4;         // plus this many per elapsed day

function clampAchSnapshot(incomingStr, prevSnap) {
  if (!incomingStr) return { str: incomingStr, clamped: false };
  try {
    const incoming = JSON.parse(incomingStr);
    if (!incoming || !incoming.earned || typeof incoming.earned !== 'object') return { str: incomingStr, clamped: false };
    const earned = incoming.earned;
    const incKeys = Object.keys(earned);

    let prevKeys = [];
    let allowed;
    if (!prevSnap || !prevSnap.presence_ach_v1) {
      allowed = ACH_FIRST_SYNC_CAP;
    } else {
      const prev = JSON.parse(prevSnap.presence_ach_v1) || {};
      prevKeys = Object.keys(prev.earned || {});
      const elapsedDays = Math.max(1 / 24, (Date.now() - new Date(prevSnap.syncedAt).getTime()) / 86400000);
      allowed = prevKeys.length + ACH_NEW_PER_SYNC + Math.ceil(elapsedDays * ACH_NEW_PER_DAY);
    }
    if (incKeys.length <= allowed) return { str: incomingStr, clamped: false };

    // Always retain everything earned in the prior snapshot; ration only the new.
    const prevSet = new Set(prevKeys);
    const keep = new Set(prevKeys.filter((k) => k in earned));
    const budget = Math.max(0, allowed - keep.size);
    const newKeys = incKeys.filter((k) => !prevSet.has(k))
      .sort((a, b) => (Number(earned[a]) || 0) - (Number(earned[b]) || 0));
    newKeys.slice(0, budget).forEach((k) => keep.add(k));

    const trimmed = {};
    incKeys.forEach((k) => { if (keep.has(k)) trimmed[k] = earned[k]; });
    incoming.earned = trimmed;
    return { str: JSON.stringify(incoming), clamped: true };
  } catch (e) {
    return { str: incomingStr, clamped: false };
  }
}

// PUSH DATA
app.post('/api/sync/sync/push', verifyToken, async (req, res) => {
  try {
    const { data, deviceInfo } = req.body;
    if (!data) return res.status(400).json({ error: 'No data to sync' });
    let anyClamped = false;
    // Fetch once, reuse for Omnia + Awareness + Concentration — they all diff
    // against the same previous snapshot / timestamp.
    const prevSnap = await syncDataCollection.find({ userId: new ObjectId(req.user.userId) })
      .sort({ syncedAt: -1 }).limit(1).next();
    if (data.presence_omnia_v1) {
      const r = clampOmniaSnapshot(data.presence_omnia_v1, prevSnap);
      data.presence_omnia_v1 = r.str;
      if (r.clamped) anyClamped = true;
    }
    if (data.presence_v3) {
      const r = clampProgressSnapshot(data.presence_v3, prevSnap && prevSnap.presence_v3, prevSnap && prevSnap.syncedAt,
        { streakKey: 'streak', firstStreakCap: 14, firstLevelCap: 20, maxLevelPerDay: 3 });
      data.presence_v3 = r.str;
      if (r.clamped) anyClamped = true;
    }
    if (data.presence_conc_v1) {
      const r = clampProgressSnapshot(data.presence_conc_v1, prevSnap && prevSnap.presence_conc_v1, prevSnap && prevSnap.syncedAt,
        { firstLevelCap: 40, maxLevelPerDay: 6 });
      data.presence_conc_v1 = r.str;
      if (r.clamped) anyClamped = true;
    }
    if (data.presence_ach_v1) {
      const r = clampAchSnapshot(data.presence_ach_v1, prevSnap);
      data.presence_ach_v1 = r.str;
      if (r.clamped) anyClamped = true;
    }
    const omniaClamped = anyClamped;
    if (anyClamped) console.warn(`[Sync] Clamped implausible progression for user ${req.user.userId}`);
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
      presence_ach_v1: data.presence_ach_v1,
      presence_giftpath_v1: data.presence_giftpath_v1,
      deviceInfo: deviceInfo || 'Unknown device',
      syncedAt: new Date(),
    };
    const result = await syncDataCollection.insertOne(syncData);
    await usersCollection.updateOne({ _id: new ObjectId(req.user.userId) }, { $set: { lastSync: new Date() } });
    res.json({ message: 'Data synced', syncId: result.insertedId, omniaClamped });
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

// ── Cross-snapshot merge on pull ────────────────────────────────────────────
// The newest single snapshot can come from a device that's behind, which is how
// a fresh sign-in ends up surfacing stale data. Merging the recent snapshots
// field-wise — union session histories, keep counters monotonic, take the
// richest Omnia/other values — guarantees a pull always returns the best
// combined progress regardless of which device pushed last. Mirrors the
// client-side merge in presence.html.
function parseSafe(str) { try { return JSON.parse(str); } catch (e) { return null; } }

function syncProgressScoreSrv(key, obj) {
  if (!obj || typeof obj !== 'object') return 0;
  if (key === 'presence_omnia_v1') {
    const bodies = obj.bodies || {};
    const b = (k) => Math.max(0, Number(bodies[k]) || 0);
    // Monotonic-only score (mirrors the client): exclude the spendable
    // akasha/reservoir balances so spending akasha on an upgrade can't make a
    // post-spend snapshot score LOWER than a stale pre-spend one — which would
    // make pickBestValue resurrect the old snapshot and revert the purchase.
    const b2 = obj.bookII || {};
    const toolPhases = Object.keys(b2.tools || {}).reduce((n, k) => n + ((b2.tools[k] && b2.tools[k].p) || 0), 0);
    const b2b = b2.bodies || {};
    // Prestige is a generational marker and dominates (mirrors the client):
    // a prestiged snapshot must never lose to a stale pre-prestige one.
    return (obj.prestige || 0) * 10000000
      + (obj.totalDarkMatterEarned || 0) * 50
      + (obj.totalDarkMatterSpent || 0) * 50
      + toolPhases * 5000
      + ((Number(b2b.astral) || 0) + (Number(b2b.mental) || 0) + (Number(b2b.wisdom) || 0)) * 1500
      + ((b2.sphere) || 0) * 20000
      + (obj.totalAkashaEarned || 0) + (obj.totalAkashaSpent || 0)
      + (b('physical') + b('astral') + b('mental')) * 1000
      + ((obj.bardonStep || 1) - 1) * 10000
      + ((obj.completedRecommended || 0) * 100);
  }
  if (obj.xp != null) return obj.xp;
  return obj.totalSessions || (obj.history && obj.history.length) || 0;
}

// Pick the best raw value for a key across snapshots (newest-first). Newest
// _resetAt wins; within the same reset, highest progress score; ties to newest.
function pickBestValue(key, snaps) {
  let bestStr = null, bestReset = -1, bestScore = -Infinity;
  for (const s of snaps) {
    const v = s[key];
    if (!v) continue;
    const obj = parseSafe(v);
    if (!obj) { if (bestStr === null) bestStr = v; continue; }
    const reset = (obj._resetAt) || 0;
    const score = syncProgressScoreSrv(key, obj);
    if (bestStr === null || reset > bestReset || (reset === bestReset && score > bestScore)) {
      bestStr = v; bestReset = reset; bestScore = score;
    }
  }
  return bestStr;
}

function mergeHistoryArraysSrv(a, b, cap) {
  a = Array.isArray(a) ? a : []; b = Array.isArray(b) ? b : [];
  const seen = {}, out = [];
  a.concat(b).forEach((h) => {
    if (!h || typeof h !== 'object') return;
    const id = h.date || JSON.stringify(h);
    if (seen[id]) return;
    seen[id] = true; out.push(h);
  });
  out.sort((x, y) => (y.date ? new Date(y.date).getTime() : 0) - (x.date ? new Date(x.date).getTime() : 0));
  return cap && out.length > cap ? out.slice(0, cap) : out;
}

const SRV_HISTORY_MERGE = {
  presence_conc_v1: { arrays: ['history'], maxNums: ['xp','totalSessions','bestSeconds','bestAsanaSeconds','level'] },
  presence_v3:      { arrays: ['history','weeklyScores'], maxNums: ['xp','totalSessions','streak','longestStreak','level'] },
};

function mergeHistoryKey(key, snaps) {
  const spec = SRV_HISTORY_MERGE[key];
  const baseStr = pickBestValue(key, snaps);
  if (!spec || !baseStr) return baseStr;
  const base = parseSafe(baseStr);
  if (!base) return baseStr;
  const baseReset = (base._resetAt) || 0;
  snaps.forEach((s) => {
    const o = parseSafe(s[key]); if (!o) return;
    if (((o._resetAt) || 0) !== baseReset) return; // don't merge across a reset boundary
    spec.arrays.forEach((f) => { base[f] = mergeHistoryArraysSrv(base[f], o[f], 100); });
    spec.maxNums.forEach((f) => {
      if (base[f] != null || o[f] != null) base[f] = Math.max(Number(base[f]) || 0, Number(o[f]) || 0);
    });
    if (key === 'presence_conc_v1' && !base.clockTheme && o.clockTheme) base.clockTheme = o.clockTheme;
  });
  return JSON.stringify(base);
}

function mergeOmniaKey(snaps) {
  const baseStr = pickBestValue('presence_omnia_v1', snaps);
  if (!baseStr) return baseStr;
  const base = parseSafe(baseStr);
  if (!base) return baseStr;
  const baseReset = (base._resetAt) || 0;
  base.bodies = base.bodies || {};
  base.bookII = base.bookII || {};
  base.bookII.tools = base.bookII.tools || {};
  // Prestige is a generational marker (mirrors the client's mergeOmniaPull):
  // a turning deliberately resets bardonStep/bodies/sphere, so those fields
  // only fold from snapshots of the SAME generation — otherwise a stale
  // pre-prestige snapshot's higher step/bodies would silently revert the
  // turning on the next pull.
  let gen = Number(base.prestige) || 0;
  snaps.forEach((s) => {
    const o = parseSafe(s.presence_omnia_v1);
    if (o && ((o._resetAt) || 0) === baseReset) gen = Math.max(gen, Number(o.prestige) || 0);
  });
  base.prestige = gen;
  snaps.forEach((s) => {
    const o = parseSafe(s.presence_omnia_v1); if (!o) return;
    // Daily-gift claim marker: keep the later date so a device that already
    // claimed today's offering can't have it reopened by another snapshot.
    // Folded ahead of the reset guard — a progress reset shouldn't reopen it.
    if ((o.offeringDay || '') > (base.offeringDay || '')) base.offeringDay = o.offeringDay;
    // Seven-Gifts devotion is a permanent loyalty reward — keep the higher
    // stack count (capped at 24 / +48%) and OR the legacy flag, ungated.
    base.devotionStacks = Math.min(24, Math.max(Number(base.devotionStacks) || 0, Number(o.devotionStacks) || 0));
    base.devotionEarned = !!(base.devotionEarned || o.devotionEarned);
    if (((o._resetAt) || 0) !== baseReset) return;
    // Permanent across turnings: magical tools, Book II bodies, story.
    const oT = ((o.bookII || {}).tools) || {};
    Object.keys(oT).forEach((k) => {
      const bt = base.bookII.tools[k] || (base.bookII.tools[k] = { p: 0, readyAt: 0 });
      const ot = oT[k] || {};
      if ((ot.p || 0) > (bt.p || 0)) { bt.p = ot.p || 0; bt.readyAt = ot.readyAt || 0; }
    });
    const oB = ((o.bookII || {}).bodies) || null;
    if (oB) {
      base.bookII.bodies = base.bookII.bodies || { astral: 1, mental: 1, wisdom: 1 };
      ['astral','mental','wisdom'].forEach((bd) => {
        base.bookII.bodies[bd] = Math.max(Number(base.bookII.bodies[bd]) || 1, Number(oB[bd]) || 1);
      });
    }
    const union = [].concat(base.storySeen || [], o.storySeen || []);
    base.storySeen = union.filter((id, i) => union.indexOf(id) === i);
    base.storyRead = Math.max(Number(base.storyRead) || 0, Number(o.storyRead) || 0);
    // Generation-gated: fields a turning resets, plus in-run monotonics.
    if ((Number(o.prestige) || 0) !== gen) return;
    ['completedRecommended','totalAkashaEarned','totalAkashaSpent','darkMatter','totalDarkMatterEarned','totalDarkMatterSpent'].forEach((f) => { base[f] = Math.max(Number(base[f]) || 0, Number(o[f]) || 0); });
    base.bardonStep = Math.max(Number(base.bardonStep) || 1, Number(o.bardonStep) || 1);
    const ob = o.bodies || {};
    ['physical','astral','mental'].forEach((bd) => { base.bodies[bd] = Math.max(Number(base.bodies[bd]) || 1, Number(ob[bd]) || 1); });
    if ((o.bookII || {}).sphere != null) {
      base.bookII.sphere = Math.max(Number(base.bookII.sphere) || 0, Number(o.bookII.sphere) || 0);
    }
    // Purchased upgrades are monotonic — keep the higher level of each so a
    // stale snapshot can't revert an upgrade the user just bought.
    base.upgrades = base.upgrades || {};
    const ou = o.upgrades || {};
    Object.keys(ou).forEach((u) => { base.upgrades[u] = Math.max(Number(base.upgrades[u]) || 1, Number(ou[u]) || 1); });
  });
  return JSON.stringify(base);
}

// Achievements are monotonic: a badge, once earned on any device, stays earned
// everywhere. Union the earned maps (and the supporting counters) across every
// snapshot so a pull never hands a device an emptier set than it had — which is
// what let already-earned achievements re-award akasha on a second device.
function mergeAchKey(snaps) {
  const best = parseSafe(pickBestValue('presence_ach_v1', snaps));
  const resetAt = (best && best._resetAt) || 0;
  const objs = [];
  snaps.forEach((s) => {
    const o = parseSafe(s.presence_ach_v1);
    if (o && ((o._resetAt || 0) === resetAt)) objs.push(o);
  });
  if (!objs.length) return null;
  let maxV = 1, monthKey = '';
  objs.forEach((o) => { maxV = Math.max(maxV, Number(o.hwmV) || 1); const mk = String((o.monthly || {}).key || ''); if (mk > monthKey) monthKey = mk; });
  const out = { earned: {}, hwm: {}, hwmV: maxV, flags: {}, counters: {}, friendsSeen: {},
    clearedKeys: [], revoked: {}, exCount: 0, seeded: false, _remaster1: 0, monthsCleared: 0,
    monthly: { key: monthKey, earned: {}, loginDays: [], fifteen: false, spentBase: Infinity }, _updatedAt: 0 };
  // Revocations first, so a revoked badge can be dropped from the union below.
  objs.forEach((o) => { const r = o.revoked || {}; Object.keys(r).forEach((k) => { out.revoked[k] = Math.max(out.revoked[k] || 0, Number(r[k]) || 0); }); });
  const cleared = {};
  objs.forEach((o) => {
    const e = o.earned || {}; Object.keys(e).forEach((k) => { const t = Number(e[k]) || 0; if (!out.earned[k] || t < out.earned[k]) out.earned[k] = t; });
    out.exCount = Math.max(out.exCount, Number(o.exCount) || 0);
    out.seeded = out.seeded || !!o.seeded;
    out._remaster1 = (out._remaster1 || o._remaster1) ? 1 : 0;
    if ((Number(o.hwmV) || 1) === maxV) { const h = o.hwm || {}; Object.keys(h).forEach((k) => { out.hwm[k] = Math.max(out.hwm[k] || 0, Number(h[k]) || 0); }); }
    const c = o.counters || {}; Object.keys(c).forEach((k) => { out.counters[k] = Math.max(out.counters[k] || 0, Number(c[k]) || 0); });
    const f = o.flags || {}; Object.keys(f).forEach((k) => { if (out.flags[k] == null) out.flags[k] = f[k]; });
    const fs = o.friendsSeen || {}; Object.keys(fs).forEach((k) => { if (out.friendsSeen[k] == null) out.friendsSeen[k] = fs[k]; });
    (o.clearedKeys || []).forEach((k) => { cleared[k] = true; });
    const m = o.monthly || {};
    if (String(m.key || '') === monthKey) {
      const me = m.earned || {}; Object.keys(me).forEach((k) => { const t = Number(me[k]) || 0; if (!out.monthly.earned[k] || t < out.monthly.earned[k]) out.monthly.earned[k] = t; });
      out.monthly.fifteen = out.monthly.fifteen || !!m.fifteen;
      (m.loginDays || []).forEach((d) => { if (out.monthly.loginDays.indexOf(d) === -1) out.monthly.loginDays.push(d); });
      out.monthly.spentBase = Math.min(out.monthly.spentBase, Number(m.spentBase) || 0);
    }
    out._updatedAt = Math.max(out._updatedAt, Number(o._updatedAt) || 0);
  });
  Object.keys(out.revoked).forEach((id) => { if (out.earned[id] && out.earned[id] <= out.revoked[id]) delete out.earned[id]; });
  if (!isFinite(out.monthly.spentBase)) out.monthly.spentBase = 0;
  out.clearedKeys = Object.keys(cleared);
  out.monthsCleared = out.clearedKeys.length;
  if (resetAt) out._resetAt = resetAt;
  return JSON.stringify(out);
}

// The Seven Gifts path: the completed-months set (cleared) is monotonic — union
// it across every snapshot so a pull can never un-clear a month (which drives
// the stacking +2% devotion). The in-progress run is month-scoped: keep only the
// newest month across snapshots and union claimed/done among snapshots on that
// month, so last month's leftover claims can't block a new month's reset.
function mergeGiftPathKey(snaps) {
  const best = parseSafe(pickBestValue('presence_giftpath_v1', snaps));
  const resetAt = (best && best._resetAt) || 0;
  const objs = [];
  snaps.forEach((s) => {
    const o = parseSafe(s.presence_giftpath_v1);
    if (o && ((o._resetAt || 0) === resetAt)) objs.push(o);
  });
  if (!objs.length) return null;
  const clearedSeen = {}, cleared = [];
  let month = null, started = false;
  objs.forEach((o) => {
    (Array.isArray(o.cleared) ? o.cleared : []).forEach((m) => { if (m && !clearedSeen[m]) { clearedSeen[m] = 1; cleared.push(m); } });
    if (o.month && String(o.month) > String(month || '')) month = o.month;
    started = started || !!o.started;
  });
  const out = { cleared, month, started, startDate: null, claimed: [false, false, false, false, false, false, false], done: {} };
  objs.forEach((o) => {
    if ((o.month || null) !== month) return; // only fold the current month's run
    if (o.startDate && (!out.startDate || o.startDate < out.startDate)) out.startDate = o.startDate;
    const oc = Array.isArray(o.claimed) ? o.claimed : [];
    for (let i = 0; i < 7; i++) out.claimed[i] = out.claimed[i] || !!oc[i];
    const od = o.done || {}; Object.keys(od).forEach((k) => { if (od[k]) out.done[k] = true; });
  });
  if (!out.startDate && month) out.startDate = month + '-01';
  if (resetAt) out._resetAt = resetAt;
  return JSON.stringify(out);
}

function mergeSnapshots(snaps) {
  const KEYS = ['presence_v3','presence_conc_v1','presence_prayer_v1','presence_journal_v1','presence_soul_mirror_v1','presence_ai_report_comments_v1','presence_guide_v1','presence_omnia_v1','bardon_rpg_v2','presence_visited','presence_ach_v1','presence_giftpath_v1'];
  const out = {};
  KEYS.forEach((k) => {
    if (k === 'presence_omnia_v1') out[k] = mergeOmniaKey(snaps);
    else if (k === 'presence_ach_v1') out[k] = mergeAchKey(snaps);
    else if (k === 'presence_giftpath_v1') out[k] = mergeGiftPathKey(snaps);
    else if (SRV_HISTORY_MERGE[k]) out[k] = mergeHistoryKey(k, snaps);
    else out[k] = pickBestValue(k, snaps);
  });
  return out;
}

app.get('/api/sync/sync/pull', verifyToken, async (req, res) => {
  try {
    // Merge the last 20 snapshots so the pull returns the best combined progress
    // across every device, never just whichever device pushed most recently.
    const snapshots = await syncDataCollection.find(
      { userId: new ObjectId(req.user.userId) }
    ).sort({ syncedAt: -1 }).limit(20).toArray();

    // Identity fields live on the user doc (set via dedicated endpoints), not in
    // the localStorage snapshots — return them so every signed-in device stays
    // current, including one that's been signed in for a while and won't re-hit
    // the login response.
    let account = null;
    try {
      const user = await usersCollection.findOne(
        { _id: new ObjectId(req.user.userId) },
        { projection: { profilePic: 1, username: 1, isPrivate: 1, status: 1 } }
      );
      if (user) account = {
        profilePic: user.profilePic || null,
        username: user.username || null,
        isPrivate: !!user.isPrivate,
        status: user.status || null,
      };
    } catch (e) {}

    if (!snapshots.length) return res.json({ data: null, account, message: 'No sync data found' });

    const merged = mergeSnapshots(snapshots);
    const newest = snapshots[0];

    res.json({
      data: merged,
      account,
      syncedAt: newest.syncedAt,
      deviceInfo: newest.deviceInfo,
      merged: true,
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

// ── LIVE SESSION BEACON ─────────────────────────────────
// A lightweight, TTL'd marker of an in-progress session so OTHER signed-in
// devices can show "a session is running elsewhere". This is deliberately
// separate from the snapshot sync: a live session stays local-first and
// authoritative on its own device; the beacon is just a fresh-or-gone signal.
// Considered active only while its heartbeat is fresh (BEACON_TTL_MS).
const BEACON_TTL_MS = 90 * 1000;

// POST a beacon (also the heartbeat — called every ~30s while a session runs)
app.post('/api/sync/presence/beacon', verifyToken, async (req, res) => {
  try {
    const { deviceId, mode, exercise, startedAt, device } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    const now = Date.now();
    await beaconsCollection.updateOne(
      { userId: new ObjectId(req.user.userId), deviceId: String(deviceId) },
      { $set: {
          mode: typeof mode === 'string' ? mode.slice(0, 24) : 'awareness',
          exercise: typeof exercise === 'string' ? exercise.slice(0, 48) : '',
          device: typeof device === 'string' ? device.slice(0, 24) : 'a device',
          startedAt: Number(startedAt) || now,
          updatedAt: new Date(now),
          // expiresAt drives the MongoDB TTL index; reads also check it directly
          expiresAt: new Date(now + BEACON_TTL_MS),
      } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Beacon error:', err.message);
    res.status(500).json({ error: 'Beacon failed' });
  }
});

// Clear this device's beacon when its session ends
app.post('/api/sync/presence/clear', verifyToken, async (req, res) => {
  try {
    const { deviceId } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    await beaconsCollection.deleteOne({ userId: new ObjectId(req.user.userId), deviceId: String(deviceId) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Clear failed' });
  }
});

// Read the most recent fresh beacon from a DIFFERENT device
app.get('/api/sync/presence/active', verifyToken, async (req, res) => {
  try {
    const exclude = req.query.exclude ? String(req.query.exclude) : null;
    const query = { userId: new ObjectId(req.user.userId), expiresAt: { $gt: new Date() } };
    if (exclude) query.deviceId = { $ne: exclude };
    const b = await beaconsCollection.find(query).sort({ updatedAt: -1 }).limit(1).next();
    if (!b) return res.json({ active: null });
    res.json({ active: { mode: b.mode, exercise: b.exercise, device: b.device, startedAt: b.startedAt } });
  } catch (err) {
    res.status(500).json({ error: 'Active lookup failed' });
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
      // Practice calendar + last session date feed the client-side Streak Society shared-streak computation.
      let practicedDates = [], lastSessionDate = null;
      // Earned achievements so a friend's profile can show what they've reached.
      let achEarned = {}, achMonthlyEarned = {}, achMonthlyKey = null;

      if (latestSync) {
        try {
          const v3 = latestSync.presence_v3 ? JSON.parse(latestSync.presence_v3) : null;
          if (v3) {
            streak = v3.streak || 0;
            practicedDates = Array.isArray(v3.practicedDates) ? v3.practicedDates.slice(-90) : [];
            lastSessionDate = v3.lastSessionDate || null;
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
        try {
          const ach = latestSync.presence_ach_v1 ? JSON.parse(latestSync.presence_ach_v1) : null;
          if (ach) {
            if (ach.earned && typeof ach.earned === 'object') achEarned = ach.earned;
            if (ach.monthly && typeof ach.monthly === 'object') {
              if (ach.monthly.earned && typeof ach.monthly.earned === 'object') achMonthlyEarned = ach.monthly.earned;
              if (ach.monthly.key) achMonthlyKey = ach.monthly.key;
            }
          }
        } catch(e) {}
      }

      friends.push({
        userId: otherId,
        username: otherUser.username || ('practitioner_' + String(otherId).slice(-5)),
        profilePic: otherUser.profilePic || null,
        status: otherUser.status || null,
        lastSync: latestSync ? latestSync.syncedAt : null,
        lastActive: otherUser.lastActive || null,
        streak, concLevel, concXp, akasha, bardonStep, bodies,
        practicedDates, lastSessionDate,
        achEarned, achMonthlyEarned, achMonthlyKey
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
      _id: { $ne: new ObjectId(selfId) },
      // Private accounts opt out of discovery — they can still be added by anyone
      // who knows their exact username via /friends/request.
      isPrivate: { $ne: true }
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
    // Unified graph: friendship = mutual follow. Keep edges in sync.
    for (const [a, b] of [[selfId, requesterId], [requesterId, selfId]]) {
      try {
        await followsCollection.updateOne(
          { followerId: a, followeeId: b },
          { $set: { status: 'active' }, $setOnInsert: { followerId: a, followeeId: b, createdAt: new Date() } },
          { upsert: true }
        );
      } catch(e) {}
    }
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
    // Sever both follow directions too — unfriending ends the mutual follow.
    try {
      await followsCollection.deleteMany({ $or: [
        { followerId: selfId, followeeId: userId },
        { followerId: userId, followeeId: selfId }
      ] });
    } catch(e) {}
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
      requests.push({ userId: doc.userId, username: user.username || ('practitioner_' + String(doc.userId).slice(-5)) });
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
    // Must be a clean base64 image data-URL and nothing else — no quotes,
    // parens, or other characters that could break out of a CSS url() sink.
    if (!/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(pic)) {
      return res.status(400).json({ error: 'Invalid image format' });
    }
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

// STATUS — set the short daily status shared with friends. Empty text clears it
// but still carries a timestamp so the clear propagates monotonically.
app.put('/api/sync/status', verifyToken, async (req, res) => {
  try {
    let { text } = req.body;
    if (typeof text !== 'string') return res.status(400).json({ error: 'text required' });
    text = text.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 280);
    if (text && !moderatePublicText(text).ok) return res.status(400).json({ error: 'This update cannot be published' });
    const status = { text, updatedAt: new Date() };
    await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { $set: { status } }
    );
    res.json({ ok: true, status });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// PRIVACY — toggle whether this account is discoverable in friend search
app.put('/api/sync/privacy', verifyToken, async (req, res) => {
  try {
    const { isPrivate } = req.body;
    if (typeof isPrivate !== 'boolean') return res.status(400).json({ error: 'isPrivate boolean required' });
    await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { $set: { isPrivate } }
    );
    res.json({ ok: true, isPrivate });
  } catch (err) {
    console.error('Privacy update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// ── THE LODGE — social feed (see SOCIAL_PLAN.md) ─────────
// Posts + likes + comments over the unified follows graph. Submission routes
// enforce moderation here on the server; client checks are only explanatory.
const POST_MAX_LEN = 280;

function sanitizeSocialText(text, maxLen) {
  if (typeof text !== 'string') return null;
  const clean = text.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLen);
  return clean.length ? clean : null;
}

async function lodgeFollowingIds(userId) {
  const rows = await followsCollection.find({ followerId: userId, status: 'active' })
    .project({ followeeId: 1 }).toArray();
  return rows.map(r => r.followeeId);
}

function lodgePostAllowed(post) {
  return !!(post && moderatePublicText(post.text || '').ok
    && (!post.title || moderatePublicText(post.title).ok));
}

// Attach author identity + viewer's like state to a page of posts.
async function decoratePosts(posts, viewerId) {
  posts = posts.filter(lodgePostAllowed);
  const userIds = [...new Set(posts.map(p => p.userId))];
  const users = userIds.length ? await usersCollection.find(
    { _id: { $in: userIds.map(id => new ObjectId(id)) } }
  ).project({ username: 1, profilePic: 1 }).toArray() : [];
  const byId = {}; users.forEach(u => { byId[u._id.toString()] = u; });
  const postIds = posts.map(p => p._id.toString());
  const myLikes = postIds.length ? await likesCollection.find({ postId: { $in: postIds }, userId: viewerId }).toArray() : [];
  const likedSet = new Set(myLikes.map(l => l.postId));
  return posts.map(p => ({
    id: p._id.toString(),
    userId: p.userId,
    username: (byId[p.userId] && byId[p.userId].username) || ('practitioner_' + String(p.userId).slice(-5)),
    profilePic: (byId[p.userId] && byId[p.userId].profilePic) || null,
    text: p.text,
    type: p.type || 'note',
    title: p.title || null,
    createdAt: p.createdAt,
    likeCount: Math.max(0, p.likeCount || 0),
    commentCount: Math.max(0, p.commentCount || 0),
    likedByMe: likedSet.has(p._id.toString()),
    mine: p.userId === viewerId
  }));
}

// CREATE POST — doubles as the current status so existing surfaces update.
const BLOG_MAX_LEN = 5000;

app.post('/api/social/posts', verifyToken, async (req, res) => {
  try {
    const type = req.body.type === 'blog' ? 'blog' : 'note';
    const text = sanitizeSocialText(req.body.text, type === 'blog' ? BLOG_MAX_LEN : POST_MAX_LEN);
    if (!text) return res.status(400).json({ error: 'text required' });
    const title = (type === 'blog' && req.body.title) ? sanitizeSocialText(req.body.title, 80) : null;
    if (!moderatePublicText(text).ok || (title && !moderatePublicText(title).ok)) {
      return res.status(400).json({ error: 'This writing cannot be published' });
    }
    const userId = req.user.userId;
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const todayCount = await postsCollection.countDocuments({ userId, createdAt: { $gte: dayStart } });
    if (todayCount >= 30) return res.status(429).json({ error: 'Daily post limit reached' });
    const post = { userId, text, type, title, createdAt: new Date(), likeCount: 0, commentCount: 0 };
    const r = await postsCollection.insertOne(post);
    // Only short notes double as the current status — an essay isn't a status.
    if (type === 'note') {
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { status: { text, updatedAt: post.createdAt } } }
      );
    }
    res.json({ ok: true, post: { id: r.insertedId.toString(), text, type, title, createdAt: post.createdAt } });
  } catch (err) {
    console.error('Post create error:', err);
    res.status(500).json({ error: 'Post failed' });
  }
});

// FEED — own posts + people followed. Newest uses a timestamp cursor; ranked
// views use an offset cursor over a bounded six-month candidate window.
app.get('/api/social/feed', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sort = normalizeSort(req.query.sort);
    const ids = await lodgeFollowingIds(userId);
    ids.push(userId);
    const q = { userId: { $in: ids } };
    q.type = req.query.type === 'blog' ? 'blog' : { $ne: 'blog' };
    if (sort === 'newest' && req.query.cursor) {
      const before = new Date(req.query.cursor);
      if (!isNaN(before.getTime())) q.createdAt = { $lt: before };
    }
    if (sort === 'newest') {
      const posts = await postsCollection.find(q).sort({ createdAt: -1 }).limit(20).toArray();
      const nextCursor = posts.length === 20 ? posts[posts.length - 1].createdAt.toISOString() : null;
      return res.json({ posts: await decoratePosts(posts, userId), sort, nextCursor });
    }

    const horizon = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    q.createdAt = { $gte: horizon };
    const match = /^rank:([a-z]+):(\d+)$/.exec(String(req.query.cursor || ''));
    const offset = match && match[1] === sort ? Math.min(480, Number(match[2]) || 0) : 0;
    const candidates = await postsCollection.find(q).sort({ createdAt: -1 }).limit(500).toArray();
    const ranked = rankLodgePosts(candidates.filter(lodgePostAllowed), sort);
    const posts = ranked.slice(offset, offset + 20);
    const nextCursor = offset + 20 < ranked.length ? `rank:${sort}:${offset + 20}` : null;
    res.json({ posts: await decoratePosts(posts, userId), sort, nextCursor });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Feed failed' });
  }
});

// A USER'S POST HISTORY — self, or someone you actively follow.
app.get('/api/social/users/:id/posts', verifyToken, async (req, res) => {
  try {
    const viewerId = req.user.userId, targetId = req.params.id;
    if (targetId !== viewerId) {
      const edge = await followsCollection.findOne({ followerId: viewerId, followeeId: targetId, status: 'active' });
      if (!edge) return res.status(403).json({ error: 'Not following this practitioner' });
    }
    const q = { userId: targetId };
    if (req.query.cursor) {
      const before = new Date(req.query.cursor);
      if (!isNaN(before.getTime())) q.createdAt = { $lt: before };
    }
    const posts = await postsCollection.find(q).sort({ createdAt: -1 }).limit(20).toArray();
    res.json({ posts: await decoratePosts(posts, viewerId) });
  } catch (err) {
    res.status(500).json({ error: 'Posts failed' });
  }
});

// DELETE OWN POST — takes its likes and comments with it.
app.delete('/api/social/posts/:id', verifyToken, async (req, res) => {
  try {
    const post = await postsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (post.userId !== req.user.userId) return res.status(403).json({ error: 'Not yours' });
    await postsCollection.deleteOne({ _id: post._id });
    const pid = post._id.toString();
    await likesCollection.deleteMany({ postId: pid });
    await commentsCollection.deleteMany({ postId: pid });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// LIKE TOGGLE
app.post('/api/social/posts/:id/like', verifyToken, async (req, res) => {
  try {
    const post = await postsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!(await canEngagePost(req.user.userId, post))) return res.status(403).json({ error: 'Not available' });
    const postId = post._id.toString(), userId = req.user.userId;
    const existing = await likesCollection.findOne({ postId, userId });
    let liked;
    if (existing) {
      const del = await likesCollection.deleteOne({ _id: existing._id });
      // Only decrement when this call actually removed the like — a concurrent
      // duplicate unlike must not drive the counter negative.
      if (del.deletedCount === 1) await postsCollection.updateOne({ _id: post._id }, { $inc: { likeCount: -1 } });
      liked = false;
    } else {
      try {
        await likesCollection.insertOne({ postId, userId, createdAt: new Date() });
        await postsCollection.updateOne({ _id: post._id }, { $inc: { likeCount: 1 } });
      } catch(e) {} // unique-index race: already liked
      liked = true;
      notify(post.userId, 'like', userId, postId);
    }
    const fresh = await postsCollection.findOne({ _id: post._id });
    res.json({ liked, likeCount: Math.max(0, (fresh && fresh.likeCount) || 0) });
  } catch (err) {
    res.status(500).json({ error: 'Like failed' });
  }
});

// LIKERS — usernames; private accounts redacted unless mutual with viewer.
app.get('/api/social/posts/:id/likers', verifyToken, async (req, res) => {
  try {
    const viewerId = req.user.userId;
    const lp = await postsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!lp) return res.status(404).json({ error: 'Post not found' });
    if (!(await canEngagePost(viewerId, lp))) return res.status(403).json({ error: 'Not available' });
    let likes = await likesCollection.find({ postId: req.params.id }).sort({ createdAt: -1 }).limit(100).toArray();
    const hiddenL = await blockedIdSet(viewerId);
    likes = likes.filter(l => !hiddenL.has(l.userId));
    const ids = likes.map(l => l.userId);
    if (!ids.length) return res.json({ likers: [] });
    const users = await usersCollection.find({ _id: { $in: ids.map(id => new ObjectId(id)) } })
      .project({ username: 1, isPrivate: 1 }).toArray();
    const iFollow = new Set((await followsCollection.find(
      { followerId: viewerId, followeeId: { $in: ids }, status: 'active' }).toArray()).map(f => f.followeeId));
    const followMe = new Set((await followsCollection.find(
      { followeeId: viewerId, followerId: { $in: ids }, status: 'active' }).toArray()).map(f => f.followerId));
    const likers = users.map(u => {
      const id = u._id.toString();
      const mutual = id === viewerId || (iFollow.has(id) && followMe.has(id));
      if (u.isPrivate && !mutual) return { private: true };
      return { username: u.username || ('practitioner_' + id.slice(-5)) };
    });
    res.json({ likers });
  } catch (err) {
    res.status(500).json({ error: 'Likers failed' });
  }
});

// COMMENTS — list / add / delete own.
app.get('/api/social/posts/:id/comments', verifyToken, async (req, res) => {
  try {
    const cp = await postsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!cp) return res.status(404).json({ error: 'Post not found' });
    if (!(await canEngagePost(req.user.userId, cp))) return res.status(403).json({ error: 'Not available' });
    let comments = await commentsCollection.find({ postId: req.params.id }).sort({ createdAt: 1 }).limit(200).toArray();
    const hidden = await blockedIdSet(req.user.userId);
    comments = comments.filter(c => !hidden.has(c.userId) && moderatePublicText(c.text || '').ok);
    const ids = [...new Set(comments.map(c => c.userId))];
    const users = ids.length ? await usersCollection.find({ _id: { $in: ids.map(id => new ObjectId(id)) } })
      .project({ username: 1 }).toArray() : [];
    const byId = {}; users.forEach(u => { byId[u._id.toString()] = u; });
    res.json({ comments: comments.map(c => ({
      id: c._id.toString(),
      userId: c.userId,
      username: (byId[c.userId] && byId[c.userId].username) || ('practitioner_' + String(c.userId).slice(-5)),
      text: c.text,
      createdAt: c.createdAt,
      mine: c.userId === req.user.userId
    })) });
  } catch (err) {
    res.status(500).json({ error: 'Comments failed' });
  }
});

app.post('/api/social/posts/:id/comments', verifyToken, async (req, res) => {
  try {
    const text = sanitizeSocialText(req.body.text, POST_MAX_LEN);
    if (!text) return res.status(400).json({ error: 'text required' });
    if (!moderatePublicText(text).ok) return res.status(400).json({ error: 'This comment cannot be published' });
    const post = await postsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!(await canEngagePost(req.user.userId, post))) return res.status(403).json({ error: 'Not available' });
    const userId = req.user.userId;
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const todayCount = await commentsCollection.countDocuments({ userId, createdAt: { $gte: dayStart } });
    if (todayCount >= 120) return res.status(429).json({ error: 'Daily comment limit reached' });
    const c = { postId: post._id.toString(), userId, text, createdAt: new Date() };
    const r = await commentsCollection.insertOne(c);
    await postsCollection.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });
    notify(post.userId, 'comment', userId, post._id.toString());
    const me = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { username: 1 } });
    res.json({ ok: true, comment: {
      id: r.insertedId.toString(), userId,
      username: (me && me.username) || ('practitioner_' + userId.slice(-5)),
      text, createdAt: c.createdAt, mine: true
    } });
  } catch (err) {
    res.status(500).json({ error: 'Comment failed' });
  }
});

app.delete('/api/social/comments/:id', verifyToken, async (req, res) => {
  try {
    const c = await commentsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (c.userId !== req.user.userId) return res.status(403).json({ error: 'Not yours' });
    const delc = await commentsCollection.deleteOne({ _id: c._id });
    if (delc.deletedCount === 1) await postsCollection.updateOne({ _id: new ObjectId(c.postId) }, { $inc: { commentCount: -1 } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ── THE LODGE Phase 2: follows, blocks, reports, notifications ──

// Whether viewer may interact with (like/comment on/read comments of) a post.
// Guards two leaks: a blocked user re-using cached postIds to attach content
// the owner can't see, and strangers engaging a private account's posts.
async function canEngagePost(viewerId, post) {
  if (post.userId === viewerId) return true;
  const blockedEither = await blocksCollection.findOne({ $or: [
    { userId: viewerId, blockedId: post.userId },
    { userId: post.userId, blockedId: viewerId }
  ] });
  if (blockedEither) return false;
  const owner = await usersCollection.findOne({ _id: new ObjectId(post.userId) }, { projection: { isPrivate: 1 } });
  if (owner && owner.isPrivate) {
    const edge = await followsCollection.findOne({ followerId: viewerId, followeeId: post.userId, status: 'active' });
    if (!edge) return false;
  }
  return true;
}

// Users blocked by-or-blocking userId (filter both directions on reads).
async function blockedIdSet(userId) {
  const rows = await blocksCollection.find({ $or: [{ userId }, { blockedId: userId }] }).toArray();
  const s = new Set();
  rows.forEach(r => s.add(r.userId === userId ? r.blockedId : r.userId));
  return s;
}

// Upsert-dedup notification: like/unlike cycles can't spam the target.
async function notify(userId, kind, actorId, refId) {
  if (!userId || userId === actorId) return;
  try {
    await notificationsCollection.updateOne(
      { userId, kind, actorId, refId: refId || null },
      { $set: { createdAt: new Date(), seenAt: null }, $setOnInsert: { userId, kind, actorId, refId: refId || null } },
      { upsert: true }
    );
  } catch(e) {}
}

app.post('/api/social/follow', verifyToken, async (req, res) => {
  try {
    const selfId = req.user.userId; const { userId } = req.body;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    if (userId === selfId) return res.status(400).json({ error: 'Cannot follow yourself' });
    const target = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!target) return res.status(404).json({ error: 'User not found' });
    const blockedEither = await blocksCollection.findOne({ $or: [{ userId: selfId, blockedId: userId }, { userId, blockedId: selfId }] });
    if (blockedEither) return res.status(403).json({ error: 'Unable to follow' });
    const existing = await followsCollection.findOne({ followerId: selfId, followeeId: userId });
    if (existing) return res.json({ status: existing.status });
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const todayFollows = await followsCollection.countDocuments({ followerId: selfId, createdAt: { $gte: dayStart } });
    if (todayFollows >= 100) return res.status(429).json({ error: 'Daily follow limit reached' });
    const status = target.isPrivate ? 'pending' : 'active';
    try { await followsCollection.insertOne({ followerId: selfId, followeeId: userId, status, createdAt: new Date() }); } catch(e) {}
    notify(userId, status === 'pending' ? 'follow_req' : 'follow', selfId, null);
    res.json({ status });
  } catch (err) { res.status(500).json({ error: 'Follow failed' }); }
});

app.post('/api/social/unfollow', verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    await followsCollection.deleteOne({ followerId: req.user.userId, followeeId: userId });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Unfollow failed' }); }
});

app.get('/api/social/follow/requests', verifyToken, async (req, res) => {
  try {
    const selfId = req.user.userId;
    const rows = await followsCollection.find({ followeeId: selfId, status: 'pending' }).sort({ createdAt: -1 }).limit(50).toArray();
    const ids = rows.map(r => r.followerId);
    const users = ids.length ? await usersCollection.find({ _id: { $in: ids.map(id => new ObjectId(id)) } }).project({ username: 1 }).toArray() : [];
    const byId = {}; users.forEach(u => { byId[u._id.toString()] = u; });
    res.json({ requests: rows.map(r => ({
      userId: r.followerId,
      username: (byId[r.followerId] && byId[r.followerId].username) || ('practitioner_' + String(r.followerId).slice(-5))
    })) });
  } catch (err) { res.status(500).json({ error: 'Requests failed' }); }
});

app.post('/api/social/follow/approve', verifyToken, async (req, res) => {
  try {
    const selfId = req.user.userId; const { userId } = req.body;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    const r = await followsCollection.updateOne(
      { followerId: userId, followeeId: selfId, status: 'pending' },
      { $set: { status: 'active' } }
    );
    if (r.matchedCount === 0) return res.status(404).json({ error: 'Request not found' });
    notify(userId, 'approved', selfId, null);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Approve failed' }); }
});

app.post('/api/social/follow/decline', verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    await followsCollection.deleteOne({ followerId: userId, followeeId: req.user.userId, status: 'pending' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Decline failed' }); }
});

// Follower/following counts + viewer's relationship to :id ('me' = self).
app.get('/api/social/users/:id/summary', verifyToken, async (req, res) => {
  try {
    const viewerId = req.user.userId;
    const targetId = req.params.id === 'me' ? viewerId : req.params.id;
    const followers = await followsCollection.countDocuments({ followeeId: targetId, status: 'active' });
    const following = await followsCollection.countDocuments({ followerId: targetId, status: 'active' });
    let iFollow = null, followsMe = false, blocked = false;
    if (targetId !== viewerId) {
      const edge = await followsCollection.findOne({ followerId: viewerId, followeeId: targetId });
      iFollow = edge ? edge.status : null;
      followsMe = !!(await followsCollection.findOne({ followerId: targetId, followeeId: viewerId, status: 'active' }));
      blocked = !!(await blocksCollection.findOne({ userId: viewerId, blockedId: targetId }));
    }
    res.json({ followers, following, iFollow, followsMe, blocked });
  } catch (err) { res.status(500).json({ error: 'Summary failed' }); }
});

// BLOCK — severs follows AND the legacy friendship both ways.
app.post('/api/social/block', verifyToken, async (req, res) => {
  try {
    const selfId = req.user.userId; const { userId } = req.body;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    if (userId === selfId) return res.status(400).json({ error: 'Cannot block yourself' });
    await blocksCollection.updateOne(
      { userId: selfId, blockedId: userId },
      { $setOnInsert: { userId: selfId, blockedId: userId, createdAt: new Date() } },
      { upsert: true }
    );
    await followsCollection.deleteMany({ $or: [{ followerId: selfId, followeeId: userId }, { followerId: userId, followeeId: selfId }] });
    await friendsCollection.deleteMany({ $or: [{ userId: selfId, friendId: userId }, { userId, friendId: selfId }] });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Block failed' }); }
});

app.post('/api/social/unblock', verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    await blocksCollection.deleteOne({ userId: req.user.userId, blockedId: userId });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Unblock failed' }); }
});

app.post('/api/social/report', verifyToken, async (req, res) => {
  try {
    const { kind, refId } = req.body;
    if (['post', 'comment', 'user', 'message'].indexOf(kind) === -1) return res.status(400).json({ error: 'Invalid kind' });
    if (!refId || typeof refId !== 'string' || refId.length > 64) return res.status(400).json({ error: 'refId required' });
    const reason = sanitizeSocialText(req.body.reason || '', POST_MAX_LEN) || '';
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const n = await reportsCollection.countDocuments({ reporterId: req.user.userId, createdAt: { $gte: dayStart } });
    if (n >= 20) return res.status(429).json({ error: 'Daily report limit reached' });
    await reportsCollection.insertOne({ reporterId: req.user.userId, kind, refId, reason, createdAt: new Date(), resolved: false });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Report failed' }); }
});

// Admin review of the report queue (x-admin-secret header).
app.get('/api/social/reports', verifyAdmin, async (req, res) => {
  try {
    const reports = await reportsCollection.find({ resolved: false }).sort({ createdAt: -1 }).limit(100).toArray();
    res.json({ reports });
  } catch (err) { res.status(500).json({ error: 'Reports failed' }); }
});

app.get('/api/social/notifications', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rows = await notificationsCollection.find({ userId }).sort({ createdAt: -1 }).limit(30).toArray();
    const ids = [...new Set(rows.map(r => r.actorId))];
    const users = ids.length ? await usersCollection.find({ _id: { $in: ids.map(id => new ObjectId(id)) } }).project({ username: 1 }).toArray() : [];
    const byId = {}; users.forEach(u => { byId[u._id.toString()] = u; });
    res.json({
      unseen: rows.filter(r => !r.seenAt).length,
      notifications: rows.map(r => ({
        kind: r.kind, createdAt: r.createdAt, refId: r.refId || null,
        username: (byId[r.actorId] && byId[r.actorId].username) || 'practitioner'
      }))
    });
  } catch (err) { res.status(500).json({ error: 'Notifications failed' }); }
});

app.post('/api/social/notifications/seen', verifyToken, async (req, res) => {
  try {
    await notificationsCollection.updateMany({ userId: req.user.userId, seenAt: null }, { $set: { seenAt: new Date() } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ── THE LODGE Phase 3: private chat (mutual follows only, polling) ──
// No E2E encryption — messages are plaintext in the DB; the client says so.
const DM_MAX_LEN = 1000;

async function isMutualFollow(a, b) {
  const x = await followsCollection.findOne({ followerId: a, followeeId: b, status: 'active' });
  if (!x) return false;
  return !!(await followsCollection.findOne({ followerId: b, followeeId: a, status: 'active' }));
}

app.post('/api/social/conversations/open', verifyToken, async (req, res) => {
  try {
    const selfId = req.user.userId; const { userId } = req.body;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    if (userId === selfId) return res.status(400).json({ error: 'Cannot message yourself' });
    const blockedEither = await blocksCollection.findOne({ $or: [{ userId: selfId, blockedId: userId }, { userId, blockedId: selfId }] });
    if (blockedEither) return res.status(403).json({ error: 'Unable to message' });
    if (!(await isMutualFollow(selfId, userId))) return res.status(403).json({ error: 'You can only message practitioners who follow you back' });
    const participants = [selfId, userId].sort();
    let convo = await conversationsCollection.findOne({ participants });
    if (!convo) {
      const doc = { participants, createdAt: new Date(), lastMsgAt: null, lastPreview: '', lastRead: {} };
      const r = await conversationsCollection.insertOne(doc);
      convo = Object.assign({ _id: r.insertedId }, doc);
    }
    res.json({ id: convo._id.toString() });
  } catch (err) { res.status(500).json({ error: 'Open failed' }); }
});

app.get('/api/social/conversations', verifyToken, async (req, res) => {
  try {
    const selfId = req.user.userId;
    const convos = await conversationsCollection.find({ participants: selfId }).sort({ lastMsgAt: -1 }).limit(50).toArray();
    const otherIds = convos.map(c => (c.participants || []).find(x => x !== selfId)).filter(Boolean);
    const unreadConditions = convos.map(c => ({
      convId: c._id.toString(),
      senderId: { $ne: selfId },
      createdAt: { $gt: (c.lastRead && c.lastRead[selfId]) ? new Date(c.lastRead[selfId]) : new Date(0) }
    }));
    const usersPromise = otherIds.length
      ? usersCollection.find({ _id: { $in: otherIds.map(id => new ObjectId(id)) } }).project({ username: 1, profilePic: 1 }).toArray()
      : Promise.resolve([]);
    const unreadPromise = unreadConditions.length ? messagesCollection.aggregate([
      { $match: { $or: unreadConditions } },
      { $group: { _id: '$convId', count: { $sum: 1 } } }
    ]).toArray() : Promise.resolve([]);
    const [users, unreadRows] = await Promise.all([usersPromise, unreadPromise]);
    const byId = {}; users.forEach(u => { byId[u._id.toString()] = u; });
    const unreadByConversation = new Map(unreadRows.map(row => [row._id, row.count]));
    const out = [];
    for (const c of convos) {
      const other = (c.participants || []).find(x => x !== selfId);
      const unread = unreadByConversation.get(c._id.toString()) || 0;
      out.push({
        id: c._id.toString(), userId: other,
        username: (byId[other] && byId[other].username) || ('practitioner_' + String(other).slice(-5)),
        profilePic: (byId[other] && byId[other].profilePic) || null,
        lastPreview: moderatePrivateText(c.lastPreview || '').ok ? (c.lastPreview || '') : '', lastMsgAt: c.lastMsgAt, unread
      });
    }
    res.json({ conversations: out });
  } catch (err) { res.status(500).json({ error: 'Conversations failed' }); }
});

app.get('/api/social/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    const selfId = req.user.userId;
    const convo = await conversationsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!convo || (convo.participants || []).indexOf(selfId) === -1) return res.status(404).json({ error: 'Not found' });
    let msgs = await messagesCollection.find({ convId: convo._id.toString() }).sort({ createdAt: -1 }).limit(50).toArray();
    msgs.reverse();
    msgs = msgs.filter(m => moderatePrivateText(m.text || '').ok);
    await conversationsCollection.updateOne({ _id: convo._id }, { $set: { ['lastRead.' + selfId]: new Date() } });
    res.json({ messages: msgs.map(m => ({
      id: m._id.toString(), text: m.text, createdAt: m.createdAt, mine: m.senderId === selfId
    })) });
  } catch (err) { res.status(500).json({ error: 'Messages failed' }); }
});

app.post('/api/social/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    const selfId = req.user.userId;
    const text = sanitizeSocialText(req.body.text, DM_MAX_LEN);
    if (!text) return res.status(400).json({ error: 'text required' });
    if (!moderatePrivateText(text).ok) return res.status(400).json({ error: 'This message cannot be sent' });
    const convo = await conversationsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!convo || (convo.participants || []).indexOf(selfId) === -1) return res.status(404).json({ error: 'Not found' });
    const other = (convo.participants || []).find(x => x !== selfId);
    const blockedEither = await blocksCollection.findOne({ $or: [{ userId: selfId, blockedId: other }, { userId: other, blockedId: selfId }] });
    if (blockedEither) return res.status(403).json({ error: 'Unable to message' });
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const n = await messagesCollection.countDocuments({ senderId: selfId, createdAt: { $gte: dayStart } });
    if (n >= 500) return res.status(429).json({ error: 'Daily message limit reached' });
    const m = { convId: convo._id.toString(), senderId: selfId, text, createdAt: new Date() };
    const r = await messagesCollection.insertOne(m);
    await conversationsCollection.updateOne({ _id: convo._id }, { $set: {
      lastMsgAt: m.createdAt, lastPreview: text.slice(0, 60), ['lastRead.' + selfId]: m.createdAt
    } });
    notify(other, 'dm', selfId, convo._id.toString());
    // Web-push the recipient — unless their lastRead is fresh (<25s), which
    // means they're actively polling this thread and don't need a banner.
    const otherRead = (convo.lastRead && convo.lastRead[other]) ? new Date(convo.lastRead[other]).getTime() : 0;
    if (Date.now() - otherRead > 25000) sendDmPush(other, selfId, text);
    res.json({ ok: true, message: { id: r.insertedId.toString(), text, createdAt: m.createdAt, mine: true } });
  } catch (err) { res.status(500).json({ error: 'Send failed' }); }
});

// ── THE LODGE Phase 4: per-user push subscriptions + DM push ──

// A device's push subscription maps to whichever account was last signed in
// on it (endpoint-unique upsert), so pushes never go to a previous user.
app.post('/api/social/push/register', verifyToken, async (req, res) => {
  try {
    const sub = req.body.subscription;
    if (!sub || typeof sub.endpoint !== 'string' || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      return res.status(400).json({ error: 'subscription required' });
    }
    await userPushSubsCollection.updateOne(
      { endpoint: sub.endpoint },
      { $set: { userId: req.user.userId, subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Register failed' }); }
});

app.post('/api/social/push/unregister', verifyToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint || typeof endpoint !== 'string') return res.status(400).json({ error: 'endpoint required' });
    await userPushSubsCollection.deleteOne({ endpoint, userId: req.user.userId });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Unregister failed' }); }
});

// Fire-and-forget DM push to every device the recipient is signed in on.
async function sendDmPush(userId, senderId, text) {
  try {
    const subs = await userPushSubsCollection.find({ userId }).limit(5).toArray();
    if (!subs.length) return;
    const sender = await usersCollection.findOne({ _id: new ObjectId(senderId) }, { projection: { username: 1 } });
    const payload = JSON.stringify({
      title: '@' + ((sender && sender.username) || 'practitioner'),
      body: text.slice(0, 90),
      tag: 'presence-dm',
      url: 'https://chooch971-tech.github.io/Consciousness-App/presence.html'
    });
    for (const s of subs) {
      try {
        await webpush.sendNotification(s.subscription, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          try { await userPushSubsCollection.deleteOne({ _id: s._id }); } catch(e) {}
        }
      }
    }
  } catch(e) { console.error('[DM Push] ' + e.message); }
}

// ── EXISTING ROUTES ──────────────────────────────────────

app.get('/ping', (req, res) => {
  const active = subscriptions.filter(s => s.sessionStart).length;
  res.json({
    status: 'alive',
    subscribers: subscriptions.length,
    activeSessions: active,
    prayerSchedules: prayerSchedules.length,
    practiceSchedules: practiceSchedules.length,
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

app.post('/api/ai/progress-comment', aiRateLimit, aiGlobalBudget, async (req, res) => {
  try {
    const message = await generateAiMessage('progress_report', req.body?.context || {});
    res.json({ message, model: OPENAI_MODEL });
  } catch (err) {
    console.error('[AI] progress-comment error:', err.message);
    res.status(err.status || 500).json({ error: 'AI comment unavailable' });
  }
});

app.post('/api/sync/omnia/report', aiRateLimit, aiGlobalBudget, async (req, res) => {
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
    const cached = await col.findOne({ userId, period, periodKey, version: OMNIA_REPORT_VERSION });
    if (cached && cached.commentary) {
      return res.json({ commentary: cached.commentary });
    }

    const commentary = await generateAiMessage('omnia_report', context || {});

    // A past period (offset < 0) is immutable — its data will never change, so
    // cache it forever (no expiresAt) and never spend another API call on it.
    // Only the current period (offset 0) gets a TTL so it can refresh as the
    // period is still in progress.
    const isPast = Number.isFinite(parseInt(offset, 10)) && parseInt(offset, 10) < 0;
    const doc = { userId, period, periodKey, version: OMNIA_REPORT_VERSION, commentary, generatedAt: new Date() };
    if (!isPast) {
      const ttlMs = period === 'daily' ? 86400000 : period === 'weekly' ? 7 * 86400000 : 31 * 86400000;
      doc.expiresAt = new Date(Date.now() + ttlMs);
    }
    await col.updateOne(
      { userId, period, periodKey, version: OMNIA_REPORT_VERSION },
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
    // Token field name varies — try all known variants
    const token = data?.user?.token || data?.token || data?.access_token || data?.auth_token || data?.data?.token;
    console.log('Pavlok login response status:', r.status, '— token', token ? 'received' : 'missing');
    if (!r.ok || !token) {
      return res.status(401).json({ error: data?.message || data?.error || data?.detail || 'Pavlok login failed' });
    }
    res.json({ token });
  } catch (err) {
    console.error('Pavlok link error:', err);
    res.status(502).json({ error: 'Could not reach Pavlok servers' });
  }
});

// Fire a Pavlok stimulus directly from the server (used by the awareness
// session loop so zaps stay in lockstep with push notifications even when the
// phone is locked and the client JS timer is suspended).
async function firePavlokServer(token, type, value) {
  if (!token) return false;
  const t = PAVLOK_VALID_TYPES.has(type) ? type : 'vibe';
  const intensity = Math.max(1, Math.min(100, parseInt(value, 10) || 50));
  try {
    const r = await fetch(`${PAVLOK_API}/stimulus/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ stimulus: { stimulusType: t, stimulusValue: intensity } }),
    });
    if (!r.ok) {
      console.log(`[Pavlok] Server stimulus failed: ${r.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Pavlok] Server stimulus error:', err.message);
    return false;
  }
}

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
    console.log(`[Pavlok] /stimulus/send status=${r.status}`);
    if (!r.ok) return res.status(r.status).json({ error: data?.message || data?.error || JSON.stringify(data) || 'Pavlok stimulus failed', raw: data });
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

app.post('/unsubscribe', verifyPushOwner, async (req, res) => {
  const { endpoint } = req.body;
  subscriptions = subscriptions.filter(s => s.endpoint !== endpoint);
  await deleteSub(endpoint);
  res.json({ success: true });
});

app.post('/session/start', verifyPushOwner, async (req, res) => {
  const { endpoint, intervalSec, durationSec, pavlok } = req.body;
  let sub = subscriptions.find(s => s.endpoint === endpoint);
  if (!sub) return res.status(404).json({ error: 'Subscriber not found' });
  sub.sessionStart = Date.now();
  sub.intervalSec = Math.max(30, Math.min(3600, parseInt(intervalSec) || 120));
  sub.durationSec = Math.max(60, Math.min(14400, parseInt(durationSec) || 1800));
  sub.lastFiredCycle = -1;
  // Optional Pavlok config so the server can fire the stimulus in lockstep
  // with the push, even while the phone is locked.
  if (pavlok && pavlok.token && pavlok.enabled) {
    sub.pavlok = {
      token: pavlok.token,
      type: PAVLOK_VALID_TYPES.has(pavlok.type) ? pavlok.type : 'vibe',
      intensity: Math.max(1, Math.min(100, parseInt(pavlok.intensity, 10) || 50)),
    };
  } else {
    sub.pavlok = null;
  }
  console.log(`[Pavlok] /session/start — enabled=${!!(pavlok && pavlok.enabled)} | stored sub.pavlok: ${sub.pavlok ? sub.pavlok.type + '@' + sub.pavlok.intensity : 'null'}`);
  await saveSub(sub);
  res.json({ success: true, pavlokManaged: !!sub.pavlok });
});

// Update the Pavlok config mid-session (e.g. user moves the intensity slider
// or switches Vibrate/Beep/Zap while the session is running).
app.post('/session/pavlok', verifyPushOwner, async (req, res) => {
  const { endpoint, pavlok } = req.body;
  const sub = subscriptions.find(s => s.endpoint === endpoint);
  if (!sub) return res.status(404).json({ error: 'Subscriber not found' });
  if (pavlok && pavlok.token && pavlok.enabled) {
    sub.pavlok = {
      token: pavlok.token,
      type: PAVLOK_VALID_TYPES.has(pavlok.type) ? pavlok.type : 'vibe',
      intensity: Math.max(1, Math.min(100, parseInt(pavlok.intensity, 10) || 50)),
    };
  } else {
    sub.pavlok = null;
  }
  await saveSub(sub);
  res.json({ success: true, pavlokManaged: !!sub.pavlok });
});

app.post('/session/end', verifyPushOwner, async (req, res) => {
  const { endpoint } = req.body;
  const sub = subscriptions.find(s => s.endpoint === endpoint);
  if (!sub) return res.status(404).json({ error: 'Subscriber not found' });
  sub.sessionStart = null;
  sub.lastFiredCycle = -1;
  sub.pavlok = null;
  await saveSub(sub);
  res.json({ success: true });
});

app.post('/prayer/schedule', verifyPushOwner, async (req, res) => {
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

app.post('/practice/schedule', verifyPushOwner, async (req, res) => {
  const { endpoint, times, enabled, tzOffset } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  const existing = practiceSchedules.find(s => s.endpoint === endpoint);
  if (existing) {
    if (times !== undefined) existing.times = times;
    if (enabled !== undefined) existing.enabled = enabled;
    if (tzOffset !== undefined) existing.tzOffset = tzOffset;
    await savePracticeSchedule(existing);
  } else {
    const newSchedule = { endpoint, times: times || ['07:00','20:00'], enabled: enabled !== undefined ? enabled : true, tzOffset: tzOffset || 0, firedToday: { date: '', fired: {} } };
    practiceSchedules.push(newSchedule);
    await savePracticeSchedule(newSchedule);
  }
  res.json({ success: true });
});

app.post('/prayer/done', verifyPushOwner, async (req, res) => {
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
    // Ownership proof — a captured endpoint alone can't fire app-identity pushes.
    const stored = sub.keys && sub.keys.auth;
    if (!stored || !req.body.authKey || req.body.authKey !== stored) {
      return res.status(403).json({ error: 'Forbidden' });
    }
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
