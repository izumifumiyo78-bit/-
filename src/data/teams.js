// ---------------------------------------------------------------------------
// teams.js : 100% original clubs, crests and players. No real-world licences.
// Squads are generated procedurally from name pools so the data stays small
// while every club still fields a distinct, repeatable XI.
// ---------------------------------------------------------------------------
import { makeRng, clamp } from '../core/util.js';

export const TEAMS = [
  { id: 'AUR', name: 'オーロラFC',        en: 'Aurora FC',        abbr: 'AUR', pat: 'stripes',
    c1: '#1e5fe0', c2: '#f2f6ff', c3: '#0b2a63', away1: '#f2f6ff', away2: '#1e5fe0',
    str: 87, style: 'possession', crest: 'star' },
  { id: 'IRO', name: 'アイアンサイド',    en: 'Ironside United',  abbr: 'IRO', pat: 'sash',
    c1: '#b8232c', c2: '#1b1b20', c3: '#f1d9a1', away1: '#1b1b20', away2: '#b8232c',
    str: 86, style: 'direct', crest: 'shield' },
  { id: 'VER', name: 'ヴェルデ・マール',  en: 'Verde Mar',        abbr: 'VER', pat: 'hoops',
    c1: '#0f9d58', c2: '#ffffff', c3: '#0b5b36', away1: '#0b3b26', away2: '#9ff0c4',
    str: 85, style: 'press', crest: 'wave' },
  { id: 'NOC', name: 'ノクターン',        en: 'Nocturne SC',      abbr: 'NOC', pat: 'plain',
    c1: '#2a2440', c2: '#c9a227', c3: '#0d0b16', away1: '#c9a227', away2: '#2a2440',
    str: 84, style: 'counter', crest: 'moon' },
  { id: 'SOL', name: 'ソラリス',          en: 'Solaris Athletic', abbr: 'SOL', pat: 'stripes',
    c1: '#f5a623', c2: '#2b1a00', c3: '#ffd98a', away1: '#2b1a00', away2: '#f5a623',
    str: 83, style: 'direct', crest: 'sun' },
  { id: 'GLA', name: 'グラシエ',          en: 'Glacier City',     abbr: 'GLA', pat: 'halves',
    c1: '#7fd7f0', c2: '#0a3d52', c3: '#ffffff', away1: '#0a3d52', away2: '#7fd7f0',
    str: 82, style: 'possession', crest: 'peak' },
  { id: 'TER', name: 'テッラロッサ',      en: 'Terra Rossa',      abbr: 'TER', pat: 'plain',
    c1: '#8c3b1b', c2: '#f3e2c7', c3: '#4a1d0c', away1: '#f3e2c7', away2: '#8c3b1b',
    str: 81, style: 'press', crest: 'bull' },
  { id: 'ZEP', name: 'ゼファー',          en: 'Zephyr Rovers',    abbr: 'ZEP', pat: 'stripes',
    c1: '#d8dde3', c2: '#38414d', c3: '#9fb0c4', away1: '#38414d', away2: '#d8dde3',
    str: 80, style: 'counter', crest: 'wing' },
  { id: 'KUR', name: 'クロガネ',          en: 'Kurogane FC',      abbr: 'KUR', pat: 'sash',
    c1: '#20242b', c2: '#e8403a', c3: '#6f7680', away1: '#e8403a', away2: '#20242b',
    str: 80, style: 'press', crest: 'anvil' },
  { id: 'MAR', name: 'マリンブルーズ',    en: 'Marine Blues',     abbr: 'MAR', pat: 'hoops',
    c1: '#0a4f8a', c2: '#8fd3ff', c3: '#062f54', away1: '#8fd3ff', away2: '#0a4f8a',
    str: 79, style: 'possession', crest: 'anchor' },
  { id: 'AMB', name: 'アンバー・ヒル',    en: 'Amber Hill',       abbr: 'AMB', pat: 'plain',
    c1: '#e0a21a', c2: '#3a2a08', c3: '#fff0c4', away1: '#3a2a08', away2: '#e0a21a',
    str: 78, style: 'direct', crest: 'hill' },
  { id: 'VIO', name: 'ヴィオレット',      en: 'Violette Nord',    abbr: 'VIO', pat: 'sash',
    c1: '#6b3fb5', c2: '#efe7ff', c3: '#2f1a55', away1: '#efe7ff', away2: '#6b3fb5',
    str: 78, style: 'possession', crest: 'lily' },
  { id: 'FOR', name: 'フォージ',          en: 'Forge Town',       abbr: 'FOR', pat: 'stripes',
    c1: '#d75a1f', c2: '#241a14', c3: '#f6c79a', away1: '#241a14', away2: '#d75a1f',
    str: 77, style: 'direct', crest: 'hammer' },
  { id: 'CYP', name: 'シプレス',          en: 'Cypress Park',     abbr: 'CYP', pat: 'hoops',
    c1: '#2f6b3a', c2: '#f0f4e8', c3: '#17391f', away1: '#f0f4e8', away2: '#2f6b3a',
    str: 76, style: 'counter', crest: 'tree' },
  { id: 'HAL', name: 'ハルシオン',        en: 'Halcyon Bay',      abbr: 'HAL', pat: 'plain',
    c1: '#15b7a4', c2: '#07322e', c3: '#bdfff6', away1: '#07322e', away2: '#15b7a4',
    str: 75, style: 'possession', crest: 'bird' },
  { id: 'OBS', name: 'オブシディアン',    en: 'Obsidian Nine',    abbr: 'OBS', pat: 'halves',
    c1: '#16161a', c2: '#49e0c4', c3: '#3c3c46', away1: '#49e0c4', away2: '#16161a',
    str: 75, style: 'press', crest: 'gem' },
];

// Invented surnames; any resemblance to a real footballer is unintended.
const SURNAMES = [
  'Arvani', 'Belmire', 'Calbret', 'Dorsey', 'Enquist', 'Falvio', 'Grasso',
  'Hakuda', 'Imbert', 'Jorven', 'Kastel', 'Lundqvist', 'Moriaux', 'Nevala',
  'Okonjo', 'Petrelli', 'Quintar', 'Ravelli', 'Sandrup', 'Takimoto', 'Ulvang',
  'Varela', 'Wendt', 'Ximenes', 'Yanagi', 'Zoric', 'Abrantes', 'Brecker',
  'Cardoso', 'Delmaro', 'Eskildsen', 'Fontane', 'Gridley', 'Halvard', 'Ibori',
  'Jansik', 'Kovalenko', 'Lamerre', 'Mbeki', 'Norrback', 'Olazar', 'Pellone',
  'Raduno', 'Serrano', 'Tovarek', 'Urbina', 'Vascov', 'Weisner', 'Yoselin',
  'Zagara', 'Alvent', 'Brindisi', 'Castellan', 'Dufresne', 'Egilsson',
  'Ferraro', 'Goddard', 'Hirayama', 'Ilunga', 'Jerrick', 'Kaneshiro',
  'Larsgaard', 'Montoro', 'Nakabe', 'Ostrov', 'Parvin', 'Rizzoli', 'Sorrento',
  'Thalberg', 'Uvarov', 'Vicario', 'Welton', 'Yusupov', 'Zimran',
];
const INITIALS = 'ADEFGHIJKLMNOPRSTVY'.split('');

const ROLE_WEIGHTS = {
  // pace accel pass shoot dribble tackle head strength vision stamina
  GK: [0.45, 0.5, 0.65, 0.25, 0.3, 0.4, 0.8, 0.9, 0.7, 0.7],
  CB: [0.72, 0.7, 0.72, 0.4, 0.5, 1.02, 1.05, 1.06, 0.78, 0.92],
  LB: [0.98, 0.96, 0.86, 0.55, 0.82, 0.94, 0.78, 0.86, 0.84, 1.04],
  RB: [0.98, 0.96, 0.86, 0.55, 0.82, 0.94, 0.78, 0.86, 0.84, 1.04],
  DM: [0.8, 0.82, 0.95, 0.62, 0.74, 1.0, 0.92, 1.0, 0.95, 1.04],
  CM: [0.86, 0.9, 1.04, 0.78, 0.92, 0.86, 0.8, 0.9, 1.05, 1.06],
  AM: [0.9, 0.98, 1.06, 0.9, 1.06, 0.6, 0.7, 0.8, 1.1, 0.96],
  LM: [1.0, 1.0, 0.96, 0.8, 1.02, 0.72, 0.7, 0.78, 0.94, 1.04],
  RM: [1.0, 1.0, 0.96, 0.8, 1.02, 0.72, 0.7, 0.78, 0.94, 1.04],
  LW: [1.08, 1.06, 0.9, 0.9, 1.1, 0.55, 0.66, 0.74, 0.92, 0.98],
  RW: [1.08, 1.06, 0.9, 0.9, 1.1, 0.55, 0.66, 0.74, 0.92, 0.98],
  ST: [1.02, 1.04, 0.8, 1.12, 0.96, 0.5, 1.0, 0.98, 0.86, 0.94],
};
const ATTRS = ['pace', 'accel', 'pass', 'shoot', 'dribble', 'tackle', 'head',
  'strength', 'vision', 'stamina'];

const STYLE_BIAS = {
  possession: { pass: 4, vision: 4, dribble: 2, tackle: -2 },
  direct:     { shoot: 4, head: 4, strength: 3, pass: -2 },
  press:      { tackle: 5, stamina: 4, pace: 2, pass: -2 },
  counter:    { pace: 5, accel: 4, shoot: 2, pass: -1 },
};

function makePlayer(rng, team, role, idx, shirt) {
  const w = ROLE_WEIGHTS[role] || ROLE_WEIGHTS.CM;
  const bias = STYLE_BIAS[team.style] || {};
  // Base quality: squad spine is stronger than the fringe.
  const quality = team.str + rng.gauss() * 4.2 - idx * 0.22;
  const p = {
    id: `${team.id}-${shirt}`,
    shirt,
    name: `${rng.pick(INITIALS)}. ${rng.pick(SURNAMES)}`,
    role,
    foot: rng.chance(0.78) ? 'R' : 'L',
  };
  for (let i = 0; i < ATTRS.length; i++) {
    const k = ATTRS[i];
    const v = quality * (0.72 + 0.4 * w[i]) + (bias[k] || 0) + rng.gauss() * 3.4;
    p[k] = Math.round(clamp(v, 36, 99));
  }
  if (role === 'GK') {
    p.gkReflex = Math.round(clamp(quality + rng.gauss() * 3, 40, 99));
    p.gkPositioning = Math.round(clamp(quality + rng.gauss() * 3, 40, 99));
    p.gkHandling = Math.round(clamp(quality + rng.gauss() * 3, 40, 99));
  }
  // Normalise so `overall` tracks the intended quality instead of drifting up.
  const wSum = w.reduce((s, v) => s + v, 0);
  const kNorm = w.reduce((s, v) => s + v * (0.72 + 0.4 * v), 0) / wSum;
  p.overall = Math.round(
    ATTRS.reduce((s, k, i) => s + p[k] * w[i], 0) / wSum / kNorm
  );
  return p;
}

const SQUAD_SHAPE = ['GK', 'RB', 'CB', 'CB', 'LB', 'DM', 'CM', 'CM', 'RW', 'ST', 'LW',
  'GK', 'CB', 'RB', 'DM', 'CM', 'AM', 'RW', 'ST'];
const SHIRTS = [1, 2, 4, 5, 3, 6, 8, 10, 7, 9, 11, 13, 15, 16, 14, 18, 20, 17, 19];

const cache = new Map();
/** Full 19-man squad for a club, cached and deterministic. */
export function squadFor(teamId) {
  if (cache.has(teamId)) return cache.get(teamId);
  const team = TEAMS.find((t) => t.id === teamId) || TEAMS[0];
  let seed = 0;
  for (let i = 0; i < team.id.length; i++) seed = seed * 131 + team.id.charCodeAt(i);
  const rng = makeRng(seed ^ 0x9e3779b9);
  const squad = SQUAD_SHAPE.map((role, i) => makePlayer(rng, team, role, i, SHIRTS[i]));
  cache.set(teamId, squad);
  return squad;
}

export function teamById(id) {
  return TEAMS.find((t) => t.id === id) || TEAMS[0];
}

export function teamRating(id) {
  const s = squadFor(id).slice(0, 11);
  return Math.round(s.reduce((a, p) => a + p.overall, 0) / s.length);
}
