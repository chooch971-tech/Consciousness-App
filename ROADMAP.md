# Presence — Roadmap

Last updated: 2026-07-13

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
- [x] Consolidate duplicate global HTML escaping helpers
- [ ] Remove `/api/sync/sync/diagnose` debug endpoint from server.js

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
