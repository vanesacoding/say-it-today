# Vocabulary and scene-sentence QA

Reference: uploaded 01-1000045315.mp4, 18.33 seconds, 720×1562. Contact sheet sampled every three seconds and visually inspected. The reference uses scenario illustrations, Chinese meaning, a sentence with a missing expression, a countdown, and a revealed highlighted answer. The app adapts this learning mechanism into its existing simple portrait card flow.

## Content and imagery

- 66 distinct words: 23 fruits, 23 vegetables, 20 kitchen objects.
- 24 full sentences: six each for buffet, cafe, travel/check-in, and everyday conversation. Each has a Chinese meaning, blank prompt, key expression, pronunciation and concise usage note.
- All 66 vocabulary photos replaced with Wikimedia Commons images; source native longest dimension is at least 640px. WebP output is 640×640, preserving aspect ratio with padding. Source author/license links are available in each card and docs/visual-assets.md.
- All photos inspected in a contact sheet. Orchard-only apricot, leafy fig, mixed-kiwi collage, small whisk/pan and unsuitable ladle sources were replaced. Rounded-square photo field preserves the complete subject.
- Sentence scenes use four original SVG cues: buffet counter, coffee cup, transport, conversation. They remain sharp at every display density.
- 90 prerecorded MP3 files decoded with ffprobe; all under the five-second reveal interval. Speech is neural synthesis, not human narration.

## Browser evidence

Local preview checked in Chrome at http://terminal.local:4173/, viewport 1363×936. The main column is 440px wide. Revealed vocabulary and sentence cards were captured and visually inspected. Typography remains compact: 20px title, 27px word, 23px sentence, 13–16px supporting text.

Verified vocabulary start/pause/reveal, topic picker, sentence blank before reveal, highlighted key expression after reveal, playback controls and sentence favorite list. No application console errors were observed; extension metadata errors originate outside the app.

## Automated validation

npm run check covers hidden answers, five-second reveal, pause/resume, audio source and slow rate, favorites, automatic advance, refresh recovery, six-card completion, unseen next batch, old expression favorites/counters, separate topic progress, cross-mode favorites and append-only deck expansion.

VITE_BASE_PATH=/say-it-today/ npm run build validates TypeScript and production bundling. Topic media chunks are separately precached and remain below Workbox's 2MiB individual-file limit.

## Remaining verification limits

Physical iOS/Android autoplay and installation were not tested. Explicit replay remains available if automatic audio is rejected by the browser. Small-screen CSS exists, but this report does not claim a physical-device test. Offline readiness was checked through generated precache coverage; airplane-mode behavior was not separately exercised.

## Publication audio adjustment
Existing 23 fruit recordings are reused from the already-public visualAssets.json unchanged. No new audio is uploaded. The 43 added words and 24 sentences use device English speech synthesis with normal/slow replay and a visible device-voice note. Voice quality depends on the device.
