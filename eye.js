import { G, eyeAnchorModel, toScreen } from './geometry.js';
import { TWEAKS } from './tweaks.js';

export const eyeState = { open: 1, target: 1, waveMode: 0 };

export function toggleEye() {
  eyeState.target = eyeState.target > 0.5 ? 0 : 1;
}

export function updateEye(dt) {
  const k = 1 - Math.pow(0.001, dt / 1000);
  eyeState.open += (eyeState.target - eyeState.open) * k * 0.9;
  eyeState.waveMode += ((1 - eyeState.open) - eyeState.waveMode) * k * 0.55;
}

export function drawEye(ctx, t) {
  const [ax, ay] = eyeAnchorModel();
  const [sx, sy] = toScreen(ax, ay);

  const baseR = 18 * TWEAKS.eyeSize * (G.scale / 700);
  const open = Math.max(0, Math.min(1, eyeState.open));
  const w = baseR * 1.55;
  const h = baseR * 0.95 * open;

  ctx.save();
  ctx.translate(sx, sy);

  // Soft warm halo
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 1.7);
  halo.addColorStop(0, 'rgba(255,225,190,0.30)');
  halo.addColorStop(1, 'rgba(255,225,190,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(0, 0, w * 1.7, 0, Math.PI * 2); ctx.fill();

  if (open < 0.05) {
    drawClosed(ctx, w, baseR);
    ctx.restore();
    return;
  }

  // Almond sclera
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.bezierCurveTo(-w * 0.5, -h * 1.05,  w * 0.5, -h * 1.05,  w, 0);
  ctx.bezierCurveTo( w * 0.5,  h * 1.05, -w * 0.5,  h * 1.05, -w, 0);
  ctx.closePath();
  ctx.fillStyle = '#f1e8d8'; ctx.fill();

  ctx.save(); ctx.clip();

  // Iris
  const iris = baseR * 0.78;
  const ix = 0;
  const iy = (1 - open) * baseR * 0.55 - baseR * 0.05;
  const irisGrad = ctx.createRadialGradient(ix - iris * 0.25, iy - iris * 0.25, iris * 0.1, ix, iy, iris);
  irisGrad.addColorStop(0,    '#caa36a');
  irisGrad.addColorStop(0.55, '#7a4a1f');
  irisGrad.addColorStop(1,    '#2c1606');
  ctx.fillStyle = irisGrad;
  ctx.beginPath(); ctx.arc(ix, iy, iris, 0, Math.PI * 2); ctx.fill();

  // Iris spokes
  ctx.strokeStyle = 'rgba(255,200,130,0.35)';
  ctx.lineWidth = Math.max(0.4, baseR * 0.025);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const r1 = iris * 0.30, r2 = iris * (0.85 + 0.12 * Math.sin(i * 1.7));
    ctx.beginPath();
    ctx.moveTo(ix + Math.cos(a) * r1, iy + Math.sin(a) * r1);
    ctx.lineTo(ix + Math.cos(a) * r2, iy + Math.sin(a) * r2);
    ctx.stroke();
  }

  // Pupil
  ctx.fillStyle = '#06030a';
  ctx.beginPath(); ctx.arc(ix, iy, iris * 0.42, 0, Math.PI * 2); ctx.fill();

  // Specular highlights
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.arc(ix - iris * 0.3, iy - iris * 0.32, iris * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(ix + iris * 0.18, iy + iris * 0.22, iris * 0.07, 0, Math.PI * 2); ctx.fill();

  ctx.restore(); // end clip

  // Upper-lid shadow
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.bezierCurveTo(-w * 0.5, -h * 1.05,  w * 0.5, -h * 1.05,  w, 0);
  ctx.bezierCurveTo( w * 0.5,  h * 1.05, -w * 0.5,  h * 1.05, -w, 0);
  ctx.clip();
  const lg = ctx.createLinearGradient(0, -h, 0, h * 0.4);
  lg.addColorStop(0, 'rgba(0,0,0,0.55)');
  lg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lg; ctx.fillRect(-w, -h * 1.1, w * 2, h * 0.8);
  ctx.restore();

  // Lid outline
  ctx.strokeStyle = 'rgba(20,10,4,0.95)';
  ctx.lineWidth = Math.max(0.8, baseR * 0.06);
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.bezierCurveTo(-w * 0.5, -h * 1.05,  w * 0.5, -h * 1.05,  w, 0);
  ctx.bezierCurveTo( w * 0.5,  h * 1.05, -w * 0.5,  h * 1.05, -w, 0);
  ctx.closePath(); ctx.stroke();

  drawLashes(ctx, w, h, true,  open, baseR);
  drawLashes(ctx, w, h, false, open, baseR);

  ctx.restore();
}

function drawLashes(ctx, w, h, upper, open, baseR) {
  ctx.strokeStyle = 'rgba(15,8,3,0.95)';
  ctx.lineCap = 'round';
  const N = 9;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const x = -w + u * 2 * w;
    const ny = upper ? -Math.sin(u * Math.PI) * h * 1.05 : Math.sin(u * Math.PI) * h * 1.05;
    const len = Math.sin(u * Math.PI) * baseR * (upper ? 0.55 : 0.38) * (0.6 + 0.4 * open);
    if (len < 1) continue;
    const ang = upper ? -Math.PI * 0.5 + (u - 0.5) * 0.7 : Math.PI * 0.5 + (u - 0.5) * 0.7;
    const ex = x + Math.cos(ang) * len;
    const ey = ny + Math.sin(ang) * len;
    ctx.lineWidth = upper ? Math.max(0.8, baseR * 0.045) : Math.max(0.6, baseR * 0.032);
    ctx.beginPath();
    ctx.moveTo(x, ny);
    const cx2 = x + Math.cos(ang + (upper ? -0.4 : 0.4)) * len * 0.6;
    const cy2 = ny + Math.sin(ang + (upper ? -0.4 : 0.4)) * len * 0.6;
    ctx.quadraticCurveTo(cx2, cy2, ex, ey);
    ctx.stroke();
  }
}

function drawClosed(ctx, w, baseR) {
  ctx.strokeStyle = 'rgba(20,10,4,0.95)';
  ctx.lineWidth = Math.max(1.2, baseR * 0.09);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.quadraticCurveTo(0, baseR * 0.32, w, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(15,8,3,0.95)';
  const N = 9;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const x = -w + u * 2 * w;
    const ny = Math.sin(u * Math.PI) * baseR * 0.32 * 0.5;
    const len = Math.sin(u * Math.PI) * baseR * 0.55;
    if (len < 1) continue;
    const ang = Math.PI * 0.5 + (u - 0.5) * 0.6;
    const ex = x + Math.cos(ang) * len;
    const ey = ny + Math.sin(ang) * len;
    ctx.lineWidth = Math.max(0.8, baseR * 0.045);
    ctx.beginPath();
    ctx.moveTo(x, ny);
    const cx2 = x + Math.cos(ang + 0.4) * len * 0.6;
    const cy2 = ny + Math.sin(ang + 0.4) * len * 0.6;
    ctx.quadraticCurveTo(cx2, cy2, ex, ey);
    ctx.stroke();
  }
}
