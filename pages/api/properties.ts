import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return getProperties(req, res)
    case 'POST':
      return createProperty(req, res)
    case 'PUT':
      return updateProperty(req, res)
    case 'DELETE':
      return deleteProperty(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function getProperties(req: NextApiRequest, res: NextApiResponse) {
  const { district, municipality, property_type, status, page = '1', limit = '50' } = req.query

  let query = supabase
    .from('properties')
    .select('*, property_owners(*, owners(*))', { count: 'exact' })

  if (district) query = query.eq('district', district)
  if (municipality) query = query.eq('municipality', municipality)
  if (property_type) query = query.eq('property_type', property_type)
  if (status) query = query.eq('status', status)

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const from = (pageNum - 1) * limitNum
  const to = from + limitNum - 1

  query = query.range(from, to).order('created_at', { ascending: false })

  const { data, error, count } = await query

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ data, total: count, page: pageNum, limit: limitNum })
}

async function createProperty(req: NextApiRequest, res: NextApiResponse) {
  const property = req.body

  // Support bulk insert via array
  if (Array.isArray(property)) {
    const { data, error } = await supabase.from('properties').insert(property).select()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ data, count: data.length })
  }

  const { data, error } = await supabase.from('properties').insert(property).select().single()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
}

async function updateProperty(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Property ID required' })

  const updates = { ...req.body, updated_at: new Date().toISOString() }
  const { data, error } = await supabase.from('properties').update(updates).eq('id', id).select().single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}

async function deleteProperty(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Property ID required' })

  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true })
}
