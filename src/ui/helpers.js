// ---------------------------------------------------------------------------
// helpers.js : view helpers shared by screens.
// ---------------------------------------------------------------------------
import { esc, dx } from './dom.js';
import { crest } from './comp.js';
import { fmtDateMid, fmtDateShort } from '../core/date.js';
import { compName, compShort, sortTable } from '../model/comp.js';
import { avgRating } from '../model/player.js';

export function oppOf(G, f, cid = G.userClub) { return G.clubs[f.h === cid ? f.a : f.h]; }
export function resultFor(f, cid) {
  if (!f.done) return null;
  const mine = f.h === cid ? f.hs : f.as, theirs = f.h === cid ? f.as : f.hs;
  let r = mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
  if (r === 'D' && f.pens) r = (f.h === cid ? f.pens[0] > f.pens[1] : f.pens[1] > f.pens[0]) ? 'W' : 'L';
  return { r, mine, theirs, txt: `${mine}-${theirs}${f.pens ? `（PK${f.h === cid ? f.pens[0] : f.pens[1]}-${f.h === cid ? f.pens[1] : f.pens[0]}）` : f.et ? '（延長）' : ''}` };
}
export function scoreText(f) {
  if (!f.done) return 'vs';
  return `${f.hs}-${f.as}${f.pens ? `<span class="tiny dim"> PK${f.pens[0]}-${f.pens[1]}</span>` : ''}`;
}
export function fixtureRow(G, f, cid = G.userClub, opts = {}) {
  const opp = oppOf(G, f, cid);
  const home = f.h === cid;
  const res = resultFor(f, cid);
  return `<div class="list-i ${opts.click !== false ? 'click' : ''}" ${opts.click !== false ? `data-a="fixture" data-x="${dx({ id: f.id })}"` : ''}>
    <div style="width:58px" class="small dim">${fmtDateShort(f.day)}<br><span class="tiny">${esc(compShort(G, f.comp))}</span></div>
    ${crest(opp, 24)}
    <div class="grow ell"><b>${esc(opp.name)}</b> <span class="small dim">${home ? '(H)' : '(A)'}</span></div>
    ${res ? `<span class="form"><i class="${res.r}">${res.r === 'W' ? '勝' : res.r === 'L' ? '負' : '分'}</i></span><b class="num" style="min-width:42px;text-align:right">${res.txt}</b>`
      : `<span class="small dim">${fmtDateMid(f.day)}</span>`}
  </div>`;
}
export function leaguePos(G, cid) {
  const c = G.clubs[cid];
  const comp = G.comps[c.league];
  if (!comp) return null;
  const t = sortTable(comp.table, G);
  const i = t.findIndex((r) => r.club === cid);
  return { pos: i + 1, n: t.length, row: t[i], table: t, comp };
}
export function zoneClass(comp, pos) {
  const n = comp.table.length;
  if (comp.promo && pos <= comp.promo) return 'zone-up';
  if (comp.playoff && pos >= comp.playoff[0] && pos <= comp.playoff[1]) return 'zone-po';
  if (comp.level === 1 && pos <= ({ ENG1: 4, ESP1: 3, GER1: 3, ITA1: 3, JPN1: 3 }[comp.id] || 0)) return 'zone-el';
  if (comp.releg && pos > n - comp.releg) return 'zone-dn';
  return '';
}
export function tableHTML(G, comp, opts = {}) {
  const t = sortTable(opts.rows || comp.table, G);
  let rows = t.map((r, i) => ({ r, i }));
  if (opts.around) {
    const me = rows.findIndex((x) => x.r.club === opts.around);
    const lo = Math.max(0, Math.min(me - 2, rows.length - 5));
    rows = rows.slice(lo, lo + 5);
  }
  return `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th class="c">#</th><th>クラブ</th><th class="n">試</th>${opts.compact ? '' : '<th class="n">勝</th><th class="n">分</th><th class="n">敗</th><th class="n">得</th><th class="n">失</th>'}<th class="n">差</th><th class="n">点</th>${opts.compact ? '' : '<th>直近</th>'}</tr></thead>
    <tbody>${rows.map(({ r, i }) => {
      const c = G.clubs[r.club];
      return `<tr class="click ${r.club === G.userClub ? 'me' : ''} ${opts.zones !== false ? zoneClass(comp, i + 1) : ''}" data-a="club" data-x="${dx({ id: c.id })}">
        <td class="c num">${i + 1}</td><td><span class="row gap4">${crest(c, 18)}<span class="ell" style="max-width:${opts.compact ? 120 : 180}px">${esc(opts.compact ? c.name : c.name)}</span></span></td>
        <td class="n">${r.p}</td>${opts.compact ? '' : `<td class="n">${r.w}</td><td class="n">${r.d}</td><td class="n">${r.l}</td><td class="n">${r.gf}</td><td class="n">${r.ga}</td>`}
        <td class="n">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="n"><b>${r.pts}</b></td>
        ${opts.compact ? '' : `<td><span class="form">${r.form.map((x) => `<i class="${x}">${x === 'W' ? '勝' : x === 'L' ? '負' : '分'}</i>`).join('')}</span></td>`}</tr>`;
    }).join('')}</tbody></table></div>`;
}
export function avgRat(p) { const v = avgRating(p); return v ? v.toFixed(2) : '-'; }
export { compName, compShort };
