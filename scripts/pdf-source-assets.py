"""Extract pinned original PDF illustrations; never upscale embedded artwork."""
import hashlib,threading,urllib.parse,urllib.request,time
from pathlib import Path
import fitz
_cache={};_lock=threading.Lock()
def source_bytes(url,expected_pdf_hash):
 base,fragment=urllib.parse.urldefrag(url)
 if not fragment.startswith('jigu-'):return None
 if not expected_pdf_hash:raise ValueError('PDF hash missing')
 with _lock:
  if base not in _cache:
   for attempt in range(3):
    try:
     with urllib.request.urlopen(urllib.request.Request(base,headers={'User-Agent':'JiguReading/1.0 (CC BY source extraction)'}),timeout=60) as r:data=r.read()
     break
    except Exception as exc:
     if getattr(exc,'code',None)==404 or attempt==2:raise
     time.sleep(attempt+1)
   if hashlib.sha256(data).hexdigest()!=expected_pdf_hash:raise ValueError('Source PDF hash changed')
   _cache[base]=data
  data=_cache[base]
 with fitz.open(stream=data,filetype='pdf') as doc:
  kind,number=fragment.split('=')
  if kind=='jigu-image':return doc.extract_image(int(number))['image']
  if kind=='jigu-page':return doc[int(number)-1].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False).tobytes('png')
 raise ValueError('Unknown PDF illustration locator')
