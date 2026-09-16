'use client'

import { ErrorFallback } from '@/components/ui/error-fallback'

export default function WebProductError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Error al cargar el producto web"
      description="No se pudieron cargar los datos del producto. Intenta de nuevo."
    />
  )
}
