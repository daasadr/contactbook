import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BookUser, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const schema = z.object({
  email: z.string().email('Neplatný e-mail'),
  password: z.string().min(1, 'Heslo je povinné'),
})
type FormData = z.infer<typeof schema>

export default function Login() {
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
      const res = await authApi.login(data)
      setAuth(res.data.user, res.data.accessToken)
      navigate('/dashboard')
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? 'Přihlášení se nezdařilo')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center">
            <BookUser className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold text-zinc-900">Přihlásit se</h2>
        <p className="mt-1 text-center text-sm text-zinc-500">
          Nemáš účet?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Zaregistruj se zdarma
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card p-8">
          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">E-mail</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="jmeno@example.cz"
              />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Heslo</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
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

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
              {isSubmitting ? 'Přihlašování…' : 'Přihlásit se'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
