import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/supabaseClient'

// Public endpoint — no auth required (this is for clients filling out the quiz)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query

  if (req.method === 'GET') {
    // Fetch quiz config + steps (public)
    const { data: quiz, error: quizError } = await supabase
      .from('quiz_config')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (quizError || !quiz) return res.status(404).json({ error: 'Quiz not found' })

    const { data: steps } = await supabase
      .from('quiz_steps')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('step_order', { ascending: true })

    return res.status(200).json({ quiz, steps: steps || [] })
  }

  if (req.method === 'POST') {
    // Submit quiz answers — creates a client lead
    const { data: quiz } = await supabase
      .from('quiz_config')
      .select('id, user_id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' })

    const {
      name, email, phone, telegram_username,
      property_types, districts, municipalities,
      min_area_m2, max_area_m2, min_budget, max_budget,
      num_bedrooms_min, num_bedrooms_max,
      condition_preferences, features, timeline,
      quiz_answers,
    } = req.body

    if (!name) return res.status(400).json({ error: 'Name is required' })

    const lead: any = {
      user_id: quiz.user_id,
      quiz_id: quiz.id,
      name,
      email: email || null,
      phone: phone || null,
      telegram_username: telegram_username || null,
      property_types: property_types || [],
      districts: districts || [],
      municipalities: municipalities || [],
      min_area_m2: min_area_m2 ? parseFloat(min_area_m2) : null,
      max_area_m2: max_area_m2 ? parseFloat(max_area_m2) : null,
      min_budget: min_budget ? parseFloat(min_budget) : null,
      max_budget: max_budget ? parseFloat(max_budget) : null,
      num_bedrooms_min: num_bedrooms_min ? parseInt(num_bedrooms_min) : null,
      num_bedrooms_max: num_bedrooms_max ? parseInt(num_bedrooms_max) : null,
      condition_preferences: condition_preferences || [],
      features: features || [],
      timeline: timeline || null,
      quiz_answers: quiz_answers || {},
      status: 'new',
    }

    const { data, error } = await supabase
      .from('client_leads')
      .insert(lead)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Trigger matching in the background (non-blocking)
    fetch(`${req.headers.origin}/api/match-properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: data.id, user_id: quiz.user_id }),
    }).catch(() => {})

    return res.status(201).json({ success: true, lead_id: data.id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
