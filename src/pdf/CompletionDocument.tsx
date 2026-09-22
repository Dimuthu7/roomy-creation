import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { CompletionSnapshot } from '@/lib/jobs/snapshot'
import { styles } from './styles'
import { clauseList, clientAndMetaBlock, companyHeader, deliveryRow, paymentLedger, signatureBlock, tableHeader, totalsBlock, unitRows } from './blocks'

/** Both dates appear because the pair states how long the job took, which is the
 *  first question a warranty claim asks. ORDER carries the job's RC ref so the
 *  certificate can be tied back to the order document the customer already holds. */
function metaFields(snapshot: CompletionSnapshot) {
  return [
    { label: 'COMPLETED', value: snapshot.completedDate },
    { label: 'ORDER', value: snapshot.ref },
    { label: 'CONFIRMED', value: snapshot.confirmedDate },
    { label: 'SALES PERSON', value: snapshot.salesPerson ?? '-' },
  ]
}

export function CompletionDocument({ snapshot }: { snapshot: CompletionSnapshot }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {companyHeader('COMPLETION CERTIFICATE')}
        <View style={styles.receiptNumberRow}>
          <Text style={styles.receiptNumber}>{snapshot.number}</Text>
        </View>
        {clientAndMetaBlock(metaFields(snapshot), snapshot.customer)}
        <Text style={styles.sectionHeading}>Items Delivered</Text>
        <View style={styles.table}>
          {tableHeader()}
          {snapshot.units.map((unit, i) => unitRows(unit, i))}
        </View>
        {deliveryRow(snapshot.delivery)}
        {totalsBlock(snapshot.totals)}
        {paymentLedger(snapshot.payments, snapshot.paymentPosition, snapshot.totals?.totalLabel ?? null)}
        <Text style={styles.tagline}>
          Our Furniture Is Made From The Finest Quality Materials & Finished To A High Standard
        </Text>
        {clauseList('Warranty', snapshot.warranty)}
        {clauseList('Terms & Conditions', snapshot.terms)}
        {signatureBlock()}
        <Text style={styles.footerThanks}>Thank You For Your Business!</Text>
      </Page>
    </Document>
  )
}

export async function renderCompletionPdf(snapshot: CompletionSnapshot): Promise<Buffer> {
  return renderToBuffer(<CompletionDocument snapshot={snapshot} />)
}
