import { THREE } from '../stage.js';

const TAU = Math.PI * 2;
function random(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function gaussian(r) { return Math.sqrt(-2 * Math.log(Math.max(r(), 1e-8))) * Math.cos(TAU * r()); }
const tmpPos = new THREE.Vector3();
function follow(object) {                              // 天空在无限远：每帧跟着相机走
  object.frustumCulled = false;
  object.onBeforeRender = (_renderer, _scene, camera) => { object.position.copy(camera.getWorldPosition(tmpPos)); object.updateMatrixWorld(); };
  return object;
}

// ── 用显卡把星云烘焙成一张等距柱状贴图（只算一次）。暗部用开方编码，避免 8 位色带 ──
const NOISE = /* glsl */`
vec3 hash3(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return -1.+2.*fract(sin(p)*43758.5453123); }
float noise(vec3 p){ vec3 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);
  return .5+.5*mix(mix(mix(dot(hash3(i),f),dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
    mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z); }
const mat3 ROT=mat3(0.,.8,.6,-.8,.36,-.48,-.6,-.48,.64);
float fbm(vec3 p){ float v=0.,a=.5; for(int i=0;i<6;i++){ v+=a*(noise(p)-.5); p=ROT*p*2.02+vec3(7.1,13.7,2.4); a*=.5; } return v*3.4; }   // 约为均值 0、标准差 1
vec3 skyDir(vec2 uv){ float phi=uv.x*6.2831853, th=(1.-uv.y)*3.14159265; return vec3(-cos(phi)*sin(th),cos(th),sin(phi)*sin(th)); }`;
function bake(stage, body, uniforms, w = 2048, h = 1024) {
  const r = stage.renderer, target = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, wrapS: THREE.RepeatWrapping, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const mat = new THREE.ShaderMaterial({ uniforms, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=position.xy*.5+.5; gl_Position=vec4(position.xy,0.,1.); }',
    fragmentShader: `precision highp float; varying vec2 vUv; uniform float uSeed; ${NOISE}\n${body}` });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(mesh);
  const old = r.getRenderTarget(); r.setRenderTarget(target); r.render(scene, new THREE.Camera()); r.setRenderTarget(old);
  geo.dispose(); mat.dispose(); return target.texture;
}
function skySphere(texture, intensity) {
  const material = new THREE.ShaderMaterial({ uniforms: { map: { value: texture }, intensity: { value: intensity } }, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: /* glsl */`uniform sampler2D map; uniform float intensity; varying vec2 vUv;
      void main(){ vec3 c=texture2D(map,vUv).rgb; c*=c;
        float d=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;      // 抖动，盖住色带
        gl_FragColor=vec4(max(c*intensity+d*.0012,0.),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const sphere = follow(new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), material)); sphere.renderOrder = -100; return sphere;
}

const starVertex = /* glsl */`attribute vec3 aPos; attribute vec3 aColor; attribute float aSize; attribute float aPhase; varying vec3 vColor; varying float vPhase; varying vec2 vP;
  uniform vec2 uRes; uniform float uDpr; uniform float uTime; uniform float uTwinkle; uniform float uWarp; uniform vec2 uFoe;
  void main(){ vP=position.xy; vPhase=aPhase; vColor=aColor*(1.+uTwinkle*.22*sin(uTime*(.6+aPhase*1.7)+aPhase*97.));
    vec4 c=projectionMatrix*modelViewMatrix*vec4(aPos,1.);
    vec2 offset=position.xy*aSize;
    if(abs(uWarp)>0.) {
      vec2 d=c.xy/c.w-uFoe; float len=length(d); vec2 dir=len>1e-4?d/len:vec2(1.,0.);
      float stretch=abs(uWarp)*clamp(len,0.,1.5)*26.;
      offset=dir*(position.x*(aSize+stretch)-sign(uWarp)*stretch*.5)+vec2(-dir.y,dir.x)*position.y*aSize;
      vColor/=1.+stretch/aSize*.35;
    }
    c.xy+=offset*uDpr/uRes*c.w; gl_Position=c; }`;   // 方片大小按屏幕像素算，不随距离变
const starFragment = /* glsl */`varying vec3 vColor; varying float vPhase; varying vec2 vP;
  void main(){ float r=length(vP);
    float core=(exp(-r*r*9.)+.22*exp(-r*r*2.6))*(1.-smoothstep(.7,1.,r));
    float spike=(exp(-abs(vP.x)*30.)*exp(-abs(vP.y)*3.5)+exp(-abs(vP.y)*30.)*exp(-abs(vP.x)*3.5))*step(.96,vPhase)*.45;   // 最亮的星有淡淡的十字星芒
    gl_FragColor=vec4(vColor*(core+spike),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const BAND_N = [.38, .82, .43];                        // 银河带所在大圆的法线，星点和辉光共用

export function createStars(stage, { count = 8000, seed = 1, milkyWay = true, twinkle = true, brightness = 1 } = {}) {
  const r = random(seed), total = Math.max(0, Math.floor(count)), pos = new Float32Array(total * 3), color = new Float32Array(total * 3), size = new Float32Array(total), phase = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    let x, y, z;
    if (milkyWay && r() < .42) { const a = TAU * r(), d = gaussian(r) * .12; x = Math.cos(a) * .749 + Math.sin(a) * .489 + d * BAND_N[0]; y = Math.cos(a) * -.347 + Math.sin(a) * .471 + d * BAND_N[1]; z = Math.sin(a) * -.734 + d * BAND_N[2]; const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l; }
    else { y = r() * 2 - 1; const a = TAU * r(), q = Math.sqrt(1 - y * y); x = q * Math.cos(a); z = q * Math.sin(a); }
    pos.set([x * 1500, y * 1500, z * 1500], i * 3);
    const m = r(), lum = .16 + Math.pow(m, 6) * .5 + Math.pow(m, 60) * 2.4, temp = r();           // 大量暗星、少数亮星、极少数很亮
    color.set([(temp < .5 ? .70 + temp * .6 : 1) * lum * brightness, (temp < .5 ? .80 + temp * .4 : 1 - (temp - .5) * .36) * lum * brightness, (temp < .5 ? 1 : 1 - (temp - .5) * .95) * lum * brightness], i * 3);
    size[i] = 2.2 + Math.min(6, lum * 2.4); phase[i] = lum > 1.3 ? .97 + r() * .03 : r() * .94;
  }
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3)); geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3));
  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1)); geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1)); geo.instanceCount = total;
  const mat = new THREE.ShaderMaterial({ uniforms: { uWarp: { value: 0 }, uFoe: { value: new THREE.Vector2() }, uDpr: { value: 1 }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: stage.uniforms.uTime, uTwinkle: { value: twinkle ? 1 : 0 } }, vertexShader: starVertex, fragmentShader: starFragment, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true });
  const setWarp = (amount, foeX, foeY) => { mat.uniforms.uWarp.value = amount; mat.uniforms.uFoe.value.set(foeX, foeY); };
  const points = follow(new THREE.Mesh(geo, mat)); const base = points.onBeforeRender;
  points.onBeforeRender = (renderer, scene, camera, ...args) => { base(renderer, scene, camera, ...args); mat.uniforms.uDpr.value = renderer.getPixelRatio(); renderer.getDrawingBufferSize(mat.uniforms.uRes.value); }; points.renderOrder = -90;
  points.setWarp = setWarp;
  if (!milkyWay) return points;
  const band = bake(stage, /* glsl */`uniform vec3 uN;
    void main(){ vec3 p=skyDir(vUv); float d=dot(p,uN);
      vec3 w=vec3(fbm(p*2.1+uSeed),fbm(p*2.1+uSeed+31.),fbm(p*2.1+uSeed+67.))*.16;
      float glow=exp(-d*d*34.)*clamp(.55+.42*fbm(p*4.5+w*2.4),0.,1.5);
      float lanes=smoothstep(.2,1.3,fbm(p*11.+w*5.))*exp(-d*d*160.);                         // 银河中间断续的暗带
      vec3 col=mix(vec3(.42,.50,.78),vec3(.70,.64,.62),clamp(.5+.4*fbm(p*1.6+uSeed*.7),0.,1.))*glow*(1.-lanes*.85)*.04;
      gl_FragColor=vec4(sqrt(max(col,0.)),1.); }`, { uSeed: { value: seed * .731 }, uN: { value: new THREE.Vector3(...BAND_N).normalize() } }, 1024, 512);
  const group = new THREE.Group(); group.add(skySphere(band, brightness), points); group.setWarp = setWarp; return group;
}
export function createNebula(stage, { colors = ['#1b2a6b', '#5a2a7a', '#0e6a7a'], intensity = .35, seed = 1 } = {}) {
  const c = [0, 1, 2].map(i => new THREE.Color(colors[i] || ['#1b2a6b', '#5a2a7a', '#0e6a7a'][i]));
  const tex = bake(stage, /* glsl */`uniform vec3 uA,uB,uC;
    void main(){ vec3 p=skyDir(vUv);
      vec3 w=vec3(fbm(p*1.5+uSeed),fbm(p*1.5+uSeed+31.),fbm(p*1.5+uSeed+67.))*.2;
      float big=fbm(p*1.7+w*2.6+uSeed);                                                     // 大块结构：大半个天空是黑的
      float fil=1.-abs(fbm(p*4.2+w*4.)*.75);                                                // 纤维状云丝
      float dens=smoothstep(.15,2.1,big)*(.15+.85*pow(clamp(fil,0.,1.),3.));
      float lanes=smoothstep(.1,1.2,fbm(p*7.5+w*3.5+9.));
      float hue=fbm(p*1.2+w*1.4+uSeed*1.7);
      vec3 col=mix(uA,uB,smoothstep(-.35,.25,hue)); col=mix(col,uC,smoothstep(.25,.9,hue));
      col*=dens*(1.-lanes*.65)*2.4; col+=vec3(1.,.86,.8)*pow(dens,3.)*.35;                  // 最浓处微微泛白
      gl_FragColor=vec4(sqrt(max(col,0.)),1.); }`, { uSeed: { value: seed * 1.37 }, uA: { value: c[0] }, uB: { value: c[1] }, uC: { value: c[2] } });
  return skySphere(tex, intensity);
}
export function createGalaxy(stage, {count=60000, radius=100, arms=2, seed=1}={}) {
  const r=random(seed), n=Math.max(0,Math.floor(count*(stage.quality==='low'?.5:1))), armCount=Math.max(1,Math.floor(arms)), R=Math.max(.001,radius);
  const pos=new Float32Array(n*3), colors=new Float32Array(n*3), sizes=new Float32Array(n), phases=new Float32Array(n);
  const angle=(arm,u)=>arm*TAU/armCount+Math.log(1+u*8)*1.55;
  function armPoint(arm,u) { u=THREE.MathUtils.clamp(u,0,1); const a=angle(arm,u), d=R*(.075+.925*u); return new THREE.Vector3(Math.cos(a)*d,0,Math.sin(a)*d); }
  for(let i=0;i<n;i++) {
    const kind=r(); let x,y,z, col, lum, sz;
    if(kind<.28) { const d=Math.min(.26,Math.abs(gaussian(r))*.075)*R, a=TAU*r(); x=Math.cos(a)*d*1.35; z=Math.sin(a)*d*.7; y=gaussian(r)*R*.025*Math.exp(-d/R*4); col=[1,.72,.39]; lum=.14+Math.pow(r(),8)*1.4; sz=1.3+Math.pow(r(),8)*3; }
    else if(kind<.93) { const u=Math.pow(r(),.8), arm=Math.floor(r()*armCount), d=R*(.075+.925*u), a=angle(arm,u)+gaussian(r)*(.10+.17*u); const spread=gaussian(r)*R*(.012+.025*u); x=Math.cos(a)*(d+spread); z=Math.sin(a)*(d+spread); y=gaussian(r)*R*(.006+.015*Math.exp(-u*3)); const pink=r()<.035; col=pink?[1,.25,.45]:(r()<.64?[.55,.71,1]:[1,.78,.55]); lum=.055+Math.pow(r(),9)*1.15; if(pink) lum*=1.5; sz=1.1+Math.pow(r(),10)*3; }
    else { const d=R*(.2+Math.sqrt(r())*.95), a=TAU*r(); x=Math.cos(a)*d; z=Math.sin(a)*d; y=gaussian(r)*R*.035; col=[.7,.72,.85]; lum=.025+Math.pow(r(),12)*.4; sz=1.1; }
    pos.set([x,y,z],i*3); colors.set(col.map(c=>c*lum),i*3); sizes[i]=sz; phases[i]=r();
  }
  const geo=new THREE.BufferGeometry(); for(const [key,arr,item] of [['position',pos,3],['aColor',colors,3],['aSize',sizes,1],['aPhase',phases,1]]) geo.setAttribute(key,new THREE.BufferAttribute(arr,item));
  const mat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uDpr:{value:1},uScale:{value:1},uRadius:{value:R}},transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
    vertexShader:`attribute vec3 aColor; attribute float aSize; varying vec3 vColor; uniform float uTime,uDpr,uScale,uRadius; void main(){float d=length(position.xz)/uRadius; float a=uTime*.018/(.28+d*3.); float c=cos(a),s=sin(a); vec3 p=vec3(c*position.x-s*position.z,position.y,s*position.x+c*position.z); vec4 mv=modelViewMatrix*vec4(p,1.); vColor=aColor; gl_Position=projectionMatrix*mv; gl_PointSize=clamp(aSize*uDpr*uScale/max(1.,-mv.z),.8*uDpr,12.*uDpr);}`,
    fragmentShader:`varying vec3 vColor; void main(){float d=length(gl_PointCoord-.5)*2.; float a=exp(-d*d*5.)*smoothstep(1.,.5,d); gl_FragColor=vec4(vColor*a,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
  const points=new THREE.Points(geo,mat); points.frustumCulled=false; points.onBeforeRender=(renderer)=>{mat.uniforms.uDpr.value=renderer.getPixelRatio(); mat.uniforms.uScale.value=renderer.getSize(new THREE.Vector2()).y*.75;};
  const haloMat=new THREE.ShaderMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,uniforms:{},vertexShader:`varying vec2 vUv; void main(){vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); mv.xy+=position.xy; gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec2 vUv; void main(){float d=length(vUv-.5)*2.; float a=exp(-d*d*6.)*smoothstep(1.,.25,d); gl_FragColor=vec4(vec3(1.,.57,.24)*a*.24,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(R*.55,R*.55),haloMat);
  const diskMat=new THREE.ShaderMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:mat.uniforms.uTime,uArms:{value:armCount}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv; uniform float uTime,uArms;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
    void main(){vec2 p=(vUv-.5)*2.3; float r=length(p); float a=atan(-p.y,p.x)-uTime*.018/(.28+r*3.); float u=max(0.,(r-.075)/.925); float spiral=log(1.+u*8.)*1.55; float phase=(a-spiral)*uArms; float arm=pow(.5+.5*cos(phase),14.); float grain=noise(p*22.)*.6+noise(p*53.)*.4; float dust=pow(.5+.5*cos(phase-.6),28.)*smoothstep(.18,.45,grain); float fade=exp(-r*2.5)*smoothstep(1.1,.65,r); float disk=(.045+arm*(.22+.28*grain))*(1.-dust*.8)*fade; float core=exp(-r*r*85.)*.35; vec3 col=vec3(.20,.35,.65)*disk+vec3(1.,.50,.20)*core; gl_FragColor=vec4(col,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  const disk=new THREE.Mesh(new THREE.PlaneGeometry(R*2.3,R*2.3),diskMat); disk.rotation.x=-Math.PI/2; disk.position.y=-R*.012;
  const group=new THREE.Group(); group.add(disk,points,halo);
  return {group,update(dt,t){mat.uniforms.uTime.value=t;},armPoint};
}
