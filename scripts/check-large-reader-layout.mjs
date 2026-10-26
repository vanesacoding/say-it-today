import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height}});
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('[data-go="shelf"]').first().click();
  const samples=await page.evaluate(()=>{
   const groups=new Map();
   for(const b of window.JIGU_BOOKS){
    if(!document.querySelector(`[data-book="${b.id}"]`))continue;
    const p=b.pages[0],key=b.source.format+':'+(p.mobilePanels?'panels':p.imageWidth>p.imageHeight?'landscape':'portrait');
    if(!groups.has(key))groups.set(key,b.id);
   }
   return [...groups.values()];
  });
  for(const id of samples){
   await page.locator(`[data-book="${id}"]`).click();await page.locator('[data-go="reader"]').click();
   for(const companion of [false,true]){
    if((await page.locator('[data-action="companion"]').getAttribute('aria-checked')==='true')!==companion)await page.locator('[data-action="companion"]').click();
    for(const img of await page.locator('.artFrame img').all())await img.evaluate(im=>im.decode());
    await page.waitForFunction(()=>[...document.querySelectorAll('.artFrame')].every(f=>f.classList.contains('loaded')));
    const g=await page.locator('main').evaluate(main=>{
     const art=main.querySelector('#artFrame'),r=art.getBoundingClientRect(),img=art.querySelector('img'),ir=img.getBoundingClientRect();
     return {width:r.width,height:r.height,imgWidth:ir.width,imgHeight:ir.height,ratio:img.naturalWidth/img.naturalHeight,panels:art.classList.contains('mobileArt'),cap:getComputedStyle(art).maxHeight,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.ok(Math.abs(g.width-Math.min(width,820))<2,'artwork fills reading width');
    assert.equal(g.cap,'none');assert.ok(!g.overflow);
    if(!g.panels){assert.ok(Math.abs(g.imgWidth-g.width)<1);assert.ok(Math.abs(g.imgWidth/g.imgHeight-g.ratio)<.02,'no cropping or viewport-height shrinking');}
    for(const end of [false,true]){
     await page.evaluate(end=>scrollTo(0,end?document.documentElement.scrollHeight:0),end);
     const controls=await page.locator('.pageControls').evaluate(el=>{const r=el.getBoundingClientRect(),tools=document.querySelector('.readerTools').getBoundingClientRect();return {bottom:r.bottom,top:r.top,toolsBottom:tools.bottom,buttons:[...el.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height)};});
     assert.ok(Math.abs(controls.bottom-height)<2&&controls.top>=0);assert.ok(controls.buttons.every(h=>h>=44));
     if(end)assert.ok(controls.toolsBottom<=controls.top+1,'scrolling reveals the final tools above fixed navigation');
    }
   }
   await page.locator('[data-action="next"]').click();assert.equal(await page.evaluate(()=>scrollY),0);
   await page.locator('.readerHeader [data-go="shelf"]').click();assert.equal(await page.locator('.readerShell').count(),0);
  }
  await page.close();
 }
 console.log('PASS browser layout: full-width original artwork, companion scroll access, fixed navigation and next-page scroll reset across four viewports');
}finally{await browser.close();}
