'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Mail, Calendar, Loader2 } from 'lucide-react'
import { getCurrentUser, updatePassword, updateProfileName } from '@/modules/auth/auth.actions'
import { ChangePasswordSchema } from '@/lib/validations'
import { toast } from 'sonner'

export default function ProfilePage() {
  const [user, setUser] = useState<{ email: string; name: string; createdAt: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const result = await getCurrentUser()
      if (result) {
        setUser({
          email: result.email ?? '',
          name: result.name ?? '',
          createdAt: '',
        })
        setName(result.name ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)

    const result = await updateProfileName(name)

    setSaving(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    if (user) setUser({ ...user, name: name.trim() })
    setIsEditing(false)
    toast.success('Perfil actualizado')
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    const parsed = ChangePasswordSchema.safeParse({ password: newPassword })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Contraseña inválida')
      return
    }

    setPasswordSaving(true)
    const result = await updatePassword(newPassword)
    setPasswordSaving(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Contraseña actualizada exitosamente')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-gray-600">No se pudo cargar la información del usuario. Inicia sesión nuevamente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-gray-600">Información de tu cuenta</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>Tus datos de usuario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              {isEditing ? (
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              ) : (
                <p className="text-sm">{user.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <p className="text-sm">{user.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <div className="flex items-center gap-2">
                <p className="text-sm">Administrador</p>
              </div>
            </div>

            {user.createdAt && (
              <div className="space-y-2">
                <Label>Fecha de Registro</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <p className="text-sm">{new Date(user.createdAt).toLocaleDateString('es-ES')}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setName(user.name)
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Editar</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
            <CardDescription>Cambiar contraseña</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña Actual</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button onClick={handlePasswordChange} disabled={passwordSaving}>
              {passwordSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar Contraseña
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
