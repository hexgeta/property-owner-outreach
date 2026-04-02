import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useAuth } from '@/lib/AuthContext'
import { useAuthFetch } from '@/lib/useAuthFetch'

const DISTRICTS = [
  'Aveiro', 'Beja', 'Braga', 'Braganca', 'Castelo Branco', 'Coimbra',
  'Evora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre',
  'Porto', 'Santarem', 'Setubal', 'Viana do Castelo', 'Vila Real', 'Viseu'
]

const DEFAULT_STEPS = [
  {
    question: 'Que tipo de propriedade procura?',
    field_key: 'property_types',
    field_type: 'multi_select',
    options: [
      { value: 'villa', label: 'Moradia', icon: '🏠' },
      { value: 'land', label: 'Terreno', icon: '🌿' },
      { value: 'farm', label: 'Quinta', icon: '🌾' },
      { value: 'ruin', label: 'Ruina / Para renovar', icon: '🏚️' },
    ],
    is_required: true,
  },
  {
    question: 'Em que zona de Portugal?',
    description: 'Selecione um ou mais distritos',
    field_key: 'districts',
    field_type: 'multi_select',
    options: DISTRICTS.map(d => ({ value: d, label: d })),
    is_required: true,
  },
  {
    question: 'Qual e o seu orcamento?',
    description: 'Indique o intervalo de valores em EUR',
    field_key: 'budget',
    field_type: 'range',
    step_unit: 'EUR',
    min_value: 0,
    max_value: 5000000,
    is_required: false,
  },
  {
    question: 'Qual a area minima que procura?',
    field_key: 'area',
    field_type: 'range',
    step_unit: 'm²',
    min_value: 0,
    max_value: 100000,
    is_required: false,
  },
  {
    question: 'Quantos quartos precisa?',
    field_key: 'num_bedrooms_min',
    field_type: 'select',
    options: [
      { value: '1', label: '1+', icon: '🛏️' },
      { value: '2', label: '2+', icon: '🛏️' },
      { value: '3', label: '3+', icon: '🛏️' },
      { value: '4', label: '4+', icon: '🛏️' },
      { value: '5', label: '5+', icon: '🛏️' },
    ],
    is_required: false,
  },
  {
    question: 'Que caracteristicas sao importantes?',
    field_key: 'features',
    field_type: 'multi_select',
    options: [
      { value: 'pool', label: 'Piscina', icon: '🏊' },
      { value: 'garden', label: 'Jardim', icon: '🌳' },
      { value: 'sea_view', label: 'Vista mar', icon: '🌊' },
      { value: 'garage', label: 'Garagem', icon: '🚗' },
      { value: 'terrace', label: 'Terraco', icon: '☀️' },
      { value: 'fireplace', label: 'Lareira', icon: '🔥' },
    ],
    is_required: false,
  },
  {
    question: 'Quando pretende comprar?',
    field_key: 'timeline',
    field_type: 'select',
    options: [
      { value: 'asap', label: 'O mais breve possivel', icon: '⚡' },
      { value: '3_months', label: 'Proximo 3 meses', icon: '📅' },
      { value: '6_months', label: 'Proximo 6 meses', icon: '📆' },
      { value: '1_year', label: 'Proximo ano', icon: '🗓️' },
      { value: 'just_looking', label: 'Apenas a explorar', icon: '👀' },
    ],
    is_required: false,
  },
]

interface Quiz {
  id: string
  name: string
  slug: string
  is_active: boolean
  welcome_title: string
  quiz_steps: any[]
  created_at: string
}

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  telegram_username: string
  property_types: string[]
  districts: string[]
  min_budget: number
  max_budget: number
  status: string
  matches_sent: number
  created_at: string
}

const leadStatusColors: Record<string, string> = {
  new: 'bg-slate-600',
  contacted: 'bg-blue-600',
  active: 'bg-blue-400',
  viewing: 'bg-yellow-600',
  offer: 'bg-green-600',
  closed: 'bg-emerald-500',
  lost: 'bg-red-600',
}

export default function FunnelPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const authFetch = useAuthFetch()

  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newQuiz, setNewQuiz] = useState({ name: 'Property Search', slug: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.push('/portugal-outreach/login')
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    Promise.all([
      authFetch('/api/quiz-config').then(r => r.json()),
      authFetch('/api/leads').then(r => r.json()),
    ]).then(([q, l]) => {
      setQuizzes(Array.isArray(q) ? q : [])
      setLeads(l.data || [])
    }).finally(() => setLoading(false))
  }, [user])

  const handleCreateQuiz = async () => {
    if (!newQuiz.name || !newQuiz.slug) return
    setCreating(true)

    const res = await authFetch('/api/quiz-config', {
      method: 'POST',
      body: JSON.stringify({
        name: newQuiz.name,
        slug: newQuiz.slug,
        steps: DEFAULT_STEPS,
      }),
    })

    if (res.ok) {
      setShowCreate(false)
      setNewQuiz({ name: 'Property Search', slug: '' })
      // Refresh
      const q = await authFetch('/api/quiz-config').then(r => r.json())
      setQuizzes(Array.isArray(q) ? q : [])
    }
    setCreating(false)
  }

  const handleDeleteQuiz = async (id: string) => {
    await authFetch(`/api/quiz-config?id=${id}`, { method: 'DELETE' })
    setQuizzes(prev => prev.filter(q => q.id !== id))
  }

  const handleLeadStatus = async (id: string, status: string) => {
    await authFetch(`/api/leads?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  const handleRematch = async (leadId: string) => {
    await authFetch('/api/match-properties', {
      method: 'POST',
      body: JSON.stringify({ lead_id: leadId, user_id: user?.id }),
    })
    // Refresh leads
    const l = await authFetch('/api/leads').then(r => r.json())
    setLeads(l.data || [])
  }

  if (authLoading || !user) return null

  return (
    <>
      <Head><title>Onboarding Funnel - Portugal Outreach</title></Head>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link href="/portugal-outreach" className="text-gray-400 hover:text-white text-sm mb-1 block">&larr; Dashboard</Link>
              <h1 className="text-2xl font-bold">Client Onboarding Funnel</h1>
              <p className="text-sm text-gray-400 mt-1">Customisable quiz for iPad / mobile self-service</p>
            </div>
          </div>

          <Tabs defaultValue="quizzes" className="space-y-4">
            <TabsList className="bg-zinc-900">
              <TabsTrigger value="quizzes">Quiz Config ({quizzes.length})</TabsTrigger>
              <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
            </TabsList>

            {/* ── QUIZZES TAB ── */}
            <TabsContent value="quizzes">
              <div className="flex justify-end mb-4">
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                  <DialogTrigger asChild>
                    <Button className="bg-white text-black hover:bg-gray-200">+ Create Quiz</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader><DialogTitle>Create Quiz Funnel</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Quiz Name</Label>
                        <Input className="bg-zinc-800 border-zinc-700" value={newQuiz.name}
                          onChange={e => setNewQuiz(q => ({ ...q, name: e.target.value }))} />
                      </div>
                      <div>
                        <Label>URL Slug</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">/quiz/</span>
                          <Input className="bg-zinc-800 border-zinc-700" value={newQuiz.slug}
                            onChange={e => setNewQuiz(q => ({ ...q, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                            placeholder="my-agency" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Creates a quiz with 7 default steps (property type, location, budget, area, bedrooms, features, timeline).
                        You can customise these after creation.
                      </p>
                      <Button onClick={handleCreateQuiz} disabled={creating || !newQuiz.slug}
                        className="w-full bg-white text-black hover:bg-gray-200">
                        {creating ? 'Creating...' : 'Create with Default Steps'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {loading ? (
                <div className="text-center text-gray-400 py-8">Loading...</div>
              ) : quizzes.length === 0 ? (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-8 text-center text-gray-400">
                    No quizzes yet. Create one to start capturing leads.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {quizzes.map(quiz => (
                    <Card key={quiz.id} className="bg-zinc-900 border-zinc-800">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-bold text-white">{quiz.name}</h3>
                              <Badge className={quiz.is_active ? 'bg-green-600' : 'bg-gray-600'}>
                                {quiz.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                              /quiz/{quiz.slug} — {quiz.quiz_steps?.length || 0} steps
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/quiz/${quiz.slug}`} target="_blank">
                              <Button variant="outline" size="sm" className="border-zinc-700 text-white hover:bg-zinc-800">
                                Preview
                              </Button>
                            </Link>
                            <Button variant="outline" size="sm" className="border-zinc-700 text-white hover:bg-zinc-800"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/quiz/${quiz.slug}`)
                              }}>
                              Copy Link
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteQuiz(quiz.id)}
                              className="text-red-400 hover:text-red-300 text-xs">
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── LEADS TAB ── */}
            <TabsContent value="leads">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-0">
                  {leads.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      No leads yet. Share your quiz link to start capturing clients.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="text-left p-3 text-gray-400 text-sm">Client</th>
                            <th className="text-left p-3 text-gray-400 text-sm">Looking For</th>
                            <th className="text-left p-3 text-gray-400 text-sm">Budget</th>
                            <th className="text-left p-3 text-gray-400 text-sm">Telegram</th>
                            <th className="text-left p-3 text-gray-400 text-sm">Status</th>
                            <th className="text-left p-3 text-gray-400 text-sm">Matches</th>
                            <th className="text-right p-3 text-gray-400 text-sm">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leads.map(lead => (
                            <tr key={lead.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                              <td className="p-3">
                                <div className="font-medium text-sm">{lead.name}</div>
                                {lead.email && <div className="text-xs text-gray-500">{lead.email}</div>}
                                {lead.phone && <div className="text-xs text-gray-500">{lead.phone}</div>}
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {lead.property_types?.map(t => (
                                    <Badge key={t} variant="outline" className="text-[10px] capitalize">{t}</Badge>
                                  ))}
                                </div>
                                {lead.districts?.length > 0 && (
                                  <div className="text-xs text-gray-500 mt-1">{lead.districts.join(', ')}</div>
                                )}
                              </td>
                              <td className="p-3 text-sm">
                                {lead.min_budget || lead.max_budget ? (
                                  <span>
                                    {lead.min_budget ? `${Number(lead.min_budget).toLocaleString()}` : '0'}
                                    {' - '}
                                    {lead.max_budget ? `${Number(lead.max_budget).toLocaleString()} EUR` : '∞'}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="p-3 text-sm">
                                {lead.telegram_username ? (
                                  <span className="text-blue-400">@{lead.telegram_username.replace('@', '')}</span>
                                ) : '-'}
                              </td>
                              <td className="p-3">
                                <Select value={lead.status} onValueChange={v => handleLeadStatus(lead.id, v)}>
                                  <SelectTrigger className="h-7 text-xs bg-transparent border-none p-0">
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs text-white ${leadStatusColors[lead.status] || 'bg-gray-600'}`}>
                                      {lead.status}
                                    </span>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {['new', 'contacted', 'active', 'viewing', 'offer', 'closed', 'lost'].map(s => (
                                      <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-3 text-sm text-gray-400">{lead.matches_sent || 0} sent</td>
                              <td className="p-3 text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleRematch(lead.id)}
                                  className="text-blue-400 hover:text-blue-300 text-xs">
                                  Re-match
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
