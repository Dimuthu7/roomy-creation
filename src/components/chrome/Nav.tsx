import { Logo } from './Logo'

// Not client-approved — flagged for sign-off, brief §8. "Process" names the #how
// section, whose own heading reads "How we work"; the nav keeps the shorter word a
// visitor scans for.
const LINKS = [
  { href: '#work', label: 'Work' },
  { href: '#how', label: 'Process' },
  { href: '#materials', label: 'Materials' },
] as const

export function Nav() {
  return (
    <>
      {/* F2 skip link: without it, every keyboard visitor tabs the whole nav before
          reaching content. Hidden until :focus-visible, then visible above the bar. */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4
                   focus-visible:left-4 focus-visible:z-[60] focus-visible:rounded
                   focus-visible:bg-yellow focus-visible:px-4 focus-visible:py-2
                   focus-visible:font-display focus-visible:text-navy"
      >
        Skip to content
      </a>

      {/* z-50: sits above a navy hero. The hairline is what keeps it visible at rest
          against a navy section beneath it. */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-teal/30 bg-navy">
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4"
        >
          <a href="#top" className="shrink-0">
            <Logo variant="yellow" />
          </a>

          {/* No hamburger drawer: four anchors fit in a horizontally scrollable row on
              a narrow viewport, and a drawer is a focus-trap this component would then
              have to build, test and maintain for four links. The CTA stays in this
              same row so it is always visible, never hidden behind a toggle. */}
          <div className="flex items-center gap-6 overflow-x-auto">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="u-mono shrink-0 whitespace-nowrap text-sky hover:text-yellow"
              >
                {link.label}
              </a>
            ))}
            {/* The CTA is the one control on this bar — never teal text on navy for a
                control, teal is 2.7:1 and a line/edge colour only. */}
            <a
              href="#enquiry"
              className="shrink-0 rounded-full bg-yellow px-4 py-2 font-display text-sm text-navy whitespace-nowrap"
            >
              Request a quotation
            </a>
          </div>
        </nav>
      </header>
    </>
  )
}
