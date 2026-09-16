'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toSlug } from '@/lib/slugify'

export interface WebProductEditorData {
  id: string
  name: string
  slug: string | null
  webDescription: string | null
  webSortOrder: number
  webVisible: boolean
  webFeatured: boolean
}

interface WebProductEditorProps {
  product: WebProductEditorData
  onSubmit: (formData: FormData) => Promise<{ success?: string; error?: string }>
}

export function WebProductEditor({ product, onSubmit }: WebProductEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slug, setSlug] = useState(product.slug || '')
  const [webDescription, setWebDescription] = useState(product.webDescription || '')
  const [webSortOrder, setWebSortOrder] = useState(String(product.webSortOrder))
  const [webVisible, setWebVisible] = useState(product.webVisible)
  const [webFeatured, setWebFeatured] = useState(product.webFeatured)

  function generateSlug() {
    setSlug(toSlug(product.name))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const fd = new FormData()
    fd.set('slug', slug)
    fd.set('webDescription', webDescription)
    fd.set('webSortOrder', webSortOrder === '' ? '0' : webSortOrder)
    fd.set('webVisible', String(webVisible))
    fd.set('webFeatured', String(webFeatured))

    const result = await onSubmit(fd)
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
        <CardTitle>Web: {product.name}</CardTitle>
        <CardDescription>Visibilidad, destacado, orden, slug de URL y descripción para el storefront.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug de URL</Label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(toSlug(e.target.value))}
                  className="font-mono"
                  placeholder="nombre-del-producto"
                />
                <Button type="button" variant="outline" size="icon" onClick={generateSlug} title="Generar del nombre">
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                La URL pública del producto será <span className="font-mono">/producto/{slug || '…'}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webSortOrder">Orden de aparición</Label>
              <Input
                id="webSortOrder"
                type="number"
                min={0}
                value={webSortOrder}
                onChange={(e) => setWebSortOrder(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webDescription">Descripción web</Label>
            <Textarea
              id="webDescription"
              rows={6}
              value={webDescription}
              onChange={(e) => setWebDescription(e.target.value)}
              placeholder="Descripción extendida que ve el cliente…"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Visible en la tienda</p>
                <p className="text-xs text-muted-foreground">Aparece en catálogo y búsquedas del storefront.</p>
              </div>
              <Switch checked={webVisible} onCheckedChange={setWebVisible} />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Destacado</p>
                <p className="text-xs text-muted-foreground">Se muestra en la portada / destacados.</p>
              </div>
              <Switch checked={webFeatured} onCheckedChange={setWebFeatured} />
            </label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
