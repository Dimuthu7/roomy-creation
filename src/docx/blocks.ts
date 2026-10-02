import { AlignmentType, BorderStyle, ImageRun, Paragraph, ShadingType, Table, TableCell, TableRow, TabStopType, TextRun, VerticalAlign, WidthType } from 'docx'
import type { CompletionSnapshot, QuotationSnapshot, SnapshotClause, SnapshotCustomer, SnapshotUnit } from '@/lib/jobs/snapshot'
import { logoMarkBytes } from '@/assets/logoMark'
import { FONT, cellBorders, colors, lightBorder, noBorders, sizes, thinBorder } from './styles'

// The Word twin of src/pdf/blocks.tsx — same section list, same call convention
// (plain functions returning docx nodes, spread straight into a Document's section
// `children`), so the two renderers stay easy to compare side by side. Word has no
// nested-View model, so a PDF View that only grouped children collapses here into
// whatever flat sequence of Paragraph/Table nodes it wrapped.

/** The Word twin of src/pdf/blocks.tsx's documentHeader: mark and company stack on
 *  the left, meta panel on the right, a rule beneath, then the centred title.
 *  `companyEmail` comes from the snapshot (ultimately site_config), not a literal —
 *  see the PDF twin's note. Null omits the line rather than falling back to one. */
export function documentHeader(title: string, fields: { label: string; value: string }[] = [], companyEmail: string | null = null): (Paragraph | Table)[] {
  const markCell = new TableCell({
    borders: noBorders,
    width: { size: 10, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            type: 'png',
            data: logoMarkBytes(),
            transformation: { width: 48, height: 48 },
            altText: { name: 'Roomy Creations', title: 'Roomy Creations', description: 'Roomy Creations mark' },
          }),
        ],
      }),
    ],
  })

  const companyCell = new TableCell({
    borders: noBorders,
    width: { size: 45, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({ children: [new TextRun({ text: 'Roomy Creations', font: FONT, bold: true, size: sizes.companyName })] }),
      ...[...(companyEmail ? [companyEmail] : []), 'Web - roomycreations.com', '+94 72 292 0088'].map(
        (line) => new Paragraph({ children: [new TextRun({ text: line, font: FONT, size: sizes.small, color: colors.muted })] }),
      ),
    ],
  })

  // A right tab stop at the cell's own right edge, so the values line up as a column
  // rather than ragging off the end of labels of different lengths.
  const META_TAB = 4000
  const metaCell = new TableCell({
    borders: noBorders,
    width: { size: 45, type: WidthType.PERCENTAGE },
    children:
      fields.length > 0
        ? fields.map(
            (f) =>
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: META_TAB }],
                children: [
                  new TextRun({ text: `${f.label}\t`, font: FONT, bold: true, size: sizes.body }),
                  new TextRun({ text: f.value, font: FONT, size: sizes.body }),
                ],
              }),
          )
        : [new Paragraph({ children: [] })],
  })

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [markCell, companyCell, metaCell] })],
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: colors.border, space: 6 } },
      spacing: { before: 80, after: 160 },
      children: [],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: title, font: FONT, bold: true, size: sizes.title, characterSpacing: 30 })],
    }),
  ]
}

export function clientBlock(customer: SnapshotCustomer): Paragraph[] {
  const cityLine = [customer.city, customer.district].filter((v) => v !== null && v !== '').join(', ')
  const lines = [
    ...customer.addressLines,
    ...(cityLine !== '' ? [cityLine] : []),
    customer.phone,
    ...(customer.email ? [customer.email] : []),
  ]

  return [
    new Paragraph({ children: [new TextRun({ text: `Client Details - ${customer.name}`, font: FONT, bold: true, size: sizes.sectionHeading })] }),
    ...lines.map((line) => new Paragraph({ children: [new TextRun({ text: line, font: FONT, size: sizes.body })] })),
    new Paragraph({ spacing: { after: 160 }, children: [] }),
  ]
}

const COLUMN_WIDTHS = [52, 16, 16, 16]

function headerCell(text: string, width: number, alignment: (typeof AlignmentType)[keyof typeof AlignmentType]) {
  return new TableCell({
    borders: cellBorders({ bottom: thinBorder, right: thinBorder }),
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: colors.headerFill },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment, children: [new TextRun({ text, font: FONT, bold: true, size: sizes.small })] })],
  })
}

export function tableHeaderRow(): TableRow {
  const [description, price, qty, total] = COLUMN_WIDTHS
  return new TableRow({
    tableHeader: true,
    children: [
      headerCell('DESCRIPTION', description, AlignmentType.LEFT),
      headerCell('PRICE', price, AlignmentType.RIGHT),
      headerCell('QTY/UNITS', qty, AlignmentType.CENTER),
      headerCell('TOTAL', total, AlignmentType.RIGHT),
    ],
  })
}

/** One table row per option, mirroring src/pdf/blocks.tsx's unitRows: a resolved unit
 *  has already been reduced to a single option, so this only ever prints more than one
 *  row per unit when the customer still has a choice to make. */
export function unitRows(unit: SnapshotUnit): TableRow[] {
  const showOptionLabel = unit.options.length > 1
  const [descriptionWidth, priceWidth, qtyWidth, totalWidth] = COLUMN_WIDTHS
  const isLastOption = (i: number) => i === unit.options.length - 1

  return unit.options.map((option, optionIndex) => {
    const bottom = isLastOption(optionIndex) ? thinBorder : lightBorder
    const descriptionLines: Paragraph[] = []

    if (optionIndex === 0) {
      descriptionLines.push(new Paragraph({ children: [new TextRun({ text: unit.title, font: FONT, bold: true, size: sizes.body })] }))
    }
    if (showOptionLabel && option.label) {
      descriptionLines.push(new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: option.label, font: FONT, bold: true, size: sizes.body })] }))
    }
    for (const spec of option.specs) {
      descriptionLines.push(
        new Paragraph({
          indent: { left: 160 },
          children: [
            new TextRun({ text: '- ', font: FONT, size: sizes.small }),
            ...(spec.label ? [new TextRun({ text: `${spec.label} - `, font: FONT, bold: true, size: sizes.small })] : []),
            new TextRun({ text: spec.value, font: FONT, size: sizes.small }),
          ],
        }),
      )
    }
    if (descriptionLines.length === 0) descriptionLines.push(new Paragraph({ children: [] }))

    return new TableRow({
      children: [
        new TableCell({ borders: cellBorders({ bottom, right: thinBorder }), width: { size: descriptionWidth, type: WidthType.PERCENTAGE }, children: descriptionLines }),
        new TableCell({
          borders: cellBorders({ bottom, right: thinBorder }),
          width: { size: priceWidth, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: option.priceLabel, font: FONT, size: sizes.body })] })],
        }),
        new TableCell({
          borders: cellBorders({ bottom, right: thinBorder }),
          width: { size: qtyWidth, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: option.qtyLabel, font: FONT, size: sizes.body })] })],
        }),
        new TableCell({
          borders: cellBorders({ bottom }),
          width: { size: totalWidth, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: option.totalLabel, font: FONT, size: sizes.body })] })],
        }),
      ],
    })
  })
}

export function itemsTable(units: SnapshotUnit[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: thinBorder, left: thinBorder, right: thinBorder, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideHorizontal: lightBorder, insideVertical: lightBorder },
    rows: [tableHeaderRow(), ...units.flatMap((unit) => unitRows(unit))],
  })
}

export function deliveryRow(delivery: QuotationSnapshot['delivery']): Paragraph | null {
  if (delivery.kind === 'none') return null
  const tabStop = 9026 // ~6.27in content width in twips, right edge for a right tab
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: colors.border, space: 4 } },
    spacing: { before: 80, after: 120 },
    tabStops: [{ type: TabStopType.RIGHT, position: tabStop }],
    children: [
      new TextRun({ text: 'Delivery Charges & Installation Charges For All Items\t', font: FONT, size: sizes.body }),
      new TextRun({ text: delivery.kind === 'free' ? 'Free' : (delivery.amountLabel ?? ''), font: FONT, size: sizes.body }),
    ],
  })
}

export interface MoneyRow {
  label: string
  value: string
  /** Banded in grey and set bold, mirroring src/pdf/blocks.tsx's moneyBlock. */
  emphasis: boolean
}

function totalsRow(label: string, value: string, emphasis: boolean): TableRow {
  const shading = emphasis ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E4E4E4' } } : {}
  const runFor = (text: string) => new TextRun({ text, font: FONT, bold: emphasis, size: emphasis ? sizes.sectionHeading : sizes.body })
  return new TableRow({
    children: [
      new TableCell({ borders: cellBorders({ bottom: lightBorder }), ...shading, children: [new Paragraph({ children: [runFor(label)] })] }),
      new TableCell({
        borders: cellBorders({ bottom: lightBorder }),
        ...shading,
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [runFor(value)] })],
      }),
    ],
  })
}

/** The bordered right-aligned figures table. Callers compose their own rows, so the
 *  receipt can close on three rows without inheriting the quotation's arithmetic. */
export function moneyBlock(rows: MoneyRow[]): Table | null {
  if (rows.length === 0) return null
  return new Table({
    alignment: AlignmentType.RIGHT,
    width: { size: 45, type: WidthType.PERCENTAGE },
    borders: { top: thinBorder, left: thinBorder, right: thinBorder, bottom: thinBorder, insideHorizontal: lightBorder, insideVertical: lightBorder },
    rows: rows.map((row) => totalsRow(row.label, row.value, row.emphasis)),
  })
}

/** `extraRows` prints after the Total Price row — used by OrderDocument to add
 *  Advance / Balance Payment without a second table. Label vocabulary follows the
 *  printed invoices, exactly as the PDF twin does. */
export function totalsBlock(totals: QuotationSnapshot['totals'], extraRows: { label: string; value: string }[] = []): Table | null {
  if (!totals) return null
  const rows: MoneyRow[] = [{ label: 'Total', value: totals.subtotalLabel, emphasis: false }]
  if (totals.discountAmountLabel !== null) rows.push({ label: totals.discountLabel, value: totals.discountAmountLabel, emphasis: false })
  rows.push({ label: 'Total Price', value: totals.totalLabel, emphasis: true })
  for (const row of extraRows) rows.push({ ...row, emphasis: true })

  return moneyBlock(rows)
}

export function clauseList(heading: string, clauses: SnapshotClause[]): Paragraph[] {
  if (clauses.length === 0) return []
  return [
    new Paragraph({ spacing: { before: 160, after: 80 }, children: [new TextRun({ text: heading, font: FONT, bold: true, size: sizes.sectionHeading })] }),
    ...clauses.map(
      (clause, i) =>
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: `${i + 1}. ${clause.body}`, font: FONT, bold: clause.emphasis, size: sizes.small })],
        }),
    ),
  ]
}

export function signatureBlock(): Table {
  const column = (lead: string[], caption: string) =>
    new TableCell({
      borders: noBorders,
      width: { size: 50, type: WidthType.PERCENTAGE },
      children: [
        ...lead.map((line) => new Paragraph({ children: [new TextRun({ text: line, font: FONT, size: sizes.body })] })),
        new Paragraph({
          spacing: { before: 480 },
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: colors.border, space: 2 } },
          children: [new TextRun({ text: caption, font: FONT, size: sizes.small })],
        }),
      ],
    })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [column(['Thanking you,', 'Roomy Creations'], 'Authorized Signature'), column(['Approved by Client'], "Client's Signature")],
      }),
    ],
  })
}

/** The completion certificate's payment history. Returns an empty array for a job
 *  with no payments at all rather than printing an empty table — mirrors
 *  src/pdf/blocks.tsx's paymentLedger. */
export function paymentLedger(payments: CompletionSnapshot['payments'], position: CompletionSnapshot['paymentPosition'], totalLabel: string | null): (Paragraph | Table)[] {
  if (payments.length === 0 && position === null) return []

  const nodes: (Paragraph | Table)[] = [
    new Paragraph({ spacing: { before: 160, after: 80 }, children: [new TextRun({ text: 'Payment Details', font: FONT, bold: true, size: sizes.sectionHeading })] }),
  ]

  if (payments.length > 0) {
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        headerCell('DATE', 22, AlignmentType.LEFT),
        headerCell('PAYMENT', 30, AlignmentType.LEFT),
        headerCell('METHOD', 26, AlignmentType.LEFT),
        headerCell('AMOUNT', 22, AlignmentType.RIGHT),
      ],
    })
    const rows = payments.map((payment, i) => {
      const bottom = i === payments.length - 1 ? thinBorder : lightBorder
      const cell = (text: string, alignment: (typeof AlignmentType)[keyof typeof AlignmentType]) =>
        new TableCell({ borders: cellBorders({ bottom, right: thinBorder }), children: [new Paragraph({ alignment, children: [new TextRun({ text, font: FONT, size: sizes.body })] })] })
      return new TableRow({
        children: [cell(payment.paidAtLabel, AlignmentType.LEFT), cell(payment.kindLabel, AlignmentType.LEFT), cell(payment.method ?? '-', AlignmentType.LEFT), cell(payment.amountLabel, AlignmentType.RIGHT)],
      })
    })
    nodes.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: thinBorder, left: thinBorder, right: thinBorder, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } }, rows: [headerRow, ...rows] }))
  }

  if (position) {
    const rows: TableRow[] = []
    if (totalLabel !== null) rows.push(totalsRow('Order Total', totalLabel, false))
    rows.push(totalsRow('Total Paid', position.paidLabel, false))
    rows.push(totalsRow('Balance', position.balanceLabel, true))
    nodes.push(new Table({ alignment: AlignmentType.RIGHT, width: { size: 40, type: WidthType.PERCENTAGE }, rows }))
  }

  return nodes
}
