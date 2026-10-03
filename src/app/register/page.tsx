'use client'

import { useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Sparkles,
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
  Shield,
  Database,
  Zap,
  Receipt,
  Cpu,
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

const SAMPLE_SECTOR_ITEMS: Record<BusinessSector, { name: string; sku: string; price: number }> = {
  retail_general: { name: 'Artículo Comercial en Catálogo', sku: 'RET-001', price: 65000 },
  technology_repair: { name: 'Módulo Display OLED Pro + Instalación', sku: 'TEC-042', price: 280000 },
  fashion_apparel: { name: 'Camisa Lino Premium • Talla M', sku: 'FSH-108', price: 110000 },
  grocery_supermarket: { name: 'Canasta de Abarrotes & Víveres', sku: 'GRO-512', price: 48000 },
  hardware_construction: { name: 'Taladro Percutor 750W Industrial', sku: 'HRD-204', price: 195000 },
  pharmacy_health: { name: 'Complejo Vitamínico & Cuidado Esencial', sku: 'PHR-099', price: 54000 },
  services_workshop: { name: 'Diagnóstico & Mantenimiento Preventivo', sku: 'SRV-015', price: 150000 },
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
  const ActiveSectorIcon = SECTOR_ICONS[sector] || Store
  const sampleItem = SAMPLE_SECTOR_ITEMS[sector] || SAMPLE_SECTOR_ITEMS.retail_general

  return (
    <div className="relative min-h-dvh w-full flex items-center justify-center bg-[#090b0e] text-slate-100 overflow-hidden font-sans selection:bg-emerald-500/20 py-10 px-4 sm:px-6 lg:px-10">
      {/* Trama técnica de micropuntos de precisión */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* Luces ambientales dinámicas de alta visibilidad que se mueven fluidamente entre puntos */}
      <div className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full blur-[110px] pointer-events-none animate-ambient-glow-1 bg-gradient-to-tr from-emerald-500/40 via-emerald-400/25 to-teal-400/15" />
      <div className="absolute -bottom-36 -right-36 w-[700px] h-[700px] rounded-full blur-[120px] pointer-events-none animate-ambient-glow-2 bg-gradient-to-bl from-teal-500/35 via-emerald-500/25 to-emerald-600/15" />
      <div className="absolute top-1/4 left-1/3 w-[520px] h-[520px] rounded-full blur-[130px] pointer-events-none animate-ambient-wander bg-gradient-to-r from-emerald-400/30 via-teal-300/20 to-emerald-600/15" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full blur-[140px] pointer-events-none animate-ambient-shine bg-emerald-500/20" />

      {/* Contenedor Principal Amplio (Sin header rígido superior) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col gap-8">
        {/* Cabecera Flotante Integrada (Logo y Acceso Rápido) */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <NovaLogo size="md" subtitle="Plataforma de Operación Comercial" />
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Alta Segura SSL &bull; Multi-Tenant</span>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/40 text-xs font-semibold text-slate-300 hover:text-white transition-all duration-200 shadow-2xs backdrop-blur-md cursor-pointer group"
          >
            <span>¿Ya tienes cuenta?</span>
            <span className="text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center">
              Iniciar Sesión &rarr;
            </span>
          </Link>
        </div>

        {/* Grid de 2 Columnas de Gran Presencia: Formulario Guiado + Cockpit en Vivo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* ======================================================== */}
          {/* COLUMNA IZQUIERDA: Formulario Guiado (Doble-Bisel Hardware) */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 space-y-6">
            {/* Stepper / Indicador de Fases Dinámico y Conectado */}
            <div className="p-2 sm:p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-xs">
              <div className="flex items-center justify-between relative px-3 py-2">
                {/* Línea conectora base */}
                <div className="absolute top-6 left-12 right-12 h-0.5 bg-white/10 -z-0" />
                {/* Línea conectora activa con haz esmeralda */}
                <div
                  className="absolute top-6 left-12 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 transition-all duration-500 ease-out -z-0"
                  style={{
                    width: step === 1 ? '0%' : step === 2 ? '50%' : 'calc(100% - 6rem)',
                  }}
                />

                {[
                  { s: 1, title: 'Cuenta Propietario', desc: 'Credenciales maestras' },
                  { s: 2, title: 'Identidad Comercial', desc: 'Marca & Logotipo' },
                  { s: 3, title: 'Motor del Negocio', desc: 'Sector & Operación' },
                ].map((item) => {
                  const isCompleted = step > item.s
                  const isCurrent = step === item.s

                  return (
                    <button
                      key={item.s}
                      type="button"
                      onClick={() => {
                        if (item.s < step) setStep(item.s as 1 | 2 | 3)
                      }}
                      disabled={item.s > step}
                      className={`relative z-10 flex flex-col items-center gap-2 transition-all text-center cursor-pointer ${
                        item.s > step ? 'opacity-40 cursor-not-allowed' : 'opacity-100'
                      }`}
                    >
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          isCompleted
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 scale-105'
                            : isCurrent
                              ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/25 shadow-lg shadow-emerald-500/40 scale-110'
                              : 'bg-white/5 text-slate-400 border border-white/15'
                        }`}
                      >
                        {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : item.s}
                      </div>
                      <div className="flex flex-col items-center">
                        <span
                          className={`text-xs font-bold tracking-tight ${
                            isCurrent
                              ? 'text-white font-extrabold'
                              : isCompleted
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:block">
                          {item.desc}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Doble-Bisel Hardware: Envoltorio Exterior con Reflejo */}
            <div className="p-1 sm:p-1.5 rounded-[2.2rem] bg-gradient-to-b from-white/12 via-white/[0.03] to-transparent border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 opacity-90" />

              {/* Núcleo Interior de Cristal Líquido (Glass Core) */}
              <div className="rounded-[calc(2.2rem-0.375rem)] bg-[#0d1117]/90 backdrop-blur-2xl p-6 sm:p-9 relative">
                {/* ======================================================== */}
                {/* PASO 1: CUENTA DE ADMINISTRADOR                          */}
                {/* ======================================================== */}
                {step === 1 && (
                  <div key="step-1" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-300">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-3 border border-emerald-500/20">
                        <User className="h-3.5 w-3.5" />
                        Paso 1 de 3 &bull; Credenciales Principales
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                        Crea tu Cuenta de Propietario
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                        Este usuario tendrá acceso maestro a las finanzas, control de inventario y configuración de Nova ERP.
                      </p>
                    </div>

                    <form onSubmit={handleNextStep} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="ownerName" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-emerald-400" />
                          Nombre Completo del Administrador *
                        </Label>
                        <Input
                          id="ownerName"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="Ej: Carlos Mendoza"
                          className="rounded-xl h-11 bg-white/[0.04] border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-500 shadow-inner"
                          required
                          autoFocus
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-emerald-400" />
                          Correo Electrónico de Acceso *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="correo@tuempresa.com"
                          className="rounded-xl h-11 bg-white/[0.04] border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-500 shadow-inner"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-emerald-400" />
                            Contraseña de Seguridad *
                          </Label>
                          {password && (
                            <span className="text-[11px] font-mono text-emerald-400">
                              {passwordStrength === 1 && 'Nivel: Básica'}
                              {passwordStrength === 2 && 'Nivel: Buena'}
                              {passwordStrength === 3 && 'Nivel: Alta Seguridad'}
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
                            className="rounded-xl h-11 pr-11 bg-white/[0.04] border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-500 shadow-inner"
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

                        {/* Indicador de Fuerza de Contraseña Háptico */}
                        {password && (
                          <div className="space-y-1 pt-1">
                            <div className="grid grid-cols-3 gap-1.5 h-1.5">
                              <div
                                className={`rounded-full transition-all duration-300 ${
                                  passwordStrength >= 1 ? 'bg-amber-400 shadow-xs shadow-amber-400/50' : 'bg-white/10'
                                }`}
                              />
                              <div
                                className={`rounded-full transition-all duration-300 ${
                                  passwordStrength >= 2 ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-white/10'
                                }`}
                              />
                              <div
                                className={`rounded-full transition-all duration-300 ${
                                  passwordStrength >= 3 ? 'bg-emerald-300 shadow-sm shadow-emerald-300/50' : 'bg-white/10'
                                }`}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {passwordStrength < 2
                                ? 'Tip: Añade números o símbolos para mayor seguridad empresarial.'
                                : 'Excelente: tu clave cumple con los estándares de seguridad requeridos.'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Botón Primario con Arquitectura "Button-in-Button" */}
                      <div className="pt-3">
                        <button
                          type="submit"
                          className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm px-5 flex items-center justify-between shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
                        >
                          <span className="pl-1">Continuar a Datos de la Empresa</span>
                          <span className="h-8 w-8 rounded-xl bg-slate-950/15 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                          </span>
                        </button>
                      </div>

                      {/* Píldora de Reaseguro & Confianza */}
                      <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                        <Shield className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Tus datos de acceso están protegidos con autenticación segura Supabase.</span>
                      </div>
                    </form>
                  </div>
                )}

                {/* ======================================================== */}
                {/* PASO 2: IDENTIDAD & MARCA                                */}
                {/* ======================================================== */}
                {step === 2 && (
                  <div key="step-2" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-300">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-3 border border-emerald-500/20">
                        <Sparkles className="h-3.5 w-3.5" />
                        Paso 2 de 3 &bull; Personalización de Marca
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                        Identidad de tu Negocio
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                        Personaliza cómo se mostrará tu empresa en las facturas, recibos POS y en el catálogo en línea.
                      </p>
                    </div>

                    <form onSubmit={handleNextStep} className="space-y-5">
                      {/* Zona Interactiva de Subida de Logotipo */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                            Logotipo Oficial de la Empresa
                          </Label>
                          <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            Auto-optimizado WebP
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="h-16 w-16 rounded-2xl bg-slate-950 border border-white/15 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/10 shadow-md relative group">
                            {logoLoading ? (
                              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                            ) : logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                            ) : (
                              <Building2 className="h-7 w-7 text-slate-500" />
                            )}
                          </div>

                          <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                            <input
                              ref={logoInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/svg+xml"
                              onChange={handleLogoUpload}
                              className="hidden"
                              id="logo-upload-input"
                            />
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={logoLoading}
                                onClick={() => logoInputRef.current?.click()}
                                className="rounded-xl h-9 px-3.5 text-xs font-semibold gap-2 border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white cursor-pointer"
                              >
                                <Upload className="h-3.5 w-3.5 text-emerald-400" />
                                {logoUrl ? 'Cambiar Logo' : 'Subir Logotipo'}
                              </Button>

                              {logoUrl && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setLogoUrl(null)}
                                  className="rounded-xl h-9 px-3 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  Quitar
                                </Button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Formatos PNG, JPG, WebP o SVG. Máximo 4MB.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companyName" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                          Razón Social o Nombre Comercial *
                        </Label>
                        <Input
                          id="companyName"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Ej: Nova Retail Store S.A.S"
                          className="rounded-xl h-11 bg-white/[0.04] border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-500 shadow-inner"
                          required
                          autoFocus
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="slogan" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                          Lema Comercial o Eslogan (Opcional)
                        </Label>
                        <Input
                          id="slogan"
                          value={slogan}
                          onChange={(e) => setSlogan(e.target.value)}
                          placeholder="Ej: Tecnología y moda al mejor precio"
                          className="rounded-xl h-11 bg-white/[0.04] border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-500 shadow-inner"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="companyCity" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            Ciudad / Municipio
                          </Label>
                          <Input
                            id="companyCity"
                            value={companyCity}
                            onChange={(e) => setCompanyCity(e.target.value)}
                            placeholder="Ej: Bogotá, D.C."
                            className="rounded-xl h-11 bg-white/[0.04] border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-500 shadow-inner"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="companyPhone" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            Teléfono / WhatsApp de Atención
                          </Label>
                          <Input
                            id="companyPhone"
                            value={companyPhone}
                            onChange={(e) => setCompanyPhone(e.target.value)}
                            placeholder="Ej: +57 300 123 4567"
                            className="rounded-xl h-11 bg-white/[0.04] border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-sm text-white placeholder:text-slate-500 shadow-inner"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep(1)}
                          className="rounded-xl h-12 px-5 text-xs font-semibold gap-2 border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-white cursor-pointer"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Atrás
                        </Button>

                        <button
                          type="submit"
                          className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm px-5 flex items-center justify-between shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
                        >
                          <span className="pl-1">Continuar a Operación</span>
                          <span className="h-8 w-8 rounded-xl bg-slate-950/15 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* ======================================================== */}
                {/* PASO 3: MOTOR OPERATIVO & SECTOR COMERCIAL                */}
                {/* ======================================================== */}
                {step === 3 && (
                  <div key="step-3" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-300">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-3 border border-emerald-500/20">
                        <Cpu className="h-3.5 w-3.5" />
                        Paso 3 de 3 &bull; Flujo Operativo & Sector
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                        Especialidad de tu Negocio
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                        Nova ERP adapta automáticamente sus módulos de venta, órdenes de servicio, inventario y garantías según tu sector.
                      </p>
                    </div>

                    <form onSubmit={handleCompleteRegistration} className="space-y-5">
                      {/* Grid de Sectores Comerciales con Micro-interacción Háptica */}
                      <div className="space-y-2.5">
                        <Label className="text-xs font-semibold text-slate-300">
                          Selecciona tu Sector Comercial Principal *
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {(Object.keys(SECTOR_INFO) as BusinessSector[]).map((secKey) => {
                            const info = SECTOR_INFO[secKey]
                            const Icon = SECTOR_ICONS[secKey] || Store
                            const isSelected = sector === secKey

                            return (
                              <button
                                key={secKey}
                                type="button"
                                onClick={() => setSector(secKey)}
                                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-1.5 cursor-pointer relative ${
                                  isSelected
                                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 shadow-md shadow-emerald-500/15 scale-[1.01]'
                                    : 'border-white/10 hover:border-emerald-500/40 bg-white/[0.02] hover:bg-white/[0.04]'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div
                                    className={`p-2 rounded-xl transition-colors ${
                                      isSelected
                                        ? 'bg-emerald-500 text-slate-950 font-bold'
                                        : 'bg-white/5 text-slate-400'
                                    }`}
                                  >
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-emerald-400">
                                    Margen ~{info.suggestedMargin}%
                                  </span>
                                </div>
                                <span className="font-bold text-xs text-white mt-1">{info.title}</span>
                                <span className="text-[11px] text-slate-400 line-clamp-1 leading-snug">
                                  {info.description}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="companyNit" className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            NIT o Identificación Tributaria
                          </Label>
                          <Input
                            id="companyNit"
                            value={companyNit}
                            onChange={(e) => setCompanyNit(e.target.value)}
                            placeholder="Ej: 900.123.456-7"
                            className="rounded-xl h-11 bg-white/[0.04] border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 font-mono text-sm text-white placeholder:text-slate-500 shadow-inner"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="currency" className="text-xs font-semibold text-slate-300">
                            Moneda de Operación
                          </Label>
                          <Select value={currency} onValueChange={(val) => setCurrency(val || 'COP')}>
                            <SelectTrigger id="currency" className="rounded-xl h-11 text-xs font-medium bg-white/[0.04] border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl bg-[#12161f] border-white/15 text-white">
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

                      <div className="flex items-center gap-3 pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={loading}
                          onClick={() => setStep(2)}
                          className="rounded-xl h-12 px-5 text-xs font-semibold gap-2 border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-white cursor-pointer"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Atrás
                        </Button>

                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-sm px-5 flex items-center justify-between shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition-all duration-200 cursor-pointer group disabled:opacity-50"
                        >
                          <span className="pl-1">
                            {loading ? 'Aprovisionando Empresa en la Nube...' : 'Crear Empresa y Entrar al ERP'}
                          </span>
                          <span className="h-8 w-8 rounded-xl bg-slate-950/15 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />}
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUMNA DERECHA: "Cockpit Digital Twin" & Confianza Total */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-5">
            {/* Tarjeta de Hardware: Vista Previa en Vivo del POS y Tenant */}
            <div className="p-1 sm:p-1.5 rounded-[2.2rem] bg-gradient-to-b from-white/12 via-white/[0.03] to-transparent border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
              <div className="rounded-[calc(2.2rem-0.375rem)] bg-[#0d1117]/90 backdrop-blur-2xl p-6 sm:p-7 space-y-5 relative">
                {/* Header del Mockup Digital Twin */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-bold">
                      Digital Twin &bull; POS en Vivo
                    </span>
                  </div>

                  <Badge variant="secondary" className="text-[10px] gap-1 font-semibold bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    <Sparkles className="h-3 w-3" />
                    Sincronización Activa
                  </Badge>
                </div>

                {/* Tarjeta Simulada de Ticket / Factura de Mostrador de Alta Fidelidad */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 shadow-sm relative">
                  {/* Encabezado del Recibo Comercial */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-slate-950 text-white flex items-center justify-center font-extrabold text-base ring-1 ring-white/15 shadow-sm overflow-hidden shrink-0">
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoUrl} alt="Logo Preview" className="h-full w-full object-cover" />
                        ) : (
                          companyName.trim().charAt(0).toUpperCase() || 'N'
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-extrabold text-sm sm:text-base text-white truncate tracking-tight">
                          {companyName.trim() || 'Nombre de tu Negocio'}
                        </h2>
                        <p className="text-[11px] text-emerald-400 truncate font-mono flex items-center gap-1">
                          <ActiveSectorIcon className="h-3 w-3 shrink-0" />
                          <span>{slogan.trim() || activeSectorInfo.title}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                        {currency}
                      </span>
                    </div>
                  </div>

                  {/* Detalle Fiscal Rápido */}
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-mono py-1 border-y border-white/5">
                    <span>NIT: {companyNit.trim() || '900.123.456-7'}</span>
                    <span>&bull;</span>
                    <span>Ciudad: {companyCity.trim() || 'Sede Principal'}</span>
                  </div>

                  {/* Simulación de Venta de Mostrador del Sector Seleccionado */}
                  <div className="space-y-2 py-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pb-1">
                      <span className="flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                        Ejemplo de Venta en Mostrador:
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">Ticket #0001</span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-white truncate">{sampleItem.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">SKU: {sampleItem.sku} &bull; 1 Unidad</p>
                        </div>
                        <span className="font-mono font-bold text-emerald-400 shrink-0">
                          $ {sampleItem.price.toLocaleString('es-CO')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] font-mono text-slate-400">
                        <span>Margen sugerido del sector ({activeSectorInfo.suggestedMargin}%):</span>
                        <span className="text-slate-300">
                          + $ {Math.round((sampleItem.price * activeSectorInfo.suggestedMargin) / 100).toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Términos & Garantía de Factura */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                    <span className="font-bold text-slate-300 text-[10px] uppercase tracking-wider block font-mono">
                      Garantía Preconfigurada en Facturas:
                    </span>
                    <p className="text-[11px] text-slate-400 italic line-clamp-2 leading-relaxed">
                      &ldquo;{activeSectorInfo.defaultFooter}&rdquo;
                    </p>
                  </div>
                </div>

                {/* 3 Pilares de Seguridad & Confianza Empresarial */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                    Garantías de la Plataforma Nova ERP:
                  </span>

                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <Database className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-bold text-white leading-tight">Base de Datos Aislada (Multi-Tenant)</p>
                        <p className="text-[11px] text-slate-400 leading-tight">Tu inventario, clientes y ventas viven en particiones seguras.</p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-bold text-white leading-tight">Sincronización en Tiempo Real</p>
                        <p className="text-[11px] text-slate-400 leading-tight">Mostrador POS, catálogo web y reportes sincronizados al instante.</p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-bold text-white leading-tight">Cifrado de Extremo a Extremo</p>
                        <p className="text-[11px] text-slate-400 leading-tight">Tus contraseñas y operaciones están protegidas con TLS 1.3 y AES-256.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sello de Confianza Final */}
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1 text-center">
                  <span>Podrás editar todos los parámetros en cualquier momento desde <strong>Configuración</strong>.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Minimalista de la Plataforma */}
        <div className="py-4 text-center text-xs text-slate-400">
          <p>Nova ERP &bull; Plataforma Empresarial Multi-Negocio &bull; Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  )
}
