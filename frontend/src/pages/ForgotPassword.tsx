import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/api/auth'

const schema = z.object({
  email: z.string().email('Neplatný e-mail'),
})
type FormData = z.infer<typeof schema>

const bookBgStyle = {
  backgroundImage: 'url(/background.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundColor: '#1a0405',
} as const

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      await authApi.forgotPassword(data.email)
      setSent(true)
    } catch {
      setServerError('Něco se pokazilo, zkus to znovu.')
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center py-12 px-4" style={bookBgStyle}>
      <div className="absolute inset-0 flex justify-center items-center pointer-events-none select-none overflow-hidden">
        <div style={{ position: 'relative', width: 'clamp(300px, 72vw, 680px)' }}>
          <div style={{
            position: 'absolute', inset: '-15px',
            backgroundImage: 'url(/contactbook_animated.gif)',
            backgroundSize: 'calc(100% + 30px)', backgroundPosition: 'center top',
            filter: 'blur(22px)', opacity: 0.65,
            maskImage: 'radial-gradient(ellipse 95% 95% at 50% 50%, transparent 50%, rgba(0,0,0,0.5) 68%, black 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse 95% 95% at 50% 50%, transparent 50%, rgba(0,0,0,0.5) 68%, black 85%)',
          }} />
          <img src="/contactbook_animated.gif" alt="" aria-hidden="true" style={{
            width: '100%', height: 'auto', display: 'block', opacity: 0.90,
            maskImage: 'radial-gradient(ellipse 84% 84% at 50% 50%, black 28%, rgba(0,0,0,0.92) 42%, rgba(0,0,0,0.65) 56%, rgba(0,0,0,0.28) 70%, rgba(0,0,0,0.07) 84%, transparent 96%)',
            WebkitMaskImage: 'radial-gradient(ellipse 84% 84% at 50% 50%, black 28%, rgba(0,0,0,0.92) 42%, rgba(0,0,0,0.65) 56%, rgba(0,0,0,0.28) 70%, rgba(0,0,0,0.07) 84%, transparent 96%)',
          }} />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-white/75 text-sm italic mb-4" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.8)' }}>
            Vztahy jsou jediné bohatství, které roste tím, že ho dáváš.
          </p>
          <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 3px 14px rgba(0,0,0,0.98), 0 0 35px rgba(0,0,0,0.9)' }}>
            Tvé kontakty,{' '}<span className="text-yellow-300">tvé bohatství</span>
          </h1>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-zinc-900 mb-1">Zapomenuté heslo</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Zpátky na{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">přihlášení</Link>
          </p>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✉️</span>
              </div>
              <p className="font-medium text-zinc-900 mb-2">Odkaz odeslán</p>
              <p className="text-sm text-zinc-500">
                Pokud je e-mail registrován, přišel ti odkaz pro reset hesla.
                Zkontroluj i složku spam. Odkaz je platný 1 hodinu.
              </p>
              <Link to="/login" className="mt-6 inline-block btn-primary">
                Zpátky na přihlášení
              </Link>
            </div>
          ) : (
            <>
              {serverError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {serverError}
                </div>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="label">Tvůj e-mail</label>
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    className={`input ${errors.email ? 'input-error' : ''}`}
                    placeholder="jana@example.cz"
                    autoFocus
                  />
                  {errors.email && <p className="error-text">{errors.email.message}</p>}
                </div>
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
                  {isSubmitting ? 'Odesílání…' : 'Odeslat odkaz pro reset hesla'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
