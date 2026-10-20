import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const books=JSON.parse(readFileSync('scripts/library-release-books-animals.json'));
const sources=JSON.parse(readFileSync('scripts/animals-source-manifest.json'));
const d=new JSDOM(readFileSync('index.html','utf8'),{url:'https://jigu.local/',runScripts:'outside-only'}),w=d.window;w.scrollTo=()=>{};
for(const file of ['curation.js','catalog.js','vocabulary.js'])w.eval(readFileSync('public/books/'+file,'utf8'));
for(const b of books)if(!w.JIGU_BOOKS.some(o=>o.id===b.id))w.JIGU_BOOKS.push(b);
w.eval([...w.document.scripts].find(s=>s.textContent.includes('const books=window.JIGU_BOOKS')).textContent);
function click(s){const e=w.document.querySelector(s);assert.ok(e,s);e.click()}
let pages=0;
for(const b of books){
 const source=sources.find(s=>s.bookId===b.id);assert.equal(source.pages.length,12);assert.equal(b.primaryTheme,'nature');
 click('[data-go="shelf"]');click(`[data-book="${b.id}"]`);assert.ok(w.document.querySelector('main').textContent.includes(b.narration.accentLabel));click('[data-go="reader"]');
 if(!w.document.querySelector('.companionPanel'))click('[data-action="companion"]');
 for(let i=0;i<b.pages.length;i++){
  assert.equal(w.document.querySelector('.readEnglish')?.textContent||'',source.pages[i].sourceText);
  assert.equal(w.document.querySelector('.companionTranslation').textContent,b.pages[i].zh);
  assert.ok(w.document.querySelector('.compactReading'));assert.equal(w.document.querySelector('[data-action="page-art"]'),null);
  click('[data-action="next"]');pages++;
 }
 assert.ok(w.document.querySelector('.endTitle'));assert.equal(w.document.querySelectorAll('.wordCard').length,3);
}
d.window.close();assert.equal(pages,24);console.log('PASS animal books: 24 complete original spreads, one wordless page, source English, companion guidance and 6 linked keywords');
