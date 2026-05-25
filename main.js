import { G, ZONE, recalculate, toScreen, buildSilPath } from './geometry.js';
import { seedParticles } from './zones.js';
import { colorFor } from './particle.js';
import { drawWaves } from './waves.js';
import { eyeState, toggleEye, updateEye, drawEye } from './eye.js';
import { TWEAKS } from './tweaks.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let W = 0, H = 0;
let DPR = Math.min(window.devicePixelRatio || 1, 2);
let particles = [];

const mouse = { x: -9999, y: -9999, active: false };

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  canvas.width  = W * DPR; canvas.height = H * DPR;
  canvas.style.width  = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  recalculate(W, H);
  buildSilPath();
  particles = seedParticles(W, H);
}

// ── Mouse / touch ─────────────────────────────────────────────────────────────
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
window.addEventListener('mouseleave', () => { mouse.active = false; });
window.addEventListener('touchmove', e => {
  if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; mouse.active = true; }
}, { passive: true });

canvas.addEventListener('click', toggleEye);
canvas.addEventListener('touchstart', e => { e.preventDefault(); toggleEye(); }, { passive: false });

// ── Particle update + draw ────────────────────────────────────────────────────
function drawParticles(t, dt) {
  const ts = t * 0.001;
  const mx = mouse.x, my = mouse.y;
  const waveMode = eyeState.waveMode;

  // Back-to-front depth sort (stable for a single frame)
  particles.sort((a, b) => a.z - b.z);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // Small wander in model space
    const wA = p.zone === ZONE.FIRE ? 0.012 : 0.004;
    const wB = p.zone === ZONE.FIRE ? 0.010 : 0.004;
    const wx = Math.sin(p.dseed + ts * p.wspeed) * wA;
    const wy = Math.cos(p.dseed * 0.7 + ts * p.wspeed * 0.8) * wB;

    // Zone drift bias (in model units/frame — tiny)
    let bx = 0, by = 0;
    if (p.zone === ZONE.LIGHT) { by = 0.0010; bx = 0.0006; }
    else if (p.zone === ZONE.DARK)  { by = -0.0008; }
    else if (p.zone === ZONE.FIRE)  { by = 0.004 + Math.sin(ts * 4 + p.dseed) * 0.002; }

    const homeX = p.hx + wx + bx;
    const homeY = p.hy + wy + by;

    const [hx_s, hy_s] = toScreen(homeX, homeY);

    // Depth parallax: deeper particles drift slightly
    const parX = (p.z - 0.5) * 4;
    const parY = (p.z - 0.5) * 2;
    const sxHome = hx_s + parX;
    const syHome = hy_s + parY;

    // Cursor repulsion (screen space)
    if (mouse.active) {
      const px = sxHome + p.dx, py = syHome + p.dy;
      const ddx = px - mx, ddy = py - my;
      const d2 = ddx * ddx + ddy * ddy;
      const radius = p.zone === ZONE.FIRE ? 160 : 130;
      if (d2 < radius * radius) {
        const d = Math.sqrt(d2) || 0.0001;
        const force = 1 - d / radius;
        const mult = (p.zone === ZONE.FIRE ? 4.2 : 3.0) * force * force * (0.6 + p.z * 0.8);
        p.vx += (ddx / d) * mult;
        p.vy += (ddy / d) * mult;
      }
    }

    // Spring back to home with damping
    const stiff = p.zone === ZONE.FIRE ? 0.05 : 0.04;
    const damp  = p.zone === ZONE.FIRE ? 0.86 : 0.90;
    p.vx += -p.dx * stiff;
    p.vy += -p.dy * stiff;
    p.vx *= damp; p.vy *= damp;
    p.dx += p.vx; p.dy += p.vy;

    const sx = sxHome + p.dx;
    const sy = syHome + p.dy;

    // Alpha: pulse × depth factor, gray fades with waveMode
    let alpha = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(p.pulse + t * p.pulseSpd));
    alpha *= 0.5 + 0.5 * p.z;
    if (p.zone === ZONE.GRAY) alpha *= (1 - waveMode * 0.92);
    if (alpha < 0.02) continue;

    const c = colorFor(p, t);
    const r = Math.max(0.6, p.size * (0.55 + 0.9 * p.z) * (G.scale / 380));

    // Soft glow halo (lighter blend for warm zones; gray only at depth)
    if (p.zone !== ZONE.GRAY || p.z > 0.6) {
      ctx.globalCompositeOperation = 'lighter';
      const glowR = r * (p.zone === ZONE.FIRE ? 4.5 : p.zone === ZONE.LIGHT ? 3.6 : 2.6);
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
      grad.addColorStop(0,   `hsla(${c.h},${c.s}%,${c.l}%,${alpha * 0.40})`);
      grad.addColorStop(0.4, `hsla(${c.h},${c.s}%,${c.l}%,${alpha * 0.14})`);
      grad.addColorStop(1,   `hsla(${c.h},${c.s}%,${c.l}%,0)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(sx, sy, glowR, 0, Math.PI * 2); ctx.fill();
    }

    // Crisp dot core
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `hsla(${c.h},${Math.min(100, c.s + 5)}%,${Math.min(95, c.l + 12)}%,${alpha})`;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
}

// ── Main loop ─────────────────────────────────────────────────────────────────
let lastT = performance.now();

function frame(now) {
  const dt = Math.min(50, now - lastT); lastT = now;

  updateEye(dt);

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  drawParticles(now, dt);
  drawWaves(ctx, now, eyeState.waveMode);
  drawEye(ctx, now);

  requestAnimationFrame(frame);
}

// ── Tweaks panel ──────────────────────────────────────────────────────────────
(function wireTweaks() {
  const panel    = document.getElementById('tweaks');
  const closeBtn = document.getElementById('tw-close');
  const eyeInput = document.getElementById('tw-eye');
  const eyeVal   = document.getElementById('tw-eye-val');

  function syncUI() {
    eyeInput.value    = TWEAKS.eyeSize;
    eyeVal.textContent = (+TWEAKS.eyeSize).toFixed(2);
  }
  syncUI();

  function show() { panel.hidden = false; }
  function hide() {
    panel.hidden = true;
    try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {}
  }

  window.addEventListener('message', ev => {
    const d = ev && ev.data;
    if (!d || !d.type) return;
    if (d.type === '__activate_edit_mode')   show();
    else if (d.type === '__deactivate_edit_mode') hide();
  });
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

  closeBtn.addEventListener('click', hide);

  eyeInput.addEventListener('input', () => {
    const v = parseFloat(eyeInput.value);
    TWEAKS.eyeSize = v;
    eyeVal.textContent = v.toFixed(2);
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { eyeSize: v } }, '*'); } catch (e) {}
  });
})();

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);
