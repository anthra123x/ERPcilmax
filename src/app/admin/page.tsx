'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Settings, Trash2, UserPlus, Database, Download, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { getUsers, deleteUser, createUserByAdmin } from '@/modules/auth/auth.actions'
import { getSystemSettings, updateSystemSettings } from '@/modules/settings/settings.actions'
import { exportData, cleanupAll } from '@/modules/cleanup/cleanup.actions'
import {
  exportProductsToExcel,
  exportSalesToExcel,
  exportClientsToExcel,
  exportInventoryToExcel,
} from '@/modules/export/export.actions'

export default function AdminPage() {
  type UserRow = Awaited<ReturnType<typeof getUsers>>[number]
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [exportExcelLoading, setExportExcelLoading] = useState<string | null>(null)
  const [backupLoading, setBackupLoading] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settings, setSettings] = useState<any>({})
  const [settingsLoading, setSettingsLoading] = useState(true)

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await getUsers()
        setUsers(data)
      } catch (_error) {
        console.error('Error loading users:', _error)
      } finally {
        setLoading(false)
      }
    }
    loadUsers()

    async function loadSettings() {
      try {
        const result = await getSystemSettings()
        if (result.success) setSettings(result.data)
      } catch (_error) {
        console.error('Error loading settings:', _error)
      } finally {
        setSettingsLoading(false)
      }
    }
    loadSettings()
  }, [])

  async function handleDeleteUser(userId: string) {
    const result = await deleteUser(userId)
    if (result.success) {
      const updated = await getUsers()
      setUsers(updated)
    }
    setDeleteUserDialogOpen(false)
    setUserToDelete(null)
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()

    const formData = new FormData()
    formData.append('email', newUserEmail)
    formData.append('name', newUserName)
    formData.append('password', newUserPassword)

    const result = await createUserByAdmin(formData)

    if (result.success) {
      toast.success(result.success)
      setNewUserEmail('')
      setNewUserName('')
      setNewUserPassword('')
      const updated = await getUsers()
      setUsers(updated)
    } else {
      toast.error(result.error)
    }
  }

  async function handleUpdateSettings(e: React.FormEvent) {
    e.preventDefault()

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
      toast.success('Configuración actualizada exitosamente')
      const updated = await getSystemSettings()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (updated.success) setSettings(updated.data as any)
    } else {
      toast.error(result.error)
    }
  }

  function downloadXlsx(base64: string, filename: string) {
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportData() {
    setBackupLoading(true)
    try {
      const result = await exportData()
      if (result.success && result.data && result.filename) {
        downloadXlsx(result.data, result.filename)
        toast.success('Backup exportado exitosamente')
      } else {
        toast.error(result.error || 'Error al exportar backup')
      }
    } catch (_error) {
      toast.error('Error al exportar backup')
    } finally {
      setBackupLoading(false)
    }
  }

  function openCleanupDialog() {
    setCleanupDialogOpen(true)
  }

  async function handleCleanup() {
    setCleanupLoading(true)

    try {
      // Backup opcional — si falla, advertimos pero no bloqueamos
      try {
        const backupResult = await exportData()
        if (backupResult.success && backupResult.data && backupResult.filename) {
          downloadXlsx(backupResult.data, backupResult.filename.replace('backup_', 'backup_before_cleanup_'))
          toast.success('Backup descargado automáticamente')
        } else {
          toast.warning('No se pudo generar el backup automático. La limpieza continuará de todos modos.')
        }
      } catch {
        toast.warning('No se pudo generar el backup automático. La limpieza continuará de todos modos.')
      }

      const result = await cleanupAll()

      if (result.success) {
        toast.success(result.success)
        setCleanupDialogOpen(false)
      } else {
        toast.error(result.error)
      }
    } catch (_error) {
      toast.error('Error durante la limpieza')
    } finally {
      setCleanupLoading(false)
    }
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
        toast.error(result.error || 'Error al exportar')
      }
    } catch (_error) {
      toast.error('Error al exportar')
    } finally {
      setExportExcelLoading(null)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Panel de Administración</h1>
        <p className="text-gray-600 text-lg">Configuración y gestión del sistema</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestión de Usuarios
            </CardTitle>
            <CardDescription>Administrar usuarios del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-none border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          aria-label="Eliminar usuario"
                          onClick={() => {
                            setUserToDelete(user.id)
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Crear Usuario
            </CardTitle>
            <CardDescription>Agregar un nuevo usuario al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newUserName">Nombre</Label>
                <Input id="newUserName" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newUserEmail">Email</Label>
                <Input
                  id="newUserEmail"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newUserPassword">Contraseña (opcional)</Label>
                <Input
                  id="newUserPassword"
                  type="password"
                  placeholder="Dejar vacío para generar automática"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full">
                Crear Usuario
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              Si no asignas contraseña, se generará una automática que se mostrará al crear.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración del Sistema
            </CardTitle>
            <CardDescription>Ajustes generales del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <p className="text-sm text-gray-600">Cargando configuración...</p>
            ) : (
              <form onSubmit={handleUpdateSettings} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input
                    id="companyName"
                    value={settings?.companyName || ''}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyNit">NIT / Cédula</Label>
                    <Input
                      id="companyNit"
                      value={settings?.companyNit || ''}
                      onChange={(e) => setSettings({ ...settings, companyNit: e.target.value })}
                      placeholder="Ej: 901234567-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyCity">Ciudad</Label>
                    <Input
                      id="companyCity"
                      value={settings?.companyCity || ''}
                      onChange={(e) => setSettings({ ...settings, companyCity: e.target.value })}
                      placeholder="Ej: Cali"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Dirección</Label>
                  <Input
                    id="companyAddress"
                    value={settings?.companyAddress || ''}
                    onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Teléfono / WhatsApp</Label>
                    <Input
                      id="companyPhone"
                      value={settings?.companyPhone || ''}
                      onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Email</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={settings?.companyEmail || ''}
                      onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select
                    value={settings?.currency || 'COP'}
                    onValueChange={(value) => setSettings({ ...settings, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                      <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix">Prefijo de Factura</Label>
                  <Input
                    id="invoicePrefix"
                    value={settings?.invoicePrefix || 'CIL-'}
                    onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceFooter">Pie de Página de Factura</Label>
                  <Input
                    id="invoiceFooter"
                    value={settings?.invoiceFooter || ''}
                    onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lowStockThreshold">Umbral de Stock Bajo</Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    value={settings?.lowStockThreshold ?? 5}
                    onChange={(e) => setSettings({ ...settings, lowStockThreshold: Number(e.target.value) })}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Guardar Configuración
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportación de Datos
            </CardTitle>
            <CardDescription>Exporta datos del sistema a Excel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                onClick={() => handleExportExcel('products')}
                variant="outline"
                className="w-full"
                disabled={exportExcelLoading !== null}
              >
                <Download className="h-4 w-4 mr-2" />
                {exportExcelLoading === 'products' ? 'Exportando...' : 'Exportar Productos'}
              </Button>
              <Button
                onClick={() => handleExportExcel('sales')}
                variant="outline"
                className="w-full"
                disabled={exportExcelLoading !== null}
              >
                <Download className="h-4 w-4 mr-2" />
                {exportExcelLoading === 'sales' ? 'Exportando...' : 'Exportar Ventas'}
              </Button>
              <Button
                onClick={() => handleExportExcel('inventory')}
                variant="outline"
                className="w-full"
                disabled={exportExcelLoading !== null}
              >
                <Download className="h-4 w-4 mr-2" />
                {exportExcelLoading === 'inventory' ? 'Exportando...' : 'Exportar Inventario'}
              </Button>
              <Button
                onClick={() => handleExportExcel('clients')}
                variant="outline"
                className="w-full"
                disabled={exportExcelLoading !== null}
              >
                <Download className="h-4 w-4 mr-2" />
                {exportExcelLoading === 'clients' ? 'Exportando...' : 'Exportar Clientes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 border-red-200 bg-red-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Database className="h-5 w-5" />
              Zona Crítica - Sistema
            </CardTitle>
            <CardDescription className="text-red-600">Backup y limpieza del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-4 bg-primary/5 rounded-none border border-primary/10">
                <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Backup de Datos
                </h4>
                <p className="text-sm text-primary/80 mb-3">
                  Exporta todos los datos del sistema antes de realizar cualquier limpieza.
                </p>
                <Button onClick={handleExportData} variant="default" className="w-full" disabled={backupLoading}>
                  <Download className="h-4 w-4 mr-2" />
                  {backupLoading ? 'Generando backup...' : 'Generar Backup Completo'}
                </Button>
              </div>

              <div className="p-4 bg-red-100 rounded-none border border-red-300">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Limpieza del Sistema
                </h4>
                <p className="text-sm text-red-800 mb-3">
                  Esta acción eliminará todos los datos del sistema permanentemente. Se generará un backup
                  automáticamente antes de ejecutar.
                </p>
                <Button onClick={openCleanupDialog} variant="destructive" className="w-full">
                  Limpiar Todo el Sistema
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteUserDialogOpen(false)
                setUserToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => userToDelete && handleDeleteUser(userToDelete)}>
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Limpieza
            </DialogTitle>
            <DialogDescription>
              Esta acción generará un backup automático y luego eliminará todos los datos del sistema.
              <br />
              <br />
              <strong>Tipo de limpieza:</strong> TODO
              <br />
              <br />
              ¿Estás seguro de continuar?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setCleanupDialogOpen(false)
              }}
              disabled={cleanupLoading}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCleanup} disabled={cleanupLoading}>
              {cleanupLoading ? 'Generando backup y limpiando...' : 'Confirmar Limpieza'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
