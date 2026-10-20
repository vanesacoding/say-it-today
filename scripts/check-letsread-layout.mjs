// Full source illustrations, exact English and fixed controls across supported screen sizes.
import {chromium} from 'playwright';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const additions=JSON.parse(readFileSync('scripts/library-release-books-letsread.json'));
const inject=readFileSync('public/books/catalog.js','utf8')+'\n'+JSON.stringify(additions)+'.forEach(b=>{if(!window.JIGU_BOOKS.some(o=>o.id===b.id))window.JIGU_BOOKS.push(b)});';
const browser=await chromium.launch();mkdirSync('layout-proof',{recursive:true});let frames=0;const fitResults=[];
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height}});await page.route('**/books/catalog.js',r=>r.fulfill({body:inject,contentType:'text/javascript'}));await page.goto('http://127.0.0.1:4173/');
  for(const b of additions){
   await page.locator('[data-go="shelf"]').first().click();
   const cover=page.locator(`[data-book="${b.id}"] .shelfCover`);await cover.scrollIntoViewIfNeeded();
   await cover.locator('img').evaluate(im=>im.complete&&im.naturalWidth?Promise.resolve():new Promise((resolve,reject)=>{im.addEventListener('load',resolve,{once:true});im.addEventListener('error',reject,{once:true})}));
   const geometry=await cover.evaluate(el=>{const im=el.querySelector('img'),r=el.getBoundingClientRect(),ir=im.getBoundingClientRect();return {width:r.width,height:r.height,imageWidth:ir.width,imageHeight:ir.height,naturalWidth:im.naturalWidth,naturalHeight:im.naturalHeight,declaredWidth:im.width,declaredHeight:im.height}});
   assert.ok(Math.abs(geometry.width-geometry.imageWidth)<1&&Math.abs(geometry.height-geometry.imageHeight)<1,'cover frame must follow the complete source image');
   assert.ok(Math.abs(geometry.width/geometry.height-geometry.naturalWidth/geometry.naturalHeight)<0.002,JSON.stringify({book:b.id,viewport:width,geometry}));
   if(width===390&&b.id==='lr-seven-days'){await cover.scrollIntoViewIfNeeded();await page.screenshot({path:'layout-proof/portrait-covers-390.png'});}
   await page.locator(`[data-book="${b.id}"]`).click();assert.ok((await page.locator('main').textContent()).includes(b.narration.accentLabel));
   await page.locator('[data-action="credits"]').click();assert.equal(await page.locator('.creditRights').getAttribute('open'),null);assert.ok((await page.locator('.creditMeta').textContent()).includes(b.pages.length+'页'));assert.ok((await page.locator('.creditFacts').textContent()).includes(b.narration.accentLabel));
   if(width===390&&b.id==='lr-our-family')await page.screenshot({path:'layout-proof/jigu-book-info-390.png'});
   await page.getByRole('button',{name:'关闭',exact:true}).click();await page.locator('[data-go="reader"]').click();
   for(let i=0;i<b.pages.length;i++){
    if(await page.locator('[data-action="companion"]').getAttribute('aria-checked')!=='true')await page.locator('[data-action="companion"]').click();
    await page.locator('.artFrame img').evaluate(im=>im.complete?Promise.resolve():new Promise((resolve,reject)=>{im.addEventListener('load',resolve,{once:true});im.addEventListener('error',()=>reject(new Error('Source illustration load failed')),{once:true})}));
    const art=await page.locator('.artFrame').evaluate(el=>{const r=el.getBoundingClientRect(),im=el.querySelector('img');return {width:r.width,height:r.height,naturalWidth:im.naturalWidth,naturalHeight:im.naturalHeight,fit:getComputedStyle(im).objectFit,overflow:document.documentElement.scrollWidth>innerWidth}});
    assert.ok(art.naturalWidth>0&&art.fit==='contain'&&art.naturalWidth/art.naturalHeight<=1.42001&&!art.overflow&&art.width<=width,JSON.stringify({book:b.id,page:i+1,width,art}));
    const line=page.locator('.readEnglish');assert.equal(await line.count()?await line.textContent():'',b.pages[i].en);
    const fit=await page.locator('main').evaluate(el=>{const bottom=el.querySelector('.pageControls').getBoundingClientRect().top;return {fits:[...el.querySelectorAll('.textPanel,.companionPanel,.readerTools')].every(e=>e.getBoundingClientRect().bottom<=bottom+1),artHeight:el.querySelector('#artFrame').getBoundingClientRect().height,font:parseFloat(getComputedStyle(el.querySelector('.readEnglish')||el.querySelector('.wordlessHint')).fontSize)}});
    fitResults.push({book:b.id,page:i+1,width,...fit});assert.ok(fit.artHeight>=149&&fit.font>=12);
    if(width===390&&b.id==='lr-our-family'&&i===0){await page.locator('[data-action="page-art"]').click();assert.ok(await page.getByRole('dialog',{name:'完整插画'}).isVisible());await page.getByRole('button',{name:'关闭',exact:true}).click();assert.equal(await page.locator('.readerHeader .heading').textContent(),'Our Family 1/9');}

    for(const end of [false,true]){
     await page.evaluate(end=>scrollTo(0,end?document.documentElement.scrollHeight:0),end);
     const c=await page.locator('.pageControls').evaluate(el=>{const r=el.getBoundingClientRect();return {bottom:r.bottom,top:r.top,position:getComputedStyle(el).position}});assert.equal(c.position,'fixed');assert.ok(Math.abs(c.bottom-height)<2&&c.top>=0);
    }
    if(width===390&&i===0)await page.screenshot({path:`layout-proof/${b.id}-first.png`,fullPage:true});
    if(width===390&&b.id==='lr-shy-noy'&&i===7)await page.screenshot({path:'layout-proof/lr-shy-noy-full-scene.png',fullPage:true});
    await page.locator('[data-action="next"]').click();assert.equal(await page.evaluate(()=>scrollY),0,'new page starts at the top');frames++;
   }
   assert.ok(await page.locator('.endTitle').isVisible());
   assert.ok((await page.locator('.endGraphic img').getAttribute('src')).includes('jigu-icon'));
   const rows=await page.locator('.wordCard b').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent,nowrap:getComputedStyle(el).whiteSpace,width:r.width,scroll:el.scrollWidth,height:r.height,line:parseFloat(getComputedStyle(el).lineHeight)}}));
   assert.ok(rows.every(r=>r.nowrap==='nowrap'&&r.scroll<=r.width+1&&r.height<=r.line+1),JSON.stringify({book:b.id,width,rows}));
   if(width===390&&b.id==='lr-our-family')await page.screenshot({path:'layout-proof/jigu-completion-390.png',fullPage:true});
  }
  await page.locator('[data-go="shelf"]').last().click();
  const longest=await page.evaluate(()=>[...window.JIGU_BOOKS.flatMap(b=>b.keywords.map(w=>w.word))].sort((a,b)=>b.length-a.length).slice(0,3));
  // Use the production row markup already reached above; replace only the displayed test text.
  await page.locator('[data-book="lr-our-family"]').click();await page.locator('[data-action="again"]').click();
  for(let i=0;i<9;i++)await page.locator('[data-action="next"]').click();
  await page.locator('.wordCard b').evaluateAll((els,words)=>els.forEach((el,i)=>el.textContent=words[i]),longest);
  const longRows=await page.locator('.wordCard b').evaluateAll(els=>els.map(el=>({text:el.textContent,width:el.getBoundingClientRect().width,scroll:el.scrollWidth,nowrap:getComputedStyle(el).whiteSpace})));
  assert.ok(longRows.every(r=>r.nowrap==='nowrap'&&r.scroll<=r.width+1),JSON.stringify({width,longRows}));
  await page.close();
 }
 for(const width of [320,390,430,1024]){const rows=fitResults.filter(r=>r.width===width),fits=rows.filter(r=>r.fits).length;console.log(`COMPANION FIT ${width}: ${fits}/${rows.length}`);if(width===390||width===430)assert.ok(fits/rows.length>=0.9,JSON.stringify(rows.filter(r=>!r.fits)));}
 assert.equal(frames,420);console.log('PASS Let’s Read browser layout: all 105 pages × 4 viewports, complete uncropped art, exact English, no horizontal overflow and fixed page controls');
}finally{await browser.close()}
