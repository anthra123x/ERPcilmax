'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Package, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

import { SearchInput } from '@/components/ui/search-input'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import { getProducts, deleteProduct } from '@/modules/inventory/inventory.actions'

interface Product {
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
  createdAt: Date
  category: { id: string; name: string; color: string | null } | null
  supplier: { id: string; name: string } | null
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [totalProducts, setTotalProducts] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const pageSize = 20

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page])

  async function loadProducts() {
    try {
      setLoading(true)
      const result = await getProducts(debouncedSearch || undefined, page, pageSize)
      setProducts(result.products)
      setTotalProducts(result.total)
      setTotalPages(result.totalPages)
    } catch (_error) {
      console.error('Error loading products:', _error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteProduct(product: Product) {
    try {
      const result = await deleteProduct(product.id)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      if (result?.success) {
        toast.success('Producto eliminado')
        await loadProducts()
        setDeleteDialogOpen(false)
        setProductToDelete(null)
      }
    } catch {
      toast.error('Error al eliminar el producto')
    }
  }

  if (loading && products.length === 0) {
    return (
      <div className="page-container py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-9 w-32 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-container py-6 space-y-6">
      <PageHeader
        title="Inventario"
        description="Gestión de productos"
        actions={
          <Link href="/inventory/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar productos..." />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt=""
                            className="h-10 w-10 rounded-none object-cover border border-border/60 shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-none bg-muted/40 border border-border/60 flex items-center justify-center shrink-0">
                            <Package className="h-5 w-5 text-muted-foreground/50" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge
                          variant="outline"
                          style={
                            product.category.color
                              ? { borderColor: product.category.color, color: product.category.color }
                              : undefined
                          }
                        >
                          {product.category.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{product.supplier?.name || '—'}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(product.costPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(product.salePrice)}</TableCell>
                    <TableCell className="text-right">
                      {product.stock <= product.lowStockThreshold ? (
                        <Badge variant="destructive" className="text-xs">
                          {product.stock}
                        </Badge>
                      ) : (
                        <span className="text-sm">{product.stock}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/inventory/${product.id}`}>
                          <Button variant="ghost" size="icon-sm" aria-label="Editar producto">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          aria-label="Eliminar producto"
                          onClick={() => {
                            setProductToDelete(product)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {products.length === 0 && (
            <EmptyState
              icon={Package}
              title={search ? 'Sin resultados' : 'Sin productos'}
              description={
                search ? 'No hay productos que coincidan con tu búsqueda' : 'Crea tu primer producto para comenzar'
              }
              action={search ? undefined : { label: 'Crear producto', href: '/inventory/new' }}
            />
          )}

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={totalProducts}
              entity="productos"
              onPageChange={(p) => setPage(p)}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">¿Eliminar producto?</DialogTitle>
            <DialogDescription className="text-center">
              ¿Estás seguro de que deseas eliminar &ldquo;{productToDelete?.name}&rdquo;? Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => productToDelete && handleDeleteProduct(productToDelete)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
