import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {JSDOM} from 'jsdom';
const additions=JSON.parse(readFileSync('scripts/library-release-books-letsread.json'));
const sources=JSON.parse(readFileSync('scripts/letsread-source-manifest.json'));
const dom=new JSDOM(readFileSync('index.html','utf8'),{url:'https://jigu.local/',runScripts:'outside-only'}),w=dom.window;w.scrollTo=()=>{};
w.eval(readFileSync('public/books/curation.js','utf8'));w.eval(readFileSync('public/books/catalog.js','utf8'));
for(const b of additions)if(!w.JIGU_BOOKS.some(old=>old.id===b.id))w.JIGU_BOOKS.push(b);
w.eval(readFileSync('public/books/vocabulary.js','utf8'));w.eval([...w.document.scripts].find(s=>s.textContent.includes('const books=window.JIGU_BOOKS')).textContent);
function click(s){const el=w.document.querySelector(s);assert.ok(el,s);el.click()}
let count=0,wordless=0;
for(const b of additions){
 const source=sources.find(s=>s.bookId===b.id),selected=source.pages.filter(p=>!p.excluded);assert.equal(selected.length,b.pages.length);
 click('[data-go="shelf"]');click(`[data-filter-theme="${b.primaryTheme}"]`);click(`[data-book="${b.id}"]`);assert.ok(w.document.querySelector('main').textContent.includes(b.narration.accentLabel));
 click('[data-action="credits"]');assert.equal(w.document.querySelector('.sourceAttribution p').textContent,source.attributionText);assert.equal(w.document.querySelector('.sourceAttribution a').href,new URL(b.source.originalPdf).href);click('button[data-action="close"]');click('[data-go="reader"]');
 for(const [i,p] of b.pages.entries()){
  assert.equal(w.document.querySelector('.readEnglish')?.textContent||'',p.en);assert.equal(p.en,selected[i].text);
  assert.ok(w.document.querySelector('.mobileReading'));assert.ok(w.document.querySelector('.artFrame img').src.endsWith(`${b.id}/${String(i+1).padStart(2,'0')}.jpg`));
  if(!w.document.querySelector('.companionPanel'))click('[data-action="companion"]');assert.equal(w.document.querySelector('.companionTranslation').textContent,p.zh);assert.ok(w.document.querySelector('.companionTip').textContent.includes(p.tip));
  if(!p.en){assert.ok(w.document.querySelector('.wordlessHint'));wordless++}
  click('[data-action="next"]');count++;
 }
 assert.ok(w.document.querySelector('.endTitle'));assert.equal(w.document.querySelectorAll('.wordCard').length,3);
 for(const k of b.keywords){click(`[data-word-id="${k.id}"]`);assert.equal(w.document.querySelector('.wordSentence').textContent,b.pages[k.pageIndex].en);assert.ok(!w.document.querySelector('.sheet').textContent.includes('undefined'));click('button[data-action="close"]')}
 click('[data-go="shelf"]');click('[data-filter-theme="all"]');
}
assert.equal(count,105);assert.equal(wordless,3);dom.window.close();console.log('PASS Let’s Read: 10 books / 105 full source images, 3 silent wordless pages, bilingual companion, 30 source-linked keywords, accent labels, full attribution and original PDF links');
