// ---------------------------------------------------------------------------
// formations.js : base shapes in normalised attacking space.
//   nx 0 = own goal line, 1 = opponent goal line
//   ny -1 = left touchline, +1 = right touchline (from the attack's view)
// ---------------------------------------------------------------------------

export const FORMATIONS = [
  { id: '433', name: '4-3-3', en: '4-3-3', desc: '幅を使って崩す攻撃的な基本形',
    tactics: { line: 0.40, width: 1.06, press: 1.06, tempo: 1.06, risk: 1.0 },
    slots: [
      { role: 'GK', nx: 0.030, ny: 0.00 },
      { role: 'RB', nx: 0.225, ny: 0.72 },
      { role: 'CB', nx: 0.165, ny: 0.26 },
      { role: 'CB', nx: 0.165, ny: -0.26 },
      { role: 'LB', nx: 0.225, ny: -0.72 },
      { role: 'DM', nx: 0.360, ny: 0.00 },
      { role: 'CM', nx: 0.465, ny: 0.34 },
      { role: 'CM', nx: 0.465, ny: -0.34 },
      { role: 'RW', nx: 0.700, ny: 0.80 },
      { role: 'ST', nx: 0.765, ny: 0.02 },
      { role: 'LW', nx: 0.700, ny: -0.80 },
    ] },
  { id: '442', name: '4-4-2', en: '4-4-2', desc: 'バランス重視、2トップで押し込む',
    tactics: { line: 0.38, width: 1.02, press: 1.0, tempo: 1.0, risk: 0.96 },
    slots: [
      { role: 'GK', nx: 0.030, ny: 0.00 },
      { role: 'RB', nx: 0.220, ny: 0.74 },
      { role: 'CB', nx: 0.160, ny: 0.26 },
      { role: 'CB', nx: 0.160, ny: -0.26 },
      { role: 'LB', nx: 0.220, ny: -0.74 },
      { role: 'RM', nx: 0.490, ny: 0.80 },
      { role: 'CM', nx: 0.430, ny: 0.24 },
      { role: 'CM', nx: 0.430, ny: -0.24 },
      { role: 'LM', nx: 0.490, ny: -0.80 },
      { role: 'ST', nx: 0.730, ny: 0.20 },
      { role: 'ST', nx: 0.730, ny: -0.20 },
    ] },
  { id: '4231', name: '4-2-3-1', en: '4-2-3-1', desc: '中盤を厚くして主導権を握る',
    tactics: { line: 0.40, width: 1.0, press: 1.08, tempo: 1.04, risk: 1.0 },
    slots: [
      { role: 'GK', nx: 0.030, ny: 0.00 },
      { role: 'RB', nx: 0.230, ny: 0.74 },
      { role: 'CB', nx: 0.165, ny: 0.26 },
      { role: 'CB', nx: 0.165, ny: -0.26 },
      { role: 'LB', nx: 0.230, ny: -0.74 },
      { role: 'DM', nx: 0.340, ny: 0.20 },
      { role: 'DM', nx: 0.340, ny: -0.20 },
      { role: 'RW', nx: 0.590, ny: 0.76 },
      { role: 'AM', nx: 0.595, ny: 0.00 },
      { role: 'LW', nx: 0.590, ny: -0.76 },
      { role: 'ST', nx: 0.775, ny: 0.00 },
    ] },
  { id: '352', name: '3-5-2', en: '3-5-2', desc: 'ウイングバックが上下動する積極策',
    tactics: { line: 0.43, width: 1.12, press: 1.1, tempo: 1.06, risk: 1.08 },
    slots: [
      { role: 'GK', nx: 0.030, ny: 0.00 },
      { role: 'CB', nx: 0.175, ny: 0.34 },
      { role: 'CB', nx: 0.150, ny: 0.00 },
      { role: 'CB', nx: 0.175, ny: -0.34 },
      { role: 'RM', nx: 0.455, ny: 0.90 },
      { role: 'CM', nx: 0.430, ny: 0.30 },
      { role: 'DM', nx: 0.345, ny: 0.00 },
      { role: 'CM', nx: 0.430, ny: -0.30 },
      { role: 'LM', nx: 0.455, ny: -0.90 },
      { role: 'ST', nx: 0.730, ny: 0.18 },
      { role: 'ST', nx: 0.730, ny: -0.18 },
    ] },
  { id: '532', name: '5-3-2', en: '5-3-2', desc: '堅守速攻。低い重心からカウンター',
    tactics: { line: 0.30, width: 1.0, press: 0.9, tempo: 1.1, risk: 0.86 },
    slots: [
      { role: 'GK', nx: 0.030, ny: 0.00 },
      { role: 'RB', nx: 0.210, ny: 0.82 },
      { role: 'CB', nx: 0.140, ny: 0.30 },
      { role: 'CB', nx: 0.120, ny: 0.00 },
      { role: 'CB', nx: 0.140, ny: -0.30 },
      { role: 'LB', nx: 0.210, ny: -0.82 },
      { role: 'CM', nx: 0.420, ny: 0.34 },
      { role: 'DM', nx: 0.350, ny: 0.00 },
      { role: 'CM', nx: 0.420, ny: -0.34 },
      { role: 'ST', nx: 0.700, ny: 0.22 },
      { role: 'ST', nx: 0.700, ny: -0.22 },
    ] },
  { id: '41212', name: '4-1-2-1-2', en: '4-1-2-1-2', desc: 'ダイヤモンド中盤で中央突破',
    tactics: { line: 0.41, width: 0.86, press: 1.12, tempo: 1.08, risk: 1.04 },
    slots: [
      { role: 'GK', nx: 0.030, ny: 0.00 },
      { role: 'RB', nx: 0.235, ny: 0.78 },
      { role: 'CB', nx: 0.165, ny: 0.24 },
      { role: 'CB', nx: 0.165, ny: -0.24 },
      { role: 'LB', nx: 0.235, ny: -0.78 },
      { role: 'DM', nx: 0.335, ny: 0.00 },
      { role: 'CM', nx: 0.480, ny: 0.44 },
      { role: 'CM', nx: 0.480, ny: -0.44 },
      { role: 'AM', nx: 0.615, ny: 0.00 },
      { role: 'ST', nx: 0.770, ny: 0.16 },
      { role: 'ST', nx: 0.770, ny: -0.16 },
    ] },
];

export const formationById = (id) =>
  FORMATIONS.find((f) => f.id === id) || FORMATIONS[0];

/** Pick the formation a club prefers, from its play style. */
export function defaultFormation(style) {
  switch (style) {
    case 'possession': return '4231';
    case 'direct': return '442';
    case 'press': return '433';
    case 'counter': return '532';
    default: return '433';
  }
}
