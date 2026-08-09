# Roomy Creations — website

This is the Roomy Creations marketing site: one page covering the hero, the gallery
of past work, the film, the process, the materials argument and the enquiry form.

## Running it

```
npm run dev      # local development, http://localhost:3000
npm test         # automated test suite
npm run build    # production build
```

`npm run build` must succeed before anything here is deployed. If it fails, the site
does not go live — do not skip that step.

## Image and film slots

Every real photo and the process film has a named slot in the code. Until the file
lands at the exact path below, that slot shows a solid navy block naming itself
(for example "Image slot: /work/work-01.jpg") rather than a broken image or a
placeholder picture. No AI-generated image is ever used as a stand-in.

Add each file under the exact filename listed. No code change is needed once the
files land — the block disappears and the real photo or film takes its place
automatically.

### Hero — supplied

Both hero files are present. They are **AI-generated atmosphere images**, not
photographs of real work — they set a look and a quality level without claiming to
show a job we did. See `docs/asset-manifest.md` for models, job IDs and prompts, and
`public/media/README.txt` for the full brief.

| Slot | Ratio | Delivered | Notes |
|---|---|---|---|
| `/media/hero-master.jpg` | 16:9 or wider | 2752×1536, 380KB | The hero backdrop. Sits behind a fixed dark overlay. |
| `/media/cutout-sofa.png` | roughly 3:2 | 1350×900, transparent | Foreground cutout. Decorative — no fallback text if missing, it simply does not render. |

Replacing either with real photography later needs no code change — drop the new
file in under the same filename.

### Gallery

24 project photos, one before/after pair. The ratio for each slot is fixed in the
code (`src/data/works.ts`) — cropping a photo to a different ratio will distort it
inside its grid cell. No minimum pixel width is set in the code for this batch;
supply the highest resolution available from the shoot.

| Slot | Ratio | Slot | Ratio | Slot | Ratio |
|---|---|---|---|---|---|
| work-01.jpg | 3:2 | work-09.jpg | 16:9 | work-17.jpg | 3:2 |
| work-02.jpg | 16:9 | work-10.jpg | 4:3 | work-18.jpg | 3:2 |
| work-03.jpg | 4:3 | work-11.jpg | 3:2 | work-19.jpg | 4:3 |
| work-04.jpg | 3:2 | work-12.jpg | 4:3 | work-20.jpg | 4:5 |
| work-05.jpg | 4:5 | work-13.jpg | 4:3 | work-21.jpg | 3:2 |
| work-06.jpg | 3:2 | work-14.jpg | 3:2 | work-22.jpg | 16:9 |
| work-07.jpg | 4:3 | work-15.jpg | 4:5 | work-23.jpg | 4:3 |
| work-08.jpg | 3:2 | work-16.jpg | 16:9 | work-24.jpg | 3:2 |

All paths are `/work/work-NN.jpg` (two-digit slot number).

`/work/work-01-before.jpg` is the one before/after pair currently wired up (the
bare-wall shot behind the compare slider on the gallery's first item). Same ratio
as `work-01.jpg`, 3:2. To add more before/after pairs, supply `work-NN-before.jpg`
for any other slot and tell the developer which slots — one line of code per pair
turns the slider on.

### Film — supplied

Both film files are present. Like the hero images, this is **AI-generated footage**
illustrating the process, not a recording of a specific real job. See
`public/film/README.txt` and `docs/asset-manifest.md`.

| Slot | Delivered | Notes |
|---|---|---|
| `/film/roomy-process.mp4` | 1280×720, 16.17s, 2.8MB | Four cuts of 4.041667s, hard joins, no audio track, +faststart. |
| `/film/roomy-process-poster.jpg` | 1280×720, 42KB | The film's own first frame, so poster and playback start identically. |

`CLIP_STARTS` in `src/data/specs.ts` is filled in from this encode — `[0, 4.041667,
8.083333, 12.125]` — read from the file and confirmed by two independent methods.
**Re-read them if the film is ever re-encoded**; `src/data/specs.test.ts` pins them.

## What the client needs to supply before launch

Every field below is `[TBC]` in the code today. A `[TBC]` field does not render a
placeholder — the block it belongs to disappears entirely rather than showing
something unconfirmed. That is deliberate: an unconfirmed opening hour or an
invented phone number is worse than a gap on the page. Once a field is filled in
`src/data/site.ts` or `src/data/specs.ts`, its block appears with no further code
change.

**Contact and business details** (`src/data/site.ts`)
- Production domain (`url`) — required before search engines and social previews
  can show a proper link back to the site
- Phone number
- WhatsApp number — until this is set, neither the floating WhatsApp button that
  follows the visitor down the page nor the one in the enquiry section appears at all
- Email address
- Street address, city, postal code
- Districts installed in
- Opening hours
- Facebook, Instagram and TikTok links
- Google Maps embed link
- Whether a measurement visit is genuinely free and carries no obligation
- The four headline figures: years in business, homes and apartments fitted,
  units delivered, districts covered

**Material specifications** (`src/data/specs.ts`)
- Board type and thickness
- Where moisture-resistant board is used
- Edge banding
- Hinge and runner, with cycle rating
- Upholstery fabric and foam density
- Warranty

**Film card figures** (`src/data/specs.ts`)
- The oversized figure and supporting line for each of the four film cards — three
  of the four figures and one of the four lines are still unset

**Per-photo details** (`src/data/works.ts`)
- For each of the 24 gallery photos once supplied: materials and finish,
  dimensions, hardware, property type, district, year. These drive the lightbox's
  spec sheet for that project — until filled, that row is simply absent, not shown
  with a placeholder.

## Environment variables

The enquiry form posts to `/api/enquiry`, which needs all three of these to
actually send an email:

| Variable | What breaks without it |
|---|---|
| `RESEND_API_KEY` | The route returns a 500 and logs the missing key. The enquiry is not sent and is lost. |
| `ENQUIRY_TO_EMAIL` | Same — 500, logged, lost. This is where enquiries should land. |
| `ENQUIRY_FROM_EMAIL` | Same — 500, logged, lost. This is the sender address Resend sends from. |

The visitor sees a plain "that did not send" message in every one of these cases —
nothing about the site looks broken, but no enquiry reaches anyone until all three
are set in the deployment environment.

## Copy awaiting sign-off

Everything below was written to fill a real gap on the page but has not been
approved by the client. Each is also flagged in a comment at the line it appears.

- `Position.tsx`'s three lines (carried over from an earlier task)
- Navigation labels: "Work", "Process", "Materials", "Request a quotation"
- Section headings: "Our work", "How we work", "What we make"
- Skip-link text: "Skip to content"
- The WhatsApp button's label: "Message us on WhatsApp"
- The footer copyright line's exact wording
- The six "Use N characters or fewer" form validation messages

## Known launch blockers

- No `og:image` is set. An image now exists that could serve as one
  (`/media/hero-master.jpg`), but `og:image` needs an absolute URL, which needs
  `metadataBase`, which needs the production domain below. Once the domain is
  confirmed, decide whether the generated hero image is acceptable as the social
  preview or whether that should wait for real photography.
- ~~The hero fails two contrast checks.~~ **Fixed.** Re-measured against the
  delivered photo: the sub-line moved to `text-paper` (4.20 → 5.82, AA needs 4.5) and
  the "See our work" border to sky (2.28 → 3.25, 1.4.11 needs 3.0). The border colour
  changed rather than the overlay because teal cannot reach 3:1 at any overlay
  darkness — swept to 88% it still only reaches 2.88.
- `metadataBase` is unset until the production domain is confirmed (see the
  checklist above). Search engines and link previews cannot resolve absolute URLs
  until it is.
- `/api/enquiry` has no rate limiting of its own. It bounds request size and
  validates every field, but repeated abusive submissions are a deployment-level
  concern (a platform-level rate limit or firewall rule), not something this route
  handles.
- **A horizontal scrollbar gutter appears under the nav on any machine with classic
  (non-overlay) scrollbars.** `Nav.tsx`'s link row is `overflow-x-auto`; nothing
  overflows (`scrollWidth === clientWidth`), but the browser still reserves a 15px
  track, which shows as a white bar and pushes the header from 69px to 84px. That
  exceeds the `scroll-padding-top: 5rem` (80px) in `globals.css`, so anchor links land
  slightly under the fixed bar. Not yet fixed.
