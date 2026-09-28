/* Boots the page's scripts against a minimal DOM built from the real
   index.html, so a missing element or an undefined global throws here
   instead of on the visitor's screen. */
const fs = require('fs');
const path = process.argv[2] || '.';
const html = fs.readFileSync(path + '/index.html', 'utf8');

const ids = new Set(Array.from(html.matchAll(/id="([^"]+)"/g), m => m[1]));
const classOf = new Map();          // class -> count
for (const m of html.matchAll(/class="([^"]+)"/g))
  for (const c of m[1].split(/\s+/)) classOf.set(c, (classOf.get(c) || 0) + 1);

const listeners = [];
function el(tag, cls) {
  const e = {
    tagName: (tag || 'div').toUpperCase(),
    style: new Proxy({}, { get: (t,k)=> (k==='setProperty'? ()=>{} : (t[k]||'')), set: (t,k,v)=>{t[k]=v; return true;} }),
    dataset: {}, className: cls || '', textContent: '', hidden: false, value: '',
    children: [], parentElement: null,
    classList: { _s:new Set(), add(){}, remove(){}, toggle(){return false;}, contains(c){return (cls||'').split(/\s+/).includes(c);} },
    setAttribute(){}, removeAttribute(){}, getAttribute(){return null;},
    addEventListener(t,f){ listeners.push([t,f]); }, removeEventListener(){},
    getBoundingClientRect(){ return {top:0,bottom:800,left:0,right:1440,width:1440,height:800}; },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    appendChild(c){ this.children.push(c); c.parentElement=this; return c; },
    insertBefore(c){ this.children.push(c); c.parentElement=this; return c; },
    focus(){}, closest(){ return null; }, play(){ return Promise.resolve(); }, pause(){},
    getContext(){ return { drawImage(){}, fillRect(){}, clearRect(){}, createLinearGradient(){return {addColorStop(){}};}, }; },
    offsetTop: 0, offsetHeight: 2200, naturalWidth: 1440, naturalHeight: 640,
    duration: 7, currentTime: 0, paused: false,
  };
  e.parentElement = e.parentElement || el0;
  return e;
}
const el0 = { getBoundingClientRect:()=>({width:1440,height:800}), style:{} };

global.window = {
  innerWidth: 1440, innerHeight: 800, devicePixelRatio: 2, scrollY: 0, pageYOffset: 0,
  scrollTo(){}, addEventListener(t,f){ listeners.push([t,f]); }, removeEventListener(){},
  requestAnimationFrame(f){ return 1; },
  matchMedia(){ return { matches:false, addEventListener(){}, addListener(){}, removeEventListener(){} }; },
  IntersectionObserver: class { constructor(){} observe(){} disconnect(){} unobserve(){} },
  Image: class { set src(v){} decode(){return Promise.resolve();} },
  performance: { now: ()=>0 },
  getComputedStyle(){ return { columnGap:'0px' }; },
  location: { href:'' },
};
global.document = {
  readyState: 'complete',
  documentElement: el('html'),
  body: el('body'),
  createElement: (t)=>el(t),
  getElementById: (id)=> ids.has(id) ? el('div') : null,
  querySelector: (s)=>{ const c=s.replace(/^[.#]/,'').split(/[\s\[]/)[0];
                        return (ids.has(c)||classOf.has(c)) ? el('div', c) : null; },
  querySelectorAll: (s)=>{ const c=s.replace(/^[.#]/,'').split(/[\s\[]/)[0];
                           const n=classOf.get(c)|| (ids.has(c)?1:0);
                           return Array.from({length:n}, ()=>el('div', c)); },
  addEventListener(t,f){ listeners.push([t,f]); },
};
global.requestAnimationFrame = window.requestAnimationFrame;
global.performance = window.performance;
global.addEventListener = window.addEventListener;
global.innerHeight = window.innerHeight;
global.innerWidth  = window.innerWidth;
global.IntersectionObserver = window.IntersectionObserver;
global.Image = window.Image;
global.matchMedia = window.matchMedia;

const scripts = Array.from(html.matchAll(/<script src="js\/([^"]+)"><\/script>/g), m => m[1]);
console.log('loading, in page order:', scripts.join(' → '));
for (const f of scripts) {
  try { new Function(fs.readFileSync(path + '/js/' + f, 'utf8'))(); }
  catch (e) { console.log('  ✗ THREW while loading ' + f + ': ' + e.message); process.exitCode = 1; }
}
// fire the handlers the page registers, the way a browser would
let fired = 0, failed = 0;
for (const [t, f] of listeners.slice()) {
  if (!['scroll','resize','DOMContentLoaded','load'].includes(t)) continue;
  try { f({ target: document.body, matches:false }); fired++; }
  catch (e) { console.log('  ✗ THREW on "' + t + '": ' + e.message); failed++; process.exitCode = 1; }
}
console.log('handlers fired:', fired, failed ? ('— ' + failed + ' threw') : '— none threw');
if (!process.exitCode) console.log('\n✓ scripts load and run clean');
