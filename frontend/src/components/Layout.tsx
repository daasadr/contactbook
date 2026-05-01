import { ReactNode } from 'react'
import Navbar from './Navbar'

interface Props {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-full',
}

export default function Layout({ children, maxWidth = 'xl' }: Props) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />
      <main className={`${maxWidthMap[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
        {children}
      </main>
    </div>
  )
}
