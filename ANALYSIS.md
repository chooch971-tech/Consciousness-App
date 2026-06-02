# Presence — Full Product & Market Analysis

*An unbiased assessment prepared overnight. Data is cited inline; where figures are soft or estimated, that's flagged. This is honest, not flattering — by request. Read it as one informed opinion grounded in real data, not gospel.*

---

## 0. The one-paragraph verdict

Presence is a genuinely original product sitting in a real, unserved gap: **no app on the market marries a structured Western esoteric (Hermetic/Bardon) training curriculum with idle-game gamification and biofeedback.** That gap is real *because* it is niche — the committed Franz Bardon audience is small (low thousands to low-tens-of-thousands worldwide). But the gamification thesis it's built on is validated by hard data: the meditation category's defining problem is abandonment (≈35% of Calm subscribers never complete a *second* session; ~48% abandon within ~15 months — *Mindfulness*, Springer 2023), and gentle-gamification self-care apps like Finch roughly **double** category-typical 30-day retention. So the idea is sound and the timing is reasonable. The risk is not the concept — it's **execution and positioning**: the app is ~60% built with several half-finished surfaces and a 24,000-line monolith underneath, and its biggest strategic question is whether the Bardon framing is a moat or a moat that's too narrow. My honest estimate: **~20% chance it becomes a "decently followed" app (10K–75K MAU + a real subscription business), ~45% chance it lands as a beloved lifestyle/passion product (1K–10K devoted users), ~35% chance it stalls.** Those are good odds for an indie passion project and poor odds for a venture outcome — which is the correct framing for what this is.

---

## 1. What the app actually is

A meditation/attention-training PWA built around Franz Bardon's *Initiation into Hermetics*, wrapped in an idle-game/RPG progression. Three modes:

- **Concentration** — formal exercises (Clock, Visualization, Auditory, Thought Control, Asana) with per-exercise milestone tracks and hand-written completion narratives. Levels 1–777 with unique rank titles.
- **Awareness** — interval "are you here right now?" reminders via push notifications, with optional **Pavlok** (vibrate/beep/zap wristband) reinforcement. Streaks, freezes, calendar.
- **Guide** — the "Omnia" layer: an AI guide-entity, **Akasha** currency, an idle Akasha Generator with reservoir/upgrades, collectible **entities/palettes/companions**, and a 10-step **Bardon progression** gated by leveling three "bodies" (physical/astral/mental).

Plus: AI-generated progress reports (OpenAI, with a 1–5 "candor" dial), journal, prayer scheduler, friends/social, cloud sync (MongoDB + JWT), Google sign-in.

This is **much more ambitious than a meditation timer.** It's closer to "Duolingo/Habitica for Hermetic self-development." That ambition is the whole story — both the upside and the risk.

---

## 2. Where it's succeeding

**2.1 A defensible, original concept.** The competitive research found the market splits cleanly into (a) secular meditation (Calm, Headspace, Waking Up, Balance, Insight Timer), (b) gamified habit/self-care (Finch, Habitica, Forest), and (c) divination/astrology (Co-Star, Sanctuary, Labyrinthos). **Nothing combines (a)+(b)+esoteric training.** The only things serving structured Bardon work are *courses*, not apps — SixtySkills/Perseus Arcane Academy charges **~$900** for instructor-led Bardon training. That's simultaneously proof the audience pays *and* proof it's small.

**2.2 The thesis is backed by data.** The category's core wound is retention:
- 35.2% of new Calm subscribers never complete a second session; 47.9% abandon, median ~15 months (Springer, *Mindfulness*, 2023).
- Health/wellness Day-30 retention is typically **3–12%** (Business of Apps, UXCam, Sendbird).
- Gamified self-care bucks this: a Naavik teardown cites **Finch ~22% Day-30** vs ~3% for some peers. Duolingo's streak users are 2.3–3.6× more likely to stay. Forest converted **2M+ of 60M users to paid** on a single gamified loop.

Presence is built *specifically* to attack the abandonment problem (companion entity, streaks/freezes, idle rewards, collectibles). That's the right wedge against a saturated duopoly (Calm + Headspace ≈ 70% share, both with **declining downloads, -60–74% since 2018**).

**2.3 Craft where it counts.** The visual identity (Cormorant/DM Mono, dark astral palette, the Omnia entity, the new Seraph/Elys/Spectral work) is distinctive and far more characterful than the sterile gradients of mainstream meditation apps. The hand-written completion narratives create emotional investment that template text never does. The backend is professional (bcrypt, JWT, CSP, rate limits, last-meaningful-snapshot sync logic).

**2.4 A real differentiator nobody else has.** Pavlok biofeedback. No competitor in this space pairs meditation with a shock/vibe wristband. It's polarizing and unvalidated, but it's *yours* and it's memorable.

**2.5 Depth that rewards the motivated.** 777 ranks, 10 Bardon steps, three bodies, collectible entities — for the right person this is a years-long ladder. The market data says the users who *stick* are exactly the type drawn to depth and structure (higher openness, belief in efficacy, established routine — PMC survey). Waking Up proved a "serious, structured, philosophical" meditation product sustains **$119.99/yr** from a non-mass audience.

---

## 3. Where it's lacking

**3.1 It's ~60% built and it shows.** Per the audit: custom visualization/audio uploads are stubbed; the Soul Mirror has a data model but little UI; several exercise screens are "just a timer" while Clock is polished; no in-app analytics/charts; notification settings are binary; no session-end audio/bell. The unevenness is the #1 thing a new user will feel — some surfaces feel magical, others feel unfinished.

**3.2 The 24,000-line monolith is a real liability.** One HTML file with all CSS + ~7,500 lines of inline JS, global-variable state, inline + addEventListener mix, swallowed errors (`catch(e){}`), heavy duplication. It works, but: adding an exercise touches 5+ places, bugs are hard to trace (we've lived this — the Pavlok and entity bugs were exactly this class of problem), and there's zero test coverage. This won't block launch but it will tax every future change and makes a second developer almost impossible to onboard. **This is the "cleaning up the codebase" you already know about — it's correctly identified.**

**3.3 Onboarding vs. complexity.** There's a tutorial, but the app is *dense*: three modes, two currencies of progress (XP + Akasha), bodies, steps, cosmetics, prayer, Pavlok. For the motivated niche this is catnip. For a casual witchtok arrival, the cognitive load is a churn risk. The market punishes confusion hard (apps lose ~77% of DAU in 3 days).

**3.4 No audio.** Every major meditation competitor leans on guided audio/soundscapes. Presence has none (Pavlok is the sensory hook instead). That's a defensible *choice*, but it removes the single most common reason people open a meditation app (sleep/relaxation audio), narrowing you to the "active training" use case only.

**3.5 Monetization is entirely stubbed.** All costs are zeroed for testing; there's no payment processor, no premium tier, no IAP. The economy *scaffolding* is excellent (Akasha sinks, upgrade curves, priced cosmetics), but nothing is wired to money yet.

---

## 4. The central strategic tension (the most important section)

**Bardon's system is built on honest, self-certified mastery; the app gates progress on grinding.**

In *Initiation into Hermetics*, you do not advance until you have genuinely mastered a step (e.g., hold one-pointed concentration for 10 uninterrupted minutes), judged by ruthless self-honesty. Presence gates the next Bardon step on accumulating "body levels" via sessions + Akasha. To a **purist**, that can read as trivializing the Work — turning a sacred discipline into a clicker game. This is the single biggest authenticity risk, and the audience most likely to evangelize you (serious occultists) is the one most sensitive to it.

But the **same gamification is exactly what the retention data says you need** to keep the 99% who would otherwise abandon. So the tension is real and unavoidable.

**The resolution is design discipline:** make the game *serve* the practice rather than replace it. Concretely — gate step advancement partly on real practice *time* and demonstrated consistency (which it partly does via "recommended" sessions); use the AI "candor" reports to hold users to honest standards (this is a genuinely clever, on-theme mechanic — Bardon's own "pitiless self-examination" rendered as a feature); and never let buying cosmetics feel like buying spiritual rank. If the collectibles are *cosmetic identity* and the *practice* is what advances you, the tension is manageable. If grinding Akasha starts to feel like the point, you lose the soul of the thing and the core audience with it.

---

## 5. Two users, two retention stories

**5.1 The average "spiritually curious" person (SBNR — ~57M US adults, Pew 2023).**
First impression: striking, mysterious, a little intimidating. The Omnia entity and the aesthetics pull them in; witchtok/astrology has primed them for this vibe. The risk is the next 3 days: if they can't quickly grasp "what do I *do*," they bounce (category norm). If the tutorial nails a single satisfying loop (one Clock session → visible Akasha → a collectible glimpsed → a streak started), gamification can carry them into a habit. **Likely retention: middling-to-good if onboarding is tightened — D30 plausibly 10–18%, above meditation baseline, because the collectible/streak hooks are real.** Without polish, they churn at category baseline (3–8%).

**5.2 The serious Bardon practitioner (the tiny, loyal core).**
First impression: *delight that this exists at all* — nobody has ever built them a tool. They'll scrutinize fidelity. They'll love the exercise structure, the Soul Mirror, the candor reports, the prayer scheduler, the Pavlok rigor. They'll be wary of the clicker economy and will tell you, loudly, if step-gating feels gamey over earned. **Likely retention: very high (40%+ D30, multi-year LTV) IF you respect the practice** — this is your evangelist base, your word-of-mouth, your premium-price tolerance. **They are small in number but disproportionately valuable**, exactly like Waking Up's serious-practitioner core.

The strategic move is to **anchor in the Bardon core for authenticity and premium pricing, then design the funnel to welcome the SBNR/astrology-curious adjacent millions** without alienating the core.

---

## 6. Competitive positioning

| Bucket | Examples | Presence vs. them |
|---|---|---|
| Mainstream meditation | Calm, Headspace | You can't beat them on audio/breadth/brand. You beat them on *gamified depth* and a *distinct identity*. Don't compete head-on. |
| Serious/structured | Waking Up | Closest *tonal* analog; proves premium pricing for a serious curriculum. You add gamification + esoteric specificity they lack. |
| Gamified self-care | Finch, Habitica, Forest | Your mechanics live here; their retention (Finch ~22% D30) is your realistic ceiling target. You add *substance* (a real discipline) they lack. |
| Spiritual/divination | Co-Star (~30M users), Sanctuary, Labyrinthos | Your adjacent audience. They prove the SBNR market pays (astrology apps ≈ **$3–4B**, ~20% CAGR). Labyrinthos proves "structured esoteric learning" is a viable app UX. |
| Direct Bardon | SixtySkills/Perseus (~$900 course) | The only true peer — and it's a course, not an app. Your wedge: make the practice *daily, habitual, beautiful, and a tenth the price.* |

**Bottom line: the gap is genuine, and you have the only product positioned to fill it.** The catch is that the gap's size is bounded by how far you can credibly stretch from "Bardon app" toward "gamified esoteric practice for the spiritually curious."

---

## 7. Monetization — what to charge for

The data is clear on *shape*: meditation revenue is ~80%+ subscription; **annual plans drive ~68% of Health & Fitness revenue** (RevenueCat 2025); freemium converts ~2–8% (median ~4%), hard paywalls ~12%; price points cluster at **$10–15/mo or $60–120/yr**; meditation has among the *lowest* churn in wellness (~7–10%/mo).

**Recommended model — "Adept" subscription, ~$5.99–7.99/mo or ~$49–69/yr** (price under Calm to reflect indie/niche, but you have room toward Waking Up's $119 for the serious core; test it):

What to gate behind it (convenience, cosmetics, intelligence — **never the core practice**):
- **All entities/palettes/companions** unlocked (or a steady free drip + instant-unlock for subs). Collectibles are the natural cosmetic paywall.
- **The AI candor reports.** These have a *real variable cost* (OpenAI per call) — the textbook feature to gate. Free users get a basic monthly note; subscribers get daily/weekly/yearly + the full candor dial.
- **The Akasha generator boost** + the "4× akasha from the same exercise per day" idea from earlier — exactly right as a sub perk / "all-access pass."
- **Custom visualization images / custom audio** (once built) — personalization is a classic premium tier.
- **Advanced analytics/charts**, extra streak freezes, deeper Bardon-step commentary/guidance, friend/social extras, Pavlok advanced patterns.

What must stay free (trust in this niche is everything): the actual exercises, the Bardon progression itself, basic streaks, prayer. **Paywall the *game and the intelligence*, not the *discipline*.** In the esoteric audience, charging for spiritual advancement reads as selling indulgences — death by reputation.

Consider a **one-time "lifetime/founder" tier** early on — passion audiences love it, it funds development, and it suits people allergic to subscriptions.

---

## 8. The numbers (with reasoning, not false precision)

**Define "success" in tiers (mutually exclusive, ~sum to 100%):**

| Outcome | What it looks like | My probability |
|---|---|---|
| **Stalls** | Stays a personal/tiny project; never gains organic traction | **~35%** |
| **Lifestyle/passion success** | 1K–10K devoted users, sustainable modest revenue, beloved in a niche | **~45%** |
| **Niche hit ("decently followed")** | 10K–75K MAU, a real subscription business, known in the space | **~16%** |
| **Breakout** | 75K+ MAU, a recognized name in spiritual/gamified wellness | **~4%** |

So: **chance of being a "decently followed" app when complete ≈ ~20% (niche hit + breakout).** Chance of being at least a *viable beloved product* ≈ ~65%. Chance of true breakout ≈ low single digits (honest — breakout requires luck, a viral moment, and usually funding).

**Active users with a *successful* marketing campaign (indie-scale, e.g., a witchtok/Reddit/influencer hit — not a Calm-sized budget):**
- Realistic-good: **3K–15K MAU** in year one, growing.
- Strong niche success: **25K–75K MAU.**
- Viral spike scenario: **100K–300K downloads**, but retention is the filter — meditation D30 is brutal — likely **settling 30K–80K MAU** with a long tail. (Downloads ≠ users; plan for ~5–15% of installs becoming retained MAU.)
- **Most-likely "if it does well" anchor: ~10K–40K MAU.**

**Retention, if you finish + polish onboarding + lean into gamification:**
- D1 ~35–45%, D7 ~18–25%, **D30 ~10–18%** (between meditation baseline 3–12% and Finch's ~22%). The devoted core runs far higher (40%+ D30). Current unfinished state would underperform these.

**Subscription math sanity check:** at, say, 20K MAU and a ~4–6% paid conversion at ~$60/yr blended, that's ~800–1,200 subscribers ≈ **$48K–72K/yr** — a real lifestyle business, not a venture one. At 60K MAU and better conversion, low-to-mid six figures. That's the honest ceiling band without outside funding.

---

## 9. Is it a good idea? Will it succeed?

**Good idea: yes, with a caveat.** It's a genuinely novel product in a real gap, riding a validated thesis (gamification fixes meditation's retention wound) into a large, paying, adjacent market (SBNR/astrology). That's a smarter foundation than "another meditation timer."

**Will it succeed: probably as a passion/lifestyle product (likely), possibly as a niche hit (~1-in-5), unlikely as a breakout.** The determining factors, in order:
1. **Finishing + polishing** the half-built surfaces and especially the **first-session onboarding** (this is the highest-leverage work left).
2. **Holding the authenticity line** so the Bardon core evangelizes instead of recoils.
3. **Nailing the bridge** — packaging it so the spiritually-curious millions can enter without needing to know who Franz Bardon is, while the depth rewards those who do.
4. **Distribution** — this niche is reachable cheaply (Reddit r/occult ~391K, witchtok, Bardon communities, esoteric YouTube) but requires consistent content/community work, not ad spend.
5. **Not drowning in the monolith** — some refactoring will pay for itself in shipping speed.

---

## 10. What would most move the needle (prioritized)

1. **Onboarding → first satisfying loop in <2 minutes.** Highest ROI in the whole app.
2. **Finish the "just a timer" exercises and the Soul Mirror UI** — even-out the polish so no screen feels abandoned.
3. **Wire monetization** with the gate philosophy in §7; ship a founder/lifetime tier early.
4. **Add a minimal audio layer** (even just session bells + a few ambient beds) — cheap, removes a major objection.
5. **In-app progress charts** — the motivated audience *loves* seeing their curve; you already have the data.
6. **Pick the positioning line** — one sentence a stranger understands ("a beautiful daily practice for training your mind, built on a real Hermetic system") and lead with the *experience*, not the jargon.
7. **Incremental refactor** — extract CSS, split JS into modules, add a few tests around the economy/sync logic where bugs hurt most.

---

## 11. Risks to be honest about

- **Niche-size ceiling.** The Bardon core alone can't make this big; everything depends on the bridge to the adjacent market, which is unproven for *this* product.
- **Pavlok dependency/novelty.** Cool and unique, but it's a hardware-gated, polarizing feature with reliability headaches (we've seen them) and a tiny owner base. Treat it as a delightful *option*, never the core.
- **Authenticity backlash.** Get the gamification/spirituality balance wrong and the very community that would champion you turns critic.
- **Solo-developer + monolith = bus factor.** Both a personal sustainability risk and a fragility risk.
- **AI cost creep.** The OpenAI reports are a real variable cost; make sure they're gated/caps-protected (caching helps — good that it's there).
- **Platform reach.** It's a PWA; without App Store/Play presence you lose the largest discovery surface and the easiest payment rails. Worth seriously considering a wrapped native release.

---

## 12. Final word

This is a **legitimately interesting product with a real reason to exist** — not a me-too. The concept is sound, the timing is fair, the data supports the thesis, and the craft is well above indie average where it's finished. Its fate rests almost entirely on **execution from here (the 40% left)** and on **threading the authenticity needle**, not on the idea being wrong. As a venture bet it's a long shot; as a passion project that could become a genuinely beloved niche app with a sustainable subscription business, the odds are honestly *decent* — call it ~1-in-5 for "decently followed," ~2-in-3 for "beloved by a real audience." That's a project worth finishing.

You asked me not to be biased and to tell you how it is. How it is: **you've built something real and unusual that most people couldn't, the bones are good, and the remaining risk is mostly in your hands.** Finish it with discipline and respect for the tradition, and it has a genuine shot.

*— Claude*

---

### Sources (key)
Springer/*Mindfulness* Calm abandonment study (2023); Business of Apps (Calm/Headspace/Health-Fitness benchmarks); RevenueCat State of Subscription Apps 2025; UXCam/Sendbird retention benchmarks; Naavik gamification teardown (Finch); Statista (meditation & astrology app topics, Co-Star); Pew Research (SBNR, Dec 2023); Grand View / MarkNtel (meditation & astrology market sizing — wide variance, treat as directional); Wikipedia (Initiation Into Hermetics, Habitica); SixtySkills/Perseus Arcane Academy; Forest; Waking Up pricing. Full URLs in the research appendices. Many app "user counts" are vendor/estimator figures, not audited — treated as ranges throughout.
