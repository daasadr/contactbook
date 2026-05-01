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
  const migrationPath = path.join(__dirname, 'migrations', '001_initial.sql')
  const migration = fs.readFileSync(migrationPath, 'utf8')
  await sql.unsafe(migration)
  console.log('✅ Databázové migrace aplikovány')
}
