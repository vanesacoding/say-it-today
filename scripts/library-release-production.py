"""Produce source-pinned reading releases; reuse unchanged recordings and stop on uncertain requests."""
import argparse,importlib.util,json,os,subprocess,sys,urllib.request,urllib.error,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.reading-audio/library-release';CATALOG=ROOT/'public/books/catalog.js'
spec=importlib.util.spec_from_file_location('recordings',ROOT/'scripts/doubao-reading-production.py')
recordings=importlib.util.module_from_spec(spec);spec.loader.exec_module(recordings)
core=recordings.core;sha,write_json,verify=recordings.sha,recordings.write_json,recordings.verify
SPEAKER='ICL_uranus_en_female_charlie_tob';RATE=-5

def plan():
 raw=CATALOG.read_bytes();request=json.loads((ROOT/'scripts/library-release-request.json').read_text())
 candidate_bytes=(ROOT/'scripts/library-release-candidate.json').read_bytes()
 if sha(candidate_bytes)!=request['candidateSha256']:raise ValueError('Candidate hash changed')
 candidate=json.loads(candidate_bytes)
 if sha(raw)!=request['sourceCatalogueSha256'] or sha(raw)!=candidate['sourceCatalogueSha256']:raise ValueError('Source catalogue changed')
 if candidate['speaker']!=SPEAKER or candidate['speechRate']!=RATE:raise ValueError('Unapproved voice')
 original=json.loads(raw.decode().removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'));changes={b['id']:b for b in candidate['books']};existing={b['id'] for b in original};books=[changes.get(b['id'],b) for b in original]+[b for b in candidate['books'] if b['id'] not in existing]
 if len({b['id'] for b in books})!=len(books):raise ValueError('Duplicate books')
 if len([b for b in books if not b.get('archived')])!=request['targetActiveBooks']:raise ValueError('Wrong shelf count')
 previous={b['id']:b for b in original};pages=[]
 for b in books:
  before=previous.get(b['id'])
  if before and before['audioType']=='human' and b['pages']!=before['pages']:raise ValueError('Human source pages changed')
  if b['audioType']!='generated':continue
  for i,p in enumerate(b['pages']):
   if not p['en'].strip():continue
   if p.get('sourceAudioTextSha256')==sha(p['en'].encode()) and p.get('sourceAudioSha256'):continue
   pages.append(dict(bookId=b['id'],pageIndex=i,text=p['en'],textSha256=sha(p['en'].encode()),status='not_submitted'))
 fingerprint=sha(json.dumps([(p['bookId'],p['pageIndex'],p['text']) for p in pages],ensure_ascii=False,separators=(',',':')).encode())
 if (len(pages),fingerprint)!=(candidate['expectedPages'],candidate['sourceTextSha256']):raise ValueError('Page jobs changed')
 return books,request,dict(version=1,requestId=request['id'],sourceCatalogueSha256=sha(raw),sourceTextSha256=fingerprint,speaker=SPEAKER,speechRate=RATE,expectedPages=len(pages),characters=sum(len(p['text']) for p in pages),pages=pages)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--dry-run',action='store_true');parser.add_argument('--resume-only',action='store_true');args=parser.parse_args()
 books,request,initial=plan()
 if args.dry_run:print(f"PASS source-pinned plan: target {request['targetActiveBooks']} books, {initial['expectedPages']} recordings / {initial['characters']} characters, Charlie US -5");return
 key=os.environ.get('DOUBAO_SPEECH_API_KEY','').strip()
 if not key and not args.resume_only:raise ValueError('Speech secret missing')
 OUT.mkdir(parents=True,exist_ok=True);ledger_path=OUT/'production.json';ledger=json.loads(ledger_path.read_text()) if ledger_path.exists() else initial
 for field in ['requestId','sourceCatalogueSha256','sourceTextSha256','speaker','speechRate','expectedPages','characters']:
  if ledger.get(field)!=initial[field]:raise ValueError('Checkpoint differs from request')
 if [(p['bookId'],p['pageIndex'],p['textSha256']) for p in ledger['pages']]!=[(p['bookId'],p['pageIndex'],p['textSha256']) for p in initial['pages']]:raise ValueError('Checkpoint pages changed')
 if args.resume_only and any(p['status']!='completed' for p in ledger['pages']):raise ValueError('Resume requires fully completed recordings; no paid retry')
 write_json(ledger_path,ledger)
 for n,p in enumerate(ledger['pages'],1):
  file=OUT/p['bookId']/f"{p['pageIndex']+1:02d}.mp3";file.parent.mkdir(exist_ok=True)
  if p['status']=='completed':
   if not file.exists() or sha(file.read_bytes())!=p['sha256']:raise ValueError('Checkpoint audio changed')
   verify(file);continue
  if p['status']!='not_submitted':raise ValueError('Earlier outcome uncertain; no paid retry')
  reqid=str(uuid.uuid4());p.update(status='submitted',providerRequestId=reqid);write_json(ledger_path,ledger)
  payload={'req_params':{'text':p['text'],'speaker':SPEAKER,'audio_params':{'format':'mp3','sample_rate':24000,'speech_rate':RATE}}}
  http=urllib.request.Request(core.ENDPOINT,data=json.dumps(payload).encode(),method='POST',headers={'Content-Type':'application/json','X-Api-Key':key,'X-Api-Resource-Id':'seed-tts-2.0','X-Api-Request-Id':reqid,'X-Control-Require-Usage-Tokens-Return':'*'})
  try:
   with urllib.request.urlopen(http,timeout=90) as response:data,usage=core.read_audio(response)
  except urllib.error.HTTPError as e:raise ValueError(f'Speech HTTP {e.code}; no paid retry') from None
  except (TimeoutError,urllib.error.URLError):raise ValueError('Speech outcome uncertain; no paid retry') from None
  file.write_bytes(data);duration=verify(file);p.update(status='completed',sha256=sha(data),durationSeconds=round(duration,3),usage=usage);write_json(ledger_path,ledger)
  print(f"COMPLETE {n}/{len(ledger['pages'])} {p['bookId']} page {p['pageIndex']+1}",flush=True)
 lookup={(p['bookId'],p['pageIndex']):p for p in ledger['pages']}
 for b in books:
  changed=False
  for i,p in enumerate(b['pages']):
   entry=lookup.get((b['id'],i))
   if not entry:continue
   changed=True;name=f"audio/{i+1:02d}-{entry['sha256'][:16]}.mp3";target=ROOT/'public/books/library'/b['id']/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((OUT/b['id']/f'{i+1:02d}.mp3').read_bytes())
   p.update(audioFile=name,sourceAudio=f"https://vanesacoding.github.io/say-it-today/books/library/{b['id']}/{name}",sourceAudioSha256=entry['sha256'],sourceAudioTextSha256=entry['textSha256'],audioDurationSeconds=entry['durationSeconds'])
  if changed:b['narration']={**b.get('narration',{}),'kind':'ai','provider':'Volcengine','model':'seed-tts-2.0','voice':'Charlie 2.0 美式英语（轻柔慢速）','voiceId':SPEAKER,'voiceType':'preset','speechRate':RATE,'pitchRate':0,'locale':'en-US','accentLabel':'美式英语','approvedAuditionRunId':39233953938,'approvedVariant':'english-gentle','adaptation':'AI narration produced by Jigu from attributed source text.'}
 generated='window.JIGU_BOOKS = '+json.dumps(books,ensure_ascii=False,indent=2)+';\n';(OUT/'catalog.generated.js').write_text(generated)
 ledger.update(status='all_audio_verified',billedCharacters=sum((p.get('usage') or {}).get('text_words',0) for p in ledger['pages']));write_json(ledger_path,ledger)
 (OUT/'CREDITS.txt').write_text('\n'.join(['Jigu AI narration; Charlie US, Seed TTS 2.0. Not original human recording.']+[b['title']+' | '+'; '.join(b['source']['creators'])+' | '+b['source']['url']+' | '+b['source']['license'] for b in books if any(p['bookId']==b['id'] for p in ledger['pages'])])+'\n')
 CATALOG.write_text(generated);print(f"PASS verified {len(ledger['pages'])} recordings; target {request['targetActiveBooks']} active books",flush=True)

if __name__=='__main__':
 try:main()
 except (ValueError,subprocess.CalledProcessError) as e:print('ERROR: '+(str(e) if isinstance(e,ValueError) else 'Audio verification failed'),file=sys.stderr);sys.exit(1)
