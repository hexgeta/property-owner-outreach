import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/supabaseClient'

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 29,
    features: ['200 emails/month', 'CSV import', '4 Portuguese templates', 'Pipeline tracking'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 49,
    popular: true,
    features: ['1,000 emails/month', 'Everything in Starter', 'Custom templates', 'Priority support'],
  },
  {
    key: 'agency',
    name: 'Agency',
    price: 99,
    features: ['5,000 emails/month', 'Everything in Pro', 'Multiple team members', 'API access'],
  },
]

export default function BillingPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading, session, refreshProfile } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [loadingPortal, setLoadingPortal] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.push('/portugal-outreach/login')
  }, [user, authLoading])

  useEffect(() => {
    if (router.query.success === 'true') refreshProfile()
  }, [router.query])

  const handleCheckout = async (plan: string) => {
    setLoadingPlan(plan)
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ plan }),
    })
    const { url, error } = await res.json()
    if (url) window.location.href = url
    else alert(error || 'Failed to start checkout')
    setLoadingPlan(null)
  }

  const handleManageBilling = async () => {
    setLoadingPortal(true)
    const res = await fetch('/api/stripe/create-portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
    })
    const { url, error } = await res.json()
    if (url) window.location.href = url
    else alert(error || 'Failed to open billing portal')
    setLoadingPortal(false)
  }

  if (authLoading || !user) return null

  const isActive = profile?.subscription_status === 'active'
  const inTrial = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()
  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <>
      <Head><title>Billing - Portugal Outreach</title></Head>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <Link href="/portugal-outreach" className="text-gray-400 hover:text-white text-sm mb-1 block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-bold">Planos & Faturacao</h1>
          </div>

          {/* Current Status */}
          <Card className="bg-zinc-900 border-zinc-800 mb-8">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">Estado:</span>
                    {isActive ? (
                      <Badge className="bg-green-600">Ativo</Badge>
                    ) : inTrial ? (
                      <Badge className="bg-yellow-600">Trial — {trialDaysLeft} dias restantes</Badge>
                    ) : (
                      <Badge className="bg-red-600">Inativo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {profile?.emails_sent_this_month || 0} / {profile?.monthly_email_limit || 50} emails este mes
                  </p>
                </div>
                {isActive && (
                  <Button variant="outline" onClick={handleManageBilling} disabled={loadingPortal}
                    className="border-zinc-700 text-white hover:bg-zinc-800">
                    {loadingPortal ? 'A abrir...' : 'Gerir Faturacao'}
                  </Button>
                )}
              </div>

              {router.query.success === 'true' && (
                <div className="mt-3 p-3 bg-green-900/50 text-green-300 rounded text-sm">
                  Subscricao ativada com sucesso!
                </div>
              )}
              {router.query.canceled === 'true' && (
                <div className="mt-3 p-3 bg-yellow-900/50 text-yellow-300 rounded text-sm">
                  Checkout cancelado. Pode tentar novamente.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(plan => (
              <Card key={plan.key} className={`bg-zinc-900 ${plan.popular ? 'border-white' : 'border-zinc-800'} relative`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-white text-black">Mais popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-400">
                    <span className="text-3xl font-bold text-white">{plan.price} EUR</span>
                    <span className="text-gray-500"> /mes</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">+</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleCheckout(plan.key)}
                    disabled={loadingPlan !== null || isActive}
                    className={`w-full ${plan.popular ? 'bg-white text-black hover:bg-gray-200' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                  >
                    {loadingPlan === plan.key ? 'A processar...' : isActive ? 'Plano ativo' : 'Comecar'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
