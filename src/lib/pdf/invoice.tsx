import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { getPaymentMethodLabel, getCreditStatus, getCreditStatusLabel } from '@/lib/labels'
import { formatCurrencyInWords, generateCufe } from '@/lib/format'
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
  accentBar: { height: 3, width: '100%', backgroundColor: COLORS.slate900 },
  body: { paddingHorizontal: 36, paddingTop: 24 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { flexDirection: 'row', alignItems: 'center', flexGrow: 1, paddingRight: 12 },
  logo: { height: 32, width: 32 * LOGO_ASPECT, objectFit: 'contain' },
  brandText: { marginLeft: 10 },
  brandName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },
  brandKind: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate500, letterSpacing: 1.2, marginTop: 3 },

  docBox: { alignItems: 'flex-end' },
  docLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 1.2 },
  docNumber: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginTop: 3 },
  docDate: { fontSize: 8, color: COLORS.slate500, marginTop: 3 },

  contact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 4,
  },
  contactItem: { fontSize: 8, color: COLORS.slate600, marginRight: 16, marginBottom: 2 },

  metaRow: { flexDirection: 'row', marginTop: 18, borderTopWidth: 1, borderTopColor: COLORS.slate200, paddingTop: 14 },
  metaCol: { flexGrow: 1, flexBasis: 0, paddingRight: 16 },
  metaColRight: { flexGrow: 1, flexBasis: 0, alignItems: 'flex-end' },
  metaLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 1.2, marginBottom: 4 },
  metaName: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },
  metaLine: { fontSize: 8, color: COLORS.slate500, marginTop: 2 },
  metaValue: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },

  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate400,
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 6,
  },

  tableHead: {
    flexDirection: 'row',
    backgroundColor: COLORS.slate100,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate300,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  th: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate700, letterSpacing: 0.5 },
  row: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },
  rowAlt: { backgroundColor: COLORS.slate50 },
  td: { fontSize: 8.5, color: COLORS.slate600 },
  tdBold: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },
  colDesc: { flexGrow: 4, flexBasis: 0, paddingRight: 8 },
  colQty: { width: 42, textAlign: 'center' },
  colMoney: { width: 78, textAlign: 'right' },

  totals: { alignItems: 'flex-end', marginTop: 14 },
  totalsBox: { width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  totalLabel: { fontSize: 8.5, color: COLORS.slate600 },
  totalValue: { fontSize: 8.5, color: COLORS.slate700 },
  totalDiscount: { color: COLORS.red600 },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.slate900,
    borderRadius: 3,
  },
  grandLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: COLORS.white },
  grandValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: COLORS.white },

  creditBox: { flexDirection: 'row', marginTop: 14 },
  creditItem: {
    flexGrow: 1,
    flexBasis: 0,
    marginRight: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 4,
    backgroundColor: COLORS.slate50,
  },
  creditItemLast: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 4,
    backgroundColor: COLORS.slate50,
  },
  creditLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 0.8 },
  creditValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginTop: 2 },
  creditValueGreen: { color: COLORS.emerald700 },
  creditValueRed: { color: COLORS.red600 },

  badge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 12,
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
  },

  note: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.slate300,
    borderRadius: 4,
  },
  noteText: { fontSize: 6.5, color: COLORS.slate500, lineHeight: 1.25 },

  dianBox: {
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 4,
  },
  dianText: { fontSize: 6.5, color: COLORS.slate600, lineHeight: 1.25 },

  wordsBox: {
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 4,
  },
  wordsLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 0.8 },
  wordsValue: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginTop: 1 },

  cufeBox: {
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 4,
  },
  cufeLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: COLORS.slate500, letterSpacing: 0.8 },
  cufeHash: { fontSize: 5.5, color: COLORS.slate700, fontFamily: 'Courier', marginTop: 1 },

  footer: {
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 22,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    paddingTop: 8,
  },
  footerBrand: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate700, textAlign: 'center' },
  footerNote: { marginTop: 2, fontSize: 6.5, color: COLORS.slate400, textAlign: 'center' },
  footerPage: { marginTop: 2, fontSize: 6.5, color: COLORS.slate400, textAlign: 'center' },
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
          {status && <Text style={[styles.badge, badgeStyle]}>{getCreditStatusLabel(status).toUpperCase()}</Text>}
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

  const baseGravable = Math.round((sale.total / 1.19) * 100) / 100
  const valorIva = Math.round((sale.total - baseGravable) * 100) / 100
  const cufe = generateCufe(
    sale.invoiceNumber,
    sale.saleDate,
    sale.total,
    company.nit?.replace(/\D/g, '') || '901482391',
    sale.client?.phone?.replace(/\D/g, '') || '222222222222',
  )

  return (
    <Document
      title={`Factura ${sale.invoiceNumber}`}
      author={company.name}
      subject={`Factura de venta ${sale.invoiceNumber}`}
      creator={company.name}
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.accentBar} />

        <View style={styles.body}>
          <View style={styles.header}>
            <View style={styles.brand}>
              {logo ? <Image style={styles.logo} src={logo} /> : null}
              <View style={styles.brandText}>
                <Text style={styles.brandName}>{company.name}</Text>
                <Text style={styles.brandKind}>FACTURA ELECTRÓNICA DE VENTA</Text>
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

          <View style={styles.dianBox}>
            <Text style={styles.dianText}>
              Autorización DIAN No. 18764000001234 de 2024-01-15 &bull; Vigencia: 18 meses &bull; Rango: SETP-1 a
              SETP-10000 &bull; Responsable de IVA &bull; Tipo: 10 (Estándar)
            </Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>CLIENTE / ADQUIRIENTE</Text>
              {sale.client ? (
                <View>
                  <Text style={styles.metaName}>{sale.client.name}</Text>
                  {sale.client.phone ? <Text style={styles.metaLine}>CC/NIT: {sale.client.phone}</Text> : null}
                  {sale.client.email ? <Text style={styles.metaLine}>Email: {sale.client.email}</Text> : null}
                  {sale.client.address ? <Text style={styles.metaLine}>Dir: {sale.client.address}</Text> : null}
                </View>
              ) : (
                <View>
                  <Text style={styles.metaName}>CONSUMIDOR FINAL</Text>
                  <Text style={styles.metaLine}>NIT: 222222222222</Text>
                </View>
              )}
            </View>
            <View style={styles.metaColRight}>
              <Text style={styles.metaLabel}>MÉTODO Y FORMA DE PAGO</Text>
              <Text style={styles.metaValue}>{getPaymentMethodLabel(sale.paymentMethod)}</Text>
              <Text style={styles.metaLine}>Forma: {isCredit ? '2 - Crédito' : '1 - Contado'}</Text>
              {sale.user?.name ? <Text style={styles.metaLine}>Atendido por: {sale.user.name}</Text> : null}
              <Text style={styles.metaLine}>Estado: {sale.status === 'CANCELLED' ? 'Anulada' : 'Completada'}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>DETALLE DE PRODUCTOS Y SERVICIOS</Text>
          <ItemsTable sale={sale} currency={company.currency} />

          <View style={styles.totals}>
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal Bruto</Text>
                <Text style={styles.totalValue}>{money(sale.subtotal, company.currency)}</Text>
              </View>
              {sale.discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, styles.totalDiscount]}>Descuento Comercial</Text>
                  <Text style={[styles.totalValue, styles.totalDiscount]}>
                    -{money(sale.discount, company.currency)}
                  </Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Base Gravable (19%)</Text>
                <Text style={styles.totalValue}>{money(baseGravable, company.currency)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IVA (19.00%)</Text>
                <Text style={styles.totalValue}>{money(valorIva, company.currency)}</Text>
              </View>
              <View style={styles.grandRow}>
                <Text style={styles.grandLabel}>TOTAL FACTURA</Text>
                <Text style={styles.grandValue}>{money(sale.total, company.currency)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.wordsBox}>
            <Text style={styles.wordsLabel}>VALOR EN LETRAS:</Text>
            <Text style={styles.wordsValue}>SON: {formatCurrencyInWords(sale.total)}</Text>
          </View>

          {isCredit && <CreditSummary sale={sale} currency={company.currency} />}

          <View style={styles.cufeBox}>
            <Text style={styles.cufeLabel}>CUFE (Código Único de Factura Electrónica - SHA-384):</Text>
            <Text style={styles.cufeHash}>{cufe}</Text>
          </View>

          <View style={styles.note}>
            <Text style={styles.noteText}>
              Título Valor: Esta factura de venta se asimila en sus efectos a la letra de cambio de conformidad con el
              Art. 774 del Código de Comercio. El comprador declara haber recibido real y materialmente las mercancías o
              servicios descritos. Documento generado el {formatLongDate(generatedAt)} a las {formatTime(generatedAt)}.
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
