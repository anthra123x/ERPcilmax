'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClientSupabase } from '@/lib/supabase'
import { ensureUserExists, requestPasswordReset } from '@/modules/auth/auth.actions'
import { NovaLogo } from '@/components/ui/nova-logo'
import {
  LogIn,
  AlertCircle,
  Loader2,
  ArrowLeft,
  KeyRound,
  MailCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Package,
  Receipt,
  HandCoins,
} from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [recover, setRecover] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
        } catch {
          // Continuar normalmente
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

    setRecoveryMessage(
      result?.success || 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
    )
  }

  return (
    <div className="relative min-h-dvh w-full flex items-center justify-center bg-[#f4f5f7] dark:bg-background text-foreground overflow-hidden font-sans">
      {/* Trama sutil de micropuntos de precisión */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Luces ambientales tenues */}
      <div className="absolute -top-40 -left-40 w-[480px] h-[480px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[480px] h-[480px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Contenedor principal */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 py-8 sm:px-8 lg:px-12 flex flex-col justify-between min-h-dvh lg:justify-center">
        {/* Header móvil */}
        <div className="flex lg:hidden items-center justify-between py-4 mb-4">
          <NovaLogo size="sm" />
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border/80 text-[11px] text-muted-foreground shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono">Sistema activo</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-20 items-center my-auto w-full">
          {/* ======================================================== */}
          {/* LADO IZQUIERDO: Visuales ERP Modernos (Multi-negocio) */}
          {/* ======================================================== */}
          <div className="hidden lg:flex lg:col-span-7 flex-col space-y-6 w-full max-w-xl xl:max-w-2xl mr-auto animate-fade-in">
            {/* Header / Logo oficial y estado de la plataforma */}
            <div className="flex items-center justify-between">
              <NovaLogo size="md" subtitle="Plataforma de Gestión Comercial" />

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/80 text-xs shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Sistema en línea
                </span>
              </div>
            </div>

            {/* Titular */}
            <div className="space-y-1.5 pt-2">
              <h1 className="text-2xl xl:text-3xl font-bold tracking-tight text-foreground leading-tight">
                El sistema moderno para operar cualquier negocio
              </h1>
              <p className="text-xs xl:text-sm text-muted-foreground">
                Ventas de mostrador POS, catálogo omnicanal, cartera y tesorería con sincronización en tiempo real.
              </p>
            </div>

            {/* Tarjetas de demostración visual estilo SaaS */}
            <div className="space-y-3.5 pt-1 w-full">
              {/* Tarjeta 1: Venta POS Registrada */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs transition-all hover:shadow-md">
                <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-foreground font-bold">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Venta Mostrador #04910</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Caja Principal &bull; Cobro inmediato
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" /> Completada
                  </span>
                </div>

                <div className="py-2.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-foreground">
                    <span className="font-medium truncate max-w-[260px]">Silla Ergonómica Pro de Escritorio</span>
                    <span className="font-mono font-bold">$420.000</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Soporte Ajustable &bull; Garantía 1 año</span>
                    <span className="font-mono">1 unidad</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                  <span className="text-muted-foreground">Total Recibido</span>
                  <span className="font-mono font-extrabold text-foreground">$420.000 COP</span>
                </div>
              </div>

              {/* Fila de 3 Micro-Tarjetas */}
              <div className="grid grid-cols-3 gap-3 w-full">
                <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-4 w-4 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Ventas Hoy
                    </span>
                  </div>
                  <div className="text-sm font-extrabold font-mono text-foreground mt-1.5">$18.450.000</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">+12.4% vs ayer</div>
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <Package className="h-4 w-4 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Catálogo
                    </span>
                  </div>
                  <div className="text-sm font-extrabold font-mono text-foreground mt-1.5">100% Sincronizado</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Tienda física y web</div>
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <HandCoins className="h-4 w-4 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Cartera POS
                    </span>
                  </div>
                  <div className="text-sm font-extrabold font-mono text-foreground mt-1.5">$7.850.000</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Control de crédito</div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* LADO DERECHO: Tarjeta de Acceso Flotante (SaaS Card) */}
          {/* ======================================================== */}
          <div className="w-full lg:col-span-5 flex justify-center lg:justify-end ml-auto">
            <div className="w-full max-w-[420px] p-7 sm:p-9 rounded-3xl bg-card border border-border/80 shadow-xl">
              {recover ? (
                /* Vista de Recuperación de Contraseña */
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRecover(false)
                        setError('')
                        setRecoveryMessage('')
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1 cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Volver al inicio de sesión
                    </button>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Recuperar contraseña</h2>
                    <p className="text-xs text-muted-foreground">
                      Ingresa tu correo para recibir las instrucciones de restablecimiento.
                    </p>
                  </div>

                  <form onSubmit={handleRecover} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="recoveryEmail" className="text-xs font-semibold text-foreground">
                        Correo electrónico
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                        <Input
                          id="recoveryEmail"
                          type="email"
                          autoComplete="email"
                          placeholder="usuario@empresa.com"
                          required
                          disabled={recoveryLoading}
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          className="h-10 pl-10 rounded-xl bg-muted/40 border-border/80 text-xs shadow-2xs"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive animate-fade-in">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {recoveryMessage && (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-700 dark:text-emerald-400 animate-fade-in">
                        <MailCheck className="h-4 w-4 shrink-0" />
                        <span>{recoveryMessage}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-10 rounded-xl text-xs font-semibold bg-gray-950 text-white dark:bg-white dark:text-gray-950 hover:bg-black transition-all duration-200 active:scale-[0.98] shadow-xs cursor-pointer"
                      disabled={recoveryLoading}
                    >
                      {recoveryLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando enlace...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <KeyRound className="h-4 w-4" />
                          Enviar instrucciones
                        </span>
                      )}
                    </Button>
                  </form>
                </div>
              ) : (
                /* Vista Principal de Login */
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Iniciar sesión</h2>
                    <p className="text-xs text-muted-foreground">Ingresa tus credenciales para acceder a Nova ERP</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Campo Correo */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                        Correo electrónico
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="usuario@empresa.com"
                          required
                          disabled={isLoading}
                          className="h-10 pl-10 rounded-xl bg-muted/40 border-border/80 text-xs shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Campo Contraseña */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                          Contraseña
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            setRecover(true)
                            setError('')
                          }}
                          className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••••••"
                          required
                          disabled={isLoading}
                          className="h-10 pl-10 pr-10 rounded-xl bg-muted/40 border-border/80 text-xs shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          tabIndex={-1}
                          title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Mensaje de Error */}
                    {error && (
                      <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive animate-fade-in">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Botón de Acceso Principal */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-10 rounded-xl text-xs font-semibold bg-gray-950 text-white dark:bg-white dark:text-gray-950 hover:bg-black transition-all duration-200 active:scale-[0.98] shadow-xs cursor-pointer"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Iniciando sesión...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <LogIn className="h-4 w-4" />
                          Acceder al sistema
                        </span>
                      )}
                    </Button>
                  </form>

                  {/* Nota de Seguridad */}
                  <div className="pt-1 text-center">
                    <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Acceso seguro y cifrado de extremo a extremo
                    </p>
                  </div>

                  {/* Registro de nueva empresa */}
                  <div className="pt-3 border-t border-border/60 text-center space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      ¿Aún no tienes cuenta para tu negocio?
                    </p>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary transition-colors underline underline-offset-4 cursor-pointer"
                    >
                      Registrar mi empresa y comenzar &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="py-4 text-center text-[11px] text-muted-foreground/70">
          <p>Nova ERP &bull; Plataforma multi-negocio &bull; Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  )
}
