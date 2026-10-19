"""Generate only the approved 11 replacement books, with durable checkpoints."""
import argparse, hashlib, importlib.util, json, os
from pathlib import Path
import subprocess,sys,urllib.error,urllib.request,uuid
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('recordings',ROOT/'scripts/doubao-reading-production.py')
recordings=importlib.util.module_from_spec(spec);spec.loader.exec_module(recordings)
core=recordings.core
OUT=ROOT/'.reading-audio/mobile-production'
CATALOG=ROOT/'public/books/catalog.js'
CANDIDATE=ROOT/'scripts/reading-mobile-candidate.json'
sha=recordings.sha
write_json=recordings.write_json
verify=recordings.verify

def plan():
 candidate=json.loads(CANDIDATE.read_text())
 request=json.loads((ROOT/'scripts/reading-mobile-request.json').read_text())
 if request['candidateSha256']!=sha(CANDIDATE.read_bytes()):raise ValueError('Candidate differs from the approved release request')
 if candidate['speaker']!=core.DEFAULT_SPEAKER or candidate['approvedAuditionRunId']!=39222587639:raise ValueError('Voice differs from the approved child voice')
 if sha(CATALOG.read_bytes())!=candidate['sourceCatalogueSha256']:raise ValueError('Published catalogue changed; review before production')
 books=candidate['books'];ids=candidate['newBookIds']
 if len(ids)!=11 or len(set(ids))!=11 or len([b for b in books if not b.get('archived')])!=20:raise ValueError('Unexpected release book count')
 jobs=[{'bookId':b['id'],'pageIndex':i,'text':p['en'],'textSha256':sha(p['en'].encode())} for b in books if b['id'] in ids for i,p in enumerate(b['pages']) if p['en'].strip()]
 fingerprint=sha(json.dumps(jobs,ensure_ascii=False,separators=(',',':')).encode())
 if fingerprint!=candidate['sourceTextSha256'] or len(jobs)!=107 or sum(len(p['text']) for p in jobs)!=3568:raise ValueError('Approved text changed')
 for job in jobs:job['status']='not_submitted'
 return candidate,{'version':1,'requestId':candidate['id'],'sourceCatalogueSha256':candidate['sourceCatalogueSha256'],'sourceTextSha256':fingerprint,'speaker':candidate['speaker'],'speechRate':-8,'expectedPages':107,'characters':3568,'pages':jobs}

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--dry-run',action='store_true');parser.add_argument('--resume-only',action='store_true');args=parser.parse_args()
 candidate,initial=plan()
 if args.dry_run:print('11 replacement books, 107 spoken pages, 3568 characters; no provider called');return
 key=os.environ.get('DOUBAO_SPEECH_API_KEY','').strip()
 if not key and not args.resume_only:raise ValueError('Speech API secret is missing')
 OUT.mkdir(parents=True,exist_ok=True);ledger_path=OUT/'production.json'
 ledger=json.loads(ledger_path.read_text()) if ledger_path.exists() else initial
 for field in ['requestId','sourceCatalogueSha256','sourceTextSha256','speaker','expectedPages','characters']:
  if ledger.get(field)!=initial[field]:raise ValueError('Checkpoint does not match the current release')
 if [(p['bookId'],p['pageIndex'],p['textSha256']) for p in ledger['pages']]!=[(p['bookId'],p['pageIndex'],p['textSha256']) for p in initial['pages']]:raise ValueError('Checkpoint source pages changed')
 if args.resume_only and any(p['status']!='completed' for p in ledger['pages']):raise ValueError('Resume-only requires every saved recording')
 write_json(ledger_path,ledger)
 for number,entry in enumerate(ledger['pages'],1):
  file=OUT/entry['bookId']/f'{entry["pageIndex"]+1:02d}.mp3';file.parent.mkdir(exist_ok=True)
  if entry['status']=='completed':
   if not file.exists() or sha(file.read_bytes())!=entry['sha256']:raise ValueError('Saved recording missing or changed')
   verify(file);continue
  if entry['status']!='not_submitted':raise ValueError('Earlier request outcome uncertain; inspect before retrying')
  request_id=str(uuid.uuid4());entry.update(status='submitted',providerRequestId=request_id);write_json(ledger_path,ledger)
  payload={'req_params':{'text':entry['text'],'speaker':candidate['speaker'],'audio_params':{'format':'mp3','sample_rate':24000,'speech_rate':-8}}}
  request=urllib.request.Request(core.ENDPOINT,data=json.dumps(payload).encode(),method='POST',headers={'Content-Type':'application/json','X-Api-Key':key,'X-Api-Resource-Id':'seed-tts-2.0','X-Api-Request-Id':request_id,'X-Control-Require-Usage-Tokens-Return':'*'})
  try:
   with urllib.request.urlopen(request,timeout=90) as response:data,usage=core.read_audio(response)
  except urllib.error.HTTPError as e:raise ValueError(f'Speech HTTP {e.code}; stopped without paid retry') from None
  except (TimeoutError,urllib.error.URLError):raise ValueError('Speech request outcome uncertain; stopped without paid retry') from None
  file.write_bytes(data);duration=verify(file)
  entry.update(status='completed',sha256=sha(data),durationSeconds=round(duration,3),usage=usage);write_json(ledger_path,ledger)
  print(f'COMPLETE {number}/107 {entry["bookId"]} page {entry["pageIndex"]+1}',flush=True)
 lookup={(p['bookId'],p['pageIndex']):p for p in ledger['pages']}
 credits=['Jigu AI narration adaptation, Doubao Seed TTS 2.0 approved child voice.','Original stories and illustrations: African Storybook / Global ASP, CC BY 4.0.','https://creativecommons.org/licenses/by/4.0/']
 for book in candidate['books']:
  if book['id'] not in candidate['newBookIds']:continue
  for index,page in enumerate(book['pages']):
   if not page['en'].strip():continue
   entry=lookup[(book['id'],index)];name=f'audio/{index+1:02d}-{entry["sha256"][:16]}.mp3'
   target=ROOT/'public/books/library'/book['id']/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((OUT/book['id']/f'{index+1:02d}.mp3').read_bytes())
   page.update(audioFile=name,sourceAudio=f'https://vanesacoding.github.io/say-it-today/books/library/{book["id"]}/{name}',sourceAudioSha256=entry['sha256'],sourceAudioTextSha256=entry['textSha256'],audioDurationSeconds=entry['durationSeconds'])
  book['audioType']='generated';book['narration']={'kind':'ai','provider':'Volcengine','model':'seed-tts-2.0','voice':'天才童声2.0','voiceId':candidate['speaker'],'voiceType':'preset','speechRate':-8,'pitchRate':0,'approvedAuditionRunId':39222587639,'adaptation':'AI narration produced by Jigu from the attributed English text, with disclosed minor copy edits.'}
  credits.extend([book['title'],'; '.join(book['source']['creators']),book['source']['url'],book['source']['editorialNote']])
 generated='window.JIGU_BOOKS = '+json.dumps(candidate['books'],ensure_ascii=False,indent=2)+';\n'
 (OUT/'catalog.generated.js').write_text(generated);(OUT/'CREDITS.txt').write_text('\n'.join(credits)+'\n')
 ledger.update(status='all_audio_verified',billedCharacters=sum((p.get('usage') or {}).get('text_words',0) for p in ledger['pages']));write_json(ledger_path,ledger)
 temporary=CATALOG.with_suffix('.tmp');temporary.write_text(generated);temporary.replace(CATALOG)
 print('PASS 11 books / 107 recordings; reported characters: '+str(ledger['billedCharacters']),flush=True)

if __name__=='__main__':
 try:main()
 except (ValueError,subprocess.CalledProcessError) as e:
  print('ERROR: '+(str(e) if isinstance(e,ValueError) else 'Audio verification failed'),file=sys.stderr);sys.exit(1)
