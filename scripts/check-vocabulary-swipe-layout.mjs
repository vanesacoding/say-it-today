import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true});
  await page.addInitScript(()=>localStorage.setItem('jigu-reading-library-v2',JSON.stringify({records:{'0087':{opened:true,finished:true,page:7,lastReadAt:1}}})));
  await page.goto('http://127.0.0.1:4173/');await page.locator('[data-go="mine"]').click();await page.locator('[data-go="vocabulary"]').click();
  const keys=await page.locator('.vocabularyRow').evaluateAll(els=>els.map(el=>el.dataset.key));assert.ok(keys.length>=3);await page.locator('.vocabularyRow').first().click();
  const current=()=>page.locator('[data-action="vocabulary-source"]').getAttribute('data-key');
  const session=await page.context().newCDPSession(page);
  async function swipe(dx,dy=0){
   const art=page.locator('.sheetVocabulary .wordArt');await art.scrollIntoViewIfNeeded();const box=await art.boundingBox();assert.ok(box);
   const x=box.x+box.width*(dx<0?0.75:0.25),y=Math.max(10,box.y+Math.min(box.height/2,50));
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=5;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/5,y:y+dy*i/5}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  assert.equal(await current(),keys[0]);assert.ok(await page.getByRole('button',{name:'上一个单词',exact:true}).isDisabled());
  await swipe(-100);assert.equal(await current(),keys[1]);assert.equal(await page.locator('.wordBrowseNav [role="status"]').textContent(),'2 / '+keys.length);
  await swipe(100);assert.equal(await current(),keys[0]);await swipe(100);assert.equal(await current(),keys[0]);
  await swipe(-10,55);assert.equal(await current(),keys[0],'native vertical drag must not switch words');
  await page.getByRole('button',{name:'下一个单词',exact:true}).click();assert.equal(await current(),keys[1]);
  await page.locator('[data-action="vocabulary-source"]').click();await page.locator('[data-action="reader-back"]').click();assert.equal(await current(),keys[1]);
  await swipe(-100);assert.equal(await current(),keys[2]);
  while(!(await page.getByRole('button',{name:'下一个单词',exact:true}).isDisabled()))await page.getByRole('button',{name:'下一个单词',exact:true}).click();
  assert.equal(await current(),keys.at(-1));await swipe(-100);assert.equal(await current(),keys.at(-1));
  assert.ok(await page.locator('.sheetVocabulary').evaluate(el=>el.scrollWidth<=el.clientWidth));
  await session.detach();await page.close();
 }
 console.log('PASS vocabulary touch browsing: native left/right gestures at four sizes, vertical-scroll isolation, buttons, boundaries and return from source');
}finally{await browser.close()}
