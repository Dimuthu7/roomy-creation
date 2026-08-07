'use client'
import { motion } from 'framer-motion'
import { SITE } from '@/data/site'
import { whatsappUrl } from '@/lib/whatsapp'
import { useMotionLevel } from '@/hooks/useMotionLevel'

export function WhatsAppFloat() {
  const level = useMotionLevel()
  // whatsappUrl returns null while SITE.whatsappNumber is [TBC], as it is today —
  // rendering nothing is the correct behaviour, not a dead link.
  const url = whatsappUrl(SITE.whatsappNumber, 'Hello Roomy Creations, I have a question.')
  if (!url) return null

  const reduced = level === 'reduced'

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Message us on WhatsApp"
      data-cursor-label="WhatsApp"
      // z-40: below the Lightbox portal's z-50 — a float over a modal is a defect.
      className="fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center
                 rounded-full bg-yellow text-navy shadow-lg"
      initial={reduced ? undefined : { opacity: 0, y: 24 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <WhatsAppIcon />
    </motion.a>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.62 15.04L2 22l5.12-1.35A10 10 0 1 0 12 2Zm5.63 14.24c-.24.66-1.4 1.26-1.93 1.33-.5.07-1.12.1-1.8-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.79-4.17-4.94-4.37-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36h.55c.18 0 .42-.02.65.5.24.55.82 1.9.9 2.03.07.14.12.3.02.49-.1.2-.15.32-.3.5-.14.17-.3.38-.43.51-.14.14-.29.3-.13.58.17.29.75 1.24 1.61 2 1.1.98 2.03 1.29 2.32 1.43.29.14.46.12.63-.07.17-.2.72-.83.91-1.12.19-.29.38-.24.63-.14.26.1 1.64.77 1.92.91.29.14.48.21.55.33.07.12.07.68-.17 1.34Z" />
    </svg>
  )
}
