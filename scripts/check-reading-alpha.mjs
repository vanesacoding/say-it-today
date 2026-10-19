import {readFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {strict as assert} from 'node:assert';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const html=readFileSync('index.html','utf8');
const catalogScript=readFileSync('public/books/catalog.js','utf8');
const context={window:{}};vm.runInNewContext(catalogScript,context);const books=context.window.JIGU_BOOKS;const activeBooks=books.filter(b=>!b.archived);
assert.equal(activeBooks.length,20);assert.equal(new Set(books.map(b=>b.id)).size,books.length);
const stages=new Set(),themes=new Set();
for(const b of books){
 stages.add(b.stageId);themes.add(b.primaryTheme);
 assert.ok(b.source.license.includes('/by/')&&!b.source.license.includes('nc'),'unrestricted attribution license for '+b.id);
 assert.ok(b.themeIds.includes(b.primaryTheme));assert.ok(b.pages.length>=5);assert.ok(b.keywords.length>=2&&b.keywords.length<=4);
 assert.ok(['S1','S2','S3'].includes(b.stageId));assert.ok(b.activity.title&&b.activity.text);
 assert.ok(['human','generated','device'].includes(b.audioType));
 if(b.audioType==='generated')assert.ok(b.narration?.kind==='ai'&&b.narration.voice);
 for(const [i,p] of b.pages.entries()){
  assert.equal(typeof p.en,'string');assert.equal(typeof p.zh,'string');assert.ok(p.tip&&p.sourceImage);
  assert.ok(!p.en||p.zh,'Chinese companion missing '+b.id+' page '+i);
  if(b.audioType!=='device'&&p.en)assert.ok(p.sourceAudio);
  if(b.audioType==='generated'&&p.en){
   assert.match(p.sourceAudioSha256,/^[a-f0-9]{64}$/);
   if(p.audioFile)assert.match(p.audioFile,/^audio\/\d{2}-[a-f0-9]{16}\.mp3$/);
   assert.equal(p.sourceAudioTextSha256,createHash('sha256').update(p.en).digest('hex'),'recording must match current text');
  }
  if(process.env.CI){
   const prefix='public/books/library/'+b.id+'/';const image=prefix+String(i+1).padStart(2,'0')+'.jpg';assert.ok(existsSync(image)&&statSync(image).size>1000,'missing image '+image);
   if(b.audioType!=='device'&&p.en){
    const audio=prefix+(p.audioFile||'audio/'+String(i+1).padStart(2,'0')+'.mp3');assert.ok(existsSync(audio)&&statSync(audio).size>600,'missing audio '+audio);
    if(p.sourceAudioSha256)assert.equal(createHash('sha256').update(readFileSync(audio)).digest('hex'),p.sourceAudioSha256);
   }
  }
 }
 for(const w of b.keywords){assert.ok(b.pages[w.pageIndex]);assert.match(b.pages[w.pageIndex].en,new RegExp('(?<![a-z])'+w.word+'(?![a-z])','i'),'keyword belongs to actual source page '+b.id)}
}
assert.equal(stages.size,3);assert.equal(themes.size,4);
console.log('PASS catalogue: 20 current attributed books, complete bilingual pages, source-linked keywords, 4 themes and 3 stages');
function makeDom(saved,legacy){
 const dom=new JSDOM(html,{url:'https://jigu.local/say-it-today/',runScripts:'outside-only'});dom.window.scrollTo=()=>{};
 if(saved)dom.window.localStorage.setItem('jigu-reading-library-v2',saved);
 if(legacy)dom.window.localStorage.setItem('jigu-vertical-book-0087-v1',legacy);
 dom.window.eval(catalogScript);dom.window.eval(readFileSync('public/books/vocabulary.js','utf8'));
 dom.window.eval([...dom.window.document.scripts].find(s=>s.textContent.includes('const books=window.JIGU_BOOKS')).textContent);
 return dom;
}
function click(d,s){const el=d.window.document.querySelector(s);assert.ok(el,'missing control '+s);el.click()}
function open(d,id){click(d,'[data-go="shelf"]');click(d,'[data-filter-theme="all"]');click(d,'[data-filter-stage="all"]');click(d,`[data-book="${id}"]`);click(d,'[data-go="reader"]')}
function heading(d){return d.window.document.querySelector('.readerHeader .heading').textContent}
const dom=makeDom();click(dom,'[data-go="shelf"]');assert.equal(dom.window.document.querySelectorAll('.shelfCard').length,20);
for(const theme of ['everyday','nature','discovery','feelings']){
 click(dom,`[data-filter-theme="${theme}"]`);
 assert.equal(dom.window.document.querySelectorAll('.shelfCard').length,activeBooks.filter(b=>b.themeIds.includes(theme)).length);
}
click(dom,'[data-filter-theme="all"]');click(dom,'[data-filter-stage="S2"]');assert.equal(dom.window.document.querySelectorAll('.shelfCard').length,activeBooks.filter(b=>b.stageId==='S2').length);
click(dom,'[data-filter-stage="all"]');
// Open, read, finish and replay every book, including 12 and 13 page titles.
for(const b of activeBooks){
 open(dom,b.id);assert.match(heading(dom),new RegExp('1/'+b.pages.length));
 if(!dom.window.document.querySelector('.companionPanel'))click(dom,'[data-action="companion"]');
 for(let i=0;i<b.pages.length;i++){
  assert.equal(dom.window.document.querySelector('.readEnglish')?.textContent||'',b.pages[i].en);
  assert.ok(dom.window.document.querySelector('.companionPanel'));
  if(b.pages[i].zh)assert.equal(dom.window.document.querySelector('.companionTranslation').textContent,b.pages[i].zh);
  assert.match(dom.window.document.querySelector('.artFrame img').src,new RegExp(b.id+'/'+String(i+1).padStart(2,'0')+'\\.jpg$'));
  click(dom,'[data-action="next"]');
 }
 assert.ok(dom.window.document.querySelector('.endTitle'));assert.equal(dom.window.document.querySelectorAll('.wordCard').length,3);
 for(const w of b.keywords){
  click(dom,`[data-word-id="${w.id}"]`);assert.equal(dom.window.document.querySelector('.wordSentence').textContent,b.pages[w.pageIndex].en);assert.equal(dom.window.document.querySelector('mark').textContent.toLowerCase(),w.word.toLowerCase());click(dom,'button[data-action="close"]');
 }
 click(dom,'[data-action="again"]');assert.match(heading(dom),new RegExp('1/'+b.pages.length));
}
console.log('PASS all 20 books: correct page counts and art, companion text, completion, linked keywords and replay');
// Independent progress and favorites survive switching and reloading.
open(dom,'0008');click(dom,'[data-action="next"]');click(dom,'[data-action="favorite"]');
open(dom,'0001');for(let i=0;i<9;i++)click(dom,'[data-action="next"]');click(dom,'[data-action="favorite"]');
open(dom,'0008');assert.match(heading(dom),/2\/8/);open(dom,'0001');assert.match(heading(dom),/10\/11/);
const persisted=dom.window.localStorage.getItem('jigu-reading-library-v2');const reload=makeDom(persisted);
click(reload,'[data-go="mine"]');assert.equal(reload.window.document.querySelectorAll('.favoriteBook').length,2);
click(reload,'[data-resume="0001"]');assert.match(heading(reload),/10\/11/);assert.ok(reload.window.document.querySelector('.companionPanel'));
click(reload,'[data-action="favorite"]');click(reload,'[data-go="shelf"]');click(reload,'[data-go="mine"]');assert.equal(reload.window.document.querySelectorAll('.favoriteBook').length,1);
const legacy=makeDom(null,JSON.stringify({page:4,saved:true,opened:true,finished:false,companionMode:true}));
click(legacy,'[data-go="reader"]');assert.match(heading(legacy),/5\/8/);assert.ok(legacy.window.document.querySelector('.heartActive'));assert.ok(legacy.window.document.querySelector('.companionPanel'));
console.log('PASS independent progress, favorites, refresh, persistent companion mode and migration from existing single-book data');
// Human and synthetic narration use the selected book, and stop at navigation boundaries.
const audioDom=makeDom();const played=[];
class Narration{constructor(){this.onended=null;this.onerror=null;this.src='';this.paused=false}play(){played.push(this);return Promise.resolve()}pause(){this.paused=true}}
audioDom.window.Audio=Narration;
open(audioDom,'0008');click(audioDom,'[data-action="speak"]');assert.equal(played.at(-1).src,'./books/library/0008/audio/01.mp3');
click(audioDom,'[data-go="shelf"]');assert.ok(played.at(-1).paused);
open(audioDom,'0001');click(audioDom,'[data-go="shelf"]');click(audioDom,'[data-book="0001"]');click(audioDom,'[data-action="words"]');click(audioDom,'[data-word-id="word-0"]');click(audioDom,'[data-action="word-audio"]');assert.equal(played.at(-1).src,'./books/library/0001/audio/05.mp3');click(audioDom,'button[data-action="close"]');assert.ok(played.at(-1).paused);
const utterances=[];let cancelled=0;
audioDom.window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
audioDom.window.speechSynthesis={getVoices:()=>[],speak:u=>utterances.push(u),cancel:()=>cancelled++};
const deviceBook=activeBooks.find(b=>b.audioType==='device');
if(deviceBook){open(audioDom,deviceBook.id);assert.match(audioDom.window.document.querySelector('.readerTools').textContent,/设备英语朗读/);click(audioDom,'[data-action="listen"]');assert.equal(utterances.at(-1).text,deviceBook.pages[0].en);utterances.at(-1).onend();assert.match(heading(audioDom),new RegExp('2/'+deviceBook.pages.length));click(audioDom,'[data-go="shelf"]');assert.ok(cancelled>0);}
const recordedPath=(b,i)=>`./books/library/${b.id}/${b.pages[i].audioFile||'audio/'+String(i+1).padStart(2,'0')+'.mp3'}`;
const generatedBooks=activeBooks.filter(b=>b.audioType==='generated');
assert.ok(generatedBooks.length,'at least one fixed AI book must exercise recorded playback');
for(const b of generatedBooks){
 open(audioDom,b.id);const speechCount=utterances.length;
 assert.match(audioDom.window.document.querySelector('.readerTools').textContent,/AI英文配音/);
 click(audioDom,'[data-action="listen"]');assert.equal(utterances.length,speechCount,'AI narration uses recorded audio');
 assert.equal(played.at(-1).src,recordedPath(b,0));
 played.at(-1).onended();assert.match(heading(audioDom),new RegExp('2/'+b.pages.length));
 const player=played.at(-1);player.onerror();assert.equal(player.src,b.pages[1].sourceAudio);
 player.onerror();assert.equal(utterances.at(-1).text,b.pages[1].en);
 assert.match(audioDom.window.document.getElementById('toast').textContent,/AI配音暂时不可用/);
 click(audioDom,'[data-go="shelf"]');click(audioDom,`[data-book="${b.id}"]`);click(audioDom,'[data-action="credits"]');
 assert.match(audioDom.window.document.querySelector('.credit').textContent,/AI合成配音/);
 assert.match(audioDom.window.document.querySelector('.credit').textContent,/不是原版真人录音/);
 click(audioDom,'button[data-action="close"]');
}
// Wordless pages stay silent during continuous playback, then advance to the next recording.
const wordlessBook=generatedBooks.find(b=>b.pages.some(p=>!p.en));
assert.ok(wordlessBook);
open(audioDom,wordlessBook.id);
const wordlessIndex=wordlessBook.pages.findIndex(p=>!p.en),timers=[];
while(!heading(audioDom).includes(`${wordlessIndex+1}/${wordlessBook.pages.length}`))click(audioDom,'[data-action="next"]');
audioDom.window.setTimeout=(fn,ms)=>{timers.push({fn,ms});return 123456};
const playedBefore=played.length,speechBefore=utterances.length;
click(audioDom,'[data-action="listen"]');
assert.equal(played.length,playedBefore);assert.equal(utterances.length,speechBefore);
const picturePause=timers.find(t=>t.ms===2200);assert.ok(picturePause);picturePause.fn();
if(wordlessIndex<wordlessBook.pages.length-1){
 assert.match(heading(audioDom),new RegExp(`${wordlessIndex+2}/${wordlessBook.pages.length}`));
 assert.equal(played.at(-1).src,recordedPath(wordlessBook,wordlessIndex+1));
}else{
 assert.match(heading(audioDom),new RegExp(`${wordlessIndex+1}/${wordlessBook.pages.length}`));
 assert.match(audioDom.window.document.getElementById('toast').textContent,/故事听完了/);
}
console.log('PASS human, fixed AI and device narration, explicit fallback, linked credits, continuous play and stop on navigation');
for(const d of [dom,reload,legacy,audioDom])d.window.close();
