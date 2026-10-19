"""Generate one source-matched audition using a GitHub Actions secret.

The fixed endpoint receives only the public English excerpts and the API key.
No automatic retries: a timed-out request may already have incurred usage.
"""
import argparse
import base64
from array import array
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional'
DEFAULT_SPEAKER = 'zh_male_tiancaitongsheng_uranus_bigtts'


def source_sample():
    raw = (ROOT / 'public/books/catalog.js').read_text()
    books = json.loads(raw.removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'))
    selected = []
    for book_id, page_index in [('come-back-cat', 0), ('come-back-cat', 6), ('sleepy-mr-sloth', 1)]:
        book = next(book for book in books if book['id'] == book_id)
        text = book['pages'][page_index]['en']
        if not text.strip():
            raise ValueError('Audition source page has no English text')
        selected.append({'bookId': book_id, 'title': book['title'], 'pageIndex': page_index,
                         'text': text, 'source': book['source']})
    return '\n\n'.join(item['text'] for item in selected), selected


def read_audio(lines):
    audio = bytearray()
    usage = None
    complete = False
    for raw in lines:
        line = raw.decode('utf-8').strip() if isinstance(raw, bytes) else raw.strip()
        if not line or line.startswith(('event:', ':')):
            continue
        if line.startswith('data:'):
            line = line[5:].strip()
        if line == '[DONE]':
            break
        frame = json.loads(line)
        code = frame.get('code')
        if code == 20000000:
            usage = frame.get('usage')
            complete = True
            break
        if code != 0:
            # Provider messages are omitted: they can contain request details.
            raise ValueError(f'Speech provider rejected the request (code {code})')
        if frame.get('data'):
            audio.extend(base64.b64decode(frame['data'], validate=True))
        if len(audio) > 10_000_000:
            raise ValueError('Audition exceeded the maximum audio size')
    if not complete:
        raise ValueError('Incomplete speech stream; no audition published')
    if len(audio) < 600 or not (audio[:3] == b'ID3' or audio[0] == 255 and audio[1] & 224 == 224):
        raise ValueError('Completed response did not contain an MP3')
    return bytes(audio), usage


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--speaker', default=DEFAULT_SPEAKER)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--rate', type=int, choices=range(-20, 21), default=-8)
    parser.add_argument('--variant', choices=['english-natural', 'english-gentle'])
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', args.speaker):
        raise ValueError('Invalid voice ID')
    text, selected = source_sample()
    if len(text) > 500:
        raise ValueError('Audition is limited to 500 characters')
    payload = {'req_params': {'text': text, 'speaker': args.speaker,
                              'audio_params': {'format': 'mp3', 'sample_rate': 24000,
                                               'speech_rate': args.rate}}}
    if args.dry_run:
        print(json.dumps({'characters': len(text), 'payload': payload}, ensure_ascii=False))
        return
    key = os.environ.get('DOUBAO_SPEECH_API_KEY', '').strip()
    if not key:
        raise ValueError('Add the DOUBAO_SPEECH_API_KEY repository secret before running this workflow')
    request_id = str(uuid.uuid4())
    request = urllib.request.Request(ENDPOINT, data=json.dumps(payload).encode(), method='POST', headers={
        'Content-Type': 'application/json', 'X-Api-Key': key,
        'X-Api-Resource-Id': 'seed-tts-2.0', 'X-Api-Request-Id': request_id,
        'X-Control-Require-Usage-Tokens-Return': '*',
    })
    # Never log request headers, credential values, or response error bodies.
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            data, usage = read_audio(response)
    except urllib.error.HTTPError as error:
        raise ValueError(f'Speech HTTP {error.code}; check service access, voice permission and balance') from None
    except (TimeoutError, urllib.error.URLError):
        raise ValueError('Speech request interrupted; check provider usage before rerunning') from None
    out = ROOT / '.reading-audio/doubao-audition'
    if args.variant:
        out = out / args.variant
    out.mkdir(parents=True, exist_ok=True)
    staging = out / 'audition.tmp.mp3'
    staging.write_bytes(data)
    decoded = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(staging), '-ac', '1',
                              '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True)
    samples = array('h', decoded.stdout)
    if not samples or max(abs(sample) for sample in samples) < 64:
        raise ValueError('Audition is silent')
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                            '-of', 'json', str(staging)], capture_output=True, text=True, check=True)
    duration = float(json.loads(probe.stdout)['format']['duration'])
    if not 1 < duration < 90:
        raise ValueError('Implausible audition duration')
    staging.replace(out / 'audition.mp3')
    metadata = {'provider': 'Volcengine', 'model': 'seed-tts-2.0', 'speaker': args.speaker,
                'speechRate': args.rate, 'text': text, 'characters': len(text), 'usage': usage,
                'durationSeconds': duration, 'requestId': request_id,
                'sha256': hashlib.sha256(data).hexdigest(),
                'textSha256': hashlib.sha256(text.encode()).hexdigest(), 'excerpts': selected}
    (out / 'audition.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
    credits = ['Jigu AI narration audition. Not the original human recording.',
               'AI audio adaptation of excerpts originally published by Book Dash.',
               'Source text license: CC BY 4.0 https://creativecommons.org/licenses/by/4.0/']
    seen = set()
    for item in selected:
        if item['bookId'] in seen:
            continue
        seen.add(item['bookId'])
        source = item['source']
        credits.extend([item['title'], '; '.join(source['creators']), source.get('publisherUrl', source['url'])])
    (out / 'CREDITS.txt').write_text('\n'.join(credits) + '\n')
    print(f'PASS audition: {len(text)} source characters, {duration:.1f}s, decoded non-silent MP3')
    print('Output contains only MP3, source credits and non-secret generation metadata.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, subprocess.CalledProcessError) as error:
        print(f'ERROR: {error if isinstance(error, ValueError) else "Audio decode failed"}', file=sys.stderr)
        sys.exit(1)
