import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth, getSupabaseServer } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireAuth(req, res)
  if (!userId) return
  const supabase = getSupabaseServer(req)

  switch (req.method) {
    case 'GET': {
      const { data, error } = await supabase
        .from('follow_up_sequences')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json(data)
    }

    case 'POST': {
      const { action } = req.query

      // Enroll contacts in a sequence
      if (action === 'enroll') {
        const { contact_ids, sequence_id } = req.body
        if (!contact_ids?.length || !sequence_id) {
          return res.status(400).json({ error: 'contact_ids and sequence_id required' })
        }

        // Get the sequence to determine first step delay
        const { data: sequence } = await supabase
          .from('follow_up_sequences')
          .select('steps')
          .eq('id', sequence_id)
          .single()

        if (!sequence) return res.status(404).json({ error: 'Sequence not found' })

        const steps = sequence.steps as any[]
        if (!steps.length) return res.status(400).json({ error: 'Sequence has no steps' })

        const firstDelay = steps[0].delay_days || 3
        const nextSendAt = new Date(Date.now() + firstDelay * 24 * 60 * 60 * 1000).toISOString()

        const records = contact_ids.map((cid: string) => ({
          user_id: userId,
          contact_id: cid,
          sequence_id,
          current_step: 0,
          next_send_at: nextSendAt,
          status: 'active',
        }))

        const { data, error } = await supabase
          .from('follow_up_queue')
          .upsert(records, { onConflict: 'contact_id,sequence_id' })
          .select()

        if (error) return res.status(500).json({ error: error.message })

        // Log activity
        for (const cid of contact_ids) {
          await supabase.from('activity_log').insert({
            user_id: userId,
            contact_id: cid,
            activity_type: 'follow_up_started',
            description: `Enrolled in follow-up sequence`,
            metadata: { sequence_id },
          })
        }

        return res.status(201).json({ enrolled: data?.length || 0 })
      }

      // Create a new sequence
      const { name, steps } = req.body
      if (!name || !steps?.length) {
        return res.status(400).json({ error: 'name and steps required' })
      }

      const { data, error } = await supabase
        .from('follow_up_sequences')
        .insert({ user_id: userId, name, steps })
        .select()
        .single()

      if (error) return res.status(500).json({ error: error.message })
      return res.status(201).json(data)
    }

    case 'PUT': {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'ID required' })

      const { data, error } = await supabase
        .from('follow_up_sequences')
        .update({ ...req.body })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json(data)
    }

    case 'DELETE': {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'ID required' })
      await supabase.from('follow_up_sequences').delete().eq('id', id).eq('user_id', userId)
      return res.status(200).json({ success: true })
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}
