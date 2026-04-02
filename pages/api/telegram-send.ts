import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return res.status(500).json({ error: 'Telegram bot not configured' })

  const { chat_id, listings, scores } = req.body
  if (!chat_id || !listings?.length) {
    return res.status(400).json({ error: 'chat_id and listings required' })
  }

  // Build a formatted message
  let message = `🏠 *Encontramos propriedades para si!*\n\n`
  message += `Baseado nas suas preferencias, aqui estao as melhores opcoes:\n\n`

  listings.forEach((listing: any, i: number) => {
    const score = scores?.[i] || 0
    const matchLabel = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🟠'

    message += `${matchLabel} *${listing.title}*\n`
    message += `📍 ${[listing.municipality, listing.district].filter(Boolean).join(', ')}\n`

    if (listing.price) message += `💰 ${Number(listing.price).toLocaleString('pt-PT')} EUR\n`
    if (listing.area_total_m2) message += `📐 ${listing.area_total_m2.toLocaleString()} m²\n`
    if (listing.num_bedrooms) message += `🛏️ ${listing.num_bedrooms} quartos\n`
    if (listing.condition) {
      const condLabels: Record<string, string> = {
        new: 'Novo', good: 'Bom estado', needs_renovation: 'Para renovar', ruin: 'Ruina'
      }
      message += `🔧 ${condLabels[listing.condition] || listing.condition}\n`
    }
    if (listing.features?.length) {
      const featLabels: Record<string, string> = {
        pool: 'Piscina', garden: 'Jardim', sea_view: 'Vista mar', garage: 'Garagem',
        terrace: 'Terraco', fireplace: 'Lareira', central_heating: 'Aquecimento central',
      }
      const labels = listing.features.map((f: string) => featLabels[f] || f).join(', ')
      message += `✨ ${labels}\n`
    }
    if (listing.description) {
      const desc = listing.description.length > 100
        ? listing.description.substring(0, 100) + '...'
        : listing.description
      message += `📝 ${desc}\n`
    }
    message += `\n`
  })

  message += `_Responda a esta mensagem se tiver interesse em alguma propriedade!_`

  try {
    // Send text message
    const textRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id,
        text: message,
        parse_mode: 'Markdown',
      }),
    })

    const textResult = await textRes.json()
    if (!textResult.ok) {
      return res.status(500).json({ error: 'Telegram API error', details: textResult })
    }

    // Send thumbnail images for listings that have them
    for (const listing of listings) {
      if (listing.thumbnail_url || listing.images?.[0]) {
        try {
          await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id,
              photo: listing.thumbnail_url || listing.images[0],
              caption: `📍 ${listing.title} — ${listing.price ? Number(listing.price).toLocaleString('pt-PT') + ' EUR' : 'Preco sob consulta'}`,
            }),
          })
        } catch {
          // Image send failed, continue
        }
      }
    }

    return res.status(200).json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to send Telegram message', details: err.message })
  }
}
