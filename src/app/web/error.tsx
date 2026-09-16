'use client'

import { ErrorFallback } from '@/components/ui/error-fallback'

export default function WebError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Error al cargar la tienda online"
      description="No se pudieron cargar los datos web. Intenta de nuevo."
    />
  )
}
