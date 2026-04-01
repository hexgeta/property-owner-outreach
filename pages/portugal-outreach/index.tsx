import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Stats {
  properties: {
    total: number
    identified: number
    owner_found: number
    contacted: number
    interested: number
  }
  owners: { total: number }
  emails: {
    total: number
    sent: number
    opened: number
    replied: number
    open_rate: string
    reply_rate: string
  }
}

const defaultStats: Stats = {
  properties: { total: 0, identified: 0, owner_found: 0, contacted: 0, interested: 0 },
  owners: { total: 0 },
  emails: { total: 0, sent: 0, opened: 0, replied: 0, open_rate: '0', reply_rate: '0' },
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

  const pipelineStages = [
    { label: 'Identified', value: stats.properties.identified, color: 'bg-slate-500' },
    { label: 'Owner Found', value: stats.properties.owner_found, color: 'bg-blue-500' },
    { label: 'Contacted', value: stats.properties.contacted, color: 'bg-yellow-500' },
    { label: 'Interested', value: stats.properties.interested, color: 'bg-green-500' },
  ]

  return (
    <>
      <Head>
        <title>Portugal Property Outreach</title>
      </Head>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Portugal Property Outreach</h1>
            <p className="text-gray-400">Find villa and land owners across Portugal and connect with them</p>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mb-8">
            <Link href="/portugal-outreach/properties">
              <Badge variant="outline" className="cursor-pointer px-4 py-2 text-sm hover:bg-white hover:text-black transition-colors">
                Properties
              </Badge>
            </Link>
            <Link href="/portugal-outreach/owners">
              <Badge variant="outline" className="cursor-pointer px-4 py-2 text-sm hover:bg-white hover:text-black transition-colors">
                Owners
              </Badge>
            </Link>
            <Link href="/portugal-outreach/outreach">
              <Badge variant="outline" className="cursor-pointer px-4 py-2 text-sm hover:bg-white hover:text-black transition-colors">
                Email Outreach
              </Badge>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400">Total Properties</CardDescription>
                <CardTitle className="text-3xl text-white">
                  {loading ? '...' : stats.properties.total}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">Villas & land across Portugal</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400">Owners Found</CardDescription>
                <CardTitle className="text-3xl text-white">
                  {loading ? '...' : stats.owners.total}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">With contact information</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400">Emails Sent</CardDescription>
                <CardTitle className="text-3xl text-white">
                  {loading ? '...' : stats.emails.sent}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">
                  {stats.emails.open_rate}% open rate
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400">Replies</CardDescription>
                <CardTitle className="text-3xl text-green-400">
                  {loading ? '...' : stats.emails.replied}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">
                  {stats.emails.reply_rate}% reply rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline */}
          <Card className="bg-zinc-900 border-zinc-800 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Pipeline</CardTitle>
              <CardDescription className="text-gray-400">Property acquisition funnel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 items-end h-40">
                {pipelineStages.map((stage) => {
                  const maxVal = Math.max(...pipelineStages.map(s => s.value), 1)
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/portugal-outreach/properties">
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Add Properties</CardTitle>
                  <CardDescription className="text-gray-400">
                    Import CSV or manually add villas and land parcels
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/portugal-outreach/owners">
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Manage Owners</CardTitle>
                  <CardDescription className="text-gray-400">
                    Add owner details and link them to properties
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/portugal-outreach/outreach">
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Send Emails</CardTitle>
                  <CardDescription className="text-gray-400">
                    Contact owners with Portuguese email templates
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
