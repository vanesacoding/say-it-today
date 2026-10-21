"""Verify the selected CC BY PDFs, exact words and unscaled original image bytes."""
import hashlib,importlib.util,json,re,urllib.request
from pathlib import Path
from collections import Counter
from io import BytesIO
from PIL import Image
import fitz
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pdfassets',ROOT/'scripts/pdf-source-assets.py');pdfassets=importlib.util.module_from_spec(spec);spec.loader.exec_module(pdfassets)
sources=json.loads((ROOT/'scripts/nature-source-manifest.json').read_text());books={b['id']:b for b in json.loads((ROOT/'scripts/library-release-books-nature.json').read_text())}
words=lambda t:Counter(re.findall(r'[A-Za-z]+',t))
count=0
for s in sources:
 b=books[s['bookId']];url=s['sourceUrl']
 # source_bytes validates PDF content hash before using a cached document.
 cover=pdfassets.source_bytes(b['sourceCover'],s['pdfSha256']);assert hashlib.sha256(cover).hexdigest()==b['sourceCoverSha256']
 doc=fitz.open(stream=pdfassets._cache[url],filetype='pdf')
 assert sorted(s['includedPdfPages']+[p['pageNumber'] for p in s['excludedPdfPages']])==list(range(1,len(doc)+1))
 assert 'CC BY 4.0' in b['source']['attributionText']
 for p,original in zip(b['pages'],s['pages']):
  pdftext=doc[p['sourcePageNumber']-1].get_text()
  assert words(pdftext)==words(original['sourcePdfText'])==words(p['en']),(b['id'],p['sourcePageNumber'],'PDF English words differ')
  data=pdfassets.source_bytes(p['sourceImage'],s['pdfSha256']);assert hashlib.sha256(data).hexdigest()==p['sourceImageSha256']
  im=Image.open(BytesIO(data));assert im.size==(p['imageWidth'],p['imageHeight']);assert min(im.size)>=320
  assert p['en']==p['sourceText'];count+=1
 print('VERIFIED',b['id'],len(b['pages']),'pages',flush=True)
assert len(books)==15 and count==176
print('PASS 15 original licensed PDFs / 176 pages: source hash, every original English word, complete page set, original image hashes and dimensions')
