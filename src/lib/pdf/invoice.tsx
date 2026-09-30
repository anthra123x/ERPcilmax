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
 * Réplica exacta de `dian-invoice-view.tsx`: misma estructura, mismo orden de
 * bloques y misma jerarquía. Así lo que muestra la miniatura del panel, lo que
 * sale por impresora y lo que descarga el PDF son el mismo documento.
 */
const styles = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontSize: 9,
    color: COLORS.slate700,
    paddingBottom: 56,
    backgroundColor: COLORS.white,
  },
  body: { paddingHorizontal: 40, paddingTop: 28 },

  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { flexDirection: 'row', alignItems: 'flex-start', flexGrow: 1, paddingRight: 16 },
  logo: { height: 22, width: 22 * LOGO_ASPECT, objectFit: 'contain', marginRight: 9, marginTop: 4 },
  companyName: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, letterSpacing: 0.2 },
  companyLine: { fontSize: 7.5, color: COLORS.slate500, marginTop: 3, lineHeight: 1.45 },

  docBox: { alignItems: 'flex-end' },
  docLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.emerald700, letterSpacing: 1.8 },
  docNumber: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginTop: 4 },
  docVoid: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.slate500, marginTop: 3, letterSpacing: 1 },

  rule: { height: 1, backgroundColor: COLORS.slate300, marginVertical: 14 },

  taxId: { fontSize: 7.5, color: COLORS.slate500, marginTop: 10 },

  kvRow: { flexDirection: 'row' },
  kvCell: { flexGrow: 1, flexBasis: 0, paddingRight: 10 },
  kvLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 1 },
  kvValue: { fontSize: 8, color: COLORS.slate800, marginTop: 3 },
  kvValueStrong: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginTop: 3 },

  twoCol: { flexDirection: 'row' },
  col: { flexGrow: 1, flexBasis: 0, paddingRight: 22 },

  sectionLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 1.2 },
  bodyName: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginTop: 4 },
  bodyLine: { fontSize: 7.5, color: COLORS.slate500, marginTop: 2 },

  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate300,
    paddingBottom: 5,
  },
  th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 0.8 },
  row: { flexDirection: 'row', paddingVertical: 7 },
  td: { fontSize: 8, color: COLORS.slate600 },
  tdBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },
  tdMuted: { fontSize: 7, color: COLORS.slate400 },
  colIdx: { width: 26, textAlign: 'right', paddingRight: 8 },
  colDesc: { flexGrow: 6, flexBasis: 0, paddingRight: 8 },
  colQty: { width: 44, textAlign: 'right' },
  colRate: { width: 66, textAlign: 'right' },
  colDisc: { width: 34, textAlign: 'right' },
  colTax: { width: 32, textAlign: 'right' },
  colTotal: { width: 70, textAlign: 'right' },

  threeCol: { flexDirection: 'row' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5 },
  totalLabel: { fontSize: 8, color: COLORS.slate500 },
  totalValue: { fontSize: 8, color: COLORS.slate800 },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 5,
    paddingTop: 6,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.slate900,
  },
  grandLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, letterSpacing: 1 },
  grandValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },

  taxNote: { fontSize: 6.5, color: COLORS.slate400, marginTop: 6 },

  signature: { height: 26, borderBottomWidth: 1, borderBottomColor: COLORS.slate300, marginTop: 4 },

  legal: { fontSize: 6, color: COLORS.slate400, lineHeight: 1.55 },

  footer: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    paddingTop: 7,
  },
  footerBrand: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COLORS.slate600, textAlign: 'center' },
  footerNote: { marginTop: 2, fontSize: 6, color: COLORS.slate400, textAlign: 'center' },
  footerPage: { marginTop: 2, fontSize: 6, color: COLORS.slate400, textAlign: 'center' },
})

/** Rótulo de sección en versalitas. */
function Label({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>
}

/** Par etiqueta/valor de las filas de importes clave. */
function KeyValue({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.kvCell}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={strong ? styles.kvValueStrong : styles.kvValue}>{value}</Text>
    </View>
  )
}

/** Fila del bloque de totales. */
function TotalRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: TextProps['style'] }) {
  return (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={[styles.totalValue, valueStyle]}>{value}</Text>
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
  const clientName = sale.client?.name || 'Consumidor Final'
  const paid = sumPayments(sale.payments)
  const balance = Math.max(0, Math.round((sale.total - paid) * 100) / 100)
  const creditStatus = getCreditStatus({
    paymentMethod: sale.paymentMethod,
    dueDate: sale.dueDate ? new Date(sale.dueDate) : null,
    status: sale.status ?? 'COMPLETED',
    payments: sale.payments,
    total: sale.total,
  })
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
          {/* 1. Emisor y tipo de documento */}
          <View style={styles.top}>
            <View style={styles.brand}>
              {logo ? <Image style={styles.logo} src={logo} /> : null}
              <View>
                <Text style={styles.companyName}>{company.name.toUpperCase()}</Text>
                {location ? <Text style={styles.companyLine}>{location}</Text> : null}
                {company.phone || company.email ? (
                  <Text style={styles.companyLine}>{[company.phone, company.email].filter(Boolean).join(' • ')}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.docBox}>
              <Text style={styles.docLabel}>FACTURA DE VENTA</Text>
              <Text style={styles.docNumber}>{sale.invoiceNumber}</Text>
              {isCancelled ? <Text style={styles.docVoid}>ANULADA</Text> : null}
            </View>
          </View>

          {company.nit ? (
            <Text style={styles.taxId}>NIT {company.nit} &bull; Régimen ordinario &bull; Responsable de IVA</Text>
          ) : null}

          <View style={styles.rule} />

          {/* 2. Importes y fechas clave */}
          <View style={styles.kvRow}>
            <KeyValue label="TOTAL A PAGAR" value={money(sale.total, currency)} strong />
            <KeyValue label="FECHA DE EMISIÓN" value={formatShortDate(sale.saleDate)} />
            <KeyValue label="VENCE" value={isCredit && sale.dueDate ? formatShortDate(sale.dueDate) : '—'} />
            <KeyValue label="EMITIDA" value={formatTime(sale.saleDate)} />
          </View>

          <View style={styles.rule} />

          {/* 3. Destinatario y contacto */}
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Label>FACTURAR A</Label>
              <Text style={styles.bodyName}>{clientName.toUpperCase()}</Text>
              {sale.client?.phone ? <Text style={styles.bodyLine}>CC/NIT: {sale.client.phone}</Text> : null}
              {sale.client?.address ? <Text style={styles.bodyLine}>{sale.client.address}</Text> : null}
            </View>
            <View style={styles.col}>
              <Label>CONTACTO</Label>
              <Text style={styles.bodyLine}>{sale.client?.phone || company.phone}</Text>
              {sale.client?.email ? <Text style={styles.bodyLine}>{sale.client.email}</Text> : null}
              {sale.user?.name ? <Text style={styles.bodyLine}>Atendió {sale.user.name}</Text> : null}
            </View>
          </View>

          <View style={styles.rule} />

          {/* 4. Detalle */}
          <View>
            <View style={styles.tableHead}>
              <Text style={[styles.th, styles.colIdx]}>#</Text>
              <Text style={[styles.th, styles.colDesc]}>DESCRIPCIÓN DE BIENES O SERVICIOS</Text>
              <Text style={[styles.th, styles.colQty]}>CANT.</Text>
              <Text style={[styles.th, styles.colRate]}>V. UNITARIO</Text>
              <Text style={[styles.th, styles.colDisc]}>DESC.</Text>
              <Text style={[styles.th, styles.colTax]}>IVA</Text>
              <Text style={[styles.th, styles.colTotal]}>TOTAL</Text>
            </View>
            {sale.items.map((item, index) => (
              <View key={`${item.product.name}-${index}`} style={styles.row}>
                <Text style={[styles.tdMuted, styles.colIdx]}>{index + 1}</Text>
                <Text style={[styles.td, styles.colDesc]}>{item.product.name}</Text>
                <Text style={[styles.td, styles.colQty]}>{Number(item.quantity).toFixed(2)}</Text>
                <Text style={[styles.td, styles.colRate]}>{money(item.unitPrice, currency)}</Text>
                <Text style={[styles.tdMuted, styles.colDisc]}>0</Text>
                <Text style={[styles.tdMuted, styles.colTax]}>19%</Text>
                <Text style={[styles.tdBold, styles.colTotal]}>{money(item.total, currency)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.rule} />

          {/* 5. Forma de pago, valor en letras y totales */}
          <View style={styles.threeCol}>
            <View style={styles.col}>
              <Label>FORMA DE PAGO</Label>
              <Text style={styles.bodyLine}>{getPaymentMethodLabel(sale.paymentMethod)}</Text>
              {creditStatus ? <Text style={styles.bodyLine}>{getCreditStatusLabel(creditStatus)}</Text> : null}
              {isCredit ? <Text style={styles.bodyLine}>Abonado {money(paid, currency)}</Text> : null}
            </View>

            <View style={styles.col}>
              <Label>EN LETRAS</Label>
              <Text style={styles.bodyLine}>Son {formatCurrencyInWords(sale.total)}</Text>
              {isCredit && balance > 0 ? (
                <Text style={styles.bodyLine}>Saldo: {formatCurrencyInWords(balance)}</Text>
              ) : null}
            </View>

            <View style={{ flexGrow: 1, flexBasis: 0 }}>
              <TotalRow label="Subtotal" value={money(sale.subtotal, currency)} />
              {sale.discount > 0 ? <TotalRow label="Descuento" value={`-${money(sale.discount, currency)}`} /> : null}
              <TotalRow label="IVA (19%)" value={money(valorIva, currency)} />
              <View style={styles.grandRow}>
                <Text style={styles.grandLabel}>TOTAL</Text>
                <Text style={styles.grandValue}>{money(sale.total, currency)}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.taxNote}>
            IVA 19.00% • Base gravable {money(baseGravable, currency)} • Impuesto {money(valorIva, currency)} • Moneda{' '}
            {currency}
          </Text>

          <View style={styles.rule} />

          {/* 6. Firmas */}
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Label>ACEPTADO POR</Label>
              <Text style={styles.bodyName}>{clientName}</Text>
            </View>
            <View style={styles.col}>
              <Label>FIRMA</Label>
              <View style={styles.signature} />
              <Text style={styles.bodyLine}>{company.name}</Text>
            </View>
          </View>

          <View style={styles.rule} />

          {/* 7. Cierre fiscal */}
          <View>
            <Text style={styles.legal}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>CUFE </Text>
              {cufe}
            </Text>
            <Text style={styles.legal}>
              Documento electrónico de venta. Resolución DIAN No. 18764000001234 del 15/01/2024, rango SETP-1 a
              SETP-10000. Emitido el {formatLongDate(sale.saleDate)} a las {formatTime(sale.saleDate)} (America/Bogotá).
            </Text>
            <Text style={styles.legal}>
              Esta factura de venta se asimila en sus efectos a la letra de cambio según el Art. 774 del Código de
              Comercio. El comprador declara recibir a entera satisfacción los bienes o servicios descritos.
            </Text>
            <Text style={styles.legal}>Documento generado el {formatLongDate(generatedAt)}.</Text>
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
