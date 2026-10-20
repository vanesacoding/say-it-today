"""Make three checkpointed native-English samples. No automatic paid retries."""
import importlib.util,json,os,sys,urllib.request,urllib.error,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'.reading-audio/native-voices'
spec=importlib.util.spec_from_file_location('recordings',ROOT/'scripts/doubao-reading-production.py');recordings=importlib.util.module_from_spec(spec);spec.loader.exec_module(recordings)
sha,verify,write_json=recordings.sha,recordings.verify,recordings.write_json;core=recordings.core
PROFILES=[('Rowan','en_male_adam-imitation_uranus_bigtts','en-US','美式英语'),('Charlotte','en_female_authoritative-british_uranus_bigtts','en-GB','英式英语'),('Knightley','en_male_knightley_uranus_bigtts','en-GB','英式英语')]
def main():
 request=json.loads((ROOT/'scripts/native-voice-audition-request.json').read_text());books=json.loads((ROOT/'public/books/catalog.js').read_text().removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'))
 excerpts=[]
 for id,page in [('0087',0),('0248',4),('0248',7)]:
  b=next(b for b in books if b['id']==id);excerpts.append(dict(bookId=id,pageIndex=page,text=b['pages'][page]['en'],source=b['source']))
 text='\n\n'.join(e['text'] for e in excerpts)
 if len(text)>400:raise ValueError('Sample too long')
 OUT.mkdir(parents=True,exist_ok=True);ledger_path=OUT/'audition.json'
 ledger=json.loads(ledger_path.read_text()) if ledger_path.exists() else dict(requestId=request['id'],text=text,textSha256=sha(text.encode()),excerpts=excerpts,voices=[dict(name=name,speaker=speaker,locale=locale,accentLabel=label,status='not_submitted') for name,speaker,locale,label in PROFILES])
 if ledger['requestId']!=request['id'] or ledger['textSha256']!=sha(text.encode()):raise ValueError('Sample checkpoint changed')
 key=os.environ['DOUBAO_SPEECH_API_KEY'];write_json(ledger_path,ledger)
 for voice in ledger['voices']:
  path=OUT/(voice['name'].lower()+'.mp3')
  if voice['status']=='completed':
   if sha(path.read_bytes())!=voice['sha256']:raise ValueError('Saved sample changed')
   verify(path);continue
  if voice['status']!='not_submitted':raise ValueError('Earlier sample outcome uncertain; no paid retry')
  rid=str(uuid.uuid4());voice.update(status='submitted',providerRequestId=rid);write_json(ledger_path,ledger)
  accent='American English' if voice['locale']=='en-US' else 'British English'
  instruction=f'Read in your natural {accent} voice as a calm, friendly picture-book narrator. Use clear articulation and gentle expression. No music, sound effects or extra words.'
  payload={'req_params':{'text':text,'speaker':voice['speaker'],'audio_params':{'format':'mp3','sample_rate':24000,'speech_rate':-5},'additions':json.dumps({'explicit_language':'en','context_texts':[instruction]})}}
  req=urllib.request.Request(core.ENDPOINT,data=json.dumps(payload).encode(),method='POST',headers={'Content-Type':'application/json','X-Api-Key':key,'X-Api-Resource-Id':'seed-tts-2.0','X-Api-Request-Id':rid,'X-Control-Require-Usage-Tokens-Return':'*'})
  try:
   with urllib.request.urlopen(req,timeout=90) as response:data,usage=core.read_audio(response)
  except urllib.error.HTTPError as e:raise ValueError(f'Sample HTTP {e.code}; no retry') from None
  except (TimeoutError,urllib.error.URLError):raise ValueError('Sample result uncertain; no retry') from None
  path.write_bytes(data);duration=verify(path);voice.update(status='completed',sha256=sha(data),durationSeconds=round(duration,3),usage=usage);write_json(ledger_path,ledger);print('PASS sample '+voice['name']+' '+voice['locale'],flush=True)
 ledger['status']='all_audio_verified';write_json(ledger_path,ledger)
 (OUT/'CREDITS.txt').write_text('\n'.join(['Jigu AI samples; attributed English source excerpts; CC BY 4.0.']+[e['source']['url']+' | '+'; '.join(e['source']['creators'])+' | '+e['source']['license'] for e in excerpts])+'\n')
if __name__=='__main__':
 try:main()
 except Exception as e:print('ERROR: '+str(e) if isinstance(e,ValueError) else 'ERROR: sample failed; inspect completed checkpoint before retrying',file=sys.stderr);sys.exit(1)
