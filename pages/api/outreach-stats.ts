import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const [
    { count: totalProperties },
    { count: totalOwners },
    { count: totalEmails },
    { count: emailsSent },
    { count: emailsOpened },
    { count: emailsReplied },
    { count: propertiesIdentified },
    { count: propertiesOwnerFound },
    { count: propertiesContacted },
    { count: propertiesInterested },
    { data: districtBreakdown },
    { data: typeBreakdown },
  ] = await Promise.all([
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('owners').select('*', { count: 'exact', head: true }),
    supabase.from('outreach_emails').select('*', { count: 'exact', head: true }),
    supabase.from('outreach_emails').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('outreach_emails').select('*', { count: 'exact', head: true }).eq('status', 'opened'),
    supabase.from('outreach_emails').select('*', { count: 'exact', head: true }).eq('status', 'replied'),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'identified'),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'owner_found'),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'contacted'),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'interested'),
    supabase.rpc('get_district_breakdown').catch(() => ({ data: null })),
    supabase.rpc('get_type_breakdown').catch(() => ({ data: null })),
  ])

  return res.status(200).json({
    properties: {
      total: totalProperties || 0,
      identified: propertiesIdentified || 0,
      owner_found: propertiesOwnerFound || 0,
      contacted: propertiesContacted || 0,
      interested: propertiesInterested || 0,
    },
    owners: {
      total: totalOwners || 0,
    },
    emails: {
      total: totalEmails || 0,
      sent: emailsSent || 0,
      opened: emailsOpened || 0,
      replied: emailsReplied || 0,
      open_rate: emailsSent ? ((emailsOpened || 0) / emailsSent * 100).toFixed(1) : '0',
      reply_rate: emailsSent ? ((emailsReplied || 0) / emailsSent * 100).toFixed(1) : '0',
    },
    districtBreakdown: districtBreakdown || [],
    typeBreakdown: typeBreakdown || [],
  })
}
