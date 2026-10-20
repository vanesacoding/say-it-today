import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {JSDOM} from 'jsdom';
const html=readFileSync('index.html','utf8'),request=JSON.parse(readFileSync('scripts/library-release-request.json'));
const manifest=JSON.parse(readFileSync('scripts/library-release-candidate.json'));
const additions=manifest.shards.flatMap(s=>JSON.parse(readFileSync('scripts/'+s.file)));
const dom=new JSDOM(html,{url:'https://jigu.local/',runScripts:'outside-only'}),w=dom.window;w.scrollTo=()=>{};
w.eval(readFileSync('public/books/curation.js','utf8'));w.eval(readFileSync('public/books/catalog.js','utf8'));
for(const b of additions)if(!w.JIGU_BOOKS.some(old=>old.id===b.id))w.JIGU_BOOKS.push(b);
w.eval(readFileSync('public/books/vocabulary.js','utf8'));w.eval([...w.document.scripts].find(s=>s.textContent.includes('const books=window.JIGU_BOOKS')).textContent);
function click(s){const el=w.document.querySelector(s);assert.ok(el,s);el.click()}
let count=0;
for(const b of additions){
 click('[data-go="shelf"]');click(`[data-book="${b.id}"]`);assert.match(w.document.querySelector('main').textContent,/英式英语/);click('[data-go="reader"]');
 for(const [i,p] of b.pages.entries()){
  assert.equal(w.document.querySelector('.readEnglish').textContent,p.en);
  assert.equal(w.document.querySelectorAll('.mobileArt .artFrame').length,p.mobilePanels.length);
  for(const [j,img] of [...w.document.querySelectorAll('.mobileArt img')].entries()){
   const [x,y,pw,ph]=p.mobilePanels[j];assert.equal(parseFloat(img.style.width),100/pw);assert.ok(Math.abs(parseFloat(img.style.left)-(-x/pw*100))<.000001);
  }
  click('[data-action="original-art"]');assert.match(w.document.querySelector('.sheet').getAttribute('aria-label'),/原书完整跨页/);
  assert.equal(w.document.querySelector('.sheetText').textContent,b.source.spreads.find(s=>s.index===p.sourceSpreadIndex).text);
  click('button[data-action="close"]');assert.equal(w.document.querySelector('.readEnglish').textContent,p.en);assert.ok(w.document.querySelector('.mobileReading'));
  click('[data-action="next"]');count++;
 }
 assert.ok(w.document.querySelector('.endTitle'));assert.equal(w.document.querySelectorAll('.wordCard').length,3);
 for(const k of b.keywords){click(`[data-word-id="${k.id}"]`);assert.equal(w.document.querySelector('.wordSentence').textContent,b.pages[k.pageIndex].en);assert.ok(!w.document.querySelector('.sheet').textContent.includes('undefined'));click('button[data-action="close"]')}
}
assert.equal(count,37);dom.window.close();console.log('PASS 2 complete phone books / 37 pages: original-spread dialog returns to same page, bounded panels, fixed controls, British labels, source-linked words');
