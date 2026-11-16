// 方案一《星系》：我是太阳，每个栏目是一颗行星。点行星，相机飞过去，内容面板从旁边滑出。
import { createStage, THREE, ease, lerp } from './lib/stage.js';
import { createBody } from './lib/bodies/bodies.js';
import { createStars, createNebula } from './lib/sky/sky.js';
import { ME, SECTIONS, byId, sheetHTML, L, t, lang, setLang } from './lib/site.js';

const $ = s => document.querySelector(s);
const canvas = $('#space');
const stage = createStage(canvas, { fov: 38 });
const { scene, camera } = stage;
const UP = new THREE.Vector3(0, 1, 0);
const hoverNone = matchMedia('(hover: none)'), motion = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motion.matches;
const view = { az: 0, el: 0, zoom: 1 }, viewTarget = { az: 0, el: 0, zoom: 1 }, velocity = { az: 0, el: 0, zoom: 0 };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));


// ── 天空 ──
scene.add(createStars(stage, { count: stage.mobile ? 12000 : 22000 }));
scene.add(createNebula(stage, { colors: ['#1a2f7a', '#5a2a86', '#0d6a78'], intensity: 0.5 }));

// ── 星系 ──  轨道半径、星球半径、公转角速度、初始相位
const LAYOUT = {
  mercury: [8.6, .95, .05, .25], venus: [12.6, 1.6, .034, 2.95], terra: [17.6, 1.7, .022, 5.35], mars: [22.8, 1.2, .017, 3.75],
  jupiter: [32.5, 4.3, .009, 5.9], saturn: [45, 3.6, .0065, 3.9], uranus: [57, 2.5, .0045, .2], neptune: [64, 2.4, .003, 4.5],
};
const ORDER = ['about', 'now', 'works', 'journey', 'honors', 'hobbies', 'photos', 'stories', 'contact'];   // 栏目的阅读顺序
const P = {}, all = [], picks = [], orbits = [];
const DETAIL = 'low';                                   // 这个视角下行星不大，用小一号的贴图，加载快
const sun = createBody(stage, 'sun', { radius: 4, detail: DETAIL });
scene.add(sun.group);
picks.push(pickBall(sun.group, 4.6, 'home'));

for (const sec of SECTIONS) {
  const isLuna = sec.body === 'luna';
  const [r, size, speed, phase] = isLuna ? [3.1, .46, .32, 1] : LAYOUT[sec.body];
  const body = createBody(stage, sec.body, { radius: size, detail: DETAIL });
  scene.add(body.group);
  const p = P[sec.id] = { sec, body, r, size, speed, phase, pos: new THREE.Vector3(), ext: sec.body === 'saturn' ? 2.3 : 1, label: makeLabel(sec), scale: 1, scaleV: 0 };
  all.push(p);
  picks.push(pickBall(body.group, isLuna ? size * 1.5 : Math.max(size * 1.5, 1.6), sec.id));
  if (!isLuna) { const line = orbitLine(r); orbits.push(line); scene.add(line); }
}
P.stories.hop = 'about'; P.about.hop = 'stories';      // 看地球时可以跳到月球，反过来也一样
const belt = asteroidBelt(); scene.add(belt);

function pickBall(parent, radius, id) {                // 看不见的大一号球，让小行星也好点中
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  m.userData.id = id; parent.add(m); return m;
}
function orbitLine(r) {
  const pts = []; for (let i = 0; i < 256; i++) { const a = i / 256 * Math.PI * 2; pts.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: 0x8fa8ff, transparent: true, opacity: .16, depthWrite: false }));
}
function asteroidBelt() {                              // 火星和木星之间的小行星带，给画面加一层纵深
  const n = stage.mobile ? 900 : 2200, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 25.3 + Math.random() * 1.9 + (Math.random() - .5) * .7;
    pos.set([Math.cos(a) * r, (Math.random() - .5) * .5, Math.sin(a) * r], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xb9a48c, size: .09, sizeAttenuation: true, transparent: true, opacity: .5, depthWrite: false }));
}
function makeLabel(sec) {
  const a = document.createElement('a');
  a.className = 'plabel'; a.href = '#' + sec.id; a.style.setProperty('--tint', sec.tint);
  $('#labels').append(a); return a;
}

// ── 导航 ──
const dock = $('#dock');
for (const id of ORDER) {
  const s = byId(id), b = document.createElement('button');
  b.dataset.id = id; b.style.setProperty('--tint', s.tint); b.onclick = () => go(id); dock.append(b);
}
function splitTitle(el, text) {                           // 中文逐字、英文逐词入场
  const zh = lang() === 'zh', parts = zh ? [...text] : text.split(/\s+/);
  el.innerHTML = parts.map((w, i) => `<span class="bt-word" style="--i:${i}">${w}</span>`).join(zh ? '' : ' ');
  el.setAttribute('aria-label', text); el.style.setProperty('--stagger', zh ? '110ms' : '120ms'); el.style.setProperty('--base', '380ms');
}
const star = s => lang() === 'zh' ? s.cn : s.en[0] + s.en.slice(1).toLowerCase();      // 天体名：地球 / Terra
function texts() {                                       // 所有界面文字都从这里填，切换语言时重填一遍
  splitTitle($('#name'), t(ME.name)); $('#mark-name').textContent = t(ME.name);
  $('#tagline').textContent = t(L('我是太阳。九颗星球绕着我转，每一颗是我的一面。', 'I am the sun. Nine worlds orbit me, each one a side of who I am.'));
  document.title = `${t(ME.name)} · ${t(L('个人星系', 'Personal system'))}`;
  $('#eyebrow').textContent = 'Personal System' + (lang() === 'zh' ? ' · 个人星系' : '');
  $('#hint').textContent = hoverNone.matches
    ? t(L('点星球飞过去 · 单指旋转 · 双指缩放 · 按住太阳加速', 'Tap a world · drag to turn · pinch to zoom · hold the Sun'))
    : t(L('点击星球飞过去 · 拖动旋转 · 滚轮缩放 · 按住太阳让时间加速', 'Click a world to fly there · drag to turn · scroll to zoom · hold the Sun to speed up time'));
  $('#time-word').textContent = t(L('时间', 'Time'));
  dock.setAttribute('aria-label', t(L('栏目', 'Sections')));
  $('#back').textContent = '← ' + t(L('回到星系', 'Back to the system')); $('#hub').innerHTML = `${t(L('航线', 'The voyage'))}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>`;
  $('#loading').textContent = t(L('正在点亮星系', 'Lighting the system')); $('#lang').textContent = lang() === 'zh' ? 'EN' : '中文';
  for (const p of all) { p.label.innerHTML = `<b>${t(p.sec.title)}</b><span>${star(p.sec)}</span>`; p.label.title = t(p.sec.why); }
  for (const b of dock.children) { const s = byId(b.dataset.id); b.innerHTML = `<i class="dot"></i>${t(s.title)}`; b.title = `${star(s)} · ${t(s.why)}`; }
  if (focus) fill(focus.sec);
}
function fill(sec) {
  $('#content').innerHTML = sheetHTML(sec);
  const i = ORDER.indexOf(sec.id), a = byId(ORDER[(i - 1 + ORDER.length) % ORDER.length]), b = byId(ORDER[(i + 1) % ORDER.length]);
  $('#prev').innerHTML = `<small>← ${star(a)}</small>${t(a.title)}`; $('#next').innerHTML = `<small>${star(b)} →</small>${t(b.title)}`;
}
$('#lang').onclick = () => setLang(lang() === 'zh' ? 'en' : 'zh'); addEventListener('langchange', texts);
const go = id => { location.hash = id; };
const step = d => go(ORDER[(ORDER.indexOf(focus.sec.id) + d + ORDER.length) % ORDER.length]);
$('#back').onclick = () => go('home'); $('#prev').onclick = () => step(-1); $('#next').onclick = () => step(1);
addEventListener('keydown', e => {
  if (e.key === 'Escape') { go('home'); return; }
  if (e.target.closest('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'KeyT' && !focus) { e.preventDefault(); keyBoost = true; return; }
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || (!focus && e.key === 'Enter' && !e.target.closest('button, a'))) {
    e.preventDefault(); const d = e.key === 'ArrowLeft' ? -1 : 1;
    focus ? step(d) : go(d > 0 ? ORDER[0] : ORDER[ORDER.length - 1]);
  }
});
addEventListener('keyup', e => { if (e.code === 'KeyT') keyBoost = false; });
addEventListener('hashchange', apply);

const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
const hoverPoint = { x: -1, y: -1 };
const fingers = new Map(), boostEl = $('#time-boost'), multiplierEl = $('#time-multiplier');
let dragging = false, swallowClick = false, pinchDistance = 0, hovered = null;
let holdTimer = 0, sunBoost = false, keyBoost = false, boost = 1, boostNumber = 1;
let boostFrom = 1, boostTarget = 1, boostT = 1;
function clearHold() { clearTimeout(holdTimer); holdTimer = 0; sunBoost = false; }
function setHover(id) {
  const next = P[id] || null;
  if (next === hovered) return;
  if (hovered) hovered.label.classList.remove('hot');
  hovered = next;
  if (hovered) hovered.label.classList.add('hot');
  for (const b of dock.children) b.classList.toggle('hot', b.dataset.id === hovered?.sec.id);
}
for (const p of all) {
  p.label.addEventListener('pointerenter', () => { if (!hoverNone.matches && !dragging) setHover(p.sec.id); });
  p.label.addEventListener('pointerleave', () => setHover(null));
}
function limitView() {
  const base = narrow() ? .5 : .56, lo = focus ? -.9 : .18 - base, hi = focus ? .9 : 1.25 - base;
  const el = clamp(viewTarget.el, lo, hi);
  if (el !== viewTarget.el) velocity.el = 0;
  viewTarget.el = el; viewTarget.zoom = clamp(viewTarget.zoom, focus ? .6 : .55, focus ? 2.2 : 1.6);
}
function zoomBy(factor) { viewTarget.zoom *= factor; limitView(); }
function fingerDistance() {
  const it = fingers.values(), a = it.next().value, b = it.next().value;
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
}
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !launched) return;
  if (!fingers.size) { swallowClick = false; dragging = false; velocity.az = velocity.el = 0; }
  fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, time: e.timeStamp });
  canvas.setPointerCapture(e.pointerId); setHover(null);
  if (fingers.size > 1) { swallowClick = true; clearHold(); pinchDistance = fingerDistance(); }
  else {
    const hit = stage.pick(e.clientX, e.clientY, picks);
    if (!focus && hit?.object.userData.id === 'home') holdTimer = setTimeout(() => {
      holdTimer = 0; sunBoost = true; swallowClick = true; velocity.az = velocity.el = 0;
    }, 220);
  }
});
addEventListener('pointermove', e => {
  if (e.pointerType !== 'touch') {
    pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1;
    hoverPoint.x = e.clientX; hoverPoint.y = e.clientY;
  }
});
// 低频复查静止鼠标下的行星，射线拾取不占用逐帧热路径。
function probeHover() {
  if (!hoverNone.matches && !document.hidden && !fingers.size && launched && hoverPoint.x >= 0) {
    const el = document.elementFromPoint(hoverPoint.x, hoverPoint.y);
    if (el === canvas) {
      const hit = stage.pick(hoverPoint.x, hoverPoint.y, picks);
      setHover(hit?.object.userData.id); canvas.style.cursor = hit ? 'pointer' : 'grab';
    } else setHover(el?.closest('.plabel')?.hash.slice(1));
  }
  setTimeout(probeHover, 80);
}
setTimeout(probeHover, 80);
canvas.addEventListener('pointermove', e => {
  const f = fingers.get(e.pointerId);
  if (!f) {
    if (!hoverNone.matches && e.pointerType !== 'touch') {
      const hit = stage.pick(e.clientX, e.clientY, picks);
      setHover(hit?.object.userData.id); canvas.style.cursor = hit ? 'pointer' : 'grab';
    }
    return;
  }
  const dx = e.clientX - f.x, dy = e.clientY - f.y, dt = Math.max(.008, (e.timeStamp - f.time) / 1000);
  f.x = e.clientX; f.y = e.clientY; f.time = e.timeStamp;
  if (fingers.size > 1) {
    const distance = fingerDistance();
    if (distance && pinchDistance) zoomBy(pinchDistance / distance);
    pinchDistance = distance; velocity.az = velocity.el = 0; return;
  }
  if (Math.hypot(e.clientX - f.startX, e.clientY - f.startY) > 6) {
    swallowClick = true; dragging = true; clearHold(); canvas.style.cursor = 'grabbing';
  }
  if (dragging) {
    viewTarget.az -= dx * .005; viewTarget.el += dy * .004;
    velocity.az = -dx * .005 / dt; velocity.el = dy * .004 / dt; limitView();
  }
});
function releasePointer(e) {
  const f = fingers.get(e.pointerId); if (!f) return;
  if (e.type !== 'pointerup') { swallowClick = true; velocity.az = velocity.el = 0; }
  else if (e.timeStamp - f.time > 80) velocity.az = velocity.el = 0;
  fingers.delete(e.pointerId); clearHold(); pinchDistance = 0;
  if (fingers.size) {
    for (const rest of fingers.values()) { rest.startX = rest.x; rest.startY = rest.y; }
  } else { dragging = false; canvas.style.cursor = 'grab'; }
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);
canvas.addEventListener('lostpointercapture', releasePointer);
canvas.addEventListener('pointerleave', () => { if (!fingers.size) { setHover(null); canvas.style.cursor = 'grab'; } });
canvas.addEventListener('click', e => {
  if (swallowClick) { swallowClick = false; e.preventDefault(); return; }
  const hit = stage.pick(e.clientX, e.clientY, picks); if (hit) go(hit.object.userData.id);
});
canvas.addEventListener('wheel', e => {
  e.preventDefault(); const units = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stage.height : 1;
  zoomBy(Math.exp(e.deltaY * units * .0012)); setHover(null);
}, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
function cancelInput() {
  clearHold(); keyBoost = false; swallowClick = true; dragging = false;
  velocity.az = velocity.el = 0; fingers.clear(); setHover(null); canvas.style.cursor = 'grab';
}
addEventListener('blur', cancelInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelInput(); });
hoverNone.addEventListener('change', () => { setHover(null); texts(); });
motion.addEventListener('change', () => { reduced = motion.matches; velocity.az = velocity.el = 0; });

// ── 相机 ──  cam 是当前姿态，want 是这一帧想去的姿态，from 是起飞时的姿态
const pose = () => ({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), sx: 0, sy: 0 });
const cam = pose(), want = pose(), from = pose();
const tA = new THREE.Vector3(), tB = new THREE.Vector3(), scr = {};
let launched = false, focus = null, flyT = 1, flyDur = 2, rate = 1, tOrbit = 0;
const narrow = () => stage.width < 760 || stage.width < stage.height * .8;

function homePose(o, t) {                              // 俯瞰整个星系；竖屏时把相机横滚 90 度，让椭圆竖着放
  const tanV = Math.tan(camera.fov * Math.PI / 360), tanH = tanV * camera.aspect, R = 69, tall = narrow(), el = tall ? .5 : .56;
  const D = (tall ? Math.max(R / (.70 * tanV), R * Math.sin(el) / (.92 * tanH)) : Math.max(R / (.94 * tanH), R * Math.sin(el) / (.72 * tanV))) * view.zoom;
  const az = (reduced ? 0 : Math.sin(t * .05) * .1 + pointer.sx * .07) + view.az;
  const e = clamp(el + view.el - (reduced ? 0 : pointer.sy * .04), .18, 1.25);
  o.pos.set(Math.sin(az) * Math.cos(e) * D, Math.sin(e) * D, Math.cos(az) * Math.cos(e) * D);
  o.tgt.set(0, 0, 0); o.up.set(tall ? 1 : 0, tall ? 0 : 1, 0); o.sx = tall ? 0 : .05; o.sy = tall ? .11 : -.03;
}
function focusPose(o, p) {                             // 停在行星的受光面斜前方，能看到一条晨昏线
  const tall = narrow(), k = (p.sec.body === 'saturn' ? 8.6 : p.sec.body === 'terra' ? 6.2 : 5.4) * (tall ? 1.7 : 1);
  tA.copy(p.pos).multiplyScalar(-1).normalize();        // 指向太阳
  tB.crossVectors(UP, tA).normalize();
  o.pos.copy(tA).multiplyScalar(.6).addScaledVector(tB, .72).addScaledVector(UP, .28).normalize().applyAxisAngle(UP, view.az);
  const elevation = Math.atan2(o.pos.y, Math.hypot(o.pos.x, o.pos.z)) + view.el;
  o.pos.y = 0; o.pos.normalize().multiplyScalar(Math.cos(elevation)); o.pos.y = Math.sin(elevation);
  o.pos.multiplyScalar(p.size * k * view.zoom).add(p.pos);
  if (!reduced) { o.pos.x += pointer.sx * p.size * .25; o.pos.y -= pointer.sy * p.size * .2; }
  o.tgt.copy(p.pos); o.up.copy(UP); o.sx = tall ? 0 : -.2; o.sy = tall ? -.27 : 0;
}
function copyPose(a, b) { a.pos.copy(b.pos); a.tgt.copy(b.tgt); a.up.copy(b.up); a.sx = b.sx; a.sy = b.sy; }

function apply() {
  const sec = byId(location.hash.slice(1)), next = sec ? P[sec.id] : null;
  if (next === focus) return;
  copyPose(from, cam); flyT = 0; flyDur = next && focus ? 2.4 : 2.1; focus = next;
  view.az = view.el = viewTarget.az = viewTarget.el = velocity.az = velocity.el = velocity.zoom = 0;
  view.zoom = viewTarget.zoom = 1; cancelInput();
  if (focus) rate = Math.min(rate, 1);
  document.body.classList.toggle('focus', !!focus);
  $('#sheet').setAttribute('aria-hidden', String(!focus));
  for (const b of dock.children) b.classList.toggle('on', b.dataset.id === sec?.id);
  if (!focus) return;
  $('#sheet').style.setProperty('--tint', sec.tint);
  fill(sec); $('#content').scrollTop = 0;
}

stage.onFrame((dt, t) => {
  const k = 1 - Math.exp(-dt * 3);
  pointer.sx = reduced ? 0 : lerp(pointer.sx, pointer.x, k); pointer.sy = reduced ? 0 : lerp(pointer.sy, pointer.y, k);
  // 用解析衰减保持不同帧率下相同的惯性距离。
  if (!fingers.size && !reduced) {
    const decay = Math.exp(-Math.LN2 * dt / .35), travel = (1 - decay) * .35 / Math.LN2;
    viewTarget.az += velocity.az * travel; viewTarget.el += velocity.el * travel;
    velocity.az *= decay; velocity.el *= decay;
    if (Math.abs(velocity.az) < .0001) velocity.az = 0;
    if (Math.abs(velocity.el) < .0001) velocity.el = 0;
  }
  limitView();
  const smooth = reduced ? 1 : 1 - Math.exp(-dt * 14), oldZoom = view.zoom;
  view.az = lerp(view.az, viewTarget.az, smooth); view.el = lerp(view.el, viewTarget.el, smooth);
  view.zoom = lerp(view.zoom, viewTarget.zoom, smooth); velocity.zoom = (view.zoom - oldZoom) / Math.max(dt, .001);
  const speeding = !focus && (sunBoost || keyBoost), targetBoost = speeding ? 28 : 1;
  if (targetBoost !== boostTarget) { boostFrom = boost; boostTarget = targetBoost; boostT = 0; }
  boostT = reduced ? 1 : Math.min(1, boostT + dt / .4);
  boost = lerp(boostFrom, boostTarget, ease.out(boostT));
  rate = focus ? (reduced ? .05 : lerp(rate, .05, k)) : boost;
  if (!reduced) tOrbit += dt * rate;
  const number = Math.round(boost);
  if (number !== boostNumber) { multiplierEl.textContent = number; boostNumber = number; }
  boostEl.classList.toggle('on', speeding); boostEl.setAttribute('aria-hidden', String(!speeding));
  for (const line of orbits) line.material.opacity = reduced ? (speeding ? .32 : .16) : .16 + (boost - 1) / 27 * .16;
  if (reduced) stage.uniforms.uTime.value = 0;
  for (const p of all) {
    const a = p.phase + p.speed * tOrbit;
    if (p.sec.body === 'luna') p.pos.set(Math.cos(a) * p.r, Math.sin(a) * .5, Math.sin(a) * p.r).add(P.about.pos);
    else p.pos.set(Math.cos(a) * p.r, 0, Math.sin(a) * p.r);
    p.body.group.position.copy(p.pos); p.body.update(reduced ? 0 : dt, reduced ? 0 : t);
    // 临界阻尼弹簧，约 250ms 到位，不因掉帧而发散。
    const targetScale = p === hovered ? 1.15 : 1;
    if (reduced) { p.scale = targetScale; p.scaleV = 0; }
    else {
      const x = p.scale - targetScale, spring = p.scaleV + 24 * x, decay = Math.exp(-24 * dt);
      p.scale = targetScale + (x + spring * dt) * decay; p.scaleV = (p.scaleV - 24 * spring * dt) * decay;
    }
    p.body.group.scale.setScalar(p.scale);
  }
  sun.update(reduced ? 0 : dt, reduced ? 0 : t); belt.rotation.y = tOrbit * .012;

  focus ? focusPose(want, focus) : homePose(want, t);
  if (reduced) { flyT = 1; copyPose(cam, want); }
  else if (flyT < 1) {
    flyT = Math.min(1, flyT + (launched ? dt / flyDur : 0)); const e = ease.io(flyT);
    cam.pos.lerpVectors(from.pos, want.pos, e); cam.pos.y += Math.sin(Math.PI * e) * from.pos.distanceTo(want.pos) * .16;   // 飞行路线向上拱，避开太阳
    cam.tgt.lerpVectors(from.tgt, want.tgt, e); cam.up.lerpVectors(from.up, want.up, e).normalize();
    cam.sx = lerp(from.sx, want.sx, e); cam.sy = lerp(from.sy, want.sy, e);
  } else copyPose(cam, want);
  camera.position.copy(cam.pos); camera.up.copy(cam.up); camera.lookAt(cam.tgt); camera.updateMatrixWorld();
  stage.shift.x = cam.sx; stage.shift.y = cam.sy;

  const tanV = Math.tan(camera.fov * Math.PI / 360);
  if (speeding) {
    const s = stage.project(sun.group.position, scr), radius = 4 / camera.position.distanceTo(sun.group.position) / tanV * stage.height / 2;
    const x = clamp(s.x, 70, stage.width - 70), y = clamp(s.y + radius + 16, 80, stage.height - 126);
    boostEl.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translateX(-50%)`;
  }
  for (const p of all) {                                // 标签跟着行星走
    const s = stage.project(p.pos, scr), px = p.size * p.ext / camera.position.distanceTo(p.pos) / tanV * stage.height / 2;
    const show = !s.behind && (focus ? p.hop === focus.sec.id && flyT > .7 : flyT > .35 && p.sec.body !== 'luna');
    p.label.classList.toggle('on', show);
    if (show) p.label.style.transform = `translate3d(${(s.x + px + 10).toFixed(1)}px,${s.y.toFixed(1)}px,0) translateY(-50%)`;
  }
});

// ── 开场 ──  从更高更远的地方滑进来
homePose(cam, 0); cam.pos.multiplyScalar(1.7); cam.pos.y *= 1.3;
copyPose(from, cam); flyT = 0; flyDur = 3.4;
texts();
if (byId(location.hash.slice(1))) apply();
addEventListener('animationend', e => { if (e.target.classList?.contains('appear')) e.target.classList.add('is-in'); });
let isReady = false; const t0 = performance.now(), countEl = $('#count'), lbar = $('#l-bar');
Promise.race([Promise.all([sun, ...all.map(p => p.body)].map(b => b.ready)), new Promise(r => setTimeout(r, 8000))]).then(() => { isReady = true; });
(function countdown(now) {                                 // 倒计时 10 → 0；星球没准备好就停在 1
  const p = reduced ? (isReady ? 1 : 0) : Math.min((now - t0) / 1900, isReady ? 1 : .9), n = Math.ceil(10 * (1 - p) - 1e-6);
  if (countEl.textContent !== String(n)) countEl.textContent = n;
  lbar.style.transform = `scaleX(${p.toFixed(3)})`;
  if (p < 1) return requestAnimationFrame(countdown);
  setTimeout(() => { document.body.classList.add('ready'); launched = true; }, reduced ? 0 : 260);
})(t0);
stage.start();
