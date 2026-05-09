import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './styles/globals.css'
import App from './App.tsx'
import { ShopProvider } from './context/ShopContext'

// Global fallback: 60 s. Individual hooks override via STALE.* from @/hooks/queryKeys.
// Strategy: services/barbers/shop → STALE.LONG (10 min)
//           appointments          → STALE.MEDIUM (2 min)
//           available slots       → STALE.SHORT (30 s)
//           loyalty               → STALE.LOYALTY (5 min)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

async function bootstrap() {
  // Inject cached palette CSS synchronously before first render to prevent color flash
  const cachedCSS = localStorage.getItem('gio_palette_css')
  if (cachedCSS) {
    const el = document.createElement('style')
    el.id = 'gio-palette-style'
    el.textContent = cachedCSS
    document.head.appendChild(el)
  }

  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'warn' })
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ShopProvider>
              <App />
            </ShopProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </HelmetProvider>
      <Analytics />
      <SpeedInsights />
    </StrictMode>,
  )
}

bootstrap()
