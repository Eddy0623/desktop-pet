#!/usr/bin/env node
// desktop-pet generator: image → runnable animated desktop pet.
//
//   node scripts/generate.mjs <image> [--name n] [--out dir]
//                                     [--runtime auto|electron|pyqt]
//                                     [--cutout auto|none]
//                                     [--frames none|<dir>] [--launch]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import { copyDir, fillTemplateFiles, sh } from '../lib/util.mjs';
import { cutout } from '../lib/cutout.mjs';
import { buildSpritesheet } from '../lib/sprites.mjs';
import { pickRuntime } from '../lib/runtime.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const HELP = `desktop-pet — turn an image into an animated desktop pet.

Usage:
  node scripts/generate.mjs <image> [options]

Options:
  --name <name>        project / display name              (default: my-pet)
  --out <dir>          output directory                    (default: ./<name>)
  --runtime <r>        auto | electron | pyqt              (default: auto)
  --cutout <c>         auto | none                         (default: auto)
  --frames <f>         none | <dir of idle_*.png/walk_*.png>  (default: none)
  --launch             start the pet after generating
  -h, --help           show this help

Examples:
  node scripts/generate.mjs cat.png --name kitty
  node scripts/generate.mjs cat.png --name kitty --frames ./kitty-frames
  node scripts/generate.mjs cat.png --runtime pyqt --cutout none
`;

function parseArgs(argv) {
  const a = {
    name: 'my-pet',
    out: null,
    runtime: 'auto',
    cutout: 'auto',
    frames: 'none',
    launch: false,
    help: false,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '-h':
      case '--help':
        a.help = true;
        break;
      case '--launch':
        a.launch = true;
        break;
      case '--name':
        a.name = argv[++i];
        break;
      case '--out':
        a.out = argv[++i];
        break;
      case '--runtime':
        a.runtime = argv[++i];
        break;
      case '--cutout':
        a.cutout = argv[++i];
        break;
      case '--frames':
        a.frames = argv[++i];
        break;
      default:
        if (arg.startsWith('--')) {
          /* unknown flag — ignore */
        } else {
          positional.push(arg);
        }
    }
  }
  a.image = positional[0];
  return a;
}

function writeRunScripts(out, runtime) {
  const shName = 'run.sh';
  const batName = 'run.bat';
  let shScript;
  let batScript;
  if (runtime === 'electron') {
    shScript = `#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
# Transparent always-on-top works best with the native windowing backend (Wayland/X11).
if [ ! -d node_modules ]; then
  echo "Installing dependencies (Electron, one-time)…"
  npm install --silent
fi
exec npx electron . --ozone-platform-hint=auto
`;
    batScript = `@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies (Electron, one-time)...
  call npm install --silent
)
npx electron . --ozone-platform-hint=auto
`;
  } else {
    shScript = `#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
PYTHON=python3
if ! python3 -c "import PyQt6" 2>/dev/null; then
  # Try, in order: venv -> pip --user (with PEP 668 fallback) -> apt hint.
  if python3 -m venv .venv 2>/dev/null && [ -x .venv/bin/pip ]; then
    echo "Installing PyQt6 into .venv (one-time)…"
    .venv/bin/pip install -q PyQt6
    PYTHON=.venv/bin/python
  elif python3 -m pip --version >/dev/null 2>&1; then
    echo "Installing PyQt6 (--user, one-time)…"
    python3 -m pip install --user PyQt6 || python3 -m pip install --user --break-system-packages PyQt6
  else
    echo "PyQt6 is not installed and pip/venv are unavailable on this system." >&2
    echo "On Debian/Ubuntu, install it once with:  sudo apt install python3-pyqt6" >&2
    echo "   (or: sudo apt install python3-pip python3-venv, then re-run this script)" >&2
    exit 1
  fi
fi
exec "$PYTHON" main.py
`;
    batScript = `@echo off
cd /d "%~dp0"
python -c "import PyQt6" 2>nul || pip install --user -r requirements.txt
python main.py
`;
  }
  fs.writeFileSync(path.join(out, shName), shScript, { mode: 0o755 });
  fs.writeFileSync(path.join(out, batName), batScript);
}

function launch(out, runtime) {
  console.log(`\nLaunching pet (${runtime}) from ${out} …`);
  const cmd = runtime === 'electron' ? './run.sh' : './run.sh';
  // Detach so the pet outlives the generator.
  const child = spawn(cmd, [], { cwd: out, stdio: 'ignore', detached: true });
  child.unref();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(HELP);
    return;
  }
  if (!args.image) {
    console.error('Error: an image path is required.\n');
    console.log(HELP);
    process.exit(1);
  }

  const image = path.resolve(args.image);
  if (!fs.existsSync(image)) {
    console.error(`Error: image not found: ${image}`);
    process.exit(1);
  }

  const out = path.resolve(args.out || path.join(process.cwd(), args.name));
  const assetsDir = path.join(out, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  // 1. Runtime.
  const runtime = pickRuntime(args.runtime);

  // 2. Cutout (writes/keeps assets/pet.png).
  const petPng = path.join(assetsDir, 'pet.png');
  let cutMethod = 'none';
  if (args.cutout === 'auto') {
    process.stdout.write('Cutting out the subject… ');
    cutMethod = cutout(image, petPng);
    console.log(cutMethod === 'rembg' ? 'done (rembg).' : cutMethod === 'imagemagick' ? 'done (ImageMagick).' : 'kept original.');
  } else {
    fs.copyFileSync(image, petPng);
    console.log('Cutout skipped (--cutout none); using original image.');
  }

  // 3. Frames → sprite sheet (overwrites pet.png with the sheet + writes pet.json).
  let usedSprites = false;
  if (args.frames && args.frames !== 'none') {
    process.stdout.write('Building sprite sheet… ');
    buildSpritesheet(path.resolve(args.frames), petPng, path.join(assetsDir, 'pet.json'));
    usedSprites = true;
    console.log('done.');
  }

  // 4. Copy the engine template into the output dir and fill in the name.
  const tplDir = path.join(ROOT, 'templates', runtime);
  copyDir(tplDir, out);
  if (runtime === 'electron') {
    const tpl = path.join(out, 'package.json.tpl');
    if (fs.existsSync(tpl)) fs.renameSync(tpl, path.join(out, 'package.json'));
  }
  fillTemplateFiles(out, { NAME: args.name }, [
    'package.json',
    'main.js',
    'preload.js',
    'index.html',
    'pet.js',
    'pet.css',
    'main.py',
    'requirements.txt',
  ]);

  // 5. Run scripts.
  writeRunScripts(out, runtime);

  // 6. Report.
  console.log('\n✓ Pet generated:');
  console.log(`  output:   ${out}`);
  console.log(`  runtime:  ${runtime}`);
  console.log(`  cutout:   ${cutMethod}`);
  console.log(`  animation: ${usedSprites ? 'sprite frames' : 'single-image (procedural)'}`);
  console.log(`\nRun it:`);
  console.log(`  cd "${out}" && ./run.sh${process.platform === 'win32' ? '' : ''}`);
  if (runtime === 'electron') {
    console.log('  (first run downloads Electron once via npm install)');
  }

  if (args.launch) launch(out, runtime);
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
