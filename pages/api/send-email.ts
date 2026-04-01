import type { NextApiRequest, NextApiResponse } from 'next'
import { requireActiveSubscription, getSupabaseServer } from '@/lib/auth'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireActiveSubscription(req, res)
  if (!userId) return

  const supabase = getSupabaseServer(req)
  const { contact_ids, subject, body_html, body_text } = req.body

  if (!contact_ids?.length || !subject) {
    return res.status(400).json({ error: 'contact_ids and subject are required' })
  }

  // Check email limit
  const { data: profile } = await supabase
    .from('profiles')
    .select('monthly_email_limit, emails_sent_this_month')
    .eq('id', userId)
    .single()

  if (profile) {
    const remaining = (profile.monthly_email_limit || 50) - (profile.emails_sent_this_month || 0)
    if (remaining < contact_ids.length) {
      return res.status(403).json({
        error: `Email limit reached. ${remaining} emails remaining this month.`,
        code: 'EMAIL_LIMIT_REACHED',
        remaining,
      })
    }
  }

  // Fetch contacts (RLS ensures only user's contacts)
  const { data: contacts, error: fetchError } = await supabase
    .from('contacts')
    .select('*')
    .in('id', contact_ids)
    .eq('opted_out', false)

  if (fetchError) return res.status(500).json({ error: fetchError.message })
  if (!contacts?.length) return res.status(400).json({ error: 'No valid contacts found' })

  const results: { contact_id: string; email: string; status: string; error?: string }[] = []

  for (const contact of contacts) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: contact.email,
        subject,
        html: body_html,
        text: body_text,
      })

      await supabase.from('sent_emails').insert({
        user_id: userId,
        contact_id: contact.id,
        to_email: contact.email,
        subject,
        body_html,
        body_text,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })

      await supabase
        .from('contacts')
        .update({
          status: contact.status === 'new' ? 'contacted' : contact.status,
          emails_sent: (contact.emails_sent || 0) + 1,
          last_emailed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', contact.id)

      results.push({ contact_id: contact.id, email: contact.email, status: 'sent' })
    } catch (err: any) {
      await supabase.from('sent_emails').insert({
        user_id: userId,
        contact_id: contact.id,
        to_email: contact.email,
        subject,
        body_html,
        body_text,
        status: 'failed',
        error_message: err.message,
      })
      results.push({ contact_id: contact.id, email: contact.email, status: 'failed', error: err.message })
    }
  }

  // Update monthly email count
  const sentCount = results.filter(r => r.status === 'sent').length
  if (sentCount > 0) {
    await supabase
      .from('profiles')
      .update({
        emails_sent_this_month: (profile?.emails_sent_this_month || 0) + sentCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  }

  return res.status(200).json({
    sent: sentCount,
    failed: results.filter(r => r.status === 'failed').length,
    total: results.length,
    results,
  })
}
