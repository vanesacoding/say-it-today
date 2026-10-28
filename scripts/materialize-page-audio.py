"""Build page MP3s from verified original recordings and reviewed speech boundaries."""
from pathlib import Path
import concurrent.futures,hashlib,json,subprocess,os
root=Path(__file__).resolve().parents[1]
catalog=root/'public/books/catalog.js'
books=json.loads(catalog.read_text().removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'))
manifest=json.loads((root/'content/heinemann-gk/page-audio-timing.json').read_text())
assert len(manifest)==70 and len({b['id'] for b in manifest})==70
byid={b['id']:b for b in books};jobs=[]
for entry in manifest:
 assert [p['page'] for p in entry['pages']]==list(range(8))
 spoken=[p for p in entry['pages'] if p['spoken']]
 assert all(0<=p['start']<p['end'] for p in spoken)
 assert all(a['end']<=b['start'] for a,b in zip(spoken,spoken[1:]))
 b=byid[entry['id']];base=root/'public/books/library'/b['id'];source=base/b['wholeAudio']['file']
 assert hashlib.sha256(source.read_bytes()).hexdigest()==b['wholeAudio']['sha256'],str(source)
 b['audioType']='human'
 for timing in entry['pages']:
  p=b['pages'][timing['page']]
  if not timing['spoken']:
   p.pop('audioFile',None);p.pop('audioDurationSeconds',None);p.pop('audioSha256',None);continue
  p['audioFile']=f"audio/page-{timing['page']+1:02}.mp3"
  p['audioScope']='original-page-excerpt';p['audioSourceRange']=[timing['start'],timing['end']]
  jobs.append((source,base/p['audioFile'],timing,p))
assert len(jobs)==559
def build(job):
 source,target,timing,page=job
 stamp=root/'.reading-audio/page-stamps'/target.parent.parent.name/(target.name+'.json');stamp.parent.mkdir(parents=True,exist_ok=True);key={'start':timing['start'],'end':timing['end'],'version':1}
 if not target.exists() or not stamp.exists() or json.loads(stamp.read_text())!=key:
  temporary=target.with_suffix('.tmp.mp3');temporary.parent.mkdir(parents=True,exist_ok=True)
  subprocess.run(['ffmpeg','-v','error','-y','-ss',str(timing['start']),'-i',str(source),'-t',str(timing['end']-timing['start']),'-map_metadata','-1','-af','asetpts=N/SR/TB','-ac','1','-ar','44100','-c:a','libmp3lame','-b:a','96k',str(temporary)],check=True)
  temporary.replace(target);stamp.write_text(json.dumps(key))
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(target)]))
 assert .3<duration<30,str(target)
 page['audioDurationSeconds']=round(duration,3);page['audioSha256']=hashlib.sha256(target.read_bytes()).hexdigest()
with concurrent.futures.ThreadPoolExecutor(max_workers=4)as pool:list(pool.map(build,jobs))
catalog.write_text('window.JIGU_BOOKS = '+json.dumps(books,ensure_ascii=False,indent=2)+';\n')
print(f'PASS {len(books)} books, {len(jobs)} original-page MP3s (wordless pages excluded)')
