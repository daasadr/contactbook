import { z } from 'zod'

export const strongPasswordSchema = z
  .string()
  .min(8, 'Heslo musí mít alespoň 8 znaků')
  .max(128)
  .regex(/[A-Z]/, 'Heslo musí obsahovat velké písmeno')
  .regex(/[a-z]/, 'Heslo musí obsahovat malé písmeno')
  .regex(/[0-9]/, 'Heslo musí obsahovat číslici')
  .regex(/[^A-Za-z0-9]/, 'Heslo musí obsahovat speciální znak (!, @, #, $ …)')

export const PASSWORD_CHECKS = [
  { label: 'Alespoň 8 znaků', test: (p: string) => p.length >= 8 },
  { label: 'Velké písmeno (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Malé písmeno (a–z)', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Číslice (0–9)', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Speciální znak (!, @, # …)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]
