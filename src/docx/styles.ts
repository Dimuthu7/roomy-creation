import { BorderStyle, WidthType, type ITableCellBorders, type ITableWidthProperties } from 'docx'

// The Word twin of src/pdf/styles.ts. Calibri is the Word default — no font file to
// ship, and it opens looking native rather than like an imported PDF.
export const FONT = 'Calibri'

export const colors = {
  ink: '111111',
  muted: '333333',
  border: '111111',
  borderLight: 'cccccc',
  headerFill: 'eeeeee',
  thanks: 'b91c1c',
}

export const sizes = {
  body: 19, // half-points: 9.5pt
  small: 17, // 8.5pt
  companyName: 36, // 18pt
  title: 26, // 13pt
  sectionHeading: 20, // 10pt
  receiptNumber: 22, // 11pt
}

export const FULL_WIDTH: ITableWidthProperties = { size: 100, type: WidthType.PERCENTAGE }

export const noBorders: ITableCellBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
}

export function cellBorders(overrides: Partial<ITableCellBorders> = {}): ITableCellBorders {
  return { ...noBorders, ...overrides }
}

export const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: colors.border }
export const lightBorder = { style: BorderStyle.SINGLE, size: 2, color: colors.borderLight }
