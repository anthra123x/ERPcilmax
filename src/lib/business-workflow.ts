export type BusinessSector =
  | 'retail_general'
  | 'technology_repair'
  | 'fashion_apparel'
  | 'grocery_supermarket'
  | 'hardware_construction'
  | 'pharmacy_health'
  | 'services_workshop'

export type TaxRegime =
  | 'responsable_iva'
  | 'no_responsable_iva'
  | 'simple_tributacion'
  | 'persona_natural'

export type TaxIdType = 'NIT' | 'RUT' | 'RFC' | 'RUC' | 'CC' | 'CIF'

export interface BusinessWorkflowConfig {
  sector: BusinessSector
  slogan: string
  taxIdType: TaxIdType
  taxIdDv: string
  taxRegime: TaxRegime
  stateRegion: string
  website: string

  // Flujo de Ventas & Mostrador POS
  allowCreditSales: boolean
  requireClientOnSale: boolean
  allowNegativeStock: boolean
  allowCashierDiscounts: boolean
  autoPrintReceipt: boolean
  defaultClientName: string

  // Parámetros Fiscales / DIAN
  dianResolutionNumber: string
  dianResolutionDate: string
  dianRangeFrom: number
  dianRangeTo: number

  // Flujo de Inventario & Almacén
  defaultProfitMargin: number
  barcodeContinuousScan: boolean
  requireAdjustmentReason: boolean
}

export const WORKFLOW_STORAGE_KEY = 'nova_business_workflow_config'
export const WORKFLOW_CHANGED_EVENT = 'nova_business_workflow_changed'

export const DEFAULT_BUSINESS_WORKFLOW: BusinessWorkflowConfig = {
  sector: 'retail_general',
  slogan: 'Calidad, confianza y el mejor servicio',
  taxIdType: 'NIT',
  taxIdDv: '1',
  taxRegime: 'no_responsable_iva',
  stateRegion: 'Colombia',
  website: '',

  allowCreditSales: true,
  requireClientOnSale: false,
  allowNegativeStock: false,
  allowCashierDiscounts: true,
  autoPrintReceipt: false,
  defaultClientName: 'Consumidor Final',

  dianResolutionNumber: '',
  dianResolutionDate: '',
  dianRangeFrom: 1,
  dianRangeTo: 10000,

  defaultProfitMargin: 35,
  barcodeContinuousScan: true,
  requireAdjustmentReason: true,
}

export const SECTOR_INFO: Record<
  BusinessSector,
  {
    title: string
    description: string
    defaultFooter: string
    suggestedMargin: number
    iconName: string
  }
> = {
  retail_general: {
    title: 'Comercio General & Mostrador',
    description: 'Ventas rápidas, artículos variados y atención ágil al público.',
    defaultFooter: 'Garantía legal sobre productos de conformidad con la ley aplicable. Conserve su factura para cualquier reclamo.',
    suggestedMargin: 35,
    iconName: 'Store',
  },
  technology_repair: {
    title: 'Tecnología, Telefonía & Servicio Técnico',
    description: 'Control estricto de números de serie, repuestos y órdenes técnicas.',
    defaultFooter: 'Garantía de 90 días en repuestos y servicio técnico. No cubre humedad, golpes o intervención por terceros.',
    suggestedMargin: 40,
    iconName: 'Smartphone',
  },
  fashion_apparel: {
    title: 'Moda, Calzado & Confección',
    description: 'Control de prendas, tallas, colores y políticas de cambio en mostrador.',
    defaultFooter: 'Cambios permitidos dentro de los 15 días calendario siguientes a la compra, con etiquetas originales y prenda sin uso.',
    suggestedMargin: 50,
    iconName: 'Shirt',
  },
  grocery_supermarket: {
    title: 'Minimarket, Abarrotes & Alimentos',
    description: 'Alta rotación, escaneo rápido de código de barras y tickets de caja.',
    defaultFooter: 'Verifique su vuelto y mercancía antes de retirarse de la caja. Productos perecederos no tienen cambio.',
    suggestedMargin: 25,
    iconName: 'ShoppingBasket',
  },
  hardware_construction: {
    title: 'Ferretería & Materiales',
    description: 'Ventas por volumen, cotizaciones y gestión de créditos a maestros de obra.',
    defaultFooter: 'Materiales eléctricos y cortados a medida no tienen cambio. Precios sujetos a cambio sin previo aviso.',
    suggestedMargin: 30,
    iconName: 'Wrench',
  },
  pharmacy_health: {
    title: 'Droguería & Farmacia',
    description: 'Control de lotes, fechas de vencimiento y despacho seguro de medicamentos.',
    defaultFooter: 'Medicamentos y productos de uso personal no tienen cambio de conformidad con la normativa sanitaria vigente.',
    suggestedMargin: 30,
    iconName: 'HeartPulse',
  },
  services_workshop: {
    title: 'Servicios Profesionales & Talleres',
    description: 'Cotizaciones, mano de obra, facturación de servicios y contratos.',
    defaultFooter: 'Garantía de servicio de 30 días calendario sobre mano de obra realizada. Aceptación tácita según cotización previa.',
    suggestedMargin: 45,
    iconName: 'Briefcase',
  },
}

/**
 * Obtiene la configuración de flujo de trabajo del negocio
 */
export function getBusinessWorkflow(): BusinessWorkflowConfig {
  if (typeof window === 'undefined') return DEFAULT_BUSINESS_WORKFLOW
  try {
    const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY)
    if (!raw) return DEFAULT_BUSINESS_WORKFLOW
    return { ...DEFAULT_BUSINESS_WORKFLOW, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_BUSINESS_WORKFLOW
  }
}

/**
 * Guarda y propaga la configuración de flujos de trabajo del negocio
 */
export function saveBusinessWorkflow(
  partial: Partial<BusinessWorkflowConfig>,
): BusinessWorkflowConfig {
  if (typeof window === 'undefined') return DEFAULT_BUSINESS_WORKFLOW
  try {
    const current = getBusinessWorkflow()
    const updated: BusinessWorkflowConfig = { ...current, ...partial }
    localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(updated))

    window.dispatchEvent(
      new CustomEvent(WORKFLOW_CHANGED_EVENT, {
        detail: updated,
      }),
    )

    return updated
  } catch {
    return DEFAULT_BUSINESS_WORKFLOW
  }
}



