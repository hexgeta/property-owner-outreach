import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth, getSupabaseServer } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireAuth(req, res)
  if (!userId) return
  const supabase = getSupabaseServer(req)

  switch (req.method) {
    case 'GET': {
      const { status, page = '1', limit = '50' } = req.query

      let query = supabase
        .from('client_leads')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)

      if (status && status !== 'all') query = query.eq('status', status)

      const pageNum = parseInt(page as string)
      const limitNum = parseInt(limit as string)
      query = query.range((pageNum - 1) * limitNum, pageNum * limitNum - 1)
        .order('created_at', { ascending: false })

      const { data, error, count } = await query
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ data, total: count })
    }

    case 'PUT': {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'Lead ID required' })

      const { data, error } = await supabase
        .from('client_leads')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json(data)
    }

    case 'DELETE': {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'Lead ID required' })
      await supabase.from('client_leads').delete().eq('id', id).eq('user_id', userId)
      return res.status(200).json({ success: true })
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}
