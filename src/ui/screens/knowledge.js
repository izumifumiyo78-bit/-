// ---------------------------------------------------------------------------
// knowledge.js : attribute masking. Players outside your club show ranges
// until they have been scouted (or seen often enough).
// ---------------------------------------------------------------------------
import { starsHalf } from '../comp.js';
import { abilityStars } from './squad.js';

export function knowledge(G, p) {
  if (!G.settings.mask) return 100;
  if (p.club === G.userClub) return 100;
  const k = G.scout.know[p.id];
  if (k !== undefined) return k;
  const uc = G.clubs[G.userClub];
  if (!uc) return 100;
  if (p.club && G.clubs[p.club] && G.clubs[p.club].league === uc.league) return 40;
  if (p.club && G.clubs[p.club] && G.clubs[p.club].nation === uc.nation) return 25;
  return p.nat === uc.nation ? 15 : 8;
}

/** Deterministic per-player noise so ranges do not flicker. */
function jitter(p, i) {
  let h = (p.id * 2654435761 + i * 97) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 1274126177) >>> 0;
  return ((h & 1023) / 1023) - 0.5;
}

export function knowAttr(G, p, idx) {
  const k = knowledge(G, p);
  const v = Math.round(p.a[idx]);
  if (k >= 80) return v;
  if (k < 12) return '?';
  const w = k >= 55 ? 1 : k >= 35 ? 2 : 3;
  const mid = Math.round(v + jitter(p, idx) * w);
  const lo = Math.max(1, mid - w), hi = Math.min(20, mid + w);
  return `${lo}-${hi}`;
}

export function knowStars(G, p, which = 'ca') {
  const k = knowledge(G, p);
  const v = which === 'pa' ? p.pa : p.ca;
  if (k < 12) return '<span class="mute">?</span>';
  const est = v + (k >= 80 ? 0 : jitter(p, which === 'pa' ? 99 : 98) * (100 - k) * 0.35) + (which === 'pa' && k < 80 ? 6 : 0);
  return starsHalf(abilityStars(G, est));
}
