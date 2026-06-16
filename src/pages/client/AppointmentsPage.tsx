import { useState, useMemo, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useShopContext } from '@/context/ShopContext'
import { getMaxBookingDate } from '@/domain/booking'
import { canCancelAppointment } from '@/domain/appointment'
import type { Appointment } from '@/domain/appointment'
import { DEFAULT_WEEKLY_SCHEDULE, type DayKey } from '@/domain/schedule'
import { LoyaltyCard } from '@/components/loyalty'
import { Modal, ConfirmDialog, InfoButton } from '@/components/ui'
import { MonthCalendar, TimeSlots, generateScheduleSlots } from '@/components/calendar'
import { useAuthStore } from '@/stores/authStore'
import {
  useClientAppointments,
  useClientHistoryAppointments,
  useAllAppointments,
  useCancelAppointment,
  useUpdateAppointment,
} from '@/hooks/useAppointments'
import { useServices } from '@/hooks/useServices'
import { useBarbers } from '@/hooks/useBarbers'
import { useWeeklySchedule } from '@/hooks/useSchedule'
import { useLoyaltyCard, useRewards, useRedeemedRewardIds, useRedeemReward } from '@/hooks/useLoyalty'
import { useLoyaltyConfig } from '@/hooks/useShopConfig'
import type { Reward } from '@/domain/loyalty'
import type { Service } from '@/domain/service'
import type { Barber } from '@/domain/barber'

const JS_TO_DAY: Record<number, DayKey> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
function fmtHistoryDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const CARD = 'bg-[var(--bg-2)] border border-[var(--line)] rounded-xl p-4 md:p-5'
const SECTION_LABEL = 'font-[var(--font-display)] text-[13px] tracking-widest text-[var(--fg-3)] mb-3.5'

// ── sessionStorage cache utilities ────────────────────────────────────────────

const CACHE_VERSION = 'v1'
const CACHE_TTL_MS  = 10 * 60 * 1000 // 10 min

function apptCacheKey(uid: string) { return `appts_${CACHE_VERSION}_${uid}` }

function readApptCache(uid: string): Appointment[] | undefined {
  try {
    const raw = sessionStorage.getItem(apptCacheKey(uid))
    if (!raw) return undefined
    const { data, ts } = JSON.parse(raw) as { data: Appointment[]; ts: number }
    return Date.now() - ts < CACHE_TTL_MS ? data : undefined
  } catch { return undefined }
}

function writeApptCache(uid: string, data: Appointment[]) {
  try { sessionStorage.setItem(apptCacheKey(uid), JSON.stringify({ data, ts: Date.now() })) }
  catch { /* sessionStorage full or blocked */ }
}

// ── AppointmentHistory ────────────────────────────────────────────────────────

type HistoryFilter = 'all' | 'completed' | 'cancelled'

function AppointmentHistory({ userId, services, barbers, fill }: {
  userId: string | undefined
  services: Service[]
  barbers: Barber[]
  fill?: boolean
}) {
  const [open,          setOpen]          = useState(false)
  const [filterStatus,  setFilterStatus]  = useState<HistoryFilter>('all')
  const [filterFrom,    setFilterFrom]    = useState('')
  const [filterTo,      setFilterTo]      = useState('')
  const [filterService, setFilterService] = useState('')

  // Lazy: only fetches when the accordion is opened for the first time
  const { data: appointments = [], isLoading } = useClientHistoryAppointments(userId, open)

  const history = useMemo(() =>
    appointments
      .filter(a => a.status === 'completed')
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    [appointments],
  )

  const cancelled = useMemo(() =>
    appointments
      .filter(a => a.status === 'cancelled')
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    [appointments],
  )

  // Unique service names present in the history for the dropdown
  const availableServices = useMemo(() => {
    const names = new Set<string>()
    ;[...history, ...cancelled].forEach(a => {
      const name = services.find(s => s.id === a.serviceId)?.name
      if (name) names.add(name)
    })
    return Array.from(names).sort()
  }, [history, cancelled, services])

  // All filters applied client-side — no DB calls
  const filtered = useMemo(() => {
    const base =
      filterStatus === 'completed' ? history :
      filterStatus === 'cancelled' ? cancelled :
      [...history, ...cancelled].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

    return base
      .filter(a => !filterFrom    || a.startTime >= filterFrom)
      .filter(a => !filterTo      || a.startTime <= filterTo + 'T23:59:59')
      .filter(a => !filterService || services.find(s => s.id === a.serviceId)?.name === filterService)
      .slice(0, 50)
  }, [history, cancelled, filterStatus, filterFrom, filterTo, filterService, services])

  const total = history.length + cancelled.length
  const hasActiveFilter = filterFrom || filterTo || filterStatus !== 'all' || filterService
  const clearFilters = () => { setFilterStatus('all'); setFilterFrom(''); setFilterTo(''); setFilterService('') }

  // fill+open: stretches to fill remaining column height (aligns with loyalty card)
  // fill+closed: compact natural height (just the header)
  const cardStyle: React.CSSProperties = {
    padding: 0,
    overflow: 'hidden',
    ...(fill
      ? { display: 'flex', flexDirection: 'column', ...(open ? { flex: 1, minHeight: 0 } : {}) }
      : {}),
  }

  return (
    <div className={CARD} style={cardStyle}>
      {/* ── Header / accordion toggle ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <div className={SECTION_LABEL} style={{ marginBottom: 0 }}>HISTORIAL</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          {total > 0 && (
            <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
              {total} cita{total !== 1 ? 's' : ''}
            </span>
          )}
          <div style={{
            width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: open ? 'var(--bg-3)' : 'transparent', transition: 'all 0.15s', flexShrink: 0,
          }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--fg-3)" strokeWidth="1.5"
              style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', flex: fill ? 1 : undefined, minHeight: 0 }}>
          <>
              {/* ── Filters ── */}
              <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line)', background: 'var(--bg-3)', display: 'flex', flexDirection: 'column', gap: '0.625rem', flexShrink: 0 }}>
                {/* Segmented control: status */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, gap: 2 }}>
                  {(['all', 'completed', 'cancelled'] as const).map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)} style={{
                      flex: 1, padding: '0.375rem 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontFamily: 'var(--font-ui)', fontWeight: filterStatus === s ? 600 : 400,
                      background: filterStatus === s ? 'var(--bg-2)' : 'transparent',
                      color: filterStatus === s ? 'var(--gold)' : 'var(--fg-3)',
                      transition: 'all 0.12s',
                      boxShadow: filterStatus === s ? '0 1px 4px rgba(0,0,0,0.35)' : 'none',
                    }}>
                      {s === 'all' ? 'Todas' : s === 'completed' ? 'Completadas' : 'Canceladas'}
                    </button>
                  ))}
                </div>

                {/* Row: service select + date range + clear */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {/* Service dropdown */}
                  <select
                    value={filterService}
                    onChange={e => setFilterService(e.target.value)}
                    style={{
                      flex: '1 1 120px', minWidth: 0, background: 'var(--bg-4)', border: '1px solid var(--line)',
                      borderRadius: 6, padding: '0.3rem 0.5rem', color: filterService ? 'var(--fg-1)' : 'var(--fg-4)',
                      fontSize: 12, fontFamily: 'var(--font-ui)', outline: 'none', cursor: 'pointer',
                    }}
                  >
                    <option value="">Servicio</option>
                    {availableServices.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>

                  {/* Date range */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '2 1 200px', minWidth: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} title="Desde"
                      style={{ flex: 1, minWidth: 0, background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.3rem 0.4rem', color: filterFrom ? 'var(--fg-1)' : 'var(--fg-4)', fontSize: 11, fontFamily: 'var(--font-ui)', outline: 'none' }} />
                    <span style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>–</span>
                    <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} title="Hasta"
                      style={{ flex: 1, minWidth: 0, background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.3rem 0.4rem', color: filterTo ? 'var(--fg-1)' : 'var(--fg-4)', fontSize: 11, fontFamily: 'var(--font-ui)', outline: 'none' }} />
                  </div>

                  {/* Clear button */}
                  <button onClick={clearFilters} title="Limpiar filtros" style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 6, border: '1px solid transparent',
                    background: hasActiveFilter ? 'rgba(192,64,64,0.1)' : 'transparent',
                    color: hasActiveFilter ? 'var(--danger)' : 'var(--fg-4)',
                    cursor: hasActiveFilter ? 'pointer' : 'default',
                    opacity: hasActiveFilter ? 1 : 0.3, transition: 'all 0.12s',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── List ── */}
              <div style={{ overflowY: 'auto', flex: fill ? 1 : undefined, maxHeight: fill ? undefined : 420 }}>
                {isLoading ? (
                  <div style={{ padding: '2rem 1.5rem', color: 'var(--fg-3)', fontSize: 13, fontFamily: 'var(--font-ui)', textAlign: 'center' }}>
                    Cargando historial…
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: '2rem 1.5rem', color: 'var(--fg-3)', fontSize: 13, fontFamily: 'var(--font-ui)', textAlign: 'center' }}>
                    Sin resultados para estos filtros
                  </div>
                ) : (
                  filtered.map((h, i) => {
                    const svc      = services.find(s => s.id === h.serviceId)
                    const brb      = barbers.find(b => b.id === h.barberId)
                    const isCancld = h.status === 'cancelled'
                    return (
                      <div key={h.id} style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.875rem 1.5rem',
                        borderBottom: i < filtered.length - 1 ? '1px solid var(--line)' : undefined,
                        opacity: isCancld ? 0.5 : 1,
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: isCancld ? 'rgba(192,64,64,0.08)' : 'rgba(201,162,74,0.1)',
                          border: `1.5px solid ${isCancld ? 'rgba(192,64,64,0.2)' : 'rgba(201,162,74,0.25)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isCancld ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {svc?.name ?? '—'}
                          </div>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {fmtHistoryDate(h.startTime)}{brb ? ` · ${brb.fullName}` : ''}
                          </div>
                        </div>
                        {isCancld ? (
                          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--danger)', border: '1px solid rgba(192,64,64,0.3)', borderRadius: 4, padding: '0.2rem 0.5rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                            cancelada
                          </span>
                        ) : (
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {h.finalPrice != null && svc && h.finalPrice !== svc.price ? (
                              <>
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--fg-3)', textDecoration: 'line-through', letterSpacing: '0.02em' }}>
                                  {svc.price}€
                                </div>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--gold)', letterSpacing: '0.02em' }}>
                                  {h.finalPrice}€
                                </div>
                              </>
                            ) : (
                              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--fg-0)', letterSpacing: '0.02em' }}>
                                {svc ? `${svc.price}€` : '—'}
                              </div>
                            )}
                            {svc && (
                              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--gold)', marginTop: 1 }}>
                                +{svc.loyaltyPoints} pts
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </>
        </div>
      )}
    </div>
  )
}

// ── AppointmentsPage ──────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const navigate = useNavigate()
  const { name: shopName, maxAdvanceDays } = useShopContext()
  const maxDate = getMaxBookingDate(maxAdvanceDays)
  const user = useAuthStore(s => s.user)

  // Data hooks — sessionStorage initialData prevents a DB round-trip on page reload
  const { data: appointments = [] }  = useClientAppointments(user?.id, {
    initialData: user?.id ? readApptCache(user.id) : undefined,
  })
  const { data: allAppointments = [] } = useAllAppointments()
  const { data: services = [] }      = useServices()
  const { data: barbers = [] }       = useBarbers()
  const { data: schedule = DEFAULT_WEEKLY_SCHEDULE } = useWeeklySchedule()
  const { data: loyaltyCard }        = useLoyaltyCard(user?.id)
  const { data: rewards = [] }       = useRewards()
  const { data: redeemedIds = [] }   = useRedeemedRewardIds(user?.id)
  const { data: loyaltyConfig }      = useLoyaltyConfig()

  // Mutations
  const cancelMutation   = useCancelAppointment()
  const updateMutation   = useUpdateAppointment()
  const redeemMutation   = useRedeemReward()

  // Persist appointments to sessionStorage so page reload skips the DB round-trip
  useEffect(() => {
    if (user?.id && appointments.length > 0) writeApptCache(user.id, appointments)
  }, [appointments, user?.id])

  // ── Derived lists ────────────────────────────────────────────────────────────

  const upcoming = useMemo(() => {
    const nowMs = new Date().getTime()
    return appointments
      .filter(a => a.status === 'confirmed' && new Date(a.startTime).getTime() >= nowMs)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [appointments])

  const next        = upcoming[0] ?? null
  const nextService = next ? services.find(s => s.id === next.serviceId) ?? null : null
  const nextBarber  = next ? barbers.find(b => b.id === next.barberId)  ?? null : null
  const canCancel   = next ? canCancelAppointment(next.startTime) : false

  const loyaltyPoints     = loyaltyCard?.points      ?? 0
  const loyaltyStamps     = loyaltyCard?.totalVisits ?? 0
  const loyaltyMemberCode = loyaltyCard?.memberCode  ?? '—'
  // target: in tiers mode, use max tier minPoints; in simple mode, use highest reward cost
  const loyaltyTarget = useMemo(() => {
    if (loyaltyConfig?.mode === 'tiers' && (loyaltyConfig.tiers?.length ?? 0) > 0) {
      return Math.max(...loyaltyConfig.tiers.map(t => t.minPoints), 100)
    }
    return rewards.length > 0 ? Math.max(...rewards.map(r => r.cost)) : 100
  }, [loyaltyConfig, rewards])

  const loyaltyRewardsData = useMemo(() => {
    // Tiers mode: show rewards from all tiers the user has reached (from config)
    if (loyaltyConfig?.mode === 'tiers' && (loyaltyConfig.tiers?.length ?? 0) > 0) {
      const sorted = [...loyaltyConfig.tiers].sort((a, b) => a.minPoints - b.minPoints)
      const reachedTiers = sorted.filter(t => loyaltyPoints >= t.minPoints)
      return reachedTiers.flatMap(tier =>
        tier.rewards.map(r => {
          const permanent = r.isPermanent ?? false
          const redeemed = !permanent && redeemedIds.includes(r.id)
          return {
            id: r.id,
            label: r.label,
            cost: r.cost,
            redeemed,
            canRedeem: permanent || (loyaltyPoints >= r.cost && !redeemed),
          }
        }),
      )
    }

    // Simple mode
    const isRepeatable = (loyaltyConfig?.rewardMode ?? 'one_time') === 'repeatable'
    return rewards.filter(r => r.isActive).map(r => {
      const isRedeemed = !isRepeatable && redeemedIds.includes(r.id)
      return {
        id: r.id,
        label: r.label,
        cost: r.cost,
        redeemed: isRedeemed,
        canRedeem: loyaltyPoints >= r.cost && !isRedeemed,
      }
    })
  }, [rewards, loyaltyConfig, redeemedIds, loyaltyPoints])

  // ── UI state ─────────────────────────────────────────────────────────────────

  const [cancelOpen,    setCancelOpen]    = useState(false)
  const [redeemTarget,  setRedeemTarget]  = useState<Reward | null>(null)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null)
  const [rescheduleSlot, setRescheduleSlot] = useState<string | null>(null)
  const [rescheduleMonth, setRescheduleMonth] = useState(() => new Date().getMonth())
  const [rescheduleYear,  setRescheduleYear]  = useState(() => new Date().getFullYear())
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const closeReschedule = () => {
    setRescheduleOpen(false)
    setRescheduleDate(null)
    setRescheduleSlot(null)
    setRescheduleError(null)
  }

  // ── Reschedule: schedule + conflict data ─────────────────────────────────────

  const closedDayOfWeeks = useMemo(() => {
    const M: Record<DayKey, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 }
    return (Object.entries(schedule) as [DayKey, { open: boolean }][])
      .filter(([, d]) => !d.open).map(([k]) => M[k])
  }, [schedule])

  const { reschFromTime, reschToTime } = useMemo(() => {
    if (!rescheduleDate) return { reschFromTime: '10:00', reschToTime: '19:00' }
    const key = JS_TO_DAY[rescheduleDate.getDay()]
    const day = (schedule as Record<string, { from?: string; to?: string; open?: boolean }>)[key]
    return { reschFromTime: day?.from ?? '10:00', reschToTime: day?.to ?? '19:00' }
  }, [rescheduleDate, schedule])

  const rescheduleTaken = useMemo(() => {
    if (!rescheduleDate || !next || !nextService) return []
    const dateStr  = rescheduleDate.toISOString().slice(0, 10)
    const dayAppts = allAppointments.filter(a =>
      a.status === 'confirmed' &&
      a.barberId === next.barberId &&
      a.id !== next.id &&
      new Date(a.startTime).toISOString().slice(0, 10) === dateStr,
    )
    if (!dayAppts.length) return []
    return generateScheduleSlots(reschFromTime, reschToTime).filter(slot => {
      const [h, m] = slot.split(':').map(Number)
      const s = new Date(rescheduleDate); s.setHours(h, m, 0, 0)
      const e = new Date(s.getTime() + nextService.durationMinutes * 60_000)
      return dayAppts.some(a => new Date(a.startTime) < e && new Date(a.endTime) > s)
    })
  }, [rescheduleDate, next, nextService, allAppointments, reschFromTime, reschToTime])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCancel = () => {
    if (!next) return
    cancelMutation.mutate(next.id, { onSuccess: () => { setCancelOpen(false); showToast('Cita cancelada') } })
  }

  const handleRescheduleConfirm = () => {
    if (!next || !rescheduleDate || !rescheduleSlot || !nextService) return
    setRescheduleError(null)
    const [h, m] = rescheduleSlot.split(':').map(Number)
    const start = new Date(rescheduleDate)
    start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + nextService.durationMinutes * 60_000)
    updateMutation.mutate(
      {
        id: next.id,
        data: {
          startTime: start.toISOString(),
          endTime:   end.toISOString(),
          barberId:  next.barberId,
          serviceId: next.serviceId,
        },
      },
      {
        onSuccess: () => { closeReschedule(); showToast('✓ Cita reprogramada correctamente') },
        onError:   () => setRescheduleError('No se pudo reprogramar. Inténtalo de nuevo.'),
      },
    )
  }

  const handleRedeemById = (id: string) => {
    const reward = rewards.find(r => r.id === id)
    if (reward) setRedeemTarget(reward)
  }

  const handleRedeem = () => {
    if (!redeemTarget || !user) return
    redeemMutation.mutate(
      { clientId: user.id, rewardId: redeemTarget.id },
      { onSuccess: () => setRedeemTarget(null) },
    )
  }

  // ── Sections ─────────────────────────────────────────────────────────────────

  const proximaSection = next && nextService && nextBarber ? (
    <div className="rounded-xl p-4 md:p-6" style={{
      background: 'linear-gradient(135deg, rgba(123,79,255,0.12) 0%, rgba(123,79,255,0.04) 100%)',
      border: '1px solid rgba(123,79,255,0.25)',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.15em', color: 'var(--led-soft)', marginBottom: '0.75rem' }}>
        PRÓXIMA CITA
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, color: 'var(--fg-0)', lineHeight: 1, marginBottom: 4 }}>
        {fmtTime(next.startTime)}
      </div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--fg-1)', marginBottom: '1.25rem' }}>
        {fmtDate(next.startTime)}
      </div>

      <div className="flex flex-wrap gap-4 md:gap-6" style={{ marginBottom: '1.25rem' }}>
        {[
          { label: 'Servicio',   value: nextService.name },
          { label: 'Empleado',   value: nextBarber.fullName },
          { label: 'Duración',  value: `${nextService.durationMinutes} min` },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ fontSize: 14, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontWeight: 600, marginTop: 2 }}>{value}</div>
          </div>
        ))}
        <div>
          <div style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Precio</div>
          {next.finalPrice != null && next.finalPrice !== nextService.price ? (
            <div style={{ marginTop: 2 }}>
              <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textDecoration: 'line-through', marginRight: 6 }}>{nextService.price}€</span>
              <span style={{ fontSize: 14, color: 'var(--gold)', fontFamily: 'var(--font-ui)', fontWeight: 700 }}>{next.finalPrice}€</span>
            </div>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontWeight: 600, marginTop: 2 }}>{nextService.price}€</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => setRescheduleOpen(true)}
          style={{
            flex: 1, padding: '0.75rem', minHeight: 44, borderRadius: 8,
            border: '1px solid var(--line)', background: 'transparent',
            color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer',
          }}
        >
          Reprogramar
        </button>
        <button
          onClick={() => canCancel && setCancelOpen(true)}
          disabled={!canCancel || cancelMutation.isPending}
          title={!canCancel ? 'No se puede cancelar con menos de 2 h de antelación' : undefined}
          style={{
            flex: 1, padding: '0.75rem', minHeight: 44, borderRadius: 8,
            border: canCancel ? '1px solid rgba(192,64,64,0.4)' : '1px solid var(--line)',
            background: canCancel ? 'rgba(192,64,64,0.08)' : 'var(--bg-3)',
            color: canCancel ? 'var(--danger)' : 'var(--fg-3)',
            fontFamily: 'var(--font-ui)', fontSize: 13,
            cursor: canCancel && !cancelMutation.isPending ? 'pointer' : 'not-allowed',
            opacity: cancelMutation.isPending ? 0.6 : 1,
          }}
        >
          {cancelMutation.isPending ? 'Cancelando…' : 'Cancelar cita'}
        </button>
      </div>

      {!canCancel && (
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--fg-3)', marginTop: '0.5rem', textAlign: 'center' }}>
          No se puede cancelar con menos de 2 h de antelación
        </p>
      )}
    </div>
  ) : (
    <div className={CARD} style={{ textAlign: 'center', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--fg-3)', letterSpacing: '0.06em' }}>
        SIN CITAS PRÓXIMAS
      </div>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-3)', margin: 0 }}>
        Reserva tu próxima visita cuando quieras
      </p>
      <button
        onClick={() => navigate('/calendar')}
        style={{
          padding: '0.75rem 2rem', borderRadius: 8, border: 'none',
          background: 'var(--gold)', color: '#000',
          fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(201,162,74,0.25)',
        }}
      >
        Reservar nueva cita
      </button>
    </div>
  )

  const loyaltySectionDesktop = (
    <LoyaltyCard
      points={loyaltyPoints}
      target={loyaltyTarget}
      stamps={loyaltyStamps}
      memberCode={loyaltyMemberCode}
      rewards={loyaltyRewardsData}
      onRedeem={handleRedeemById}
      redeemPending={redeemMutation.isPending}
      createdAt={loyaltyCard?.createdAt}
      completedCycles={loyaltyCard?.completedCycles}
      loyaltyMode={loyaltyConfig?.mode}
      configTiers={loyaltyConfig?.tiers}
      maxPoints={loyaltyConfig?.maxPoints}
      fill
    />
  )

  const loyaltySectionMobile = (
    <LoyaltyCard
      points={loyaltyPoints}
      target={loyaltyTarget}
      stamps={loyaltyStamps}
      memberCode={loyaltyMemberCode}
      rewards={loyaltyRewardsData}
      onRedeem={handleRedeemById}
      redeemPending={redeemMutation.isPending}
      createdAt={loyaltyCard?.createdAt}
      completedCycles={loyaltyCard?.completedCycles}
      loyaltyMode={loyaltyConfig?.mode}
      configTiers={loyaltyConfig?.tiers}
      maxPoints={loyaltyConfig?.maxPoints}
    />
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <Helmet><title>Mis citas — {shopName}</title></Helmet>

      {/* Toast */}
      {toast && (
        <div className="fixed top-18 right-3 z-200 md:top-6 md:right-6"
          style={{ background: 'var(--ok)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, boxShadow: 'var(--shadow-md)', transition: 'opacity 0.3s' }}>
          {toast}
        </div>
      )}

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '0.5rem', paddingRight: '0.5rem', marginBottom: '0.75rem', maxWidth: 1280, width: '100%', marginLeft: 'auto', marginRight: 'auto' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)' }}>MIS CITAS</span>
        <InfoButton
          title="GUÍA — MIS CITAS"
          items={[
            { icon: '📅', label: 'Próxima cita', description: 'Aquí ves tu próxima cita. Puedes cancelarla (hasta 2 h antes) o reprogramarla a otra fecha y hora.' },
            { icon: '🎫', label: 'Tarjeta de fidelización', description: 'Acumulas puntos en cada visita. Pulsa el QR para ampliarlo y facilitar el escaneo en la barbería.' },
            { icon: '🏅', label: 'Niveles', description: 'Cuantos más puntos acumulas, más alto es tu nivel: Cobre → Bronce → Plata → Oro → Platino…' },
            { icon: '🎁', label: 'Recompensas', description: 'Cuando tengas puntos suficientes, pulsa "Canjear" en la recompensa deseada para activarla.' },
            { icon: '🕒', label: 'Historial', description: 'Registro de tus citas pasadas. Filtra por estado, servicio o fechas.' },
          ]}
        />
      </div>

      {/* ── DESKTOP: 2 columns, left = proxima+historial, right = loyalty ── */}
      <div
        className="hidden lg:grid"
        style={{
          gridTemplateColumns: '1fr 0.85fr',
          columnGap: '2rem',
          height: 'calc(100dvh - 155px)',
          overflow: 'hidden',
          paddingLeft: '0.5rem',
          paddingRight: '0.5rem',
          maxWidth: 1280,
          width: '100%',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {/* Left: proxima (shrink) + historial (fills remaining, aligns with loyalty card) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ flexShrink: 0 }}>{proximaSection}</div>
          <AppointmentHistory userId={user?.id} services={services} barbers={barbers} fill />
        </div>

        {/* Right: loyalty card fills full column height */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {loyaltySectionDesktop}
        </div>
      </div>

      {/* ── MOBILE: stacked ── */}
      <div className="flex flex-col gap-4 lg:hidden" style={{ paddingBottom: '5rem' }}>
        {proximaSection}
        <div>
          <div className={SECTION_LABEL}>TARJETA DE FIDELIZACIÓN</div>
          {loyaltySectionMobile}
        </div>
        <AppointmentHistory userId={user?.id} services={services} barbers={barbers} />
      </div>

      {/* ── Cancel confirmation ── */}
      {cancelOpen && next && (
        <ConfirmDialog
          title="Cancelar cita"
          message={`¿Seguro que quieres cancelar tu cita del ${fmtDate(next.startTime)}? Esta acción no se puede deshacer.`}
          confirmLabel={cancelMutation.isPending ? 'Cancelando…' : 'Sí, cancelar'}
          danger
          onConfirm={handleCancel}
          onCancel={() => setCancelOpen(false)}
        />
      )}

      {/* ── Redeem reward confirmation ── */}
      {redeemTarget && (
        <ConfirmDialog
          title="Canjear recompensa"
          message={`¿Quieres canjear "${redeemTarget.label}" por ${redeemTarget.cost} puntos?`}
          confirmLabel="Canjear"
          onConfirm={handleRedeem}
          onCancel={() => setRedeemTarget(null)}
        />
      )}

      {/* ── Reschedule modal ── */}
      {rescheduleOpen && next && nextService && nextBarber && (
        <Modal onClose={closeReschedule} title="Reprogramar cita">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <div style={{ padding: '0.875rem 1rem', borderRadius: 10, background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.375rem' }}>
                Cita actual
              </p>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--fg-0)', fontWeight: 600, margin: '0 0 0.25rem' }}>
                {fmtDate(next.startTime)} · {fmtTime(next.startTime)}
              </p>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-2)', margin: 0 }}>
                {nextService.name} · {nextBarber.fullName} · {nextService.durationMinutes} min
              </p>
            </div>

            <div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', color: 'var(--gold)', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>
                Nueva fecha
              </p>
              <MonthCalendar
                selected={rescheduleDate}
                onSelect={d => {
                  if (d <= maxDate && !closedDayOfWeeks.includes((d.getDay() + 6) % 7)) {
                    setRescheduleDate(d)
                    setRescheduleSlot(null)
                  }
                }}
                month={rescheduleMonth}
                year={rescheduleYear}
                onMonthChange={(m, y) => { setRescheduleMonth(m); setRescheduleYear(y) }}
                minDate={new Date()}
                maxDate={maxDate}
                closedDayOfWeeks={closedDayOfWeeks}
              />
            </div>

            {rescheduleDate && (
              <div>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', color: 'var(--gold)', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>
                  Nuevo horario
                </p>
                <TimeSlots
                  selected={rescheduleSlot}
                  onSelect={setRescheduleSlot}
                  taken={rescheduleTaken}
                  fromTime={reschFromTime}
                  toTime={reschToTime}
                />
              </div>
            )}

            {rescheduleError && (
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--danger)', textAlign: 'center', margin: 0 }}>
                {rescheduleError}
              </p>
            )}

            <button
              disabled={!rescheduleDate || !rescheduleSlot || updateMutation.isPending}
              onClick={handleRescheduleConfirm}
              style={{
                width: '100%', padding: '0.875rem', minHeight: 48, borderRadius: 8, border: 'none',
                background: rescheduleDate && rescheduleSlot ? 'var(--gold)' : 'var(--bg-4)',
                color:      rescheduleDate && rescheduleSlot ? '#000'       : 'var(--fg-3)',
                fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700,
                cursor: rescheduleDate && rescheduleSlot && !updateMutation.isPending ? 'pointer' : 'default',
                boxShadow: rescheduleDate && rescheduleSlot ? '0 4px 16px rgba(201,162,74,0.25)' : 'none',
                transition: 'all 0.15s', opacity: updateMutation.isPending ? 0.7 : 1,
              }}
            >
              {updateMutation.isPending ? 'Guardando…' : 'Confirmar nueva fecha'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
