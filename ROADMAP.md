# Roadmap

Ideas and future enhancements for `desktop-pet`. None of this is required — the skill is fully useful without it. Pick what you want and check it off. (See [`references/behaviors.md`](references/behaviors.md) for the state-machine spec and how to add states.)

## Behaviors (new states)
- [ ] **Sleep** — at night (or after long idle), the pet lies down, breathing slows, a "Zzz" bubble appears; wakes on click.
- [ ] **Sit** — an occasional resting pose between idle and walk.
- [ ] **Climb** — grab the screen edge / taskbar and crawl up the side (Shimeji-style).
- [ ] **Chase cursor** — when the pointer comes close, walk toward it; flee if "scared".
- [ ] **Carry & push** — small objects the pet can push around.
- [ ] **Petting** — hold the pointer on the pet to "pet" it (happy reaction + heart bubble).

## Animation & visuals
- [ ] **Blink / eye tracking** — segment the eyes and blink; look toward the cursor.
- [ ] **Seasonal & weather** — tiny umbrella in the rain, scarf in winter.
- [ ] **Accessories** — hats, glasses composited on top (per-pet config).
- [ ] **Particle effects** — dust puff on landing, sparkles on click.
- [ ] **Smoother walk** — ease in/out, accelerate instead of instant velocity.

## Cutout & image quality
- [ ] **rembg auto-install** — offer to `pip install "rembg[cpu]"` when missing, for much cleaner edges than the ImageMagick flood-fill fallback.
- [ ] **Subject centering & padding** — normalize framing so the pet is consistently placed after cutout.
- [ ] **Edge de-fringe** — erode a pixel or two of the semi-transparent halo left by flood-fill.
- [ ] **AI sprite generation** — stricter on-model idle/walk strip generation prompts.

## Platform & integration
- [ ] **System tray** — a tray icon to show/hide, multiply, change speed, quit.
- [ ] **Autostart** — generate a `.desktop` / LaunchAgent / Windows shortcut so the pet starts on login.
- [ ] **Multi-monitor** — place and walk across the correct monitor; per-display floor.
- [ ] **Click-through toggle** — make the pet non-interactive so it never blocks the desktop (Wayland support is the hard part).
- [ ] **Per-pet config** — a `config.json` for colors, bubble messages, speeds, gravity.

## UX & packaging
- [ ] **One-command installer** — `npx desktop-pet <image>`-style distribution.
- [ ] **Example gallery** — ship a few example pets in `examples/`.
- [ ] **Demo GIF** in the README.
- [ ] **Diagnostics** — a `--verbose` flag explaining which cutout/runtime path was chosen.
- [ ] **Tests** — unit tests for `lib/` (cutout fallback, sprite assembly, runtime picking).

## Contributing
PRs welcome. For a new behavior, add it to the state machine in **both** `templates/electron/pet.js` and `templates/pyqt/main.py` (see [`references/behaviors.md`](references/behaviors.md)), and document any new constants in [`references/animations.md`](references/animations.md).
