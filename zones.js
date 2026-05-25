import {
  ZONE, UPPER_TOP, LOWER_BOT,
  halfWidthAt, inSilhouette, inFireBowtie, classify,
} from './geometry.js';
import { makeParticle } from './particle.js';

function rand(a, b) { return a + Math.random() * (b - a); }

function pickInLobe(yMin, yMax) {
  for (let i = 0; i < 80; i++) {
    const y = rand(yMin, yMax);
    const hw = halfWidthAt(y);
    if (hw <= 0) continue;
    const x = rand(-hw, hw);
    return [x, y];
  }
  return [0, (yMin + yMax) / 2];
}

export function seedParticles(W, H) {
  const particles = [];
  const total = Math.min(6500, Math.max(3500, Math.floor(W * H / 220)));
  const upperN = Math.floor(total * 0.40);
  const lowerN = total - upperN;

  // Seed upper lobe
  let placed = 0, guard = 0;
  while (placed < upperN && guard++ < upperN * 40) {
    const [x, y] = pickInLobe(0.01, UPPER_TOP);
    if (!inSilhouette(x, y)) continue;
    particles.push(makeParticle(x, y, classify(x, y)));
    placed++;
  }

  // Seed lower lobe
  placed = 0; guard = 0;
  while (placed < lowerN && guard++ < lowerN * 40) {
    const [x, y] = pickInLobe(LOWER_BOT, -0.01);
    if (!inSilhouette(x, y)) continue;
    particles.push(makeParticle(x, y, classify(x, y)));
    placed++;
  }

  // Extra density for the small FIRE bowtie zone
  for (let i = 0; i < 350; i++) {
    let x, y, ok = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      x = rand(-0.20, 0.20);
      y = rand(-0.13, 0.13);
      if (inFireBowtie(x, y) && inSilhouette(x, y)) { ok = true; break; }
    }
    if (!ok) continue;
    particles.push(makeParticle(x, y, ZONE.FIRE));
  }

  return particles;
}
