import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { getPaymentMethodLabel } from '@/lib/labels'
import {
  COLORS,
  FONT,
  LOGO_ASPECT,
  PdfCompany,
  PdfInvoiceSnapshot,
  PdfSettings,
  formatLongDate,
  formatShortDate,
  formatTime,
  getLogoDataUrl,
  money,
  resolveCompany,
  sumPayments,
} from './theme'

export interface ReceiptPayment {
  id: string
  amount: number
  paymentMethod: string
  paymentDate: Date | string
  notes: string | null
  user?: { name: string } | null
}

export interface ReceiptSale {
  id: string
  invoiceNumber: string
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  saleDate: Date | string
  dueDate?: Date | string | null
  client?: {
    name: string
    phone: string | null
    email: string | null
    address: string | null
  } | null
  payments: ReceiptPayment[]
  invoice?: PdfInvoiceSnapshot | null
}

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 9,
    color: COLORS.slate700,
    paddingBottom: 66,
    backgroundColor: COLORS.white,
  },
  accentBar: { flexDirection: 'row', height: 4, width: '100%' },
  accentTeal: { flexGrow: 1, backgroundColor: COLORS.teal },
  accentAmber: { width: 90, backgroundColor: COLORS.amber },
  body: { paddingHorizontal: 40, paddingTop: 26 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { flexDirection: 'row', alignItems: 'center', flexGrow: 1, paddingRight: 12 },
  logo: { height: 30, width: 30 * LOGO_ASPECT, objectFit: 'contain' },
  brandText: { marginLeft: 10 },
  brandName: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },
  brandKind: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.tealDark, letterSpacing: 1.2, marginTop: 3 },

  docBox: { alignItems: 'flex-end' },
  docLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 1.2 },
  docNumber: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginTop: 3 },
  docDate: { fontSize: 8, color: COLORS.slate500, marginTop: 4 },

  contact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 4,
  },
  contactItem: { fontSize: 8, color: COLORS.slate600, marginRight: 16, marginBottom: 2 },

  metaRow: { flexDirection: 'row', marginTop: 20 },
  metaCol: { flexGrow: 1, flexBasis: 0, paddingRight: 16 },
  metaColRight: { flexGrow: 1, flexBasis: 0, alignItems: 'flex-end' },
  metaLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 1.2, marginBottom: 5 },
  metaName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },
  metaLine: { fontSize: 8.5, color: COLORS.slate500, marginTop: 2 },
  metaValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },

  amountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: COLORS.tealLight,
    borderWidth: 1,
    borderColor: COLORS.tealBorder,
    borderRadius: 6,
  },
  amountLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.tealDark, letterSpacing: 1.2 },
  amountValue: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: COLORS.tealDark, marginTop: 4 },
  amountMeta: { alignItems: 'flex-end' },
  amountMetaLine: { fontSize: 8.5, color: COLORS.slate600, marginBottom: 3 },
  amountMetaStrong: { fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },

  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate400,
    letterSpacing: 1.2,
    marginTop: 22,
    marginBottom: 7,
  },

  summaryBox: { flexDirection: 'row' },
  summaryItem: {
    flexGrow: 1,
    flexBasis: 0,
    marginRight: 8,
    padding: 9,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 4,
    backgroundColor: COLORS.gray50,
  },
  summaryItemLast: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 9,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 4,
    backgroundColor: COLORS.gray50,
  },
  summaryLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 0.8 },
  summaryValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginTop: 3 },
  valueGreen: { color: COLORS.emerald700 },
  valueRed: { color: COLORS.red600 },
  valueMuted: { color: COLORS.slate500, fontFamily: FONT, fontSize: 9 },

  tableHead: {
    flexDirection: 'row',
    backgroundColor: COLORS.tealLight,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  th: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLORS.tealDark, letterSpacing: 0.6 },
  row: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  rowCurrent: {
    backgroundColor: COLORS.amberBg,
    borderBottomColor: COLORS.amber,
  },
  td: { fontSize: 9, color: COLORS.slate600 },
  tdBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },
  colDate: { flexGrow: 3, flexBasis: 0, paddingRight: 8 },
  colMethod: { flexGrow: 2, flexBasis: 0 },
  colMoney: { flexGrow: 2, flexBasis: 0, textAlign: 'right' },

  note: {
    marginTop: 22,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.slate300,
    borderRadius: 4,
  },
  noteText: { fontSize: 7.5, color: COLORS.slate400 },

  footer: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 26,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    paddingTop: 10,
  },
  footerBrand: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: COLORS.tealDark, textAlign: 'center' },
  footerNote: { marginTop: 3, fontSize: 7, color: COLORS.slate400, textAlign: 'center' },
  footerPage: { marginTop: 3, fontSize: 6.5, color: COLORS.slate300, textAlign: 'center' },
})

function ContactStrip({ company }: { company: PdfCompany }) {
  const location = [company.address, company.city].filter(Boolean).join(', ')
  const items = [
    company.nit ? `NIT: ${company.nit}` : null,
    location || null,
    company.phone ? `Tel: ${company.phone}` : null,
    company.email || null,
  ].filter(Boolean) as string[]
  if (items.length === 0) return null
  return (
    <View style={styles.contact}>
      {items.map((item) => (
        <Text key={item} style={styles.contactItem}>
          {item}
        </Text>
      ))}
    </View>
  )
}

export function ReceiptDocument({
  sale,
  paymentId,
  receiptNumber,
  settings,
}: {
  sale: ReceiptSale
  paymentId: string
  receiptNumber: string
  settings?: PdfSettings
}) {
  const company = resolveCompany(settings, sale.invoice)
  const logo = getLogoDataUrl()
  const index = sale.payments.findIndex((p) => p.id === paymentId)
  const payment = sale.payments[index]
  const paidTotal = sumPayments(sale.payments)
  const balance = Math.max(0, Math.round((sale.total - paidTotal) * 100) / 100)
  const generatedAt = new Date()

  if (!payment) return null

  return (
    <Document
      title={`Recibo ${receiptNumber}`}
      author={company.name}
      subject={`Recibo de abono venta ${sale.invoiceNumber}`}
      creator={company.name}
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.accentBar}>
          <View style={styles.accentTeal} />
          <View style={styles.accentAmber} />
        </View>

        <View style={styles.body}>
          <View style={styles.header}>
            <View style={styles.brand}>
              {logo ? <Image style={styles.logo} src={logo} /> : null}
              <View style={styles.brandText}>
                <Text style={styles.brandName}>{company.name}</Text>
                <Text style={styles.brandKind}>RECIBO DE ABONO</Text>
              </View>
            </View>
            <View style={styles.docBox}>
              <Text style={styles.docLabel}>RECIBO N°</Text>
              <Text style={styles.docNumber}>{receiptNumber}</Text>
              <Text style={styles.docDate}>{formatLongDate(payment.paymentDate)}</Text>
              <Text style={styles.docDate}>{formatTime(payment.paymentDate)}</Text>
            </View>
          </View>

          <ContactStrip company={company} />

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>CLIENTE</Text>
              {sale.client ? (
                <View>
                  <Text style={styles.metaName}>{sale.client.name}</Text>
                  {sale.client.phone ? <Text style={styles.metaLine}>Tel: {sale.client.phone}</Text> : null}
                  {sale.client.email ? <Text style={styles.metaLine}>{sale.client.email}</Text> : null}
                </View>
              ) : (
                <Text style={styles.metaLine}>Cliente general</Text>
              )}
            </View>
            <View style={styles.metaColRight}>
              <Text style={styles.metaLabel}>VENTA ASOCIADA</Text>
              <Text style={styles.metaValue}>#{sale.invoiceNumber}</Text>
              <Text style={styles.metaLine}>Fecha de venta: {formatShortDate(sale.saleDate)}</Text>
              {sale.dueDate ? (
                <Text style={styles.metaLine}>Vencimiento: {formatShortDate(sale.dueDate)}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.amountBox}>
            <View>
              <Text style={styles.amountLabel}>VALOR RECIBIDO</Text>
              <Text style={styles.amountValue}>{money(payment.amount, company.currency)}</Text>
            </View>
            <View style={styles.amountMeta}>
              <Text style={styles.amountMetaLine}>
                Método: <Text style={styles.amountMetaStrong}>{getPaymentMethodLabel(payment.paymentMethod)}</Text>
              </Text>
              <Text style={styles.amountMetaLine}>
                Recibido por: <Text style={styles.amountMetaStrong}>{payment.user?.name || company.name}</Text>
              </Text>
              {payment.notes ? (
                <Text style={styles.amountMetaLine}>
                  Nota: <Text style={styles.amountMetaStrong}>{payment.notes}</Text>
                </Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.sectionTitle}>ESTADO DEL CRÉDITO</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TOTAL DE LA VENTA</Text>
              <Text style={styles.summaryValue}>{money(sale.total, company.currency)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TOTAL ABONADO</Text>
              <Text style={[styles.summaryValue, styles.valueGreen]}>{money(paidTotal, company.currency)}</Text>
            </View>
            <View style={styles.summaryItemLast}>
              <Text style={styles.summaryLabel}>SALDO RESTANTE</Text>
              <Text style={[styles.summaryValue, balance > 0 ? styles.valueRed : styles.valueGreen]}>
                {money(balance, company.currency)}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>HISTORIAL DE ABONOS</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colDate]}>FECHA</Text>
            <Text style={[styles.th, styles.colMethod]}>MÉTODO</Text>
            <Text style={[styles.th, styles.colMoney]}>MONTO</Text>
          </View>
          {sale.payments.map((p) => (
            <View key={p.id} style={p.id === paymentId ? [styles.row, styles.rowCurrent] : styles.row}>
              <Text style={[styles.td, styles.colDate]}>{formatLongDate(p.paymentDate)}</Text>
              <Text style={[styles.td, styles.colMethod]}>{getPaymentMethodLabel(p.paymentMethod)}</Text>
              <Text style={[styles.tdBold, styles.colMoney]}>{money(p.amount, company.currency)}</Text>
            </View>
          ))}

          <View style={styles.note}>
            <Text style={styles.noteText}>
              Este documento es un comprobante de pago y no constituye una factura de venta. Documento generado el{' '}
              {formatLongDate(generatedAt)} a las {formatTime(generatedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>
            {company.footer || `${company.name} — Gracias por su pago`}
          </Text>
          <Text style={styles.footerNote}>
            {company.name}
            {company.nit ? ` · NIT ${company.nit}` : ''}
            {company.phone ? ` · Tel ${company.phone}` : ''}
          </Text>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

export async function renderReceiptPdf(
  sale: ReceiptSale,
  paymentId: string,
  receiptNumber: string,
  settings?: PdfSettings,
): Promise<Uint8Array> {
  const buffer = await renderToBuffer(
    <ReceiptDocument sale={sale} paymentId={paymentId} receiptNumber={receiptNumber} settings={settings} />,
  )
  return new Uint8Array(buffer)
}
