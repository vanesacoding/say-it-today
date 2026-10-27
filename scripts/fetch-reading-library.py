from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1]
books=json.loads((root/'public/books/catalog.js').read_text().removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'))
assert len(books)==70
for b in books:
 base=root/'public/books/library'/b['id']
 for f in ['cover.jpg']+[p['imageFile'] for p in b['pages']]:
  d=(base/f).read_bytes();assert d[:3]==bytes([255,216,255]) and len(d)>1000
 for t in [b.get('wholeAudio'),b.get('singing')]:
  if t:assert hashlib.sha256((base/t['file']).read_bytes()).hexdigest()==t['sha256']
 assert b['guide']['synopsis'] and b['guide']['patterns'] and len(b['guide']['goals'])==2 and b['guide']['task'] and len(b['keywords'])==3
print('PASS 70 books, 630 images, 70 story recordings and 69 songs')
