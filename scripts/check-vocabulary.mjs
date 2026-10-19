import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const bundle=readFileSync('public/books/vocabulary.js','utf8');
const scope={window:{}};vm.runInNewContext(bundle,scope);const api=scope.window.JiguVocabulary;
const fixture=[{id:'a',keywords:[{id:'one',word:'Read',meaning:'阅读',pageIndex:2}]},{id:'b',keywords:[{id:'two',word:'read',meaning:'读书',pageIndex:1}]}];
assert.equal(api.collect(fixture,{}).length,0);
assert.equal(api.collect(fixture,{a:{opened:true,page:0}}).length,0);
let items=api.collect(fixture,{a:{opened:true,page:0,furthestPage:2},b:{opened:true,finished:true,lastReadAt:10}});
assert.equal(items.length,1);assert.equal(items[0].sources.length,2);assert.equal(items[0].sources[0].bookId,'b');
assert.equal(api.collect(fixture,{}, {'a:one':true}).length,1);
const now=1700000000000;const known=api.rate(null,true,now);assert.equal(known.dueAt,now+86400000);
assert.equal(api.rate(known,true,now).dueAt,now+3*86400000);
assert.equal(api.rate(known,false,now).dueAt,now+86400000);
assert.equal(api.queue(items,{read:known},now).length,0);assert.equal(api.queue(items,{read:known},known.dueAt).length,1);
const html=readFileSync('index.html','utf8'),catalog=readFileSync('public/books/catalog.js','utf8');
function app(saved){const d=new JSDOM(html,{url:'https://jigu.local/',runScripts:'outside-only'});d.window.scrollTo=()=>{};if(saved)d.window.localStorage.setItem('jigu-reading-library-v2',saved);d.window.eval(catalog);d.window.eval(bundle);d.window.eval([...d.window.document.scripts].find(s=>s.textContent.includes('const books=window.JIGU_BOOKS')).textContent);return d;}
function click(d,selector){const e=d.window.document.querySelector(selector);assert.ok(e,'Missing '+selector);e.click();}
const d=app();click(d,'[data-go="mine"]');click(d,'[data-go="vocabulary"]');assert.ok(d.window.document.querySelector('.emptyVocabulary'));
click(d,'[data-go="shelf"]');click(d,'[data-book="0087"]');click(d,'[data-action="words"]');click(d,'[data-word-id="word-0"]');click(d,'[data-action="word-save"]');assert.ok(d.window.document.querySelector('.wordSave').disabled);
click(d,'button[data-action="close"]');click(d,'[data-go="shelf"]');click(d,'[data-go="mine"]');click(d,'[data-go="vocabulary"]');assert.equal(d.window.document.querySelectorAll('.vocabularyRow').length,1);
const saved=d.window.localStorage.getItem('jigu-reading-library-v2');const r=app(saved);click(r,'[data-go="mine"]');click(r,'[data-go="vocabulary"]');assert.equal(r.window.document.querySelectorAll('.vocabularyRow').length,1);
const players=[];r.window.Audio=class{play(){players.push(this);return Promise.resolve()}pause(){this.paused=true}};
click(r,'[data-action="review-start"]');assert.equal(r.window.document.querySelector('.reviewMeaning'),null);click(r,'[data-action="review-audio"]');assert.equal(players.length,1);assert.match(players[0].src,/0087\/audio\/01\.mp3$/);
const ended=players[0].onended;click(r,'[data-action="review-reveal"]');assert.ok(r.window.document.querySelector('.reviewMeaning'));click(r,'[data-remembered="true"]');assert.ok(players[0].paused);assert.ok(r.window.document.querySelector('.reviewComplete'));ended();assert.ok(r.window.document.querySelector('.reviewComplete'));
let stored=JSON.parse(r.window.localStorage.getItem('jigu-reading-library-v2'));assert.ok(stored.wordReviews.read.dueAt>Date.now());assert.equal(stored.records['0087'].opened,false,'Review does not pretend to read the book');
click(r,'[data-go="vocabulary"]');click(r,'[data-action="vocabulary-word"]');click(r,'[data-action="vocabulary-source"]');assert.match(r.window.document.querySelector('.readerHeader').textContent,/1\/8/);
// Auto collect only the vocabulary pages reached; returning to an earlier page must not lose words.
for(let i=0;i<7;i++)click(r,'[data-action="next"]');click(r,'[data-action="prev"]');click(r,'[data-go="shelf"]');click(r,'[data-go="mine"]');click(r,'[data-go="vocabulary"]');assert.equal(r.window.document.querySelectorAll('.vocabularyRow').length,3);
const archived=r.window.JIGU_BOOKS.find(b=>b.archived);
if(archived){
 const a=app(JSON.stringify({selectedId:archived.id,records:{[archived.id]:{opened:true,saved:true,page:2,lastReadAt:999}},wordSaves:{[archived.id+':'+archived.keywords[0].id]:true},wordReviews:{test:{dueAt:123}}}));
 assert.ok(!a.window.document.querySelector('h1').textContent.includes(archived.title),'Home moves to a current book');click(a,'[data-go="mine"]');assert.ok(a.window.document.querySelector(`[data-resume="${archived.id}"]`));click(a,`[data-resume="${archived.id}"]`);assert.match(a.window.document.querySelector('.readerHeader').textContent,new RegExp('3/'+archived.pages.length));
 const restored=JSON.parse(a.window.localStorage.getItem('jigu-reading-library-v2'));assert.ok(restored.records[archived.id].saved);assert.ok(restored.wordSaves[archived.id+':'+archived.keywords[0].id]);assert.equal(restored.wordReviews.test.dueAt,123);a.window.close();
}
for(const instance of [d,r])instance.window.close();
console.log('PASS vocabulary: reached-page collection, cross-book deduplication, saved words, 1/3/7/14-day review, recorded sentence audio, stale callbacks, source navigation and archive migration');
