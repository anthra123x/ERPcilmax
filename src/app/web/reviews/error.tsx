'use client'

import { ErrorFallback } from '@/components/ui/error-fallback'

export default function WebReviewsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Error al cargar las reseñas"
      description="No se pudieron cargar las reseñas. Intenta de nuevo."
    />
  )
}
