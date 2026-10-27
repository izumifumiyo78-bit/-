// ---------------------------------------------------------------------------
// ui.js : the DOM shell — title, match setup, pause, settings, result.
// ---------------------------------------------------------------------------
import { TEAMS, teamById, teamRating, squadFor } from '../data/teams.js';
import { FORMATIONS, defaultFormation } from '../data/formations.js';
import { DIFFICULTY, MATCH_LENGTHS } from '../core/config.js';
import { clamp } from '../core/util.js';

const $ = (s) => document.querySelector(s);
const SCREENS = ['boot', 'title', 'setup', 'pause', 'settings', 'howto', 'install', 'result'];

export function createUI(hooks) {
  const cfg = loadCfg();
  const ui = {
    cfg,
    screen: 'boot',
    show(name) {
      for (const s of SCREENS) {
        const el = document.getElementById('s-' + s);
        if (el) el.classList.toggle('hidden', s !== name);
      }
      ui.screen = name || 'none';
      if (!name) for (const s of SCREENS) document.getElementById('s-' + s)?.classList.add('hidden');
    },
    hide() { ui.show(null); },
  };

  // ── team grids ────────────────────────────────────────────────
  const crestHtml = (t) =>
    `<span class="crest" style="background:linear-gradient(135deg,${t.c1} 0 55%,${t.c2} 55% 100%)"></span>`;
  function buildGrid(el, which) {
    el.innerHTML = '';
    for (const t of TEAMS) {
      const b = document.createElement('button');
      b.className = 'tcard';
      b.type = 'button';
      b.dataset.id = t.id;
      b.innerHTML = `${crestHtml(t)}<span><span class="tname">${t.name}</span>
        <span class="trate">OVR ${teamRating(t.id)}</span></span>`;
      b.addEventListener('click', () => {
        if (which === 'home') {
          cfg.home = t.id;
          if (cfg.away === t.id) cfg.away = TEAMS.find((x) => x.id !== t.id).id;
          cfg.homeFormation = defaultFormation(t.style);
        } else {
          cfg.away = t.id;
          if (cfg.home === t.id) cfg.home = TEAMS.find((x) => x.id !== t.id).id;
        }
        cfg.awayFormation = defaultFormation(teamById(cfg.away).style);
        syncSetup();
        hooks.sfx?.('ui');
      });
      el.appendChild(b);
    }
  }
  buildGrid($('#gridHome'), 'home');
  buildGrid($('#gridAway'), 'away');

  // ── option lists ──────────────────────────────────────────────
  function buildOpts(el, items, get, set, render) {
    el.innerHTML = '';
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = el.classList.contains('chips') ? 'chip' : 'opt';
      b.dataset.v = it.v;
      b.innerHTML = render(it);
      b.addEventListener('click', () => { set(it.v); syncSetup(); hooks.sfx?.('ui'); });
      el.appendChild(b);
    }
  }
  buildOpts($('#formList'), FORMATIONS.map((f) => ({ v: f.id, f })),
    () => cfg.homeFormation, (v) => { cfg.homeFormation = v; },
    (it) => `${it.f.name}<span class="sub">${it.f.desc}</span>`);
  buildOpts($('#diffList'), DIFFICULTY.map((d) => ({ v: d.id, d })),
    () => cfg.difficulty, (v) => { cfg.difficulty = v; },
    (it) => `${it.d.name}<span class="sub">${it.d.en}</span>`);
  buildOpts($('#lenList'), MATCH_LENGTHS.map((m) => ({ v: m })),
    () => cfg.halfMinutes, (v) => { cfg.halfMinutes = v; },
    (it) => `${it.v}分`);
  buildOpts($('#themeList'), [
    { v: 'night', n: 'ナイター' }, { v: 'day', n: 'デイゲーム' }, { v: 'dusk', n: '夕暮れ' },
  ], () => cfg.theme, (v) => { cfg.theme = v; }, (it) => it.n);

  function syncSetup() {
    for (const [sel, id] of [['#gridHome', cfg.home], ['#gridAway', cfg.away]]) {
      document.querySelectorAll(`${sel} .tcard`).forEach((b) =>
        b.classList.toggle('sel', b.dataset.id === id));
    }
    const mark = (sel, val) => document.querySelectorAll(`${sel} > *`).forEach((b) =>
      b.classList.toggle('sel', b.dataset.v === String(val)));
    mark('#formList', cfg.homeFormation);
    mark('#diffList', cfg.difficulty);
    mark('#lenList', cfg.halfMinutes);
    mark('#themeList', cfg.theme);
    const h = teamById(cfg.home), aw = teamById(cfg.away);
    $('#vsHome').innerHTML = `${crestHtml(h)}<span>${h.name}<br><span class="trate">${h.en} · OVR ${teamRating(h.id)}</span></span>`;
    $('#vsAway').innerHTML = `<span>${aw.name}<br><span class="trate">${aw.en} · OVR ${teamRating(aw.id)}</span></span>${crestHtml(aw)}`;
    saveCfg(cfg);
  }

  // ── settings widgets ──────────────────────────────────────────
  const bindCheck = (sel, key) => {
    const el = $(sel);
    el.checked = !!cfg[key];
    el.addEventListener('change', () => { cfg[key] = el.checked; saveCfg(cfg); hooks.onSettings?.(cfg); });
  };
  const bindSelect = (sel, key, cast = Number) => {
    const el = $(sel);
    el.value = String(cfg[key]);
    el.addEventListener('change', () => { cfg[key] = cast(el.value); saveCfg(cfg); hooks.onSettings?.(cfg); });
  };
  bindCheck('#optSound', 'sound');
  bindCheck('#optRadar', 'radar');
  bindCheck('#optReplay', 'replay');
  bindSelect('#optQuality', 'quality');
  bindSelect('#optAssist', 'assist');
  bindSelect('#optHud', 'hud');

  // ── navigation ────────────────────────────────────────────────
  document.querySelectorAll('[data-go]').forEach((b) => {
    b.addEventListener('click', () => {
      const to = b.dataset.go;
      hooks.sfx?.('ui');
      if (to === 'setup') { syncSetup(); ui.show('setup'); }
      else if (to === 'settings') { ui.prevScreen = ui.screen; ui.show('settings'); }
      else ui.show(to);
    });
  });
  $('#settingsClose').addEventListener('click', () => { hooks.sfx?.('ui'); ui.show(ui.prevScreen === 'pause' ? 'pause' : 'title'); });
  $('#howtoClose').addEventListener('click', () => { hooks.sfx?.('ui'); ui.show('title'); });
  $('#installClose').addEventListener('click', () => { hooks.sfx?.('ui'); ui.show('title'); });
  $('#kickoff').addEventListener('click', () => { hooks.sfx?.('uiBig'); hooks.onKickoff?.({ ...cfg }); });
  $('#resume').addEventListener('click', () => { hooks.sfx?.('ui'); hooks.onResume?.(); });
  $('#restart').addEventListener('click', () => { hooks.sfx?.('uiBig'); hooks.onKickoff?.({ ...cfg }); });
  $('#quit').addEventListener('click', () => { hooks.sfx?.('ui'); hooks.onQuit?.(); ui.show('title'); });
  $('#rematch').addEventListener('click', () => { hooks.sfx?.('uiBig'); hooks.onKickoff?.({ ...cfg }); });
  $('#toSetup').addEventListener('click', () => { hooks.sfx?.('ui'); syncSetup(); ui.show('setup'); });
  $('#toTitle').addEventListener('click', () => { hooks.sfx?.('ui'); hooks.onQuit?.(); ui.show('title'); });

  ui.syncSetup = syncSetup;
  syncSetup();
  return ui;
}

// ---------------------------------------------------------------------------
export function showResult(world) {
  const [A, B] = world.teams;
  const pos = A.stats.possSec + B.stats.possSec || 1;
  document.getElementById('ftScore').innerHTML =
    `${A.club.name} <b>${A.score}</b> – <b>${B.score}</b> ${B.club.name}`;
  const rows = [
    ['ポゼッション', `${Math.round(A.stats.possSec / pos * 100)}%`, `${Math.round(B.stats.possSec / pos * 100)}%`],
    ['シュート', A.stats.shots, B.stats.shots],
    ['セーブ', A.stats.saves, B.stats.saves],
    ['パス成功', `${A.stats.passOk}/${A.stats.passes}`, `${B.stats.passOk}/${B.stats.passes}`],
    ['パス成功率', pct(A.stats.passOk, A.stats.passes), pct(B.stats.passOk, B.stats.passes)],
    ['タックル', A.stats.tackles, B.stats.tackles],
    ['ファウル', A.stats.fouls, B.stats.fouls],
    ['オフサイド', A.stats.offsides, B.stats.offsides],
    ['カード', `${A.stats.yellow}🟨 ${A.stats.red}🟥`, `${B.stats.yellow}🟨 ${B.stats.red}🟥`],
  ];
  document.getElementById('ftStats').innerHTML = rows
    .map(([k, a, b]) => `<tr><td>${a}</td><td>${k}</td><td>${b}</td></tr>`).join('');
  const sc = [];
  for (const t of world.teams) {
    for (const p of t.players.concat(t.bench ? [] : [])) {
      if (p.stats.goals > 0) sc.push(`${t.club.abbr} #${p.shirt} ${p.name} ×${p.stats.goals}`);
    }
  }
  document.getElementById('ftScorers').innerHTML = sc.length
    ? '<b>得点者</b><br>' + sc.join('<br>') : '';
}
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');

// ---------------------------------------------------------------------------
const KEY = 'pitch26.cfg.v1';
function loadCfg() {
  const base = {
    home: 'AUR', away: 'IRO', homeFormation: '433', awayFormation: '442',
    difficulty: 'pro', halfMinutes: 4, theme: 'night',
    sound: true, radar: true, replay: true,
    quality: 1, assist: 0.6, hud: 1, userTeam: 0,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(base, JSON.parse(raw));
  } catch { /* storage may be blocked */ }
  if (!TEAMS.some((t) => t.id === base.home)) base.home = 'AUR';
  if (!TEAMS.some((t) => t.id === base.away)) base.away = 'IRO';
  if (base.home === base.away) base.away = TEAMS.find((t) => t.id !== base.home).id;
  base.halfMinutes = clamp(Number(base.halfMinutes) || 4, 1, 20);
  return base;
}
export function saveCfg(cfg) {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}
