import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@/hooks'
import { useAdminProfiles, useUpdateProfileRole } from '@/hooks/useProfile'
import type { UserRole } from '@/domain/user'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  owner: 'Propietario',
  barber: 'Barbero',
  client: 'Cliente',
}

const ALL_ROLES: UserRole[] = ['admin', 'owner', 'barber', 'client']

const SECTION_TITLE = {
  fontFamily: 'var(--font-display)',
  fontSize: 13,
  letterSpacing: '0.12em',
  color: 'var(--fg-3)',
  marginBottom: '1rem',
} as const

export default function AdminPanelPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [rowError, setRowError] = useState<Record<string, string>>({})

  const { data: profiles = [], isLoading, error: loadError } = useAdminProfiles()
  const updateRole = useUpdateProfileRole()

  const filtered = profiles.filter(p =>
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.fullName ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  function handleRoleChange(id: string, currentRole: UserRole, newRole: UserRole) {
    if (currentRole === 'admin') return // cannot remove admin from frontend
    setRowError(prev => { const c = { ...prev }; delete c[id]; return c })
    updateRole.mutate({ id, role: newRole }, {
      onError: () => setRowError(prev => ({ ...prev, [id]: 'No se pudo actualizar. Revisa tu conexión.' })),
    })
  }

  return (
    <>
      <Helmet><title>Panel Admin · Gio Barber Shop</title></Helmet>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.15em', color: 'var(--fg-3)', marginBottom: 4 }}>
            PANEL DE ADMINISTRADOR
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)' }}>
            Gestión de usuarios
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', marginTop: 4 }}>
            Sesión: {user?.email} · {ROLE_LABELS[user?.role ?? 'client']}
          </div>
        </div>

        <div style={SECTION_TITLE}>USUARIOS REGISTRADOS</div>

        <input
          type="search"
          placeholder="Buscar por email o nombre…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg-3)', border: '1px solid var(--line)',
            borderRadius: 8, padding: '0.6rem 0.75rem',
            color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13,
            outline: 'none', marginBottom: '1rem',
          }}
        />

        {isLoading && (
          <div style={{ color: 'var(--fg-2)', fontSize: 13, fontFamily: 'var(--font-ui)', padding: '1rem 0' }}>
            Cargando usuarios…
          </div>
        )}

        {loadError && (
          <div style={{ color: 'var(--danger)', fontSize: 13, fontFamily: 'var(--font-ui)', padding: '1rem 0' }}>
            Error al cargar usuarios. Revisa tu conexión.
          </div>
        )}

        {!isLoading && !loadError && filtered.length === 0 && (
          <div style={{ color: 'var(--fg-2)', fontSize: 13, fontFamily: 'var(--font-ui)', padding: '1rem 0' }}>
            No se encontraron usuarios.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(profile => {
            const isAdminRole = profile.role === 'admin'
            const isSelf = profile.id === user?.id
            return (
              <div
                key={profile.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  background: 'var(--bg-2)', border: '1px solid var(--line)',
                  borderRadius: 10, padding: '0.75rem 1rem',
                  opacity: updateRole.isPending ? 0.7 : 1,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: isAdminRole ? 'rgba(139,58,31,0.25)' : 'var(--bg-4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13,
                  color: isAdminRole ? 'var(--brick-warm)' : 'var(--fg-2)',
                }}>
                  {(profile.fullName ?? profile.email).charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.fullName ?? '—'}{isSelf && <span style={{ fontSize: 10, color: 'var(--fg-3)', marginLeft: 4 }}>(tú)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.email}
                  </div>
                  {rowError[profile.id] && (
                    <div style={{ fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                      {rowError[profile.id]}
                    </div>
                  )}
                </div>

                <div style={{ flexShrink: 0 }}>
                  {isAdminRole ? (
                    <div style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      fontFamily: 'var(--font-ui)', letterSpacing: '0.05em',
                      background: 'rgba(139,58,31,0.15)', color: 'var(--brick-warm)',
                    }}>
                      {ROLE_LABELS[profile.role]}
                    </div>
                  ) : (
                    <select
                      value={profile.role}
                      onChange={e => handleRoleChange(profile.id, profile.role, e.target.value as UserRole)}
                      disabled={updateRole.isPending}
                      style={{
                        background: 'var(--bg-3)', border: '1px solid var(--line)',
                        borderRadius: 6, padding: '0.35rem 0.5rem',
                        color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 12,
                        cursor: 'pointer', outline: 'none',
                      }}
                    >
                      {ALL_ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '2rem', padding: '0.75rem 1rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--fg-2)' }}>Nota de seguridad:</strong> el rol <em>Administrador</em> solo puede asignarse, no quitarse desde este panel. Para revocar un admin, hazlo directamente en la base de datos.
          </div>
        </div>
      </div>
    </>
  )
}
