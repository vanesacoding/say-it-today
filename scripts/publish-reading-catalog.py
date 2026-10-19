"""Persist the verified catalogue after Pages deployment, with source guards."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
API = 'https://api.github.com/repos/vanesacoding/say-it-today'


def api(path, payload=None):
    token = os.environ['GITHUB_TOKEN']
    headers = {'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
               'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'JiguNarrationProduction'}
    request = urllib.request.Request(API + path, headers=headers,
                                     data=json.dumps(payload).encode() if payload else None,
                                     method='PUT' if payload else 'GET')
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--commit', action='store_true')
    parser.add_argument('--batch', choices=['doubao-production', 'mobile-production', 'charlie-production', 'library-50'], default='doubao-production')
    args = parser.parse_args()
    ledger = json.loads((ROOT / '.reading-audio' / args.batch / 'production.json').read_text())
    if ledger.get('status') != 'all_audio_verified' or len(ledger['pages']) != ledger.get('expectedPages', 150) or not ledger['pages'] or any(p.get('status') != 'completed' for p in ledger['pages']):
        raise ValueError('The complete recording set has not passed verification')
    head = api('/git/ref/heads/main')['object']['sha']
    if head != os.environ['GITHUB_SHA']:
        raise ValueError('Main changed during production; review the saved audio before deploying')
    current = api('/contents/public/books/catalog.js?ref=main')
    source = base64.b64decode(current['content'])
    if hashlib.sha256(source).hexdigest() != ledger['sourceCatalogueSha256']:
        raise ValueError('Remote source catalogue changed')
    generated = (ROOT / '.reading-audio' / args.batch / 'catalog.generated.js').read_bytes()
    if (ROOT / 'public/books/catalog.js').read_bytes() != generated:
        raise ValueError('Build catalogue differs from verified production output')
    if args.commit:
        result = api('/contents/public/books/catalog.js', {
            'message': 'Publish verified narration catalogue (' + args.batch + ')' ,
            'branch': 'main', 'sha': current['sha'], 'content': base64.b64encode(generated).decode()})
        print('Persisted verified catalogue commit ' + result['commit']['sha'])
    else:
        print('PASS source catalogue and main revision unchanged')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, urllib.error.URLError, KeyError) as error:
        print('ERROR: Catalogue publication guard failed; inspect workflow and current main', file=sys.stderr)
        sys.exit(1)
