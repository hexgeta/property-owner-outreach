import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Internal endpoint — notifies agents via Telegram about new events
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_id, event_type, data } = req.body
  if (!user_id || !event_type) return res.status(400).json({ error: 'user_id and event_type required' })

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return res.status(200).json({ skipped: true, reason: 'No bot token' })

  // Get agent's notification preferences
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('telegram_bot_chat_id, notify_new_lead, notify_email_reply, notify_quiz_submission, full_name')
    .eq('id', user_id)
    .single()

  if (!profile?.telegram_bot_chat_id) {
    return res.status(200).json({ skipped: true, reason: 'Agent has no Telegram chat ID' })
  }

  // Check if this notification type is enabled
  const shouldNotify =
    (event_type === 'new_lead' && profile.notify_new_lead) ||
    (event_type === 'email_reply' && profile.notify_email_reply) ||
    (event_type === 'quiz_submission' && profile.notify_quiz_submission)

  if (!shouldNotify) return res.status(200).json({ skipped: true, reason: 'Notification disabled' })

  // Build message based on event type
  let message = ''

  switch (event_type) {
    case 'new_lead':
      message = `🔔 *Novo contacto adicionado*\n\n`
      message += `👤 ${data.name || 'Unknown'}\n`
      if (data.email) message += `📧 ${data.email}\n`
      if (data.district) message += `📍 ${data.district}\n`
      if (data.property_type) message += `🏠 ${data.property_type}\n`
      break

    case 'email_reply':
      message = `📩 *Resposta recebida!*\n\n`
      message += `👤 ${data.name || data.email || 'Unknown'}\n`
      if (data.subject) message += `📋 ${data.subject}\n`
      message += `\n_Verifique o seu email para ver a resposta completa._`
      break

    case 'quiz_submission':
      message = `📋 *Novo cliente no funil!*\n\n`
      message += `👤 ${data.name || 'Unknown'}\n`
      if (data.telegram_username) message += `💬 @${data.telegram_username.replace('@', '')}\n`
      if (data.property_types?.length) message += `🏠 Procura: ${data.property_types.join(', ')}\n`
      if (data.districts?.length) message += `📍 Zona: ${data.districts.join(', ')}\n`
      if (data.max_budget) message += `💰 Orcamento: ate ${Number(data.max_budget).toLocaleString('pt-PT')} EUR\n`
      if (data.timeline) {
        const timelines: Record<string, string> = {
          asap: 'O mais breve possivel', '3_months': '3 meses',
          '6_months': '6 meses', '1_year': '1 ano', just_looking: 'Apenas a explorar',
        }
        message += `⏰ Timeline: ${timelines[data.timeline] || data.timeline}\n`
      }
      break

    default:
      message = `🔔 ${event_type}: ${JSON.stringify(data).substring(0, 200)}`
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: profile.telegram_bot_chat_id,
        text: message,
        parse_mode: 'Markdown',
      }),
    })
    return res.status(200).json({ sent: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
