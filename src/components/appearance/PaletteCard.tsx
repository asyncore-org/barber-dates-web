import type { ColorPalette, CustomPalette } from '@/domain/colorTheme'

interface PaletteCardProps {
  palette: ColorPalette | CustomPalette
  isSelected: boolean
  suggestedPair?: ColorPalette | CustomPalette
  onClick: () => void
  onEdit?: () => void
}

const SWATCH_KEYS: Array<keyof ColorPalette['tokens']> = [
  'led', 'ledSoft', 'gold', 'brick', 'brickWarm',
]

export function PaletteCard({ palette, isSelected, suggestedPair, onClick, onEdit }: PaletteCardProps) {
  const isPredefined = !('id' in palette && !('pairedWith' in palette))

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border p-3 transition-all"
      style={{
        borderColor: isSelected ? 'var(--gold)' : 'var(--line)',
        background: isSelected ? 'color-mix(in srgb, var(--gold) 6%, var(--bg-2))' : 'var(--bg-2)',
        boxShadow: isSelected ? '0 0 0 1px var(--gold)' : 'none',
      }}
    >
      {/* Color swatches */}
      <div className="flex gap-1.5 mb-2.5">
        {SWATCH_KEYS.map((k) => (
          <div
            key={k}
            className="h-5 flex-1 rounded-full"
            style={{ background: palette.tokens[k] }}
            title={k}
          />
        ))}
      </div>

      {/* Name */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: 'var(--fg-0)' }}>
            {'name' in palette && 'nameEs' in palette
              ? (palette as ColorPalette).name
              : palette.name}
          </p>
          {'nameEs' in palette && (
            <p className="text-[11px] leading-tight truncate" style={{ color: 'var(--fg-3)' }}>
              {(palette as ColorPalette).nameEs}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded"
            style={{
              background: palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              color: 'var(--fg-3)',
            }}
          >
            {palette.mode === 'dark' ? 'DARK' : 'LIGHT'}
          </span>
          {isSelected && (
            <span className="text-[9px] font-bold" style={{ color: 'var(--gold)' }}>✓</span>
          )}
        </div>
      </div>

      {/* Suggested pair */}
      {suggestedPair && (
        <p className="mt-1.5 text-[10px]" style={{ color: 'var(--fg-3)' }}>
          Pareja: {suggestedPair.name}
        </p>
      )}

      {/* Edit button for custom palettes */}
      {onEdit && !isPredefined && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="mt-2 text-[10px] underline"
          style={{ color: 'var(--led-soft)' }}
        >
          Editar
        </button>
      )}
    </button>
  )
}
