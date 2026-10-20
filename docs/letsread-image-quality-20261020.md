# Let’s Read source image quality audit — 2026-10-20

The first layout check verified completeness and framing, but did not establish high-DPI sharpness. User feedback identified this gap.

Official page image URLs, original-size image-serving URLs, English EPUBs and official portrait PDFs were inspected. PDF/EPUB images largely retain the same low-resolution art; rendering them at a larger size does not add detail. No AI redraw or synthetic upscaling is presented as an original HD source.

| Book | Narrowest reading image width | Widest reading image width |
| --- | ---: | ---: |
| Our Family | 389 | 596 |
| It is Shopping Time | 424 | 424 |
| Simple Counting | 389 | 389 |
| I Can See Clearly | 424 | 424 |
| What is Daddy Doing? | 424 | 424 |
| Chunu & Munu: The Corn Is Yummy! | 479 | 479 |
| Hide It | 424 | 424 |
| Shy Noy | 424 | 1200 |
| Seven Days | 424 | 439 |
| Different Occupations | 421 | 421 |

All ten books contain pages below a 2× density target at a 364 CSS-pixel reading width. Their inner-page sharpness remains unresolved pending genuinely higher-resolution source files or book replacement.

This patch fixes shelf framing only: Let’s Read covers use their actual original dimensions rather than a square container. Width/height attributes reserve space before loading, and the complete illustration fills its own frame without letterboxing, stretching or cropping. Audio, source English, page order, attribution and withdrawn-book policy remain unchanged.

Future admission must include full-page visual inspection at a 2× density target (source width >= 2 × displayed CSS width), with source-resolution exceptions explicitly reviewed before publication. Geometry checks alone cannot certify image quality.
