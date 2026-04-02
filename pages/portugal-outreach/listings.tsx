import React, { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { useAuth } from '@/lib/AuthContext'
import { useAuthFetch } from '@/lib/useAuthFetch'

const DISTRICTS = [
  'Aveiro', 'Beja', 'Braga', 'Braganca', 'Castelo Branco', 'Coimbra',
  'Evora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre',
  'Porto', 'Santarem', 'Setubal', 'Viana do Castelo', 'Vila Real', 'Viseu'
]
const PROPERTY_TYPES = ['villa', 'land', 'farm', 'ruin']
const CONDITIONS = ['new', 'good', 'needs_renovation', 'ruin']
const FEATURES = ['pool', 'garden', 'sea_view', 'garage', 'terrace', 'fireplace', 'central_heating']

interface Listing {
  id: string
  title: string
  property_type: string
  district: string
  municipality: string
  price: number
  area_total_m2: number
  num_bedrooms: number
  condition: string
  features: string[]
  status: string
  thumbnail_url: string
  created_at: string
}

export default function ListingsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const authFetch = useAuthFetch()

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])

  const [form, setForm] = useState({
    title: '', property_type: 'villa', description: '', district: '',
    municipality: '', parish: '', address: '', price: '', area_total_m2: '',
    area_built_m2: '', num_bedrooms: '', num_bathrooms: '', condition: 'good',
    thumbnail_url: '', source: '',
  })

  useEffect(() => {
    if (!authLoading && !user) router.push('/portugal-outreach/login')
  }, [user, authLoading])

  const fetchListings = async () => {
    if (!user) return
    setLoading(true)
    const res = await authFetch('/api/listings')
    const json = await res.json()
    setListings(json.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchListings() }, [user])

  const handleAdd = async () => {
    const body: any = { ...form, features: selectedFeatures }
    if (body.price) body.price = parseFloat(body.price); else delete body.price
    if (body.area_total_m2) body.area_total_m2 = parseFloat(body.area_total_m2); else delete body.area_total_m2
    if (body.area_built_m2) body.area_built_m2 = parseFloat(body.area_built_m2); else delete body.area_built_m2
    if (body.num_bedrooms) body.num_bedrooms = parseInt(body.num_bedrooms); else delete body.num_bedrooms
    if (body.num_bathrooms) body.num_bathrooms = parseInt(body.num_bathrooms); else delete body.num_bathrooms
    if (!body.title) return

    const res = await authFetch('/api/listings', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setShowAdd(false)
      setForm({ title: '', property_type: 'villa', description: '', district: '', municipality: '', parish: '', address: '', price: '', area_total_m2: '', area_built_m2: '', num_bedrooms: '', num_bathrooms: '', condition: 'good', thumbnail_url: '', source: '' })
      setSelectedFeatures([])
      fetchListings()
    }
  }

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvImporting(true)

    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))

    const items = lines.slice(1).map(line => {
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
          if (['price', 'area_total_m2', 'area_built_m2'].includes(header)) {
            obj[header] = parseFloat(values[i])
          } else if (['num_bedrooms', 'num_bathrooms'].includes(header)) {
            obj[header] = parseInt(values[i])
          } else if (header === 'features') {
            obj[header] = values[i].split(';').map(f => f.trim())
          } else {
            obj[header] = values[i]
          }
        }
      })
      if (!obj.property_type) obj.property_type = 'villa'
      return obj
    }).filter(l => l.title)

    if (items.length > 0) {
      await authFetch('/api/listings', {
        method: 'POST',
        body: JSON.stringify(items),
      })
      fetchListings()
    }
    setCsvImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (id: string) => {
    await authFetch(`/api/listings?id=${id}`, { method: 'DELETE' })
    fetchListings()
  }

  const toggleFeature = (f: string) => {
    setSelectedFeatures(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    )
  }

  if (authLoading || !user) return null

  return (
    <>
      <Head><title>Listings - Portugal Outreach</title></Head>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link href="/portugal-outreach" className="text-gray-400 hover:text-white text-sm mb-1 block">&larr; Dashboard</Link>
              <h1 className="text-2xl font-bold">Property Listings</h1>
              <p className="text-sm text-gray-400 mt-1">Your inventory — matched against client search criteria</p>
            </div>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={csvImporting}
                className="border-zinc-700 text-white hover:bg-zinc-800">
                {csvImporting ? 'Importing...' : 'Import CSV'}
              </Button>
              <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-black hover:bg-gray-200">+ Add Listing</Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add Property Listing</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Title *</Label>
                      <Input className="bg-zinc-800 border-zinc-700" value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="3 bed villa with pool in Algarve" />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={form.property_type} onValueChange={v => setForm(f => ({ ...f, property_type: v }))}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
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
                    <div>
                      <Label>Price (EUR)</Label>
                      <Input className="bg-zinc-800 border-zinc-700" type="number" value={form.price}
                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Total Area (m2)</Label>
                      <Input className="bg-zinc-800 border-zinc-700" type="number" value={form.area_total_m2}
                        onChange={e => setForm(f => ({ ...f, area_total_m2: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Bedrooms</Label>
                      <Input className="bg-zinc-800 border-zinc-700" type="number" value={form.num_bedrooms}
                        onChange={e => setForm(f => ({ ...f, num_bedrooms: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Condition</Label>
                      <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Features</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {FEATURES.map(f => (
                          <button key={f} onClick={() => toggleFeature(f)}
                            className={`px-3 py-1 rounded-full text-xs border transition-all ${
                              selectedFeatures.includes(f) ? 'bg-white text-black border-white' : 'border-zinc-700 hover:border-zinc-500'
                            }`}>
                            {f.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label>Thumbnail URL</Label>
                      <Input className="bg-zinc-800 border-zinc-700" value={form.thumbnail_url}
                        onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} placeholder="https://..." />
                    </div>
                    <div className="col-span-2">
                      <Label>Description</Label>
                      <Textarea className="bg-zinc-800 border-zinc-700" value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                  </div>
                  <Button onClick={handleAdd} className="w-full mt-4 bg-white text-black hover:bg-gray-200">Save Listing</Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* CSV hint */}
          <Card className="bg-zinc-900 border-zinc-800 mb-4">
            <CardContent className="py-3">
              <p className="text-xs text-gray-500">
                <strong>CSV columns:</strong> title, property_type, district, municipality, price, area_total_m2, num_bedrooms, condition, features (semicolon-separated), thumbnail_url, description
              </p>
            </CardContent>
          </Card>

          {/* Listings */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : listings.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No listings yet. Add properties that you want to match with client leads.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left p-3 text-gray-400 text-sm">Property</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Location</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Price</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Specs</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Status</th>
                        <th className="text-right p-3 text-gray-400 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map(l => (
                        <tr key={l.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {l.thumbnail_url && (
                                <img src={l.thumbnail_url} alt="" className="w-12 h-12 rounded object-cover" />
                              )}
                              <div>
                                <div className="font-medium text-sm">{l.title}</div>
                                <Badge variant="outline" className="capitalize text-[10px]">{l.property_type}</Badge>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-sm text-gray-400">
                            {[l.municipality, l.district].filter(Boolean).join(', ') || '-'}
                          </td>
                          <td className="p-3 text-sm">
                            {l.price ? `${Number(l.price).toLocaleString()} EUR` : '-'}
                          </td>
                          <td className="p-3 text-sm text-gray-400">
                            {[
                              l.area_total_m2 ? `${l.area_total_m2.toLocaleString()}m2` : '',
                              l.num_bedrooms ? `${l.num_bedrooms} bed` : '',
                            ].filter(Boolean).join(' / ') || '-'}
                          </td>
                          <td className="p-3">
                            <Badge className={l.status === 'available' ? 'bg-green-600' : 'bg-gray-600'}>
                              {l.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(l.id)}
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
