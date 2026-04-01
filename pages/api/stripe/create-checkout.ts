import type { NextApiRequest, NextApiResponse } from 'next'
import { stripe, PLANS } from '@/lib/stripe'
import { requireAuth, getSupabaseServer } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireAuth(req, res)
  if (!userId) return

  const { plan } = req.body as { plan: keyof typeof PLANS }
  const selectedPlan = PLANS[plan]
  if (!selectedPlan || !selectedPlan.priceId) {
    return res.status(400).json({ error: 'Invalid plan' })
  }

  const supabase = getSupabaseServer(req)
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', userId)
    .single()

  if (!profile) return res.status(404).json({ error: 'Profile not found' })

  // Get or create Stripe customer
  let customerId = profile.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      metadata: { supabase_user_id: userId },
    })
    customerId = customer.id

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId)
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
    success_url: `${req.headers.origin}/portugal-outreach/billing?success=true`,
    cancel_url: `${req.headers.origin}/portugal-outreach/billing?canceled=true`,
    metadata: { supabase_user_id: userId },
  })

  return res.status(200).json({ url: session.url })
}
