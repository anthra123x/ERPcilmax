'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useKeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Solo activar si no está en un input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      // Alt + D: Dashboard
      if (e.altKey && e.key === 'd') {
        e.preventDefault()
        router.push('/dashboard')
      }

      // Alt + I: Inventario
      if (e.altKey && e.key === 'i') {
        e.preventDefault()
        router.push('/inventory')
      }

      // Alt + V: Ventas
      if (e.altKey && e.key === 'v') {
        e.preventDefault()
        router.push('/sales')
      }

      // Alt + C: Cartera & Créditos
      if (e.altKey && e.key === 'c') {
        e.preventDefault()
        router.push('/credits')
      }

      // Alt + P: Asistente IA
      if (e.altKey && e.key === 'p') {
        e.preventDefault()
        router.push('/assistant')
      }

      // Alt + A: Administración (solo para admin, se valida en el servidor)
      if (e.altKey && e.key === 'a') {
        e.preventDefault()
        router.push('/admin')
      }

      // Alt + Q: Búsqueda global (enfocar input de búsqueda)
      if (e.altKey && e.key === 'q') {
        e.preventDefault()
        const searchInput = document.getElementById('global-search') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }

      // Escape: Cerrar modales
      if (e.key === 'Escape') {
        const dialogs = document.querySelectorAll('[role="dialog"]')
        dialogs.forEach((dialog) => {
          const closeButton = dialog.querySelector('button[aria-label="Close"]') as HTMLButtonElement
          if (closeButton) {
            closeButton.click()
          }
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])
}
