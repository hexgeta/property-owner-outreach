import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth, getSupabaseServer } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  const supabase = getSupabaseServer(req)
  const { limit = '100' } = req.query

  const { data, error } = await supabase
    .from('sent_emails')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit as string))

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ data })
}
