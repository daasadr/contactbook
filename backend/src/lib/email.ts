import { config } from '../config'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  if (!config.RESEND_API_KEY) {
    console.log('\n📧 [DEV] E-mail by byl odeslán:')
    console.log(`  Komu:    ${to}`)
    console.log(`  Předmět: ${subject}`)
    const urlMatch = html.match(/href="([^"]+)"/)
    if (urlMatch) console.log(`  Odkaz:   ${urlMatch[1]}`)
    console.log()
    return
  }

  const { Resend } = await import('resend')
  const resend = new Resend(config.RESEND_API_KEY)

  const { data, error } = await resend.emails.send({
    from: config.FROM_EMAIL,
    to,
    subject,
    html,
  })

  if (error) {
    console.error('[Email] Resend API error:', JSON.stringify(error))
    throw new Error(`Odeslání e-mailu selhalo: ${error.message}`)
  }
  console.log('[Email] Odesláno, id:', data?.id)
}

export function passwordResetEmailHtml(name: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f5">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto">
    <tr><td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <h1 style="margin:0 0 8px;font-size:22px;color:#18181b">Resetování hesla</h1>
      <p style="margin:0 0 24px;color:#71717a;font-size:15px">Ahoj ${escapeHtml(name)},</p>
      <p style="color:#3f3f46;font-size:15px;line-height:1.6">
        Obdrželi jsme žádost o reset hesla pro tvůj účet v Peopleworth.
        Klikni na tlačítko níže — odkaz je platný <strong>1 hodinu</strong>.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${resetUrl}"
           style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600">
          Nastavit nové heslo
        </a>
      </div>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.5">
        Pokud jsi o reset nepožádal/a, tento e-mail ignoruj — tvé heslo se nezmění.<br>
        Odkaz expiruje automaticky po 1 hodině.
      </p>
      <hr style="border:none;border-top:1px solid #f4f4f5;margin:28px 0">
      <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center">
        Peopleworth &mdash; Tvé kontakty, tvé bohatství
      </p>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
