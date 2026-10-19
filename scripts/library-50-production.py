"""Produce the approved 30-book expansion with Charlie B and immutable checkpoints."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.reading-audio/library-50'
CATALOG = ROOT / 'public/books/catalog.js'
REQUEST = ROOT / 'scripts/library-50-request.json'
SPEAKER = 'ICL_uranus_en_female_charlie_tob'
RATE = -5
AUDITION = 39233953938
spec = importlib.util.spec_from_file_location('recordings', ROOT / 'scripts/doubao-reading-production.py')
recordings = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recordings)
core = recordings.core
sha, write_json, verify = recordings.sha, recordings.write_json, recordings.verify

def plan():
    raw = CATALOG.read_bytes()
    request = json.loads(REQUEST.read_text())
    candidate_bytes = (ROOT / 'scripts/library-50-candidate.json').read_bytes()
    if sha(candidate_bytes) != request['candidateSha256']:
        raise ValueError('Candidate differs from the approved expansion request')
    candidate = json.loads(candidate_bytes)
    if (candidate['speaker'], candidate['speechRate'], candidate['approvedAuditionRunId']) != (SPEAKER, RATE, AUDITION):
        raise ValueError('Voice differs from the approved Charlie B audition')
    if sha(raw) != request['sourceCatalogueSha256'] or sha(raw) != candidate['sourceCatalogueSha256']:
        raise ValueError('Source catalogue changed; no synthesis submitted')
    original = json.loads(raw.decode().removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'))
    selected = candidate['books']
    existing = {b['id'] for b in original}
    if len(selected) != 30 or any(b['id'] in existing for b in selected):
        raise ValueError('Expansion contains duplicates or wrong book count')
    if [b['id'] for b in selected] != candidate['newBookIds'] or len(set(candidate['newBookIds'])) != 30:
        raise ValueError('Book selection changed')
    if len([b for b in original if not b.get('archived')]) != 20 or request['targetActiveBooks'] != 50:
        raise ValueError('Expected current and expanded shelf sizes changed')
    books = original + selected
    pages = [{'bookId': b['id'], 'pageIndex': i, 'text': p['en'],
              'textSha256': sha(p['en'].encode()), 'status': 'not_submitted'}
             for b in selected for i, p in enumerate(b['pages']) if p['en'].strip()]
    fingerprint = sha(json.dumps([(p['bookId'], p['pageIndex'], p['text']) for p in pages],
                                 ensure_ascii=False, separators=(',', ':')).encode())
    if (len(pages), sum(len(p['text']) for p in pages), fingerprint) != (
            candidate['expectedPages'], candidate['characters'], candidate['sourceTextSha256']):
        raise ValueError('Approved source text changed')
    request = {**candidate, **request, 'bookIds': candidate['newBookIds']}
    return books, request, {
        'version': 1, 'requestId': request['id'], 'sourceCatalogueSha256': sha(raw),
        'sourceTextSha256': fingerprint, 'speaker': SPEAKER, 'speechRate': RATE,
        'expectedPages': len(pages), 'characters': candidate['characters'], 'pages': pages
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--resume-only', action='store_true')
    args = parser.parse_args()
    books, request, initial = plan()
    if args.dry_run:
        print(f"PASS plan: 30 new books, {initial['expectedPages']} pages, {initial['characters']} characters, Charlie B rate -5; 20 current books untouched")
        return
    key = os.environ.get('DOUBAO_SPEECH_API_KEY', '').strip()
    if not key and not args.resume_only:
        raise ValueError('Speech repository secret is missing')
    OUT.mkdir(parents=True, exist_ok=True)
    ledger_path = OUT / 'production.json'
    ledger = json.loads(ledger_path.read_text()) if ledger_path.exists() else initial
    for field in ['requestId', 'sourceCatalogueSha256', 'sourceTextSha256', 'speaker',
                  'speechRate', 'expectedPages', 'characters']:
        if ledger.get(field) != initial[field]:
            raise ValueError('Checkpoint differs from this approved batch')
    if [(p['bookId'], p['pageIndex'], p['textSha256']) for p in ledger['pages']] != [
            (p['bookId'], p['pageIndex'], p['textSha256']) for p in initial['pages']]:
        raise ValueError('Checkpoint source pages changed')
    if args.resume_only and any(p['status'] != 'completed' for p in ledger['pages']):
        raise ValueError('Resume-only requires all completed recordings; no synthesis attempted')
    write_json(ledger_path, ledger)
    for number, entry in enumerate(ledger['pages'], 1):
        file = OUT / entry['bookId'] / f"{entry['pageIndex']+1:02d}.mp3"
        file.parent.mkdir(exist_ok=True)
        if entry['status'] == 'completed':
            if not file.exists() or sha(file.read_bytes()) != entry['sha256']:
                raise ValueError('Saved audio missing or changed')
            verify(file)
            continue
        if entry['status'] != 'not_submitted':
            raise ValueError('Earlier request outcome uncertain; stopped without paid retry')
        request_id = str(uuid.uuid4())
        entry.update(status='submitted', providerRequestId=request_id)
        write_json(ledger_path, ledger)
        payload = {'req_params': {
            'text': entry['text'], 'speaker': SPEAKER,
            'audio_params': {'format': 'mp3', 'sample_rate': 24000, 'speech_rate': RATE}
        }}
        http = urllib.request.Request(core.ENDPOINT, data=json.dumps(payload).encode(),
            method='POST', headers={'Content-Type': 'application/json', 'X-Api-Key': key,
            'X-Api-Resource-Id': 'seed-tts-2.0', 'X-Api-Request-Id': request_id,
            'X-Control-Require-Usage-Tokens-Return': '*'})
        try:
            with urllib.request.urlopen(http, timeout=90) as response:
                data, usage = core.read_audio(response)
        except urllib.error.HTTPError as error:
            raise ValueError(f'Speech HTTP {error.code}; stopped without paid retry') from None
        except (TimeoutError, urllib.error.URLError):
            raise ValueError('Speech request outcome uncertain; stopped without paid retry') from None
        file.write_bytes(data)
        duration = verify(file)
        entry.update(status='completed', sha256=sha(data),
                     durationSeconds=round(duration, 3), usage=usage)
        write_json(ledger_path, ledger)
        print(f"COMPLETE {number}/{initial['expectedPages']} {entry['bookId']} page {entry['pageIndex']+1}", flush=True)
    lookup = {(p['bookId'], p['pageIndex']): p for p in ledger['pages']}
    credits = ['Jigu AI narration adaptation; Doubao Seed TTS 2.0.',
               'User-approved Charlie 2.0 American English, variant B, speech rate -5.',
               'Not the original human recording. Original human narration retained separately.']
    for book in books:
        if book['id'] not in request['bookIds']:
            continue
        for index, page in enumerate(book['pages']):
            if not page['en'].strip():
                continue
            entry = lookup[(book['id'], index)]
            name = f"audio/{index+1:02d}-{entry['sha256'][:16]}.mp3"
            target = ROOT / 'public/books/library' / book['id'] / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((OUT / book['id'] / f'{index+1:02d}.mp3').read_bytes())
            page.update(audioFile=name,
                sourceAudio=f"https://vanesacoding.github.io/say-it-today/books/library/{book['id']}/{name}",
                sourceAudioSha256=entry['sha256'], sourceAudioTextSha256=entry['textSha256'],
                audioDurationSeconds=entry['durationSeconds'])
        book['narration'] = {
            **book.get('narration', {}), 'kind': 'ai', 'provider': 'Volcengine',
            'model': 'seed-tts-2.0', 'voice': 'Charlie 2.0 美式英语（轻柔慢速）',
            'voiceId': SPEAKER, 'voiceType': 'preset', 'speechRate': RATE, 'pitchRate': 0,
            'approvedAuditionRunId': AUDITION, 'approvedVariant': 'english-gentle',
            'adaptation': 'AI narration produced by Jigu from the attributed English text.'
        }
        source = book['source']
        credits.extend([book['title'], '; '.join(source['creators']), source['url'], source['license']])
    original = json.loads(CATALOG.read_text().removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'))
    for before, after in zip(original, books):
        if before['id'] not in request['bookIds'] and before != after:
            raise ValueError('An unselected or human-narrated book changed')
    generated = 'window.JIGU_BOOKS = ' + json.dumps(books, ensure_ascii=False, indent=2) + ';\n'
    (OUT / 'catalog.generated.js').write_text(generated)
    (OUT / 'CREDITS.txt').write_text('\n'.join(credits) + '\n')
    ledger.update(status='all_audio_verified',
        billedCharacters=sum((p.get('usage') or {}).get('text_words', 0) for p in ledger['pages']))
    write_json(ledger_path, ledger)
    temporary = CATALOG.with_suffix('.tmp')
    temporary.write_text(generated)
    temporary.replace(CATALOG)
    print(f"PASS all 30 new books / {len(ledger['pages'])} recordings; reported characters: {ledger['billedCharacters']}", flush=True)

if __name__ == '__main__':
    try:
        main()
    except (ValueError, subprocess.CalledProcessError) as error:
        print('ERROR: ' + (str(error) if isinstance(error, ValueError) else 'Audio verification failed'), file=sys.stderr)
        sys.exit(1)

