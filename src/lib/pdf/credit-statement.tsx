import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { getCreditStatus, getCreditStatusLabel, getPaymentMethodLabel } from '@/lib/labels'
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

export interface StatementPayment {
  id: string
  amount: number
  paymentMethod: string
  paymentDate: Date | string
  notes: string | null
  user?: { name: string } | null
}

export interface StatementSale {
  id: string
  invoiceNumber: string
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  status: string
  saleDate: Date | string
  dueDate?: Date | string | null
  client?: {
    name: string
    phone: string | null
    email: string | null
    address: string | null
  } | null
  payments: StatementPayment[]
  installments: Array<{ id: string; amount: number; dueDate: Date | string }>
  invoice?: PdfInvoiceSnapshot | null
}

type InstallmentState = 'PAID' | 'OVERDUE' | 'PENDING'

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

  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 20,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },

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
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 4,
    backgroundColor: COLORS.gray50,
  },
  summaryItemLast: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 4,
    backgroundColor: COLORS.gray50,
  },
  summaryLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: COLORS.slate400, letterSpacing: 0.8 },
  summaryValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: COLORS.slate900, marginTop: 4 },
  valueGreen: { color: COLORS.emerald700 },
  valueRed: { color: COLORS.red600 },

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
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  rowAlt: { backgroundColor: COLORS.gray50 },
  td: { fontSize: 9, color: COLORS.slate600 },
  tdBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.slate900 },
  colDate: { flexGrow: 3, flexBasis: 0, paddingRight: 8 },
  colMethod: { flexGrow: 2, flexBasis: 0 },
  colMoney: { flexGrow: 2, flexBasis: 0, textAlign: 'right' },
  colStatus: { width: 70, alignItems: 'flex-end' },
  colStatusHead: { width: 70, textAlign: 'right' },

  pill: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 20 },
  pillText: { fontSize: 7, fontFamily: 'Helvetica-Bold' },

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

function StatusPill({ state }: { state: InstallmentState }) {
  const palette =
    state === 'PAID'
      ? { backgroundColor: COLORS.emeraldBg, color: COLORS.emerald700 }
      : state === 'OVERDUE'
        ? { backgroundColor: '#fef2f2', color: COLORS.red700 }
        : { backgroundColor: COLORS.amberBg, color: COLORS.amber700 }
  return (
    <View style={[styles.pill, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.pillText, { color: palette.color }]}>
        {getCreditStatusLabel(state).toUpperCase()}
      </Text>
    </View>
  )
}

export function CreditStatementDocument({ sale, settings }: { sale: StatementSale; settings?: PdfSettings }) {
  const company = resolveCompany(settings, sale.invoice)
  const logo = getLogoDataUrl()
  const paid = sumPayments(sale.payments)
  const balance = Math.max(0, Math.round((sale.total - paid) * 100) / 100)
  const status = getCreditStatus({
    paymentMethod: sale.paymentMethod,
    dueDate: sale.dueDate ? new Date(sale.dueDate) : null,
    status: sale.status,
    payments: sale.payments,
    total: sale.total,
  })
  const badgeStyle =
    status === 'PAID'
      ? { backgroundColor: COLORS.emeraldBg, color: COLORS.emerald700 }
      : status === 'OVERDUE'
        ? { backgroundColor: '#fef2f2', color: COLORS.red700 }
        : { backgroundColor: COLORS.amberBg, color: COLORS.amber700 }
  const generatedAt = new Date()

  const installmentRows = sale.installments.map((inst, index) => {
    const accumulated = Math.round(
      sale.installments.slice(0, index + 1).reduce((total, current) => total + current.amount, 0) * 100,
    ) / 100
    const markedPaid = paid >= accumulated - 0.005
    const overdue = !markedPaid && new Date(inst.dueDate).getTime() < generatedAt.getTime()
    const state: InstallmentState = markedPaid ? 'PAID' : overdue ? 'OVERDUE' : 'PENDING'
    return { inst, state }
  })

  return (
    <Document
      title={`Estado de cuenta ${sale.invoiceNumber}`}
      author={company.name}
      subject={`Estado de cuenta crédito ${sale.invoiceNumber}`}
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
                <Text style={styles.brandKind}>ESTADO DE CUENTA</Text>
              </View>
            </View>
            <View style={styles.docBox}>
              <Text style={styles.docLabel}>CRÉDITO N°</Text>
              <Text style={styles.docNumber}>#{sale.invoiceNumber}</Text>
              <Text style={styles.docDate}>Emitido el {formatLongDate(generatedAt)}</Text>
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
              <Text style={styles.metaLabel}>ESTADO DEL CRÉDITO</Text>
              {status && (
                <Text style={[styles.badge, badgeStyle]}>{getCreditStatusLabel(status).toUpperCase()}</Text>
              )}
              <Text style={[styles.metaLine, { marginTop: 5 }]}>
                Fecha de venta: {formatShortDate(sale.saleDate)}
              </Text>
              <Text style={styles.metaLine}>
                Vencimiento: {sale.dueDate ? formatShortDate(sale.dueDate) : 'Sin vencimiento'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>RESUMEN</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TOTAL DE LA VENTA</Text>
              <Text style={styles.summaryValue}>{money(sale.total, company.currency)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TOTAL ABONADO</Text>
              <Text style={[styles.summaryValue, styles.valueGreen]}>{money(paid, company.currency)}</Text>
            </View>
            <View style={styles.summaryItemLast}>
              <Text style={styles.summaryLabel}>SALDO PENDIENTE</Text>
              <Text style={[styles.summaryValue, balance > 0 ? styles.valueRed : styles.valueGreen]}>
                {money(balance, company.currency)}
              </Text>
            </View>
          </View>

          {installmentRows.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>PLAN DE CUOTAS</Text>
              <View style={styles.tableHead}>
                <Text style={[styles.th, styles.colDate]}>VENCIMIENTO</Text>
                <Text style={[styles.th, styles.colMoney]}>MONTO</Text>
                <Text style={[styles.th, styles.colStatusHead]}>ESTADO</Text>
              </View>
              {installmentRows.map(({ inst, state }, index) => (
                <View key={inst.id} style={[styles.row, index % 2 === 1 ? styles.rowAlt : {}]}>
                  <Text style={[styles.td, styles.colDate]}>{formatLongDate(inst.dueDate)}</Text>
                  <Text style={[styles.tdBold, styles.colMoney]}>{money(inst.amount, company.currency)}</Text>
                  <View style={styles.colStatus}>
                    <StatusPill state={state} />
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>HISTORIAL DE ABONOS</Text>
          {sale.payments.length === 0 ? (
            <Text style={styles.td}>No se han registrado abonos.</Text>
          ) : (
            <View>
              <View style={styles.tableHead}>
                <Text style={[styles.th, styles.colDate]}>FECHA</Text>
                <Text style={[styles.th, styles.colMethod]}>MÉTODO</Text>
                <Text style={[styles.th, styles.colMoney]}>MONTO</Text>
              </View>
              {sale.payments.map((p, index) => (
                <View key={p.id} style={[styles.row, index % 2 === 1 ? styles.rowAlt : {}]}>
                  <Text style={[styles.td, styles.colDate]}>{formatLongDate(p.paymentDate)}</Text>
                  <Text style={[styles.td, styles.colMethod]}>{getPaymentMethodLabel(p.paymentMethod)}</Text>
                  <Text style={[styles.tdBold, styles.colMoney]}>{money(p.amount, company.currency)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.note}>
            <Text style={styles.noteText}>
              Estado de cuenta informativo. Documento generado el {formatLongDate(generatedAt)} a las{' '}
              {formatTime(generatedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>
            {company.footer || `${company.name} — Gracias por su preferencia`}
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

export async function renderCreditStatementPdf(
  sale: StatementSale,
  settings?: PdfSettings,
): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<CreditStatementDocument sale={sale} settings={settings} />)
  return new Uint8Array(buffer)
}
