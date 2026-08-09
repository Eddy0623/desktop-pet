---
name: desktop-pet
description: Turn an image into an animated desktop pet — a transparent, always-on-top, draggable character that breathes, walks, falls with gravity, and reacts to clicks. Use when the user wants to create/generate/make a desktop pet, virtual pet, 桌面宠物, 虚拟宠物, shimeji-style mascot, or any "会动的桌面宠物" from a picture/photo/image. Produces a self-contained runnable pet (Electron or PyQt6).
---

# Desktop Pet Skill

Generate an animated desktop pet from a single image. Output is a self-contained,
runnable project: a transparent, always-on-top, draggable window that breathes,
walks across the screen, falls with gravity when you throw it, and reacts to clicks.

## When to use

- The user provides an image (photo / drawing / PNG) and wants a desktop pet.
- Keywords: 桌面宠物, 虚拟宠物, 桌面挂件, shimeji, mascot, "会动的宠物", desktop pet.

## Inputs

- `image` (required): path to the source image (png / jpg / webp).
- Options (all optional):
  - `--name <pet-name>` — project + display name (default `my-pet`).
  - `--out <dir>` — output directory (default `./<name>`).
  - `--runtime auto|electron|pyqt` — which engine (default `auto`: uses PyQt6 if already importable, else Electron).
  - `--cutout auto|none` — remove the background (default `auto`).
  - `--frames none|<dir>` — sprite frames directory for frame animation (default `none` → procedural single-image animation).
  - `--launch` — start the pet immediately after generating.

## Pipeline

Run the generator from this skill's root:

```bash
node scripts/generate.mjs <image> --name <pet-name> [--out <dir>] [--runtime auto] [--cutout auto] [--frames none]
```

The generator:
1. **Cutout** (`--cutout auto`): removes the background → `assets/pet.png` with alpha. Uses `rembg` if installed (best quality; `pip install "rembg[cpu]"` — first run downloads a ~170MB model), else ImageMagick flood-fill, else copies the original.
2. **Frames** (`--frames <dir>`): if a frames directory is given, assembles a sprite sheet (`assets/pet.png` + `assets/pet.json`). Otherwise a single image is used.
3. **Runtime**: copies the chosen engine template (`templates/electron` or `templates/pyqt`), fills in the name, and writes a `run.sh` / `run.bat`.
4. Prints the output path and run command; `--launch` starts it.

## Smart animation decision (do this)

The "会动" (moves) requirement has two quality tiers — pick based on your available tools:

- **If you have image-generation capability** (an image-gen MCP tool, etc.): keep the character on-model and generate two sprite strips:
  - `idle_0.png … idle_3.png` (4 idle frames)
  - `walk_0.png … walk_3.png` (4 walk frames)
  Save them to a temp directory and pass `--frames <that-dir>`. The generator builds a sprite sheet → smooth, true frame-by-frame animation (Shimeji-style).
- **Otherwise**: pass `--frames none` (the default). The pet uses **procedural single-image animation** — breathing, walking, squash-and-stretch, gravity fall, click reaction, plus a shadow that tracks height. This always works with zero extra dependencies.

Default to `--frames none`; only use frames when you can actually generate them.

## Cutout guidance

- Default `--cutout auto`. If the image already has transparency, auto-cutout is still safe.
- For best edges, install rembg (`pip install "rembg[cpu]"`) before generating. If rembg is unavailable the generator falls back to ImageMagick flood-fill, which works well for roughly solid backgrounds.
- If the user explicitly wants the original background kept, pass `--cutout none`.

## After generating

Tell the user the output path and how to run it:

- Electron: `cd <out> && ./run.sh` (first run runs `npm install` and downloads Electron once; ~100MB).
- PyQt6: `cd <out> && ./run.sh` (auto-installs PyQt6 if missing).

If the user is at the machine, offer to launch it (`--launch` or run the command for them). The pet appears at the bottom-center of the screen and starts idle.

## Extending

To add behaviors or tune animation (breathing rate, walk speed, gravity, new states), see `references/behaviors.md` and `references/animations.md`.

## Examples

- "用这张图做一个桌面宠物" → `node scripts/generate.mjs cat.png --name kitty`
- "做个会走来走去的桌面宠物" → same command; the pet walks by default.
- "用最高质量做" → generate idle/walk frames, then `node scripts/generate.mjs cat.png --name kitty --frames ./kitty-frames`
