import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
import type { ColorThemeConfig } from '@/domain/colorTheme'
import { getPaletteById, buildPaletteCSS } from '@/domain/colorTheme'
import { queryKeys, STALE } from './queryKeys'

const PALETTE_STYLE_ID = 'gio-palette-style'
const PALETTE_CSS_KEY = 'gio_palette_css'

export function useColorTheme() {
  return useQuery({
    queryKey: queryKeys.shop.colorTheme(),
    queryFn: () => repositories.shop().getColorTheme(),
    staleTime: STALE.LONG,
  })
}

export function useMutateColorTheme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (config: ColorThemeConfig) =>
      repositories.shop().updateColorTheme(config),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shop.colorTheme() }),
  })
}

export function useApplyColorTheme() {
  const { data: config } = useColorTheme()

  useEffect(() => {
    const customs = config?.customPalettes ?? []
    const darkPalette = config?.activeDarkPaletteId
      ? getPaletteById(config.activeDarkPaletteId, customs)
      : null
    const lightPalette = config?.activeLightPaletteId
      ? getPaletteById(config.activeLightPaletteId, customs)
      : null

    if (!darkPalette && !lightPalette) {
      const el = document.getElementById(PALETTE_STYLE_ID) as HTMLStyleElement | null
      if (el) el.textContent = ''
      localStorage.removeItem(PALETTE_CSS_KEY)
      return
    }

    const css = buildPaletteCSS(
      darkPalette?.tokens ?? null,
      lightPalette?.tokens ?? null,
    )

    let el = document.getElementById(PALETTE_STYLE_ID) as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = PALETTE_STYLE_ID
      document.head.appendChild(el)
    }
    el.textContent = css
    localStorage.setItem(PALETTE_CSS_KEY, css)
  }, [config])
}
