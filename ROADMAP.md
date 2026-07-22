# Presence — Roadmap

Last updated: 2026-07-22

---

## V0.1 — Private Beta (1 friend, target: June 7–8)

### Path Screen
- [ ] Redesign chests
- [ ] Chest opening animation

### Upgrade Screen (replaces Bardon RPG)
- [ ] Redesign everything below "Advance to Step II"
- [ ] Biblically accurate angel asset
- [ ] Test all cosmetics
- [x] Remove all Bardon RPG code (`bardonScreen`, `bardon_rpg_v2` localStorage key, related JS/CSS)

### Star Screen
- [ ] Fix borked menus
- [ ] Finalize all functionality
- [ ] Design polish (less vibecoded)

### Streak Screen
- [ ] Design polish (less vibecoded)
- [ ] Streak animation when a new day is added
- [ ] Design Streak Society section
- [ ] Rename Streak Society

### Progress Reports
- [ ] Design overhaul (less vibecoded)
- [ ] Add bar charts
- [ ] Hide prayer section when prayer is disabled in settings

### Journal
- [x] Complete redesign — Apple Journal-style entry list + editor

### Concentration Screen
- [ ] Redesign
- [ ] Exercises need significant work (holding off on Advanced exercises for now)

### Awareness Screen
- [ ] Redesign

### Friends Screen
- [ ] Initial design

### Profile
- [ ] Design

### FAQ
- [ ] Write content
- [ ] Design

### Settings
- [ ] Overhaul

### About Section
- [ ] Write content

### Cleanup
- [x] Remove Bardon RPG dead code
- [x] Centralize browser/server cloud-sync keys in `sync-contract.js`
- [x] Extract reset and signed-out snapshot behavior into `progress-state.js`
- [x] Share history and Seven Gifts merge behavior in `sync-merge.js`
- [x] Begin frontend feature boundaries with `social-client.js` (Lodge, messages, friends)
- [x] Extract Journal behavior into `journal-client.js`
- [x] Extract Progress Reports behavior into `reports-client.js`
- [x] Extract browser platform services into `platform-client.js`
- [x] Extract Soul Mirror and Autosuggestion into `soul-mirror-client.js`
- [x] Extract Achievements into `achievements-client.js`
- [x] Extract the first-time tutorial into `tutorial-client.js`
- [x] Extract Profile, daily status, privacy, and friend profiles into `profile-client.js`
- [x] Extract Settings, custom media controls, backup/import, and utility screens into `settings-client.js`
- [x] Extract Prayer state, scheduling, sessions, history, reflections, and mantra into `prayer-client.js`
- [x] Extract Awareness ranks, state, idle progression, sessions, survey, and history into `awareness-client.js`
- [x] Extract Visualization practice, multi-sense scenes, exercise-card routing, and Concentration level-up into `visualization-client.js`
- [x] Extract Auditory sound synthesis, picker, rep sessions, results, and event wiring into `auditory-client.js`
- [x] Extract Thought Control modes, progress, alarms, sessions, results, and event wiring into `thought-control-client.js`
- [x] Extract Asana sessions, results, event wiring, and the shared exercise wake lock into `asana-client.js`
- [x] Extract Senses modes, cues, setup, sessions, results, and event wiring into `senses-client.js`
- [x] Extract primary tab navigation, mode switching, rank controls, and Awareness/Prayer submenu wiring into `app-shell-client.js`
- [x] Extract Omnia's home-screen ambient animation scheduler, side-peek lifecycle, and effects into `omnia-ambient-client.js`
- [x] Extract Concentration begin/stop, history navigation, and result-save controls into `concentration-controls-client.js`
- [x] Extract Guide daily recommendation tables and exercise assessment metadata into `guide-config-client.js`
- [x] Extract Omnia economy defaults, body/exercise metadata, and generator definitions into `omnia-economy-config-client.js`
- [x] Extract Omnia palettes, entities, veils, and companions into `omnia-cosmetics-config-client.js`
- [x] Extract Omnia step thresholds and narrative beats into `omnia-progression-config-client.js`
- [x] Extract Omnia story evaluation, unread state, and chat rendering into `omnia-story-client.js`
- [x] Extract Omnia state loading, migration, cloud reconciliation, and persistence into `omnia-state-client.js`
- [x] Extract Omnia cosmetic previews, applied visuals, wardrobe rendering, and selection into `omnia-appearance-client.js`
- [x] Extract Omnia economy rates, caps, accrual, costs, prestige multiplier, and Dark Matter minting into `omnia-economy-client.js`
- [x] Extract Omnia Book II tools, refined bodies, spheres, prestige rules, and ceremony into `omnia-book2-client.js`
- [x] Extract Omnia recommendations, body-award budgeting, exercise rewards, boosts, and early-end guards into `omnia-rewards-client.js`
- [x] Extract Omnia engine rendering, collection/build effects, generators, upgrade sheets, and engine actions into `omnia-engine-client.js`
- [x] Extract Omnia click-morph geometry, animation lifecycle, and figure entry points into `omnia-morph-client.js`
- [x] Complete the Phase 4 Omnia boundary audit: verify load order, service-worker coverage, source identity, parser checks, tests, and mobile startup
- [x] Extract Guide path state, assessment, adaptive planning, and agenda rendering into `guide-path-client.js`
- [x] Extract Path Quests and Seven Gifts state, rewards, and overlay rendering into `guide-quests-client.js`
- [x] Extract Pavlok authentication, stimulus delivery, preferences, and Settings rendering into `pavlok-client.js`
- [x] Extract in-app reminder scheduling, practice reminder preferences, server sync, and Settings rendering into `reminders-client.js`
- [x] Extract Omnia companion taps, animation cleanup, Corgi wandering, and idle scheduling into `omnia-companion-client.js`
- [x] Extract Streak calendar, goals, Society, badge routing, and ended-state UI into `streak-client.js`
- [x] Extract shared exercise completion audio, Omnia artwork, rewards, and result overlay into `session-complete-client.js`
- [x] Extract live streak ignition, weekly progress, number transition, particles, audio, and vibration into `streak-celebration-client.js`
- [x] Extract tutorial post-session rewards, streak commitment, reminders, account prompt, and Guide handoff into `tutorial-post-session-client.js`
- [x] Extract Concentration progression state and startup migrations into `concentration-state-client.js`
- [x] Extract Clock customization, sessions, results, and Concentration history into `concentration-clock-client.js`
- [x] Extract Pore Breathing session state, audio, completion rewards, and controls into `pore-breathing-client.js`
- [x] Extract global sound/audio unlock and Omnia candor preferences into `app-preferences-client.js`
- [x] Extract Guide entry, controls, tab tips, and swipe navigation into `guide-shell-client.js`
- [x] Complete the Phase 6 client-boundary audit: all declared client modules parse and are service-worker precached; remaining inline code is intentional core composition and sync orchestration
- [x] Audit the remaining inline Concentration completion, streak, reminder, companion, and integration clusters
- [x] Consolidate duplicate global HTML escaping helpers
- [x] Remove `/api/sync/sync/diagnose` debug endpoint from server.js
- [x] Fail server startup when MongoDB is unavailable instead of serving broken API routes
- [x] Rate-limit externally costly Google sign-in and Pavlok proxy requests
- [x] Return consistent JSON for malformed, oversized, rejected-origin, and unexpected API requests
- [x] Reject malformed social resource identifiers before they reach MongoDB

---

## V0.1.1 — Private Beta Expansion (few friends/family, target: June 14)

- [ ] Prayer screen redesign
- [ ] Bug fixes from V0.1
- [ ] Minor quality-of-life / design improvements from V0.1

---

## V0.2 — (target: July 5 or July 12)

- [ ] Gitdoctor revision
- [ ] All bug fixes / QoL improvements from V0.1.1
- [ ] Security overhaul
- [ ] Automated image-moderation check on profile picture uploads (NSFW/explicit detection) — currently `PUT /api/sync/profile-pic` only validates format/size, no content check. Options considered: self-hosted classifier (e.g. `nsfwjs`, free, in-process, matches how text moderation is already done in-house) vs. a paid vendor API (AWS Rekognition / Google SafeSearch / Sightengine — more accurate, adds cost + API key management). Leaning self-hosted unless a key is provided.
- [ ] Pavlok support
- [ ] Frequencies
- [ ] Fix multi-sense exercise
- [ ] Eliminate redundant code

---

## V0.2.1 — App Store Release (target: July 19)

- [ ] Bug fixes and improvements from V0.2
- [ ] Package for Apple App Store + Android Google Play
- [ ] Create subscription tiers on Buy Me a Coffee
- [ ] Decide whether to keep web app
- [ ] Multi-notification feature (editable in Settings)
- [ ] Explore multi-notifications on iOS and Android (platform-specific support/limits for showing several simultaneous push notifications)

---

## V0.3 — (target: August 2)

- [ ] Security improvements
- [ ] Bug fixes and improvements from V0.2 / V0.2.1
- [ ] SEO optimization (meta tags, structured data, indexing)
- [ ] Code quality improvements
- [ ] All Angles exercise
- [ ] Complete anti-vibecode pass
- [ ] Clean up Github
- [ ] Personal code review

---

## V0.4 — (target: August 16)

- [ ] Ads ready + complete marketing strategy
- [ ] Accounts on all social media platforms ready to post
- [ ] Completed marketing plan
- [ ] Multi-language support infrastructure
- [ ] WatchOS app (?)

---

## V1.0 — Public Launch (target: August 30, 2026)

- [ ] **Pre-launch scalability validation (after V1.0 feature freeze):** create an isolated, production-sized staging Render service and MongoDB database; seed realistic staging social data and 20–100 test accounts; run the guarded `launch` and `network` load scenarios at 100, 250, 500, and 1,000 virtual users; verify ≤1% errors, ≤2s overall p95, no Render restart/OOM, CPU <70%, memory <75%, MongoDB connections <70% of plan limit, and database p95 <500ms. Tune infrastructure or hot paths based on results, then rerun the affected stages. See `LOAD_TESTING.md`.
- [ ] Launch marketing campaign
- [ ] 🚀

---

## Recently Completed

- [x] Journal redesign: Day/Week/Month tabs, week strip, Omnia daily prompts, `.jl-*` CSS
- [x] Progress Report: Omnia speech bubble with AI commentary, `.rpt-*` CSS
- [x] Sync: sign-out no longer wipes local data
- [x] Sync: pull-on-login restores cloud data immediately
- [x] Sync: JWT auto-refresh (silently renews at 20 days, expires at 30)
- [x] Sync: persistent warning in Settings when sync is disconnected
- [x] Sync: server pull finds most recent meaningful snapshot (not just latest)
- [x] Sync: push local state after pull when local is ahead of cloud
