import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth, getSupabaseServer } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireAuth(req, res)
  if (!userId) return
  const supabase = getSupabaseServer(req)

  switch (req.method) {
    case 'GET': {
      const { contact_id, lead_id, limit = '50' } = req.query

      let query = supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit as string))

      if (contact_id) query = query.eq('contact_id', contact_id)
      if (lead_id) query = query.eq('lead_id', lead_id)

      const { data, error } = await query
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json(data)
    }

    case 'POST': {
      const { contact_id, lead_id, activity_type, description, metadata } = req.body

      if (!activity_type) return res.status(400).json({ error: 'activity_type required' })

      const { data, error } = await supabase
        .from('activity_log')
        .insert({
          user_id: userId,
          contact_id: contact_id || null,
          lead_id: lead_id || null,
          activity_type,
          description: description || '',
          metadata: metadata || {},
        })
        .select()
        .single()

      if (error) return res.status(500).json({ error: error.message })
      return res.status(201).json(data)
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}
