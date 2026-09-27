import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { QuotationSnapshot } from '@/lib/jobs/snapshot'
import { styles } from './styles'
import { clauseList, clientAndMetaBlock, companyHeader, deliveryRow, signatureBlock, tableHeader, totalsBlock, unitRows } from './blocks'

function metaFields(snapshot: QuotationSnapshot) {
  return [
    { label: 'DATE', value: snapshot.quotationDate },
    { label: 'QUOTATION', value: snapshot.ref },
    { label: 'SALES PERSON', value: snapshot.salesPerson ?? '-' },
  ]
}

export function QuotationDocument({ snapshot }: { snapshot: QuotationSnapshot }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {companyHeader('QUOTATION')}
        {clientAndMetaBlock(metaFields(snapshot), snapshot.customer)}
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
