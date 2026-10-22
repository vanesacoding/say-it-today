import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const html=readFileSync('index.html','utf8'),key='jigu-reading-library-v2';
function app(saved,legacy){const d=new JSDOM(html,{url:'https://jigu.local/',runScripts:'outside-only'});d.window.scrollTo=()=>{};if(saved)d.window.localStorage.setItem(key,JSON.stringify(saved));if(legacy)d.window.localStorage.setItem('jigu-vertical-book-0087-v1',JSON.stringify(legacy));for(const name of ['curation','catalog','ages','vocabulary'])d.window.eval(readFileSync(`public/books/${name}.js`,'utf8'));d.window.eval([...d.window.document.scripts].find(s=>s.textContent.includes('const books=window.JIGU_BOOKS')).textContent);return d}
const click=(d,s)=>{const e=d.window.document.querySelector(s);assert.ok(e,s);e.click()};const title=d=>(d.window.document.querySelector('.homePage .continueTitle')||d.window.document.querySelector('.homePage .homeTitle')).textContent;
const saved=d=>JSON.parse(d.window.localStorage.getItem(key));
const fresh=app();assert.equal(title(fresh),'推荐读');assert.ok(fresh.window.document.querySelector('.babySetup'));assert.ok(fresh.window.document.querySelector('[data-action="profile-save"]').disabled);
click(fresh,'[data-profile-age="3-4"]');click(fresh,'[data-profile-stage="S2"]');click(fresh,'[data-action="profile-save"]');assert.equal(title(fresh),'推荐读');assert.equal(fresh.window.document.querySelector('.babySetup'),null);assert.match(fresh.window.document.querySelector('.profileSummary').textContent,/3–4岁.*短句共读/);let data=saved(fresh);let book=fresh.window.JIGU_BOOKS.find(b=>b.id===data.selectedId);assert.equal(book.stageId,'S2');assert.ok(!data.records[book.id].opened,'recommendation is not a fake read');
const reload=app(data);assert.equal(title(reload),'推荐读');assert.equal(reload.window.document.querySelector('.babySetup'),null);assert.equal(saved(reload).selectedId,book.id);
click(reload,'[data-go="reader"]');click(reload,'[data-action="next"]');click(reload,'.readerHeader [data-go="shelf"]');click(reload,'.bottomNav [data-go="home"]');assert.equal(title(reload),'接着读');assert.equal(saved(reload).records[book.id].page,1);
click(reload,'.bottomNav [data-go="mine"]');click(reload,'.babyProfileEntry');assert.ok(reload.window.document.querySelector('.babySetup'));click(reload,'[data-profile-age="0-2"]');click(reload,'[data-profile-stage="S3"]');click(reload,'[data-action="profile-save"]');assert.equal(title(reload),'接着读','preference edits preserve unfinished reading');assert.equal(saved(reload).records[book.id].page,1);assert.equal(saved(reload).profile.stageId,'S3');
const explicit=app({profile:{done:true,ageBand:'0-2',stageId:'S3'}});assert.equal(explicit.window.JIGU_BOOKS.find(b=>b.id===saved(explicit).selectedId).stageId,'S3','stage preference overrides an age assumption');assert.equal(title(explicit),'推荐读');
const latest=app({selectedId:'sw-animal-homes',records:{'0087':{opened:true,page:2,lastReadAt:20},'sw-animal-homes':{opened:true,page:1,lastReadAt:10},'lr-our-family':{opened:true,finished:true,page:8,lastReadAt:99}}});assert.equal(saved(latest).selectedId,'0087','resume latest unfinished book rather than a detail page or a finished book');assert.equal(title(latest),'接着读');assert.equal(latest.window.document.querySelector('.babySetup'),null,'existing readers are not interrupted');
const done=app({selectedId:'0087',records:{'0087':{opened:true,finished:true,page:7,lastReadAt:20}}});assert.equal(title(done),'推荐读');click(done,'[data-action="profile-edit"]');click(done,'[data-profile-age="5-6"]');click(done,'[data-profile-stage="S2"]');click(done,'[data-action="profile-cancel"]');assert.equal(saved(done).records['0087'].finished,true);assert.equal(saved(done).profile.done,false);
const skipped=app();click(skipped,'[data-action="profile-skip"]');assert.equal(skipped.window.document.querySelector('.babySetup'),null);assert.equal(saved(skipped).profile.skipped,true);const skippedReload=app(saved(skipped));assert.equal(skippedReload.window.document.querySelector('.babySetup'),null);click(skippedReload,'[data-action="profile-edit"]');assert.ok(skippedReload.window.document.querySelector('.babySetup'));
const malformed=app({profile:{done:true,ageBand:'<img>',stageId:'S99'}});assert.ok(malformed.window.document.querySelector('.babySetup'));assert.equal(saved(malformed).profile.done,false);
const legacy=app(null,{opened:true,page:4,saved:true});assert.equal(title(legacy),'接着读');assert.equal(legacy.window.document.querySelector('.babySetup'),null);assert.equal(saved(legacy).records['0087'].page,4);

const recommendedIds=d=>[...d.window.document.querySelectorAll('.recommendedCard')].map(el=>el.dataset.book);
assert.equal(recommendedIds(fresh).length,3);assert.equal(new Set(recommendedIds(fresh)).size,3);
for(const id of recommendedIds(fresh))assert.equal(fresh.window.JIGU_BOOKS.find(b=>b.id===id).stageId,'S2');
assert.ok(reload.window.document.querySelector('.recommendationFeed'));
assert.ok(reload.window.document.querySelector('.continueTitle'));
assert.ok(reload.window.document.querySelector('.recommendationFeed').compareDocumentPosition(reload.window.document.querySelector('.continueTitle'))&4,'recommendations precede resume');
assert.equal(recommendedIds(reload).length,3);
assert.equal(saved(reload).records[book.id].page,1,'new recommendations preserve resume progress');
for(const id of recommendedIds(reload))assert.equal(reload.window.JIGU_BOOKS.find(b=>b.id===id).stageId,'S3','edited stage changes all recommendations');
const cardBook=reload.window.JIGU_BOOKS.find(b=>b.id===recommendedIds(reload)[0]);
click(reload,'.recommendedCard');assert.equal(saved(reload).selectedId,cardBook.id);assert.equal(saved(reload).records[book.id].page,1);
click(reload,'[data-go="reader"]');assert.ok(reload.window.document.querySelector('.readerHeader'));
const noHistory=app({profile:{done:true,ageBand:'5-6',stageId:'S2'}});assert.equal(recommendedIds(noHistory).length,3);assert.equal(noHistory.window.document.querySelector('.bookEntry'),null,'no duplicate featured recommendation');noHistory.window.close();

for(const d of [fresh,reload,explicit,latest,done,skipped,skippedReload,malformed,legacy])d.window.close();
console.log('PASS first-use preferences, local persistence, skip/edit/cancel, stage priority, real unfinished resume, finished recommendation and legacy progress');
