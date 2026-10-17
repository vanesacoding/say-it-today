import { readFileSync, existsSync, statSync } from 'node:fs';
import { strict as assert } from 'node:assert';
const html=readFileSync('index.html','utf8');
assert.match(html,/I Like to Read!/);
assert.match(html,/const book =/);
assert.match(html,/const pageImage =/);
assert.match(html,/const localAudio =/);
assert.match(html,/const remoteAudio =/);
assert.match(html,/function playPage\(/);
assert.match(html,/function onAudioEnd\(/);
assert.match(html,/function fallbackSpeech\(/);
for(const name of ['together','listen','companion','favorite','next'])assert.ok(html.includes('data-action="'+name+'"'),'missing control '+name);
assert.match(html,/data-go="shelf"/);
assert.match(html,/data-go="mine"/);
assert.match(html,/Letta Machoga/);
assert.match(html,/Wiehan de Jager/);
assert.match(html,/Darshan Soni/);
assert.match(html,/CC BY 3\.0/);
assert.match(html,/companionMode:state\.companionMode/);
assert.match(html,/state\.companionMode=!!old\.companionMode/);
assert.match(html,/aria-checked=/);
assert.match(html,/companionPanel/);
assert.doesNotMatch(html,/data-action="translation"|data-action="tip"/);
assert.doesNotMatch(html,/rotate\(|readerLayout:'landscape'|滑动看画/);
for(let i=1;i<=8;i++){
 const number=String(i).padStart(2,'0');
 const image='public/books/read/'+number+'.jpg';
 assert.ok(existsSync(image),'missing book image '+image);
 assert.ok(statSync(image).size>15000,'invalid original image '+image);
 if(process.env.CI){
  const sound='public/books/read/audio/'+number+'.mp3';
  assert.ok(existsSync(sound),'missing original narration '+sound);
  const buf=readFileSync(sound);
  const mp3=buf.toString('ascii',0,3)==='ID3'||buf[0]===0xff&&(buf[1]&0xe0)===0xe0;
  assert.ok(buf.length>600&&mp3,'invalid MP3 '+sound);
 }
}
console.log('PASS portrait reader: illustrated pages, credits, real MP3 files and reading controls');
import { JSDOM } from 'jsdom';
const makeDom=(saved)=> {
 const dom=new JSDOM(html,{url:'https://jigu.local/',runScripts:'outside-only'});
 if(saved) dom.window.localStorage.setItem('jigu-vertical-book-0087-v1', saved);
 const pageScripts=[...dom.window.document.querySelectorAll('script')].map(s=>s.textContent).filter(x=>x.includes('const book ='));
 assert.equal(pageScripts.length,1);
 dom.window.eval(pageScripts[0]);
 return dom;
};
const click=(dom,selector)=>{
 const el=dom.window.document.querySelector(selector);
 assert.ok(el,'missing interactive element: '+selector);
 el.click();
};
const dom=makeDom();
click(dom,'[data-go="reader"]');
assert.equal(dom.window.document.querySelector('.companionPanel'),null,'off by default');
click(dom,'[data-action="companion"]');
let panel=dom.window.document.querySelector('.companionPanel');
assert.ok(panel,'enable inline companion panel');
assert.match(panel.textContent,/我喜欢看书/);
assert.match(panel.textContent,/指着男孩手里的书/);
click(dom,'[data-action="next"]');
panel=dom.window.document.querySelector('.companionPanel');
assert.ok(panel,'must remain on across page changes');
assert.match(panel.textContent,/我可以念给谁听呢/);
assert.match(panel.textContent,/一起猜猜/);
click(dom,'[data-action="prev"]');
assert.ok(dom.window.document.querySelector('.companionPanel'),'must remain on after returning to previous page');
const prefs=dom.window.localStorage.getItem('jigu-vertical-book-0087-v1');
assert.equal(JSON.parse(prefs).companionMode,true,'preference saved');
const reloaded=makeDom(prefs);
click(reloaded,'[data-go="reader"]');
assert.ok(reloaded.window.document.querySelector('.companionPanel'),'preference restored after reopening');
click(reloaded,'[data-action="companion"]');
assert.equal(reloaded.window.document.querySelector('.companionPanel'),null,'mode can be turned off');
assert.equal(JSON.parse(reloaded.window.localStorage.getItem('jigu-vertical-book-0087-v1')).companionMode,false,'off preference saved');
dom.window.close();
reloaded.window.close();
console.log('PASS companion mode: inline bilingual guidance, persistent across page and reload, reversible switch');

const favDom=makeDom();
click(favDom,'[data-go="mine"]');
assert.equal(favDom.window.document.querySelector('.favoriteBook'),null,'empty favorites must not show a tappable book');
click(favDom,'[data-go="reader"]');
click(favDom,'[data-action="next"]');
click(favDom,'[data-action="favorite"]');
click(favDom,'[data-go="home"]');
click(favDom,'[data-go="mine"]');
let favoriteItem=favDom.window.document.querySelector('.favoriteBook');
assert.ok(favoriteItem,'favorited book should render a clickable card');
assert.equal(favoriteItem.tagName,'BUTTON');
assert.match(favoriteItem.getAttribute('aria-label'),/打开已收藏/);
click(favDom,'.favoriteBook');
assert.ok(favDom.window.document.querySelector('.readerHeader'),'tapping favorite opens reader');
assert.match(favDom.window.document.querySelector('.readerHeader .heading').textContent,/2\/8/,'favorite resumes previous page');
assert.ok(favDom.window.document.querySelector('[data-action="favorite"].heartActive'),'favorite remains selected');
click(favDom,'[data-go="home"]');
click(favDom,'[data-go="mine"]');
const persistedSaved=favDom.window.localStorage.getItem('jigu-vertical-book-0087-v1');
const favoritesAfterReload=makeDom(persistedSaved);
click(favoritesAfterReload,'[data-go="mine"]');
assert.ok(favoritesAfterReload.window.document.querySelector('.favoriteBook'),'favorite is clickable after reload');
click(favoritesAfterReload,'.favoriteBook');
assert.match(favoritesAfterReload.window.document.querySelector('.readerHeader .heading').textContent,/2\/8/,'reloaded favorite resumes previous page');
click(favoritesAfterReload,'[data-action="favorite"]');
click(favoritesAfterReload,'[data-go="home"]');
click(favoritesAfterReload,'[data-go="mine"]');
assert.equal(favoritesAfterReload.window.document.querySelector('.favoriteBook'),null,'unfavorited item is removed from collection');
assert.match(favoritesAfterReload.window.document.querySelectorAll('.readHistory')[1].textContent,/暂时还没有收藏/);
favDom.window.close();
favoritesAfterReload.window.close();
console.log('PASS favorites: clickable collection card, resume, refresh persistence and unfavorite');


// Keywords must use story content and must never move the saved reading position.
const wordDom=makeDom();
const played=[];
class Narration {
  constructor(){this.onended=null;this.onerror=null;this.src='';this.paused=false;}
  play(){played.push(this);return Promise.resolve();}
  pause(){this.paused=true;}
}
wordDom.window.Audio=Narration;
click(wordDom,'[data-go="reader"]');
click(wordDom,'[data-action="next"]');
click(wordDom,'[data-action="next"]');
click(wordDom,'[data-go="home"]');
assert.match(wordDom.window.document.querySelector('.topicTags').textContent,/我的每一天/);
assert.equal(wordDom.window.document.querySelector('[data-action="filter"]'),null,'one-book shelf has no empty filters');
click(wordDom,'[data-action="words"]');
assert.equal(wordDom.window.document.querySelectorAll('.wordCard').length,3);
for(const [id,page,sentence] of [['read','01','I like to read.'],['asleep','03','My sister is asleep.'],['busy','05','My mother and grandmother are busy.']]){
  click(wordDom,`[data-word-id="${id}"]`);
  assert.match(wordDom.window.document.querySelector('.wordArt').src,new RegExp(`/books/read/${page}\\.jpg$`));
  assert.equal(wordDom.window.document.querySelector('.wordSentence').textContent,sentence);
  assert.equal(wordDom.window.document.querySelector('.wordSentence mark').textContent.toLowerCase(),id);
  click(wordDom,'[data-action="word-audio"]');
  const audio=played.at(-1);
  assert.equal(audio.src,`./books/read/audio/${page}.mp3`,'play the matching original sentence');
  assert.match(wordDom.window.document.querySelector('[data-action="word-audio"]').textContent,/停止/);
  audio.onended();
  assert.match(wordDom.window.document.querySelector('[data-action="word-audio"]').textContent,/听原句/);
  click(wordDom,'[data-action="word-audio"]');
  click(wordDom,'[data-action="words"]');
  assert.equal(played.at(-1).paused,true,'switching word sheets stops narration');
}
click(wordDom,'[data-word-id="busy"]');
click(wordDom,'[data-action="word-audio"]');
click(wordDom,'button[data-action="close"]');
assert.equal(played.at(-1).paused,true,'closing sheet stops narration');
click(wordDom,'[data-go="reader"]');
assert.match(wordDom.window.document.querySelector('.readerHeader .heading').textContent,/3\/8/,'word browsing preserves reading progress');
for(let i=0;i<6;i++)click(wordDom,'[data-action="next"]');
assert.equal(wordDom.window.document.querySelectorAll('.wordCard').length,3,'keywords available on completion');
assert.match(wordDom.window.document.querySelector('.endActivity').textContent,/读完去发现/);
click(wordDom,'[data-word-id="asleep"]');
wordDom.window.document.dispatchEvent(new wordDom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
assert.equal(wordDom.window.document.querySelector('.sheet'),null);
assert.ok(wordDom.window.document.querySelector('.endTitle'),'close returns to completion screen');
click(wordDom,'[data-action="again"]');
assert.match(wordDom.window.document.querySelector('.readerHeader .heading').textContent,/1\/8/);
wordDom.window.close();
console.log('PASS story keywords: matching original scenes and narration, stop on close, preserved progress, completion and replay');
