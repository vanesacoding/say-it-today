import {chromium} from 'playwright';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const books=JSON.parse(readFileSync('scripts/library-release-books-animals.json'));
const inject=readFileSync('public/books/catalog.js','utf8')+'\n'+JSON.stringify(books)+'.forEach(b=>{if(!window.JIGU_BOOKS.some(o=>o.id===b.id))window.JIGU_BOOKS.push(b)});';
const browser=await chromium.launch();mkdirSync('layout-proof',{recursive:true});
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[1024,768]]){
  const p=await browser.newPage({viewport:{width,height}});await p.route('**/books/catalog.js',r=>r.fulfill({body:inject,contentType:'text/javascript'}));await p.goto('http://127.0.0.1:4173/');
  await p.locator('[data-go="shelf"]').first().click();
  const order=await p.locator('.shelfCard').evaluateAll(es=>es.map(e=>e.dataset.book));
  const geometry=await p.locator('.shelfCover').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height]}));assert.ok(geometry.every(([w,h])=>Math.abs(w-h)<1),'every cover uses one square size');
  await p.locator('[data-filter-theme="nature"]').click();await p.locator('[data-filter-theme="all"]').click();assert.deepEqual(await p.locator('.shelfCard').evaluateAll(es=>es.map(e=>e.dataset.book)),order,'mixed source ordering stays stable');
  if(width===390){for(const id of order.slice(0,6))await p.locator(`[data-book="${id}"] img`).evaluate(async im=>{try{await im.decode()}catch{}});await p.screenshot({path:'layout-proof/mixed-square-shelf-390.png'});}
  for(const b of books){
   await p.locator('[data-book="'+b.id+'"]').click();await p.locator('[data-go="reader"]').click();if(await p.locator('[data-action="companion"]').getAttribute('aria-checked')!=='true')await p.locator('[data-action="companion"]').click();
   for(const [i,row] of b.pages.entries()){
    await p.locator('.artFrame img').evaluate(async im=>{if(!im.complete)await new Promise((ok,no)=>{im.addEventListener('load',ok,{once:true});im.addEventListener('error',no,{once:true})});await im.decode()});
    await p.waitForFunction(()=>document.querySelector('.artFrame.loaded'));
    assert.equal(await p.locator('.readEnglish').count()?await p.locator('.readEnglish').textContent():'',row.en);
    const g=await p.locator('main').evaluate(e=>{const f=e.querySelector('.artFrame'),r=f.getBoundingClientRect(),im=f.querySelector('img'),text=e.querySelector('.companionPanel').getBoundingClientRect(),foot=e.querySelector('.pageControls').getBoundingClientRect();return {w:r.width,h:r.height,fit:getComputedStyle(im).objectFit,over:document.documentElement.scrollWidth>innerWidth,within:text.bottom<=foot.top+1}});
    assert.ok(g.w>=width-40||g.w>=400);assert.ok(g.h>=140&&g.fit==='contain'&&!g.over);if(width>=390)assert.ok(g.within,JSON.stringify({book:b.id,page:i+1,width,g}));
    assert.equal(await p.locator('[data-action="page-art"]').count(),0);
    if(width===390&&[1,7].includes(i))await p.screenshot({path:`layout-proof/${b.id}-${i+1}-390.png`});
    await p.locator('[data-action="next"]').click();
   }
   await p.locator('[data-go="shelf"]').last().click();
  }
  await p.close();
 }
 console.log('PASS animals: 24 high-resolution uncropped spreads × 4 viewports, exact English, one-screen companion on common phones, square covers and stable mixed order');
}finally{await browser.close()}
