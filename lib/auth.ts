import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

// Server-side Supabase client that uses the user's JWT
export function getSupabaseServer(req: NextApiRequest) {
  const token = req.headers.authorization?.replace('Bearer ', '') || ''

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  )
}

// Get user ID from Supabase auth - returns null if not authenticated
export async function getUserId(req: NextApiRequest): Promise<string | null> {
  const supabase = getSupabaseServer(req)
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

// Auth middleware - returns user_id or sends 401
export async function requireAuth(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const userId = await getUserId(req)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return userId
}

// Check if user has active subscription or is in trial
export async function requireActiveSubscription(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const userId = await requireAuth(req, res)
  if (!userId) return null

  const supabase = getSupabaseServer(req)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at')
    .eq('id', userId)
    .single()

  if (!profile) {
    res.status(401).json({ error: 'Profile not found' })
    return null
  }

  const isActive = profile.subscription_status === 'active' || profile.subscription_status === 'trialing'
  const inTrial = profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date()

  if (!isActive && !inTrial) {
    res.status(403).json({ error: 'Subscription required', code: 'SUBSCRIPTION_REQUIRED' })
    return null
  }

  return userId
}
