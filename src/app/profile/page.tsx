'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  User,
  Mail,
  Calendar,
  Loader2,
  Shield,
  Sun,
  Moon,
  Laptop,
  Palette,
  Volume2,
  Bot,
  Bell,
  Check,
  Sparkles,
  Key,
  CheckCircle2,
  Lock,
  Smartphone,
  Briefcase,
  Layers,
  Keyboard,
  LogOut,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { getCurrentUser, updatePassword, updateUserProfile } from '@/modules/auth/auth.actions'
import { ChangePasswordSchema } from '@/lib/validations'
import {
  getUserPreferences,
  saveUserPreferences,
  playPosBeepSound,
  ACCENT_PALETTES,
  type ThemeMode,
  type AccentColor,
  type TableDensity,
  type DefaultModule,
  type UserPreferences,
} from '@/lib/user-preferences'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; name: string; createdAt?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // Datos personales del usuario
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [roleTitle, setRoleTitle] = useState('Administrador')
  const [savingProfile, setSavingProfile] = useState(false)

  // Preferencias de personalización
  const [prefs, setPrefs] = useState<UserPreferences>(() => getUserPreferences())

  // Formulario de seguridad
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Cargar usuario y preferencias iniciales
  useEffect(() => {
    async function load() {
      const result = await getCurrentUser()
      if (result) {
        setUser({
          email: result.email ?? '',
          name: result.name ?? '',
          createdAt: result.createdAt ? String(result.createdAt) : undefined,
        })
        setName(result.name ?? '')
      }

      const storedPrefs = getUserPreferences()
      setPrefs(storedPrefs)
      if (storedPrefs.phone) setPhone(storedPrefs.phone)
      if (storedPrefs.roleTitle) setRoleTitle(storedPrefs.roleTitle)

      setLoading(false)
    }
    load()
  }, [])

  // Actualizar una preferencia y aplicarla de inmediato
  function handleUpdatePref<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    const updated = saveUserPreferences({ [key]: value })
    setPrefs(updated)
    toast.success('Preferencia guardada')
  }

  // Guardar datos personales
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('El nombre no puede estar vacío')
      return
    }

    setSavingProfile(true)
    const result = await updateUserProfile({
      name: name.trim(),
      phone: phone.trim(),
      roleTitle: roleTitle.trim(),
    })
    setSavingProfile(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    // Persistir título y teléfono en preferencias locales
    saveUserPreferences({ roleTitle: roleTitle.trim(), phone: phone.trim() })
    if (user) {
      setUser({ ...user, name: name.trim() })
    }
    toast.success('Información personal actualizada')
  }

  // Actualizar contraseña con aislamiento de formulario
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()

    if (!newPassword) {
      toast.error('Ingresa una nueva contraseña')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las nuevas contraseñas no coinciden')
      return
    }

    const parsed = ChangePasswordSchema.safeParse({ password: newPassword })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Contraseña inválida (mínimo 6 caracteres)')
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

  function handleLogout() {
    router.push('/auth/logout')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Cargando perfil y preferencias...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground">
          No se pudo sincronizar la información del usuario actual. Por favor inicia sesión nuevamente.
        </p>
        <Button onClick={() => router.push('/login')} className="rounded-xl">
          Ir al Inicio de Sesión
        </Button>
      </div>
    )
  }

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'A'
  const currentAccent = ACCENT_PALETTES[prefs.accentColor] || ACCENT_PALETTES.emerald

  // Indicador de fortaleza de contraseña
  const passwordStrength =
    newPassword.length === 0
      ? 0
      : newPassword.length < 6
        ? 1
        : newPassword.length < 10
          ? 2
          : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)
            ? 4
            : 3

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* ======================================================== */}
      {/* HERO BANNER & TARJETA DE IDENTIDAD DEL USUARIO */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Avatar con anillo del color de acento elegido */}
            <div className="relative">
              <div
                className={`h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg transition-all duration-300 ring-4 ring-background ${currentAccent.avatarClass}`}
              >
                {userInitial}
              </div>
              <div
                className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 ring-2 ring-card flex items-center justify-center"
                title="Cuenta Activa"
              >
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>

            {/* Datos de cabecera */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{user.name}</h1>
                <Badge variant="outline" className={`text-xs font-semibold px-2 py-0.5 ${currentAccent.badgeClass}`}>
                  {roleTitle || 'Administrador'}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1 font-mono text-foreground/80">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {user.email}
                </span>
                <span className="hidden sm:inline-block text-border">•</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Email Verificado
                </span>
                {user.createdAt && (
                  <>
                    <span className="hidden sm:inline-block text-border">•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Registrado en {new Date(user.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="rounded-xl text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-border/80"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PESTAÑAS DE PERFIL & PERSONALIZACIÓN */}
      {/* ======================================================== */}
      <Tabs defaultValue="personalizacion" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 rounded-2xl border border-border/70 flex flex-wrap gap-1 w-full sm:w-auto h-auto">
          <TabsTrigger
            value="personalizacion"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-active:bg-background data-active:shadow-xs transition-all"
          >
            <Palette className="mr-2 h-4 w-4 text-primary" />
            Personalización & Apariencia
          </TabsTrigger>
          <TabsTrigger
            value="profile"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-active:bg-background data-active:shadow-xs transition-all"
          >
            <User className="mr-2 h-4 w-4 text-primary" />
            Datos Personales
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-active:bg-background data-active:shadow-xs transition-all"
          >
            <Shield className="mr-2 h-4 w-4 text-primary" />
            Seguridad & Contraseña
          </TabsTrigger>
          <TabsTrigger
            value="shortcuts"
            className="rounded-xl px-4 py-2 text-xs font-semibold data-active:bg-background data-active:shadow-xs transition-all"
          >
            <Keyboard className="mr-2 h-4 w-4 text-primary" />
            Atajos de Teclado
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* PESTAÑA 1: PERSONALIZACIÓN & APARIENCIA */}
        {/* ======================================================== */}
        <TabsContent value="personalizacion" className="space-y-6">
          {/* 1. Modo de Tema Visual */}
          <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sun className="h-4 w-4 text-primary" />
                Tema Visual del Sistema
              </CardTitle>
              <CardDescription className="text-xs">
                Elige cómo deseas visualizar Nova ERP en tu pantalla. Se aplica instantáneamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'light' as ThemeMode,
                    title: 'Modo Claro',
                    desc: 'Interfaz limpia con fondo blanco de alta legibilidad.',
                    icon: Sun,
                  },
                  {
                    id: 'dark' as ThemeMode,
                    title: 'Modo Oscuro',
                    desc: 'Tonos profundos que descansan la vista en jornadas nocturnas.',
                    icon: Moon,
                  },
                  {
                    id: 'system' as ThemeMode,
                    title: 'Automático (Sistema)',
                    desc: 'Se adapta a la configuración de tu sistema operativo.',
                    icon: Laptop,
                  },
                ].map((t) => {
                  const isSelected = prefs.theme === t.id
                  const Icon = t.icon
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleUpdatePref('theme', t.id)}
                      className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                          : 'border-border/70 hover:border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className={`p-2 rounded-xl ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <span className="font-semibold text-xs text-foreground">{t.title}</span>
                      <span className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{t.desc}</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 2. Color de Acento del Usuario / Avatar */}
          <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Color de Acento & Identidad de Usuario
              </CardTitle>
              <CardDescription className="text-xs">
                Personaliza el distintivo visual de tu avatar y detalles destacados en la barra superior.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {(Object.keys(ACCENT_PALETTES) as AccentColor[]).map((key) => {
                  const pal = ACCENT_PALETTES[key]
                  const isSelected = prefs.accentColor === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleUpdatePref('accentColor', key)}
                      className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-foreground/40 bg-muted/70 ring-2 ring-foreground/20 shadow-xs'
                          : 'border-border/70 hover:border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <div
                          className="h-7 w-7 rounded-xl shadow-xs flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: pal.hex }}
                        >
                          {isSelected ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : null}
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                            Activo
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-xs text-foreground">{pal.name}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {pal.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 3. Módulo Inicial al Iniciar Sesión & Densidad de Pantalla */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Módulo Inicial Predeterminado */}
            <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Página de Inicio Predeterminada
                </CardTitle>
                <CardDescription className="text-xs">
                  ¿A qué sección prefieres entrar automáticamente al iniciar sesión?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { id: '/dashboard' as DefaultModule, label: 'Dashboard Principal', desc: 'Métricas, pedidos pendientes y KPIs' },
                  { id: '/sales' as DefaultModule, label: 'Terminal POS (Ventas)', desc: 'Facturación rápida y cobro directo' },
                  { id: '/inventory' as DefaultModule, label: 'Inventario & Productos', desc: 'Control de existencias y catálogo' },
                  { id: '/web/orders' as DefaultModule, label: 'Tienda Online & Pedidos', desc: 'Gestión de órdenes web' },
                ].map((m) => {
                  const isSelected = prefs.defaultModule === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleUpdatePref('defaultModule', m.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-border/60 hover:bg-muted/40'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-foreground">{m.label}</div>
                        <div className="text-[11px] text-muted-foreground">{m.desc}</div>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                        }`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  )
                })}
              </CardContent>
            </Card>

            {/* Densidad de Pantalla */}
            <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Densidad Visual de Filas y Tablas
                </CardTitle>
                <CardDescription className="text-xs">
                  Ajusta la separación en inventario, ventas y listados para aprovechar tu pantalla.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    id: 'normal' as TableDensity,
                    title: 'Cómoda (Espaciado Normal)',
                    desc: 'Diseño relajado, con suficiente aire entre filas para lectura fácil.',
                  },
                  {
                    id: 'compact' as TableDensity,
                    title: 'Compacta (Alta Densidad)',
                    desc: 'Reduce márgenes para ver más productos y ventas sin hacer tanto scroll.',
                  },
                ].map((d) => {
                  const isSelected = prefs.tableDensity === d.id
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleUpdatePref('tableDensity', d.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-border/60 hover:bg-muted/40'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-foreground">{d.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{d.desc}</div>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                        }`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* 4. Asistente IA, Sonido POS & Alertas */}
          <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Herramientas, Sonido & Notificaciones
              </CardTitle>
              <CardDescription className="text-xs">
                Ajusta las ayudas interactivas y alertas auditivas durante la operación diaria.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/50">
              {/* Asistente IA Flotante */}
              <div className="flex items-center justify-between py-3.5">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-semibold flex items-center gap-2 text-foreground">
                    <Bot className="h-4 w-4 text-primary" />
                    Mostrar Asistente Virtual IA Flotante
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Mantiene visible el botón inteligente en la esquina inferior derecha para consultas rápidas.
                  </p>
                </div>
                <Switch
                  checked={prefs.showAiAssistant}
                  onCheckedChange={(checked) => handleUpdatePref('showAiAssistant', checked)}
                />
              </div>

              {/* Sonido de Caja en POS */}
              <div className="flex items-center justify-between py-3.5">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-semibold flex items-center gap-2 text-foreground">
                    <Volume2 className="h-4 w-4 text-primary" />
                    Sonido de Confirmación en Terminal POS
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Emite un agradable timbre sonoro cada vez que se registra exitosamente una venta.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={playPosBeepSound}
                    className="h-7 text-[11px] rounded-lg px-2 text-muted-foreground hover:text-foreground"
                    title="Probar sonido ahora"
                  >
                    Probar Sonido
                  </Button>
                  <Switch
                    checked={prefs.posSound}
                    onCheckedChange={(checked) => handleUpdatePref('posSound', checked)}
                  />
                </div>
              </div>

              {/* Alertas de Stock Crítico */}
              <div className="flex items-center justify-between py-3.5">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-semibold flex items-center gap-2 text-foreground">
                    <Bell className="h-4 w-4 text-amber-500" />
                    Alertas Visuales de Stock Crítico
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Destaca con insignias de advertencia cuando un producto esté por debajo del umbral mínimo.
                  </p>
                </div>
                <Switch
                  checked={prefs.stockAlerts}
                  onCheckedChange={(checked) => handleUpdatePref('stockAlerts', checked)}
                />
              </div>

              {/* Alertas de Pedidos Web */}
              <div className="flex items-center justify-between py-3.5">
                <div className="space-y-0.5 pr-4">
                  <div className="text-xs font-semibold flex items-center gap-2 text-foreground">
                    <Bell className="h-4 w-4 text-teal-500" />
                    Avisos de Nuevos Pedidos en Tienda Online
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Notifica en la campana de alertas cada vez que un cliente realice un nuevo pedido web.
                  </p>
                </div>
                <Switch
                  checked={prefs.webOrderAlerts}
                  onCheckedChange={(checked) => handleUpdatePref('webOrderAlerts', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* PESTAÑA 2: INFORMACIÓN & DATOS PERSONALES */}
        {/* ======================================================== */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 rounded-3xl border-border/70 bg-card shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Editar Información de Usuario
                </CardTitle>
                <CardDescription className="text-xs">
                  Actualiza tu nombre y datos operativos visibles en el sistema y facturas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-name" className="text-xs font-semibold">
                      Nombre Completo
                    </Label>
                    <Input
                      id="profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="rounded-xl"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-phone" className="text-xs font-semibold flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                        Teléfono / WhatsApp
                      </Label>
                      <Input
                        id="profile-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ej: +57 300 123 4567"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="profile-role-title" className="text-xs font-semibold flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        Cargo u Ocupación
                      </Label>
                      <Input
                        id="profile-role-title"
                        value={roleTitle}
                        onChange={(e) => setRoleTitle(e.target.value)}
                        placeholder="Ej: Administrador General, Gerente POS"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-email-readonly" className="text-xs font-semibold flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Correo Electrónico (Identificador de acceso)
                    </Label>
                    <Input
                      id="profile-email-readonly"
                      value={user.email}
                      disabled
                      className="rounded-xl bg-muted/60 text-muted-foreground cursor-not-allowed font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      El correo electrónico de inicio de sesión no puede ser modificado por seguridad de la cuenta.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={savingProfile} className="rounded-xl text-xs font-semibold">
                      {savingProfile ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5 mr-2" />
                          Guardar Cambios
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Privilegios del Rol */}
            <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Nivel de Privilegios
                </CardTitle>
                <CardDescription className="text-xs">
                  Permisos autorizados para tu rol de usuario.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-muted-foreground">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 shrink-0" />
                  Acceso Total (Administrador)
                </div>

                <ul className="space-y-2 pt-1 text-[11px] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Control total de facturación POS y cobros de crédito.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Gestión de inventario, ajustes de stock y precios de costo.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Gestión de clientes, directorio y límites de crédito.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Administración de catálogo web y pedidos en línea.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Exportación de datos de auditoría y reportes ejecutivos.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* PESTAÑA 3: SEGURIDAD & CONTRASEÑA */}
        {/* ======================================================== */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Formulario de Contraseña con Aislamiento Anti-Autofill */}
            <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Actualizar Contraseña
                </CardTitle>
                <CardDescription className="text-xs">
                  Cambia periódicamente tu contraseña para proteger los accesos al punto de venta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Formulario aislado con usuario oculto explícito para que el gestor de contraseñas no secuestre otros inputs */}
                <form onSubmit={handlePasswordChange} autoComplete="off" className="space-y-4">
                  {/* Anclaje estricto para gestores de contraseñas (Chrome, Bitwarden, 1Password) */}
                  <input
                    type="text"
                    name="username"
                    id="profile-security-username"
                    value={user.email}
                    autoComplete="username"
                    readOnly
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only pointer-events-none"
                  />

                  <div className="space-y-1.5">
                    <Label htmlFor="currentPasswordInput" className="text-xs font-semibold">
                      Contraseña Actual
                    </Label>
                    <Input
                      id="currentPasswordInput"
                      name="current-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newPasswordInput" className="text-xs font-semibold">
                      Nueva Contraseña
                    </Label>
                    <Input
                      id="newPasswordInput"
                      name="new-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="rounded-xl"
                    />
                    {/* Barra de fortaleza */}
                    {newPassword.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="flex gap-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              passwordStrength <= 1
                                ? 'w-1/4 bg-destructive'
                                : passwordStrength === 2
                                  ? 'w-2/4 bg-amber-500'
                                  : passwordStrength === 3
                                    ? 'w-3/4 bg-blue-500'
                                    : 'w-full bg-emerald-500'
                            }`}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {passwordStrength <= 1
                            ? 'Muy débil (mínimo 6 caracteres)'
                            : passwordStrength === 2
                              ? 'Aceptable'
                              : passwordStrength === 3
                                ? 'Buena contraseña'
                                : 'Excelente y segura'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPasswordInput" className="text-xs font-semibold">
                      Confirmar Nueva Contraseña
                    </Label>
                    <Input
                      id="confirmPasswordInput"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repite la nueva contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={passwordSaving} className="rounded-xl text-xs font-semibold">
                      {passwordSaving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                          Actualizando...
                        </>
                      ) : (
                        <>
                          <Key className="h-3.5 w-3.5 mr-2" />
                          Actualizar Contraseña
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Estado de Seguridad & Sesión */}
            <Card className="rounded-3xl border-border/70 bg-card shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    Sesión & Protocolos de Seguridad
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Información sobre la conexión actual y autenticación.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Estado de Autenticación:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Sesión Activa
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Cifrado de Transporte:</span>
                      <span className="font-mono text-[11px] text-foreground font-medium">TLS 1.3 / HTTPS</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Proveedor de Identidad:</span>
                      <span className="font-mono text-[11px] text-foreground font-medium">Supabase Auth SSR</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Si sospechas que otra persona conoce tu contraseña o perdiste acceso en un equipo compartido, cambia
                    tu clave inmediatamente y cierra tu sesión.
                  </p>
                </CardContent>
              </div>

              <div className="p-6 pt-0">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full rounded-xl text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-border/80"
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  Cerrar Sesión Segura
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* PESTAÑA 4: ATAJOS DE TECLADO */}
        {/* ======================================================== */}
        <TabsContent value="shortcuts" className="space-y-6">
          <Card className="rounded-3xl border-border/70 bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-primary" />
                Atajos de Teclado del Sistema
              </CardTitle>
              <CardDescription className="text-xs">
                Aumenta tu velocidad y productividad en el mostrador utilizando estos atajos globales.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { key: 'Alt + Q', action: 'Búsqueda Global', desc: 'Abre el buscador de productos, clientes y facturas.' },
                  { key: 'Alt + V', action: 'Terminal POS (Ventas)', desc: 'Navega inmediatamente a la caja registradora.' },
                  { key: 'Alt + I', action: 'Inventario', desc: 'Consulta existencias, precios y catálogo.' },
                  { key: 'Alt + C', action: 'Directorio de Clientes', desc: 'Gestiona cartera, contactos y créditos.' },
                  { key: 'Alt + P', action: 'Asistente IA', desc: 'Abre el chat inteligente para reportes ejecutivos.' },
                  { key: 'Esc', action: 'Cerrar Paneles', desc: 'Cierra modales emergentes y resultados de búsqueda.' },
                ].map((s) => (
                  <div key={s.key} className="p-3.5 rounded-2xl border border-border/60 bg-muted/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{s.action}</span>
                      <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground bg-card rounded-md border border-border/80 shadow-2xs">
                        {s.key}
                      </kbd>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
