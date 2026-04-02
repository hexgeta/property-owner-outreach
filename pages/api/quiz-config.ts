import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth, getSupabaseServer } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireAuth(req, res)
  if (!userId) return
  const supabase = getSupabaseServer(req)

  switch (req.method) {
    case 'GET': {
      const { data, error } = await supabase
        .from('quiz_config')
        .select('*, quiz_steps(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) return res.status(500).json({ error: error.message })

      // Sort steps within each quiz
      data?.forEach((quiz: any) => {
        quiz.quiz_steps?.sort((a: any, b: any) => a.step_order - b.step_order)
      })

      return res.status(200).json(data)
    }

    case 'POST': {
      const { name, slug, welcome_title, welcome_subtitle, completion_message, brand_color, steps } = req.body

      if (!name || !slug) return res.status(400).json({ error: 'name and slug required' })

      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quiz_config')
        .insert({
          user_id: userId,
          name,
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          welcome_title,
          welcome_subtitle,
          completion_message,
          brand_color,
        })
        .select()
        .single()

      if (quizError) return res.status(500).json({ error: quizError.message })

      // Create steps if provided
      if (steps?.length) {
        const stepRecords = steps.map((step: any, i: number) => ({
          quiz_id: quiz.id,
          step_order: i + 1,
          question: step.question,
          description: step.description,
          field_key: step.field_key,
          field_type: step.field_type,
          options: step.options,
          is_required: step.is_required ?? true,
          placeholder: step.placeholder,
          min_value: step.min_value,
          max_value: step.max_value,
          step_unit: step.step_unit,
        }))

        await supabase.from('quiz_steps').insert(stepRecords)
      }

      return res.status(201).json(quiz)
    }

    case 'PUT': {
      const { id, steps, ...updates } = req.body
      if (!id) return res.status(400).json({ error: 'Quiz ID required' })

      const { error: updateError } = await supabase
        .from('quiz_config')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)

      if (updateError) return res.status(500).json({ error: updateError.message })

      // Replace steps if provided
      if (steps) {
        await supabase.from('quiz_steps').delete().eq('quiz_id', id)
        const stepRecords = steps.map((step: any, i: number) => ({
          quiz_id: id,
          step_order: i + 1,
          question: step.question,
          description: step.description,
          field_key: step.field_key,
          field_type: step.field_type,
          options: step.options,
          is_required: step.is_required ?? true,
          placeholder: step.placeholder,
          min_value: step.min_value,
          max_value: step.max_value,
          step_unit: step.step_unit,
        }))
        await supabase.from('quiz_steps').insert(stepRecords)
      }

      return res.status(200).json({ success: true })
    }

    case 'DELETE': {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'Quiz ID required' })
      await supabase.from('quiz_config').delete().eq('id', id).eq('user_id', userId)
      return res.status(200).json({ success: true })
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}
