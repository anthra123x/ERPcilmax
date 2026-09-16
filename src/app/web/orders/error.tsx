'use client'

import { ErrorFallback } from '@/components/ui/error-fallback'

export default function WebOrdersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Error al cargar los pedidos web"
      description="No se pudieron cargar los pedidos. Intenta de nuevo."
    />
  )
}
