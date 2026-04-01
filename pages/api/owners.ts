import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return getOwners(req, res)
    case 'POST':
      return createOwner(req, res)
    case 'PUT':
      return updateOwner(req, res)
    case 'DELETE':
      return deleteOwner(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function getOwners(req: NextApiRequest, res: NextApiResponse) {
  const { search, owner_type, opted_out, page = '1', limit = '50' } = req.query

  let query = supabase
    .from('owners')
    .select('*, property_owners(*, properties(*))', { count: 'exact' })

  if (owner_type) query = query.eq('owner_type', owner_type)
  if (opted_out === 'true') query = query.eq('opted_out', true)
  if (opted_out === 'false') query = query.eq('opted_out', false)
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,nif.ilike.%${search}%`)

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const from = (pageNum - 1) * limitNum
  const to = from + limitNum - 1

  query = query.range(from, to).order('created_at', { ascending: false })

  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ data, total: count, page: pageNum, limit: limitNum })
}

async function createOwner(req: NextApiRequest, res: NextApiResponse) {
  const owner = req.body

  if (Array.isArray(owner)) {
    const { data, error } = await supabase.from('owners').insert(owner).select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ data, count: data.length })
  }

  const { data, error } = await supabase.from('owners').insert(owner).select().single()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
}

async function updateOwner(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Owner ID required' })

  const updates = { ...req.body, updated_at: new Date().toISOString() }
  const { data, error } = await supabase.from('owners').update(updates).eq('id', id).select().single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}

async function deleteOwner(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Owner ID required' })

  const { error } = await supabase.from('owners').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true })
}
