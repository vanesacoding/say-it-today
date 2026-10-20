// Preview the pinned candidates only inside the local layout test, before paid production.
import {chromium} from 'playwright';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const additions=JSON.parse(readFileSync('scripts/library-release-books-phone.json'));
const original=readFileSync('public/books/catalog.js','utf8');
const inject=original+'\n'+JSON.stringify(additions)+'.forEach(b=>{if(!window.JIGU_BOOKS.some(o=>o.id===b.id))window.JIGU_BOOKS.push(b)});';
const browser=await chromium.launch();mkdirSync('layout-proof',{recursive:true});
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height}});await page.route('**/books/catalog.js',r=>r.fulfill({body:inject,contentType:'text/javascript'}));await page.goto('http://127.0.0.1:4173/');
  for(const b of additions){
   await page.locator('[data-go="shelf"]').first().click();await page.locator(`[data-book="${b.id}"]`).click();await page.locator('[data-go="reader"]').click();
   for(let i=0;i<b.pages.length;i++){
    const panels=await page.locator('.mobileArt .artFrame').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),im=el.querySelector('img');return {width:r.width,height:r.height,imgWidth:im.getBoundingClientRect().width,pWidth:el.parentElement.clientWidth,overflow:document.documentElement.scrollWidth>innerWidth,docWidth:document.documentElement.scrollWidth,wide:[...document.querySelectorAll('main *')].filter(e=>!e.closest('.artFrame')).map(e=>({tag:e.tagName,cls:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(e=>e.right>innerWidth+1||e.left< -1)}}));
    await page.locator('.mobileArt img').first().evaluate(im=>im.complete?Promise.resolve():new Promise((resolve,reject)=>{im.addEventListener('load',resolve,{once:true});im.addEventListener('error',()=>reject(new Error('Illustration load failed')),{once:true})}));assert.ok(await page.locator('.mobileArt img').evaluateAll(ims=>ims.every(im=>im.complete&&im.naturalWidth>0)));assert.equal(panels.length,b.pages[i].mobilePanels.length);assert.ok(panels.every(p=>p.width/p.height<=1.40001&&!p.overflow&&p.width<=width&&p.imgWidth>=p.width),JSON.stringify({book:b.id,page:i+1,width,height,panels}));
    for(const end of [false,true]){
     await page.evaluate(end=>scrollTo(0,end?document.documentElement.scrollHeight:0),end);
     const rect=await page.locator('.pageControls').evaluate(el=>{const r=el.getBoundingClientRect();return {bottom:r.bottom,top:r.top,position:getComputedStyle(el).position}});
     assert.equal(rect.position,'fixed');assert.ok(Math.abs(rect.bottom-height)<2&&rect.top>=0);
    }
    await page.locator('[data-action="original-art"]').click();assert.equal(await page.locator('.sheetText').textContent(),b.source.spreads.find(s=>s.index===b.pages[i].sourceSpreadIndex).text);await page.getByRole('button',{name:'关闭',exact:true}).click();assert.equal(await page.locator('.readEnglish').textContent(),b.pages[i].en);
    if(width===390&&[0,5,10,b.pages.length-1].includes(i))await page.screenshot({path:`layout-proof/${b.id}-${i+1}.png`,fullPage:true});
    await page.locator('[data-action="next"]').click();
   }
   assert.ok(await page.locator('.endTitle').isVisible());
  }
  await page.close();
 }
 console.log('PASS all 37 candidate pages at 4 viewport sizes: panel ratios, no horizontal overflow, fixed next/previous controls and original-spread return');
}finally{await browser.close()}
