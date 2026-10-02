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

  // Masthead: mark + company stack on the left, document meta on the right, a rule
  // beneath them both, then the title — the shape of the printed invoices this
  // replaces, rather than the centred stack the documents used before.
  headerBlock: {
    marginBottom: 10,
  },
  mastheadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoMark: {
    width: 38,
    height: 38,
  },
  companyName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 15,
    marginBottom: 1,
  },
  companyLine: {
    fontSize: 8,
    color: '#333333',
  },
  ruleThick: {
    borderBottomWidth: 2,
    borderBottomColor: '#111111',
    marginTop: 8,
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    fontSize: 15,
    letterSpacing: 3,
    marginBottom: 4,
  },

  // Client details block
  clientBlock: {
    maxWidth: '60%',
    marginBottom: 10,
  },
  clientLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    marginBottom: 2,
  },
  clientLine: {
    fontSize: 9.5,
  },
  // Label column and value column, so the values line up as a column of their own
  // instead of ragging off the end of labels of different lengths.
  metaBlock: {
    minWidth: 190,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  metaLabel: {
    flexGrow: 1,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  metaValue: {
    width: 95,
    fontSize: 9,
    textAlign: 'right',
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
    // Without flex the Text sizes to its content inside this row and runs over the
    // cell's right border instead of wrapping inside it — the same reason clauseBody
    // carries it. Not something the tree-walking tests can catch: they read the
    // element tree, which has no layout pass. Verified by rendering.
    flex: 1,
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
    width: 250,
    marginTop: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#111111',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  // The reference invoices band their closing rows in grey — it is what makes the
  // number the customer actually owes findable at a glance on a dense page.
  totalsRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#e4e4e4',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  totalsRowLast: {
    borderBottomWidth: 0,
  },
  totalsLabel: {
    fontSize: 9.5,
  },
  totalsLabelFinal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  totalsValue: {
    fontSize: 9.5,
  },
  totalsValueFinal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  paymentTerms: {
    alignSelf: 'flex-end',
    width: 220,
    marginTop: 4,
    marginBottom: 12,
    fontSize: 8.5,
    fontStyle: 'italic',
    textAlign: 'right',
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

  // Receipt body: a bordered panel stating what was paid, closing on the amount —
  // the one figure the customer is checking when they take the page.
  ackBlock: {
    marginTop: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#111111',
  },
  ackRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  ackLabel: {
    width: 150,
    fontSize: 9.5,
    color: '#333333',
  },
  ackValue: {
    flex: 1,
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
  },
  ackTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#e4e4e4',
    borderTopWidth: 1,
    borderTopColor: '#111111',
  },
  ackTotalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  ackTotalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
  },

  // Payment ledger (completion certificate)
  ledgerHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#eeeeee',
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
  },
  ledgerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  ledgerRowLast: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
  },
  ledgerCellDate: {
    width: 80,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#111111',
  },
  ledgerCellKind: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#111111',
  },
  ledgerCellMethod: {
    width: 100,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#111111',
  },
  ledgerCellAmount: {
    width: 90,
    padding: 5,
    textAlign: 'right',
  },

  footerThanks: {
    textAlign: 'center',
    marginTop: 24,
    fontFamily: 'Helvetica-BoldOblique',
    fontSize: 11,
    color: '#b91c1c',
  },
})
