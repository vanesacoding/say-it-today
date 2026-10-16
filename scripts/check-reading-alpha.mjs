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
