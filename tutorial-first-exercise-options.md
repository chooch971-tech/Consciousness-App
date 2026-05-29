# Tutorial First-Exercise — 3 Options for Review

Goal: maximize first-session retention without betraying that Presence is a *serious
training app* (Bardon Hermetics), not a frictionless-wellness clone.

## How it actually works today (verified in `presence.html`)

- Tutorial questions → `window._tutorialFirstClock = true` → `currentExercise = 'clock'`
  → `startConcentration()` (≈ line 21354, 21370).
- Beginner path gets a **stripped UI** (no ✕, no top Stop, no title) so the user can only
  **Begin → wait → Stop** (line 7941-7947).
- Pre-instruction shown up front (line 7953, `label60`):
  > "Focus on the tip of the seconds hand. Click Stop the second a thought appears.
  > Nothing must distract you inside or outside of your mind. The moment you are
  > distracted you MUST stop. For this first exercise, as a beginner, you will only
  > go max 60 seconds."
- Experienced tutorial path (line 7954, `labelExp`): *"Be pitiless with yourself. No ego here…"*
- Begin → 5s countdown (`beginCountdown`, line 7977) → clock runs.
- Beginner path has a **60s auto-stop watchdog** (line 8030-8036).
- On stop, tutorial branch shows a single **raw second count** (`concResultBig`, line 8080-8086),
  then save → reward → post-session overlay (`tutPostSession` / `showTutorialPostSession`).

**The core problem:** the hold is *inert* (no interaction for up to 60s), the framing is
*pitiless* ("you MUST stop"), and the only output is a bare number that, for a cold beginner,
reads as a failing grade (~15-30s). Reordering the surrounding tutorial screens does nothing
about the exercise itself.

The full exercise roster (concentration): **Clock, Visualization, Auditory, Thought Control,
Asana**. Plus **Awareness** (Tolle witness) as its own domain. Thought Control already has a
"tap each intrusion + running count" mechanic.

---

## Option A — Reframe the Clock run as "returns" (gentle win, medium effort)

Keep Clock and the existing 60s structure, but flip **framing + scoring** for the tutorial
run only.

**Changes**
- Replace `label60` with a returns-based frame:
  > "Rest your eyes on the tip of the seconds hand. The moment you notice your attention has
  > drifted, gently bring it back — and tap. Each return is one rep."
- Add a **tap-anywhere-to-count-returns** interaction during the hold (reuse Thought Control's
  tap → ripple + count + Akasha mote), counting *returns* positively.
- Remove the self-stop-on-failure instruction; let the existing 60s cap run to completion.
- Result screen: instead of raw seconds → **"You returned N times — N reps of attention."**
  Award XP/Akasha off N (floor of 1 so it's never zero).
- Post-session Omnia: "Returning *is* the exercise. That muscle is what every step here builds."

**Effort:** Medium — edit label, add a tutorial-only tap handler + counter on the clock screen,
change the tutorial result readout.

**Why it works:** can't-fail (every return scores), interactive, inoculates against the #1
beginner quit reason ("my mind won't stop"). Stays inside the real Clock exercise.

**Risk / tension:** the tutorial Clock now teaches the *opposite* rule from the real Clock the
user meets later ("Stop when focus breaks"). Needs a bridge line: *"That was training wheels —
the real Clock asks you to stop on the first thought. Ready?"*

---

## Option B — Open with Thought Control instead (forgiving by nature, larger plumbing)

Swap the tutorial opener from `clock` to `thought`.

**Changes**
- Tutorial launch: `currentExercise = 'thought'`, launch thought-control in a new
  `_tutorialFirstThought` mode (60s cap, stripped UI, post-session hook).
- Reframe first-run copy from "Think of nothing. Tap each intrusion." →
  > "Let your mind settle. Each time you notice a thought arrive, tap. Noticing it is the
  > skill — not silencing it."
- It already **doesn't end on failure** and has tap-to-record + a live count.
- Result: invert the count's meaning for run #1 only — **"You noticed N thoughts — N moments
  of awareness."** (Normally more intrusions = worse, so the copy must explicitly flip it here.)
- Post-session Omnia explains real Thought Control + that this noticing underlies all
  concentration work.

**Effort:** Medium-High — the tutorial scaffolding (60s cap, stripped UI, post-session overlay)
is currently **clock-specific** (`_tutorialFirstClock`). You'd add a parallel
`_tutorialFirstThought` path or generalize the tutorial-session machinery.

**Why it works:** uses an exercise that's *already* forgiving (runs to time, counts rather than
terminates). The tap interaction is built in.

**Risk / tension:** "tap each intrusion" inherently scores weakness; inverting its meaning for
one run, then flipping it back when they meet the real exercise, can confuse. More new plumbing
than A.

---

## Option C — Keep Clock, frame the number as a baseline (honest-training, smallest change)

Keep all mechanics as-is. Change **only copy + post-session framing**.

**Changes**
- Soften `label60` from "pitiless / you MUST stop" to a baseline frame:
  > "See how long you can rest on the tip of the seconds hand before a thought pulls you away.
  > However long you last is your starting line — we'll grow it together."
- Result screen: present `rawSecs` as **"Your baseline: N seconds"** with a forward note, not
  pass/fail.
- Post-session Omnia: "Most people start near here. In a week this number climbs — that climb
  is the practice." Tie to the streak/XP they're about to earn.

**Effort:** Low — text only: `label60` + tutorial result readout + post-session copy.

**Why it works:** honest, on-brand for a rigorous niche audience; reframes a weak first number
as a hook ("watch it grow") instead of a verdict. Zero new interaction risk.

**Risk / tension:** still an inert, non-interactive 60s stare. The "win" is purely narrative —
does the least to manufacture engagement, leans hardest on the audience already wanting rigor.

---

## At a glance

| | Exercise | Interaction | Win signal | Effort | Best if… |
|---|---|---|---|---|---|
| **A** | Clock (reframed) | Tap = return | "N returns / reps" | Medium | you want a can't-fail interactive win inside Clock |
| **B** | Thought Control | Tap = noticing | "N moments noticed" | Med-High | you want a natively forgiving exercise as the door |
| **C** | Clock (as-is) | None | "Baseline: N sec" | Low | you trust the niche to value honest rigor over a manufactured win |

Cross-cutting note (applies to all): the current cold-open copy ("Be pitiless with yourself",
"you MUST stop") is the most retention-hostile single element regardless of which option you pick.
A and B replace it; C softens it.
