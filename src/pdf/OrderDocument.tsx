import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { OrderSnapshot } from '@/lib/jobs/snapshot'
import { styles } from './styles'
import { clauseList, clientAndMetaBlock, companyHeader, deliveryRow, signatureBlock, tableHeader, totalsBlock, unitRows } from './blocks'

function metaFields(snapshot: OrderSnapshot) {
  return [
    { label: 'DATE', value: snapshot.confirmedDate },
    { label: 'ORDER', value: snapshot.ref },
    { label: 'SALES PERSON', value: snapshot.salesPerson ?? '-' },
  ]
}

export function OrderDocument({ snapshot }: { snapshot: OrderSnapshot }) {
  const extraRows = snapshot.paymentPosition
    ? [
        { label: 'Advance Paid', value: snapshot.paymentPosition.paidLabel },
        { label: 'Balance Due', value: snapshot.paymentPosition.balanceLabel },
      ]
    : []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {companyHeader('ORDER')}
        {clientAndMetaBlock(metaFields(snapshot), snapshot.customer)}
        <View style={styles.table}>
          {tableHeader()}
          {snapshot.units.map((unit, i) => unitRows(unit, i))}
        </View>
        {deliveryRow(snapshot.delivery)}
        {totalsBlock(snapshot.totals, extraRows)}
        {snapshot.paymentPosition && <Text style={styles.paymentTerms}>{snapshot.paymentTerms}</Text>}
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

export async function renderOrderPdf(snapshot: OrderSnapshot): Promise<Buffer> {
  return renderToBuffer(<OrderDocument snapshot={snapshot} />)
}
