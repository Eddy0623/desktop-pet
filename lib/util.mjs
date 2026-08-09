// Shared helpers for the desktop-pet generator. No third-party deps.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Run a shell string, inheriting stdio by default. Returns spawnSync result. */
export function sh(cmd, opts = {}) {
  const r = spawnSync('sh', ['-c', cmd], {
    encoding: 'utf8',
    stdio: opts.silent ? 'ignore' : 'inherit',
    ...opts,
  });
  if (r.error) throw r.error;
  return r;
}

/** True if the shell command exits 0. */
export function shOk(cmd) {
  const r = spawnSync('sh', ['-c', cmd], { encoding: 'utf8', stdio: 'ignore' });
  return r.status === 0;
}

/** Capture trimmed stdout of a shell command. */
export function shOut(cmd) {
  const r = spawnSync('sh', ['-c', cmd], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return (r.stdout || '').trim();
}

/** True if a binary is on PATH. */
export function have(cmd) {
  return shOk(`command -v ${JSON.stringify(cmd)} >/dev/null 2>&1`);
}

/** Recursively copy a directory, skipping Python bytecode caches. */
export function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '__pycache__' || entry.name.endsWith('.pyc')) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

/** Replace __TOKEN__ markers in a string. */
export function fillTemplate(str, vars) {
  return str.replace(/__([A-Z0-9_]+)__/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `__${key}__`
  );
}

/** Apply __TOKEN__ replacement to every file (by name) in a directory. */
export function fillTemplateFiles(dir, vars, filenames) {
  for (const name of filenames) {
    const p = path.join(dir, name);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      fs.writeFileSync(p, fillTemplate(fs.readFileSync(p, 'utf8'), vars));
    }
  }
}
