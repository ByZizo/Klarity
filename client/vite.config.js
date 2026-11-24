import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
let rootPkgVersion = '3.12.75'
try {
  const rootPkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'))
  if (rootPkg?.version) rootPkgVersion = rootPkg.version
} catch {}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __KLARITY_APP_VERSION__: JSON.stringify(rootPkgVersion)
  },
  plugins: [
    react(),
    tailwindcss()
  ],
  build: {
    sourcemap: false,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdf-lib') || id.includes('@pdf-lib') || id.includes('pdfjs-dist') || id.includes('signature_pad') || id.includes('@fontsource')) {
              return 'vendor-pdf';
            }
            if (id.includes('node-forge') || id.includes('@neslinesli93/qpdf-wasm')) {
              return 'vendor-pdf-security';
            }
            if (id.includes('tesseract.js')) {
              return 'vendor-ocr';
            }
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('marked') || id.includes('react-plaid-link')) {
              return 'vendor-extras';
            }
            if (id.includes('/react/') || id.includes('/react-dom/')) {
              return 'vendor-react';
            }
          }
          return undefined;
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
