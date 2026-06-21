import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface InfoItem {
  icon: string
  label: string
  description: string
}

interface InfoButtonProps {
  title: string
  items: InfoItem[]
}

export function InfoButton({ title, items }: InfoButtonProps) {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, close])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Ayuda"
        style={{
          width: 26, height: 26, borderRadius: '50%',
          border: '1px solid var(--line)',
          background: 'var(--bg-3)',
          color: 'var(--fg-3)',
          fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--led)'; e.currentTarget.style.color = 'var(--led)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--fg-3)' }}
      >?</button>

      {open && createPortal(
        <div
          onClick={close}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-1)', borderRadius: 16, width: '100%', maxWidth: 400,
              border: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', color: 'var(--fg-0)' }}>{title}</div>
              <button onClick={close} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Items */}
            <div style={{ padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: 'var(--bg-3)', border: '1px solid var(--line)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                  }}>{item.icon}</div>
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>{item.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--line)' }}>
              <button onClick={close} style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
                Entendido
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
