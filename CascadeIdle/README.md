# CASCADE

An incremental game built on the Cascading Loop Builder concept from
`FUTURE_IDEAS.md`, rebuilt to follow Revolution Idle's structure closely.

Ten generators, drawn as a stack of sequential lines that set each other off,
housed inside a riveted engine chassis. Generator I sits at the top because
it's the one that pays out; each line below feeds the one above it, so a
completed lap throws a bead up the connector and the line above flashes as it
takes the hit. Buying a deep generator compounds through everything above it.

The chassis carries a mark number that rises with every Promotion, so the
machine itself is the record of how far you've come.

The entire moment-to-moment interaction is **tapping a tile in the grid at the
bottom of the screen**.

---

## Adding it to Xcode

1. **File → New → Project → iOS → App.** Interface **SwiftUI**, Language **Swift**.
2. Delete the generated `ContentView.swift` and the generated `…App.swift`
   (this package ships its own `@main`, and two of them will not build).
3. Drag the `Sources` folder into the project navigator. Check **Copy items if
   needed** and **Create groups**.
4. Set the deployment target to **iOS 17.0** or later — the code uses the
   `@Observable` macro and `.presentationBackground`.
5. Build and run. No dependencies, no assets, no network.

Saves live in `Documents/cascade-save.json`. **Stats → Erase save** starts clean.

---

## The design

### One mechanic

Every generator is identical in kind. It has a count you own, it turns laps,
and it has exactly one thing you can buy. There are no per-generator upgrade
tracks, no modules, no slots.

```
laps/s of generator i  =  owned[i] × lapRate
generator i's laps     →  builds generator i−1
generator I's laps     →  Energy
```

`lapRate` is global — perks and Cores raise it for everything at once. That is
the only multiplier in the game.

### Buying

One price curve, shared by all ten generators:

```
cost(i) = baseCost[i] × 3.0 ^ (purchases of i)
```

`×3.0` is steep on purpose. The chain compounds nine levels deep, so a shallow
curve unlocks all ten generators inside two hours — the first pass used ×1.42
and did exactly that.

`MAX` and `Buy All` resolve the price in closed form (it's a geometric series),
so there's no purchase loop to cap out.

A generator becomes visible once the one before it has been bought at least
once, so the grid grows as you go.

### Promote

Resets generators and Energy, pays **Cores**:

```
cores = ⌊ 0.8 × (log₁₀(energy this run) − 6) ^ 1.15 ⌋
```

Cores buy eight permanent perks — bought once each, no tree, no prerequisites,
the whole prestige layer on one screen. Every Core ever earned also
permanently adds +5% lap speed, so spent Cores keep paying.

| Perk | Cost | Effect |
|---|---|---|
| Overdrive I / II / III | 2 / 10 / 50 | All laps ×2 / ×3 / ×5 |
| Head Start | 5 | Begin each run with 10 of generators I–III |
| Deep Start | 25 | Begin each run with 5 of generators IV–VI |
| Rich Laps | 8 | Generator I laps pay ×10 Energy |
| Autobuyer | 30 | Buys generators for you, cheapest first |
| Cold Storage | 15 | Offline 100%, capped at 24h |

### Offline

Fast-forwarded on launch at 50% efficiency, capped at 4h; Cold Storage takes
that to 100% and 24h. Generators compound into each other, so this is
integrated in 2000 steps rather than multiplied out — a closed form would get
the interaction between tiers wrong.

---

## Balance, as simulated

First unlock of each generator, greedy-but-realistic play, from a fresh save:

| Gen | I | II | III | IV | V | VI | VII | VIII | IX | X |
|---|---|---|---|---|---|---|---|---|---|---|
| | 8 s | 30 s | 2.2 m | 6 m | 15 m | 39 m | 1.4 h | 3.4 h | 7.6 h | 16 h |

The base costs are **calibrated against that schedule**, not picked by hand —
the gaps between tiers have to widen as you go, because the chain compounds and
evenly-spaced prices make later generators arrive *faster*, not slower.

First Promote is worth taking around 10 minutes in. Simulating 45-minute runs,
the full perk list is bought out after **7 Promotes**:

| Promote | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Cores earned | 7 | 11 | 15 | 24 | 27 | 30 | 32 |

## Where this wants to go next

- **A layer above Cores.** Once the eight perks are bought there's nothing left
  to climb. This is the clearest gap.
- **Line interaction.** The lines are currently a readout. Tapping one to
  charge it manually would give the centrepiece something to do.
- **Bigger numbers.** Everything is `Double`, so the ceiling is ~1e308.
  Revolution Idle runs to e3000+, which needs a custom mantissa/exponent type.

## Files

```
Sources/
  CascadeIdleApp.swift      @main, scene-phase save/restore
  Model/
    Numbers.swift           number and duration formatting
    Config.swift            generator table, perks, balance constants
    GameState.swift         Codable save state
    GameEngine.swift        tick, buying, promote, offline, persistence
  Views/
    Theme.swift             palette, backdrop, panel chrome
    EngineChassis.swift     the machine housing: nameplate, well, output manifold
    EngineView.swift        the sequential lines, pulse links, laps/s strip
    GeneratorGrid.swift     the tap-to-buy tiles
    MainView.swift          engine + promote + buy controls + grid
    CoresView.swift         prestige currency and the eight perks
    StatsView.swift         readouts and save management
    RootView.swift          shell, tab bar, offline sheet
```

All balance lives in `Config.swift`.
