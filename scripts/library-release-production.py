"""Produce a pinned library release, with a fixed voice per book and no uncertain retries."""
import argparse,importlib.util,json,os,subprocess,sys,urllib.request,urllib.error,uuid,html,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'.reading-audio/library-release';CATALOG=ROOT/'public/books/catalog.js'
spec=importlib.util.spec_from_file_location('recordings',ROOT/'scripts/doubao-reading-production.py');recordings=importlib.util.module_from_spec(spec);spec.loader.exec_module(recordings)
core=recordings.core;sha,write_json,verify=recordings.sha,recordings.write_json,recordings.verify
CHARLIE='ICL_uranus_en_female_charlie_tob';RATE=-5
PROFILES={p['speaker']:p for p in json.loads((ROOT/'scripts/reading-voice-profiles.json').read_text())['profiles']}
NEW_VOICES={p['speaker'] for p in PROFILES.values() if p['name'] in ['Rowan','Charlotte','Knightley']}

def validate_mobile_source(b):
 spreads=b['source']['spreads']
 expected=list(range(4,16)) if b['id']=='little-goat' else list(range(1,13))
 if [s['index'] for s in spreads]!=expected:raise ValueError('Source spread set changed')
 if {p['sourceSpreadIndex'] for p in b['pages']}!=set(expected):raise ValueError('Source spread missing')
 for s in spreads:
  pages=[p for p in b['pages'] if p['sourceSpreadIndex']==s['index']]
  if ' '.join(p['en'] for p in pages)!=s['text']:raise ValueError('Incomplete source English')
  if any(p['sourceImage']!=s['image'] or p['sourceImageSha256']!=s['imageSha256'] for p in pages):raise ValueError('Source image changed')
 for p in b['pages']:
  if not p.get('mobilePanels'):raise ValueError('Missing mobile panels')
  for rect in p['mobilePanels']:
   x,y,w,h=rect
   if not (0<=x<1 and 0<=y<1 and 0<w<=1 and 0<h<=1 and x+w<=1.000001 and y+h<=1.000001 and p['imageWidth']*w/(p['imageHeight']*h)<=1.4 and min(p['imageWidth']*w,p['imageHeight']*h)>=320):raise ValueError('Invalid mobile panel')

def source_plain(text):
 return ' '.join(html.unescape(re.sub(r'<[^>]*>',' ',text or '')).replace('\\u200b','').replace('\u200b','').split())

def validate_letsread_source(book,source):
 if source['license']!='CC-BY-4.0' or source['masterLicense']!='CC-BY-4.0' or book['source']['license']!='https://creativecommons.org/licenses/by/4.0/':raise ValueError('Unapproved source license')
 if book['source']['originalPdf']!=source['pdfUrl'] or book['source']['originalPdfSha256']!=source['pdfSha256']:raise ValueError('Source PDF evidence changed')
 if source['languageId']!='4846240843956224' or book['source']['sourceApiSha256']!=source['sourceApiSha256']:raise ValueError('Source metadata changed')
 if book['source']['attributionText']!=source['attributionText'] or 'CC-BY-4.0' not in source['attributionText']:raise ValueError('Source attribution changed')
 selected=[p for p in source['pages'] if not p['excluded']]
 if [p['sourcePageId'] for p in book['pages']]!=[p['id'] for p in selected]:raise ValueError('Source pages missing or reordered')
 for p,original in zip(book['pages'],selected):
  if p['en']!=source_plain(original['html']) or p['en']!=original['text']:raise ValueError('Incomplete source English')
  if p['sourceImage']!=original['image'] or p['sourceImageSha256']!=original['imageSha256']:raise ValueError('Source image changed')
  if (p['imageWidth'],p['imageHeight'])!=(original['imageWidth'],original['imageHeight']) or min(p['imageWidth'],p['imageHeight'])<320 or p['imageWidth']/p['imageHeight']>1.42:raise ValueError('Invalid original page geometry')
  if not (p['zh'] and p['tip'] and p['alt']):raise ValueError('Companion editorial missing')
 if len(book['keywords'])!=3 or not book['activity']['title'] or not book['activity']['text']:raise ValueError('Editorial modules missing')

def validate_bookdash_source(book,source):
 if source['license']!='CC-BY-4.0' or book['source']['license']!='https://creativecommons.org/licenses/by/4.0/':raise ValueError('Unapproved source license')
 if book['source']['url']!=source['sourceUrl'] or book['source']['creators']!=source['creators']:raise ValueError('Source attribution changed')
 if book['sourceCover']!=source['sourceCover'] or book['sourceCoverSha256']!=source['sourceCoverSha256']:raise ValueError('Source cover changed')
 if [p['sourcePageNumber'] for p in book['pages']]!=[p['sourcePageNumber'] for p in source['pages']]:raise ValueError('Source pages missing or reordered')
 for p,original in zip(book['pages'],source['pages']):
  if p['en']!=original['sourceText']:raise ValueError('Incomplete source English')
  if any(p[k]!=original[k] for k in ['sourceImage','sourceImageSha256']):raise ValueError('Source image changed')
  if any(p[k]!=original[k] for k in ['imageWidth','imageHeight']) or min(p['imageWidth'],p['imageHeight'])<1024 or p['imageWidth']/p['imageHeight']>2.01:raise ValueError('Invalid original page geometry')
  if not (p['zh'] and p['tip'] and p['alt']):raise ValueError('Companion editorial missing')
 if len(book['keywords'])!=3 or not book['activity']['text']:raise ValueError('Editorial modules missing')

def validate_pdf_source(book,source):
 if source['license']!='CC-BY-4.0' or book['source']['license']!='https://creativecommons.org/licenses/by/4.0/':raise ValueError('Unapproved source license')
 if book['source']['url']!=source['sourceUrl'] or book['source']['creators']!=source['creators'] or book['source']['attributionText']!=source['attributionText']:raise ValueError('Source attribution changed')
 if book['source']['originalPdf']!=source['sourceUrl'] or book['source']['originalPdfSha256']!=source['pdfSha256']:raise ValueError('Source PDF evidence changed')
 if book['sourceCover']!=source['sourceCover'] or book['sourceCoverSha256']!=source['sourceCoverSha256']:raise ValueError('Source cover changed')
 if [p['sourcePageNumber'] for p in book['pages']]!=source['includedPdfPages'] or len(book['pages'])!=len(source['pages']):raise ValueError('Source pages missing or reordered')
 for p,original in zip(book['pages'],source['pages']):
  if p['en']!=original['sourceText']:raise ValueError('Incomplete source English')
  if any(p[k]!=original[k] for k in ['sourceImage','sourceImageSha256']):raise ValueError('Source image changed')
  if not p['sourceImage'].startswith(source['sourceUrl']+'#jigu-'):raise ValueError('Source image locator changed')
  if any(p[k]!=original[k] for k in ['imageWidth','imageHeight']) or min(p['imageWidth'],p['imageHeight'])<320 or p['imageWidth']/p['imageHeight']>2.15:raise ValueError('Invalid original page geometry')
  if not (p['zh'] and p['tip'] and p['alt']):raise ValueError('Companion editorial missing')
 if len(book['keywords'])!=3 or not book['activity']['text']:raise ValueError('Editorial modules missing')

def plan():
 raw=CATALOG.read_bytes();request=json.loads((ROOT/'scripts/library-release-request.json').read_text());data=(ROOT/'scripts/library-release-candidate.json').read_bytes()
 if sha(data)!=request['candidateSha256']:raise ValueError('Candidate hash changed')
 candidate=json.loads(data)
 if sha(raw)!=request['sourceCatalogueSha256'] or sha(raw)!=candidate['sourceCatalogueSha256']:raise ValueError('Source catalogue changed')
 if candidate['speechRate']!=RATE or candidate['auditionRunId']!=39355874472:raise ValueError('Unreviewed narration settings')
 curation_raw=(ROOT/'public/books/curation.js').read_bytes()
 if sha(curation_raw)!=request['curationSha256']:raise ValueError('Curation changed')
 curation=json.loads(curation_raw.decode().removeprefix('window.JIGU_CURATION = ').strip().removesuffix(';'))
 active=lambda bs:[b for b in bs if not b.get('archived') and b['id'] not in curation['withdrawnIds']]
 source_manifest=candidate['sourceManifest']
 source_data=(ROOT/'scripts'/source_manifest['file']).read_bytes()
 if sha(source_data)!=source_manifest['sha256']:raise ValueError('Source manifest changed')
 sources={b['bookId']:b for b in json.loads(source_data)}
 if set(sources)!=set(candidate['newBookIds']):raise ValueError('Source manifest book set changed')
 changes=[]
 for shard in candidate['shards']:
  name=shard['file']
  if Path(name).name!=name or not name.startswith('library-release-books-'):raise ValueError('Invalid shard path')
  data=(ROOT/'scripts'/name).read_bytes()
  if sha(data)!=shard['sha256']:raise ValueError('Book shard changed')
  changes.extend(json.loads(data))
 if len({b['id'] for b in changes})!=len(changes):raise ValueError('Duplicate book changes')
 original=json.loads(raw.decode().removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'));previous={b['id']:b for b in original};overrides={b['id']:b for b in changes}
 books=[b for b in changes if b['id'] not in previous]+[overrides.get(b['id'],b) for b in original]
 new_ids=[b['id'] for b in changes if b['id'] not in previous]
 if sorted(new_ids)!=sorted(candidate['newBookIds']) or sorted(new_ids)!=sorted(request['newBookIds']) or len(new_ids)!=request['expectedNewBooks']:raise ValueError('New-book set changed')
 if len(active(original))!=request['sourceActiveBooks'] or curation['expectedActiveBooks']!=request['targetActiveBooks'] or len({b['id'] for b in books})!=len(books) or len(active(books))!=request['targetActiveBooks']:raise ValueError('Wrong shelf count')
 pages=[]
 for b in books:
  before=previous.get(b['id'])
  if before and b!=before and not request['allowExistingChanges']:raise ValueError('Existing book changed')
  if b.get('archived'):
   if b!=before:raise ValueError('Archived book changed')
   continue
  if before and before['audioType']=='human':
   if [{k:v for k,v in p.items() if k!='tip'} for p in b['pages']]!=[{k:v for k,v in p.items() if k!='tip'} for p in before['pages']]:raise ValueError('Human source content changed')
  if b['audioType']!='generated':continue
  speaker=b['narration']['voiceId'];rate=b['narration'].get('speechRate',RATE)
  if speaker not in PROFILES or rate!=RATE:raise ValueError('Unapproved voice or rate')
  if before and before.get('narration',{}).get('voiceId')!=speaker:raise ValueError('Existing book voice changed')
  if not before:
   if speaker not in NEW_VOICES or speaker==CHARLIE:raise ValueError('New books must not use Charlie')
   if any(p['en']!=p.get('sourceText') for p in b['pages']):raise ValueError('New source English was changed')
   if b['source'].get('format')=='storyweaver-pdf-art-v1':validate_pdf_source(b,sources[b['id']])
   elif b['source'].get('format')=='bookdash-science-spreads-v1':validate_bookdash_source(b,sources[b['id']])
   else:validate_letsread_source(b,sources[b['id']])
  for i,p in enumerate(b['pages']):
   if not p['en'].strip():continue
   if p.get('sourceAudioTextSha256')==sha(p['en'].encode()) and p.get('sourceAudioSha256'):continue
   pages.append(dict(bookId=b['id'],pageIndex=i,text=p['en'],textSha256=sha(p['en'].encode()),speaker=speaker,speechRate=rate,status='not_submitted'))
 fingerprint=sha(json.dumps([(p['bookId'],p['pageIndex'],p['text'],p['speaker'],p['speechRate']) for p in pages],ensure_ascii=False,separators=(',',':')).encode())
 if (len(pages),fingerprint)!=(candidate['expectedPages'],candidate['sourceTextSha256']):raise ValueError('Recording jobs changed')
 return books,request,dict(version=2,requestId=request['id'],sourceCatalogueSha256=sha(raw),candidateSha256=request['candidateSha256'],sourceTextSha256=fingerprint,expectedPages=len(pages),characters=sum(len(p['text']) for p in pages),pages=pages)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--dry-run',action='store_true');parser.add_argument('--resume-only',action='store_true');parser.add_argument('--continue-unsubmitted',action='store_true');args=parser.parse_args()
 books,request,initial=plan()
 if args.dry_run:print(f"PASS pinned plan: {request['targetActiveBooks']} books, {initial['expectedPages']} recordings / {initial['characters']} characters; new books use Rowan, Charlotte, Knightley only");return
 key=os.environ.get('DOUBAO_SPEECH_API_KEY','').strip()
 if not key and not args.resume_only:raise ValueError('Speech secret missing')
 OUT.mkdir(parents=True,exist_ok=True);ledger_path=OUT/'production.json'
 if (args.resume_only or args.continue_unsubmitted) and not ledger_path.exists():raise ValueError('Requested checkpoint missing')
 ledger=json.loads(ledger_path.read_text()) if ledger_path.exists() else initial
 for field in ['requestId','sourceCatalogueSha256','candidateSha256','sourceTextSha256','expectedPages','characters']:
  if ledger.get(field)!=initial[field]:raise ValueError('Checkpoint differs from request')
 signature=lambda ps:[(p['bookId'],p['pageIndex'],p['textSha256'],p['speaker'],p['speechRate']) for p in ps]
 if signature(ledger['pages'])!=signature(initial['pages']):raise ValueError('Checkpoint pages changed')
 if args.resume_only and any(p['status']!='completed' for p in ledger['pages']):raise ValueError('Resume-only requires fully completed recordings')
 if any(p['status'] not in ['completed','not_submitted'] for p in ledger['pages']):raise ValueError('Earlier request outcome uncertain; no paid retry')
 write_json(ledger_path,ledger)
 for n,p in enumerate(ledger['pages'],1):
  file=OUT/p['bookId']/f"{p['pageIndex']+1:02d}.mp3";file.parent.mkdir(exist_ok=True)
  if p['status']=='completed':
   if not file.exists() or sha(file.read_bytes())!=p['sha256']:raise ValueError('Checkpoint audio changed')
   verify(file);continue
  reqid=str(uuid.uuid4());p.update(status='submitted',providerRequestId=reqid);write_json(ledger_path,ledger)
  params={'text':p['text'],'speaker':p['speaker'],'audio_params':{'format':'mp3','sample_rate':24000,'speech_rate':p['speechRate']}}
  if p['speaker']!=CHARLIE:
   accent='American' if PROFILES[p['speaker']]['locale']=='en-US' else 'British'
   params['additions']=json.dumps({'explicit_language':'en','context_texts':[f'Read in your natural {accent} English voice as a calm, friendly picture-book narrator. Use clear articulation and gentle expression. No music, sound effects or extra words.']})
  http=urllib.request.Request(core.ENDPOINT,data=json.dumps({'req_params':params}).encode(),method='POST',headers={'Content-Type':'application/json','X-Api-Key':key,'X-Api-Resource-Id':'seed-tts-2.0','X-Api-Request-Id':reqid,'X-Control-Require-Usage-Tokens-Return':'*'})
  try:
   with urllib.request.urlopen(http,timeout=90) as response:data,usage=core.read_audio(response)
  except urllib.error.HTTPError as e:raise ValueError(f'Speech HTTP {e.code}; no paid retry') from None
  except (TimeoutError,urllib.error.URLError):raise ValueError('Speech outcome uncertain; no paid retry') from None
  file.write_bytes(data);duration=verify(file);p.update(status='completed',sha256=sha(data),durationSeconds=round(duration,3),usage=usage);write_json(ledger_path,ledger)
  print(f"COMPLETE {n}/{len(ledger['pages'])} {p['bookId']} page {p['pageIndex']+1} / {PROFILES[p['speaker']]['name']}",flush=True)
 lookup={(p['bookId'],p['pageIndex']):p for p in ledger['pages']}
 for b in books:
  for i,p in enumerate(b['pages']):
   entry=lookup.get((b['id'],i))
   if not entry:continue
   name=f"audio/{i+1:02d}-{entry['sha256'][:16]}.mp3";target=ROOT/'public/books/library'/b['id']/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((OUT/b['id']/f'{i+1:02d}.mp3').read_bytes())
   p.update(audioFile=name,sourceAudio=f"https://vanesacoding.github.io/say-it-today/books/library/{b['id']}/{name}",sourceAudioSha256=entry['sha256'],sourceAudioTextSha256=entry['textSha256'],audioDurationSeconds=entry['durationSeconds'])
 generated='window.JIGU_BOOKS = '+json.dumps(books,ensure_ascii=False,indent=2)+';\n';(OUT/'catalog.generated.js').write_text(generated)
 ledger.update(status='all_audio_verified',billedCharacters=sum((p.get('usage') or {}).get('text_words',0) for p in ledger['pages']));write_json(ledger_path,ledger)
 (OUT/'CREDITS.txt').write_text('\n'.join(['Jigu AI narration; per-book native English voices, Seed TTS 2.0. Not original human recordings.']+[b['title']+' | '+'; '.join(b['source']['creators'])+' | '+b['source']['url']+' | '+b['source']['license'] for b in books if any(p['bookId']==b['id'] for p in ledger['pages'])])+'\n')
 CATALOG.write_text(generated);print(f"PASS verified {len(ledger['pages'])} recordings; {request['targetActiveBooks']} active books",flush=True)

if __name__=='__main__':
 try:main()
 except (ValueError,subprocess.CalledProcessError) as e:print('ERROR: '+(str(e) if isinstance(e,ValueError) else 'Audio verification failed'),file=sys.stderr);sys.exit(1)
