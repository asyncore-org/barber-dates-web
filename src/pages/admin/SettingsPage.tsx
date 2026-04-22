import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ConfirmDialog } from '@/components/ui'
import { useTheme } from '@/hooks'
import {
  MOCK_SERVICES, MOCK_BARBERS, MOCK_HOURS, MOCK_CLOSURES,
  MOCK_REWARDS, MOCK_LOYALTY, MOCK_SHOP,
} from '@/lib/mock-data'
import type { MockService, MockBarber, MockHourEntry, MockClosure, MockReward } from '@/lib/mock-data'

type Section = 'servicios' | 'horarios' | 'barberos' | 'fidelizacion' | 'barberia' | 'apariencia'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'servicios',     label: 'Servicios' },
  { id: 'horarios',      label: 'Horarios' },
  { id: 'barberos',      label: 'Barberos' },
  { id: 'fidelizacion',  label: 'Fidelización' },
  { id: 'barberia',      label: 'Barbería' },
  { id: 'apariencia',    label: 'Apariencia' },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '1rem' }}>
      {children}
    </div>
  )
}

function Row({ label, value, onChange }: { label: string; value: string; onChange?: (v: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <label style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)' }}>{label}</label>
      <input
        value={value}
        readOnly={!onChange}
        onChange={e => onChange?.(e.target.value)}
        style={{
          background: 'var(--bg-3)', border: '1px solid var(--line)',
          borderRadius: 6, padding: '0.4rem 0.6rem',
          color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13,
          outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const [section, setSection] = useState<Section>('servicios')

  // Services state
  const [services, setServices] = useState<MockService[]>(MOCK_SERVICES)
  const [deleteService, setDeleteService] = useState<MockService | null>(null)

  // Barbers state
  const [barbers, setBarbers] = useState<MockBarber[]>(MOCK_BARBERS)

  // Hours state
  const [hours, setHours] = useState<MockHourEntry[]>(MOCK_HOURS)
  const [closures] = useState<MockClosure[]>(MOCK_CLOSURES)

  // Rewards state
  const [rewards, setRewards] = useState<MockReward[]>(MOCK_REWARDS)
  const [loyaltyRatio, setLoyaltyRatio] = useState('1')
  const [welcomePoints, setWelcomePoints] = useState('10')

  // Shop state
  const [shop, setShop] = useState(MOCK_SHOP)

  const addService = () => {
    const id = `s${Date.now()}`
    setServices(s => [...s, { id, name: 'Nuevo servicio', duration: 30, price: 15, points: 10, active: true }])
  }
  const updateService = (id: string, field: keyof MockService, val: string | number | boolean) => {
    setServices(s => s.map(svc => svc.id === id ? { ...svc, [field]: val } : svc))
  }
  const confirmDeleteService = () => {
    if (!deleteService) return
    setServices(s => s.filter(svc => svc.id !== deleteService.id))
    setDeleteService(null)
  }

  const toggleBarber = (id: string) => {
    setBarbers(b => b.map(br => br.id === id ? { ...br, active: !br.active } : br))
  }

  const toggleDay = (i: number) => {
    setHours(h => h.map((d, idx) => idx === i ? { ...d, open: !d.open } : d))
  }

  const deleteReward = (id: string) => setRewards(r => r.filter(rw => rw.id !== id))
  const addReward = () => setRewards(r => [...r, { id: `r${Date.now()}`, label: 'Nueva recompensa', cost: 50, active: true }])
  const updateReward = (id: string, label: string) => setRewards(r => r.map(rw => rw.id === id ? { ...rw, label } : rw))

  return (
    <>
      <Helmet><title>Configuración — Gio Barber Shop</title></Helmet>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem', alignItems: 'start' }}
        className="settings-grid">

        {/* Sidebar */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.5rem', position: 'sticky', top: 72 }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '0.6rem 0.875rem', borderRadius: 8, marginBottom: 2,
                border: 'none',
                background: section === s.id ? 'var(--bg-3)' : 'transparent',
                color: section === s.id ? 'var(--fg-0)' : 'var(--fg-2)',
                fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: section === s.id ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.5rem' }}>

          {/* === SERVICIOS === */}
          {section === 'servicios' && (
            <div>
              <SectionTitle>SERVICIOS</SectionTitle>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line)' }}>
                      {['Nombre', 'Duración (min)', 'Precio (€)', 'Puntos', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.4rem 0.5rem', color: 'var(--fg-3)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(svc => (
                      <tr key={svc.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        {(['name', 'duration', 'price', 'points'] as const).map(f => (
                          <td key={f} style={{ padding: '0.4rem 0.5rem' }}>
                            <input
                              value={String(svc[f])}
                              onChange={e => updateService(svc.id, f, f === 'name' ? e.target.value : Number(e.target.value))}
                              style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 4, padding: '0.3rem 0.5rem', color: 'var(--fg-0)', width: f === 'name' ? 160 : 70, fontFamily: 'var(--font-ui)', fontSize: 13 }}
                            />
                          </td>
                        ))}
                        <td style={{ padding: '0.4rem 0.5rem' }}>
                          <button
                            onClick={() => setDeleteService(svc)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 13 }}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={addService}
                style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
              >
                + Añadir servicio
              </button>
            </div>
          )}

          {/* === HORARIOS === */}
          {section === 'horarios' && (
            <div>
              <SectionTitle>HORARIOS</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {hours.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 0.75rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div style={{ width: 90, fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{d.name}</div>
                    <button
                      onClick={() => toggleDay(i)}
                      style={{
                        padding: '0.25rem 0.6rem', borderRadius: 4, border: 'none',
                        background: d.open ? 'rgba(109,187,109,0.15)' : 'var(--bg-4)',
                        color: d.open ? 'var(--ok)' : 'var(--fg-3)',
                        fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer',
                      }}
                    >
                      {d.open ? 'Abierto' : 'Cerrado'}
                    </button>
                    {d.open && (
                      <>
                        <input defaultValue={d.from} style={{ width: 64, background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 4, padding: '0.25rem 0.4rem', color: 'var(--fg-0)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }} />
                        <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>–</span>
                        <input defaultValue={d.to} style={{ width: 64, background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 4, padding: '0.25rem 0.4rem', color: 'var(--fg-0)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }} />
                      </>
                    )}
                  </div>
                ))}
              </div>
              <SectionTitle>CIERRES ESPECIALES</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {closures.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{c.reason}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>{c.date}</div>
                    </div>
                    <div style={{ fontSize: 11, color: c.all ? 'var(--danger)' : 'var(--fg-2)', fontFamily: 'var(--font-ui)', alignSelf: 'center' }}>
                      {c.all ? 'Cierre total' : 'Cierre parcial'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === BARBEROS === */}
          {section === 'barberos' && (
            <div>
              <SectionTitle>BARBEROS</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {barbers.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: b.active ? 'var(--led)' : 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: b.active ? '#fff' : 'var(--fg-3)' }}>
                      {b.initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>{b.role}</div>
                    </div>
                    <button
                      onClick={() => toggleBarber(b.id)}
                      style={{
                        padding: '0.3rem 0.7rem', borderRadius: 6,
                        border: `1px solid ${b.active ? 'rgba(109,187,109,0.4)' : 'var(--line)'}`,
                        background: b.active ? 'rgba(109,187,109,0.08)' : 'transparent',
                        color: b.active ? 'var(--ok)' : 'var(--fg-2)',
                        fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      {b.active ? 'Activo' : 'Descanso'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === FIDELIZACIÓN === */}
          {section === 'fidelizacion' && (
            <div>
              <SectionTitle>PARÁMETROS</SectionTitle>
              <Row label="Ratio pts/€" value={loyaltyRatio} onChange={setLoyaltyRatio} />
              <Row label="Puntos bienvenida" value={welcomePoints} onChange={setWelcomePoints} />
              <Row label="Objetivo stamps" value={String(MOCK_LOYALTY.target)} />
              <div style={{ height: 1, background: 'var(--line)', margin: '1.25rem 0' }} />
              <SectionTitle>RECOMPENSAS</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rewards.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <input
                      value={r.label}
                      onChange={e => updateReward(r.id, e.target.value)}
                      style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-ui)' }}>{r.cost} pts</span>
                    <button onClick={() => deleteReward(r.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={addReward} style={{ marginTop: '0.75rem', padding: '0.4rem 0.875rem', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
                + Añadir recompensa
              </button>
            </div>
          )}

          {/* === BARBERÍA === */}
          {section === 'barberia' && (
            <div>
              <SectionTitle>DATOS DE LA BARBERÍA</SectionTitle>
              <Row label="Nombre" value={shop.name} onChange={v => setShop(s => ({ ...s, name: v }))} />
              <Row label="Teléfono" value={shop.phone} onChange={v => setShop(s => ({ ...s, phone: v }))} />
              <Row label="Email" value={shop.email} onChange={v => setShop(s => ({ ...s, email: v }))} />
              <Row label="Instagram" value={shop.instagram} onChange={v => setShop(s => ({ ...s, instagram: v }))} />
              <Row label="Dirección" value={shop.address} onChange={v => setShop(s => ({ ...s, address: v }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'flex-start', gap: '0.75rem' }}>
                <label style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)', paddingTop: 6 }}>Descripción</label>
                <textarea
                  value={shop.description}
                  onChange={e => setShop(s => ({ ...s, description: e.target.value }))}
                  rows={3}
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.6rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, resize: 'vertical', outline: 'none' }}
                />
              </div>
            </div>
          )}

          {/* === APARIENCIA === */}
          {section === 'apariencia' && (
            <div>
              <SectionTitle>APARIENCIA</SectionTitle>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div>
                  <div style={{ fontSize: 14, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>Modo de color</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                    Actualmente: <span style={{ color: 'var(--fg-0)' }}>{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: 8,
                    border: '1px solid var(--line)', background: 'var(--bg-4)',
                    color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cambiar a {theme === 'dark' ? 'claro' : 'oscuro'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteService && (
        <ConfirmDialog
          title="Eliminar servicio"
          message={`¿Eliminar "${deleteService.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={confirmDeleteService}
          onCancel={() => setDeleteService(null)}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .settings-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
