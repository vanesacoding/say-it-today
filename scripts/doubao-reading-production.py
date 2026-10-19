"""Produce the approved Book Dash narration once, retaining page checkpoints."""
import argparse
from array import array
import hashlib
import importlib.util
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.reading-audio/doubao-production'
CATALOG = ROOT / 'public/books/catalog.js'
REQUEST = ROOT / 'scripts/doubao-production-request.json'
spec = importlib.util.spec_from_file_location('audition', ROOT / 'scripts/doubao-reading-audition.py')
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def verify(path):
    decoded = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1',
                              '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True)
    samples = array('h', decoded.stdout)
    if not samples or max(abs(sample) for sample in samples) < 64:
        raise ValueError('Recording is silent')
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                            '-of', 'json', str(path)], capture_output=True, text=True, check=True)
    duration = float(json.loads(probe.stdout)['format']['duration'])
    if not 0.25 < duration < 180:
        raise ValueError('Implausible page duration')
    return duration


def plan():
    raw = CATALOG.read_bytes()
    books = json.loads(raw.decode().removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'))
    request = json.loads(REQUEST.read_text())
    if request['speaker'] != core.DEFAULT_SPEAKER or request['approvedAuditionRunId'] != 39222587639:
        raise ValueError('Production voice differs from the approved audition')
    pages = [{'bookId': book['id'], 'pageIndex': index, 'text': page['en'],
              'textSha256': sha(page['en'].encode()), 'status': 'not_submitted'}
             for book in books if book['source']['name'] == 'Book Dash'
             for index, page in enumerate(book['pages']) if page['en'].strip()]
    fingerprint = sha(json.dumps([(p['bookId'], p['pageIndex'], p['text']) for p in pages],
                                 ensure_ascii=False, separators=(',', ':')).encode())
    if fingerprint != request['sourceTextSha256']:
        raise ValueError('Approved source text fingerprint changed')
    lookup = {(b['id'], i): (b, p) for b in books for i, p in enumerate(b['pages'])}
    for entry in pages:
        book, page = lookup[(entry['bookId'], entry['pageIndex'])]
        narration = book.get('narration', {})
        digest = page.get('sourceAudioSha256', '')
        name = f'audio/{entry["pageIndex"] + 1:02d}-{digest[:16]}.mp3'
        url = f'https://vanesacoding.github.io/say-it-today/books/library/{book["id"]}/{name}'
        if (narration.get('provider') == 'Volcengine' and narration.get('voiceId') == request['speaker']
                and narration.get('speechRate') == -8 and re.fullmatch('[a-f0-9]{64}', digest)
                and page.get('sourceAudioTextSha256') == entry['textSha256']
                and page.get('audioFile') == name and page.get('sourceAudio') == url):
            entry.update(status='published', reuseUrl=url, sha256=digest)
    characters = sum(len(page['text']) for page in pages)
    if len(set(page['bookId'] for page in pages)) != 13 or len(pages) != 150 or characters != 9252:
        raise ValueError('The approved 13-book source changed; review before submitting')
    return books, request, {'version': 1, 'requestId': request['id'],
                            'sourceCatalogueSha256': sha(raw), 'speaker': request['speaker'],
                            'speechRate': -8, 'characters': characters, 'pages': pages}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--resume-only', action='store_true', help='Require a complete saved batch; never synthesize')
    args = parser.parse_args()
    books, request, initial = plan()
    if args.dry_run:
        print(json.dumps({key: initial[key] for key in ['requestId', 'speaker', 'characters']}))
        print('13 books, 150 spoken pages; no provider called')
        return
    key = os.environ.get('DOUBAO_SPEECH_API_KEY', '').strip()
    if not key:
        raise ValueError('DOUBAO_SPEECH_API_KEY secret is missing')
    OUT.mkdir(parents=True, exist_ok=True)
    ledger_path = OUT / 'production.json'
    ledger = json.loads(ledger_path.read_text()) if ledger_path.exists() else initial
    for field in ['requestId', 'sourceCatalogueSha256', 'speaker', 'speechRate', 'characters']:
        if ledger[field] != initial[field]:
            raise ValueError('Checkpoint configuration differs from the current request')
    if [(p['bookId'], p['pageIndex'], p['textSha256']) for p in ledger['pages']] != [
            (p['bookId'], p['pageIndex'], p['textSha256']) for p in initial['pages']]:
        raise ValueError('Checkpoint pages differ from the approved source')
    if args.resume_only and any(p['status'] != 'completed' for p in ledger['pages']):
        raise ValueError('Resume-only publication requires all 150 completed checkpoints')
    write_json(ledger_path, ledger)
    for number, entry in enumerate(ledger['pages'], 1):
        checkpoint = OUT / entry['bookId'] / f'{entry["pageIndex"] + 1:02d}.mp3'
        checkpoint.parent.mkdir(exist_ok=True)
        if entry['status'] == 'completed':
            if not checkpoint.exists() or sha(checkpoint.read_bytes()) != entry['sha256']:
                raise ValueError('Completed checkpoint audio is missing or changed')
            verify(checkpoint)
            continue
        if entry['status'] == 'published':
            with urllib.request.urlopen(entry['reuseUrl'], timeout=90) as response:
                data = response.read()
            if sha(data) != entry['sha256']:
                raise ValueError('Published audio changed; no paid regeneration attempted')
            checkpoint.write_bytes(data)
            entry.update(status='completed', reused=True, durationSeconds=round(verify(checkpoint), 3),
                         usage={'text_words': 0})
            write_json(ledger_path, ledger)
            print(f'REUSED {number}/150 {entry["bookId"]}', flush=True)
            continue
        if entry['status'] != 'not_submitted':
            raise ValueError('An earlier request has an uncertain outcome; inspect usage before retrying')
        request_id = str(uuid.uuid4())
        entry.update(status='submitted', providerRequestId=request_id)
        write_json(ledger_path, ledger)
        payload = {'req_params': {'text': entry['text'], 'speaker': request['speaker'],
                                  'audio_params': {'format': 'mp3', 'sample_rate': 24000, 'speech_rate': -8}}}
        http = urllib.request.Request(core.ENDPOINT, data=json.dumps(payload).encode(), method='POST', headers={
            'Content-Type': 'application/json', 'X-Api-Key': key, 'X-Api-Resource-Id': 'seed-tts-2.0',
            'X-Api-Request-Id': request_id, 'X-Control-Require-Usage-Tokens-Return': '*'})
        try:
            with urllib.request.urlopen(http, timeout=90) as response:
                data, usage = core.read_audio(response)
        except urllib.error.HTTPError as error:
            raise ValueError(f'Speech HTTP {error.code}; production stopped without retry') from None
        except (TimeoutError, urllib.error.URLError):
            raise ValueError('Request outcome uncertain; production stopped without retry') from None
        checkpoint.write_bytes(data)
        duration = verify(checkpoint)
        entry.update(status='completed', sha256=sha(data), durationSeconds=round(duration, 3), usage=usage)
        write_json(ledger_path, ledger)
        print(f'COMPLETE {number}/150 {entry["bookId"]} page {entry["pageIndex"] + 1}', flush=True)

    lookup = {(p['bookId'], p['pageIndex']): p for p in ledger['pages']}
    credits = ['Jigu AI narration adaptation; Doubao Seed TTS 2.0, approved preset child voice.',
               'Original English texts and illustrations: Book Dash, CC BY 4.0.',
               'https://creativecommons.org/licenses/by/4.0/']
    for book in books:
        if book['source']['name'] != 'Book Dash':
            continue
        for index, page in enumerate(book['pages']):
            if not page['en'].strip():
                continue
            entry = lookup[(book['id'], index)]
            name = f'audio/{index + 1:02d}-{entry["sha256"][:16]}.mp3'
            target = ROOT / 'public/books/library' / book['id'] / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((OUT / book['id'] / f'{index + 1:02d}.mp3').read_bytes())
            page.update(audioFile=name,
                        sourceAudio=f'https://vanesacoding.github.io/say-it-today/books/library/{book["id"]}/{name}',
                        sourceAudioSha256=entry['sha256'], sourceAudioTextSha256=entry['textSha256'],
                        audioDurationSeconds=entry['durationSeconds'])
        book['audioType'] = 'generated'
        book['narration'] = {'kind': 'ai', 'provider': 'Volcengine', 'model': 'seed-tts-2.0',
                             'voice': '天才童声2.0', 'voiceId': request['speaker'], 'voiceType': 'preset',
                             'speechRate': -8, 'pitchRate': 0, 'approvedAuditionRunId': 39222587639,
                             'adaptation': 'AI narration produced by Jigu from the original English text.'}
        source = book['source']
        credits.extend([book['title'], '; '.join(source['creators']), source.get('publisherUrl', source['url'])])
    generated = 'window.JIGU_BOOKS = ' + json.dumps(books, ensure_ascii=False, indent=2) + ';\n'
    (OUT / 'catalog.generated.js').write_text(generated)
    (OUT / 'CREDITS.txt').write_text('\n'.join(credits) + '\n')
    ledger['status'] = 'all_audio_verified'
    ledger['billedCharacters'] = sum((p.get('usage') or {}).get('text_words', 0) for p in ledger['pages'])
    write_json(ledger_path, ledger)
    temporary = CATALOG.with_suffix('.tmp')
    temporary.write_text(generated)
    temporary.replace(CATALOG)
    print(f'PASS all 13 books / 150 pages; reported billed characters: {ledger["billedCharacters"]}', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, subprocess.CalledProcessError) as error:
        print(f'ERROR: {error if isinstance(error, ValueError) else "Audio verification failed"}', file=sys.stderr)
        sys.exit(1)
