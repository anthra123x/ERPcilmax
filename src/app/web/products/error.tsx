'use client'

import { ErrorFallback } from '@/components/ui/error-fallback'

export default function WebProductsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Error al cargar los productos web"
      description="No se pudieron cargar los productos. Intenta de nuevo."
    />
  )
}
