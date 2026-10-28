// ---------------------------------------------------------------------------
// tactics.js : the tactics board. Drag players and positions on a pitch,
// edit the in-possession and out-of-possession shapes separately, set roles,
// duties, team instructions and set-piece takers.
// ---------------------------------------------------------------------------
import { app, screen, refresh, ui } from '../state.js';
import { esc, dx, action, toast, openModal, closeModal, confirmBox } from '../dom.js';
import { icon } from '../icons.js';
import { contrast, starsHalf, condBar, posChip, posChipCode, attr } from '../comp.js';
import { fullName } from '../../data/names.js';
import { PI, POS_SHORT, famMul, caAt, LINE_OF } from '../../model/attrs.js';
import { squad } from '../../model/game.js';
import {
  ROWS, ROW_NX, COL_NY, cellPos, validCell, cellXY, ROLES, DUTY_JP, rolesFor, defaultRole, roleRating,
  MENTALITY, PASSING, TEMPO, WIDTH, LEVEL5, ENGAGE, TRI, TACKLE, DEF_WIDTH, TRANS_WIN, TRANS_LOSE, GK_DIST,
  FORMATIONS, FORMATION_IDS, makeTactic, slotPos, shapeLabel, pickLineup, available,
} from '../../engine/tactics.js';
import { userLineup } from '../../model/season.js';
import { ageOn } from '../../core/date.js';

// --- geometry ----------------------------------------------------------------------
function cellPct(row, col, n) {
  const { nx, ny } = cellXY(row, col, n);
  return { x: 50 + ny * 41, y: (1 - nx) * 100 - (row === 0 ? 3.5 : 0) };
}
const rowCount = (slots, which, row) => slots.filter((s) => s[which][0] === row).length;

export function ensureSelection(G) {
  const c = G.clubs[G.userClub];
  const t = c.tactic;
  if (!c.sel || !c.sel.xi || c.sel.xi.length !== t.slots.length) {
    const l = userLineup(G);
    c.sel = { xi: l.xi.slice(), bench: l.bench.slice() };
  }
  // drop players who left the club
  const ids = new Set(c.squad);
  c.sel.xi = c.sel.xi.map((id) => (ids.has(id) ? id : null));
  c.sel.bench = c.sel.bench.filter((id) => ids.has(id) && !c.sel.xi.includes(id));
  return c.sel;
}

export const ROLE_ABBR = {
  GK: 'GK', SK: 'SK', CD: 'CB', BPD: 'BPD', NCB: 'ストッパー', WCB: 'WCB', FB: 'FB', WB: 'WB', IFB: '偽SB', IWB: 'IWB',
  DLP: 'レジスタ', BWM: 'ボール奪取', ANC: 'アンカー', HB: 'HB', SV: 'ボランチ', CM: 'CM', BBM: 'BtoB', AP: '司令塔', MEZ: 'メッツァーラ',
  CAR: 'カリレーロ', RPM: 'RPM', WM: 'WM', W: 'ウイング', WP: 'WP', DW: '守備W', AM: 'AM', SS: 'シャドー', ENG: 'エンガンチェ', TQ: 'ファンタジスタ',
  IF: 'インサイドFW', IW: '逆足W', RMD: 'ラウム', WTF: 'WTM', AF: 'ストライカー', CF: 'CF', P: 'ポーチャー', TM: 'ターゲット', F9: '偽9番', DLF: 'ポスト', PF: 'プレスFW',
};
function famColor(f) { return f >= 19 ? '#22c55e' : f >= 15 ? '#a3e635' : f >= 11 ? '#facc15' : f >= 7 ? '#fb923c' : '#ef4444'; }

function pitchSVG() {
  return `<svg class="lines" viewBox="0 0 68 100" preserveAspectRatio="none">
    <g fill="none" stroke="rgba(255,255,255,.45)" stroke-width=".35">
      <rect x="1.5" y="1.5" width="65" height="97"/><line x1="1.5" y1="50" x2="66.5" y2="50"/><circle cx="34" cy="50" r="8.7"/>
      <rect x="14.5" y="1.5" width="39" height="15.7"/><rect x="24.8" y="1.5" width="18.4" height="5.2"/>
      <rect x="14.5" y="82.8" width="39" height="15.7"/><rect x="24.8" y="93.3" width="18.4" height="5.2"/>
      <path d="M27 17.2a8.7 8.7 0 0 0 14 0M27 82.8a8.7 8.7 0 0 1 14 0"/>
    </g></svg>`;
}

function pitchHTML(G, t, sel, which, selIdx) {
  const c = G.clubs[G.userClub];
  let cells = '';
  for (let r = 0; r < 6; r++) for (let col = 0; col < 5; col++) {
    if (!validCell(r, col)) continue;
    const p = cellPct(r, col, 2);
    cells += `<div class="cell ok" data-r="${r}" data-c="${col}" style="left:${p.x - 9}%;top:${p.y - 5.5}%;width:18%;height:11%"></div>`;
  }
  const toks = t.slots.map((s, i) => {
    const [r, col] = s[which];
    const p = cellPct(r, col, rowCount(t.slots, which, r));
    const pl = sel.xi[i] ? G.players[sel.xi[i]] : null;
    const pos = slotPos(s);
    const fam = pl ? pl.p ? 0 : pl.pos[PI[pos]] : 0;
    const role = ROLES[s.role];
    const shirtBg = pos === 'GK' ? '#16a34a' : c.col.c1, shirtFg = pos === 'GK' ? '#fff' : contrast(c.col.c1);
    const bad = pl && !available(pl, G.day);
    return `<div class="tok ${selIdx === i ? 'sel' : ''}" data-i="${i}" style="left:${p.x}%;top:${p.y}%">
      <div class="shirt" style="background:${shirtBg};color:${shirtFg};border-color:${pos === 'GK' ? '#fff' : c.col.c2}">${pl ? pl.no || '' : '?'}
        ${pl ? `<span class="fit" style="background:${bad ? '#ef4444' : famColor(fam)}"></span>` : ''}</div>
      <div class="nm">${pl ? esc(pl.ln) : '<span class="warn">空き</span>'}${pl && pl.inj ? ' <span class="inj">✚</span>' : ''}</div>
      <div class="rl">${esc(ROLE_ABBR[s.role] || s.role)}・${DUTY_JP[s.duty] ? DUTY_JP[s.duty][0] : ''}</div>
    </div>`;
  }).join('');
  return `<div class="pitch" id="pitch" data-which="${which}">${pitchSVG()}${cells}${toks}</div>`;
}

function benchHTML(G, sel) {
  const list = sel.bench.map((id) => G.players[id]).filter(Boolean);
  const all = squad(G, G.userClub);
  const reserves = all.filter((p) => !sel.xi.includes(p.id) && !sel.bench.includes(p.id))
    .sort((a, b) => (a.youth - b.youth) || b.ca - a.ca);
  const row = (p, kind) => `<div class="list-i bench-i" data-pid="${p.id}" data-kind="${kind}">
      ${posChip(p)}<div class="grow" style="min-width:0"><div class="ell"><b>${p.no || ''}</b> ${esc(fullName(p))}${p.inj ? ' <span class="inj">✚</span>' : ''}${p.ban ? ' <span class="ban">■</span>' : ''}</div>
      <div class="tiny dim">${ageOn(p.born, G.day)}歳 ・ ${condBar(p.inj ? 0 : p.cond)}</div></div>
      ${kind === 'bench' ? `<button class="btn sm ghost" data-a="tBenchRemove" data-x="${dx({ id: p.id })}">外す</button>` : `<button class="btn sm ghost" data-a="tBenchAdd" data-x="${dx({ id: p.id })}">控えへ</button>`}
    </div>`;
  return `<div class="card"><div class="card-h">控え（${list.length}/9）<span class="small dim" style="font-weight:500">選手をピッチの選手にドラッグで交代</span></div>
    <div class="card-b flush bench-list">${list.map((p) => row(p, 'bench')).join('') || '<div class="empty">控えがいません</div>'}</div></div>
    <div class="card mt12"><div class="card-h">メンバー外（${reserves.length}）</div><div class="card-b flush bench-list">${reserves.map((p) => row(p, 'res')).join('')}</div></div>`;
}

function slotPanel(G, t, sel, i) {
  const s = t.slots[i];
  const pos = slotPos(s);
  const pl = sel.xi[i] ? G.players[sel.xi[i]] : null;
  const roles = rolesFor(pos);
  const role = ROLES[s.role];
  const cands = squad(G, G.userClub).filter((p) => p.id !== (pl && pl.id))
    .map((p) => ({ p, v: caAt(p, pos) * (available(p, G.day) ? 1 : 0.5) })).sort((a, b) => b.v - a.v).slice(0, 8);
  return `<div class="card"><div class="card-h">${posChipCode(pos)} ${esc(ROWS[s.d[0]])} スロット
      <button class="more" data-a="tDeselect">閉じる</button></div>
    <div class="card-b">
      ${pl ? `<div class="row mb8"><div class="grow"><b data-a="player" data-x="${dx({ id: pl.id })}" style="cursor:pointer">${esc(fullName(pl))}</b>
        <div class="small dim">適性：${famLabelJP(pl.pos[PI[pos]])} ・ 役割適性 ${starsHalf(roleRating(pl, s.role))}</div></div></div>` : '<p class="warn">選手が配置されていません</p>'}
      <div class="small dim mb8">役割</div>
      <div class="tag-list mb8">${roles.map((r) => `<button class="btn sm ${r === s.role ? 'primary' : ''}" data-a="tRole" data-x="${dx({ i, r })}">${esc(ROLES[r].n)}${pl ? ` <span class="tiny" style="opacity:.8">${'★'.repeat(Math.round(roleRating(pl, r)))}</span>` : ''}</button>`).join('')}</div>
      <div class="small dim mb8">任務</div>
      <div class="seg mb8">${role.d.map((d) => `<button class="${d === s.duty ? 'on' : ''}" data-a="tDuty" data-x="${dx({ i, d })}">${DUTY_JP[d]}</button>`).join('')}</div>
      <p class="small dim">${roleDesc(s.role)}</p>
      <div class="small dim mt12 mb8">このポジションの候補</div>
      ${cands.map(({ p }) => `<div class="list-i click" data-a="tPut" data-x="${dx({ i, id: p.id })}">${posChip(p)}<div class="grow ell">${esc(fullName(p))}${p.inj ? ' <span class="inj">✚</span>' : ''}</div>
        <span class="small" style="color:${famColor(p.pos[PI[pos]])}">${famLabelJP(p.pos[PI[pos]])}</span>${starsHalf(roleRating(p, s.role))}</div>`).join('')}
    </div></div>`;
}
function famLabelJP(f) { return f >= 19 ? 'ナチュラル' : f >= 15 ? '熟練' : f >= 11 ? '適応' : f >= 7 ? '不慣れ' : '不適'; }
const ROLE_DESC = {
  GK: 'ゴールを守ることに専念し、安全第一でプレーする。', SK: '高い位置まで飛び出して裏のスペースをカバーし、ビルドアップにも参加する。',
  CD: '相手FWを封じ、ボールを奪ったら近くの味方へ。', BPD: '最終ラインから縦パスやロングパスで攻撃を組み立てる。', NCB: '危険を感じたら迷わずクリア。空中戦に強い。',
  WCB: '3バックの外側で、攻撃時にはサイドへ開いて前進する。', FB: '守備を基本としつつ、タイミングよくオーバーラップする。',
  WB: 'サイドを上下動し、攻撃時はウイングのように高い位置を取る。', IFB: '攻撃時に中盤の中央へ絞り、数的優位を作る。',
  IWB: '中央へ絞って中盤の一員としてゲームを作る。', DLP: '低い位置から試合のテンポを操る司令塔。', BWM: '積極的にボールを奪いに行く。',
  ANC: 'DFラインの前でスペースを埋める。', HB: '攻撃時にCBの間へ下りて3バックを形成する。', SV: '守備的な位置から攻撃にも積極的に絡む。',
  CM: '攻守にバランスよく関与する。', BBM: 'ペナルティエリアからエリアまで走り回る。', AP: '相手の守備の隙間で受けてチャンスを作る。',
  MEZ: 'ハーフスペースへ流れて攻撃に参加する。', CAR: 'サイドの守備をカバーする献身的な中盤。', RPM: '自由に動き回ってボールを受け、攻撃を組み立てる。',
  WM: 'サイドで攻守に働く。', W: 'タッチライン際で幅を取り、突破してクロスを上げる。', WP: 'サイドから中へ入り、チャンスを演出する。',
  DW: '守備を優先しつつカウンターの起点になる。', AM: '中央で攻撃を組み立て、ミドルシュートも狙う。', SS: '2列目から裏へ飛び出し得点を狙う。',
  ENG: '攻撃の全てを託される古典的な司令塔。', TQ: '守備をほぼ免除された自由なファンタジスタ。', IF: 'サイドから中へ切り込んでシュートを狙う。',
  IW: 'サイドから中へ入ってパスやシュートでチャンスを作る。', RMD: 'スペースを見つけてゴール前に入り込む得点屋。', WTF: 'サイドで高さを生かしてボールを収める。',
  AF: '最前線で裏を狙い続ける。', CF: '得点もポストプレーもこなす万能型。', P: 'ゴール前で一瞬のチャンスを逃さない点取り屋。',
  TM: '空中戦で前線の起点になる。', F9: '中盤まで下りてきて攻撃を組み立てる。', DLF: '下がってボールを受け、味方を生かす。', PF: '前線から激しくプレスをかける。',
};
function roleDesc(r) { return ROLE_DESC[r] || ''; }

// --- instructions panel -----------------------------------------------------------------
function seg(label, key, opts, val, cls = 'slider5') {
  return `<div class="ti-item"><div class="lb"><span>${label}</span><b>${esc(opts[val])}</b></div>
    <div class="${cls}">${opts.map((o, i) => `<button class="${i === val ? 'on' : ''}" data-a="tTI" data-x="${dx({ k: key, v: i })}" title="${esc(o)}">${opts.length > 5 ? i - 3 : i + 1}</button>`).join('')}</div></div>`;
}
function tri(label, key, val, names = TRI) {
  return `<div class="ti-item"><div class="lb"><span>${label}</span></div><div class="slider3">${names.map((o, i) => `<button class="${i === val ? 'on' : ''}" data-a="tTI" data-x="${dx({ k: key, v: i })}">${esc(o)}</button>`).join('')}</div></div>`;
}
function choice(label, key, map, val) {
  return `<div class="ti-item"><div class="lb"><span>${label}</span></div><div class="slider3">${Object.entries(map).map(([k, n]) => `<button class="${k === val ? 'on' : ''}" data-a="tTIs" data-x="${dx({ k: key, v: k })}">${esc(n)}</button>`).join('')}</div></div>`;
}
function toggle(label, key, val, hint) {
  return `<div class="opt-row" style="padding:8px 0"><div class="lbl">${label}${hint ? `<small>${hint}</small>` : ''}</div>
    <label class="switch"><input type="checkbox" ${val ? 'checked' : ''} data-change="tTIb" data-x="${dx({ k: key })}"><span></span></label></div>`;
}
export function instructionsHTML(ti) {
  return `<div class="ti-group"><h4>メンタリティ</h4>${seg('', 'mentality', MENTALITY, ti.mentality, 'slider7')}</div>
    <div class="ti-group"><h4>攻撃時（ボール保持）</h4>
      ${seg('パスの距離', 'passing', PASSING, ti.passing)}${seg('テンポ', 'tempo', TEMPO, ti.tempo)}${seg('攻撃の幅', 'width', WIDTH, ti.width)}
      ${tri('クロス', 'cross', ti.cross)}${tri('シュート', 'shoot', ti.shoot, ['慎重に', '標準', '積極的に'])}${tri('ドリブル', 'dribble', ti.dribble, ['控える', '標準', '促す'])}
      ${toggle('ペナルティエリアに運ぶ', 'workBox', ti.workBox, '遠目からのシュートを控え、崩しきる')}
      ${toggle('低いクロス', 'lowCross', ti.lowCross, 'グラウンダーのクロスを多用')}
      ${toggle('最終ラインから組み立てる', 'playOut', ti.playOut, 'GK・DFからショートパスでビルドアップ')}</div>
    <div class="ti-group"><h4>トランジション</h4>
      ${choice('ボール奪取時', 'tWin', TRANS_WIN, ti.tWin)}${choice('ボール喪失時', 'tLose', TRANS_LOSE, ti.tLose)}${choice('GKの配球', 'gkDist', GK_DIST, ti.gkDist)}</div>
    <div class="ti-group"><h4>守備時</h4>
      ${seg('守備ラインの高さ', 'line', LEVEL5, ti.line)}${tri('プレス開始位置', 'engage', ti.engage, ENGAGE)}${seg('プレス強度', 'press', LEVEL5, ti.press)}
      ${tri('タックル', 'tackle', ti.tackle, TACKLE)}${tri('守備の幅', 'defWidth', ti.defWidth, DEF_WIDTH)}
      ${toggle('オフサイドトラップ', 'trap', ti.trap, 'ラインを押し上げて相手をオフサイドにかける')}</div>`;
}

function setPiecesHTML(G, c, sel) {
  const xi = sel.xi.map((id) => G.players[id]).filter(Boolean);
  const opt = (key, label, sortKey) => {
    const cur = c.takers[key];
    const sorted = xi.slice().sort((a, b) => b.a[sortKey] - a.a[sortKey]);
    return `<div class="field"><label>${label}</label><select class="inp" data-change="tTaker" data-x="${dx({ k: key })}">
      <option value="">自動（最適な選手）</option>${sorted.map((p) => `<option value="${p.id}" ${cur === p.id ? 'selected' : ''}>${esc(fullName(p))}（${Math.round(p.a[sortKey])}）</option>`).join('')}</select></div>`;
  };
  return `<div class="card-b">${opt('cap', 'キャプテン', 22)}${opt('pen', 'PKキッカー', 11)}${opt('fk', 'フリーキック', 5)}${opt('cor', 'コーナーキック', 0)}</div>`;
}

// --- screen -------------------------------------------------------------------------------
screen('tactics', {
  render() {
    const G = app.G;
    const c = G.clubs[G.userClub];
    const st = ui('tactics', { which: 'd', sel: null, tab: 'xi' });
    const t = c.tactic;
    const sel = ensureSelection(G);
    const fam = Math.round((t.fam || 0) * 100);
    const alts = c.tacticsAlt || [];
    const famTxt = fam >= 85 ? '完璧' : fam >= 70 ? 'かなり浸透' : fam >= 50 ? '浸透中' : fam >= 30 ? '不慣れ' : '未熟';
    const inv = slotPos(t.slots[0]) !== 'GK';
    return `<div class="ph"><h1>戦術</h1><span class="sub">${esc(t.name)} ・ 守備時 ${shapeLabel(t.slots, 'd')} / 攻撃時 ${shapeLabel(t.slots, 'a')}</span></div>
      <div class="row wrap mb8" style="gap:6px">
        <div class="seg"><button class="on">${esc(t.name.slice(0, 14))}</button>${alts.map((a, i) => `<button data-a="tSwitch" data-x="${dx({ i })}">${esc(a.name.slice(0, 10))}</button>`).join('')}</div>
        <button class="btn sm" data-a="tPreset">${icon('list')}フォーメーション</button>
        <button class="btn sm" data-a="tAuto">${icon('refresh')}おまかせ選考</button>
        ${alts.length < 2 ? `<button class="btn sm ghost" data-a="tNew">${icon('plus')}戦術を追加</button>` : ''}
      </div>
      <div class="tac-layout">
        <div class="col gap12">
          <div class="card"><div class="card-b" style="padding:10px">
            <div class="row mb8" style="justify-content:space-between">
              <div class="seg"><button class="${st.which === 'd' ? 'on' : ''}" data-a="tWhich" data-x="${dx({ w: 'd' })}">守備時の形</button><button class="${st.which === 'a' ? 'on' : ''}" data-a="tWhich" data-x="${dx({ w: 'a' })}">攻撃時の形</button></div>
              <div class="small dim">浸透度 <b>${famTxt}</b></div>
            </div>
            ${pitchHTML(G, t, sel, st.which, st.sel)}
            <div class="bar mt8"><i style="width:${fam}%"></i></div>
            <p class="tiny dim" style="margin:6px 0 0">選手をドラッグ：ポジション移動 ／ 選手の上に重ねる：入れ替え ／ タップ：役割の変更${inv ? ' <span class="bad">※GKが配置されていません</span>' : ''}</p>
          </div></div>
        </div>
        <div class="col gap12">
          ${st.sel !== null && st.sel !== undefined && t.slots[st.sel] ? slotPanel(G, t, sel, st.sel) : ''}
          <div class="tabs" style="margin:0">${[['xi', 'メンバー'], ['ti', 'チーム指示'], ['sp', 'セットプレー']].map(([k, n]) => `<button class="tab ${st.tab === k ? 'on' : ''}" data-a="tTab" data-x="${dx({ k })}">${n}</button>`).join('')}</div>
          ${st.tab === 'xi' ? benchHTML(G, sel) : st.tab === 'ti' ? `<div class="card">${instructionsHTML(t.ti)}</div>` : `<div class="card"><div class="card-h">セットプレーのキッカー</div>${setPiecesHTML(G, c, sel)}</div>`}
        </div>
      </div>`;
  },
  mount(root) { bindPitch(root); bindBench(root); },
});

// --- drag & drop -----------------------------------------------------------------------------
function nearestCell(px, py, which, t, ignore) {
  let best = null, bd = 1e9;
  for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) {
    if (!validCell(r, c)) continue;
    const p = cellPct(r, c, 2);
    const d = (p.x - px) ** 2 + ((p.y - py) * 0.68) ** 2;
    if (d < bd) { bd = d; best = { r, c }; }
  }
  void which; void t; void ignore;
  return bd < 220 ? best : null;
}
function tokAt(root, x, y, except) {
  const toks = Array.from(root.querySelectorAll('.tok'));
  for (const tk of toks) {
    if (tk === except) continue;
    const b = tk.querySelector('.shirt').getBoundingClientRect();
    if (x >= b.left - 10 && x <= b.right + 10 && y >= b.top - 10 && y <= b.bottom + 18) return tk;
  }
  return null;
}

function bindPitch(root) {
  const pitch = root.querySelector('#pitch');
  if (!pitch) return;
  const G = app.G;
  const c = G.clubs[G.userClub];
  const which = pitch.dataset.which;
  pitch.addEventListener('pointerdown', (ev) => {
    const tok = ev.target.closest('.tok');
    if (!tok) return;
    ev.preventDefault();
    const i = Number(tok.dataset.i);
    const rect = pitch.getBoundingClientRect();
    const sx = ev.clientX, sy = ev.clientY;
    let dragging = false;
    let hotCell = null, hotTok = null;
    tok.setPointerCapture(ev.pointerId);
    const move = (e) => {
      const dxp = e.clientX - sx, dyp = e.clientY - sy;
      if (!dragging && Math.hypot(dxp, dyp) > 7) { dragging = true; tok.classList.add('drag'); pitch.classList.add('dragging'); }
      if (!dragging) return;
      const px = (e.clientX - rect.left) / rect.width * 100, py = (e.clientY - rect.top) / rect.height * 100;
      tok.style.left = px + '%'; tok.style.top = py + '%';
      pitch.querySelectorAll('.cell.hot').forEach((x) => x.classList.remove('hot'));
      hotTok = tokAt(pitch, e.clientX, e.clientY, tok);
      hotCell = hotTok ? null : nearestCell(px, py, which, c.tactic, i);
      if (hotCell) { const el = pitch.querySelector(`.cell[data-r="${hotCell.r}"][data-c="${hotCell.c}"]`); if (el) el.classList.add('hot'); }
    };
    const up = () => {
      tok.removeEventListener('pointermove', move);
      tok.removeEventListener('pointerup', up);
      tok.removeEventListener('pointercancel', up);
      pitch.classList.remove('dragging');
      if (!dragging) { const st = ui('tactics'); st.sel = st.sel === i ? null : i; refresh(); return; }
      if (hotTok) swapSlots(G, i, Number(hotTok.dataset.i));
      else if (hotCell) moveSlot(G, i, which, hotCell.r, hotCell.c);
      refresh();
    };
    tok.addEventListener('pointermove', move);
    tok.addEventListener('pointerup', up);
    tok.addEventListener('pointercancel', up);
  });
}

function bindBench(root) {
  const G = app.G;
  const pitch = root.querySelector('#pitch');
  root.querySelectorAll('.bench-i').forEach((row) => {
    row.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('button')) return;
      const pid = Number(row.dataset.pid);
      const sx = ev.clientX, sy = ev.clientY;
      let ghost = null, dragging = false, hot = null;
      row.setPointerCapture(ev.pointerId);
      const move = (e) => {
        if (!dragging && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) {
          dragging = true;
          const p = G.players[pid];
          ghost = document.createElement('div');
          ghost.className = 'tok drag';
          ghost.style.cssText = 'position:fixed;z-index:200;pointer-events:none;transform:translate(-50%,-50%);margin:0';
          ghost.innerHTML = `<div class="shirt" style="background:#5b8cff;color:#fff">${p.no || ''}</div><div class="nm">${esc(p.ln)}</div>`;
          document.body.appendChild(ghost);
        }
        if (!dragging) return;
        e.preventDefault();
        ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
        if (pitch) {
          pitch.querySelectorAll('.tok').forEach((t) => t.classList.remove('sel'));
          hot = tokAt(pitch, e.clientX, e.clientY, null);
          if (hot) hot.classList.add('sel');
        }
      };
      const up = () => {
        row.removeEventListener('pointermove', move);
        row.removeEventListener('pointerup', up);
        row.removeEventListener('pointercancel', up);
        if (ghost) ghost.remove();
        if (!dragging) {
          // tap: if a slot is selected put this player there
          const st = ui('tactics');
          if (st.sel !== null && st.sel !== undefined) { putPlayer(G, st.sel, pid); refresh(); }
          else { app.stack.push({ name: 'player', params: { id: pid } }); refresh(); }
          return;
        }
        if (hot) { putPlayer(G, Number(hot.dataset.i), pid); refresh(); }
      };
      row.addEventListener('pointermove', move, { passive: false });
      row.addEventListener('pointerup', up);
      row.addEventListener('pointercancel', up);
    });
  });
}

function swapSlots(G, a, b) {
  const c = G.clubs[G.userClub];
  const sel = ensureSelection(G);
  [sel.xi[a], sel.xi[b]] = [sel.xi[b], sel.xi[a]];
  c.sel = sel;
}
function moveSlot(G, i, which, r, col) {
  const c = G.clubs[G.userClub];
  const t = c.tactic;
  const other = t.slots.findIndex((s, j) => j !== i && s[which][0] === r && s[which][1] === col);
  if (r === 0 && slotPos(t.slots[i]) !== 'GK' && other < 0) { toast('GKの位置には1人だけ配置できます'); return; }
  if (other >= 0) {
    // swap the two positions
    const tmp = t.slots[i][which];
    t.slots[i][which] = t.slots[other][which];
    t.slots[other][which] = tmp;
  } else t.slots[i][which] = [r, col];
  if (which === 'd') {
    // the out-of-possession cell defines the position: keep roles valid
    for (const s of [t.slots[i], other >= 0 ? t.slots[other] : null]) {
      if (!s) continue;
      const pos = slotPos(s);
      if (!rolesFor(pos).includes(s.role)) { s.role = defaultRole(pos); s.duty = ROLES[s.role].d[Math.min(1, ROLES[s.role].d.length - 1)]; }
    }
  }
  t.name = customName(t);
  t.fam = Math.max(0.2, (t.fam || 0.6) - 0.04);
}
function customName(t) { return t.name.includes('カスタム') ? t.name : `${shapeLabel(t.slots, 'd')} カスタム`; }
function putPlayer(G, i, pid) {
  const c = G.clubs[G.userClub];
  const sel = ensureSelection(G);
  const prev = sel.xi[i];
  const inXI = sel.xi.indexOf(pid);
  if (inXI >= 0) { sel.xi[inXI] = prev; sel.xi[i] = pid; return; }
  sel.bench = sel.bench.filter((x) => x !== pid);
  sel.xi[i] = pid;
  if (prev && sel.bench.length < 9) sel.bench.push(prev);
  c.sel = sel;
}

// --- actions --------------------------------------------------------------------------------
action('tWhich', ({ w }) => { ui('tactics').which = w; refresh(); });
action('tTab', ({ k }) => { ui('tactics').tab = k; refresh(); });
action('tDeselect', () => { ui('tactics').sel = null; refresh(); });
action('tRole', ({ i, r }) => {
  const t = app.G.clubs[app.G.userClub].tactic;
  t.slots[i].role = r;
  if (!ROLES[r].d.includes(t.slots[i].duty)) t.slots[i].duty = ROLES[r].d[Math.min(1, ROLES[r].d.length - 1)];
  refresh();
});
action('tDuty', ({ i, d }) => { app.G.clubs[app.G.userClub].tactic.slots[i].duty = d; refresh(); });
action('tPut', ({ i, id }) => { putPlayer(app.G, i, id); refresh(); });
action('tTI', ({ k, v }) => { const t = app.G.clubs[app.G.userClub].tactic; t.ti[k] = v; refresh(); });
action('tTIs', ({ k, v }) => { const t = app.G.clubs[app.G.userClub].tactic; t.ti[k] = v; refresh(); });
action('tTIb', ({ k }, ev) => { const t = app.G.clubs[app.G.userClub].tactic; t.ti[k] = ev.target.checked; });
action('tTaker', ({ k }, ev) => { const c = app.G.clubs[app.G.userClub]; c.takers[k] = ev.target.value ? Number(ev.target.value) : null; });
action('tBenchRemove', ({ id }) => { const sel = ensureSelection(app.G); sel.bench = sel.bench.filter((x) => x !== id); refresh(); });
action('tBenchAdd', ({ id }) => {
  const sel = ensureSelection(app.G);
  if (sel.bench.length >= 9) { toast('控えは最大9人です'); return; }
  sel.bench.push(id); refresh();
});
action('tAuto', async () => {
  const G = app.G;
  const c = G.clubs[G.userClub];
  const l = pickLineup(squad(G, c.id), c.tactic, { day: G.day, bench: 9 });
  c.sel = { xi: l.xi, bench: l.bench };
  toast('アシスタントがメンバーを選びました', 'good');
  refresh();
});
action('tPreset', () => {
  const G = app.G;
  openModal(`<div class="modal-h"><h2>フォーメーション</h2><button class="icon-btn" data-a="closeModal">${icon('close')}</button></div>
    <div class="modal-b" style="padding:0">${FORMATION_IDS.map((id) => {
      const f = FORMATIONS[id];
      const t = makeTactic(id);
      return `<div class="list-i click" data-a="tApplyPreset" data-x="${dx({ id })}"><div class="grow"><b>${esc(f.n)}</b><div class="small dim">${esc(f.desc)}</div>
        <div class="tiny mute">守備時 ${shapeLabel(t.slots, 'd')} ／ 攻撃時 ${shapeLabel(t.slots, 'a')}</div></div>${icon('play', 'width="18"')}</div>`;
    }).join('')}</div>`);
  void G;
});
action('tApplyPreset', async ({ id }) => {
  const G = app.G;
  const c = G.clubs[G.userClub];
  const ok = await confirmBox('フォーメーション変更', `${FORMATIONS[id].n}に変更します。チーム指示は維持されます。新しい形に慣れるまで浸透度が下がります。`, '変更する');
  if (!ok) return;
  closeModal();
  const t = makeTactic(id);
  t.ti = { ...c.tactic.ti };
  t.fam = Math.max(0.25, (c.tactic.fam || 0.6) * (c.tactic.formation === id ? 1 : 0.55));
  c.tactic = t;
  const l = pickLineup(squad(G, c.id), t, { day: G.day, bench: 9 });
  c.sel = { xi: l.xi, bench: l.bench };
  ui('tactics').sel = null;
  refresh();
});
action('tNew', () => {
  const G = app.G;
  const c = G.clubs[G.userClub];
  c.tacticsAlt = c.tacticsAlt || [];
  const copy = JSON.parse(JSON.stringify(c.tactic));
  copy.name = `戦術${c.tacticsAlt.length + 2}`;
  copy.fam = Math.max(0.3, (copy.fam || 0.6) * 0.8);
  c.tacticsAlt.push(copy);
  toast('戦術のコピーを追加しました（試合中の切り替えに使えます）');
  refresh();
});
action('tSwitch', ({ i }) => {
  const G = app.G;
  const c = G.clubs[G.userClub];
  const alt = c.tacticsAlt[i];
  c.tacticsAlt[i] = c.tactic;
  c.tactic = alt;
  c.sel = null;
  ensureSelection(G);
  ui('tactics').sel = null;
  refresh();
});
void ROW_NX; void COL_NY; void cellPos; void famMul; void LINE_OF; void attr;
