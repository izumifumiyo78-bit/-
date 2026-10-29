// ---------------------------------------------------------------------------
// env.js : the single source of truth for "what does the light look like".
//
// Every material in the game shares these THREE.Uniform objects *by
// reference*, so one write per frame re-lights the entire stadium: sky dome,
// grass, kits, leather, LED boards, fog and the post chain all read the same
// numbers. Values are linear radiance; tonemapping happens once, in post.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { clamp, clamp01, lerp } from '../core/util.js';

const V3 = (r, g, b) => new THREE.Vector3(r, g, b);

// --- presets ---------------------------------------------------------------
// Hand-graded but physically shaped: sun colour comes from an optical-depth
// fit (see sunTint), so low sun angles redden on their own.
export const PRESETS = {
  day: {
    name: 'デイゲーム',
    elev: 52, azim: 118,              // degrees
    sunIntensity: 7.4,
    zenith: V3(0.090, 0.165, 0.330),
    horizon: V3(0.420, 0.520, 0.650),
    ground: V3(0.085, 0.115, 0.090),
    fog: V3(0.330, 0.420, 0.540),
    fogDensity: 0.0026, fogHeight: 0.030,
    turbidity: 1.00, night: 0.0, wet: 0.06,
    exposure: 0.68, flood: 0.0,
    grade: { lift: V3(0.00, 0.00, 0.01), gamma: V3(1.00, 1.00, 1.00), gain: V3(1.02, 1.00, 0.98), sat: 1.06 },
  },
  dusk: {
    name: '夕暮れ',
    elev: 5.2, azim: 196,
    sunIntensity: 5.6,
    zenith: V3(0.045, 0.062, 0.145),
    horizon: V3(0.620, 0.330, 0.190),
    ground: V3(0.055, 0.052, 0.050),
    fog: V3(0.300, 0.190, 0.165),
    fogDensity: 0.0070, fogHeight: 0.045,
    turbidity: 2.10, night: 0.14, wet: 0.14,
    exposure: 0.80, flood: 0.55,
    grade: { lift: V3(0.010, 0.004, 0.012), gamma: V3(0.98, 1.00, 1.03), gain: V3(1.07, 0.99, 0.94), sat: 1.12 },
  },
  night: {
    name: 'ナイター',
    elev: -14, azim: 300,
    sunIntensity: 0.085,              // moon
    zenith: V3(0.0045, 0.0062, 0.0135),
    horizon: V3(0.0130, 0.0165, 0.0260),
    ground: V3(0.0075, 0.0090, 0.0105),
    fog: V3(0.0180, 0.0220, 0.0320),
    fogDensity: 0.0055, fogHeight: 0.050,
    turbidity: 1.35, night: 1.0, wet: 0.22,
    exposure: 0.95, flood: 1.0,
    grade: { lift: V3(0.004, 0.006, 0.012), gamma: V3(1.02, 1.00, 0.98), gain: V3(0.98, 1.00, 1.06), sat: 1.04 },
  },
  rain: {
    name: '雨天ナイター',
    elev: -10, azim: 290,
    sunIntensity: 0.05,
    zenith: V3(0.0060, 0.0070, 0.0105),
    horizon: V3(0.0150, 0.0175, 0.0225),
    ground: V3(0.0090, 0.0100, 0.0115),
    fog: V3(0.0280, 0.0320, 0.0400),
    fogDensity: 0.0145, fogHeight: 0.065,
    turbidity: 1.70, night: 1.0, wet: 1.0,
    exposure: 1.00, flood: 1.0, rain: 1.0,
    grade: { lift: V3(0.006, 0.008, 0.014), gamma: V3(1.03, 1.01, 0.99), gain: V3(0.95, 0.99, 1.07), sat: 0.96 },
  },
};

/**
 * Atmospheric extinction of direct sunlight for a given elevation.
 * Kasten-Young air mass through Rayleigh + aerosol optical depth: this is what
 * turns the sun orange at 5 degrees without any art direction.
 */
function sunTint(elevDeg, turbidity, out) {
  const z = 90 - Math.max(elevDeg, -3);
  const m = 1 / (Math.cos(THREE.MathUtils.degToRad(Math.min(z, 92)))
    + 0.50572 * Math.pow(96.07995 - z, -1.6364));
  const am = clamp(m, 1, 38);
  // per-channel optical depth: rayleigh (lambda^-4) + aerosol (lambda^-1.3)
  const tr = [0.0450, 0.0865, 0.2050];
  const ta = [0.0520, 0.0610, 0.0730];
  for (let i = 0; i < 3; i++) {
    const t = Math.exp(-(tr[i] + ta[i] * (turbidity - 0.4)) * am);
    out.setComponent(i, t);
  }
  return out;
}

export function createEnv() {
  const u = {
    uTime: { value: 0 },
    uCamPos: { value: new THREE.Vector3() },
    uSunDir: { value: new THREE.Vector3(0.3, 0.4, 0.86) },
    uSunColor: { value: V3(6, 5.6, 5) },
    uSkyZenith: { value: V3(0.09, 0.16, 0.33) },
    uSkyHorizon: { value: V3(0.42, 0.52, 0.65) },
    uSkyGround: { value: V3(0.08, 0.11, 0.09) },
    uFogColor: { value: V3(0.33, 0.42, 0.54) },
    uFogParams: { value: new THREE.Vector2(0.003, 0.03) },
    uTurbidity: { value: 1 },
    uNight: { value: 0 },
    uWet: { value: 0.1 },
    uWind: { value: new THREE.Vector2(0.7, 0.3) },
    uExposure: { value: 1 },
    uFlood: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
    uFloodColor: { value: V3(1.0, 0.985, 0.94) },
    uFloodCount: { value: 0 },
  };
  const shadowDir = new THREE.Vector3(0.3, 0.4, 0.86);

  const env = {
    u,
    preset: PRESETS.night,
    presetId: 'night',
    grade: PRESETS.night.grade,
    rain: 0,
    wetTarget: 0.22,
    sunElev: 20, sunAzim: 120,
    tmp: new THREE.Vector3(),
    // Direction the single shadow-casting light points from. By day it is the
    // sun; under floodlights it swings near-vertical, which is both closer to
    // the truth (four rigs, no single direction) and stops the roof from
    // throwing a hard-edged wedge across a pitch the sun is not even lighting.
    shadowDir,
    towers: [],           // filled by the stadium: world positions of the rigs
    /** Shared uniform block, spread into every material we create. */
    uniforms() {
      return {
        uTime: u.uTime, uCamPos: u.uCamPos, uSunDir: u.uSunDir, uSunColor: u.uSunColor,
        uSkyZenith: u.uSkyZenith, uSkyHorizon: u.uSkyHorizon, uSkyGround: u.uSkyGround,
        uFogColor: u.uFogColor, uFogParams: u.uFogParams, uTurbidity: u.uTurbidity,
        uNight: u.uNight, uWet: u.uWet, uWind: u.uWind, uExposure: u.uExposure,
        uFlood: u.uFlood, uFloodColor: u.uFloodColor, uFloodCount: u.uFloodCount,
      };
    },
    setPreset(id) {
      const p = PRESETS[id] || PRESETS.night;
      env.preset = p; env.presetId = id in PRESETS ? id : 'night';
      env.grade = p.grade;
      env.sunElev = p.elev; env.sunAzim = p.azim;
      env.rain = p.rain || 0;
      env.wetTarget = p.wet;
      u.uSkyZenith.value.copy(p.zenith);
      u.uSkyHorizon.value.copy(p.horizon);
      u.uSkyGround.value.copy(p.ground);
      u.uFogColor.value.copy(p.fog);
      u.uFogParams.value.set(p.fogDensity, p.fogHeight);
      u.uTurbidity.value = p.turbidity;
      u.uNight.value = p.night;
      u.uWet.value = p.wet;
      u.uExposure.value = p.exposure;
      env.floodLevel = p.flood;
      env.applySun();
      return env;
    },
    applySun() {
      const el = THREE.MathUtils.degToRad(env.sunElev);
      const az = THREE.MathUtils.degToRad(env.sunAzim);
      u.uSunDir.value.set(
        Math.cos(el) * Math.cos(az),
        Math.cos(el) * Math.sin(az),
        Math.sin(el),
      ).normalize();
      const tint = sunTint(env.sunElev, u.uTurbidity.value, env.tmp);
      const I = env.preset.sunIntensity * clamp01((env.sunElev + 4) / 10);
      u.uSunColor.value.set(tint.x * I, tint.y * I, tint.z * I);
      shadowDir.copy(u.uSunDir.value);
      // Below the horizon the "sun" is the moon: cool, dim, never orange.
      if (env.sunElev < 0) {
        const moon = env.preset.sunIntensity;
        u.uSunColor.value.set(moon * 0.72, moon * 0.80, moon * 1.0);
        u.uSunDir.value.set(
          Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az),
          Math.max(Math.sin(el), 0.22),
        ).normalize();
        const vert = THREE.MathUtils.degToRad(74);
        shadowDir.set(
          Math.cos(vert) * Math.cos(az), Math.cos(vert) * Math.sin(az), Math.sin(vert),
        ).normalize();
      }
    },
    /** Floodlight rigs, as world positions + intensity. */
    setTowers(list, level) {
      env.towers = list;
      const n = Math.min(list.length, 8);
      for (let i = 0; i < 8; i++) {
        const t = list[i % Math.max(list.length, 1)];
        if (i < n && t) u.uFlood.value[i].set(t.x, t.y, t.z, level);
        else u.uFlood.value[i].set(0, 0, 0, 0);
      }
      u.uFloodCount.value = n;
    },
    update(dt, t, camPos) {
      u.uTime.value = t;
      if (camPos) u.uCamPos.value.copy(camPos);
      // Wetness eases in so a rain preset does not pop on when selected.
      u.uWet.value = lerp(u.uWet.value, env.wetTarget, 1 - Math.exp(-dt * 0.6));
      const w = u.uWind.value;
      const s = Math.sin(t * 0.07) * 0.5 + Math.sin(t * 0.021) * 0.5;
      w.set(0.62 + s * 0.35, 0.22 + Math.cos(t * 0.053) * 0.28);
    },
    floodLevel: 1,
  };
  env.setPreset('night');
  return env;
}
