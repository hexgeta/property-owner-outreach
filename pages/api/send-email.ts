import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/supabaseClient'
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

  const { contact_ids, subject, body_html, body_text } = req.body

  if (!contact_ids?.length || !subject) {
    return res.status(400).json({ error: 'contact_ids and subject are required' })
  }

  // Fetch all target contacts
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
      // Send email
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: contact.email,
        subject,
        html: body_html,
        text: body_text,
      })

      // Log sent email
      await supabase.from('sent_emails').insert({
        contact_id: contact.id,
        to_email: contact.email,
        subject,
        body_html,
        body_text,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })

      // Update contact status and count
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
      // Log failed email
      await supabase.from('sent_emails').insert({
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

  const sent = results.filter(r => r.status === 'sent').length
  const failed = results.filter(r => r.status === 'failed').length

  return res.status(200).json({ sent, failed, total: results.length, results })
}
