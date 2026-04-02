import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth, getSupabaseServer } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireAuth(req, res)
  if (!userId) return
  const supabase = getSupabaseServer(req)

  switch (req.method) {
    case 'GET': {
      const { district, property_type, status, page = '1', limit = '50' } = req.query

      let query = supabase
        .from('property_listings')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)

      if (district && district !== 'all') query = query.eq('district', district)
      if (property_type && property_type !== 'all') query = query.eq('property_type', property_type)
      if (status && status !== 'all') query = query.eq('status', status)

      const pageNum = parseInt(page as string)
      const limitNum = parseInt(limit as string)
      query = query.range((pageNum - 1) * limitNum, pageNum * limitNum - 1)
        .order('created_at', { ascending: false })

      const { data, error, count } = await query
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ data, total: count })
    }

    case 'POST': {
      const body = req.body
      const items = (Array.isArray(body) ? body : [body]).map(l => ({ ...l, user_id: userId }))

      const { data, error } = await supabase.from('property_listings').insert(items).select()
      if (error) return res.status(500).json({ error: error.message })
      return res.status(201).json({ data, count: data.length })
    }

    case 'PUT': {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'Listing ID required' })

      const { data, error } = await supabase
        .from('property_listings')
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
      if (!id) return res.status(400).json({ error: 'Listing ID required' })
      await supabase.from('property_listings').delete().eq('id', id).eq('user_id', userId)
      return res.status(200).json({ success: true })
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}
