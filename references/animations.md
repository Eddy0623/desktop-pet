# Animations — how a single image comes alive

The default (`--frames none`) path animates **one static image** with procedural
transforms — no frame generation needed. This documents every motion so you can tune it.

All transforms use `transform-origin: bottom center` so the pet grows/mirrors from its feet.

## Idle

- **Breathing**: `scaleY = 1 + 0.03·sin(t·1.8)`, `scaleX = 1 − 0.015·sin(t·1.8)` — a slow ~3.5 Hz... actually ~0.29 Hz chest rise.
- **Float**: `translateY = −3·sin(t·1.8)` — gentle hover in sync with breathing.
- **Look-around**: `rotate = 1.5·sin(t·0.7)` — slow head tilt.

## Walk

- **Step bob**: `translateY = −7·|sin(t·9)|` — two bobs per stride.
- **Sway**: `rotate = 3·sin(t·9)·dir` — lean into the stride.
- **Facing**: `scaleX = dir` (mirror left/right).
- The *window* moves horizontally at the walk speed; only the sprite bobs inside.

## Drag

- Follows cursor (window repositioned each pointer event).
- **Tilt**: `rotate = clamp(velx·0.8, −12°, 12°)` — leans in the throw direction.

## Fall

- No per-frame sprite change; the *window* falls under gravity.
- On floor impact → **bounce** (velocity × −0.4) + brief **squash** window (see react).

## React (click) / landing squash

- For `500 ms` after a click or bounce: `scaleY *= 1 − 0.18·k`, `scaleX *= 1 + 0.18·k`
  where `k` eases 1 → 0. Classic squash-and-stretch.

## Shadow

An ellipse under the pet that sells height:
- `scale = clamp(1 − off/500, 0.4, 1)` where `off` = pixels the window is above the floor.
- `opacity = 0.3·scale`.
Pet rises (drag/fall) → shadow shrinks and fades. Pet on floor → shadow full.

## Sprite mode (`--frames <dir>`)

When frames are provided, the renderer switches to a sprite sheet:
- Sheet = `assets/pet.png`, layout in `assets/pet.json` (`cols`, `rows`, `frameW`, `frameH`, `fps`, `states`).
- Row 0 = `idle`, row 1 = `walk`; columns advance at `fps` (default 8).
- Transform-mode motion (bob, mirror, squash) is still layered on top of the frame cycling for extra life.

## Tuning cheat sheet

| Want…                  | Change                                             |
|------------------------|----------------------------------------------------|
| Faster breathing       | multiply the `1.8` frequency                       |
| Bigger breath          | increase the `0.03` breathing amplitude           |
| Bouncier walk          | increase the `7` step-bob and/or `9` stride freq   |
| Heavier feel (gravity) | increase `2000 px/s²`                              |
| Less bouncy landings   | lower bounce damping toward 0                      |
| Faster wandering       | raise walk speed range (40–80) and lower idle time |
