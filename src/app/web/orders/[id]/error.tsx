'use client'

import { ErrorFallback } from '@/components/ui/error-fallback'

export default function WebOrderError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Error al cargar el pedido web"
      description="No se pudieron cargar los datos del pedido. Intenta de nuevo."
    />
  )
}
