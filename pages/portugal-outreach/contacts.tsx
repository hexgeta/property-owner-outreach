import React, { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/AuthContext'
import { useAuthFetch } from '@/lib/useAuthFetch'
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

const DISTRICTS = [
  'Aveiro', 'Beja', 'Braga', 'Braganca', 'Castelo Branco', 'Coimbra',
  'Evora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre',
  'Porto', 'Santarem', 'Setubal', 'Viana do Castelo', 'Vila Real', 'Viseu'
]
const PROPERTY_TYPES = ['villa', 'land', 'farm', 'ruin']
const STATUSES = ['new', 'contacted', 'opened', 'replied', 'interested', 'not_interested', 'deal_closed', 'opted_out']

const statusColors: Record<string, string> = {
  new: 'bg-slate-600',
  contacted: 'bg-blue-600',
  opened: 'bg-blue-400',
  replied: 'bg-yellow-600',
  interested: 'bg-green-600',
  not_interested: 'bg-red-600',
  deal_closed: 'bg-emerald-500',
  opted_out: 'bg-gray-700',
}

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  property_type: string
  district: string
  municipality: string
  area_m2: number
  estimated_value: number
  status: string
  emails_sent: number
  last_emailed_at: string
  notes: string
  source: string
  created_at: string
}

export default function ContactsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const authFetch = useAuthFetch()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ district: '', property_type: '', status: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push('/portugal-outreach/login')
  }, [user, authLoading])

  const [form, setForm] = useState({
    name: '', email: '', phone: '', property_type: 'land', district: '',
    municipality: '', parish: '', property_address: '', area_m2: '',
    estimated_value: '', notes: '', source: '',
  })

  const fetchContacts = async () => {
    if (!user) return
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filters.district) params.set('district', filters.district)
    if (filters.property_type) params.set('property_type', filters.property_type)
    if (filters.status) params.set('status', filters.status)

    const res = await authFetch(`/api/contacts?${params}`)
    const json = await res.json()
    setContacts(json.data || [])
    setLoading(false)
  }

  useEffect(() => {
    const t = setTimeout(fetchContacts, 300)
    return () => clearTimeout(t)
  }, [search, filters, user])

  const handleAdd = async () => {
    const body: any = { ...form }
    if (body.area_m2) body.area_m2 = parseFloat(body.area_m2); else delete body.area_m2
    if (body.estimated_value) body.estimated_value = parseFloat(body.estimated_value); else delete body.estimated_value
    if (!body.name || !body.email) return

    const res = await authFetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setShowAdd(false)
      setForm({ name: '', email: '', phone: '', property_type: 'land', district: '', municipality: '', parish: '', property_address: '', area_m2: '', estimated_value: '', notes: '', source: '' })
      fetchContacts()
    }
  }

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvImporting(true)

    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))

    const contacts = lines.slice(1).map(line => {
      // Handle quoted CSV fields
      const values: string[] = []
      let current = ''
      let inQuotes = false
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; continue }
        if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
        current += char
      }
      values.push(current.trim())

      const obj: any = {}
      headers.forEach((header, i) => {
        if (values[i]) {
          if (['area_m2', 'estimated_value'].includes(header)) {
            obj[header] = parseFloat(values[i])
          } else {
            obj[header] = values[i]
          }
        }
      })
      if (!obj.property_type) obj.property_type = 'land'
      return obj
    }).filter(c => c.name && c.email)

    if (contacts.length > 0) {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contacts),
      })
      fetchContacts()
    }
    setCsvImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (id: string) => {
    await authFetch(`/api/contacts?id=${id}`, { method: 'DELETE' })
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    fetchContacts()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await authFetch(`/api/contacts?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...(status === 'opted_out' ? { opted_out: true, opted_out_date: new Date().toISOString() } : {}) }),
    })
    fetchContacts()
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)))
    }
  }

  if (authLoading || !user) return null

  return (
    <>
      <Head><title>Contacts - Portugal Outreach</title></Head>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link href="/portugal-outreach" className="text-gray-400 hover:text-white text-sm mb-1 block">&larr; Dashboard</Link>
              <h1 className="text-2xl font-bold">Contacts</h1>
              <p className="text-sm text-gray-400 mt-1">Property owners to contact about selling</p>
            </div>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={csvImporting}
                className="border-zinc-700 text-white hover:bg-zinc-800">
                {csvImporting ? 'Importing...' : 'Import CSV'}
              </Button>
              <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-black hover:bg-gray-200">+ Add Contact</Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Name *</Label>
                        <Input className="bg-zinc-800 border-zinc-700" value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Joao Silva" />
                      </div>
                      <div>
                        <Label>Email *</Label>
                        <Input className="bg-zinc-800 border-zinc-700" type="email" value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Phone</Label>
                        <Input className="bg-zinc-800 border-zinc-700" value={form.phone}
                          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+351..." />
                      </div>
                      <div>
                        <Label>Property Type</Label>
                        <Select value={form.property_type} onValueChange={v => setForm(f => ({ ...f, property_type: v }))}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>District</Label>
                        <Select value={form.district} onValueChange={v => setForm(f => ({ ...f, district: v }))}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Municipality</Label>
                        <Input className="bg-zinc-800 border-zinc-700" value={form.municipality}
                          onChange={e => setForm(f => ({ ...f, municipality: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Area (m2)</Label>
                        <Input className="bg-zinc-800 border-zinc-700" type="number" value={form.area_m2}
                          onChange={e => setForm(f => ({ ...f, area_m2: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Est. Value (EUR)</Label>
                        <Input className="bg-zinc-800 border-zinc-700" type="number" value={form.estimated_value}
                          onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label>Source</Label>
                      <Input className="bg-zinc-800 border-zinc-700" value={form.source}
                        onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. registry, referral, ad response" />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea className="bg-zinc-800 border-zinc-700" value={form.notes}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                  </div>
                  <Button onClick={handleAdd} className="w-full mt-4 bg-white text-black hover:bg-gray-200">Save Contact</Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Input className="bg-zinc-900 border-zinc-800 w-64" placeholder="Search name, email, district..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <Select value={filters.district || 'all'} onValueChange={v => setFilters(f => ({ ...f, district: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-44 bg-zinc-900 border-zinc-800"><SelectValue placeholder="All Districts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.property_type || 'all'} onValueChange={v => setFilters(f => ({ ...f, property_type: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-36 bg-zinc-900 border-zinc-800"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status || 'all'} onValueChange={v => setFilters(f => ({ ...f, status: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-zinc-900 rounded border border-zinc-800">
              <span className="text-sm text-gray-400">{selectedIds.size} selected</span>
              <Link href={`/portugal-outreach/outreach?ids=${Array.from(selectedIds).join(',')}`}>
                <Button size="sm" className="bg-white text-black hover:bg-gray-200">Email Selected</Button>
              </Link>
            </div>
          )}

          {/* CSV format hint */}
          <Card className="bg-zinc-900 border-zinc-800 mb-4">
            <CardContent className="py-3">
              <p className="text-xs text-gray-500">
                <strong>CSV columns:</strong> name, email, phone, property_type, district, municipality, parish, property_address, area_m2, estimated_value, source, notes
              </p>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : contacts.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No contacts yet. Add manually or import a CSV.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="p-3 w-10">
                          <input type="checkbox" checked={selectedIds.size === contacts.length && contacts.length > 0}
                            onChange={toggleSelectAll} className="rounded" />
                        </th>
                        <th className="text-left p-3 text-gray-400 text-sm">Name</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Email</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Property</th>
                        <th className="text-left p-3 text-gray-400 text-sm">District</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Status</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Emails</th>
                        <th className="text-right p-3 text-gray-400 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map(c => (
                        <tr key={c.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                          <td className="p-3">
                            <input type="checkbox" checked={selectedIds.has(c.id)}
                              onChange={() => toggleSelect(c.id)} className="rounded" />
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-sm">{c.name}</div>
                            {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                          </td>
                          <td className="p-3 text-sm">{c.email}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="capitalize text-xs">{c.property_type}</Badge>
                            {c.area_m2 && <span className="text-xs text-gray-500 ml-2">{c.area_m2.toLocaleString()}m2</span>}
                          </td>
                          <td className="p-3 text-sm text-gray-400">{c.district || '-'}</td>
                          <td className="p-3">
                            <Select value={c.status} onValueChange={v => handleStatusChange(c.id, v)}>
                              <SelectTrigger className="h-7 text-xs bg-transparent border-none p-0">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs text-white ${statusColors[c.status] || 'bg-gray-600'}`}>
                                  {c.status.replace(/_/g, ' ')}
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 text-sm text-gray-400">{c.emails_sent || 0}</td>
                          <td className="p-3 text-right">
                            <Link href={`/portugal-outreach/outreach?ids=${c.id}&email=${c.email}&name=${c.name}&district=${c.district || ''}`}>
                              <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 text-xs">Email</Button>
                            </Link>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}
                              className="text-red-400 hover:text-red-300 text-xs">Delete</Button>
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
