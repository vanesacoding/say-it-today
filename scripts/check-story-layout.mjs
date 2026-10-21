import {chromium} from 'playwright';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const books=JSON.parse(readFileSync('scripts/library-release-books-stories.json'));
const inject=readFileSync('public/books/catalog.js','utf8')+'\nwindow.JIGU_BOOKS='+JSON.stringify(books)+'.concat(window.JIGU_BOOKS.filter(b=>!'+JSON.stringify(books.map(b=>b.id))+'.includes(b.id)));';
const browser=await chromium.launch();mkdirSync('layout-proof',{recursive:true});
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height}});await page.route('**/books/catalog.js',r=>r.fulfill({body:inject,contentType:'text/javascript'}));await page.goto('http://127.0.0.1:4173/');await page.locator('.bottomNav [data-go="shelf"]').click();
  assert.equal(await page.locator('.shelfCard').count(),await page.evaluate(()=>window.JIGU_BOOKS.filter(b=>!b.archived&&!window.JIGU_CURATION.withdrawnIds.includes(b.id)).length));let fits=0,total=0;
  const newCovers=await page.locator('.shelfCard img').evaluateAll(es=>es.map(e=>getComputedStyle(e).objectFit));assert.ok(newCovers.length>=20);
  if(width===390){for(const b of books)await page.locator(`[data-book="${b.id}"] img`).evaluate(async im=>{im.loading='eager';try{await im.decode()}catch{}});await page.screenshot({path:'layout-proof/stories-square-covers-390.png',fullPage:true});}

  const boxes=await page.locator('.shelfCover').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height]}));assert.ok(boxes.every(([w,h])=>Math.abs(w-h)<1));
  for(const b of books){
   await page.locator(`[data-book="${b.id}"]`).click();await page.locator('[data-go="reader"]').click();if(await page.locator('[data-action="companion"]').getAttribute('aria-checked')!=='true')await page.locator('[data-action="companion"]').click();
   for(const [i,row] of b.pages.entries()){
    await page.locator('.artFrame img').evaluate(async im=>{if(!im.complete)await new Promise((ok,no)=>{im.addEventListener('load',ok,{once:true});im.addEventListener('error',no,{once:true})});await im.decode()});
    await page.waitForFunction(()=>document.querySelector('.artFrame.loaded'));
    assert.equal(await page.locator('.readEnglish').count()?await page.locator('.readEnglish').textContent():'',row.en);
    const g=await page.locator('main').evaluate(e=>{const f=e.querySelector('.artFrame'),r=f.getBoundingClientRect(),im=f.querySelector('img'),comp=e.querySelector('.companionPanel').getBoundingClientRect(),foot=e.querySelector('.pageControls').getBoundingClientRect();return {w:r.width,h:r.height,fit:getComputedStyle(im).objectFit,naturalWidth:im.naturalWidth,naturalHeight:im.naturalHeight,over:document.documentElement.scrollWidth>innerWidth,within:comp.bottom<=foot.top+1,footTop:foot.top,footBottom:foot.bottom}});
    assert.equal(g.naturalWidth,row.imageWidth);assert.equal(g.naturalHeight,row.imageHeight);assert.equal(g.fit,'contain');assert.ok(!g.over&&g.h>=140&&g.w>=Math.min(width-40,400));assert.ok(g.footTop>=0&&Math.abs(g.footBottom-height)<2);if(g.within)fits++;total++;
    if(width===390&&[0,Math.floor(b.pages.length/2)].includes(i))await page.screenshot({path:`layout-proof/${b.id}-${i+1}-390.png`});
    await page.locator('[data-action="next"]').click();
   }
   await page.locator('[data-go="shelf"]').last().click();
  }
  console.log(`STORIES COMPANION FIT ${width}: ${fits}/${total}`);if(width>=390)assert.ok(fits/total>=.65,'most pages fit with companion; long unabridged stories remain scrollable');await page.close();
 }
 console.log('PASS 241 original story pages × 4 viewports, full uncropped art, original text, fixed controls, square covers and current shelf');
}finally{await browser.close()}
