'use client'

import { ErrorFallback } from '@/components/ui/error-fallback'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="w-full max-w-lg">
        <ErrorFallback
          error={error}
          reset={reset}
          title="Error en la aplicación"
          description="Se ha presentado un inconveniente inesperado al procesar la solicitud. Puedes intentar nuevamente o regresar al inicio."
        />
      </div>
    </div>
  )
}
