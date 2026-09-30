import { Image, Text, View } from '@react-pdf/renderer'
import type { CompletionSnapshot, QuotationSnapshot, SnapshotClause, SnapshotCustomer, SnapshotUnit } from '@/lib/jobs/snapshot'
import { LOGO_MARK_DATA_URI } from '@/assets/logoMark'
import { styles } from './styles'
import { SpecMarker, OptionMarker } from './Marker'

// Shared across every document kind (quotation, order, receipt, and — slice 4 —
// invoices and the warranty card). Sub-sections are plain functions called as
// `{section()}`, never JSX tags like `<Section />` — see QuotationDocument.test.tsx's
// (and now OrderDocument.test.tsx's / ReceiptDocument.test.tsx's) doc comment on why:
// the tree-walking tests read `element.props.children` directly with no render pass,
// so a `<Section />` tag would just be an unevaluated reference, never resolved.

/** The mark, the company stack and the document's own meta panel, over a rule, under
 *  a centred title. `fields` may be empty — a document with nothing to put on the
 *  right simply gets a masthead with an empty right column. */
export function documentHeader(title: string, fields: { label: string; value: string }[] = []) {
  return (
    <View style={styles.headerBlock}>
      <View style={styles.mastheadRow}>
        <View style={styles.brandRow}>
          {/* Decorative: the wordmark beside it already says who this is from. The
              a11y rule is aimed at DOM images — @react-pdf/renderer's Image draws into
              a PDF and takes no alt prop. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO_MARK_DATA_URI} style={styles.logoMark} />
          <View>
            <Text style={styles.companyName}>Roomy Creations</Text>
            <Text style={styles.companyLine}>roomycreation@gmail.com</Text>
            <Text style={styles.companyLine}>Web - roomycreations.com</Text>
            <Text style={styles.companyLine}>+94 72 292 0088</Text>
          </View>
        </View>
        {fields.length > 0 && (
          <View style={styles.metaBlock}>
            {fields.map((f, i) => (
              <View key={i} style={styles.metaRow}>
                <Text style={styles.metaLabel}>{f.label}</Text>
                <Text style={styles.metaValue}>{f.value}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.ruleThick} />
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

export function clientBlock(customer: SnapshotCustomer) {
  const cityLine = [customer.city, customer.district].filter((v) => v !== null && v !== '').join(', ')
  return (
    <View style={styles.clientBlock}>
      {/* Interpolated into one string rather than split across two children: the
          tests walk the element tree and join sibling children with a space, so
          `Client Details - {name}` would read as "Client Details -  name". */}
      <Text style={styles.clientLabel}>{`Client Details - ${customer.name}`}</Text>
      {customer.addressLines.map((line, i) => (
        <Text key={i} style={styles.clientLine}>
          {line}
        </Text>
      ))}
      {cityLine !== '' && <Text style={styles.clientLine}>{cityLine}</Text>}
      <Text style={styles.clientLine}>{customer.phone}</Text>
      {customer.email && <Text style={styles.clientLine}>{customer.email}</Text>}
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

export interface MoneyRow {
  label: string
  value: string
  /** Banded in grey and set bold — the closing figures, not the arithmetic above them. */
  emphasis: boolean
}

/** The bordered right-aligned figures block. Callers compose their own rows, so the
 *  receipt can close on three rows without inheriting the quotation's arithmetic. */
export function moneyBlock(rows: MoneyRow[]) {
  if (rows.length === 0) return null
  return (
    <View style={styles.totalsBlock}>
      {rows.map((row, i) => {
        const base = row.emphasis ? styles.totalsRowFinal : styles.totalsRow
        return (
          <View key={i} style={i === rows.length - 1 ? [base, styles.totalsRowLast] : base}>
            <Text style={row.emphasis ? styles.totalsLabelFinal : styles.totalsLabel}>{row.label}</Text>
            <Text style={row.emphasis ? styles.totalsValueFinal : styles.totalsValue}>{row.value}</Text>
          </View>
        )
      })}
    </View>
  )
}

/** `extraRows` prints after the Total Price row — used by OrderDocument to add
 *  Advance / Balance Payment without a second block. Label vocabulary (Total → Cash
 *  Discount → Total Price) follows the printed invoices rather than accounting
 *  convention, so a customer holding both reads the same words on each. */
export function totalsBlock(totals: QuotationSnapshot['totals'], extraRows: { label: string; value: string }[] = []) {
  if (!totals) return null

  const rows: MoneyRow[] = [{ label: 'Total', value: totals.subtotalLabel, emphasis: false }]
  if (totals.discountAmountLabel !== null) {
    rows.push({ label: totals.discountLabel, value: totals.discountAmountLabel, emphasis: false })
  }
  rows.push({ label: 'Total Price', value: totals.totalLabel, emphasis: true })
  for (const row of extraRows) rows.push({ ...row, emphasis: true })

  return moneyBlock(rows)
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

/** The completion certificate's payment history. Returns null for a job with no
 *  payments at all rather than printing an empty table — a certificate for an unpaid
 *  job is unusual but not impossible, and an empty bordered box reads like a bug. */
export function paymentLedger(
  payments: CompletionSnapshot['payments'],
  position: CompletionSnapshot['paymentPosition'],
  totalLabel: string | null,
) {
  if (payments.length === 0 && position === null) return null
  return (
    <View>
      <Text style={styles.sectionHeading}>Payment Details</Text>
      {payments.length > 0 && (
        <View style={styles.table}>
          <View style={styles.ledgerHeaderRow}>
            <View style={styles.ledgerCellDate}>
              <Text style={styles.headerCellText}>DATE</Text>
            </View>
            <View style={styles.ledgerCellKind}>
              <Text style={styles.headerCellText}>PAYMENT</Text>
            </View>
            <View style={styles.ledgerCellMethod}>
              <Text style={styles.headerCellText}>METHOD</Text>
            </View>
            <View style={styles.ledgerCellAmount}>
              <Text style={styles.headerCellText}>AMOUNT</Text>
            </View>
          </View>
          {payments.map((payment, i) => (
            <View key={i} style={i === payments.length - 1 ? styles.ledgerRowLast : styles.ledgerRow}>
              <View style={styles.ledgerCellDate}>
                <Text>{payment.paidAtLabel}</Text>
              </View>
              <View style={styles.ledgerCellKind}>
                <Text>{payment.kindLabel}</Text>
              </View>
              <View style={styles.ledgerCellMethod}>
                <Text>{payment.method ?? '-'}</Text>
              </View>
              <View style={styles.ledgerCellAmount}>
                <Text>{payment.amountLabel}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
      {position && (
        <View style={styles.totalsBlock}>
          {totalLabel !== null && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Order Total</Text>
              <Text style={styles.totalsValue}>{totalLabel}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total Paid</Text>
            <Text style={styles.totalsValue}>{position.paidLabel}</Text>
          </View>
          <View style={styles.totalsRowFinal}>
            <Text style={styles.totalsLabelFinal}>Balance</Text>
            <Text style={styles.totalsValueFinal}>{position.balanceLabel}</Text>
          </View>
        </View>
      )}
    </View>
  )
}
