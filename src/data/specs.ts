import { TBC, type Maybe } from '@/lib/tbc'

/**
 * Start timestamp in seconds of each clip inside the concatenated film.
 *
 * Read out of the shipped encode (public/film/roomy-process.mp4), not computed from the
 * clip durations, and cross-checked by two independent methods that agreed exactly:
 * keyframe positions (`ffprobe -skip_frame nokey`) and scene-change detection
 * (`ffmpeg -vf "select='gt(scene,0.4)'"`). Four clips of 4.041667s joined with hard
 * cuts, 16.166667s total.
 *
 * Film.tsx compares the video's own currentTime against these on every timeupdate, so a
 * wrong value here does not fail loudly — the cards just narrate the wrong footage.
 * Re-read them from the file if the film is ever re-encoded; never adjust by hand.
 * Pinned by src/data/specs.test.ts.
 */
export const CLIP_STARTS: number[] = [0, 4.041667, 8.083333, 12.125]

export interface FilmCard {
  counter: string
  label: string
  /** Oversized yellow display figure. */
  figure: Maybe<string>
  /** One line beneath, in white. */
  line: Maybe<string>
}

/**
 * PLACEHOLDER VALUES — requested by the client 2026-08-09 to preview the film section
 * with content instead of cut cards, standing in until real figures are confirmed.
 * This is a deliberate, temporary exception to the client's own rule below, which
 * otherwise still governs every other [TBC] field in this file and in site.ts.
 *
 * Invented specification is worse than none. If a figure stays unknown at launch,
 * DELETE that row and drop the matching clip so the film runs three cuts.
 */
export const FILM_CARDS: FilmCard[] = [
  { counter: '01', label: 'The measure', figure: '±2 MM', line: 'Tolerance we work to on site.' },
  {
    counter: '02',
    label: 'The cut',
    figure: '18 MM BOARD',
    line: 'Edge banding colour-matched to every panel.',
  },
  { counter: '03', label: 'The fit', figure: '80,000 CYCLES', line: 'Hinge and runner rating.' },
  {
    counter: '04',
    label: 'The handover',
    figure: '3 WEEKS',
    line: 'Measurement to installation, on average.',
  },
]

export interface MaterialSpec {
  /** Which detail shot this strip item uses. */
  slot: 'edge' | 'hinge' | 'fabric' | 'samples' | 'interior'
  label: string
  value: Maybe<string>
}

/**
 * PLACEHOLDER VALUES — see the FILM_CARDS comment above; same request, same rule,
 * same exception. Every value below must be confirmed or replaced before launch —
 * see README.md's launch checklist.
 */
export const MATERIAL_SPECS: MaterialSpec[] = [
  { slot: 'edge', label: 'Board type and thickness', value: '18mm E1-grade MDF board' },
  {
    slot: 'samples',
    label: 'Where we use moisture-resistant board',
    value: 'Kitchen and bathroom units',
  },
  { slot: 'edge', label: 'Edge banding', value: '2mm PVC, colour-matched to the board' },
  {
    slot: 'hinge',
    label: 'Hinge and runner, with cycle rating',
    value: 'Soft-close, rated 80,000 cycles',
  },
  {
    slot: 'fabric',
    label: 'Upholstery fabric and foam density',
    value: 'Woven polyester, 32kg/m³ foam',
  },
  { slot: 'interior', label: 'Warranty', value: '2 years on workmanship and hardware' },
]
