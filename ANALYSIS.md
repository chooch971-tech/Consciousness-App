# Presence App — Unbiased Product & Market Analysis
*(Revised: probabilities updated for finished app + App Store / Google Play)*

---

## What the App Is

**Presence** is a PWA-based spiritual-training companion built around Franz Bardon's *Initiation Into Hermetics* — an 11-step occult curriculum spanning elemental visualization, concentration, telepathy, and astral work. The app gamifies that curriculum: XP, levels, streaks, session logging, an AI guide ("Omnia"), Pavlok haptic integration, push-notification bells, and an entity-cosmetics system.

The user base it targets sits at the intersection of:
- Serious occult/esoteric practitioners (Bardon specifically)
- Biohackers and quantified-self meditators
- People who want *structured* spiritual training, not passive wellness content

---

## What It Does Well

| Strength | Notes |
|---|---|
| Niche specificity | Only Bardon-structured training app in existence — zero direct competition |
| Design quality | Dark aesthetic, Cormorant serif, crystal figures — genuinely premium feel for a PWA |
| Depth of content | Full exercise library across awareness, concentration, prayer, soul mirror, Omnia AI |
| Gamification layer | XP, streaks, levels, entity unlocks — meaningful retention hooks |
| Pavlok integration | Unique in the meditation space; appeals to hardcore practitioners |
| Session logging | Granular history + progress reports with Omnia commentary |

---

## Where It Currently Falls Short

| Gap | Impact |
|---|---|
| Onboarding | No first-run flow; user drops into a screen with no orientation |
| Half-built surfaces | Soul Mirror UI absent, some exercises stub-level |
| Monetization | Stripe/IAP wired to $0; cosmetics are free; no paywall logic |
| No audio layer | Bells are push-only; no ambient soundscapes |
| Exercise content | ~60% through Bardon curriculum |
| PWA distribution only | No App Store / Play Store = largest discovery surface missing |

---

## Competitive Landscape

| App | Overlap | Key Difference |
|---|---|---|
| Waking Up (Sam Harris) | Guided meditation, structured curriculum | Secular/scientific, no esoteric content, $100/yr subscription |
| Insight Timer | Meditation logging, community | Broad/non-specific, massive scale, free-heavy |
| Endel / Brain.fm | Audio-driven focus states | No training curriculum, no gamification |
| Fabulous | Habit gamification | No spiritual content |
| **None** | Bardon-specific training | Presence is the only one |

The absence of direct competition is a double-edged sword: no benchmarks for user acquisition, but also a clear category-of-one story for editorial features.

---

## Addressable Niche

- ~3–5M self-identified "spiritual but not religious" adults in the US who also use structured practice apps (Pew SBNR data + Insight Timer DAU estimates)
- Bardon practitioners specifically: estimated 50K–200K globally (forum activity, book sales proxy)
- Biohacker/quantified-self overlap (Pavlok userbase ~100K–300K registered)
- Realistic TAM for a premium niche: 20K–80K engaged users = sustainable indie product

---

## Probability Estimates

### Baseline (PWA-only, current build state)

| Outcome | Probability |
|---|---|
| Stalls — never finds its audience | ~35% |
| Beloved niche / lifestyle product (1K–10K MAU) | ~45% |
| Niche hit (10K–75K MAU, meaningful revenue) | ~16% |
| Breakout (75K+ MAU) | ~4% |

**"Decently followed" (niche hit + breakout): ~20%**

---

### Revised: Finished App + App Store + Google Play

"Finished" means: polished onboarding, all exercise surfaces complete, monetization wired (Stripe / Apple IAP / Google billing), audio layer, full Bardon curriculum.

| Outcome | PWA-only (current) | Finished + App Stores |
|---|---|---|
| Stalls | ~35% | **~18–20%** |
| Beloved niche / lifestyle | ~45% | **~47–50%** |
| Niche hit (10K–75K MAU) | ~16% | **~24–28%** |
| Breakout (75K+ MAU) | ~4% | **~6–8%** |

**"Decently followed" revised: ~30–36%**

### Why Each Factor Moves the Number

**Finishing the app (~8–10 point lift)**
- Onboarding is the single highest-leverage work: the Springer/Mindfulness meta-analysis found >60% of meditation app installs churn in week 1, primarily from failing to reach a satisfying first loop. A clear first-run experience that gets a user to their first XP gain in <2 minutes cuts this dramatically.
- Wired monetization means revenue, which funds marketing, which creates a feedback loop.
- Complete content means users who *do* find it aren't hitting dead ends.

**App Store + Google Play (~8–10 point lift, additive)**
- App Store and Play Store are the primary mobile discovery surfaces. Without them, acquisition depends entirely on organic web search, social sharing, and direct links — all of which are weak for a niche product with no existing community.
- Apple's "Health & Fitness" and "Lifestyle" categories are browsable. Editorial features ("App of the Day," "Editor's Choice") are plausible for a distinctive, well-crafted niche app with no direct competitors — this is exactly the kind of app editorial teams highlight.
- Apple IAP and Google Play billing convert meaningfully better than web payments at the moment of intent.
- Star ratings and reviews are a compounding social-proof engine unavailable to PWAs.
- Trust signal: users are meaningfully more willing to pay for App Store apps than PWAs.

**What doesn't change**
- Breakout probability barely moves (4% → ~7%) because breakout requires viral moment, press coverage, or marketing investment — distribution channel matters less than timing and luck at that scale.
- The niche sees the biggest relative lift (16% → ~26%) because that tier is exactly "found by the right 20,000 people" — which distribution directly enables.

---

## Highest-Leverage Remaining Work (Priority Order)

1. **Onboarding** — first satisfying loop in <2 minutes (highest single-point retention lever)
2. **Monetization** — wire Apple IAP + Google Play billing; un-zero cosmetic costs; define subscription tier
3. **Complete exercise content** — finish Bardon curriculum to Step 11
4. **Soul Mirror UI** — data model exists, UI missing
5. **Audio layer** — ambient soundscapes + session bells
6. **Native wrapper** — Capacitor or Expo for App Store / Play Store submission
7. **App Store metadata** — screenshots, description, category placement, keyword optimization

---

## Retention & Success Probability Notes

- RevenueCat 2025 benchmarks: meditation/wellness apps median 30-day retention ~22%; top quartile ~38%. Presence's gamification + streaks + Omnia push notifications put it structurally above median if the first-week hook works.
- The esoteric niche has unusually high intent and word-of-mouth density relative to its size — practitioners talk to each other in dedicated communities (Reddit, Discord, forums). One well-placed post in r/hermeticism or a Bardon study group can drive a meaningful percentage of total TAM to install.
- The biggest remaining risk is not product quality — it's time to completion. Every month the app is unfinished is a month it isn't being discovered and compounding its review base.

---

*Analysis generated June 2026. Probabilities are directional estimates, not forecasts.*
