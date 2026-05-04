import { useState, useId } from 'react'
import type { CustomPalette, PaletteTokens } from '@/domain/colorTheme'

interface CustomPaletteEditorProps {
  mode: 'dark' | 'light'
  onSave: (palette: CustomPalette) => void
  initialValues?: CustomPalette
  onCancel?: () => void
}

function deriveSecondary(hex: string, mode: 'dark' | 'light'): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mix = mode === 'dark' ? 180 : 80
  const nr = Math.round(r + (mix - r) * 0.45)
  const ng = Math.round(g + (mix - g) * 0.45)
  const nb = Math.round(b + (mix - b) * 0.45)
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}

function tokensFromBaseColors(led: string, gold: string, brick: string, mode: 'dark' | 'light'): PaletteTokens {
  return {
    led,
    ledSoft: deriveSecondary(led, mode),
    gold,
    brick,
    brickWarm: deriveSecondary(brick, mode),
  }
}

export function CustomPaletteEditor({ mode, onSave, initialValues, onCancel }: CustomPaletteEditorProps) {
  const uid = useId()
  const [name, setName] = useState(initialValues?.name ?? '')
  const [led, setLed] = useState(initialValues?.tokens.led ?? '#7b4fff')
  const [gold, setGold] = useState(initialValues?.tokens.gold ?? '#c9a24a')
  const [brick, setBrick] = useState(initialValues?.tokens.brick ?? '#8b3a1f')

  function handleSave() {
    if (!name.trim()) return
    const tokens = tokensFromBaseColors(led, gold, brick, mode)
    const palette: CustomPalette = {
      id: initialValues?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      mode,
      tokens,
    }
    onSave(palette)
  }

  return (
    <div
      className="rounded-xl border p-4 space-y-4"
      style={{ borderColor: 'var(--line)', background: 'var(--bg-2)' }}
    >
      <h4 className="text-sm font-semibold" style={{ color: 'var(--fg-0)' }}>
        {initialValues ? 'Editar paleta' : `Nueva paleta — ${mode === 'dark' ? 'oscuro' : 'claro'}`}
      </h4>

      {/* Name */}
      <div className="space-y-1">
        <label htmlFor={`${uid}-name`} className="text-[11px] font-semibold" style={{ color: 'var(--fg-2)' }}>
          Nombre
        </label>
        <input
          id={`${uid}-name`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mi paleta..."
          className="input w-full"
        />
      </div>

      {/* Color pickers */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Acento principal', value: led, set: setLed, id: `${uid}-led` },
          { label: 'Tono dorado', value: gold, set: setGold, id: `${uid}-gold` },
          { label: 'Acento secundario', value: brick, set: setBrick, id: `${uid}-brick` },
        ].map(({ label, value, set, id }) => (
          <div key={id} className="flex flex-col items-center gap-1.5">
            <label htmlFor={id} className="text-[10px] text-center leading-tight" style={{ color: 'var(--fg-3)' }}>
              {label}
            </label>
            <input
              id={id}
              type="color"
              value={value}
              onChange={(e) => set(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0"
              style={{ padding: 2, background: 'transparent' }}
            />
            <span className="text-[9px] font-mono" style={{ color: 'var(--fg-3)' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Preview swatches */}
      <div className="flex gap-1.5">
        {[led, deriveSecondary(led, mode), gold, brick, deriveSecondary(brick, mode)].map((color, i) => (
          <div key={i} className="h-4 flex-1 rounded-full" style={{ background: color }} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim()}
          className="btn primary flex-1 text-sm"
        >
          Guardar paleta
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn ghost text-sm">
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
