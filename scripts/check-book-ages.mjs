import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const context={window:{}};vm.createContext(context);
for(const file of ['curation','catalog','ages'])vm.runInContext(readFileSync(new URL('../public/books/'+file+'.js',import.meta.url),'utf8'),context);
const active=context.window.JIGU_BOOKS.filter(b=>!b.archived&&!context.window.JIGU_CURATION.withdrawnIds.includes(b.id));
const bands=['0-2','3-4','5-6','7+'];
for(const b of active){assert.ok(b.ageBands.length,b.id+' needs age tags');assert.ok(b.ageBands.every(a=>bands.includes(a)),b.id)}
const fn=html.slice(html.indexOf('  function recommendedBooks('),html.indexOf('  function selectHomeBook()'));
vm.runInContext(html.match(/  const ageBands=\[[^\n]+/)[0],context);
context.activeBooks=active;context.state={profile:{done:true},records:{}};
vm.runInContext(fn,context);
for(const ageBand of bands)for(const stageId of ['S1','S2','S3']){
  context.state.profile={done:true,ageBand,stageId};
  const selected=vm.runInContext('recommendedBook()',context),pool=active.filter(b=>b.stageId===stageId);
  const list=vm.runInContext('recommendedBooks()',context);assert.equal(list.length,3);assert.equal(new Set(list.map(b=>b.id)).size,3);assert.ok(list.every(b=>b.stageId===stageId));
  assert.equal(selected.stageId,stageId);
  const distance=b=>Math.min(...b.ageBands.map(a=>Math.abs(bands.indexOf(a)-bands.indexOf(ageBand))));
  assert.equal(distance(selected),Math.min(...pool.map(distance)),ageBand+'/'+stageId);
  assert.ok(!selected.archived);
}
// Real selector on a small catalogue: age matching outranks curation, then unread wins.
const fixture=(id,ageBands,stageId='S2')=>({id,ageBands,stageId,pages:[{en:'one two three'}]});
context.activeBooks=[fixture('how-do-you-sleep',['5-6']),fixture('young',['0-2']),fixture('other-young',['0-2']),fixture('wrong-stage',['0-2'],'S1')];
context.state={profile:{done:true,ageBand:'0-2',stageId:'S2'},records:{}};
assert.equal(vm.runInContext('recommendedBook().id',context),'other-young');
context.state.records['other-young']={finished:true};
assert.equal(vm.runInContext('recommendedBook().id',context),'young');
context.state.records.young={finished:true};
assert.ok(['young','other-young'].includes(vm.runInContext('recommendedBook().id',context)));
context.state.profile.ageBand='7+';
assert.equal(vm.runInContext('recommendedBook().id',context),'how-do-you-sleep');
context.state.profile={done:true,skipped:true};
context.activeBooks=active;
assert.equal(vm.runInContext('recommendedBook().id',context),'0087');
assert.ok(html.includes('<script src="./books/ages.js"></script>'));
assert.ok(html.includes('叽咕一会'));
assert.ok(!html.includes('叽咕一下'));
for(const name of ['shelfCard','detail','topicTags']){
  const body=html.slice(html.indexOf('  function '+name+'(')).split('\n  function ')[0];
  assert.ok(!body.includes('ageBands')&&!/\bageLabel\(/.test(body),'age metadata hidden in '+name);
}
console.log('PASS '+active.length+' active books tagged; 12 age/stage combinations, nearest-age fallback, unread priority, skip, hidden tags and product name');
