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
 *
 * La columna del inspector NUNCA se desmonta: solo colapsa su `width` a 0. Así
 * entrada y salida comparten la misma transición de CSS, sin temporizadores
 * y sin estados intermedios.
 *
 * La curva importa tanto como la duración. Con una transición lineal de ancho
 * el movimiento se lee como un tirón, porque el contenido aparece de golpe
 * mientras la caja todavía se está moviendo. Aquí la caja usa una
 * deceleración larga y el contenido entra con un desfase corto y su propia
 * curva: primero se abre el espacio, luego aterriza el documento.
 */
export function SalesInspectorLayout({ selectedSaleId, onClose, children }: SalesInspectorLayoutProps) {
  const isOpen = selectedSaleId !== null

  return (
    <div className="flex flex-col xl:flex-row items-start gap-4 xl:gap-5">
      {/* Contenido primario: la tabla de ventas */}
      <div
        className={cn(
          'w-full min-w-0 transition-[flex] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          isOpen && 'xl:flex-1',
        )}
      >
        {children}
      </div>

      {/* Inspector secundario: la factura, como Card peer y no más ruidosa que la tabla */}
      <div
        className={cn(
          'w-full shrink-0 overflow-hidden transition-[width] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          isOpen ? 'xl:w-[336px] 2xl:w-[368px]' : 'xl:w-0',
        )}
      >
        <InvoiceSidePanel saleId={selectedSaleId} onClose={onClose} />
      </div>
    </div>
  )
}
