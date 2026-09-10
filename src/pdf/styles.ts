import { StyleSheet } from '@react-pdf/renderer'

// Helvetica is a standard PDF font — always available, no font file to register or
// ship, which keeps rendering fast and dependency-free on a serverless runtime.
export const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: '#111111',
  },

  // Company block + title
  companyBlock: {
    textAlign: 'center',
    marginBottom: 10,
  },
  companyName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  companyLine: {
    fontSize: 8.5,
    color: '#333333',
  },
  ruleThick: {
    borderBottomWidth: 2,
    borderBottomColor: '#111111',
    marginTop: 6,
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: 10,
  },

  // Client details + meta block
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  clientBlock: {
    maxWidth: '55%',
  },
  clientLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    marginBottom: 2,
  },
  clientLine: {
    fontSize: 9.5,
  },
  metaBlock: {
    textAlign: 'right',
  },
  metaLine: {
    fontSize: 9.5,
    marginBottom: 2,
  },
  metaLabel: {
    fontFamily: 'Helvetica-Bold',
  },

  // Table
  table: {
    borderTopWidth: 1,
    borderTopColor: '#111111',
    borderLeftWidth: 1,
    borderLeftColor: '#111111',
    borderRightWidth: 1,
    borderRightColor: '#111111',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#eeeeee',
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  tableRowLast: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
  },
  cellDescription: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#111111',
  },
  cellPrice: {
    width: 70,
    padding: 6,
    textAlign: 'right',
    borderRightWidth: 1,
    borderRightColor: '#111111',
  },
  cellQty: {
    // Wide enough for the "QTY/UNITS" header at 8.5pt bold without wrapping —
    // narrower widths (tried 46) clipped/wrapped the header against the border.
    width: 66,
    padding: 6,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#111111',
  },
  cellTotal: {
    width: 70,
    padding: 6,
    textAlign: 'right',
  },
  headerCellText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
  },
  unitTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    marginBottom: 3,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 2,
  },
  optionLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
    paddingLeft: 8,
  },
  specText: {
    fontSize: 8.5,
    color: '#222222',
  },
  specLabel: {
    fontFamily: 'Helvetica-Bold',
  },

  // Delivery + totals
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    marginBottom: 6,
  },
  totalsBlock: {
    alignSelf: 'flex-end',
    width: 220,
    marginTop: 4,
    marginBottom: 12,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totalsRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#111111',
  },
  totalsLabel: {
    fontSize: 9.5,
  },
  totalsLabelFinal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
  },
  totalsValue: {
    fontSize: 9.5,
  },
  totalsValueFinal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
  },

  // Tagline, terms, warranty
  tagline: {
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    marginBottom: 12,
  },
  sectionHeading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    marginBottom: 4,
    marginTop: 8,
  },
  clauseRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  clauseIndex: {
    width: 16,
    fontSize: 8.5,
  },
  clauseBody: {
    flex: 1,
    fontSize: 8.5,
  },
  clauseBodyEmphasis: {
    flex: 1,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
  },

  // Signature block
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  signatureColumn: {
    width: '45%',
  },
  signatureLine: {
    fontSize: 9.5,
    marginBottom: 2,
  },
  signatureSpace: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#111111',
    paddingTop: 3,
    fontSize: 8.5,
  },

  footerThanks: {
    textAlign: 'center',
    marginTop: 24,
    fontFamily: 'Helvetica-BoldOblique',
    fontSize: 11,
    color: '#b91c1c',
  },
})
