"""Materialize pinned original Book Dash story art before any paid narration."""
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path
import hashlib,json,time,urllib.request
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
books=json.loads((ROOT/'scripts/library-release-books-stories.json').read_text())
sources=json.loads((ROOT/'scripts/stories-source-manifest.json').read_text())
jobs=[]
for book,source in zip(books,sources):
 assert book['id']==source['bookId'] and source['license']=='CC-BY-4.0'
 assert book['source']['creators']==source['creators'] and len(source['creators'])>=3
 assert [p['sourcePageNumber'] for p in book['pages']]==source['includedSourceIndices']
 assert not set(source['includedSourceIndices'])&set(source['excludedSourceIndices'])
 base=ROOT/'public/books/library'/book['id']
 jobs.append((book['sourceCover'],base/'cover.jpg',book['sourceCoverSha256'],None))
 for i,(p,s) in enumerate(zip(book['pages'],source['pages'])):
  assert p['en']==s['sourceText']==p['sourceText']
  assert all(p[k]==s[k] for k in ['sourceImage','sourceImageSha256','imageWidth','imageHeight'])
  jobs.append((p['sourceImage'],base/f'{i+1:02d}.jpg',p['sourceImageSha256'],(p['imageWidth'],p['imageHeight'])))
def materialize(job):
 url,path,expected,size=job
 data=path.read_bytes() if path.exists() else None
 if data is None or hashlib.sha256(data).hexdigest()!=expected:
  for attempt in range(3):
   try:
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'JiguReading/1.0 (attributed Book Dash reuse)'}),timeout=45) as r:data=r.read()
    assert hashlib.sha256(data).hexdigest()==expected,(url,'source bytes changed')
    path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data);break
   except Exception:
    if attempt==2:raise
    time.sleep(attempt+1)
 assert hashlib.sha256(data).hexdigest()==expected
 im=Image.open(BytesIO(data));im.verify()
 if size:
  assert im.size==size and min(size)>=567 and size[0]/size[1]<=2.01
 return True
with ThreadPoolExecutor(max_workers=4) as pool:assert all(pool.map(materialize,jobs))
assert len(books)==20 and sum(len(b['pages']) for b in books)==241
print('PASS 20 attributed Book Dash books, 241 ordered original pages, image bytes/dimensions and bilingual source text')
