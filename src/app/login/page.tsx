'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClientSupabase } from '@/lib/supabase'
import { ensureUserExists, requestPasswordReset } from '@/modules/auth/auth.actions'
import { LogIn, AlertCircle, Loader2, ArrowLeft, KeyRound, MailCheck } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [recover, setRecover] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryMessage, setRecoveryMessage] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const supabase = createClientSupabase()

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message || 'Credenciales incorrectas')
        setIsLoading(false)
        return
      }

      if (data.user) {
        try {
          await ensureUserExists(data.user.email || '', data.user.user_metadata?.name || data.user.email || '')
        } catch (_ensureError) {
          // Continue anyway - user should already exist
        }
      }

      window.location.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
      setIsLoading(false)
    }
  }

  async function handleRecover(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setRecoveryLoading(true)
    setRecoveryMessage('')
    setError('')

    const result = await requestPasswordReset(recoveryEmail)

    setRecoveryLoading(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    setRecoveryMessage(result?.success || 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.')
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-mesh opacity-70 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/70 pointer-events-none" />

      <main className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-4 py-8 font-sans">
        <div className="mb-8 flex flex-col items-center gap-4 text-center animate-fade-up" style={{ animationDelay: '0ms' }}>
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
          <p className="text-sm text-gray-600">El sistema de tu tienda, simple y a tu medida.</p>
        </div>

        <div
          className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-lg shadow-foreground/5 sm:p-10 animate-fade-up"
          style={{ animationDelay: '80ms' }}
        >
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Bienvenido</h2>
            <p className="text-sm text-gray-600">Inicia sesión para acceder a tu panel</p>
          </div>

          {recover ? (
            <div className="mt-8">
              <form onSubmit={handleRecover} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="recoveryEmail" className="text-sm font-semibold text-foreground">
                    Email
                  </Label>
                  <Input
                    id="recoveryEmail"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    required
                    disabled={recoveryLoading}
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="h-12"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {recoveryMessage && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-sm text-primary animate-fade-in">
                    <MailCheck className="h-4 w-4 shrink-0" />
                    <span>{recoveryMessage}</span>
                  </div>
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 rounded-xl transition-all duration-150 active:scale-[0.98]"
                  disabled={recoveryLoading}
                  aria-busy={recoveryLoading}
                >
                  {recoveryLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Enviando enlace...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5" />
                      Enviar enlace de recuperación
                    </span>
                  )}
                </Button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setRecover(false)
                  setError('')
                  setRecoveryMessage('')
                }}
                className="mt-6 flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a iniciar sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  required
                  disabled={isLoading}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                    Contraseña
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecover(true)
                      setError('')
                    }}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  required
                  disabled={isLoading}
                  className="h-12"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 rounded-xl transition-all duration-150 active:scale-[0.98]"
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Iniciando sesión...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-5 w-5" />
                    Iniciar sesión
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>
      </main>

      <footer className="relative z-10 w-full pb-8 text-center">
        <p className="text-xs text-muted-foreground/70 animate-fade-up" style={{ animationDelay: '160ms' }}>
          Cilmax &mdash; Sistema de gestión de tienda
        </p>
      </footer>
    </div>
  )
}
