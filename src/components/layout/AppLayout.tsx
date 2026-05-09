import type { ReactNode } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-0)]">
      <TopBar />
      <main className="flex-1 w-full max-w-[1280px] mx-auto pt-4 px-4 pb-[4.5rem] md:pt-6 md:px-6 md:pb-6 box-border">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
