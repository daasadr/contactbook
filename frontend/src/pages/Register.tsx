import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const schema = z.object({
  name: z.string().min(2, 'Jméno musí mít alespoň 2 znaky').max(100),
  email: z.string().email('Neplatný e-mail'),
  password: z.string().min(8, 'Heslo musí mít alespoň 8 znaků').max(128),
  passwordConfirm: z.string(),
}).refine((d) => d.password === d.passwordConfirm, {
  message: 'Hesla se neshodují',
  path: ['passwordConfirm'],
})
type FormData = z.infer<typeof schema>

export default function Register() {
  const [showPwd, setShowPwd] = useState(false)
  const [serverError, setServerError] = useState('')
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await authApi.register({ name: data.name, email: data.email, password: data.password })
      setAuth(res.data.user, res.data.accessToken)
      navigate('/dashboard')
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? 'Registrace se nezdařila')
    }
  }

  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-center py-12 px-4"
      style={{
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#1a0405',
      }}
    >
      {/* Book background effect */}
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
          <img
            src="/contactbook_animated.gif"
            alt=""
            aria-hidden="true"
            style={{
              width: '100%', height: 'auto', display: 'block', opacity: 0.90,
              maskImage: 'radial-gradient(ellipse 84% 84% at 50% 50%, black 28%, rgba(0,0,0,0.92) 42%, rgba(0,0,0,0.65) 56%, rgba(0,0,0,0.28) 70%, rgba(0,0,0,0.07) 84%, transparent 96%)',
              WebkitMaskImage: 'radial-gradient(ellipse 84% 84% at 50% 50%, black 28%, rgba(0,0,0,0.92) 42%, rgba(0,0,0,0.65) 56%, rgba(0,0,0,0.28) 70%, rgba(0,0,0,0.07) 84%, transparent 96%)',
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <p
            className="text-white/75 text-sm italic mb-4"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.8)' }}
          >
            Vztahy jsou jediné bohatství, které roste tím, že ho dáváš.
          </p>
          <h1
            className="text-3xl font-bold text-white"
            style={{ textShadow: '0 3px 14px rgba(0,0,0,0.98), 0 0 35px rgba(0,0,0,0.9)' }}
          >
            Tvé kontakty,{' '}<span className="text-yellow-300">tvé bohatství</span>
          </h1>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-zinc-900 mb-1">Vytvořit účet</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Máš už účet?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Přihlásit se
            </Link>
          </p>

          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Tvoje jméno</label>
              <input
                {...register('name')}
                type="text"
                autoComplete="name"
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder="Jana Nováková"
              />
              {errors.name && <p className="error-text">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">E-mail</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="jana@example.cz"
              />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Heslo</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Alespoň 8 znaků"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password.message}</p>}
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
              {isSubmitting ? 'Vytváření účtu…' : 'Vytvořit účet'}
            </button>
          </form>

          <p className="mt-4 text-xs text-center text-zinc-400">
            Registrací souhlasíš se zpracováním osobních údajů za účelem poskytování služby.
          </p>
        </div>
      </div>
    </div>
  )
}
