import { Text, View } from '@react-pdf/renderer'
import type { QuotationSnapshot, SnapshotClause, SnapshotCustomer, SnapshotUnit } from '@/lib/jobs/snapshot'
import { styles } from './styles'
import { SpecMarker, OptionMarker } from './Marker'

// Shared across every document kind (quotation, order, receipt, and — slice 4 —
// invoices and the warranty card). Sub-sections are plain functions called as
// `{section()}`, never JSX tags like `<Section />` — see QuotationDocument.test.tsx's
// (and now OrderDocument.test.tsx's / ReceiptDocument.test.tsx's) doc comment on why:
// the tree-walking tests read `element.props.children` directly with no render pass,
// so a `<Section />` tag would just be an unevaluated reference, never resolved.

export function companyHeader(title: string) {
  return (
    <View style={styles.companyBlock}>
      <Text style={styles.companyName}>ROOMY CREATIONS</Text>
      <Text style={styles.companyLine}>Furniture & Interior Solutions</Text>
      <Text style={styles.companyLine}>+94 72 292 0088 · roomycreation@gmail.com</Text>
      <View style={styles.ruleThick} />
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

export function clientAndMetaBlock(fields: { label: string; value: string }[], customer: SnapshotCustomer) {
  const cityLine = [customer.city, customer.district].filter((v) => v !== null && v !== '').join(', ')
  return (
    <View style={styles.topRow}>
      <View style={styles.clientBlock}>
        <Text style={styles.clientLabel}>TO</Text>
        <Text style={styles.clientLine}>{customer.name}</Text>
        {customer.addressLines.map((line, i) => (
          <Text key={i} style={styles.clientLine}>
            {line}
          </Text>
        ))}
        {cityLine !== '' && <Text style={styles.clientLine}>{cityLine}</Text>}
        <Text style={styles.clientLine}>{customer.phone}</Text>
        {customer.email && <Text style={styles.clientLine}>{customer.email}</Text>}
      </View>
      <View style={styles.metaBlock}>
        {fields.map((f, i) => (
          <Text key={i} style={styles.metaLine}>
            <Text style={styles.metaLabel}>{f.label}: </Text>
            {f.value}
          </Text>
        ))}
      </View>
    </View>
  )
}

export function tableHeader() {
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
// unit when the customer still has a choice to make.
export function unitRows(unit: SnapshotUnit, unitIndex: number) {
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

export function deliveryRow(delivery: QuotationSnapshot['delivery']) {
  if (delivery.kind === 'none') return null
  return (
    <View style={styles.deliveryRow}>
      <Text>Delivery Charges & Installation Charges For All Items</Text>
      <Text>{delivery.kind === 'free' ? 'Free' : delivery.amountLabel}</Text>
    </View>
  )
}

/** `extraRows` prints after the final TOTAL row — used by OrderDocument to add
 *  Advance Paid / Balance Due without a second totals block. */
export function totalsBlock(totals: QuotationSnapshot['totals'], extraRows: { label: string; value: string }[] = []) {
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
      {extraRows.map((row, i) => (
        <View key={i} style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>{row.label}</Text>
          <Text style={styles.totalsValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}

export function clauseList(heading: string, clauses: SnapshotClause[]) {
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

export function signatureBlock() {
  return (
    <View style={styles.signatureRow}>
      <View style={styles.signatureColumn}>
        <Text style={styles.signatureLine}>Thanking you,</Text>
        <Text style={styles.signatureLine}>Roomy Creations</Text>
        <Text style={styles.signatureSpace}>Authorized Signature</Text>
      </View>
      <View style={styles.signatureColumn}>
        <Text style={styles.signatureLine}>Approved by Client</Text>
        {/* Matches the left column's two-line lead-in so both signature lines sit at
            the same height — signatureSpace's margin is measured from the preceding
            text, not the row top. */}
        <Text style={styles.signatureLine}> </Text>
        <Text style={styles.signatureSpace}>{"Client's Signature"}</Text>
      </View>
    </View>
  )
}
