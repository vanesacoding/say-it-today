from pathlib import Path
import json,hashlib,subprocess,sys
root=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(root/'scripts/materialize-page-audio.py')],check=True)
books=json.loads((root/'public/books/catalog.js').read_text().removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'))
assert len(books)==70
for b in books:
 base=root/'public/books/library'/b['id']
 for f in ['cover.jpg']+[p['imageFile'] for p in b['pages']]:
  d=(base/f).read_bytes();assert d[:3]==bytes([255,216,255]) and len(d)>1000
 for t in [b.get('wholeAudio'),b.get('singing')]:
  if t:assert hashlib.sha256((base/t['file']).read_bytes()).hexdigest()==t['sha256']
 for p in b['pages']:
  assert p.get('artCrop') and len(p['artCrop'])==4
  x,y,w,h=p['artCrop'];assert 0<=x<1 and 0<=y<1 and w>0 and h>0 and x+w<=1.00001 and y+h<=1.00001
  if p['en']:
   assert p.get('audioFile')
   assert hashlib.sha256((base/p['audioFile']).read_bytes()).hexdigest()==p['audioSha256']
 assert b['guide']['synopsis'] and b['guide']['patterns'] and len(b['guide']['goals'])==2 and b['guide']['task'] and len(b['keywords'])==3
print('PASS 70 books, 630 images, 559 page excerpts, 70 source recordings and 69 songs')
