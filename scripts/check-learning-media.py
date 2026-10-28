"""Validate every imported page and decode every published supplemental recording."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,os,subprocess
from PIL import Image

root=Path(__file__).resolve().parents[1]
def load(name):return json.loads((root/name).read_text(encoding='utf-8').split('=',1)[1].strip().rstrip(';'))
flash=load('public/flashcards/oxford/catalog.js');phonics=load('public/phonics/catalog.js')
assert len(flash['cards'])==399 and len({c['id'] for c in flash['cards']})==399
assert len(flash['categories'])==15
assert len(phonics['books'])==66 and len({b['id'] for b in phonics['books']})==66
assert {level:sum(b['level']==level for b in phonics['books']) for level in '123456'}=={'1':12,'2':12,'3':12,'4':12,'5':12,'6':6}
def asset(url):
    assert url.startswith('./') and '..' not in url
    return root/'public'/url[2:]
covers=load('public/books/curation.js')['covers']
assert len(covers)==8
for c in covers.values():
    with Image.open(asset(c['file'])) as im:
        assert im.size==(c['width'],c['height']) and .65<im.width/im.height<1
        im.verify()
jobs=[]
for b in phonics['books']:
    assert b['layoutVersion']==2 and b['duration']>10
    with Image.open(asset(b['cover'])) as im:
        assert im.width/im.height<1.12 and im.size==(b['coverWidth'],b['coverHeight']);im.verify()
    jobs.append(asset(b['audio']))
    for p in b['pages']:
        with Image.open(asset(p['image'])) as im:
            assert im.size==(p['width'],p['height']) and im.width>=320 and im.width/im.height<1.12
            im.verify()
for c in flash['cards']:
    assert c['category'] in {g['id'] for g in flash['categories']}
    with Image.open(asset(c['image'])) as im:im.verify()
    if c['audio']:jobs.append(asset(c['audio']))
report=json.loads((root/'content/learning-supplement/flashcard-audio.json').read_text(encoding='utf-8'))
assert len(report)==333
for entry in report:
    payload=(root/f"public/flashcards/supplement/{entry['card']}.mp3").read_bytes()
    assert hashlib.sha256(payload).hexdigest()==entry['sha256']
ffmpeg=os.environ.get('FFMPEG','ffmpeg')
def decode(path):
    result=subprocess.run([ffmpeg,'-v','error','-nostdin','-i',str(path),'-f','null','-'],capture_output=True)
    assert result.returncode==0,(str(path),result.stderr.decode(errors='replace'))
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(decode,jobs))
print(f"PASS {sum(len(b['pages']) for b in phonics['books'])} original-ratio phonics pages, all flashcard images, {len(jobs)} fully decoded recordings and 333 source checksums")
