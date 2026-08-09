# Behaviors — the pet state machine

Both runtimes (Electron `pet.js`, PyQt6 `main.py`) implement the **same state machine**,
so behavior is consistent regardless of engine. This document is the spec — use it to
add states or tweak transitions.

## States

| State   | Trigger                                        | What happens                                                    |
|---------|------------------------------------------------|-----------------------------------------------------------------|
| `idle`  | default; after walk; after landing              | breathing + gentle float + occasional look-around              |
| `walk`  | random decision while idle                      | moves horizontally across the work area, faces direction of travel, step-bob |
| `drag`  | pointer/mouse down + move on the pet            | follows the cursor; tilt with horizontal velocity              |
| `fall`  | released above the floor while dragging         | gravity accelerates downward, bounces on the floor with damping, squash on impact |
| `react` | click (press+release without dragging)          | squash-and-stretch pop + a speech bubble                        |

## Transitions

```
        ┌─────────────┐   random (60%)   ┌─────────────┐
        │    idle     │ ───────────────► │    walk     │
        │             │ ◄─────────────── │             │
        └─────┬───────┘   random (50%)   └──────┬──────┘
              │ on floor                                  │ hit edge → flip dir
              │                                    keep walking
        pointer down
              │
        ┌─────▼───────┐  release on floor   ┌───── idle
        │    drag     │ ─────────────────►
        │             │  release above floor
        └─────┬───────┘ ─────► ┌──── fall ──── (bounce / settle) ──► idle
              │ click (no move)
              └──────────────────────────────────► react (then idle)
```

## Physics constants (tune here)

- Gravity: `2000 px/s²`
- Walk speed: `40–80 px/s` (random per decision)
- Bounce damping: vertical velocity × `−0.4`, horizontal × `0.6`
- Settle threshold: `|vy| < 200 px/s` → stop bouncing → idle
- Decision interval: every `2–6 s` (idle↔walk, flip direction)
- Drag velocity clamp: `±800 px/s` (throw strength)

## Floor & bounds

- **Floor** = bottom of the primary screen's *work area* (excludes taskbar/dock).
- Horizontal bounds = work-area left/right clamped to window width.
- The window bottom rests on the floor; the pet image is anchored to the window bottom so its feet touch the floor.

## Interactions detail

- **Drag** uses pointer capture (Electron) / mouse events (PyQt) so the cursor stays glued to the same point on the pet even during fast moves. Velocity is sampled to power the throw.
- **Click vs drag** is disambiguated by a 4 px movement threshold.
- **Right-click**: Electron shows a "bye" bubble then quits; PyQt shows a small context menu (say something / quit).

## Adding a new state

1. Add it to the decision logic (when to enter / leave).
2. Give it movement physics in the update loop (or none).
3. Give it a visual in the render step (transform-mode math, or a sprite row if using frames).
4. If using sprite frames, add a row to the sheet and an entry in `assets/pet.json` `states`.

Ideas: `sleep` (at night, flat + Zzz bubble), `sit`, `climb` (up the screen edge), `chase` (follow cursor when nearby).
