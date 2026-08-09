import { describe, it, expect } from 'vitest'
import { CLIP_STARTS, FILM_CARDS } from './specs'

/**
 * These four numbers ARE the film's sync mechanism. Film.tsx compares the video's own
 * currentTime against them on every timeupdate, so a wrong value does not fail loudly —
 * the cards simply narrate the wrong footage, which is the kind of defect that ships.
 *
 * They were read out of the real encode (public/film/roomy-process.mp4), not computed
 * from the clip durations, and confirmed by two independent methods that agreed exactly:
 *
 *   ffprobe -select_streams v:0 -skip_frame nokey -show_entries frame=pts_time
 *     -> 0.000000, 4.041667, 8.083333, 12.125000
 *   ffmpeg -vf "select='gt(scene,0.4)',metadata=print"
 *     -> 4.041667, 8.083333, 12.125000   (no frame 0: nothing precedes it to cut from)
 *
 * Film duration is 16.166667s: four clips of 4.041667s joined with hard cuts.
 *
 * If the film is ever re-encoded, re-read these. Do not adjust them by hand.
 */
const FILM_DURATION = 16.166667

describe('CLIP_STARTS', () => {
  it('matches the boundaries measured in the shipped encode', () => {
    expect(CLIP_STARTS).toEqual([0, 4.041667, 8.083333, 12.125])
  })

  it('starts at the first frame', () => {
    expect(CLIP_STARTS[0]).toBe(0)
  })

  it('ascends strictly, so every clip has a non-zero span', () => {
    for (let i = 1; i < CLIP_STARTS.length; i++) {
      expect(CLIP_STARTS[i]).toBeGreaterThan(CLIP_STARTS[i - 1])
    }
  })

  it('keeps every start inside the film, with the last clip long enough to be seen', () => {
    for (const t of CLIP_STARTS) expect(t).toBeLessThan(FILM_DURATION)
    // A boundary a hair before the end would flash its card and vanish.
    expect(FILM_DURATION - CLIP_STARTS[CLIP_STARTS.length - 1]).toBeGreaterThan(1)
  })

  /**
   * specs.ts instructs the maintainer to delete a card row AND drop the matching clip
   * together. Film.tsx clamps so a mismatch can no longer crash the page, but a clamp is
   * a safety net, not the intent: a fourth clip with no fourth card would play under a
   * stale card. This is the assertion that actually holds the two in step.
   */
  it('has exactly one clip per card', () => {
    expect(CLIP_STARTS.length).toBe(FILM_CARDS.length)
  })
})
