import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { Icon, type IconName } from '@/components/ui'

interface NavItemDef {
  to: string
  label: string
  icon: IconName
}

const clientItems: NavItemDef[] = [
  { to: '/calendar', label: 'Reservar', icon: 'calendar' },
  { to: '/appointments', label: 'Mis citas', icon: 'clipboard' },
]

const adminItems: NavItemDef[] = [
  { to: '/admin/dashboard', label: 'Agenda', icon: 'calendar' },
  { to: '/admin/settings', label: 'Config', icon: 'settings' },
]

function NavItem({ to, label, icon }: NavItemDef) {
  const { pathname } = useLocation()
  const isActive = pathname === to || pathname.startsWith(to + '/')

  return (
    <Link
      to={to}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 no-underline transition-colors"
      style={{
        color: isActive ? '#C8A44E' : 'var(--fg-2)',
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        fontWeight: isActive ? 600 : 400,
      }}
    >
      <Icon name={icon} size={22} stroke={isActive ? 2.2 : 1.6} />
      <span>{label}</span>
    </Link>
  )
}

export function BottomNav() {
  const { user } = useAuth()

  if (!user) return null

  const items = user.role === 'admin' ? adminItems : clientItems

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50"
      style={{
        background: 'var(--bg-1)',
        borderTop: '1px solid var(--line)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex h-14">
        {items.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  )
}
