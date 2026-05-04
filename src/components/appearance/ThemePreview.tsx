import type { PaletteTokens } from '@/domain/colorTheme'
import { PreviewHeroMock } from './PreviewHeroMock'
import { PreviewCalendarMock } from './PreviewCalendarMock'

interface ThemePreviewProps {
  darkTokens: PaletteTokens | null
  lightTokens: PaletteTokens | null
}

function toVars(tokens: PaletteTokens): React.CSSProperties {
  return {
    '--led': tokens.led,
    '--led-soft': tokens.ledSoft,
    '--gold': tokens.gold,
    '--brick': tokens.brick,
    '--brick-warm': tokens.brickWarm,
  } as React.CSSProperties
}

export function ThemePreview({ darkTokens, lightTokens }: ThemePreviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Dark preview */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--fg-3)' }}>
          Modo oscuro — Inicio
        </p>
        <div
          style={darkTokens ? toVars(darkTokens) : undefined}
          className="pointer-events-none select-none rounded-xl overflow-hidden ring-1 ring-white/10"
        >
          <PreviewHeroMock />
        </div>
      </div>

      {/* Light preview */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--fg-3)' }}>
          Modo claro — Reservar
        </p>
        <div
          data-theme="light"
          style={lightTokens ? toVars(lightTokens) : undefined}
          className="pointer-events-none select-none rounded-xl overflow-hidden ring-1 ring-black/10"
        >
          <PreviewCalendarMock />
        </div>
      </div>
    </div>
  )
}
