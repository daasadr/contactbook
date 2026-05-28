import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'

const STORAGE_KEY = 'pw_cookie_notice_dismissed'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-sm text-white px-4 py-3 flex items-center justify-between gap-4 text-sm">
      <p className="text-zinc-300 leading-relaxed">
        Tato aplikace používá jeden cookie pro udržení přihlášení.
        Žádné sledování, žádná analytika.{' '}
        <Link to="/privacy" className="underline text-white hover:text-primary-300" onClick={dismiss}>
          Zásady ochrany soukromí
        </Link>
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Zavřít"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
