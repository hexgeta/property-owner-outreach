import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth, getSupabaseServer } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  const supabase = getSupabaseServer(req)
  const { type } = req.query

  switch (type) {
    case 'contacts': {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const headers = ['name', 'email', 'phone', 'property_type', 'district', 'municipality', 'status', 'emails_sent', 'source', 'notes', 'created_at']
      const csv = [
        headers.join(','),
        ...(data || []).map(row =>
          headers.map(h => {
            const val = (row as any)[h]
            if (val === null || val === undefined) return ''
            const str = String(val)
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str
          }).join(',')
        ),
      ].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv')
      return res.status(200).send(csv)
    }

    case 'leads': {
      const { data } = await supabase
        .from('client_leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const headers = ['name', 'email', 'phone', 'telegram_username', 'property_types', 'districts', 'min_budget', 'max_budget', 'timeline', 'status', 'matches_sent', 'created_at']
      const csv = [
        headers.join(','),
        ...(data || []).map(row =>
          headers.map(h => {
            const val = (row as any)[h]
            if (val === null || val === undefined) return ''
            if (Array.isArray(val)) return `"${val.join(';')}"`
            const str = String(val)
            return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
          }).join(',')
        ),
      ].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv')
      return res.status(200).send(csv)
    }

    case 'listings': {
      const { data } = await supabase
        .from('property_listings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const headers = ['title', 'property_type', 'district', 'municipality', 'price', 'area_total_m2', 'num_bedrooms', 'condition', 'features', 'status', 'created_at']
      const csv = [
        headers.join(','),
        ...(data || []).map(row =>
          headers.map(h => {
            const val = (row as any)[h]
            if (val === null || val === undefined) return ''
            if (Array.isArray(val)) return `"${val.join(';')}"`
            const str = String(val)
            return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
          }).join(',')
        ),
      ].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=listings.csv')
      return res.status(200).send(csv)
    }

    default:
      return res.status(400).json({ error: 'Invalid export type. Use: contacts, leads, or listings' })
  }
}
