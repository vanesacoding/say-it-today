import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const bundle=readFileSync('public/books/vocabulary.js','utf8');
const scope={window:{}};vm.runInNewContext(bundle,scope);const api=scope.window.JiguVocabulary;
const fixture=[{id:'a',keywords:[{id:'one',word:'Read',meaning:'阅读',pageIndex:2}]},{id:'b',keywords:[{id:'two',word:'read',meaning:'读书',pageIndex:1}]}];
assert.equal(api.collect(fixture,{}).length,0);
assert.equal(api.collect(fixture,{a:{opened:true,page:0}}).length,0);
let items=api.collect(fixture,{a:{opened:true,page:0,furthestPage:2},b:{opened:true,finished:true,lastReadAt:10}});
assert.equal(items.length,1);assert.equal(items[0].sources.length,2);assert.equal(items[0].sources[0].bookId,'b');
assert.equal(api.collect(fixture,{}, {'a:one':true}).length,1);
const now=1700000000000;const known=api.rate(null,true,now);assert.equal(known.dueAt,now+86400000);
assert.equal(api.rate(known,true,now).dueAt,now+3*86400000);
assert.equal(api.rate(known,false,now).dueAt,now+86400000);
assert.equal(api.queue(items,{read:known},now).length,0);assert.equal(api.queue(items,{read:known},known.dueAt).length,1);
const html=readFileSync('index.html','utf8'),catalog=readFileSync('public/books/catalog.js','utf8');
function app(saved){const d=new JSDOM(html,{url:'https://jigu.local/',runScripts:'outside-only'});d.window.scrollTo=()=>{};if(saved)d.window.localStorage.setItem('jigu-reading-library-v2',saved);d.window.eval(readFileSync('public/books/curation.js','utf8'));d.window.eval(catalog);d.window.eval(bundle);d.window.eval([...d.window.document.scripts].find(s=>s.textContent.includes('const books=window.JIGU_BOOKS')).textContent);return d;}
function click(d,selector){const e=d.window.document.querySelector(selector);assert.ok(e,'Missing '+selector);e.click();}
const d=app();click(d,'[data-go="mine"]');click(d,'[data-go="vocabulary"]');assert.ok(d.window.document.querySelector('.emptyVocabulary'));
click(d,'[data-go="shelf"]');click(d,'[data-book="0087"]');click(d,'[data-action="words"]');click(d,'[data-word-id="word-0"]');click(d,'[data-action="word-save"]');assert.ok(d.window.document.querySelector('.wordSave').disabled);
click(d,'button[data-action="close"]');click(d,'[data-go="shelf"]');click(d,'[data-go="mine"]');click(d,'[data-go="vocabulary"]');assert.equal(d.window.document.querySelectorAll('.vocabularyRow').length,1);
const saved=d.window.localStorage.getItem('jigu-reading-library-v2');const r=app(saved);click(r,'[data-go="mine"]');click(r,'[data-go="vocabulary"]');assert.equal(r.window.document.querySelectorAll('.vocabularyRow').length,1);
const players=[];r.window.Audio=class{play(){players.push(this);return Promise.resolve()}pause(){this.paused=true}};
click(r,'[data-action="review-start"]');assert.equal(r.window.document.querySelector('.reviewMeaning'),null);click(r,'[data-action="review-audio"]');assert.equal(players.length,1);assert.match(players[0].src,/0087\/audio\/01\.mp3$/);
const ended=players[0].onended;click(r,'[data-action="review-reveal"]');assert.ok(r.window.document.querySelector('.reviewMeaning'));click(r,'[data-remembered="true"]');assert.ok(players[0].paused);assert.ok(r.window.document.querySelector('.reviewComplete'));ended();assert.ok(r.window.document.querySelector('.reviewComplete'));
let stored=JSON.parse(r.window.localStorage.getItem('jigu-reading-library-v2'));assert.ok(stored.wordReviews.read.dueAt>Date.now());assert.equal(stored.records['0087'].opened,false,'Review does not pretend to read the book');
click(r,'[data-go="vocabulary"]');click(r,'[data-action="vocabulary-word"]');click(r,'[data-action="vocabulary-source"]');assert.match(r.window.document.querySelector('.readerHeader').textContent,/1\/8/);
// Source inspection must return to the same word dialog and underlying word bank.
const originalTitle='read · 读、阅读';
assert.equal(r.window.document.querySelector('.readEnglish mark').textContent.toLowerCase(),'read');
click(r,'[data-action="reader-back"]');
assert.equal(r.window.document.querySelector('[role="dialog"]').getAttribute('aria-label'),originalTitle);
assert.ok(r.window.document.querySelector('.vocabularyList'));
click(r,'button[data-action="close"]');click(r,'[data-action="review-start"]');
click(r,'[data-action="review-reveal"]');
const reviewWord=r.window.document.querySelector('.reviewWord').textContent;
click(r,'[data-action="vocabulary-source"]');click(r,'[data-action="next"]');
click(r,'[data-action="reader-back"]');
assert.equal(r.window.document.querySelector('.reviewWord').textContent,reviewWord);
assert.ok(r.window.document.querySelector('.reviewMeaning'),'Reveal state survives source inspection');
assert.equal(r.window.document.querySelector('.simpleHead .tiny').textContent,'1 / 1');
click(r,'[data-go="vocabulary"]');click(r,'[data-action="vocabulary-word"]');click(r,'[data-action="vocabulary-source"]');
// Auto collect only the vocabulary pages reached; returning to an earlier page must not lose words.
for(let i=0;i<7;i++)click(r,'[data-action="next"]');click(r,'[data-action="prev"]');click(r,'[data-action="reader-back"]');click(r,'button[data-action="close"]');assert.equal(r.window.document.querySelectorAll('.vocabularyRow').length,3);
const archived=r.window.JIGU_BOOKS.find(b=>b.archived);
if(archived){
 const a=app(JSON.stringify({selectedId:archived.id,records:{[archived.id]:{opened:true,saved:true,page:2,lastReadAt:999}},wordSaves:{[archived.id+':'+archived.keywords[0].id]:true},wordReviews:{test:{dueAt:123}}}));
 assert.ok(!a.window.document.querySelector('h1').textContent.includes(archived.title),'Home moves to a current book');click(a,'[data-go="mine"]');assert.ok(a.window.document.querySelector(`[data-resume="${archived.id}"]`));click(a,`[data-resume="${archived.id}"]`);assert.match(a.window.document.querySelector('.readerHeader').textContent,new RegExp('3/'+archived.pages.length));
 const restored=JSON.parse(a.window.localStorage.getItem('jigu-reading-library-v2'));assert.ok(restored.records[archived.id].saved);assert.ok(restored.wordSaves[archived.id+':'+archived.keywords[0].id]);assert.equal(restored.wordReviews.test.dueAt,123);assert.match(a.window.document.querySelector('.readerHeader').textContent,/旧版/);click(a,'[data-go="shelf"]');click(a,'[data-go="home"]');assert.ok(!a.window.document.querySelector('h1').textContent.includes(archived.title));a.window.close();
}
// Explicit withdrawals disappear from every navigation route, including saved legacy state.
const withdrawnIds=(()=>{const c={window:{}};vm.runInNewContext(readFileSync('public/books/curation.js','utf8'),c);return c.window.JIGU_CURATION.withdrawnIds})();
const withdrawnId='0089';const oldBook=(()=>{const c={window:{}};vm.runInNewContext(catalog,c);return c.window.JIGU_BOOKS.find(b=>b.id===withdrawnId)})();
const withdrawn=app(JSON.stringify({selectedId:withdrawnId,records:{[withdrawnId]:{opened:true,saved:true,page:1}},wordSaves:{[withdrawnId+':'+oldBook.keywords[0].id]:true}}));
click(withdrawn,'[data-go="shelf"]');for(const id of withdrawnIds)assert.equal(withdrawn.window.document.querySelector('[data-book="'+id+'"]'),null);
assert.ok(![...withdrawn.window.document.querySelectorAll('.cardStage, .stageSelect')].some(e=>/S[123]/.test(e.textContent)));
click(withdrawn,'[data-go="mine"]');assert.equal(withdrawn.window.document.querySelector('[data-resume="'+withdrawnId+'"]'),null);
click(withdrawn,'[data-go="vocabulary"]');assert.ok(withdrawn.window.document.querySelector('.emptyVocabulary'));withdrawn.window.close();
const archivedWithdrawal=app(JSON.stringify({selectedId:'how-about-you',records:{'how-about-you':{opened:true,saved:true,page:2}}}));click(archivedWithdrawal,'[data-go="mine"]');assert.equal(archivedWithdrawal.window.document.querySelector('[data-resume="how-about-you"]'),null);archivedWithdrawal.window.close();
// Free browsing uses a stable word-bank order, without changing review ratings.
const browse=app(JSON.stringify({records:{'0087':{opened:true,finished:true,page:7,lastReadAt:1}}}));
click(browse,'[data-go="mine"]');click(browse,'[data-go="vocabulary"]');
const keys=[...browse.window.document.querySelectorAll('.vocabularyRow')].map(el=>el.dataset.key);assert.ok(keys.length>=3);
click(browse,'.vocabularyRow');
const current=()=>browse.window.document.querySelector('[data-action="vocabulary-source"]').dataset.key;
const counter=()=>browse.window.document.querySelector('.wordBrowseNav [role="status"]').textContent;
function touch(type,points,target=browse.window.document.querySelector('.wordArt'),changed=points){const e=new browse.window.Event(type,{bubbles:true});Object.defineProperties(e,{touches:{value:points},changedTouches:{value:changed}});target.dispatchEvent(e)}
function swipe(dx,dy=0,target){const start={clientX:200,clientY:250},end={clientX:200+dx,clientY:250+dy};touch('touchstart',[start],target);touch('touchmove',[end],target);touch('touchend',[],target,[end])}
assert.equal(current(),keys[0]);assert.ok(browse.window.document.querySelector('[data-action="word-previous"]').disabled);
swipe(100);assert.equal(current(),keys[0],'first boundary does not wrap');
const played=[];browse.window.Audio=class{play(){played.push(this);return Promise.resolve()}pause(){this.paused=true}};
click(browse,'[data-action="vocabulary-audio"]');const stale=played[0].onended;
swipe(-100);assert.equal(current(),keys[1]);assert.ok(played[0].paused);stale();assert.equal(current(),keys[1]);assert.equal(counter(),'2 / '+keys.length);
swipe(-15);assert.equal(current(),keys[1],'tap/short drags do not switch');
swipe(-20,100);assert.equal(current(),keys[1],'vertical scroll does not switch');
swipe(-100,120);assert.equal(current(),keys[1],'diagonal scroll does not switch');
swipe(-100,0,browse.window.document.querySelector('[data-action="vocabulary-audio"]'));assert.equal(current(),keys[1],'controls do not start swipe gestures');
touch('touchstart',[{clientX:200,clientY:250}]);touch('touchcancel',[]);touch('touchend',[],undefined,[{clientX:50,clientY:250}]);assert.equal(current(),keys[1]);
touch('touchstart',[{clientX:200,clientY:250},{clientX:150,clientY:200}]);touch('touchend',[],undefined,[{clientX:50,clientY:250}]);assert.equal(current(),keys[1],'pinch gestures do not switch');
click(browse,'[data-action="vocabulary-source"]');click(browse,'[data-action="reader-back"]');assert.equal(current(),keys[1]);assert.equal(counter(),'2 / '+keys.length);
swipe(-100);assert.equal(current(),keys[2],'source inspection preserves the browsing sequence');swipe(100);assert.equal(current(),keys[1]);
for(let i=0;i<keys.length;i++)click(browse,'[data-action="word-next"]');assert.equal(current(),keys.at(-1));assert.ok(browse.window.document.querySelector('[data-action="word-next"]').disabled);swipe(-100);assert.equal(current(),keys.at(-1),'last boundary does not wrap');
browse.window.dispatchEvent(new browse.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(current(),keys.at(-2));
const state=JSON.parse(browse.window.localStorage.getItem('jigu-reading-library-v2'));assert.deepEqual(state.wordReviews,{},'browsing does not score vocabulary');browse.window.close();
// Reading gestures extend to captions, retain continuous listening and reset page scroll.
const flow=app(),audio=[];flow.window.Audio=class{play(){audio.push(this);return Promise.resolve()}pause(){this.paused=true}};
flow.window.scrollTo=(x,y)=>{flow.window.scrollY=y};click(flow,'[data-go="shelf"]');flow.window.scrollTo(0,600);click(flow,'[data-book="0087"]');click(flow,'[data-go="reader"]');click(flow,'[data-action="listen"]');
function readingTouch(type,points,changed=points){const e=new flow.window.Event(type,{bubbles:true});Object.defineProperties(e,{touches:{value:points},changedTouches:{value:changed}});flow.window.document.querySelector('.textPanel').dispatchEvent(e)}
readingTouch('touchstart',[{clientX:100,clientY:200}]);readingTouch('touchend',[],[{clientX:200,clientY:200}]);assert.equal(audio.length,1);assert.ok(!audio[0].paused,'swiping past the first page keeps listening');
flow.window.scrollTo(0,250);readingTouch('touchstart',[{clientX:200,clientY:200}]);readingTouch('touchend',[],[{clientX:100,clientY:200}]);assert.match(flow.window.document.querySelector('.readerHeader').textContent,/2\/8/);assert.equal(audio.length,2);assert.ok(audio[0].paused);assert.equal(flow.window.scrollY,0);
click(flow,'[data-action="prev"]');assert.equal(audio.length,3);assert.match(flow.window.document.querySelector('.readerHeader').textContent,/1\/8/);
click(flow,'[data-go="shelf"]');assert.equal(flow.window.scrollY,600,'shelf return restores browsing position');
click(flow,'[data-book="0087"]');click(flow,'[data-action="words"]');click(flow,'.wordCard');const firstWord=flow.window.document.querySelector('[role="dialog"]').getAttribute('aria-label');click(flow,'[data-action="word-next"]');assert.notEqual(flow.window.document.querySelector('[role="dialog"]').getAttribute('aria-label'),firstWord);click(flow,'[data-action="word-previous"]');assert.equal(flow.window.document.querySelector('[role="dialog"]').getAttribute('aria-label'),firstWord);flow.window.close();
const h=app();h.window.close();
const highlightHtml=html.replace('highlightWords(p.en,book.keywords.map(w=>w.word))', "highlightWords('Read reading READ. A sea turtle & <cat> catch.', ['read','sea turtle','turtle','cat'])");
const fixtureDom=new JSDOM(highlightHtml,{url:'https://jigu.local/',runScripts:'outside-only'});fixtureDom.window.scrollTo=()=>{};fixtureDom.window.eval(readFileSync('public/books/curation.js','utf8'));fixtureDom.window.eval(catalog);fixtureDom.window.eval(bundle);fixtureDom.window.eval([...fixtureDom.window.document.scripts].find(s=>s.textContent.includes('const books=window.JIGU_BOOKS')).textContent);click(fixtureDom,'[data-go="reader"]');
assert.deepEqual([...fixtureDom.window.document.querySelectorAll('.readEnglish mark')].map(e=>e.textContent),['Read','READ','sea turtle','cat']);
assert.equal(fixtureDom.window.document.querySelector('.readEnglish').textContent,'Read reading READ. A sea turtle & <cat> catch.');
assert.equal(fixtureDom.window.document.querySelector('.readEnglish cat'),null);fixtureDom.window.close();
for(const instance of [d,r])instance.window.close();
console.log('PASS vocabulary: reached-page collection, cross-book deduplication, saved words, 1/3/7/14-day review, recorded sentence audio, stale callbacks, source navigation and archive migration');


// Cached-complete images, decode failure and late callbacks must all settle safely.
const images=app();click(images,'[data-go="reader"]');
let image=images.window.document.querySelector('.artFrame img');
Object.defineProperty(image,'naturalWidth',{value:400});image.decode=()=>Promise.reject(new Error('decode unsupported'));
image.dispatchEvent(new images.window.Event('load'));await new Promise(resolve=>setTimeout(resolve,0));assert.ok(image.parentElement.classList.contains('loaded'));
let finish;image.decode=()=>new Promise(resolve=>{finish=resolve});image.dispatchEvent(new images.window.Event('load'));
click(images,'[data-action="next"]');finish();await new Promise(resolve=>setTimeout(resolve,0));assert.ok(!images.window.document.querySelector('.artFrame').classList.contains('loaded'),'old page callback cannot mark the new page ready');
image=images.window.document.querySelector('.artFrame img');image.dispatchEvent(new images.window.Event('error'));assert.ok(images.window.document.querySelector('[data-action="retry-image"]'));click(images,'[data-action="retry-image"]');assert.ok(!image.isConnected);assert.equal(images.window.document.querySelector('.imgLoading').textContent,'插画加载中…');images.window.close();
const cachedHtml=html.replace('  function render(){',"  Object.defineProperty(HTMLImageElement.prototype,'complete',{get(){return true}});Object.defineProperty(HTMLImageElement.prototype,'naturalWidth',{get(){return 400}});\n  function render(){");
const cached=new JSDOM(cachedHtml,{url:'https://jigu.local/',runScripts:'outside-only'});cached.window.scrollTo=()=>{};cached.window.eval(readFileSync('public/books/curation.js','utf8'));cached.window.eval(catalog);cached.window.eval(bundle);cached.window.eval([...cached.window.document.scripts].find(s=>s.textContent.includes('const books=window.JIGU_BOOKS')).textContent);click(cached,'[data-go="reader"]');await new Promise(resolve=>setTimeout(resolve,0));assert.ok(cached.window.document.querySelector('.artFrame.loaded'),'complete cached image needs no load event');cached.window.close();
console.log('PASS reader images: cached completion, decode rejection, stale callbacks and retry');

const five=app(JSON.stringify({records:{'0087':{finished:true,opened:true,page:7},'lr-our-family':{finished:true,opened:true,page:8},'0001':{finished:true,opened:true,page:10}}}));
click(five,'[data-go="mine"]');click(five,'[data-go="vocabulary"]');const beforeFive=JSON.parse(five.window.localStorage.getItem('jigu-reading-library-v2')).wordReviews;
click(five,'[data-action="browse-five"]');assert.equal(five.window.document.querySelector('.wordBrowseNav [role="status"]').textContent,'1 / 5');
for(let i=0;i<4;i++)click(five,'[data-action="word-next"]');assert.equal(five.window.document.querySelector('.wordBrowseNav [role="status"]').textContent,'5 / 5');assert.ok(five.window.document.querySelector('[data-action="word-next"]').disabled);click(five,'[data-action="word-previous"]');assert.equal(five.window.document.querySelector('.wordBrowseNav [role="status"]').textContent,'4 / 5');assert.deepEqual(JSON.parse(five.window.localStorage.getItem('jigu-reading-library-v2')).wordReviews,beforeFive);five.window.close();
console.log('PASS browse five: buttons, progress, boundaries, and no implicit review scores');
