import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

// Cron-style endpoint: call this on a schedule (e.g. every hour via Vercel Cron or external cron)
// GET /api/process-follow-ups?secret=YOUR_CRON_SECRET

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Simple secret-based auth for cron
  const { secret } = req.query
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Invalid cron secret' })
  }

  // Find all follow-ups due to send
  const { data: dueItems, error } = await supabaseAdmin
    .from('follow_up_queue')
    .select('*, contacts(*), follow_up_sequences(*)')
    .eq('status', 'active')
    .lte('next_send_at', new Date().toISOString())
    .limit(100)

  if (error) return res.status(500).json({ error: error.message })
  if (!dueItems?.length) return res.status(200).json({ processed: 0 })

  let sent = 0
  let skipped = 0

  for (const item of dueItems) {
    const contact = item.contacts
    const sequence = item.follow_up_sequences
    const steps = sequence.steps as any[]

    // Skip if contact opted out or already replied
    if (contact.opted_out || contact.status === 'replied' || contact.status === 'interested') {
      await supabaseAdmin
        .from('follow_up_queue')
        .update({ status: contact.opted_out ? 'opted_out' : 'replied', updated_at: new Date().toISOString() })
        .eq('id', item.id)
      skipped++
      continue
    }

    const step = steps[item.current_step]
    if (!step) {
      // Sequence complete
      await supabaseAdmin
        .from('follow_up_queue')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', item.id)

      await supabaseAdmin.from('activity_log').insert({
        user_id: item.user_id,
        contact_id: contact.id,
        activity_type: 'follow_up_completed',
        description: `Follow-up sequence "${sequence.name}" completed`,
      })
      continue
    }

    // Personalise the email
    const replacements: Record<string, string> = {
      '{name}': contact.name || '',
      '{district}': contact.district || '',
    }

    let subject = step.subject || ''
    let bodyText = step.body_text || ''
    let bodyHtml = step.body_html || ''

    Object.entries(replacements).forEach(([k, v]) => {
      subject = subject.replaceAll(k, v)
      bodyText = bodyText.replaceAll(k, v)
      bodyHtml = bodyHtml.replaceAll(k, v)
    })

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: contact.email,
        subject,
        html: bodyHtml || undefined,
        text: bodyText,
      })

      // Log sent email
      await supabaseAdmin.from('sent_emails').insert({
        user_id: item.user_id,
        contact_id: contact.id,
        to_email: contact.email,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })

      // Log activity
      await supabaseAdmin.from('activity_log').insert({
        user_id: item.user_id,
        contact_id: contact.id,
        activity_type: 'email_sent',
        description: `Follow-up ${item.current_step + 1}/${steps.length}: ${subject}`,
        metadata: { sequence_id: sequence.id, step: item.current_step },
      })

      // Update contact
      await supabaseAdmin
        .from('contacts')
        .update({
          emails_sent: (contact.emails_sent || 0) + 1,
          last_emailed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', contact.id)

      // Advance to next step or complete
      const nextStep = item.current_step + 1
      if (nextStep >= steps.length) {
        await supabaseAdmin
          .from('follow_up_queue')
          .update({ current_step: nextStep, status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', item.id)
      } else {
        const nextDelay = steps[nextStep].delay_days || 3
        await supabaseAdmin
          .from('follow_up_queue')
          .update({
            current_step: nextStep,
            next_send_at: new Date(Date.now() + nextDelay * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
      }

      // Update monthly count
      await supabaseAdmin.rpc('increment_emails_sent', { uid: item.user_id }).catch(() => {})

      sent++
    } catch (err: any) {
      await supabaseAdmin.from('sent_emails').insert({
        user_id: item.user_id,
        contact_id: contact.id,
        to_email: contact.email,
        subject,
        status: 'failed',
        error_message: err.message,
      })
      skipped++
    }
  }

  return res.status(200).json({ processed: dueItems.length, sent, skipped })
}
