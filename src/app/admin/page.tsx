'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Users,
  Trash2,
  UserPlus,
  Download,
  Building2,
  Receipt,
  FileSpreadsheet,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Hash,
  Shield,
  Coins,
  Store,
  Smartphone,
  Shirt,
  ShoppingBasket,
  Wrench,
  HeartPulse,
  Briefcase,
  Globe,
  Sliders,
  Sparkles,
  PackageSearch,
  FileText,
  CreditCard,
  Printer,
  Save,
  Clock,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { getUsers, deleteUser, createUserByAdmin } from '@/modules/auth/auth.actions'
import {
  getSystemSettings,
  updateSystemSettings,
  getBusinessWorkflowAction,
  saveBusinessWorkflowAction,
} from '@/modules/settings/settings.actions'
import {
  exportProductsToExcel,
  exportSalesToExcel,
  exportClientsToExcel,
  exportInventoryToExcel,
} from '@/modules/export/export.actions'
import { createClientSupabase } from '@/lib/supabase'
import {
  getBusinessWorkflow,
  saveBusinessWorkflow,
  SECTOR_INFO,
  type BusinessSector,
  type TaxRegime,
  type BusinessWorkflowConfig,
} from '@/lib/business-workflow'

interface SystemSettingsData {
  companyName: string
  companyNit?: string | null
  companyAddress?: string | null
  companyCity?: string | null
  companyPhone?: string | null
  companyEmail?: string | null
  currency: string
  invoicePrefix: string
  invoiceFooter?: string | null
  lowStockThreshold: number
  nextInvoiceNumber?: number
  nextWebOrderNumber?: number
  webPendingExpiryHours?: number
}

const defaultSettings: SystemSettingsData = {
  companyName: 'Nova ERP',
  companyNit: '900.000.000-1',
  companyAddress: 'Av. Empresarial #10-20',
  companyCity: 'Colombia',
  companyPhone: '+57 (300) 000-0000',
  companyEmail: 'contacto@empresa.com',
  currency: 'COP',
  invoicePrefix: 'FAC-',
  invoiceFooter: 'Garantía legal sobre productos de conformidad con la ley aplicable.',
  lowStockThreshold: 5,
  nextInvoiceNumber: 1,
  nextWebOrderNumber: 1000,
  webPendingExpiryHours: 24,
}

const SECTOR_ICONS: Record<BusinessSector, React.ComponentType<{ className?: string }>> = {
  retail_general: Store,
  technology_repair: Smartphone,
  fashion_apparel: Shirt,
  grocery_supermarket: ShoppingBasket,
  hardware_construction: Wrench,
  pharmacy_health: HeartPulse,
  services_workshop: Briefcase,
}

export default function AdminPage() {
  type UserRow = Awaited<ReturnType<typeof getUsers>>[number]
  const [users, setUsers] = useState<UserRow[]>([])
  const [_loading, setLoading] = useState(true)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [createUserLoading, setCreateUserLoading] = useState(false)

  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [exportExcelLoading, setExportExcelLoading] = useState<string | null>(null)

  // Configuración de base de datos
  const [settings, setSettings] = useState<SystemSettingsData>(defaultSettings)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [isPendingSave, startSaveTransition] = useTransition()
  const [wsConnected, setWsConnected] = useState(false)

  // Flujos de trabajo independientes del negocio
  const [workflow, setWorkflow] = useState<BusinessWorkflowConfig>(() => getBusinessWorkflow())

  // 1. Carga inicial y Suscripción WebSocket en Tiempo Real con Supabase
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [usersData, settingsResult, workflowResult] = await Promise.all([
          getUsers(),
          getSystemSettings(),
          getBusinessWorkflowAction(),
        ])
        setUsers(usersData)
        if (settingsResult.success && settingsResult.data) {
          const loadedData = settingsResult.data as unknown as SystemSettingsData
          setSettings({
            ...defaultSettings,
            ...loadedData,
            invoicePrefix: loadedData.invoicePrefix || 'FAC-',
            nextInvoiceNumber: loadedData.nextInvoiceNumber || 1,
            nextWebOrderNumber: loadedData.nextWebOrderNumber || 1000,
            webPendingExpiryHours: loadedData.webPendingExpiryHours || 24,
          })
        }
        if (workflowResult.success && workflowResult.data) {
          setWorkflow(workflowResult.data)
          saveBusinessWorkflow(workflowResult.data)
        }
      } catch (err) {
        console.error('Error cargando datos de configuración:', err)
      } finally {
        setLoading(false)
        setSettingsLoading(false)
      }
    }

    loadInitialData()

    // Conexión WebSockets en tiempo real vía Supabase Realtime
    const supabase = createClientSupabase()
    const channel = supabase.channel('system-settings-realtime')

    channel
      .on('broadcast', { event: 'settings-updated' }, (payload: { payload: SystemSettingsData }) => {
        if (payload?.payload) {
          setSettings(payload.payload)
          toast.info('Configuración del sistema sincronizada en tiempo real')
        }
      })
      .on('broadcast', { event: 'workflow-updated' }, (payload: { payload: BusinessWorkflowConfig }) => {
        if (payload?.payload) {
          setWorkflow(payload.payload)
          saveBusinessWorkflow(payload.payload)
          toast.info('Flujos de trabajo del negocio actualizados en vivo')
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setWsConnected(true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setWsConnected(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 2. Guardar Ajustes del Sistema y Flujos de Trabajo
  async function handleSaveAll(e?: React.FormEvent) {
    if (e) e.preventDefault()

    startSaveTransition(async () => {
      const formData = new FormData()
      formData.append('companyName', settings.companyName || 'Nova ERP')
      formData.append('companyNit', settings.companyNit || '')
      formData.append('companyAddress', settings.companyAddress || '')
      formData.append('companyCity', settings.companyCity || '')
      formData.append('companyPhone', settings.companyPhone || '')
      formData.append('companyEmail', settings.companyEmail || '')
      formData.append('currency', settings.currency || 'COP')
      formData.append('invoicePrefix', settings.invoicePrefix || 'FAC-')
      formData.append('invoiceFooter', settings.invoiceFooter || '')
      formData.append('lowStockThreshold', String(settings.lowStockThreshold ?? 5))
      formData.append('nextInvoiceNumber', String(settings.nextInvoiceNumber ?? 1))
      formData.append('nextWebOrderNumber', String(settings.nextWebOrderNumber ?? 1000))
      formData.append('webPendingExpiryHours', String(settings.webPendingExpiryHours ?? 24))

      const [result, workflowResult] = await Promise.all([
        updateSystemSettings(formData),
        saveBusinessWorkflowAction(workflow),
      ])

      if (result.success && workflowResult.success) {
        saveBusinessWorkflow(workflow)

        toast.success('Configuración y flujos de trabajo guardados exitosamente')
        const updated = await getSystemSettings()
        if (updated.success && updated.data) {
          const freshData = updated.data as unknown as SystemSettingsData
          setSettings(freshData)

          // Emisión WebSocket a todos los navegadores/pestañas conectadas
          const supabase = createClientSupabase()
          await supabase.channel('system-settings-realtime').send({
            type: 'broadcast',
            event: 'settings-updated',
            payload: freshData,
          })
          await supabase.channel('system-settings-realtime').send({
            type: 'broadcast',
            event: 'workflow-updated',
            payload: workflow,
          })
        }
      } else {
        const errorMsg =
          (!result.success ? result.error : null) ||
          (!workflowResult.success ? workflowResult.error : null) ||
          'Error al actualizar la configuración'
        toast.error(errorMsg)
      }
    })
  }

  // 3. Aplicar ajustes predefinidos de un sector comercial
  async function handleSelectSector(sectorKey: BusinessSector) {
    const info = SECTOR_INFO[sectorKey]
    const updatedWorkflow: BusinessWorkflowConfig = {
      ...workflow,
      sector: sectorKey,
      defaultProfitMargin: info.suggestedMargin,
    }
    setWorkflow(updatedWorkflow)
    saveBusinessWorkflow(updatedWorkflow)

    // Guardar en base de datos en segundo plano
    await saveBusinessWorkflowAction(updatedWorkflow)

    // Sugerir pie de factura del sector si el actual está vacío o es el default
    if (!settings.invoiceFooter || settings.invoiceFooter === defaultSettings.invoiceFooter) {
      setSettings((prev) => ({
        ...prev,
        invoiceFooter: info.defaultFooter,
      }))
    }

    toast.info(`Flujo optimizado para: ${info.title}`)
  }

  // 4. Gestión de Usuarios
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setCreateUserLoading(true)

    const formData = new FormData()
    formData.append('email', newUserEmail)
    formData.append('name', newUserName)
    formData.append('password', newUserPassword)

    const result = await createUserByAdmin(formData)
    setCreateUserLoading(false)

    if (result.success) {
      toast.success(result.success)
      setNewUserEmail('')
      setNewUserName('')
      setNewUserPassword('')
      setCreateUserOpen(false)
      const updated = await getUsers()
      setUsers(updated)
    } else {
      toast.error(result.error)
    }
  }

  async function handleDeleteUser(userId: string) {
    const result = await deleteUser(userId)
    if (result.success) {
      toast.success('Usuario eliminado del sistema')
      const updated = await getUsers()
      setUsers(updated)
    } else {
      toast.error(result.error || 'Error al eliminar usuario')
    }
    setDeleteUserDialogOpen(false)
    setUserToDelete(null)
  }

  // 5. Exportaciones de Datos a Excel (.xlsx)
  function downloadXlsx(base64: string, filename: string) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleExportExcel(type: 'products' | 'sales' | 'inventory' | 'clients') {
    setExportExcelLoading(type)
    try {
      let result
      let defaultName = `reporte-${type}.xlsx`

      if (type === 'products') {
        result = await exportProductsToExcel()
        defaultName = `catalogo-productos-${new Date().toISOString().split('T')[0]}.xlsx`
      } else if (type === 'sales') {
        result = await exportSalesToExcel()
        defaultName = `ventas-historicas-${new Date().toISOString().split('T')[0]}.xlsx`
      } else if (type === 'inventory') {
        result = await exportInventoryToExcel()
        defaultName = `inventario-stock-${new Date().toISOString().split('T')[0]}.xlsx`
      } else if (type === 'clients') {
        result = await exportClientsToExcel()
        defaultName = `directorio-clientes-${new Date().toISOString().split('T')[0]}.xlsx`
      }

      if (result && result.success && result.data) {
        downloadXlsx(result.data, defaultName)
        toast.success(`Archivo Excel descargado exitosamente`)
      } else {
        toast.error(result?.error || 'Error al generar el archivo Excel')
      }
    } catch (_err) {
      toast.error('Ocurrió un error inesperado al exportar')
    } finally {
      setExportExcelLoading(null)
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Configuración del Negocio & Sistema
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Personaliza la identidad fiscal, parámetros de facturación, flujos operativos de caja y catálogo de cualquier negocio.
          </p>
        </div>

        {/* Indicador de Estado y Conexión WebSockets */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/80 text-[11px] text-muted-foreground font-medium">
            <span
              className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
            />
            {wsConnected ? 'Sincronización en vivo activa' : 'Conectando sincronización...'}
          </div>

          <Button
            onClick={() => handleSaveAll()}
            disabled={isPendingSave}
            className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
          >
            {isPendingSave ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Guardando...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" /> Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Pestañas de Configuración */}
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 rounded-2xl border border-border/70 flex flex-wrap gap-1 w-full sm:w-auto h-auto">
          <TabsTrigger
            value="company"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-active:bg-background data-active:shadow-xs transition-all"
          >
            <Building2 className="mr-2 h-4 w-4 text-primary" />
            Empresa & Identidad
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-active:bg-background data-active:shadow-xs transition-all"
          >
            <Receipt className="mr-2 h-4 w-4 text-primary" />
            Facturación & POS
          </TabsTrigger>
          <TabsTrigger
            value="workflows"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-active:bg-background data-active:shadow-xs transition-all"
          >
            <Sliders className="mr-2 h-4 w-4 text-primary" />
            Flujos de Trabajo
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-active:bg-background data-active:shadow-xs transition-all"
          >
            <Users className="mr-2 h-4 w-4 text-primary" />
            Usuarios & Accesos
          </TabsTrigger>
          <TabsTrigger
            value="exports"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-active:bg-background data-active:shadow-xs transition-all"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-primary" />
            Respaldos & Excel
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* PESTAÑA 1: EMPRESA & IDENTIDAD DEL NEGOCIO */}
        {/* ======================================================== */}
        <TabsContent value="company" className="space-y-6">
          {/* 1. Selector de Sector Comercial del Negocio */}
          <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                Giro Comercial o Sector del Negocio
              </CardTitle>
              <CardDescription className="text-xs">
                Selecciona la industria de tu negocio para optimizar automáticamente el flujo de trabajo, políticas de garantía y márgenes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(Object.keys(SECTOR_INFO) as BusinessSector[]).map((sectorKey) => {
                  const info = SECTOR_INFO[sectorKey]
                  const Icon = SECTOR_ICONS[sectorKey] || Store
                  const isSelected = workflow.sector === sectorKey

                  return (
                    <button
                      key={sectorKey}
                      type="button"
                      onClick={() => handleSelectSector(sectorKey)}
                      className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                          : 'border-border/70 hover:border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div
                          className={`p-2 rounded-xl ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <span className="font-semibold text-xs text-foreground">{info.title}</span>
                      <span className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {info.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 2. Datos Comerciales, Legales y Fiscales */}
          <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Información Comercial y Fiscal de la Empresa
              </CardTitle>
              <CardDescription className="text-xs">
                Estos datos aparecen en las facturas de venta, recibos de caja, cotizaciones y comprobantes impresos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Cargando parámetros de empresa...
                </div>
              ) : (
                <form onSubmit={handleSaveAll} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Razón Social / Nombre Comercial */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="companyName" className="text-xs font-semibold flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Razón Social / Nombre Comercial
                      </Label>
                      <Input
                        id="companyName"
                        value={settings.companyName}
                        onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                        placeholder="Ej: Distribuidora Comercial S.A.S."
                        className="rounded-xl font-medium"
                        required
                      />
                    </div>

                    {/* Slogan Comercial */}
                    <div className="space-y-1.5">
                      <Label htmlFor="slogan" className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                        Slogan o Descriptor Comercial
                      </Label>
                      <Input
                        id="slogan"
                        value={workflow.slogan}
                        onChange={(e) => setWorkflow({ ...workflow, slogan: e.target.value })}
                        placeholder="Ej: Calidad y servicio garantizado"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Tipo y Número de Identificación Fiscal */}
                    <div className="space-y-1.5">
                      <Label htmlFor="companyNit" className="text-xs font-semibold flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                        Identificación Fiscal (NIT / RUT / Cédula)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="companyNit"
                          value={settings.companyNit || ''}
                          onChange={(e) => setSettings({ ...settings, companyNit: e.target.value })}
                          placeholder="Ej: 901.482.391"
                          className="rounded-xl font-mono flex-1"
                        />
                        <Input
                          id="taxIdDv"
                          value={workflow.taxIdDv}
                          onChange={(e) => setWorkflow({ ...workflow, taxIdDv: e.target.value })}
                          placeholder="DV"
                          className="w-14 rounded-xl font-mono text-center"
                          maxLength={2}
                          title="Dígito de verificación"
                        />
                      </div>
                    </div>

                    {/* Régimen Tributario */}
                    <div className="space-y-1.5">
                      <Label htmlFor="taxRegime" className="text-xs font-semibold flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        Régimen Tributario
                      </Label>
                      <Select
                        value={workflow.taxRegime}
                        onValueChange={(val) => setWorkflow({ ...workflow, taxRegime: val as TaxRegime })}
                      >
                        <SelectTrigger id="taxRegime" className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="no_responsable_iva">No Responsable de IVA (Simplificado)</SelectItem>
                          <SelectItem value="responsable_iva">Responsable de IVA (Común)</SelectItem>
                          <SelectItem value="simple_tributacion">Régimen Simple de Tributación (RST)</SelectItem>
                          <SelectItem value="persona_natural">Persona Natural / Comerciante</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Moneda del Negocio */}
                    <div className="space-y-1.5">
                      <Label htmlFor="currency" className="text-xs font-semibold flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                        Moneda Principal de Operación
                      </Label>
                      <Select
                        value={settings.currency || 'COP'}
                        onValueChange={(val) => setSettings({ ...settings, currency: val || 'COP' })}
                      >
                        <SelectTrigger id="currency" className="rounded-xl font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="COP">COP ($) - Peso Colombiano</SelectItem>
                          <SelectItem value="USD">USD ($) - Dólar Estadounidense</SelectItem>
                          <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                          <SelectItem value="MXN">MXN ($) - Peso Mexicano</SelectItem>
                          <SelectItem value="PEN">PEN (S/.) - Sol Peruano</SelectItem>
                          <SelectItem value="CLP">CLP ($) - Peso Chileno</SelectItem>
                          <SelectItem value="ARS">ARS ($) - Peso Argentino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Dirección */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="companyAddress" className="text-xs font-semibold flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        Dirección Comercial
                      </Label>
                      <Input
                        id="companyAddress"
                        value={settings.companyAddress || ''}
                        onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                        placeholder="Ej: Carrera 15 # 85-30, Local 102"
                        className="rounded-xl"
                      />
                    </div>

                    {/* Ciudad / Departamento */}
                    <div className="space-y-1.5">
                      <Label htmlFor="companyCity" className="text-xs font-semibold">
                        Ciudad / Municipio
                      </Label>
                      <Input
                        id="companyCity"
                        value={settings.companyCity || ''}
                        onChange={(e) => setSettings({ ...settings, companyCity: e.target.value })}
                        placeholder="Ej: Bogotá, D.C."
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Teléfono / WhatsApp */}
                    <div className="space-y-1.5">
                      <Label htmlFor="companyPhone" className="text-xs font-semibold flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        Teléfono / WhatsApp de Contacto
                      </Label>
                      <Input
                        id="companyPhone"
                        value={settings.companyPhone || ''}
                        onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                        placeholder="Ej: +57 300 123 4567"
                        className="rounded-xl"
                      />
                    </div>

                    {/* Correo Electrónico Comercial */}
                    <div className="space-y-1.5">
                      <Label htmlFor="companyEmail" className="text-xs font-semibold flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        Correo Electrónico de Facturación
                      </Label>
                      <Input
                        id="companyEmail"
                        type="email"
                        value={settings.companyEmail || ''}
                        onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                        placeholder="facturacion@tunegocio.com"
                        className="rounded-xl"
                      />
                    </div>

                    {/* Sitio Web o Catálogo */}
                    <div className="space-y-1.5">
                      <Label htmlFor="website" className="text-xs font-semibold flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        Sitio Web o Catálogo Virtual
                      </Label>
                      <Input
                        id="website"
                        value={workflow.website}
                        onChange={(e) => setWorkflow({ ...workflow, website: e.target.value })}
                        placeholder="https://tunegocio.com"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={isPendingSave}
                      className="rounded-xl bg-primary text-primary-foreground font-semibold px-6 shadow-xs text-xs"
                    >
                      {isPendingSave ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Save className="h-3.5 w-3.5" /> Guardar Información de Empresa
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* PESTAÑA 2: FACTURACIÓN & POS */}
        {/* ======================================================== */}
        <TabsContent value="billing" className="space-y-6">
          <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Parámetros de Facturación y Consecutivo Fiscal
              </CardTitle>
              <CardDescription className="text-xs">
                Configura los consecutivos de factura, prefijo de venta y autorizaciones fiscales (DIAN u homólogo).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveAll} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Prefijo de Factura */}
                  <div className="space-y-1.5">
                    <Label htmlFor="invoicePrefix" className="text-xs font-semibold">
                      Prefijo de Factura
                    </Label>
                    <Input
                      id="invoicePrefix"
                      value={settings.invoicePrefix}
                      onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                      placeholder="Ej: FAC- o POS-"
                      className="rounded-xl font-mono"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Se antepone a cada venta en el POS (ej: {settings.invoicePrefix || 'FAC-'}
                      {settings.nextInvoiceNumber || 1}).
                    </p>
                  </div>

                  {/* Siguiente Consecutivo de Factura */}
                  <div className="space-y-1.5">
                    <Label htmlFor="nextInvoiceNumber" className="text-xs font-semibold">
                      Próximo Número de Factura Consecutivo
                    </Label>
                    <Input
                      id="nextInvoiceNumber"
                      type="number"
                      min="1"
                      value={settings.nextInvoiceNumber ?? 1}
                      onChange={(e) =>
                        setSettings({ ...settings, nextInvoiceNumber: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="rounded-xl font-mono font-bold"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Modifica este número si ya venías facturando en otro software o talonario y deseas continuar tu
                      correlativo contable.
                    </p>
                  </div>
                </div>

                {/* Parámetros de Resolución Fiscal / DIAN */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      Autorización de Numeración Fiscal (DIAN / Ente Tributario)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="dianRes" className="text-[11px] text-muted-foreground">
                        N° de Resolución
                      </Label>
                      <Input
                        id="dianRes"
                        value={workflow.dianResolutionNumber}
                        onChange={(e) => setWorkflow({ ...workflow, dianResolutionNumber: e.target.value })}
                        placeholder="Ej: 18764000123"
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dianDate" className="text-[11px] text-muted-foreground">
                        Fecha de Expedición
                      </Label>
                      <Input
                        id="dianDate"
                        type="date"
                        value={workflow.dianResolutionDate}
                        onChange={(e) => setWorkflow({ ...workflow, dianResolutionDate: e.target.value })}
                        className="rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dianRange" className="text-[11px] text-muted-foreground">
                        Rango Autorizado (Desde - Hasta)
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          value={workflow.dianRangeFrom}
                          onChange={(e) => setWorkflow({ ...workflow, dianRangeFrom: Number(e.target.value) || 1 })}
                          className="rounded-xl font-mono text-xs text-center"
                          placeholder="Desde"
                        />
                        <span className="text-xs text-muted-foreground">-</span>
                        <Input
                          type="number"
                          value={workflow.dianRangeTo}
                          onChange={(e) => setWorkflow({ ...workflow, dianRangeTo: Number(e.target.value) || 10000 })}
                          className="rounded-xl font-mono text-xs text-center"
                          placeholder="Hasta"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Términos Legales & Pie de Factura */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="invoiceFooter" className="text-xs font-semibold">
                      Términos Legales, Garantía y Pie de Factura
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          invoiceFooter: SECTOR_INFO[workflow.sector]?.defaultFooter || defaultSettings.invoiceFooter,
                        })
                      }
                      className="h-6 text-[11px] text-primary hover:text-primary hover:bg-primary/10 rounded-lg px-2"
                    >
                      Cargar plantilla de {SECTOR_INFO[workflow.sector]?.title}
                    </Button>
                  </div>
                  <Input
                    id="invoiceFooter"
                    value={settings.invoiceFooter || ''}
                    onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                    placeholder="Garantía legal sobre productos de conformidad con la ley aplicable."
                    className="rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Este texto se imprime en el pie de página de cada factura, comprobante y PDF emitido.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isPendingSave}
                    className="rounded-xl bg-primary text-primary-foreground font-semibold px-6 shadow-xs text-xs"
                  >
                    {isPendingSave ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="h-3.5 w-3.5" /> Guardar Parámetros de Facturación
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* PESTAÑA 3: FLUJOS DE TRABAJO DEL NEGOCIO */}
        {/* ======================================================== */}
        <TabsContent value="workflows" className="space-y-6">
          {/* Reglas Operativas de Mostrador & POS */}
          <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Políticas del Punto de Venta (POS)
              </CardTitle>
              <CardDescription className="text-xs">
                Controla cómo interactúan tus cajeros y vendedores con las ventas y métodos de cobro.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/50">
              {/* Ventas a Crédito */}
              <div className="flex items-center justify-between py-3.5">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-semibold flex items-center gap-2 text-foreground">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Permitir Ventas a Crédito en Caja
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Habilita la opción de cobrar a cuotas y gestionar cartera con plazos de pago y estados de cuenta.
                  </p>
                </div>
                <Switch
                  checked={workflow.allowCreditSales}
                  onCheckedChange={(checked) => {
                    const u = { ...workflow, allowCreditSales: checked }
                    setWorkflow(u)
                    saveBusinessWorkflow(u)
                  }}
                />
              </div>

              {/* Venta bajo pedido / Stock cero */}
              <div className="flex items-center justify-between py-3.5">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-semibold flex items-center gap-2 text-foreground">
                    <PackageSearch className="h-4 w-4 text-primary" />
                    Permitir Venta de Productos Sin Stock (Bajo Pedido)
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Si está activo, permite registrar ventas en preventa aunque el inventario marque 0 unidades. Si está
                    desactivado, bloquea la venta estrictamente.
                  </p>
                </div>
                <Switch
                  checked={workflow.allowNegativeStock}
                  onCheckedChange={(checked) => {
                    const u = { ...workflow, allowNegativeStock: checked }
                    setWorkflow(u)
                    saveBusinessWorkflow(u)
                  }}
                />
              </div>

              {/* Cliente obligatorio en caja */}
              <div className="flex items-center justify-between py-3.5">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-semibold flex items-center gap-2 text-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    Exigir Cliente con Identificación en Cada Factura
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Al desactivarlo, el sistema asigna automáticamente un cliente rápido genérico (&quot;{workflow.defaultClientName}&quot;)
                    para agilizar la fila de caja.
                  </p>
                </div>
                <Switch
                  checked={workflow.requireClientOnSale}
                  onCheckedChange={(checked) => {
                    const u = { ...workflow, requireClientOnSale: checked }
                    setWorkflow(u)
                    saveBusinessWorkflow(u)
                  }}
                />
              </div>

              {/* Descuentos libres en mostrador */}
              <div className="flex items-center justify-between py-3.5">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-semibold flex items-center gap-2 text-foreground">
                    <Coins className="h-4 w-4 text-primary" />
                    Permitir Descuentos Directos en Caja
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Permite al personal de ventas aplicar rebajas porcentuales o de monto fijo sobre el total de la venta.
                  </p>
                </div>
                <Switch
                  checked={workflow.allowCashierDiscounts}
                  onCheckedChange={(checked) => {
                    const u = { ...workflow, allowCashierDiscounts: checked }
                    setWorkflow(u)
                    saveBusinessWorkflow(u)
                  }}
                />
              </div>

              {/* Impresión automática de ticket */}
              <div className="flex items-center justify-between py-3.5">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-semibold flex items-center gap-2 text-foreground">
                    <Printer className="h-4 w-4 text-primary" />
                    Abrir Impresión de Ticket al Completar Venta
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Dispara automáticamente la ventana de impresión térmica de factura al confirmar el cobro.
                  </p>
                </div>
                <Switch
                  checked={workflow.autoPrintReceipt}
                  onCheckedChange={(checked) => {
                    const u = { ...workflow, autoPrintReceipt: checked }
                    setWorkflow(u)
                    saveBusinessWorkflow(u)
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Reglas de Inventario & Tienda Online */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inventario & Bodega */}
            <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PackageSearch className="h-4 w-4 text-primary" />
                  Inventario & Almacén
                </CardTitle>
                <CardDescription className="text-xs">
                  Reglas de existencias, umbrales y margen comercial.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lowStock" className="text-xs font-semibold">
                    Umbral Global de Stock Bajo
                  </Label>
                  <Input
                    id="lowStock"
                    type="number"
                    min="1"
                    value={settings.lowStockThreshold}
                    onChange={(e) =>
                      setSettings({ ...settings, lowStockThreshold: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="rounded-xl font-mono font-bold"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Los productos con esta cantidad o menos mostrarán alertas amarillas/rojas en inventario.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profitMargin" className="text-xs font-semibold">
                    Margen de Ganancia Sugerido al Crear Productos (%)
                  </Label>
                  <Input
                    id="profitMargin"
                    type="number"
                    min="1"
                    max="500"
                    value={workflow.defaultProfitMargin}
                    onChange={(e) =>
                      setWorkflow({ ...workflow, defaultProfitMargin: Number(e.target.value) || 35 })
                    }
                    className="rounded-xl font-mono font-bold"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Al ingresar el costo de un nuevo artículo, calcula el precio de venta sugerido con este margen.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-semibold text-foreground">Escaneo Continuo de Código de Barras</span>
                    <p className="text-[11px] text-muted-foreground">Añade directamente al escanear con pistola láser.</p>
                  </div>
                  <Switch
                    checked={workflow.barcodeContinuousScan}
                    onCheckedChange={(checked) => {
                      const u = { ...workflow, barcodeContinuousScan: checked }
                      setWorkflow(u)
                      saveBusinessWorkflow(u)
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tienda Online & Pedidos Web */}
            <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Tienda Online & Pedidos Web
                </CardTitle>
                <CardDescription className="text-xs">
                  Reglas de reserva de stock y numeración web.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nextWebOrder" className="text-xs font-semibold">
                    Próximo Número de Pedido Web (ORD-XXXX)
                  </Label>
                  <Input
                    id="nextWebOrder"
                    type="number"
                    min="1"
                    value={settings.nextWebOrderNumber ?? 1000}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        nextWebOrderNumber: Math.max(1, Number(e.target.value) || 1000),
                      })
                    }
                    className="rounded-xl font-mono font-bold"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    El próximo cliente que compre por la tienda recibirá la referencia ORD-{settings.nextWebOrderNumber ?? 1000}.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="webExpiry" className="text-xs font-semibold flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Tiempo de Expiración de Pedidos en Reserva (Horas)
                  </Label>
                  <Input
                    id="webExpiry"
                    type="number"
                    min="1"
                    max="720"
                    value={settings.webPendingExpiryHours ?? 24}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        webPendingExpiryHours: Math.max(1, Number(e.target.value) || 24),
                      })
                    }
                    className="rounded-xl font-mono font-bold"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Tiempo de tolerancia para pagar pedidos pendientes antes de que el cron libere el stock reservado.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => handleSaveAll()}
                    disabled={isPendingSave}
                    className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" /> Guardar Flujos de Trabajo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* PESTAÑA 4: USUARIOS & ACCESOS */}
        {/* ======================================================== */}
        <TabsContent value="users" className="space-y-6">
          <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Equipo y Cuentas de Acceso al ERP
                </CardTitle>
                <CardDescription className="text-xs">
                  Administra los colaboradores con acceso a ventas, inventario y configuración.
                </CardDescription>
              </div>
              <Button
                onClick={() => setCreateUserOpen(true)}
                className="rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs"
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Nuevo Colaborador
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-border/70 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs font-semibold">
                      <TableHead className="py-3 px-4">Usuario</TableHead>
                      <TableHead className="py-3 px-4">Correo Electrónico</TableHead>
                      <TableHead className="py-3 px-4 text-center">Nivel de Acceso</TableHead>
                      <TableHead className="py-3 px-4 text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {users.map((u) => (
                      <TableRow key={u.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="py-3 px-4 font-semibold text-foreground flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
                            {u.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span>{u.name}</span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-muted-foreground font-mono">{u.email}</TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary">
                            <Shield className="h-3 w-3" /> Administrador
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl"
                            title="Eliminar usuario"
                            onClick={() => {
                              setUserToDelete(u.id)
                              setDeleteUserDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* PESTAÑA 5: RESPALDOS & EXCEL */}
        {/* ======================================================== */}
        <TabsContent value="exports" className="space-y-6">
          <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Exportaciones y Respaldos en Excel
              </CardTitle>
              <CardDescription className="text-xs">
                Genera reportes completos en hojas de cálculo con un solo clic para contabilidad o auditoría.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Exportar Productos */}
                <div className="p-5 rounded-2xl bg-muted/40 border border-border/70 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Catálogo de Productos</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Listado de precios, costos, categorías y códigos.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleExportExcel('products')}
                    variant="outline"
                    className="rounded-xl text-xs font-semibold w-full"
                    disabled={exportExcelLoading !== null}
                  >
                    {exportExcelLoading === 'products' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Descargar Excel
                  </Button>
                </div>

                {/* Exportar Ventas */}
                <div className="p-5 rounded-2xl bg-muted/40 border border-border/70 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Historial de Ventas</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Registro de transacciones, métodos de pago y totales.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleExportExcel('sales')}
                    variant="outline"
                    className="rounded-xl text-xs font-semibold w-full"
                    disabled={exportExcelLoading !== null}
                  >
                    {exportExcelLoading === 'sales' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Descargar Excel
                  </Button>
                </div>

                {/* Exportar Inventario */}
                <div className="p-5 rounded-2xl bg-muted/40 border border-border/70 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Inventario & Stock</h3>
                    <p className="text-xs text-muted-foreground mt-1">Stock actual en bodega, umbrales y alertas.</p>
                  </div>
                  <Button
                    onClick={() => handleExportExcel('inventory')}
                    variant="outline"
                    className="rounded-xl text-xs font-semibold w-full"
                    disabled={exportExcelLoading !== null}
                  >
                    {exportExcelLoading === 'inventory' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Descargar Excel
                  </Button>
                </div>

                {/* Exportar Clientes */}
                <div className="p-5 rounded-2xl bg-muted/40 border border-border/70 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Directorio de Clientes</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Base de datos de compradores, teléfonos y correos.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleExportExcel('clients')}
                    variant="outline"
                    className="rounded-xl text-xs font-semibold w-full"
                    disabled={exportExcelLoading !== null}
                  >
                    {exportExcelLoading === 'clients' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Descargar Excel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Crear Nuevo Usuario */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-md">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Nuevo Colaborador del Sistema
            </DialogTitle>
            <DialogDescription className="text-xs">
              Crea una cuenta para que un empleado o cajero acceda al punto de venta.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="newUserName" className="text-xs font-semibold">
                Nombre Completo
              </Label>
              <Input
                id="newUserName"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Ej: Laura Gómez"
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newUserEmail" className="text-xs font-semibold">
                Correo Electrónico
              </Label>
              <Input
                id="newUserEmail"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="laura@empresa.com"
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newUserPassword" className="text-xs font-semibold">
                Contraseña Inicial
              </Label>
              <Input
                id="newUserPassword"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="rounded-xl"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateUserOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createUserLoading}
                className="rounded-xl bg-primary text-primary-foreground font-semibold text-xs"
              >
                {createUserLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Crear Usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación: Eliminar Usuario */}
      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-sm">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              ¿Eliminar usuario?
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Esta acción revocará inmediatamente el acceso de esta persona a Nova ERP. Esta operación no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteUserDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => userToDelete && handleDeleteUser(userToDelete)}
              className="rounded-xl text-xs font-semibold"
            >
              Sí, Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
