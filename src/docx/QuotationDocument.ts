import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'
import type { QuotationSnapshot } from '@/lib/jobs/snapshot'
import { FONT, colors, sizes } from './styles'
import { clauseList, clientAndMetaBlock, companyHeader, deliveryRow, itemsTable, signatureBlock, totalsBlock } from './blocks'

function metaFields(snapshot: QuotationSnapshot) {
  return [
    { label: 'DATE', value: snapshot.quotationDate },
    { label: 'QUOTATION', value: snapshot.ref },
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

export function quotationDocument(snapshot: QuotationSnapshot): Document {
  const delivery = deliveryRow(snapshot.delivery)
  return new Document({
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children: [
          ...companyHeader('QUOTATION'),
          clientAndMetaBlock(metaFields(snapshot), snapshot.customer),
          new Paragraph({ children: [] }),
          itemsTable(snapshot.units),
          ...(delivery ? [delivery] : []),
          ...(totalsBlock(snapshot.totals) ? [totalsBlock(snapshot.totals)!] : []),
          tagline(),
          ...clauseList('Terms & Conditions', snapshot.terms),
          ...clauseList('Warranty', snapshot.warranty),
          new Paragraph({ spacing: { before: 400 }, children: [] }),
          signatureBlock(),
          footerThanks(),
        ],
      },
    ],
  })
}

export async function renderQuotationDocx(snapshot: QuotationSnapshot): Promise<Buffer> {
  return Packer.toBuffer(quotationDocument(snapshot))
}
