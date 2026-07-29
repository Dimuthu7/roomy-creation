# Roomy Creations — Single-Page Marketing Site

**Date:** 2026-07-29
**Status:** Approved for planning

---

## 1. Purpose

A single-page portfolio and first impression for Roomy Creations, a fitted-furniture
maker in Sri Lanka. Not a shop: no cart, no checkout, no prices.

**Success condition.** A visitor who has never heard of the business scrolls to the
bottom, believes the company will measure their apartment correctly and finish the
job cleanly, and messages them.

Every path terminates in one of four actions:

1. Request a quotation
2. Book a site measurement or showroom visit
3. Message on WhatsApp
4. Follow on social

### What the business is

Precision fitted furniture. **Not** artisanal woodworking. No hand-cut joinery, no
air-dried timber, no oil finishes, no "master carpenters" — that framing belongs to a
different business and customers can tell.

The four-part argument the whole site makes:

- **Fit.** A built-in wardrobe or pantry cupboard either meets the wall correctly or it
  does not. Measure the actual space, cut to that, install so the gaps are even.
- **Specification.** Board thickness, moisture-resistant board where there is water,
  edge banding quality, hinge and runner brand and cycle rating, fabric and foam
  density. Checkable facts that most competitors will not state.
- **Finish quality.** Consistent colour across panels, clean edges, aligned doors,
  soft close that still works in year three.
- **Space.** Sri Lankan apartments are small and awkwardly shaped. Units use the full
  height and the difficult corners.

The melamine perception problem is met head on in its own section — what engineered
board is, which grade is used, where moisture-resistant board goes, and why a properly
specified board unit outperforms cheap solid wood in a humid climate. Confident and
factual, never defensive.

---

## 2. Decisions taken during brainstorming

These resolve ambiguities and conflicts in the original brief.

| # | Question | Decision |
|---|---|---|
| 1 | Stack conflict: brief said React + Vite in one place, Next.js 16 in the deliverable | **Next.js 16 + TypeScript + Tailwind.** SSR for SEO and structured data, `next/image` for the LCP target, route handler for the form. |
| 2 | Higgsfield account has 10 credits on the free plan — far below the full asset list | **Top up, images only.** Generate the 14 stills and 3 cutouts. Defer the film. |
| 3 | `/src/assets/logo.svg` does not exist | **Build against a documented slot.** Weave motif derived from the brief's description; real mark swapped in later. |
| 4 | Form destination | **Next route handler → Resend**, key from env. |
| 5 | Contact and location facts | **All `[TBC]` in one typed config file** (`src/data/site.ts`), which also feeds the LocalBusiness JSON-LD. |
| 6 | Before/after comparison slider | **Build now.** Records with a `beforeImage` get it; records without fall back cleanly. |
| 7 | Gallery seed data | **24 records with realistic aspect ratios and category spread**, every factual field explicitly `[TBC]`. No invented districts, dimensions or hardware. |

---

## 3. Build sequencing

The brief instructed "generate assets first, then build". This is revised: the gallery —
the highest-priority section — runs entirely on real photographs supplied by the client,
so it has **no dependency on asset generation** and is not blocked.

### Phase A — no credits required

Scaffold, design system, gallery, lightbox, before/after slider, enquiry form, footer,
and the full film-section machinery built against an absent video file.

### Phase B — requires client top-up

Generate stills and cutouts, convert to WebP with JPG fallback, wire into hero, position
statement, category cards, materials strip, and the drifting cutout in "How we work".

### Phase C — deferred, client's call

The film. `ffmpeg` is **not installed** on the build machine; concatenating the four
clips will require `brew install ffmpeg`. Clip start timestamps live in `src/data/specs.ts`,
so wiring the finished file is a single edit.

---

## 4. Brand system

Colours are sampled from the supplied logo. Do not substitute or tint.

| Role | Hex | Use |
|---|---|---|
| Navy | `#023048` | Dominant page ground. This is the brand. |
| Yellow | `#F5CA4A` | Primary CTAs, active states, counting figures. One accent, used rarely. |
| Teal | `#1FA2C0` | Hairline rules, borders, weave graphics, hover states. On navy only. |
| Sky | `#8FCBE7` | Secondary text and captions on navy. |
| Paper | `#F1F5F8` | The two light sections. Cool white, never warm cream. |

### Contrast rules — enforced, not advisory

- Yellow on navy — 8.8:1. Safe for text.
- Sky on navy — 7.8:1. Safe for text.
- Teal on navy — 4.6:1. **16px+ body only.** Better used as rules and shapes.
- Teal on paper — 2.7:1. **Never** for text or controls on a light background.
- On paper sections: text is navy; the only accent is a filled yellow block with navy type.

The page is roughly 70% dark, so photographs of fitted interiors read as lit rooms in a
dark gallery. Two paper sections break it — "How we work" and the enquiry section — so
the forms feel approachable.

Do not add cream, terracotta or gold to warm the interface. The work is matte white,
grey and wood-grain board with fabric upholstery; the navy palette suits it.

### Typography

- **Display:** Outfit, 600–700, large, slightly negative tracking.
- **Body:** Instrument Sans, 17–18px / 1.6. Sky on navy, Navy on paper.
- **Utility:** IBM Plex Mono, small, wide-tracked caps — dimensions, board specs,
  hardware names, lead times, filters, captions.

The mono is the signature detail. This business runs on specification, so specs are
treated as typography, not fine print. No serifs, no script.

All three self-hosted via `next/font/google` — no external request, no layout shift.

### The weave

The logo mark is an over-under interlace: woven upholstery fabric, and the interlock of a
fitted unit meeting a wall. That logic runs through the page.

- Section dividers are a 1px teal weave motif derived from the mark, not plain rules.
- Gallery items interlock — alternate cards overlap the column edge.
- **Signature motion:** scroll reveals bring elements in alternately from left and right
  and settle them into an interlocked position. Things fit into place. This is the one
  motion idea the site is remembered by; everything else stays quiet. It is also the
  business's argument expressed as movement.
- Custom cursor is a small teal ring echoing the logo circle.

---

## 5. Architecture

```
roomy-creation/
├── README.md                 asset slots, aspect ratios, setup, [TBC] checklist
├── .env.example              RESEND_API_KEY, ENQUIRY_TO_EMAIL
├── public/
│   ├── media/                generated stills (webp + jpg)
│   ├── work/                 work-01.jpg … work-24.jpg — client photographs
│   └── film/                 roomy-process.mp4 + poster — slot
└── src/
    ├── app/
    │   ├── layout.tsx        fonts, metadata, OG, JSON-LD
    │   ├── page.tsx          composes sections in order
    │   ├── globals.css       Tailwind v4 @theme tokens
    │   └── api/enquiry/route.ts
    ├── assets/               logo.svg, logo-navy.svg — slots
    ├── data/
    │   ├── site.ts           every business fact, [TBC]
    │   ├── works.ts          24 typed project records
    │   ├── specs.ts          materials + film-card figures, [TBC]
    │   └── categories.ts
    ├── components/
    │   ├── chrome/           Nav, Footer, CustomCursor, SmoothScroll, WhatsAppFloat
    │   ├── weave/            WeaveDivider, WeaveTexture, WeaveReveal
    │   ├── sections/         Hero, Position, Figures, WhatWeMake, Film,
    │   │                     Gallery, HowWeWork, Materials, Enquiry
    │   └── gallery/          GalleryGrid, GalleryCard, FilterRow,
    │                         Lightbox, BeforeAfterSlider
    ├── hooks/                useMotionLevel, useWeaveReveal, useCountUp,
    │                         usePointerParallax
    └── lib/                  schema.ts, enquirySchema.ts
```

Animation libraries — GSAP + ScrollTrigger, Lenis, Framer Motion — live in client
components only. No Three.js.

---

## 6. Sections, in page order

1. **Hero** — navy. Logo top-left, thin nav right. Master image full-bleed under a navy
   scrim; fabric-weave detail behind the wordmark as faint teal-tinted texture. One short
   line in oversized display type. Two buttons: *Request a quotation* (filled yellow,
   navy type) and *See our work* (teal outline). Transparent-PNG sofa cutout off-grid at
   the right edge, parallaxing slightly with the pointer.
2. **Position statement** — navy. Three short lines: what we make, who we make it for,
   the fit argument. Large type, lots of air, one detail shot bleeding off an edge.
3. **Figures** — navy. Four numbers counting up on enter in yellow display type: years in
   business, homes and apartments fitted, units delivered, districts installed in. Mono
   labels in Sky beneath. Teal weave divider. **All four values `[TBC]`.**
4. **What we make** — navy. Five room-scene cards: Sofas & seating / Kitchens & pantry
   cupboards / Wardrobes & storage / TV & living units / Office & commercial. Cards tilt
   slightly in 3D on hover, image scales inside its frame, teal hairline draws in around it.
5. **The film** — showpiece. See §8.
6. **Completed work** — the main event. See §7.
7. **How we work** — paper. Five numbered steps: Enquiry → Site measurement → Drawings,
   materials and quotation → Manufacture → Installation and handover. Realistic lead time
   under each in mono (`[TBC]`). **Site measurement is visually the heaviest** — it is what
   separates fitted furniture from bought furniture. A cutout wardrobe module drifts
   across on scroll.
8. **Materials and specification** — navy. The melamine argument. Horizontal strip of
   detail shots; each reveals a specification line on hover — board type and thickness,
   where moisture-resistant board is used, edge banding, hinge and runner brand with cycle
   rating, upholstery fabric and foam density, warranty. **Every figure is `[TBC]`.**
   Beneath, three or four short factual lines about engineered board in a humid climate.
   No hedging, no apologising.
9. **Enquiry** — paper. See §9.
10. **Footer** — navy. Logo, address, opening hours, phone, email, social row, embedded
    map, delivery and installation coverage note.

---

## 7. Completed work gallery — priority 1

Most space, most care. Navy ground so the photographs carry all the colour.

Most of the work is built-in, so the photographs are **of rooms, not isolated objects**.
The gallery must handle wide interior shots well. It is not designed around square
product cutouts.

### Layout mechanism

CSS columns cannot produce controlled overlap, and JS measurement causes reflow on filter
change. Instead:

- **CSS Grid with explicit row spans computed from each record's aspect ratio.**
- An `offset` field per record (`none | left | right`) translates alternate items across
  the column edge, so the grid reads as woven rather than tiled.
- Deterministic and server-rendered. No measurement pass.
- Mobile collapses to a single column; offsets switch off.

### Filtering

Mono caps row: All / Sofas & seating / Kitchens & pantry / Wardrobes / TV & living /
Office & commercial. Active filter is a filled yellow chip with navy type. Filtering
re-lays out with a fast staggered weave-in. No page reload.

### Hover

Image scales inside its frame; the rest of the grid drops in opacity; a caption slides up
with project type, finish and location, with a teal hairline beneath. The opacity drop is
driven by a single grid-level `data-hovered` attribute — one state change, not 24 listeners.

### Lightbox

Portal on near-black navy. Focus-trapped. Arrow and swipe navigation. Mono spec block:
project type, materials and finish, dimensions, hardware, property type
(house / apartment / hotel / office), district, year. One yellow button — *Enquire about
something like this* — which opens the enquiry form with the project type pre-filled.

**Before/after slider.** Records with a `beforeImage` get a drag-to-compare slider — bare
wall on one side, fitted unit on the other. Records without render the plain image with
identical framing, so there is no layout shift between the two states. For fitted
furniture this is the single most persuasive element on the page.

### Data

Single `src/data/works.ts` array, one object per project, so work is added by editing one
file. 24 records. Lazy-load past the first 8. Real alt text on every image, generated from
the project data.

**Aspect ratios.** The grid's row-span maths depends on each record declaring its ratio, so
the permitted set is fixed and landscape-dominant — these are rooms, not products:

| Ratio | Use | Approx. share of 24 |
|---|---|---|
| `3:2` | Default wide interior | 10 |
| `4:3` | Standard room shot | 6 |
| `16:9` | Full storage or kitchen runs | 4 |
| `4:5` | Tall wardrobes, full-height units | 4 |

Each record declares `ratio` and `offset`. The README documents the required pixel
dimensions per ratio so supplied photographs drop in without cropping surprises.

---

## 8. The film section — priority 2

Pinned, roughly mid-page.

On scroll-in the video snaps from a small framed element to full-bleed — fast scale-up
with slight overshoot, not a gradual grow — then plays its full run at natural speed
before scroll releases. Loops, muted, autoplay, playsinline.

**Playback and scroll are fully independent.** Scroll controls the frame around the video,
never the footage inside it. Never seek, never tie playback to scroll position.

The section headline splits cleanly above and below the video frame so type never collides
with the footage; as the frame expands the two halves push apart to the viewport edges. A
thin teal line tracks the expansion.

### Data card overlay

Bottom-left, changing as the footage moves through each stage.

| Cut | Label | Figure | Line |
|---|---|---|---|
| 01 | THE MEASURE | `[X MM]` | Tolerance we work to on site. |
| 02 | THE CUT | `[X MM BOARD]` | `[Edge banding spec — one true line.]` |
| 03 | THE FIT | `[X CYCLES]` | Hinge and runner rating. |
| 04 | THE HANDOVER | `[X WEEKS]` | Measurement to installation, on average. |

Every bracket must be replaced with real numbers before launch. **Invented specification
is worse than none — if a figure is unknown, cut that row and run three cuts.**

Card layout: small yellow counter (01 / 04), label in wide-tracked mono caps in Sky,
figure in oversized yellow display type, one line in white beneath, on a navy card with a
1px teal edge. Each card cuts out and the next cuts in — hard, fast, no crossfade.

### Sync mechanism

Cards switch off the video's own `timeupdate` event, comparing `currentTime` against clip
start timestamps held in `src/data/specs.ts`. Reading `currentTime` is fine; **never
assign to it.** Cards are never driven from scroll progress — scroll and playback run
independently, so the text would drift out of sync with the footage.

### Degradation when the video file is absent

The frame renders the poster still with card 01 static. No fake timer, no invented motion.

### Film brief — for Phase C

Four clips, Seedance 2.0, 4–5 seconds each, colour- and identity-matched to the master
image. The sequence follows a unit from measurement to installed room. A precision story,
not a craft story.

| Cut | Content | Camera |
|---|---|---|
| 01 | Measuring an empty apartment wall — tape, laser measure, dimensions marked | Slow lateral track along the bare wall |
| 02 | The workshop — panel saw or CNC cutting board, edge banding running | Close, steady, moving along the machine |
| 03 | Installation on site — panels going up, alignment checked, hardware fitted | Close, handheld-steady, hands and tools |
| 04 | The finished fitted room, doors closing softly | Steady pull-back revealing the full space |

Camera moves are measured and controlled — slow tracks and pushes, no fast whips. The
energy reads as competence, not excitement. Concatenate the four with hard cuts, no
crossfades. Record the exact start timestamp of each clip in the final file.

---

## 9. Enquiry section — paper ground

Three separated paths, side by side on desktop, stacked on mobile.

### Request a quotation — the main form

Fields: name, phone, email, property type (house / apartment / hotel / office / other),
what you need (multi-select: sofa & seating, kitchen / pantry, wardrobe, TV & storage,
office, other), rough room dimensions or "not sure yet", budget range (optional), how you
found us.

Inline validation on blur. A real success state. Explicit response time — "We reply within
one working day". Submit button filled yellow with navy type. **No CAPTCHA.**

One line under the form: measurement visits are free and non-obligatory. **Conditional on
the client confirming this is true** — it is `[TBC]`. It removes the main reason people do
not enquire.

Zod schema shared client and server. `POST /api/enquiry` → Resend, key from env, server
re-validates.

### Book a site measurement or showroom visit

In person or online consultation. Simple date-and-time preference field. Showroom address
and opening hours beside it.

### Message us now

WhatsApp button using `https://wa.me/94XXXXXXXXX?text=` with a pre-filled opening message,
plus the social row: Facebook, Instagram, TikTok. Icons navy, yellow fill on hover.

WhatsApp also gets a small floating button fixed bottom-right on mobile — navy circle,
yellow icon.

### Tone

Errors are specific and never apologise. Buttons say exactly what happens: *Send enquiry*,
not *Submit*.

---

## 10. Copy rules

Write like someone who installs furniture in apartments and knows what goes wrong, talking
to a customer who is nervous about spending money. Short declarative sentences. Every
description carries one concrete, checkable detail — board thickness, hardware brand, the
awkward corner filled, the district, the lead time.

**Banned words and phrases:** nestled, boasts, epitome, exquisite, unparalleled, where
tradition meets modernity, one-stop solution, we strive to, dream home, turnkey. No
exclamation marks.

**Never invent.** No awards, certifications, client names, hardware brands or years in
business that the client has not supplied. Use clearly marked `[TBC]` slots instead.

---

## 11. The [TBC] discipline

Every unverified fact lives as an explicit `[TBC]` in `src/data/site.ts` or
`src/data/specs.ts`, with a comment stating the expected format. The LocalBusiness JSON-LD
builds from the same `site.ts` object, so filling the file completes the SEO in one edit.

`[TBC]` covers: phone, WhatsApp number, showroom address, city, districts covered, opening
hours, social URLs, email, years in business, homes fitted, units delivered, district
count, board type and thickness, moisture-resistant board policy, edge banding spec, hinge
and runner brand and cycle rating, upholstery fabric and foam density, warranty, all lead
times, site tolerance, and the free-measurement-visit claim.

The README carries a checklist of every `[TBC]` and where it lives.

---

## 12. Motion

One `useMotionLevel` hook returns `full | reduced | mobile`. Every animated component
reads it rather than scattering media queries.

- `full` — scroll-triggered weave-in reveals alternating left and right; one pinned
  section (the film); Lenis smooth scroll; custom teal ring cursor that grows over
  interactive elements and switches to a mono label over gallery items; hero type and
  cutout respond subtly to pointer position; category cards tilt in 3D on hover; figures
  count up on enter.
- `mobile` — weave-ins collapse to plain fades. The film does not autoplay; its poster
  still shows with a play control. (The hero itself carries no video — it is the master
  image under a navy scrim. The original brief's "hero video" line refers to the film
  section, which is the page's only moving footage.)
- `reduced` — all transforms, the custom cursor, Lenis and autoplay are disabled.

Lenis and ScrollTrigger are wired together (`lenis.on('scroll', ScrollTrigger.update)` plus
the GSAP ticker) and both disabled under `reduced`.

Durations 200–450ms, slight overshoot, decisive easing. **Nothing floats, drifts, or
bounces continuously.**

---

## 13. Quality floor

- Keyboard-navigable with visible focus rings — yellow on navy, navy on paper.
- Semantic headings in order.
- Alt text on every image.
- Contrast at AA per §4.
- `prefers-reduced-motion` disables all transforms and autoplay.
- Page title, meta description, Open Graph image (the master), LocalBusiness structured
  data with address, phone and hours.

### Performance

Mobile-first, desktop at 1440px. Most traffic is phones on mobile data.

- Target LCP under 2.5s on 4G.
- Lazy-load below the fold.
- WebP with JPG fallback.
- Preload the hero image only.

### SEO

Local search matters most. Work the terms customers actually type into the copy naturally:
pantry cupboards, built-in wardrobes, modular kitchen, sofa manufacturers, melamine
furniture, plus `[CITY]` and the districts covered.

---

## 14. Generated assets — Phase B

Generated assets are for **atmosphere, texture and motion only**. Real photographs of
completed installations go in the gallery. Nothing generated may pretend to be a specific
unit the company built. Where a real photo belongs there is a named, correctly sized slot
(`public/work/work-01.jpg` … `work-24.jpg`) with a documented aspect ratio and a solid navy
block as temporary stand-in — **never an AI image**.

### Global photographic direction — every asset must match

Bright, even daylight in a contemporary apartment. Cool-neutral white balance. Matte
handleless cabinetry in white, soft grey and wood-grain board. Upholstered seating in
fabric. Polished cement, tile or light timber-look flooring. Compact, real-scale rooms
rather than mansion sets.

Every scene carries one deliberate deep-blue or teal note — a sofa, a cushion, ceramics,
sky through a window — so the photography sits on the navy page instead of fighting it.

Clean, precise, uncluttered. No HDR, no orange grade, no rustic props, no exposed rough
timber.

### Generation order

1. **Master hero image.** Modern apartment living space in bright daylight: fabric
   upholstered sofa, full-height built-in storage wall in matte board behind it, clean
   handleless fronts, a deep-blue textile element. Wide lens, soft directional daylight.
   Everything else derives from this — match its grade, white balance and light angle.
2. **Five room scenes**, image-to-image **from the master** so surface tone and light match
   exactly: fitted kitchen / pantry cupboard run; built-in wardrobe with doors open;
   bedroom with headboard and storage; TV and storage wall; office or study fit-out.
3. **Five detail shots** — tight, near-macro, shallow depth of field. These carry the
   specification argument, so they must show what is claimed:
   - A clean edge-banded panel edge meeting a door front, raking light along the joint.
   - A soft-close hinge or drawer runner seated in board.
   - Woven upholstery fabric close up — the logo made physical. Becomes the section divider
     texture and the hero backdrop.
   - A stack of board and edge-banding samples in different finishes, fanned.
   - A wardrobe interior — shelving, rail, drawer box — lit and organised.
4. **Three cutouts** with background removal, delivered as transparent PNG so they sit
   directly on the navy ground: a two- or three-seat upholstered sofa in three-quarter
   view; a single wardrobe module with one door open; an armchair.

Confirm media IDs before wiring. No placeholder images in the final build.

---

## 15. Out of scope

- E-commerce of any kind — cart, checkout, prices.
- Three.js or any 3D rendering.
- CMS integration. Work is added by editing `works.ts`.
- Multi-page routing. This is one page.
- Blog, testimonials, or team pages.
