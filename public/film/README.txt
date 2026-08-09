Film section — assets
=====================

Both files this folder needs are now present:

  roomy-process.mp4          1280x720, h264, 24fps, 16.166667s, 2.8MB, no audio
                             track. Four clips of 4.041667s joined with hard cuts,
                             no crossfades. Encoded with +faststart so it begins
                             playing before the whole file has downloaded.

  roomy-process-poster.jpg   1280x720, 42KB. The film's own first frame, so the
                             poster and the first frame of playback are identical
                             and the transition is invisible.

This is AI-GENERATED footage, not a recording of real Roomy Creations work. It
illustrates the process at the right quality level; it does not document a
specific job. See docs/asset-manifest.md for models, job IDs and prompts.

CLIP_STARTS in src/data/specs.ts is now filled in from this encode:

  [0, 4.041667, 8.083333, 12.125]

Those were READ from the file, not calculated, and confirmed by two independent
methods that agreed exactly — keyframe positions and scene-change detection:

  ffprobe -v error -select_streams v:0 -skip_frame nokey \
    -show_entries frame=pts_time -of csv=p=0 roomy-process.mp4

  ffmpeg -v error -i roomy-process.mp4 \
    -vf "select='gt(scene,0.4)',metadata=print:file=-" -f null -

IF YOU RE-ENCODE THIS FILM, RE-READ THOSE NUMBERS. The card overlay switches off
the video's own timeupdate event compared against them, so a stale value does not
fail loudly — the cards simply narrate the wrong footage. src/data/specs.test.ts
pins the current values and will fail if they drift from what is documented here.

Film.tsx still catches the video's error event, so if this file is removed or
renamed the section falls back to a solid navy block naming the slot, with the
card overlay still working on top of it.
