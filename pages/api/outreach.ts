import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/supabaseClient'
import nodemailer from 'nodemailer'

// Configure SMTP transporter - set these in your .env
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
  switch (req.method) {
    case 'GET':
      return getOutreachEmails(req, res)
    case 'POST':
      return sendOutreachEmail(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function getOutreachEmails(req: NextApiRequest, res: NextApiResponse) {
  const { status, campaign_id, owner_id, page = '1', limit = '50' } = req.query

  let query = supabase
    .from('outreach_emails')
    .select('*, owners(*), properties(*)', { count: 'exact' })

  if (status) query = query.eq('status', status)
  if (campaign_id) query = query.eq('campaign_id', campaign_id)
  if (owner_id) query = query.eq('owner_id', owner_id)

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const from = (pageNum - 1) * limitNum
  const to = from + limitNum - 1

  query = query.range(from, to).order('created_at', { ascending: false })

  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ data, total: count, page: pageNum, limit: limitNum })
}

async function sendOutreachEmail(req: NextApiRequest, res: NextApiResponse) {
  const { owner_id, property_id, campaign_id, subject, body_html, body_text, to_email } = req.body

  if (!to_email || !subject) {
    return res.status(400).json({ error: 'to_email and subject are required' })
  }

  // Check if owner has opted out
  if (owner_id) {
    const { data: owner } = await supabase.from('owners').select('opted_out, email').eq('id', owner_id).single()
    if (owner?.opted_out) {
      return res.status(400).json({ error: 'Owner has opted out of communications' })
    }
  }

  // Check for duplicate emails to same address for same property
  if (property_id) {
    const { data: existing } = await supabase
      .from('outreach_emails')
      .select('id')
      .eq('to_email', to_email)
      .eq('property_id', property_id)
      .in('status', ['sent', 'delivered', 'opened', 'replied'])
      .limit(1)

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Email already sent to this owner for this property' })
    }
  }

  // Create outreach record
  const { data: outreach, error: insertError } = await supabase
    .from('outreach_emails')
    .insert({
      owner_id,
      property_id,
      campaign_id,
      to_email,
      subject,
      body_html,
      body_text,
      status: 'pending',
    })
    .select()
    .single()

  if (insertError) return res.status(500).json({ error: insertError.message })

  // Send the email
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to_email,
      subject,
      html: body_html,
      text: body_text,
    })

    // Update status to sent
    await supabase
      .from('outreach_emails')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', outreach.id)

    // Log activity
    await supabase.from('outreach_activity_log').insert({
      owner_id,
      property_id,
      activity_type: 'email_sent',
      description: `Email sent: ${subject}`,
      metadata: { outreach_email_id: outreach.id },
    })

    // Update property status if it was just 'owner_found'
    if (property_id) {
      await supabase
        .from('properties')
        .update({ status: 'contacted', updated_at: new Date().toISOString() })
        .eq('id', property_id)
        .in('status', ['identified', 'owner_found'])
    }

    return res.status(200).json({ success: true, id: outreach.id, status: 'sent' })
  } catch (emailError: any) {
    await supabase
      .from('outreach_emails')
      .update({ status: 'failed', error_message: emailError.message })
      .eq('id', outreach.id)

    return res.status(500).json({ error: 'Failed to send email', details: emailError.message })
  }
}
