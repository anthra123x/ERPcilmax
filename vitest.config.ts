import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    server: {
      // zod 4 expone `z` como named export de su entry ESM. Al externalizarlo,
      // Node carga el build CJS y el interop pierde ese export (`z` queda
      // undefined). Inlinearlo hace que Vite lo resuelva por ESM.
      deps: {
        inline: ['zod'],
      },
    },
  },
})
