Film section — required assets
===============================

This folder needs two files before the film section shows real footage:

  roomy-process.mp4          the concatenated film, 16:9
  roomy-process-poster.jpg   a still from the film, same 16:9 frame

Neither exists yet. Task 17 (generate and concatenate the four clips) is
blocked on an ffmpeg install and client go-ahead, so until both files land
here, the Film component (src/components/sections/Film.tsx) catches the
video's error event and renders a solid navy block in their place. The
card overlay keeps working on top of that block. No placeholder image or
broken player ships in the meantime.

Once the real encode exists, also update CLIP_STARTS in src/data/specs.ts.
Those four numbers are the second-by-second start of each clip inside the
concatenated file, and they are currently provisional guesses. The card
that sits over the film switches from the video's own timeupdate event
compared against CLIP_STARTS, so the boundaries only mean something once
they match the real encode.
