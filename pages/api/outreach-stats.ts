import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth, getSupabaseServer } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  const supabase = getSupabaseServer(req)

  const [
    { count: totalContacts },
    { count: statusNew },
    { count: statusContacted },
    { count: statusReplied },
    { count: statusInterested },
    { count: statusNotInterested },
    { count: statusDealClosed },
    { count: statusOptedOut },
    { count: totalEmails },
    { count: emailsSent },
    { count: emailsFailed },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'new'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'contacted'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'replied'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'interested'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'not_interested'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'deal_closed'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('opted_out', true),
    supabase.from('sent_emails').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('sent_emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'sent'),
    supabase.from('sent_emails').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'failed'),
  ])

  return res.status(200).json({
    contacts: {
      total: totalContacts || 0,
      new: statusNew || 0,
      contacted: statusContacted || 0,
      replied: statusReplied || 0,
      interested: statusInterested || 0,
      not_interested: statusNotInterested || 0,
      deal_closed: statusDealClosed || 0,
      opted_out: statusOptedOut || 0,
    },
    emails: {
      total: totalEmails || 0,
      sent: emailsSent || 0,
      failed: emailsFailed || 0,
      reply_rate: emailsSent ? (((statusReplied || 0) / emailsSent) * 100).toFixed(1) : '0',
    },
  })
}
