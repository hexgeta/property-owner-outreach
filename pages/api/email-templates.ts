import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
