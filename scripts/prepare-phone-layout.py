"""Download immutable candidate illustrations into the local layout preview only."""
import hashlib,json,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'scripts/library-release-candidate.json').read_text())
cache={}
for shard in manifest['shards']:
 for book in json.loads((root/'scripts'/shard['file']).read_text()):
  for index,page in enumerate(book['pages'],1):
   url=page['sourceImage'];expected=page['sourceImageSha256']
   if url not in cache:
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'JiguReading/1.0'}),timeout=40) as response:cache[url]=response.read()
   data=cache[url];assert hashlib.sha256(data).hexdigest()==expected
   target=root/'dist/books/library'/book['id']/f'{index:02}.jpg';target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
print(f'PASS candidate illustration preview: {len(cache)} original spreads, SHA256 unchanged')
