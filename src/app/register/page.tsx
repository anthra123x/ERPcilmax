'use client'

import { useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClientSupabase } from '@/lib/supabase'
import { registerCompanyAndOwnerAction } from '@/modules/auth/auth.actions'
import { NovaLogo } from '@/components/ui/nova-logo'
import {
  SECTOR_INFO,
  type BusinessSector,
} from '@/lib/business-workflow'
import {
  Store,
  Smartphone,
  Shirt,
  ShoppingBasket,
  Wrench,
  HeartPulse,
  Briefcase,
  Upload,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  FileText,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
  Database,
  Zap,
  Server,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'

const SECTOR_ICONS: Record<BusinessSector, React.ComponentType<{ className?: string }>> = {
  retail_general: Store,
  technology_repair: Smartphone,
  fashion_apparel: Shirt,
  grocery_supermarket: ShoppingBasket,
  hardware_construction: Wrench,
  pharmacy_health: HeartPulse,
  services_workshop: Briefcase,
}

const MAX_LOGO_BYTES = 4 * 1024 * 1024

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [logoLoading, setLogoLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Form State
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [slogan, setSlogan] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [sector, setSector] = useState<BusinessSector>('retail_general')
  const [companyNit, setCompanyNit] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [currency, setCurrency] = useState('COP')

  // Password Security Strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return 0
    let score = 0
    if (password.length >= 6) score += 1
    if (password.length >= 8 && /[0-9]/.test(password)) score += 1
    if (password.length >= 10 && /[^A-Za-z0-9]/.test(password)) score += 1
    return Math.max(score, password.length >= 6 ? 1 : 0)
  }, [password])

  // Handle Logo Upload with client compression
  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Imagen demasiado pesada', {
        description: 'El logo no debe exceder 4 MB.',
      })
      return
    }

    setLogoLoading(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_DIM = 280
        let { width, height } = img
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width)
            width = MAX_DIM
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height)
            height = MAX_DIM
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/webp', 0.85)
        setLogoUrl(compressedDataUrl)
        setLogoLoading(false)
        toast.success('Logotipo optimizado correctamente')
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) {
      if (!ownerName.trim() || !email.trim() || !password) {
        toast.error('Completa todos los campos obligatorios del propietario')
        return
      }
      if (password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!companyName.trim()) {
        toast.error('El nombre comercial o razón social es obligatorio')
        return
      }
      setStep(3)
    }
  }

  async function handleCompleteRegistration(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Registrar empresa y propietario en la base de datos
      const res = await registerCompanyAndOwnerAction({
        name: ownerName.trim(),
        email: email.trim().toLowerCase(),
        password,
        companyName: companyName.trim(),
        sector,
        slogan: slogan.trim() || undefined,
        logoUrl: logoUrl || null,
        companyNit: companyNit.trim() || undefined,
        companyCity: companyCity.trim() || undefined,
        companyPhone: companyPhone.trim() || undefined,
        currency,
      })

      if (res.error) {
        toast.error(res.error)
        setLoading(false)
        return
      }

      // 2. Iniciar sesión automáticamente en Supabase Auth
      const supabase = createClientSupabase()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (signInError) {
        toast.success('Empresa registrada exitosamente. Por favor inicia sesión.')
        router.push('/login')
        return
      }

      toast.success('¡Bienvenido a Nova ERP!', {
        description: `Tu empresa ${companyName} ha sido configurada con éxito.`,
      })

      window.location.replace('/dashboard')
    } catch (err) {
      console.error(err)
      toast.error('Error durante el registro', {
        description: 'Ocurrió un problema inesperado. Inténtalo de nuevo.',
      })
      setLoading(false)
    }
  }

  const activeSectorInfo = SECTOR_INFO[sector]

  return (
    <div className="min-h-dvh w-full grid grid-cols-1 lg:grid-cols-12 bg-[#090b0f] text-slate-100 font-sans selection:bg-emerald-500/20">
      {/* ======================================================== */}
      {/* PANEL LATERAL IZQUIERDO: Editorial, Marca & Arquitectura  */}
      {/* ======================================================== */}
      <div className="lg:col-span-5 bg-[#0d1017] border-b lg:border-b-0 lg:border-r border-white/[0.08] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Atmósfera de Luz Ambiental Discreta de Alta Gama */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-80 h-80 rounded-full bg-teal-500/10 blur-[130px] pointer-events-none" />

        {/* Trama sutil técnica */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top: Logo y Estado de Plataforma */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <NovaLogo size="md" subtitle="Plataforma de Gestión Comercial" />
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              v2.4 LTS
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[11px] font-mono text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>PostgreSQL Neon &bull; Instancia Multi-Tenant</span>
          </div>
        </div>

        {/* Centro: Manifiesto & Resumen de Aprovisionamiento en Vivo */}
        <div className="relative z-10 py-10 lg:py-14 space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              La infraestructura moderna para operar tu negocio.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
              Punto de venta POS, inventario en tiempo real, catálogo omnicanal y control de cartera unificados bajo tu propio entorno privado.
            </p>
          </div>

          {/* Registro de Aprovisionamiento Dinámico (Blueprint en Vivo) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-2 border-b border-white/5">
              <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                Resumen de Aprovisionamiento
              </span>
              <span className="text-emerald-400">Paso {step} de 3</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <div className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${ownerName ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-slate-500'}`}>
                  {ownerName ? <Check className="h-3 w-3 stroke-[2.5]" /> : <span className="text-[10px] font-mono">1</span>}
                </div>
                <div className="min-w-0">
                  <span className="text-slate-400 font-mono text-[10px] block">PROPIETARIO / ACCESO:</span>
                  <span className="font-medium text-white truncate block">
                    {ownerName ? ownerName : 'Esperando nombre del administrador...'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${companyName ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-slate-500'}`}>
                  {companyName ? <Check className="h-3 w-3 stroke-[2.5]" /> : <span className="text-[10px] font-mono">2</span>}
                </div>
                <div className="min-w-0">
                  <span className="text-slate-400 font-mono text-[10px] block">EMPRESA / IDENTIDAD:</span>
                  <span className="font-medium text-white truncate block">
                    {companyName ? companyName : 'Esperando razón social de la empresa...'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="h-5 w-5 rounded-md bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3 w-3 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <span className="text-slate-400 font-mono text-[10px] block">SECTOR OPERATIVO:</span>
                  <span className="font-medium text-emerald-400 truncate block">
                    {activeSectorInfo.title} &bull; Margen base ~{activeSectorInfo.suggestedMargin}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Garantías de Seguridad y Confort Psicológico */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Base de datos aislada por empresa con encriptación TLS 1.3</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <Database className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Copias de seguridad continuas y control de auditoría de ventas</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Sin contratos forzosos. Ajusta parámetros cuando desees</span>
            </div>
          </div>
        </div>

        {/* Bottom: Garantía del Sistema */}
        <div className="relative z-10 pt-4 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Nova ERP &bull; Operación Multi-Negocio</span>
          <span className="font-mono">SSL 256-BIT</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PANEL DERECHO: Formulario Limpio, Minimalista y Enfocado  */}
      {/* ======================================================== */}
      <div className="lg:col-span-7 bg-[#090b0f] p-6 sm:p-12 lg:p-16 flex flex-col justify-between min-h-dvh relative">
        {/* Barra Superior con Enlace a Login y Contador de Pasos */}
        <div className="flex items-center justify-between pb-6 border-b border-white/[0.06] mb-8 sm:mb-12">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              FASE {step} / 3
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              {step === 1 && 'Credenciales de Acceso'}
              {step === 2 && 'Identidad & Marca'}
              {step === 3 && 'Sector Comercial'}
            </span>
          </div>

          <Link
            href="/login"
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>¿Ya tienes cuenta?</span>
            <span className="text-emerald-400 hover:underline">Iniciar Sesión &rarr;</span>
          </Link>
        </div>

        {/* Formulario Centrado de Alta Concentración */}
        <div className="max-w-xl mx-auto w-full my-auto py-2">
          {/* ======================================================== */}
          {/* PASO 1: CUENTA DE ADMINISTRADOR                          */}
          {/* ======================================================== */}
          {step === 1 && (
            <div key="step-1" className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Crea tu Cuenta de Propietario
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Ingresa los datos del administrador principal. Con este correo gestionarás permisos, inventarios y el flujo de caja.
                </p>
              </div>

              <form onSubmit={handleNextStep} className="space-y-5 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ownerName" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    Nombre y Apellido *
                  </Label>
                  <Input
                    id="ownerName"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Ej: Carlos Mendoza"
                    className="h-11 rounded-xl bg-white/[0.03] border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-600 transition-colors"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    Correo Electrónico de Acceso *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@tuempresa.com"
                    className="h-11 rounded-xl bg-white/[0.03] border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-600 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                      Contraseña Maestra *
                    </Label>
                    {password && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        {passwordStrength === 1 && 'Seguridad: Básica'}
                        {passwordStrength === 2 && 'Seguridad: Buena'}
                        {passwordStrength === 3 && 'Seguridad: Óptima'}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="h-11 pr-11 rounded-xl bg-white/[0.03] border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-600 transition-colors"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Barra de progreso de seguridad minimalista */}
                  {password && (
                    <div className="grid grid-cols-3 gap-1 pt-1 h-1">
                      <div className={`rounded-full transition-all ${passwordStrength >= 1 ? 'bg-amber-400' : 'bg-white/10'}`} />
                      <div className={`rounded-full transition-all ${passwordStrength >= 2 ? 'bg-emerald-400' : 'bg-white/10'}`} />
                      <div className={`rounded-full transition-all ${passwordStrength >= 3 ? 'bg-emerald-300' : 'bg-white/10'}`} />
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-[0.99] transition-all cursor-pointer gap-2"
                  >
                    <span>Continuar a Identidad de la Empresa</span>
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* PASO 2: IDENTIDAD & MARCA                                */}
          {/* ======================================================== */}
          {step === 2 && (
            <div key="step-2" className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Identidad Comercial & Marca
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Configura cómo se presentará tu negocio ante tus clientes en recibos de caja, facturas y catálogo.
                </p>
              </div>

              <form onSubmit={handleNextStep} className="space-y-5 pt-2">
                {/* Logotipo: Uploader Limpio Tipo Dropzone */}
                <div className="p-4 rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.04] transition-colors space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                      Logotipo del Negocio (Opcional)
                    </Label>
                    <span className="text-[10px] font-mono text-slate-400">
                      PNG, JPG, WebP o SVG &bull; Max 4MB
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-slate-950 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/10">
                      {logoLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                      ) : logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Logo de la empresa" className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6 text-slate-500" />
                      )}
                    </div>

                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={logoLoading}
                        onClick={() => logoInputRef.current?.click()}
                        className="rounded-lg h-9 text-xs font-semibold gap-1.5 border-white/15 bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 text-emerald-400" />
                        {logoUrl ? 'Cambiar Logotipo' : 'Cargar Archivo'}
                      </Button>

                      {logoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setLogoUrl(null)}
                          className="rounded-lg h-9 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="companyName" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    Razón Social o Nombre del Negocio *
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ej: Cilmax Tecnología & Repuestos"
                    className="h-11 rounded-xl bg-white/[0.03] border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-600 transition-colors"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="slogan" className="text-xs font-semibold text-slate-300">
                    Lema o Eslogan Comercial (Opcional)
                  </Label>
                  <Input
                    id="slogan"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="Ej: Calidad, respaldo y servicio experto"
                    className="h-11 rounded-xl bg-white/[0.03] border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-600 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyCity" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      Ciudad / Municipio
                    </Label>
                    <Input
                      id="companyCity"
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      placeholder="Ej: Bogotá, D.C."
                      className="h-11 rounded-xl bg-white/[0.03] border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-600 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="companyPhone" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      Teléfono / WhatsApp
                    </Label>
                    <Input
                      id="companyPhone"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="Ej: +57 300 123 4567"
                      className="h-11 rounded-xl bg-white/[0.03] border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-12 px-5 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold cursor-pointer gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Atrás
                  </Button>

                  <Button
                    type="submit"
                    className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-[0.99] transition-all cursor-pointer gap-2"
                  >
                    <span>Continuar a Especialidad</span>
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* PASO 3: SECTOR COMERCIAL & OPERACIÓN                     */}
          {/* ======================================================== */}
          {step === 3 && (
            <div key="step-3" className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Sector Comercial & Flujo de Operación
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Selecciona la actividad principal de tu empresa. El ERP ajustará los márgenes sugeridos, el flujo POS y los términos de garantía.
                </p>
              </div>

              <form onSubmit={handleCompleteRegistration} className="space-y-5 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-300">
                    Sector del Negocio *
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {(Object.keys(SECTOR_INFO) as BusinessSector[]).map((secKey) => {
                      const info = SECTOR_INFO[secKey]
                      const Icon = SECTOR_ICONS[secKey] || Store
                      const isSelected = sector === secKey

                      return (
                        <button
                          key={secKey}
                          type="button"
                          onClick={() => setSector(secKey)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40 text-white'
                              : 'border-white/10 hover:border-white/20 bg-white/[0.02] text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-400'}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                              ~{info.suggestedMargin}% margen
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-xs block text-white">{info.title}</span>
                            <span className="text-[11px] text-slate-400 line-clamp-1">{info.description}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyNit" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      NIT o Documento Fiscal
                    </Label>
                    <Input
                      id="companyNit"
                      value={companyNit}
                      onChange={(e) => setCompanyNit(e.target.value)}
                      placeholder="Ej: 900.123.456-7"
                      className="h-11 rounded-xl bg-white/[0.03] border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 font-mono text-sm text-white placeholder:text-slate-600 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="currency" className="text-xs font-semibold text-slate-300">
                      Moneda Principal
                    </Label>
                    <Select value={currency} onValueChange={(val) => setCurrency(val || 'COP')}>
                      <SelectTrigger id="currency" className="h-11 rounded-xl bg-white/[0.03] border-white/10 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#12161f] border-white/15 text-white">
                        <SelectItem value="COP">COP ($) — Peso Colombiano</SelectItem>
                        <SelectItem value="USD">USD ($) — Dólar Estadounidense</SelectItem>
                        <SelectItem value="EUR">EUR (€) — Euro</SelectItem>
                        <SelectItem value="MXN">MXN ($) — Peso Mexicano</SelectItem>
                        <SelectItem value="PEN">PEN (S/) — Sol Peruano</SelectItem>
                        <SelectItem value="CLP">CLP ($) — Peso Chileno</SelectItem>
                        <SelectItem value="ARS">ARS ($) — Peso Argentino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => setStep(2)}
                    className="h-12 px-5 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold cursor-pointer gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Atrás
                  </Button>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all cursor-pointer gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Aprovisionando Negocio en la Nube...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                        <span>Finalizar Registro y Entrar al ERP</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer Minimalista del Panel */}
        <div className="pt-6 border-t border-white/[0.06] text-[11px] text-slate-500 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} Nova ERP. Todos los derechos reservados.</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Server className="h-3 w-3 text-emerald-400" />
            <span>Infraestructura Segura Neon &bull; Supabase</span>
          </span>
        </div>
      </div>
    </div>
  )
}
