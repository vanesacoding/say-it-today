"""Materialize only pinned candidate illustrations into the local CI preview."""
import hashlib,json,urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'scripts/library-release-candidate.json').read_text())
books={b['id']:b for b in json.loads((root/'scripts/library-release-books-phone.json').read_text())}
for b in json.loads((root/'scripts/library-release-books-letsread.json').read_text()):books[b['id']]=b
for shard in manifest['shards']:
 for b in json.loads((root/'scripts'/shard['file']).read_text()):books[b['id']]=b
catalogue=json.loads((root/'public/books/catalog.js').read_text().removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'))
for b in catalogue:
 if b['id'] in ['0087','0001']:books[b['id']]=b
jobs={}
for book in books.values():
 jobs.setdefault(book['sourceCover'],[]).append((root/'dist/books/library'/book['id']/'cover.jpg',book.get('sourceCoverSha256')))
 for index,page in enumerate(book['pages'],1):jobs.setdefault(page['sourceImage'],[]).append((root/'dist/books/library'/book['id']/f'{index:02}.jpg',page.get('sourceImageSha256')))
def get(item):
 url,targets=item
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'JiguReading/1.0'}),timeout=40) as response:data=response.read()
 for target,expected in targets:
  assert len(data)>1000 and (data[:3]==b'\xff\xd8\xff' or data[:8]==b'\x89PNG\r\n\x1a\n')
  if expected:assert hashlib.sha256(data).hexdigest()==expected
  target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
with ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(get,jobs.items()))
print(f'PASS illustration preview: {len(books)} books / {len(jobs)} original assets, SHA256 unchanged')
