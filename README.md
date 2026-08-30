# Roomy Creations — website

This is the Roomy Creations marketing site: one page covering the hero, the gallery
of past work, the film, the process, the materials argument and the enquiry form.

## Running it

Site content (business details, stats, gallery works) lives in Postgres, not static
files — `npm run dev` needs a working `DATABASE_URL` in `.env.local` or every page
fails to render. See "Database" below for first-time setup.

```
npm run dev      # local development, http://localhost:3000
npm test         # automated test suite
npm run build    # production build
```

`npm run build` must succeed before anything here is deployed. If it fails, the site
does not go live — do not skip that step.

## Database

Content is stored in Neon Postgres (`src/db/schema.ts`), accessed through Drizzle
ORM, and read via cached data-access functions (`src/data/site.ts`,
`src/data/works.ts`). Gallery photos are uploaded to Vercel Blob.

```
npm run db:generate   # generate a migration from a schema change
npm run db:migrate    # apply pending migrations to DATABASE_URL
npm run db:seed       # one-time: populate an empty database from the original static data
```

First-time setup against a fresh database: set `DATABASE_URL` and
`BLOB_READ_WRITE_TOKEN` in `.env.local`, run `npm run db:migrate`, then
`npm run db:seed`.

## Admin portal

Reachable at `/admin` — not linked from anywhere on the public site, so an admin
navigates there directly by URL. Logs in with the hardcoded credentials in
`ADMIN_USERNAME`/`ADMIN_PASSWORD`, then lands on a dashboard of tiles for each
admin function. Currently one tile: **Site details**, for editing business
details, stats, and per-slot gallery photos/metadata. Saves go live immediately
(no publish step).

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

A `[TBC]` field does not render a placeholder — the block it belongs to disappears
entirely rather than showing something unconfirmed. That is deliberate: an
unconfirmed opening hour or an invented phone number is worse than a gap on the
page. Once a field is filled in `src/data/site.ts` or `src/data/specs.ts`, its
block appears with no further code change.

**Contact and business details** (`src/data/site.ts`) — filled in 2026-08-09,
except:
- Production domain (`url`) — still `[TBC]`. Required before search engines and
  social previews can show a proper link back to the site.
- **Two entries need the client's confirmation, not code changes:**
  - `districts: ["Kurunegala", "Kurunegala"]` — the same value twice. The footer
    renders this verbatim as "Kurunegala, Kurunegala." Confirm whether a second
    district was intended.
  - `phone: "+94 72 292 0088"` — contains spaces. The type's own doc comment
    asks for international format with no spaces (e.g. `+94112345678`), because
    this value flows unmodified into both the `tel:` link and the JSON-LD
    `telephone` field search engines read.

**Material specifications and film card figures** (`src/data/specs.ts`) —
**PLACEHOLDER DATA, not real specifications.** Filled 2026-08-09 at the client's
request so the film and materials sections preview with content instead of empty
sections. Every value is clearly commented `PLACEHOLDER VALUES` at its definition
in the source. **Must be confirmed or replaced with real figures before launch** —
board type and thickness, where moisture-resistant board is used, edge banding,
hinge/runner cycle rating, upholstery fabric and foam density, warranty terms, and
the oversized figure/line on each of the four film cards.

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

The database, image storage, and admin login need these — required everywhere,
including local dev:

| Variable | What breaks without it |
|---|---|
| `DATABASE_URL` | Every page fails to render — all site content reads from here. |
| `BLOB_READ_WRITE_TOKEN` | Gallery photo uploads in the admin portal fail. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Nothing can log in to `/admin` — every attempt is rejected. |
| `ADMIN_SESSION_SECRET` | Admin sessions can't be signed — logging in fails. Generate with `openssl rand -base64 32`. |

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
