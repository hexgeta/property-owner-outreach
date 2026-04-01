import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  const [stats, setStats] = useState<Stats>(defaultStats)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/outreach-stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const pipeline = [
    { label: 'New', value: stats.contacts.new, color: 'bg-slate-500' },
    { label: 'Contacted', value: stats.contacts.contacted, color: 'bg-blue-500' },
    { label: 'Replied', value: stats.contacts.replied, color: 'bg-yellow-500' },
    { label: 'Interested', value: stats.contacts.interested, color: 'bg-green-500' },
    { label: 'Deal Closed', value: stats.contacts.deal_closed, color: 'bg-emerald-400' },
  ]

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
          <div className="flex gap-3 mb-8">
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
          </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/portugal-outreach/contacts">
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Import Contacts</CardTitle>
                  <CardDescription className="text-gray-400">
                    Add land & villa owners via CSV or manually. Include name, email, district, and property type.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/portugal-outreach/outreach">
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Send Cold Emails</CardTitle>
                  <CardDescription className="text-gray-400">
                    Pick a Portuguese template, select contacts, and send. Tracks delivery and replies.
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
