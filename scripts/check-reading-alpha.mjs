import { readFileSync, existsSync, statSync } from 'node:fs';
import { strict as assert } from 'node:assert';
const html=readFileSync('index.html','utf8');
assert.match(html,/I Like to Read!/);
assert.match(html,/const book =/);
assert.match(html,/const pageImage =/);
assert.match(html,/const localAudio =/);
assert.match(html,/const remoteAudio =/);
assert.match(html,/function playPage\(/);
assert.match(html,/function onAudioEnd\(/);
assert.match(html,/function fallbackSpeech\(/);
for(const name of ['together','listen','translation','tip','favorite','next'])assert.ok(html.includes('data-action="'+name+'"'),'missing control '+name);
assert.match(html,/data-go="shelf"/);
assert.match(html,/data-go="mine"/);
assert.match(html,/Letta Machoga/);
assert.match(html,/Wiehan de Jager/);
assert.match(html,/Darshan Soni/);
assert.match(html,/CC BY 3\.0/);
assert.doesNotMatch(html,/rotate\(|readerLayout:'landscape'|滑动看画/);
for(let i=1;i<=8;i++){
 const number=String(i).padStart(2,'0');
 const image='public/books/read/'+number+'.jpg';
 assert.ok(existsSync(image),'missing book image '+image);
 assert.ok(statSync(image).size>15000,'invalid original image '+image);
 if(process.env.CI){
  const sound='public/books/read/audio/'+number+'.mp3';
  assert.ok(existsSync(sound),'missing original narration '+sound);
  const buf=readFileSync(sound);
  const mp3=buf.toString('ascii',0,3)==='ID3'||buf[0]===0xff&&(buf[1]&0xe0)===0xe0;
  assert.ok(buf.length>600&&mp3,'invalid MP3 '+sound);
 }
}
console.log('PASS portrait reader: illustrated pages, credits, real MP3 files and reading controls');