// ---------------------------------------------------------------------------
// hud.js : the broadcast overlay. DOM, not canvas -- the type stays crisp
// even when the 3D buffer is being rendered at 60% scale on a hot phone, and
// it costs the GPU nothing.
// ---------------------------------------------------------------------------
import { PITCH } from '../core/config.js';
import { fmtClock, clamp01 } from '../core/util.js';

export function createHud(root) {
  const q = (s) => root.querySelector(s);
  const el = {
    hud: q('#hud'),
    homeAbbr: q('#sbHomeAbbr'), awayAbbr: q('#sbAwayAbbr'),
    homeKit: q('#sbHomeKit'), awayKit: q('#sbAwayKit'),
    score: q('#sbScore'), clock: q('#sbClock'), half: q('#sbHalf'),
    sub: q('#sbSub'),
    radar: q('#radarCv'),
    pcard: q('#pcard'), pnum: q('#pcNum'), pname: q('#pcName'),
    sta: q('#pcSta'), ctrl: q('#pcCtrl'),
    toast: q('#toast'), toastBig: q('#toastBig'), toastSub: q('#toastSub'),
    notice: q('#notice'), noticeText: q('#noticeText'),
    replay: q('#replayTag'),
    fps: q('#fpsTag'),
  };
  const rc = el.radar.getContext('2d');
  let rw = 0, rh = 0;

  const state = {
    toastUntil: 0, noticeUntil: 0, lastGoal: -99, lastNotice: '',
    shownScore: '', shownClock: '', noticeIdx: 0,
  };

  function setTeams(world) {
    state.noticeIdx = world.notices.length;
    const h = world.teams[0], a = world.teams[1];
    el.homeAbbr.textContent = h.club.abbr;
    el.awayAbbr.textContent = a.club.abbr;
    el.homeKit.style.background = `linear-gradient(180deg,${h.kit === 1 ? h.club.away1 : h.club.c1},${h.kit === 1 ? h.club.away2 : h.club.c2})`;
    el.awayKit.style.background = `linear-gradient(180deg,${a.kit === 1 ? a.club.away1 : a.club.c1},${a.kit === 1 ? a.club.away2 : a.club.c2})`;
  }

  function show(on) { el.hud.classList.toggle('on', !!on); }

  function toast(big, sub, secs = 2.4) {
    el.toastBig.textContent = big;
    el.toastSub.textContent = sub || '';
    el.toast.classList.add('on');
    state.toastUntil = performance.now() / 1000 + secs;
  }
  function notice(text, kind = '') {
    if (text === state.lastNotice && el.notice.classList.contains('on')) return;
    state.lastNotice = text;
    el.noticeText.textContent = text;
    el.notice.className = `notice on ${kind}`;
    state.noticeUntil = performance.now() / 1000 + 2.6;
  }

  function drawRadar(world) {
    const cv = el.radar;
    const w = cv.clientWidth, h = cv.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (rw !== w || rh !== h) {
      rw = w; rh = h;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    rc.setTransform(dpr, 0, 0, dpr, 0, 0);
    rc.clearRect(0, 0, w, h);
    const pad = 4;
    const sx = (w - pad * 2) / PITCH.length;
    const sy = (h - pad * 2) / PITCH.width;
    const X = (x) => pad + (x + PITCH.halfL) * sx;
    const Y = (y) => pad + (y + PITCH.halfW) * sy;
    rc.fillStyle = 'rgba(18,54,34,0.55)';
    rc.fillRect(pad, pad, w - pad * 2, h - pad * 2);
    rc.strokeStyle = 'rgba(255,255,255,0.22)';
    rc.lineWidth = 1;
    rc.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    rc.beginPath(); rc.moveTo(X(0), pad); rc.lineTo(X(0), h - pad); rc.stroke();
    rc.beginPath(); rc.arc(X(0), Y(0), PITCH.centreR * sx, 0, Math.PI * 2); rc.stroke();
    for (const s of [-1, 1]) {
      rc.strokeRect(X(s * PITCH.halfL) - (s > 0 ? PITCH.boxDepth * sx : 0),
        Y(-PITCH.boxHalfW), PITCH.boxDepth * sx, PITCH.boxHalfW * 2 * sy);
    }
    for (const p of world.players) {
      if (p.sentOff) continue;
      const t = world.teams[p.team];
      rc.fillStyle = t.kit === 1 ? t.club.away1 : t.club.c1;
      rc.beginPath();
      rc.arc(X(p.x), Y(p.y), p.user ? 2.9 : 1.9, 0, Math.PI * 2);
      rc.fill();
      if (p.user) {
        rc.strokeStyle = '#eafff4'; rc.lineWidth = 1.2; rc.stroke();
      }
    }
    const b = world.ball;
    rc.fillStyle = '#ffffff';
    rc.beginPath(); rc.arc(X(b.x), Y(b.y), 1.6, 0, Math.PI * 2); rc.fill();
  }

  let radarAcc = 0;
  function update(world, opts = {}) {
    const now = performance.now() / 1000;
    const dt = opts.dt || 0.016;

    // --- scoreboard ---------------------------------------------------
    const sc = `${world.teams[0].score} <em>-</em> ${world.teams[1].score}`;
    if (sc !== state.shownScore) { el.score.innerHTML = sc; state.shownScore = sc; }
    const clk = fmtClock(world.played);
    if (clk !== state.shownClock) { el.clock.textContent = clk; state.shownClock = clk; }
    el.half.textContent = world.half === 1 ? '1ST' : '2ND';

    const restart = world.restart && world.restart.kind;
    let subText = '';
    if (world.phase === 'halftime') subText = 'ハーフタイム';
    else if (world.phase === 'fulltime') subText = 'フルタイム';
    else if (world.addedTime > 0 && world.played > world.halfTime * world.half - 1) {
      subText = `+${Math.ceil(world.addedTime / 60)}`;
    } else if (restart && world.phase === 'deadball') {
      subText = ({
        kickoff: 'キックオフ', throwin: 'スローイン', corner: 'コーナーキック',
        goalkick: 'ゴールキック', freekick: 'フリーキック', penalty: 'ペナルティキック',
      })[restart] || '';
    }
    el.sub.textContent = subText;
    el.sub.classList.toggle('on', !!subText);

    // --- player card --------------------------------------------------
    const up = world.user && world.user.player;
    if (up && !opts.replay) {
      el.pcard.classList.add('on');
      el.pnum.textContent = up.shirt;
      el.pname.textContent = up.name;
      const t = world.teams[up.team];
      const c1 = t.kit === 1 ? t.club.away1 : t.club.c1;
      const c2 = t.kit === 1 ? t.club.away2 : t.club.c2;
      el.pnum.style.background = `linear-gradient(180deg,${c2},${c1})`;
      el.pnum.style.color = '#0a1119';
      const sta = clamp01(up.stamina);
      el.sta.style.width = `${(sta * 100).toFixed(0)}%`;
      el.sta.parentElement.classList.toggle('low', sta < 0.3);
      el.ctrl.style.width = `${(clamp01(up.k.dribble * 0.5 + up.k.pass * 0.5) * 100).toFixed(0)}%`;
    } else {
      el.pcard.classList.remove('on');
    }

    // --- toasts -------------------------------------------------------
    if (world.phase === 'goal' && state.lastGoal !== world.t && world.phaseT < 0.4) {
      state.lastGoal = world.t;
      const g = world.lastGoal;
      const scorer = g && g.scorer ? g.scorer.name : '';
      toast('GOAL', scorer ? `${scorer}  ${world.teams[0].score} - ${world.teams[1].score}` : '', 3.2);
    }
    if (world.phase === 'halftime' && world.phaseT < 0.3) toast('HALF TIME', `${world.teams[0].score} - ${world.teams[1].score}`, 2.6);
    if (el.toast.classList.contains('on') && now > state.toastUntil) el.toast.classList.remove('on');

    // notices come straight from the rules engine; only read the new ones
    while (state.noticeIdx < world.notices.length) {
      const n = world.notices[state.noticeIdx++];
      if (n.until > world.t) {
        notice(n.text, n.kind === 'bad' ? 'bad' : n.kind === 'warn' ? 'warn' : '');
      }
    }
    if (el.notice.classList.contains('on') && now > state.noticeUntil) {
      el.notice.classList.remove('on');
      state.lastNotice = '';
    }

    el.replay.classList.toggle('on', !!opts.replay);

    // --- radar (20 Hz is plenty) --------------------------------------
    radarAcc += dt;
    if (opts.radar !== false && radarAcc > 0.05) {
      radarAcc = 0;
      el.radar.parentElement.style.display = '';
      drawRadar(world);
    } else if (opts.radar === false) {
      el.radar.parentElement.style.display = 'none';
    }
  }

  function setFps(text) {
    if (!text) { el.fps.classList.add('hidden'); return; }
    el.fps.classList.remove('hidden');
    el.fps.textContent = text;
  }

  return { setTeams, update, toast, notice, show, setFps, el };
}
