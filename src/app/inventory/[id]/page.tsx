import { ProductForm } from '@/components/forms/product-form'
import { updateProduct, getProductById } from '@/modules/inventory/inventory.actions'
import { getCategories } from '@/modules/inventory/categories.actions'
import { getSuppliers } from '@/modules/suppliers/suppliers.actions'
import { getProductWebStatus } from '@/modules/web/web.actions'
import { InventoryWebPublish } from '@/components/web/inventory-web-publish'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProductPageProps {
  params: Promise<{
    id: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const product = await getProductById(id)

  if (!product) {
    notFound()
  }

  const [categories, suppliersResult, webStatus] = await Promise.all([
    getCategories(),
    getSuppliers(),
    getProductWebStatus(id),
  ])

  async function handleSubmit(formData: FormData) {
    'use server'

    const result = await updateProduct(id, formData)

    if (result?.error) {
      return { error: result.error }
    }

    return { success: result?.success }
  }

  return (
    <div className="page-container py-6 space-y-6">
      <PageHeader
        title="Editar Producto"
        description={`Editando: ${product.name}`}
        actions={
          <Link href="/inventory">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
        }
      />
      <ProductForm
        product={product}
        onSubmit={handleSubmit}
        categories={categories}
        suppliers={suppliersResult.suppliers}
      />

      {webStatus && <InventoryWebPublish productId={product.id} status={webStatus} />}
    </div>
  )
}
