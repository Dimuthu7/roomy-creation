import { TBC, type Maybe } from '@/lib/tbc'

/**
 * Start timestamp in seconds of each clip inside the concatenated film.
 * Fill these from the actual encode before the film goes live.
 */
export const CLIP_STARTS: number[] = [0, 4.5, 9.2, 13.8]

export interface FilmCard {
  counter: string
  label: string
  /** Oversized yellow display figure. */
  figure: Maybe<string>
  /** One line beneath, in white. */
  line: Maybe<string>
}

/**
 * Invented specification is worse than none. If a figure stays unknown at launch,
 * DELETE that row and drop the matching clip so the film runs three cuts.
 */
export const FILM_CARDS: FilmCard[] = [
  { counter: '01', label: 'The measure', figure: TBC, line: 'Tolerance we work to on site.' },
  { counter: '02', label: 'The cut', figure: TBC, line: TBC },
  { counter: '03', label: 'The fit', figure: TBC, line: 'Hinge and runner rating.' },
  { counter: '04', label: 'The handover', figure: TBC, line: 'Measurement to installation, on average.' },
]

export interface MaterialSpec {
  /** Which detail shot this strip item uses. */
  slot: 'edge' | 'hinge' | 'fabric' | 'samples' | 'interior'
  label: string
  value: Maybe<string>
}

export const MATERIAL_SPECS: MaterialSpec[] = [
  { slot: 'edge', label: 'Board type and thickness', value: TBC },
  { slot: 'samples', label: 'Where we use moisture-resistant board', value: TBC },
  { slot: 'edge', label: 'Edge banding', value: TBC },
  { slot: 'hinge', label: 'Hinge and runner, with cycle rating', value: TBC },
  { slot: 'fabric', label: 'Upholstery fabric and foam density', value: TBC },
  { slot: 'interior', label: 'Warranty', value: TBC },
]
