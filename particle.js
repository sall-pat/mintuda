import { ZONE } from './geometry.js';

export const PALETTE = {
  [ZONE.LIGHT]: { h: [26, 48],   s: [88, 100], l: [55, 72] },
  [ZONE.DARK]:  { h: [14, 30],   s: [58, 82],  l: [18, 32] },
  [ZONE.FIRE]:  { h: [0,  52],   s: [88, 100], l: [48, 66] },
  [ZONE.GRAY]:  { h: [215, 285], s: [3, 16],   l: [55, 80] },
};

function rand(a, b) { return a + Math.random() * (b - a); }

export function makeParticle(x, y, zone) {
  const z = Math.random();
  const baseSize = zone === ZONE.GRAY ? rand(0.6, 1.4) :
                   zone === ZONE.FIRE ? rand(0.9, 1.8) :
                   rand(0.7, 1.4);
  return {
    hx: x, hy: y,
    x, y,
    dx: 0, dy: 0, vx: 0, vy: 0,  // screen-space spring displacement
    zone,
    z,                             // depth 0..1
    size: baseSize,
    hueOff:   Math.random() * Math.PI * 2,
    hueSpd:   rand(0.0006, 0.0022),
    pulse:    Math.random() * Math.PI * 2,
    pulseSpd: rand(0.0014, 0.004),
    dseed:    Math.random() * 1000,
    wspeed:   rand(0.3, 0.9),
  };
}

export function colorFor(p, t) {
  const pal = PALETTE[p.zone];
  const mul = p.zone === ZONE.FIRE ? 3 : 1;
  const ht = 0.5 + 0.5 * Math.sin(p.hueOff + t * p.hueSpd * mul);
  const st = 0.5 + 0.5 * Math.sin(p.hueOff * 1.3 + t * p.hueSpd * 0.8);
  const lt = 0.5 + 0.5 * Math.sin(p.hueOff * 0.7 + t * p.hueSpd * 1.2);
  return {
    h: pal.h[0] + (pal.h[1] - pal.h[0]) * ht,
    s: pal.s[0] + (pal.s[1] - pal.s[0]) * st,
    l: pal.l[0] + (pal.l[1] - pal.l[0]) * lt,
  };
}
