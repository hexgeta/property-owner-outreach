import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const OWNER_TYPES = ['individual', 'company', 'estate', 'government', 'unknown']

interface Owner {
  id: string
  owner_type: string
  name: string
  nif: string
  email: string
  phone: string
  address: string
  city: string
  company_name: string
  opted_out: boolean
  created_at: string
  property_owners?: any[]
}

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newOwner, setNewOwner] = useState({
    owner_type: 'individual',
    name: '',
    nif: '',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    city: '',
    company_name: '',
    notes: '',
  })

  const fetchOwners = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('opted_out', 'false')

    const res = await fetch(`/api/owners?${params}`)
    const json = await res.json()
    setOwners(json.data || [])
    setLoading(false)
  }

  useEffect(() => {
    const timeout = setTimeout(fetchOwners, 300)
    return () => clearTimeout(timeout)
  }, [search])

  const handleAddOwner = async () => {
    const body = { ...newOwner }
    const res = await fetch('/api/owners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setShowAddDialog(false)
      setNewOwner({
        owner_type: 'individual', name: '', nif: '', email: '', phone: '',
        address: '', postal_code: '', city: '', company_name: '', notes: '',
      })
      fetchOwners()
    }
  }

  const handleOptOut = async (id: string) => {
    await fetch(`/api/owners?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opted_out: true, opted_out_date: new Date().toISOString() }),
    })
    fetchOwners()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/owners?id=${id}`, { method: 'DELETE' })
    fetchOwners()
  }

  return (
    <>
      <Head><title>Owners - Portugal Outreach</title></Head>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link href="/portugal-outreach" className="text-gray-400 hover:text-white text-sm mb-1 block">
                &larr; Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold">Property Owners</h1>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-white text-black hover:bg-gray-200">+ Add Owner</Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Owner</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                  <div>
                    <Label>Owner Type</Label>
                    <Select value={newOwner.owner_type} onValueChange={v => setNewOwner(o => ({ ...o, owner_type: v }))}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OWNER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input className="bg-zinc-800 border-zinc-700" value={newOwner.name}
                      onChange={e => setNewOwner(o => ({ ...o, name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div>
                    <Label>NIF (Tax ID)</Label>
                    <Input className="bg-zinc-800 border-zinc-700" value={newOwner.nif}
                      onChange={e => setNewOwner(o => ({ ...o, nif: e.target.value }))} placeholder="123456789" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input className="bg-zinc-800 border-zinc-700" type="email" value={newOwner.email}
                      onChange={e => setNewOwner(o => ({ ...o, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input className="bg-zinc-800 border-zinc-700" value={newOwner.phone}
                      onChange={e => setNewOwner(o => ({ ...o, phone: e.target.value }))} placeholder="+351..." />
                  </div>
                  {newOwner.owner_type === 'company' && (
                    <div>
                      <Label>Company Name</Label>
                      <Input className="bg-zinc-800 border-zinc-700" value={newOwner.company_name}
                        onChange={e => setNewOwner(o => ({ ...o, company_name: e.target.value }))} />
                    </div>
                  )}
                  <div>
                    <Label>Address</Label>
                    <Input className="bg-zinc-800 border-zinc-700" value={newOwner.address}
                      onChange={e => setNewOwner(o => ({ ...o, address: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Postal Code</Label>
                      <Input className="bg-zinc-800 border-zinc-700" value={newOwner.postal_code}
                        onChange={e => setNewOwner(o => ({ ...o, postal_code: e.target.value }))} placeholder="1000-001" />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input className="bg-zinc-800 border-zinc-700" value={newOwner.city}
                        onChange={e => setNewOwner(o => ({ ...o, city: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea className="bg-zinc-800 border-zinc-700" value={newOwner.notes}
                      onChange={e => setNewOwner(o => ({ ...o, notes: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={handleAddOwner} className="w-full mt-4 bg-white text-black hover:bg-gray-200">
                  Save Owner
                </Button>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="mb-6">
            <Input
              className="bg-zinc-900 border-zinc-800 max-w-md"
              placeholder="Search by name, email, or NIF..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Owners Table */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : owners.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No owners found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left p-3 text-gray-400 text-sm">Name</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Type</th>
                        <th className="text-left p-3 text-gray-400 text-sm">NIF</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Email</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Phone</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Properties</th>
                        <th className="text-right p-3 text-gray-400 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {owners.map(o => (
                        <tr key={o.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                          <td className="p-3 font-medium">{o.name}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="capitalize">{o.owner_type}</Badge>
                          </td>
                          <td className="p-3 text-sm text-gray-400">{o.nif || '-'}</td>
                          <td className="p-3 text-sm">{o.email || '-'}</td>
                          <td className="p-3 text-sm text-gray-400">{o.phone || '-'}</td>
                          <td className="p-3 text-sm">{o.property_owners?.length || 0}</td>
                          <td className="p-3 text-right space-x-2">
                            {o.email && (
                              <Link href={`/portugal-outreach/outreach?owner_id=${o.id}&email=${o.email}&name=${o.name}`}>
                                <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                                  Email
                                </Button>
                              </Link>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOptOut(o.id)}
                              className="text-yellow-400 hover:text-yellow-300"
                            >
                              Opt Out
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(o.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
