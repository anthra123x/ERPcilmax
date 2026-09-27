import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { "unused-imports": unusedImports },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // react-pdf primitives render to PDF, not the DOM, so DOM-oriented a11y
    // rules such as the img alt-text check do not apply.
    files: ["src/lib/pdf/**/*.tsx"],
    rules: {
      "jsx-a11y/alt-text": "off",
    },
  },
  {
    // ── Frontera de capas del monolito modular ───────────────────────────────
    // Una Server Action es la FRONTERA HTTP: autentica, valida con Zod,
    // delega en un service y revalida. El acceso a datos vive en
    // `*.service.ts`. Prohibir el import aquí hace la regla mecánica en vez de
    // una nota en la documentación.
    files: ["src/modules/**/*.actions.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/prisma",
              message:
                "Las Server Actions no acceden a la base de datos. Mueve la query a un *.service.ts y delega desde la action.",
            },
          ],
        },
      ],
    },
  },
  {
    // ── Deuda técnica: módulos aún por migrar a la convención de capas ──────
    // Cada línea es un módulo pendiente. Bórrala al migrarlo: mover el data
    // access de la action a un *.service.ts y quitar el archivo de aquí.
    // Hoy: 17 archivos.
    files: [
      "src/modules/auth/auth.actions.ts",
      "src/modules/cleanup/cleanup.actions.ts",
      "src/modules/clients/clients.actions.ts",
      "src/modules/export/export.actions.ts",
      "src/modules/finance/expenses.actions.ts",
      "src/modules/inventory/categories.actions.ts",
      "src/modules/inventory/inventory.actions.ts",
      "src/modules/inventory/stock.actions.ts",
      "src/modules/notifications/notifications.actions.ts",
      "src/modules/reports/reports.actions.ts",
      "src/modules/sales/payments.actions.ts",
      "src/modules/sales/sales.actions.ts",
      "src/modules/search/search.actions.ts",
      "src/modules/suppliers/suppliers.actions.ts",
      "src/modules/web/web-content.actions.ts",
      "src/modules/web/web-orders.actions.ts",
      "src/modules/web/web-products.actions.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agentes/skills externas: no son código de la app
    ".agents/**",
    ".opencode/**",
    ".codex/**",
    "docs/**",
  ]),
]);

export default eslintConfig;
