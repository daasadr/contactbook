import postgres from 'postgres'
import { config } from '../config'

export const sql = postgres(config.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {},
})

export async function initDb() {
  const fs = await import('fs')
  const path = await import('path')
  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(migrationsDir).filter((f: string) => f.endsWith('.sql')).sort()
  for (const file of files) {
    const migration = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    await sql.unsafe(migration)
    console.log(`✅ Migrace ${file} aplikována`)
  }
}
