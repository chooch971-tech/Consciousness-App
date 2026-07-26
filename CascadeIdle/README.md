# CASCADE

An incremental game built on the Cascading Loop Builder concept from
`FUTURE_IDEAS.md`, with pacing and layer structure taken from Revolution Idle.

Progress is a vertical stack of horizontal loops. The first one fills on its own;
every other one fills **only** from pulses sent up the chain when the loop below
it completes. Buying the next loop is the milestone the whole game is built
around.

---

## Adding it to Xcode

1. **File → New → Project → iOS → App.** Product Name `CascadeIdle`, Interface
   **SwiftUI**, Language **Swift**.
2. Delete the generated `ContentView.swift` and `CascadeIdleApp.swift` (this
   package ships its own `@main`).
3. Drag the `Sources` folder into the project navigator. Check **Copy items if
   needed** and **Create groups**.
4. Set the deployment target to **iOS 17.0** or later — the code uses the
   `@Observable` macro and `.presentationBackground`.
5. Build and run. No dependencies, no assets, no network. All the art is drawn
   in SwiftUI.

Saves live in `Documents/cascade-save.json`. Delete the app or use **Stats →
Erase save** to start clean.

---

## The design

### The core loop

Eight loops, `Spark → Coil → Rotor → Furnace → Cascade → Nexus → Aurora →
Singularity`. Each has a *requirement*: the charge it needs for one completion.

- The **Spark** gains charge from time, and nothing else.
- Every other loop gains charge **only** when the loop below it completes and
  sends a pulse.
- A completion pays Energy, pays Resonance on the deeper loops, and pulses
  onward.

Because the chain multiplies, a loop's real cycle time is the product of every
requirement below it. Loop 4 fires roughly once per 3 000 Spark cycles at base
rates. That is deliberate: the deep loops are meant to feel like weather, not
buttons.

### Three currencies, three time horizons

| | Earned from | Spent on | Survives a Collapse |
|---|---|---|---|
| **Energy** ⚡ | every completion | loop unlocks, repeatable upgrades | no |
| **Resonance** 〰️ | Furnace and deeper | Modules | only with Resonance Vault |
| **Echoes** ⬡ | collapsing a run | Array nodes | always |

### Repeatable upgrades

Three per loop, priced off that loop's `upgradeBase`:

| Upgrade | Effect | Per level | Cost growth |
|---|---|---|---|
| **Yield** | Energy per completion | ×1.30 | ×1.55 |
| **Intake** (Spark: **Speed**) | charge received | ×1.22 | ×1.60 |
| **Pulse** | strength sent onward | ×1.18 | ×1.70 |

**The one rule that matters:** each track's cost growth must exceed its own
benefit growth, or the economy runs away. The first pass at this used ×1.65
yield against ×1.20 cost and the entire eight-loop chain finished in seven
minutes. Pulse is priced steepest because it compounds through every loop
downstream of it, not just its own.

### Modules — where builds happen

Bought with Resonance and bolted to **one specific loop**. Slots are scarce (2,
up to 4 from the Array), so this is a choice, not a checklist. Each copy you own
raises the price of the next by ×2.6.

| Module | Effect |
|---|---|
| **Intake Coil** | ×1.75 charge received |
| **Amplifier** | ×2 pulse sent out |
| **Condenser** | ×3 Energy from this loop |
| **Overflow Valve** | excess charge carries forward instead of being lost |
| **Splitter** | also pulses the loop *two* ahead, at 50% — the branching hook |
| **Flywheel** | every completion permanently speeds up the Spark this run |
| **Resonator** | ×4 Resonance from this loop |
| **Governor** | −25% charge required per completion |

**Overflow Valve is the sleeper.** Without it a loop can never fire faster than
its feeder — one completion in, at most one completion out, remainder discarded.
With it, a single heavy pulse can complete a loop many times at once, and the
whole chain stops being rate-limited by the Spark. It changes the maths, not
just the numbers.

### Collapse — the prestige layer

Available once **Cascade** is online and the run has banked ≥ 1 Echo.

```
echoes = ⌊ 2.5 · (log₁₀(energy this run) − 6)^1.55
           · (1 + 0.35 · loops beyond Cascade)
           · (1.6 if Deep Echo) ⌋
```

Collapsing resets loops, upgrades and Energy. It keeps the Array, your Echoes,
and a permanent **+2% Energy per Echo ever earned** — so even spent Echoes keep
paying.

The Array is 18 nodes in four columns (Throughput, Head Start, Capacity,
Automation) with prerequisite chains. Automation is deliberately the deepest and
most expensive column: autobuyers retire grinds you've already mastered, which
is the whole reason a prestige layer exists.

### Offline

Fast-forwarded on launch at 60% efficiency, capped at 4 h. Cold Storage I/II
take that to 100% and 24 h. Long absences are simulated in adaptive steps, so
returning after a week resolves in a frame rather than a spin. Batched
completions are computed in closed form (`floor(charge / requirement)`) rather
than looped, so there's no iteration cap to lose progress against.

---

## Balance, as simulated

Times to bring each loop online, from a greedy-but-realistic play pattern:

| | Run 1 (fresh) | Run 2 (~34 Echoes spent) | Run 4 (deep Array) |
|---|---|---|---|
| Coil | 1 min | seeded | seeded |
| Rotor | 10 min | seeded | seeded |
| Furnace | 45 min | 3 min | seeded |
| Cascade | **2.0 h** ← first Collapse | 5 min | seeded |
| Nexus | 6.7 h | 1.3 h | 2 min |
| Aurora | — | 7.6 h | 5 min |
| Singularity | — | — | 0.9 h |

Roughly three or four Collapses buy out the Array and complete the chain. That's
a deliberate v1 arc, not an accident — but it does mean the endgame is thin once
the Array is full.

## Where this wants to go next

- **A second prestige layer above Echoes.** The clearest gap: once the Array is
  bought out there's nothing left to climb. Revolution Idle's answer is a layer
  that resets the tree itself.
- **Parallel chains.** The Splitter hints at branching; real parallel chains
  feeding a shared sink would make module placement a much richer puzzle.
- **A visible machine.** Right now each loop is a bar. The original note wanted
  every purchased loop to visibly expand a machine or a city — that's a whole
  rendering layer, and the honest place to start is a Canvas schematic that
  grows a node per loop.
- **Module levels.** Currently one copy per loop, flat effect. Levels would give
  Resonance a long-term sink.

## Files

```
Sources/
  CascadeIdleApp.swift      @main, scene-phase save/restore
  Model/
    Numbers.swift           number and duration formatting
    Config.swift            loop table, module catalogue, Array tree, balance constants
    GameState.swift         Codable save state
    GameEngine.swift        tick, cascade, upgrades, prestige, offline, persistence
  Views/
    Theme.swift             palette, backdrop, starfield, panel chrome
    Components.swift        loop track, pulse connector, buttons, pills
    RootView.swift          shell, currency bar, tabs, offline sheet
    LoopsView.swift         the cascade — the main screen
    ModulesView.swift       slot management and catalogue
    ArrayView.swift         Collapse panel and the prestige tree
    StatsView.swift         readouts and save management
```

All balance lives in `Config.swift`. Nothing in the views hardcodes a number.
