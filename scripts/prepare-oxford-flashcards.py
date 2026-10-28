"""Restore the uploaded Oxford media bundle and verify every part before build."""
from pathlib import Path, PurePosixPath
import hashlib
import io
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "content" / "oxford-flashcards"
manifest = json.loads((BUNDLE / "manifest.json").read_text())
parts = []
for entry in manifest["parts"]:
    name = entry["file"]
    if Path(name).name != name:
        raise ValueError("Invalid bundle part path")
    payload = (BUNDLE / name).read_bytes()
    if len(payload) != entry["bytes"] or hashlib.sha256(payload).hexdigest() != entry["sha256"]:
        raise ValueError(f"Bundle part checksum mismatch: {name}")
    parts.append(payload)
payload = b"".join(parts)
if len(payload) != manifest["bytes"] or hashlib.sha256(payload).hexdigest() != manifest["sha256"]:
    raise ValueError("Complete bundle checksum mismatch")
destination = ROOT / "public" / "flashcards" / "oxford"
with zipfile.ZipFile(io.BytesIO(payload)) as archive:
    entries = archive.infolist()
    if len(entries) != manifest["entries"] or len({e.filename for e in entries}) != len(entries):
        raise ValueError("Unexpected flashcard media count")
    for entry in entries:
        path = PurePosixPath(entry.filename)
        if path.is_absolute() or ".." in path.parts or len(path.parts) != 2 or path.parts[0] not in {"images", "audio"}:
            raise ValueError("Invalid flashcard media path")
        target = destination.joinpath(*path.parts)
        target.parent.mkdir(parents=True, exist_ok=True)
        data = archive.read(entry)
        if not target.is_file() or target.read_bytes() != data:
            target.write_bytes(data)
print(f"Oxford flashcards: verified and restored {len(entries)} media files")
