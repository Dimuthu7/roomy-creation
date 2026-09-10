import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { QuotationSnapshot, SnapshotClause, SnapshotUnit } from '@/lib/jobs/snapshot'
import { styles } from './styles'
import { SpecMarker, OptionMarker } from './Marker'

// Sub-sections are plain functions called as `{section()}`, never JSX tags like
// `<Section />`. QuotationDocument.test.tsx walks the returned element tree by hand
// (no React renderer involved) via `element.props.children` — a `<Section />` tag is
// just an unevaluated reference to the function, and its inner text would never be
// reached without an actual render pass. Calling it directly resolves it up front, so
// the exported element tree already contains real nested elements the test can read.

function companyHeader() {
  return (
    <View style={styles.companyBlock}>
      <Text style={styles.companyName}>ROOMY CREATIONS</Text>
      <Text style={styles.companyLine}>Furniture & Interior Solutions</Text>
      <Text style={styles.companyLine}>+94 72 292 0088 · roomycreation@gmail.com</Text>
      <View style={styles.ruleThick} />
      <Text style={styles.title}>QUOTATION</Text>
    </View>
  )
}

function clientAndMeta(snapshot: QuotationSnapshot) {
  const c = snapshot.customer
  const cityLine = [c.city, c.district].filter((v) => v !== null && v !== '').join(', ')
  return (
    <View style={styles.topRow}>
      <View style={styles.clientBlock}>
        <Text style={styles.clientLabel}>TO</Text>
        <Text style={styles.clientLine}>{c.name}</Text>
        {c.addressLines.map((line, i) => (
          <Text key={i} style={styles.clientLine}>
            {line}
          </Text>
        ))}
        {cityLine !== '' && <Text style={styles.clientLine}>{cityLine}</Text>}
        <Text style={styles.clientLine}>{c.phone}</Text>
        {c.email && <Text style={styles.clientLine}>{c.email}</Text>}
      </View>
      <View style={styles.metaBlock}>
        <Text style={styles.metaLine}>
          <Text style={styles.metaLabel}>DATE: </Text>
          {snapshot.quotationDate}
        </Text>
        <Text style={styles.metaLine}>
          <Text style={styles.metaLabel}>QUOTATION: </Text>
          {snapshot.ref}
        </Text>
        <Text style={styles.metaLine}>
          <Text style={styles.metaLabel}>SALES PERSON: </Text>
          {snapshot.salesPerson ?? '-'}
        </Text>
      </View>
    </View>
  )
}

function tableHeader() {
  return (
    <View style={styles.tableHeaderRow}>
      <View style={styles.cellDescription}>
        <Text style={styles.headerCellText}>DESCRIPTION</Text>
      </View>
      <View style={styles.cellPrice}>
        <Text style={styles.headerCellText}>PRICE</Text>
      </View>
      <View style={styles.cellQty}>
        <Text style={styles.headerCellText}>QTY/UNITS</Text>
      </View>
      <View style={styles.cellTotal}>
        <Text style={styles.headerCellText}>TOTAL</Text>
      </View>
    </View>
  )
}

// One table row per option. A resolved unit has already been reduced to a single
// option by buildQuotationSnapshot, so this only ever prints more than one row per
// unit when the customer still has a choice to make — matching RC194's layout of a
// ➢ Option heading per row, versus RC188's single unmarked row per unit.
function unitRows(unit: SnapshotUnit, unitIndex: number) {
  const showOptionLabel = unit.options.length > 1
  return unit.options.map((option, optionIndex) => (
    <View
      key={`${unitIndex}-${optionIndex}`}
      style={optionIndex === unit.options.length - 1 ? styles.tableRowLast : styles.tableRow}
    >
      <View style={styles.cellDescription}>
        {optionIndex === 0 && <Text style={styles.unitTitle}>{unit.title}</Text>}
        {showOptionLabel && option.label && (
          <View style={styles.optionRow}>
            <OptionMarker />
            <Text style={styles.optionLabel}>{option.label}</Text>
          </View>
        )}
        {option.specs.map((spec, specIndex) => (
          <View key={specIndex} style={styles.specRow}>
            <SpecMarker />
            <Text style={styles.specText}>
              {spec.label && <Text style={styles.specLabel}>{spec.label} - </Text>}
              {spec.value}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.cellPrice}>
        <Text>{option.priceLabel}</Text>
      </View>
      <View style={styles.cellQty}>
        <Text>{option.qtyLabel}</Text>
      </View>
      <View style={styles.cellTotal}>
        <Text>{option.totalLabel}</Text>
      </View>
    </View>
  ))
}

function deliveryRow(delivery: QuotationSnapshot['delivery']) {
  if (delivery.kind === 'none') return null
  return (
    <View style={styles.deliveryRow}>
      <Text>Delivery Charges & Installation Charges For All Items</Text>
      <Text>{delivery.kind === 'free' ? 'Free' : delivery.amountLabel}</Text>
    </View>
  )
}

function totalsBlock(totals: QuotationSnapshot['totals']) {
  if (!totals) return null
  return (
    <View style={styles.totalsBlock}>
      <View style={styles.totalsRow}>
        <Text style={styles.totalsLabel}>Subtotal</Text>
        <Text style={styles.totalsValue}>{totals.subtotalLabel}</Text>
      </View>
      {totals.discountAmountLabel !== null && (
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>{totals.discountLabel}</Text>
          <Text style={styles.totalsValue}>{totals.discountAmountLabel}</Text>
        </View>
      )}
      <View style={styles.totalsRowFinal}>
        <Text style={styles.totalsLabelFinal}>TOTAL</Text>
        <Text style={styles.totalsValueFinal}>{totals.totalLabel}</Text>
      </View>
    </View>
  )
}

function clauseList(heading: string, clauses: SnapshotClause[]) {
  if (clauses.length === 0) return null
  return (
    <View>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {clauses.map((clause, i) => (
        <View key={i} style={styles.clauseRow}>
          <Text style={styles.clauseIndex}>{i + 1}.</Text>
          <Text style={clause.emphasis ? styles.clauseBodyEmphasis : styles.clauseBody}>{clause.body}</Text>
        </View>
      ))}
    </View>
  )
}

function signatureBlock() {
  return (
    <View style={styles.signatureRow}>
      <View style={styles.signatureColumn}>
        <Text style={styles.signatureLine}>Thanking you,</Text>
        <Text style={styles.signatureLine}>Roomy Creations</Text>
        <Text style={styles.signatureSpace}>Authorized Signature</Text>
      </View>
      <View style={styles.signatureColumn}>
        <Text style={styles.signatureLine}>Approved by Client</Text>
        <Text style={styles.signatureSpace}>{"Client's Signature"}</Text>
      </View>
    </View>
  )
}

export function QuotationDocument({ snapshot }: { snapshot: QuotationSnapshot }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {companyHeader()}
        {clientAndMeta(snapshot)}
        <View style={styles.table}>
          {tableHeader()}
          {snapshot.units.map((unit, i) => unitRows(unit, i))}
        </View>
        {deliveryRow(snapshot.delivery)}
        {totalsBlock(snapshot.totals)}
        <Text style={styles.tagline}>
          Our Furniture Is Made From The Finest Quality Materials & Finished To A High Standard
        </Text>
        {clauseList('Terms & Conditions', snapshot.terms)}
        {clauseList('Warranty', snapshot.warranty)}
        {signatureBlock()}
        <Text style={styles.footerThanks}>Thank You For Your Business!</Text>
      </Page>
    </Document>
  )
}

export async function renderQuotationPdf(snapshot: QuotationSnapshot): Promise<Buffer> {
  return renderToBuffer(<QuotationDocument snapshot={snapshot} />)
}
