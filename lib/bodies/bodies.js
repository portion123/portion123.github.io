import { THREE } from '../stage.js';

// 所有经纬度均为东经、北纬；与 SphereGeometry 的 UV 完全一致。
export function latLonToVec3(lat, lon, radius = 1) {
  const a = lat * Math.PI / 180, b = lon * Math.PI / 180;
  return new THREE.Vector3(radius * Math.cos(a) * Math.cos(b), radius * Math.sin(a), -radius * Math.cos(a) * Math.sin(b));
}

const TAU = Math.PI * 2;
const CONFIG = {
  sun: [0.126, 0.018], mercury: [0.0006, 0.009], venus: [3.096, -0.004],
  terra: [0.41, 0.022], luna: [0.116, 0.006], mars: [0.44, 0.021],
  jupiter: [0.055, 0.038], saturn: [0.47, 0.034], uranus: [1.71, -0.024], neptune: [0.494, 0.028],
};
const IDS = { terra: 0, luna: 1, mercury: 2, venus: 3, mars: 4, jupiter: 5, saturn: 6, uranus: 7, neptune: 8, sun: 9 };
function random(seed) {
  let s = seed >>> 0;
  return () => { s += 0x6D2B79F5; let n = Math.imul(s ^ s >>> 15, 1 | s); n ^= n + Math.imul(n ^ n >>> 7, 61 | n); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}
function seedNumber(seed) {
  if (typeof seed === 'number') return seed >>> 0;
  let n = 2166136261;
  for (const c of String(seed ?? 'cosmos')) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}

// 手绘海岸线，保留半岛、海湾和主要岛屿。
const COASTS = [
  // 欧亚（白令海峡处拆开，避免日期变更线穿过多边形）
  `-10,36 -9,39 -9,43 -2,44 -1,48 -5,48 -5,50 1,51 4,53 8,54 8,57 11,58 8,59 5,59 5,62 10,65 15,69 23,71 30,70 32,67 41,67 43,69 51,69 57,71 66,69 69,73 80,73 87,77 100,77 108,74 116,73 126,73 132,71 141,72 150,71 160,69 170,70 180,68 180,64 173,64 177,62 170,60 164,60 160,57 163,56 162,54 157,51 156,55 153,59 147,60 142,59 140,57 137,55 140,53 141,50 140,46 137,44 134,43 132,43 130,42 129,40 127,39 129,37 129,35 127,34 126,35 126,37 124,39 122,40 121,39 122,37 120,37 119,39 118,39 118,38 119,37 122,37 123,36 120,35 120,34 121,32 122,31 121,30 122,30 121,29 121,28 120,27 119,25 118,24 116,23 114,22 112,22 110,21 110,20 109,21 108,21 108,19 107,17 109,14 109,12 108,11 106,10 105,9 104,10 103,11 102,12 101,13 100,13 100,10 101,7 103,4 104,2 104,1 102,1 100,4 99,7 98,9 98,13 97,16 96,16 94,19 93,21 90,22 88,21 87,20 85,19 83,17 81,16 80,13 80,10 78,8 77,8 76,10 75,14 73,17 72,20 70,21 69,23 67,24 66,25 62,25 58,25 57,24 56,26 54,26 52,28 50,30 49,29 50,26 52,24 55,24 56,22 59,22 58,19 55,17 52,16 48,14 45,13 43,13 42,16 40,20 38,24 36,28 34,29 33,31 35,32 36,36 33,36 30,36 28,37 27,40 29,41 33,42 37,42 40,43 39,45 35,45 33,44 30,46 28,46 29,44 28,42 26,41 24,40 24,38 23,38 24,36 22,37 20,40 19,41 19,43 17,43 16,44 14,45 13,46 13,44 15,42 16,40 18,40 18,39 16,38 15,38 15,40 13,41 12,42 10,44 8,44 7,43 5,43 3,43 3,41 1,41 0,39 -2,37 -5,36`,
  `-180,68 -170,67 -169,65 -173,64 -178,65 -180,64`,
  // 非洲
  `-17,21 -17,16 -16,12 -14,10 -13,9 -13,8 -11,7 -9,5 -5,5 -2,5 1,6 3,6 5,5 6,4 8,4 9,2 10,1 9,-2 11,-5 12,-8 14,-11 13,-15 12,-18 14,-22 15,-26 17,-29 18,-32 20,-35 24,-34 27,-33 30,-30 32,-27 33,-25 35,-24 35,-20 37,-18 40,-15 40,-11 39,-8 40,-5 42,-1 45,3 48,6 51,11 48,12 44,11 43,13 41,16 39,19 37,22 35,26 33,28 32,31 30,31 27,31 25,32 22,33 20,32 19,30 15,33 12,33 10,34 11,37 9,37 7,37 4,37 1,36 -2,35 -5,36 -7,34 -9,32 -10,30 -12,28 -13,27 -13,24 -16,22`,
  // 北美
  `-168,66 -164,64 -162,60 -166,60 -164,55 -160,56 -156,57 -153,59 -149,60 -146,60 -141,60 -137,58 -135,56 -132,54 -130,51 -128,50 -126,48 -124,46 -124,42 -122,38 -121,36 -118,34 -117,32 -115,30 -114,28 -112,27 -110,24 -109,23 -110,23 -112,25 -113,27 -115,28 -116,30 -117,32 -114,32 -112,31 -111,29 -109,27 -108,25 -106,23 -105,20 -103,18 -100,17 -97,16 -94,16 -92,14 -90,14 -88,13 -86,11 -84,10 -83,8 -81,8 -79,9 -77,8 -77,9 -80,10 -82,10 -84,13 -86,16 -88,16 -88,18 -87,21 -90,22 -91,20 -94,18 -96,19 -97,22 -97,26 -96,28 -93,29 -90,29 -89,30 -86,30 -85,29 -83,29 -82,27 -81,25 -80,25 -80,28 -81,30 -80,32 -78,34 -76,35 -76,37 -75,39 -74,40 -72,41 -70,42 -70,44 -67,45 -65,44 -63,45 -61,46 -60,47 -64,48 -66,49 -68,49 -69,48 -71,47 -69,49 -66,50 -62,50 -60,52 -56,52 -55,54 -59,56 -61,59 -65,60 -68,59 -70,58 -72,60 -75,61 -77,59 -78,56 -79,54 -82,52 -84,52 -86,55 -89,56 -92,57 -94,60 -92,63 -88,65 -85,67 -81,68 -82,70 -86,70 -90,72 -98,72 -103,70 -111,69 -120,70 -128,70 -136,69 -143,70 -150,71 -157,71 -163,70`,
  // 南美
  `-81,12 -77,10 -75,11 -72,12 -69,12 -67,10 -64,10 -61,10 -60,8 -58,7 -55,6 -52,4 -50,1 -48,-1 -44,-2 -41,-3 -38,-5 -35,-6 -35,-9 -37,-12 -39,-15 -40,-18 -40,-22 -43,-23 -46,-24 -48,-26 -49,-29 -51,-31 -53,-33 -55,-35 -57,-36 -58,-38 -61,-39 -63,-41 -65,-43 -66,-46 -68,-48 -69,-51 -68,-54 -66,-55 -70,-55 -73,-52 -74,-49 -75,-46 -74,-43 -73,-40 -73,-36 -72,-32 -71,-28 -70,-24 -70,-20 -72,-17 -75,-15 -77,-12 -79,-8 -81,-6 -81,-3 -80,0 -79,2 -78,3 -77,5 -77,7 -79,9`,
  // 澳洲、格陵兰、南极
  `113,-22 114,-26 115,-31 118,-34 122,-34 125,-32 129,-32 132,-32 135,-35 138,-35 140,-38 144,-38 147,-39 150,-37 152,-32 153,-28 151,-24 149,-21 147,-19 146,-16 144,-14 143,-11 142,-11 141,-14 140,-17 137,-17 136,-15 135,-12 132,-12 130,-12 129,-15 126,-14 124,-16 122,-17 120,-19 116,-20`,
  `-73,60 -66,61 -61,64 -55,67 -52,70 -54,73 -58,76 -66,77 -72,79 -66,82 -52,83 -39,83 -24,81 -17,78 -20,75 -22,72 -27,70 -33,68 -39,65 -43,61 -47,60 -52,60 -59,61`,
  `-180,-78 -160,-77 -145,-75 -130,-74 -115,-74 -100,-74 -90,-73 -80,-73 -73,-69 -67,-66 -62,-63 -59,-64 -62,-68 -67,-71 -62,-74 -50,-77 -35,-78 -20,-73 -5,-71 10,-70 25,-71 40,-69 55,-66 70,-68 85,-67 100,-66 115,-66 130,-66 145,-68 160,-71 175,-77 180,-78 180,-90 -180,-90`,
  // 日本、英国、爱尔兰、台湾、海南、朝鲜海峡岛屿
  `131,34 133,34.4 135,34.2 135.8,33.5 136.9,34.3 137.8,34.6 138.7,34.6 139,35.2 139.8,35.4 140.4,35.1 140.9,35.7 140.8,36.5 141.1,37.6 141.7,39.4 141.5,40.8 140.8,41.5 140.3,41.2 140.2,40.2 139.8,39.9 139.5,38.3 138.5,37.7 137.2,37.5 136.6,36.7 135.8,35.7 134.2,35.6 132.3,35.5 130.9,34.5`,
  `140,42 141,45 142,45 145,44 145,43 143,42 142,42`,
  `130,31 131,32 131,34 130,34 129,33 130,32`,
  `133,33 135,34 134,35 132,34`,
  `142,46 144,49 143,52 142,54 141,53 142,50`,
  `-5,50 -3,50 0,51 2,52 0,53 -1,55 -2,56 -3,58 -5,59 -6,57 -5,55 -3,54 -5,53`,
  `-10,51 -8,51 -6,52 -6,54 -7,55 -9,55 -10,53`,
  `120.1,22 120.8,21.9 121.5,23 122,25 121.5,25.3 120.7,24.4`,
  `108.6,18.3 109.5,18.1 110.8,19.2 110.5,20.1 109.3,20.1 108.6,19.4`,
  `126.1,33.2 126.9,33.3 126.8,33.6 126.1,33.5`,
  // 马达加斯加、斯里兰卡、印尼、菲律宾、新几内亚、新西兰
  `43,-12 45,-13 48,-13 50,-16 49,-20 47,-24 45,-26 44,-25 44,-22 43,-17`,
  `80,10 82,8 82,6 80,6 79,8`,
  `95,6 98,5 101,1 104,-3 106,-6 104,-6 101,-3 99,0 97,2`,
  `105,-6 108,-6 111,-7 114,-7 115,-8 113,-9 110,-8 107,-8`,
  `109,7 112,7 115,6 118,5 119,2 117,0 117,-3 114,-4 111,-3 109,-1 109,2`,
  `119,-5 120,-4 120,-2 122,-1 123,0 125,1 124,2 121,1 120,0 121,-2 123,-3 123,-5 122,-5 121,-3 120,-5`,
  `116,-8 119,-8 120,-9 118,-9`, `120,-9 124,-9 126,-8 127,-8 125,-10 122,-10`,
  `120,18 122,18 123,16 122,14 121,13 120,14`, `124,12 125,11 126,8 125,6 123,7 122,9`,
  `118,10 119,11 119,9 117,7 117,8`, `122,12 124,12 124,10 122,10`,
  `131,-1 134,-1 136,-3 140,-2 143,-3 147,-5 150,-6 151,-9 148,-10 145,-8 142,-9 139,-8 136,-5 133,-4 132,-2`,
  `172,-34 175,-35 176,-37 178,-38 178,-40 175,-41 174,-39 174,-37`,
  `174,-41 173,-43 171,-45 168,-47 166,-46 168,-44 170,-43 172,-41`,
  `144,-40 147,-41 148,-43 146,-44 145,-43`,
  // 地中海、大西洋和北极岛屿
  `-24,64 -22,66 -18,66 -14,65 -15,64 -20,63`, `8,41 9,41 10,43 9,43`, `8,39 9,39 10,41 9,41`,
  `12,38 15,38 15,37 13,37`, `23,35 26,35 26,36 24,36`,
  `-85,22 -81,23 -78,22 -75,21 -74,20 -78,20 -81,22`, `-74,20 -71,20 -68,19 -69,18 -72,18`,
  `-57,47 -54,47 -53,49 -55,51 -57,50 -59,48`,
  `-78,63 -72,64 -65,67 -63,70 -68,72 -75,72 -80,69 -82,66`,
  `-89,76 -80,77 -70,80 -61,82 -72,83 -86,82 -92,79`,
  `-117,73 -110,72 -104,73 -101,76 -111,77 -119,75`,
  `12,77 17,80 23,80 25,78 20,77`, `46,68 52,71 58,75 55,77 50,74`,
];

let geography;
function makeGeography() {
  if (geography) return geography;
  const w = 2048, h = 1024, canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#fff';
  for (const coast of COASTS) {
    const pts = coast.trim().split(/\s+/).map(p => p.split(',').map(Number));
    ctx.beginPath();
    pts.forEach(([lon, lat], i) => { const x = (lon + 180) / 360 * w, y = (90 - lat) / 180 * h; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath(); ctx.fill();
  }
  // 内陆水体。
  ctx.fillStyle = '#000';
  for (const [lon, lat, rx, ry, angle] of [[51,42,2.5,5,-.22],[60,45,1.2,1.8,0],[108,53, .7,2.4,.5],[-87,45,1.1,2.5,.1],[-84,44,1.5,1,0],[-89,48,2.5,1,0],[-81,42,1.5,.6,0],[-77,44,1,.4,0]]) {
    ctx.beginPath(); ctx.ellipse((lon+180)/360*w,(90-lat)/180*h,rx/360*w,ry/180*h,angle,0,TAU); ctx.fill();
  }
  const pixels = ctx.getImageData(0,0,w,h).data;
  const dist = new Float32Array(w*h), inside = new Uint8Array(w*h);
  for (let i=0;i<inside.length;i++) inside[i] = pixels[i*4] > 127 ? 1 : 0;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const i=y*w+x, a=inside[i];
    dist[i] = a!==inside[y*w+(x+1)%w] || a!==inside[y*w+(x+w-1)%w] || (y>0 && a!==inside[i-w]) || (y<h-1 && a!==inside[i+w]) ? 0 : 10000;
  }
  // 环绕 X 的倒角距离场，阈值在运行时求取。
  for (let pass=0;pass<2;pass++) {
    for (let y=1;y<h;y++) for (let x=0;x<w;x++) { const i=y*w+x; dist[i]=Math.min(dist[i],dist[y*w+(x+w-1)%w]+1,dist[i-w]+1,dist[(y-1)*w+(x+w-1)%w]+1.414,dist[(y-1)*w+(x+1)%w]+1.414); }
    for (let y=h-2;y>=0;y--) for (let x=w-1;x>=0;x--) { const i=y*w+x; dist[i]=Math.min(dist[i],dist[y*w+(x+1)%w]+1,dist[i+w]+1,dist[(y+1)*w+(x+1)%w]+1.414,dist[(y+1)*w+(x+w-1)%w]+1.414); }
  }
  const data = new Uint8Array(w*h*4);
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const i=y*w+x, j=((h-1-y)*w+x)*4;
    data[j]=Math.round(128+(inside[i]?1:-1)*Math.min(126,dist[i]*5+2)); data[j+3]=255;
  }
  // 城市聚落先撒点，再与烘焙后的陆地相乘。
  ctx.clearRect(0,0,w,h); const rng=random(202405);
  const cities = [[121,31,7,7,1],[116,39,5,4,.9],[113,23,5,4,.9],[105,30,4,4,.65],[114,30,6,4,.75],[118,35,7,6,.9],[139,36,4,5,1],[135,35,4,3,1],[127,37,2,3,1],[121,24,1,2,.9],[77,28,8,6,.9],[80,23,9,10,.75],[73,19,3,5,.9],[90,24,4,3,.8],[106,11,4,8,.55],[101,14,3,5,.6],[107,-7,7,2,.75],[10,50,16,7,1],[0,52,4,5,.9],[15,42,6,6,.8],[31,30,2,7,.9],[30,50,10,6,.6],[44,55,10,5,.5],[-75,40,7,7,1],[-85,36,12,8,.7],[-119,36,3,8,.7],[-99,20,5,5,.7],[-47,-23,9,6,.65],[-58,-34,3,3,.6],[151,-33,2,5,.5],[18,-27,2,5,.4]];
  for (const [lon,lat,sx,sy,power] of cities) for(let n=0;n<1000*power;n++) {
    const g=()=>Math.sqrt(-2*Math.log(Math.max(.0001,rng())))*Math.cos(TAU*rng());
    const x=(lon+g()*sx*.43+180)/360*w, y=(90-lat-g()*sy*.43)/180*h;
    ctx.fillStyle=`rgba(255,255,255,${.3+rng()*.7})`; ctx.fillRect(x,y,.55+rng()*.8,.55+rng()*.8);
  }
  const lights=ctx.getImageData(0,0,w,h).data;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) data[((h-1-y)*w+x)*4+1]=lights[(y*w+x)*4+3];
  geography=new THREE.DataTexture(data,w,h); geography.wrapS=THREE.RepeatWrapping;
  geography.magFilter=THREE.LinearFilter; geography.minFilter=THREE.LinearFilter; geography.needsUpdate=true;
  return geography;
}

const NOISE = /* glsl */`
float hash(vec3 p) { p=fract(p*.1031); p+=dot(p,p.yzx+33.33); return fract((p.x+p.y)*p.z); }
vec3 hash3(vec3 p) { return vec3(hash(p),hash(p+17.71),hash(p+51.31)); }
float noise(vec3 p) {
  vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) { float v=0.,a=.52; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec3(7.1,13.7,2.4); a*=.49; } return v; }
vec3 sphere(vec2 uv) { float lat=(uv.y-.5)*3.141592654, lon=(uv.x-.5)*6.283185307; return vec3(cos(lat)*cos(lon),sin(lat),-cos(lat)*sin(lon)); }
float spot(vec3 p,float lon,float lat,float sx,float sy) {
  vec3 c=sphere(vec2(lon/360.+.5,lat/180.+.5));
  vec3 east=normalize(vec3(c.z,0.,-c.x)), north=normalize(cross(c,east));
  vec2 q=vec2(dot(p-c,east)/sx,dot(p-c,north)/sy); return exp(-dot(q,q)*2.)*smoothstep(.15,.65,dot(p,c));
}
`;

const BAKE_FRAGMENT = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uGeo;
uniform float uSeed;
uniform int uKind;
${NOISE}
// 三维细胞上的环坑，在球面上连续。
vec2 craters(vec3 p,float scale) {
  vec3 q=p*scale,cell=floor(q); float h=0.,rays=0.;
  for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) for(int z=-1;z<=1;z++) {
    vec3 cell2=cell+vec3(float(x),float(y),float(z)); vec3 rnd=hash3(cell2+uSeed);
    vec3 delta=q-(cell2+.15+.7*rnd); float size=.12+.31*hash(cell2+3.9);
    float d=length(delta)/size;
    float bowl=-.43*(1.-smoothstep(.05,.91,d));
    float rim=.29*exp(-pow((d-1.)*8.,2.));
    h+=bowl+rim;
    if(scale<12.) rays+=exp(-d*.6)*pow(.5+.5*sin(atan(delta.y,delta.x)*31.+rnd.x*31.),12.)*.11;
  }
  return vec2(h,rays);
}
void bakeField() {
  vec3 p=sphere(vUv), q=p+vec3(uSeed*.031); float f=fbm(q*5.), fine=fbm(q*50.);
  float lat=asin(clamp(p.y,-1.,1.)), absLat=abs(lat); vec3 color=vec3(.3); float height=f;
  if(uKind==0) {
    vec2 geo=texture2D(uGeo,vUv).rg;
    float shore=geo.r+(fbm(q*160.)-.5)*.050+(noise(q*620.)-.5)*.014;
    float mountain=spot(p,85.,31.,.30,.065)+spot(p,98.,33.,.24,.14)*.5+spot(p,-72.,-24.,.045,.60)+spot(p,-111.,43.,.095,.38)*.7+spot(p,10.,46.,.09,.04)*.65+spot(p,43.,42.,.10,.04)*.5;
    float ridge=1.-abs(fbm(q*95.)*2.-1.);
    height=clamp(.10+f*.22+mountain*(.24+ridge*.45)+fine*.05,0.,1.);
    float dry=spot(p,15.,25.,.60,.20)+spot(p,47.,24.,.25,.16)+spot(p,68.,41.,.35,.12)*.7+spot(p,84.,40.,.15,.06)+spot(p,104.,44.,.28,.08)*.8+spot(p,134.,-25.,.30,.17)+spot(p,-112.,33.,.17,.13)*.75+spot(p,21.,-23.,.18,.14)*.75;
    gl_FragColor=vec4(shore,height,clamp(dry*.95+(f-.5)*.2,0.,1.),geo.g); return;
  }
  if(uKind==10) {
    // 扭曲坐标形成气旋与西风带；只在烘焙时计算多层噪声。
    vec3 w1=vec3(fbm(q*2.3+11.),fbm(q*2.3+23.),fbm(q*2.3+37.))-.5;
    vec3 pw=p*3.4+w1*1.9;
    vec3 w2=vec3(fbm(pw*1.7+5.),fbm(pw*1.7+17.),fbm(pw*1.7+29.))-.5;
    float big=fbm(pw+w2*1.5), mid=fbm(p*11.+w2*2.6+w1*2.), small=fbm(p*40.+w2*3.5);
    float bias=.07*exp(-pow(lat/.13,2.))-.075*exp(-pow((absLat-.44)/.17,2.))+.075*exp(-pow((absLat-.98)/.26,2.));
    float cloud=smoothstep(.515,.74,big*.60+mid*.30+small*.17+bias);
    float cirrus=smoothstep(.52,.86,fbm(vec3(p.x*5.,p.y*24.,p.z*5.)+w1*2.5))*.34*smoothstep(.2,.6,mid);
    cloud=max(pow(cloud,1.25),cirrus);
    cloud*=1.-spot(p,15.,24.,.5,.16)*.6;
    gl_FragColor=vec4(vec3(cloud),1.); return;
  }
  if(uKind==1 || uKind==2) {
    vec2 c1=craters(q,8.),c2=craters(q,27.),c3=craters(q,88.);
    float crater=c1.x*.46+c2.x*.23+c3.x*.11;
    float maria=0.;
    if(uKind==1) {
      maria=spot(p,-57.,18.,.37,.35)+spot(p,-87.,31.,.29,.30)+spot(p,-113.,32.,.22,.28)+spot(p,-120.,6.,.19,.18)+spot(p,-90.,8.,.27,.23)+spot(p,-108.,-18.,.14,.15)+spot(p,-54.,-22.,.13,.17);
      maria=smoothstep(.30,.62,maria+(f-.5)*.85+(fbm(q*17.)-.5)*.38);
    }
    float grain=(fine-.5)*.10, bright=.32+grain+crater*.21;
    bright*=1.-maria*.48;
    // 第谷、哥白尼和开普勒的亮射纹。
    float ray=0.;
    vec3 center=sphere(vec2((-101.+180.)/360.,(-43.+90.)/180.));
    vec3 d=p-center; float angle=atan(dot(d,vec3(1,0,0)),dot(d,vec3(0,1,0)));
    ray+=exp(-length(d)*8.)*(pow(.5+.5*sin(angle*23.+fbm(q*60.)*11.),14.)*.15+.035)*smoothstep(.2,.7,dot(p,center));
    center=sphere(vec2((-70.+180.)/360.,(10.+90.)/180.)); d=p-center; angle=atan(d.y,d.x);
    ray+=exp(-length(d)*13.)*pow(.5+.5*sin(angle*19.+fbm(q*75.)*9.),12.)*.14*smoothstep(.2,.7,dot(p,center));
    bright+=ray+c1.y*.3;
    color=(uKind==1?vec3(.92,.94,.97):vec3(1.02,.91,.79))*bright;
    height=.5+crater*(1.-maria*.65)+(fine-.5)*.055;
  }
  if(uKind==3) {
    float flow=sin(lat*13.+f*5.+sin(p.z*5.)*2.);
    float yShape=sin(abs(p.y)*9.-p.x*4.+f*3.);
    float band=.5+.5*sin(lat*22.+f*8.+yShape*1.4);
    color=mix(vec3(.66,.43,.19),vec3(.97,.84,.54),.52+.28*flow+.16*band);
    height=.5+flow*.04;
  }
  if(uKind==4) {
    float dark=smoothstep(.42,.62,fbm(q*6.+vec3(1,3,7)));
    color=mix(vec3(.47,.19,.085),vec3(.23,.15,.10),dark*.7);
    color*=.75+fine*.45;
    float canyon=spot(p,-65.,-12.,.37,.025)*smoothstep(.28,.65,fbm(q*45.));
    color*=1.-canyon*.55;
    float ice=smoothstep(1.35,1.48,absLat+(fine-.5)*.11);
    color=mix(color,vec3(.76,.78,.74),ice); height=.3+f*.22+fine*.06-canyon*.13;
  }
  if(uKind>=5 && uKind<=8) {
    float warp=(fbm(q*12.)-.5)*.6+sin(p.x*17.+p.z*13.)*.025;
    float band=uKind==5?sin(lat*19.+warp*3.)*.72+sin(lat*43.+warp*6.)*.26:sin(lat*34.+warp*7.);
    float turb=fbm(vec3(p.x*3.,p.y*20.,p.z*3.)+q*2.)-.5;
    float yy=p.y+turb*.05+(fbm(q*10.)-.5)*.014;
    float belts=noise(vec3(yy*8.5+4.,uSeed,0.))*.58+noise(vec3(yy*23.+1.,uSeed,3.))*.30+noise(vec3(yy*68.,uSeed,9.))*.12;
    float eddy=fbm(vec3(p.x*13.,p.y*58.,p.z*13.)+turb*3.);
    float small=sin(lat*125.+f*11.)*.12;
    if(uKind==5) {
      float zone=smoothstep(.36,.62,belts);
      color=mix(vec3(.40,.20,.095),vec3(.60,.38,.20),smoothstep(.2,.4,belts));
      color=mix(color,vec3(.86,.78,.62),zone);
      color=mix(color,vec3(.93,.90,.82),smoothstep(.66,.80,belts)*.7);
      color=mix(color,vec3(.42,.46,.52),smoothstep(.55,.75,eddy)*(1.-zone)*exp(-pow(p.y/.14,2.))*.45);
      color*=.86+.26*eddy;
      color=mix(color,vec3(.33,.31,.32),smoothstep(.74,.97,abs(p.y))*.75);
      vec3 c=sphere(vec2(.68, .5-22./180.));
      vec3 east=normalize(vec3(c.z,0.,-c.x)),north=normalize(cross(c,east));
      vec2 d=vec2(dot(p-c,east)/.18,dot(p-c,north)/.085);
      float r=length(d),swirl=sin(r*21.-atan(d.y,d.x)*2.+fbm(q*70.)*6.);
      float red=(1.-smoothstep(.82,1.12,r+swirl*.06))*smoothstep(.3,.7,dot(p,c));
      color=mix(color,mix(vec3(.43,.095,.035),vec3(.69,.29,.115),.5+.22*swirl),red*.95);
      float storm=spot(p,2.,-31.,.07,.035)+spot(p,110.,28.,.05,.03)+spot(p,-15.,-27.,.04,.025);
      color=mix(color,vec3(.95,.88,.72),clamp(storm,0.,1.)*.7);
    }
    if(uKind==6) { color=mix(vec3(.60,.47,.29),vec3(.91,.82,.61),smoothstep(.30,.70,belts)); color*=.93+.12*eddy; color=mix(color,vec3(.52,.55,.56),smoothstep(.80,.98,abs(p.y))*.5); }
    if(uKind==7) color=vec3(.30,.66,.69)*( .88+band*.017+small*.025+smoothstep(.6,1.,p.y)*.20);
    if(uKind==8) {
      color=mix(vec3(.035,.15,.48),vec3(.085,.31,.69),.5+band*.14+f*.13);
      float dark=spot(p,60.,-22.,.15,.07); color*=1.-dark*.65;
      float wisps=spot(p,82.,-15.,.25,.017)+spot(p,22.,31.,.18,.02);
      color=mix(color,vec3(.63,.76,.89),wisps*smoothstep(.45,.65,fbm(q*70.))*.7);
    }
    height=.5+band*.005;
  }
  if(uKind==9) {
    float cells=fbm(q*170.); float activity=fbm(q*9.);
    gl_FragColor=vec4(cells,activity,fbm(q*60.),1.); return;
  }
  if(uKind==1 || uKind==2){
    float h=clamp(height,0.,.9999); vec2 packed=fract(h*vec2(1.,255.)); packed.x-=packed.y/255.;
    gl_FragColor=vec4(color.r,packed,1.); return;
  }
  gl_FragColor=vec4(max(color,vec3(0.)),clamp(height,0.,1.));
}
void main(){
  bakeField();
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const VERTEX = /* glsl */`
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vLocal;
void main() {
  vUv=uv; vLocal=position;
  vec4 world=modelMatrix*vec4(position,1.); vWorld=world.xyz;
  vN=normalize((vec4(normalMatrix*normal,0.)*viewMatrix).xyz);
  gl_Position=projectionMatrix*viewMatrix*world;
}
`;

const RING_PROFILE = /* glsl */`
vec2 rings(float r) {
  float inner=smoothstep(1.24,1.28,r),outer=1.-smoothstep(2.24,2.27,r);
  float c=smoothstep(1.24,1.51,r)*.22+.10;
  float b=mix(c,.86,smoothstep(1.51,1.54,r));
  b=mix(b,.60,smoothstep(1.90,1.95,r));
  float gap=1.-.96*(smoothstep(1.945,1.956,r)-smoothstep(2.015,2.026,r));
  float dr=max(fwidth(r),.00001);
  float threads=.83+.07*sin(r*173.)*exp(-.5*pow(dr*173.,2.))+.07*sin(r*891.)*exp(-.5*pow(dr*891.,2.))+.03*sin(r*2179.)*exp(-.5*pow(dr*2179.,2.));
  float opacity=inner*outer*b*gap*threads;
  return vec2(opacity,(.65+.2*sin(r*21.)+.08*sin(r*117.))*gap);
}
`;

const SURFACE = /* glsl */`
precision highp float;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vLocal;
uniform sampler2D uMap; uniform sampler2D uCloud;
uniform vec3 uSunPos; uniform float uTime; uniform float uRadius; uniform float uEarthshine;
uniform float uSeed; uniform float uCloudOffset; uniform mat4 uWorldToBody; uniform mat4 uWorldToSurface; uniform vec2 uTexel;
${NOISE}
${RING_PROFILE}
vec3 bump(vec3 n,float height,float strength) {
  vec3 dx=dFdx(vWorld),dy=dFdy(vWorld);
  vec3 r1=cross(dy,n),r2=cross(n,dx); float det=dot(dx,r1);
  vec3 gradient=sign(det)*(dFdx(height)*r1+dFdy(height)*r2);
  return normalize(abs(det)*n-strength*gradient);
}
void main() {
  vec4 field=texture2D(uMap,vUv); vec3 p=normalize(vLocal);
  vec3 base=field.rgb; float height=field.a; vec3 n=normalize(vN);
  vec3 light=normalize(uSunPos-vWorld),viewDir=normalize(cameraPosition-vWorld);
  float geometric=dot(n,light), mu=max(dot(n,viewDir),.001), land=1.;
  float detail=noise(p*1250.+uSeed)*.66+noise(p*3400.+uSeed)*.34;
  vec3 emission=vec3(0.); float spec=0., cloud=0.;
  #if KIND == 0
    float coast=field.r+(detail-.5)*.009;
    float aa=max(fwidth(coast)*.8,.0006); land=smoothstep(.5-aa,.5+aa,coast);
    float latitude=abs(p.y),dry=field.b;
    float tone=noise(p*23.+uSeed)*.6+noise(p*61.+uSeed)*.4;
    vec3 vegetation=mix(vec3(.014,.052,.014),vec3(.050,.082,.028),smoothstep(.10,.52,latitude+(tone-.5)*.12));
    vegetation=mix(vegetation,vec3(.075,.085,.035),smoothstep(.45,.75,tone)*.55);
    vegetation=mix(vegetation,vec3(.030,.052,.026),smoothstep(.70,.82,latitude));
    vegetation=mix(vegetation,vec3(.115,.115,.085),smoothstep(.84,.93,latitude));
    vegetation*=.80+field.g*.55+detail*.14;
    vec3 steppe=vec3(.155,.135,.065);
    vec3 desert=mix(vec3(.33,.22,.11),vec3(.56,.42,.23),dry);
    vec3 ground=mix(vegetation,steppe,smoothstep(.06,.22,dry));
    ground=mix(ground,desert,smoothstep(.20,.62,dry));
    float mountain=smoothstep(.43,.76,field.g);
    ground=mix(ground,vec3(.20,.16,.11),mountain*.8);
    float snow=smoothstep(.67,.80,field.g+latitude*.10);
    float ice=max(smoothstep(.955,.985,latitude+(detail-.5)*.006),snow);
    // 格陵兰冰盖及南极冰盖不依赖随机种子。
    ice=max(ice,spot(p,-42.,74.,.32,.18)*1.5);
    ground=mix(ground,vec3(.82,.86,.86),clamp(ice,0.,1.));
    float shelf=exp(-abs(coast-.5)*35.);
    vec3 ocean=mix(vec3(.004,.022,.070),vec3(.014,.095,.14),shelf*.65)*(.9+tone*.2);
    base=mix(ocean,ground,land);
    height=field.g*land*.72+(detail-.5)*(.002+.012*land);
    vec2 cuv=vec2(vUv.x+uCloudOffset,vUv.y);
    cloud=texture2D(uCloud,cuv).r;
    vec3 localLight=normalize((uWorldToSurface*vec4(light,0.)).xyz);
    vec3 east=normalize(vec3(p.z,0.,-p.x)+vec3(.00001,0,0)),north=normalize(cross(p,east));
    vec2 offset=vec2(dot(localLight,east)/(6.283185*max(.1,length(p.xz))),dot(localLight,north)/3.141593)*.008/max(.18,geometric);
    float cloudShadow=texture2D(uCloud,cuv+offset).r;
    base*=1.-cloudShadow*.32*smoothstep(-.03,.20,geometric);
    vec3 halfDir=normalize(light+viewDir); float nh=max(dot(n,halfDir),0.);
    float fresnel=.025+.30*pow(1.-max(dot(viewDir,n),0.),5.);
    spec=(pow(nh,650.)*2.7+pow(nh,55.)*.17)*fresnel*(1.-land)*max(geometric,0.)*(1.-cloud*.9);
    float night=1.-smoothstep(-.20,.06,geometric);
    emission=vec3(1.0,.48,.13)*field.a*land*night*.85;
    n=bump(n,height,uRadius*.002);
  #elif KIND == 1 || KIND == 2
    float left=dot(texture2D(uMap,vUv-vec2(uTexel.x,0.)).gb,vec2(1.,1./255.));
    float right=dot(texture2D(uMap,vUv+vec2(uTexel.x,0.)).gb,vec2(1.,1./255.));
    float down=dot(texture2D(uMap,vUv-vec2(0.,uTexel.y)).gb,vec2(1.,1./255.));
    float up=dot(texture2D(uMap,vUv+vec2(0.,uTexel.y)).gb,vec2(1.,1./255.));
    vec2 slope=vec2((right-left)/(2.*uTexel.x*6.283185*max(.08,length(p.xz))),(up-down)/(2.*uTexel.y*3.141593));
    vec3 east=normalize(vec3(p.z,0.,-p.x)+vec3(.00001,0,0)),north=normalize(cross(p,east));
    vec3 we=normalize((vec4(east,0.)*uWorldToSurface).xyz),wn=normalize((vec4(north,0.)*uWorldToSurface).xyz);
    n=normalize(n-.016*(slope.x*we+slope.y*wn));
    height=(detail-.5)*.003;
    base=field.rrr*(.95+detail*.10);
    #if KIND == 1
      base*=vec3(1.,1.015,1.035);
    #else
      base*=vec3(1.05,.94,.82);
    #endif
    n=bump(n,height,uRadius*.010);
  #elif KIND == 4
    n=bump(n,height+(detail-.5)*.014,uRadius*.009);
  #endif
  float nl=max(dot(n,light),0.);
  float day=smoothstep(-.035,.045,geometric);
  float diffuse=nl;
  #if KIND == 1 || KIND == 2
    // 月壤采用 Lommel-Seeliger 散射，满月盘面更平。
    diffuse=mix(nl,clamp(2.*nl/(max(nl,0.)+mu+.035),0.,1.5),.72)*day;
    diffuse*=mix(.60,1.,smoothstep(-.03,.12,dot(n,light)));
  #endif
  float shadow=1.;
  #if KIND == 6
    vec3 lp=(uWorldToBody*vec4(vWorld,1.)).xyz/uRadius;
    vec3 ll=normalize((uWorldToBody*vec4(light,0.)).xyz);
    float t=-lp.y/(abs(ll.y)<.0001?.0001:ll.y);
    float r=length((lp+ll*t).xz);
    if(t>0.) shadow=1.-rings(r).x*.85;
  #endif
  vec3 color=base*diffuse*shadow+vec3(spec)+emission;
  #if KIND == 0
    float cloudLight=max(geometric*.85+.12,0.)*day;
    vec3 cloudTint=mix(vec3(1.,.56,.32),vec3(1.),smoothstep(.0,.30,geometric));
    vec3 cloudColor=mix(vec3(.62,.70,.82),vec3(.97,.98,1.),smoothstep(.15,.75,cloud))*cloudTint;
    color=mix(color,cloudColor*cloudLight,smoothstep(.02,.62,cloud)*.93);
    float haze=pow(1.-mu,2.4);
    color=mix(color,vec3(.16,.40,.88)*max(geometric*.9+.1,0.),haze*.58*day);
    float edge=pow(1.-mu,3.6);
    color+=vec3(.035,.20,.55)*edge*smoothstep(-.08,.35,geometric)*.40;
    color+=vec3(.85,.36,.10)*edge*exp(-pow(geometric/.085,2.))*.11;
  #elif KIND == 1
    color+=base*vec3(.23,.40,.80)*uEarthshine*(1.-day);
  #endif
  gl_FragColor=vec4(max(color,vec3(0.)),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// 每个 renderer 共用一个队列，一帧仅提交一个小块。
const QUEUES = new WeakMap(), TILE = 512;
function baker(renderer) {
  if(QUEUES.has(renderer)) return QUEUES.get(renderer);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
  const material=new THREE.ShaderMaterial({
    uniforms:{uGeo:{value:null},uSeed:{value:0},uKind:{value:0}},
    vertexShader:'varying vec2 vUv; void main(){ vUv=position.xy*.5+.5; gl_Position=vec4(position.xy,0.,1.); }',
    fragmentShader:BAKE_FRAGMENT,depthTest:false,depthWrite:false,toneMapped:false,
  });
  const scene=new THREE.Scene(); scene.add(new THREE.Mesh(geometry,material));
  const camera=new THREE.Camera(),jobs=[]; let running=false,compiled=false;
  function tick() {
    const job=jobs[0]; if(!job){running=false;return;}
    const target=job.target, oldTarget=renderer.getRenderTarget(),oldFace=renderer.getActiveCubeFace(),oldMip=renderer.getActiveMipmapLevel();
    const oldAuto=renderer.autoClear, oldXr=renderer.xr.enabled;
    const viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),test=renderer.getScissorTest();
    if(!compiled){
      // 等驱动并行编译完成后才绘制，避免首次取 uniform 阻塞数秒。
      let preparation;
      try{renderer.setRenderTarget(target);preparation=renderer.compileAsync(scene,camera);}
      catch(error){jobs.shift();job.reject(error);requestAnimationFrame(tick);return;}
      finally{renderer.setRenderTarget(oldTarget,oldFace,oldMip);}
      preparation.then(()=>{compiled=true;requestAnimationFrame(tick);},error=>{jobs.shift();job.reject(error);requestAnimationFrame(tick);});
      return;
    }
    try {
      renderer.xr.enabled=false; renderer.autoClear=false;
      material.uniforms.uKind.value=job.kind; material.uniforms.uSeed.value=job.seed;
      material.uniforms.uGeo.value=job.geo;
      renderer.setRenderTarget(target);
      renderer.setViewport(0,0,target.width,target.height);
      renderer.setScissor(job.x,job.y,Math.min(TILE,target.width-job.x),Math.min(TILE,target.height-job.y)); renderer.setScissorTest(true);
      const cpuStart=performance.now();
      const last=job.y+TILE>=target.height && job.x+TILE>=target.width;
      target.texture.generateMipmaps=last;
      renderer.render(scene,camera);
      target.texture.userData.maxBakeSubmitMs=Math.max(target.texture.userData.maxBakeSubmitMs??0,performance.now()-cpuStart);
      job.x+=TILE; if(job.x>=target.width){job.x=0;job.y+=TILE;}
      if(job.y>=target.height) {
        jobs.shift(); job.resolve(target.texture);
      }
    } catch(error) { jobs.shift(); job.reject(error); }
    finally {
      renderer.setRenderTarget(oldTarget,oldFace,oldMip); renderer.setViewport(viewport); renderer.setScissor(scissor); renderer.setScissorTest(test);
      renderer.autoClear=oldAuto; renderer.xr.enabled=oldXr;
    }
    requestAnimationFrame(tick);
  }
  const enqueue=(kind,w,h,seed,geo)=> {
    const target=new THREE.WebGLRenderTarget(w,h,{depthBuffer:false,stencilBuffer:false,generateMipmaps:false,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,wrapS:THREE.RepeatWrapping,wrapT:THREE.ClampToEdgeWrapping});
    target.texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const ready=new Promise((resolve,reject)=>jobs.push({target,kind,seed,geo,x:0,y:0,resolve,reject}));
    if(!running){running=true;requestAnimationFrame(tick);}
    return {target,ready};
  };
  QUEUES.set(renderer,enqueue); return enqueue;
}

function atmosphere(stage,group,radius,kind,geometry) {
  const settings={terra:[0x3f91ff,1.014,.42],venus:[0xffd58a,1.045,.65],mars:[0xffa18a,1.009,.19],uranus:[0x73e6ec,1.018,.15],neptune:[0x427dff,1.017,.18]};
  if(!settings[kind]) return;
  const [color,scale,power]=settings[kind];
  const fragment=/* glsl */`
    varying vec3 vWorld; varying vec3 vN;
    uniform vec3 uSunPos; uniform float uTime; uniform vec3 uColor; uniform float uPower;
    void main(){
      vec3 n=normalize(vN),v=normalize(cameraPosition-vWorld),l=normalize(uSunPos-vWorld);
      float mu=abs(dot(n,v)),lit=dot(n,l);
      float rim=pow(1.-mu,4.)*smoothstep(0.,.17,mu);
      float day=smoothstep(-.12,.40,lit);
      vec3 c=uColor*rim*day*uPower;
      ${kind==='terra'?'c+=vec3(.85,.40,.12)*rim*exp(-pow(lit/.10,2.))*.05;':''}
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  const mat=new THREE.ShaderMaterial({vertexShader:VERTEX,fragmentShader:fragment,uniforms:{...stage.uniforms,uColor:{value:new THREE.Color(color)},uPower:{value:power}},side:THREE.BackSide,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
  const shell=new THREE.Mesh(geometry,mat); shell.scale.setScalar(scale); shell.renderOrder=3; group.add(shell);
}

function addRings(stage,group,radius,kind,worldToBody) {
  const saturn=kind==='saturn',inner=saturn?1.24:1.60,outer=saturn?2.27:2.02;
  const geometry=new THREE.RingGeometry(inner*radius,outer*radius,256,1); geometry.rotateX(-Math.PI/2);
  const mat=new THREE.ShaderMaterial({vertexShader:VERTEX,uniforms:{...stage.uniforms,uRadius:{value:radius},uWorldToBody:worldToBody},fragmentShader:/* glsl */`
    varying vec3 vWorld; varying vec3 vLocal; varying vec3 vN;
    uniform vec3 uSunPos; uniform float uTime; uniform float uRadius; uniform mat4 uWorldToBody;
    ${RING_PROFILE}
    void main(){
      float r=length(vLocal.xz)/uRadius; vec3 l=normalize(uSunPos-vWorld);
      vec3 p=(uWorldToBody*vec4(vWorld,1.)).xyz/uRadius;
      vec3 d=normalize((uWorldToBody*vec4(l,0.)).xyz);
      vec3 ep=p/vec3(1.,.9,1.),ed=d/vec3(1.,.9,1.);
      float b=dot(ep,ed),c=dot(ep,ep)-1.,disc=b*b-dot(ed,ed)*c;
      float shadow=1.;
      if(b<0.) shadow=1.-smoothstep(-.035,.035,disc)*.94;
      vec2 profile=rings(r);
      ${saturn?`float alpha=profile.x;
      vec3 color=mix(vec3(.29,.24,.18),vec3(.71,.62,.45),profile.y);
      float lighting=.32+.68*sqrt(abs(dot(normalize(vN),l)));`:`float dr=max(fwidth(r)*.5,.0001);
      vec4 widths=sqrt(vec4(.008*.008,.006*.006,.009*.009,.006*.006)+dr*dr);
      vec4 bands4=exp(-pow((r-vec4(1.64,1.73,1.87,1.99))/widths,vec4(2.)))*vec4(.008,.006,.009,.006)/widths;
      float bands=dot(bands4,vec4(1.));
      float alpha=bands*.28; vec3 color=vec3(.12,.16,.16); float lighting=.5;`}
      gl_FragColor=vec4(color*lighting*shadow,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,side:THREE.DoubleSide,transparent:true,depthWrite:false,forceSinglePass:true});
  const rings=new THREE.Mesh(geometry,mat); rings.renderOrder=2; group.add(rings);
}

function sunMaterial(stage,map,seed) {
  return new THREE.ShaderMaterial({vertexShader:VERTEX,uniforms:{...stage.uniforms,uMap:{value:map},uSeed:{value:seed}},fragmentShader:/* glsl */`
    varying vec2 vUv; varying vec3 vWorld; varying vec3 vLocal; varying vec3 vN;
    uniform sampler2D uMap; uniform vec3 uSunPos; uniform float uTime; uniform float uSeed;
    ${NOISE}
    void main(){
      vec3 p=normalize(vLocal); float t=uTime*.045;
      vec2 drift=vec2(sin(t+p.y*7.)*.002,cos(t*.8+p.x*6.)*.0015);
      vec3 field=texture2D(uMap,vUv+drift).rgb;
      vec3 warp=vec3(noise(p*5.+vec3(0.,t*2.,3.)),noise(p*5.+vec3(13.,-t*2.,7.)),noise(p*5.+vec3(t*2.,5.,-11.)))-.5;
      float g=noise(p*15.+warp*2.4+vec3(t*3.))*.46+noise(p*36.+warp*3.2-vec3(t*5.))*.32+noise(p*84.+warp*4.+vec3(t*7.))*.22;
      float cells=smoothstep(.30,.70,g*.82+field.r*.18);
      float spots=smoothstep(.76,.84,noise(p*3.3+uSeed+vec3(t*.4)))*(1.-smoothstep(.35,.75,abs(p.y)));
      float mu=max(dot(normalize(vN),normalize(cameraPosition-vWorld)),0.);
      float limb=.42+.58*pow(mu,.5);
      vec3 color=mix(vec3(1.05,.34,.045),vec3(2.15,1.22,.40),cells)*limb;
      color+=vec3(.9,.6,.3)*smoothstep(.74,.92,g)*.45;
      color*=1.-spots*.45;
      color*=mix(vec3(1.,.42,.14),vec3(1.),smoothstep(0.,.55,mu));
      color*=.86+field.g*.30;
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `});
}

function corona(stage,group,radius) {
  const geometry=new THREE.PlaneGeometry(radius*8.4,radius*8.4);
  const mat=new THREE.ShaderMaterial({uniforms:{...stage.uniforms},vertexShader:/* glsl */`
    varying vec2 vUv;
    void main(){
      vUv=uv;
      vec3 center=(modelViewMatrix*vec4(0,0,0,1)).xyz;
      // 从矩阵取世界缩放，始终正对相机。
      float sx=length(modelMatrix[0].xyz),sy=length(modelMatrix[1].xyz);
      gl_Position=projectionMatrix*vec4(center+vec3(position.xy*vec2(sx,sy),0),1.);
    }`,fragmentShader:/* glsl */`
    varying vec2 vUv; uniform float uTime; uniform vec3 uSunPos;
    void main(){
      vec2 p=(vUv-.5)*8.4; float r=length(p),a=atan(p.y,p.x);
      float outside=smoothstep(.95,1.02,r),fade=1.-smoothstep(1.7,3.6,r);
      float halo=exp(-max(r-1.,0.)*3.4)*.40+exp(-max(r-1.,0.)*1.3)*.11+exp(-max(r-1.,0.)*.7)*.012;
      float rays=pow(.5+.5*sin(a*43.+sin(a*11.+uTime*.07)*2.),14.);
      rays+=pow(.5+.5*sin(a*71.-uTime*.035),28.)*.5;
      float plume=rays*exp(-max(r-1.,0.)*1.7)*.05;
      vec3 c=mix(vec3(1.,.36,.09),vec3(1.,.72,.38),exp(-max(r-1.,0.)*2.2))*(halo+plume)*outside*fade;
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true});
  const mesh=new THREE.Mesh(geometry,mat); mesh.frustumCulled=false; mesh.renderOrder=4; group.add(mesh);
}

export function createBody(stage, kind, opts = {}) {
  if(!Object.hasOwn(CONFIG,kind)) throw new RangeError(`未知天体：${kind}`);
  const radius=opts.radius??1;
  if(!Number.isFinite(radius)||radius<=0) throw new RangeError('radius 必须为正数');
  const high=(opts.detail??stage.quality)!=='low', seed=seedNumber(opts.seed), shaderSeed=(seed%100003)*.013;
  const group=new THREE.Group(); group.name=`body:${kind}`; group.rotation.z=opts.tilt??CONFIG[kind][0];
  const segments=high?160:80, geometry=new THREE.SphereGeometry(radius,segments,segments/2);
  const worldToBody={value:new THREE.Matrix4()},worldToSurface={value:new THREE.Matrix4()};
  const placeholder=new THREE.DataTexture(new Uint8Array([96,96,96,128]),1,1); placeholder.needsUpdate=true;
  const mapWidth=(kind==='terra'||kind==='luna'?4096:2048)/(high?1:2);
  const material=kind==='sun'?sunMaterial(stage,placeholder,shaderSeed):new THREE.ShaderMaterial({
    vertexShader:VERTEX,fragmentShader:SURFACE,defines:{KIND:IDS[kind]},uniforms:{
      ...stage.uniforms,uMap:{value:placeholder},uCloud:{value:placeholder},uSeed:{value:shaderSeed},
      uRadius:{value:radius},uEarthshine:{value:opts.earthshine??.012},uCloudOffset:{value:0},uWorldToBody:worldToBody,uWorldToSurface:worldToSurface,uTexel:{value:new THREE.Vector2(1/mapWidth,2/mapWidth)},
    },
  });
  const mesh=new THREE.Mesh(geometry,material); mesh.name=`surface:${kind}`;
  const flatten=kind==='jupiter'?.935:kind==='saturn'?.9:kind==='uranus'?.977:1;
  mesh.scale.y=flatten; group.add(mesh);
  atmosphere(stage,group,radius,kind,geometry);
  if(kind==='saturn'||kind==='uranus') addRings(stage,group,radius,kind,worldToBody);
  if(kind==='sun') corona(stage,group,radius);
  const enqueue=baker(stage.renderer),w=mapWidth;
  const field=enqueue(IDS[kind],w,w/2,shaderSeed,kind==='terra'?makeGeography():placeholder);
  const work=[field.ready.then(texture=>{material.uniforms.uMap.value=texture;})];
  if(kind==='terra') {
    const clouds=enqueue(10,high?2048:1024,high?1024:512,shaderSeed,placeholder);
    work.push(clouds.ready.then(texture=>{material.uniforms.uCloud.value=texture;}));
  }
  const parts=group.children.slice(); parts.forEach(part=>{part.visible=false;});
  work.push(new Promise((resolve,reject)=>requestAnimationFrame(()=>{
    try{stage.renderer.compileAsync(group,stage.camera,stage.scene).then(resolve,reject);}catch(error){reject(error);}
  })));
  let elapsed=0; const spin=opts.spin??CONFIG[kind][1];
  const body={kind,radius,group,mesh,ready:Promise.all(work).then(()=>{parts.forEach(part=>{part.visible=true;});placeholder.dispose();return body;}),update(dt,t){
    if(Number.isFinite(dt)) mesh.rotation.y+=spin*dt;
    elapsed=Number.isFinite(t)?t:elapsed+(Number.isFinite(dt)?dt:0);
    if(kind==='terra') material.uniforms.uCloudOffset.value=-elapsed*.0013;
    group.updateWorldMatrix(true,false); worldToBody.value.copy(group.matrixWorld).invert();
  }};
  mesh.onBeforeRender=()=>{worldToBody.value.copy(group.matrixWorld).invert();worldToSurface.value.copy(mesh.matrixWorld).invert();};
  return body;
}
