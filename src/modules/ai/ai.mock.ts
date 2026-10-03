import { formatToolResultText, runAssistantTool } from './ai.tools'
import type { AssistantToolName, AssistantToolResult } from './ai.types'

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

interface IntentMatch {
  tools: AssistantToolName[]
  args?: { tool: AssistantToolName; args: Record<string, unknown> }[] | null
}

function detectSalesPeriod(text: string): string {
  if (/(hoy|dia|diaria)/.test(text)) return 'today'
  if (/(semana|7 dias|ultimos 7)/.test(text)) return '7d'
  if (/(30 dias|mes pasado|bimestre)/.test(text)) return '30d'
  if (/(ano|anual|este ano)/.test(text)) return 'this_year'
  if (/(mes|mensual|este mes)/.test(text)) return 'this_month'
  return 'today'
}

function extractSearchTerm(text: string, prefixRegex: RegExp): string {
  const match = text.match(prefixRegex)
  if (match && match[1]) {
    return match[1].trim()
  }
  return text.trim()
}

export function detectIntent(message: string): IntentMatch | null {
  const text = normalize(message)

  // 1. Reportes ejecutivos y especializados
  if (/(resumen.*negocio|resumen general|como va el negocio|como vamos)/.test(text)) {
    return {
      tools: ['get_recent_sales', 'get_business_snapshot'],
      args: [
        { tool: 'get_recent_sales', args: { limit: 5 } },
        { tool: 'get_business_snapshot', args: {} },
      ],
    }
  }

  if (
    /(reporte ejecutivo|informe ejecutivo|balance ejecutivo|resumen directivo|informe global|reporte general)/.test(
      text,
    )
  ) {
    return { tools: ['generate_executive_report'], args: [{ tool: 'generate_executive_report', args: {} }] }
  }

  if (/(reporte.*ventas|informe.*ventas|ventas.*detallad)/.test(text)) {
    return {
      tools: ['generate_sales_report'],
      args: [{ tool: 'generate_sales_report', args: { period: detectSalesPeriod(text) } }],
    }
  }

  if (/(reporte.*inventar|informe.*inventar|valorizacion|compras sugeridas|reabastecimiento)/.test(text)) {
    return { tools: ['generate_inventory_report'], args: [{ tool: 'generate_inventory_report', args: {} }] }
  }

  if (/(reporte.*clientes|informe.*clientes|cartera.*clientes|deudores)/.test(text)) {
    return { tools: ['generate_client_report'], args: [{ tool: 'generate_client_report', args: {} }] }
  }

  if (/(reporte.*canal|canales|pos vs web|tienda fisica.*online|online.*fisica)/.test(text)) {
    return { tools: ['generate_channel_report'], args: [{ tool: 'generate_channel_report', args: {} }] }
  }

  // 2. Control operativo: Búsquedas de productos
  if (/(busca.*product|buscar.*product|encuentra.*product|stock de|precio de|cuanto vale|cuanto cuesta)/.test(text)) {
    const term = extractSearchTerm(
      text,
      /(?:busca|buscar|encuentra|stock de|precio de|cuanto vale|cuanto cuesta)(?:\s+el|\s+la|\s+los|\s+las|\s+producto)?\s+([a-zA-Z0-9\s]+)/i,
    )
    return {
      tools: ['search_products'],
      args: [{ tool: 'search_products', args: { query: term || text } }],
    }
  }

  // 3. Control operativo: Búsqueda de clientes
  if (/(busca.*client|buscar.*client|telefono de|datos de|deuda de cliente)/.test(text)) {
    const term = extractSearchTerm(
      text,
      /(?:busca|buscar|telefono de|datos de|deuda de cliente)(?:\s+al|\s+a|\s+el|\s+cliente)?\s+([a-zA-Z0-9\s]+)/i,
    )
    return {
      tools: ['search_clients'],
      args: [{ tool: 'search_clients', args: { query: term || text } }],
    }
  }

  // 4. Pedidos online
  if (/(pedidos?|orden(?:es)?|tienda online|storefront)/.test(text)) {
    // Si menciona una referencia como ORD-1001
    const ordMatch = message.match(/ORD-?\d+/i)
    if (ordMatch) {
      const ref = ordMatch[0].toUpperCase()
      const isConfirm = /(confirmar|confirma|aprobar)/i.test(text)
      const isCancel = /(cancelar|cancela|rechazar)/i.test(text)
      return {
        tools: ['manage_web_order'],
        args: [
          {
            tool: 'manage_web_order',
            args: {
              referenceOrId: ref,
              ...(isConfirm ? { newStatus: 'CONFIRMED' } : {}),
              ...(isCancel ? { newStatus: 'CANCELLED' } : {}),
            },
          },
        ],
      }
    }
    return { tools: ['get_web_orders_status'], args: [{ tool: 'get_web_orders_status', args: {} }] }
  }

  // 5. Consultas rápidas estándar
  if (/(ventas|ingresos|recaudo|factur|vendidos?|ganan)/.test(text)) {
    return {
      tools: ['get_sales_summary'],
      args: [{ tool: 'get_sales_summary', args: { period: detectSalesPeriod(text) } }],
    }
  }
  if (/(stock|inventar|existencia|agotad|productos?)/.test(text)) {
    return { tools: ['get_inventory_status'], args: [{ tool: 'get_inventory_status', args: {} }] }
  }
  if (/(clientes?|consumidores?)/.test(text)) {
    return { tools: ['get_client_summary'], args: [{ tool: 'get_client_summary', args: {} }] }
  }
  if (/(credito|deuda|por cobrar)/.test(text)) {
    return { tools: ['get_pending_credit'], args: [{ tool: 'get_pending_credit', args: {} }] }
  }
  if (/(gasto|finanz|balance|ingresos.*gastos)/.test(text)) {
    return { tools: ['get_finance_summary'], args: [{ tool: 'get_finance_summary', args: {} }] }
  }
  if (/(mensajes?|contacto|resen|comentario)/.test(text)) {
    return { tools: ['get_contact_messages'], args: [{ tool: 'get_contact_messages', args: {} }] }
  }
  if (/(resumen|estado|general|todo|ultimas ventas)/.test(text)) {
    return { tools: ['generate_executive_report'], args: [{ tool: 'generate_executive_report', args: {} }] }
  }

  return null
}

const CAPABILITIES = [
  '• 📊 **Generar reportes ejecutivos:** "Reporte ejecutivo", "Reporte de ventas de este mes", "Reporte de canales POS vs Web".',
  '• 📦 **Inventario y valorización:** "Reporte de inventario", "Compras sugeridas para reabastecimiento", "Buscar producto cargador".',
  '• 👥 **Clientes y cartera:** "Reporte de clientes y deudores", "Buscar cliente Juan Pérez".',
  '• 🛒 **Tienda online:** "Estado de pedidos web", "Ver pedido ORD-1001", "Confirmar pedido ORD-1001".',
  '• 💰 **Finanzas y créditos:** "Créditos pendientes de cobro", "Gastos del mes vs ingresos".',
]

export async function runMockAssistant(message: string): Promise<{ reply: string; toolsUsed: AssistantToolName[] }> {
  const intent = detectIntent(message)

  const disclaimer =
    '⚡ *Asistente Cilmax IA (modo simulación / datos reales): Operando con datos de la base de datos.*\n'

  if (!intent) {
    return {
      reply:
        disclaimer +
        '\nPuedo ayudarte con datos en tiempo real, generar reportes completos y controlar operaciones del sistema. Pregúntame por ejemplo:\n\n' +
        CAPABILITIES.join('\n\n'),
      toolsUsed: [],
    }
  }

  const spec = intent.args ?? intent.tools.map((tool) => ({ tool, args: {} }))
  const results: AssistantToolResult[] = []
  for (const entry of spec) {
    try {
      const result = await runAssistantTool(entry.tool, entry.args ?? {})
      results.push(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al ejecutar herramienta'
      results.push({
        name: entry.tool,
        data: {},
        summary: `❌ ${entry.tool} no se pudo cargar: ${msg}`,
        executedAt: new Date().toISOString(),
      })
    }
  }

  const body = results.map((r) => formatToolResultText(r)).join('\n\n')
  return { reply: `${disclaimer}\n${body}`, toolsUsed: results.map((r) => r.name) }
}
