'use client'

import { ErrorFallback } from '@/components/ui/error-fallback'

export default function WebMessagesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Error al cargar los mensajes"
      description="No se pudieron cargar los mensajes de contacto. Intenta de nuevo."
    />
  )
}
