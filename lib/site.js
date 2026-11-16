// 网站内容统一在这里维护，以后修改文字只需改这个文件。
// 每段展示文字写成 L('中文', 'English')，分别填写简体中文和英文。
export const L = (zh, en) => ({ zh, en });
let currentLang = (() => {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('cosmos-lang');
      if (saved === 'zh' || saved === 'en') return saved;
    }
  } catch (_) {}
  try {
    if (typeof navigator !== 'undefined' && navigator.language)
      return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  } catch (_) {}
  return 'zh';
})();
try { if (typeof document !== 'undefined') document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en'; } catch (_) {}
export const lang = () => currentLang;
export function setLang(l) {
  if (l !== 'zh' && l !== 'en') return;
  currentLang = l;
  try { if (typeof localStorage !== 'undefined') localStorage.setItem('cosmos-lang', l); } catch (_) {}
  try { if (typeof document !== 'undefined') document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en'; } catch (_) {}
  try {
    if (typeof window !== 'undefined') {
      const EventType = window.CustomEvent || (typeof CustomEvent !== 'undefined' ? CustomEvent : undefined);
      if (typeof EventType === 'function') window.dispatchEvent(new EventType('langchange'));
    }
  } catch (_) {}
}
export const t = v => v && typeof v === 'object' && 'zh' in v && 'en' in v ? v[lang()] : v;
export const ME = {
  name: L("你的名字", "Your Name"),
  en: 'YOUR NAME',
  tagline: L("一句话介绍自己：我是谁，在做什么，在意什么。", "Who I am, what I do, and what matters to me."),
  place: L("你的城市", "Your city"),
  lat: 30, lon: 120,          // 地球上亮起的那个点（占位坐标，可改）
};

// 每个栏目对应一颗天体。body 是引擎里的天体种类，tint 是界面上的点缀色。
export const SECTIONS = [
  { id: 'about', title: L("关于我", "About"), body: 'terra', cn: '地球', en: 'TERRA', tint: '#6fb4ff',
    why: L("我站立的地方", "Where I stand"),
    lead: L("这里放一段自我介绍：从哪里来，现在在哪，正在成为什么样的人。三四句话，让第一次来的人一分钟认识你。", "Introduce yourself: where you come from, where you are, and who you are becoming. A few sentences to help visitors get to know you."),
    blocks: [
      { type: 'facts', items: [[L("名字", "Name"), L("你的名字", "Your Name")], [L("所在地", "Location"), L("你的城市", "Your city")], [L("身份", "Role"), L("学生 / 创作者 / …", "Student / Creator / …")], [L("一句话", "In a sentence"), L("占位：最想让别人记住的一点", "Placeholder: what you most want people to remember")]] },
      { type: 'text', title: L("我是怎样的人", "Who I am"), body: L("占位文字。可以写性格、做事的方式、相信的东西。之后换成你自己的话，也可以放一张照片在旁边。", "Placeholder: share your personality, how you work, and what you believe in. Make it your own, and add a photo if you like.") },
      { type: 'gallery', title: L("照片", "Photos"), count: 3 },
    ] },
  { id: 'now', title: L("此刻", "Now"), body: 'mercury', cn: '水星', en: 'MERCURY', tint: '#d8c3a5',
    why: L("转得最快的一颗，放最近的事", "The fastest planet, for the latest updates"),
    lead: L("最近在忙什么、在学什么、在想什么。这一页更新得最勤。", "What I’m doing, learning, and thinking about lately. This page changes often."),
    blocks: [
      { type: 'list', title: L("正在做", "In progress"), items: [L("占位：手上的一件事", "Placeholder: something I’m working on"), L("占位：正在学的东西", "Placeholder: something I’m learning"), L("占位：最近在读或在看的", "Placeholder: what I’m reading or watching")] },
      { type: 'text', title: L("最近的想法", "Recent thoughts"), body: L("占位文字。像一条不发朋友圈的近况。", "Placeholder: a little update just for here.") },
    ] },
  { id: 'hobbies', title: L("爱好", "Hobbies"), body: 'venus', cn: '金星', en: 'VENUS', tint: '#f3d58a',
    why: L("爱与美之星，放喜欢的东西", "A planet of love and beauty, for things I love"),
    lead: L("工作和学习之外，让我开心的事。", "Things that make me happy outside work and study."),
    blocks: [
      { type: 'tags', items: [L("爱好一", "Hobby one"), L("爱好二", "Hobby two"), L("爱好三", "Hobby three"), L("爱好四", "Hobby four"), L("爱好五", "Hobby five"), L("爱好六", "Hobby six")] },
      { type: 'cards', items: [[L("爱好一", "Hobby one"), L("占位：为什么喜欢，做到了什么程度", "Placeholder: why I love it and how far I’ve come")], [L("爱好二", "Hobby two"), L("占位：一个相关的小故事", "Placeholder: a little story about it")], [L("爱好三", "Hobby three"), L("占位：最近的一次", "Placeholder: the last time I did it")]] },
    ] },
  { id: 'stories', title: L("小故事", "Stories"), body: 'luna', cn: '月球', en: 'LUNA', tint: '#cfd6e6',
    why: L("绕着我转的回忆", "Memories in orbit"),
    lead: L("一些以前的事。不重要，但我一直记得。", "A few moments from the past. Small things I still remember."),
    blocks: [
      { type: 'stories', items: [[L("某一年 · 夏天", "One summer"), L("占位：故事的标题", "Placeholder: story title"), L("占位正文。写一件小事，几句话就好。", "Placeholder: tell a small story in a few sentences.")], [L("某一年 · 冬天", "One winter"), L("占位：另一个故事", "Placeholder: another story"), L("占位正文。", "Placeholder text.")], [L("更早的时候", "Long ago"), L("占位：最早的记忆", "Placeholder: an early memory"), L("占位正文。", "Placeholder text.")]] },
    ] },
  { id: 'works', title: L("作品", "Works"), body: 'mars', cn: '火星', en: 'MARS', tint: '#ff9a6b',
    why: L("下一个要去的地方，放做过的东西", "The next destination, for things I’ve made"),
    lead: L("做过的项目、片子、应用、设计。每件作品点进去有单独一页。", "Projects, films, apps, and designs. Each has its own page."),
    blocks: [
      { type: 'cards', items: [[L("作品一", "Work one"), L("占位：一句话说明它是什么", "Placeholder: one line on what it is")], [L("作品二", "Work two"), L("占位：一句话说明它是什么", "Placeholder: one line on what it is")], [L("作品三", "Work three"), L("占位：一句话说明它是什么", "Placeholder: one line on what it is")], [L("作品四", "Work four"), L("占位：一句话说明它是什么", "Placeholder: one line on what it is")]], media: true },
    ] },
  { id: 'journey', title: L("经历", "Journey"), body: 'jupiter', cn: '木星', en: 'JUPITER', tint: '#e8b98a',
    why: L("最大的一颗，条纹像年轮", "The largest planet, its stripes like tree rings"),
    lead: L("一路走来的时间线：上学、转折、重要的选择。", "A timeline of school, turning points, and meaningful choices."),
    blocks: [
      { type: 'timeline', items: [['2026', L("占位：现在", "Placeholder: now")], ['2025', L("占位：一件重要的事", "Placeholder: an important moment")], ['2023', L("占位：一个转折", "Placeholder: a turning point")], ['2020', L("占位：更早的阶段", "Placeholder: an earlier chapter")], [L("起点", "The beginning"), L("占位：出生和长大的地方", "Placeholder: where I was born and raised")]] },
    ] },
  { id: 'photos', title: L("相册", "Photos"), body: 'saturn', cn: '土星', en: 'SATURN', tint: '#f0dcae',
    why: L("光环是一圈照片", "A ring of photographs"),
    lead: L("我的照片，和我拍的照片。", "Photos of me and photos I’ve taken."),
    blocks: [{ type: 'gallery', count: 9 }] },
  { id: 'honors', title: L("成果", "Honors"), body: 'uranus', cn: '天王星', en: 'URANUS', tint: '#9fe6e6',
    why: L("安静发光的那些", "Moments that quietly shine"),
    lead: L("拿过的奖、考过的证、被认可的时刻。", "Awards, qualifications, and moments of recognition."),
    blocks: [
      { type: 'timeline', items: [[L("某年", "Some year"), L("占位：一项成果", "Placeholder: an achievement")], [L("某年", "Some year"), L("占位：一项成果", "Placeholder: an achievement")], [L("某年", "Some year"), L("占位：一项成果", "Placeholder: an achievement")]] },
    ] },
  { id: 'contact', title: L("联系", "Contact"), body: 'neptune', cn: '海王星', en: 'NEPTUNE', tint: '#7f9bff',
    why: L("最远的信号站，从这里找到我", "A distant signal station, a way to reach me"),
    lead: L("想认识我，或者想一起做点什么，从这里找到我。", "Want to say hello or make something together? Find me here."),
    blocks: [
      { type: 'links', items: [[L("抖音", "Douyin"), L("@你的抖音号", "@your-douyin")], [L("小红书", "Xiaohongshu"), L("@你的小红书号", "@your-xiaohongshu")], [L("微信", "WeChat"), L("占位：微信号或二维码", "Placeholder: WeChat ID or QR code")], [L("邮箱", "Email"), 'you@example.com']] },
    ] },
];
export const byId = id => SECTIONS.find(s => s.id === id);

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const h3 = value => {
  const title = t(value);
  return title ? `<h3>${esc(title)}</h3>` : '';
};
const BLOCK = {
  facts: b => `<dl class="facts">${b.items.map(([k, v]) => `<div><dt>${esc(t(k))}</dt><dd>${esc(t(v))}</dd></div>`).join('')}</dl>`,
  text: b => `${h3(b.title)}<p>${esc(t(b.body))}</p>`,
  list: b => `${h3(b.title)}<ul class="plain">${b.items.map(i => `<li>${esc(t(i))}</li>`).join('')}</ul>`,
  tags: b => `<div class="tags">${b.items.map(i => `<span>${esc(t(i))}</span>`).join('')}</div>`,
  cards: b => `<div class="cards">${b.items.map(([title, d], i) => `<article class="card">${b.media ? `<span class="idx">${String(i + 1).padStart(2, '0')}</span>` : ''}<h4>${esc(t(title))}</h4><p>${esc(t(d))}</p></article>`).join('')}</div>`,
  stories: b => b.items.map(([when, title, d]) => `<article class="story"><span class="when">${esc(t(when))}</span><h4>${esc(t(title))}</h4><p>${esc(t(d))}</p></article>`).join(''),
  timeline: b => `<ol class="timeline">${b.items.map(([y, d]) => `<li><span class="when">${esc(t(y))}</span><span>${esc(t(d))}</span></li>`).join('')}</ol>`,
  gallery: b => `${h3(b.title)}<div class="gallery">${Array.from({ length: b.count }, (_, i) => `<div class="ph" aria-label="${esc(t(L(`照片 ${i + 1}（待放）`, `Photo ${i + 1} (coming)`)))}"><i>No. ${String(i + 1).padStart(2, '0')}</i></div>`).join('')}</div>`,
  links: b => `<div class="links">${b.items.map(([k, v]) => `<a href="#contact"><b>${esc(t(k))}</b><span>${esc(t(v))}</span></a>`).join('')}</div>`,
};

// 内容面板里的 HTML。各方案的外框不同，里面的内容用同一套。
export function sheetHTML(s) {
  return `<header class="sheet-head">
    <p class="eyebrow"><i class="dot"></i>${esc(t(s.en))}${lang() === 'zh' ? ` · ${esc(t(s.cn))}` : ''}</p>
    <h2>${esc(t(s.title))}</h2>
    <p class="lead">${esc(t(s.lead))}</p>
  </header>
  <div class="sheet-body">${s.blocks.map(b => `<section class="block">${BLOCK[b.type](b)}</section>`).join('')}</div>`;
}
