'use client'

import { useState, useEffect } from 'react'
import {
  DEFAULT_BUSINESS_WORKFLOW,
  WORKFLOW_CHANGED_EVENT,
  getBusinessWorkflow,
  type BusinessWorkflowConfig,
} from './business-workflow'

/**
 * Hook para sincronizar el estado reactivo del flujo de trabajo en cualquier pantalla cliente
 */
export function useBusinessWorkflow() {
  const [workflow, setWorkflow] = useState<BusinessWorkflowConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_BUSINESS_WORKFLOW
    try {
      return getBusinessWorkflow()
    } catch {
      return DEFAULT_BUSINESS_WORKFLOW
    }
  })

  useEffect(() => {
    function handleUpdate(e: Event) {
      try {
        const custom = e as CustomEvent<BusinessWorkflowConfig>
        if (custom.detail) {
          setWorkflow(custom.detail)
        } else {
          setWorkflow(getBusinessWorkflow())
        }
      } catch {
        setWorkflow(getBusinessWorkflow())
      }
    }

    window.addEventListener(WORKFLOW_CHANGED_EVENT, handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener(WORKFLOW_CHANGED_EVENT, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const safeWorkflow = workflow || DEFAULT_BUSINESS_WORKFLOW

  return { workflow: safeWorkflow, config: safeWorkflow, isLoaded: true }
}
