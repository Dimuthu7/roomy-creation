import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'
import type { CompletionSnapshot } from '@/lib/jobs/snapshot'
import { FONT, colors, sizes } from './styles'
import { clauseList, clientAndMetaBlock, companyHeader, deliveryRow, itemsTable, paymentLedger, signatureBlock, totalsBlock } from './blocks'

/** Both dates appear because the pair states how long the job took, which is the
 *  first question a warranty claim asks. ORDER carries the job's RC ref so the
 *  certificate can be tied back to the order document the customer already holds.
 *  Mirrors src/pdf/CompletionDocument.tsx's metaFields exactly. */
function metaFields(snapshot: CompletionSnapshot) {
  return [
    { label: 'COMPLETED', value: snapshot.completedDate },
    { label: 'ORDER', value: snapshot.ref },
    { label: 'CONFIRMED', value: snapshot.confirmedDate },
    { label: 'SALES PERSON', value: snapshot.salesPerson ?? '-' },
  ]
}

function tagline() {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 160 },
    children: [new TextRun({ text: 'Our Furniture Is Made From The Finest Quality Materials & Finished To A High Standard', font: FONT, bold: true, size: sizes.sectionHeading })],
  })
}

function footerThanks() {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 480 },
    children: [new TextRun({ text: 'Thank You For Your Business!', font: FONT, bold: true, italics: true, size: sizes.receiptNumber, color: colors.thanks })],
  })
}

export function completionDocument(snapshot: CompletionSnapshot): Document {
  const delivery = deliveryRow(snapshot.delivery)
  const totals = totalsBlock(snapshot.totals)

  return new Document({
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children: [
          ...companyHeader('COMPLETION CERTIFICATE'),
          new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 120 }, children: [new TextRun({ text: snapshot.number, font: FONT, bold: true, size: sizes.receiptNumber })] }),
          clientAndMetaBlock(metaFields(snapshot), snapshot.customer),
          new Paragraph({ spacing: { before: 160, after: 80 }, children: [new TextRun({ text: 'Items Delivered', font: FONT, bold: true, size: sizes.sectionHeading })] }),
          itemsTable(snapshot.units),
          ...(delivery ? [delivery] : []),
          ...(totals ? [totals] : []),
          ...paymentLedger(snapshot.payments, snapshot.paymentPosition, snapshot.totals?.totalLabel ?? null),
          tagline(),
          ...clauseList('Warranty', snapshot.warranty),
          ...clauseList('Terms & Conditions', snapshot.terms),
          new Paragraph({ spacing: { before: 400 }, children: [] }),
          signatureBlock(),
          footerThanks(),
        ],
      },
    ],
  })
}

export async function renderCompletionDocx(snapshot: CompletionSnapshot): Promise<Buffer> {
  return Packer.toBuffer(completionDocument(snapshot))
}
