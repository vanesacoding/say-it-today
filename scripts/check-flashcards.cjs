const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const flash=JSON.parse(read('public/flashcards/oxford/catalog.js').split('=',2)[1].trim().replace(/;$/,''));
const phonics=JSON.parse(read('public/phonics/catalog.js').split('=',2)[1].trim().replace(/;$/,''));
assert.equal(flash.cards.length,399);assert.equal(flash.categories.length,15);assert.equal(phonics.books.length,66);
assert.equal(flash.cards.filter(c=>c.audio).length,333);
for(const c of flash.cards){assert(flash.categories.some(g=>g.id===c.category));assert(fs.existsSync('public/'+c.image.slice(2)));if(c.audio)assert(fs.existsSync('public/'+c.audio.slice(2)));}
for(const b of phonics.books){assert(b.pages.length>1);assert(fs.existsSync('public/'+b.audio.slice(2)));for(const p of b.pages)assert(fs.existsSync('public/'+p.image.slice(2)));}

function moduleHarness(file,catalog,saved){
 const dom=new JSDOM('<div id="app"></div>',{url:'https://example.org/',runScripts:'outside-only'}),w=dom.window;let now=1000,serial=0;const timers=new Map(),audios=[];
 w.Date.now=()=>now;w.scrollTo=()=>{};w.Image=class{set src(s){this.url=s;}};
 w.setTimeout=(fn,delay)=>{const id=++serial;timers.set(id,{fn,at:now+delay});return id;};w.clearTimeout=id=>timers.delete(id);
 w.Audio=class{constructor(src){this.src=src;this.currentTime=0;this.duration=100;audios.push(this);}play(){return Promise.resolve();}pause(){this.paused=true;}};
 if(saved)for(const [k,v]of Object.entries(saved))w.localStorage.setItem(k,v);
 w.eval(read(catalog));w.eval(read(file));
 const api=file.includes('flashcards')?w.JiguFlashcards:w.JiguPhonics;
 let opened=false;function render(){w.document.querySelector('#app').innerHTML=opened?api.view():api.library();}
 api.init({render,open(){opened=true;render();},close(){opened=false;render();}});render();
 function click(selector){const el=w.document.querySelector(selector);assert(el,'Missing '+selector);assert(!el.disabled,'Disabled '+selector);api.handle(el.dataset.action,el.dataset);}
 function tick(ms){const end=now+ms;let runs=0;while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;assert(++runs<1000);now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;}
 return {dom,w,api,click,tick,audios,html:()=>w.document.body.textContent,selector:s=>w.document.querySelector(s)};
}
const h=moduleHarness('public/flashcards/player.js','public/flashcards/oxford/catalog.js');
const count=flash.cards.filter(c=>c.category==='animals').length;
h.click('[data-group="animals"]');h.click('[data-mode="browse"]');assert(h.html().includes(`1 / ${count}`));assert(!h.selector('.flashAnswer'));
for(let i=0;i<6;i++){h.click('[data-action="flash-flip"]');assert(h.selector('.flashAnswer'));h.click('[data-action="flash-mark"][data-known="yes"]');}
assert(h.html().includes(`7 / ${count}`),'full themes continue beyond five cards');h.click('[data-action="flash-prev"]');assert(h.html().includes(`6 / ${count}`));h.click('[data-action="flash-exit"]');
h.click('[data-mode="auto"]');assert(h.html().includes('暂停快闪'));assert(h.audios.length);const first=h.selector('.flashAutoArt img').src;
h.audios.at(-1).onended();h.tick(2500);assert.notEqual(h.selector('.flashAutoArt img').src,first);
const stale=h.audios.at(-1).onended;h.click('[data-action="flash-auto-toggle"]');const paused=h.selector('.flashAutoArt img').src;stale();h.tick(30000);assert.equal(h.selector('.flashAutoArt img').src,paused,'paused autoplay ignores stale audio and timers');
h.click('[data-action="flash-auto-toggle"]');h.audios.at(-1).onerror();assert(h.html().includes('重试原声'));assert(h.html().includes('继续快闪'));h.click('[data-action="flash-retry"]');assert(h.html().includes('暂停快闪'));
h.click('[data-action="flash-sound"]');h.api.handle('flash-speed',{value:'1500'});const before=h.selector('.flashAutoArt img').src;h.tick(1500);assert.notEqual(h.selector('.flashAutoArt img').src,before);
const stored=JSON.parse(h.w.localStorage.getItem('jigu-oxford-flashcards-v1'));assert.equal(Object.keys(stored.again).length,0,'autoplay never assigns mastery ratings');
h.api.stop();h.tick(20000);assert(h.html().includes('暂停快闪')||h.html().includes('继续快闪'));h.click('[data-action="flash-exit"]');h.tick(10000);assert(h.selector('.flashLibrary'));
h.click('[data-mode="listen"]');assert.equal(h.w.document.querySelectorAll('.flashOption').length,3);const target=h.audios.at(-1).src.match(/(lgc\d-\d+)\.mp3/)[1];h.click(`[data-card-id="${target}"]`);assert(h.selector('.flashOption.correct'));h.click('[data-action="flash-mark"][data-known="no"]');h.click('[data-action="flash-exit"]');
const state=h.w.localStorage.getItem('jigu-oxford-flashcards-v1');h.dom.window.close();const restored=moduleHarness('public/flashcards/player.js','public/flashcards/oxford/catalog.js',{'jigu-oxford-flashcards-v1':state});assert(restored.html().includes('已玩'));assert(restored.html().includes('再认认 · 1'));restored.dom.window.close();

const p=moduleHarness('public/phonics/player.js','public/phonics/catalog.js');p.click('[data-level="6"]');assert.equal(p.w.document.querySelectorAll('.phonicsBook').length,6);p.click('.phonicsBook');assert(p.selector('.phonicsArt img'));p.click('[data-action="phonics-next"]');assert(p.html().includes('2 / '));p.click('[data-action="phonics-audio"]');const a=p.audios.at(-1);a.onloadedmetadata();a.currentTime=12;a.ontimeupdate();p.click('[data-action="phonics-audio"]');assert(a.paused);const old=a.onended;p.click('[data-action="phonics-exit"]');if(old)old();p.click('.phonicsContinue');assert(p.html().includes('2 / '));p.click('[data-action="phonics-audio"]');p.audios.at(-1).onloadedmetadata();assert.equal(p.audios.at(-1).currentTime,12);p.audios.at(-1).onerror();assert(p.html().includes('重试'));p.click('[data-action="phonics-exit"]');p.dom.window.close();

const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('Not implemented'))errors.push(e.message);});
const html=read('index.html').replace(/<script src="\.\/([^"]+)"><\/script>/g,(_,f)=>'<script>'+read('public/'+f)+'</script>');
const dom=new JSDOM(html,{url:'https://example.org/',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};w.Audio=class{constructor(src){this.src=src;this.currentTime=0;}play(){return Promise.resolve();}pause(){}};}});
const d=dom.window.document,click=s=>{const e=d.querySelector(s);assert(e,s);e.click();};
click('[data-content-type="flashcards"]');assert.equal(d.querySelectorAll('.flashMode').length,3);click('[data-mode="browse"]');assert(d.querySelector('.flashFlip'));click('[data-action="flash-exit"]');click('[data-content-type="books"]');assert.equal(d.querySelectorAll('[data-book]').length,70);
click('[data-filter-series="oxford-phonics"]');assert.equal(d.querySelectorAll('.phonicsBook').length,66);click('.phonicsBook');assert(d.querySelector('.phonicsReader'));click('[data-action="phonics-pages"]');assert(d.querySelector('[role=dialog]'));click('[data-action="phonics-page"][data-page="2"]');assert(!d.querySelector('[role=dialog]'));assert.match(d.querySelector('.phonicsHeader').textContent,/3 \/ /);click('[data-action="phonics-exit"]');assert(d.querySelector('.phonicsLibrary'));assert.deepEqual(errors,[]);dom.window.close();
console.log('PASS 399 cards / 15 complete themes / 333 recordings / autoplay pause, speed, stale callbacks and retries / 66 phonics books / progress resume, audio and page picker / existing 70-book regression');
