import React, { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const PORTUGAL_DISTRICTS = [
  'Aveiro', 'Beja', 'Braga', 'Braganca', 'Castelo Branco', 'Coimbra',
  'Evora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre',
  'Porto', 'Santarem', 'Setubal', 'Viana do Castelo', 'Vila Real', 'Viseu'
]

const PROPERTY_TYPES = ['villa', 'land', 'farm', 'ruin', 'other']
const CONDITIONS = ['new', 'good', 'needs_renovation', 'ruin', 'unknown']
const STATUSES = ['identified', 'owner_found', 'contacted', 'interested', 'not_interested', 'sold', 'archived']

interface Property {
  id: string
  property_type: string
  description: string
  district: string
  municipality: string
  parish: string
  address: string
  area_total_m2: number
  area_built_m2: number
  condition: string
  estimated_market_value: number
  status: string
  source: string
  created_at: string
  property_owners?: any[]
}

const statusColors: Record<string, string> = {
  identified: 'bg-slate-600',
  owner_found: 'bg-blue-600',
  contacted: 'bg-yellow-600',
  interested: 'bg-green-600',
  not_interested: 'bg-red-600',
  sold: 'bg-purple-600',
  archived: 'bg-gray-700',
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ district: '', property_type: '', status: '' })
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newProperty, setNewProperty] = useState({
    property_type: 'villa',
    description: '',
    district: '',
    municipality: '',
    parish: '',
    address: '',
    area_total_m2: '',
    area_built_m2: '',
    condition: 'unknown',
    estimated_market_value: '',
    source: '',
    notes: '',
  })

  const fetchProperties = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.district) params.set('district', filters.district)
    if (filters.property_type) params.set('property_type', filters.property_type)
    if (filters.status) params.set('status', filters.status)

    const res = await fetch(`/api/properties?${params}`)
    const json = await res.json()
    setProperties(json.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchProperties() }, [filters])

  const handleAddProperty = async () => {
    const body: any = { ...newProperty }
    if (body.area_total_m2) body.area_total_m2 = parseFloat(body.area_total_m2)
    else delete body.area_total_m2
    if (body.area_built_m2) body.area_built_m2 = parseFloat(body.area_built_m2)
    else delete body.area_built_m2
    if (body.estimated_market_value) body.estimated_market_value = parseFloat(body.estimated_market_value)
    else delete body.estimated_market_value

    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setShowAddDialog(false)
      setNewProperty({
        property_type: 'villa', description: '', district: '', municipality: '',
        parish: '', address: '', area_total_m2: '', area_built_m2: '',
        condition: 'unknown', estimated_market_value: '', source: '', notes: '',
      })
      fetchProperties()
    }
  }

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvImporting(true)
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    const properties = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const obj: any = {}
      headers.forEach((header, i) => {
        if (values[i]) {
          if (['area_total_m2', 'area_built_m2', 'estimated_market_value', 'num_bedrooms', 'year_built'].includes(header)) {
            obj[header] = parseFloat(values[i])
          } else {
            obj[header] = values[i]
          }
        }
      })
      if (!obj.property_type) obj.property_type = 'villa'
      return obj
    }).filter(p => p.district || p.address)

    if (properties.length > 0) {
      await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(properties),
      })
      fetchProperties()
    }
    setCsvImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/properties?id=${id}`, { method: 'DELETE' })
    fetchProperties()
  }

  return (
    <>
      <Head><title>Properties - Portugal Outreach</title></Head>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link href="/portugal-outreach" className="text-gray-400 hover:text-white text-sm mb-1 block">
                &larr; Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold">Properties</h1>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvImport}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={csvImporting}
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                {csvImporting ? 'Importing...' : 'Import CSV'}
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-black hover:bg-gray-200">+ Add Property</Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Property</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select value={newProperty.property_type} onValueChange={v => setNewProperty(p => ({ ...p, property_type: v }))}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>District</Label>
                      <Select value={newProperty.district} onValueChange={v => setNewProperty(p => ({ ...p, district: v }))}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue placeholder="Select district" /></SelectTrigger>
                        <SelectContent>
                          {PORTUGAL_DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Municipality</Label>
                      <Input className="bg-zinc-800 border-zinc-700" value={newProperty.municipality}
                        onChange={e => setNewProperty(p => ({ ...p, municipality: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Parish (Freguesia)</Label>
                      <Input className="bg-zinc-800 border-zinc-700" value={newProperty.parish}
                        onChange={e => setNewProperty(p => ({ ...p, parish: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <Label>Address</Label>
                      <Input className="bg-zinc-800 border-zinc-700" value={newProperty.address}
                        onChange={e => setNewProperty(p => ({ ...p, address: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Total Area (m2)</Label>
                      <Input className="bg-zinc-800 border-zinc-700" type="number" value={newProperty.area_total_m2}
                        onChange={e => setNewProperty(p => ({ ...p, area_total_m2: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Built Area (m2)</Label>
                      <Input className="bg-zinc-800 border-zinc-700" type="number" value={newProperty.area_built_m2}
                        onChange={e => setNewProperty(p => ({ ...p, area_built_m2: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Condition</Label>
                      <Select value={newProperty.condition} onValueChange={v => setNewProperty(p => ({ ...p, condition: v }))}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Est. Market Value (EUR)</Label>
                      <Input className="bg-zinc-800 border-zinc-700" type="number" value={newProperty.estimated_market_value}
                        onChange={e => setNewProperty(p => ({ ...p, estimated_market_value: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <Label>Description</Label>
                      <Textarea className="bg-zinc-800 border-zinc-700" value={newProperty.description}
                        onChange={e => setNewProperty(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Source</Label>
                      <Input className="bg-zinc-800 border-zinc-700" placeholder="e.g. idealista, registry" value={newProperty.source}
                        onChange={e => setNewProperty(p => ({ ...p, source: e.target.value }))} />
                    </div>
                  </div>
                  <Button onClick={handleAddProperty} className="w-full mt-4 bg-white text-black hover:bg-gray-200">
                    Save Property
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-6">
            <Select value={filters.district} onValueChange={v => setFilters(f => ({ ...f, district: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {PORTUGAL_DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.property_type} onValueChange={v => setFilters(f => ({ ...f, property_type: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v === 'all' ? '' : v }))}>
              <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* CSV Template Info */}
          <Card className="bg-zinc-900 border-zinc-800 mb-6">
            <CardContent className="py-3">
              <p className="text-sm text-gray-400">
                <strong>CSV Format:</strong> property_type, district, municipality, parish, address, area_total_m2, area_built_m2, condition, estimated_market_value, source, description
              </p>
            </CardContent>
          </Card>

          {/* Properties Table */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : properties.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No properties found. Add some manually or import a CSV.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left p-3 text-gray-400 text-sm">Type</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Location</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Area</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Value</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Status</th>
                        <th className="text-left p-3 text-gray-400 text-sm">Source</th>
                        <th className="text-right p-3 text-gray-400 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {properties.map(p => (
                        <tr key={p.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                          <td className="p-3">
                            <Badge variant="outline" className="capitalize">{p.property_type}</Badge>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">{p.district}</div>
                            <div className="text-xs text-gray-400">{[p.municipality, p.parish].filter(Boolean).join(', ')}</div>
                            {p.address && <div className="text-xs text-gray-500">{p.address}</div>}
                          </td>
                          <td className="p-3 text-sm">
                            {p.area_total_m2 ? `${p.area_total_m2.toLocaleString()} m2` : '-'}
                            {p.area_built_m2 ? <div className="text-xs text-gray-400">{p.area_built_m2.toLocaleString()} m2 built</div> : null}
                          </td>
                          <td className="p-3 text-sm">
                            {p.estimated_market_value ? `${Number(p.estimated_market_value).toLocaleString()} EUR` : '-'}
                          </td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-1 rounded text-xs ${statusColors[p.status] || 'bg-gray-600'}`}>
                              {p.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-gray-400">{p.source || '-'}</td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(p.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
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
