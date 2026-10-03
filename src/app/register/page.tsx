'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClientSupabase } from '@/lib/supabase'
import { registerCompanyAndOwnerAction } from '@/modules/auth/auth.actions'
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
        toast.success('Logo cargado correctamente')
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
        toast.success('Empresa registrada. Por favor inicia sesión.')
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
    <div className="min-h-dvh w-full bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
      {/* Barra superior de marca */}
      <header className="w-full border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gray-950 text-white flex items-center justify-center font-bold text-xs ring-1 ring-white/10 shadow-xs">
            N
          </div>
          <span className="font-extrabold text-sm tracking-tight">Nova ERP</span>
          <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider ml-1">
            Registro de Empresa
          </Badge>
        </div>

        <Link
          href="/login"
          className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          ¿Ya tienes cuenta? <span className="text-primary font-semibold">Iniciar Sesión</span>
        </Link>
      </header>

      {/* Contenedor Principal */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Formulario Guiado por Pasos */}
          <div className="lg:col-span-7 space-y-6">
            {/* Indicador de Pasos */}
            <div className="flex items-center gap-2">
              {[
                { s: 1, title: 'Tu Cuenta' },
                { s: 2, title: 'Identidad & Marca' },
                { s: 3, title: 'Sector & Operación' },
              ].map((item) => (
                <div key={item.s} className="flex-1">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      step >= item.s ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                  <div className="mt-1.5 text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <span className={step >= item.s ? 'text-foreground font-bold' : ''}>Paso {item.s}:</span>
                    <span className="truncate">{item.title}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Paso 1: Cuenta y Propietario */}
            {step === 1 && (
              <Card className="rounded-3xl border-border/70 shadow-sm">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                      Crea tu cuenta de Administrador
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estos datos te identificarán como el propietario de la cuenta y administrador del ERP.
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
                        className="rounded-xl"
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@tuempresa.com"
                        className="rounded-xl"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-xs font-semibold flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        Contraseña Segura *
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="rounded-xl"
                        required
                        minLength={6}
                      />
                    </div>

                    <Button type="submit" className="w-full rounded-xl gap-2 font-semibold">
                      Continuar a Datos de la Empresa
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Paso 2: Identidad & Marca */}
            {step === 2 && (
              <Card className="rounded-3xl border-border/70 shadow-sm">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                      Identidad & Marca de tu Empresa
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                      Personaliza el nombre, logo y presentación comercial de tu negocio en Nova ERP.
                    </p>
                  </div>

                  <form onSubmit={handleNextStep} className="space-y-5">
                    {/* Subida de Logo */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                        Logo o Isotipo del Negocio (Opcional)
                      </Label>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl border border-border/80 bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-border/50">
                          {logoLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-6 w-6 text-muted-foreground/60" />
                          )}
                        </div>

                        <div className="space-y-1.5 flex-1">
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-xs gap-1.5"
                              onClick={() => logoInputRef.current?.click()}
                            >
                              <Upload className="h-3.5 w-3.5" />
                              {logoUrl ? 'Cambiar Logo' : 'Subir Imagen'}
                            </Button>
                            {logoUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-xl text-xs text-destructive hover:text-destructive"
                                onClick={() => setLogoUrl(null)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Quitar
                              </Button>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            JPG, PNG o WebP hasta 4 MB. Se optimiza automáticamente.
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
                        placeholder="Ej: TecnoSoluciones, Boutique Nova, etc."
                        className="rounded-xl font-medium"
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
                        className="rounded-xl"
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
                          className="rounded-xl"
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
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="rounded-xl gap-1.5"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Atrás
                      </Button>
                      <Button type="submit" className="flex-1 rounded-xl gap-2 font-semibold">
                        Siguiente: Sector de tu Negocio
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Paso 3: Sector Comercial & Operación */}
            {step === 3 && (
              <Card className="rounded-3xl border-border/70 shadow-sm">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                      Sector Comercial & Parámetros Operativos
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                      Elige el rubro de tu empresa para aplicar políticas de inventario, garantías y flujos recomendados.
                    </p>
                  </div>

                  <form onSubmit={handleCompleteRegistration} className="space-y-5">
                    {/* Grid de Sectores */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Selecciona la Categoría de tu Negocio *</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                        {(Object.keys(SECTOR_INFO) as BusinessSector[]).map((sectorKey) => {
                          const info = SECTOR_INFO[sectorKey]
                          const Icon = SECTOR_ICONS[sectorKey] || Store
                          const isSelected = sector === sectorKey

                          return (
                            <button
                              key={sectorKey}
                              type="button"
                              onClick={() => setSector(sectorKey)}
                              className={`p-3 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between gap-1.5 ${
                                isSelected
                                  ? 'border-primary bg-primary/10 ring-1 ring-primary/40 shadow-xs'
                                  : 'border-border/60 hover:border-border hover:bg-muted/40'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div
                                  className={`p-1.5 rounded-xl ${
                                    isSelected
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  <Icon className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                                  Margen ~{info.suggestedMargin}%
                                </span>
                              </div>
                              <span className="font-semibold text-xs text-foreground mt-1">{info.title}</span>
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
                          NIT / Identificación Tributaria
                        </Label>
                        <Input
                          id="companyNit"
                          value={companyNit}
                          onChange={(e) => setCompanyNit(e.target.value)}
                          placeholder="Ej: 900.123.456-7"
                          className="rounded-xl font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="currency" className="text-xs font-semibold">
                          Moneda Principal
                        </Label>
                        <Select value={currency} onValueChange={(val) => setCurrency(val || 'COP')}>
                          <SelectTrigger id="currency" className="rounded-xl text-xs font-medium">
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
                        className="rounded-xl gap-1.5"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Atrás
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 rounded-xl gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
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
                </CardContent>
              </Card>
            )}
          </div>

          {/* Columna Derecha: Vista Previa en Vivo de tu Negocio */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl border border-border/80 bg-card/60 p-6 shadow-xs backdrop-blur-sm space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  Vista Previa en Vivo
                </span>
                <Badge variant="secondary" className="text-[10px] gap-1 font-medium">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Personalización Activa
                </Badge>
              </div>

              {/* Tarjeta de Identidad de Marca */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gray-950 text-white flex items-center justify-center font-bold text-base ring-1 ring-white/10 shadow-xs overflow-hidden shrink-0">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo Preview" className="h-full w-full object-cover" />
                    ) : (
                      companyName.trim().charAt(0).toUpperCase() || 'N'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-extrabold text-sm text-foreground truncate">
                      {companyName.trim() || 'Nombre de tu Negocio'}
                    </h2>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {slogan.trim() || activeSectorInfo.title}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                    <ActiveSectorIcon className="h-3 w-3" />
                    {activeSectorInfo.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                    Moneda: {currency}
                  </span>
                  {companyNit.trim() && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      NIT: {companyNit.trim()}
                    </span>
                  )}
                </div>
              </div>

              {/* Políticas Preconfiguradas según el Sector */}
              <div className="space-y-2 text-xs">
                <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
                  Flujo de Trabajo Sugerido:
                </span>
                <div className="space-y-1.5 text-muted-foreground text-[11px]">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Margen de ganancia sugerido en catálogo: <strong>{activeSectorInfo.suggestedMargin}%</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Facturación de mostrador y POS habilitado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Sincronización multi-dispositivo en tiempo real</span>
                  </div>
                </div>
              </div>

              {/* Pie de Garantía Preconfigurado */}
              <div className="p-3 rounded-xl bg-background/80 border border-border/60 text-[10px] text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground text-[9px] uppercase tracking-wider block">
                  Términos & Garantía en Factura:
                </span>
                <p className="line-clamp-3 italic leading-relaxed">
                  &ldquo;{activeSectorInfo.defaultFooter}&rdquo;
                </p>
              </div>

              <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5 pt-1">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Podrás ajustar todas las políticas y datos en cualquier momento desde Configuración.</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 px-6 py-4 text-center text-xs text-muted-foreground">
        Nova ERP &bull; Plataforma Empresarial Multi-Negocio &bull; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
