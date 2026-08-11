import { Hero } from '@/components/sections/Hero'
import { Position } from '@/components/sections/Position'
import { WhatWeMake } from '@/components/sections/WhatWeMake'
import { Work } from '@/components/sections/Work'
import { Film } from '@/components/sections/Film'
import { HowWeWork } from '@/components/sections/HowWeWork'
import { Materials } from '@/components/sections/Materials'
import { Enquiry } from '@/components/sections/Enquiry'
import { WeaveDivider } from '@/components/weave/WeaveDivider'
import { EnquiryPrefillProvider } from '@/context/EnquiryPrefill'
import { buildLocalBusinessSchema } from '@/lib/schema'
import { SITE } from '@/data/site'

export default function Home() {
  // json-ld.md:31-36: buildLocalBusinessSchema has existed since Task 3 and had
  // never been rendered until this task. JSON.stringify does not sanitize malicious
  // strings, so replacing every `<` with its unicode escape is not optional — the
  // doc calls out the XSS vector this closes explicitly. A `</script>` arriving
  // through any SITE field would otherwise close this tag and run what follows.
  const jsonLd = buildLocalBusinessSchema(SITE)

  return (
    <EnquiryPrefillProvider>
      <main id="main">
        <Hero />
        <Position />
        <WhatWeMake />
        <Work />
        <Film />
        {/* navy -> paper transition */}
        <WeaveDivider className="bg-navy" />
        <HowWeWork />
        <Materials />
        {/* navy -> paper transition */}
        <WeaveDivider className="bg-navy" />
        <Enquiry />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </EnquiryPrefillProvider>
  )
}
