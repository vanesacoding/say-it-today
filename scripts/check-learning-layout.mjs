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
  await page.addInitScript(()=>{Math.random=()=>.999999;window.__learningAudio=[];const Original=window.Audio;window.Audio=function(...args){const a=new Original(...args);window.__learningAudio.push(a);return a;};window.Audio.prototype=Original.prototype;});
  await page.goto(remote||local);await page.locator('[data-content-type="flashcards"]').first().click();
  assert.equal(await page.locator('[data-flash-level]').inputValue(),'random');assert.equal(await page.locator('[data-flash-batch]').inputValue(),'12');assert.equal(await page.locator('[data-group="random"]').getAttribute('aria-pressed'),'true');if(width===390)await page.screenshot({path:proof+'/flash-random-default.png'});await page.locator('[data-mode="auto"]').click();const total=Number(await page.locator('.flashProgress').getAttribute('max'));assert(total>0&&total<=12);assert.match(await page.locator('.flashSessionTitle').textContent(),/随机选中/);await page.locator('[data-action="flash-exit"]').first().click();assert.equal(await page.locator('.flashGroups button').count(),16);assert.ok(!await page.locator('.flashFilters').evaluate(e=>e.open));assert.equal(await page.locator('.flashMode').first().getAttribute('data-mode'),'auto');await page.locator('.flashFilters summary').click();await page.locator('[data-flash-batch]').selectOption('0');await page.locator('[data-flash-level]').selectOption('L1');await page.locator('.flashFilters summary').click();await page.locator('[data-group="animals"]').click();await page.locator('[data-tab="review"]').first().click();await page.locator('[data-collection="all"]').click();
  if(width===390)await page.screenshot({path:proof+'/review-library.png'});
  const count=await page.evaluate(()=>window.JIGU_FLASHCARDS.cards.filter(c=>c.category==='animals'&&Number(c.group)<=2).length);assert(count>5);
  await page.locator('[data-mode="browse"]').click();await page.locator('.flashFlip img').evaluate(im=>im.decode());
  const art=await page.locator('.flashFlip .flashArt').evaluate(e=>({width:e.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.ok(Math.abs(art.width-Math.min(width,620))<3,JSON.stringify(art));assert.ok(!art.overflow);
  await page.locator('[data-action="flash-flip"]').first().click();await page.locator('[data-action="flash-audio"]').click();
  await page.waitForFunction(()=>window.__learningAudio.at(-1)?.currentTime>.08);
  if(width===390)await page.screenshot({path:proof+'/flashcard-large.png',fullPage:true});
  for(let i=0;i<6;i++){if(!await page.locator('[data-action="flash-mark"][data-known="yes"]').count())await page.locator('[data-action="flash-flip"]').first().click();await page.locator('[data-action="flash-mark"][data-known="yes"]').click();}
  assert.match(await page.locator('.flashHeader small').textContent(),new RegExp('7 / '+count));
  await page.locator('[data-action="flash-exit"]').first().click();await page.locator('[data-tab="learn"]').click();if(width===390)await page.screenshot({path:proof+'/learn-library.png'});await page.locator('[data-mode="auto"]').click();
  await page.waitForFunction(()=>document.querySelector('.flashHeader small')?.textContent.trim().startsWith('2 /'),null,{timeout:12000});
  await page.locator('[data-action="flash-auto-toggle"]').click();const paused=await page.locator('.flashHeader small').textContent();await page.waitForTimeout(2800);assert.equal(await page.locator('.flashHeader small').textContent(),paused);
  await page.locator('[data-flash-speed]').selectOption('1500');await page.locator('[data-action="flash-sound"]').click();await page.locator('[data-action="flash-loop"]').click();
  if(width===390)await page.screenshot({path:proof+'/autoflash-controls.png',fullPage:true});
  await page.locator('[data-action="flash-auto-toggle"]').click();await page.waitForFunction(previous=>document.querySelector('.flashHeader small').textContent!==previous,paused);
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.match(await page.locator('[data-action="flash-auto-toggle"]').textContent(),/继续/);
  await page.locator('[data-action="flash-exit"]').first().click();await page.locator('[data-content-type="books"]').click();assert.equal(await page.locator('[data-book]').count(),70);assert.equal(await page.locator('[data-filter-series]').count(),0);assert.equal(await page.locator('.phonicsLibrary').count(),0);assert.ok(!await page.locator('[data-shelf-filters]').evaluate(e=>e.open));
  assert.ok(!(await page.locator('main').textContent()).includes('海尼曼'));assert.ok(!(await page.locator('main').textContent()).includes('牛津树'));
  assert.equal(await page.locator('[data-filter-song]').count(),0);assert.equal(await page.locator('.shelfCard').count(),70);
  await page.locator('[data-shelf-filters] summary').click();await page.locator('[data-filter-theme="nature"]').click();const natureCount=await page.evaluate(()=>window.JIGU_BOOKS.filter(b=>b.themeIds?.includes('nature')).length);assert(natureCount>0);assert.equal(await page.locator('.shelfCard').count(),natureCount);await page.locator('[data-filter-theme="all"]').click();assert.equal(await page.locator('.shelfCard').count(),70);
  await page.locator('[data-action="stage-picker"]').click();await page.locator('[data-stage-option][value="S2"]').click();assert.equal(await page.locator('.shelfCard').count(),15);await page.locator('[data-action="stage-picker"]').click();await page.locator('[data-stage-option][value="all"]').click();
  for(const id of ['23','35','43','45','48','50','53','55']){const im=page.locator(`[data-book="heinemann-gk-${id}"] img`);assert.match(await im.getAttribute('src'),/books\/covers\//);await im.evaluate(async el=>{el.loading='eager';await el.decode()});assert.ok(await im.evaluate(el=>el.naturalWidth/el.naturalHeight<1));}
  if(width===390)await page.screenshot({path:proof+'/book-filters.png'});
  await page.locator('[data-book-search]').fill('Getting Ready');assert.equal(await page.locator('.shelfCard').count(),1);if(width===390)await page.screenshot({path:proof+'/getting-ready-cover.png'});
  await page.locator('[data-book="heinemann-gk-50"]').click();await page.locator('.entryImage img').evaluate(im=>im.decode());await page.locator('.bookEntry .primary').click();await page.locator('[data-go="shelf"]').click();await page.locator('[data-go="home"]').first().click();
  assert.ok(await page.evaluate(()=>!!(document.querySelector('.recommendationFeed').compareDocumentPosition(document.querySelector('.continueTitle'))&Node.DOCUMENT_POSITION_FOLLOWING)));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(width===390)await page.screenshot({path:proof+'/home-recommendations-first.png',fullPage:true});
  results.push({viewport:[width,height],flashcard:art,books:70});await page.close();
 }
 assert.deepEqual(errors,[]);writeFileSync(proof+'/validation.json',JSON.stringify(results,null,2));
 console.log('PASS four viewports: random 12-card default, L1 and full-group controls, large flashcards, real MP3 playback, autoplay pause/background, unified book filters, corrected covers and recommendation order');
}finally{await browser.close();server?.kill();}
