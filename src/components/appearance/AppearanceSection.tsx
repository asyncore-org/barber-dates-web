import { useState } from 'react'
import type { ColorThemeConfig, CustomPalette } from '@/domain/colorTheme'
import { getPaletteById, DEFAULT_DARK_PALETTE_ID, DEFAULT_LIGHT_PALETTE_ID } from '@/domain/colorTheme'
import { useColorTheme, useMutateColorTheme } from '@/hooks/useColorTheme'
import { PalettePicker } from './PalettePicker'
import { ThemePreview } from './ThemePreview'
import { CustomPaletteEditor } from './CustomPaletteEditor'

type EditorState =
  | { open: false }
  | { open: true; mode: 'dark' | 'light'; editing?: CustomPalette }

export function AppearanceSection() {
  const { data: savedConfig, isLoading, isError } = useColorTheme()
  const { mutate: saveTheme, isPending: isSaving } = useMutateColorTheme()

  const [pendingDarkId, setPendingDarkId] = useState<string | null>(null)
  const [pendingLightId, setPendingLightId] = useState<string | null>(null)
  const [pendingCustom, setPendingCustom] = useState<CustomPalette[]>([])
  const [editor, setEditor] = useState<EditorState>({ open: false })
  const [confirmOpen, setConfirmOpen] = useState(false)

  const activeDarkId = pendingDarkId ?? savedConfig?.activeDarkPaletteId ?? null
  const activeLightId = pendingLightId ?? savedConfig?.activeLightPaletteId ?? null
  const customs = pendingCustom.length > 0 ? pendingCustom : (savedConfig?.customPalettes ?? [])

  // When no palette is saved in DB, show the CSS defaults as "currently active" in the picker
  const effectiveDarkId = activeDarkId ?? DEFAULT_DARK_PALETTE_ID
  const effectiveLightId = activeLightId ?? DEFAULT_LIGHT_PALETTE_ID

  const darkTokens = getPaletteById(effectiveDarkId, customs)?.tokens ?? null
  const lightTokens = getPaletteById(effectiveLightId, customs)?.tokens ?? null

  const isDirty =
    activeDarkId !== (savedConfig?.activeDarkPaletteId ?? null) ||
    activeLightId !== (savedConfig?.activeLightPaletteId ?? null) ||
    pendingCustom.length > 0

  function handleSaveCustom(palette: CustomPalette) {
    setPendingCustom((prev) => {
      const existing = prev.findIndex((p) => p.id === palette.id)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = palette
        return next
      }
      return [...prev, palette]
    })
    setEditor({ open: false })
    if (palette.mode === 'dark') setPendingDarkId(palette.id)
    else setPendingLightId(palette.id)
  }

  function handleConfirmSave() {
    const config: ColorThemeConfig = {
      activeDarkPaletteId: activeDarkId,
      activeLightPaletteId: activeLightId,
      customPalettes: customs,
    }
    saveTheme(config, {
      onSuccess: () => {
        setPendingDarkId(null)
        setPendingLightId(null)
        setPendingCustom([])
        setConfirmOpen(false)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: 'var(--fg-3)' }}>
        Cargando...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: 'var(--brick)' }}>
        No se pudo cargar la configuración de color.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Preview */}
      <div>
        <h2
          className="text-[11px] font-bold tracking-[0.2em] uppercase mb-4"
          style={{ color: 'var(--fg-3)' }}
        >
          Vista previa
        </h2>
        <ThemePreview darkTokens={darkTokens} lightTokens={lightTokens} />
      </div>

      {/* Picker */}
      <div>
        <h2
          className="text-[11px] font-bold tracking-[0.2em] uppercase mb-4"
          style={{ color: 'var(--fg-3)' }}
        >
          Paletas
        </h2>
        <PalettePicker
          selectedDarkId={effectiveDarkId}
          selectedLightId={effectiveLightId}
          customPalettes={customs}
          onSelectDark={(id) => setPendingDarkId(id)}
          onSelectLight={(id) => setPendingLightId(id)}
          onEditCustom={(p) => setEditor({ open: true, mode: p.mode, editing: p })}
        />
      </div>

      {/* Custom palette editor toggle */}
      {!editor.open && (
        <div className="flex gap-3">
          <button
            type="button"
            className="btn ghost text-sm"
            onClick={() => setEditor({ open: true, mode: 'dark' })}
          >
            + Nueva paleta oscura
          </button>
          <button
            type="button"
            className="btn ghost text-sm"
            onClick={() => setEditor({ open: true, mode: 'light' })}
          >
            + Nueva paleta clara
          </button>
        </div>
      )}

      {/* Custom palette editor */}
      {editor.open && (
        <CustomPaletteEditor
          mode={editor.mode}
          initialValues={editor.editing}
          onSave={handleSaveCustom}
          onCancel={() => setEditor({ open: false })}
        />
      )}

      {/* Save bar */}
      {isDirty && (
        <div
          className="sticky bottom-4 rounded-xl border p-4 flex items-center justify-between gap-4"
          style={{ background: 'var(--bg-2)', borderColor: 'var(--gold)' }}
        >
          <p className="text-sm" style={{ color: 'var(--fg-1)' }}>
            Tienes cambios sin guardar.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn ghost text-sm"
              onClick={() => {
                setPendingDarkId(null)
                setPendingLightId(null)
                setPendingCustom([])
              }}
            >
              Descartar
            </button>
            <button
              type="button"
              className="btn primary text-sm"
              onClick={() => setConfirmOpen(true)}
            >
              Aplicar paleta
            </button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)' }}
        >
          <div
            className="rounded-2xl border p-6 max-w-sm w-full space-y-4"
            style={{ background: 'var(--bg-1)', borderColor: 'var(--line-2)' }}
          >
            <h3 className="text-lg font-bold" style={{ color: 'var(--fg-0)', fontFamily: 'var(--font-display)' }}>
              Aplicar paleta
            </h3>
            <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
              Esta paleta se aplicará a toda la web para todos los usuarios. ¿Continuar?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn ghost flex-1"
                onClick={() => setConfirmOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn primary flex-1"
                onClick={handleConfirmSave}
                disabled={isSaving}
              >
                {isSaving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
