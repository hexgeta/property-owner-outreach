import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth, getSupabaseServer } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireAuth(req, res)
  if (!userId) return
  const supabase = getSupabaseServer(req)

  switch (req.method) {
    case 'GET': return getContacts(req, res, supabase, userId)
    case 'POST': return createContacts(req, res, supabase, userId)
    case 'PUT': return updateContact(req, res, supabase, userId)
    case 'DELETE': return deleteContact(req, res, supabase, userId)
    default: return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function getContacts(req: NextApiRequest, res: NextApiResponse, supabase: any, userId: string) {
  const { search, district, property_type, status, page = '1', limit = '50' } = req.query

  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('opted_out', false)

  if (district && district !== 'all') query = query.eq('district', district)
  if (property_type && property_type !== 'all') query = query.eq('property_type', property_type)
  if (status && status !== 'all') query = query.eq('status', status)
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,district.ilike.%${search}%`)

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  query = query.range((pageNum - 1) * limitNum, pageNum * limitNum - 1).order('created_at', { ascending: false })

  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ data, total: count, page: pageNum, limit: limitNum })
}

async function createContacts(req: NextApiRequest, res: NextApiResponse, supabase: any, userId: string) {
  const body = req.body
  const contacts = (Array.isArray(body) ? body : [body]).map(c => ({ ...c, user_id: userId }))

  const { data, error } = await supabase.from('contacts').insert(contacts).select()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json({ data, count: data.length })
}

async function updateContact(req: NextApiRequest, res: NextApiResponse, supabase: any, userId: string) {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'ID required' })

  const { data, error } = await supabase
    .from('contacts')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}

async function deleteContact(req: NextApiRequest, res: NextApiResponse, supabase: any, userId: string) {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'ID required' })

  const { error } = await supabase.from('contacts').delete().eq('id', id).eq('user_id', userId)
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true })
}
