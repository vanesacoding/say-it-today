import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const proof=process.env.LEARNING_PROOF||'layout-proof/learning';mkdirSync(proof,{recursive:true});
const remote=process.env.LEARNING_URL;
const server=remote?null:spawn(process.env.PYTHON||'python',['-u','scripts/serve-private.py','--port','0','--directory','dist']);
let local='';if(server){const [chunk]=await once(server.stdout,'data');local=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+\//)[0];}
const browser=await chromium.launch({...(process.env.GK_CHROMIUM?{executablePath:process.env.GK_CHROMIUM}:{}),headless:true});
const results=[],errors=[];
try{
 for(const [width,height]of [[320,568],[390,844],[430,932],[1024,768]]){
  console.log('Learning viewport',width,height);
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,serviceWorkers:'block'});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__learningAudio=[];const Original=window.Audio;window.Audio=function(...args){const a=new Original(...args);window.__learningAudio.push(a);return a;};window.Audio.prototype=Original.prototype;});
  await page.goto(remote||local);await page.locator('[data-content-type="flashcards"]').first().click();
  assert.equal(await page.locator('.flashGroups button').count(),16);await page.locator('[data-group="animals"]').click();
  const count=await page.evaluate(()=>window.JIGU_FLASHCARDS.cards.filter(c=>c.category==='animals').length);assert(count>5);
  await page.locator('[data-mode="browse"]').click();await page.locator('.flashFlip img').evaluate(im=>im.decode());
  const art=await page.locator('.flashFlip .flashArt').evaluate(e=>({width:e.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.ok(Math.abs(art.width-Math.min(width,620))<3,JSON.stringify(art));assert.ok(!art.overflow);
  await page.locator('[data-action="flash-flip"]').first().click();await page.locator('[data-action="flash-audio"]').click();
  await page.waitForFunction(()=>window.__learningAudio.at(-1)?.currentTime>.08);
  if(width===390)await page.screenshot({path:proof+'/flashcard-large.png',fullPage:true});
  for(let i=0;i<6;i++){if(!await page.locator('[data-action="flash-mark"][data-known="yes"]').count())await page.locator('[data-action="flash-flip"]').first().click();await page.locator('[data-action="flash-mark"][data-known="yes"]').click();}
  assert.match(await page.locator('.flashHeader small').textContent(),new RegExp('7 / '+count));
  await page.locator('[data-action="flash-exit"]').first().click();await page.locator('[data-mode="auto"]').click();
  await page.waitForFunction(()=>document.querySelector('.flashHeader small')?.textContent.trim().startsWith('2 /'),null,{timeout:12000});
  await page.locator('[data-action="flash-auto-toggle"]').click();const paused=await page.locator('.flashHeader small').textContent();await page.waitForTimeout(2800);assert.equal(await page.locator('.flashHeader small').textContent(),paused);
  await page.locator('[data-flash-speed]').selectOption('1500');await page.locator('[data-action="flash-sound"]').click();await page.locator('[data-action="flash-loop"]').click();
  if(width===390)await page.screenshot({path:proof+'/autoflash-controls.png',fullPage:true});
  await page.locator('[data-action="flash-auto-toggle"]').click();await page.waitForFunction(previous=>document.querySelector('.flashHeader small').textContent!==previous,paused);
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.match(await page.locator('[data-action="flash-auto-toggle"]').textContent(),/继续/);
  await page.locator('[data-action="flash-exit"]').first().click();await page.locator('[data-content-type="books"]').click();assert.equal(await page.locator('[data-book]').count(),70);
  await page.locator('[data-filter-series="oxford-phonics"]').click();assert.equal(await page.locator('.phonicsBook').count(),66);
  await page.locator('[data-phonics-search]').fill('Cat');assert.ok(await page.locator('.phonicsBook').count()>0);await page.locator('[data-phonics-search]').fill('');
  await page.locator('[data-action="phonics-level"][data-level="6"]').click();assert.equal(await page.locator('.phonicsBook').count(),6);
  await page.locator('[data-action="phonics-level"][data-level="1"]').click();assert.equal(await page.locator('.phonicsBook').count(),12);
  if(width===390)await page.screenshot({path:proof+'/phonics-library.png'});
  await page.locator('[data-id="oxford-phonics-1-01"]').click();await page.locator('.phonicsArt img').evaluate(im=>im.decode());
  const geometry=await page.locator('.phonicsArt img').evaluate(im=>{const r=im.getBoundingClientRect(),dock=document.querySelector('.phonicsDock').getBoundingClientRect();return {width:r.width,height:r.height,ratio:im.naturalWidth/im.naturalHeight,overflow:document.documentElement.scrollWidth>innerWidth,dockBottom:dock.bottom};});
  assert.ok(Math.abs(geometry.width-Math.min(width,820))<2);assert.ok(Math.abs(geometry.width/geometry.height-geometry.ratio)<.02);assert.ok(!geometry.overflow);assert.ok(Math.abs(geometry.dockBottom-height)<2);
  await page.locator('[data-action="phonics-audio"]').click();await page.waitForFunction(()=>window.__learningAudio.at(-1)?.currentTime>.1);
  await page.locator('[data-phonics-seek]').evaluate(e=>{e.value='10';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForFunction(()=>window.__learningAudio.at(-1)?.currentTime>10);
  await page.locator('[data-action="phonics-audio"]').click();await page.locator('[data-action="phonics-next"]').click();assert.match(await page.locator('.phonicsHeader small').textContent(),/2 \/ 10/);
  await page.locator('[data-action="phonics-pages"]').click();await page.locator('[data-action="phonics-page"][data-page="3"]').click();assert.match(await page.locator('.phonicsHeader small').textContent(),/4 \/ 10/);
  await page.locator('.phonicsArt img').evaluate(im=>im.decode());if(width===390)await page.screenshot({path:proof+'/phonics-reader.png',fullPage:true});
  await page.locator('[data-action="phonics-exit"]').click();await page.reload();await page.locator('[data-go="shelf"]').first().click();await page.locator('[data-filter-series="oxford-phonics"]').click();await page.locator('.phonicsLibrary .phonicsContinue').click();assert.match(await page.locator('.phonicsHeader small').textContent(),/4 \/ 10/);
  results.push({viewport:[width,height],flashcard:art,phonics:geometry});await page.close();
 }
 assert.deepEqual(errors,[]);writeFileSync(proof+'/validation.json',JSON.stringify(results,null,2));
 console.log('PASS four viewports: large flashcards, >5 continuous cards, real MP3 playback, autoplay speed/pause/background, 66-book filters, full-width reading, real audio seeking, page picker and reload persistence');
}finally{await browser.close();server?.kill();}
