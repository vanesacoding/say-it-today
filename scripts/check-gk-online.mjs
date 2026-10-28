import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
const remote=process.env.GK_URL;
const server=remote?null:spawn('python3',['-u','scripts/serve-private.py','--port','0','--directory','dist']);
let localURL='';
if(server){const [chunk]=await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw Error('Test server failed to start')})]);localURL=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+\//)[0];}
const browser=await chromium.launch({...(process.env.GK_CHROMIUM?{executablePath:process.env.GK_CHROMIUM}:{}),args:process.env.GK_CHROMIUM?['--no-zygote','--single-process','--disable-dev-shm-usage']:[]});
try{
const p=await browser.newPage({serviceWorkers:'block'});p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(15000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
for(const [width,height] of [[320,568],[390,844],[430,932],[1024,768]]){
console.log('Viewport',width);await p.setViewportSize({width,height});await p.goto(remote||localURL);await p.evaluate(()=>localStorage.clear());await p.reload();
await p.locator('[data-go="shelf"]').first().click();assert.equal(await p.locator('[data-book]').count(),70);
await p.locator('[data-book="heinemann-gk-01"]').click();assert.equal(await p.locator('.readingGuide .guideRow').count(),5);assert.equal(await p.locator('[data-action="credits"]').count(),0);
await p.locator('.bookEntry .primary').click();await p.locator('#artFrame img').evaluate(im=>im.decode());
assert.equal(await p.locator('.wholeAudio').count(),0);
const crop=await p.locator('#artFrame img').evaluate(im=>({left:im.style.left,width:im.style.width}));assert.equal(crop.left,'-100%');assert.equal(crop.width,'200%');assert.ok(await p.locator('#artFrame').evaluate(e=>{const r=e.getBoundingClientRect();return r.height>r.width*.7&&r.height<r.width*.95;}),'cropped artwork must retain a visible full-size frame');
await p.locator('[data-action="speak"]').click();await p.waitForFunction(()=>Number(document.querySelector('[data-page-seek]').value)>.1);
await p.locator('[data-action="speak"]').click();
await p.locator('[data-action="listen"]').click();await p.waitForFunction(()=>Number(document.querySelector('[data-song-seek]').value)>.1);
await p.locator('[data-song-seek]').evaluate(e=>{e.value='20';e.dispatchEvent(new Event('input',{bubbles:true}));});
await p.waitForFunction(()=>document.querySelector('.singLyrics>p').textContent.includes('milk')&&Number(document.querySelector('[data-song-seek]').value)>20.2);
await p.locator('.singArtwork img').evaluate(im=>im.decode());
assert.ok(await p.locator('.singScreen').evaluate(e=>{const r=e.getBoundingClientRect();return r.width===innerWidth&&r.height===innerHeight&&document.documentElement.scrollWidth<=innerWidth}));
await p.locator('[data-action="sing-toggle"]').click();await p.locator('[data-song-seek]').evaluate(e=>{e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));});
await p.waitForFunction(()=>document.querySelector('.singLyrics').textContent.includes('歌词开始时会自动翻页'));
if(width===320){
await p.locator('[data-action="sing-toggle"]').click();
await p.locator('[data-song-seek]').evaluate(e=>{e.value=String(Number(e.max)-.3);e.dispatchEvent(new Event('input',{bubbles:true}));});
await p.waitForFunction(()=>document.querySelector('[data-action="sing-toggle"]').textContent.includes('再唱一遍'),null,{timeout:15000});
assert.ok(await p.locator('[data-song-seek]').evaluate(e=>Math.abs(Number(e.value)-Number(e.max))<.11),'completed song progress must remain at the end');
}

await p.getByRole('button',{name:'退出唱读',exact:true}).click();assert.ok(await p.locator('.readEnglish').isVisible());assert.match(await p.locator('.readerHeader .heading').textContent(),/1\/8/);
for(let i=0;i<8;i++)await p.locator('[data-action="next"]').click();assert.ok(await p.locator('.endTitle').isVisible());
}
assert.deepEqual(errors,[]);console.log('PASS four viewports: 70 books, guides, page MP3 playback, default fullscreen singing and seek/page synchronization');
}finally{await browser.close();server?.kill();}
