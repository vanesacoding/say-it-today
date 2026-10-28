"""Extract the reviewed front covers from eight back/front cover spreads."""
from pathlib import Path
import json, re
from PIL import Image

root = Path(__file__).resolve().parents[1]
curation_path = root / 'public/books/curation.js'
raw = curation_path.read_text(encoding='utf-8').split('=', 1)[1].strip().rstrip(';')
curation = json.loads(re.sub(r'([{,]\s*)(\w+)\s*:', r'\1"\2":', raw))
curation['covers'] = {}
for number in [23, 35, 43, 45, 48, 50, 53, 55]:
    book_id = f'heinemann-gk-{number:02}'
    with Image.open(root / 'public/books/library' / book_id / 'cover.jpg') as source:
        front = source.crop((source.width // 2, 0, source.width, source.height)).convert('RGB')
        target = root / 'public/books/covers' / f'{book_id}.webp'
        target.parent.mkdir(parents=True, exist_ok=True)
        front.save(target, quality=92, method=6)
        curation['covers'][book_id] = {'file': f'./books/covers/{book_id}.webp', 'width': front.width, 'height': front.height}
curation_path.write_text('window.JIGU_CURATION = ' + json.dumps(curation, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print('PASS eight reviewed front covers; original scans retained')
