import type { CSSProperties } from 'react'

export type Background = { id: string; label: string; value: string | null; dark: boolean }

export const SOLID_COLORS: Background[] = [
  { id: 'none',     label: 'Výchozí',   value: null,      dark: false },
  { id: 'white',    label: 'Bílá',      value: '#ffffff', dark: false },
  { id: 'cream',    label: 'Krémová',   value: '#faf7f0', dark: false },
  { id: 'mint',     label: 'Mátová',    value: '#ecfdf5', dark: false },
  { id: 'sky',      label: 'Nebeská',   value: '#eff6ff', dark: false },
  { id: 'lavender', label: 'Levandule', value: '#f5f3ff', dark: false },
  { id: 'rose',     label: 'Růžová',    value: '#fff1f2', dark: false },
  { id: 'amber',    label: 'Jantarová', value: '#fffbeb', dark: false },
  { id: 'slate',    label: 'Břidlice',  value: '#1e293b', dark: true  },
  { id: 'black',    label: 'Černá',     value: '#18181b', dark: true  },
]

export const GRADIENTS: Background[] = [
  { id: 'sunrise',  label: 'Západ slunce',  value: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', dark: false },
  { id: 'morning',  label: 'Ranní obloha',  value: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', dark: false },
  { id: 'forest',   label: 'Les',           value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', dark: false },
  { id: 'lilac',    label: 'Šeřík',         value: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', dark: false },
  { id: 'night',    label: 'Noční obloha',  value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', dark: true  },
  { id: 'rosegold', label: 'Růžové zlato',  value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', dark: true  },
  { id: 'ocean',    label: 'Oceán',         value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', dark: false },
  { id: 'abyss',    label: 'Hlubina',       value: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', dark: true  },
  { id: 'space',    label: 'Vesmír',        value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', dark: true },
  { id: 'peach',    label: 'Broskev',       value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', dark: false },
]

// bg30.jpg is missing — skip it
export const PHOTO_BACKGROUNDS: Background[] = [
  ...Array.from({ length: 29 }, (_, i) => ({
    id: `bg${i + 1}`, label: `Foto ${i + 1}`, value: `/bg${i + 1}.jpg`, dark: false,
  })),
  ...Array.from({ length: 26 }, (_, i) => ({
    id: `bg${i + 31}`, label: `Foto ${i + 31}`, value: `/bg${i + 31}.jpg`, dark: false,
  })),
]

export const BACKGROUNDS: Background[] = [...SOLID_COLORS, ...GRADIENTS, ...PHOTO_BACKGROUNDS]

export function getSwatchStyle(value: string | null): CSSProperties {
  if (!value) return { background: 'repeating-linear-gradient(-45deg, #e4e4e7 0px, #e4e4e7 4px, #f9f9f9 4px, #f9f9f9 8px)' }
  if (value.startsWith('linear-gradient')) return { backgroundImage: value }
  if (value.startsWith('/') || value.startsWith('http')) {
    return { backgroundImage: `url(${value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  return { backgroundColor: value }
}

export function isBgDark(value: string | null | undefined): boolean {
  if (!value) return false
  return BACKGROUNDS.find(b => b.value === value)?.dark ?? false
}
