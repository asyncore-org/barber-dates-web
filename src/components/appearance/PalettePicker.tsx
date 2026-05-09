import type { ColorPalette, CustomPalette } from '@/domain/colorTheme'
import { PREDEFINED_PALETTES, getPaletteById } from '@/domain/colorTheme'
import { PaletteCard } from './PaletteCard'

interface PalettePickerProps {
  selectedDarkId: string | null
  selectedLightId: string | null
  customPalettes: CustomPalette[]
  onSelectDark: (id: string) => void
  onSelectLight: (id: string) => void
  onEditCustom?: (palette: CustomPalette) => void
}

const DARK_PREDEFINED = PREDEFINED_PALETTES.filter((p) => p.mode === 'dark')
const LIGHT_PREDEFINED = PREDEFINED_PALETTES.filter((p) => p.mode === 'light')

export function PalettePicker({
  selectedDarkId,
  selectedLightId,
  customPalettes,
  onSelectDark,
  onSelectLight,
  onEditCustom,
}: PalettePickerProps) {
  const customDark = customPalettes.filter((p) => p.mode === 'dark')
  const customLight = customPalettes.filter((p) => p.mode === 'light')

  function renderDarkSection() {
    const palettes: Array<ColorPalette | CustomPalette> = [...DARK_PREDEFINED, ...customDark]
    return palettes.map((palette) => {
      const pairedWith =
        'pairedWith' in palette
          ? (getPaletteById(palette.pairedWith, customPalettes) as ColorPalette | undefined)
          : undefined
      return (
        <PaletteCard
          key={palette.id}
          palette={palette}
          isSelected={selectedDarkId === palette.id}
          suggestedPair={pairedWith}
          onClick={() => onSelectDark(palette.id)}
          onEdit={
            !('pairedWith' in palette) && onEditCustom
              ? () => onEditCustom(palette as CustomPalette)
              : undefined
          }
        />
      )
    })
  }

  function renderLightSection() {
    const palettes: Array<ColorPalette | CustomPalette> = [...LIGHT_PREDEFINED, ...customLight]
    return palettes.map((palette) => {
      const pairedWith =
        'pairedWith' in palette
          ? (getPaletteById(palette.pairedWith, customPalettes) as ColorPalette | undefined)
          : undefined
      return (
        <PaletteCard
          key={palette.id}
          palette={palette}
          isSelected={selectedLightId === palette.id}
          suggestedPair={pairedWith}
          onClick={() => onSelectLight(palette.id)}
          onEdit={
            !('pairedWith' in palette) && onEditCustom
              ? () => onEditCustom(palette as CustomPalette)
              : undefined
          }
        />
      )
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3
          className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3"
          style={{ color: 'var(--fg-3)' }}
        >
          Modo oscuro
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderDarkSection()}
        </div>
      </div>

      <div>
        <h3
          className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3"
          style={{ color: 'var(--fg-3)' }}
        >
          Modo claro
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderLightSection()}
        </div>
      </div>
    </div>
  )
}
