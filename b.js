// 方案二《地月航线》：向下滚动就是从地球飞到月球，每一段航程讲一个栏目，最后在月球上回望地球。
import { createStage, THREE, lerp, clamp01 } from './lib/stage.js';
import { createBody, latLonToVec3 } from './lib/bodies/bodies.js';
import { createStars, createNebula } from './lib/sky/sky.js';
import { ME, byId, sheetHTML, L, t, lang, setLang } from './lib/site.js';

const $ = s => document.querySelector(s);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const stage = createStage($('#space'), { fov: 38 });
const { scene, camera } = stage;

// ── 世界：地球在原点，月球在 +X 方向。距离压缩过（真实比例下两者没法同框），大小比例是真的 ──
const RE = 10, RL = 2.73, O = V(0, 0, 0), LC = V(160, 0, 0), UP = V(0, 1, 0);
stage.sun.set(.233, .279, .932).multiplyScalar(30000);
scene.add(createStars(stage, { count: stage.mobile ? 12000 : 22000 }));
scene.add(createNebula(stage, { colors: ['#14306e', '#3a2a7a', '#0d5f78'], intensity: .45, seed: 7 }));

const terra = createBody(stage, 'terra', { radius: RE, spin: .003 });
const luna = createBody(stage, 'luna', { radius: RL, spin: 0, tilt: .03 });
luna.group.position.copy(LC); luna.mesh.rotation.y = Math.PI;           // 月球永远用同一面朝着地球
scene.add(terra.group, luna.group);

// 把地球转到「我的城市」正对开场镜头的角度，再在那里点一盏灯
{ const p = latLonToVec3(ME.lat, ME.lon, 1), want = V(-.2, .3, .93).normalize(), q = V(), Z = V(0, 0, 1); let best = -2;
  for (let i = 0; i < 360; i++) { const a = i * Math.PI / 180; q.copy(p).applyAxisAngle(UP, a).applyAxisAngle(Z, terra.group.rotation.z);
    if (q.dot(want) > best) { best = q.dot(want); terra.mesh.rotation.y = a; } } }
const pin = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd08a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
pin.position.copy(latLonToVec3(ME.lat, ME.lon, RE * 1.006)); terra.mesh.add(pin);
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, '#fff'); r.addColorStop(.18, 'rgba(255,255,255,.85)'); r.addColorStop(.45, 'rgba(255,255,255,.18)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

// 航线：绕地球小半圈，飞向月球，再绕到月球背后
const route = new THREE.CatmullRomCurve3([V(-9, 2, 9.5), V(0, 3, 13.4), V(10, 3.5, 10), V(26, 5, 12), V(60, 8, 22), V(104, 8, 22), V(140, 5, 13), V(156, 2.4, 6.2), V(162.5, 1.2, 5.2), V(165.8, .4, 1.5), V(164.5, -.3, -3.6)], false, 'centripetal');
const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.getPoints(500)), new THREE.LineDashedMaterial({ color: 0x9cc2ff, dashSize: .8, gapSize: .6, transparent: true, opacity: .5, depthWrite: false }));
line.computeLineDistances(); scene.add(line);

// ── 十段航程 ──  c：这一段绕着谁飞。相邻两段绕同一个天体时沿球面过渡，镜头不会穿进星球
const at = (c, x, y, z, d) => V(x, y, z).normalize().multiplyScalar(d).add(c);
function skim(c, pos, toward, downDeg) {                 // 贴着地表往前看：视线比切线方向再低 downDeg 度
  const n = pos.clone().sub(c).normalize(), tg = toward.clone().addScaledVector(n, -toward.dot(n)).normalize(), a = downDeg * Math.PI / 180;
  return pos.clone().addScaledVector(tg, Math.cos(a) * 12).addScaledVector(n, -Math.sin(a) * 12);
}
const key = (id, phase, c, pos, tgt, sx, tall) => ({ id, phase, c, pos, tgt, sx, tall });
const K = [
  key(null,      L('发射', 'Liftoff'),            'terra', at(O, -.30, .50, .81, 15.2), null, 0),
  key('about',   L('停泊轨道', 'Parking orbit'),   'terra', at(O, -.20, .26, .94, 43), O, -.2, { pos: at(O, -.20, .26, .94, 84), tgt: O }),
  key('journey', L('加速离开', 'Leaving Terra'),   'terra', at(O, .62, .30, .72, 76), V(6, 0, 0), .22, { pos: at(O, .62, .30, .72, 125), tgt: V(6, 0, 0) }),
  key('works',   L('地月转移', 'Coasting'),        'terra', V(66, 16, 46), V(14, 1, 0), -.14),
  key('honors',  L('航程中点', 'Halfway'),         null,    V(80, 72, 275), V(80, 0, 0), .2, { pos: V(96, 16, 46), tgt: LC }),
  key('now',     L('接近月球', 'Lunar approach'),  'luna',  at(LC, -.72, .22, .66, 30), LC, -.18),
  key('hobbies', L('环月轨道', 'Lunar orbit'),     'luna',  at(LC, -.30, .26, .92, 9.6), LC, .18, { pos: at(LC, -.30, .26, .92, 17.5), tgt: LC }),
  key('photos',  L('低空掠过', 'Low pass'),        'luna',  at(LC, .12, .55, .83, 3.75), null, -.1),
  key('stories', L('晨昏线', 'The terminator'),    'luna',  at(LC, .88, .44, -.02, 3.55), null, .1),
  key('contact', L('地出', 'Earthrise'),           'luna',  LC.clone().add(V(1.4, 2.85, .95)), O, -.14),
];
function horizonShot(pos, yawDeg, downDeg) {              // 朝月亮的方向平视，向左偏 yaw 度（月亮就落到右边），再往下看 down 度
  const n = pos.clone().normalize(), m = LC.clone().sub(pos).normalize();
  const fwd = m.addScaledVector(n, -m.dot(n)).normalize().applyAxisAngle(n, yawDeg * Math.PI / 180), d = downDeg * Math.PI / 180;
  return pos.clone().addScaledVector(fwd, Math.cos(d) * 12).addScaledVector(n, -Math.sin(d) * 12);
}
K[0].up = K[0].pos.clone().normalize();
K[0].tgt = horizonShot(K[0].pos, 9, 37.5);
K[0].tall = { pos: K[0].pos, tgt: horizonShot(K[0].pos, 2.5, 43) };
K[7].tgt = skim(LC, K[7].pos, V(1, 0, -.2), 42);
K[8].tgt = skim(LC, K[8].pos, V(.15, .1, 1), 30);        // 朝着太阳那边看：迎光的环形山，影子朝向镜头

const narrow = () => stage.width < 760 || stage.width < stage.height * .8;
const smooth = f => { const x = clamp01((f - .1) / .8); return x * x * x * (x * (x * 6 - 15) + 10); };   // 每段中间停一停
const da = V(), db = V(), axis = V(), cam = { pos: V(), tgt: V(), up: V(0, 1, 0), sx: 0, sy: 0 };
function pose(u, o) {
  const tall = narrow(), i = Math.min(K.length - 2, Math.max(0, Math.floor(u))), f = smooth(u - i), a = K[i], b = K[i + 1];
  const ap = tall && a.tall ? a.tall.pos : a.pos, bp = tall && b.tall ? b.tall.pos : b.pos, at_ = tall && a.tall ? a.tall.tgt : a.tgt, bt = tall && b.tall ? b.tall.tgt : b.tgt;
  if (a.c && a.c === b.c) {
    const c = a.c === 'terra' ? O : LC; da.copy(ap).sub(c); db.copy(bp).sub(c);
    const la = da.length(), lb = db.length(); da.normalize(); db.normalize();
    const ang = da.angleTo(db); o.pos.copy(da);
    if (ang > 1e-4) o.pos.applyAxisAngle(axis.crossVectors(da, db).normalize(), ang * f);
    o.pos.multiplyScalar(la * Math.pow(lb / la, f)).add(c);
  } else o.pos.lerpVectors(ap, bp, f);
  o.tgt.lerpVectors(at_, bt, f); o.up.lerpVectors(a.up || UP, b.up || UP, f).normalize();
  o.sx = tall ? 0 : lerp(a.sx, b.sx, f); o.sy = tall ? lerp(i ? -.24 : 0, -.24, f) : 0;
}

// ── 页面文字（切换语言时整体重排）──
const voyage = $('#voyage'), rail = $('#rail'); let legs = [], centers = [];
const ARROW_DOWN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
const ARROW_UR = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>';
function splitTitle(el, text) {                           // 中文逐字、英文逐词，给入场动画用；保留真实空格方便复制和读屏
  const zh = lang() === 'zh', parts = zh ? [...text] : text.split(/\s+/);
  el.innerHTML = parts.map((w, i) => `<span class="bt-word" style="--i:${i}">${w}</span>`).join(zh ? '' : ' ');
  el.setAttribute('aria-label', text);
  el.style.setProperty('--stagger', zh ? '110ms' : '120ms'); el.style.setProperty('--base', '380ms');
}
function build() {
  document.title = `${t(ME.name)} · Terra → Luna`;
  $('#mark-name').textContent = t(ME.name); $('#lang').textContent = lang() === 'zh' ? 'EN' : '中文';
  $('#hub').innerHTML = `${t(L('星系', 'The system'))}${ARROW_UR}`;
  $('#loading').textContent = t(L('正在加注燃料', 'Fuelling')); $('#pin').textContent = t(ME.place);
  $('#h-la').textContent = t(L('距地球', 'From Terra')); $('#h-lb').textContent = t(L('距月球', 'To Luna'));
  const total = String(K.length - 1).padStart(2, '0');
  voyage.innerHTML = `<section class="leg hero" data-i="0" id="top"><div class="hero-inner">
      <p class="badge glass glass--thin appear appear--pop" style="--d:.24s"><b>T−0</b><span>${t(L('一段 384,400 公里的自我介绍', 'A 384,400 km introduction'))}</span></p>
      <h1 class="display" id="hero-name"></h1>
      <p class="lede appear appear--soft" style="--d:.95s;animation-duration:1.25s">${t(L('从地球出发，飞向月球。沿途九站，每一站讲我的一部分。', 'Leave Earth, cross to the Moon. Nine stops on the way, each one a part of me.'))}</p>
      <div class="ctas"><a class="btn appear appear--btn" style="--d:1.08s" href="#leg-about" id="go">${t(L('出发', 'Lift off'))}<i>${ARROW_DOWN}</i></a>
        <a class="link appear appear--side" style="--d:1.2s" id="go-system" href="${$('#hub').getAttribute('href')}">${t(L('直接看星系', 'Skip to the system'))}${ARROW_UR}</a></div>
    </div></section>` + K.slice(1).map((k, n) => { const s = byId(k.id);
      return `<section class="leg ${k.sx < 0 ? 'right' : 'left'}" data-i="${n + 1}" id="leg-${k.id}"><article class="panel glass">
        <p class="legno"><span class="n">${String(n + 1).padStart(2, '0')}</span><i></i><span>${t(k.phase)}</span><em>/ ${total}</em></p>${sheetHTML(s)}</article></section>`; }).join('');
  splitTitle($('#hero-name'), t(ME.name));
  $('#go').onclick = e => { e.preventDefault(); scrollTo({ top: centers[1], behavior: 'smooth' }); };
  rail.innerHTML = K.map((k, i) => `<button data-i="${i}"><i></i><span>${t(k.id ? byId(k.id).title : k.phase)}</span></button>`).join('');
  legs = [...voyage.children]; legs.forEach(el => seen.observe(el)); measure();
}
const seen = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .12 });
function measure() {                                     // 每一段「到站」的滚动位置：电脑上是卡片居中时；手机上是卡片顶到屏幕中间偏上时，上半屏留给星球
  const tall = narrow(); centers = legs.map((el, i) => {
    if (!i) return 0;
    const p = el.querySelector('.panel'), top = p.offsetTop, h = p.offsetHeight;
    if (tall) return top - innerHeight * .46;
    return h > innerHeight - 170 ? top - 96 : top + h / 2 - innerHeight / 2;   // 面板比屏幕高时，上沿停在导航下方
  });
}
function scrollU() {                                      // 滚动位置 → 第几段航程（带小数）
  const y = scrollY; let i = 0; while (i < centers.length - 2 && y >= centers[i + 1]) i++;
  return i + clamp01((y - centers[i]) / Math.max(1, centers[i + 1] - centers[i]));
}
rail.addEventListener('click', e => { const b = e.target.closest('button'); if (b) scrollTo({ top: centers[+b.dataset.i], behavior: 'smooth' }); });
$('#lang').onclick = () => setLang(lang() === 'zh' ? 'en' : 'zh');
addEventListener('langchange', build); addEventListener('resize', measure);
new ResizeObserver(measure).observe(voyage);

// ── 每一帧 ──
const fmt = n => Math.round(n).toLocaleString('en-US'), scr = {}, tmp = V(), pinEl = $('#pin');
let u = 0, shown = -1, kmShown = -1, launchedAt = -1;
stage.onFrame((dt, time) => {
  u += (scrollU() - u) * (1 - Math.exp(-dt * 4.5));
  pose(u, cam);
  if (u < 1) {                                            // 开场：倒计时结束后，镜头从高处缓缓落到停泊高度（2.4 秒）
    const e = launchedAt < 0 ? 0 : 1 - Math.pow(1 - clamp01((time - launchedAt) / 2.4), 3);
    cam.pos.multiplyScalar(1 + .2 * (1 - e) * (1 - u));
  }
  camera.position.copy(cam.pos); camera.up.copy(cam.up); camera.lookAt(cam.tgt); camera.updateMatrixWorld();
  stage.shift.x = cam.sx; stage.shift.y = cam.sy;
  terra.update(dt, time); luna.update(dt, time);
  pin.scale.setScalar(.75 + .2 * Math.sin(time * 2.2));
  line.material.opacity = .5 * clamp01(u - .6) * clamp01(5.6 - u);          // 航线只在途中显示，到月球跟前就隐去

  const dT = Math.max(0, cam.pos.length() - RE), dL = Math.max(0, cam.pos.distanceTo(LC) - RL), km = Math.round(dT / (dT + dL) * 3844) * 100;
  if (km !== kmShown) { kmShown = km; $('#h-from').textContent = fmt(km); $('#h-to').textContent = fmt(384400 - km);
    $('#h-bar').style.transform = `scaleX(${(km / 384400).toFixed(4)})`; $('#h-dot').style.left = (km / 3844).toFixed(2) + '%'; }
  const now = Math.round(u);
  if (now !== shown) { shown = now; for (const b of rail.children) b.classList.toggle('on', +b.dataset.i === now); }

  pin.getWorldPosition(tmp); const facing = tmp.clone().normalize().dot(cam.pos.clone().sub(tmp).normalize());   // 城市标签：只在开头两段、且朝向镜头时显示
  const s = stage.project(tmp, scr), on = u > .55 && u < 1.6 && facing > .25 && !s.behind;
  pinEl.classList.toggle('on', on); if (on) pinEl.style.transform = `translate3d(${(s.x + 10).toFixed(1)}px,${(s.y - 8).toFixed(1)}px,0)`;
});

build();
addEventListener('animationend', e => { if (e.target.classList?.contains('appear')) e.target.classList.add('is-in'); });
let isReady = false; const t0 = performance.now(), countEl = $('#count'), lbar = $('#l-bar');
Promise.race([Promise.all([terra.ready, luna.ready]), new Promise(r => setTimeout(r, 15000))]).then(() => { isReady = true; });
(function countdown(now) {
  const p = Math.min((now - t0) / 1900, isReady ? 1 : .9), n = Math.ceil(10 * (1 - p) - 1e-6);
  if (countEl.textContent !== String(n)) countEl.textContent = n;
  lbar.style.transform = `scaleX(${p.toFixed(3)})`;
  if (p < 1) return requestAnimationFrame(countdown);
  setTimeout(() => { document.body.classList.add('ready'); launchedAt = stage.time; }, 260);
})(t0);
stage.start();
