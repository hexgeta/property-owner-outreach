import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useAuth } from '@/lib/AuthContext'
import { useAuthFetch } from '@/lib/useAuthFetch'

interface Template {
  id: string
  name: string
  subject: string
  body_html: string
  body_text: string
  property_type: string
  is_follow_up: boolean
}

interface SentEmail {
  id: string
  to_email: string
  subject: string
  status: string
  sent_at: string
  error_message: string
  contact_id: string
}

interface SelectedContact {
  id: string
  name: string
  email: string
  district: string
  property_type: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-600',
  sent: 'bg-blue-600',
  delivered: 'bg-blue-500',
  opened: 'bg-green-600',
  replied: 'bg-green-500',
  bounced: 'bg-red-600',
  failed: 'bg-red-700',
}

export default function OutreachPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const authFetch = useAuthFetch()
  const { ids, email, name, district } = router.query

  const [templates, setTemplates] = useState<Template[]>([])
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.push('/portugal-outreach/login')
  }, [user, authLoading])
  const [sendResult, setSendResult] = useState<{ sent?: number; failed?: number; error?: string } | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedContacts, setSelectedContacts] = useState<SelectedContact[]>([])

  // Sender config (stored in localStorage)
  const [sender, setSender] = useState({ sender_name: '', sender_phone: '' })

  // Email form
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')

  // Load sender settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pt-outreach-sender')
    if (saved) setSender(JSON.parse(saved))
  }, [])

  const saveSender = (s: typeof sender) => {
    setSender(s)
    localStorage.setItem('pt-outreach-sender', JSON.stringify(s))
  }

  // Load contacts from URL params
  useEffect(() => {
    if (!ids) return
    const idList = (ids as string).split(',')

    if (idList.length === 1 && email && name) {
      // Single contact from URL
      setSelectedContacts([{
        id: idList[0],
        name: name as string,
        email: email as string,
        district: (district as string) || '',
        property_type: '',
      }])
    } else {
      // Bulk: fetch contact details
      authFetch(`/api/contacts?limit=200`)
        .then(r => r.json())
        .then(json => {
          const all = json.data || []
          setSelectedContacts(
            all.filter((c: any) => idList.includes(c.id)).map((c: any) => ({
              id: c.id, name: c.name, email: c.email, district: c.district || '', property_type: c.property_type || '',
            }))
          )
        })
    }
  }, [ids, email, name, district])

  // Load templates from DB (fallback to hardcoded)
  useEffect(() => {
    authFetch('/api/email-templates')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setTemplates(data)
        else setTemplates(FALLBACK_TEMPLATES)
      })
      .catch(() => setTemplates(FALLBACK_TEMPLATES))
  }, [])

  // Load sent emails
  useEffect(() => {
    authFetch('/api/sent-emails?limit=100')
      .then(r => r.json())
      .then(json => setSentEmails(json.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const applyTemplate = (template: Template) => {
    setSelectedTemplate(template.id)

    const firstContact = selectedContacts[0]
    const replacements: Record<string, string> = {
      '{name}': firstContact?.name || '[Nome]',
      '{district}': firstContact?.district || '[Distrito]',
      '{sender_name}': sender.sender_name || '[Seu Nome]',
      '{sender_phone}': sender.sender_phone || '[Seu Telefone]',
    }

    let s = template.subject
    let bt = template.body_text
    let bh = template.body_html

    Object.entries(replacements).forEach(([k, v]) => {
      s = s.replaceAll(k, v)
      bt = bt.replaceAll(k, v)
      bh = bh.replaceAll(k, v)
    })

    setSubject(s)
    setBodyText(bt)
    setBodyHtml(bh)
  }

  const handleSend = async () => {
    if (!selectedContacts.length || !subject) return
    setSending(true)
    setSendResult(null)

    // For each contact, personalize and send
    const contactIds = selectedContacts.map(c => c.id)

    // If single contact, send directly with personalized content
    // If bulk, send with the template as-is (personalization per contact happens server-side in future)
    const res = await authFetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_ids: contactIds,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
      }),
    })

    const json = await res.json()
    if (res.ok) {
      setSendResult({ sent: json.sent, failed: json.failed })
      // Refresh sent emails list
      authFetch('/api/sent-emails?limit=100')
        .then(r => r.json())
        .then(j => setSentEmails(j.data || []))
        .catch(() => {})
    } else {
      setSendResult({ error: json.error })
    }
    setSending(false)
  }

  const removeContact = (id: string) => {
    setSelectedContacts(prev => prev.filter(c => c.id !== id))
  }

  if (authLoading || !user) return null

  return (
    <>
      <Head><title>Send Emails - Portugal Outreach</title></Head>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Link href="/portugal-outreach" className="text-gray-400 hover:text-white text-sm mb-1 block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-bold">Email Outreach</h1>
          </div>

          <Tabs defaultValue="compose" className="space-y-4">
            <TabsList className="bg-zinc-900">
              <TabsTrigger value="compose">Compose</TabsTrigger>
              <TabsTrigger value="sent">Sent ({sentEmails.length})</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* ── COMPOSE ── */}
            <TabsContent value="compose">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Templates + Recipients */}
                <div className="space-y-4">
                  {/* Templates */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-sm">Email Templates</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {templates.map(t => (
                        <Button
                          key={t.id || t.name}
                          variant={selectedTemplate === (t.id || t.name) ? 'default' : 'outline'}
                          className={`w-full justify-start text-left text-xs h-auto py-2 ${
                            selectedTemplate === (t.id || t.name)
                              ? 'bg-white text-black'
                              : 'border-zinc-700 text-white hover:bg-zinc-800'
                          }`}
                          onClick={() => applyTemplate(t)}
                        >
                          <div>
                            <div className="font-medium">{t.name}</div>
                            {t.is_follow_up && <span className="text-[10px] opacity-60">follow-up</span>}
                          </div>
                        </Button>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Recipients */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-sm">
                        Recipients ({selectedContacts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedContacts.length === 0 ? (
                        <div className="text-xs text-gray-500">
                          No contacts selected.{' '}
                          <Link href="/portugal-outreach/contacts" className="text-blue-400 hover:underline">
                            Select from contacts
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {selectedContacts.map(c => (
                            <div key={c.id} className="flex items-center justify-between text-xs p-1.5 bg-zinc-800 rounded">
                              <div>
                                <span className="font-medium">{c.name}</span>
                                <span className="text-gray-400 ml-2">{c.email}</span>
                              </div>
                              <button onClick={() => removeContact(c.id)} className="text-gray-500 hover:text-red-400 ml-2">x</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right: Composer */}
                <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm">Compose</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs text-gray-400">Subject</Label>
                      <Input className="bg-zinc-800 border-zinc-700" value={subject}
                        onChange={e => setSubject(e.target.value)} placeholder="Interesse na sua propriedade" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Body</Label>
                      <Textarea className="bg-zinc-800 border-zinc-700 min-h-[350px] font-mono text-sm"
                        value={bodyText} onChange={e => setBodyText(e.target.value)} />
                    </div>

                    {sendResult && (
                      <div className={`p-3 rounded text-sm ${
                        sendResult.error ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'
                      }`}>
                        {sendResult.error
                          ? `Error: ${sendResult.error}`
                          : `Sent: ${sendResult.sent} | Failed: ${sendResult.failed}`}
                      </div>
                    )}

                    <Button
                      onClick={handleSend}
                      disabled={sending || !selectedContacts.length || !subject}
                      className="w-full bg-white text-black hover:bg-gray-200"
                    >
                      {sending
                        ? 'Sending...'
                        : `Send to ${selectedContacts.length} contact${selectedContacts.length === 1 ? '' : 's'}`}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── SENT ── */}
            <TabsContent value="sent">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                  ) : sentEmails.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No emails sent yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="text-left p-3 text-gray-400 text-sm">To</th>
                            <th className="text-left p-3 text-gray-400 text-sm">Subject</th>
                            <th className="text-left p-3 text-gray-400 text-sm">Status</th>
                            <th className="text-left p-3 text-gray-400 text-sm">Sent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sentEmails.map(e => (
                            <tr key={e.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                              <td className="p-3 text-sm">{e.to_email}</td>
                              <td className="p-3 text-sm">{e.subject}</td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs ${statusColors[e.status] || 'bg-gray-600'}`}>
                                  {e.status}
                                </span>
                                {e.error_message && <div className="text-xs text-red-400 mt-1">{e.error_message}</div>}
                              </td>
                              <td className="p-3 text-sm text-gray-400">
                                {e.sent_at ? new Date(e.sent_at).toLocaleDateString('pt-PT') : '-'}
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

            {/* ── SETTINGS ── */}
            <TabsContent value="settings">
              <Card className="bg-zinc-900 border-zinc-800 max-w-lg">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Sender Info</CardTitle>
                  <CardDescription className="text-gray-400">Used to fill in email templates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Your Name</Label>
                    <Input className="bg-zinc-800 border-zinc-700" value={sender.sender_name}
                      onChange={e => saveSender({ ...sender, sender_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Your Phone</Label>
                    <Input className="bg-zinc-800 border-zinc-700" value={sender.sender_phone}
                      onChange={e => saveSender({ ...sender, sender_phone: e.target.value })} placeholder="+351..." />
                  </div>

                  <div className="p-3 bg-zinc-800 rounded text-sm text-gray-400">
                    <strong>SMTP Setup</strong> — add to <code>.env.local</code>:
                    <pre className="mt-2 text-xs text-gray-500">
{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your@gmail.com`}
                    </pre>
                  </div>

                  <div className="p-3 bg-zinc-800 rounded text-sm text-gray-400">
                    <strong>GDPR Note</strong> — Every template includes an opt-out footer.
                    Mark contacts as &quot;opted_out&quot; when they reply with REMOVER. The system
                    will automatically skip opted-out contacts when sending.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}

// Fallback templates if DB is empty
const FALLBACK_TEMPLATES: Template[] = [
  {
    id: 'villa',
    name: 'Villa - First Contact',
    subject: 'Interesse na sua moradia em {district}',
    property_type: 'villa',
    is_follow_up: false,
    body_text: `Exmo(a). Sr(a). {name},

O meu nome e {sender_name} e estou a contacta-lo(a) porque tenho interesse em adquirir moradias na zona de {district}.

Gostaria de saber se teria interesse em considerar uma proposta de compra para a sua propriedade. Ofereco um valor justo de mercado e um processo rapido e sem complicacoes.

Se tiver interesse, por favor responda a este email ou ligue para {sender_phone}.

Com os melhores cumprimentos,
{sender_name}
{sender_phone}

---
Para deixar de receber estas mensagens, responda com "REMOVER" no assunto.`,
    body_html: '',
  },
  {
    id: 'land',
    name: 'Land - First Contact',
    subject: 'Interesse no seu terreno em {district}',
    property_type: 'land',
    is_follow_up: false,
    body_text: `Exmo(a). Sr(a). {name},

Contacto-o(a) porque estou interessado(a) na aquisicao de terrenos na zona de {district}.

Identifiquei que possui um terreno nesta regiao e gostaria de saber se estaria disposto(a) a vende-lo. Ofereco condicoes competitivas e trato de toda a burocracia.

Caso tenha interesse, agradeco que me contacte.

Cumprimentos,
{sender_name}
{sender_phone}

---
Para deixar de receber estas mensagens, responda com "REMOVER".`,
    body_html: '',
  },
  {
    id: 'follow-up',
    name: 'Follow-up',
    subject: 'Re: Interesse na sua propriedade em {district}',
    property_type: '',
    is_follow_up: true,
    body_text: `Exmo(a). Sr(a). {name},

Enviei-lhe uma mensagem ha alguns dias sobre a sua propriedade em {district} e gostaria de saber se teve oportunidade de considerar.

Compreendo que e uma decisao importante. Estou disponivel para esclarecer qualquer duvida — podemos marcar uma chamada ou reuniao presencial.

Aguardo a sua resposta.

Cumprimentos,
{sender_name}
{sender_phone}

---
Para deixar de receber estas mensagens, responda com "REMOVER".`,
    body_html: '',
  },
  {
    id: 'farm',
    name: 'Farm/Quinta - First Contact',
    subject: 'Interesse na sua quinta em {district}',
    property_type: 'farm',
    is_follow_up: false,
    body_text: `Exmo(a). Sr(a). {name},

Estou a contacta-lo(a) porque procuro quintas na regiao de {district} e soube que possui uma propriedade nesta zona.

Teria interesse em conversar sobre uma possivel venda? Garanto um processo simples e um valor justo.

Fico a aguardar o seu contacto.

Cumprimentos,
{sender_name}
{sender_phone}

---
Para deixar de receber estas mensagens, responda com "REMOVER".`,
    body_html: '',
  },
]
