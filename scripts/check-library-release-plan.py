"""Exercise paid-production guards without submitting narration requests."""
from pathlib import Path
import importlib.util,json,shutil,tempfile
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('release',ROOT/'scripts/library-release-production.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
books,request,ledger=m.plan();new=[b for b in books if b['id'] in request['newBookIds']]
assert len(new)==10 and len({b['narration']['voiceId'] for b in new})==3
assert len(ledger['pages'])==102 and all(p['bookId'] in request['newBookIds'] and p['speaker']!=m.CHARLIE for p in ledger['pages'])
assert sum(len(b['pages']) for b in new)==105
with tempfile.TemporaryDirectory() as temp:
 root=Path(temp);(root/'scripts').mkdir();(root/'public/books').mkdir(parents=True)
 for name in ['catalog.js','curation.js']:shutil.copy(ROOT/'public/books'/name,root/'public/books'/name)
 for path in (ROOT/'scripts').glob('library-release-*.json'):shutil.copy(path,root/'scripts'/path.name)
 shutil.copy(ROOT/'scripts/letsread-source-manifest.json',root/'scripts/letsread-source-manifest.json')
 m.ROOT=root;m.CATALOG=root/'public/books/catalog.js'
 manifest_path=root/'scripts/library-release-candidate.json';request_path=root/'scripts/library-release-request.json'
 original={p.name:p.read_bytes() for p in (root/'scripts').glob('*.json')}
 def reset():
  for name,data in original.items():(root/'scripts'/name).write_bytes(data)
 def mutate(edit):
  manifest=json.loads(manifest_path.read_text());shard=manifest['shards'][0];path=root/'scripts'/shard['file'];bs=json.loads(path.read_text());edit(bs)
  path.write_text(json.dumps(bs,ensure_ascii=False));shard['sha256']=m.sha(path.read_bytes());manifest_path.write_text(json.dumps(manifest));req=json.loads(request_path.read_text());req['candidateSha256']=m.sha(manifest_path.read_bytes());request_path.write_text(json.dumps(req))
 def rejects(edit,expected):
  reset();mutate(edit)
  try:m.plan()
  except ValueError as e:assert expected in str(e),(expected,str(e))
  else:raise AssertionError('Unsafe plan accepted')
 rejects(lambda bs:bs[0]['narration'].update(voiceId=m.CHARLIE),'must not use Charlie')
 rejects(lambda bs:bs[0]['pages'][0].update(en='Extra words.'),'source English')
 rejects(lambda bs:bs[0]['pages'][0].update(en='Rewritten words.',sourceText='Rewritten words.'),'Incomplete source English')
 rejects(lambda bs:bs[0]['pages'].pop(),'Source pages missing')
 rejects(lambda bs:bs[0]['pages'].reverse(),'Source pages missing')
 rejects(lambda bs:bs[0]['source'].update(license='Copyright'),'Unapproved source license')
 rejects(lambda bs:bs[0]['pages'][0].update(imageWidth=9000),'geometry')
 rejects(lambda bs:bs[0]['source'].update(attributionText=''),'attribution changed')
 rejects(lambda bs:bs.append(dict(next(b for b in books if b['id']=='0087'),zh='Changed title')),'Existing book changed')
 reset();(root/'scripts/letsread-source-manifest.json').write_text('[]')
 try:m.plan()
 except ValueError as e:assert 'Source manifest changed' in str(e)
 else:raise AssertionError('Altered source accepted')
print('PASS release guards: 10 CC BY 4.0 books; 105 complete source pages; 102 new-only recordings; no Charlie, rewrites, missing/reordered pages, changed images, removed attribution or changed existing books')
