'use client'

import { useState, useRef } from 'react'
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
        toast.success('Logo cargado y optimizado correctamente')
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

  return (
    <div className="relative min-h-dvh w-full flex items-center justify-center bg-[#f4f5f7] dark:bg-background text-foreground overflow-hidden font-sans selection:bg-emerald-500/20 py-8 px-4 sm:px-6 lg:px-8">
      {/* Trama sutil de micropuntos de precisión */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Luces ambientales dinámicas flotantes con movimiento orgánico (Luz verde/esmeralda móvil) */}
      <div className="absolute -top-32 -left-32 w-[540px] h-[540px] bg-emerald-500/20 dark:bg-emerald-500/15 rounded-full blur-[130px] pointer-events-none animate-ambient-glow-1" />
      <div className="absolute -bottom-36 -right-36 w-[580px] h-[580px] bg-teal-500/20 dark:bg-emerald-400/12 rounded-full blur-[140px] pointer-events-none animate-ambient-glow-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] bg-emerald-600/10 rounded-full blur-[160px] pointer-events-none animate-ambient-shine" />

      {/* Contenedor Principal (Sin Header superior rígido) */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col gap-6">
        {/* Barra Integrada Flotante de Marca y Enlace a Login */}
        <div className="flex items-center justify-between px-2 sm:px-1">
          <NovaLogo size="md" subtitle="Alta y Configuración de Negocio" />

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-card/80 border border-border/80 hover:border-emerald-500/50 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 shadow-2xs backdrop-blur-md cursor-pointer group"
          >
            <span>¿Ya tienes cuenta?</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center">
              Iniciar Sesión &rarr;
            </span>
          </Link>
        </div>

        {/* Grid de 2 Columnas: Formulario Guiado + Vista Previa en Vivo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ======================================================== */}
          {/* COLUMNA IZQUIERDA: Formulario Guiado con Transiciones     */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 space-y-6">
            {/* Stepper / Indicador de Pasos Dinámico */}
            <div className="p-3.5 rounded-2xl bg-card/70 border border-border/70 backdrop-blur-md shadow-xs">
              <div className="flex items-center justify-between relative">
                {/* Línea conectora base */}
                <div className="absolute top-4 left-6 right-6 h-0.5 bg-border/60 -z-0" />
                {/* Línea conectora activa con gradiente esmeralda */}
                <div
                  className="absolute top-4 left-6 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out -z-0"
                  style={{
                    width: step === 1 ? '0%' : step === 2 ? '50%' : 'calc(100% - 3rem)',
                  }}
                />

                {[
                  { s: 1, title: 'Cuenta', subtitle: 'Propietario' },
                  { s: 2, title: 'Identidad', subtitle: 'Marca & Logo' },
                  { s: 3, title: 'Operación', subtitle: 'Sector Comercial' },
                ].map((item) => {
                  const isCompleted = step > item.s
                  const isCurrent = step === item.s

                  return (
                    <button
                      key={item.s}
                      type="button"
                      onClick={() => {
                        // Permitir navegar a pasos previos completados
                        if (item.s < step) setStep(item.s as 1 | 2 | 3)
                      }}
                      disabled={item.s > step}
                      className={`relative z-10 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                        item.s > step ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-105'
                            : isCurrent
                              ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/30 scale-110'
                              : 'bg-muted text-muted-foreground border border-border/80'
                        }`}
                      >
                        {isCompleted ? <Check className="h-4 w-4 stroke-[2.5]" /> : item.s}
                      </div>
                      <div className="flex flex-col items-center">
                        <span
                          className={`text-xs font-bold tracking-tight leading-tight ${
                            isCurrent
                              ? 'text-foreground font-extrabold'
                              : isCompleted
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground hidden sm:block">
                          {item.subtitle}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Contenedor de Formulario con Glassmorphism y Borde Superior Esmeralda */}
            <div className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-2xl shadow-xl p-6 sm:p-8 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

              {/* PASO 1: CUENTA DE ADMINISTRADOR */}
              {step === 1 && (
                <div key="step-1" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-300">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold mb-2">
                      <User className="h-3 w-3" />
                      Paso 1 de 3
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                      Crea tu cuenta de Administrador
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estos datos te identificarán como el propietario y administrador principal del ERP.
                    </p>
                  </div>

                  <form onSubmit={handleNextStep} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ownerName" className="text-xs font-semibold flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        Tu Nombre Completo *
                      </Label>
                      <Input
                        id="ownerName"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Ej: Carlos Mendoza"
                        className="rounded-xl h-10 bg-muted/40 border-border/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs shadow-2xs"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        Correo Electrónico de Acceso *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@tuempresa.com"
                        className="rounded-xl h-10 bg-muted/40 border-border/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs shadow-2xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-xs font-semibold flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        Contraseña de Seguridad *
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="rounded-xl h-10 pr-10 bg-muted/40 border-border/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs shadow-2xs"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          tabIndex={-1}
                          title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full h-10 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all duration-200 cursor-pointer gap-2"
                      >
                        Continuar a Datos de la Empresa
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* PASO 2: IDENTIDAD & MARCA */}
              {step === 2 && (
                <div key="step-2" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-300">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold mb-2">
                      <Sparkles className="h-3 w-3" />
                      Paso 2 de 3
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                      Identidad & Marca de tu Empresa
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                      Personaliza el nombre, logotipo y presentación comercial de tu negocio en Nova ERP.
                    </p>
                  </div>

                  <form onSubmit={handleNextStep} className="space-y-5">
                    {/* Zona Interactiva de Subida de Logo */}
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                          Logotipo de tu Negocio (Opcional)
                        </Label>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Auto-optimizado WebP &bull; Max 4MB
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-card border border-border/80 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/10 shadow-sm relative group">
                          {logoLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                          ) : logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoUrl} alt="Logo de la empresa" className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-7 w-7 text-muted-foreground/60" />
                          )}
                        </div>

                        <div className="space-y-1.5 flex-1 w-full text-center sm:text-left">
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <div className="flex items-center justify-center sm:justify-start gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-xs gap-1.5 border-border/80 hover:bg-muted font-semibold cursor-pointer"
                              onClick={() => logoInputRef.current?.click()}
                            >
                              <Upload className="h-3.5 w-3.5 text-emerald-500" />
                              {logoUrl ? 'Cambiar Logotipo' : 'Subir Logotipo'}
                            </Button>
                            {logoUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-xl text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                                onClick={() => setLogoUrl(null)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Quitar
                              </Button>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Aparecerá en el encabezado, POS y facturas impresas.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="companyName" className="text-xs font-semibold flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Nombre Comercial o Razón Social *
                      </Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ej: Distribuidora Central, Boutique Nova, etc."
                        className="rounded-xl h-10 bg-muted/40 border-border/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs shadow-2xs font-semibold"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="slogan" className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                        Slogan o Lema Comercial (Opcional)
                      </Label>
                      <Input
                        id="slogan"
                        value={slogan}
                        onChange={(e) => setSlogan(e.target.value)}
                        placeholder="Ej: Calidad y servicio que marcan la diferencia"
                        className="rounded-xl h-10 bg-muted/40 border-border/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs shadow-2xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="companyPhone" className="text-xs font-semibold flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          Teléfono / WhatsApp
                        </Label>
                        <Input
                          id="companyPhone"
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          placeholder="+57 300 000 0000"
                          className="rounded-xl h-10 bg-muted/40 border-border/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs shadow-2xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="companyCity" className="text-xs font-semibold flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          Ciudad / Municipio
                        </Label>
                        <Input
                          id="companyCity"
                          value={companyCity}
                          onChange={(e) => setCompanyCity(e.target.value)}
                          placeholder="Ej: Bogotá, Medellín, Cali"
                          className="rounded-xl h-10 bg-muted/40 border-border/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="rounded-xl h-10 px-4 text-xs font-semibold gap-1.5 border-border/80 hover:bg-muted cursor-pointer"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Atrás
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-10 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all duration-200 cursor-pointer gap-2"
                      >
                        Siguiente: Sector & Operación
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* PASO 3: SECTOR COMERCIAL & OPERACIÓN */}
              {step === 3 && (
                <div key="step-3" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-300">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold mb-2">
                      <Store className="h-3 w-3" />
                      Paso 3 de 3
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                      Sector Comercial & Parámetros Operativos
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                      Elige el rubro de tu empresa para aplicar políticas de inventario, garantías y flujos recomendados.
                    </p>
                  </div>

                  <form onSubmit={handleCompleteRegistration} className="space-y-5">
                    {/* Grid de Sectores Dinámicos con Efecto Hover y Glow */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground">
                        Selecciona el Giro o Industria de tu Negocio *
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {(Object.keys(SECTOR_INFO) as BusinessSector[]).map((sectorKey) => {
                          const info = SECTOR_INFO[sectorKey]
                          const Icon = SECTOR_ICONS[sectorKey] || Store
                          const isSelected = sector === sectorKey

                          return (
                            <button
                              key={sectorKey}
                              type="button"
                              onClick={() => setSector(sectorKey)}
                              className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-1.5 cursor-pointer relative ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 shadow-md shadow-emerald-500/10 scale-[1.01]'
                                  : 'border-border/70 hover:border-emerald-500/50 hover:bg-muted/40 hover:scale-[1.01]'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div
                                  className={`p-2 rounded-xl transition-colors ${
                                    isSelected
                                      ? 'bg-emerald-500 text-slate-950 font-bold'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  <Icon className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-card border border-border/80 text-muted-foreground">
                                  Margen ~{info.suggestedMargin}%
                                </span>
                              </div>
                              <span className="font-bold text-xs text-foreground mt-1">{info.title}</span>
                              <span className="text-[11px] text-muted-foreground line-clamp-1 leading-snug">
                                {info.description}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="companyNit" className="text-xs font-semibold flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          NIT / Identificación Fiscal
                        </Label>
                        <Input
                          id="companyNit"
                          value={companyNit}
                          onChange={(e) => setCompanyNit(e.target.value)}
                          placeholder="Ej: 900.123.456-7"
                          className="rounded-xl h-10 bg-muted/40 border-border/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono text-xs shadow-2xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="currency" className="text-xs font-semibold">
                          Moneda Principal de Operación
                        </Label>
                        <Select value={currency} onValueChange={(val) => setCurrency(val || 'COP')}>
                          <SelectTrigger id="currency" className="rounded-xl h-10 text-xs font-medium bg-muted/40 border-border/80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
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

                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => setStep(2)}
                        className="rounded-xl h-10 px-4 text-xs font-semibold gap-1.5 border-border/80 hover:bg-muted cursor-pointer"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Atrás
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 h-10 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Configurando tu Empresa...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Crear Empresa y Entrar al ERP
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUMNA DERECHA: Vista Previa en Vivo (Tarjeta Premium)   */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl border border-white/10 dark:border-white/5 bg-gradient-to-br from-card/95 via-card/80 to-card/60 p-6 sm:p-7 shadow-2xl backdrop-blur-2xl space-y-5 relative overflow-hidden">
              {/* Reflejo metálico sutil */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Vista Previa en Vivo
                </span>
                <Badge variant="secondary" className="text-[10px] gap-1 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <Sparkles className="h-3 w-3" />
                  Personalización Activa
                </Badge>
              </div>

              {/* Tarjeta de Identidad de Marca */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3.5 shadow-2xs backdrop-blur-sm">
                <div className="flex items-center gap-3.5">
                  <div className="h-14 w-14 rounded-2xl bg-gray-950 text-white flex items-center justify-center font-bold text-lg ring-1 ring-white/15 shadow-sm overflow-hidden shrink-0">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo Preview" className="h-full w-full object-cover" />
                    ) : (
                      companyName.trim().charAt(0).toUpperCase() || 'N'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-extrabold text-sm sm:text-base text-foreground truncate tracking-tight">
                      {companyName.trim() || 'Nombre de tu Negocio'}
                    </h2>
                    <p className="text-[11px] text-muted-foreground truncate font-medium">
                      {slogan.trim() || activeSectorInfo.title}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ActiveSectorIcon className="h-3 w-3" />
                    {activeSectorInfo.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border/60">
                    Moneda: {currency}
                  </span>
                  {companyNit.trim() && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border/60">
                      NIT: {companyNit.trim()}
                    </span>
                  )}
                </div>
              </div>

              {/* Políticas Preconfiguradas según el Sector */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-foreground text-[11px] uppercase tracking-wider block">
                  Flujo de Trabajo Sugerido:
                </span>
                <div className="space-y-2 text-muted-foreground text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 stroke-[2.5]" />
                    </div>
                    <span>Margen de ganancia sugerido en catálogo: <strong>{activeSectorInfo.suggestedMargin}%</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 stroke-[2.5]" />
                    </div>
                    <span>Facturación de mostrador y POS habilitado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 stroke-[2.5]" />
                    </div>
                    <span>Sincronización multi-dispositivo en tiempo real</span>
                  </div>
                </div>
              </div>

              {/* Pie de Garantía Preconfigurado */}
              <div className="p-3.5 rounded-2xl bg-card border border-border/70 text-[10px] text-muted-foreground space-y-1 shadow-2xs">
                <span className="font-bold text-foreground text-[9px] uppercase tracking-wider block">
                  Términos & Garantía en Factura:
                </span>
                <p className="line-clamp-3 italic leading-relaxed text-muted-foreground/90">
                  &ldquo;{activeSectorInfo.defaultFooter}&rdquo;
                </p>
              </div>

              <div className="text-[11px] text-muted-foreground/80 flex items-center gap-2 pt-1 border-t border-border/50">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Podrás ajustar todas las políticas y datos en cualquier momento desde Configuración.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Minimalista */}
        <div className="py-4 text-center text-[11px] text-muted-foreground/70">
          <p>Nova ERP &bull; Plataforma Empresarial Multi-Negocio &bull; Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  )
}
