import { halfWidthAt, toScreen, UPPER_TOP, LOWER_BOT, WAIST_Y, silPath } from './geometry.js';

export function drawWaves(ctx, t, waveMode) {
  if (waveMode <= 0.03 || !silPath) return;
  const ts = t * 0.001;
  const alpha = waveMode;

  ctx.save();
  ctx.clip(silPath);

  const RIBBONS = 12;
  for (let i = 0; i < RIBBONS; i++) {
    const phase = i / RIBBONS;
    const v = (i / RIBBONS) * 2 - 1;  // -1..1
    const slide = ((ts * 0.05) + phase) % 1;
    const dir = v >= 0 ? 1 : -1;
    const apex = dir > 0 ? UPPER_TOP : LOWER_BOT;
    const yCenter = WAIST_Y + (apex - WAIST_Y) * slide;

    const thicknessProfile = Math.sin(slide * Math.PI);
    const halfThick = 0.025 + 0.04 * thicknessProfile;

    const hue = 220 + 50 * Math.sin(phase * 6 + ts * 0.4);
    const sat = 6 + 10 * Math.sin(phase * 4 + ts * 0.5);
    const lig = 60 + 20 * Math.sin(phase * 5 + ts * 0.6);
    const aFade = alpha * thicknessProfile * 0.55;
    if (aFade < 0.02) continue;

    drawRibbon(ctx, yCenter, halfThick, hue, sat, lig, aFade, ts, phase);
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function drawRibbon(ctx, yCenter, halfThick, hue, sat, lig, alpha, ts, phase) {
  const SEG = 80;
  const yTop = yCenter + halfThick;
  const yBot = yCenter - halfThick;

  ctx.globalCompositeOperation = 'lighter';

  ctx.beginPath();
  for (let i = 0; i <= SEG; i++) {
    const u = i / SEG;
    const x = -1 + 2 * u;
    const hwTop = halfWidthAt(yTop);
    const xx = x * Math.max(0.01, hwTop);
    const wob = Math.sin(u * Math.PI * 2 + ts * 0.7 + phase * 6) * 0.012;
    const [sx, sy] = toScreen(xx, yTop + wob);
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  for (let i = SEG; i >= 0; i--) {
    const u = i / SEG;
    const x = -1 + 2 * u;
    const hwBot = halfWidthAt(yBot);
    const xx = x * Math.max(0.01, hwBot);
    const wob = Math.sin(u * Math.PI * 2 + ts * 0.7 + phase * 6 + 0.6) * 0.012;
    const [sx, sy] = toScreen(xx, yBot + wob);
    ctx.lineTo(sx, sy);
  }
  ctx.closePath();

  const [, syTop] = toScreen(0, yTop);
  const [, syBot] = toScreen(0, yBot);
  const grad = ctx.createLinearGradient(0, syTop, 0, syBot);
  grad.addColorStop(0,   `hsla(${hue},${sat}%,${lig}%,0)`);
  grad.addColorStop(0.5, `hsla(${hue},${sat}%,${lig}%,${alpha})`);
  grad.addColorStop(1,   `hsla(${hue},${sat}%,${lig}%,0)`);
  ctx.fillStyle = grad;
  ctx.fill();

  // Hairline center spine for a gentle ripple feel
  ctx.beginPath();
  for (let i = 0; i <= SEG; i++) {
    const u = i / SEG;
    const x = -1 + 2 * u;
    const hwC = halfWidthAt(yCenter);
    const xx = x * Math.max(0.01, hwC);
    const [sx, sy] = toScreen(xx, yCenter);
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  ctx.strokeStyle = `hsla(${hue},${Math.min(30, sat + 8)}%,${Math.min(92, lig + 15)}%,${alpha * 0.9})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}
