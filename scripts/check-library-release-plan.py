"""Exercise paid-production guards without calling the speech provider."""
from pathlib import Path
import importlib.util,json,shutil,tempfile
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('release',ROOT/'scripts/library-release-production.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
books,request,ledger=m.plan();new=[b for b in books if b['id'] in request['newBookIds']]
assert len(new)==50 and len({b['narration']['voiceId'] for b in new})==3
assert all(p['speaker']!=m.CHARLIE for p in ledger['pages'] if p['bookId'] in request['newBookIds'])
assert sum(p['bookId'] not in request['newBookIds'] for p in ledger['pages'])==3
with tempfile.TemporaryDirectory() as temp:
 root=Path(temp);(root/'scripts').mkdir();(root/'public/books').mkdir(parents=True)
 shutil.copy(ROOT/'public/books/catalog.js',root/'public/books/catalog.js')
 for path in (ROOT/'scripts').glob('library-release-*.json'):shutil.copy(path,root/'scripts'/path.name)
 m.ROOT=root;m.CATALOG=root/'public/books/catalog.js'
 manifest_path=root/'scripts/library-release-candidate.json';request_path=root/'scripts/library-release-request.json'
 original={p.name:p.read_bytes() for p in (root/'scripts').glob('*.json')}
 def reset():
  for name,data in original.items():(root/'scripts'/name).write_bytes(data)
 def mutate(book_id,edit):
  manifest=json.loads(manifest_path.read_text())
  for shard in manifest['shards']:
   path=root/'scripts'/shard['file'];bs=json.loads(path.read_text());found=False
   for book in bs:
    if book['id']==book_id:edit(book);found=True
   if found:
    path.write_text(json.dumps(bs,ensure_ascii=False));shard['sha256']=m.sha(path.read_bytes());break
  else:raise AssertionError('Fixture book absent')
  manifest_path.write_text(json.dumps(manifest));req=json.loads(request_path.read_text());req['candidateSha256']=m.sha(manifest_path.read_bytes());request_path.write_text(json.dumps(req))
 def rejects(book_id,edit,expected):
  reset();mutate(book_id,edit)
  try:m.plan()
  except ValueError as e:assert expected in str(e),(expected,str(e))
  else:raise AssertionError('Unsafe plan accepted')
 rejects(new[0]['id'],lambda b:b['narration'].update(voiceId=m.CHARLIE),'must not use Charlie')
 rejects(new[0]['id'],lambda b:b['pages'][0].update(en=b['pages'][0]['en']+' Extra words.'),'source English')
 rejects('0008',lambda b:b['pages'][0].update(en='Changed human source'),'Human source')
 reset();mutate('0008',lambda b:b['pages'][0].update(tip='指指画面中的动作。'));assert m.plan()[2]['sourceTextSha256']==ledger['sourceTextSha256']
 reset();shard=json.loads(manifest_path.read_text())['shards'][0]['file'];(root/'scripts'/shard).write_text('[]')
 try:m.plan()
 except ValueError as e:assert 'shard changed' in str(e)
 else:raise AssertionError('Altered shard accepted')
print('PASS production guards: no Charlie for new books; exact source text; protected human English; tips reuse audio; immutable shards; only 3 old-page repairs')
