"""Exercise the two-book paid release guards without submitting speech requests."""
from pathlib import Path
import importlib.util,json,shutil,tempfile
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('release',ROOT/'scripts/library-release-production.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
books,request,ledger=m.plan();new=[b for b in books if b['id'] in request['newBookIds']]
assert len(new)==2 and len({b['narration']['voiceId'] for b in new})==2
assert len(ledger['pages'])==37 and all(p['bookId'] in request['newBookIds'] for p in ledger['pages'])
assert [b['narration']['voice'] for b in new]==['Charlotte','Knightley']
with tempfile.TemporaryDirectory() as temp:
 root=Path(temp);(root/'scripts').mkdir();(root/'public/books').mkdir(parents=True)
 for name in ['catalog.js','curation.js']:shutil.copy(ROOT/'public/books'/name,root/'public/books'/name)
 for path in (ROOT/'scripts').glob('library-release-*.json'):shutil.copy(path,root/'scripts'/path.name)
 m.ROOT=root;m.CATALOG=root/'public/books/catalog.js'
 manifest_path=root/'scripts/library-release-candidate.json';request_path=root/'scripts/library-release-request.json'
 original={p.name:p.read_bytes() for p in (root/'scripts').glob('*.json')}
 def reset():
  for name,data in original.items():(root/'scripts'/name).write_bytes(data)
 def mutate(edit):
  manifest=json.loads(manifest_path.read_text());shard=manifest['shards'][0];path=root/'scripts'/shard['file'];bs=json.loads(path.read_text());edit(bs)
  path.write_text(json.dumps(bs,ensure_ascii=False));shard['sha256']=m.sha(path.read_bytes())
  manifest_path.write_text(json.dumps(manifest));req=json.loads(request_path.read_text());req['candidateSha256']=m.sha(manifest_path.read_bytes());request_path.write_text(json.dumps(req))
 def rejects(edit,expected):
  reset();mutate(edit)
  try:m.plan()
  except ValueError as e:assert expected in str(e),(expected,str(e))
  else:raise AssertionError('Unsafe plan accepted')
 rejects(lambda bs:bs[0]['narration'].update(voiceId=m.CHARLIE),'must not use Charlie')
 rejects(lambda bs:bs[0]['pages'][0].update(en='Extra words.'),'source English')
 rejects(lambda bs:bs[0]['pages'][0]['mobilePanels'].__setitem__(0,[.8,0,.5,1]),'Invalid mobile panel')
 rejects(lambda bs:bs[0]['source']['spreads'].pop(),'spread set')
 rejects(lambda bs:bs[0]['source']['spreads'][0].update(text='Changed English'),'Incomplete source English')
 rejects(lambda bs:bs.append(dict(next(b for b in books if b['id']=='0087'),zh='Changed title')),'Existing book changed')
 reset();shard=json.loads(manifest_path.read_text())['shards'][0]['file'];(root/'scripts'/shard).write_text('[]')
 try:m.plan()
 except ValueError as e:assert 'shard changed' in str(e)
 else:raise AssertionError('Altered shard accepted')
print('PASS production guards: 37 new-only recordings; fixed British voices; complete 24 source spreads; bounded mobile panels; unchanged existing books; immutable shards and curation')
