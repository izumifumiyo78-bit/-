// ---------------------------------------------------------------------------
// indicator.js : the ring under the player you are controlling.
//
// Without it a 22-man match is unplayable, so it has to read instantly at
// broadcast distance without looking like a UI sticker pasted over the grass:
// it sits ON the turf (same height function as the pitch and the blades),
// takes the team's colour, pulses, and sweeps a brighter arc toward wherever
// the ball is.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { ENV_UNIFORMS, NOISE, PITCH_HEIGHT } from './shaderlib.js';

export function createIndicator(env) {
  const geo = new THREE.RingGeometry(0.40, 0.56, 40, 1);   // flat in XY = on the ground
  const uniforms = Object.assign(env.uniforms(), {
    uColor: { value: new THREE.Vector3(0.25, 1.0, 0.55) },
    uCentre: { value: new THREE.Vector3() },
    uAim: { value: new THREE.Vector2(1, 0) },
    uOn: { value: 0 },
  });
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      #include <common>
      ${ENV_UNIFORMS}
      ${NOISE}
      ${PITCH_HEIGHT}
      uniform vec3 uCentre;
      varying vec2 vLocal;
      void main(){
        vLocal = position.xy;
        vec3 wp = vec3(uCentre.xy + position.xy, 0.0);
        wp.z = pitchHeight(wp.xy) + 0.012;
        gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      #include <common>
      ${ENV_UNIFORMS}
      uniform vec3 uColor;
      uniform vec2 uAim;
      uniform float uOn;
      varying vec2 vLocal;
      void main(){
        float r = length(vLocal);
        float band = smoothstep(0.40, 0.44, r)*smoothstep(0.56, 0.52, r);
        // a brighter arc pointing at the ball, so you can read the angle
        vec2 d = normalize(vLocal + 1e-5);
        float arc = pow(max(dot(d, normalize(uAim + 1e-5)), 0.0), 6.0);
        float pulse = 0.72 + 0.28*sin(uTime*5.0);
        float a = band*uOn*(0.55 + 0.75*arc)*pulse;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor*a*2.2, a);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mesh.name = 'indicator';

  let on = 0;
  return {
    mesh,
    setColor(hex) {
      const c = new THREE.Color(hex).convertSRGBToLinear();
      uniforms.uColor.value.set(c.r + 0.12, c.g + 0.12, c.b + 0.12);
    },
    update(player, ball, dt, visible) {
      const want = visible && player ? 1 : 0;
      on += (want - on) * Math.min(1, dt * 6);
      uniforms.uOn.value = on;
      mesh.visible = on > 0.01;
      if (!player) return;
      uniforms.uCentre.value.set(player.x, player.y, 0);
      uniforms.uAim.value.set(ball.x - player.x, ball.y - player.y);
    },
  };
}
