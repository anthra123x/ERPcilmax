'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateProductSchema, UpdateProductSchema } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Upload, Trash2, Image as ImageIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import type { ProductCategory, Supplier } from '@prisma/client'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const MAX_IMAGE_DATA_URL = 500_000

interface ProductData {
  id: string
  name: string
  description: string | null
  barcode: string | null
  imageUrl: string | null
  costPrice: number
  salePrice: number
  stock: number
  lowStockThreshold: number
  categoryId: string | null
  supplierId: string | null
  category?: ProductCategory | null
  supplier?: Supplier | null
}

interface ProductFormProps {
  product?: ProductData
  onSubmit: (data: FormData) => Promise<{ error?: string; success?: string }>
  isLoading?: boolean
  redirectTo?: string
  categories?: Array<{ id: string; name: string; color: string | null }>
  suppliers?: Array<{ id: string; name: string }>
}

export function ProductForm({
  product,
  onSubmit,
  isLoading = false,
  redirectTo,
  categories = [],
  suppliers = [],
}: ProductFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState(product?.category?.name || '')
  const [supplierName, setSupplierName] = useState(product?.supplier?.name || '')
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl || null)
  const [imageLoading, setImageLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          const MAX = 400
          let width = img.naturalWidth
          let height = img.naturalHeight
          if (width > MAX || height > MAX) {
            const scale = MAX / Math.max(width, height)
            width = Math.round(width * scale)
            height = Math.round(height * scale)
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(reader.result as string)
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        }
        img.onerror = () => reject(new Error('Archivo de imagen inválido'))
        img.src = reader.result as string
      }
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
      reader.readAsDataURL(file)
    })
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Formato no válido', { description: 'Selecciona un archivo de imagen (JPG, PNG, WebP).' })
      e.target.value = ''
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('Imagen demasiado grande', { description: 'El máximo permitido es 5 MB.' })
      e.target.value = ''
      return
    }
    setImageLoading(true)
    try {
      const url = await fileToDataUrl(file)
      if (url.length > MAX_IMAGE_DATA_URL) {
        toast.error('Imagen demasiado pesada', {
          description: 'La imagen comprimida aún es muy pesada. Elige una foto más pequeña o un JPG.',
        })
        return
      }
      setImageUrl(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al procesar la imagen'
      toast.error('Error al cargar imagen', { description: message })
    } finally {
      setImageLoading(false)
      e.target.value = ''
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(product ? UpdateProductSchema : CreateProductSchema),
    defaultValues: product
      ? {
          name: product.name,
          description: product.description || '',
          barcode: product.barcode || '',
          costPrice: product.costPrice,
          salePrice: product.salePrice,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          categoryId: product.categoryId || '',
          supplierId: product.supplierId || '',
        }
      : {
          name: '',
          description: '',
          barcode: '',
          costPrice: 0,
          salePrice: 0,
          stock: 0,
          lowStockThreshold: 5,
          categoryId: '',
          supplierId: '',
        },
  })

  async function handleFormSubmit(data: Record<string, unknown>) {
    setIsSubmitting(true)
    setError(null)

    try {
      if (imageUrl && imageUrl.length > MAX_IMAGE_DATA_URL) {
        setError('La imagen es demasiado pesada. Elige una imagen más pequeña (máx. 5 MB, se comprime a 400px).')
        toast.error('Imagen demasiado pesada')
        return
      }

      const normalizedData = {
        ...data,
        description: data.description || null,
        barcode: data.barcode || null,
        costPrice: Number(data.costPrice) || 0,
        salePrice: Number(data.salePrice) || 0,
        stock: Number(data.stock) || 0,
        lowStockThreshold: Number(data.lowStockThreshold) || 5,
        categoryId: categories.find((c) => c.name === categoryName)?.id || null,
        supplierId: suppliers.find((s) => s.name === supplierName)?.id || null,
        imageUrl: imageUrl || null,
      }

      const formData = new FormData()
      Object.entries(normalizedData).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          formData.append(key, '')
        } else {
          formData.append(key, String(value))
        }
      })

      const result = await onSubmit(formData)

      if (result?.error) {
        setError(result.error)
        toast.error('Error al guardar producto', {
          description: result.error,
        })
      } else {
        toast.success('Producto guardado exitosamente', {
          description: product ? 'Los cambios se han guardado' : 'El producto ha sido creado',
        })
        if (redirectTo) {
          router.push(redirectTo)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar producto'
      setError(message)
      toast.error('Error al guardar producto', {
        description: message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{product ? 'Editar Producto' : 'Nuevo Producto'}</CardTitle>
        <CardDescription>
          {product ? 'Actualiza los datos del producto' : 'Completa los datos del nuevo producto'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ej: Cable USB Tipo C"
                disabled={isSubmitting || isLoading}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message?.toString()}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Código de barras (opcional)</Label>
              <Input
                id="barcode"
                {...register('barcode')}
                placeholder="Código de barras"
                disabled={isSubmitting || isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descripción del producto..."
              disabled={isSubmitting || isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Imagen del producto (opcional)</Label>
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="Vista previa del producto" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  id="image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting || isLoading || imageLoading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imageLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                  </Button>
                  {imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSubmitting || isLoading || imageLoading}
                      onClick={() => setImageUrl(null)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Quitar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG o WebP, máximo 5 MB. Se comprime automáticamente al guardar.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costPrice">Costo *</Label>
              <Input
                id="costPrice"
                type="number"
                min="0"
                step="100"
                {...register('costPrice', { valueAsNumber: true })}
                placeholder="0"
                disabled={isSubmitting || isLoading}
              />
              {errors.costPrice && <p className="text-sm text-red-500">{errors.costPrice.message?.toString()}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="salePrice">Precio de venta *</Label>
              <Input
                id="salePrice"
                type="number"
                min="0"
                step="100"
                {...register('salePrice', { valueAsNumber: true })}
                placeholder="0"
                disabled={isSubmitting || isLoading}
              />
              {errors.salePrice && <p className="text-sm text-red-500">{errors.salePrice.message?.toString()}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock *</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                {...register('stock', { valueAsNumber: true })}
                placeholder="0"
                disabled={isSubmitting || isLoading}
              />
              {errors.stock && <p className="text-sm text-red-500">{errors.stock.message?.toString()}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                list="suppliers-list"
                placeholder="Escribe o selecciona proveedor"
                disabled={isSubmitting || isLoading}
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
              <datalist id="suppliers-list">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Input
                id="category"
                list="categories-list"
                placeholder="Escribe o selecciona categoría"
                disabled={isSubmitting || isLoading}
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
              <datalist id="categories-list">
                {categories.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">Alerta stock bajo</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                min="0"
                {...register('lowStockThreshold', { valueAsNumber: true })}
                placeholder="5"
                disabled={isSubmitting || isLoading}
              />
            </div>
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting ? 'Guardando...' : product ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
