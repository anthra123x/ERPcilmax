'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClientSupabase } from '@/lib/supabase'
import { ChangePasswordSchema } from '@/lib/validations'
import { Loader2, KeyRound, AlertCircle, ShieldCheck, LogIn } from 'lucide-react'

function UpdatePasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [statusMessage, setStatusMessage] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClientSupabase()
        const code = searchParams.get('code')

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            setStatus('error')
            setStatusMessage('El enlace es inválido o ya fue usado. Solicita uno nuevo desde el inicio de sesión.')
            return
          }
        }

        const { data } = await supabase.auth.getSession()

        if (!data.session || !data.session.user) {
          setStatus('error')
          setStatusMessage('No hay una sesión activa. Solicita un enlace de recuperación desde el inicio de sesión.')
          return
        }

        setStatus('ready')
      } catch (_error) {
        setStatus('error')
        setStatusMessage('Ocurrió un error al validar el enlace. Intenta de nuevo.')
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (password !== confirm) {
      setStatusMessage('Las contraseñas no coinciden')
      setStatus('error')
      return
    }

    const parsed = ChangePasswordSchema.safeParse({ password })
    if (!parsed.success) {
      setStatusMessage(parsed.error.issues[0]?.message ?? 'Contraseña inválida')
      setStatus('error')
      return
    }

    setSaving(true)
    setStatusMessage('')

    try {
      const supabase = createClientSupabase()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setStatusMessage(updateError.message || 'No se pudo actualizar la contraseña')
        setStatus('error')
        setSaving(false)
        return
      }

      setSaved(true)
      setPassword('')
      setConfirm('')
      setSaving(false)
    } catch (_error) {
      setStatusMessage('Ocurrió un error inesperado')
      setStatus('error')
      setSaving(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-mesh opacity-70 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/70 pointer-events-none" />

      <main className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-4">
            <Image
              src="/logo cilmax.png"
              alt="Cilmax"
              width={240}
              height={48}
              priority
              className="h-14 w-auto object-contain"
            />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Cilmax</h1>
          </div>
        </div>

        <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-lg shadow-foreground/5 sm:p-10">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Restablecer contraseña</h2>
            <p className="text-sm text-gray-600">
              {saved ? 'Tu contraseña fue actualizada' : 'Define tu nueva contraseña'}
            </p>
          </div>

          {status === 'loading' && (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              Validando enlace...
            </div>
          )}

          {status === 'error' && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
              <Button type="button" size="lg" className="w-full h-12" onClick={() => router.push('/login')}>
                <LogIn className="h-5 w-5 mr-2" />
                Ir al inicio de sesión
              </Button>
            </div>
          )}

          {status === 'ready' && saved && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-sm text-primary">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Contraseña actualizada correctamente.</span>
              </div>
              <Button type="button" size="lg" className="w-full h-12" onClick={() => router.push('/login')}>
                <LogIn className="h-5 w-5 mr-2" />
                Iniciar sesión
              </Button>
            </div>
          )}

          {status === 'ready' && !saved && (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Nueva contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={saving}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm font-semibold text-foreground">
                  Confirmar contraseña
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repite la contraseña"
                  required
                  disabled={saving}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12"
                />
              </div>
              {statusMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 rounded-xl transition-all duration-150 active:scale-[0.98]"
                disabled={saving}
                aria-busy={saving}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Actualizando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5" />
                    Actualizar contraseña
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>
      </main>

      <footer className="relative z-10 w-full pb-8 text-center">
        <p className="text-xs text-muted-foreground/70">Cilmax &mdash; Sistema de gestión de tienda</p>
      </footer>
    </div>
  )
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <UpdatePasswordInner />
    </Suspense>
  )
}