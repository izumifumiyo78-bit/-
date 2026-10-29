// ---------------------------------------------------------------------------
// sky.js : the dome. Not a texture, not a cubemap -- a screen-space quad that
// reconstructs a view ray per pixel and evaluates the same analytic sky
// function the reflections and the fog use, so everything agrees.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { ENV_UNIFORMS, NOISE, SKY } from './shaderlib.js';

export function createSky(env) {
  const geo = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: Object.assign(env.uniforms(), {
      uInvVP: { value: new THREE.Matrix4() },
    }),
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      uniform mat4 uInvVP;
      varying vec3 vRay;
      void main(){
        // position is already in NDC; unproject the far plane to get the ray
        vec4 far = uInvVP * vec4(position.xy, 1.0, 1.0);
        vec4 near = uInvVP * vec4(position.xy, -1.0, 1.0);
        vRay = far.xyz/far.w - near.xyz/near.w;
        gl_Position = vec4(position.xy, 0.999999, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      #include <common>
      ${ENV_UNIFORMS}
      ${NOISE}
      ${SKY}
      varying vec3 vRay;
      void main(){
        vec3 d = normalize(vRay);
        vec3 col = skyRadiance(d);
        // the stands block the lower dome; keep a dark apron under the horizon
        col = mix(col, uSkyGround*0.35, smoothstep(-0.02, -0.12, d.z));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.name = 'sky';

  const m = new THREE.Matrix4();
  return {
    mesh,
    /** Call before each render pass with whichever camera is about to draw. */
    setCamera(camera) {
      m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      mat.uniforms.uInvVP.value.copy(m).invert();
    },
  };
}
