// Choose which pet runtime (engine) to use.
import { shOk } from './util.mjs';

/** True if PyQt6 is importable in the current python3. */
export function pyqtAvailable() {
  return shOk('python3 -c "import PyQt6" >/dev/null 2>&1');
}

/**
 * Resolve the runtime to use.
 * - explicit `electron` / `pyqt` → that one.
 * - `auto` → PyQt6 if already importable (no download), else Electron.
 */
export function pickRuntime(pref) {
  if (pref && pref !== 'auto') {
    if (pref !== 'electron' && pref !== 'pyqt') {
      throw new Error(`Unknown runtime: ${pref} (expected auto|electron|pyqt)`);
    }
    return pref;
  }
  return pyqtAvailable() ? 'pyqt' : 'electron';
}
