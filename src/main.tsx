import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './styles/globals.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

async function disableMockServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  const registrations = await navigator.serviceWorker.getRegistrations()
  const mockRegistrations = registrations.filter((registration) => {
    const scriptUrl =
      registration.active?.scriptURL ??
      registration.waiting?.scriptURL ??
      registration.installing?.scriptURL ??
      ''
    return scriptUrl.includes('mockServiceWorker.js')
  })

  await Promise.all(mockRegistrations.map((registration) => registration.unregister()))
}

async function bootstrap() {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'warn' })
  } else {
    await disableMockServiceWorker()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </HelmetProvider>
      <Analytics />
      <SpeedInsights />
    </StrictMode>,
  )
}

bootstrap()
