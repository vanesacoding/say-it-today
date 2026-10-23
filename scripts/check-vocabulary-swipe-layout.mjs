import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
mkdirSync('layout-proof',{recursive:true});
const browser=await chromium.launch();
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true});
  await page.addInitScript(()=>localStorage.setItem('jigu-reading-library-v2',JSON.stringify({selectedId:'lr-our-family',records:{'lr-our-family':{opened:true,finished:true,page:8,lastReadAt:1},'0087':{opened:true,finished:false,page:7,lastReadAt:2}}})));
  await page.goto('http://127.0.0.1:4173/');
  async function loaded(locator){await locator.evaluate(async im=>{if(!im.complete)await new Promise((resolve,reject)=>{im.addEventListener('load',resolve,{once:true});im.addEventListener('error',reject,{once:true})});if(!im.naturalWidth)throw new Error('Image unavailable');await im.decode();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))});if(await locator.evaluate(im=>!!im.closest('.artFrame')))await page.waitForFunction(()=>[...document.querySelectorAll('.artFrame')].every(f=>f.classList.contains('loaded')))}
  await loaded(page.locator('.entryImage img'));
  if(width===390){
   await page.screenshot({path:'layout-proof/flow-01-home.png'});await page.locator('[data-go="shelf"]').first().click();
   for(const id of ['lr-our-family','lr-shopping-time','lr-simple-counting','lr-see-clearly']){const im=page.locator(`[data-book="${id}"] img`);await im.scrollIntoViewIfNeeded();await loaded(im)}await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:'layout-proof/flow-02-shelf.png'});await page.getByLabel('选择共读阶段').click();await page.screenshot({path:'layout-proof/stage-picker-390.png'});await page.getByRole('button',{name:'关闭',exact:true}).click();
  }
  await page.locator('.bottomNav [data-go="mine"]').click();await page.locator('[data-go="vocabulary"]').click();
  const keys=await page.locator('.vocabularyRow').evaluateAll(els=>els.map(el=>el.dataset.key));assert.ok(keys.length>=3);await page.locator('.vocabularyRow').first().click();
  const current=()=>page.locator('[data-action="vocabulary-source"]').getAttribute('data-key');
  const session=await page.context().newCDPSession(page);
  async function swipe(dx,dy=0,selector='.sheetWordBrowse .wordArt'){
   const art=page.locator(selector);await art.scrollIntoViewIfNeeded();await art.evaluate(im=>im.complete&&im.naturalWidth?Promise.resolve():new Promise((resolve,reject)=>{im.addEventListener('load',resolve,{once:true});im.addEventListener('error',reject,{once:true})}));const box=await art.boundingBox();assert.ok(box);
   const x=box.x+box.width*(dx<0?0.75:0.25),y=Math.max(10,box.y+Math.min(box.height/2,50));
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=5;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/5,y:y+dy*i/5}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  assert.equal(await current(),keys[0]);assert.ok(await page.getByRole('button',{name:'上一个单词',exact:true}).isDisabled());
  await swipe(-100);assert.equal(await current(),keys[1]);if(width===390){await page.locator('.wordArt').evaluate(im=>im.complete&&im.naturalWidth?Promise.resolve():new Promise(resolve=>im.addEventListener('load',resolve,{once:true})));await page.screenshot({path:'layout-proof/flow-05-word-detail.png'});}assert.equal(await page.locator('.wordBrowseNav [role="status"]').textContent(),'2 / '+keys.length);
  await swipe(100);assert.equal(await current(),keys[0]);await swipe(100);assert.equal(await current(),keys[0]);
  await swipe(-10,55);assert.equal(await current(),keys[0],'native vertical drag must not switch words');
  await page.getByRole('button',{name:'下一个单词',exact:true}).click();assert.equal(await current(),keys[1]);
  await page.locator('[data-action="vocabulary-source"]').click();if(width===390){await page.locator('.artFrame img').evaluate(im=>im.complete&&im.naturalWidth?Promise.resolve():new Promise(resolve=>im.addEventListener('load',resolve,{once:true})));await page.screenshot({path:'layout-proof/flow-06-source-sentence.png'});}await page.locator('[data-action="reader-back"]').click();assert.equal(await current(),keys[1]);
  await swipe(-100);assert.equal(await current(),keys[2]);
  while(!(await page.getByRole('button',{name:'下一个单词',exact:true}).isDisabled()))await page.getByRole('button',{name:'下一个单词',exact:true}).click();
  assert.equal(await current(),keys.at(-1));await swipe(-100);assert.equal(await current(),keys.at(-1));
  assert.ok(await page.locator('.sheetVocabulary').evaluate(el=>el.scrollWidth<=el.clientWidth));

  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.locator('[data-go="shelf"]').first().click();await page.locator('[data-book="lr-seven-days"]').scrollIntoViewIfNeeded();const originY=await page.evaluate(()=>scrollY);

  await page.locator('[data-book="lr-seven-days"]').click();await page.locator('[data-go="reader"]').click();
  if(await page.locator('[data-action="companion"]').getAttribute('aria-checked')!=='true')await page.locator('[data-action="companion"]').click();if(width===390){await loaded(page.locator('.artFrame img'));await page.screenshot({path:'layout-proof/flow-03-reader.png'});}
  await loaded(page.locator('.artFrame img'));
  await page.locator('[data-action="companion"]').click();await loaded(page.locator('.artFrame img'));
  for(let i=0;i<3;i++){await page.locator('[data-action="next"]').click();await page.locator('[data-action="prev"]').click()}
  await loaded(page.locator('.artFrame img'));assert.ok(await page.locator('.imgLoading').isHidden(),'cached picture must not retain loading overlay after rerenders and quick page turns');
  // Swiping the text area should turn pages just like swiping the picture.
  const text=await page.locator('.textPanel').boundingBox();const x=text.x+text.width*0.7,y=text.y+text.height/2;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=5;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-100*i/5,y}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok((await page.locator('.readerHeader .heading').textContent()).includes('2/8'));
  await page.locator('[data-go="shelf"]').first().click();assert.ok(Math.abs((await page.evaluate(()=>scrollY))-originY)<2,'return to the same shelf position');
  await page.locator('[data-book="lr-seven-days"]').click();await page.locator('[data-action="words"]').click();await page.locator('.wordCard').first().click();
  const title=await page.getByRole('dialog').getAttribute('aria-label');await swipe(-100);assert.notEqual(await page.getByRole('dialog').getAttribute('aria-label'),title);await swipe(100);assert.equal(await page.getByRole('dialog').getAttribute('aria-label'),title);
  await page.getByRole('button',{name:'关闭',exact:true}).click();await page.locator('[data-go="shelf"]').first().click();await page.locator('.bottomNav [data-go="mine"]').click();await page.locator('[data-go="vocabulary"]').click();await page.locator('[data-action="browse-five"]').click();
  assert.equal(await page.locator('.wordBrowseNav [role="status"]').textContent(),'1 / 5');await swipe(-100);assert.equal(await page.locator('.wordBrowseNav [role="status"]').textContent(),'2 / 5');await swipe(100);assert.equal(await page.locator('.wordBrowseNav [role="status"]').textContent(),'1 / 5');
  if(width===390)await page.screenshot({path:'layout-proof/browse-five-390.png'});
  await page.getByRole('button',{name:'关闭',exact:true}).click();await page.locator('[data-action="review-start"]').first().click();
  const reviewProgress=()=>page.locator('.reviewPage .simpleHead .tiny').textContent();assert.equal(await reviewProgress(),'1 / 3');assert.ok(await page.locator('[data-action="review-previous"]').isDisabled());
  await swipe(-100,0,'.reviewArt img');assert.equal(await reviewProgress(),'2 / 3');await swipe(-5,70,'.reviewArt img');assert.equal(await reviewProgress(),'2 / 3');await swipe(100,0,'.reviewArt img');assert.equal(await reviewProgress(),'1 / 3');
  await page.locator('[data-action="review-reveal"]').click();await page.locator('[data-action="review-next"]').click();await page.locator('[data-action="review-next"]').click();assert.equal(await reviewProgress(),'3 / 3');assert.ok(await page.locator('[data-action="review-next"]').isDisabled());
  await page.locator('[data-action="review-reveal"]').click();await page.locator('[data-action="vocabulary-source"]').click();await page.locator('[data-action="reader-back"]').click();assert.equal(await reviewProgress(),'3 / 3');assert.ok(await page.locator('.reviewMeaning').isVisible());
  await page.locator('[data-action="review-rate"][data-remembered="true"]').click();assert.equal(await reviewProgress(),'1 / 3');assert.ok(await page.locator('.reviewMeaning').isVisible());
  if(width===390){await loaded(page.locator('.reviewArt img'));await page.screenshot({path:'layout-proof/review-three-390.png',fullPage:true});}
  await page.locator('[data-action="review-rate"][data-remembered="true"]').click();assert.equal(await reviewProgress(),'2 / 3');await page.locator('[data-action="review-reveal"]').click();await page.locator('[data-action="review-rate"][data-remembered="false"]').click();assert.ok(await page.locator('.reviewComplete').isVisible());
  await session.detach();await page.close();
 }
 console.log('PASS review-three touch browsing: 4 sizes, buttons, reveal/source return and all-card completion');
 console.log('PASS vocabulary touch browsing: native left/right gestures at four sizes, vertical-scroll isolation, buttons, boundaries and return from source');
}finally{await browser.close()}
