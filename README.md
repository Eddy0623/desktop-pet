# desktop-pet

**English** | [Chinese](README.zh-CN.md)

A [Claude Code](https://claude.com/claude-code) **skill** that turns any image into an animated desktop pet — a transparent, always-on-top, draggable little character that lives on your desktop, breathes, wanders, falls with gravity when you toss it, and reacts when you click it.

<p align="center"><i>Give it a picture, get a living desktop pet.</i></p>


Uploading Screencast from 2026-08-09 18-12-30 (Copy).mp4…



---

## How it works

```
your image ──► [cutout: rembg / ImageMagick] ──► transparent pet.png
                                                         │
            (optional) generate idle/walk frames ──► sprite sheet
                                                         │
                        pick engine ──► Electron  or  PyQt6  template
                                                         │
                                  self-contained, runnable  my-pet/  folder
```

- **Two runtimes.** A web-based [Electron](https://www.electronjs.org/) pet (richest animation, cross-platform) **or** a native [PyQt6](https://www.riverbankcomputing.com/software/pyqt/) pet (light, native on GNOME/Wayland). `auto` picks PyQt6 if it is already installed, otherwise Electron.
- **Smart animation.** With just one image, the pet is animated procedurally (breathing, walking, squash-and-stretch, gravity, shadow, speech bubbles). If you have image generation available, the skill can produce idle/walk sprite strips for true frame-by-frame animation (Shimeji-style).
- **Graceful dependencies.** Nothing is required up front. `rembg`, `PyQt6`, and `electron` are installed lazily, with fallbacks, so cloning the repo just works.

## Install (as a Claude Code skill)

```bash
git clone <this-repo> ~/.claude/skills/desktop-pet
```

Then in Claude Code, just describe what you want — for example, *"Turn cat.png into a desktop pet"* — and the skill takes over. Or call the generator directly:

```bash
node ~/.claude/skills/desktop-pet/scripts/generate.mjs cat.png --name kitty
```

## Usage

```bash
node scripts/generate.mjs <image> [options]

options:
  --name <name>        project / display name            (default: my-pet)
  --out <dir>          output directory                  (default: ./<name>)
  --runtime <r>        auto | electron | pyqt            (default: auto)
  --cutout <c>         auto | none                       (default: auto)
  --frames <f>         none | <dir of idle_*.png/walk_*.png>   (default: none)
  --launch             start the pet after generating
```

### Sprite frames (optional, best quality)

If you can generate images, name frames by convention and pass the directory:

```
my-frames/
├── idle_0.png  idle_1.png  idle_2.png  idle_3.png
└── walk_0.png  walk_1.png  walk_2.png  walk_3.png
```

```bash
node scripts/generate.mjs cat.png --name kitty --frames ./my-frames
```

## Running a generated pet

```bash
cd my-pet
./run.sh        # macOS / Linux   (Windows: run.bat)
```

- **Electron**: first run does `npm install` (downloads Electron once), then launches.
- **PyQt6**: first run installs PyQt6 if missing, then launches.

The pet appears at the bottom-center of your screen.

- **Drag** it around; **toss** it and it falls with gravity and bounces.
- **Click** it for a reaction and a speech bubble.
- **Right-click** → quit (PyQt) / right-click → bye (Electron).

## Requirements (all optional / lazy)

| Capability         | Tool                              | When it's used                              |
|--------------------|-----------------------------------|---------------------------------------------|
| Background removal | `rembg` (pip)                     | best-quality cutout (fallback: ImageMagick) |
| Image ops          | ImageMagick (`convert`/`montage`) | cutout fallback + sprite sheet assembly     |
| Electron pet       | Node.js + npm                     | `--runtime electron` (default if no PyQt6)  |
| PyQt6 pet          | Python 3.9+                       | `--runtime pyqt`                            |

> **Ubuntu / Debian tip:** stock installs have no `pip` (PEP 668). For the PyQt6 pet, install Qt once with `sudo apt install python3-pyqt6` — the generated `run.sh` detects a missing PyQt6/pip/venv and prints this same hint.

## Wayland / GNOME note

The Electron template launches with `--ozone-platform-hint=auto` and the PyQt6 window uses native frameless-translucent-stays-on-top flags, so transparent always-on-top pets work on GNOME/Wayland (and X11, macOS, Windows). A running compositor is required for transparency on Linux.

## Project layout

```
desktop-pet/
├── SKILL.md                 # skill entry (instructions for Claude)
├── scripts/generate.mjs     # the generator
├── lib/                     # cutout, sprite-sheet, runtime-pick helpers
├── templates/electron/      # Electron pet template
├── templates/pyqt/          # PyQt6 pet template
└── references/              # behaviors.md, animations.md (extend / tune)
```

## Roadmap

Planned enhancements (sleep/climb states, tray icon, autostart, multi-monitor, tests, …) live in [ROADMAP.md](ROADMAP.md).

## License

MIT — see [LICENSE](LICENSE). Pets you generate are yours.
