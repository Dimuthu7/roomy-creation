import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { ReceiptSnapshot } from '@/lib/jobs/snapshot'
import { styles } from './styles'
import { companyHeader, signatureBlock } from './blocks'

function ackRow(label: string, value: string) {
  return (
    <View style={styles.ackRow}>
      <Text style={styles.ackLabel}>{label}</Text>
      <Text style={styles.ackValue}>{value}</Text>
    </View>
  )
}

export function ReceiptDocument({ snapshot }: { snapshot: ReceiptSnapshot }) {
  const receivedOnValue = snapshot.method ? `${snapshot.paidAtLabel}  by ${snapshot.method}` : snapshot.paidAtLabel

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {companyHeader('RECEIPT')}
        <View style={styles.receiptNumberRow}>
          <Text style={styles.receiptNumber}>{snapshot.number}</Text>
        </View>
        <View style={styles.ackBlock}>
          {ackRow('Received with thanks from', snapshot.customerName)}
          {ackRow('the sum of', snapshot.amountLabel)}
          {ackRow('being', `${snapshot.kindLabel} for ${snapshot.ref}`)}
          {ackRow('received on', receivedOnValue)}
          {snapshot.balanceRemainingLabel !== null && ackRow('Balance remaining', snapshot.balanceRemainingLabel)}
        </View>
        {signatureBlock()}
        <Text style={styles.footerThanks}>Thank You For Your Business!</Text>
      </Page>
    </Document>
  )
}

export async function renderReceiptPdf(snapshot: ReceiptSnapshot): Promise<Buffer> {
  return renderToBuffer(<ReceiptDocument snapshot={snapshot} />)
}
