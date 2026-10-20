// Galpón — escena 3D del mate (three.js). Recorre las secciones del inicio según el scroll.
const THREE_URL = 'https://unpkg.com/three@0.184.0/build/three.module.js';

const CUEROS = ['#3a2016', '#6b3c22', '#b88d5c', '#5a1c26'];
// m/b/p = [x, y, escala, rotX, rotY, rotZ]  (x,y en fracción de media pantalla)
const K = [
  { m: [.42, -.1, 1, 10, -25, 0], b: [.42, .6, 1, 0, 0, 0], att: 1, p: [1.7, -.1, .9, 0, -30, 0], fill: 1, mound: 1, wet: 1, water: 0, steam: .7, pour: 0, color: 0, bz: 0 },
  { m: [.24, -.18, .8, 12, 35, 0], b: [.5, .02, .8, 0, 20, -10], att: 0, p: [.76, -.12, .82, 4, -28, 4], fill: 0, mound: 0, wet: 0, water: 0, steam: 0, pour: 0, color: 0, bz: 0 },
  { m: [-.42, -.04, 1.05, 84, 180, 0], b: [.3, 1.9, .9, 0, 0, -10], att: 0, p: [1.8, 0, .9, 0, -30, 0], fill: 0, mound: 0, wet: 0, water: 0, steam: 0, pour: 0, color: 1, bz: 0 },
  { m: [-.66, -.5, .58, 10, 250, 0], b: [.3, -.08, 1.2, 10, 50, -72], att: 0, p: [1.8, .3, .9, 0, -30, 0], fill: 0, mound: 0, wet: 0, water: 0, steam: 0, pour: 0, color: 1, bz: 0 },
  { m: [.46, -.4, .9, 14, 320, 0], b: [1.9, .5, 1, 0, 0, -30], att: 0, p: [.56, .34, .85, 0, -20, -118], fill: .35, mound: 0, wet: 0, water: 0, steam: 0, pour: 1, color: 1, bz: 0 },
  { m: [.44, -.16, 1.06, 12, 380, 0], b: [.5, 1.8, 1, 0, 0, 0], att: 1, p: [-1.9, .5, .85, 0, -20, -60], fill: 1, mound: 1, wet: .2, water: 1, steam: .4, pour: 0, color: 1, bz: 0 },
  { m: [.42, -.1, 1.1, 8, 470, 0], b: [.4, .6, 1, 0, 0, 0], att: 1, p: [1.9, .5, .85, 0, -20, -60], fill: 1, mound: 1, wet: 1, water: 0, steam: 1, pour: 0, color: 3, bz: 0 },
  { m: [.02, .06, 1.32, -12, 540, 0], b: [.4, .6, 1, 0, 0, 0], att: 1, p: [1.9, .5, .85, 0, -20, -60], fill: 1, mound: 1, wet: 1, water: 0, steam: .5, pour: 0, color: 3, bz: -48 },
];

export async function createMate3D(canvas) {
  const T = await import(THREE_URL);
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(28, 1, .1, 60); camera.position.set(0, 0, 7);

  // Entorno de estudio propio (softboxes) para reflejos realistas en la alpaca
  const pm = new T.PMREMGenerator(renderer), env = new T.Scene();
  env.add(new T.Mesh(new T.BoxGeometry(12, 12, 12), new T.MeshBasicMaterial({ color: 0x2a1c14, side: T.BackSide })));
  const soft = (w, h, c, k, pos) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), side: T.DoubleSide })); m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m); };
  soft(4, 3, 0xffe0bc, 7, [-4, 3, 3.5]); soft(2.5, 5, 0xfff3e4, 3.5, [4.5, .5, 2]); soft(7, 1.4, 0xd6efbd, 2.4, [0, -1, -5]); soft(6, 6, 0xffffff, 1.2, [0, 5.5, 0]);
  scene.environment = pm.fromScene(env, .03).texture;
  const key = new T.DirectionalLight(0xffd6a6, 2.2); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new T.DirectionalLight(0xc6e59a, 1.7); rim.position.set(4, 2.5, -4); scene.add(rim);
  scene.add(new T.HemisphereLight(0xfff0e0, 0x2a1a10, .3));

  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; return t; };
  const gourdMap = tex(512, 512, (g, w, h) => { g.fillStyle = '#e6e0da'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = rnd() < .5 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.05)'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); } for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(0,0,0,' + (.03 + rnd() * .05) + ')'; g.lineWidth = 1 + rnd() * 4; const x = rnd() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 20, h * .3, x - 20, h * .6, x + 10, h); g.stroke(); } });
  const engr = (light) => tex(1024, 128, (g, w, h) => { g.fillStyle = light ? '#ffffff' : '#808080'; g.fillRect(0, 0, w, h); g.strokeStyle = light ? '#8a8378' : '#2a2a2a'; g.fillStyle = g.strokeStyle; g.lineWidth = 3; for (let x = 0; x < w; x += 128) { g.beginPath(); g.moveTo(x + 64, 22); g.lineTo(x + 100, 64); g.lineTo(x + 64, 106); g.lineTo(x + 28, 64); g.closePath(); g.stroke(); g.beginPath(); g.ellipse(x + 64, 64, 14, 22, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(x, 64, 18, 0, Math.PI * 2); g.stroke(); for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(x + k * 16 + 8, 10, 2.5, 0, 7); g.fill(); g.beginPath(); g.arc(x + k * 16 + 8, 118, 2.5, 0, 7); g.fill(); } } }, light);
  const yerbaMap = tex(256, 256, (g, w, h) => { g.fillStyle = '#5f7a26'; g.fillRect(0, 0, w, h); const cs = ['#7f9b34', '#a8bd5c', '#46591b', '#c3cf80', '#6b8a2c']; for (let i = 0; i < 5000; i++) { g.fillStyle = cs[(rnd() * 5) | 0]; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2); } });
  const _unusedPack = tex(512, 800, (g, w, h) => { g.fillStyle = '#c9a676'; g.fillRect(0, 0, w, h); for (let i = 0; i < 6000; i++) { g.fillStyle = rnd() < .5 ? 'rgba(80,50,20,.08)' : 'rgba(255,240,210,.08)'; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.fillStyle = '#56701f'; g.fillRect(0, 120, w, 300); g.fillStyle = '#f3ebe3'; g.textAlign = 'center'; g.font = '600 30px Inter, sans-serif'; g.fillText('G A L P Ó N', w / 2, 80); g.font = '700 84px Inter, sans-serif'; g.fillText('YERBA', w / 2, 260); g.fillText('MATE', w / 2, 350); g.fillStyle = '#3a2416'; g.font = '500 28px Inter, sans-serif'; g.fillText('Elaborada con palo', w / 2, 500); g.font = '700 120px Inter, sans-serif'; g.fillText('1 kg', w / 2, 680); });
  const radial = (stops) => tex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const steamMap = radial([[0, 'rgba(255,250,240,.55)'], [.5, 'rgba(255,250,240,.18)'], [1, 'rgba(255,250,240,0)']]);
  const shadowMap = radial([[0, 'rgba(0,0,0,.65)'], [.6, 'rgba(0,0,0,.2)'], [1, 'rgba(0,0,0,0)']]);

  const gourdMat = new T.MeshPhysicalMaterial({ name: 'calabaza', color: CUEROS[0], map: gourdMap, roughness: .42, clearcoat: .55, clearcoatRoughness: .35, sheen: .3, sheenColor: new T.Color('#c08050') });
  const bump = engr(false), colorEngr = engr(true); bump.repeat.set(3, 1); colorEngr.repeat.set(3, 1);
  const alpaca = new T.MeshStandardMaterial({ name: 'alpaca', color: '#ddd6ca', metalness: 1, roughness: .26, map: colorEngr, bumpMap: bump, bumpScale: 2.2, side: T.DoubleSide });
  const alpacaLisa = new T.MeshStandardMaterial({ name: 'alpaca-lisa', color: '#e2dccf', metalness: 1, roughness: .2 });
  const bronce = new T.MeshStandardMaterial({ name: 'bronce', color: '#d4a64e', metalness: 1, roughness: .28 });
  const yerbaMat = new T.MeshStandardMaterial({ name: 'yerba', map: yerbaMap, roughness: .95 });

  // Mate
  const mateRoot = new T.Group(), mate = new T.Group(); mate.position.y = -.58; mateRoot.add(mate); scene.add(mateRoot);
  const prof = [[0, .1], [.16, .1], [.29, .16], [.39, .27], [.445, .41], [.458, .52], [.448, .63], [.425, .72], [.408, .79]].map(([r, y]) => new T.Vector2(r, y));
  mate.add(new T.Mesh(new T.LatheGeometry(prof, 96), gourdMat));
  const vir = new T.Mesh(new T.CylinderGeometry(.432, .428, .23, 128, 1, true), alpaca); vir.position.y = .895; mate.add(vir);
  const virIn = new T.Mesh(new T.CylinderGeometry(.402, .402, .22, 96, 1, true), alpacaLisa); virIn.position.y = .895; mate.add(virIn);
  const lip = new T.Mesh(new T.TorusGeometry(.417, .016, 16, 128), alpacaLisa); lip.rotation.x = Math.PI / 2; lip.position.y = 1.01; mate.add(lip);
  const bead = new T.Mesh(new T.TorusGeometry(.432, .009, 12, 128), bronce); bead.rotation.x = Math.PI / 2; bead.position.y = .782; mate.add(bead);
  const curedMap = tex(512, 512, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, '#4a3418'); gr.addColorStop(.6, '#3a2812'); gr.addColorStop(1, '#22160a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const cs = ['rgba(110,130,40,.35)', 'rgba(70,90,25,.4)', 'rgba(150,120,60,.25)', 'rgba(20,12,5,.35)']; for (let i = 0; i < 2600; i++) { g.fillStyle = cs[(rnd() * 4) | 0]; const r = 1 + rnd() * 5; g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, 7); g.fill(); } });
  const interiorTex = new T.TextureLoader().load(((window.__resources && window.__resources.mateInterior) || new URL('./assets/mate-interior.png', import.meta.url).href)); interiorTex.colorSpace = T.SRGBColorSpace;
  const floor = new T.Mesh(new T.CircleGeometry(.402, 64), new T.MeshStandardMaterial({ name: 'curado', map: interiorTex, roughness: .9 }));
  const wall = new T.Mesh(new T.CylinderGeometry(.4, .38, .25, 64, 1, true), new T.MeshStandardMaterial({ map: curedMap, roughness: .9, side: T.BackSide })); wall.position.y = .675; mate.add(wall); floor.rotation.x = -Math.PI / 2; floor.position.y = .56; mate.add(floor);
  for (const a of [Math.PI / 4, -Math.PI / 4]) { const band = new T.Mesh(new T.BoxGeometry(.8, .05, .07), alpaca); band.position.y = .1; band.rotation.y = a; mate.add(band); }
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, ball = new T.Mesh(new T.SphereGeometry(.058, 32, 16), bronce); ball.position.set(Math.cos(a) * .4, .058, Math.sin(a) * .4); mate.add(ball); const leg = new T.Mesh(new T.CylinderGeometry(.05, .07, .16, 16), gourdMat); leg.position.set(Math.cos(a) * .3, .15, Math.sin(a) * .3); leg.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5); mate.add(leg); }
  const yDisc = new T.Mesh(new T.CircleGeometry(.4, 64), yerbaMat); yDisc.rotation.x = -Math.PI / 2; mate.add(yDisc);
  const mound = new T.Mesh(new T.SphereGeometry(.34, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), yerbaMat); mate.add(mound);
  const wet = new T.Mesh(new T.CircleGeometry(.13, 40), new T.MeshStandardMaterial({ color: '#2e3a10', roughness: .2, transparent: true, opacity: 0 })); wet.rotation.x = -Math.PI / 2; mate.add(wet);
  const attach = new T.Object3D(); attach.position.set(-.16, .5, .06); attach.rotation.z = T.MathUtils.degToRad(13); mate.add(attach);
  const shadow = new T.Mesh(new T.PlaneGeometry(1.5, .3), new T.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false })); scene.add(shadow);

  // Bombilla (origen en la pala)
  const bomb = new T.Group(); scene.add(bomb);
  const bSil = alpacaLisa.clone(), bGold = bronce.clone(); bSil.transparent = bGold.transparent = true;
  const pala = new T.Mesh(new T.CylinderGeometry(.05, .05, .014, 32), bSil); pala.rotation.x = Math.PI / 2; pala.position.y = .06; pala.scale.set(1, 1, 1.6); bomb.add(pala);
  const tube = new T.Mesh(new T.CylinderGeometry(.017, .017, 1.12, 20), bSil); tube.position.y = .64; bomb.add(tube);
  for (const y of [.52, .92, 1.16]) { const r = new T.Mesh(new T.TorusGeometry(.022, .008, 10, 32), bGold); r.rotation.x = Math.PI / 2; r.position.y = y; bomb.add(r); }
  const pico = new T.Mesh(new T.LatheGeometry([[0, 1.42], [.01, 1.41], [.02, 1.36], [.026, 1.27], [.026, 1.2], [.02, 1.18]].map(([r, y]) => new T.Vector2(r, y)), 32), bGold); bomb.add(pico);

  // Paquete de yerba
  const frontTex = new T.TextureLoader().load(((window.__resources && window.__resources.yerbaFront) || new URL('./assets/yerba-front.png', import.meta.url).href)); frontTex.colorSpace = T.SRGBColorSpace; frontTex.anisotropy = 8;
  const YEL = '#e6cf1d', GRN = '#163628';
  const sideMap = tex(256, 880, (g, w, h) => { g.fillStyle = YEL; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f0e0'; g.fillRect(0, h * .615, w, 8); g.fillRect(0, h * .855, w, 8); g.fillStyle = GRN; g.fillRect(0, h * .625, w, h * .225); g.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 14; i++) g.fillRect(rnd() * w, 0, 1 + rnd() * 2, h); });
  const topMap = tex(512, 256, (g, w, h) => { g.fillStyle = YEL; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,70,0,.28)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.moveTo(0, 0); g.lineTo(w * .22, h / 2); g.lineTo(0, h); g.moveTo(w, 0); g.lineTo(w * .78, h / 2); g.lineTo(w, h); g.stroke(); g.fillStyle = GRN; g.fillRect(w * .4, h * .3, w * .2, h * .4); });
  const wrap = (map) => new T.MeshPhysicalMaterial({ map, roughness: .42, clearcoat: .7, clearcoatRoughness: .25, sheen: .2 });
  const frontMat = wrap(frontTex), sideMat = wrap(sideMap), topMat = wrap(topMap);
  const PW = .62, PH = .91, PD = .3, PR = .035, pg = new T.BoxGeometry(PW, PH, PD, 16, 24, 8), pp = pg.attributes.position, pv = new T.Vector3(), inner = new T.Vector3();
  for (let i = 0; i < pp.count; i++) {
    pv.fromBufferAttribute(pp, i);
    inner.set(Math.max(-PW / 2 + PR, Math.min(PW / 2 - PR, pv.x)), Math.max(-PH / 2 + PR, Math.min(PH / 2 - PR, pv.y)), Math.max(-PD / 2 + PR, Math.min(PD / 2 - PR, pv.z)));
    const n = pv.clone().sub(inner); if (n.lengthSq() > 0) pv.copy(inner).add(n.normalize().multiplyScalar(PR));
    const ux = pv.x / (PW / 2), uy = pv.y / (PH / 2);
    pv.z += Math.sign(pv.z) * (1 - ux * ux) * (1 - uy * uy * .6) * .018;
    pv.x += Math.sign(pv.x) * (1 - uy * uy) * .006;
    pp.setXYZ(i, pv.x, pv.y, pv.z);
  }
  pg.computeVertexNormals();
  const pack = new T.Mesh(pg, [sideMat, sideMat, topMat, topMat, frontMat, frontMat]); pack.name = 'yerba'; scene.add(pack);
  const spout = new T.Object3D(); spout.position.set(-.24, .5, 0); pack.add(spout);

  // Partículas, agua, vapor
  const N = 80, parts = new T.InstancedMesh(new T.BoxGeometry(.022, .007, .016), yerbaMat, N); scene.add(parts);
  const water = new T.Mesh(new T.CylinderGeometry(.018, .022, 1, 12, 1, true), new T.MeshPhysicalMaterial({ color: '#e4f1f4', roughness: .05, transparent: true, opacity: .55, transmission: .2 })); scene.add(water);
  const steams = Array.from({ length: 9 }, () => { const s = new T.Sprite(new T.SpriteMaterial({ map: steamMap, transparent: true, depthWrite: false, opacity: 0 })); scene.add(s); return s; });

  const dummy = new T.Object3D(), v1 = new T.Vector3(), v2 = new T.Vector3(), q1 = new T.Quaternion(), q2 = new T.Quaternion(), s1 = new T.Vector3(), cA = new T.Color(), cB = new T.Color();
  const D = T.MathUtils.degToRad, sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;
  let seg = 0, segT = 0, mx = 0, my = 0, cur = null, running = true, W = 1, H = 1;

  function target() {
    const a = K[seg], b = K[Math.min(K.length - 1, seg + 1)], x = Math.max(0, Math.min(1, (segT - .08) / .84)), e = x * x * x * (x * (x * 6 - 15) + 10), o = {};
    for (const k in a) o[k] = Array.isArray(a[k]) ? a[k].map((v, i) => lerp(v, b[k][i], e)) : lerp(a[k], b[k], e);
    return o;
  }
  function placeFree(obj, arr, hw, hh, narrow) { obj.position.set(arr[0] * hw * (narrow ? .6 : 1), arr[1] * hh, 0); obj.rotation.set(D(arr[3]), D(arr[4]), D(arr[5])); obj.scale.setScalar(arr[2] * (narrow ? .75 : 1)); }
  function resize() { W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);

  function frame(time) {
    if (!running) return; requestAnimationFrame(frame);
    const t = time / 1000, tg = target();
    if (!cur) cur = JSON.parse(JSON.stringify(tg));
    for (const k in tg) { if (Array.isArray(tg[k])) tg[k].forEach((v, i) => { cur[k][i] += (v - cur[k][i]) * .055; }); else cur[k] += (tg[k] - cur[k]) * .055; }
    const hh = Math.tan(D(14)) * 7, hw = hh * camera.aspect, narrow = camera.aspect < .9, c = cur;
    const mArr = narrow ? [0, -.38, c.m[2], c.m[3], c.m[4], c.m[5]] : c.m;
    placeFree(mateRoot, mArr, hw, hh, narrow);
    mateRoot.rotation.x += D(my * 6); const fpos = seg + segT, sway = fpos > 1.65 && fpos < 2.35 ? 32 * Math.sin(Math.PI * (fpos - 1.65) / .7) : 0; mateRoot.rotation.y += D(mx * 16 + Math.sin(t * .6) * 6 + sway); mateRoot.position.y += Math.sin(t * 1.1) * .02;
    mateRoot.updateMatrixWorld(true);
    // leather color
    const ci = Math.max(0, Math.min(2.999, c.color)), i0 = Math.floor(ci); cA.set(CUEROS[i0]); cB.set(CUEROS[i0 + 1]); gourdMat.color.copy(cA.lerp(cB, ci - i0));
    // yerba
    const fill = Math.max(0, Math.min(1, c.fill)); yDisc.visible = fill > .01; yDisc.position.y = lerp(.6, .985, fill);
    mound.visible = c.mound > .02; mound.position.set(.07, yDisc.position.y - .005, -.02); mound.scale.set(.95, Math.max(.001, c.mound * .42), .95);
    wet.material.opacity = Math.max(0, Math.min(1, c.wet)) * .85; wet.position.set(-.15, yDisc.position.y + .004 + c.mound * .02, .06); wet.visible = c.wet > .02;
    // bombilla: libre vs. calzada
    placeFree(dummy, c.b, hw, hh, narrow); dummy.updateMatrixWorld(true); dummy.matrixWorld.decompose(v1, q1, s1);
    attach.rotation.set(D(c.bz), D(-c.bz * .4), D(13 * (1 - c.bz / 60)));
    attach.updateMatrixWorld(true); attach.matrixWorld.decompose(v2, q2, s1.clone());
    const at = Math.max(0, Math.min(1, c.att)), sc2 = new T.Vector3(); attach.getWorldScale(sc2);
    bomb.position.lerpVectors(v1, v2, at); bomb.quaternion.slerpQuaternions(q1, q2, at); bomb.scale.setScalar(lerp(dummy.scale.x, sc2.x, at));
    if (at < .99) bomb.rotation.y += t * .4 * (1 - at);
    const bo = Math.pow(Math.abs(2 * at - 1), .8); bSil.opacity = bGold.opacity = bo; bomb.visible = bo > .02; bSil.depthWrite = bGold.depthWrite = bo > .95;
    // paquete
    placeFree(pack, c.p, hw, hh, narrow); pack.rotation.y += Math.sin(t * .5) * .08; pack.updateMatrixWorld(true);
    // partículas
    const pour = Math.max(0, Math.min(1, c.pour)); parts.visible = pour > .05;
    if (parts.visible) { spout.getWorldPosition(v1); mateRoot.localToWorld(v2.set(0, .45, 0)); for (let i = 0; i < N; i++) { const u = (t * .7 + i / N) % 1; dummy.position.set(lerp(v1.x, v2.x, u) + Math.sin(i * 12.9) * .05, lerp(v1.y, v2.y, u) - Math.sin(u * Math.PI) * -.15 * 0 + (1 - u) * 0, Math.cos(i * 7.3) * .05); dummy.position.y = lerp(v1.y, v2.y, u * u); dummy.rotation.set(i, t * 3 + i, i * .5); dummy.scale.setScalar(pour * mateRoot.scale.x); dummy.updateMatrix(); parts.setMatrixAt(i, dummy.matrix); } parts.instanceMatrix.needsUpdate = true; }
    // agua
    const wv = Math.max(0, Math.min(1, c.water)); water.visible = wv > .03;
    if (water.visible) { mateRoot.localToWorld(v2.set(-.14, .5, .05)); const top = hh + .2, len = (top - v2.y) * wv; water.scale.set(mateRoot.scale.x, len, mateRoot.scale.x); water.position.set(v2.x, top - len / 2, v2.z); }
    // vapor
    const st = Math.max(0, Math.min(1, c.steam)); mateRoot.localToWorld(v2.set(0, .5, 0));
    steams.forEach((s, i) => { const u = (t * .22 + i / steams.length) % 1; s.position.set(v2.x + Math.sin(t + i * 2.1) * .12 * u, v2.y + .1 + u * 1.1 * mateRoot.scale.x, v2.z); const sz = (.25 + u * .7) * mateRoot.scale.x; s.scale.set(sz, sz, 1); s.material.opacity = st * Math.sin(u * Math.PI) * .5; });
    // sombra
    mateRoot.localToWorld(v2.set(0, -.58, 0)); shadow.position.set(v2.x, v2.y - .02, -.4); shadow.scale.setScalar(mateRoot.scale.x);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  return {
    set(s, tt) { seg = Math.max(0, Math.min(K.length - 1, s)); segT = Math.max(0, Math.min(1, tt)); },
    mouse(x, y) { mx = x; my = y; },
    pause() { running = false; }, resume() { if (!running) { running = true; requestAnimationFrame(frame); } },
    dispose() { running = false; removeEventListener('resize', resize); renderer.dispose(); },
  };
}
