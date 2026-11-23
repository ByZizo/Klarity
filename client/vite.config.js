import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
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
