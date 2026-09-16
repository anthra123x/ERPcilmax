'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { WebSettings } from '@/modules/web/web.types'

interface WebSettingsFormProps {
  settings: WebSettings
  onSave: (formData: FormData) => Promise<{ success?: string; error?: string }>
}

export function WebSettingsForm({ settings, onSave }: WebSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    storeName: settings.storeName,
    whatsapp: settings.whatsapp || '',
    email: settings.email || '',
    shippingInfo: settings.shippingInfo || '',
    primaryColor: settings.theme.primaryColor,
    goldColor: settings.theme.goldColor,
  })

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const fd = new FormData()
    fd.set('storeName', form.storeName)
    fd.set('whatsapp', form.whatsapp)
    fd.set('email', form.email)
    fd.set('shippingInfo', form.shippingInfo)
    fd.set('primaryColor', form.primaryColor)
    fd.set('goldColor', form.goldColor)

    const result = await onSave(fd)
    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
    } else if (result?.success) {
      toast.success(result.success)
    }
    setIsSubmitting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identidad y tema</CardTitle>
        <CardDescription>Nombre, WhatsApp de compras, email y colores que ve el storefront.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storeName">Nombre de la tienda</Label>
              <Input id="storeName" value={form.storeName} onChange={(e) => set('storeName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp de compras</Label>
              <Input
                id="whatsapp"
                placeholder="57 300 000 0000"
                value={form.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email de contacto</Label>
            <Input id="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shippingInfo">Info de envío</Label>
            <Textarea
              id="shippingInfo"
              rows={3}
              placeholder="Cobertura, costos y tiempos de entrega…"
              value={form.shippingInfo}
              onChange={(e) => set('shippingInfo', e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Color primario</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primaryColor"
                  value={form.primaryColor}
                  onChange={(e) => set('primaryColor', e.target.value)}
                  className="font-mono"
                />
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => set('primaryColor', e.target.value)}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input"
                  aria-label="Selector de color primario"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goldColor">Color dorado</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="goldColor"
                  value={form.goldColor}
                  onChange={(e) => set('goldColor', e.target.value)}
                  className="font-mono"
                />
                <input
                  type="color"
                  value={form.goldColor}
                  onChange={(e) => set('goldColor', e.target.value)}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input"
                  aria-label="Selector de color dorado"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Guardando…' : 'Guardar ajustes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
