import type { ReactNode } from 'react'
import { TopBar } from './TopBar'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-0)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <TopBar />
      <main style={{
        flex: 1,
        maxWidth: 1280,
        width: '100%',
        margin: '0 auto',
        padding: '1.5rem',
        boxSizing: 'border-box',
      }}>
        {children}
      </main>
    </div>
  )
}
