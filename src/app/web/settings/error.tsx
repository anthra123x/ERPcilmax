'use client'

import { ErrorFallback } from '@/components/ui/error-fallback'

export default function WebSettingsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Error al cargar los ajustes de la tienda"
      description="No se pudieron cargar los ajustes. Intenta de nuevo."
    />
  )
}
