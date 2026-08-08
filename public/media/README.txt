Hero section — assets
=====================

Both files this folder needs are now present:

  hero-master.jpg     2752x1536, the hero backdrop. Sits behind a fixed navy/72%
                      overlay and is cropped with object-cover, so the subject is
                      kept clear of the extreme left and right edges for ultra-wide
                      viewports.

  cutout-sofa.png     1350x900, foreground cutout on a transparent background,
                      subject anchored to the bottom of the canvas because Hero
                      pins it to bottom-0. Decorative (rendered aria-hidden).

Both are AI-GENERATED ATMOSPHERE IMAGES, not photographs of real Roomy Creations
work. They set a look and a quality level; they do not claim to show a job we did.
See docs/asset-manifest.md for models, job IDs and the prompts used.

The 24 gallery photographs in public/work/ are a different matter entirely. Those
DO claim to show real installations, so they must be real photographs and are never
generated. Those slots are still empty and still show their navy stand-ins.

Hero (src/components/sections/Hero.tsx) still catches each image's error event, so
if either file is removed or renamed:

  - hero-master.jpg: falls back to a solid navy block naming the slot. This is the
    page's LCP element, so it never ships as a broken <img>.
  - cutout-sofa.png: falls back to rendering nothing. It is decorative, so an empty
    space is the honest failure state, not a labelled placeholder.

To replace either with real photography later, just drop the new file in under the
same filename — no code change is needed.
