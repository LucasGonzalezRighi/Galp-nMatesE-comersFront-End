import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { ADMIN_SECURITY_HEADERS, buildAdminCsp } from './src/lib/csp.ts'

export default defineConfig(({ mode }) => {
  // En modo de prueba no hay API que permitir; con `live` la CSP deja conectarse a ella.
  const apiBaseUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL
  const apiOrigin = apiBaseUrl === undefined || apiBaseUrl === '' ? null : apiBaseUrl

  return {
    // El plugin del router va antes que el de React, como pide su documentación.
    plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
    preview: {
      // `Strict-Transport-Security` no va en `http://localhost`: la agrega el servidor de producción.
      headers: { 'Content-Security-Policy': buildAdminCsp(apiOrigin), ...ADMIN_SECURITY_HEADERS },
    },
  }
})
