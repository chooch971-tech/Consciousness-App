# Presence Social — Design Plan ("The Lodge")

A social layer for Presence: a feed of practitioners' status updates with likes,
comments, follows, and private chat. This doc is the working plan — decisions,
data model, API, client UI, phasing, and risks.

**No user-uploaded images anywhere in this feature** — text only for posts,
comments, and DMs. Deliberate scope cut (see §7), not a placeholder.

**No automated moderation in v1** — skipped by decision. See §7 for what that
means in practice and how the write path is shaped so it can be added later
without restructuring anything.

## 1. Vision & tone

Twitter-shaped mechanics, but Presence-shaped soul. The feed is a **shared
record of practice**, not an engagement machine:

- **Chronological only.** No algorithm, no "For You". Less work AND on-brand.
- The existing **"Today's Status"** becomes the composer — posting a status IS
  posting to the feed. One habit, two surfaces.
- Calm visual language: the existing `prof-*` / `fp-*` card idioms, DM Mono
  metadata, Cormorant headings.

**Name: The Lodge** (hermetic orders met in lodges — fits Bardon).

## 2. What we already have (leverage)

- JWT auth, `usersCollection`, mutual-friends graph (`friendsCollection`).
- `status { text, updatedAt }` on the user doc (180 chars, sanitized) + editor UI.
- `escHtml` + control-char stripping idioms on every render path.
- `isPrivate` flag (excludes from friend search; extends naturally to "hide
  me from strangers" across follows/likes — see §3, §5).
- Web-push infra (VAPID keys, sw.js push handler) for DM/comment notifications.
- Rate-limit middleware pattern (`authRateLimit`).
- Persisted-cache-then-refresh client pattern (friends list) for instant paint.

**Constraint that shapes everything:** every server change needs a Render
redeploy, and the stack is plain Express + Mongo — no websockets assumed.

## 3. Core decisions (resolved)

- **D1 — One graph: follows. "Friend" = mutual follow (derived, not stored).**
  A follow is one-way and instant for public accounts; a **private** account's
  follows sit `pending` until approved (mirrors existing private-search
  behavior, and approval doubles as the "accept" moment). Two people are
  friends the moment both directions are active — no separate friendship
  record or accept ceremony. Everything that asks "are they friends?"
  (Shared Vigils, DMs, achievements) checks mutuality instead.
  **Migration:** each accepted pair in the legacy `friendsCollection` becomes
  two active `follows` docs — idempotent, runs at server boot. The legacy
  friends endpoints keep working during transition (accept/remove also
  write/remove follow edges) until the UI fully switches in Phase 2.
- **D2 — Posting:** `POST /api/social/posts` inserts a post AND sets
  `user.status` as a side effect, so every existing status surface (profile
  card, friend cards) keeps working unchanged. Multiple posts/day allowed;
  profile shows the latest; feed keeps history.
- **D3 — Feed: fan-out-on-read.** Query posts where `userId ∈ following`,
  sorted by `createdAt desc`, cursor-paginated (20/page). With an index this is
  fine into the thousands of users. No fan-out-on-write complexity.
- **D4 — No user-to-user image uploads. Full stop.** Considered and rejected —
  see §7 for why. Posts, comments, and DMs are text only.
- **D5 — Chat: polling, not websockets.** Poll the open thread every ~8s +
  on `visibilitychange`; conversation list refreshes on open. Web-push on new
  message covers the "app closed" case. **DMs restricted to mutual friends in
  v1** — kills the spam/harassment problem before it exists. **No E2E
  encryption** — messages are plaintext in the DB; the UI should say so plainly.
- **D6 — Likes: count + revealed liker list, privacy-aware.** Every post shows
  a like count; tapping it opens the list of usernames who liked. A liker who
  has `isPrivate` set is shown as **"a private practitioner"** instead of their
  username to anyone who isn't their friend — mirrors how private accounts
  already stay out of search. Friends of a private liker see the real name
  (consistent with "existing friends aren't affected by privacy" elsewhere).
- **D7 — Post length: 280, single-sourced constant.** Matches the feed-era
  expectation without inviting essay-length cards into a chronological,
  glanceable feed. Long-form ("blog posts") is explicitly **out of scope** —
  if it's wanted later, it should be its own feature (e.g. "share to The
  Lodge" from a Journal entry, with its own truncate/expand UI), not a raised
  cap on the quick-post composer. Keeping `POST_MAX_LEN` as one constant means
  raising it later is a one-line change if that's ever revisited.
- **D8 — No automated moderation in v1.** Every write (post/comment/DM) still
  passes through one function — `sanitizeSocialText()` (strip control chars,
  trim, enforce length) — before it's stored. That's the single choke point
  where a moderation call would slot in later without touching the rest of
  the codebase. For now nothing screens content; **block + report + rate
  limits are the only safety net**, not a backstop on top of something else.
  See §7 for what this means in practice.
- **D9 — Safety ships WITH strangers, not after.** Block + report + rate
  limits land in the same phase as follows (Phase 2), since that's the phase
  where non-consensual contact (a stranger following you, seeing your posts)
  becomes possible. Phase 1 stays friends-only, where the existing mutual-
  accept friend graph is already consensual.

## 4. Data model (new collections)

```
posts          { _id, userId, text(≤280), createdAt, likeCount, commentCount }
likes          { postId, userId, createdAt }              // unique (postId,userId)
comments       { _id, postId, userId, text(≤280), createdAt }
follows        { followerId, followeeId, status:'active'|'pending', createdAt }
                                                          // unique (follower,followee)
blocks         { userId, blockedId, createdAt }
reports        { reporterId, kind:'post'|'comment'|'user'|'message', refId,
                 reason, createdAt, resolved }
conversations  { _id, participants:[idA,idB], lastMsgAt, lastPreview }
messages       { convId, senderId, text, createdAt, readAt }
notifications  { userId, kind:'like'|'comment'|'follow'|'follow_req'|'dm',
                 actorId, refId, createdAt, seenAt }
```

Indexes: `posts(userId, createdAt desc)`, unique on likes + follows,
`messages(convId, createdAt)`, `notifications(userId, createdAt desc)`.

Counters (`likeCount`, `commentCount`) are denormalized via `$inc` — reads are
hot, writes are rare.

## 5. API surface (all `verifyToken`, under `/api/social/`)

```
POST   /posts                     create (also sets user.status)
GET    /feed?cursor=              chronological, followed users, 20/page
GET    /users/:id/posts?cursor=   a profile's post history (visibility-checked)
DELETE /posts/:id                 own posts only
POST   /posts/:id/like            toggle; $inc counter
GET    /posts/:id/likers          usernames who liked (private likers redacted
                                   unless viewer is their friend)
GET    /posts/:id/comments
POST   /posts/:id/comments        text only
DELETE /comments/:id              own comments only
POST   /follow  /unfollow         pending if target isPrivate
POST   /follow/approve            approve a pending follower
GET    /followers  /following
POST   /block   /report
GET    /notifications             + POST /notifications/seen
GET    /conversations
POST   /conversations/open        { userId } → find-or-create (friends only)
GET    /conversations/:id/messages?cursor=
POST   /conversations/:id/messages
```

Every write path: `sanitizeSocialText()` (control-char strip → trim → length
cap) → store raw; escape on render (established `escHtml` pattern). Rate
limits per user: ~30 posts/day, ~120 comments/day, DM burst limit. Blocks
filter both directions on every read.

## 6. Client UI (new screens, existing idioms)

1. **Feed screen** — new drawer entry. Composer card at top (opens the existing
   status editor, cap raised to 280), then post cards: avatar ring
   (`_friendRingHtml`), `@name`, `timeAgo`, text, ♥ like toggle + count (tap
   count → liker list sheet), comment count → detail. "Load more" button (no
   infinite scroll — calmer, simpler).
2. **Post detail** — post + comments + comment composer (text only).
3. **Profile additions** — follower/following counts; Follow/Requested button
   on friend and non-friend profiles alike; "Posts" history section.
4. **Notifications** — bell with unseen badge; list reuses request-row styling.
5. **Chats** — conversation list + thread screen; poll while open; send box.

Persisted-cache-then-refresh (like the friends list) for the feed and
conversation list so every screen paints instantly. All social data is
**server-authoritative** — it must NOT enter the localStorage sync snapshot
system (that machinery is for solo progress; merging social state would be
wrong and heavy).

Note on file size: this adds ~2–3k lines to a ~34k-line presence.html. If it
gets unwieldy, a second precached `social.js` (added to sw.js PRECACHE) is the
low-friction split.

## 7. Safety (no automated moderation in v1)

### Why there are no images

Automated *image* moderation exists (AWS Rekognition, Google Vision SafeSearch,
paid services like Hive/Sightengine), but it was considered and rejected for
this feature regardless of the text-moderation decision:

- **Liability, not just accuracy.** Every automated scanner has a false-negative
  rate above zero. For user-to-user image uploads, the worst-case false
  negative (e.g. CSAM slipping through) is a serious legal exposure for a solo
  developer — disproportionate to the value of "attach a photo to a comment"
  on a meditation app.
- **New cost + new failure mode.** Paid detection APIs add an ongoing bill and
  a service that needs monitoring, for a feature that isn't core to what
  Presence is.

If this changes later, treat it as a separate, deliberate decision — not a
resumed phase.

### What "no moderation" means in practice

Nothing screens post/comment/DM text before it's stored beyond sanitization
(control chars, trim, length cap). That means:

- **Block and report are the entire safety net**, not a backstop underneath
  automated filtering. A harassing message reaches its target before anyone
  can act on it — reporting is after-the-fact, not preventive.
- **The report queue needs a human to look at it, regularly**, since there's
  no automated first pass shrinking it. That's you, or whoever you designate.
- This is a reasonable posture **for a friends-only, small-community launch**
  (Phase 1) where every contact is already consensual. It gets meaningfully
  riskier the moment Phase 2 (follows) lets strangers reach each other — worth
  revisiting the moderation question at that point, not just once at the start.
- The `sanitizeSocialText()` choke point (D8) means adding a moderation call
  later — e.g. OpenAI's moderation endpoint, which is free and reuses the
  server's existing `OPENAI_API_KEY` — is a contained change whenever you
  want it, not a redesign.

### Human-driven safety (ships regardless of the moderation decision)

- **Block** — hides all content both ways, severs follows, closes DMs.
- **Report** on posts/comments/users/messages → `reports` collection, with a
  simple `verifyAdmin` endpoint to list and resolve them.
- Rate limits on all writes (posts/comments/DMs) — the main blunt instrument
  against spam/abuse volume without content screening.
- Private accounts honored everywhere (feed, profile posts, liker lists,
  search — already built).
- Delete-own-content everywhere.
- Honest copy: DMs are private but not end-to-end encrypted.

## 8. Phasing

| Phase | Scope | Ships |
|-------|-------|-------|
| **P1 — Feed core** | `follows` collection + friends→follows migration, `posts` (280 char), feed (mutual follows only for now), likes + liker list, text comments, delete own, Lodge feed screen | server + client + redeploy |
| **P2 — Follows & safety** | `follows` (+ private approval, auto-follow on friend-accept), follower counts, block, report, in-app notifications | server + client + redeploy |
| **P3 — Chat** | conversations/messages, polling thread UI, per-user push subscriptions in Mongo, DM push | server + client + redeploy |

Each phase is independently shippable and roughly one working session. P1 is
useful on day one because the friend graph and statuses already exist.

**Status: P1, P2, and P3 are shipped.** Extras beyond plan: per-user accent
colors (hashed username → stable ring/name palette) and a per-practitioner
posts page (tap any post author → their full history via /users/:id/posts).
Deferred from P3: DM web-push (needs per-user push-subscription storage —
currently subs are keyed to reminder flows, not accounts).

## 9. Risks & honest constraints

- **Render cold starts** make the first feed/chat load slow after idle periods;
  the persisted-cache paint hides most of it.
- **Chat is polling** — "seconds" latency, not instant. Acceptable; be honest
  in expectations.
- **No automated moderation** — block/report/rate-limits are the whole safety
  net (§7). Reconsider this explicitly before/at Phase 2, when strangers can
  reach each other for the first time.
- **No images anywhere in this feature**, by design (§7) — independent of the
  moderation decision, not contingent on it.
- **Push subscriptions** are currently keyed to reminder flows; DM push needs
  per-user subscription persistence in Mongo (small P3 sub-task).
- Every phase needs the **backend redeploy** — batch server changes per phase.

## 10. Decisions log

1. **Name** — The Lodge.
2. **Graph** — unified follows; "friend" is a derived state (mutual follow),
   with a one-time migration from the legacy friends collection. See D1.
3. **Likes** — count shown; tap reveals liker usernames; private likers shown
   as "a private practitioner" to non-friends. See D6.
4. **Post length** — 280, single constant, long-form deliberately deferred as
   a separate future feature rather than a raised cap. See D7.
5. **Moderation** — skipped for v1; sanitization-only choke point keeps the
   door open to add it later without a redesign. See D8, §7.

## 11. Next: Phase 1 build

Scope for the first build pass:
- Server: `posts`, `likes` collections + indexes; `sanitizeSocialText()`;
  `POST /posts`, `GET /feed`, `GET /users/:id/posts`, `DELETE /posts/:id`,
  `POST /posts/:id/like`, `GET /posts/:id/likers`, `GET/POST /posts/:id/comments`,
  `DELETE /comments/:id`. Feed and profile-posts scoped to friends only
  (no `follows` collection yet — that's Phase 2).
- Client: drawer entry for **The Lodge**; feed screen (composer, post cards,
  load-more); post detail screen (comments); liker-list sheet; status editor
  cap raised 180 → 280 everywhere it's enforced.
- Verify: parse check, server `--check`, browser harness driving the real
  compose → post → like → comment → delete flow; bump `sw.js`.
