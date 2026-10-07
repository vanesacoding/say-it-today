# Visual quiz design QA

Source: uploaded 1000045314.mp4, frame at 5 seconds, learning region x=0,y=483,w=720,h=407. Source frame /tmp/video-reference/frame.png.
Implementation: /workspace/scratch/say-it-today-visual-qa-final.jpg, browser-rendered local preview at http://terminal.local:4173/.
Viewport: 1363 × 936 CSS pixels, 1× screenshot density. Existing responsive PWA main column is 440px wide; learning stage is 396 × 416px. Source learning region normalized proportionally to 396 × 224px. Comparison: /tmp/video-reference/comparison.jpg.
State: first fruit (jackfruit), revealed, playback paused.

## Findings
No actionable P0/P1/P2 findings within the agreed adaptation: the video's learning mechanism and teal picture stage are used in the existing portrait PWA, rather than reproducing its surrounding video-player interface.

- Typography: system sans font, 21px question, 27px answer, 14px Chinese and 13px IPA. Reduced answer size responds to the user's oversized-font feedback. Text fits without truncation.
- Layout: same question → real fruit → Chinese/English/IPA sequence, plus countdown line. Intentional taller portrait layout with larger identifiable fruit. Controls fit within the tested viewport. Small-width CSS reduces image and spacing.
- Colors: teal learning background, white answer and white circular image field match the reference direction. Warm existing app canvas and green controls are preserved.
- Imagery: jackfruit is the supplied reference fruit cropped before Chinese text appears; image loads at 232px natural width. Remaining 22 actual fruit photographs visually checked in a contact sheet for matching labels. No decorative unrelated photography.
- Copy: What is this?, matching fruit labels and pronunciation, one optional-looking sample sentence. The main flow has no choice options, grading gate, settings page or practice form.

## Interaction evidence
Browser: start, pause, early reveal, replay pronunciation and reveal screen checked; image load verified; no application console errors (browser-extension metadata errors excluded).
React/IndexedDB checks: 5-second reveal, paused clock, automatic next, normal/slow audio, favorite list, current-card reload, six-card completion, next fresh batch, prior expression favorites and learning counters preserved.
Audio: 23 MP3s decoded with ffprobe, each between 0.2 and 5 seconds. Pre-generated neural voice; not human narration. All bundled in visualAssets.json and included in the offline-cached application bundle.
Build: npm run check and VITE_BASE_PATH=/say-it-today/ npm run build passed.

## Comparison history
Initial source and revealed implementation combined in the same comparison image. No visual P0/P1/P2 fixes required. Browser screenshot captures were repeated after repaint to obtain the matching revealed state; stale pre-reveal frames were excluded.

## Follow-up polish
P3: the open-source fruit photographs are low-resolution training photos. Higher-resolution product photography would improve sharpness on larger displays.
Residual gap: physical iOS/Android audio autoplay policy was not tested. Explicit “听发音” replay is available if the browser rejects automatic playback.

## Implementation checklist
- [x] Reference captured and viewed
- [x] Implementation captured and viewed
- [x] Combined full learning-region comparison
- [x] Focused fruit, label and IPA inspected at readable scale
- [x] Core flow and persistence checked
- [x] Browser console checked

final result: passed
