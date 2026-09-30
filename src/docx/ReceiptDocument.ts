import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'
import type { ReceiptSnapshot } from '@/lib/jobs/snapshot'
import { FONT, colors, sizes } from './styles'
import { companyHeader, signatureBlock } from './blocks'

function ackRow(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `${label}: `, font: FONT, size: sizes.sectionHeading, color: colors.muted }),
      new TextRun({ text: value, font: FONT, bold: true, size: sizes.receiptNumber }),
    ],
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
  const receivedOnValue = snapshot.method ? `${snapshot.paidAtLabel}  by ${snapshot.method}` : snapshot.paidAtLabel

  return new Document({
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children: [
          ...companyHeader('RECEIPT'),
          new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 240 }, children: [new TextRun({ text: snapshot.number, font: FONT, bold: true, size: sizes.receiptNumber })] }),
          ackRow('Received with thanks from', snapshot.customerName),
          ackRow('the sum of', snapshot.amountLabel),
          ackRow('being', `${snapshot.kindLabel} for ${snapshot.ref}`),
          ackRow('received on', receivedOnValue),
          ...(snapshot.balanceRemainingLabel !== null ? [ackRow('Balance remaining', snapshot.balanceRemainingLabel)] : []),
          new Paragraph({ spacing: { before: 400 }, children: [] }),
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
