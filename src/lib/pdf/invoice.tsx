import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { TextProps } from '@react-pdf/renderer'
import { getPaymentMethodLabel, getCreditStatus, getCreditStatusLabel } from '@/lib/labels'
import { formatCurrencyInWords, generateCufe } from '@/lib/format'
import {
  COLORS,
  FONT,
  LOGO_ASPECT,
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

/**
 * Factura de venta en PDF.
 *
 * Mismo criterio que la representación gráfica en HTML: documento de negocio,
 * no página de producto. Jerarquía emisor → comprador → detalle → totales →
 * condiciones, resuelta con reglas finas y aire. Sin barras de color, sin
 * bloques rellenos, sin cajas ni sombras: la jerarquía la sostiene el peso
 * tipográfico y el espacio en blanco.
 */
const styles = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 9,
    color: COLORS.slate700,
    paddingBottom: 60,
    backgroundColor: COLORS.white,
  },
  body: { paddingHorizontal: 40, paddingTop: 26 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate300,
  },
  brand: { flexDirection: 'row', alignItems: 'flex-start', flexGrow: 1, paddingRight: 16 },
  logo: { height: 26, width: 26 * LOGO_ASPECT, objectFit: 'contain', marginRight: 10, marginTop: 2 },
  brandName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, letterSpacing: 0.4 },
  brandLine: { fontSize: 7.5, color: COLORS.slate500, marginTop: 3, lineHeight: 1.45 },

  docBox: { alignItems: 'flex-end' },
  docLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 1.4 },
  docNumber: { fontSize: 19, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginTop: 4 },
  docDate: { fontSize: 7.5, color: COLORS.slate500, marginTop: 4 },
  docVoid: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate500, marginTop: 3, letterSpacing: 0.8 },

  metaRow: { flexDirection: 'row', marginTop: 20, gap: 28 },
  metaCol: { flexGrow: 1, flexBasis: 0 },
  metaLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate400,
    letterSpacing: 1.4,
    paddingBottom: 5,
    marginBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },
  metaName: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginBottom: 3 },
  metaLine: { fontSize: 7.5, color: COLORS.slate500, marginTop: 2 },

  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5 },
  kvLabel: { fontSize: 7.5, color: COLORS.slate500 },
  kvValue: { fontSize: 7.5, color: COLORS.slate800, textAlign: 'right' },

  table: { marginTop: 22 },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate400,
    paddingBottom: 5,
  },
  th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 1 },
  row: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.slate100 },
  td: { fontSize: 8, color: COLORS.slate600 },
  tdBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },
  tdMuted: { fontSize: 7, color: COLORS.slate400 },
  colDesc: { flexGrow: 5, flexBasis: 0, paddingRight: 10 },
  colQty: { width: 40, textAlign: 'right' },
  colMoney: { width: 74, textAlign: 'right' },
  colIva: { width: 34, textAlign: 'right' },

  bottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  leftStack: { flexGrow: 1, flexBasis: 0, paddingRight: 24 },
  wordsLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 1.2 },
  wordsValue: { fontSize: 8, color: COLORS.slate800, marginTop: 3 },
  taxLine: { fontSize: 6.5, color: COLORS.slate400, marginTop: 12, lineHeight: 1.5 },

  totals: { width: 224 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  totalLabel: { fontSize: 8, color: COLORS.slate500 },
  totalValue: { fontSize: 8, color: COLORS.slate800 },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
    paddingTop: 7,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.slate900,
  },
  grandLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, letterSpacing: 1 },
  grandValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },
  currencyNote: { fontSize: 6.5, color: COLORS.slate400, textAlign: 'right', marginTop: 3 },

  creditTitle: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate400,
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 6,
  },

  legal: { marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.slate300 },
  legalLine: { fontSize: 6, color: COLORS.slate400, lineHeight: 1.55, marginBottom: 2 },

  footer: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 22,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    paddingTop: 7,
  },
  footerBrand: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate600, textAlign: 'center' },
  footerNote: { marginTop: 2, fontSize: 6, color: COLORS.slate400, textAlign: 'center' },
  footerPage: { marginTop: 2, fontSize: 6, color: COLORS.slate400, textAlign: 'center' },
})

/** Par etiqueta/valor de una sola línea. */
function Pair({
  label,
  value,
  labelStyle,
  valueStyle,
}: {
  label: string
  value: string
  labelStyle?: TextProps['style']
  valueStyle?: TextProps['style']
}) {
  return (
    <View style={styles.kv}>
      <Text style={[styles.kvLabel, labelStyle]}>{label}</Text>
      <Text style={[styles.kvValue, valueStyle]}>{value}</Text>
    </View>
  )
}

function ItemsTable({ sale, currency }: { sale: InvoiceSale; currency: string }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.colDesc]}>DESCRIPCIÓN</Text>
        <Text style={[styles.th, styles.colQty]}>CANT.</Text>
        <Text style={[styles.th, styles.colMoney]}>V. UNITARIO</Text>
        <Text style={[styles.th, styles.colIva]}>IVA</Text>
        <Text style={[styles.th, styles.colMoney]}>TOTAL</Text>
      </View>
      {sale.items.map((item, index) => (
        <View key={`${item.product.name}-${index}`} style={styles.row}>
          <Text style={[styles.tdBold, styles.colDesc]}>{item.product.name}</Text>
          <Text style={[styles.td, styles.colQty]}>{Number(item.quantity).toFixed(2)}</Text>
          <Text style={[styles.td, styles.colMoney]}>{money(item.unitPrice, currency)}</Text>
          <Text style={[styles.tdMuted, styles.colIva]}>19%</Text>
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

  return (
    <View>
      <Text style={styles.creditTitle}>CONDICIONES DEL CRÉDITO</Text>
      {/* Alineado a la derecha para compartir columna con el bloque de totales. */}
      <View style={{ alignItems: 'flex-end' }}>
        <View style={styles.totals}>
          <Pair label="Total abonado" value={money(paid, currency)} />
          <Pair label="Saldo pendiente" value={money(balance, currency)} valueStyle={styles.tdBold} />
          <Pair
            label="Vencimiento"
            value={sale.dueDate ? formatShortDate(sale.dueDate) : 'Sin vencimiento'}
            valueStyle={styles.tdBold}
          />
          {status ? <Pair label="Estado" value={getCreditStatusLabel(status)} /> : null}
        </View>
      </View>

      {sale.installments && sale.installments.length > 0 ? (
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colDesc]}>PLAN DE CUOTAS</Text>
            <Text style={[styles.th, styles.colMoney]}>MONTO</Text>
          </View>
          {sale.installments.map((inst, index) => (
            <View key={index} style={styles.row}>
              <Text style={[styles.td, styles.colDesc]}>{formatLongDate(inst.dueDate)}</Text>
              <Text style={[styles.tdBold, styles.colMoney]}>{money(inst.amount, currency)}</Text>
            </View>
          ))}
        </View>
      ) : null}
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

  const currency = company.currency
  const location = [company.address, company.city].filter(Boolean).join(', ')
  const isCancelled = sale.status === 'CANCELLED'

  return (
    <Document
      title={`Factura ${sale.invoiceNumber}`}
      author={company.name}
      subject={`Factura de venta ${sale.invoiceNumber}`}
      creator={company.name}
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.body}>
          {/* 1. Emisor e identificación del documento */}
          <View style={styles.header}>
            <View style={styles.brand}>
              {logo ? <Image style={styles.logo} src={logo} /> : null}
              <View>
                <Text style={styles.brandName}>{company.name.toUpperCase()}</Text>
                {company.nit ? <Text style={styles.brandLine}>NIT {company.nit} · Régimen ordinario</Text> : null}
                {location ? <Text style={styles.brandLine}>{location}</Text> : null}
                {company.phone || company.email ? (
                  <Text style={styles.brandLine}>{[company.phone, company.email].filter(Boolean).join(' · ')}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.docBox}>
              <Text style={styles.docLabel}>FACTURA DE VENTA</Text>
              <Text style={styles.docNumber}>{sale.invoiceNumber}</Text>
              <Text style={styles.docDate}>
                {formatShortDate(sale.saleDate)} · {formatTime(sale.saleDate)}
              </Text>
              {isCancelled ? <Text style={styles.docVoid}>DOCUMENTO ANULADO</Text> : null}
            </View>
          </View>

          {/* 2. Comprador y condiciones de la venta */}
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>FACTURAR A</Text>
              {sale.client ? (
                <View>
                  <Text style={styles.metaName}>{sale.client.name.toUpperCase()}</Text>
                  {sale.client.phone ? <Text style={styles.metaLine}>CC/NIT: {sale.client.phone}</Text> : null}
                  {sale.client.address ? <Text style={styles.metaLine}>Dirección: {sale.client.address}</Text> : null}
                  {sale.client.email ? <Text style={styles.metaLine}>Correo: {sale.client.email}</Text> : null}
                </View>
              ) : (
                <View>
                  <Text style={styles.metaName}>CONSUMIDOR FINAL</Text>
                  <Text style={styles.metaLine}>Identificación: 222222222222</Text>
                </View>
              )}
            </View>

            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>CONDICIONES</Text>
              <Pair
                label="Fecha de emisión"
                value={`${formatShortDate(sale.saleDate)} · ${formatTime(sale.saleDate)}`}
              />
              {isCredit && sale.dueDate ? (
                <Pair label="Fecha de vencimiento" value={formatShortDate(sale.dueDate)} />
              ) : null}
              <Pair
                label="Forma de pago"
                value={`${isCredit ? 'Crédito' : 'Contado'} · ${getPaymentMethodLabel(sale.paymentMethod)}`}
              />
              {sale.user?.name ? <Pair label="Atendió" value={sale.user.name} /> : null}
            </View>
          </View>

          {/* 3. Detalle de la venta */}
          <ItemsTable sale={sale} currency={currency} />

          {/* 4. Totales y valor en letras */}
          <View style={styles.bottom}>
            <View style={styles.leftStack}>
              <Text style={styles.wordsLabel}>VALOR EN LETRAS</Text>
              <Text style={styles.wordsValue}>Son {formatCurrencyInWords(sale.total)}</Text>
              <Text style={styles.taxLine}>
                IVA 19.00% · Base gravable {money(baseGravable, currency)} · Impuesto {money(valorIva, currency)}
              </Text>
            </View>

            <View style={styles.totals}>
              <Pair label="Subtotal" value={money(sale.subtotal, currency)} />
              {sale.discount > 0 ? <Pair label="(-) Descuento" value={`-${money(sale.discount, currency)}`} /> : null}
              <Pair label="IVA (19.00%)" value={money(valorIva, currency)} />
              <View style={styles.grandRow}>
                <Text style={styles.grandLabel}>TOTAL</Text>
                <Text style={styles.grandValue}>{money(sale.total, currency)}</Text>
              </View>
              <Text style={styles.currencyNote}>Moneda: {currency}</Text>
            </View>
          </View>

          {isCredit ? <CreditSummary sale={sale} currency={currency} /> : null}

          {/* 5. Pie fiscal: lo que exige la norma, en el menor espacio posible */}
          <View style={styles.legal}>
            <Text style={styles.legalLine}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>CUFE </Text>
              {cufe}
            </Text>
            <Text style={styles.legalLine}>
              Documento electrónico de venta. Resolución DIAN No. 18764000001234 del 15/01/2024, rango SETP-1 a
              SETP-10000. Emitido el {formatLongDate(sale.saleDate)} a las {formatTime(sale.saleDate)} (America/Bogotá).
            </Text>
            <Text style={styles.legalLine}>
              Esta factura de venta se asimila en sus efectos a la letra de cambio según el Art. 774 del Código de
              Comercio. El comprador declara recibir a entera satisfacción los bienes o servicios descritos.
            </Text>
            <Text style={styles.legalLine}>Documento generado el {formatLongDate(generatedAt)}.</Text>
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
