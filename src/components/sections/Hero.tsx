'use client'
import Image from 'next/image'
import { useState } from 'react'
import { WeaveTexture } from '@/components/weave/WeaveTexture'

// D1: /media/hero-master.jpg and /media/cutout-sofa.png do not exist yet. The probe
// confirmed next/image renders a broken <img> and never throws on a missing file, so
// without an explicit fallback the LCP element — the first thing any visitor sees —
// would be blank. This reuses Film.tsx's stand-in pattern: onError flips a flag and a
// solid navy block names the exact slot instead. The sofa cutout is aria-hidden
// decoration rather than the LCP element, so its stand-in is simply rendering nothing.
export function Hero() {
  const [masterFailed, setMasterFailed] = useState(false)
  const [cutoutFailed, setCutoutFailed] = useState(false)

  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative flex min-h-screen items-center overflow-hidden bg-navy"
    >
      {masterFailed ? (
        <div data-testid="hero-fallback" className="absolute inset-0 flex items-center justify-center bg-navy">
          <span className="text-sm text-sky">Image slot: /media/hero-master.jpg</span>
        </div>
      ) : (
        <Image
          src="/media/hero-master.jpg"
          alt="Fitted wardrobes and upholstered seating in a daylit living room"
          fill
          // `priority` is deprecated in Next 16. Its successor `preload` inserts a
          // <link rel="preload"> in the head, which is redundant for an image already
          // in the initial markup — so the docs steer to these two instead
          // (03-api-reference/02-components/image.md, under `preload`).
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
          className="object-cover"
          onError={() => setMasterFailed(true)}
        />
      )}
      <div className="absolute inset-0 bg-navy/72" />
      <WeaveTexture />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 lg:px-12">
        {/* D2: pure white is not in the brand palette. text-paper carries display
            type on navy, text-sky carries body copy. */}
        <h1
          id="hero-heading"
          className="max-w-3xl font-display text-5xl leading-[1.05] tracking-tight text-paper lg:text-7xl"
        >
          We measure your wall, then build to it.
        </h1>
        <p className="mt-6 max-w-xl text-sky">
          Built-in wardrobes, pantry cupboards and upholstered seating, cut to the room you
          actually have.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a href="#enquiry" className="bg-yellow px-7 py-4 font-display text-navy">
            Request a quotation
          </a>
          <a href="#work" className="border border-teal px-7 py-4 font-display text-sky">
            See our work
          </a>
        </div>
      </div>

      {!cutoutFailed && (
        <div className="pointer-events-none absolute -right-16 bottom-0 hidden w-[38vw] lg:block">
          <Image
            data-testid="hero-cutout"
            src="/media/cutout-sofa.png"
            alt=""
            aria-hidden="true"
            width={900}
            height={600}
            className="h-auto w-full"
            onError={() => setCutoutFailed(true)}
          />
        </div>
      )}
    </section>
  )
}
