import { useState, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@/hooks'
import { useAdminProfiles, useUpdateProfileRole } from '@/hooks/useProfile'
import type { UserRole } from '@/domain/user'

const PAGE_SIZE = 10

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

type PendingRole = { from: UserRole; to: UserRole }
type SortKey = 'name' | 'email' | 'role'
type SortDir = 'asc' | 'desc'

export default function AdminPanelPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)
  const [pendingRoles, setPendingRoles] = useState<Record<string, PendingRole>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: profiles = [], isLoading, error: loadError } = useAdminProfiles()
  const updateRole = useUpdateProfileRole()

  const processed = useMemo(() => {
    let result = profiles.filter(p => {
      const matchSearch =
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        (p.fullName ?? '').toLowerCase().includes(search.toLowerCase())
      const matchRole = roleFilter === 'all' || p.role === roleFilter
      return matchSearch && matchRole
    })

    result = [...result].sort((a, b) => {
      const va = sortKey === 'name' ? (a.fullName ?? a.email).toLowerCase()
        : sortKey === 'email' ? a.email.toLowerCase()
        : a.role
      const vb = sortKey === 'name' ? (b.fullName ?? b.email).toLowerCase()
        : sortKey === 'email' ? b.email.toLowerCase()
        : b.role
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })

    return result
  }, [profiles, search, roleFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE))
  const paginated = processed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleFilterChange(newFilter: UserRole | 'all') {
    setRoleFilter(newFilter)
    setPage(0)
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(0)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  function handleRoleChange(id: string, currentRole: UserRole, newRole: UserRole) {
    if (currentRole === 'admin') return
    setPendingRoles(prev => {
      const original = prev[id]?.from ?? currentRole
      if (original === newRole) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: { from: original, to: newRole } }
    })
  }

  async function handleSavePending() {
    setSaveError(null)
    const entries = Object.entries(pendingRoles)
    try {
      await Promise.all(entries.map(([id, { to }]) => updateRole.mutateAsync({ id, role: to })))
      setPendingRoles({})
    } catch {
      setSaveError('No se pudieron guardar todos los cambios. Revisa tu conexión e inténtalo de nuevo.')
    }
  }

  function handleCancelPending() {
    setPendingRoles({})
    setSaveError(null)
  }

  const hasPending = Object.keys(pendingRoles).length > 0

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null
    return <span style={{ marginLeft: 3, fontSize: 9 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
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

        {/* Search + role filter */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Buscar por email o nombre…"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            style={{
              flex: 1, minWidth: 180, boxSizing: 'border-box',
              background: 'var(--bg-3)', border: '1px solid var(--line)',
              borderRadius: 8, padding: '0.6rem 0.75rem',
              color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13,
              outline: 'none',
            }}
          />
          <select
            value={roleFilter}
            onChange={e => handleFilterChange(e.target.value as UserRole | 'all')}
            style={{
              background: 'var(--bg-3)', border: '1px solid var(--line)',
              borderRadius: 8, padding: '0.6rem 0.75rem',
              color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13,
              outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="all">Todos los roles</option>
            {ALL_ROLES.map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>

        {/* Sort controls */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', marginRight: 4 }}>Ordenar:</span>
          {(['name', 'email', 'role'] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              style={{
                padding: '0.3rem 0.65rem', borderRadius: 6, fontSize: 11,
                fontFamily: 'var(--font-ui)', cursor: 'pointer',
                background: sortKey === key ? 'var(--bg-4)' : 'var(--bg-3)',
                border: `1px solid ${sortKey === key ? 'var(--led-soft)' : 'var(--line)'}`,
                color: sortKey === key ? 'var(--fg-0)' : 'var(--fg-2)',
              }}
            >
              {key === 'name' ? 'Nombre' : key === 'email' ? 'Email' : 'Rol'}
              {sortIndicator(key)}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>
            {processed.length} usuario{processed.length !== 1 ? 's' : ''}
          </span>
        </div>

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

        {!isLoading && !loadError && processed.length === 0 && (
          <div style={{ color: 'var(--fg-2)', fontSize: 13, fontFamily: 'var(--font-ui)', padding: '1rem 0' }}>
            No se encontraron usuarios.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {paginated.map(profile => {
            const isAdminRole = profile.role === 'admin'
            const isSelf = profile.id === user?.id
            const displayRole = pendingRoles[profile.id]?.to ?? profile.role
            const isPending = !!pendingRoles[profile.id]
            return (
              <div
                key={profile.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  background: 'var(--bg-2)', border: `1px solid ${isPending ? 'var(--led-soft)' : 'var(--line)'}`,
                  borderRadius: 10, padding: '0.75rem 1rem',
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
                  {isPending && (
                    <div style={{ fontSize: 10, color: 'var(--led-soft)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                      {ROLE_LABELS[pendingRoles[profile.id].from]} → {ROLE_LABELS[pendingRoles[profile.id].to]}
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
                      value={displayRole}
                      onChange={e => handleRoleChange(profile.id, profile.role, e.target.value as UserRole)}
                      disabled={updateRole.isPending}
                      style={{
                        background: isPending ? 'rgba(123,79,255,0.08)' : 'var(--bg-3)',
                        border: `1px solid ${isPending ? 'var(--led-soft)' : 'var(--line)'}`,
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: 7, fontSize: 12,
                fontFamily: 'var(--font-ui)', cursor: page === 0 ? 'default' : 'pointer',
                background: 'var(--bg-3)', border: '1px solid var(--line)',
                color: page === 0 ? 'var(--fg-3)' : 'var(--fg-1)',
                opacity: page === 0 ? 0.5 : 1,
              }}
            >
              ← Anterior
            </button>
            <span style={{ fontSize: 12, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: 7, fontSize: 12,
                fontFamily: 'var(--font-ui)', cursor: page === totalPages - 1 ? 'default' : 'pointer',
                background: 'var(--bg-3)', border: '1px solid var(--line)',
                color: page === totalPages - 1 ? 'var(--fg-3)' : 'var(--fg-1)',
                opacity: page === totalPages - 1 ? 0.5 : 1,
              }}
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* Confirmation panel */}
        {hasPending && (
          <div style={{
            position: 'sticky', bottom: 16, marginTop: '1.5rem',
            background: 'var(--bg-2)', border: '1px solid var(--led-soft)',
            borderRadius: 12, padding: '1rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', marginBottom: '0.625rem' }}>
              Cambios pendientes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.875rem' }}>
              {Object.entries(pendingRoles).map(([id, { from, to }]) => {
                const profile = profiles.find(p => p.id === id)
                return (
                  <div key={id} style={{ fontSize: 12, color: 'var(--fg-1)', fontFamily: 'var(--font-ui)' }}>
                    <span style={{ fontWeight: 500 }}>{profile?.fullName ?? profile?.email ?? id}</span>
                    {' · '}
                    <span style={{ color: 'var(--fg-3)' }}>{ROLE_LABELS[from]}</span>
                    {' → '}
                    <span style={{ color: 'var(--led-soft)', fontWeight: 600 }}>{ROLE_LABELS[to]}</span>
                  </div>
                )
              })}
            </div>
            {saveError && (
              <p style={{ margin: '0 0 0.5rem', color: 'var(--danger)', fontSize: 12, fontFamily: 'var(--font-ui)' }}>
                {saveError}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleSavePending}
                disabled={updateRole.isPending}
                style={{
                  padding: '0.5rem 1.25rem', minHeight: 40, borderRadius: 8, border: 'none',
                  background: 'var(--led)', color: '#fff',
                  fontFamily: 'var(--font-ui)', fontSize: 13, cursor: updateRole.isPending ? 'default' : 'pointer',
                  opacity: updateRole.isPending ? 0.7 : 1,
                }}
              >
                {updateRole.isPending ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button
                onClick={handleCancelPending}
                disabled={updateRole.isPending}
                style={{
                  padding: '0.5rem 1rem', minHeight: 40, borderRadius: 8,
                  border: '1px solid var(--line)', background: 'transparent',
                  color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 13,
                  cursor: updateRole.isPending ? 'default' : 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', padding: '0.75rem 1rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--fg-2)' }}>Nota de seguridad:</strong> el rol <em>Administrador</em> solo puede asignarse, no quitarse desde este panel. Para revocar un admin, hazlo directamente en la base de datos.
          </div>
        </div>
      </div>
    </>
  )
}
