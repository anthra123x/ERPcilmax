'use client'

import { useSyncExternalStore } from 'react'
import {
  DEFAULT_BUSINESS_WORKFLOW,
  WORKFLOW_CHANGED_EVENT,
  getBusinessWorkflow,
} from './business-workflow'

function subscribeWorkflow(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(WORKFLOW_CHANGED_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(WORKFLOW_CHANGED_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

/**
 * Hook para sincronizar el estado reactivo del flujo de trabajo en cualquier pantalla cliente
 */
export function useBusinessWorkflow() {
  const workflow = useSyncExternalStore(
    subscribeWorkflow,
    getBusinessWorkflow,
    () => DEFAULT_BUSINESS_WORKFLOW,
  )
  return { workflow, config: workflow, isLoaded: true }
}
