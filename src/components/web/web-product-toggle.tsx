'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { updateWebProduct } from '@/modules/web/web.actions'

export interface WebToggleSnapshot {
  id: string
  slug: string | null
  webDescription: string | null
  webSortOrder: number
  webVisible: boolean
  webFeatured: boolean
}

interface WebProductToggleProps {
  product: WebToggleSnapshot
  field: 'webVisible' | 'webFeatured'
}

export function WebProductToggle({ product, field }: WebProductToggleProps) {
  const [checked, setChecked] = useState(product[field])
  const [busy, setBusy] = useState(false)

  async function onCheckedChange(next: boolean) {
    setBusy(true)
    const fd = new FormData()
    fd.set('slug', product.slug || '')
    fd.set('webDescription', product.webDescription || '')
    fd.set('webSortOrder', String(product.webSortOrder ?? 0))
    fd.set('webVisible', String(field === 'webVisible' ? next : product.webVisible))
    fd.set('webFeatured', String(field === 'webFeatured' ? next : product.webFeatured))

    const result = await updateWebProduct(product.id, fd)
    if (result?.error) {
      toast.error(result.error)
      setChecked(!next)
    } else if (result?.success) {
      toast.success(result.success)
      setChecked(next)
    }
    setBusy(false)
  }

  return <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={busy} />
}
