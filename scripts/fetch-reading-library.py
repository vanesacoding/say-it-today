"""Materialize only the public, attributed book assets declared in the catalogue."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import json, urllib.request, time
root=Path(__file__).resolve().parents[1]
raw=(root/'public/books/catalog.js').read_text()
books=json.loads(raw.removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'))
jobs=[]
for b in books:
 base=root/'public/books/library'/b['id']
 jobs.append((b['sourceCover'],base/'cover.jpg','image'))
 for i,p in enumerate(b['pages']):
  jobs.append((p['sourceImage'],base/f'{i+1:02d}.jpg','image'))
  if b['audioType']=='human':jobs.append((p['sourceAudio'],base/'audio'/f'{i+1:02d}.mp3','audio'))
jobs.append(('https://bookdash.github.io/bookdash-books/images/book-dash-logo.png',root/'public/books/library/book-dash-logo.png','image'))
def valid(data,kind):
 if kind=='audio':return len(data)>600 and (data[:3]==b'ID3' or data[0]==255 and data[1]&224==224)
 return len(data)>1000 and (data[:3]==b'\xff\xd8\xff' or data[:8]==b'\x89PNG\r\n\x1a\n')
def get(job):
 url,path,kind=job
 if path.exists() and valid(path.read_bytes(),kind):return 'cached'
 for attempt in range(3):
  try:
   request=urllib.request.Request(url,headers={'User-Agent':'JiguReading/1.0 (open-license book materializer)'})
   with urllib.request.urlopen(request,timeout=40) as response:data=response.read()
   if not valid(data,kind):raise ValueError('Invalid '+kind+' asset')
   path.parent.mkdir(parents=True,exist_ok=True);temp=path.with_suffix(path.suffix+'.tmp');temp.write_bytes(data);temp.replace(path)
   return 'downloaded'
  except Exception as exc:
   if getattr(exc,'code',None)==404 or attempt==2:raise
   time.sleep(attempt+1)
errors=[];done=0
with ThreadPoolExecutor(max_workers=8) as pool:
 futures={pool.submit(get,j):j for j in jobs}
 for future in as_completed(futures):
  done+=1
  try:future.result()
  except Exception as e:errors.append((str(futures[future][1].relative_to(root)),str(e)))
  if done%40==0:print(f'Book assets {done}/{len(jobs)}',flush=True)
if errors:
 for path,error in errors:print(path,error)
 raise SystemExit(f'Failed to materialize {len(errors)} book assets')
print(f'PASS {len(books)} books, {sum(len(b["pages"]) for b in books)} pages, {len(jobs)} validated assets')
