'use client'

import type { ReactNode } from 'react'
import { InvoiceSidePanel } from './invoice-side-panel'
import { cn } from '@/lib/utils'

interface SalesInspectorLayoutProps {
  /** Factura seleccionada; `null` deja la tabla a ancho completo. */
  selectedSaleId: string | null
  /** Cierra el inspector y limpia la selección. */
  onClose: () => void
  /** Contenido principal: la tabla de ventas. */
  children: ReactNode
}

/**
 * Divide la página entre el contenido primario (tabla de ventas) y el
 * inspector secundario (panel de factura).
 *
 * Jerarquía visual: la tabla manda. Por eso el panel tiene un ancho FIJO
 * compacto (336px, 368px en 2xl) en lugar de un porcentaje del viewport, y
 * solamente se dockea a partir de `xl` (1280px). En `lg` no hay espacio real
 * y la tabla (`min-w-[680px]`) terminaba con scroll horizontal.
 */
export function SalesInspectorLayout({ selectedSaleId, onClose, children }: SalesInspectorLayoutProps) {
  return (
    <div className="flex flex-col xl:flex-row items-start gap-4 xl:gap-5 transition-all duration-300">
      {/* Contenido primario: la tabla de ventas */}
      <div className={cn('w-full min-w-0 transition-all duration-300', selectedSaleId && 'xl:flex-1')}>{children}</div>

      {/* Inspector secundario: la factura, como Card peer y no más ruidosa que la tabla */}
      {selectedSaleId && (
        <div className="w-full xl:w-[336px] 2xl:w-[368px] shrink-0 transition-all duration-300">
          <InvoiceSidePanel saleId={selectedSaleId} onClose={onClose} />
        </div>
      )}
    </div>
  )
}
