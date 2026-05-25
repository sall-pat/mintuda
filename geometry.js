// Model space: y in [-0.95, 0.95], x in [-0.40, 0.40]
// Two equal elongated ellipses (lobes) meeting at the waist (y=0)
export const UPPER_TOP    =  0.95;
export const LOWER_BOT    = -0.95;
export const WAIST_Y      =  0.00;
export const UPPER_R_PEAK =  0.40;
export const LOWER_R_PEAK =  0.40;
export const UPPER_CY     =  UPPER_TOP / 2;
export const UPPER_BY     =  UPPER_TOP / 2;
export const LOWER_CY     =  LOWER_BOT / 2;
export const LOWER_BY     = -LOWER_BOT / 2;

export const G = { cx: 0, cy: 0, scale: 1 };

export const ZONE = { LIGHT: 0, DARK: 1, FIRE: 2, GRAY: 3 };

export function recalculate(W, H) {
  const totalH = UPPER_TOP - LOWER_BOT;
  const totalW = 2 * Math.max(UPPER_R_PEAK, LOWER_R_PEAK);
  G.scale = Math.min(H * 0.92 / totalH, W * 0.85 / totalW);
  // modelCenterY = (UPPER_TOP + LOWER_BOT) / 2 = 0, so cy = H/2
  G.cx = W * 0.5;
  G.cy = H * 0.5;
}

export function toScreen(x, y) {
  return [G.cx + x * G.scale, G.cy - y * G.scale];
}

export function halfWidthAt(y) {
  if (y > 0 && y < UPPER_TOP) {
    const dy = (y - UPPER_CY) / UPPER_BY;
    if (Math.abs(dy) >= 1) return 0;
    return UPPER_R_PEAK * Math.sqrt(1 - dy * dy);
  }
  if (y < 0 && y > LOWER_BOT) {
    const dy = (y - LOWER_CY) / LOWER_BY;
    if (Math.abs(dy) >= 1) return 0;
    return LOWER_R_PEAK * Math.sqrt(1 - dy * dy);
  }
  return 0;
}

export function inSilhouette(x, y) {
  return Math.abs(x) <= halfWidthAt(y);
}

export function inFireBowtie(x, y) {
  const dy = Math.abs(y - WAIST_Y);
  if (dy > 0.13) return false;
  const u = dy / 0.13;
  const halfX = 0.04 + (0.20 - 0.04) * u;
  return Math.abs(x) <= halfX;
}

function upperLocal(x, y) {
  const lx = x / UPPER_R_PEAK;
  const ly = (y - UPPER_CY) / UPPER_BY;
  const f = Math.sqrt(lx * lx + ly * ly);
  const ang = Math.atan2(ly, lx);
  return { f, ang };
}

export function classify(x, y) {
  if (inFireBowtie(x, y)) return ZONE.FIRE;
  if (y > 0) {
    const { f, ang } = upperLocal(x, y);
    // LIGHT: upper-right outer crescent
    if (ang > 0.30 && ang < 1.30 && f > 0.72) {
      const ax = (ang - 0.30) / (1.30 - 0.30);
      const taper = Math.sin(ax * Math.PI);
      const inner = 0.92 - 0.20 * taper;
      if (f > inner) return ZONE.LIGHT;
    }
    // DARK: right-side wedge below LIGHT, sweeping toward waist
    if (ang > -0.55 && ang < 0.40 && f > 0.40) {
      const ax = (ang + 0.55) / (0.40 + 0.55);
      const inner = 0.92 - (0.50 * (0.35 + 0.65 * ax));
      if (f > inner && f < 0.92) return ZONE.DARK;
    }
  }
  return ZONE.GRAY;
}

// Eye anchor in model space: at the LIGHT/DARK boundary, upper-right
export function eyeAnchorModel() {
  const ang = 0.32, f = 0.78;
  const lx = f * Math.cos(ang);
  const ly = f * Math.sin(ang);
  return [lx * UPPER_R_PEAK, UPPER_CY + ly * UPPER_BY];
}

// Build the silhouette Path2D in screen coordinates
export let silPath = null;

export function buildSilPath() {
  const path = new Path2D();
  const N = 240;
  for (let i = 0; i <= N; i++) {
    const y = UPPER_TOP * (1 - i / N);
    const x = halfWidthAt(y);
    const [sx, sy] = toScreen(x, y);
    if (i === 0) path.moveTo(sx, sy); else path.lineTo(sx, sy);
  }
  for (let i = 0; i <= N; i++) {
    const y = LOWER_BOT * (i / N);
    const x = halfWidthAt(y);
    const [sx, sy] = toScreen(x, y);
    path.lineTo(sx, sy);
  }
  for (let i = N; i >= 0; i--) {
    const y = LOWER_BOT * (i / N);
    const x = -halfWidthAt(y);
    const [sx, sy] = toScreen(x, y);
    path.lineTo(sx, sy);
  }
  for (let i = N; i >= 0; i--) {
    const y = UPPER_TOP * (1 - i / N);
    const x = -halfWidthAt(y);
    const [sx, sy] = toScreen(x, y);
    path.lineTo(sx, sy);
  }
  path.closePath();
  silPath = path;
}
