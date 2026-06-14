import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { InfoButton } from '@/components/ui'
import type { InfoItem } from '@/components/ui'
import { useAuth } from '@/hooks'
import { useLoyaltyConfig, DEFAULT_LOYALTY_TIERS } from '@/hooks/useShopConfig'
import {
  useAllRewards, useCreateReward, useUpdateReward, useDeleteReward,
  useUpdateLoyaltyConfig, useSearchCardByCode, useManualAdjustPoints,
  useRecentTransactions, useClearLoyaltyHistory,
} from '@/hooks/useLoyalty'
import { LoyaltyCard, QRScannerModal } from '@/components/loyalty'
import type { Reward } from '@/domain/loyalty'
import type { LoyaltyTierConfig, LoyaltyTierReward } from '@/domain/shop'
import { useShopContext } from '@/context/ShopContext'

type Tab = 'fidelizacion' | 'clientes'

const TABS: { id: Tab; label: string }[] = [
  { id: 'fidelizacion', label: 'Fidelización' },
  { id: 'clientes', label: 'Clientes' },
]

function SubTitle({ children, infoTitle, infoItems }: { children: React.ReactNode; infoTitle?: string; infoItems?: InfoItem[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg-3)' }}>
        {children}
      </div>
      {infoTitle && infoItems && <InfoButton title={infoTitle} items={infoItems} />}
    </div>
  )
}

export default function ClientsPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner' || user?.role === 'admin'
  const { name: shopName } = useShopContext()

  const [tab, setTab] = useState<Tab>('fidelizacion')

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const { data: rewardsData = [] } = useAllRewards()
  const { data: loyaltyConfig } = useLoyaltyConfig()

  const createReward        = useCreateReward()
  const updateRewardMut     = useUpdateReward()
  const deleteReward        = useDeleteReward()
  const updateLoyaltyConfig = useUpdateLoyaltyConfig()

  // ── Rewards state ───────────────────────────────────────────────────────────
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null)
  const [rewardEdits, setRewardEdits] = useState<Record<string, { label: string; cost: number }>>({})

  // ── Loyalty card config state ───────────────────────────────────────────────
  type PendingCard = { mode: 'tiers' | 'simple'; tiers: LoyaltyTierConfig[]; maxPoints: number; rewardMode: 'one_time' | 'repeatable' }
  const [pendingLoyaltyCard, setPendingLoyaltyCard] = useState<PendingCard | null>(null)
  const [expandedTierId, setExpandedTierId] = useState<string | null>(null)
  const [simPoints, setSimPoints] = useState(0)
  const [configError, setConfigError] = useState<string | null>(null)

  const localMode       = pendingLoyaltyCard?.mode       ?? loyaltyConfig?.mode       ?? 'tiers'
  const localTiers      = pendingLoyaltyCard?.tiers      ?? (loyaltyConfig?.tiers?.length ? loyaltyConfig.tiers : DEFAULT_LOYALTY_TIERS)
  const localMaxPoints  = pendingLoyaltyCard?.maxPoints  ?? loyaltyConfig?.maxPoints  ?? 500
  const localRewardMode = pendingLoyaltyCard?.rewardMode ?? loyaltyConfig?.rewardMode ?? 'one_time'
  const tiersDirty      = pendingLoyaltyCard !== null

  const patchCard = (patch: Partial<PendingCard>) =>
    setPendingLoyaltyCard(prev => ({
      mode:       prev?.mode       ?? localMode,
      tiers:      prev?.tiers      ?? localTiers,
      maxPoints:  prev?.maxPoints  ?? localMaxPoints,
      rewardMode: prev?.rewardMode ?? localRewardMode,
      ...patch,
    }))

  // ── Card search state ───────────────────────────────────────────────────────
  const [cardSearchInput, setCardSearchInput] = useState('')
  const [cardSearchQuery, setCardSearchQuery] = useState<string | null>(null)
  const { data: foundCard, isFetching: cardSearchFetching, isError: cardSearchError } = useSearchCardByCode(cardSearchQuery)
  const { data: foundCardTxs = [] } = useRecentTransactions(foundCard?.clientId, 8)
  const manualAdjust = useManualAdjustPoints()
  const clearHistory = useClearLoyaltyHistory()
  const [adjPoints, setAdjPoints]       = useState('')
  const [adjDesc, setAdjDesc]           = useState('')
  const [adjError, setAdjError]         = useState<string | null>(null)
  const [adjSuccess, setAdjSuccess]     = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [qrScanOpen, setQrScanOpen]     = useState(false)

  // ── Handlers: rewards ────────────────────────────────────────────────────────
  const handleSaveReward = (r: Reward) => {
    const edits = rewardEdits[r.id]
    updateRewardMut.mutate({ id: r.id, data: { label: edits?.label ?? r.label, cost: edits?.cost ?? r.cost } }, {
      onSuccess: () => { setRewardEdits(e => { const c = { ...e }; delete c[r.id]; return c }); setEditingRewardId(null) },
      onError:   (e) => { if (import.meta.env.DEV) console.error(e) },
    })
  }

  const handleAddReward = () => createReward.mutate({ label: 'Nueva recompensa', cost: 50 })

  // ── Handlers: loyalty config ─────────────────────────────────────────────────
  const handleSaveLoyaltyCardConfig = () => {
    updateLoyaltyConfig.mutate(
      { mode: localMode, tiers: localTiers, maxPoints: localMaxPoints, rewardMode: localRewardMode },
      {
        onSuccess: () => { setPendingLoyaltyCard(null); setConfigError(null) },
        onError:   (e) => { if (import.meta.env.DEV) console.error(e); setConfigError('No se pudo guardar la configuración. Revisa tu conexión.') },
      },
    )
  }

  const handleAddTier = () => {
    const t: LoyaltyTierConfig = { id: crypto.randomUUID(), name: 'NUEVO NIVEL', color: '#607890', minPoints: 0, rewards: [] }
    patchCard({ tiers: [...localTiers, t] })
  }

  const handleDeleteTier = (id: string) => {
    if (expandedTierId === id) setExpandedTierId(null)
    patchCard({ tiers: localTiers.filter(x => x.id !== id) })
  }

  const handleUpdateTier = (id: string, field: keyof LoyaltyTierConfig, value: string | number | LoyaltyTierReward[]) => {
    patchCard({ tiers: localTiers.map(x => x.id === id ? { ...x, [field]: value } : x) })
  }

  const handleAddTierReward = (tierId: string) => {
    const r: LoyaltyTierReward = { id: crypto.randomUUID(), label: 'Nueva recompensa', cost: 50, isPermanent: false }
    patchCard({ tiers: localTiers.map(x => x.id === tierId ? { ...x, rewards: [...x.rewards, r] } : x) })
  }

  const handleDeleteTierReward = (tierId: string, rewardId: string) => {
    patchCard({ tiers: localTiers.map(x => x.id === tierId ? { ...x, rewards: x.rewards.filter(r => r.id !== rewardId) } : x) })
  }

  const handleUpdateTierReward = (tierId: string, rewardId: string, field: 'label' | 'cost' | 'isPermanent', value: string | number | boolean) => {
    patchCard({ tiers: localTiers.map(x => x.id === tierId ? { ...x, rewards: x.rewards.map(r => r.id === rewardId ? { ...r, [field]: value } : r) } : x) })
  }

  // ── Handlers: points ─────────────────────────────────────────────────────────
  const handleAdjustPoints = () => {
    if (!foundCard) return
    const pts = parseInt(adjPoints, 10)
    if (isNaN(pts) || pts === 0) { setAdjError('Introduce un número de puntos distinto de cero'); return }
    if (!adjDesc.trim()) { setAdjError('Añade una descripción del ajuste'); return }
    setAdjError(null)
    manualAdjust.mutate(
      { clientId: foundCard.clientId, points: pts, description: adjDesc.trim() },
      {
        onSuccess: () => {
          setAdjPoints(''); setAdjDesc(''); setAdjSuccess(true)
          setTimeout(() => setAdjSuccess(false), 3000)
          setCardSearchQuery(null)
          setTimeout(() => setCardSearchQuery(cardSearchInput.trim() || null), 50)
        },
        onError: (e) => setAdjError(`Error: ${e instanceof Error ? e.message : String(e)}`),
      },
    )
  }

  const handleClearHistory = () => {
    if (!foundCard) return
    clearHistory.mutate(foundCard.clientId, {
      onSuccess: () => {
        setClearConfirm(false)
        setCardSearchQuery(null)
        setTimeout(() => setCardSearchQuery(cardSearchInput.trim() || null), 50)
      },
      onError: (e) => {
        setClearConfirm(false)
        setAdjError(`Error al limpiar historial: ${e instanceof Error ? e.message : String(e)}`)
      },
    })
  }

  return (
    <>
      <Helmet><title>Clientes — {shopName}</title></Helmet>

      {/* Page header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.1em', color: 'var(--fg-0)', margin: 0 }}>
          CLIENTES
        </h1>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-3)', margin: '0.25rem 0 0' }}>
          Fidelización y gestión de tarjetas de puntos
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', background: 'var(--bg-2)', borderRadius: 10, padding: 4, border: '1px solid var(--line)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '0.5rem 1rem', borderRadius: 7, border: 'none',
              background: tab === t.id ? 'var(--bg-0)' : 'transparent',
              color: tab === t.id ? 'var(--fg-0)' : 'var(--fg-3)',
              fontFamily: 'var(--font-ui)', fontSize: 13,
              fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.25)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '1.25rem 1.25rem 1.5rem' }}>

        {/* ===== FIDELIZACIÓN ===== */}
        {tab === 'fidelizacion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <SubTitle
              infoTitle="GUÍA — TARJETA FIDELIZACIÓN"
              infoItems={[
                { icon: '🃏', label: 'Modalidad', description: '"Por Niveles": el cliente sube de nivel (Cobre, Bronce…) acumulando puntos. "Puntos Simples": solo una barra de progreso hasta el máximo.' },
                { icon: '🏆', label: 'Configurar niveles', description: 'En modo Niveles, define cada nivel con nombre, color y puntos mínimos para alcanzarlo. Añade recompensas por nivel.' },
                { icon: '🎁', label: 'Recompensas', description: '"Permanente": siempre disponible en ese nivel. "Un uso": se consume al canjear y no vuelve a aparecer.' },
                { icon: '👁️', label: 'Vista previa', description: 'La columna derecha muestra cómo verá el cliente su tarjeta en tiempo real según la configuración.' },
                { icon: '💾', label: 'Guardar', description: 'Los cambios no se aplican hasta que pulses "Guardar configuración".' },
              ]}
            >
              TARJETA DE FIDELIZACIÓN
            </SubTitle>

            {/* Mode selector */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase' }}>Modalidad</div>
                {loyaltyConfig && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, fontFamily: 'var(--font-ui)', color: 'var(--fg-4)' }}>
                    <span style={{ padding: '2px 7px', borderRadius: 4, background: 'var(--bg-3)', border: '1px solid var(--line)', color: 'var(--fg-2)', fontWeight: 500 }}>
                      {loyaltyConfig.mode === 'tiers' ? 'Niveles' : 'Puntos'} guardado
                    </span>
                    {tiersDirty && localMode !== loyaltyConfig.mode && (
                      <>
                        <span style={{ color: 'var(--fg-4)' }}>→</span>
                        <span style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(201,162,74,0.12)', border: '1px solid rgba(201,162,74,0.35)', color: 'var(--gold)', fontWeight: 700 }}>
                          {localMode === 'tiers' ? 'Niveles' : 'Puntos'} pendiente
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', borderRadius: 9, padding: 3 }}>
                {(['tiers', 'simple'] as const).map(m => (
                  <button key={m} onClick={() => patchCard({ mode: m })} style={{
                    flex: 1, padding: '0.5rem', borderRadius: 7, cursor: 'pointer', border: 'none',
                    background: localMode === m ? 'var(--bg-1)' : 'transparent',
                    boxShadow: localMode === m ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
                    fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: localMode === m ? 700 : 400,
                    color: localMode === m ? 'var(--fg-0)' : 'var(--fg-3)', transition: 'all 0.12s',
                  }}>
                    {m === 'tiers' ? 'Por Niveles' : 'Puntos Simples'}
                  </button>
                ))}
              </div>
            </div>

            {/* Two-column: editor + live preview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

              {/* LEFT: editor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* TIERS MODE */}
                {localMode === 'tiers' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase' }}>Niveles</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: 9, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)' }}>Simula:</span>
                        <input type="number" value={simPoints} min={0} onChange={e => setSimPoints(Number(e.target.value))}
                          style={{ width: 60, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 5, padding: '2px 6px', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 10, outline: 'none', textAlign: 'center' }} />
                        <span style={{ fontSize: 9, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)' }}>pts</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {[...localTiers].sort((a, b) => a.minPoints - b.minPoints).map((tier, idx, sorted) => {
                        const nextMin = sorted[idx + 1]?.minPoints ?? Infinity
                        const isActive = simPoints >= tier.minPoints && simPoints < nextMin
                        return (
                          <div key={tier.id} style={{ background: isActive ? `${tier.color}18` : 'var(--bg-3)', borderRadius: 10, border: `1px solid ${isActive ? tier.color + '66' : expandedTierId === tier.id ? 'var(--led)' : 'var(--line)'}`, overflow: 'hidden', transition: 'all 0.12s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem', cursor: 'pointer' }}
                              onClick={() => setExpandedTierId(expandedTierId === tier.id ? null : tier.id)}>
                              <div style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: tier.color, boxShadow: `0 0 8px ${tier.color}88` }} />
                              <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.12em', color: 'var(--fg-0)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {tier.name || 'Sin nombre'}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>
                                {tier.minPoints === 0 ? 'Base' : `≥${tier.minPoints}`}
                              </span>
                              {tier.rewards.length > 0 && (
                                <span style={{ fontSize: 9, color: 'var(--gold)', fontFamily: 'var(--font-ui)', background: 'rgba(201,162,74,0.12)', border: '1px solid rgba(201,162,74,0.25)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
                                  {tier.rewards.length}★
                                </span>
                              )}
                              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="var(--fg-4)" strokeWidth="1.5"
                                style={{ transform: expandedTierId === tier.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                                <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <button onClick={e => { e.stopPropagation(); handleDeleteTier(tier.id) }}
                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 13, padding: '0 2px', flexShrink: 0, minWidth: 24, minHeight: 24, opacity: 0.7 }}>✕</button>
                            </div>
                            {expandedTierId === tier.id && (
                              <div style={{ borderTop: '1px solid var(--line)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-4)' }}
                                onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '0.5rem' }}>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3, letterSpacing: '0.08em' }}>NOMBRE</label>
                                    <input value={tier.name} onChange={e => handleUpdateTier(tier.id, 'name', e.target.value.toUpperCase())}
                                      style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.1em', outline: 'none' }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3, letterSpacing: '0.08em' }}>COLOR</label>
                                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                      <input type="color" value={tier.color} onChange={e => handleUpdateTier(tier.id, 'color', e.target.value)}
                                        style={{ width: 30, height: 30, padding: 2, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg-3)', cursor: 'pointer', flexShrink: 0 }} />
                                      <input value={tier.color} onChange={e => handleUpdateTier(tier.id, 'color', e.target.value)}
                                        style={{ flex: 1, minWidth: 0, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.4rem', color: 'var(--fg-0)', fontFamily: 'var(--font-mono, monospace)', fontSize: 10, outline: 'none' }} />
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3, letterSpacing: '0.08em' }}>DESDE pts</label>
                                    <input type="number" value={tier.minPoints} min={0} onChange={e => handleUpdateTier(tier.id, 'minPoints', Number(e.target.value))}
                                      style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.4rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 12, outline: 'none', textAlign: 'center' }} />
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 9, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', letterSpacing: '0.12em', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Recompensas del nivel</div>
                                  {tier.rewards.length === 0 && <div style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', padding: '0.2rem 0', marginBottom: '0.35rem' }}>Sin recompensas aún</div>}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.35rem' }}>
                                    {tier.rewards.map(r => (
                                      <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'var(--bg-2)', borderRadius: 7, padding: '0.35rem 0.45rem', border: '1px solid var(--line)' }}>
                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                          <input value={r.label} onChange={e => handleUpdateTierReward(tier.id, r.id, 'label', e.target.value)} placeholder="Nombre"
                                            style={{ flex: 1, minWidth: 0, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.3rem 0.4rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 11, outline: 'none' }} />
                                          <input type="number" value={r.cost} min={1}
                                            onChange={e => { const v = parseInt(e.target.value, 10); if (v > 0) handleUpdateTierReward(tier.id, r.id, 'cost', v) }}
                                            onBlur={e => { if (!e.target.value || Number(e.target.value) < 1) handleUpdateTierReward(tier.id, r.id, 'cost', 1) }}
                                            style={{ width: 64, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.3rem 0.35rem', color: 'var(--gold)', fontFamily: 'var(--font-ui)', fontSize: 11, outline: 'none', textAlign: 'center', flexShrink: 0 }} />
                                          <span style={{ fontSize: 9, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>pts</span>
                                          <button onClick={() => handleDeleteTierReward(tier.id, r.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12, padding: 0, minWidth: 20, minHeight: 20, flexShrink: 0, opacity: 0.7 }}>✕</button>
                                        </div>
                                        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                                          {(['false', 'true'] as const).map(val => {
                                            const isPerm = val === 'true'
                                            const active = (r.isPermanent ?? false) === isPerm
                                            return (
                                              <button key={val} onClick={() => handleUpdateTierReward(tier.id, r.id, 'isPermanent', isPerm)} style={{
                                                padding: '2px 7px', borderRadius: 4,
                                                border: `1px solid ${active ? (isPerm ? 'rgba(201,162,74,0.5)' : 'rgba(96,180,120,0.5)') : 'var(--line)'}`,
                                                background: active ? (isPerm ? 'rgba(201,162,74,0.12)' : 'rgba(96,180,120,0.12)') : 'transparent',
                                                color: active ? (isPerm ? 'var(--gold)' : 'var(--ok)') : 'var(--fg-4)',
                                                fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer',
                                                fontWeight: active ? 700 : 400,
                                              }}>
                                                {isPerm ? '★ Permanente' : '↺ Un uso'}
                                              </button>
                                            )
                                          })}
                                          <span style={{ fontSize: 9, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', marginLeft: 3 }}>
                                            {(r.isPermanent ?? false) ? '— fija del nivel' : '— se consume al canjear'}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <button onClick={() => handleAddTierReward(tier.id)}
                                    style={{ padding: '0.2rem 0.55rem', minHeight: 26, borderRadius: 5, border: '1px dashed var(--line)', background: 'transparent', color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 10, cursor: 'pointer' }}>+ recompensa</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <button onClick={handleAddTier}
                      style={{ padding: '0.5rem', minHeight: 36, borderRadius: 8, border: '1px dashed var(--led)', background: 'transparent', color: 'var(--led)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer', width: '100%' }}>
                      + Añadir nivel
                    </button>
                  </>
                )}

                {/* SIMPLE MODE */}
                {localMode === 'simple' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: '0.35rem' }}>Puntos máximos</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="number" value={localMaxPoints} min={1}
                          onChange={e => { const v = parseInt(e.target.value, 10); if (v > 0) patchCard({ maxPoints: v }) }}
                          onBlur={e => { if (!e.target.value || Number(e.target.value) < 1) patchCard({ maxPoints: 1 }) }}
                          style={{ width: 110, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 7, padding: '0.5rem 0.625rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                        <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>pts</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: '0.35rem' }}>Canjeo de recompensas</label>
                      <div style={{ display: 'flex', gap: 3, background: 'var(--bg-3)', borderRadius: 8, padding: 3 }}>
                        {(['one_time', 'repeatable'] as const).map(mode => (
                          <button key={mode} onClick={() => patchCard({ rewardMode: mode })} style={{
                            flex: 1, padding: '0.45rem', borderRadius: 6, cursor: 'pointer', border: 'none',
                            background: localRewardMode === mode ? 'var(--bg-1)' : 'transparent',
                            boxShadow: localRewardMode === mode ? '0 1px 4px rgba(0,0,0,0.35)' : 'none',
                            fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: localRewardMode === mode ? 700 : 400,
                            color: localRewardMode === mode ? 'var(--fg-0)' : 'var(--fg-3)', transition: 'all 0.12s',
                          }}>
                            {mode === 'one_time' ? 'Una vez' : 'Repetible'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Recompensas</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {rewardsData.map(r => (
                          editingRewardId === r.id ? (
                            <div key={r.id} style={{ background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--led)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '0.4rem' }}>
                                <div>
                                  <label style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>Nombre</label>
                                  <input value={rewardEdits[r.id]?.label ?? r.label}
                                    onChange={e => setRewardEdits(ed => ({ ...ed, [r.id]: { label: e.target.value, cost: ed[r.id]?.cost ?? r.cost } }))}
                                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.35rem 0.45rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 12, outline: 'none' }} />
                                </div>
                                <div>
                                  <label style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>Pts</label>
                                  <input type="number" value={rewardEdits[r.id]?.cost ?? r.cost}
                                    onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) setRewardEdits(ed => ({ ...ed, [r.id]: { label: ed[r.id]?.label ?? r.label, cost: v } })) }}
                                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.35rem 0.45rem', color: 'var(--gold)', fontFamily: 'var(--font-ui)', fontSize: 12, outline: 'none', textAlign: 'center' }} />
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                <button onClick={() => { setEditingRewardId(null); setRewardEdits(e => { const c = { ...e }; delete c[r.id]; return c }) }}
                                  style={{ padding: '0.4rem 0.875rem', minHeight: 36, borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={() => handleSaveReward(r)} disabled={!rewardEdits[r.id] || updateRewardMut.isPending}
                                  style={{ padding: '0.4rem 1rem', minHeight: 36, borderRadius: 7, border: 'none', background: 'var(--led)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: (!rewardEdits[r.id] || updateRewardMut.isPending) ? 0.5 : 1 }}>
                                  {updateRewardMut.isPending ? 'Guardando…' : 'Guardar'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.525rem 0.625rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                              <div style={{ flex: 1, fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{r.label}</div>
                              <span style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>{r.cost} pts</span>
                              <button onClick={() => setEditingRewardId(r.id)} style={{ padding: '0.25rem 0.5rem', minHeight: 28, borderRadius: 5, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>Editar</button>
                              <button onClick={() => deleteReward.mutate(r.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 15, minWidth: 28, minHeight: 28, flexShrink: 0, opacity: 0.7 }}>✕</button>
                            </div>
                          )
                        ))}
                      </div>
                      <button onClick={handleAddReward} style={{ marginTop: '0.5rem', padding: '0.45rem 0.75rem', minHeight: 36, borderRadius: 7, border: '1px dashed var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer' }}>
                        + Añadir recompensa
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: live preview */}
              <div style={{ position: 'sticky', top: 0 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Vista previa en vivo</div>
                <LoyaltyCard
                  points={250} target={500} stamps={8} memberCode="PREVIEW00"
                  rewards={[{ id: 'p1', label: 'Descuento 10%', cost: 200, canRedeem: true }]}
                  loyaltyMode={localMode}
                  configTiers={localMode === 'tiers' ? localTiers : undefined}
                  maxPoints={localMode === 'simple' ? localMaxPoints : undefined}
                  compact
                />
                <p style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', textAlign: 'center', marginTop: '0.5rem', letterSpacing: '0.04em' }}>
                  Datos de ejemplo — actualiza al editar
                </p>
              </div>
            </div>

            {/* Save */}
            {configError && <p style={{ color: 'var(--danger)', fontSize: 12, fontFamily: 'var(--font-ui)', margin: 0 }}>{configError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSaveLoyaltyCardConfig}
                disabled={updateLoyaltyConfig.isPending || !tiersDirty}
                style={{
                  padding: '0.5rem 1.5rem', minHeight: 40, borderRadius: 8, border: 'none',
                  background: 'var(--led)', color: '#fff',
                  fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
                  cursor: tiersDirty ? 'pointer' : 'default',
                  opacity: (updateLoyaltyConfig.isPending || !tiersDirty) ? 0.4 : 1,
                }}
              >
                {updateLoyaltyConfig.isPending ? 'Guardando…' : 'Guardar configuración'}
              </button>
            </div>
          </div>
        )}

        {/* ===== CLIENTES ===== */}
        {tab === 'clientes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <SubTitle
              infoTitle="GUÍA — CLIENTES"
              infoItems={[
                { icon: '📷', label: 'Escanear QR', description: 'Pulsa el icono de cámara para escanear el QR del cliente. Solo accesible para admin/propietario.' },
                { icon: '🔍', label: 'Buscar por código', description: 'Introduce el código de miembro del cliente manualmente y pulsa "Buscar" para ver su tarjeta.' },
                { icon: '⚡', label: 'Ajuste de puntos', description: 'Puedes añadir o restar puntos manualmente al cliente con una descripción del motivo.' },
                { icon: '🗑️', label: 'Limpiar historial', description: 'Elimina todas las transacciones del cliente (solo propietario). Acción irreversible.' },
              ]}
            >
              TARJETAS DE CLIENTES
            </SubTitle>

            {/* Search bar + QR */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Buscar por código de tarjeta
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setQrScanOpen(true)}
                  title="Escanear QR con cámara"
                  style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-3)', color: 'var(--fg-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
                    <rect x="3" y="16" width="5" height="5" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
                    <path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/>
                    <path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/>
                    <path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
                  </svg>
                </button>
                <input
                  value={cardSearchInput}
                  onChange={e => setCardSearchInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && setCardSearchQuery(cardSearchInput.trim() || null)}
                  placeholder="Código de miembro (ej. A1B2C3D4E)"
                  style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 8, padding: '0.6rem 0.875rem', color: 'var(--fg-0)', fontFamily: 'var(--font-mono, monospace)', fontSize: 13, letterSpacing: '0.1em', outline: 'none' }}
                />
                <button
                  onClick={() => { setAdjPoints(''); setAdjDesc(''); setAdjError(null); setAdjSuccess(false); setCardSearchQuery(cardSearchInput.trim() || null) }}
                  disabled={cardSearchFetching || !cardSearchInput.trim()}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: 8, border: 'none', background: 'var(--led)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: cardSearchInput.trim() ? 'pointer' : 'default', opacity: (!cardSearchInput.trim() || cardSearchFetching) ? 0.5 : 1, minWidth: 88, flexShrink: 0 }}
                >
                  {cardSearchFetching ? '…' : 'Buscar'}
                </button>
                {cardSearchQuery && (
                  <button onClick={() => { setCardSearchQuery(null); setCardSearchInput(''); setAdjPoints(''); setAdjDesc(''); setAdjError(null) }}
                    style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                )}
              </div>
            </div>

            {/* Results */}
            {cardSearchQuery && !cardSearchFetching && (
              cardSearchError ? (
                <div style={{ padding: '1rem', background: 'rgba(192,64,64,0.06)', border: '1px solid rgba(192,64,64,0.2)', borderRadius: 8, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--danger)' }}>
                  Error al buscar. Revisa la conexión.
                </div>
              ) : !foundCard ? (
                <div style={{ padding: '1.5rem', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 10, textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-3)' }}>
                  No se encontró ninguna tarjeta con ese código
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* Card + summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
                    <LoyaltyCard
                      points={foundCard.points} target={500}
                      stamps={foundCard.totalVisits}
                      memberCode={foundCard.memberCode ?? ''}
                      createdAt={foundCard.createdAt}
                      completedCycles={foundCard.completedCycles}
                      loyaltyMode={loyaltyConfig?.mode}
                      configTiers={loyaltyConfig?.tiers?.length ? loyaltyConfig.tiers : undefined}
                      maxPoints={loyaltyConfig?.maxPoints}
                      compact
                    />
                    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--fg-4)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Resumen</div>
                      {[
                        { label: 'Código',        value: foundCard.memberCode ?? '—' },
                        { label: 'Puntos',        value: foundCard.points.toLocaleString('es-ES') },
                        { label: 'Visitas',       value: String(foundCard.totalVisits) },
                        { label: 'Ciclos',        value: String(foundCard.completedCycles ?? 0) },
                        { label: 'Cliente desde', value: new Date(foundCard.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '0.4rem' }}>
                          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-3)' }}>{label}</span>
                          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--fg-0)', fontWeight: 600 }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Points adjustment */}
                  <div style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 12, padding: '1rem' }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--fg-4)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Ajustar puntos</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.625rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>Puntos</label>
                        <input type="number" value={adjPoints} onChange={e => { setAdjPoints(e.target.value); setAdjError(null) }} placeholder="+50 o -20"
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: `1px solid ${adjError ? 'var(--danger)' : 'var(--line)'}`, borderRadius: 7, padding: '0.5rem 0.625rem', color: adjPoints.startsWith('-') ? 'var(--danger)' : 'var(--gold)', fontFamily: 'var(--font-mono, monospace)', fontSize: 14, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 3 }}>Descripción / motivo</label>
                        <input value={adjDesc} onChange={e => { setAdjDesc(e.target.value); setAdjError(null) }} placeholder="Ej: Corrección manual, promoción..."
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: `1px solid ${adjError ? 'var(--danger)' : 'var(--line)'}`, borderRadius: 7, padding: '0.5rem 0.625rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }} />
                      </div>
                    </div>
                    {adjError   && <p style={{ color: 'var(--danger)', fontSize: 11, fontFamily: 'var(--font-ui)', margin: '0 0 0.5rem' }}>{adjError}</p>}
                    {adjSuccess && <p style={{ color: 'var(--ok)',     fontSize: 11, fontFamily: 'var(--font-ui)', margin: '0 0 0.5rem' }}>✓ Puntos ajustados correctamente</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={handleAdjustPoints}
                        disabled={manualAdjust.isPending || !adjPoints.trim() || !adjDesc.trim()}
                        style={{ padding: '0.5rem 1.5rem', minHeight: 38, borderRadius: 7, border: 'none', background: 'var(--led)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: (adjPoints.trim() && adjDesc.trim()) ? 'pointer' : 'default', opacity: (manualAdjust.isPending || !adjPoints.trim() || !adjDesc.trim()) ? 0.45 : 1 }}
                      >
                        {manualAdjust.isPending ? 'Aplicando…' : 'Aplicar ajuste'}
                      </button>
                    </div>
                  </div>

                  {/* Recent transactions */}
                  {foundCardTxs.length > 0 && (
                    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--fg-4)', textTransform: 'uppercase' }}>Trazabilidad</div>
                        {isOwner && (
                          clearConfirm ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>¿Seguro?</span>
                              <button onClick={handleClearHistory} disabled={clearHistory.isPending}
                                style={{ padding: '0.25rem 0.625rem', borderRadius: 5, border: 'none', background: 'var(--danger)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                {clearHistory.isPending ? '…' : 'Sí, limpiar'}
                              </button>
                              <button onClick={() => setClearConfirm(false)}
                                style={{ padding: '0.25rem 0.5rem', borderRadius: 5, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
                            </div>
                          ) : (
                            <button onClick={() => setClearConfirm(true)}
                              style={{ padding: '0.25rem 0.625rem', borderRadius: 5, border: '1px solid rgba(192,64,64,0.35)', background: 'rgba(192,64,64,0.07)', color: 'var(--danger)', fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer' }}>
                              Limpiar historial
                            </button>
                          )
                        )}
                      </div>
                      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                        {foundCardTxs.map((tx, i) => {
                          const isPos = tx.points > 0
                          const isNeg = tx.points < 0
                          return (
                            <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1rem', borderBottom: i < foundCardTxs.length - 1 ? '1px solid var(--line)' : undefined }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isPos ? 'rgba(50,180,100,0.1)' : isNeg ? 'rgba(192,64,64,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isPos ? 'rgba(50,180,100,0.25)' : isNeg ? 'rgba(192,64,64,0.2)' : 'var(--line)'}` }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: isPos ? 'var(--ok)' : isNeg ? 'var(--danger)' : 'var(--fg-4)' }}>
                                  {isPos ? '+' : isNeg ? '−' : '○'}
                                </span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>
                                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--fg-4)', marginTop: 1 }}>
                                  {new Date(tx.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                              </div>
                              {tx.points !== 0 && (
                                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 700, flexShrink: 0, color: isPos ? 'var(--ok)' : 'var(--danger)' }}>
                                  {isPos ? '+' : ''}{tx.points.toLocaleString('es-ES')}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* QR scanner modal */}
            {qrScanOpen && (
              <QRScannerModal
                onScan={code => {
                  setQrScanOpen(false)
                  setCardSearchInput(code)
                  setAdjPoints(''); setAdjDesc(''); setAdjError(null); setAdjSuccess(false)
                  setCardSearchQuery(code)
                }}
                onClose={() => setQrScanOpen(false)}
              />
            )}
          </div>
        )}
      </div>
    </>
  )
}
