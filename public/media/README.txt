Hero section — required assets
===============================

This folder needs two files before the hero shows real photography:

  hero-master.jpg    the hero backdrop, landscape, 16:9 or wider, at least 1920px
                      wide. It sits behind a fixed navy/72% overlay and is cropped
                      with object-cover, so the subject should stay clear of the
                      extreme left and right edges at ultra-wide viewports.

  cutout-sofa.png     a foreground cutout on a transparent background, roughly 3:2,
                      at least 900px wide. Decorative only (rendered aria-hidden), so
                      framing matters more than caption-worthy content.

Neither exists yet. Until both files land here, Hero (src/components/sections/Hero.tsx)
catches each image's error event:

  - hero-master.jpg: falls back to a solid navy block naming the slot
    ("Image slot: /media/hero-master.jpg"). This is the page's LCP element, so it
    never ships as a broken <img> — see Task 14's brief, defect D1.
  - cutout-sofa.png: falls back to rendering nothing. It is decorative, so an empty
    space is the honest failure state, not a labelled placeholder.

No AI-generated image ships in place of either file. Once the real photography exists,
just add it here under the exact filenames above — no code change needed.
