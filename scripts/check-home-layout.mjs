import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch();mkdirSync('layout-proof',{recursive:true});
async function loaded(p){await p.locator('.entryImage img').evaluate(async im=>{im.loading='eager';if(!im.complete)await new Promise((ok,no)=>{im.addEventListener('load',ok,{once:true});im.addEventListener('error',no,{once:true})});await im.decode();})}
async function square(p){const box=await p.locator('.homePage .entryImage').evaluate(el=>{const r=el.getBoundingClientRect(),im=el.querySelector('img');return {w:r.width,h:r.height,iw:im.clientWidth,ih:im.clientHeight,fit:getComputedStyle(im).objectFit,overflow:document.documentElement.scrollWidth>innerWidth}});assert.ok(Math.abs(box.w-box.h)<1&&Math.abs(box.iw-box.ih)<1);assert.equal(box.fit,'cover');assert.ok(!box.overflow)}
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[1024,768]]){
  const p=await browser.newPage({viewport:{width,height}});await p.goto('http://127.0.0.1:4173/');assert.equal(await p.locator('.homePage .homeTitle').textContent(),'推荐读');assert.ok(await p.locator('[data-action="profile-save"]').isDisabled());
  const setup=await p.locator('.babySetup').evaluate(e=>({overflow:document.documentElement.scrollWidth>innerWidth,fonts:[...e.querySelectorAll('legend')].map(x=>parseFloat(getComputedStyle(x).fontSize)),touch:[...e.querySelectorAll('button')].map(x=>x.getBoundingClientRect().height)}));assert.ok(!setup.overflow&&setup.fonts.every(f=>f<=13)&&setup.touch.every(h=>h>=44));if(width===390)await p.screenshot({path:'layout-proof/first-visit-preferences-390.png'});
  await p.locator('[data-profile-age="3-4"]').click();await p.locator('[data-profile-stage="S2"]').click();await p.locator('[data-action="profile-save"]').click();assert.equal(await p.locator('.babySetup').count(),0);assert.equal(await p.locator('.homePage .homeTitle').textContent(),'推荐读');assert.match(await p.locator('.profileSummary').textContent(),/3–4岁.*短句共读/);await loaded(p);await square(p);if(width===390)await p.screenshot({path:'layout-proof/recommended-square-home-390.png',fullPage:true});
  await p.reload();assert.equal(await p.locator('.babySetup').count(),0);assert.equal(await p.locator('.homePage .homeTitle').textContent(),'推荐读');await p.locator('[data-go="reader"]').click();await p.locator('[data-action="next"]').click();await p.locator('.readerHeader [data-go="shelf"]').click();await p.locator('.bottomNav [data-go="home"]').click();assert.equal(await p.locator('.homePage .homeTitle').textContent(),'接着读');
  await p.locator('.bottomNav [data-go="mine"]').click();await p.locator('.babyProfileEntry').click();assert.ok(await p.locator('.babySetup').isVisible());await p.locator('[data-action="profile-cancel"]').click();assert.equal(await p.locator('.homePage .homeTitle').textContent(),'接着读');await p.close();
  for(const id of ['0087','lr-our-family','sw-pufferfish']){
   const c=await browser.newContext({viewport:{width,height}});await c.addInitScript(id=>localStorage.setItem('jigu-reading-library-v2',JSON.stringify({selectedId:id,records:{[id]:{opened:true,page:1,lastReadAt:10}}})),id);const page=await c.newPage();await page.goto('http://127.0.0.1:4173/');await loaded(page);await square(page);assert.equal(await page.locator('.homePage .homeTitle').textContent(),'接着读');assert.equal(await page.locator('.babySetup').count(),0);if(width===390)await page.screenshot({path:`layout-proof/square-home-${id}-390.png`});await c.close();
  }
 }
 console.log('PASS onboarding and home: four viewports, real recommendation/resume, persisted preferences, editable profile and square portrait/landscape/original covers');
}finally{await browser.close()}
