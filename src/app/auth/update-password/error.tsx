'use client'

import { ErrorFallback } from '@/components/ui/error-fallback'

export default function UpdatePasswordError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Error al restablecer la contraseña"
      description="No se pudo cargar la página de recuperación. Solicita un nuevo enlace desde el inicio de sesión."
    />
  )
}