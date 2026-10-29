// ---------------------------------------------------------------------------
// scene.js : the renderer. Owns the WebGL2 context, the frame graph and the
// bridge from the simulation's numbers to the picture on screen.
//
// Frame graph
//   turf map      -> accumulate studs/slides (ping-pong RT)
//   shadow pass   -> three's directional shadow map (ours is the only light)
//   planar mirror -> half-res reflection of the stadium for wet ground
//   main pass     -> HDR scene + depth
//   post chain    -> volumetrics/contact shadows, SSR, bloom, grade, AA
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { BALL } from '../core/config.js';
import { clamp, clamp01, damp } from '../core/util.js';
import { createEnv, PRESETS } from './env.js';
import { createSky } from './sky.js';
import { createTurfMap } from './turfmap.js';
import { createPitch } from './pitch.js';
import { createGrass } from './grass.js';
import { createStadium } from './stadium.js';
import { createCrowd } from './crowd.js';
import { createFloodlights, createLedBoards } from './lights.js';
import { createGoals } from './goal.js';
import { createPlayers } from './players.js';
import { createBall } from './ball.js';
import { createParticles, createRain, createBallTrail, PT } from './particles.js';
import { createIndicator } from './indicator.js';
import { createPost } from './post.js';

/** Guess what this device can take. The adaptive controller refines it. */
export function detectTier(renderer) {
  const gl = renderer.getContext();
  let name = '';
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) name = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
  } catch { /* some browsers hide this */ }
  const n = name.toLowerCase();
  const mobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
  const mem = navigator.deviceMemory || (navigator.hardwareConcurrency >= 8 ? 8 : 4);
  // Known-fast mobile parts (ROG Phone 6 is an Adreno 730) get the full look.
  const fastMobile = /adreno\s*(7[2-9]\d|8\d\d)|apple\s*(a1[5-9]|m[1-9])|mali-g(7[0-9]|8\d|9\d)/.test(n);
  const swiftshader = /swiftshader|software|llvmpipe/.test(n);
  if (swiftshader) return 0;
  if (!mobile) return mem >= 8 ? 2 : 1;
  return fastMobile ? 2 : (mem >= 6 ? 1 : 0);
}

export function createRenderer(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    stencil: false,
    depth: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setPixelRatio(1);                       // we scale by hand
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;  // we apply sRGB in post
  renderer.toneMapping = THREE.NoToneMapping;      // ours is in the composite
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // we may render the scene twice a frame (mirror + main); the shadow map only
  // needs to be built once, so we drive it by hand
  renderer.shadowMap.autoUpdate = false;
  renderer.autoClear = true;
  renderer.setClearColor(0x000000, 1);
  let tier = opts.tier !== undefined ? opts.tier : detectTier(renderer);
  if (opts.tierCap !== undefined) tier = Math.min(tier, opts.tierCap);
  return { renderer, tier };
}

export function createScene(canvas, opts = {}) {
  const { renderer, tier } = createRenderer(canvas, opts);
  const caps = { tier, maxTier: tier };
  const env = createEnv();

  const scene = new THREE.Scene();
  scene.matrixWorldAutoUpdate = true;

  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.32, 520);
  camera.up.set(0, 0, 1);

  // --- the one light that casts: our sun (or moon) ------------------------
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  const shadowSize = tier >= 2 ? 4096 : tier >= 1 ? 2048 : 1024;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = tier >= 2 ? 3.2 : 2.0;
  const halfX = tier >= 2 ? 96 : tier >= 1 ? 78 : 46;
  const halfY = tier >= 2 ? 78 : tier >= 1 ? 60 : 34;
  sun.shadow.camera.left = -halfX;
  sun.shadow.camera.right = halfX;
  sun.shadow.camera.top = halfY;
  sun.shadow.camera.bottom = -halfY;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 420;
  sun.shadow.camera.up.set(0, 0, 1);
  scene.add(sun);
  scene.add(sun.target);

  // --- world --------------------------------------------------------------
  const sky = createSky(env);
  scene.add(sky.mesh);

  const turf = createTurfMap(renderer, tier >= 2 ? 2048 : tier >= 1 ? 1024 : 512);
  const pitch = createPitch(env, turf, { tier });
  scene.add(pitch.mesh);

  const grass = createGrass(env, turf, { tier });
  if (grass.mesh) scene.add(grass.mesh);

  const stadium = createStadium(env, { tier, roofShadow: tier >= 1 });
  scene.add(stadium.group);

  const crowd = createCrowd(env, { tier });
  scene.add(crowd.mesh);

  const flood = createFloodlights(env, { tier, shafts: tier >= 1 });
  scene.add(flood.group);
  env.setTowers(flood.towers, env.floodLevel);

  const led = createLedBoards(env);
  scene.add(led.mesh);

  const goals = createGoals(env, { tier });
  scene.add(goals.group);

  const players = createPlayers(env, { tier });
  scene.add(players.group);

  const ball = createBall(env, { tier });
  scene.add(ball.mesh);

  const indicator = createIndicator(env);
  scene.add(indicator.mesh);

  const fx = createParticles(env, { tier });
  scene.add(fx.mesh);
  const rain = createRain(env, { tier });
  scene.add(rain.mesh);
  const trail = createBallTrail(env);
  scene.add(trail.mesh);

  const post = createPost(renderer, env, { tier });

  // --- planar reflection --------------------------------------------------
  const reflectCam = new THREE.PerspectiveCamera(32, 16 / 9, 0.32, 520);
  reflectCam.up.set(0, 0, -1);
  const reflectRT = new THREE.WebGLRenderTarget(2, 2, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
  });
  const reflectVP = new THREE.Matrix4();
  let reflectOn = false;

  // --- sizing -------------------------------------------------------------
  let cssW = 1, cssH = 1, scale = 1, dpr = 1;
  function setSize(w, h, pixelRatio, renderScale) {
    cssW = Math.max(2, w); cssH = Math.max(2, h);
    dpr = pixelRatio; scale = renderScale;
    const bw = Math.max(2, Math.round(cssW * dpr * scale));
    const bh = Math.max(2, Math.round(cssH * dpr * scale));
    renderer.setSize(bw, bh, false);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    post.setSize(bw, bh);
    const rw = Math.max(2, Math.round(bw * (tier >= 2 ? 0.5 : 0.34)));
    const rh = Math.max(2, Math.round(bh * (tier >= 2 ? 0.5 : 0.34)));
    reflectRT.setSize(rw, rh);
    camera.aspect = cssW / cssH;
    camera.updateProjectionMatrix();
  }

  // --- cinematic state ----------------------------------------------------
  const cine = { dof: 0, focus: 24, flash: 0, slowmo: 0, vignette: 0.3, excite: 0.25 };
  let quality = 1;
  const pushers = [];
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const camFwd = new THREE.Vector3();
  const centre = new THREE.Vector3();
  let time = 0;

  function applyCameraPose(cam2d) {
    camPos.set(cam2d.px, cam2d.py, cam2d.pz);
    camTarget.set(cam2d.tx, cam2d.ty, cam2d.tz);
    camera.position.copy(camPos);
    camera.fov = THREE.MathUtils.radToDeg(cam2d.fov);
    camera.updateProjectionMatrix();
    camera.lookAt(camTarget);
    // screen shake, applied as a small rotation so it never breaks the lens
    if (cam2d.shakeX || cam2d.shakeY) {
      const k = 1 / Math.max(cssH, 1) * 1.6;
      camera.rotateY(cam2d.shakeX * k);
      camera.rotateX(-cam2d.shakeY * k);
    }
    camera.updateMatrixWorld(true);
  }

  function fitShadow() {
    // Keep the shadow frustum centred between the ball and the pitch middle so
    // the action always sits in the crisp part of the map.
    const d = env.shadowDir;
    // a near-vertical sun would make lookAt degenerate against a Z up vector
    if (Math.abs(d.z) > 0.86) sun.shadow.camera.up.set(0, 1, 0);
    else sun.shadow.camera.up.set(0, 0, 1);
    sun.target.position.copy(centre);
    sun.position.copy(centre).addScaledVector(d, 190);
    sun.target.updateMatrixWorld();
    sun.updateMatrixWorld();
    sun.shadow.camera.updateProjectionMatrix();
  }

  function setPreset(id) {
    env.setPreset(id);
    env.setTowers(flood.towers, env.floodLevel);
    post.setGrade(env.grade);
    rain.set(env.rain);
    pitch.setDew(id === 'day' ? 0.12 : id === 'dusk' ? 0.22 : 0.05);
    flood.shafts.visible = env.preset.night > 0.2 && tier >= 1;
  }
  setPreset('night');

  const api = {
    THREE,
    renderer, scene, camera, env, post, caps, turf, fx, players, grass, crowd,
    setSize,
    setPreset,
    get tier() { return tier; },
    /** Live quality switch: what we can turn off without rebuilding. */
    setQuality(q) {
      post.enableSSR = tier >= 2 && q >= 1;
      post.enableAir = tier >= 1 && q >= 0.55;
      if (grass.setDensity) grass.setDensity(q >= 1 ? 1 : q >= 0.55 ? 0.65 : 0);
      flood.shafts.visible = env.preset.night > 0.2 && tier >= 1 && q >= 0.55;
      rain.set(env.rain * (q >= 0.55 ? 1 : 0.4));
      post.shared.uMotion.value = q >= 1 ? 1 : q >= 0.55 ? 0.6 : 0;
      quality = q;
    },
    /** Match-level setup: kits, crowd colours, clean turf. */
    setMatch(world) {
      players.setSquads(world);
      const userTeam = world.teams[world.userTeam];
      indicator.setColor(userTeam.kit === 1 ? userTeam.club.away1 : userTeam.club.c1);
      const home = world.teams[0].club, away = world.teams[1].club;
      stadium.setTeams(home, away);
      crowd.setTeams(home, away);
      turf.clear();
      ball.reset();
    },
    /** One frame: advance visuals from the world, then draw. */
    render(world, cam2d, dt, state) {
      time += dt;
      fx.setTime(time);
      const b = world.ball;

      // --- environment -------------------------------------------------
      applyCameraPose(cam2d);
      env.update(dt, time, camera.position);

      // --- cinematic director ------------------------------------------
      // (the confetti itself is fired from the 'goal' event, once)
      const goal = world.phase === 'goal';
      const goalAge = goal ? world.phaseT : 99;
      cine.flash = damp(cine.flash, goal && goalAge < 0.5 ? 0.35 : 0, 6, dt);
      cine.slowmo = damp(cine.slowmo, state === 'replay' ? 1 : goal ? 0.5 : 0, 3, dt);
      // Depth of field is a cinematic, not a permanent lens: a broadcast
      // camera holds the whole pitch sharp. It also costs ~16 taps a pixel,
      // so only the top tier pays for it, and only on replays and goals.
      const dofWant = state === 'replay' ? 0.55 : goal ? 0.42 : 0.0;
      cine.dof = damp(cine.dof, tier >= 2 && quality >= 1 ? dofWant : 0, 2.5, dt);
      cine.focus = damp(cine.focus, camera.position.distanceTo(
        tmpV.set(b.x, b.y, b.z)), 4, dt);
      cine.vignette = damp(cine.vignette, goal || state === 'replay' ? 0.46 : 0.3, 2, dt);
      post.setCinematic(cine);

      // crowd mood: loud near the boxes, delirious after a goal
      const nearBox = clamp01((Math.abs(b.x) - 26) / 20);
      const excite = goal ? 1.25 : state === 'replay' ? 0.7
        : 0.22 + nearBox * 0.55 + clamp01((Math.hypot(b.vx, b.vy) - 14) / 20) * 0.25;
      crowd.update(dt, excite);
      led.update(dt, goal ? 1 : 0);

      // --- turf, grass, nets -------------------------------------------
      centre.set(clamp(b.x * 0.75, -40, 40), clamp(b.y * 0.6, -26, 26), 0);
      pushers.length = 0;
      for (const p of world.players) {
        if (Math.abs(p.x - b.x) < 24 && Math.abs(p.y - b.y) < 20 && pushers.length < 11) {
          pushers.push({ x: p.x, y: p.y, r: 0.42, s: 0.5 + p.speed * 0.05 });
        }
      }
      pushers.push({ x: b.x, y: b.y, r: 0.3, s: 0.8 });
      if (grass.mesh) {
        // Anchor the patch where the lens is pointed at the ground, but never
        // further than blades can be resolved: on a broadcast shot that puts
        // them in the foreground, on a replay close-up right under the action.
        camera.getWorldDirection(camFwd);
        let gx, gy;
        if (camFwd.z < -0.05) {
          const t = Math.min(-camera.position.z / camFwd.z, 26);
          gx = camera.position.x + camFwd.x * t;
          gy = camera.position.y + camFwd.y * t;
        } else {
          const fl = Math.hypot(camFwd.x, camFwd.y) || 1;
          gx = camera.position.x + camFwd.x / fl * 12;
          gy = camera.position.y + camFwd.y / fl * 12;
        }
        grass.update(gx, gy, pushers);
      }

      players.update(world, time, turf);
      indicator.update(
        world.user && world.user.player, b, dt,
        state === 'play' && !world.noUser && world.phase !== 'goal',
      );
      ball.update(b, dt);
      trail.update(b, camera.position);
      goals.update(dt, b, env.u.uWind.value);

      // the ball ploughing through wet grass throws up spray
      const sp = Math.hypot(b.vx, b.vy);
      if (b.z < BALL.r * 1.5 && sp > 6) {
        turf.add(b.x, b.y, 0.10, Math.atan2(b.vy, b.vx), 0.3, 0.02, 0.18, 0.3);
        if (env.u.uWet.value > 0.3 && Math.random() < 0.5) {
          fx.emit(PT.SPRAY, b.x, b.y, 0.05,
            -b.vx * 0.1 + (Math.random() - 0.5) * 2, -b.vy * 0.1 + (Math.random() - 0.5) * 2,
            1.5 + Math.random() * 2, 0.025, 0.4, 0.6, 0.66, 0.72);
        }
      }
      turf.update(dt);
      fx.flush();

      // --- lighting ----------------------------------------------------
      fitShadow();
      renderer.shadowMap.needsUpdate = true;     // exactly one shadow pass
      const sunDir = env.u.uSunDir.value;

      // --- planar reflection -------------------------------------------
      // A planar mirror costs a second pass over the whole stadium, so it
      // only earns its place once the ground is wet enough to actually show
      // a reflection; below that the analytic sky probe is indistinguishable.
      reflectOn = env.u.uWet.value > 0.34 && tier >= 1 && quality >= 0.55;
      pitch.setReflection(reflectRT.texture, reflectVP, reflectOn);
      if (reflectOn) {
        reflectCam.fov = camera.fov;
        reflectCam.aspect = camera.aspect;
        reflectCam.near = camera.near;
        reflectCam.far = camera.far;
        reflectCam.position.set(camPos.x, camPos.y, -camPos.z);
        reflectCam.up.set(0, 0, -1);
        reflectCam.lookAt(camTarget.x, camTarget.y, -camTarget.z);
        reflectCam.updateProjectionMatrix();
        reflectCam.updateMatrixWorld(true);
        reflectVP.multiplyMatrices(reflectCam.projectionMatrix, reflectCam.matrixWorldInverse);
        // the cheap things are not worth mirroring
        const hide = [grass.mesh, crowd.mesh, fx.mesh, rain.mesh, trail.mesh, pitch.mesh];
        const was = hide.map((m) => (m ? m.visible : false));
        for (const m of hide) if (m) m.visible = false;
        sky.setCamera(reflectCam);
        renderer.setRenderTarget(reflectRT);
        renderer.clear();
        renderer.render(scene, reflectCam);
        for (let i = 0; i < hide.length; i++) if (hide[i]) hide[i].visible = was[i];
      }

      // --- main pass ---------------------------------------------------
      sky.setCamera(camera);
      post.beginFrame(camera, sun, sunDir, env.shadowDir);
      renderer.setRenderTarget(post.sceneRT);
      renderer.clear();
      renderer.render(scene, camera);
      post.render();
    },
    /** Visual side effects for simulation events. */
    event(name, data, world) {
      const b = world.ball;
      switch (name) {
        case 'pass': case 'shot': case 'clear': case 'cross': {
          const p = data && data.p;
          if (p) {
            fx.kickSpray(p.x, p.y, Math.cos(p.facing), Math.sin(p.facing),
              name === 'shot' ? 1 : 0.6, env.u.uWet.value);
            turf.add(p.x, p.y, 0.3, p.facing, 0.8, name === 'shot' ? 0.45 : 0.2, 0.5, 0.4);
          }
          break;
        }
        case 'tackle': case 'slideWin': {
          const p = data && data.p;
          if (p) fx.kickSpray(p.x, p.y, Math.cos(p.facing), Math.sin(p.facing), 1.2, env.u.uWet.value);
          break;
        }
        case 'bounce':
          if (env.u.uWet.value > 0.3) {
            for (let i = 0; i < 5; i++) {
              const a = Math.random() * 6.283;
              fx.emit(PT.SPRAY, b.x, b.y, 0.04, Math.cos(a) * 2, Math.sin(a) * 2,
                1.5 + Math.random() * 2, 0.03, 0.45, 0.6, 0.66, 0.72);
            }
          }
          turf.add(b.x, b.y, 0.14, 0, 0.35, 0.05, 0.6, 0);
          break;
        case 'goal': {
          const g = world.lastGoal;
          const sx = g && g.scorer ? g.scorer.x : b.x * 0.7;
          const sy = g && g.scorer ? g.scorer.y : b.y * 0.5;
          fx.celebrate(sx, sy);
          crowd.startWave();
          break;
        }
        default: break;
      }
    },
    dispose() {
      post.dispose();
      reflectRT.dispose();
      turf.dispose();
      renderer.dispose();
    },
  };
  return api;
}

export { PRESETS };
