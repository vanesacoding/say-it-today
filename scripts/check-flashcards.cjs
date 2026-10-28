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
 w.Math.random=()=>.999999;w.Date.now=()=>now;w.scrollTo=()=>{};w.Image=class{set src(s){this.url=s;}};
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
h.api.handle('flash-level',{value:'all'});h.api.handle('flash-batch',{value:'0'});
const count=flash.cards.filter(c=>c.category==='animals').length;
h.click('[data-group="animals"]');assert.equal(h.selector('[data-mode="auto"]').dataset.mode,'auto');assert(!h.selector('[data-mode="browse"]'));h.click('[data-tab="review"]');assert(!h.selector('[data-mode="browse"]'),'unseen cards do not enter seen-only review');h.click('[data-collection="all"]');h.click('[data-mode="browse"]');assert(h.html().includes(`1 / ${count}`));assert(!h.selector('.flashAnswer'));
for(let i=0;i<6;i++){h.click('[data-action="flash-flip"]');assert(h.selector('.flashAnswer'));h.click('[data-action="flash-mark"][data-known="yes"]');}
assert(h.html().includes(`7 / ${count}`),'full themes continue beyond five cards');h.click('[data-action="flash-prev"]');assert(h.html().includes(`6 / ${count}`));h.click('[data-action="flash-exit"]');
h.click('[data-tab="learn"]');h.click('[data-mode="auto"]');assert(h.html().includes('暂停快闪'));assert(h.audios.length);const first=h.selector('.flashAutoArt img').src;
const unlockedAudio=h.audios.at(-1);h.audios.at(-1).onended();h.tick(2500);assert.notEqual(h.selector('.flashAutoArt img').src,first);assert.equal(h.audios.at(-1),unlockedAudio,'autoplay reuses the audio element unlocked by the initial user gesture');
const stale=h.audios.at(-1).onended;h.click('[data-action="flash-auto-toggle"]');const paused=h.selector('.flashAutoArt img').src;stale();h.tick(30000);assert.equal(h.selector('.flashAutoArt img').src,paused,'paused autoplay ignores stale audio and timers');
h.click('[data-action="flash-auto-toggle"]');h.audios.at(-1).onerror();assert(h.html().includes('重试原声'));assert(h.html().includes('继续快闪'));h.click('[data-action="flash-retry"]');assert(h.html().includes('暂停快闪'));
h.click('[data-action="flash-sound"]');h.api.handle('flash-speed',{value:'1500'});const before=h.selector('.flashAutoArt img').src;h.tick(1500);assert.notEqual(h.selector('.flashAutoArt img').src,before);
const stored=JSON.parse(h.w.localStorage.getItem('jigu-oxford-flashcards-v1'));assert.equal(Object.keys(stored.again).length,0,'autoplay never assigns mastery ratings');
h.api.stop();h.tick(20000);assert(h.html().includes('暂停快闪')||h.html().includes('继续快闪'));h.click('[data-action="flash-exit"]');h.tick(10000);assert(h.selector('.flashLibrary'));
h.click('[data-tab="review"]');h.click('[data-collection="all"]');h.click('[data-mode="listen"]');assert.equal(h.w.document.querySelectorAll('.flashOption').length,3);const target=h.audios.at(-1).src.match(/(lgc\d-\d+)\.mp3/)[1];h.click(`[data-card-id="${target}"]`);assert(h.selector('.flashOption.correct'));h.click('[data-action="flash-mark"][data-known="no"]');h.click('[data-action="flash-exit"]');
const state=h.w.localStorage.getItem('jigu-oxford-flashcards-v1');h.dom.window.close();const restored=moduleHarness('public/flashcards/player.js','public/flashcards/oxford/catalog.js',{'jigu-oxford-flashcards-v1':state});assert(restored.html().includes('已看'));assert(restored.html().includes('再认认1张'));restored.dom.window.close();

const learning=moduleHarness('public/flashcards/player.js','public/flashcards/oxford/catalog.js');learning.api.handle('flash-level',{value:'all'});learning.api.handle('flash-batch',{value:'0'});learning.click('[data-group="colors"]');learning.click('[data-mode="auto"]');learning.click('[data-action="flash-sound"]');learning.api.handle('flash-speed',{value:'1500'});learning.tick(flash.cards.filter(c=>c.category==='colors').length*1500+1);assert(learning.selector('.flashComplete'));learning.click('[data-action="flash-review"]');assert.equal(learning.w.document.querySelectorAll('.flashMode').length,2);assert(learning.selector('[data-collection="session"][aria-pressed="true"]'));learning.click('[data-collection="again"]');assert(!learning.selector('.flashMode'));learning.dom.window.close();
const listening=moduleHarness('public/flashcards/player.js','public/flashcards/oxford/catalog.js');listening.api.handle('flash-level',{value:'all'});listening.api.handle('flash-batch',{value:'0'});listening.click('[data-group="animals"]');listening.click('[data-tab="review"]');listening.click('[data-collection="all"]');listening.click('[data-mode="listen"]');
const answerKey=c=>c.label.toLowerCase().replace(/^(?:a|an|the)\s+/,'').replace(/[.!?]/g,'').trim();
while(listening.selector('.flashOption')){
 const targetId=listening.audios.at(-1).src.match(/(lgc\d-\d+)\.mp3/)[1],target=flash.cards.find(c=>c.id===targetId);
 const options=[...listening.w.document.querySelectorAll('.flashOption')].map(e=>flash.cards.find(c=>c.id===e.dataset.cardId));
 assert.equal(options.filter(c=>answerKey(c)===answerKey(target)).length,1,'same object with a different article must not become a second correct picture');
 listening.click('[data-action="flash-reveal"]');listening.click('[data-action="flash-mark"][data-known="yes"]');
}
listening.dom.window.close();
const random=moduleHarness('public/flashcards/player.js','public/flashcards/oxford/catalog.js');
let seed=17;random.w.Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
assert.equal(random.selector('[data-flash-level]').value,'random');assert.equal(random.selector('[data-flash-batch]').value,'12');assert.equal(random.selector('[data-group="random"]').getAttribute('aria-pressed'),'true');assert.deepEqual([...random.w.document.querySelectorAll('[data-flash-level] option')].map(e=>e.value),['random','L1','L2','L3']);
random.selector('.flashFilters').open=true;for(const n of ['24','12']){const select=random.selector('[data-flash-batch]');select.value=n;select.dispatchEvent(new random.w.Event('change',{bubbles:true}));assert(random.selector('.flashFilters').open,'changing batch size preserves an open filter panel');}
random.click('[data-mode="auto"]');random.click('[data-action="flash-sound"]');const ids=[];const selectedCount=Number(random.selector('.flashProgress').max);assert(selectedCount>0&&selectedCount<=12);for(let i=0;i<selectedCount;i++){ids.push(random.selector('.flashAutoArt img').getAttribute('src'));random.tick(2500);}assert(random.selector('.flashComplete'));assert.equal(new Set(ids).size,selectedCount);
const chosen=ids.map(src=>flash.cards.find(c=>c.image===src));assert(new Set(chosen.map(c=>c.category)).size===1);assert(random.html().includes('随机选中'));
random.click('[data-action="flash-review"]');random.click('[data-mode="browse"]');const review=[];for(let i=0;i<selectedCount;i++){review.push(random.selector('.flashFlip img').getAttribute('src'));random.click('[data-action="flash-flip"]');random.click('[data-action="flash-mark"][data-known="yes"]');}assert.equal(new Set(review).size,selectedCount);assert(review.every(src=>ids.includes(src)));if(selectedCount>1)assert.notDeepEqual(review,ids,'review shuffles the selected cards');
random.click('[data-action="flash-exit"]');random.click('[data-tab="learn"]');random.api.handle('flash-level',{value:'L2'});random.api.handle('flash-batch',{value:'24'});random.click('[data-mode="auto"]');const levelCount=Number(random.selector('.flashProgress').max);assert(levelCount<=24);for(let i=0;i<levelCount;i++){const src=random.selector('.flashAutoArt img').getAttribute('src');assert(['3','4'].includes(flash.cards.find(c=>c.image===src).group));random.tick(2500);}assert(random.selector('.flashComplete'));random.dom.window.close();

const p=moduleHarness('public/phonics/player.js','public/phonics/catalog.js');p.click('[data-level="6"]');assert.equal(p.w.document.querySelectorAll('.phonicsBook').length,6);p.click('.phonicsBook');assert(p.selector('.phonicsArt img'));p.click('[data-action="phonics-next"]');assert(p.html().includes('2 / '));p.click('[data-action="phonics-audio"]');const a=p.audios.at(-1);a.onloadedmetadata();a.currentTime=12;a.ontimeupdate();p.click('[data-action="phonics-audio"]');assert(a.paused);const old=a.onended;p.click('[data-action="phonics-exit"]');if(old)old();p.click('.phonicsContinue');assert(p.html().includes('2 / '));p.click('[data-action="phonics-audio"]');p.audios.at(-1).onloadedmetadata();assert.equal(p.audios.at(-1).currentTime,12);p.audios.at(-1).onerror();assert(p.html().includes('重试'));p.click('[data-action="phonics-exit"]');p.dom.window.close();


const legacyBook=phonics.books.find(b=>b.id==='oxford-phonics-1-02'),legacyKey='jigu-oxford-phonics-v1';
const legacy=moduleHarness('public/phonics/player.js','public/phonics/catalog.js',{[legacyKey]:JSON.stringify({[legacyBook.id]:{page:2,audioPosition:17,lastReadAt:1}})});
legacy.click('[data-id="'+legacyBook.id+'"]');
const mapped=legacyBook.pages.findIndex(p=>p.sourcePage>=2);assert.match(legacy.selector('.phonicsHeader').textContent,new RegExp((mapped+1)+' / '));
const migrated=JSON.parse(legacy.w.localStorage.getItem(legacyKey));assert.equal(migrated[legacyBook.id].audioPosition,17);assert.equal(migrated[legacyBook.id].layoutVersion,2);legacy.dom.window.close();
const layout=JSON.parse(read('content/learning-supplement/phonics-layout-report.json'));assert.equal(layout.splitSources.length,133);assert.equal(layout.removed.length,43);assert.equal(layout.readingPages,1282);
for(const b of phonics.books){assert.equal(b.layoutVersion,2);assert(b.coverWidth/b.coverHeight<1.12);for(const p of b.pages)assert(p.width/p.height<1.12,'one reading page at a time');}

const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('Not implemented'))errors.push(e.message);});
const html=read('index.html').replace(/<script src="\.\/([^"]+)"><\/script>/g,(_,f)=>'<script>'+read('public/'+f)+'</script>');
const dom=new JSDOM(html,{url:'https://example.org/',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};w.Audio=class{constructor(src){this.src=src;this.currentTime=0;}play(){return Promise.resolve();}pause(){}};}});
const d=dom.window.document,click=s=>{const e=d.querySelector(s);assert(e,s);e.click();};
click('[data-content-type="flashcards"]');assert.equal(d.querySelectorAll('.flashMode').length,1);assert(d.querySelector('[data-mode="auto"]'));assert(!d.querySelector('.flashFilters').open);click('[data-tab="review"]');click('[data-collection="all"]');assert.equal(d.querySelectorAll('.flashMode').length,2);click('[data-mode="browse"]');assert(d.querySelector('.flashFlip'));click('[data-action="flash-exit"]');click('[data-content-type="books"]');assert.equal(d.querySelectorAll('[data-book]').length,70);
assert(!d.querySelector('[data-filter-series]'));assert(!d.querySelector('.phonicsLibrary'));assert(!d.querySelector('main').textContent.includes('海尼曼'));assert(!d.querySelector('main').textContent.includes('牛津树'));
assert(!d.querySelector('[data-filter-song]'));assert(!d.querySelector('main').textContent.includes('唱读不限'));

click('[data-action="stage-picker"]');click('[data-stage-option][value="S2"]');assert.equal(d.querySelectorAll('.shelfCard').length,15);click('[data-action="stage-picker"]');click('[data-stage-option][value="all"]');
assert.equal(d.querySelector('[data-book="heinemann-gk-50"] img').getAttribute('src'),'./books/covers/heinemann-gk-50.webp');
click('[data-book="heinemann-gk-50"]');click('.bookEntry .primary');click('[data-go="shelf"]');click('[data-go="home"]');assert(d.querySelector('.recommendationFeed').compareDocumentPosition(d.querySelector('.continueTitle'))&4,'recommendations precede continue reading');
assert.deepEqual(errors,[]);dom.window.close();
console.log('PASS 399 cards / 15 complete themes / 333 recordings / autoplay pause, speed, stale callbacks and retries / 66 phonics books / progress resume, audio and page picker / existing 70-book regression');
