import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { getPaymentMethodLabel, getCreditStatus, getCreditStatusLabel } from '@/lib/labels'
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

export interface InvoiceSale {
  id: string
  invoiceNumber: string
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  status?: string
  saleDate: Date | string
  dueDate?: Date | string | null
  payments?: Array<{ amount: number }>
  installments?: Array<{ amount: number; dueDate: Date | string }>
  client?: {
    name: string
    phone: string | null
    email: string | null
    address: string | null
  } | null
  items: Array<{
    quantity: number
    unitPrice: number
    total: number
    product: { name: string }
  }>
  user?: { name: string } | null
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
  docNumber: { fontSize: 19, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginTop: 3 },
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

  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate400,
    letterSpacing: 1.2,
    marginTop: 22,
    marginBottom: 7,
  },

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
  rowAlt: { backgroundColor: COLORS.gray50 },
  td: { fontSize: 9, color: COLORS.slate600 },
  tdBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },
  colDesc: { flexGrow: 4, flexBasis: 0, paddingRight: 8 },
  colQty: { width: 42, textAlign: 'center' },
  colMoney: { width: 74, textAlign: 'right' },

  totals: { alignItems: 'flex-end', marginTop: 16 },
  totalsBox: { width: 230 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 9, color: COLORS.slate600 },
  totalValue: { fontSize: 9, color: COLORS.slate700 },
  totalDiscount: { color: COLORS.red600 },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.tealLight,
    borderTopWidth: 2,
    borderTopColor: COLORS.teal,
    borderRadius: 3,
  },
  grandLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },
  grandValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: COLORS.tealDark },

  creditBox: { flexDirection: 'row', marginTop: 18 },
  creditItem: {
    flexGrow: 1,
    flexBasis: 0,
    marginRight: 8,
    padding: 9,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 4,
    backgroundColor: COLORS.gray50,
  },
  creditItemLast: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 9,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 4,
    backgroundColor: COLORS.gray50,
  },
  creditLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 0.8 },
  creditValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginTop: 3 },
  creditValueGreen: { color: COLORS.emerald700 },
  creditValueRed: { color: COLORS.red600 },

  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 20,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },

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

function ItemsTable({ sale, currency }: { sale: InvoiceSale; currency: string }) {
  return (
    <View>
      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.colDesc]}>PRODUCTO</Text>
        <Text style={[styles.th, styles.colQty]}>CANT.</Text>
        <Text style={[styles.th, styles.colMoney]}>PRECIO UNIT.</Text>
        <Text style={[styles.th, styles.colMoney]}>TOTAL</Text>
      </View>
      {sale.items.map((item, index) => (
        <View key={`${item.product.name}-${index}`} style={[styles.row, index % 2 === 1 ? styles.rowAlt : {}]}>
          <Text style={[styles.tdBold, styles.colDesc]}>{item.product.name}</Text>
          <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
          <Text style={[styles.td, styles.colMoney]}>{money(item.unitPrice, currency)}</Text>
          <Text style={[styles.tdBold, styles.colMoney]}>{money(item.total, currency)}</Text>
        </View>
      ))}
    </View>
  )
}

function CreditSummary({ sale, currency }: { sale: InvoiceSale; currency: string }) {
  const paid = sumPayments(sale.payments)
  const balance = Math.max(0, Math.round((sale.total - paid) * 100) / 100)
  const status = getCreditStatus({
    paymentMethod: sale.paymentMethod,
    dueDate: sale.dueDate ? new Date(sale.dueDate) : null,
    status: sale.status ?? 'COMPLETED',
    payments: sale.payments,
    total: sale.total,
  })
  const badgeStyle =
    status === 'PAID'
      ? { backgroundColor: COLORS.emeraldBg, color: COLORS.emerald700 }
      : status === 'OVERDUE'
        ? { backgroundColor: '#fef2f2', color: COLORS.red700 }
        : { backgroundColor: COLORS.amberBg, color: COLORS.amber700 }

  return (
    <View>
      <Text style={styles.sectionTitle}>RESUMEN DEL CRÉDITO</Text>
      <View style={styles.creditBox}>
        <View style={styles.creditItem}>
          <Text style={styles.creditLabel}>TOTAL DE LA VENTA</Text>
          <Text style={styles.creditValue}>{money(sale.total, currency)}</Text>
        </View>
        <View style={styles.creditItem}>
          <Text style={styles.creditLabel}>ABONADO</Text>
          <Text style={[styles.creditValue, styles.creditValueGreen]}>{money(paid, currency)}</Text>
        </View>
        <View style={styles.creditItem}>
          <Text style={styles.creditLabel}>SALDO PENDIENTE</Text>
          <Text style={[styles.creditValue, balance > 0 ? styles.creditValueRed : styles.creditValueGreen]}>
            {money(balance, currency)}
          </Text>
        </View>
        <View style={styles.creditItemLast}>
          <Text style={styles.creditLabel}>VENCIMIENTO</Text>
          <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginTop: 3 }}>
            {sale.dueDate ? formatShortDate(sale.dueDate) : 'Sin vencimiento'}
          </Text>
          {status && (
            <Text style={[styles.badge, badgeStyle]}>{getCreditStatusLabel(status).toUpperCase()}</Text>
          )}
        </View>
      </View>

      {sale.installments && sale.installments.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>PLAN DE CUOTAS</Text>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colDesc]}>VENCIMIENTO</Text>
            <Text style={[styles.th, styles.colMoney]}>MONTO</Text>
          </View>
          {sale.installments.map((inst, index) => (
            <View key={index} style={[styles.row, index % 2 === 1 ? styles.rowAlt : {}]}>
              <Text style={[styles.td, styles.colDesc]}>{formatLongDate(inst.dueDate)}</Text>
              <Text style={[styles.tdBold, styles.colMoney]}>{money(inst.amount, currency)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export function InvoiceDocument({ sale, settings }: { sale: InvoiceSale; settings?: PdfSettings }) {
  const company = resolveCompany(settings, sale.invoice)
  const logo = getLogoDataUrl()
  const isCredit = sale.paymentMethod === 'CREDITO'
  const footerText = company.footer || `${company.name} — Gracias por su compra`
  const generatedAt = new Date()

  return (
    <Document
      title={`Factura ${sale.invoiceNumber}`}
      author={company.name}
      subject={`Factura de venta ${sale.invoiceNumber}`}
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
                <Text style={styles.brandKind}>FACTURA DE VENTA</Text>
              </View>
            </View>
            <View style={styles.docBox}>
              <Text style={styles.docLabel}>FACTURA N°</Text>
              <Text style={styles.docNumber}>#{sale.invoiceNumber}</Text>
              <Text style={styles.docDate}>{formatLongDate(sale.saleDate)}</Text>
              <Text style={styles.docDate}>{formatTime(sale.saleDate)}</Text>
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
                  {sale.client.address ? <Text style={styles.metaLine}>{sale.client.address}</Text> : null}
                </View>
              ) : (
                <Text style={styles.metaLine}>Cliente general</Text>
              )}
            </View>
            <View style={styles.metaColRight}>
              <Text style={styles.metaLabel}>MÉTODO DE PAGO</Text>
              <Text style={styles.metaValue}>{getPaymentMethodLabel(sale.paymentMethod)}</Text>
              {sale.user?.name ? <Text style={styles.metaLine}>Atendido por: {sale.user.name}</Text> : null}
              <Text style={styles.metaLine}>Estado: {sale.status === 'CANCELLED' ? 'Anulada' : 'Completada'}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>PRODUCTOS</Text>
          <ItemsTable sale={sale} currency={company.currency} />

          <View style={styles.totals}>
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{money(sale.subtotal, company.currency)}</Text>
              </View>
              {sale.discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, styles.totalDiscount]}>Descuento</Text>
                  <Text style={[styles.totalValue, styles.totalDiscount]}>
                    -{money(sale.discount, company.currency)}
                  </Text>
                </View>
              )}
              <View style={styles.grandRow}>
                <Text style={styles.grandLabel}>TOTAL</Text>
                <Text style={styles.grandValue}>{money(sale.total, company.currency)}</Text>
              </View>
            </View>
          </View>

          {isCredit && <CreditSummary sale={sale} currency={company.currency} />}

          <View style={styles.note}>
            <Text style={styles.noteText}>
              Conserve esta factura para efectos de garantía del producto. Documento generado el{' '}
              {formatLongDate(generatedAt)} a las {formatTime(generatedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>{footerText}</Text>
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

export async function renderInvoicePdf(sale: InvoiceSale, settings?: PdfSettings): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<InvoiceDocument sale={sale} settings={settings} />)
  return new Uint8Array(buffer)
}
