# Presence Social — Design Plan ("The Lodge")

A social layer for Presence: a feed of practitioners' status updates with likes,
comments (eventually with images), follows, and private chat. This doc is the
working plan — decisions, data model, API, client UI, phasing, and risks.

## 1. Vision & tone

Twitter-shaped mechanics, but Presence-shaped soul. The feed is a **shared
record of practice**, not an engagement machine:

- **Chronological only.** No algorithm, no "For You". Less work AND on-brand.
- The existing **"Today's Status"** becomes the composer — posting a status IS
  posting to the feed. One habit, two surfaces.
- Calm visual language: the existing `prof-*` / `fp-*` card idioms, DM Mono
  metadata, Cormorant headings.

**Naming ideas** (needs a decision): *The Lodge* (hermetic orders met in
lodges — very Bardon), *The Commons*, *The Circle*, *Sangha*.

## 2. What we already have (leverage)

- JWT auth, `usersCollection`, mutual-friends graph (`friendsCollection`).
- `status { text, updatedAt }` on the user doc (180 chars, sanitized) + editor UI.
- Profile pics: base64 data-URL ≤200KB with strict regex validation
  (`safeProfilePic`) — the exact pattern to reuse for comment images.
- `escHtml` + control-char stripping idioms on every render path.
- Web-push infra (VAPID keys, sw.js push handler) for DM/comment notifications.
- Rate-limit middleware pattern (`authRateLimit`), `verifyAdmin` for review tools.
- Persisted-cache-then-refresh client pattern (friends list) for instant paint.

**Constraint that shapes everything:** every server change needs a Render
redeploy, and the stack is plain Express + Mongo — no websockets assumed.

## 3. Core decisions (recommendations)

- **D1 — Graph: unified follows.** New `follows` collection. Accepting a friend
  request auto-creates mutual accepted follows; you can also follow non-friends
  one-way. **Private accounts** (existing `isPrivate`) require follow approval,
  and their posts are visible only to approved followers. (Simpler fallback if
  preferred: skip follows entirely, feed = friends only. Cuts Phase 2 in half.)
- **D2 — Posting:** `POST /api/social/posts` inserts a post AND sets
  `user.status` as a side effect, so every existing status surface (profile
  card, friend cards) keeps working unchanged. Multiple posts/day allowed;
  profile shows the latest; feed keeps history.
- **D3 — Feed: fan-out-on-read.** Query posts where `userId ∈ following`,
  sorted by `createdAt desc`, cursor-paginated (20/page). With an index this is
  fine into the thousands of users. No fan-out-on-write complexity.
- **D4 — Images (comments): inline base64, aggressively capped.** Client
  downscales to ≤1280px JPEG, ≤250KB, validated with the `safeProfilePic`
  regex. Stored in the comment doc. *Honest math:* a 512MB free-tier Atlas
  cluster holds ~2,000 such images — fine for a small community, and the
  schema keeps an escape hatch (swap the `image` field for a URL when moving
  to object storage later).
- **D5 — Chat: polling, not websockets.** Poll the open thread every ~8s +
  on `visibilitychange`; conversation list refreshes on open. Web-push on new
  message covers the "app closed" case. **DMs restricted to mutual friends in
  v1** — this kills the spam/harassment problem before it exists. **No E2E
  encryption** — messages are plaintext in the DB; the UI should say so plainly.
- **D6 — Safety ships WITH strangers, not after.** Block + report + rate
  limits land in the same phase as follows (Phase 2). A friends-only feed
  (Phase 1) can ship without them because the friend graph is already consensual.

## 4. Data model (new collections)

```
posts          { _id, userId, text(≤180), createdAt, likeCount, commentCount }
likes          { postId, userId, createdAt }              // unique (postId,userId)
comments       { _id, postId, userId, text(≤280), image?, createdAt }
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
GET    /posts/:id/comments
POST   /posts/:id/comments        text now; image field in Phase 3
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

Every write path: control-char strip → trim → length cap → store raw;
escape on render (established pattern). Rate limits per user: ~30 posts/day,
~120 comments/day, DM burst limit. Blocks filter both directions on every read.

## 6. Client UI (new screens, existing idioms)

1. **Feed screen** — new drawer entry. Composer card at top (opens the existing
   status editor), then post cards: avatar ring (`_friendRingHtml`), `@name`,
   `timeAgo`, text, ♥ like toggle + count, comment count → detail. "Load more"
   button (no infinite scroll — calmer, simpler).
2. **Post detail** — post + comments + comment composer (+ image attach, Phase 3).
3. **Profile additions** — follower/following counts; Follow/Requested button on
   friend profiles; "Posts" history section.
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

## 7. Safety & moderation (minimum viable)

- **Block** (hides all content both ways, severs follows, closes DMs).
- **Report** on posts/comments/users/messages → `reports` collection; a simple
  `verifyAdmin` review endpoint to start.
- Rate limits on all writes; image validation identical to profile pics.
- Private accounts honored everywhere (feed, profile posts, search already done).
- Delete-own-content everywhere.
- Honest copy: DMs are private but not end-to-end encrypted.
- Human note: reports need someone to actually look at them. That's you.

## 8. Phasing

| Phase | Scope | Ships |
|-------|-------|-------|
| **P1 — Feed core** | `posts`, feed (friends only for now), likes, text comments, delete own, feed screen + post detail | server + client + redeploy |
| **P2 — Follows & safety** | `follows` (+ private approval), follower counts, block, report, in-app notifications | server + client + redeploy |
| **P3 — Images** | image comments (client downscale → base64 ≤250KB), storage monitoring | server + client + redeploy |
| **P4 — Chat** | conversations/messages, polling thread UI, per-user push subscriptions in Mongo, DM push | server + client + redeploy |

Each phase is independently shippable and roughly one working session. P1 is
useful on day one because the friend graph and statuses already exist.

## 9. Risks & honest constraints

- **Render cold starts** make the first feed/chat load slow after idle periods;
  the persisted-cache paint hides most of it.
- **Free-tier Mongo vs base64 images** — see D4 math; watch storage from P3.
- **Chat is polling** — "seconds" latency, not instant. Acceptable; be honest
  in expectations.
- **Moderation is a commitment**, not a feature checkbox.
- **Push subscriptions** are currently keyed to reminder flows; DM push needs
  per-user subscription persistence in Mongo (small P4 sub-task).
- Every phase needs the **backend redeploy** — batch server changes per phase.

## 10. Open questions (need answers before P1)

1. **Name** for the space — The Lodge / The Commons / The Circle / Sangha / other?
2. **Follows vs friends-only** — full D1, or keep it friends-only forever (much simpler)?
3. **Likes** — show *who* liked (list), or count only?
4. **Post length** — keep 180 to match status, or raise to 280 for the feed era?
