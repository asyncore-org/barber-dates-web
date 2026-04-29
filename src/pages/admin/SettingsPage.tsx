import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { ConfirmDialog, Modal } from '@/components/ui'
import { MonthCalendar } from '@/components/calendar'
import { useTheme } from '@/hooks'
import { useShopContext } from '@/context/ShopContext'
import { useAllServices, useCreateService, useUpdateService, useDeleteService } from '@/hooks/useServices'
import { useAllBarbers, useCreateBarber, useUpdateBarber, useDeleteBarber } from '@/hooks/useBarbers'
import { useWeeklySchedule, useScheduleBlocks, useMutateWeeklySchedule, useAddScheduleBlock, useDeleteScheduleBlock } from '@/hooks/useSchedule'
import { useShopInfo, useBookingConfig, useMutateShopInfo, useMutateBookingConfig } from '@/hooks/useShopConfig'
import { useAllRewards, useCreateReward, useUpdateReward, useDeleteReward } from '@/hooks/useLoyalty'
import { DEFAULT_WEEKLY_SCHEDULE } from '@/domain/schedule'
import type { WeeklySchedule, DayKey } from '@/domain/schedule'
import type { Service } from '@/domain/service'
import type { Barber } from '@/domain/barber'
import type { Reward } from '@/domain/loyalty'

type Section = 'servicios' | 'horarios' | 'barberos' | 'fidelizacion' | 'barberia' | 'apariencia'

const BARBER_ROLES = ['Barbero', 'Barbera', 'Propietario', 'Estilista'] as const

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'servicios',    label: 'Servicios' },
  { id: 'horarios',     label: 'Horarios' },
  { id: 'barberos',     label: 'Barberos' },
  { id: 'fidelizacion', label: 'Fidelización' },
  { id: 'barberia',     label: 'Barbería' },
  { id: 'apariencia',   label: 'Apariencia' },
]

const DAY_KEYS: { key: DayKey; name: string }[] = [
  { key: 'mon', name: 'Lunes' },
  { key: 'tue', name: 'Martes' },
  { key: 'wed', name: 'Miércoles' },
  { key: 'thu', name: 'Jueves' },
  { key: 'fri', name: 'Viernes' },
  { key: 'sat', name: 'Sábado' },
  { key: 'sun', name: 'Domingo' },
]

function calcInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

function fmtBlockDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toISODate(d: Date): string {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)', marginBottom: '1rem' }}>
      {children}
    </div>
  )
}

function DirtyGuardDialog({ onSave, onDiscard, onCancel }: { onSave: () => void; onDiscard: () => void; onCancel: () => void }) {
  return (
    <Modal
      title="Cambios sin guardar"
      onClose={onCancel}
      footer={
        <>
          <button className="btn ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn ghost" style={{ color: 'var(--danger)' }} onClick={onDiscard}>Descartar</button>
          <button className="btn primary" onClick={onSave}>Guardar</button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--fg-1)', fontSize: 14, lineHeight: 1.6 }}>
        Esta sección tiene cambios sin guardar. ¿Qué quieres hacer antes de continuar?
      </p>
    </Modal>
  )
}

function SaveBtn({ onClick, loading, isDirty }: { onClick: () => void; loading?: boolean; isDirty?: boolean }) {
  const disabled = loading || isDirty === false
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ padding: '0.5rem 1rem', minHeight: 40, borderRadius: 8, border: 'none', background: 'var(--led)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: disabled ? 'default' : 'pointer', opacity: loading ? 0.7 : isDirty === false ? 0.4 : 1 }}
    >
      {loading ? 'Guardando…' : 'Guardar'}
    </button>
  )
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { name: shopName, allowBarberChoice } = useShopContext()
  const [section, setSection] = useState<Section>('servicios')
  const [pendingNavSection, setPendingNavSection] = useState<Section | null>(null)

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const { data: servicesData = [] } = useAllServices()
  const { data: barbersData = [] } = useAllBarbers()
  const { data: schedule = DEFAULT_WEEKLY_SCHEDULE } = useWeeklySchedule()
  const { data: blocks = [] } = useScheduleBlocks()
  const { data: shopInfo } = useShopInfo()
  const { data: bookingConfig } = useBookingConfig()
  const { data: rewardsData = [] } = useAllRewards()

  // ── Mutation hooks ──────────────────────────────────────────────────────────
  const createService    = useCreateService()
  const updateService    = useUpdateService()
  const deleteService    = useDeleteService()
  const createBarber     = useCreateBarber()
  const updateBarber     = useUpdateBarber()
  const deleteBarber     = useDeleteBarber()
  const mutateSchedule   = useMutateWeeklySchedule()
  const addBlock         = useAddScheduleBlock()
  const deleteBlock      = useDeleteScheduleBlock()
  const mutateShopInfo   = useMutateShopInfo()
  const mutateBooking    = useMutateBookingConfig()
  const createReward     = useCreateReward()
  const updateRewardMut  = useUpdateReward()
  const deleteReward     = useDeleteReward()

  // ── Services local state ────────────────────────────────────────────────────
  const [serviceEdits, setServiceEdits] = useState<Record<string, Partial<Service>>>({})
  const services = servicesData.filter(svc => svc.isActive).map(svc => ({ ...svc, ...serviceEdits[svc.id] }))
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<Service | null>(null)

  // ── Barbers local state ─────────────────────────────────────────────────────
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null)
  const [barberEdits, setBarberEdits] = useState<Record<string, Partial<Barber>>>({})
  const [deleteBarberTarget, setDeleteBarberTarget] = useState<Barber | null>(null)
  const [showBarberForm, setShowBarberForm] = useState(false)
  const [newBarber, setNewBarber] = useState({ fullName: '', role: 'Barbero', email: '', phone: '' })

  // ── Schedule local state ────────────────────────────────────────────────────
  const [pendingSchedule, setPendingSchedule] = useState<WeeklySchedule | null>(null)
  const localSchedule = pendingSchedule ?? schedule

  // ── Closures form state ─────────────────────────────────────────────────────
  const [showClosureForm, setShowClosureForm] = useState(false)
  const [closureDate, setClosureDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth())
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear())
  const [closureReason, setClosureReason] = useState('')
  const [closureTotal, setClosureTotal] = useState(true)
  const [closureBarberIds, setClosureBarberIds] = useState<string[]>([])

  // ── Shop info local state ───────────────────────────────────────────────────
  type ShopFields = { name: string; phone: string; email: string; instagram: string; address: string; description: string }
  const [shopEdits, setShopEdits] = useState<Partial<ShopFields>>({})
  const localShop: ShopFields = {
    name:        shopEdits.name        ?? shopInfo?.name        ?? '',
    phone:       shopEdits.phone       ?? shopInfo?.phone       ?? '',
    email:       shopEdits.email       ?? shopInfo?.email       ?? '',
    instagram:   shopEdits.instagram   ?? shopInfo?.instagram   ?? '',
    address:     shopEdits.address     ?? shopInfo?.address     ?? '',
    description: shopEdits.description ?? shopInfo?.description ?? '',
  }
  const [pendingMaxDays, setPendingMaxDays] = useState<string | null>(null)
  const localMaxDays = pendingMaxDays ?? String(bookingConfig?.maxAdvanceDays ?? 14)

  // ── Rewards local state ─────────────────────────────────────────────────────
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null)
  const [rewardEdits, setRewardEdits] = useState<Record<string, { label: string; cost: number }>>({})

  // ── Section errors ───────────────────────────────────────────────────────────
  const [sectionError, setSectionError] = useState<Partial<Record<Section, string>>>({})
  const setSecError = (sec: Section, msg: string) => setSectionError(e => ({ ...e, [sec]: msg }))
  const clearSecError = (sec: Section) => setSectionError(e => { const c = { ...e }; delete c[sec]; return c })

  // ── Handlers: services ──────────────────────────────────────────────────────
  const handleAddService = () => {
    createService.mutate({ name: 'Nuevo servicio', durationMinutes: 30, price: 15, loyaltyPoints: 10 })
  }

  const handleServiceFieldChange = (id: string, field: keyof Service, val: string | number) => {
    setServiceEdits(e => ({ ...e, [id]: { ...e[id], [field]: val } }))
  }

  const handleSaveService = (svc: Service) => {
    updateService.mutate({ id: svc.id, data: { name: svc.name, durationMinutes: svc.durationMinutes, price: svc.price, loyaltyPoints: svc.loyaltyPoints } }, {
      onSuccess: () => { setServiceEdits(e => { const copy = { ...e }; delete copy[svc.id]; return copy }); clearSecError('servicios') },
      onError: (e) => { if (import.meta.env.DEV) console.error(e); setSecError('servicios', 'No se pudo guardar el servicio. Revisa tu conexión.') },
    })
  }

  const handleSaveAllServices = () => {
    services.forEach(svc => { if (serviceEdits[svc.id]) handleSaveService(svc) })
  }

  const handleConfirmDeleteService = () => {
    if (!deleteServiceTarget) return
    deleteService.mutate(deleteServiceTarget.id, { onSuccess: () => setDeleteServiceTarget(null) })
  }

  // ── Handlers: barbers ───────────────────────────────────────────────────────
  const getBarberEdit = (id: string): Partial<Barber> => barberEdits[id] ?? {}

  const handleBarberEditChange = (id: string, field: keyof Barber, val: string | boolean) => {
    setBarberEdits(e => ({ ...e, [id]: { ...e[id], [field]: val } }))
  }

  const handleSaveBarber = (b: Barber) => {
    const edits = barberEdits[b.id] ?? {}
    updateBarber.mutate({ id: b.id, data: { fullName: edits.fullName ?? b.fullName, role: edits.role ?? b.role ?? undefined, phone: edits.phone ?? b.phone ?? undefined, email: edits.email ?? b.email ?? undefined, bio: edits.bio ?? b.bio ?? undefined, breakStart: edits.breakStart !== undefined ? edits.breakStart : b.breakStart, breakEnd: edits.breakEnd !== undefined ? edits.breakEnd : b.breakEnd } }, {
      onSuccess: () => { setBarberEdits(e => { const copy = { ...e }; delete copy[b.id]; return copy }); setEditingBarberId(null); clearSecError('barberos') },
      onError: (e) => { if (import.meta.env.DEV) console.error(e); setSecError('barberos', 'No se pudo guardar el barbero. Revisa tu conexión.') },
    })
  }

  const handleToggleBarberActive = (b: Barber) => {
    updateBarber.mutate({ id: b.id, data: { isActive: !b.isActive } }, {
      onError: (e) => { if (import.meta.env.DEV) console.error(e); setSecError('barberos', 'No se pudo actualizar el estado del barbero. Revisa tu conexión.') },
    })
  }

  const handleConfirmDeleteBarber = () => {
    if (!deleteBarberTarget) return
    deleteBarber.mutate(deleteBarberTarget.id, {
      onSuccess: () => { setDeleteBarberTarget(null); clearSecError('barberos') },
      onError: (e) => { if (import.meta.env.DEV) console.error(e); setDeleteBarberTarget(null); setSecError('barberos', 'No se pudo dar de baja al barbero. Revisa tu conexión.') },
    })
  }

  const handleAddBarber = () => {
    if (!newBarber.fullName.trim()) return
    createBarber.mutate({ fullName: newBarber.fullName.trim(), role: newBarber.role.trim() || 'Barbero', phone: newBarber.phone || undefined, email: newBarber.email || undefined }, {
      onSuccess: () => { setNewBarber({ fullName: '', role: 'Barbero', email: '', phone: '' }); setShowBarberForm(false) },
    })
  }

  // ── Handlers: schedule ──────────────────────────────────────────────────────
  const handleToggleDay = (key: DayKey) => {
    setPendingSchedule(s => { const b = s ?? schedule; return { ...b, [key]: { ...b[key], open: !b[key].open } } })
  }

  const handleTimeChange = (key: DayKey, field: 'from' | 'to', val: string) => {
    setPendingSchedule(s => { const b = s ?? schedule; return { ...b, [key]: { ...b[key], [field]: val } } })
  }

  const handleToggleDayBarber = (key: DayKey, barberId: string) => {
    setPendingSchedule(s => {
      const b = s ?? schedule
      const ids = b[key].barberIds
      return { ...b, [key]: { ...b[key], barberIds: ids.includes(barberId) ? ids.filter(id => id !== barberId) : [...ids, barberId] } }
    })
  }

  const handleSaveSchedule = () => {
    mutateSchedule.mutate(localSchedule, {
      onSuccess: () => { setPendingSchedule(null); clearSecError('horarios') },
      onError: (e) => { if (import.meta.env.DEV) console.error(e); setSecError('horarios', 'No se pudo guardar el horario. Revisa tu conexión.') },
    })
  }

  const handleSaveHorarios = () => {
    if (pendingSchedule !== null) handleSaveSchedule()
    if (pendingMaxDays !== null) handleSaveBookingConfig()
  }

  // ── Handlers: closures ──────────────────────────────────────────────────────
  const handleAddClosure = () => {
    if (!closureDate || !closureReason.trim()) return
    const isoDate = toISODate(closureDate)
    if (closureTotal) {
      addBlock.mutate({ barberId: null, blockDate: isoDate, startTime: null, endTime: null, dayOfWeek: null, reason: closureReason.trim(), isRecurring: false }, {
        onSuccess: resetClosureForm,
      })
    } else {
      const promises = closureBarberIds.map(barberId =>
        addBlock.mutateAsync({ barberId, blockDate: isoDate, startTime: null, endTime: null, dayOfWeek: null, reason: closureReason.trim(), isRecurring: false }),
      )
      Promise.all(promises).then(resetClosureForm)
    }
  }

  const resetClosureForm = () => {
    setShowClosureForm(false)
    setClosureDate(null)
    setShowDatePicker(false)
    setClosureReason('')
    setClosureTotal(true)
    setClosureBarberIds([])
  }

  // ── Handlers: shop info ─────────────────────────────────────────────────────
  const handleSaveShopInfo = () => {
    mutateShopInfo.mutate(localShop, {
      onSuccess: () => { setShopEdits({}); clearSecError('barberia') },
      onError: (e) => { if (import.meta.env.DEV) console.error(e); setSecError('barberia', 'No se pudo guardar la información. Revisa tu conexión.') },
    })
  }

  const handleSaveBookingConfig = () => {
    const n = Number(localMaxDays)
    if (n > 0) mutateBooking.mutate({ maxAdvanceDays: n, allowBarberChoice }, {
      onSuccess: () => { setPendingMaxDays(null); clearSecError('horarios') },
      onError: (e) => { if (import.meta.env.DEV) console.error(e); setSecError('horarios', 'No se pudo guardar la configuración. Revisa tu conexión.') },
    })
  }

  const handleToggleAllowBarber = () => {
    mutateBooking.mutate({ maxAdvanceDays: Number(localMaxDays), allowBarberChoice: !allowBarberChoice }, {
      onError: (e) => { if (import.meta.env.DEV) console.error(e); setSecError('barberos', 'No se pudo guardar la configuración. Revisa tu conexión.') },
    })
  }

  // ── Handlers: rewards ────────────────────────────────────────────────────────
  const handleSaveReward = (r: Reward) => {
    const edits = rewardEdits[r.id]
    updateRewardMut.mutate({ id: r.id, data: { label: edits?.label ?? r.label, cost: edits?.cost ?? r.cost } }, {
      onSuccess: () => {
        setRewardEdits(e => { const copy = { ...e }; delete copy[r.id]; return copy })
        setEditingRewardId(null)
        clearSecError('fidelizacion')
      },
      onError: (e) => { if (import.meta.env.DEV) console.error(e); setSecError('fidelizacion', 'No se pudo guardar la recompensa. Revisa tu conexión.') },
    })
  }

  const handleAddReward = () => {
    createReward.mutate({ label: 'Nueva recompensa', cost: 50 })
  }

  // ── Dirty state ──────────────────────────────────────────────────────────────
  const sectionDirty: Record<Section, boolean> = {
    servicios:    Object.keys(serviceEdits).length > 0,
    horarios:     pendingSchedule !== null || pendingMaxDays !== null,
    barberos:     Object.keys(barberEdits).length > 0,
    fidelizacion: Object.keys(rewardEdits).length > 0,
    barberia:     Object.keys(shopEdits).length > 0,
    apariencia:   false,
  }
  const anyDirty = Object.values(sectionDirty).some(Boolean)

  const discardSection = (sec: Section) => {
    if (sec === 'servicios')    setServiceEdits({})
    if (sec === 'horarios')     { setPendingSchedule(null); setPendingMaxDays(null) }
    if (sec === 'barberos')     setBarberEdits({})
    if (sec === 'fidelizacion') setRewardEdits({})
    if (sec === 'barberia')     setShopEdits({})
  }

  const saveSection = (sec: Section) => {
    if (sec === 'horarios') {
      if (pendingSchedule !== null) handleSaveSchedule()
      if (pendingMaxDays !== null) handleSaveBookingConfig()
    } else if (sec === 'barberos') {
      barbersData
        .filter(b => barberEdits[b.id] && Object.keys(barberEdits[b.id]).length > 0)
        .forEach(b => handleSaveBarber(b))
    } else if (sec === 'barberia') {
      handleSaveShopInfo()
    }
  }

  const handleSectionChange = (target: Section) => {
    if (!sectionDirty[section]) {
      setSection(target)
    } else {
      setPendingNavSection(target)
    }
  }

  useEffect(() => {
    if (!anyDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [anyDirty])

  // ── Sidebar style helper ─────────────────────────────────────────────────────
  const sidebarBtn = (id: Section) => ({
    display: 'flex' as const, alignItems: 'center' as const, width: '100%',
    padding: '0.6rem 0.875rem', borderRadius: 8, marginBottom: 2,
    border: 'none',
    background: section === id ? 'var(--bg-3)' : 'transparent',
    color: section === id ? 'var(--fg-0)' : 'var(--fg-2)',
    fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: (section === id ? 600 : 400) as number,
    cursor: 'pointer' as const, transition: 'all 0.12s',
  })

  const activeBarbers = barbersData.filter(b => b.isActive)

  return (
    <>
      <Helmet><title>Configuración — {shopName}</title></Helmet>

      {/* Mobile section tabs */}
      <div className="md:hidden overflow-x-auto pb-2 mb-4 -mx-4 px-4">
        <div className="flex gap-2 w-max">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => handleSectionChange(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '0.5rem 1rem', borderRadius: 20, border: 'none', minHeight: 40,
                background: section === s.id ? '#C8A44E' : 'var(--bg-3)',
                color: section === s.id ? '#000' : 'var(--fg-2)',
                fontFamily: 'var(--font-ui)', fontSize: 13,
                fontWeight: section === s.id ? 700 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {s.label}
              {sectionDirty[s.id] && (
                <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: section === s.id ? '#000' : 'var(--led)', flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 md:gap-6 items-start">

        {/* Sidebar (desktop only) */}
        <div
          className="hidden md:block"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '0.5rem', position: 'sticky', top: 72 }}
        >
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => handleSectionChange(s.id)} style={sidebarBtn(s.id)}>
              <span style={{ flex: 1 }}>{s.label}</span>
              {sectionDirty[s.id] && (
                <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--led)', flexShrink: 0 }} />
              )}
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

              {/* Desktop table */}
              <div className="hidden md:block" style={{ overflowX: 'auto' }}>
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
                        <td style={{ padding: '0.4rem 0.5rem' }}>
                          <input value={svc.name} onChange={e => handleServiceFieldChange(svc.id, 'name', e.target.value)}
                            style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 4, padding: '0.3rem 0.5rem', color: 'var(--fg-0)', width: 160, fontFamily: 'var(--font-ui)', fontSize: 13 }} />
                        </td>
                        <td style={{ padding: '0.4rem 0.5rem' }}>
                          <input type="number" value={svc.durationMinutes} onChange={e => handleServiceFieldChange(svc.id, 'durationMinutes', Number(e.target.value))}
                            style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 4, padding: '0.3rem 0.5rem', color: 'var(--fg-0)', width: 70, fontFamily: 'var(--font-ui)', fontSize: 13 }} />
                        </td>
                        <td style={{ padding: '0.4rem 0.5rem' }}>
                          <input type="number" value={svc.price} onChange={e => handleServiceFieldChange(svc.id, 'price', Number(e.target.value))}
                            style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 4, padding: '0.3rem 0.5rem', color: 'var(--fg-0)', width: 70, fontFamily: 'var(--font-ui)', fontSize: 13 }} />
                        </td>
                        <td style={{ padding: '0.4rem 0.5rem' }}>
                          <input type="number" value={svc.loyaltyPoints} onChange={e => handleServiceFieldChange(svc.id, 'loyaltyPoints', Number(e.target.value))}
                            style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 4, padding: '0.3rem 0.5rem', color: 'var(--fg-0)', width: 70, fontFamily: 'var(--font-ui)', fontSize: 13 }} />
                        </td>
                        <td style={{ padding: '0.4rem 0.5rem' }}>
                          <button onClick={() => setDeleteServiceTarget(svc)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 13 }}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden flex flex-col gap-3">
                {services.map(svc => (
                  <div key={svc.id} style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 8, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <input value={svc.name} onChange={e => handleServiceFieldChange(svc.id, 'name', e.target.value)}
                        style={{ flex: 1, background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 4, padding: '0.35rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500 }} />
                      <button onClick={() => setDeleteServiceTarget(svc)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: '0.25rem' }}>✕</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                      {([
                        { field: 'durationMinutes' as const, label: 'Min' },
                        { field: 'price' as const, label: '€' },
                        { field: 'loyaltyPoints' as const, label: 'Pts' },
                      ]).map(({ field, label }) => (
                        <div key={field}>
                          <div style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                          <input type="number" value={svc[field]} onChange={e => handleServiceFieldChange(svc.id, field, Number(e.target.value))}
                            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 4, padding: '0.3rem 0.4rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, textAlign: 'center' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddService}
                style={{ marginTop: '1rem', padding: '0.6rem 1rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
              >
                + Añadir servicio
              </button>

              {sectionError.servicios && (
                <p style={{ color: 'var(--danger)', fontSize: 12, fontFamily: 'var(--font-ui)', marginTop: 6, marginBottom: 0 }}>{sectionError.servicios}</p>
              )}
              <SaveBtn onClick={handleSaveAllServices} loading={updateService.isPending} isDirty={sectionDirty.servicios} />
            </div>
          )}

          {/* === HORARIOS === */}
          {section === 'horarios' && (
            <div>
              <SectionTitle>HORARIOS</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {DAY_KEYS.map(({ key, name }) => {
                  const d = localSchedule[key]
                  return (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ width: 90, fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{name}</div>
                        <button
                          onClick={() => handleToggleDay(key)}
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
                            <input value={d.from} onChange={e => handleTimeChange(key, 'from', e.target.value)}
                              style={{ width: 64, background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 4, padding: '0.35rem 0.4rem', color: 'var(--fg-0)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }} />
                            <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>–</span>
                            <input value={d.to} onChange={e => handleTimeChange(key, 'to', e.target.value)}
                              style={{ width: 64, background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 4, padding: '0.35rem 0.4rem', color: 'var(--fg-0)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }} />
                          </>
                        )}
                      </div>
                      {d.open && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingLeft: 2 }}>
                          <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', marginRight: 2 }}>Barberos:</span>
                          {activeBarbers.map(b => {
                            const on = d.barberIds.includes(b.id)
                            return (
                              <button
                                key={b.id}
                                onClick={() => handleToggleDayBarber(key, b.id)}
                                style={{
                                  padding: '0.25rem 0.6rem', minHeight: 28, borderRadius: 20,
                                  border: on ? '1px solid var(--led-soft)' : '1px solid var(--line)',
                                  background: on ? 'rgba(123,79,255,0.1)' : 'var(--bg-4)',
                                  color: on ? 'var(--fg-0)' : 'var(--fg-3)',
                                  fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer', transition: 'all 0.12s',
                                }}
                              >
                                {b.fullName}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{ height: 1, background: 'var(--line)', margin: '1.5rem 0' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.875rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>Reservas anticipadas</div>
                <div className="flex items-center gap-3">
                  <input type="number" min="1" max="365" value={localMaxDays}
                    onChange={e => setPendingMaxDays(e.target.value)}
                    style={{ width: 72, background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, textAlign: 'center' }} />
                  <span style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>días máx. de antelación</span>
                </div>
              </div>
              <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                <SaveBtn onClick={handleSaveHorarios} loading={mutateSchedule.isPending || mutateBooking.isPending} isDirty={sectionDirty.horarios} />
                {sectionError.horarios && (
                  <p style={{ color: 'var(--danger)', fontSize: 12, fontFamily: 'var(--font-ui)', marginTop: 6, marginBottom: 0 }}>{sectionError.horarios}</p>
                )}
              </div>

              <SectionTitle>CIERRES ESPECIALES</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {blocks.filter(b => !b.isRecurring).map(b => {
                  const barberName = b.barberId ? (barbersData.find(br => br.id === b.barberId)?.fullName ?? b.barberId) : null
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>{b.reason ?? '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                          {b.blockDate ? fmtBlockDate(b.blockDate) : '—'}
                          {barberName && ` · ${barberName} bloqueado`}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: b.barberId === null ? 'var(--danger)' : 'var(--fg-2)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>
                        {b.barberId === null ? 'Cierre total' : 'Parcial'}
                      </div>
                      <button
                        onClick={() => deleteBlock.mutate(b.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', minWidth: 32, minHeight: 32, borderRadius: 4, fontSize: 14, flexShrink: 0 }}
                      >✕</button>
                    </div>
                  )
                })}

                {showClosureForm && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.875rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px dashed var(--line)' }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 4 }}>Fecha</label>
                      <button
                        onClick={() => setShowDatePicker(v => !v)}
                        style={{ width: '100%', textAlign: 'left', padding: '0.4rem 0.5rem', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg-4)', color: closureDate ? 'var(--fg-0)' : 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
                      >
                        {closureDate ? fmtBlockDate(toISODate(closureDate)) : 'Seleccionar fecha…'}
                      </button>
                      {showDatePicker && (
                        <div style={{ marginTop: 8, padding: '0.875rem', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 8 }}>
                          <MonthCalendar selected={closureDate} onSelect={d => { setClosureDate(d); setShowDatePicker(false) }}
                            month={pickerMonth} year={pickerYear} onMonthChange={(m, y) => { setPickerMonth(m); setPickerYear(y) }} />
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 4 }}>Motivo</label>
                      <input type="text" value={closureReason} onChange={e => setClosureReason(e.target.value)} placeholder="Ej: Vacaciones, festivo…"
                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13 }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setClosureTotal(v => !v)}
                        style={{ padding: '0.4rem 0.75rem', minHeight: 36, borderRadius: 6, border: 'none', background: closureTotal ? 'rgba(220,53,69,0.12)' : 'rgba(109,187,109,0.12)', color: closureTotal ? 'var(--danger)' : 'var(--ok)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer' }}
                      >
                        {closureTotal ? 'Cierre total' : 'Cierre parcial'}
                      </button>
                    </div>
                    {!closureTotal && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', marginRight: 2 }}>Barberos bloqueados:</span>
                        {activeBarbers.map(b => {
                          const on = closureBarberIds.includes(b.id)
                          return (
                            <button
                              key={b.id}
                              onClick={() => setClosureBarberIds(ids => on ? ids.filter(id => id !== b.id) : [...ids, b.id])}
                              style={{ padding: '0.25rem 0.6rem', minHeight: 28, borderRadius: 20, border: on ? '1px solid var(--led-soft)' : '1px solid var(--line)', background: on ? 'rgba(123,79,255,0.1)' : 'var(--bg-4)', color: on ? 'var(--fg-0)' : 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer', transition: 'all 0.12s' }}
                            >
                              {b.fullName}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <SaveBtn onClick={handleAddClosure} loading={addBlock.isPending} />
                      <button onClick={resetClosureForm} style={{ padding: '0.5rem 1rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                    </div>
                  </div>
                )}

                {!showClosureForm && (
                  <button onClick={() => setShowClosureForm(true)} style={{ alignSelf: 'flex-start', padding: '0.5rem 0.875rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
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
                {barbersData.map(b => {
                  const edits = getBarberEdit(b.id)
                  const displayName = edits.fullName ?? b.fullName
                  return (
                    <div key={b.id} style={{ background: 'var(--bg-3)', borderRadius: 10, border: '1px solid var(--line)', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: b.isActive ? 'var(--led)' : 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: b.isActive ? '#fff' : 'var(--fg-3)', flexShrink: 0 }}>
                          {calcInitials(displayName)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500, lineHeight: 1.2 }}>{displayName}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', marginTop: 1 }}>{edits.role ?? b.role ?? 'Barbero'}</div>
                        </div>
                        <button
                          onClick={() => handleToggleBarberActive(b)}
                          style={{ padding: '0.4rem 0.625rem', minHeight: 36, borderRadius: 6, flexShrink: 0, border: `1px solid ${b.isActive ? 'rgba(109,187,109,0.4)' : 'var(--line)'}`, background: b.isActive ? 'rgba(109,187,109,0.08)' : 'transparent', color: b.isActive ? 'var(--ok)' : 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer' }}
                        >
                          {b.isActive ? 'Activo' : 'Baja'}
                        </button>
                        <button
                          onClick={() => setEditingBarberId(id => id === b.id ? null : b.id)}
                          style={{ padding: '0.4rem 0.625rem', minHeight: 36, borderRadius: 6, flexShrink: 0, border: `1px solid ${editingBarberId === b.id ? 'var(--led)' : 'var(--line)'}`, background: editingBarberId === b.id ? 'rgba(123,79,255,0.1)' : 'transparent', color: editingBarberId === b.id ? 'var(--led-soft)' : 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer' }}
                        >
                          Editar
                        </button>
                        <button onClick={() => setDeleteBarberTarget(b)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', minWidth: 32, minHeight: 32, borderRadius: 4, fontSize: 14, flexShrink: 0 }}>✕</button>
                      </div>

                      {editingBarberId === b.id && (
                        <div style={{ borderTop: '1px solid var(--line)', padding: '0.875rem', background: 'var(--bg-4)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {([
                              { field: 'fullName' as const, label: 'Nombre', type: 'text' },
                              { field: 'email' as const, label: 'Email', type: 'email' },
                              { field: 'phone' as const, label: 'Teléfono', type: 'tel' },
                            ]).map(({ field, label, type }) => (
                              <div key={field}>
                                <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>{label}</label>
                                <input type={type} value={String(edits[field] ?? b[field] ?? '')}
                                  onChange={e => handleBarberEditChange(b.id, field, e.target.value)}
                                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }} />
                              </div>
                            ))}
                            {/* Break time */}
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>Descanso (sin reservas)</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="time" value={String(edits.breakStart ?? b.breakStart ?? '')}
                                  onChange={e => handleBarberEditChange(b.id, 'breakStart', e.target.value || null as unknown as string)}
                                  style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }} />
                                <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>–</span>
                                <input type="time" value={String(edits.breakEnd ?? b.breakEnd ?? '')}
                                  onChange={e => handleBarberEditChange(b.id, 'breakEnd', e.target.value || null as unknown as string)}
                                  style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }} />
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>Rol</label>
                              {(() => {
                                const currentRole = String(edits.role ?? b.role ?? 'Barbero')
                                const options = BARBER_ROLES.includes(currentRole as typeof BARBER_ROLES[number])
                                  ? BARBER_ROLES
                                  : ([...BARBER_ROLES, currentRole] as readonly string[])
                                return (
                                  <select
                                    value={currentRole}
                                    onChange={e => handleBarberEditChange(b.id, 'role', e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }}
                                  >
                                    {options.map(r => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                )
                              })()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <SaveBtn onClick={() => handleSaveBarber(b)} loading={updateBarber.isPending} isDirty={!!barberEdits[b.id]} />
                            <button onClick={() => { setEditingBarberId(null); setBarberEdits(e => { const copy = { ...e }; delete copy[b.id]; return copy }) }} style={{ padding: '0.5rem 1rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {showBarberForm && (
                  <div style={{ background: 'var(--bg-3)', borderRadius: 10, border: '1px dashed var(--line)', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--led)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0 }}>
                        {calcInitials(newBarber.fullName) || '+'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>Nuevo barbero</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {([
                        { key: 'fullName' as const, label: 'Nombre *', type: 'text', ph: 'Ej: Ana García' },
                        { key: 'email' as const, label: 'Email', type: 'email', ph: 'ana@giobarber.es' },
                        { key: 'phone' as const, label: 'Teléfono', type: 'tel', ph: '6XX XX XX XX' },
                      ]).map(({ key, label, type, ph }) => (
                        <div key={key}>
                          <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>{label}</label>
                          <input type={type} value={newBarber[key]} onChange={e => setNewBarber(nb => ({ ...nb, [key]: e.target.value }))} placeholder={ph}
                            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }} />
                        </div>
                      ))}
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>Rol</label>
                        <select
                          value={newBarber.role}
                          onChange={e => setNewBarber(nb => ({ ...nb, role: e.target.value }))}
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }}
                        >
                          {BARBER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={handleAddBarber} disabled={!newBarber.fullName.trim()}
                        style={{ padding: '0.5rem 1rem', minHeight: 40, borderRadius: 8, border: 'none', background: newBarber.fullName.trim() ? 'var(--led)' : 'var(--bg-4)', color: newBarber.fullName.trim() ? '#fff' : 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: newBarber.fullName.trim() ? 'pointer' : 'default' }}>
                        Dar de alta
                      </button>
                      <button onClick={() => { setShowBarberForm(false); setNewBarber({ fullName: '', role: 'Barbero', email: '', phone: '' }) }}
                        style={{ padding: '0.5rem 1rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {!showBarberForm && (
                  <button onClick={() => setShowBarberForm(true)} style={{ alignSelf: 'flex-start', padding: '0.5rem 0.875rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
                    + Añadir barbero
                  </button>
                )}
              </div>

              <div style={{ height: 1, background: 'var(--line)', margin: '1.5rem 0' }} />
              <SectionTitle>OPCIONES DE RESERVA</SectionTitle>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div>
                  <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', fontWeight: 500 }}>Permitir elegir barbero</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                    {allowBarberChoice ? 'Los clientes pueden seleccionar barbero al reservar' : 'El sistema asignará barbero automáticamente'}
                  </div>
                </div>
                <button
                  onClick={handleToggleAllowBarber}
                  disabled={mutateBooking.isPending}
                  style={{ width: 44, height: 26, borderRadius: 13, border: 'none', cursor: mutateBooking.isPending ? 'default' : 'pointer', flexShrink: 0, background: allowBarberChoice ? 'var(--led)' : 'var(--bg-4)', position: 'relative', transition: 'background 0.2s', boxShadow: allowBarberChoice ? 'var(--glow-led)' : 'none', opacity: mutateBooking.isPending ? 0.6 : 1 }}
                  aria-label="Toggle allow barber choice"
                >
                  <span style={{ position: 'absolute', top: 3, left: allowBarberChoice ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                </button>
              </div>
              {sectionError.barberos && (
                <p style={{ color: 'var(--danger)', fontSize: 12, fontFamily: 'var(--font-ui)', marginTop: 8, marginBottom: 0 }}>{sectionError.barberos}</p>
              )}
            </div>
          )}

          {/* === FIDELIZACIÓN === */}
          {section === 'fidelizacion' && (
            <div>
              <SectionTitle>RECOMPENSAS</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rewardsData.map(r => (
                  editingRewardId === r.id ? (
                    <div key={r.id} style={{ background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--led)', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>Nombre</label>
                          <input
                            value={rewardEdits[r.id]?.label ?? r.label}
                            onChange={e => setRewardEdits(ed => ({ ...ed, [r.id]: { label: e.target.value, cost: ed[r.id]?.cost ?? r.cost } }))}
                            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>Puntos</label>
                          <input
                            type="number"
                            value={rewardEdits[r.id]?.cost ?? r.cost}
                            onChange={e => setRewardEdits(ed => ({ ...ed, [r.id]: { label: ed[r.id]?.label ?? r.label, cost: Number(e.target.value) } }))}
                            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', textAlign: 'center' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <SaveBtn onClick={() => handleSaveReward(r)} loading={updateRewardMut.isPending} isDirty={!!rewardEdits[r.id]} />
                        <button
                          onClick={() => { setEditingRewardId(null); setRewardEdits(e => { const c = { ...e }; delete c[r.id]; return c }) }}
                          style={{ padding: '0.5rem 1rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                      <div style={{ flex: 1, fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)' }}>{r.label}</div>
                      <span style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>{r.cost} pts</span>
                      <button
                        onClick={() => setEditingRewardId(r.id)}
                        style={{ padding: '0.3rem 0.6rem', minHeight: 32, borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
                      >
                        Editar
                      </button>
                      <button onClick={() => deleteReward.mutate(r.id, { onError: (e) => { if (import.meta.env.DEV) console.error(e); setSecError('fidelizacion', 'No se pudo eliminar la recompensa. Revisa tu conexión.') } })} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, minWidth: 32, minHeight: 32, flexShrink: 0 }}>✕</button>
                    </div>
                  )
                ))}
              </div>
              <button onClick={handleAddReward} style={{ marginTop: '0.75rem', padding: '0.5rem 0.875rem', minHeight: 40, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
                + Añadir recompensa
              </button>
              {sectionError.fidelizacion && (
                <p style={{ color: 'var(--danger)', fontSize: 12, fontFamily: 'var(--font-ui)', marginTop: 8, marginBottom: 0 }}>{sectionError.fidelizacion}</p>
              )}
            </div>
          )}

          {/* === BARBERÍA === */}
          {section === 'barberia' && (
            <div>
              <SectionTitle>DATOS DE LA BARBERÍA</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                {([
                  { key: 'name' as const, label: 'Nombre' },
                  { key: 'phone' as const, label: 'Teléfono' },
                  { key: 'email' as const, label: 'Email' },
                  { key: 'instagram' as const, label: 'Instagram' },
                  { key: 'address' as const, label: 'Dirección' },
                ]).map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1 md:grid md:grid-cols-[160px_1fr] md:items-center md:gap-3">
                    <label style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)' }}>{label}</label>
                    <input value={localShop[key]} onChange={e => setShopEdits(s => ({ ...s, [key]: e.target.value }))}
                      style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.5rem 0.6rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div className="flex flex-col gap-1 md:grid md:grid-cols-[160px_1fr] md:items-start md:gap-3">
                  <label style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-2)', paddingTop: 6 }}>Descripción</label>
                  <textarea value={localShop.description} onChange={e => setShopEdits(s => ({ ...s, description: e.target.value }))} rows={3}
                    style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.5rem 0.6rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, resize: 'vertical', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <SaveBtn onClick={handleSaveShopInfo} loading={mutateShopInfo.isPending} isDirty={Object.keys(shopEdits).length > 0} />
              {sectionError.barberia && (
                <p style={{ color: 'var(--danger)', fontSize: 12, fontFamily: 'var(--font-ui)', marginTop: 6, marginBottom: 0 }}>{sectionError.barberia}</p>
              )}
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
                <button onClick={toggleTheme}
                  style={{ padding: '0.6rem 1rem', minHeight: 44, borderRadius: 8, flexShrink: 0, border: '1px solid var(--line)', background: 'var(--bg-4)', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
                  Cambiar a {theme === 'dark' ? 'claro' : 'oscuro'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteServiceTarget && (
        <ConfirmDialog
          title="Eliminar servicio"
          message={`¿Eliminar "${deleteServiceTarget.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={handleConfirmDeleteService}
          onCancel={() => setDeleteServiceTarget(null)}
        />
      )}

      {deleteBarberTarget && (
        <ConfirmDialog
          title="Dar de baja a barbero"
          message={`¿Dar de baja a ${deleteBarberTarget.fullName}? Quedará inactivo y no aparecerá en el sistema de reservas. Sus citas existentes no se verán afectadas.`}
          confirmLabel="Dar de baja"
          danger
          onConfirm={handleConfirmDeleteBarber}
          onCancel={() => setDeleteBarberTarget(null)}
        />
      )}

      {pendingNavSection !== null && (
        <DirtyGuardDialog
          onSave={() => {
            saveSection(section)
            discardSection(section)
            setSection(pendingNavSection)
            setPendingNavSection(null)
          }}
          onDiscard={() => {
            discardSection(section)
            setSection(pendingNavSection)
            setPendingNavSection(null)
          }}
          onCancel={() => setPendingNavSection(null)}
        />
      )}
    </>
  )
}
