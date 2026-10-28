// ---------------------------------------------------------------------------
// comp.js : reusable view components (crests, stars, attribute cells,
// ratings, condition bars, form guides, charts).
// ---------------------------------------------------------------------------
import { esc, dx } from './dom.js';
import { attrClass, LINE_OF, POS_SHORT, bestPos } from '../model/attrs.js';
import { natFlag, natName, fullName } from '../data/names.js';
import { fmtMoney, moraleLabel } from '../model/player.js';

// --- crests ---------------------------------------------------------------------------
const SHAPES = {
  shield: 'M20 2 L37 8 V24 C37 35 29 43 20 46 C11 43 3 35 3 24 V8 Z',
  round: 'M20 4 A20 20 0 1 1 19.99 4 Z',
  diamond: 'M20 2 L38 24 L20 46 L2 24 Z',
  shield2: 'M4 3 H36 V22 C36 34 28 42 20 46 C12 42 4 34 4 22 Z',
  hex: 'M20 2 L38 12 V36 L20 46 L2 36 V12 Z',
  banner: 'M5 2 H35 V40 L20 46 L5 40 Z',
};
const SYMS = {
  crown: 'M4 17h16l1-9-5 4-4-6-4 6-5-4z',
  flame: 'M12 2.5c1 4 5.5 5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-3 2-4.2 2.2-7 1 1.2 2 2 3 2.2-.1-2.2-.9-3.6.3-5.7z',
  sword: 'M12 2.5l2 3v9.5h2.5v2H13v4.5h-2V17H7.5v-2H10V5.5z',
  castle: 'M4.5 20.5V9h2V6h2.2v3h2.1V6h2.4v3h2.1V6h2.2v3h2v11.5h-5.2v-4.2h-4.6v4.2z',
  bird: 'M2.5 12.5c3-1 5.5-4.5 9.5-4.5 2 0 3.2 1 4.2 2.2l5.3-1.2-3.2 3.3c0 4.3-4.2 7.4-9.3 7.4l-3.3 2.3 1-4.3c-2.3-1.2-3.2-3.2-4.2-5.2z',
  star: 'M12 2.5l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17l-5.6 2.9 1.1-6.3-4.6-4.4 6.3-.9z',
  wave: 'M2 12.5c2.5-3.5 5.5-3.5 8 0s5.5 3.5 8 0c1-1.4 2.6-2.4 4-2.4v10.4H2zM2 8c2.5-3 5.5-3 8 0s5.5 3 8 0c1-1.2 2.6-2 4-2v2.6c-1.4 0-2.6.8-3.6 2-2.7 3.3-6.2 3.3-8.8 0-2.3-2.9-4.9-2.9-7.6.2z',
  bolt: 'M13.5 2 5 13.5h6L9 22l10-13h-6.5z',
  lion: 'M12 3.5c4.4 0 7.5 3.2 7.5 7.4 0 3-1.8 5-3.1 6.2l-.9 3.4H8.5l-.9-3.4C6.3 15.9 4.5 13.9 4.5 10.9 4.5 6.7 7.6 3.5 12 3.5zm-2.6 7.2a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2zm5.2 0a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2zM12 15.5l1.6-1.8h-3.2z',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM11 1.5h2v4h-2zM11 18.5h2v4h-2zM1.5 11h4v2h-4zM18.5 11h4v2h-4zM4.2 5.6l1.4-1.4 2.8 2.8-1.4 1.4zM15.6 17l1.4-1.4 2.8 2.8-1.4 1.4zM4.2 18.4l2.8-2.8 1.4 1.4-2.8 2.8zM15.6 7l2.8-2.8 1.4 1.4L17 8.4z',
  moon: 'M15.5 2.5a9.5 9.5 0 1 0 6 16.2A8.3 8.3 0 0 1 15.5 2.5z',
  shield: 'M12 2.5l7.5 3V11c0 5-3.2 8.6-7.5 10.5C7.7 19.6 4.5 16 4.5 11V5.5z',
  tree: 'M12 2l6.5 8.5h-3.3l4.3 5.3h-5.3v6h-4.4v-6H4.5l4.3-5.3H5.5z',
  mountain: 'M1.5 20.5l7.5-12 3.2 4.4 3.3-5.4 7 13z',
  anchor: 'M11 2.5h2v3.5h3.2v2H13v10.4c2.2-.2 4.2-2 5.2-4.2l2 .9c-1.2 3.4-4.4 6.4-8.2 6.4s-7-3-8.2-6.4l2-.9c1 2.2 3 4 5.2 4.2V8H7.8V6H11z',
};
export function crest(c, size = 28) {
  if (!c) return `<svg class="crest" width="${size}" height="${size * 1.2}"></svg>`;
  const col = c.col || {};
  const shape = SHAPES[(c.crest && c.crest.shape) || 'shield'] || SHAPES.shield;
  const sym = SYMS[(c.crest && c.crest.sym) || 'star'] || SYMS.star;
  const c1 = col.c1 || '#335', c2 = col.c2 || '#fff', c3 = col.c3 || '#000';
  const uid = 'k' + c.id + '_' + size;
  let pattern = '';
  if (col.pat === 'stripes') pattern = `<g clip-path="url(#${uid})" opacity=".5"><rect x="9" y="0" width="5" height="48" fill="${c2}"/><rect x="26" y="0" width="5" height="48" fill="${c2}"/></g>`;
  else if (col.pat === 'hoops') pattern = `<g clip-path="url(#${uid})" opacity=".45"><rect x="0" y="30" width="40" height="5" fill="${c2}"/><rect x="0" y="38" width="40" height="5" fill="${c2}"/></g>`;
  else if (col.pat === 'halves') pattern = `<g clip-path="url(#${uid})" opacity=".55"><rect x="20" y="0" width="20" height="48" fill="${c3}"/></g>`;
  else if (col.pat === 'sash') pattern = `<g clip-path="url(#${uid})" opacity=".5"><path d="M-4 36 L36 -4 L44 4 L4 44Z" fill="${c2}"/></g>`;
  const symFill = isLight(c1) ? c3 : c2;
  return `<svg class="crest" width="${size}" height="${Math.round(size * 1.2)}" viewBox="0 0 40 48" aria-label="${esc(c.name)}">
    <defs><clipPath id="${uid}"><path d="${shape}"/></clipPath></defs>
    <path d="${shape}" fill="${c1}"/>${pattern}
    <path d="${shape}" fill="none" stroke="${c2}" stroke-width="2.2" opacity=".9"/>
    <g transform="translate(9 11) scale(0.92)"><path d="${sym}" fill="${symFill}" stroke="rgba(0,0,0,.25)" stroke-width=".5"/></g>
  </svg>`;
}
function isLight(hex) {
  if (!hex || hex[0] !== '#') return false;
  const n = parseInt(hex.slice(1), 16);
  return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) > 170;
}
export const contrast = (hex) => (isLight(hex) ? '#0b1020' : '#ffffff');

// --- small atoms -------------------------------------------------------------------------
export function stars(v, max = 5) {
  const full = Math.floor(v), half = v - full >= 0.5;
  let s = '';
  for (let i = 0; i < max; i++) s += i < full ? '★' : i === full && half ? '<span style="position:relative;display:inline-block">★</span>' : '<span class="e">★</span>';
  return `<span class="stars" title="${v.toFixed(1)}">${s}</span>`;
}
export function starsHalf(v) {
  const r = Math.round(v * 2) / 2;
  let out = '';
  for (let i = 1; i <= 5; i++) {
    if (r >= i) out += '★';
    else if (r >= i - 0.5) out += '<span style="background:linear-gradient(90deg,#f5c542 50%,#3a4566 50%);-webkit-background-clip:text;background-clip:text;color:transparent">★</span>';
    else out += '<span class="e">★</span>';
  }
  return `<span class="stars">${out}</span>`;
}
export function attr(v, opts = {}) {
  if (v === null || v === undefined) return '<span class="attr mute">-</span>';
  if (typeof v === 'string') return `<span class="attr mute">${esc(v)}</span>`;
  const r = Math.max(1, Math.min(20, Math.round(v)));
  return `<span class="attr ${opts.bg ? 'bg ' : ''}${attrClass(r)}">${r}</span>`;
}
export function rating(r) {
  if (!r) return '<span class="rt r0">-</span>';
  const k = r >= 8.5 ? 'r9' : r >= 7.7 ? 'r8' : r >= 7.0 ? 'r7' : r >= 6.5 ? 'r6' : r >= 6.0 ? 'r5' : 'r4';
  return `<span class="rt ${k}">${r.toFixed(1)}</span>`;
}
export function condBar(c) {
  const v = Math.max(0, Math.min(100, Math.round(c === undefined ? 100 : c)));
  const col = v >= 90 ? '#34d399' : v >= 75 ? '#a3e635' : v >= 60 ? '#fbbf24' : '#f87171';
  return `<span class="cond" title="${v}%"><i style="width:${v}%;background:${col}"></i></span>`;
}
export function morale(m) {
  const l = moraleLabel(m === undefined ? 60 : m);
  const face = { m5: '😄', m4: '🙂', m3: '😐', m2: '🙁', m1: '😠' }[l.c];
  return `<span class="mor" title="${l.t}">${face}</span>`;
}
export function moraleText(m) { return moraleLabel(m === undefined ? 60 : m).t; }
export function form(list) {
  return `<span class="form">${(list || []).map((x) => `<i class="${x}">${x === 'W' ? '勝' : x === 'L' ? '負' : '分'}</i>`).join('')}</span>`;
}
export function posChip(p) {
  const pos = bestPos(p);
  return `<span class="pos ${LINE_OF[pos]}">${POS_SHORT[pos]}</span>`;
}
export function posChipCode(pos) { return `<span class="pos ${LINE_OF[pos] || 'MF'}">${POS_SHORT[pos] || pos}</span>`; }
export const flag = (nat) => `<span class="flag" title="${esc(natName(nat))}">${natFlag(nat)}</span>`;
export const money = (v) => `<span class="num">${fmtMoney(v)}</span>`;
export function playerLink(p, opts = {}) {
  return `<span data-a="player" data-x="${dx({ id: p.id })}" style="cursor:pointer" class="${opts.cls || ''}">${esc(opts.short ? p.ln : fullName(p))}</span>`;
}
export function clubLink(c, opts = {}) {
  if (!c) return '<span class="mute">フリー</span>';
  return `<span data-a="club" data-x="${dx({ id: c.id })}" class="row gap4" style="cursor:pointer;display:inline-flex">${crest(c, opts.size || 18)}<span class="${opts.cls || ''}">${esc(opts.short ? c.short : c.name)}</span></span>`;
}
export function statusIcons(p, day) {
  let s = '';
  if (p.inj) s += `<span class="inj" title="${esc(p.inj.name)} あと${p.inj.days}日">✚</span>`;
  if (p.ban > 0) s += `<span class="ban" title="出場停止 ${p.ban}試合">■</span>`;
  if (p.listed) s += '<span class="pill warn" title="移籍リスト">放出</span>';
  if (p.loan) s += '<span class="pill acc">ﾚﾝﾀﾙ</span>';
  if (p.contract && p.contract.until - day < 183) s += '<span class="pill bad" title="契約満了間近">契約</span>';
  return s;
}

// --- charts --------------------------------------------------------------------------------
/** series: [{ name, color, pts: [[x, y], ...] }] */
export function lineChart(series, opts = {}) {
  const W = opts.w || 600, H = opts.h || 200, pl = 34, pr = 10, pt = 10, pb = 22;
  const xs = series.flatMap((s) => s.pts.map((p) => p[0]));
  const ys = series.flatMap((s) => s.pts.map((p) => p[1]));
  if (!xs.length) return '<div class="empty">データがまだありません</div>';
  const x0 = Math.min(...xs), x1 = Math.max(...xs, x0 + 1);
  let y0 = opts.yMin !== undefined ? opts.yMin : Math.min(...ys), y1 = opts.yMax !== undefined ? opts.yMax : Math.max(...ys);
  if (y1 - y0 < 1e-6) { y0 -= 1; y1 += 1; }
  const pad = (y1 - y0) * 0.08;
  if (opts.yMin === undefined) y0 -= pad;
  if (opts.yMax === undefined) y1 += pad;
  const X = (x) => pl + (x - x0) / (x1 - x0) * (W - pl - pr);
  const Y = (y) => pt + (1 - (y - y0) / (y1 - y0)) * (H - pt - pb);
  let g = '';
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = y0 + (y1 - y0) * i / ticks;
    g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#24304d" stroke-width="1"/>`;
    g += `<text x="${pl - 4}" y="${Y(v) + 3}" text-anchor="end">${opts.yFmt ? opts.yFmt(v) : Math.round(v)}</text>`;
  }
  if (opts.xLabels) for (const [x, t] of opts.xLabels) g += `<text x="${X(x)}" y="${H - 6}" text-anchor="middle">${esc(t)}</text>`;
  if (opts.invert) { /* league position: 1 at top handled by caller via yMin/yMax swap */ }
  for (const s of series) {
    if (!s.pts.length) continue;
    const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(' ');
    if (s.fill) g += `<path d="${d} L${X(s.pts[s.pts.length - 1][0])} ${Y(y0)} L${X(s.pts[0][0])} ${Y(y0)} Z" fill="${s.color}" opacity=".12"/>`;
    g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (s.pts.length < 40) for (const p of s.pts) g += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="2.6" fill="${s.color}"/>`;
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="max-height:${opts.maxH || 240}px">${g}</svg>`;
}

export function barChart(items, opts = {}) {
  const W = opts.w || 600, H = opts.h || 180, pl = 6, pb = 20, pt = 8;
  const max = Math.max(1, ...items.map((i) => Math.abs(i.v)));
  const bw = (W - pl * 2) / items.length;
  let g = '';
  items.forEach((it, i) => {
    const h = Math.abs(it.v) / max * (H - pb - pt);
    const x = pl + i * bw + bw * 0.15;
    g += `<rect x="${x}" y="${H - pb - h}" width="${bw * 0.7}" height="${h}" rx="3" fill="${it.color || (it.v >= 0 ? '#34d399' : '#f87171')}"/>`;
    if (it.label) g += `<text x="${x + bw * 0.35}" y="${H - 6}" text-anchor="middle">${esc(it.label)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="max-height:${opts.maxH || 200}px">${g}</svg>`;
}

/** Attribute polygon (radar): values 0-20 */
export function radar(axes, opts = {}) {
  const S = opts.size || 220, c = S / 2, r = S * 0.36;
  const n = axes.length;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + i / n * Math.PI * 2;
    return [c + Math.cos(a) * r * v / 20, c + Math.sin(a) * r * v / 20];
  };
  let g = '';
  for (const lv of [5, 10, 15, 20]) {
    g += `<polygon points="${axes.map((_, i) => pt(i, lv).join(',')).join(' ')}" fill="none" stroke="#2a3657" stroke-width="1"/>`;
  }
  axes.forEach((ax, i) => {
    const [x, y] = pt(i, 23.5);
    g += `<text x="${x}" y="${y + 3}" text-anchor="middle" style="font-size:10.5px;fill:#9aa6c1">${esc(ax.n)}</text>`;
  });
  const poly = axes.map((ax, i) => pt(i, Math.max(1, ax.v)).join(',')).join(' ');
  g += `<polygon points="${poly}" fill="${opts.color || '#5b8cff'}" fill-opacity=".28" stroke="${opts.color || '#5b8cff'}" stroke-width="2"/>`;
  if (opts.compare) {
    const p2 = opts.compare.map((v, i) => pt(i, Math.max(1, v)).join(',')).join(' ');
    g += `<polygon points="${p2}" fill="none" stroke="#f5c542" stroke-width="1.6" stroke-dasharray="4 3"/>`;
  }
  return `<svg class="chart" viewBox="0 0 ${S} ${S}" style="max-width:${S + 40}px;margin:0 auto">${g}</svg>`;
}

export function statBar(label, a, b, opts = {}) {
  const fa = opts.fmt ? opts.fmt(a) : a, fb = opts.fmt ? opts.fmt(b) : b;
  const tot = (a + b) || 1;
  return `<div class="statbar"><div class="t">${esc(label)}</div><span class="v">${fa}</span>
    <div class="b"><i style="width:${a / tot * 100}%;background:${opts.c1 || '#5b8cff'}"></i><i style="width:${b / tot * 100}%;background:${opts.c2 || '#f87171'}"></i></div>
    <span class="v r">${fb}</span></div>`;
}

export { fmtMoney, fullName };
