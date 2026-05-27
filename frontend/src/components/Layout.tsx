import { ReactNode, CSSProperties } from 'react'
import Navbar from './Navbar'

interface Props {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  bgImage?: string
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-full',
}

function getBgStyle(bg: string): CSSProperties {
  if (bg.startsWith('linear-gradient')) {
    return { backgroundImage: bg, backgroundSize: 'cover', backgroundAttachment: 'fixed' }
  }
  if (bg.startsWith('#') || bg.startsWith('rgb')) {
    return { backgroundColor: bg }
  }
  return { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
}

export default function Layout({ children, maxWidth = 'xl', bgImage }: Props) {
  return (
    <div
      className="min-h-screen bg-zinc-50"
      style={bgImage ? getBgStyle(bgImage) : undefined}
    >
      <Navbar />
      <main className={`${maxWidthMap[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
        {children}
      </main>
    </div>
  )
}
