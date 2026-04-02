import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/AuthContext'
import { useAuthFetch } from '@/lib/useAuthFetch'

interface Stats {
  contacts: Record<string, number>
  emails: Record<string, number>
}

interface Activity {
  id: string
  activity_type: string
  description: string
  created_at: string
  contact_id: string
  lead_id: string
}

const activityIcons: Record<string, string> = {
  email_sent: '📧',
  email_opened: '👁️',
  email_replied: '📩',
  email_bounced: '❌',
  status_changed: '🔄',
  note_added: '📝',
  call_logged: '📞',
  meeting_scheduled: '📅',
  follow_up_started: '🔁',
  follow_up_completed: '✅',
  follow_up_paused: '⏸️',
  quiz_submitted: '📋',
  match_sent: '🔗',
  lead_created: '🆕',
  telegram_sent: '💬',
  opted_out: '🚫',
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const authFetch = useAuthFetch()

  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push('/portugal-outreach/login')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    Promise.all([
      authFetch('/api/outreach-stats').then(r => r.json()),
      authFetch('/api/activity?limit=30').then(r => r.json()),
    ]).then(([s, a]) => {
      setStats(s)
      setActivity(Array.isArray(a) ? a : [])
    }).finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  const c = stats?.contacts || { total: 0, new: 0, contacted: 0, replied: 0, interested: 0, not_interested: 0, deal_closed: 0 }
  const e = stats?.emails || { total: 0, sent: 0, failed: 0, reply_rate: '0' }

  const conversionRate = c.total > 0 ? ((c.interested + c.deal_closed) / c.total * 100).toFixed(1) : '0'
  const contactRate = c.total > 0 ? (c.contacted / c.total * 100).toFixed(1) : '0'
  const replyRate = c.contacted > 0 ? (c.replied / c.contacted * 100).toFixed(1) : '0'
  const closeRate = c.interested > 0 ? (c.deal_closed / c.interested * 100).toFixed(1) : '0'

  // Funnel percentages for bar widths
  const funnelSteps = [
    { label: 'Total Contacts', value: c.total, pct: 100 },
    { label: 'Contacted', value: c.contacted + c.replied + c.interested + c.deal_closed, pct: c.total > 0 ? ((c.contacted + c.replied + c.interested + c.deal_closed) / c.total * 100) : 0 },
    { label: 'Replied', value: c.replied + c.interested + c.deal_closed, pct: c.total > 0 ? ((c.replied + c.interested + c.deal_closed) / c.total * 100) : 0 },
    { label: 'Interested', value: c.interested + c.deal_closed, pct: c.total > 0 ? ((c.interested + c.deal_closed) / c.total * 100) : 0 },
    { label: 'Deal Closed', value: c.deal_closed, pct: c.total > 0 ? (c.deal_closed / c.total * 100) : 0 },
  ]

  return (
    <>
      <Head><title>Analytics - Portugal Outreach</title></Head>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Link href="/portugal-outreach" className="text-gray-400 hover:text-white text-sm mb-1 block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-bold">Analytics</h1>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4 pb-4">
                <div className="text-3xl font-bold">{contactRate}%</div>
                <div className="text-xs text-gray-400">Contact Rate</div>
                <div className="text-[10px] text-gray-600 mt-1">{c.contacted + c.replied + c.interested + c.deal_closed} of {c.total} contacted</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4 pb-4">
                <div className="text-3xl font-bold text-yellow-400">{replyRate}%</div>
                <div className="text-xs text-gray-400">Reply Rate</div>
                <div className="text-[10px] text-gray-600 mt-1">{c.replied} replies from {c.contacted} contacted</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4 pb-4">
                <div className="text-3xl font-bold text-green-400">{conversionRate}%</div>
                <div className="text-xs text-gray-400">Conversion Rate</div>
                <div className="text-[10px] text-gray-600 mt-1">{c.interested + c.deal_closed} interested from {c.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4 pb-4">
                <div className="text-3xl font-bold text-emerald-400">{closeRate}%</div>
                <div className="text-xs text-gray-400">Close Rate</div>
                <div className="text-[10px] text-gray-600 mt-1">{c.deal_closed} closed from {c.interested} interested</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {/* Conversion Funnel */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {funnelSteps.map((step, i) => (
                  <div key={step.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{step.label}</span>
                      <span className="font-mono">{step.value} ({step.pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-8 bg-zinc-800 rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all duration-700"
                        style={{
                          width: `${Math.max(step.pct, 2)}%`,
                          backgroundColor: ['#64748b', '#3b82f6', '#eab308', '#22c55e', '#10b981'][i],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Email Stats */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Email Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-800 rounded text-center">
                    <div className="text-2xl font-bold">{e.sent}</div>
                    <div className="text-xs text-gray-400">Emails Sent</div>
                  </div>
                  <div className="p-4 bg-zinc-800 rounded text-center">
                    <div className="text-2xl font-bold text-red-400">{e.failed}</div>
                    <div className="text-xs text-gray-400">Failed / Bounced</div>
                  </div>
                  <div className="p-4 bg-zinc-800 rounded text-center">
                    <div className="text-2xl font-bold text-yellow-400">{c.replied}</div>
                    <div className="text-xs text-gray-400">Replies</div>
                  </div>
                  <div className="p-4 bg-zinc-800 rounded text-center">
                    <div className="text-2xl font-bold text-green-400">{e.reply_rate}%</div>
                    <div className="text-xs text-gray-400">Reply Rate</div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm text-gray-400 mb-2">Usage This Month</div>
                  <div className="w-full h-4 bg-zinc-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded transition-all"
                      style={{ width: `${Math.min(((profile?.emails_sent_this_month || 0) / (profile?.monthly_email_limit || 50)) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {profile?.emails_sent_this_month || 0} / {profile?.monthly_email_limit || 50} emails used
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <Card className="bg-zinc-900 border-zinc-800 mb-8">
            <CardHeader>
              <CardTitle className="text-white text-lg">Contact Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
                {[
                  { label: 'New', value: c.new, color: 'border-slate-500' },
                  { label: 'Contacted', value: c.contacted, color: 'border-blue-500' },
                  { label: 'Replied', value: c.replied, color: 'border-yellow-500' },
                  { label: 'Interested', value: c.interested, color: 'border-green-500' },
                  { label: 'Not Interested', value: c.not_interested, color: 'border-red-500' },
                  { label: 'Deal Closed', value: c.deal_closed, color: 'border-emerald-400' },
                  { label: 'Opted Out', value: (c as any).opted_out || 0, color: 'border-gray-600' },
                ].map(s => (
                  <div key={s.label} className={`p-3 bg-zinc-800 rounded border-l-4 ${s.color}`}>
                    <div className="text-xl font-bold">{s.value}</div>
                    <div className="text-[10px] text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <div className="text-gray-400 text-sm py-4">No activity yet.</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activity.map(a => (
                    <div key={a.id} className="flex items-start gap-3 p-2 rounded hover:bg-zinc-800/50">
                      <span className="text-lg mt-0.5">{activityIcons[a.activity_type] || '📌'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{a.description || a.activity_type.replace(/_/g, ' ')}</div>
                        <div className="text-[10px] text-gray-500">
                          {new Date(a.created_at).toLocaleString('pt-PT')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
