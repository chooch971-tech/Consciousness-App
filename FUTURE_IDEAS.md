# Future Project Ideas

These concepts are deliberately deferred so Presence can reach V1.0 without
expanding its scope.

## Cascading Loop Builder

**Status:** Prototyped as a standalone SwiftUI app in `CascadeIdle/` — see that
folder's README for the mechanics, balance curves and open questions. It is a
separate project and shares no code with Presence.

An incremental building-and-upgrade game inspired by the satisfying layered
progression of Revolution Idle, but with a different central mechanic:

- Progress is represented by horizontal loops/bars that fill over time.
- Completing one loop sends a pulse into the next loop and starts or advances
  it.
- Subsequent loops must be purchased before they can receive those pulses, so
  extending the chain is itself a major progression milestone.
- Later loops operate on increasingly long timescales and produce increasingly
  powerful resources, buildings, or permanent effects.
- Buildings and upgrades can change loop speed, pulse strength, overflow,
  automation, branching, and how many downstream loops a completion activates.

Promising directions include assigning buildings to individual loops, allowing
parallel or branching chains, preserving blueprints through a prestige/reset
layer, and making every newly purchased loop visibly expand the player's
machine or city.

Answers the prototype settled on:

- **Separate game.** Its own Xcode target, no Presence dependency.
- **Theme:** an abstract machine — Spark, Coil, Rotor, Furnace, Cascade, Nexus,
  Aurora, Singularity — rendered as glowing horizontal tracks.
- **Offline:** fast-forwarded on launch, 60% efficiency capped at 4h, raised to
  100% and 24h by prestige nodes.
- **Preserved on reset:** Echoes and the Array node tree, plus a permanent
  per-Echo yield bonus. Resonance and Modules only with the Vault node.

Still open: a second prestige layer above Echoes, parallel/branching chains, and
whether the loops should visibly build a machine rather than a stack of bars.

Presence V1.0 remains the priority; this stays a side project.
