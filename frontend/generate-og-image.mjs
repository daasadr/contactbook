import sharp from 'sharp'
import { readFileSync } from 'fs'

const W = 1200
const H = 630

// SVG overlay with text
const overlay = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <!-- Dark gradient over the photo -->
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1a0a00" stop-opacity="0.82"/>
      <stop offset="60%" stop-color="#1a0a00" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#1a0a00" stop-opacity="0.20"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#grad)"/>

  <!-- Logo mark -->
  <rect x="64" y="64" width="52" height="52" rx="12" fill="#6366f1"/>
  <text x="90" y="102" font-family="Georgia, serif" font-size="32" font-weight="bold"
        text-anchor="middle" fill="white">P</text>

  <!-- App name -->
  <text x="132" y="101" font-family="Georgia, serif" font-size="28" font-weight="bold"
        fill="white" opacity="0.95">Peopleworth</text>

  <!-- Tagline -->
  <text x="64" y="200" font-family="Georgia, serif" font-size="20" fill="#f5c98a" opacity="0.9"
        font-style="italic">Vztahy jsou jediné bohatství, které roste tím, že ho dáváš.</text>

  <!-- Main headline -->
  <text x="64" y="300" font-family="Georgia, serif" font-size="58" font-weight="bold"
        fill="white">Tvé kontakty,</text>
  <text x="64" y="374" font-family="Georgia, serif" font-size="58" font-weight="bold"
        fill="#f5c98a">tvé bohatství.</text>

  <!-- Subtitle -->
  <text x="64" y="460" font-family="Arial, sans-serif" font-size="22" fill="white" opacity="0.75">
    Správa kontaktů s AI asistentem, deníkem setkání
  </text>
  <text x="64" y="492" font-family="Arial, sans-serif" font-size="22" fill="white" opacity="0.75">
    a plně přizpůsobitelnými poli.
  </text>

  <!-- URL -->
  <text x="64" y="570" font-family="Arial, sans-serif" font-size="18" fill="white" opacity="0.5">
    peopleworth.eu
  </text>
</svg>`

await sharp('public/peopleworth.jpg')
  .resize(W, H, { fit: 'cover', position: 'centre' })
  .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
  .jpeg({ quality: 92 })
  .toFile('public/og-image.jpg')

console.log('✅ og-image.jpg generated (1200×630)')
