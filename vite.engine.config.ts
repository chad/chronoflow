import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/engine/index.ts'),
      name: 'MoshEngine',
      fileName: 'mosh-engine',
      formats: ['es'],
    },
    outDir: 'dist-engine',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Single file bundle
        inlineDynamicImports: true,
      },
    },
  },
})
