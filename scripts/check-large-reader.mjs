import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const html=readFileSync('index.html','utf8');
assert.ok(!html.includes('function fitReader('),'reader must not shrink artwork to the remaining viewport height');
assert.ok(!html.includes('height:min(44dvh,380px)'));
const dom=new JSDOM(html,{url:'https://jigu.local/',runScripts:'outside-only'}),w=dom.window;
w.scrollTo=()=>{};
for(const file of ['curation','catalog','vocabulary','ages'])w.eval(readFileSync(`public/books/${file}.js`,'utf8'));
w.eval([...w.document.scripts].find(s=>s.textContent.includes('const books=window.JIGU_BOOKS')).textContent);
const click=selector=>{const el=w.document.querySelector(selector);assert.ok(el,selector);el.click();};
click('[data-go="shelf"]');
const representatives=new Map();
for(const b of w.JIGU_BOOKS){
 if(!w.document.querySelector(`[data-book="${b.id}"]`))continue;
 const p=b.pages[0],kind=[b.source.format,p.mobilePanels?'panels':p.imageWidth>p.imageHeight?'landscape':'portrait'].join(':');
 if(!representatives.has(kind))representatives.set(kind,b);
}
for(const b of representatives.values()){
 click(`[data-book="${b.id}"]`);click('[data-go="reader"]');
 assert.ok(w.document.querySelector('#app.readerShell'));
 assert.equal(w.getComputedStyle(w.document.getElementById('app')).maxWidth,'820px');
 for(const companion of [false,true]){
  if((w.document.querySelector('[data-action="companion"]').getAttribute('aria-checked')==='true')!==companion)click('[data-action="companion"]');
  const art=w.document.querySelector('#artFrame'),css=w.getComputedStyle(art);
  assert.equal(art.style.height,'');assert.equal(css.height,'auto');assert.equal(css.maxHeight,'none');assert.equal(css.width,'100%');
  assert.equal(w.getComputedStyle(w.document.querySelector('.pageControls')).position,'fixed');
  if(!b.pages[0].mobilePanels){const im=art.querySelector('img');assert.equal(w.getComputedStyle(im).height,'auto');assert.equal(w.getComputedStyle(im).objectFit,'contain');}
  assert.ok(w.document.querySelector('[data-action="speak"]'));
 }
 click('[data-action="next"]');assert.equal(w.document.querySelector('.readEnglish')?.textContent||'',b.pages[1].en);
 click('[data-action="prev"]');assert.equal(w.document.querySelector('.readEnglish')?.textContent||'',b.pages[0].en);
 click('.readerHeader [data-go="shelf"]');assert.ok(!w.document.querySelector('#app.readerShell'));
}
assert.ok(representatives.size>=4);
dom.window.close();
console.log(`PASS: ${representatives.size} source/shape variants, full-width artwork, no height cap, companion toggle, audio controls, next/previous and shelf return (DOM/CSS checks; no browser geometry)`);
