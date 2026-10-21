import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const books=JSON.parse(readFileSync('scripts/library-release-books-nature.json'));
const sources=JSON.parse(readFileSync('scripts/nature-source-manifest.json'));
const d=new JSDOM(readFileSync('index.html','utf8'),{url:'https://jigu.local/',runScripts:'outside-only'}),w=d.window;w.scrollTo=()=>{};
for(const file of ['curation.js','catalog.js','vocabulary.js'])w.eval(readFileSync('public/books/'+file,'utf8'));
for(const b of books)if(!w.JIGU_BOOKS.some(o=>o.id===b.id))w.JIGU_BOOKS.push(b);
w.eval([...w.document.scripts].find(s=>s.textContent.includes('const books=window.JIGU_BOOKS')).textContent);
const click=s=>{const el=w.document.querySelector(s);assert.ok(el,s);el.click()};
let pages=0;
click('.bottomNav [data-go="shelf"]');assert.equal(w.document.querySelectorAll('.shelfCard').length,100);
assert.equal(new Set(books.map(b=>b.narration.voice)).size,3);
for(const b of books){
 const source=sources.find(s=>s.bookId===b.id);assert.ok(source);assert.equal(b.primaryTheme,'nature');
 click('[data-go="shelf"]');click(`[data-book="${b.id}"]`);click('[data-action="credits"]');assert.ok(w.document.querySelector('.credit').textContent.includes(b.narration.accentLabel));assert.ok(w.document.querySelector('.sourceAttribution').textContent.includes('CC BY 4.0'));click('button[data-action="close"]');click('[data-go="reader"]');
 if(!w.document.querySelector('.companionPanel'))click('[data-action="companion"]');
 for(let i=0;i<b.pages.length;i++){
  assert.equal(w.document.querySelector('.readEnglish')?.textContent||'',source.pages[i].sourceText);
  assert.equal(w.document.querySelector('.companionTranslation').textContent,b.pages[i].zh);
  assert.ok(w.document.querySelector('.compactReading'));assert.equal(w.document.querySelector('[data-action="page-art"]'),null);
  click('[data-action="next"]');pages++;
 }
 assert.ok(w.document.querySelector('.endTitle'));assert.equal(w.document.querySelectorAll('.wordCard').length,3);
 for(const word of b.keywords)assert.match(b.pages[word.pageIndex].en,new RegExp('(?<![a-z])'+word.word+'(?![a-z])','i'));
}
d.window.close();assert.equal(pages,176);console.log('PASS nature additions: 100 active books, 15 complete books / 176 pages, original English, bilingual companion, 45 source-linked words, 3 voices and full attribution');
