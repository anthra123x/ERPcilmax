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
import {
  Users,
  Trash2,
  UserPlus,
  Download,
  Building2,
  Receipt,
  FileSpreadsheet,
  Radio,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  MapPin,
  Hash,
  Shield,
  Coins,
} from 'lucide-react'
import { toast } from 'sonner'
import { getUsers, deleteUser, createUserByAdmin } from '@/modules/auth/auth.actions'
import { getSystemSettings, updateSystemSettings } from '@/modules/settings/settings.actions'
import {
  exportProductsToExcel,
  exportSalesToExcel,
  exportClientsToExcel,
  exportInventoryToExcel,
} from '@/modules/export/export.actions'
import { createClientSupabase } from '@/lib/supabase'

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
}

const defaultSettings: SystemSettingsData = {
  companyName: 'Nova ERP',
  companyNit: '900.000.000-1',
  companyAddress: 'Av. Empresarial #10-20',
  companyCity: 'Colombia',
  companyPhone: '+57 (300) 000-0000',
  companyEmail: 'contacto@empresa.com',
  currency: 'COP',
  invoicePrefix: 'INV-',
  invoiceFooter: 'Garantía legal sobre productos de conformidad con la ley aplicable.',
  lowStockThreshold: 5,
  nextInvoiceNumber: 1,
}

export default function AdminPage() {
  type UserRow = Awaited<ReturnType<typeof getUsers>>[number]
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [createUserLoading, setCreateUserLoading] = useState(false)

  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [exportExcelLoading, setExportExcelLoading] = useState<string | null>(null)

  const [settings, setSettings] = useState<SystemSettingsData>(defaultSettings)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [isPendingSave, startSaveTransition] = useTransition()
  const [wsConnected, setWsConnected] = useState(false)

  // 1. Carga inicial y Suscripción WebSocket en Tiempo Real con Supabase (JWT)
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [usersData, settingsResult] = await Promise.all([getUsers(), getSystemSettings()])
        setUsers(usersData)
        if (settingsResult.success && settingsResult.data) {
          setSettings(settingsResult.data as unknown as SystemSettingsData)
        }
      } catch (err) {
        console.error('Error cargando datos de configuración:', err)
      } finally {
        setLoading(false)
        setSettingsLoading(false)
      }
    }

    loadInitialData()

    // Conexión WebSockets en tiempo real vía Supabase Realtime (Compatible con Vercel)
    const supabase = createClientSupabase()
    const channel = supabase.channel('system-settings-realtime')

    channel
      .on('broadcast', { event: 'settings-updated' }, (payload: { payload: SystemSettingsData }) => {
        if (payload?.payload) {
          setSettings(payload.payload)
          toast.info('Configuración del sistema actualizada en tiempo real')
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

  // 2. Guardar Ajustes del Sistema y Notificar por WebSockets
  async function handleUpdateSettings(e: React.FormEvent) {
    e.preventDefault()

    startSaveTransition(async () => {
      const formData = new FormData()
      formData.append('companyName', settings.companyName || '')
      formData.append('companyNit', settings.companyNit || '')
      formData.append('companyAddress', settings.companyAddress || '')
      formData.append('companyCity', settings.companyCity || '')
      formData.append('companyPhone', settings.companyPhone || '')
      formData.append('companyEmail', settings.companyEmail || '')
      formData.append('currency', settings.currency || 'COP')
      formData.append('invoicePrefix', settings.invoicePrefix || 'CIL-')
      formData.append('invoiceFooter', settings.invoiceFooter || '')
      formData.append('lowStockThreshold', String(settings.lowStockThreshold ?? 5))

      const result = await updateSystemSettings(formData)

      if (result.success) {
        toast.success('Configuración guardada exitosamente')
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
        }
      } else {
        toast.error(result.error || 'Error al actualizar la configuración')
      }
    })
  }

  // 3. Gestión de Usuarios
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

  // 4. Exportaciones de Datos a Excel (.xlsx)
  function downloadXlsx(base64: string, filename: string) {
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportExcel(type: string) {
    setExportExcelLoading(type)
    try {
      let result
      switch (type) {
        case 'products':
          result = await exportProductsToExcel()
          break
        case 'sales':
          result = await exportSalesToExcel()
          break
        case 'inventory':
          result = await exportInventoryToExcel()
          break
        case 'clients':
          result = await exportClientsToExcel()
          break
        default:
          result = { error: 'Tipo de exportación no válido' }
      }

      if (result.success && result.data && result.filename) {
        downloadXlsx(result.data, result.filename)
        toast.success('Archivo Excel exportado exitosamente')
      } else {
        toast.error(result.error || 'Error al exportar datos')
      }
    } catch {
      toast.error('Error al exportar')
    } finally {
      setExportExcelLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Cargando panel de configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado Principal y Monitor WebSockets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Configuración del Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Ajustes generales, identidad fiscal, parámetros de venta y accesos de usuario
          </p>
        </div>

        {/* Indicador de Conexión en Tiempo Real */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border/80 text-xs">
          <Radio className={`h-3.5 w-3.5 ${wsConnected ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
          <span className="text-muted-foreground font-medium">
            {wsConnected ? 'Sincronización en vivo activa' : 'Conectando tiempo real...'}
          </span>
        </div>
      </div>

      {/* Pestañas Ejecutivas */}
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-muted/70 p-1 rounded-2xl border border-border/70 flex flex-wrap gap-1 w-full sm:w-auto h-auto">
          <TabsTrigger
            value="company"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-active:bg-background data-active:shadow-xs"
          >
            <Building2 className="mr-2 h-4 w-4 text-teal-500" />
            Empresa & Identidad
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-active:bg-background data-active:shadow-xs"
          >
            <Receipt className="mr-2 h-4 w-4 text-teal-500" />
            Facturación & POS
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-active:bg-background data-active:shadow-xs"
          >
            <Users className="mr-2 h-4 w-4 text-teal-500" />
            Usuarios & Accesos
          </TabsTrigger>
          <TabsTrigger
            value="exports"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-active:bg-background data-active:shadow-xs"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-teal-500" />
            Respaldos & Excel
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* PESTAÑA 1: DATOS DE LA EMPRESA & FISCALES */}
        {/* ======================================================== */}
        <TabsContent value="company" className="space-y-6">
          <Card className="rounded-3xl border-border/80 bg-card/80 backdrop-blur-md shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-500" />
                Información Comercial y Fiscal
              </CardTitle>
              <CardDescription>
                Estos datos aparecen en las facturas de venta, recibos de caja y estado de cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando datos...
                </div>
              ) : (
                <form onSubmit={handleUpdateSettings} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="companyName" className="text-xs font-semibold flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Razón Social / Nombre Comercial
                      </Label>
                      <Input
                        id="companyName"
                        value={settings.companyName || ''}
                        onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                        className="rounded-xl"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="companyNit" className="text-xs font-semibold flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                        NIT o Identificación Tributaria
                      </Label>
                      <Input
                        id="companyNit"
                        value={settings.companyNit || ''}
                        onChange={(e) => setSettings({ ...settings, companyNit: e.target.value })}
                        placeholder="Ej: 901.482.391-4"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="companyAddress" className="text-xs font-semibold flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        Dirección Principal
                      </Label>
                      <Input
                        id="companyAddress"
                        value={settings.companyAddress || ''}
                        onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                        placeholder="Ej: Calle Principal #10-24"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="companyCity" className="text-xs font-semibold">
                        Ciudad / Municipio
                      </Label>
                      <Input
                        id="companyCity"
                        value={settings.companyCity || ''}
                        onChange={(e) => setSettings({ ...settings, companyCity: e.target.value })}
                        placeholder="Ej: Cali, Colombia"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="companyPhone" className="text-xs font-semibold flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        Teléfono / WhatsApp
                      </Label>
                      <Input
                        id="companyPhone"
                        value={settings.companyPhone || ''}
                        onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                        placeholder="+57 300 000 0000"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="companyEmail" className="text-xs font-semibold flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        Correo Electrónico
                      </Label>
                      <Input
                        id="companyEmail"
                        type="email"
                        value={settings.companyEmail || ''}
                        onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                        placeholder="contacto@empresa.com"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="currency" className="text-xs font-semibold flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                        Moneda del Sistema
                      </Label>
                      <Select
                        value={settings.currency || 'COP'}
                        onValueChange={(val) => setSettings({ ...settings, currency: val || 'COP' })}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                          <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button
                      type="submit"
                      disabled={isPendingSave}
                      className="rounded-xl bg-primary text-primary-foreground font-semibold px-6 shadow-sm"
                    >
                      {isPendingSave ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> Guardar Información
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
          <Card className="rounded-3xl border-border/80 bg-card/80 backdrop-blur-md shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Receipt className="h-5 w-5 text-teal-500" />
                Parámetros de Facturación y Punto de Venta
              </CardTitle>
              <CardDescription>Define numeraciones, prefijos, avisos legales y alertas de inventario.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateSettings} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="invoicePrefix" className="text-xs font-semibold">
                      Prefijo de Factura
                    </Label>
                    <Input
                      id="invoicePrefix"
                      value={settings.invoicePrefix || 'CIL-'}
                      onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                      placeholder="Ej: CIL- o FAC-"
                      className="rounded-xl font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Antepuesto a cada factura generada (ej: {settings.invoicePrefix || 'CIL-'}1084).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lowStockThreshold" className="text-xs font-semibold">
                      Umbral de Alerta de Stock Bajo
                    </Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      min="1"
                      value={settings.lowStockThreshold ?? 5}
                      onChange={(e) => setSettings({ ...settings, lowStockThreshold: Number(e.target.value) })}
                      className="rounded-xl font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Cuando un producto tenga esta cantidad o menos, el sistema emitirá alertas visuales.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invoiceFooter" className="text-xs font-semibold">
                    Términos Legales y Pie de Factura
                  </Label>
                  <Input
                    id="invoiceFooter"
                    value={settings.invoiceFooter || ''}
                    onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                    placeholder="Garantía legal sobre productos de conformidad con la ley aplicable."
                    className="rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Este texto se imprime en el pie de página de cada factura y comprobante.
                  </p>
                </div>

                <div className="flex justify-end pt-3">
                  <Button
                    type="submit"
                    disabled={isPendingSave}
                    className="rounded-xl bg-primary text-primary-foreground font-semibold px-6 shadow-sm"
                  >
                    {isPendingSave ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Guardar Parámetros
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* PESTAÑA 3: USUARIOS & ACCESOS */}
        {/* ======================================================== */}
        <TabsContent value="users" className="space-y-6">
          <Card className="rounded-3xl border-border/80 bg-card/80 backdrop-blur-md shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-500" />
                  Equipo y Cuentas de Acceso
                </CardTitle>
                <CardDescription>Administra las cuentas con acceso al sistema Nova ERP.</CardDescription>
              </div>
              <Button
                onClick={() => setCreateUserOpen(true)}
                className="rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm"
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Nuevo Usuario
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-border/80 overflow-hidden">
                <Table>
                  <TableHeader>
                    <tr className="bg-muted/50 text-xs font-semibold">
                      <TableHead className="py-3 px-4">Usuario</TableHead>
                      <TableHead className="py-3 px-4">Correo Electrónico</TableHead>
                      <TableHead className="py-3 px-4 text-center">Rol</TableHead>
                      <TableHead className="py-3 px-4 text-right">Acción</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {users.map((u) => (
                      <TableRow key={u.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="py-3 px-4 font-semibold text-foreground flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                            {u.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span>{u.name}</span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-muted-foreground font-mono">{u.email}</TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
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
        {/* PESTAÑA 4: RESPALDOS & EXCEL */}
        {/* ======================================================== */}
        <TabsContent value="exports" className="space-y-6">
          <Card className="rounded-3xl border-border/80 bg-card/80 backdrop-blur-md shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-teal-500" />
                Exportaciones y Respaldos en Excel
              </CardTitle>
              <CardDescription>Genera reportes completos en hojas de cálculo con un solo clic.</CardDescription>
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
              <UserPlus className="h-5 w-5 text-teal-500" />
              Nuevo Usuario del Sistema
            </DialogTitle>
            <DialogDescription className="text-xs">
              Asigna nombre y credenciales de acceso para el colaborador.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="userName" className="text-xs font-semibold flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" /> Nombre Completo
              </Label>
              <Input
                id="userName"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Ej: Carlos Ramírez"
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="userEmail" className="text-xs font-semibold flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Correo Electrónico
              </Label>
              <Input
                id="userEmail"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="userPass" className="text-xs font-semibold flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Contraseña (opcional)
              </Label>
              <Input
                id="userPass"
                type="password"
                placeholder="Dejar vacío para autogenerar"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Si la dejas en blanco, el sistema generará una clave aleatoria segura.
              </p>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateUserOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createUserLoading}
                className="rounded-xl bg-primary text-primary-foreground font-semibold"
              >
                {createUserLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Creando...
                  </span>
                ) : (
                  'Crear Usuario'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmación de Eliminación de Usuario */}
      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent className="rounded-3xl p-6 max-w-sm">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              ¿Eliminar usuario?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Esta acción revocará el acceso de este usuario al sistema de inmediato.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 gap-2">
            <Button variant="outline" onClick={() => setDeleteUserDialogOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => userToDelete && handleDeleteUser(userToDelete)}
              className="rounded-xl"
            >
              Confirmar Eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
