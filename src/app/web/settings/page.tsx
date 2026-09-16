import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { getAdminWebSettings, updateWebSettings } from '@/modules/web/web.actions'
import { WebSettingsForm } from '@/components/web/web-settings-form'

export const dynamic = 'force-dynamic'

export default async function WebSettingsPage() {
  const settings = await getAdminWebSettings()

  async function handleSubmit(formData: FormData) {
    'use server'
    return await updateWebSettings(formData)
  }

  return (
    <div className="page-container py-6 space-y-6">
      <PageHeader
        title="Ajustes de la tienda online"
        description="Datos de contacto y tema que se muestran a los clientes"
      />

      <Card>
        <CardHeader>
          <CardTitle>Contacto y apariencia</CardTitle>
          <CardDescription>
            Estos valores se publican en el storefront (cilmax.com.co) desde la base de datos consolidada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebSettingsForm settings={settings} onSave={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  )
}
