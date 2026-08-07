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

### Hero

See `public/media/README.txt` for the full brief on both files below; not restated
here beyond the ratio and size.

| Slot | Ratio | Minimum width | Notes |
|---|---|---|---|
| `/media/hero-master.jpg` | 16:9 or wider | 1920px | The hero backdrop. Sits behind a fixed dark overlay. |
| `/media/cutout-sofa.png` | roughly 3:2 | 900px | Foreground cutout, transparent background. Decorative — no fallback text if missing, it simply does not render. |

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

### Film

See `public/film/README.txt` for the full brief; not restated here beyond ratio.

| Slot | Ratio | Notes |
|---|---|---|
| `/film/roomy-process.mp4` | 16:9 | The concatenated process film. |
| `/film/roomy-process-poster.jpg` | 16:9 | A still from the same frame, shown before the film starts playing. |

The four on-screen card boundaries inside the film (`CLIP_STARTS` in
`src/data/specs.ts`) are provisional guesses and must be corrected against the real
encode once it exists — see the launch blockers below.

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

- No `og:image` is set. There is no approved photograph to use, and a placeholder
  image is against the client's own rule — a real photo (or an explicit decision to
  go without one) is needed before this can be added.
- `metadataBase` is unset until the production domain is confirmed (see the
  checklist above). Search engines and link previews cannot resolve absolute URLs
  until it is.
- `/api/enquiry` has no rate limiting of its own. It bounds request size and
  validates every field, but repeated abusive submissions are a deployment-level
  concern (a platform-level rate limit or firewall rule), not something this route
  handles.
- `CLIP_STARTS` in `src/data/specs.ts` (the four film card boundaries) are
  provisional guesses and need correcting against the real encode once it exists.
