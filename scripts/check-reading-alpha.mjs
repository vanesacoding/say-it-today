import { readFileSync, existsSync } from 'node:fs';
import { strict as assert } from 'node:assert';
const html = readFileSync('index.html', 'utf8');
const data = JSON.parse(readFileSync('docs/jigu-reading-alpha/book-source.json', 'utf8'));
assert.equal(data.id, 'come-back-cat');
assert.equal(data.pages.length, 12);
assert.equal(data.license, 'CC BY 4.0');
assert.match(html, /Book Dash/);
assert.match(html, /const ORIGINAL=/);
assert.match(html, /function stopNarration\(\)/);
assert.match(html, /function playPageNarration\(\)/);
assert.match(html, /case 'speak-page'/);
assert.match(html, /model\.readMode==='listen'/);
assert.match(html, /localStorage\.setItem/);
assert.match(html, /homeV2/);
assert.match(html, /readingV2/);
assert.match(html, /artScrollHint/);
assert.match(html, /readerDrawer/);
assert.match(html, /uiLayoutV2:2/);
assert.match(html, /readerLayout:'landscape'/);
assert.match(html, /readerScreen landscapeReader/);
assert.match(html, /landscape-first picture-book reader/);
assert.match(html, /case 'toggle-reader-layout'/);
assert.match(html, /readerArtwork/);
assert.match(html, /class=\\"artArrow next\\"/);
assert.doesNotMatch(html, /每个小故事，<br>都有适合它的读法/);
assert.doesNotMatch(html, /慢慢读，<br>不着急/);
assert.doesNotMatch(html, /↔ 滑动看画/);

assert.match(html, /case 'full-image'/);
assert.doesNotMatch(html, /TODAY, A LITTLE STORY/);
assert.doesNotMatch(html, /每天读一点，<br>一起发现小世界/);
for (let i = 1; i <= 12; i++) {
 const filename = String(i).padStart(2, '0') + '.jpg';
 assert.equal(data.pages[i-1].image, filename);
 assert.ok(existsSync(`public/books/cat/${filename}`), `missing image ${filename}`);
}
for (const name of ['cover.jpg', 'book-dash-logo.png']) {
 assert.ok(existsSync(`public/books/cat/${name}`), `missing ${name}`);
}
assert.equal(data.pages.filter(p => !p.en).length, 2);
assert.ok(data.pages.every(p => p.translationStatus === 'editorial_draft'));
console.log('PASS reading alpha: original spreads, attribution, local assets, narration, learning history');
