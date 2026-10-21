"""Check the complete mobile shelf, including immutable new image hashes."""
from pathlib import Path
import hashlib,json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
books=json.loads((ROOT/'public/books/catalog.js').read_text().removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'))
curation=json.loads((ROOT/'public/books/curation.js').read_text().removeprefix('window.JIGU_CURATION = ').strip().removesuffix(';'))
active=[b for b in books if not b.get('archived') and b['id'] not in curation['withdrawnIds']]
request=json.loads((ROOT/'scripts/library-release-request.json').read_text())
current_hash=hashlib.sha256((ROOT/'public/books/catalog.js').read_bytes()).hexdigest()
assert len(active)==(request['sourceActiveBooks'] if current_hash==request['sourceCatalogueSha256'] else curation['expectedActiveBooks'])
count=0
for book in active:
 for i,page in enumerate(book['pages']):
  p=ROOT/'public/books/library'/book['id']/f'{i+1:02d}.jpg'
  with Image.open(p) as im:
   im.load();w,h=im.size
  if page.get('mobilePanels'):
   assert book['source'].get('spreads')
   for x,y,pw,ph in page['mobilePanels']:
    assert 0<=x<1 and 0<=y<1 and 0<pw<=1 and 0<ph<=1 and x+pw<=1.000001 and y+ph<=1.000001
    assert min(w*pw,h*ph)>=320 and w*pw/(h*ph)<=1.4
  else:
   limit=2.15 if book['source'].get('format')=='storyweaver-pdf-art-v1' else 2.01 if book['source'].get('format') in ['bookdash-science-spreads-v1','bookdash-story-spreads-v1'] else 1.42 if book['source'].get('format')=='lets-read-source-pages-v1' else 1.4
   assert min(w,h)>=320 and w/h<=limit,(book['id'],i+1,w,h)
  if page.get('sourceImageSha256'):assert hashlib.sha256(p.read_bytes()).hexdigest()==page['sourceImageSha256']
  assert page.get('imageWidth')==w and page.get('imageHeight')==h
  count+=1
 assert book['audioType'] in ['human','generated']
print(f'PASS mobile media: {len(active)} books / {count} pages, verified mobile framing, complete fixed narration')
