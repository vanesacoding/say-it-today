"""Generate deployment-only Jenny recordings. MP3s are never committed to git."""
import argparse
import asyncio
import hashlib
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VOICE = "en-US-JennyNeural"
RATE = "-5%"


def audio_entries():
    existing = json.loads((ROOT / "src/data/visualAssets.json").read_text())
    cards = []
    for filename in ("vocabulary.json", "sentences.json", "advanced-sentences.json"):
        cards.extend(json.loads((ROOT / "src/data" / filename).read_text()))
    entries = {}
    for card in cards:
        if card["id"] in existing:
            continue
        digest = hashlib.sha256(f'{VOICE}|{RATE}|{card["word"]}'.encode()).hexdigest()[:12]
        entries[card["id"]] = {"text": card["word"], "file": f'{card["id"]}-{digest}.mp3'}
    return entries


async def generate(entries):
    import edge_tts
    # Trust the environment's configured CA without disabling TLS verification.
    if os.environ.get("SSL_CERT_FILE"):
        import edge_tts.communicate
        edge_tts.communicate._SSL_CTX.load_verify_locations(cafile=os.environ["SSL_CERT_FILE"])
    target = ROOT / "public/audio"
    target.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(3)

    async def save(entry):
        path = target / entry["file"]
        if path.exists() and path.stat().st_size > 2000:
            return
        async with semaphore:
            for attempt in range(3):
                try:
                    temporary = path.with_suffix(".part")
                    await asyncio.wait_for(edge_tts.Communicate(entry["text"], VOICE, rate=RATE).save(str(temporary)), 90)
                    if temporary.stat().st_size < 2000:
                        raise RuntimeError(f'Empty recording: {path.name}')
                    temporary.replace(path)
                    print(f'Generated {path.name}', flush=True)
                    return
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2 ** attempt)
    await asyncio.gather(*(save(entry) for entry in entries.values()))
    valid = {entry["file"] for entry in entries.values()}
    for path in target.glob("*.mp3"):
        if path.name not in valid:
            path.unlink()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest-only", action="store_true")
    args = parser.parse_args()
    entries = audio_entries()
    manifest = {"voice": VOICE, "rate": RATE, "entries": entries}
    (ROOT / "src/data/neural-audio.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    if not args.manifest_only:
        asyncio.run(generate(entries))
    print(f'{len(entries)} Jenny recordings in manifest')
