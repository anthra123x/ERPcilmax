'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  ArrowLeft,
  Loader2,
  UserPlus,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import { getProducts } from '@/modules/inventory/inventory.actions'
import { createSale } from '@/modules/sales/sales.actions'
import { searchClients, createClient } from '@/modules/clients/clients.actions'

interface ClientSuggestion {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
}

interface CartItem {
  productId: string
  name: string
  unitPrice: number
  stock: number
  quantity: number
}

interface ProductOption {
  id: string
  name: string
  barcode: string | null
  imageUrl: string | null
  salePrice: number
  stock: number
  category: { name: string } | null
}

export default function NewCreditSalePage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [initialPayment, setInitialPayment] = useState(0)
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH')
  const [dueDate, setDueDate] = useState('')
  const [useInstallments, setUseInstallments] = useState(false)
  const [installments, setInstallments] = useState<Array<{ amount: number; dueDate: string }>>([])
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([])
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const clientRef = useRef<HTMLDivElement>(null)
  const searchClientDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const searchProductDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const initialLoadDone = useRef(false)

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      return
    }
    if (searchProductDebounce.current) clearTimeout(searchProductDebounce.current)
    searchProductDebounce.current = setTimeout(() => {
      loadProducts(search)
    }, 300)
    return () => {
      if (searchProductDebounce.current) clearTimeout(searchProductDebounce.current)
    }
  }, [search])

  async function loadProducts(query = '') {
    try {
      const result = await getProducts(query || undefined, 1, 100)
      setProducts(result.products.map((p) => ({ ...p, salePrice: Number(p.salePrice) })))
    } catch {
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  async function searchExistingClients(rawQuery: string) {
    const query = rawQuery.trim()
    if (query.length < 2) {
      setSuggestions([])
      setSuggestOpen(false)
      setSuggestLoading(false)
      return
    }
    setSuggestLoading(true)
    try {
      const data = await searchClients(query)
      setSuggestions(data)
      setSuggestOpen(data.length > 0)
      setActiveIndex(-1)
    } catch {
      setSuggestions([])
      setSuggestOpen(false)
    } finally {
      setSuggestLoading(false)
    }
  }

  function handleClientNameChange(value: string) {
    setClientName(value)
    setSelectedClientId(null)
    if (searchClientDebounce.current) clearTimeout(searchClientDebounce.current)
    searchClientDebounce.current = setTimeout(() => searchExistingClients(value), 300)
  }

  function handleSelectClient(client: ClientSuggestion) {
    setClientName(client.name)
    setClientPhone(client.phone || '')
    setClientEmail(client.email || '')
    setClientAddress(client.address || '')
    setSelectedClientId(client.id)
    setSuggestions([])
    setSuggestOpen(false)
    setActiveIndex(-1)
  }

  function handleClientKeyDown(e: React.KeyboardEvent) {
    if (!suggestOpen || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault()
        handleSelectClient(suggestions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setSuggestOpen(false)
      setActiveIndex(-1)
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setSuggestOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredProducts = useMemo(() => {
    const inCart = new Set(cart.map((i) => i.productId))
    const q = search.trim().toLowerCase()
    return products
      .filter((p) => !inCart.has(p.id))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.barcode?.toLowerCase().includes(q) ?? false) ||
          (p.category?.name.toLowerCase().includes(q) ?? false),
      )
  }, [products, search, cart])

  function addToCart(product: ProductOption) {
    if (product.stock <= 0) {
      toast.error('Sin stock', { description: `${product.name} no tiene stock disponible` })
      return
    }
    setCart((prev) => [
      ...prev,
      {
        productId: product.id,
        name: product.name,
        unitPrice: product.salePrice,
        stock: product.stock,
        quantity: 1,
      },
    ])
    setSearch('')
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item
        const newQty = item.quantity + delta
        if (newQty <= 1) return item
        if (newQty > item.stock) {
          toast.error('Stock insuficiente', { description: `Solo hay ${item.stock} unidades` })
          return item
        }
        return { ...item, quantity: newQty }
      }),
    )
  }

  function updateUnitPrice(productId: string, value: number) {
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, unitPrice: value } : item)),
    )
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [cart])
  const total = subtotal - discount
  const installmentsSum = installments.reduce((s, i) => s + (i.amount || 0), 0)
  const remainingAfterPlan = total - initialPayment - installmentsSum

  function serializeClientForm() {
    const fd = new FormData()
    fd.append('name', clientName.trim())
    fd.append('phone', clientPhone.trim())
    if (clientEmail.trim()) fd.append('email', clientEmail.trim())
    if (clientAddress.trim()) fd.append('address', clientAddress.trim())
    return fd
  }

  async function handleSubmit() {
    if (cart.length === 0) {
      toast.error('Agrega al menos un producto a la venta')
      return
    }
    if (discount < 0) {
      toast.error('El descuento no puede ser negativo')
      return
    }
    if (!selectedClientId && clientName.trim().length === 0) {
      toast.error('El cliente es requerido para ventas a crédito')
      return
    }

    setSaving(true)
    try {
      let clientId: string | null = selectedClientId

      if (clientName.trim().length > 0 && !clientId) {
        const created = await createClient(serializeClientForm())
        if (created.error) {
          toast.error('No se pudo guardar el cliente', { description: created.error })
          setSaving(false)
          return
        }
        if (created.client?.id) {
          clientId = created.client.id
        }
      }

      const result = await createSale({
        clientId,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        discount,
        paymentMethod: 'CREDITO',
        initialPayment,
        initialPaymentMethod,
        dueDate: dueDate || undefined,
        installments: useInstallments ? installments : undefined,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Venta a crédito registrada')
      router.push(`/credits/${result.sale?.id}`)
      router.refresh()
    } catch {
      toast.error('Error al procesar la venta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container py-6 space-y-6">
      <PageHeader
        title="Nueva Venta a Crédito"
        description="Factura a crédito: fija abono inicial, vencimiento o plan de cuotas"
        actions={
          <Link href="/credits">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selección de productos */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Productos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto del inventario..."
                  className="pl-9"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                    className="p-3 border rounded-none text-left hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2.5">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-12 w-12 rounded-none object-cover border border-border/60 shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-none bg-muted/40 border border-border/60 flex items-center justify-center shrink-0">
                          <ShoppingCart className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{product.name}</div>
                        {product.category && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">{product.category.name}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-sm">{formatCurrency(product.salePrice)}</span>
                      <Badge variant={product.stock <= 5 ? 'destructive' : 'secondary'} className="text-xs">
                        {product.stock}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>

              {filteredProducts.length === 0 && !loading && (
                <EmptyState
                  icon={ShoppingCart}
                  title={search ? 'Sin productos' : 'Inventario vacío'}
                  description={
                    search
                      ? 'No hay productos que coincidan con la búsqueda'
                      : 'Todos los productos ya están en la venta o no hay inventario'
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detalle del crédito */}
        <div className="space-y-4">
          {/* Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground">
                Obligatorio para ventas a crédito. Escribe el nombre para autocompletar o crea uno nuevo.
              </div>

              <div ref={clientRef} className="relative">
                <div className="space-y-1.5">
                  <Label htmlFor="clientName" className="text-xs font-medium">
                    Nombre
                  </Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => handleClientNameChange(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setSuggestOpen(true)
                    }}
                    onKeyDown={handleClientKeyDown}
                    placeholder="Nombre del cliente..."
                    disabled={saving}
                    className="pl-9"
                  />
                  <Search className="absolute left-3 top-9 h-4 w-4 -translate-y-2 text-muted-foreground" />
                </div>
                {suggestLoading && (
                  <Loader2 className="absolute right-3 top-9 h-4 w-4 -translate-y-2 animate-spin text-muted-foreground" />
                )}

                {suggestOpen && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-none shadow-lg max-h-40 overflow-y-auto">
                    {suggestions.map((client, index) => (
                      <button
                        key={client.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleSelectClient(client)
                        }}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors border-b last:border-0 ${
                          index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                        }`}
                      >
                        <div className="font-medium">{client.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {client.phone ? `${client.phone} · ` : ''}
                          {client.email || 'Sin email'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {suggestOpen && clientName.trim().length >= 2 && !suggestLoading && suggestions.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-none shadow-lg">
                    <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Se registrará como cliente nuevo
                    </div>
                  </div>
                )}
              </div>

              {selectedClientId && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Cliente existente seleccionado
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="clientPhone" className="text-xs font-medium">
                    Teléfono
                  </Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => {
                      setClientPhone(e.target.value)
                      setSelectedClientId(null)
                    }}
                    placeholder="Teléfono (solo si es cliente nuevo)"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clientEmail" className="text-xs font-medium">
                    Email
                  </Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => {
                      setClientEmail(e.target.value)
                      setSelectedClientId(null)
                    }}
                    placeholder="Email (opcional)"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clientAddress" className="text-xs font-medium">
                    Dirección
                  </Label>
                  <Input
                    id="clientAddress"
                    value={clientAddress}
                    onChange={(e) => {
                      setClientAddress(e.target.value)
                      setSelectedClientId(null)
                    }}
                    placeholder="Dirección (opcional)"
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Productos de la venta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Productos de la venta
                {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Agrega productos desde la lista de la izquierda
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-center">Cant.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell>
                            <div className="text-sm">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Stock: {item.stock} · {formatCurrency(item.unitPrice)} c/u
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              step="100"
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateUnitPrice(item.productId, Number(e.target.value) || 0)
                              }
                              className="w-28 ml-auto text-right"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => updateQuantity(item.productId, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => updateQuantity(item.productId, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive"
                              onClick={() => removeFromCart(item.productId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Condiciones del crédito + total */}
          <Card>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Descuento (opcional)</label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Abono inicial (opcional)</label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={initialPayment}
                    onChange={(e) => setInitialPayment(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Método del abono</label>
                  <Select
                    value={initialPaymentMethod}
                    onValueChange={(v) => setInitialPaymentMethod(v as 'CASH' | 'CARD' | 'TRANSFER')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Efectivo</SelectItem>
                      <SelectItem value="CARD">Tarjeta</SelectItem>
                      <SelectItem value="TRANSFER">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Fecha de vencimiento (opcional)</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useInstallments}
                    onChange={(e) => setUseInstallments(e.target.checked)}
                    className="accent-primary"
                  />
                  Plan de cuotas
                </label>
              </div>

              {useInstallments && (
                <div className="space-y-2">
                  {installments.map((inst, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Valor cuota"
                        value={inst.amount}
                        onChange={(e) => {
                          const next = [...installments]
                          next[idx] = { ...next[idx], amount: Number(e.target.value) || 0 }
                          setInstallments(next)
                        }}
                      />
                      <Input
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) => {
                          const next = [...installments]
                          next[idx] = { ...next[idx], dueDate: e.target.value }
                          setInstallments(next)
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => setInstallments((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setInstallments((prev) => [...prev, { amount: 0, dueDate: '' }])}
                  >
                    <Plus className="h-4 w-4" />
                    Agregar cuota
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Saldo: {formatCurrency(Math.max(0, remainingAfterPlan))}
                  </p>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Descuento</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                {initialPayment > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Abono inicial</span>
                    <span>-{formatCurrency(initialPayment)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Saldo por cobrar</span>
                  <span>{formatCurrency(Math.max(0, total - initialPayment))}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={saving || cart.length === 0}
              >
                {saving ? 'Procesando...' : 'Registrar Venta a Crédito'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}