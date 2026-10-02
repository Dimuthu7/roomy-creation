import { AlignmentType, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import type { ReceiptSnapshot } from '@/lib/jobs/snapshot'
import { FONT, cellBorders, colors, lightBorder, sizes, thinBorder } from './styles'
import { clientBlock, documentHeader, moneyBlock, signatureBlock } from './blocks'

function metaFields(snapshot: ReceiptSnapshot) {
  const fields = [
    { label: 'RECEIPT', value: snapshot.number },
    { label: 'DATE', value: snapshot.paidAtLabel },
    { label: 'ORDER', value: snapshot.ref },
  ]
  // Absent on receipts issued before the redesign — see ReceiptSnapshot's note on
  // why every one of these fields is optional.
  if (snapshot.salesPerson) fields.push({ label: 'SALES PERSON', value: snapshot.salesPerson })
  return fields
}

function ackRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        borders: cellBorders({ bottom: lightBorder }),
        width: { size: 40, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: label, font: FONT, size: sizes.body, color: colors.muted })] })],
      }),
      new TableCell({
        borders: cellBorders({ bottom: lightBorder }),
        width: { size: 60, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: value, font: FONT, bold: true, size: sizes.body })] })],
      }),
    ],
  })
}

/** Closes the panel on the figure the customer is actually checking. */
function amountRow(amountLabel: string): TableRow {
  const shading = { shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E4E4E4' } }
  return new TableRow({
    children: [
      new TableCell({
        borders: cellBorders({ top: thinBorder }),
        ...shading,
        children: [new Paragraph({ children: [new TextRun({ text: 'Amount Received', font: FONT, bold: true, size: sizes.sectionHeading })] })],
      }),
      new TableCell({
        borders: cellBorders({ top: thinBorder }),
        ...shading,
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: amountLabel, font: FONT, bold: true, size: sizes.receiptNumber })] })],
      }),
    ],
  })
}

function acknowledgement(snapshot: ReceiptSnapshot): Table {
  const rows = [ackRow('Received With Thanks From', snapshot.customerName), ackRow('Being', `${snapshot.kindLabel} for ${snapshot.ref}`)]
  if (snapshot.method) rows.push(ackRow('Method', snapshot.method))
  rows.push(amountRow(snapshot.amountLabel))

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: thinBorder, left: thinBorder, right: thinBorder, bottom: thinBorder, insideHorizontal: lightBorder, insideVertical: lightBorder },
    rows,
  })
}

/** Where the job stands after this payment, in the same three rows and the same
 *  vocabulary the order document closes with. Null unless the job total was known
 *  when the receipt was issued. */
function positionBlock(snapshot: ReceiptSnapshot): Table | null {
  if (!snapshot.totalLabel || !snapshot.paidLabel || snapshot.balanceRemainingLabel === null) return null
  return moneyBlock([
    { label: 'Total Price', value: snapshot.totalLabel, emphasis: false },
    { label: 'Advance', value: snapshot.paidLabel, emphasis: false },
    { label: 'Balance Payment', value: snapshot.balanceRemainingLabel, emphasis: true },
  ])
}

function tagline() {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 160 },
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

export function receiptDocument(snapshot: ReceiptSnapshot): Document {
  const position = positionBlock(snapshot)

  return new Document({
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children: [
          ...documentHeader('RECEIPT', metaFields(snapshot), snapshot.companyEmail ?? null),
          ...(snapshot.customer ? clientBlock(snapshot.customer) : []),
          acknowledgement(snapshot),
          ...(position ? [new Paragraph({ spacing: { after: 80 }, children: [] }), position] : []),
          tagline(),
          signatureBlock(),
          footerThanks(),
        ],
      },
    ],
  })
}

export async function renderReceiptDocx(snapshot: ReceiptSnapshot): Promise<Buffer> {
  return Packer.toBuffer(receiptDocument(snapshot))
}
