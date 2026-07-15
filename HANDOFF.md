# Presence — Engineering Handoff

## What the app is
**Presence** — a mostly self-contained meditation / occult-training PWA based on Franz
Bardon's Hermetics. Users train Clock, Thought Control, Visualization, Auditory,
Senses, Asana, Soul Mirror, and Pore Breathing, and grow a companion entity
("Omnia") through Bardon's Steps I–X. There's an "Akasha" currency, a prestige
system, achievements, streaks, and social/friends features.

## Core files
- **`presence.html`** (~34k lines) — the client: markup, CSS, and most browser JS
  in `<script>` blocks. Most UI, game logic, and the sync client live here.
- **`server.js`** (~2.7k lines) — Node/Express + MongoDB + JWT + web-push +
  OpenAI. Handles auth, cloud sync (`/api/sync/sync/push` + `/pull`), friends,
  push notifications, and Omnia AI reports.
- **`sync-contract.js`** — the shared browser/server allowlist for synchronized
  state. Add or remove cloud keys here instead of creating another key array.
- **`progress-state.js`** — pure reset/snapshot/storage operations shared by the
  browser reset, sign-out, and local snapshot flows. Keep reset semantics here.
- **`sync-merge.js`** — pure history and Seven Gifts conflict resolution shared
  by browser pulls and server snapshot merges. Keep those two merge specs here.
- **`social-client.js`** — Lodge, direct messages, social notifications, and
  friends-panel behavior. It loads at the end of `presence.html`, after both its
  DOM and the main runtime dependencies exist.
- **`sw.js`** — service worker. Caches the shell as `presence-shell-vNNN`
  (currently **v161**). **Bump this version string on every shippable change to
  `presence.html`** or returning devices run stale code.
- `marketing/` — App Store card generators (Playwright screenshot scripts).

## Git workflow
- Read `git status` before editing and preserve unrelated user changes.
- Verify locally before committing.
- Push the reviewed commit to `main`; do not deploy to Netlify unless explicitly requested.

## Verification harness (use this before every commit)
1. **Parse check** — every `<script>` block must compile:
   ```
   node -e 'const fs=require("fs");const h=fs.readFileSync("presence.html","utf8");
   const b=[...h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
   let ok=0,t=0;for(const s of b){if(!s.trim())continue;t++;try{new Function(s);ok++;}catch(e){console.log("FAIL",e.message.slice(0,120));}}
   console.log(ok+"/"+t+" parse");'
   ```
   Expect **5/5 parse**. For server: `node --check server.js`.
2. **Browser harness** — headless Chromium via Playwright at
   `/tmp/node_modules/playwright`, launch with
   `executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`.
   Serve locally with `python3 -m http.server 8099` (restart it each turn — the
   shell cwd resets and kills background jobs), then
   `page.goto('http://localhost:8099/presence.html')`. Most game functions are
   global, so `page.evaluate(() => …)` can call them directly to unit-test logic
   and merges. Save screenshots to `/tmp` and Read them.
   - Note: without auth the app sits on the login/splash screen. To screenshot an
     overlay, force it visible: set its `style.zIndex/display/opacity` and hide
     `#splash`/`#loginScreen`.

## Sync architecture (touched constantly — read before editing sync)
`sync-contract.js` owns the synchronized localStorage key allowlist. On push,
the client sends those keys; the server stores a snapshot per push. On **pull**, the
server's `mergeSnapshots(snaps)` merges the last 20 snapshots and returns ONE
merged payload; the client's `applyPulledData` then field-merges that into local.

**Golden rule: all merges must be monotonic + commutative** so a stale snapshot
can never roll back progress.

- Special keys route to dedicated merge fns on BOTH sides:
  - client: `mergeOmniaPull`, `mergeAchPull`, `mergeGiftPathPull`, `mergeHistoryPull`
  - server: `mergeOmniaKey`, `mergeAchKey`, `mergeGiftPathKey`, `mergeHistoryKey`
  - history and Seven Gifts adapters both delegate to `sync-merge.js`; add their
    field rules there once instead of changing the client and server separately.
  - everything else: server `pickBestValue` (score-based newest wins).
- **If you add a new synced key:** register it once in `sync-contract.js`, then
  add any key-specific client/server merge and reset behavior. Generic keys are
  automatically allowlisted for backup, import, push, and server pull.
- Deliberate reset snapshots, signed-out clean-state snapshots, and storage
  replacement live in `progress-state.js` and have fixed-timestamp unit tests.
- **Server changes require a backend redeploy** to take effect — the client can't
  work around a server that won't return a key.

## Recent work completed (this session)
1. Seven Gifts button icon → elegant `{7/3}` heptagram (Faery star), moved to
   just below the top-right Akasha counter.
2. Step IV meditation requirement lowered 70 → 65 (`presence.html` ~line 19036,
   `recommended:65`; shown as "Meditation sessions: X / Y").
3. **Fixed 3 cross-device sync leaks** (were re-awarding already-earned rewards):
   - `presence_ach_v1` + `presence_giftpath_v1` were omitted from server
     `mergeSnapshots` KEYS → added with union merges.
   - Daily gift claim marker moved from standalone `presence_offering_day` into
     `omniaState.offeringDay` so it syncs (folded as latest-date-wins).
   - `achEvaluate` now skips awarding while `window._syncPullPending` is true;
     boot uses a settle-waiter instead of a fixed timer.
4. **Seven Gifts reworked into a monthly event** (last commit `cf50e75`):
   - Reward is now `omniaState.devotionStacks` (count), +2%/month, **capped at
     24 stacks / +48%**. Legacy one-time `devotionEarned` = 1 stack.
   - Gift-path state = durable `cleared[]` (month-keys) + month-scoped run
     (`month`/`claimed`/`done`/`startDate`). Resets on the 1st; challenges
     measure that month's practice. `giftPathEarned()` now means "this month
     cleared". Multiplier: `omniaDevotionMult()` = `1 + 0.02 * omniaDevotionStacks()`.
   - Merges updated on both sides (cleared union; run merges only within same
     month, else newer month wins; devotionStacks folds as max, ungated).
   - **Currently available all month (resets on the 1st), NOT a hard first-week
     window** — the challenges can't be done in 7 days. User may want a real
     first-week window later (would need scaled-down challenges).

## Conventions / gotchas
- Akasha accrual applies multipliers: `omniaPrestigeMult()` (1+0.25·prestige) ×
  `omniaDevotionMult()` (Seven Gifts) at the accrual sites (~lines 20469, 21259).
  Akasha is clamped by `omniaAkashaCap()`.
- Toasts: `showToast(msg, ms, 'gold')`. Keep toast text short.
- Don't retry proxy 403 policy denials. Never disable TLS / unset HTTPS_PROXY.
- When asked which model: use the configured model ID from the system prompt.
  Never put a model identifier in commits/PRs/code/artifacts.

## The big TODO backlog (user's list, not yet started)
A large multi-section punch list exists (~95 concrete changes across ~23
sections). Highlights the user cares about:
- **Progress Reports / Journal**: move top-right buttons to top-LEFT.
- **Profile**: suggested friends, private-profile option, clickable achievement
  badges, "Friends in common" wording, status updates.
- **Settings**: remove "Settings" title + add back-arrow left, show profile pic,
  private-account toggle, make grey text more legible, maybe drop backup/restore.
- **FAQ**: different banner color, absorb the About tab (then remove About).
- **Streak page**: tap candle to flicker, trim text, unalterable+repeatable streak
  goal, rename "Streak Society" (too close to Duolingo), reach it from Friends.
- **Character/Level-up page**: 2nd Akasha generator at Step V + consolidate the
  two, finish Steps I–X storyline, rewrite all the "goofy" Seven-Gifts/step/
  color copy, scale gift akasha by step (keep 2% same).
- **Star page**: brighter (rings hard to see).
- **Concentration/Awareness**: prettier "View All History", rewrite rank text
  (shared between both screens), Awareness desktop scroll bug + About + survey.
- **Visualization / Auditory / Senses** (batch — near-identical asks): remove
  "Concentration × …" from banner, new bottom text, add Omnia tutorial, clickable
  eye/symbol, meaningful open/closed-eye + Halt toggles, upload crisp assets, add
  masteries (5/7.5/10 min tiers), Begin-button restyle, remove red X, actually
  test each exercise end-to-end.
- **Soul Mirror**: remove mirror notes, fix scroll-lock when menu open, Pore
  Breathing "3" clipping + banner text, color in Autosuggestion.
- **Prayer**: trim banner text, new symbol, keep to 5 prayers/day, revise mantra.
- **General**: donation subscriptions; clarify what "resonance" means on the
  Akasha generator; document how often exercises award body points.

## First move in the new session
Ask the user which item(s) to tackle, or pick from the backlog above. Read the
relevant region of `presence.html` first (it's huge — use Grep to locate, then
Read the specific offset). Always parse-check + browser-verify + bump SW before
committing, and push to both refs.
