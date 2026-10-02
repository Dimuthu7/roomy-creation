import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { ReceiptSnapshot } from '@/lib/jobs/snapshot'
import { styles } from './styles'
import { clientBlock, documentHeader, moneyBlock, signatureBlock } from './blocks'

function ackRow(label: string, value: string) {
  return (
    <View style={styles.ackRow}>
      <Text style={styles.ackLabel}>{label}</Text>
      <Text style={styles.ackValue}>{value}</Text>
    </View>
  )
}

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

/** Where the job stands after this payment, in the same three rows and the same
 *  vocabulary the order document closes with. Null unless the job total was known
 *  when the receipt was issued. */
function positionBlock(snapshot: ReceiptSnapshot) {
  if (!snapshot.totalLabel || !snapshot.paidLabel || snapshot.balanceRemainingLabel === null) return null
  return moneyBlock([
    { label: 'Total Price', value: snapshot.totalLabel, emphasis: false },
    { label: 'Advance', value: snapshot.paidLabel, emphasis: false },
    { label: 'Balance Payment', value: snapshot.balanceRemainingLabel, emphasis: true },
  ])
}

export function ReceiptDocument({ snapshot }: { snapshot: ReceiptSnapshot }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {documentHeader('RECEIPT', metaFields(snapshot), snapshot.companyEmail ?? null)}
        {snapshot.customer && clientBlock(snapshot.customer)}
        <View style={styles.ackBlock}>
          {ackRow('Received With Thanks From', snapshot.customerName)}
          {ackRow('Being', `${snapshot.kindLabel} for ${snapshot.ref}`)}
          {snapshot.method && ackRow('Method', snapshot.method)}
          <View style={styles.ackTotalRow}>
            <Text style={styles.ackTotalLabel}>Amount Received</Text>
            <Text style={styles.ackTotalValue}>{snapshot.amountLabel}</Text>
          </View>
        </View>
        {positionBlock(snapshot)}
        <Text style={styles.tagline}>
          Our Furniture Is Made From The Finest Quality Materials & Finished To A High Standard
        </Text>
        {signatureBlock()}
        <Text style={styles.footerThanks}>Thank You For Your Business!</Text>
      </Page>
    </Document>
  )
}

export async function renderReceiptPdf(snapshot: ReceiptSnapshot): Promise<Buffer> {
  return renderToBuffer(<ReceiptDocument snapshot={snapshot} />)
}
