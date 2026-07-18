'use strict';

const SORTS = new Set(['newest', 'liked', 'commented', 'hot', 'controversial']);

// Deliberately limited to unambiguous identity-directed slurs. Moderation text
// is normalized first so spacing, punctuation, common substitutions, and a
// small set of cross-alphabet lookalikes do not trivially bypass the rule.
const HATE_TERMS = [
  'nigger', 'nigga', 'faggot', 'kike', 'wetback', 'chink', 'gook',
  'beaner', 'tranny', 'shemale', 'spic', 'coon', 'dyke', 'retard'
];
const UNAMBIGUOUS_EMBEDDED_TERMS = HATE_TERMS.filter(term => !['spic', 'coon', 'dyke', 'retard'].includes(term));

const LOOKALIKES = Object.freeze({
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't',
  '@': 'a', '$': 's', '!': 'i', '|': 'i',
  '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c', '\u0445': 'x',
  '\u0456': 'i', '\u04cf': 'l', '\u03b1': 'a', '\u03b5': 'e', '\u03bf': 'o', '\u03c1': 'p', '\u03c7': 'x'
});

function normalizeForModeration(value) {
  const input = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  let out = '';
  for (const raw of input.toLowerCase()) {
    const char = LOOKALIKES[raw] || raw;
    out += /[a-z]/.test(char) ? char : ' ';
  }
  return out.replace(/\s+/g, ' ').trim();
}

function flexibleTermPattern(term) {
  const letters = Array.from(term).map(char => char + '+\\s*').join('');
  return new RegExp('(^|[^a-z])' + letters + '($|[^a-z])', 'i');
}

const HATE_PATTERNS = HATE_TERMS.map(flexibleTermPattern);

function containsHate(value, embedded) {
  const normalized = normalizeForModeration(value);
  if (!normalized) return false;
  if (embedded) {
    const compact = normalized.replace(/\s/g, '');
    return HATE_PATTERNS.some(pattern => pattern.test(normalized))
      || UNAMBIGUOUS_EMBEDDED_TERMS.some(term => compact.includes(term));
  }
  return HATE_PATTERNS.some(pattern => pattern.test(normalized));
}

function result(ok, category) {
  return ok ? { ok: true } : { ok: false, category };
}

function moderateUsername(value) {
  return result(!containsHate(value, true), 'hateful_username');
}

// Display names are free-form (spaces, punctuation, unicode allowed) but are
// just as identity-facing as a username, so they get the same embedded-match
// strictness — a slur can't be smuggled in as part of a longer "name".
function moderateDisplayName(value) {
  return result(!containsHate(value, true), 'hateful_display_name');
}

function moderatePublicText(value) {
  return result(!containsHate(value, false), 'hateful_content');
}

function moderatePrivateText(value) {
  if (containsHate(value, false)) return result(false, 'hateful_content');
  const text = normalizeForModeration(value);
  const compact = text.replace(/\s/g, '');
  const directThreat = /\b(kill|murder|shoot|stab|rape|hurt)\b(?:\s+[a-z]+){0,3}\s+(you|u)\b/.test(text)
    || /\b(i\s+hope\s+you\s+die|you\s+will\s+die)\b/.test(text);
  const selfHarm = /\b(kill\s+yourself|go\s+die|you\s+should\s+die)\b/.test(text) || compact.includes('kys');
  const sexualSolicitation = /\b(send|show|share)\s+(me\s+)?(nudes?|naked\s+(pics?|photos?)|explicit\s+(pics?|photos?))\b/.test(text);
  const sexualExploitation = /\b(child\s+porn|underage\s+sex)\b/.test(text)
    || /\b(minor|child|underage)\b.*\b(nude|naked|sexual|explicit)\b/.test(text);
  return result(!(directThreat || selfHarm || sexualSolicitation || sexualExploitation), 'unsafe_message');
}

function normalizeSort(value) {
  const sort = String(value || '').toLowerCase();
  return SORTS.has(sort) ? sort : 'newest';
}

function rankLodgePosts(posts, requestedSort, nowMs) {
  const sort = normalizeSort(requestedSort);
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const rows = Array.isArray(posts) ? posts.slice() : [];
  const created = post => new Date(post.createdAt || 0).getTime() || 0;
  const likes = post => Math.max(0, Number(post.likeCount) || 0);
  const comments = post => Math.max(0, Number(post.commentCount) || 0);
  const newestTie = (a, b) => created(b) - created(a) || String(b._id || '').localeCompare(String(a._id || ''));
  const ageHours = post => Math.max(0, (now - created(post)) / 3600000);
  const hotScore = post => (likes(post) * 2 + comments(post) * 3 + 1) / Math.pow(ageHours(post) + 2, 1.15);
  const controversialScore = post => comments(post) < 3 ? -1
    : (comments(post) * comments(post) / (likes(post) + 1)) / Math.pow(1 + ageHours(post) / 720, 0.2);

  if (sort === 'liked') rows.sort((a, b) => likes(b) - likes(a) || comments(b) - comments(a) || newestTie(a, b));
  else if (sort === 'commented') rows.sort((a, b) => comments(b) - comments(a) || likes(b) - likes(a) || newestTie(a, b));
  else if (sort === 'hot') rows.sort((a, b) => hotScore(b) - hotScore(a) || newestTie(a, b));
  else if (sort === 'controversial') rows.sort((a, b) => controversialScore(b) - controversialScore(a) || newestTie(a, b));
  else rows.sort(newestTie);
  return rows;
}

module.exports = {
  moderateUsername,
  moderateDisplayName,
  moderatePublicText,
  moderatePrivateText,
  normalizeForModeration,
  normalizeSort,
  rankLodgePosts
};
