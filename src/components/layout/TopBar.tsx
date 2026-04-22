import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { useTheme } from '@/hooks'
import { Logo } from './Logo'
import { Icon } from '@/components/ui'

export function TopBar() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const isAdmin = user?.role === 'admin'
  const clientLinks = [
    { to: '/calendar', label: 'Pedir cita', icon: 'calendar' as const },
    { to: '/appointments', label: 'Mis citas', icon: 'clipboard' as const },
  ]
  const adminLinks = [
    { to: '/admin/dashboard', label: 'Agenda', icon: 'calendar' as const },
    { to: '/admin/settings', label: 'Configuración', icon: 'settings' as const },
  ]
  const links = isAdmin ? adminLinks : clientLinks

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--bg-1)',
      borderBottom: '1px solid var(--line)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 1.5rem',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
      }}>
        <Logo size={32} />

        <nav style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 6,
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--fg-0)' : 'var(--fg-2)',
                background: isActive ? 'var(--bg-3)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              <Icon name={icon} size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={toggleTheme}
            title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 6,
              border: '1px solid var(--line)',
              background: 'transparent',
              color: 'var(--fg-2)',
              cursor: 'pointer',
            }}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
          </button>

          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 6,
              border: '1px solid var(--line)',
              background: 'transparent',
              color: 'var(--fg-2)',
              cursor: 'pointer',
            }}
          >
            <Icon name="bell" size={15} />
          </button>

          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.6rem',
                borderRadius: 6,
                border: '1px solid var(--line)',
                background: 'transparent',
                color: 'var(--fg-1)',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
              }}
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--led)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
              }}>
                {user?.fullName?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <Icon name="chevronD" size={12} />
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                minWidth: 220,
                background: 'var(--bg-2)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                boxShadow: 'var(--shadow-md)',
                padding: '0.5rem',
                zIndex: 100,
              }}>
                <div style={{ padding: '0.5rem 0.75rem 0.75rem', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)' }}>
                    {user?.fullName ?? 'Usuario'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>
                    {user?.email}
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    marginTop: 6,
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    background: isAdmin ? 'rgba(139,58,31,0.2)' : 'rgba(123,79,255,0.15)',
                    color: isAdmin ? 'var(--brick-warm)' : 'var(--led-soft)',
                  }}>
                    {isAdmin ? 'Propietario' : 'Cliente'}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    marginTop: '0.25rem',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--danger)',
                    fontSize: 13,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Icon name="logout" size={14} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
