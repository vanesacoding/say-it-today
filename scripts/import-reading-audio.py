"""Import completed, source-matched recordings atomically, one whole book at a time.

Usage: python3 scripts/import-reading-audio.py .reading-audio/higgsfield-production.json BOOK_ID
The private ledger contains returned generation URLs, never API credentials.
"""
import hashlib
import json
from array import array
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request

root = Path(__file__).resolve().parents[1]
catalog = root / 'public/books/catalog.js'
ledger_path, book_id = sys.argv[1:]
ledger = json.loads(Path(ledger_path).read_text())
books = json.loads(catalog.read_text().removeprefix('window.JIGU_BOOKS = ').strip().removesuffix(';'))
book = next(book for book in books if book['id'] == book_id)
record = next(record for record in ledger['books'] if record['id'] == book_id)
voice = ledger['voice']
entries = {entry['pageIndex']: entry for entry in record['pages']}
spoken = {index for index, page in enumerate(book['pages']) if page['en'].strip()}
if set(entries) != spoken:
    raise SystemExit('Ledger must contain exactly the spoken pages of the whole book')
if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
    raise SystemExit('ffmpeg and ffprobe are required to verify every recording')
pending = []
for index in sorted(spoken):
    page, entry = book['pages'][index], entries[index]
    if entry.get('status') != 'completed' or not entry.get('result_url', '').startswith('https://'):
        raise SystemExit(f'Page {index + 1} has no completed audio; catalogue unchanged')
    if entry.get('text') != page['en']:
        raise SystemExit(f'Page {index + 1} text changed after generation; catalogue unchanged')
    target = root / 'public/books/library' / book_id / 'audio' / f'{index + 1:02d}.mp3'
    target.parent.mkdir(parents=True, exist_ok=True)
    # Reuse only bytes downloaded from this exact completed generation.
    source_id = hashlib.sha256(entry['result_url'].encode()).hexdigest()[:12]
    cache = ledger_path + f'.{book_id}.{index}.{source_id}.mp3'
    cache = Path(cache)
    if cache.exists():
        data = cache.read_bytes()
    else:
        with urllib.request.urlopen(entry['result_url'], timeout=40) as response:
            data = response.read()
        cache.write_bytes(data)
    if len(data) < 600 or not (data[:3] == b'ID3' or data[0] == 255 and data[1] & 224 == 224):
        raise SystemExit(f'Page {index + 1} is not an MP3')
    decoded = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(cache), '-ac', '1', '-ar', '16000',
                              '-f', 's16le', '-'], capture_output=True, check=True)
    samples = array('h', decoded.stdout)
    if not samples or max(abs(sample) for sample in samples) < 64:
        raise SystemExit(f'Page {index + 1} is silent; catalogue unchanged')
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                            '-of', 'json', str(cache)], capture_output=True, text=True, check=True)
    duration = float(json.loads(probe.stdout)['format']['duration'])
    if not 0.3 < duration < 180:
        raise SystemExit(f'Page {index + 1} has an implausible duration: {duration}')
    pending.append((page, target, data, entry, duration))

# Nothing is advertised as AI narration until every spoken page has passed.
for page, target, data, entry, duration in pending:
    target.write_bytes(data)
    page['sourceAudio'] = entry['result_url']
    page['sourceAudioSha256'] = hashlib.sha256(data).hexdigest()
    page['sourceAudioTextSha256'] = hashlib.sha256(page['en'].encode()).hexdigest()
    page['audioDurationSeconds'] = round(duration, 3)
book['audioType'] = 'generated'
if record.get('sourceCreators'):
    book['source']['creators'] = record['sourceCreators']
book['narration'] = {
    'kind': 'ai', 'provider': 'Higgsfield', 'model': voice['model'], 'voice': 'Isla',
    'voiceId': voice['voice_id'], 'voiceType': voice['voice_type'],
    'speechRate': voice['speech_rate'], 'pitchRate': voice['pitch_rate'],
    'adaptation': 'AI narration produced by Jigu from the original English text.',
}
temporary = catalog.with_suffix('.tmp')
temporary.write_text('window.JIGU_BOOKS = ' + json.dumps(books, ensure_ascii=False, indent=2) + ';\n')
temporary.replace(catalog)
print(f'PASS {book_id}: {len(pending)} decoded MP3s, exact source text and SHA256 recorded; whole book imported')
