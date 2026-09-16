import { z } from 'zod'

// Notification schemas
export const NotificationTypeSchema = z.enum(['SYSTEM', 'LOW_STOCK'])

// Product schemas
export const CreateProductSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  costPrice: z.coerce.number().min(0, 'El costo debe ser positivo').default(0),
  salePrice: z.coerce.number().min(0, 'El precio de venta debe ser positivo').default(0),
  stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo').default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
})

export const UpdateProductSchema = CreateProductSchema.partial()

// Product Category schemas
export const CreateProductCategorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  color: z.string().optional().nullable(),
})

export const UpdateProductCategorySchema = CreateProductCategorySchema.partial()

// Supplier schemas
export const CreateSupplierSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
  address: z.string().optional().nullable(),
})

export const UpdateSupplierSchema = CreateSupplierSchema.partial()

// Stock Movement schemas
export const StockMovementTypeSchema = z.enum(['PURCHASE', 'SALE', 'IN', 'OUT', 'ADJUST'])

export const CreateStockMovementSchema = z.object({
  productId: z.string().min(1, 'El producto es requerido'),
  type: StockMovementTypeSchema,
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
  unitCost: z.coerce.number().min(0).optional().nullable(),
  reason: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
})

// Sale schemas
export const PaymentMethodSchema = z.enum(['CASH', 'CARD', 'TRANSFER', 'CREDITO'])
export const CashPaymentMethodSchema = z.enum(['CASH', 'CARD', 'TRANSFER'])
export const SaleStatusSchema = z.enum(['COMPLETED', 'CANCELLED'])

export const CreateSaleItemSchema = z.object({
  productId: z.string().min(1, 'El producto es requerido'),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
  unitPrice: z.coerce.number().min(0, 'El precio unitario no puede ser negativo').optional(),
})

export const CreditInstallmentSchema = z.object({
  amount: z.coerce.number().min(0.01, 'El monto de la cuota debe ser mayor a 0'),
  dueDate: z.string().min(1, 'La fecha de la cuota es requerida'),
})

export const CreateSaleSchema = z
  .object({
    clientId: z.string().optional().nullable(),
    items: z.array(CreateSaleItemSchema).min(1, 'Debe agregar al menos un producto'),
    discount: z.coerce.number().min(0, 'El descuento no puede ser negativo').default(0),
    paymentMethod: PaymentMethodSchema,
    initialPayment: z.coerce.number().min(0, 'El abono inicial no puede ser negativo').default(0),
    initialPaymentMethod: CashPaymentMethodSchema.optional().default('CASH'),
    dueDate: z.string().optional().nullable(),
    installments: z.array(CreditInstallmentSchema).max(36).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'CREDITO' && !data.clientId) {
      ctx.addIssue({
        code: 'custom',
        message: 'El cliente es requerido para ventas a crédito',
        path: ['clientId'],
      })
    }
    if (data.paymentMethod !== 'CREDITO' && (data.initialPayment > 0 || data.installments.length > 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Anticipo y cuotas solo aplican para ventas a crédito',
        path: ['paymentMethod'],
      })
    }
  })

// Credit payments (abonos)
export const RegisterPaymentSchema = z.object({
  saleId: z.string().min(1, 'La venta es requerida'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  paymentMethod: CashPaymentMethodSchema,
  paymentDate: z.string().optional().nullable(),
  notes: z.string().max(300, 'La nota es demasiado larga').optional().nullable(),
})

// Client schemas
const optionalText = (schema: z.ZodType<string>) =>
  z.preprocess(
    (value) => (value === null || value === undefined || value === '' ? undefined : value),
    schema.optional(),
  )

export const CreateClientSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string().min(8, 'El teléfono debe tener al menos 8 caracteres'),
  email: optionalText(z.string().email('Email inválido')),
  address: optionalText(z.string()),
})

export const UpdateClientSchema = CreateClientSchema.partial()

// Notification schemas
export const CreateNotificationSchema = z.object({
  userId: z.string().nullable().optional(),
  type: NotificationTypeSchema,
  title: z.string().min(1, 'El título es requerido'),
  message: z.string().optional().nullable(),
  entityType: z.string().optional().nullable(),
  entityId: z.string().optional().nullable(),
})

// Finance schemas
export const CategoryTypeSchema = z.enum(['INCOME', 'EXPENSE', 'SAVING_GOAL'])
export const TransactionTypeSchema = z.enum(['INCOME', 'EXPENSE'])

export const CreateCategorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  type: CategoryTypeSchema,
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  budget: z.coerce.number().min(0, 'El presupuesto debe ser positivo').optional().nullable(),
})

export const UpdateCategorySchema = CreateCategorySchema.partial()

export const CreateTransactionSchema = z.object({
  type: TransactionTypeSchema,
  amount: z.coerce.number().min(1, 'El monto debe ser mayor a 0'),
  description: z.string().min(2, 'La descripción debe tener al menos 2 caracteres'),
  date: z.string().optional(),
  categoryId: z.string(),
  isRecurring: z.boolean().optional().default(false),
  recurringDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const UpdateTransactionSchema = CreateTransactionSchema.partial()

export const CreateSavingGoalSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  targetAmount: z.coerce.number().min(1, 'La meta debe ser mayor a 0'),
  currentAmount: z.coerce.number().min(0).default(0),
  deadline: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
})

export const UpdateSavingGoalSchema = CreateSavingGoalSchema.partial()

export const BudgetPeriodStatusSchema = z.enum(['ACTIVE', 'CLOSED'])

export const CreateBudgetPeriodSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  initialBalance: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
})

export const CloseWeekSchema = z.object({
  savingsTarget: z.coerce.number().min(0).optional().nullable(),
})

// Auth schemas
export const ChangePasswordSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

// Settings schemas
export const UpdateSettingsSchema = z.object({
  companyName: z.string().min(1, 'El nombre es requerido').optional(),
  companyAddress: z.string().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  companyEmail: z.string().email('Email inválido').optional().nullable(),
  currency: z.string().optional(),
  invoicePrefix: z.string().optional(),
  invoiceFooter: z.string().optional().nullable(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
})

// Storefront (tienda online) schemas — contrato de la API pública /api/web/*
export const CreateProductReviewSchema = z.object({
  productId: z.string().min(1, 'El producto es requerido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  email: optionalText(z.string().email('Email inválido')).nullable(),
  rating: z.coerce.number().int().min(1, 'La calificación debe estar entre 1 y 5').max(5, 'La calificación debe estar entre 1 y 5'),
  comment: z.string().min(1, 'El comentario es requerido').max(2000, 'El comentario es demasiado largo'),
})

export const CreateContactMessageSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  phone: optionalText(z.string().max(30, 'El teléfono no es válido')).nullable(),
  email: optionalText(z.string().email('Email inválido')).nullable(),
  message: z.string().min(1, 'El mensaje es requerido').max(2000, 'El mensaje es demasiado largo'),
})

export const CreateWebOrderItemSchema = z.object({
  productId: z.string().min(1, 'El producto es requerido'),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1').max(99, 'La cantidad es demasiado grande'),
})

export const CreateWebOrderSchema = z.object({
  customerName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  customerPhone: z.string().min(6, 'El teléfono debe tener al menos 6 caracteres').max(30),
  customerEmail: optionalText(z.string().email('Email inválido')).nullable(),
  notes: optionalText(z.string().max(2000, 'La nota es demasiado larga')).nullable(),
  items: z.array(CreateWebOrderItemSchema).min(1, 'El pedido está vacío').max(50, 'Demasiados productos en el pedido'),
})
