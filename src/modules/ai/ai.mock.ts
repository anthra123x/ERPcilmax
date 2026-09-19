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
  args?: ({ tool: AssistantToolName; args: Record<string, unknown> })[] | null
}

function detectSalesPeriod(text: string): string {
  if (/(hoy|dia|diaria)/.test(text)) return 'today'
  if (/(semana|7 dias|ultimos 7)/.test(text)) return '7d'
  if (/(30 dias|mes pasado|bimestre)/.test(text)) return '30d'
  if (/(ano|anual|este ano)/.test(text)) return 'this_year'
  if (/(mes|mensual|este mes)/.test(text)) return 'this_month'
  return 'today'
}

export function detectIntent(message: string): IntentMatch | null {
  const text = normalize(message)

  if (/(ventas|ingresos|recaudo|factur|vendidos?|ganan)/.test(text)) {
    return { tools: ['get_sales_summary'], args: [{ tool: 'get_sales_summary', args: { period: detectSalesPeriod(text) } }] }
  }
  if (/(stock|inventar|existencia|agotad|productos?)/.test(text)) {
    return { tools: ['get_inventory_status'], args: [{ tool: 'get_inventory_status', args: {} }] }
  }
  if (/(pedidos?|orden)/.test(text)) {
    return { tools: ['get_web_orders_status'], args: [{ tool: 'get_web_orders_status', args: {} }] }
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
  if (/(resumen|estado|general|como va|como vamos|todo|ultimas ventas)/.test(text)) {
    return { tools: ['get_recent_sales', 'get_business_snapshot'], args: null }
  }

  return null
}

const CAPABILITIES = [
  '• Cómo van las ventas de hoy o de un período (ventas).',
  '• Estado del inventario: stock bajo y agotados (stock).',
  '• Pedidos pendientes de la tienda online (pedidos).',
  '• Créditos pendientes de cobro (crédito).',
  '• Clientes, gastos del mes y mensajes de contacto.',
  '• Vista general del negocio (resumen).',
]

export async function runMockAssistant(message: string): Promise<{ reply: string; toolsUsed: AssistantToolName[] }> {
  const intent = detectIntent(message)

  const disclaimer =
    'Estoy funcionando en modo simulación porque todavía no se han configurado agentes de IA (API keys). ' +
    'Cuando agregues las claves en la variable AI_PROVIDER_KEYS, respondo con el modelo completo. '

  if (!intent) {
    return {
      reply:
        disclaimer +
        'Puedo ayudarte con datos en tiempo real de tu negocio. Preguntame por ejemplo:\n' +
        CAPABILITIES.join('\n'),
      toolsUsed: [],
    }
  }

  const spec = intent.args ?? intent.tools.map((tool) => ({ tool, args: {} }))
  const results: AssistantToolResult[] = []
  for (const entry of spec) {
    try {
      const result = await runAssistantTool(entry.tool, entry.args ?? {})
      results.push(result)
    } catch {
      results.push({
        name: entry.tool,
        data: {},
        summary: '(no se pudo cargar la información para esta consulta)',
        executedAt: new Date().toISOString(),
      })
    }
  }

  const body = results.map((r) => formatToolResultText(r)).join('\n\n')
  return { reply: `${disclaimer}\n\n${body}`, toolsUsed: results.map((r) => r.name) }
}