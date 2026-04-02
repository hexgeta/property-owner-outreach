import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Uses service role — called internally, not by users directly
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { lead_id, user_id } = req.body
  if (!lead_id || !user_id) return res.status(400).json({ error: 'lead_id and user_id required' })

  // Fetch the lead's criteria
  const { data: lead, error: leadError } = await supabaseAdmin
    .from('client_leads')
    .select('*')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead) return res.status(404).json({ error: 'Lead not found' })

  // Fetch available listings for this agent
  let query = supabaseAdmin
    .from('property_listings')
    .select('*')
    .eq('user_id', user_id)
    .eq('status', 'available')

  const { data: listings } = await query
  if (!listings?.length) return res.status(200).json({ matches: 0, message: 'No listings available' })

  // Score each listing against the lead's criteria
  const scored = listings.map(listing => {
    let score = 0
    let maxScore = 0

    // Property type match
    if (lead.property_types?.length) {
      maxScore += 25
      if (lead.property_types.includes(listing.property_type)) score += 25
    }

    // District match
    if (lead.districts?.length) {
      maxScore += 25
      if (lead.districts.includes(listing.district)) score += 25
    }

    // Municipality match (bonus)
    if (lead.municipalities?.length) {
      maxScore += 10
      if (lead.municipalities.includes(listing.municipality)) score += 10
    }

    // Budget match
    if (lead.min_budget || lead.max_budget) {
      maxScore += 20
      if (listing.price) {
        const price = parseFloat(listing.price)
        const inBudget =
          (!lead.min_budget || price >= parseFloat(lead.min_budget)) &&
          (!lead.max_budget || price <= parseFloat(lead.max_budget))
        if (inBudget) score += 20
        // Partial credit if within 20% of budget
        else if (lead.max_budget) {
          const maxB = parseFloat(lead.max_budget)
          if (price <= maxB * 1.2) score += 10
        }
      }
    }

    // Area match
    if (lead.min_area_m2 || lead.max_area_m2) {
      maxScore += 10
      if (listing.area_total_m2) {
        const inRange =
          (!lead.min_area_m2 || listing.area_total_m2 >= lead.min_area_m2) &&
          (!lead.max_area_m2 || listing.area_total_m2 <= lead.max_area_m2)
        if (inRange) score += 10
      }
    }

    // Bedrooms match
    if (lead.num_bedrooms_min || lead.num_bedrooms_max) {
      maxScore += 10
      if (listing.num_bedrooms) {
        const inRange =
          (!lead.num_bedrooms_min || listing.num_bedrooms >= lead.num_bedrooms_min) &&
          (!lead.num_bedrooms_max || listing.num_bedrooms <= lead.num_bedrooms_max)
        if (inRange) score += 10
      }
    }

    // Condition match
    if (lead.condition_preferences?.length) {
      maxScore += 10
      if (listing.condition && lead.condition_preferences.includes(listing.condition)) score += 10
    }

    // Features match
    if (lead.features?.length && listing.features?.length) {
      maxScore += 15
      const overlap = lead.features.filter((f: string) => listing.features.includes(f)).length
      score += Math.round((overlap / lead.features.length) * 15)
    }

    const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 50

    return { listing, score: finalScore }
  })

  // Get top matches (score >= 40, max 5)
  const topMatches = scored
    .filter(m => m.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  if (!topMatches.length) {
    return res.status(200).json({ matches: 0, message: 'No matching listings found' })
  }

  // Save matches to DB
  const matchRecords = topMatches.map(m => ({
    user_id,
    lead_id,
    listing_id: m.listing.id,
    match_score: m.score,
    sent_via: lead.telegram_username || lead.telegram_chat_id ? 'telegram' : 'email',
  }))

  await supabaseAdmin.from('property_matches').upsert(matchRecords, { onConflict: 'lead_id,listing_id' })

  // Send via Telegram if client provided their username/chat_id
  if (lead.telegram_chat_id || lead.telegram_username) {
    try {
      await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/telegram-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id,
          chat_id: lead.telegram_chat_id,
          listings: topMatches.map(m => m.listing),
          scores: topMatches.map(m => m.score),
        }),
      })
    } catch (e) {
      console.error('Telegram send failed:', e)
    }
  }

  // Update lead
  await supabaseAdmin
    .from('client_leads')
    .update({
      matches_sent: topMatches.length,
      last_match_sent_at: new Date().toISOString(),
      status: lead.status === 'new' ? 'contacted' : lead.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead_id)

  return res.status(200).json({ matches: topMatches.length, top_score: topMatches[0]?.score })
}
