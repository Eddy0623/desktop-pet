// pet.js — desktop pet renderer + state machine.
// Mode A (default): one image, animated procedurally.
// Mode B (if assets/pet.json exists): sprite sheet, frames cycle + procedural motion layered on top.
(function () {
  'use strict';

  const PET = document.getElementById('pet');
  const WRAP = document.getElementById('pet-wrap');
  const SHADOW = document.getElementById('shadow');
  const BUBBLE = document.getElementById('bubble');

  const WIN_W = 240; // must match main.js BrowserWindow size
  const WIN_H = 260;
  const MOVE_THRESHOLD = 4; // px — click vs drag
  const GRAVITY = 2000; // px/s^2
  const BOUNCE_Y = -0.4; // vertical damping on floor bounce
  const BOUNCE_X = 0.6; // horizontal damping on bounce
  const SETTLE_VY = 200; // below this speed → stop bouncing
  const THROW_CLAMP = 800; // max throw velocity px/s

  const BUBBLES = [
    '嗨~', '想睡觉了…', '摸摸我！', '今天也要加油', '(¦3[▓▓]', '咕咕咕', '在看什么？',
    '抱抱', '好困哦', '喵~', '汪！', '嘿嘿',
  ];

  // ---- state ----
  let mode = 'transform'; // 'transform' | 'sprite'
  let sprite = null;
  let frame = 0;
  let frameAcc = 0;

  let workArea = { x: 0, y: 0, width: window.screen.availWidth || 1280, height: (window.screen.availHeight || 720) };
  let floorY = workArea.y + workArea.height;

  let state = 'idle';
  let pos = { x: 0, y: 0 };
  let vel = { x: 0, y: 0 };
  let dir = 1; // 1 right, -1 left
  let dragging = false;
  let pressPos = { x: 0, y: 0 };
  let lastPointer = { x: 0, y: 0, t: 0 };
  let nextDecision = 0;
  let reactUntil = 0;
  let bubbleUntil = 0;

  // ---- init ----
  async function init() {
    try {
      const r = await fetch('assets/pet.json');
      if (r.ok) {
        sprite = await r.json();
        mode = 'sprite';
        PET.style.width = sprite.frameW + 'px';
        PET.style.height = sprite.frameH + 'px';
        PET.style.backgroundSize =
          sprite.frameW * sprite.cols + 'px ' + sprite.frameH * sprite.rows + 'px';
        PET.style.backgroundPosition = '0px 0px';
      }
    } catch {
      /* transform mode */
    }

    workArea = await window.pet.getWorkArea();
    floorY = workArea.y + workArea.height;
    pos.x = Math.round(workArea.x + workArea.width / 2 - WIN_W / 2);
    pos.y = floorY - WIN_H;
    await window.pet.setPosition(pos.x, pos.y);

    nextDecision = performance.now() + 2000 + Math.random() * 3000;
    requestAnimationFrame(loop);
  }

  // ---- interaction ----
  WRAP.addEventListener('pointerdown', (e) => {
    if (e.button === 2) return; // right-click handled separately
    WRAP.setPointerCapture(e.pointerId);
    state = 'drag';
    dragging = false;
    pressPos = { x: e.clientX, y: e.clientY };
    lastPointer = { x: e.clientX, y: e.clientY, t: performance.now() };
    vel = { x: 0, y: 0 };
  });

  WRAP.addEventListener('pointermove', (e) => {
    if (state !== 'drag') return;
    const now = performance.now();
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    const dt = Math.max(1, now - lastPointer.t) / 1000;

    if (
      !dragging &&
      Math.abs(e.clientX - pressPos.x) + Math.abs(e.clientY - pressPos.y) > MOVE_THRESHOLD
    ) {
      dragging = true;
    }
    if (!dragging) return;

    pos.x += dx;
    pos.y += dy;
    vel.x = clamp(dx / dt, -THROW_CLAMP, THROW_CLAMP);
    vel.y = clamp(dy / dt, -THROW_CLAMP, THROW_CLAMP);
    lastPointer = { x: e.clientX, y: e.clientY, t: now };
    window.pet.setPosition(pos.x, pos.y);
  });

  function endDrag() {
    if (state !== 'drag') return;
    if (!dragging) {
      react(); // a click
      toIdle();
      return;
    }
    if (pos.y < floorY - WIN_H - 4) {
      state = 'fall'; // toss it → gravity
    } else {
      toIdle();
    }
  }
  WRAP.addEventListener('pointerup', endDrag);
  WRAP.addEventListener('pointercancel', endDrag);

  WRAP.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showBubble('拜拜~');
    setTimeout(() => window.pet.quit(), 450);
  });

  // ---- helpers ----
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function toIdle() {
    state = 'idle';
    pos.y = floorY - WIN_H;
    vel = { x: 0, y: 0 };
  }
  function react() {
    reactUntil = performance.now() + 500;
    showBubble(BUBBLES[Math.floor(Math.random() * BUBBLES.length)]);
  }
  function showBubble(text) {
    BUBBLE.textContent = text;
    BUBBLE.classList.add('show');
    bubbleUntil = performance.now() + 1800;
  }

  function decide(now) {
    if (now < nextDecision) return;
    nextDecision = now + 2000 + Math.random() * 4000;
    if (state === 'idle') {
      if (Math.random() < 0.6) {
        state = 'walk';
        dir = Math.random() < 0.5 ? -1 : 1;
        vel.x = dir * (40 + Math.random() * 40);
      }
    } else if (state === 'walk') {
      if (Math.random() < 0.5) {
        toIdle();
      } else {
        dir = -dir;
        vel.x = dir * (40 + Math.random() * 40);
      }
    }
  }

  // ---- main loop ----
  let lastT = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    decide(now);
    update(dt, now);
    render(now);

    requestAnimationFrame(loop);
  }

  function update(dt, now) {
    if (state === 'walk') {
      pos.x += vel.x * dt;
      const minX = workArea.x;
      const maxX = workArea.x + workArea.width - WIN_W;
      if (pos.x <= minX) {
        pos.x = minX;
        dir = 1;
        vel.x = Math.abs(vel.x);
      } else if (pos.x >= maxX) {
        pos.x = maxX;
        dir = -1;
        vel.x = -Math.abs(vel.x);
      }
      pos.y = floorY - WIN_H;
    } else if (state === 'fall') {
      vel.y += GRAVITY * dt;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      if (pos.y >= floorY - WIN_H) {
        pos.y = floorY - WIN_H;
        if (Math.abs(vel.y) < SETTLE_VY) {
          vel = { x: 0, y: 0 };
          toIdle();
        } else {
          vel.y = vel.y * BOUNCE_Y;
          vel.x = vel.x * BOUNCE_X;
          reactUntil = now + 200; // squash on bounce
        }
      }
    } else if (state === 'idle') {
      pos.y = floorY - WIN_H;
      vel.x = 0;
    }
    window.pet.setPosition(pos.x, pos.y);
  }

  function render(now) {
    const t = now / 1000;

    if (mode === 'sprite') {
      // advance frames for the current state
      const def = sprite.states[state] || sprite.states.idle;
      const frames = def ? def.frames : [0];
      advanceFrame(frames);
      const col = frames[frame % frames.length];
      const row = def && typeof def.row === 'number' ? def.row : state === 'walk' ? 1 : 0;
      PET.style.backgroundPosition = `-${col * sprite.frameW}px -${row * sprite.frameH}px`;
      PET.style.transform = `scaleX(${dir < 0 ? -1 : 1})`;
    } else {
      // procedural single-image animation
      const breathe = Math.sin(t * 1.8) * 0.03;
      let sx = 1 - breathe * 0.5;
      let sy = 1 + breathe;
      let ty = 0;
      let rot = 0;

      if (state === 'walk') {
        ty = -Math.abs(Math.sin(t * 9)) * 7;
        rot = Math.sin(t * 9) * 3 * dir;
      } else if (state === 'idle') {
        ty = Math.sin(t * 1.8) * -3;
        rot = Math.sin(t * 0.7) * 1.5;
      } else if (state === 'drag') {
        rot = clamp(vel.x * 0.8, -12, 12);
      }

      // react / landing squash
      if (now < reactUntil) {
        const k = (reactUntil - now) / 500;
        sy *= 1 - 0.18 * k;
        sx *= 1 + 0.18 * k;
      }

      if (dir < 0) sx = -Math.abs(sx);
      PET.style.transform = `scaleX(${sx}) scaleY(${sy}) translateY(${ty}px) rotate(${rot}deg)`;
    }

    // shadow tracks height above the floor
    const off = Math.max(0, floorY - WIN_H - pos.y);
    const s = clamp(1 - off / 500, 0.4, 1);
    SHADOW.style.transform = `translateX(-50%) scale(${s})`;
    SHADOW.style.opacity = String(0.3 * s);

    // bubble lifecycle
    if (bubbleUntil && now > bubbleUntil) {
      BUBBLE.classList.remove('show');
      bubbleUntil = 0;
    }
  }

  // frame advance driven by wall-clock dt (kept separate so the rate is fps, not framerate)
  let frameClock = 0;
  function advanceFrame(frames) {
    const fps = (sprite && sprite.fps) || 8;
    // `loop` runs ~60fps; advance the sheet at its own fps
    frameClock += 1; // called once per render frame
    const every = Math.max(1, Math.round(60 / fps));
    if (frameClock >= every) {
      frameClock = 0;
      frame = (frame + 1) % frames.length;
    }
  }

  init();
})();
