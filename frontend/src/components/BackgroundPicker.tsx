import { Check } from 'lucide-react'
import { SOLID_COLORS, GRADIENTS, PHOTO_BACKGROUNDS, getSwatchStyle, isBgDark } from '@/lib/backgrounds'

interface Props {
  value: string | null
  onChange: (value: string | null) => void
}

function Swatch({ bg, selected, onSelect }: {
  bg: { id: string; label: string; value: string | null; dark: boolean }
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      title={bg.label}
      onClick={onSelect}
      className={`relative w-8 h-8 rounded-lg border-2 transition-all flex-shrink-0 ${
        selected ? 'border-primary-500 scale-110 shadow-md z-10' : 'border-zinc-200 hover:border-zinc-400'
      }`}
      style={getSwatchStyle(bg.value)}
    >
      {selected && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Check className={`w-3.5 h-3.5 ${bg.dark ? 'text-white' : 'text-zinc-700'}`} />
        </span>
      )}
    </button>
  )
}

function PhotoSwatch({ bg, selected, onSelect }: {
  bg: { id: string; label: string; value: string | null; dark: boolean }
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      title={bg.label}
      onClick={onSelect}
      className={`relative w-full h-10 rounded-lg border-2 transition-all overflow-hidden ${
        selected ? 'border-primary-500 shadow-md scale-105 z-10' : 'border-zinc-200 hover:border-zinc-400'
      }`}
      style={getSwatchStyle(bg.value)}
    >
      {selected && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Check className="w-4 h-4 text-white drop-shadow" />
        </span>
      )}
    </button>
  )
}

export default function BackgroundPicker({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      {/* Barvy */}
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1.5">Barvy</p>
        <div className="flex flex-wrap gap-1.5">
          {SOLID_COLORS.map(bg => (
            <Swatch key={bg.id} bg={bg} selected={value === bg.value} onSelect={() => onChange(bg.value)} />
          ))}
        </div>
      </div>

      {/* Přechody */}
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1.5">Přechody</p>
        <div className="flex flex-wrap gap-1.5">
          {GRADIENTS.map(bg => (
            <Swatch key={bg.id} bg={bg} selected={value === bg.value} onSelect={() => onChange(bg.value)} />
          ))}
        </div>
      </div>

      {/* Fotopozadí */}
      {PHOTO_BACKGROUNDS.length > 0 && (
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1.5">
            Fotopozadí <span className="normal-case font-normal">({PHOTO_BACKGROUNDS.length})</span>
          </p>
          <div className="grid grid-cols-8 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
            {PHOTO_BACKGROUNDS.map(bg => (
              <PhotoSwatch key={bg.id} bg={bg} selected={value === bg.value} onSelect={() => onChange(bg.value)} />
            ))}
          </div>
        </div>
      )}

      {/* Preview bar */}
      <div
        className="h-8 rounded-lg border border-zinc-200 transition-all"
        style={getSwatchStyle(value)}
        title={value ? 'Náhled' : 'Výchozí (bez pozadí)'}
      />
    </div>
  )
}

export { isBgDark }
