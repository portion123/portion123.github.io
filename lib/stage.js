// 舞台：渲染器、相机、循环、投影、拾取。页面和引擎模块都从这里拿 THREE，保证只有一份。
import * as THREE from './three.module.min.js';
export { THREE };

export function createStage(canvas, o = {}) {
  const mobile = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = o.exposure ?? 1.05;
  renderer.setClearColor(o.background ?? 0x02030a, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(o.fov ?? 38, 1, o.near ?? 0.05, o.far ?? 8000);
  const sun = new THREE.Vector3(0, 0, 0);            // 太阳的世界坐标：所有天体材质共用这一个光源
  const uniforms = { uSunPos: { value: sun }, uTime: { value: 0 } };
  const fns = [];
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmp = new THREE.Vector3();
  let raf = 0, last = 0, shiftKey = '';

  const stage = {
    THREE, renderer, scene, camera, sun, uniforms, mobile,
    quality: o.quality ?? (mobile ? 'low' : 'high'),
    width: 1, height: 1, time: 0,
    shift: { x: 0, y: 0 },                           // 把画面整体平移（占视口的比例），用来给内容面板让位
    onFrame(fn) { fns.push(fn); return stage; },
    resize() {
      const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
      stage.width = w; stage.height = h;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, o.maxDpr ?? (mobile ? 1.75 : 2)));
      renderer.setSize(w, h, false);
      camera.aspect = w / h; shiftKey = ''; applyShift();
    },
    // 世界坐标 → 屏幕上的 CSS 像素；behind 为 true 表示在相机背后
    project(v, out = {}) {
      tmp.copy(v).project(camera);
      out.x = (tmp.x * 0.5 + 0.5) * stage.width; out.y = (-tmp.y * 0.5 + 0.5) * stage.height;
      out.behind = tmp.z > 1; return out;
    },
    pick(clientX, clientY, objects) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(objects, true)[0] || null;
    },
    start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } return stage; },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };

  function applyShift() {
    const key = stage.shift.x.toFixed(4) + ',' + stage.shift.y.toFixed(4) + ',' + camera.fov.toFixed(3);
    if (key === shiftKey) return; shiftKey = key;
    const w = stage.width, h = stage.height;
    if (stage.shift.x || stage.shift.y) camera.setViewOffset(w, h, -stage.shift.x * w, -stage.shift.y * h, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    stage.time += dt; uniforms.uTime.value = stage.time;
    for (const fn of fns) fn(dt, stage.time);
    applyShift();
    renderer.render(scene, camera);
  }
  new ResizeObserver(() => stage.resize()).observe(canvas);
  document.addEventListener('visibilitychange', () => document.hidden ? stage.stop() : stage.start());
  stage.resize();
  return stage;
}

// 小工具：缓动和补间
export const ease = { io: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, out: t => 1 - Math.pow(1 - t, 3) };
export const clamp01 = t => Math.min(1, Math.max(0, t));
export const lerp = (a, b, t) => a + (b - a) * t;
