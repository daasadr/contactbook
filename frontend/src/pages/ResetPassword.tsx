import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/api/auth'
import { strongPasswordSchema, PASSWORD_CHECKS } from '@/lib/password'

const schema = z.object({
  password: strongPasswordSchema,
  passwordConfirm: z.string(),
}).refine((d) => d.password === d.passwordConfirm, {
  message: 'Hesla se neshodují',
  path: ['passwordConfirm'],
})
type FormData = z.infer<typeof schema>

function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null
  return (
    <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
      {PASSWORD_CHECKS.map(({ label, test }) => {
        const ok = test(password)
        return (
          <div key={label} className={`flex items-center gap-1 text-xs ${ok ? 'text-green-600' : 'text-zinc-400'}`}>
            <span className="font-bold">{ok ? '✓' : '○'}</span>
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

const bookBgStyle = {
  backgroundImage: 'url(/background.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundColor: '#1a0405',
} as const

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const watchedPassword = watch('password', '')

  const onSubmit = async (data: FormData) => {
    if (!token) return
    setServerError('')
    try {
      await authApi.resetPassword(token, data.password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? 'Nepodařilo se resetovat heslo.')
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
          <h2 className="text-xl font-bold text-zinc-900 mb-6">Nové heslo</h2>

          {!token ? (
            <div className="text-center py-4">
              <p className="text-red-600 mb-4">Neplatný odkaz pro reset hesla.</p>
              <Link to="/forgot-password" className="btn-primary">Zkusit znovu</Link>
            </div>
          ) : success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <p className="font-medium text-zinc-900 mb-2">Heslo bylo změněno</p>
              <p className="text-sm text-zinc-500">Přesměrování na přihlášení…</p>
            </div>
          ) : (
            <>
              {serverError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {serverError}
                  {serverError.includes('neplatný') || serverError.includes('vypršel') ? (
                    <div className="mt-2">
                      <Link to="/forgot-password" className="text-primary-600 hover:underline">
                        Požádat o nový odkaz
                      </Link>
                    </div>
                  ) : null}
                </div>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="label">Nové heslo</label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                      placeholder="Min. 8 znaků, velká, malá, číslice, znak"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={watchedPassword} />
                  {errors.password && <p className="error-text mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="label">Heslo znovu</label>
                  <input
                    {...register('passwordConfirm')}
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`input ${errors.passwordConfirm ? 'input-error' : ''}`}
                    placeholder="Zopakuj heslo"
                  />
                  {errors.passwordConfirm && <p className="error-text">{errors.passwordConfirm.message}</p>}
                </div>

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
                  {isSubmitting ? 'Ukládání…' : 'Nastavit nové heslo'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
