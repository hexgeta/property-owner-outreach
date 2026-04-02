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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAuth } from '@/lib/AuthContext'
import { useAuthFetch } from '@/lib/useAuthFetch'

interface Sequence {
  id: string
  name: string
  is_active: boolean
  steps: { delay_days: number; subject: string; body_text: string }[]
  created_at: string
}

const DEFAULT_SEQUENCE = {
  name: 'Default Follow-up (3 steps)',
  steps: [
    {
      delay_days: 3,
      subject: 'Re: Interesse na sua propriedade em {district}',
      body_text: `Exmo(a). Sr(a). {name},

Enviei-lhe uma mensagem ha alguns dias sobre a sua propriedade em {district}. Gostaria de saber se teve oportunidade de considerar.

Estou disponivel para esclarecer qualquer duvida.

Cumprimentos,
{sender_name}

---
Para deixar de receber estas mensagens, responda com "REMOVER".`,
    },
    {
      delay_days: 7,
      subject: 'Ainda interessado na sua propriedade em {district}',
      body_text: `Exmo(a). Sr(a). {name},

Volto a contacta-lo(a) sobre a sua propriedade em {district}. Compreendo que e uma decisao importante e que pode precisar de mais tempo.

Se preferir, podemos marcar uma chamada rapida para discutir. Basta responder a este email com a sua disponibilidade.

Cumprimentos,
{sender_name}

---
Para deixar de receber estas mensagens, responda com "REMOVER".`,
    },
    {
      delay_days: 14,
      subject: 'Ultima mensagem - propriedade em {district}',
      body_text: `Exmo(a). Sr(a). {name},

Esta sera a minha ultima mensagem sobre a sua propriedade em {district}. Nao quero ser inconveniente.

Se no futuro tiver interesse em vender, o meu contacto e o seguinte. Terei todo o gosto em ajudar.

Desejo-lhe tudo de bom.

Cumprimentos,
{sender_name}

---
Para deixar de receber estas mensagens, responda com "REMOVER".`,
    },
  ],
}

export default function FollowUpsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const authFetch = useAuthFetch()

  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSteps, setNewSteps] = useState(DEFAULT_SEQUENCE.steps)
  const [enrollResult, setEnrollResult] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push('/portugal-outreach/login')
  }, [user, authLoading])

  const fetchSequences = async () => {
    if (!user) return
    const res = await authFetch('/api/follow-ups')
    const data = await res.json()
    setSequences(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchSequences() }, [user])

  const handleCreate = async () => {
    setCreating(true)
    const res = await authFetch('/api/follow-ups', {
      method: 'POST',
      body: JSON.stringify({ name: newName || DEFAULT_SEQUENCE.name, steps: newSteps }),
    })
    if (res.ok) {
      setShowCreate(false)
      setNewName('')
      setNewSteps(DEFAULT_SEQUENCE.steps)
      fetchSequences()
    }
    setCreating(false)
  }

  const handleCreateDefault = async () => {
    setCreating(true)
    await authFetch('/api/follow-ups', {
      method: 'POST',
      body: JSON.stringify(DEFAULT_SEQUENCE),
    })
    fetchSequences()
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    await authFetch(`/api/follow-ups?id=${id}`, { method: 'DELETE' })
    setSequences(prev => prev.filter(s => s.id !== id))
  }

  const handleToggle = async (id: string, active: boolean) => {
    await authFetch(`/api/follow-ups?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: !active }),
    })
    setSequences(prev => prev.map(s => s.id === id ? { ...s, is_active: !active } : s))
  }

  const updateStep = (idx: number, field: string, value: any) => {
    setNewSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const addStep = () => {
    setNewSteps(prev => [...prev, { delay_days: 7, subject: '', body_text: '' }])
  }

  const removeStep = (idx: number) => {
    setNewSteps(prev => prev.filter((_, i) => i !== idx))
  }

  if (authLoading || !user) return null

  return (
    <>
      <Head><title>Follow-up Sequences - Portugal Outreach</title></Head>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link href="/portugal-outreach" className="text-gray-400 hover:text-white text-sm mb-1 block">&larr; Dashboard</Link>
              <h1 className="text-2xl font-bold">Auto Follow-up Sequences</h1>
              <p className="text-sm text-gray-400 mt-1">Automatically send follow-up emails after X days if no reply</p>
            </div>
            <div className="flex gap-2">
              {sequences.length === 0 && (
                <Button variant="outline" onClick={handleCreateDefault} disabled={creating}
                  className="border-zinc-700 text-white hover:bg-zinc-800">
                  Create Default (3 steps)
                </Button>
              )}
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-black hover:bg-gray-200">+ Custom Sequence</Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Create Follow-up Sequence</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Sequence Name</Label>
                      <Input className="bg-zinc-800 border-zinc-700" value={newName}
                        onChange={e => setNewName(e.target.value)} placeholder="e.g. Villa Follow-up" />
                    </div>

                    <div className="space-y-4">
                      {newSteps.map((step, i) => (
                        <Card key={i} className="bg-zinc-800 border-zinc-700">
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-400">Step {i + 1}</span>
                              {newSteps.length > 1 && (
                                <Button variant="ghost" size="sm" onClick={() => removeStep(i)}
                                  className="text-red-400 text-xs">Remove</Button>
                              )}
                            </div>
                            <div>
                              <Label className="text-xs">Send after (days)</Label>
                              <Input className="bg-zinc-900 border-zinc-700 w-24" type="number" value={step.delay_days}
                                onChange={e => updateStep(i, 'delay_days', parseInt(e.target.value) || 1)} />
                            </div>
                            <div>
                              <Label className="text-xs">Subject</Label>
                              <Input className="bg-zinc-900 border-zinc-700" value={step.subject}
                                onChange={e => updateStep(i, 'subject', e.target.value)}
                                placeholder="Re: Interesse na sua propriedade em {district}" />
                            </div>
                            <div>
                              <Label className="text-xs">Body (use {'{name}'}, {'{district}'}, {'{sender_name}'})</Label>
                              <Textarea className="bg-zinc-900 border-zinc-700 min-h-[120px] font-mono text-xs"
                                value={step.body_text}
                                onChange={e => updateStep(i, 'body_text', e.target.value)} />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Button variant="outline" onClick={addStep} className="w-full border-zinc-700 text-white hover:bg-zinc-800">
                      + Add Step
                    </Button>

                    <Button onClick={handleCreate} disabled={creating || !newSteps.length}
                      className="w-full bg-white text-black hover:bg-gray-200">
                      {creating ? 'Creating...' : 'Create Sequence'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Info box */}
          <Card className="bg-zinc-900 border-zinc-800 mb-6">
            <CardContent className="py-3">
              <p className="text-xs text-gray-500">
                <strong>How it works:</strong> Select contacts on the Contacts page, then enroll them in a sequence.
                The system sends follow-up emails automatically based on the delays you configure.
                If a contact replies or opts out, the sequence stops for them.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                <strong>Cron setup:</strong> Add a cron job that calls <code>GET /api/process-follow-ups?secret=YOUR_CRON_SECRET</code> every hour.
              </p>
            </CardContent>
          </Card>

          {/* Sequences list */}
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : sequences.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="py-8 text-center text-gray-400">
                No sequences yet. Create one to automate your follow-ups.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sequences.map(seq => (
                <Card key={seq.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-white">{seq.name}</h3>
                        <Badge className={seq.is_active ? 'bg-green-600' : 'bg-gray-600'}>
                          {seq.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleToggle(seq.id, seq.is_active)}
                          className="border-zinc-700 text-white hover:bg-zinc-800 text-xs">
                          {seq.is_active ? 'Pause' : 'Activate'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(seq.id)}
                          className="text-red-400 text-xs">Delete</Button>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      {seq.steps.map((step: any, i: number) => (
                        <React.Fragment key={i}>
                          {i > 0 && (
                            <div className="text-xs text-gray-600">→ {step.delay_days}d →</div>
                          )}
                          <div className="px-3 py-2 bg-zinc-800 rounded text-xs">
                            <div className="font-medium text-gray-300">Step {i + 1}</div>
                            <div className="text-gray-500 truncate max-w-[200px]">{step.subject}</div>
                            {i === 0 && <div className="text-gray-600 text-[10px]">after {step.delay_days} days</div>}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
