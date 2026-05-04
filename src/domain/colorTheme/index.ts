export type PaletteTokens = {
  led: string
  ledSoft: string
  gold: string
  brick: string
  brickWarm: string
}

export type ColorPalette = {
  id: string
  name: string
  nameEs: string
  mode: 'dark' | 'light'
  pairedWith: string
  tokens: PaletteTokens
}

export type CustomPalette = {
  id: string
  name: string
  mode: 'dark' | 'light'
  tokens: PaletteTokens
}

export type ColorThemeConfig = {
  activeDarkPaletteId: string | null
  activeLightPaletteId: string | null
  customPalettes: CustomPalette[]
}

export const DEFAULT_DARK_PALETTE_ID = 'murasaki'
export const DEFAULT_LIGHT_PALETTE_ID = 'gio-original'

export const PREDEFINED_PALETTES: ColorPalette[] = [
  // — DARK (10) —
  {
    id: 'murasaki',
    name: 'Murasaki 紫',
    nameEs: 'Violeta noche',
    mode: 'dark',
    pairedWith: 'sakura',
    tokens: { led: '#7b4fff', ledSoft: '#a689ff', gold: '#c9a24a', brick: '#8b3a1f', brickWarm: '#c06a3d' },
  },
  {
    id: 'kon-ai',
    name: 'Kon-ai 紺藍',
    nameEs: 'Índigo profundo',
    mode: 'dark',
    pairedWith: 'hanada',
    tokens: { led: '#1e4a9a', ledSoft: '#4a78d4', gold: '#c9a24a', brick: '#1a3560', brickWarm: '#3060a0' },
  },
  {
    id: 'enji',
    name: 'Enji 臙脂',
    nameEs: 'Laca carmesí',
    mode: 'dark',
    pairedWith: 'kaki',
    tokens: { led: '#8b1a35', ledSoft: '#c04060', gold: '#c0801a', brick: '#6a1525', brickWarm: '#a03050' },
  },
  {
    id: 'rikyu',
    name: 'Rikyū 利休',
    nameEs: 'Té ceremonial',
    mode: 'dark',
    pairedWith: 'ukon',
    tokens: { led: '#2d5a3d', ledSoft: '#4a8a62', gold: '#b8912a', brick: '#1e3d28', brickWarm: '#3a7050' },
  },
  {
    id: 'nando',
    name: 'Nando 納戸',
    nameEs: 'Teal almacén',
    mode: 'dark',
    pairedWith: 'asagi',
    tokens: { led: '#1a5c6e', ledSoft: '#3a8a9e', gold: '#c09a3a', brick: '#0e3a48', brickWarm: '#2a6878' },
  },
  {
    id: 'rurikon',
    name: 'Rurikon 瑠璃紺',
    nameEs: 'Lapislázuli',
    mode: 'dark',
    pairedWith: 'shion',
    tokens: { led: '#1e3578', ledSoft: '#3a5ab0', gold: '#d4a044', brick: '#142060', brickWarm: '#2a4890' },
  },
  {
    id: 'fuji',
    name: 'Fuji 藤',
    nameEs: 'Glicinia',
    mode: 'dark',
    pairedWith: 'kohbai',
    tokens: { led: '#7a3a8a', ledSoft: '#b060c0', gold: '#d4902a', brick: '#5a1a6a', brickWarm: '#9050a0' },
  },
  {
    id: 'sohi',
    name: 'Sohi 蘇芳',
    nameEs: 'Madera de sapán',
    mode: 'dark',
    pairedWith: 'yamabuki',
    tokens: { led: '#7a2a0e', ledSoft: '#b05030', gold: '#c09020', brick: '#501a08', brickWarm: '#904020' },
  },
  {
    id: 'rokusho',
    name: 'Rokushō 緑青',
    nameEs: 'Pátina verdigris',
    mode: 'dark',
    pairedWith: 'moegi',
    tokens: { led: '#1a5a4a', ledSoft: '#3a8a72', gold: '#c0901a', brick: '#0e3a30', brickWarm: '#2a7060' },
  },
  {
    id: 'tsuyukusa',
    name: 'Tsuyukusa 露草',
    nameEs: 'Flor de rocío',
    mode: 'dark',
    pairedWith: 'tokiwa',
    tokens: { led: '#1e4a7a', ledSoft: '#3a78b0', gold: '#d0a030', brick: '#143060', brickWarm: '#2a608a' },
  },
  // — LIGHT (11: original + 10 Sanzo Wada) —
  {
    id: 'gio-original',
    name: 'Original Claro',
    nameEs: 'Paleta original de la app',
    mode: 'light',
    pairedWith: 'murasaki',
    tokens: { led: '#6235e0', ledSoft: '#7b4fff', gold: '#a88030', brick: '#a04528', brickWarm: '#b0552d' },
  },
  {
    id: 'sakura',
    name: 'Sakura 桜',
    nameEs: 'Cerezo en flor',
    mode: 'light',
    pairedWith: 'murasaki',
    tokens: { led: '#b52860', ledSoft: '#d44a80', gold: '#9a6018', brick: '#8a1c48', brickWarm: '#c03868' },
  },
  {
    id: 'hanada',
    name: 'Hanada 縹',
    nameEs: 'Azul celeste',
    mode: 'light',
    pairedWith: 'kon-ai',
    tokens: { led: '#1a5a9a', ledSoft: '#3a7ac0', gold: '#8a5a14', brick: '#104078', brickWarm: '#2a6aaa' },
  },
  {
    id: 'kaki',
    name: 'Kaki 柿',
    nameEs: 'Caqui naranja',
    mode: 'light',
    pairedWith: 'enji',
    tokens: { led: '#9a4010', ledSoft: '#c06030', gold: '#7a4800', brick: '#7a2800', brickWarm: '#b05020' },
  },
  {
    id: 'ukon',
    name: 'Ukon 鬱金',
    nameEs: 'Cúrcuma ámbar',
    mode: 'light',
    pairedWith: 'rikyu',
    tokens: { led: '#8a5000', ledSoft: '#b87020', gold: '#6a3800', brick: '#7a3800', brickWarm: '#a05010' },
  },
  {
    id: 'asagi',
    name: 'Asagi 浅葱',
    nameEs: 'Teal suave',
    mode: 'light',
    pairedWith: 'nando',
    tokens: { led: '#1a6a78', ledSoft: '#2a8a9a', gold: '#7a5010', brick: '#0a4850', brickWarm: '#1a7880' },
  },
  {
    id: 'shion',
    name: 'Shion 紫苑',
    nameEs: 'Aster lila',
    mode: 'light',
    pairedWith: 'rurikon',
    tokens: { led: '#6a3a8a', ledSoft: '#9060b0', gold: '#8a5814', brick: '#4a2068', brickWarm: '#803898' },
  },
  {
    id: 'kohbai',
    name: 'Kōbai 紅梅',
    nameEs: 'Ciruela roja',
    mode: 'light',
    pairedWith: 'fuji',
    tokens: { led: '#9a2040', ledSoft: '#c04060', gold: '#8a5814', brick: '#701830', brickWarm: '#a83050' },
  },
  {
    id: 'yamabuki',
    name: 'Yamabuki 山吹',
    nameEs: 'Rosa de montaña',
    mode: 'light',
    pairedWith: 'sohi',
    tokens: { led: '#9a6800', ledSoft: '#c88a10', gold: '#6a4400', brick: '#7a4400', brickWarm: '#b07010' },
  },
  {
    id: 'moegi',
    name: 'Moegi 萌葱',
    nameEs: 'Brote de primavera',
    mode: 'light',
    pairedWith: 'rokusho',
    tokens: { led: '#1a6a3a', ledSoft: '#2a8a50', gold: '#7a5010', brick: '#0a4a28', brickWarm: '#1a7040' },
  },
  {
    id: 'tokiwa',
    name: 'Tokiwa 常磐',
    nameEs: 'Pino sempreverde',
    mode: 'light',
    pairedWith: 'tsuyukusa',
    tokens: { led: '#1a5830', ledSoft: '#288050', gold: '#7a5010', brick: '#0e3a20', brickWarm: '#1a6838' },
  },
]

export function deriveAccentVariant(hex: string, mode: 'dark' | 'light'): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mix = mode === 'dark' ? 180 : 80
  const nr = Math.round(r + (mix - r) * 0.45)
  const ng = Math.round(g + (mix - g) * 0.45)
  const nb = Math.round(b + (mix - b) * 0.45)
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}

export function getPaletteById(
  id: string,
  customs: CustomPalette[] = [],
): ColorPalette | CustomPalette | undefined {
  return (
    PREDEFINED_PALETTES.find((p) => p.id === id) ?? customs.find((c) => c.id === id)
  )
}

export function buildPaletteCSS(
  darkTokens: PaletteTokens | null,
  lightTokens: PaletteTokens | null,
): string {
  const blocks: string[] = []
  if (darkTokens) {
    blocks.push(
      `:root, [data-theme='dark'] { --led: ${darkTokens.led}; --led-soft: ${darkTokens.ledSoft}; --gold: ${darkTokens.gold}; --brick: ${darkTokens.brick}; --brick-warm: ${darkTokens.brickWarm}; }`,
    )
  }
  if (lightTokens) {
    blocks.push(
      `[data-theme='light'] { --led: ${lightTokens.led}; --led-soft: ${lightTokens.ledSoft}; --gold: ${lightTokens.gold}; --brick: ${lightTokens.brick}; --brick-warm: ${lightTokens.brickWarm}; }`,
    )
  }
  return blocks.join('\n')
}
