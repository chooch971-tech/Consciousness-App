# Book II Economy Plan (Dark Matter) — and the road to Book V

Design doc for the Dark Matter (◆) economy: what exists, what shipped with the
DM pumps, and the balance targets for V1.0.1 → V1.0.3. Companion to the akasha
economy already tuned in Book I.

## 1. Audit — where the economy stands

**Sources (before pumps)**
- Advanced visualization drills (multi-sense, all-angles): flat **30 ◆** each.
  Now clamped: mints ≥ 60s apart, max **10/day** (300 ◆/day ceiling) — before
  this, quick-tapping drill completions could mint unbounded ◆.
- Nothing else mints ◆. Beginner exercises feed akasha only.

**Sinks (first Book II pass)**
| Sink | ◆ | Akasha |
|---|---|---|
| 15 tools × 3 phases (Design/Craft/Consecrate) | ~4,590 | ~273k |
| 3 refined bodies to lvl 31 (sphere X gate) | ~4,725 | ~86k |
| 10 spheres (per turning) | ~1,710 | ~62k |
| **First turning total** | **~11,000** | **~420k** |

Later turnings: tools & bodies persist → only spheres (~1,710 ◆) repeat.

**Pacing floors (independent of currency):** tool phases carry a 12h rest
(15×3×12h ≈ 22.5 days minimum) and spheres a 24h rest (10 days). So the first
turning can never be shorter than ~1 month; currency should be the *binding*
constraint at roughly 2–4 months for a dedicated practitioner.

## 2. Dark Matter pumps (SHIPPED)

Three idle ◆ condensers in the generator yard, below the akasha pumps.

| Pump | Unlocks | Rate (Dark Current 1 → 20) | Vat cap |
|---|---|---|---|
| I | Prestige 3 | 12 → 40 ◆/day | 2 → 4.25 days of production |
| II | Prestige 5 | 18 → 60 ◆/day | 2 → 4.25 days |
| III | Prestige 8 | 26 → 82 ◆/day | 2 → 4.25 days |

- **All three Dark Currents maxed ≈ 182 ◆/day.** Levels 1–10 preserve the
  shipped curve; levels 11–20 grow at half speed so advanced practice remains
  the primary current. No prestige/devotion/temporary multipliers apply to ◆.
- Four tracks now give every pump a distinct late-game build:
  - **Dark Current** (lvl 20): ◆ production; levels 11–20 taper.
  - **Void Vessel** (lvl 10): expands the vat from 2 to 4.25 production-days.
  - **Stabilization** (lvl 10): retains 5% production per purchased level while
    any track on that pump is under construction, up to 45%.
  - **Umbral Resonance** (lvl 10): +4% Akasha output per purchased level, up to
    +36%, only for the numerically paired Akasha pump. It costs both ◆ and
    Akasha, keeping Dark Matter as the binding ingredient while linking the two
    economies.
- Builds use the heavy idle model: 900 + 12·lvl³ seconds (≈ 17m at lvl 2 →
  ≈ 3.6h at lvl 10 and capped at 24h), **no Quickening**. One track builds at a
  time; Stabilization alone permits partial output during construction.
- Future pumps render ghosted with their prestige requirement, so the goal is
  visible from Prestige 3.
- Sync: levels live in `omniaState.upgrades` (dm1/dm2/dm3) → generic
  monotonic Math.max merge client+server, zero server changes.

**Original resulting income curve** (retained here as the pre-expansion
baseline for future playtest comparison; 2 advanced drills/day practice):
- Prestige 3, pump I fresh: ~72 ◆/day → first turning ≈ 4–5 months.
- Prestige 5, pumps I+II leveled: ~120–150 ◆/day → ≈ 2.5 months.
- Prestige 8, all three: ~200+ ◆/day → later turnings (~1.7k ◆) ≈ 2 weeks,
  matching their 10-day sphere-rest floor. ✔ balanced against the gates.

## 3. V1.0.1 — more advanced exercises + the beginner question

**Should beginner exercises mint ◆ past a threshold? Recommendation: not
directly.** Reasons:
- Beginner exercises and autonomous Akasha pumps already power Book II: every
  sink costs akasha *and* ◆. Pump output depends only on that pump's Current,
  mastery, paired Resonance, and construction state—not Step, sessions, or body
  levels—while reservoirs keep unattended income finite.
- A flat conversion (e.g. Clock → ◆) recreates the farming problem the akasha
  clamps closed, and devalues the advanced drills' identity as *the* ◆ source.

**Do instead (V1.0.1): the Deepened Practice rule.** At Prestige 3+, a
beginner exercise mints a small ◆ bonus (~8 ◆) only when it is **Omnia's
recommended session** that day and reaches the recommended duration — capped
at 2/day. Routes through `mintDarkMatterFromPractice` so all clamps apply.
This honors "my daily practice matters in Book II" without farmability
(~16 ◆/day ceiling ≈ half a drill).

**New advanced exercises (2 proposed, each minting 30 ◆ via the same clamp):**
1. **Transference** (Bardon Step IV+): project consciousness into an object
   from the vis library; hold N minutes, tap on slips — the auditory/thought
   hybrid loop already in the codebase supports this shape.
2. **Space Magic / Room Impregnation** (Step V+): fill a visualized space with
   a condensed quality; timer + intrusion taps. Both reuse existing session
   scaffolding (setup screen → timed hold → completion pipeline).

## 4. V1.0.2 — Book III (+ maybe IV)

- **Book III currency: none new.** Add a third *sink* tier, not a third
  currency — two currencies + prestige multipliers is already the full idle
  stack; a third current would fragment earning. Book III spends ◆ + akasha
  at ~3× sphere prices, gated on Turnings (evocations completed) rather than
  a new mint.
- Book III shape (Key to the True Kabbalah): letter mysticism — 27 "letters"
  learned in three rows (single/double/triple), mirroring the tools grid
  machinery (`bookIIToolState` generalizes to `bookNItemState`).
- If Book IV lands in the same release, it shares the letter economy with
  steeper gates (kabbalistic formulas = letter combinations).

## 5. V1.0.3 — Book V, the capstone

- Book V closes the loop: a **Great Work** meta-project consuming both
  currencies in bulk (think 25k ◆ + 2M akasha across ~10 stations) with
  week-scale rests. It should be finishable ~1 year after install for a
  dedicated daily practitioner — the "lifetime" goal.
- Final prestige tier ("Adepthood") converts leftover economy into cosmetic
  prestige (aura tiers), so the economy never needs a Book VI sink.

## 6. Balance invariants (check on every economy change)

1. Practice ≥ idle: pumps at cap must not out-earn 2 daily advanced sessions.
2. Every mint path routes through a clamp (rate + daily cap).
3. New sinks price in BOTH currencies (akasha keeps beginner practice relevant).
4. Time gates (rests) stay ≈ 0.5× the currency pace, so neither feels vestigial.
5. Sync: new progress = new monotonic keys; never re-use an old key after a
   semantic change (the gen2/gen3 lesson).
