import { buildApp } from './app'
import { initDb } from './db'
import { config } from './config'

async function main() {
  try {
    await initDb()
    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    console.log(`🚀 Server běží na portu ${config.PORT}`)
  } catch (err) {
    console.error('❌ Chyba při spuštění serveru:', err)
    process.exit(1)
  }
}

main()
