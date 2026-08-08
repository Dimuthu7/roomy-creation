# Asset manifest — generated atmosphere images

Every file listed here is **AI-generated atmosphere photography**, not a photograph of
real Roomy Creations work. That distinction is the reason these were allowed to be
generated at all: they set a look and a quality level, they do not claim "this is a job
we did". Anything that would make that claim — the 24 gallery slots in `public/work/` —
must be a real photograph of a real installation and is never generated.

Generated 2026-08-08 via Higgsfield MCP, Basic plan.

## Scope note

The original Task 16 brief assumed 14 images (a master, five room scenes, five detail
shots, three cutouts). The sections it expected to place them in — Position, WhatWeMake,
Materials, HowWeWork — were built in Tasks 12 and 14 using the weave SVG graphics and
typography instead, and reference no images at all. Only `Hero.tsx` has image slots, so
only two images were generated. Generating the other twelve would have produced files
nothing on the site references.

## Files

| File | Slot | Model | Job ID | Cost |
|---|---|---|---|---|
| `public/media/hero-master.jpg` | Hero backdrop | nano_banana_pro | `7f77ff29-8a07-4006-9cd9-3b2e362fd2cc` | 2 credits |
| `public/media/cutout-sofa.png` | Hero foreground cutout | nano_banana_pro | `5851e68f-be92-4485-a992-8dc877969ea7` | 2 credits |
| ↳ background removal | — | image_background_remover | `dbe53eef-fb87-4e2d-8b95-a242ab4466ed` | 1 credit |

Total spend including two discarded cutout attempts: **11 credits**.

### hero-master.jpg

2752×1536 (1.79:1), 380KB JPEG, quality 82 mozjpeg with 4:4:4 chroma. Source PNG was
7.4MB; the JPEG is what ships because this is the LCP element.

Carries the global photographic direction: bright even daylight in a contemporary
apartment, cool-neutral white balance, matte handleless cabinetry in white and soft grey
with wood-grain board, upholstered fabric seating, polished cement flooring, one
deliberate deep-blue textile note, wide lens, no HDR, no orange grade, no rustic props,
no exposed rough timber. The prompt also asked for clear space at the far left and right
edges, because the hero is `object-cover` and those edges are what an ultrawide viewport
crops into.

No separate `.webp` is committed. `Hero.tsx` uses `next/image`, which negotiates
AVIF/WebP from the JPEG at request time — a hand-built WebP would be a file nothing
references.

### cutout-sofa.png

1350×900 (3:2), 1.5MB PNG with a real alpha channel, subject anchored to the bottom of
the canvas because Hero pins it to `bottom-0`.

**Two attempts were discarded, and the reason is worth keeping.** The first passed
`hero-master` as a reference image so the fabric tone would match; the reference bled
through as a ghosted room behind the sofa, and where that haze met the top of the
backrest the matte could not find an edge — the cutout came back with a torn, smoky
halo. The second dropped the reference but still asked for a *modular* sofa, and the
model rendered one chaise section semi-transparent, which the matte faithfully preserved
as a milky rectangle. The word "modular" was the trigger both times: it invites
disconnected floating segments. Asking for "one single solid three-seater sofa … fully
opaque with no transparent or translucent areas" produced a clean cut on the first try.

If this asset is ever regenerated, describe the sofa as one solid piece and check the
raw generation for translucency *before* paying for background removal.
