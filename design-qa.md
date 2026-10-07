# Say It Today redesign QA

final result: passed

## Evidence
- Selected visual truth: ../generated_images/exec-2510d283-18b2-4e94-8893-67dedb4a9687.png (third displayed concept, selected by user).
- Browser-rendered implementation: /workspace/scratch/say-it-today-layout-final.jpg.
- Full comparison: /workspace/scratch/say-it-today-comparison-final.jpg.
- Initial comparison: /workspace/scratch/say-it-today-comparison-first.jpg.
- Viewports: actual browser iframe viewports 390 × 844 and 320 × 844; desktop preview 1363 × 936. The existing PWA was modified in place, without a new mobile template.
- Source: 853 × 1844 pixels, normalized to 390 × 844. Implementation: 1363 × 936 screenshot, 390 × 844 app region extracted at x≈307, y=30. No device bezel is included in either comparison. Density normalized to CSS pixel scale 1.
- State: everyday advanced, first sentence, answer revealed, auto-next disabled. English and Chinese content match the selected concept. The secondary 320px frame uses the same content.
- Full view and text/control region were inspected together in the normalized comparison image. The 780px-wide comparison is readable without separate enlarged crops.

## Comparison history
1. First capture: P1 — primary action below the mobile viewport (controls y≈843..971 on 390px and y≈826..954 on 320px). P2 — explanation density and header spacing moved the audio and primary action below the source's hierarchy.
2. Fixes: shorten the preview explanation; place detailed usage and the new follow-up question in expandable sections; reduce header spacing; move sentence IPA inside usage; enlarge English type to 25px; make the footer sticky to keep the primary action reachable.
3. Final capture: primary action visible within both 844px viewports, no horizontal overflow (scrollWidth equals 390/320). English focus highlight, cream/olive palette, audio controls, heart action and compact progress now match the selected direction. Added pause, usage detail and follow-up affordances are intentional functional additions, rather than mock fidelity defects.

## Required surfaces
- Typography: system sans fonts match the reference's sans direction, readable Chinese prompt and larger English phrase. English 25px/1.5 at 390px, 22px/1.5 at 320px. Text wraps without truncation. Minor Chinese fallback-weight differences are P3.
- Spacing/layout: same open page surface, generous but useful spacing, two modes and compact progress, no nested practice panels. Sticky footer remains accessible with longer content.
- Colors/tokens: cream #f6f4ec, ink #303b2d, olive #4c5f3f, sage #e0e3cb; foregrounds remain distinct. Muted hints are intentionally secondary.
- Images/icons: retained licensed 640 × 640 word photographs (natural dimensions checked in browser). Standard Phosphor icons replace the old handcrafted scene illustration; play and heart visually match the selected design. No new raster asset is required by the selected screen.
- Copy/content: 66 words, 24 basic expressions, 24 upper-intermediate expressions targeting learners around IELTS 6.5. This is a practice difficulty target, not automated assessment or a guaranteed score. Follow-ups ask learners to explain reasons, compare alternatives or give examples.

## Functional verification
- Real Jenny sentence MP3 decoded in the browser: duration 5.952s, readyState 4, no media error. Slow replay: playbackRate 0.8, paused=false immediately after clicking.
- Browser: hidden answer → revealed sentence, follow-up expansion, favorite → favorites → return, basic/advanced topic switching, vocabulary switching, 640px image decoding.
- Automated tests: long audio blocks auto advance until ended; favorites, 8-second advanced reveal, separate level progress, refresh restore, old favorites, and existing database/SRS behavior.
- Console reviewed: reported errors originate from the cloud browser extension content script, not the app; no app-source error observed.
- Production build and MP3 integrity/manifest verification pass. CI audio generation is a deployment-specific check to complete on publication.

## Findings and follow-up
No actionable P0/P1/P2 findings remain. P3: the system Chinese font varies slightly by device; actual phone audio output should be compared by the user after publication because automated verification establishes decoding/playback, not perceived timbre.

## Implementation checklist
- [x] Implement selected third direction in existing PWA.
- [x] Keep generated MP3s out of git; distribute through deployment artifacts.
- [x] Use Jenny for added words and all sentences.
- [x] Preserve existing progress and favorites; separate basic and advanced decks.
- [x] Verify mobile layouts, core interactions, media decoding, tests and production build.
