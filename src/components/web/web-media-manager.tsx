'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface WebMedium {
  id: string
  url: string
  alt: string | null
  position: number
}

interface WebMediaManagerProps {
  productName: string
  media: WebMedium[]
  onAdd: (formData: FormData) => Promise<{ success?: string; error?: string }>
  onRemove: (id: string) => Promise<{ success?: string; error?: string }>
}

export function WebMediaManager({ productName, media, onAdd, onRemove }: WebMediaManagerProps) {
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setIsSubmitting(true)
    const fd = new FormData()
    fd.set('url', url.trim())
    fd.set('alt', alt.trim())
    const result = await onAdd(fd)
    if (result?.error) toast.error(result.error)
    else if (result?.success) {
      toast.success(result.success)
      setUrl('')
      setAlt('')
    }
    setIsSubmitting(false)
  }

  async function handleRemove(id: string) {
    setRemovingId(id)
    const result = await onRemove(id)
    if (result?.error) toast.error(result.error)
    else if (result?.success) toast.success(result.success)
    setRemovingId(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Galería de imágenes</CardTitle>
        <CardDescription>
          URLs públicas (ej. Vercel Blob). La primera imagen es la miniatura. Mejora para {productName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
            <div>
              <Label htmlFor="mediaUrl" className="sr-only">
                URL de la imagen
              </Label>
              <Input
                id="mediaUrl"
                placeholder="https://…blob.vercel-storage.com/…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mediaAlt" className="sr-only">
                Texto alternativo
              </Label>
              <Input
                id="mediaAlt"
                placeholder="Texto alternativo (opcional)"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting || !url.trim()}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Agregar
          </Button>
        </form>

        {media.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay imágenes en la galería.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {media.map((m, idx) => (
              <li key={m.id} className="group relative overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.alt || `${productName} ${idx + 1}`}
                  className="aspect-square w-full object-cover"
                />
                {idx === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Miniatura
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(m.id)}
                  disabled={removingId === m.id}
                  className="absolute right-1 top-1 rounded bg-red-600/90 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label={`Eliminar imagen ${idx + 1}`}
                >
                  {removingId === m.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
