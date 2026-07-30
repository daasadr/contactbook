import { Link } from 'react-router-dom'
import { Home, SearchX } from 'lucide-react'
import SEOHead from '@/components/SEOHead'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <SEOHead title="Stránka nenalezena (404)" noIndex />

      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
          <SearchX className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold text-zinc-900 mb-2">404</h1>
        <p className="text-zinc-600 mb-8">
          Tuto stránku se nám nepodařilo najít. Možná byla přesunuta nebo už neexistuje.
        </p>
        <Link to="/" className="btn-primary inline-flex">
          <Home className="w-4 h-4" /> Zpět na úvod
        </Link>
      </div>
    </div>
  )
}
