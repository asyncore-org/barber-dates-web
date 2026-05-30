import { useState, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useShopContext } from '@/context/ShopContext'
import { getMaxBookingDate } from '@/domain/booking'
import { canCancelAppointment } from '@/domain/appointment'
import type { Appointment } from '@/domain/appointment'
import { DEFAULT_WEEKLY_SCHEDULE, type DayKey } from '@/domain/schedule'
import { LoyaltyCard } from '@/components/loyalty'
import { Modal, ConfirmDialog } from '@/components/ui'
import { MonthCalendar, TimeSlots, generateScheduleSlots } from '@/components/calendar'
import { useAuthStore } from '@/stores/authStore'
import {
  useClientAppointments,
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

// ── AppointmentHistory ────────────────────────────────────────────────────────

type HistoryFilter = 'all' | 'completed' | 'cancelled'

function AppointmentHistory({ appointments, services, barbers }: {
  appointments: Appointment[]
  services: Service[]
  barbers: Barber[]
}) {
  const [open,         setOpen]         = useState(false)
  const [loaded,       setLoaded]       = useState(false)
  const [filterStatus, setFilterStatus] = useState<HistoryFilter>('all')
  const [filterFrom,   setFilterFrom]   = useState('')
  const [filterTo,     setFilterTo]     = useState('')

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

  const filtered = useMemo(() => {
    const base =
      filterStatus === 'completed' ? history :
      filterStatus === 'cancelled' ? cancelled :
      [...history, ...cancelled].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

    return base
      .filter(a => !filterFrom || a.startTime >= filterFrom)
      .filter(a => !filterTo   || a.startTime <= filterTo + 'T23:59:59')
      .slice(0, 50)
  }, [history, cancelled, filterStatus, filterFrom, filterTo])

  const total = history.length + cancelled.length

  return (
    <div className={CARD} style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.9rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div className={SECTION_LABEL} style={{ marginBottom: 0 }}>HISTORIAL</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {loaded && total > 0 && (
            <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>
              {total} cita{total !== 1 ? 's' : ''}
            </span>
          )}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--fg-3)" strokeWidth="1.5"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
            <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--line)' }}>
          {!loaded ? (
            /* ── Prompt to load ── */
            <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-3)', margin: 0, textAlign: 'center' }}>
                El historial no se carga automáticamente.
              </p>
              <button
                onClick={() => setLoaded(true)}
                style={{
                  padding: '0.5rem 1.5rem', minHeight: 40, borderRadius: 8,
                  border: '1px solid var(--line)', background: 'var(--bg-3)',
                  color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer',
                }}
              >Solicitar historial</button>
            </div>
          ) : (
            <>
              {/* ── Filters ── */}
              <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--line)', background: 'var(--bg-3)' }}>
                {(['all', 'completed', 'cancelled'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    style={{
                      padding: '0.2rem 0.6rem', borderRadius: 20, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontFamily: 'var(--font-ui)',
                      background: filterStatus === s ? 'var(--gold)' : 'var(--bg-4)',
                      color: filterStatus === s ? '#000' : 'var(--fg-2)',
                    }}
                  >
                    {s === 'all' ? 'Todas' : s === 'completed' ? 'Completadas' : 'Canceladas'}
                  </button>
                ))}
                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                  title="Desde"
                  style={{ background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.2rem 0.4rem', color: 'var(--fg-1)', fontSize: 11, fontFamily: 'var(--font-ui)', outline: 'none', minWidth: 0 }} />
                <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                  title="Hasta"
                  style={{ background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.2rem 0.4rem', color: 'var(--fg-1)', fontSize: 11, fontFamily: 'var(--font-ui)', outline: 'none', minWidth: 0 }} />
                {(filterFrom || filterTo || filterStatus !== 'all') && (
                  <button onClick={() => { setFilterStatus('all'); setFilterFrom(''); setFilterTo('') }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-ui)', padding: '0 4px' }}>
                    Limpiar
                  </button>
                )}
              </div>

              {/* ── List ── */}
              <div style={{ overflowY: 'auto', maxHeight: 420 }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: '1.5rem 1.25rem', color: 'var(--fg-3)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
                    Sin resultados
                  </div>
                ) : (
                  filtered.map((h, i) => {
                    const svc       = services.find(s => s.id === h.serviceId)
                    const brb       = barbers.find(b => b.id === h.barberId)
                    const cancelled = h.status === 'cancelled'
                    return (
                      <div key={h.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.875rem',
                        padding: '0.875rem 1.25rem',
                        borderBottom: i < filtered.length - 1 ? '1px solid var(--line)' : undefined,
                        opacity: cancelled ? 0.55 : 1,
                      }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                          background: cancelled ? 'rgba(192,64,64,0.08)' : 'rgba(201,162,74,0.1)',
                          border: `1.5px solid ${cancelled ? 'rgba(192,64,64,0.2)' : 'rgba(201,162,74,0.25)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {cancelled ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {svc?.name ?? '—'}
                          </div>
                          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>
                            {fmtHistoryDate(h.startTime)}{brb ? ` · ${brb.fullName}` : ''}
                          </div>
                        </div>
                        {cancelled ? (
                          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--danger)', border: '1px solid rgba(192,64,64,0.3)', borderRadius: 4, padding: '0.15rem 0.4rem', flexShrink: 0 }}>
                            cancelada
                          </span>
                        ) : (
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--fg-0)', letterSpacing: '0.02em' }}>
                              {svc ? `${svc.price}€` : '—'}
                            </div>
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
          )}
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

  // Data hooks
  const { data: appointments = [] }  = useClientAppointments(user?.id)
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
  const loyaltyTarget     = rewards.length > 0 ? Math.max(...rewards.map(r => r.cost)) : 100

  const loyaltyRewardsData = useMemo(() => {
    const isRepeatable = (loyaltyConfig?.rewardMode ?? 'one_time') === 'repeatable'
    const cycleMult = Math.pow(2, loyaltyCard?.completedCycles ?? 0)
    return rewards.filter(r => r.isActive).map(r => {
      const isRedeemed = !isRepeatable && redeemedIds.includes(r.id)
      const adjustedCost = r.cost * cycleMult
      return {
        id: r.id,
        label: r.label,
        cost: r.cost,
        redeemed: isRedeemed,
        canRedeem: loyaltyPoints >= adjustedCost && !isRedeemed,
      }
    })
  }, [rewards, loyaltyConfig, redeemedIds, loyaltyPoints, loyaltyCard?.completedCycles])

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
          { label: 'Servicio',  value: nextService.name },
          { label: 'Barbero',   value: nextBarber.fullName },
          { label: 'Duración',  value: `${nextService.durationMinutes} min` },
          { label: 'Precio',    value: `${nextService.price}€` },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ fontSize: 14, color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontWeight: 600, marginTop: 2 }}>{value}</div>
          </div>
        ))}
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

      {/* ── DESKTOP: 2 columns, left = proxima+historial, right = loyalty ── */}
      <div
        className="hidden lg:grid"
        style={{
          gridTemplateColumns: '1fr 1fr',
          columnGap: '1rem',
          height: 'calc(100dvh - 105px)',
          overflow: 'hidden',
        }}
      >
        {/* Left: proxima (shrink) + historial */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'auto', minHeight: 0 }}>
          <div style={{ flexShrink: 0 }}>{proximaSection}</div>
          <AppointmentHistory appointments={appointments} services={services} barbers={barbers} />
        </div>

        {/* Right: loyalty card fills full column height */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {loyaltySectionDesktop}
        </div>
      </div>

      {/* ── MOBILE: stacked ── */}
      <div className="flex flex-col gap-4 lg:hidden" style={{ paddingBottom: '5rem' }}>
        {proximaSection}
        {loyaltySectionMobile}
        <AppointmentHistory appointments={appointments} services={services} barbers={barbers} />
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
