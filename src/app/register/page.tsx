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
  Sparkles,
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  FileText,
  ShieldCheck,
  Eye,
  EyeOff,
  Receipt,
  TrendingUp,
  Package,
  HandCoins,
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

const SAMPLE_SECTOR_ITEMS: Record<BusinessSector, { name: string; sku: string; price: number; detail: string }> = {
  retail_general: {
    name: 'Artículo Comercial en Mostrador',
    sku: 'ART-0491',
    price: 65000,
    detail: 'Garantía legal directa &bull; 1 unidad',
  },
  technology_repair: {
    name: 'Módulo Display OLED Pro + Servicio',
    sku: 'TEC-0491',
    price: 280000,
    detail: 'Repuesto original &bull; Mano de obra certificada',
  },
  fashion_apparel: {
    name: 'Camisa Lino Premium Slim Fit',
    sku: 'MOD-0491',
    price: 110000,
    detail: 'Talla M &bull; Colección actual &bull; 1 unidad',
  },
  grocery_supermarket: {
    name: 'Canasta de Abarrotes & Víveres',
    sku: 'ABR-0491',
    price: 48000,
    detail: 'Lote fresco &bull; Código de barras validado',
  },
  hardware_construction: {
    name: 'Taladro Percutor 750W Industrial',
    sku: 'FER-0491',
    price: 195000,
    detail: 'Set de brocas &bull; Garantía 1 año',
  },
  pharmacy_health: {
    name: 'Complejo Vitamínico & Cuidado Esencial',
    sku: 'FAR-0491',
    price: 54000,
    detail: 'Registro INVIMA &bull; Control de lote',
  },
  services_workshop: {
    name: 'Mantenimiento Preventivo & Calibración',
    sku: 'SRV-0491',
    price: 150000,
    detail: 'Orden de servicio #0491 &bull; Informe técnico',
  },
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
  const sampleItem = SAMPLE_SECTOR_ITEMS[sector] || SAMPLE_SECTOR_ITEMS.retail_general
  const ActiveSectorIcon = SECTOR_ICONS[sector] || Store

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

      {/* Luces ambientales dinámicas flotantes con movimiento visible de un punto a otro (Glow verde esmeralda y cian) */}
      <div className="absolute -top-20 -left-20 w-[580px] h-[580px] rounded-full blur-[90px] pointer-events-none animate-ambient-glow-1 bg-gradient-to-tr from-emerald-500/40 via-emerald-400/25 to-teal-400/15 dark:from-emerald-500/30 dark:via-emerald-400/20 dark:to-teal-400/10" />
      <div className="absolute -bottom-24 -right-24 w-[620px] h-[620px] rounded-full blur-[100px] pointer-events-none animate-ambient-glow-2 bg-gradient-to-bl from-teal-500/40 via-emerald-500/25 to-emerald-600/15 dark:from-teal-400/25 dark:via-emerald-500/20 dark:to-emerald-600/10" />
      <div className="absolute top-1/4 left-1/3 w-[480px] h-[480px] rounded-full blur-[110px] pointer-events-none animate-ambient-wander bg-gradient-to-r from-emerald-400/35 via-teal-300/20 to-emerald-600/15 dark:from-emerald-400/25 dark:via-teal-400/15 dark:to-emerald-600/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full blur-[120px] pointer-events-none animate-ambient-shine bg-emerald-500/20 dark:bg-emerald-400/12" />

      {/* Contenedor Principal Flotante (Idéntica armonía que en el login) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 py-8 sm:px-8 lg:px-12 flex flex-col justify-between min-h-dvh lg:justify-center">
        {/* Header móvil */}
        <div className="flex lg:hidden items-center justify-between py-4 mb-4">
          <NovaLogo size="sm" />
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border/80 text-[11px] text-muted-foreground shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono">Paso {step} de 3</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-20 items-center my-auto w-full">
          {/* ======================================================== */}
          {/* LADO IZQUIERDO: Visuales ERP con Categorías Flotantes      */}
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
                  Aprovisionamiento en vivo
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

            {/* Tarjetas de demostración visual estilo SaaS (Categorías Flotantes Dinámicas) */}
            <div className="space-y-3.5 pt-1 w-full">
              {/* Tarjeta 1 Flotante: Venta POS Adaptativa según tu Sector y Nombre */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs transition-all hover:shadow-md hover:scale-[1.01] duration-300">
                <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-foreground font-bold">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Logo" className="h-full w-full object-cover rounded-xl" />
                      ) : (
                        <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {companyName.trim() || 'Venta Mostrador #04910'}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
                        <ActiveSectorIcon className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{slogan.trim() || activeSectorInfo.title}</span>
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" /> En Vivo
                  </span>
                </div>

                <div className="py-2.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-foreground">
                    <span className="font-medium truncate max-w-[280px]">{sampleItem.name}</span>
                    <span className="font-mono font-bold">$ {sampleItem.price.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span dangerouslySetInnerHTML={{ __html: sampleItem.detail }} />
                    <span className="font-mono">Margen: +{activeSectorInfo.suggestedMargin}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                  <span className="text-muted-foreground">Total Recibido ({currency})</span>
                  <span className="font-mono font-extrabold text-foreground">
                    $ {sampleItem.price.toLocaleString('es-CO')} {currency}
                  </span>
                </div>
              </div>

              {/* Fila de 3 Micro-Tarjetas Flotantes */}
              <div className="grid grid-cols-3 gap-3 w-full">
                <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs hover:shadow-md hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-4 w-4 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Ventas Hoy
                    </span>
                  </div>
                  <div className="text-sm font-extrabold font-mono text-foreground mt-1.5">$18.450.000</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">+12.4% vs ayer</div>
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs hover:shadow-md hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <Package className="h-4 w-4 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Catálogo
                    </span>
                  </div>
                  <div className="text-sm font-extrabold font-mono text-foreground mt-1.5">100% Sincronizado</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Tienda física y web</div>
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs hover:shadow-md hover:scale-[1.02] transition-all duration-300">
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
          {/* LADO DERECHO: Tarjeta Flotante de Registro (SaaS Card)    */}
          {/* ======================================================== */}
          <div className="w-full lg:col-span-5 flex justify-center lg:justify-end ml-auto">
            <div className="w-full max-w-[440px] sm:max-w-[460px] p-7 sm:p-9 rounded-3xl bg-card border border-border/80 shadow-xl transition-all">
              {/* Stepper Sutil Integrado en la Tarjeta */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/60">
                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>Paso {step} de 3</span>
                    <span>&bull;</span>
                    <span className="font-sans font-bold">
                      {step === 1 && 'Cuenta Administrador'}
                      {step === 2 && 'Identidad & Marca'}
                      {step === 3 && 'Sector Comercial'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {step === 1 && 'Crea tu Cuenta'}
                    {step === 2 && 'Datos de tu Empresa'}
                    {step === 3 && 'Operación & Sector'}
                  </h2>
                </div>

                {/* Micro-puntos de progreso */}
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        if (s < step) setStep(s as 1 | 2 | 3)
                      }}
                      disabled={s > step}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        s === step
                          ? 'w-6 bg-emerald-500'
                          : s < step
                            ? 'w-2 bg-emerald-500/50 cursor-pointer'
                            : 'w-2 bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* ======================================================== */}
              {/* PASO 1: CUENTA DE ADMINISTRADOR                          */}
              {/* ======================================================== */}
              {step === 1 && (
                <form onSubmit={handleNextStep} className="space-y-4 animate-in fade-in-50 duration-200">
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerName" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Nombre Completo *
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
                    <Label htmlFor="email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Correo Electrónico *
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        Contraseña *
                      </Label>
                      {password && (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {passwordStrength === 1 && 'Seguridad: Básica'}
                          {passwordStrength === 2 && 'Seguridad: Buena'}
                          {passwordStrength === 3 && 'Seguridad: Alta'}
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

                    {/* Barra de progreso de seguridad */}
                    {password && (
                      <div className="grid grid-cols-3 gap-1 pt-0.5 h-1">
                        <div className={`rounded-full transition-all ${passwordStrength >= 1 ? 'bg-amber-400' : 'bg-muted'}`} />
                        <div className={`rounded-full transition-all ${passwordStrength >= 2 ? 'bg-emerald-400' : 'bg-muted'}`} />
                        <div className={`rounded-full transition-all ${passwordStrength >= 3 ? 'bg-emerald-500' : 'bg-muted'}`} />
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full h-10 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md active:scale-[0.98] transition-all cursor-pointer gap-2"
                    >
                      <span>Continuar a Datos de la Empresa</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}

              {/* ======================================================== */}
              {/* PASO 2: IDENTIDAD & MARCA                                */}
              {/* ======================================================== */}
              {step === 2 && (
                <form onSubmit={handleNextStep} className="space-y-4 animate-in fade-in-50 duration-200">
                  {/* Uploader de Logotipo */}
                  <div className="p-3 rounded-2xl bg-muted/30 border border-border/70 flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-card border border-border/80 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/10 shadow-2xs">
                      {logoLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                      ) : logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6 text-muted-foreground/60" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-emerald-500" />
                          Logotipo
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">Max 4MB</span>
                      </div>
                      <div className="flex items-center gap-2">
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
                          className="rounded-lg h-7 px-2.5 text-[11px] font-semibold gap-1 border-border/80 bg-card hover:bg-muted text-foreground cursor-pointer"
                        >
                          <Upload className="h-3 w-3 text-emerald-500" />
                          {logoUrl ? 'Cambiar' : 'Subir'}
                        </Button>
                        {logoUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setLogoUrl(null)}
                            className="rounded-lg h-7 px-2 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Nombre del Negocio / Razón Social *
                    </Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ej: Cilmax Tecnología & Repuestos"
                      className="rounded-xl h-10 bg-muted/40 border-border/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs shadow-2xs"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="slogan" className="text-xs font-semibold text-foreground">
                      Lema Comercial (Opcional)
                    </Label>
                    <Input
                      id="slogan"
                      value={slogan}
                      onChange={(e) => setSlogan(e.target.value)}
                      placeholder="Ej: Calidad, respaldo y servicio experto"
                      className="rounded-xl h-10 bg-muted/40 border-border/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs shadow-2xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="companyCity" className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        Ciudad
                      </Label>
                      <Input
                        id="companyCity"
                        value={companyCity}
                        onChange={(e) => setCompanyCity(e.target.value)}
                        placeholder="Ej: Cali"
                        className="rounded-xl h-10 bg-muted/40 border-border/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="companyPhone" className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        Teléfono
                      </Label>
                      <Input
                        id="companyPhone"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        placeholder="300 123 4567"
                        className="rounded-xl h-10 bg-muted/40 border-border/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="h-10 px-3.5 rounded-xl border-border/80 text-xs font-semibold cursor-pointer gap-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Atrás
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-10 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md active:scale-[0.98] transition-all cursor-pointer gap-2"
                    >
                      <span>Continuar a Especialidad</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}

              {/* ======================================================== */}
              {/* PASO 3: SECTOR COMERCIAL & OPERACIÓN                     */}
              {/* ======================================================== */}
              {step === 3 && (
                <form onSubmit={handleCompleteRegistration} className="space-y-4 animate-in fade-in-50 duration-200">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Selecciona tu Sector Comercial *
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {(Object.keys(SECTOR_INFO) as BusinessSector[]).map((secKey) => {
                        const info = SECTOR_INFO[secKey]
                        const Icon = SECTOR_ICONS[secKey] || Store
                        const isSelected = sector === secKey

                        return (
                          <button
                            key={secKey}
                            type="button"
                            onClick={() => setSector(secKey)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40 text-foreground scale-[1.01]'
                                : 'border-border/80 hover:border-emerald-500/40 bg-card text-muted-foreground'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className={`p-1 rounded-md ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-muted text-muted-foreground'}`}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                ~{info.suggestedMargin}%
                              </span>
                            </div>
                            <span className="font-bold text-xs text-foreground block truncate">{info.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="companyNit" className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        NIT / RUT
                      </Label>
                      <Input
                        id="companyNit"
                        value={companyNit}
                        onChange={(e) => setCompanyNit(e.target.value)}
                        placeholder="900.123.456-7"
                        className="rounded-xl h-10 bg-muted/40 border-border/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs shadow-2xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="currency" className="text-xs font-semibold text-foreground">
                        Moneda
                      </Label>
                      <Select value={currency} onValueChange={(val) => setCurrency(val || 'COP')}>
                        <SelectTrigger id="currency" className="rounded-xl h-10 text-xs bg-muted/40 border-border/80">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="COP">COP ($)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="MXN">MXN ($)</SelectItem>
                          <SelectItem value="PEN">PEN (S/)</SelectItem>
                          <SelectItem value="CLP">CLP ($)</SelectItem>
                          <SelectItem value="ARS">ARS ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => setStep(2)}
                      className="h-10 px-3.5 rounded-xl border-border/80 text-xs font-semibold cursor-pointer gap-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Atrás
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-10 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md active:scale-[0.98] transition-all cursor-pointer gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Configurando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Crear Empresa y Entrar</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* Nota de Seguridad & Acceso */}
              <div className="pt-4 mt-4 border-t border-border/60 text-center space-y-2">
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Acceso seguro y cifrado de extremo a extremo
                </p>

                <div>
                  <p className="text-[11px] text-muted-foreground">
                    ¿Ya tienes cuenta para tu negocio?
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary transition-colors underline underline-offset-4 cursor-pointer mt-0.5"
                  >
                    Iniciar Sesión con mi cuenta &rarr;
                  </Link>
                </div>
              </div>
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
