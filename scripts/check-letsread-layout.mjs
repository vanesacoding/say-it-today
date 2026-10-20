// Full source illustrations, exact English and fixed controls across supported screen sizes.
import {chromium} from 'playwright';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const additions=JSON.parse(readFileSync('scripts/library-release-books-letsread.json'));
const inject=readFileSync('public/books/catalog.js','utf8')+'\n'+JSON.stringify(additions)+'.forEach(b=>{if(!window.JIGU_BOOKS.some(o=>o.id===b.id))window.JIGU_BOOKS.push(b)});';
const browser=await chromium.launch();mkdirSync('layout-proof',{recursive:true});let frames=0;
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height}});await page.route('**/books/catalog.js',r=>r.fulfill({body:inject,contentType:'text/javascript'}));await page.goto('http://127.0.0.1:4173/');
  for(const b of additions){
   await page.locator('[data-go="shelf"]').first().click();
   const cover=page.locator(`[data-book="${b.id}"] .shelfCover`);
   await cover.locator('img').evaluate(im=>im.complete?Promise.resolve():new Promise((resolve,reject)=>{im.addEventListener('load',resolve,{once:true});im.addEventListener('error',reject,{once:true})}));
   const geometry=await cover.evaluate(el=>{const im=el.querySelector('img'),r=el.getBoundingClientRect(),ir=im.getBoundingClientRect();return {width:r.width,height:r.height,imageWidth:ir.width,imageHeight:ir.height,naturalWidth:im.naturalWidth,naturalHeight:im.naturalHeight,declaredWidth:im.width,declaredHeight:im.height}});
   assert.ok(Math.abs(geometry.width-geometry.imageWidth)<1&&Math.abs(geometry.height-geometry.imageHeight)<1,'cover frame must follow the complete source image');
   assert.ok(Math.abs(geometry.width/geometry.height-geometry.naturalWidth/geometry.naturalHeight)<0.002,'no side gutters, stretching or crop');
   if(width===390&&b.id==='lr-seven-days'){await cover.scrollIntoViewIfNeeded();await page.screenshot({path:'layout-proof/portrait-covers-390.png'});}
   await page.locator(`[data-book="${b.id}"]`).click();assert.ok((await page.locator('main').textContent()).includes(b.narration.accentLabel));await page.locator('[data-go="reader"]').click();
   for(let i=0;i<b.pages.length;i++){
    await page.locator('.artFrame img').evaluate(im=>im.complete?Promise.resolve():new Promise((resolve,reject)=>{im.addEventListener('load',resolve,{once:true});im.addEventListener('error',()=>reject(new Error('Source illustration load failed')),{once:true})}));
    const art=await page.locator('.artFrame').evaluate(el=>{const r=el.getBoundingClientRect(),im=el.querySelector('img');return {width:r.width,height:r.height,naturalWidth:im.naturalWidth,fit:getComputedStyle(im).objectFit,overflow:document.documentElement.scrollWidth>innerWidth}});
    assert.ok(art.naturalWidth>0&&art.fit==='contain'&&art.width/art.height<=1.42001&&!art.overflow&&art.width<=width,JSON.stringify({book:b.id,page:i+1,width,art}));
    const line=page.locator('.readEnglish');assert.equal(await line.count()?await line.textContent():'',b.pages[i].en);
    for(const end of [false,true]){
     await page.evaluate(end=>scrollTo(0,end?document.documentElement.scrollHeight:0),end);
     const c=await page.locator('.pageControls').evaluate(el=>{const r=el.getBoundingClientRect();return {bottom:r.bottom,top:r.top,position:getComputedStyle(el).position}});assert.equal(c.position,'fixed');assert.ok(Math.abs(c.bottom-height)<2&&c.top>=0);
    }
    if(width===390&&i===0)await page.screenshot({path:`layout-proof/${b.id}-first.png`,fullPage:true});
    if(width===390&&b.id==='lr-shy-noy'&&i===7)await page.screenshot({path:'layout-proof/lr-shy-noy-full-scene.png',fullPage:true});
    await page.locator('[data-action="next"]').click();frames++;
   }
   assert.ok(await page.locator('.endTitle').isVisible());
  }
  await page.close();
 }
 assert.equal(frames,420);console.log('PASS Let’s Read browser layout: all 105 pages × 4 viewports, complete uncropped art, exact English, no horizontal overflow and fixed page controls');
}finally{await browser.close()}
