'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClientSupabase } from '@/lib/supabase'
import { ensureUserExists, requestPasswordReset } from '@/modules/auth/auth.actions'
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
  Zap,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Package,
  Receipt,
  Store,
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

    setRecoveryMessage(
      result?.success || 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'
    )
  }

  return (
    <div className="relative min-h-dvh w-full flex items-center justify-center bg-[#070b14] text-white overflow-hidden font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* ======================================================== */}
      {/* FONDO UNIFICADO Y LUCES AMBIENTALES (Sin divisiones duras) */}
      {/* ======================================================== */}
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] bg-teal-500/12 rounded-full blur-[140px] pointer-events-none animate-pulse-slow" />
      <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse-slow" />
      <div className="absolute -bottom-40 left-1/3 w-[480px] h-[480px] bg-cyan-600/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Trama sutil de micropuntos de precisión */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* ======================================================== */}
      {/* CONTENEDOR PRINCIPAL INTEGRADO (Grid amplio y centrado) */}
      {/* ======================================================== */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 py-8 sm:px-8 lg:px-12 xl:px-16 flex flex-col justify-between min-h-dvh lg:justify-center">
        {/* Header móvil / branding */}
        <div className="flex lg:hidden items-center justify-between py-4 mb-4">
          <Image
            src="/logo cilmax.png"
            alt="Cilmax"
            width={125}
            height={32}
            priority
            className="h-7 w-auto object-contain brightness-110"
          />
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-teal-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sistema en línea</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-20 items-center my-auto w-full">
          {/* ======================================================== */}
          {/* LADO IZQUIERDO: Visuales ERP Minimalistas (Alineado a la Izquierda) */}
          {/* ======================================================== */}
          <div className="hidden lg:flex lg:col-span-7 flex-col space-y-6 w-full max-w-xl xl:max-w-2xl mr-auto animate-fade-in">
            {/* Header / Logo oficial y estado */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center p-2 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 shadow-lg shadow-teal-500/5">
                  <Image
                    src="/logo cilmax.png"
                    alt="Cilmax ERP"
                    width={130}
                    height={34}
                    priority
                    className="h-7.5 w-auto object-contain brightness-110"
                  />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white/70">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-mono text-[11px] text-emerald-400">Sistema en línea</span>
              </div>
            </div>

            {/* Titular Minimalista (Sin exceso de texto) */}
            <div className="space-y-1.5 pt-2">
              <h1 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-tight">
                Gestión comercial, POS e inventario
              </h1>
              <p className="text-xs xl:text-sm text-white/50">
                Control de ventas físicas y web con sincronización en tiempo real.
              </p>
            </div>

            {/* ================= TARJETAS FLOTANTES Y ANIMACIONES ================= */}
            <div className="space-y-4 pt-1 w-full">
              {/* Tarjeta Flotante 1: Venta POS */}
              <div className="relative w-full p-5 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 animate-float transition-all hover:bg-white/[0.07]">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center text-teal-300">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Venta POS #1084</div>
                      <div className="text-[10px] text-white/40">Mostrador &bull; Cobro inmediato</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[10px] font-medium text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Cobrada
                  </span>
                </div>

                <div className="py-3 space-y-2 text-xs">
                  <div className="flex justify-between text-white/80">
                    <span className="truncate max-w-[280px]">Combo Olla de Presión 6L Acero Inoxidable</span>
                    <span className="font-mono font-medium text-white">$380.000</span>
                  </div>
                  <div className="flex justify-between text-white/50 text-[11px]">
                    <span>Válvula de Seguridad Reforzada</span>
                    <span className="font-mono">$100.000</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.08] text-xs">
                  <span className="text-white/40">Total</span>
                  <span className="font-mono text-sm font-bold text-teal-400">$480.000 COP</span>
                </div>
              </div>

              {/* Tarjeta Flotante 2: Inventario Omnicanal */}
              <div
                className="relative w-full p-5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/30 animate-float-reverse transition-all hover:bg-white/[0.06]"
                style={{ animationDelay: '1.2s' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-300">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Stock Omnicanal</div>
                      <div className="text-[10px] text-white/40">Tienda Física & Web</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-300">
                    <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                    <span>Sincronizado</span>
                  </div>
                </div>

                <div className="mt-3.5">
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="text-white/50">Disponibilidad en catálogo</span>
                    <span className="text-teal-400 font-mono font-semibold">98.6%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 w-[98.6%]" />
                  </div>
                </div>
              </div>

              {/* Fila de Micro-Pills Minimalistas con Iconos */}
              <div className="grid grid-cols-3 gap-3 pt-1 w-full">
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                  <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-white/40 leading-none">Ventas Hoy</div>
                    <div className="text-xs font-bold font-mono text-white mt-1">$4.85M</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                  <Store className="h-4 w-4 text-teal-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-white/40 leading-none">Catálogo Web</div>
                    <div className="text-xs font-bold font-mono text-white mt-1">Activo</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
                  <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-white/40 leading-none">Seguridad</div>
                    <div className="text-xs font-bold font-mono text-white mt-1">Cifrado</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* LADO DERECHO: Tarjeta de Acceso Flotante (Alineado a la Derecha) */}
          {/* ======================================================== */}
          <div className="w-full lg:col-span-5 flex justify-center lg:justify-end ml-auto lg:mt-8 xl:mt-12">
            <div className="w-full max-w-[440px] xl:max-w-[460px] p-7 sm:p-9 xl:p-10 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 animate-fade-up">
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
                      className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors mb-1 cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Volver al inicio de sesión
                    </button>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Recuperar contraseña</h2>
                    <p className="text-xs text-white/50">
                      Ingresa tu correo para recibir las instrucciones de restablecimiento.
                    </p>
                  </div>

                  <form onSubmit={handleRecover} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="recoveryEmail" className="text-xs font-medium text-white/80">
                        Correo electrónico
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                        <Input
                          id="recoveryEmail"
                          type="email"
                          autoComplete="email"
                          placeholder="usuario@cilmax.com"
                          required
                          disabled={recoveryLoading}
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          className="h-11 pl-10 rounded-xl bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:border-teal-400"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 rounded-xl bg-destructive/20 border border-destructive/30 p-2.5 text-xs text-red-200 animate-fade-in">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {recoveryMessage && (
                      <div className="flex items-center gap-2 rounded-xl bg-teal-500/20 border border-teal-500/30 p-2.5 text-xs text-teal-200 animate-fade-in">
                        <MailCheck className="h-4 w-4 shrink-0" />
                        <span>{recoveryMessage}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-11 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white transition-all duration-200 active:scale-[0.98] shadow-lg shadow-teal-500/20 cursor-pointer"
                      disabled={recoveryLoading}
                      aria-busy={recoveryLoading}
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
                    <h2 className="text-2xl font-bold tracking-tight text-white">Iniciar sesión</h2>
                    <p className="text-xs text-white/50">Ingresa tus credenciales para acceder al sistema</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Campo Correo */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-medium text-white/80">
                        Correo electrónico
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="usuario@cilmax.com"
                          required
                          disabled={isLoading}
                          className="h-11 pl-10 rounded-xl bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:border-teal-400 transition-all"
                        />
                      </div>
                    </div>

                    {/* Campo Contraseña */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-xs font-medium text-white/80">
                          Contraseña
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            setRecover(true)
                            setError('')
                          }}
                          className="text-[11px] font-medium text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••••••"
                          required
                          disabled={isLoading}
                          className="h-11 pl-10 pr-11 rounded-xl bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:border-teal-400 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          tabIndex={-1}
                          title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer p-0.5"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Mensaje de Error */}
                    {error && (
                      <div className="flex items-center gap-2 rounded-xl bg-destructive/20 border border-destructive/30 p-2.5 text-xs text-red-200 animate-fade-in">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Botón de Enviar */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-11 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white transition-all duration-200 active:scale-[0.98] shadow-lg shadow-teal-500/20 cursor-pointer"
                      disabled={isLoading}
                      aria-busy={isLoading}
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

                  {/* Nota de Seguridad Minimalista */}
                  <div className="pt-2 text-center">
                    <p className="text-[11px] text-white/40 flex items-center justify-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-400/70" />
                      Acceso seguro cifrado de extremo a extremo
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Minimalista de la página */}
        <div className="py-4 text-center text-[11px] text-white/30">
          <p>Cilmax ERP & POS &bull; Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  )
}
