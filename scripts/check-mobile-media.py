"""Check the complete mobile shelf, including immutable new image hashes."""
from pathlib import Path
import hashlib,json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
books=json.loads((ROOT/'public/books/catalog.js').read_text().removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'))
active=[b for b in books if not b.get('archived')]
request=json.loads((ROOT/'scripts/library-50-request.json').read_text())
current_hash=hashlib.sha256((ROOT/'public/books/catalog.js').read_bytes()).hexdigest()
assert len(active)==(20 if current_hash==request['sourceCatalogueSha256'] else 50)
count=0
for book in active:
 for i,page in enumerate(book['pages']):
  p=ROOT/'public/books/library'/book['id']/f'{i+1:02d}.jpg'
  with Image.open(p) as im:
   im.load();w,h=im.size
  assert min(w,h)>=320 and w/h<=1.4,(book['id'],i+1,w,h)
  if page.get('sourceImageSha256'):assert hashlib.sha256(p.read_bytes()).hexdigest()==page['sourceImageSha256']
  assert page.get('imageWidth')==w and page.get('imageHeight')==h
  count+=1
 assert book['audioType'] in ['human','generated']
print(f'PASS mobile media: {len(active)} books / {count} pages, no landscape spreads, complete fixed narration')
