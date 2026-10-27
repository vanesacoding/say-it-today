import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
const remote=process.env.GK_URL;
const server=remote?null:spawn('python3',['-u','-m','http.server','4173','--directory','dist']);
if(server)await once(server.stdout,'data');
const browser=await chromium.launch({...(process.env.GK_CHROMIUM?{executablePath:process.env.GK_CHROMIUM}:{}),args:process.env.GK_CHROMIUM?['--no-zygote','--single-process','--disable-dev-shm-usage']:[]});
try{
const p=await browser.newPage({serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
for(const [width,height] of [[320,568],[390,844],[430,932],[1024,768]]){
await p.setViewportSize({width,height});await p.goto(remote||'http://127.0.0.1:4173/');await p.evaluate(()=>localStorage.clear());await p.reload();
await p.locator('[data-go="shelf"]').first().click();assert.equal(await p.locator('[data-book]').count(),70);
await p.locator('[data-book="heinemann-gk-01"]').click();assert.equal(await p.locator('.readingGuide summary').count(),4);
await p.locator('.bookEntry .primary').click();await p.locator('#artFrame img').evaluate(im=>im.decode());
await p.locator('[data-action="whole-audio"]').click();await p.waitForFunction(()=>Number(document.querySelector('[data-whole-seek]').value)>.1);
await p.locator('[data-action="whole-audio"]').click();
for(let i=0;i<8;i++)await p.locator('[data-action="next"]').click();
await p.locator('[data-action="sing-start"]').click();await p.waitForFunction(()=>Number(document.querySelector('[data-song-seek]').value)>.1);
await p.locator('[data-song-seek]').evaluate(e=>{e.value='20';e.dispatchEvent(new Event('input',{bubbles:true}));});
await p.waitForFunction(()=>document.querySelector('.singLyrics>p').textContent.includes('milk')&&Number(document.querySelector('[data-song-seek]').value)>20.2);
await p.locator('.singArtwork img').evaluate(im=>im.decode());
assert.ok(await p.locator('.singScreen').evaluate(e=>{const r=e.getBoundingClientRect();return r.width===innerWidth&&r.height===innerHeight&&document.documentElement.scrollWidth<=innerWidth}));
await p.locator('[data-action="sing-toggle"]').click();await p.locator('[data-song-seek]').evaluate(e=>{e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));});
await p.waitForFunction(()=>document.querySelector('.singLyrics').textContent.includes('歌词开始时会自动翻页'));
await p.getByRole('button',{name:'退出唱读',exact:true}).click();assert.ok(await p.locator('.endTitle').isVisible());
}
assert.deepEqual(errors,[]);console.log('PASS four viewports: 70 books, guides, MP3 playback, fullscreen singing and seek/page synchronization');
}finally{await browser.close();server?.kill();}
