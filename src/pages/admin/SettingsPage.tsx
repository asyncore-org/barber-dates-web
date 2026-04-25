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

function calcInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '1rem' }}>
      {children}
    </div>
  )
}

function Row({ label, value, onChange }: { label: string; value: string; onChange?: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1 mb-3 md:grid md:grid-cols-[160px_1fr] md:items-center md:gap-3">
      <label style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)' }}>{label}</label>
      <input
        value={value}
        readOnly={!onChange}
        onChange={e => onChange?.(e.target.value)}
        style={{
          background: 'var(--bg-3)', border: '1px solid var(--line)',
          borderRadius: 6, padding: '0.5rem 0.6rem',
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

  const [services, setServices] = useState<MockService[]>(MOCK_SERVICES)
  const [deleteService, setDeleteService] = useState<MockService | null>(null)
  const [barbers, setBarbers] = useState<MockBarber[]>(MOCK_BARBERS)
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null)
  const [deleteBarber, setDeleteBarber] = useState<MockBarber | null>(null)
  const [showBarberForm, setShowBarberForm] = useState(false)
  const [newBarber, setNewBarber] = useState({ name: '', role: 'Barbero', email: '', phone: '' })
  const [hours, setHours] = useState<MockHourEntry[]>(MOCK_HOURS)
  const [closures, setClosures] = useState<MockClosure[]>(MOCK_CLOSURES)
  const [showClosureForm, setShowClosureForm] = useState(false)
  const [newClosureDate, setNewClosureDate] = useState('')
  const [newClosureReason, setNewClosureReason] = useState('')
  const [newClosureAll, setNewClosureAll] = useState(true)
  const [rewards, setRewards] = useState<MockReward[]>(MOCK_REWARDS)
  const [loyaltyRatio, setLoyaltyRatio] = useState('1')
  const [welcomePoints, setWelcomePoints] = useState('10')
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
  const updateBarber = (id: string, field: keyof MockBarber, val: string | boolean) => {
    setBarbers(b => b.map(br => {
      if (br.id !== id) return br
      const updated = { ...br, [field]: val }
      if (field === 'name') updated.initials = calcInitials(val as string)
      return updated
    }))
  }
  const confirmDeleteBarber = () => {
    if (!deleteBarber) return
    setBarbers(b => b.filter(br => br.id !== deleteBarber.id))
    setDeleteBarber(null)
  }
  const addBarber = () => {
    if (!newBarber.name.trim()) return
    setBarbers(b => [...b, {
      id: `b${Date.now()}`, name: newBarber.name.trim(),
      role: newBarber.role.trim() || 'Barbero',
      initials: calcInitials(newBarber.name),
      active: true, phone: newBarber.phone, email: newBarber.email,
    }])
    setNewBarber({ name: '', role: 'Barbero', email: '', phone: '' })
    setShowBarberForm(false)
  }

  const toggleDay = (i: number) => {
    setHours(h => h.map((d, idx) => idx === i ? { ...d, open: !d.open } : d))
  }

  const deleteClosure = (id: string) => setClosures(c => c.filter(cl => cl.id !== id))
  const addClosure = () => {
    if (!newClosureDate || !newClosureReason.trim()) return
    const d = new Date(newClosureDate + 'T12:00:00')
    const label = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    setClosures(c => [...c, { id: `cl${Date.now()}`, date: label, reason: newClosureReason.trim(), all: newClosureAll }])
    setNewClosureDate('')
    setNewClosureReason('')
    setNewClosureAll(true)
    setShowClosureForm(false)
  }

  const deleteReward = (id: string) => setRewards(r => r.filter(rw => rw.id !== id))
  const addReward = () => setRewards(r => [...r, { id: `r${Date.now()}`, label: 'Nueva recompensa', cost: 50, active: true }])
  const updateReward = (id: string, label: string) => setRewards(r => r.map(rw => rw.id === id ? { ...rw, label } : rw))

  const sidebarBtn = (id: Section) => ({
    display: 'block' as const, width: '100%', textAlign: 'left' as const,
    padding: '0.6rem 0.875rem', borderRadius: 8, marginBottom: 2,
    border: 'none',
    background: section === id ? 'var(--bg-3)' : 'transparent',
    color: section === id ? 'var(--fg-0)' : 'var(--fg-2)',
    fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: (section === id ? 600 : 400) as number,
    cursor: 'pointer' as const, transition: 'all 0.12s',
  })

  return (
    <>
      <Helmet><title>Configuración — Gio Barber Shop</title></Helmet>

      {/* Mobile section tabs */}
      <div className="md:hidden overflow-x-auto pb-2 mb-4 -mx-4 px-4">
        <div className="flex gap-2 w-max">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                padding: '0.5rem 1rem', borderRadius: 20, border: 'none', minHeight: 40,
                background: section === s.id ? '#C8A44E' : 'var(--bg-3)',
                color: section === s.id ? '#000' : 'var(--fg-2)',
                fontFamily: 'var(--font-ui)', fontSize: 13,
                fontWeight: section === s.id ? 700 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 md:gap-6 items-start">

        {/* Sidebar (desktop only) */}
        <div
          className="hidden md:block"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.5rem', position: 'sticky', top: 72 }}
        >
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={sidebarBtn(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div
          className="p-4 md:p-6"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12 }}
        >

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
                style={{ marginTop: '1rem', padding: '0.6rem 1rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
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
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)', flexWrap: 'wrap' }}>
                    <div style={{ width: 90, fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{d.name}</div>
                    <button
                      onClick={() => toggleDay(i)}
                      style={{
                        padding: '0.5rem 0.75rem', minHeight: 40, borderRadius: 4, border: 'none',
                        background: d.open ? 'rgba(109,187,109,0.15)' : 'var(--bg-4)',
                        color: d.open ? 'var(--ok)' : 'var(--fg-3)',
                        fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      {d.open ? 'Abierto' : 'Cerrado'}
                    </button>
                    {d.open && (
                      <>
                        <input defaultValue={d.from} style={{ width: 64, background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 4, padding: '0.35rem 0.4rem', color: 'var(--fg-0)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }} />
                        <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>–</span>
                        <input defaultValue={d.to} style={{ width: 64, background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 4, padding: '0.35rem 0.4rem', color: 'var(--fg-0)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }} />
                      </>
                    )}
                  </div>
                ))}
              </div>
              <SectionTitle>CIERRES ESPECIALES</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {closures.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{c.reason}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>{c.date}</div>
                    </div>
                    <div style={{ fontSize: 11, color: c.all ? 'var(--danger)' : 'var(--fg-2)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>
                      {c.all ? 'Cierre total' : 'Parcial'}
                    </div>
                    <button
                      onClick={() => deleteClosure(c.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', minWidth: 32, minHeight: 32, borderRadius: 4, fontSize: 14, flexShrink: 0 }}
                    >✕</button>
                  </div>
                ))}

                {showClosureForm && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.875rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px dashed var(--line)' }}>
                    <div className="flex flex-col gap-1 md:grid md:grid-cols-2 md:gap-3">
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 4 }}>Fecha</label>
                        <input
                          type="date"
                          value={newClosureDate}
                          onChange={e => setNewClosureDate(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 4 }}>Motivo</label>
                        <input
                          type="text"
                          value={newClosureReason}
                          onChange={e => setNewClosureReason(e.target.value)}
                          placeholder="Ej: Vacaciones, festivo..."
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13 }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => setNewClosureAll(v => !v)}
                        style={{
                          padding: '0.4rem 0.75rem', minHeight: 36, borderRadius: 6, border: 'none',
                          background: newClosureAll ? 'rgba(220,53,69,0.12)' : 'rgba(109,187,109,0.12)',
                          color: newClosureAll ? 'var(--danger)' : 'var(--ok)',
                          fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        {newClosureAll ? 'Cierre total' : 'Cierre parcial'}
                      </button>
                      <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>clic para cambiar</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={addClosure}
                        style={{ padding: '0.5rem 1rem', minHeight: 40, borderRadius: 8, border: 'none', background: 'var(--led)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
                      >
                        Añadir
                      </button>
                      <button
                        onClick={() => setShowClosureForm(false)}
                        style={{ padding: '0.5rem 1rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {!showClosureForm && (
                  <button
                    onClick={() => setShowClosureForm(true)}
                    style={{ alignSelf: 'flex-start', padding: '0.5rem 0.875rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
                  >
                    + Añadir cierre
                  </button>
                )}
              </div>
            </div>
          )}

          {/* === BARBEROS === */}
          {section === 'barberos' && (
            <div>
              <SectionTitle>BARBEROS</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {barbers.map(b => (
                  <div key={b.id} style={{ background: 'var(--bg-3)', borderRadius: 10, border: '1px solid var(--line)', overflow: 'hidden' }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: b.active ? 'var(--led)' : 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: b.active ? '#fff' : 'var(--fg-3)', flexShrink: 0 }}>
                        {b.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500, lineHeight: 1.2 }}>{b.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', marginTop: 1 }}>{b.role}</div>
                      </div>
                      <button
                        onClick={() => toggleBarber(b.id)}
                        style={{
                          padding: '0.4rem 0.625rem', minHeight: 36, borderRadius: 6, flexShrink: 0,
                          border: `1px solid ${b.active ? 'rgba(109,187,109,0.4)' : 'var(--line)'}`,
                          background: b.active ? 'rgba(109,187,109,0.08)' : 'transparent',
                          color: b.active ? 'var(--ok)' : 'var(--fg-2)',
                          fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer',
                        }}
                      >
                        {b.active ? 'Activo' : 'Baja'}
                      </button>
                      <button
                        onClick={() => setEditingBarberId(id => id === b.id ? null : b.id)}
                        style={{
                          padding: '0.4rem 0.625rem', minHeight: 36, borderRadius: 6, flexShrink: 0,
                          border: `1px solid ${editingBarberId === b.id ? 'var(--led)' : 'var(--line)'}`,
                          background: editingBarberId === b.id ? 'rgba(123,79,255,0.1)' : 'transparent',
                          color: editingBarberId === b.id ? 'var(--led-soft)' : 'var(--fg-2)',
                          fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer',
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteBarber(b)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', minWidth: 32, minHeight: 32, borderRadius: 4, fontSize: 14, flexShrink: 0 }}
                      >✕</button>
                    </div>

                    {/* Expandable edit panel */}
                    {editingBarberId === b.id && (
                      <div style={{ borderTop: '1px solid var(--line)', padding: '0.875rem', background: 'var(--bg-4)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {([
                            { field: 'name', label: 'Nombre', type: 'text' },
                            { field: 'role', label: 'Rol', type: 'text' },
                            { field: 'email', label: 'Email', type: 'email' },
                            { field: 'phone', label: 'Teléfono', type: 'tel' },
                          ] as const).map(({ field, label, type }) => (
                            <div key={field}>
                              <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>{label}</label>
                              <input
                                type={type}
                                value={(b[field] as string) ?? ''}
                                onChange={e => updateBarber(b.id, field, e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* New barber form */}
                {showBarberForm && (
                  <div style={{ background: 'var(--bg-3)', borderRadius: 10, border: '1px dashed var(--line)', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--led)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0 }}>
                        {calcInitials(newBarber.name) || '+'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>Nuevo barbero</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {([
                        { key: 'name', label: 'Nombre *', type: 'text', ph: 'Ej: Ana García' },
                        { key: 'role', label: 'Rol', type: 'text', ph: 'Barbero / Barbera' },
                        { key: 'email', label: 'Email', type: 'email', ph: 'ana@giobarber.es' },
                        { key: 'phone', label: 'Teléfono', type: 'tel', ph: '6XX XX XX XX' },
                      ] as const).map(({ key, label, type, ph }) => (
                        <div key={key}>
                          <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>{label}</label>
                          <input
                            type={type}
                            value={newBarber[key]}
                            onChange={e => setNewBarber(nb => ({ ...nb, [key]: e.target.value }))}
                            placeholder={ph}
                            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={addBarber}
                        disabled={!newBarber.name.trim()}
                        style={{ padding: '0.5rem 1rem', minHeight: 40, borderRadius: 8, border: 'none', background: newBarber.name.trim() ? 'var(--led)' : 'var(--bg-4)', color: newBarber.name.trim() ? '#fff' : 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: newBarber.name.trim() ? 'pointer' : 'default' }}
                      >
                        Dar de alta
                      </button>
                      <button
                        onClick={() => { setShowBarberForm(false); setNewBarber({ name: '', role: 'Barbero', email: '', phone: '' }) }}
                        style={{ padding: '0.5rem 1rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {!showBarberForm && (
                  <button
                    onClick={() => setShowBarberForm(true)}
                    style={{ alignSelf: 'flex-start', padding: '0.5rem 0.875rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
                  >
                    + Añadir barbero
                  </button>
                )}
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
                    <button onClick={() => deleteReward(r.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, minWidth: 44, minHeight: 44 }}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={addReward} style={{ marginTop: '0.75rem', padding: '0.5rem 0.875rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
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
              <div className="flex flex-col gap-1 mb-3 md:grid md:grid-cols-[160px_1fr] md:items-start md:gap-3">
                <label style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)', paddingTop: 6 }}>Descripción</label>
                <textarea
                  value={shop.description}
                  onChange={e => setShop(s => ({ ...s, description: e.target.value }))}
                  rows={3}
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.5rem 0.6rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, resize: 'vertical', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* === APARIENCIA === */}
          {section === 'apariencia' && (
            <div>
              <SectionTitle>APARIENCIA</SectionTitle>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: 14, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>Modo de color</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                    Actualmente: <span style={{ color: 'var(--fg-0)' }}>{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  style={{
                    padding: '0.6rem 1rem', minHeight: 44, borderRadius: 8, flexShrink: 0,
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

      {deleteBarber && (
        <ConfirmDialog
          title="Eliminar barbero"
          message={`¿Eliminar a ${deleteBarber.name}? Sus citas no se verán afectadas.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={confirmDeleteBarber}
          onCancel={() => setDeleteBarber(null)}
        />
      )}
    </>
  )
}
