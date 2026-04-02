import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/AuthContext'
import { useAuthFetch } from '@/lib/useAuthFetch'

interface Stats {
  contacts: {
    total: number
    new: number
    contacted: number
    replied: number
    interested: number
    not_interested: number
    deal_closed: number
    opted_out: number
  }
  emails: {
    total: number
    sent: number
    failed: number
    reply_rate: string
  }
}

const defaultStats: Stats = {
  contacts: { total: 0, new: 0, contacted: 0, replied: 0, interested: 0, not_interested: 0, deal_closed: 0, opted_out: 0 },
  emails: { total: 0, sent: 0, failed: 0, reply_rate: '0' },
}

export default function OutreachDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading, signOut, isSubscribed, isTrialing } = useAuth()
  const authFetch = useAuthFetch()
  const [stats, setStats] = useState<Stats>(defaultStats)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push('/portugal-outreach/login')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    authFetch('/api/outreach-stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const pipeline = [
    { label: 'New', value: stats.contacts.new, color: 'bg-slate-500' },
    { label: 'Contacted', value: stats.contacts.contacted, color: 'bg-blue-500' },
    { label: 'Replied', value: stats.contacts.replied, color: 'bg-yellow-500' },
    { label: 'Interested', value: stats.contacts.interested, color: 'bg-green-500' },
    { label: 'Deal Closed', value: stats.contacts.deal_closed, color: 'bg-emerald-400' },
  ]

  if (authLoading || !user) return null

  return (
    <>
      <Head>
        <title>Portugal Outreach - Cold Email Tool</title>
      </Head>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Portugal Property Outreach</h1>
            <p className="text-gray-400">Cold email tool for contacting villa & land owners across Portugal</p>
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-3">
              <Link href="/portugal-outreach/contacts">
                <Badge variant="outline" className="cursor-pointer px-4 py-2 text-sm hover:bg-white hover:text-black transition-colors">
                  Contacts
                </Badge>
              </Link>
              <Link href="/portugal-outreach/outreach">
                <Badge variant="outline" className="cursor-pointer px-4 py-2 text-sm hover:bg-white hover:text-black transition-colors">
                  Send Emails
                </Badge>
              </Link>
              <Link href="/portugal-outreach/funnel">
                <Badge variant="outline" className="cursor-pointer px-4 py-2 text-sm hover:bg-white hover:text-black transition-colors">
                  Funnel
                </Badge>
              </Link>
              <Link href="/portugal-outreach/listings">
                <Badge variant="outline" className="cursor-pointer px-4 py-2 text-sm hover:bg-white hover:text-black transition-colors">
                  Listings
                </Badge>
              </Link>
              <Link href="/portugal-outreach/billing">
                <Badge variant="outline" className="cursor-pointer px-4 py-2 text-sm hover:bg-white hover:text-black transition-colors">
                  Billing
                </Badge>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {profile && (
                <span className="text-sm text-gray-400">{profile.email}</span>
              )}
              <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-400 hover:text-white">
                Sair
              </Button>
            </div>
          </div>

          {/* Trial/subscription banner */}
          {!isSubscribed && isTrialing && (
            <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-800 rounded text-sm text-yellow-300 flex items-center justify-between">
              <span>Trial ativo — {profile?.emails_sent_this_month || 0}/{profile?.monthly_email_limit || 50} emails usados este mes</span>
              <Link href="/portugal-outreach/billing">
                <Button size="sm" className="bg-white text-black hover:bg-gray-200 text-xs">Upgrade</Button>
              </Link>
            </div>
          )}
          {!isSubscribed && !isTrialing && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded text-sm text-red-300 flex items-center justify-between">
              <span>Trial expirado. Faca upgrade para continuar a enviar emails.</span>
              <Link href="/portugal-outreach/billing">
                <Button size="sm" className="bg-white text-black hover:bg-gray-200 text-xs">Ver Planos</Button>
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400">Total Contacts</CardDescription>
                <CardTitle className="text-3xl text-white">{loading ? '...' : stats.contacts.total}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">{stats.contacts.new} not yet contacted</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400">Emails Sent</CardDescription>
                <CardTitle className="text-3xl text-white">{loading ? '...' : stats.emails.sent}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">{stats.emails.failed} failed</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400">Replied</CardDescription>
                <CardTitle className="text-3xl text-yellow-400">{loading ? '...' : stats.contacts.replied}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">{stats.emails.reply_rate}% reply rate</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400">Interested</CardDescription>
                <CardTitle className="text-3xl text-green-400">{loading ? '...' : stats.contacts.interested}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">{stats.contacts.deal_closed} deals closed</p>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline */}
          <Card className="bg-zinc-900 border-zinc-800 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Pipeline</CardTitle>
              <CardDescription className="text-gray-400">Contact funnel from cold email to deal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 items-end h-40">
                {pipeline.map((stage) => {
                  const maxVal = Math.max(...pipeline.map(s => s.value), 1)
                  const height = Math.max((stage.value / maxVal) * 100, 8)
                  return (
                    <div key={stage.label} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-lg font-bold text-white">{stage.value}</span>
                      <div
                        className={`w-full rounded-t ${stage.color} transition-all duration-500`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs text-gray-400 text-center">{stage.label}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/portugal-outreach/contacts">
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Import Contacts</CardTitle>
                  <CardDescription className="text-gray-400">
                    Add land & villa owners via CSV or manually.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/portugal-outreach/outreach">
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Send Cold Emails</CardTitle>
                  <CardDescription className="text-gray-400">
                    Portuguese templates, bulk send, track replies.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/portugal-outreach/funnel">
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Client Funnel</CardTitle>
                  <CardDescription className="text-gray-400">
                    Onboarding quiz for iPad / mobile. Captures buyer criteria.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/portugal-outreach/listings">
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Listings</CardTitle>
                  <CardDescription className="text-gray-400">
                    Your property inventory. Auto-matched to client leads via Telegram.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
