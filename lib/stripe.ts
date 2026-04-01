import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil' as any,
})

// Pricing plans
export const PLANS = {
  starter: {
    name: 'Starter',
    price: 29,
    priceId: process.env.STRIPE_PRICE_STARTER || '',
    emails_per_month: 200,
    features: ['200 emails/month', 'CSV import', '4 Portuguese templates', 'Pipeline tracking'],
  },
  pro: {
    name: 'Pro',
    price: 49,
    priceId: process.env.STRIPE_PRICE_PRO || '',
    emails_per_month: 1000,
    features: ['1,000 emails/month', 'Everything in Starter', 'Custom templates', 'Priority support'],
  },
  agency: {
    name: 'Agency',
    price: 99,
    priceId: process.env.STRIPE_PRICE_AGENCY || '',
    emails_per_month: 5000,
    features: ['5,000 emails/month', 'Everything in Pro', 'Multiple team members', 'API access'],
  },
} as const

export type PlanKey = keyof typeof PLANS

export function getPlanByPriceId(priceId: string): PlanKey | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key as PlanKey
  }
  return null
}

export function getEmailLimit(priceId: string | null): number {
  if (!priceId) return 50 // trial/free limit
  const plan = Object.values(PLANS).find(p => p.priceId === priceId)
  return plan?.emails_per_month || 50
}
