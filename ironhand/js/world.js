// The arena: sand floor, stone wall with pillars and torches, sky dome. All textures are generated.
import * as THREE from '../lib/three.module.min.js';

export const ARENA_R = 11;

function canvasTex(w, h, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function rand(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

export function buildWorld(scene) {
  scene.background = new THREE.Color(0x1a1420);
  scene.fog = new THREE.Fog(0x2a1e24, 14, 45);

  scene.add(new THREE.HemisphereLight(0xffd9b0, 0x302018, 1.4));
  const sun = new THREE.DirectionalLight(0xffc890, 1.6);
  sun.position.set(-6, 10, 4);
  scene.add(sun);

  // sky dome with a dusk gradient and stars
  const sky = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0b0a1c'); gr.addColorStop(0.45, '#3b2340'); gr.addColorStop(0.62, '#b0533a'); gr.addColorStop(0.7, '#e8955a'); gr.addColorStop(1, '#2a1e24');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rand(7);
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`; const y = r() * h * 0.4; g.fillRect(r() * w, y, 1, 1 + (1 - y / h) * 1.5); }
  });
  sky.wrapT = THREE.ClampToEdgeWrapping;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false }));
  scene.add(dome);

  // sand floor
  const sand = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#9c7d58'; g.fillRect(0, 0, w, h);
    const r = rand(3);
    for (let i = 0; i < 9000; i++) {
      const v = 120 + r() * 70 | 0;
      g.fillStyle = `rgba(${v},${v * 0.8 | 0},${v * 0.58 | 0},0.35)`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(70,50,30,0.15)'; g.lineWidth = 2 + r() * 6; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.quadraticCurveTo(x + r() * 80 - 40, y + r() * 80 - 40, x + r() * 160 - 80, y + r() * 160 - 80); g.stroke(); }
  }, 8);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ map: sand, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // inner ring marking the fighting circle
  const ring = new THREE.Mesh(new THREE.RingGeometry(ARENA_R - 0.25, ARENA_R, 96), new THREE.MeshBasicMaterial({ color: 0x5b4330, transparent: true, opacity: 0.5 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01;
  scene.add(ring);

  // stone wall
  const stone = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#6b6058'; g.fillRect(0, 0, w, h);
    const r = rand(11);
    const bh = 32;
    for (let y = 0; y < h; y += bh) {
      const off = (y / bh) % 2 ? 0 : 40;
      for (let x = -off; x < w; x += 80) {
        const v = 80 + r() * 40 | 0;
        g.fillStyle = `rgb(${v + 10},${v},${v - 8})`;
        g.fillRect(x + 2, y + 2, 76, bh - 4);
      }
    }
  });
  stone.repeat.set(12, 1);
  const wallR = ARENA_R + 1.2;
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(wallR, wallR, 3.2, 64, 1, true), new THREE.MeshStandardMaterial({ map: stone, side: THREE.BackSide, roughness: 0.95 }));
  wall.position.y = 1.6;
  scene.add(wall);
  // stands behind the wall
  const stands = new THREE.Mesh(new THREE.CylinderGeometry(wallR + 9, wallR + 0.5, 7, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a2e2a, side: THREE.BackSide, roughness: 1 }));
  stands.position.y = 6.5;
  scene.add(stands);

  // pillars and torches
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x7d7268, roughness: 0.9 });
  const pillarGeo = new THREE.CylinderGeometry(0.35, 0.42, 4.2, 10);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa040 });
  const flames = [];
  const N = 12;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.position.set(Math.cos(a) * (wallR - 0.3), 2.1, Math.sin(a) * (wallR - 0.3));
    scene.add(p);
    if (i % 2 === 0) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), flameMat);
      f.position.set(Math.cos(a) * (wallR - 0.75), 3.0, Math.sin(a) * (wallR - 0.75));
      scene.add(f);
      flames.push(f);
    }
  }
  const torchLights = [];
  for (const k of [0, 3]) {
    const l = new THREE.PointLight(0xff8a3a, 6, 14, 1.6);
    l.position.copy(flames[k].position);
    scene.add(l);
    torchLights.push(l);
  }

  return {
    update(t) {
      for (let i = 0; i < flames.length; i++) {
        const s = 1 + Math.sin(t * 13 + i * 2.1) * 0.15 + Math.sin(t * 7.3 + i) * 0.1;
        flames[i].scale.set(s, s * 1.3, s);
      }
      for (let i = 0; i < torchLights.length; i++) torchLights[i].intensity = 5 + Math.sin(t * 11 + i * 3) * 1.2;
    },
  };
}
