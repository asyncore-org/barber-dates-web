import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { InfoButton, Icon } from '@/components/ui'
import { useLoyaltyConfig, DEFAULT_LOYALTY_TIERS } from '@/hooks/useShopConfig'
import {
  useAllRewards, useCreateReward, useUpdateReward, useDeleteReward,
  useUpdateLoyaltyConfig, useSearchCardByCode, useManualAdjustPoints,
} from '@/hooks/useLoyalty'
import { LoyaltyCard, QRScannerModal } from '@/components/loyalty'
import type { Reward } from '@/domain/loyalty'
import type { LoyaltyTierConfig, LoyaltyTierReward, LoyaltyRewardType } from '@/domain/shop'
import { useShopContext } from '@/context/ShopContext'

type Tab = 'fidelizacion' | 'clientes'

export default function ClientsPage() {
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
  const [rewardEdits, setRewardEdits] = useState<Record<string, { label: string; cost: number; rewardType: LoyaltyRewardType; rewardValue?: number }>>({})

  // ── Loyalty card config state ───────────────────────────────────────────────
  type SimpleRewardMeta = Record<string, { rewardType: LoyaltyRewardType; rewardValue?: number }>
  type PendingCard = { mode: 'tiers' | 'simple'; tiers: LoyaltyTierConfig[]; maxPoints: number; rewardMode: 'one_time' | 'repeatable'; simpleColor: string; simpleRewardMeta: SimpleRewardMeta }
  const [pendingLoyaltyCard, setPendingLoyaltyCard] = useState<PendingCard | null>(null)
  const [expandedTierId, setExpandedTierId] = useState<string | null>(null)
  const [simPoints, setSimPoints] = useState(0)
  const [configError, setConfigError]   = useState<string | null>(null)
  const [configSaved, setConfigSaved]   = useState(false)

  const localMode            = pendingLoyaltyCard?.mode            ?? loyaltyConfig?.mode            ?? 'tiers'
  const localTiers           = pendingLoyaltyCard?.tiers           ?? (loyaltyConfig?.tiers?.length ? loyaltyConfig.tiers : DEFAULT_LOYALTY_TIERS)
  const localMaxPoints       = pendingLoyaltyCard?.maxPoints       ?? loyaltyConfig?.maxPoints       ?? 500
  const localRewardMode      = pendingLoyaltyCard?.rewardMode      ?? loyaltyConfig?.rewardMode      ?? 'one_time'
  const localSimpleColor     = pendingLoyaltyCard?.simpleColor     ?? loyaltyConfig?.simpleColor     ?? '#7b4fff'
  const localSimpleRewardMeta: SimpleRewardMeta = pendingLoyaltyCard?.simpleRewardMeta ?? loyaltyConfig?.simpleRewardMeta ?? {}
  const tiersDirty           = pendingLoyaltyCard !== null

  const patchCard = (patch: Partial<PendingCard>) =>
    setPendingLoyaltyCard(prev => ({
      mode:             prev?.mode             ?? localMode,
      tiers:            prev?.tiers            ?? localTiers,
      maxPoints:        prev?.maxPoints        ?? localMaxPoints,
      rewardMode:       prev?.rewardMode       ?? localRewardMode,
      simpleColor:      prev?.simpleColor      ?? localSimpleColor,
      simpleRewardMeta: prev?.simpleRewardMeta ?? localSimpleRewardMeta,
      ...patch,
    }))

  // ── Card search state ───────────────────────────────────────────────────────
  const [cardSearchInput, setCardSearchInput] = useState('')
  const [cardSearchQuery, setCardSearchQuery] = useState<string | null>(null)
  const { data: foundCard, isFetching: cardSearchFetching, isError: cardSearchError } = useSearchCardByCode(cardSearchQuery)
  const manualAdjust = useManualAdjustPoints()
  const [adjPoints, setAdjPoints] = useState('')
  const [adjError, setAdjError]   = useState<string | null>(null)
  const [adjSuccess, setAdjSuccess] = useState(false)
  const [qrScanOpen, setQrScanOpen] = useState(false)

  // ── Handlers: rewards ────────────────────────────────────────────────────────
  const handleSaveReward = (r: Reward) => {
    const edits = rewardEdits[r.id]
    const newType  = edits?.rewardType  ?? localSimpleRewardMeta[r.id]?.rewardType  ?? 'gift'
    const newValue = edits?.rewardValue ?? localSimpleRewardMeta[r.id]?.rewardValue
    const newMeta: SimpleRewardMeta = { ...localSimpleRewardMeta, [r.id]: { rewardType: newType, rewardValue: newValue } }
    updateRewardMut.mutate({ id: r.id, data: { label: edits?.label ?? r.label, cost: edits?.cost ?? r.cost } }, {
      onSuccess: () => {
        setRewardEdits(e => { const c = { ...e }; delete c[r.id]; return c })
        setEditingRewardId(null)
        // Sync simpleRewardMeta to DB. If there are pending card changes, keep them intact
        // by patching only simpleRewardMeta rather than resetting the full pending state.
        updateLoyaltyConfig.mutate({ simpleRewardMeta: newMeta }, {
          onSuccess: () => {
            if (pendingLoyaltyCard) patchCard({ simpleRewardMeta: newMeta })
          },
          onError: () => setConfigError('No se pudo guardar el tipo de recompensa.'),
        })
      },
      onError: (e) => { if (import.meta.env.DEV) console.error(e) },
    })
  }

  const handleAddReward = () => createReward.mutate({ label: 'Nueva recompensa', cost: 50 })

  // ── Handlers: loyalty config ─────────────────────────────────────────────────
  const handleSaveLoyaltyCardConfig = () => {
    updateLoyaltyConfig.mutate(
      { mode: localMode, tiers: localTiers, maxPoints: localMaxPoints, rewardMode: localRewardMode, simpleColor: localSimpleColor, simpleRewardMeta: localSimpleRewardMeta },
      {
        onSuccess: () => {
          setPendingLoyaltyCard(null); setConfigError(null)
          setConfigSaved(true); setTimeout(() => setConfigSaved(false), 3500)
        },
        onError: (e) => { if (import.meta.env.DEV) console.error(e); setConfigError('No se pudo guardar la configuración.') },
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

  const handleUpdateTierReward = (tierId: string, rewardId: string, field: 'label' | 'cost' | 'isPermanent' | 'rewardType' | 'rewardValue', value: string | number | boolean) => {
    patchCard({ tiers: localTiers.map(x => x.id === tierId ? { ...x, rewards: x.rewards.map(r => r.id === rewardId ? { ...r, [field]: value } : r) } : x) })
  }

  // ── Handlers: points ─────────────────────────────────────────────────────────
  const handleAdjustPoints = () => {
    if (!foundCard) return
    const pts = parseInt(adjPoints, 10)
    if (isNaN(pts) || pts === 0) { setAdjError('Introduce un número distinto de cero'); return }
    setAdjError(null)
    manualAdjust.mutate(
      { clientId: foundCard.clientId, points: pts, description: pts > 0 ? `+${pts} pts (ajuste manual)` : `${pts} pts (ajuste manual)` },
      {
        onSuccess: () => {
          setAdjPoints(''); setAdjSuccess(true)
          setTimeout(() => setAdjSuccess(false), 2500)
          setCardSearchQuery(null)
          setTimeout(() => setCardSearchQuery(cardSearchInput.trim() || null), 50)
        },
        onError: (e) => setAdjError(`Error: ${e instanceof Error ? e.message : String(e)}`),
      },
    )
  }

  // ── Responsive CSS injection ────────────────────────────────────────────────
  useEffect(() => {
    const id = 'cp-page-styles'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = `
      .cp-results { display: grid; gap: 0.875rem; align-items: start; }
      @media (min-width: 640px)  { .cp-results { grid-template-columns: 1fr 320px; } }
      @media (min-width: 900px)  { .cp-results { grid-template-columns: 1fr 360px; } }
      @media (min-width: 1100px) { .cp-results { grid-template-columns: 1fr 400px; } }
      .cp-stats { display: grid; gap: 0.5rem; grid-template-columns: repeat(3, 1fr); }
      .cp-presets { display: grid; gap: 0.375rem; grid-template-columns: repeat(3, 1fr); }
    `
    document.head.appendChild(el)
  }, [])

  // ── Shared styles ───────────────────────────────────────────────────────────
  const card = {
    background: 'var(--bg-2)',
    border: '1px solid var(--line)',
    borderRadius: 12,
  } as const

  const label10 = {
    fontFamily: 'var(--font-ui)',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: 'var(--fg-4)',
  }

  return (
    <>
      <Helmet><title>Clientes — {shopName}</title></Helmet>

      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 105px)', gap: '0.875rem' }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.1em', color: 'var(--fg-0)', margin: 0 }}>
              CLIENTES
            </h1>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--fg-4)', margin: '0.15rem 0 0' }}>
              {tab === 'fidelizacion' ? 'Configura la tarjeta de fidelización' : 'Gestiona tarjetas y puntos'}
            </p>
          </div>
          {/* Tab pills */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg-2)', borderRadius: 9, padding: 3, border: '1px solid var(--line)' }}>
            {(['fidelizacion', 'clientes'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '0.4rem 1.125rem', borderRadius: 7, border: 'none',
                background: tab === t ? 'var(--bg-0)' : 'transparent',
                color: tab === t ? 'var(--fg-0)' : 'var(--fg-3)',
                fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: tab === t ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.12s',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              }}>
                {t === 'fidelizacion' ? 'Fidelización' : 'Clientes'}
              </button>
            ))}
          </div>
        </div>

        {/* ── FIDELIZACIÓN ────────────────────────────────────────────────────── */}
        {tab === 'fidelizacion' && (
          <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 360px', gap: '0.875rem' }}>

            {/* LEFT: editor */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Editor header */}
              <div style={{ flexShrink: 0, padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <span style={{ ...label10, flexShrink: 0 }}>Modalidad</span>
                <div style={{ display: 'flex', gap: 2, background: 'var(--bg-3)', borderRadius: 7, padding: 3 }}>
                  {(['tiers', 'simple'] as const).map(m => (
                    <button key={m} onClick={() => patchCard({ mode: m })} style={{
                      padding: '0.3rem 0.875rem', borderRadius: 5, cursor: 'pointer', border: 'none',
                      background: localMode === m ? 'var(--bg-1)' : 'transparent',
                      boxShadow: localMode === m ? '0 1px 3px rgba(0,0,0,0.35)' : 'none',
                      fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: localMode === m ? 600 : 400,
                      color: localMode === m ? 'var(--fg-0)' : 'var(--fg-3)', transition: 'all 0.1s',
                    }}>
                      {m === 'tiers' ? 'Por Niveles' : 'Puntos Simples'}
                    </button>
                  ))}
                </div>

                {/* Saved-mode indicator — always visible */}
                {loyaltyConfig && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)' }}>Guardado:</span>
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--font-ui)', fontWeight: 600,
                      padding: '2px 8px', borderRadius: 4,
                      background: 'var(--bg-3)', border: '1px solid var(--line)',
                      color: tiersDirty && localMode !== loyaltyConfig.mode ? 'var(--fg-3)' : 'var(--fg-1)',
                      textDecoration: tiersDirty && localMode !== loyaltyConfig.mode ? 'line-through' : 'none',
                    }}>
                      {loyaltyConfig.mode === 'tiers' ? 'Por Niveles' : 'Puntos Simples'}
                    </span>
                    {tiersDirty && localMode !== loyaltyConfig.mode && (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-ui)', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(201,162,74,0.12)', border: '1px solid rgba(201,162,74,0.4)', color: 'var(--gold)' }}>
                          {localMode === 'tiers' ? 'Por Niveles' : 'Puntos Simples'}
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {tiersDirty && (
                    <span style={{ fontSize: 9, color: 'var(--gold)', fontFamily: 'var(--font-ui)', background: 'rgba(201,162,74,0.1)', border: '1px solid rgba(201,162,74,0.3)', borderRadius: 4, padding: '2px 7px', fontWeight: 700, letterSpacing: '0.08em' }}>
                      SIN GUARDAR
                    </span>
                  )}
                  <InfoButton title="GUÍA — FIDELIZACIÓN" items={[
                    { icon: '🃏', label: 'Modalidad', description: '"Por Niveles": el cliente sube de nivel acumulando puntos. "Puntos Simples": barra de progreso hasta el máximo.' },
                    { icon: '🏆', label: 'Niveles', description: 'Define cada nivel con nombre, color y puntos mínimos. Añade recompensas por nivel.' },
                    { icon: '🎁', label: 'Recompensas', description: '"Permanente": siempre visible. "Un uso": desaparece al canjear.' },
                    { icon: '💾', label: 'Guardar', description: 'Los cambios no se aplican hasta pulsar "Guardar cambios".' },
                  ]} />
                </div>
              </div>

              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* TIERS MODE */}
                {localMode === 'tiers' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {[...localTiers].sort((a, b) => a.minPoints - b.minPoints).map((tier, idx, sorted) => {
                        const nextMin = sorted[idx + 1]?.minPoints ?? Infinity
                        const isActive = simPoints >= tier.minPoints && simPoints < nextMin
                        const expanded = expandedTierId === tier.id
                        return (
                          <div key={tier.id} style={{
                            borderRadius: 10,
                            border: `1px solid ${expanded ? 'var(--led)' : isActive ? tier.color + '55' : 'var(--line)'}`,
                            background: isActive ? tier.color + '0d' : 'var(--bg-3)',
                            overflow: 'hidden', transition: 'all 0.12s',
                          }}>
                            {/* Row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.6rem 0.875rem', cursor: 'pointer' }}
                              onClick={() => setExpandedTierId(expanded ? null : tier.id)}>
                              <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, background: tier.color, boxShadow: `0 0 7px ${tier.color}88` }} />
                              <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {tier.name || 'Sin nombre'}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>
                                {tier.minPoints === 0 ? 'Base' : `≥${tier.minPoints} pts`}
                              </span>
                              {tier.rewards.length > 0 && (
                                <span style={{ fontSize: 9, color: 'var(--gold)', fontFamily: 'var(--font-ui)', background: 'rgba(201,162,74,0.1)', border: '1px solid rgba(201,162,74,0.25)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
                                  {tier.rewards.length} premio{tier.rewards.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--fg-4)" strokeWidth="1.5"
                                style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                                <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <button onClick={e => { e.stopPropagation(); handleDeleteTier(tier.id) }}
                                title="Eliminar nivel"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6, minWidth: 24, minHeight: 24, flexShrink: 0 }}>
                                <Icon name="trash" size={13} />
                              </button>
                            </div>

                            {/* Expanded form */}
                            {expanded && (
                              <div style={{ borderTop: '1px solid var(--line)', padding: '0.875rem', background: 'var(--bg-4)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                                onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: '0.5rem' }}>
                                  <div>
                                    <label style={{ ...label10, display: 'block', marginBottom: 3 }}>Nombre</label>
                                    <input value={tier.name} onChange={e => handleUpdateTier(tier.id, 'name', e.target.value.toUpperCase())}
                                      style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.1em', outline: 'none' }} />
                                  </div>
                                  <div>
                                    <label style={{ ...label10, display: 'block', marginBottom: 3 }}>Color</label>
                                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                      <input type="color" value={tier.color} onChange={e => handleUpdateTier(tier.id, 'color', e.target.value)}
                                        style={{ width: 30, height: 30, padding: 2, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg-3)', cursor: 'pointer', flexShrink: 0 }} />
                                      <input value={tier.color} onChange={e => handleUpdateTier(tier.id, 'color', e.target.value)}
                                        style={{ flex: 1, minWidth: 0, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.4rem', color: 'var(--fg-0)', fontFamily: 'var(--font-mono, monospace)', fontSize: 10, outline: 'none' }} />
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ ...label10, display: 'block', marginBottom: 3 }}>Desde</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <input type="number" value={tier.minPoints} min={0} onChange={e => handleUpdateTier(tier.id, 'minPoints', Number(e.target.value))}
                                        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.35rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 12, outline: 'none', textAlign: 'center' }} />
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ ...label10, marginBottom: '0.4rem' }}>Recompensas del nivel</div>
                                  {tier.rewards.length === 0 && (
                                    <p style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', margin: '0 0 0.4rem' }}>Sin recompensas aún</p>
                                  )}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.4rem' }}>
                                    {tier.rewards.map(r => {
                                      const rType  = r.rewardType  ?? 'gift'
                                      const rValue = r.rewardValue
                                      const TIER_REWARD_TYPES: { value: LoyaltyRewardType; label: string; border: string; bg: string; color: string }[] = [
                                        { value: 'price',      label: '€ Precio', border: 'rgba(201,162,74,0.5)',  bg: 'rgba(201,162,74,0.1)',  color: 'var(--gold)' },
                                        { value: 'percentage', label: '% Desc.',  border: 'rgba(123,79,255,0.5)',  bg: 'rgba(123,79,255,0.08)', color: 'var(--led)' },
                                        { value: 'gift',       label: '♦ Regalo', border: 'rgba(96,180,120,0.5)', bg: 'rgba(96,180,120,0.1)',  color: 'var(--ok)' },
                                      ]
                                      return (
                                        <div key={r.id} style={{ background: 'var(--bg-2)', borderRadius: 7, border: '1px solid var(--line)', padding: '0.4rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                            <input value={r.label} onChange={e => handleUpdateTierReward(tier.id, r.id, 'label', e.target.value)} placeholder="Nombre"
                                              style={{ flex: 1, minWidth: 0, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 5, padding: '0.28rem 0.4rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 11, outline: 'none' }} />
                                            <input type="number" value={r.cost} min={1}
                                              onChange={e => { const v = parseInt(e.target.value, 10); if (v > 0) handleUpdateTierReward(tier.id, r.id, 'cost', v) }}
                                              onBlur={e => { if (!e.target.value || Number(e.target.value) < 1) handleUpdateTierReward(tier.id, r.id, 'cost', 1) }}
                                              style={{ width: 60, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 5, padding: '0.28rem', color: 'var(--gold)', fontFamily: 'var(--font-ui)', fontSize: 11, outline: 'none', textAlign: 'center', flexShrink: 0 }} />
                                            <span style={{ fontSize: 9, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>pts</span>
                                            <button onClick={() => handleDeleteTierReward(tier.id, r.id)}
                                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6, minWidth: 20, minHeight: 20, flexShrink: 0 }}>
                                              <Icon name="x" size={12} />
                                            </button>
                                          </div>
                                          <div style={{ display: 'flex', gap: 3 }}>
                                            {(['false', 'true'] as const).map(val => {
                                              const isPerm = val === 'true'
                                              const active = (r.isPermanent ?? false) === isPerm
                                              return (
                                                <button key={val} onClick={() => handleUpdateTierReward(tier.id, r.id, 'isPermanent', isPerm)} style={{
                                                  padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
                                                  border: `1px solid ${active ? (isPerm ? 'rgba(201,162,74,0.5)' : 'rgba(96,180,120,0.5)') : 'var(--line)'}`,
                                                  background: active ? (isPerm ? 'rgba(201,162,74,0.1)' : 'rgba(96,180,120,0.1)') : 'transparent',
                                                  color: active ? (isPerm ? 'var(--gold)' : 'var(--ok)') : 'var(--fg-4)',
                                                  fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: active ? 700 : 400,
                                                }}>
                                                  {isPerm ? '★ Permanente' : '↺ Un uso'}
                                                </button>
                                              )
                                            })}
                                          </div>
                                          {/* Tipo de recompensa */}
                                          <div style={{ display: 'flex', gap: 3, paddingTop: 2 }}>
                                            {TIER_REWARD_TYPES.map(t => {
                                              const active = rType === t.value
                                              return (
                                                <button key={t.value} onClick={() => handleUpdateTierReward(tier.id, r.id, 'rewardType', t.value)} style={{
                                                  flex: 1, padding: '2px 4px', borderRadius: 4, cursor: 'pointer',
                                                  border: `1px solid ${active ? t.border : 'var(--line)'}`,
                                                  background: active ? t.bg : 'transparent',
                                                  color: active ? t.color : 'var(--fg-4)',
                                                  fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: active ? 700 : 400,
                                                  transition: 'all 0.1s',
                                                }}>
                                                  {t.label}
                                                </button>
                                              )
                                            })}
                                          </div>
                                          {(rType === 'price' || rType === 'percentage') && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingTop: 2 }}>
                                              <input type="number" min={0} value={rValue ?? ''}
                                                placeholder="0"
                                                onChange={e => { const v = parseFloat(e.target.value); handleUpdateTierReward(tier.id, r.id, 'rewardValue', isNaN(v) ? 0 : v) }}
                                                style={{ width: 72, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 5, padding: '0.22rem 0.3rem', color: rType === 'price' ? 'var(--gold)' : 'var(--led)', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                                              <span style={{ fontSize: 9, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)' }}>
                                                {rType === 'price' ? '€ descuento' : '% descuento'}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                  <button onClick={() => handleAddTierReward(tier.id)}
                                    style={{ padding: '0.2rem 0.6rem', minHeight: 26, borderRadius: 5, border: '1px dashed var(--line)', background: 'transparent', color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 10, cursor: 'pointer' }}>
                                    + recompensa
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <button onClick={handleAddTier}
                      style={{ padding: '0.5rem', minHeight: 38, borderRadius: 8, border: '1px dashed rgba(123,79,255,0.4)', background: 'rgba(123,79,255,0.04)', color: 'var(--led-soft)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Icon name="plus" size={14} />
                      Añadir nivel
                    </button>
                  </>
                )}

                {/* SIMPLE MODE */}
                {localMode === 'simple' && (() => {
                  const REWARD_TYPES: { value: LoyaltyRewardType; label: string; accentColor: string; borderActive: string; bgActive: string }[] = [
                    { value: 'price',      label: '€ Precio',   accentColor: 'var(--gold)',   borderActive: 'rgba(201,162,74,0.5)',  bgActive: 'rgba(201,162,74,0.1)' },
                    { value: 'percentage', label: '% Desc.',     accentColor: 'var(--led)',    borderActive: 'rgba(123,79,255,0.5)',  bgActive: 'rgba(123,79,255,0.08)' },
                    { value: 'gift',       label: '♦ Regalo',   accentColor: 'var(--ok)',     borderActive: 'rgba(96,180,120,0.5)', bgActive: 'rgba(96,180,120,0.1)' },
                  ]
                  const getRewardType = (id: string): LoyaltyRewardType =>
                    rewardEdits[id]?.rewardType ?? localSimpleRewardMeta[id]?.rewardType ?? 'gift'
                  const getRewardValue = (id: string): number | undefined =>
                    rewardEdits[id]?.rewardValue ?? localSimpleRewardMeta[id]?.rewardValue
                  const patchRewardEdit = (id: string, patch: Partial<typeof rewardEdits[string]>, r: Reward) =>
                    setRewardEdits(ed => ({ ...ed, [id]: { label: ed[id]?.label ?? r.label, cost: ed[id]?.cost ?? r.cost, rewardType: ed[id]?.rewardType ?? getRewardType(id), rewardValue: ed[id]?.rewardValue ?? getRewardValue(id), ...patch } }))

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Color de tarjeta */}
                      <div>
                        <label style={{ ...label10, display: 'block', marginBottom: '0.4rem' }}>Color de tarjeta</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="color" value={localSimpleColor} onChange={e => patchCard({ simpleColor: e.target.value })}
                            style={{ width: 38, height: 38, padding: 3, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-3)', cursor: 'pointer', flexShrink: 0 }} />
                          <input value={localSimpleColor} onChange={e => patchCard({ simpleColor: e.target.value })}
                            style={{ width: 100, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 7, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12, outline: 'none' }} />
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {['#7b4fff', '#c9a24a', '#607890', '#60b478', '#c04040', '#4080c0', '#c07840', '#808080'].map(c => (
                              <button key={c} onClick={() => patchCard({ simpleColor: c })}
                                style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: `2px solid ${localSimpleColor === c ? '#fff' : 'transparent'}`, cursor: 'pointer', flexShrink: 0, boxShadow: localSimpleColor === c ? `0 0 0 1px ${c}` : 'none' }} />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                        <div>
                          <label style={{ ...label10, display: 'block', marginBottom: '0.4rem' }}>Puntos máximos</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="number" value={localMaxPoints} min={1}
                              onChange={e => { const v = parseInt(e.target.value, 10); if (v > 0) patchCard({ maxPoints: v }) }}
                              onBlur={e => { if (!e.target.value || Number(e.target.value) < 1) patchCard({ maxPoints: 1 }) }}
                              style={{ width: 120, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 7, padding: '0.5rem 0.625rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                            <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>pts</span>
                          </div>
                        </div>
                        <div>
                          <label style={{ ...label10, display: 'block', marginBottom: '0.4rem' }}>Canjeo de recompensas</label>
                          <div style={{ display: 'flex', gap: 3, background: 'var(--bg-3)', borderRadius: 7, padding: 3 }}>
                            {(['one_time', 'repeatable'] as const).map(mode => (
                              <button key={mode} onClick={() => patchCard({ rewardMode: mode })} style={{
                                flex: 1, padding: '0.4rem', borderRadius: 5, cursor: 'pointer', border: 'none',
                                background: localRewardMode === mode ? 'var(--bg-1)' : 'transparent',
                                boxShadow: localRewardMode === mode ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                                fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: localRewardMode === mode ? 600 : 400,
                                color: localRewardMode === mode ? 'var(--fg-0)' : 'var(--fg-3)', transition: 'all 0.1s',
                              }}>
                                {mode === 'one_time' ? 'Una vez' : 'Repetible'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div style={{ ...label10, marginBottom: '0.5rem' }}>Recompensas</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {rewardsData.map(r => {
                            const currentType = getRewardType(r.id)
                            const currentValue = getRewardValue(r.id)
                            const typeInfo = REWARD_TYPES.find(t => t.value === currentType)!
                            return editingRewardId === r.id ? (
                              <div key={r.id} style={{ background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--led)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '0.4rem' }}>
                                  <div>
                                    <label style={{ ...label10, display: 'block', marginBottom: 3 }}>Nombre</label>
                                    <input value={rewardEdits[r.id]?.label ?? r.label}
                                      onChange={e => patchRewardEdit(r.id, { label: e.target.value }, r)}
                                      style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem 0.5rem', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }} />
                                  </div>
                                  <div>
                                    <label style={{ ...label10, display: 'block', marginBottom: 3 }}>Puntos</label>
                                    <input type="number" value={rewardEdits[r.id]?.cost ?? r.cost}
                                      onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) patchRewardEdit(r.id, { cost: v }, r) }}
                                      style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 6, padding: '0.4rem', color: 'var(--gold)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                                  </div>
                                </div>
                                {/* Tipo de recompensa */}
                                <div>
                                  <label style={{ ...label10, display: 'block', marginBottom: 4 }}>Tipo de recompensa</label>
                                  <div style={{ display: 'flex', gap: 3 }}>
                                    {REWARD_TYPES.map(t => {
                                      const active = currentType === t.value
                                      return (
                                        <button key={t.value} onClick={() => patchRewardEdit(r.id, { rewardType: t.value }, r)} style={{
                                          flex: 1, padding: '0.3rem 0.4rem', borderRadius: 5, cursor: 'pointer',
                                          border: `1px solid ${active ? t.borderActive : 'var(--line)'}`,
                                          background: active ? t.bgActive : 'transparent',
                                          color: active ? t.accentColor : 'var(--fg-4)',
                                          fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: active ? 700 : 400,
                                          transition: 'all 0.1s',
                                        }}>
                                          {t.label}
                                        </button>
                                      )
                                    })}
                                  </div>
                                  {(currentType === 'price' || currentType === 'percentage') && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.375rem' }}>
                                      <input type="number" min={0} value={currentValue ?? ''}
                                        placeholder="0"
                                        onChange={e => { const v = parseFloat(e.target.value); patchRewardEdit(r.id, { rewardValue: isNaN(v) ? undefined : v }, r) }}
                                        style={{ width: 90, background: 'var(--bg-4)', border: '1px solid var(--line)', borderRadius: 5, padding: '0.3rem 0.4rem', color: typeInfo.accentColor, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                                      <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>
                                        {currentType === 'price' ? '€ de descuento' : '% de descuento'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                  <button onClick={() => { setEditingRewardId(null); setRewardEdits(e => { const c = { ...e }; delete c[r.id]; return c }) }}
                                    style={{ padding: '0.35rem 0.875rem', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                                  <button onClick={() => handleSaveReward(r)} disabled={updateRewardMut.isPending}
                                    style={{ padding: '0.35rem 1rem', borderRadius: 6, border: 'none', background: 'var(--led)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: updateRewardMut.isPending ? 0.5 : 1 }}>
                                    {updateRewardMut.isPending ? 'Guardando…' : 'Guardar'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--line)' }}>
                                <span style={{ flex: 1, fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{r.label}</span>
                                <span style={{ fontSize: 9, fontFamily: 'var(--font-ui)', fontWeight: 700, padding: '2px 6px', borderRadius: 4, border: `1px solid ${typeInfo.borderActive}`, background: typeInfo.bgActive, color: typeInfo.accentColor, flexShrink: 0 }}>
                                  {currentType === 'price' ? `€${currentValue ?? ''}` : currentType === 'percentage' ? `${currentValue ?? ''}%` : '♦'}
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-ui)', fontWeight: 600, flexShrink: 0 }}>{r.cost} pts</span>
                                <button onClick={() => { setEditingRewardId(r.id); patchRewardEdit(r.id, {}, r) }}
                                  style={{ padding: '0.25rem 0.625rem', minHeight: 28, borderRadius: 5, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                                  Editar
                                </button>
                                <button onClick={() => deleteReward.mutate(r.id)}
                                  title="Eliminar recompensa"
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.65, minWidth: 28, minHeight: 28, flexShrink: 0 }}>
                                  <Icon name="trash" size={14} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                        <button onClick={handleAddReward}
                          style={{ marginTop: '0.4rem', padding: '0.4rem 0.75rem', minHeight: 34, borderRadius: 6, border: '1px dashed var(--line)', background: 'transparent', color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Icon name="plus" size={13} />
                          Añadir recompensa
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Editor footer */}
              <div style={{ flexShrink: 0, padding: '0.75rem 1.25rem', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.625rem' }}>
                {configError  && <span style={{ fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--font-ui)', marginRight: 'auto' }}>{configError}</span>}
                {configSaved  && !configError && (
                  <span style={{ fontSize: 11, color: 'var(--ok)', fontFamily: 'var(--font-ui)', marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Configuración guardada correctamente
                  </span>
                )}
                {tiersDirty && (
                  <button onClick={() => setPendingLoyaltyCard(null)}
                    style={{ padding: '0.45rem 0.875rem', minHeight: 36, borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer' }}>
                    Descartar
                  </button>
                )}
                <button
                  onClick={handleSaveLoyaltyCardConfig}
                  disabled={updateLoyaltyConfig.isPending || !tiersDirty}
                  style={{ padding: '0.45rem 1.375rem', minHeight: 36, borderRadius: 7, border: 'none', background: 'var(--led)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: tiersDirty ? 'pointer' : 'default', opacity: (!tiersDirty || updateLoyaltyConfig.isPending) ? 0.4 : 1 }}>
                  {updateLoyaltyConfig.isPending ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>

            {/* RIGHT: live preview */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={label10}>Vista previa en vivo</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)' }}>Simula</span>
                  <input type="number" value={simPoints} min={0} onChange={e => setSimPoints(Number(e.target.value))}
                    style={{ width: 64, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 5, padding: '3px 6px', color: 'var(--fg-0)', fontFamily: 'var(--font-ui)', fontSize: 11, outline: 'none', textAlign: 'center' }} />
                  <span style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)' }}>pts</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
                <LoyaltyCard
                  points={simPoints} target={500} stamps={8} memberCode="PREVIEW00"
                  rewards={[{ id: 'p1', label: 'Descuento 10%', cost: 200, canRedeem: simPoints >= 200 }]}
                  loyaltyMode={localMode}
                  configTiers={localMode === 'tiers' ? localTiers : undefined}
                  maxPoints={localMode === 'simple' ? localMaxPoints : undefined}
                  simpleColor={localMode === 'simple' ? localSimpleColor : undefined}
                />
                <p style={{ fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-ui)', textAlign: 'center', marginTop: '0.75rem', letterSpacing: '0.04em' }}>
                  Cambia «Simula» para ver diferentes niveles
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── CLIENTES ────────────────────────────────────────────────────────── */}
        {tab === 'clientes' && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

            {/* Search bar */}
            <div style={{ flexShrink: 0, ...card, padding: '0.875rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={() => setQrScanOpen(true)} title="Escanear QR"
                  style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-3)', color: 'var(--fg-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
                    <rect x="3" y="16" width="5" height="5" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
                    <path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/>
                    <path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
                  </svg>
                </button>
                <input
                  value={cardSearchInput}
                  onChange={e => setCardSearchInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && setCardSearchQuery(cardSearchInput.trim() || null)}
                  placeholder="Código de miembro  (ej. A1B2C3D4)"
                  style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 8, padding: '0.6rem 0.875rem', color: 'var(--fg-0)', fontFamily: 'var(--font-mono, monospace)', fontSize: 13, letterSpacing: '0.1em', outline: 'none' }}
                />
                <button
                  onClick={() => { setAdjPoints(''); setAdjError(null); setAdjSuccess(false); setCardSearchQuery(cardSearchInput.trim() || null) }}
                  disabled={cardSearchFetching || !cardSearchInput.trim()}
                  style={{ padding: '0.6rem 1.375rem', minWidth: 88, borderRadius: 8, border: 'none', background: 'var(--led)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: cardSearchInput.trim() ? 'pointer' : 'default', opacity: (!cardSearchInput.trim() || cardSearchFetching) ? 0.5 : 1, flexShrink: 0 }}>
                  {cardSearchFetching ? '…' : 'Buscar'}
                </button>
                {cardSearchQuery && (
                  <button onClick={() => { setCardSearchQuery(null); setCardSearchInput(''); setAdjPoints(''); setAdjError(null) }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-3)', cursor: 'pointer', flexShrink: 0 }}>
                    <Icon name="x" size={14} />
                  </button>
                )}
                <InfoButton title="GUÍA — CLIENTES" items={[
                  { icon: '📷', label: 'Escanear QR', description: 'Pulsa el icono de cámara para escanear el QR del cliente directamente.' },
                  { icon: '🔍', label: 'Buscar por código', description: 'Introduce el código de miembro y pulsa Buscar (o Enter).' },
                  { icon: '⚡', label: 'Ajuste de puntos', description: 'Añade o resta puntos con descripción del motivo.' },
                  { icon: '🗑️', label: 'Limpiar historial', description: 'Elimina todas las transacciones del cliente. Irreversible.' },
                ]} />
              </div>
            </div>

            {/* Results area */}
            {cardSearchQuery && !cardSearchFetching && (
              cardSearchError ? (
                <div style={{ padding: '1rem', background: 'rgba(192,64,64,0.06)', border: '1px solid rgba(192,64,64,0.2)', borderRadius: 10, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--danger)' }}>
                  Error al buscar. Revisa la conexión.
                </div>
              ) : !foundCard ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-3)', margin: 0 }}>No se encontró ninguna tarjeta con ese código</p>
                </div>
              ) : (() => {
                const adjVal = parseInt(adjPoints, 10)
                const adjValid = adjPoints.trim() !== '' && !isNaN(adjVal) && adjVal !== 0
                const adjNeg = adjValid && adjVal < 0
                return (
                  <div className="cp-results" style={{ flex: 1 }}>

                    {/* LEFT: card + stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                      <div style={{ ...card, padding: '1.25rem' }}>
                        <LoyaltyCard
                          points={foundCard.points} target={500}
                          stamps={foundCard.totalVisits}
                          memberCode={foundCard.memberCode ?? ''}
                          createdAt={foundCard.createdAt}
                          completedCycles={foundCard.completedCycles}
                          loyaltyMode={loyaltyConfig?.mode}
                          configTiers={loyaltyConfig?.tiers?.length ? loyaltyConfig.tiers : undefined}
                          maxPoints={loyaltyConfig?.maxPoints}
                        />
                      </div>
                      <div className="cp-stats">
                        {([
                          { label: 'Puntos', value: foundCard.points.toLocaleString('es-ES'), color: 'var(--gold)' },
                          { label: 'Visitas', value: String(foundCard.totalVisits), color: 'var(--fg-1)' },
                          { label: 'Miembro desde', value: new Date(foundCard.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }), color: 'var(--fg-1)' },
                        ] as const).map(({ label, value, color }) => (
                          <div key={label} style={{ ...card, padding: '0.625rem 0.875rem' }}>
                            <div style={{ ...label10, marginBottom: 4 }}>{label}</div>
                            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 700, color }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* RIGHT: adjust points */}
                    <div style={{ ...card, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                      {/* Current balance */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ ...label10, marginBottom: 5 }}>Balance actual</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1, color: 'var(--gold)', letterSpacing: '-0.02em' }}>
                            {foundCard.points.toLocaleString('es-ES')}
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--fg-4)', marginLeft: 6, fontWeight: 400, letterSpacing: 0 }}>pts</span>
                          </div>
                        </div>
                        {adjValid && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ ...label10, marginBottom: 5 }}>Nuevo balance</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1, color: adjNeg ? 'var(--danger)' : 'var(--ok)', letterSpacing: '-0.02em' }}>
                              {Math.max(0, foundCard.points + adjVal).toLocaleString('es-ES')}
                              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--fg-4)', marginLeft: 5, fontWeight: 400 }}>pts</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ height: 1, background: 'var(--line)' }} />

                      {/* Input stepper */}
                      <div>
                        <div style={{ ...label10, marginBottom: '0.5rem' }}>Ajuste de puntos</div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                          <button
                            onClick={() => { setAdjPoints(p => String((parseInt(p, 10) || 0) - 10)); setAdjError(null) }}
                            style={{ width: 42, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-3)', color: 'var(--danger)', fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 700, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            −
                          </button>
                          <input
                            type="number" value={adjPoints}
                            onChange={e => { setAdjPoints(e.target.value); setAdjError(null) }}
                            placeholder="0"
                            style={{
                              flex: 1, minWidth: 0, boxSizing: 'border-box', height: 50,
                              background: 'var(--bg-3)',
                              border: `2px solid ${adjError ? 'var(--danger)' : adjValid ? (adjNeg ? 'rgba(192,64,64,0.45)' : 'rgba(201,162,74,0.45)') : 'var(--line)'}`,
                              borderRadius: 8, padding: '0 0.5rem',
                              color: adjNeg ? 'var(--danger)' : adjValid ? 'var(--gold)' : 'var(--fg-2)',
                              fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
                              outline: 'none', textAlign: 'center', transition: 'border-color 0.15s',
                            }}
                          />
                          <button
                            onClick={() => { setAdjPoints(p => String((parseInt(p, 10) || 0) + 10)); setAdjError(null) }}
                            style={{ width: 42, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-3)', color: 'var(--ok)', fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 700, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            +
                          </button>
                        </div>
                      </div>

                      {/* Quick presets */}
                      <div>
                        <div style={{ ...label10, marginBottom: '0.5rem' }}>Accesos rápidos</div>
                        <div className="cp-presets">
                          {([-50, -20, -10, 10, 20, 50] as const).map(v => {
                            const neg = v < 0
                            const active = adjVal === v
                            return (
                              <button key={v}
                                onClick={() => { setAdjPoints(String(v)); setAdjError(null) }}
                                style={{
                                  padding: '0.45rem 0', borderRadius: 7, cursor: 'pointer',
                                  border: `1px solid ${active ? (neg ? 'rgba(192,64,64,0.5)' : 'rgba(201,162,74,0.5)') : 'var(--line)'}`,
                                  background: active ? (neg ? 'rgba(192,64,64,0.1)' : 'rgba(201,162,74,0.08)') : 'var(--bg-3)',
                                  color: neg ? 'var(--danger)' : 'var(--gold)',
                                  fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 700,
                                  transition: 'all 0.1s',
                                }}>
                                {v > 0 ? `+${v}` : v}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Feedback */}
                      {adjError && (
                        <p style={{ color: 'var(--danger)', fontSize: 11, fontFamily: 'var(--font-ui)', margin: 0 }}>{adjError}</p>
                      )}
                      {adjSuccess && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--ok)', fontFamily: 'var(--font-ui)', fontSize: 11 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Puntos aplicados correctamente
                        </div>
                      )}

                      {/* Apply button */}
                      <button
                        onClick={handleAdjustPoints}
                        disabled={manualAdjust.isPending || !adjValid}
                        style={{
                          width: '100%', padding: '0.7rem', minHeight: 44, borderRadius: 8, border: 'none',
                          background: adjValid ? (adjNeg ? 'var(--danger)' : 'var(--led)') : 'var(--bg-3)',
                          color: adjValid ? '#fff' : 'var(--fg-4)',
                          fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
                          cursor: adjValid ? 'pointer' : 'default',
                          opacity: manualAdjust.isPending ? 0.6 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        {manualAdjust.isPending
                          ? 'Aplicando…'
                          : adjValid
                            ? adjNeg
                              ? `Restar ${Math.abs(adjVal).toLocaleString('es-ES')} pts`
                              : `Añadir ${adjVal.toLocaleString('es-ES')} pts`
                            : 'Selecciona una cantidad'}
                      </button>
                    </div>
                  </div>
                )
              })()
            )}

            {/* Initial empty state */}
            {!cardSearchQuery && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
                  <rect x="3" y="16" width="5" height="5" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
                  <path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/>
                  <path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
                </svg>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-2)', margin: 0, fontWeight: 500 }}>Busca un cliente</p>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-4)', margin: '0.25rem 0 0' }}>Escanea su QR o introduce el código de miembro</p>
                </div>
              </div>
            )}

            {/* QR scanner modal */}
            {qrScanOpen && (
              <QRScannerModal
                onScan={code => {
                  setQrScanOpen(false)
                  setCardSearchInput(code)
                  setAdjPoints(''); setAdjError(null); setAdjSuccess(false)
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
