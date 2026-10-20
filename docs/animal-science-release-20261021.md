# Animal observation books and shelf polish — 2026-10-21

This release adds two books to the existing 83. All existing book records and recordings remain byte-for-byte unchanged. The source catalogue, new-book shards, image hashes and 23 synthesis requests are pinned by the release plan. Only Rowan (American) and Charlotte (British) are used; no Charlie.

| Book | Stage | Focus | Narration |
|---|---|---|---|
| How do you sleep? / 动物怎样睡觉 | 短句共读 | Observe animal rest and sleeping positions | Charlotte, British |
| How do you eat? / 动物怎样吃东西 | 故事进阶 | Observe mouths, food and feeding actions | Rowan, American |

Both are animal-led concept picture books, framed by a child at the beginning and end. They are introductions to observation, not exhaustive zoology textbooks. Sleep contains calm dark bedtime opening/closing scenes; the animal scenes use turquoise, pink, yellow and green. Eat includes cartoon dung, insect eating, a snake and predation; no gore or jump scare. Egg was reviewed but not included in this batch.

## Source review

- https://bookdash.org/books/how-do-you-sleep/
- https://bookdash.org/books/how-do-you-eat/
- https://bookdash.org/re-using-the-book-dash-content/

The official original JPEGs were visually reviewed across all 24 story spreads. Original English is transcribed from the illustrations and only line breaks are merged. The final eating spread's circular sound words are read clockwise; no original words are omitted. Sleep's wordless opening remains wordless and is not synthesized. Covers, endpapers and publishing pages are excluded from the story sequence. Full source image bytes remain unchanged. Source PDF viewers returned HTTP 403 in this environment, so no PDF-read claim or PDF hash is supplied.

These are high-resolution landscape originals (short side at least 1024 pixels). The reader preserves the full spread using contain, with its actual aspect ratio. This is a deliberate exception to the previous portrait-source admission rule, confined to the reviewed science format: no animals are stretched or cropped. Common-phone screenshots must show art, English and companion guidance above the controls. It does not claim the landscape originals became square illustrations.

## Companion accuracy

Observation prompts ask parents to point, find or gesture, rather than test or memorize. English stays unchanged. Parent guidance distinguishes figurative wording and species limits: flight sleep is not universal in birds; octopus dreams are not established; echolocation concerns toothed whales and is not the same as singing. Child prompts do not recommend copying animal sleep, swallowing stones/soil, touching snakes or feeding wild animals.

Reference checks:
- Max Planck: https://www.mpg.de/10673637/frigatebirds-sleep
- Primary octopus sleep research: https://www.nature.com/articles/s41586-023-06203-4
- NOAA acoustics: https://www.fisheries.noaa.gov/new-england-mid-atlantic/science-data/marine-mammal-acoustics

## Product changes

- Remove the redundant full-art entry/dialog from already uncropped Let’s Read pages. The older original-spread viewer for books with actual mobile panels remains meaningful and unchanged.
- “看看5个” opens a five-word browse session with swipes, previous/next, progress and bounded ends. Browsing does not change memory ratings. Navigation appears before the illustration so users see it immediately.
- Interleave source groups round-robin, keeping deterministic ordering through filters, rerenders and shelf return.
- Square cover frames for every shelf card; portrait covers use cover fit and a reviewed 38% vertical position. Ten portrait cover crops were visually checked: no clipped faces or original title text. Interior images are unaffected.

Validation: existing content and vocabulary checks; new 24-page source/companion checks; release plan mutation guards; native five-word touch regression; all cover frames square; stable shelf ordering; source-preserving animal page screenshots at four viewports. Narration media is synthesized only after the reviewed plan is merged, then decoded and hashed before publication.

## Recording recovery

The first production run 39470803397 completed and verified all 23 recordings, then stopped before deployment because the legacy audio regression assumed every generated book starts with text. The regression now explicitly exercises two consecutive spoken pages and separately verifies a wordless opening without synthesizing it. Full checks passed locally against the generated 85-book catalogue.

Recovery pins the completed run in the request and restores its artifact with `--resume-only`. It verifies the same plan, page text, voices, file hashes and decoded audio; it makes no synthesis requests. Existing recordings remain unchanged.
