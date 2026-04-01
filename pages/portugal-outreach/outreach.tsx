import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

// Portuguese email templates for property acquisition outreach
const EMAIL_TEMPLATES = {
  villa_initial: {
    name: 'Villa - Initial Contact (PT)',
    subject: 'Interesse na sua propriedade',
    body_text: `Exmo(a). Senhor(a) {owner_name},

Espero que esta mensagem o(a) encontre bem.

O meu nome e {sender_name} e estou a contacta-lo(a) porque tenho interesse em adquirir propriedades na zona de {district}, Portugal.

Atraves dos registos publicos, identifiquei que e proprietario(a) de um imovel nesta regiao, e gostaria de saber se teria interesse em considerar uma proposta de compra.

Estou preparado(a) para oferecer um valor justo de mercado e posso garantir um processo de compra rapido e sem complicacoes.

Se tiver interesse em discutir esta possibilidade, por favor nao hesite em responder a este email ou contactar-me pelo telefone {sender_phone}.

Com os melhores cumprimentos,
{sender_name}
{sender_email}
{sender_phone}

---
Se nao deseja receber mais comunicacoes, por favor responda com "REMOVER" no assunto.`,
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <p>Exmo(a). Senhor(a) <strong>{owner_name}</strong>,</p>

  <p>Espero que esta mensagem o(a) encontre bem.</p>

  <p>O meu nome e <strong>{sender_name}</strong> e estou a contacta-lo(a) porque tenho interesse em adquirir propriedades na zona de <strong>{district}</strong>, Portugal.</p>

  <p>Atraves dos registos publicos, identifiquei que e proprietario(a) de um imovel nesta regiao, e gostaria de saber se teria interesse em considerar uma proposta de compra.</p>

  <p>Estou preparado(a) para oferecer um <strong>valor justo de mercado</strong> e posso garantir um processo de compra rapido e sem complicacoes.</p>

  <p>Se tiver interesse em discutir esta possibilidade, por favor nao hesite em responder a este email ou contactar-me pelo telefone <strong>{sender_phone}</strong>.</p>

  <p>Com os melhores cumprimentos,<br/>
  <strong>{sender_name}</strong><br/>
  {sender_email}<br/>
  {sender_phone}</p>

  <hr style="margin-top: 30px; border: none; border-top: 1px solid #ccc;" />
  <p style="font-size: 11px; color: #999;">Se nao deseja receber mais comunicacoes, por favor responda com "REMOVER" no assunto.</p>
</div>`,
  },
  land_initial: {
    name: 'Land - Initial Contact (PT)',
    subject: 'Interesse no seu terreno',
    body_text: `Exmo(a). Senhor(a) {owner_name},

Contacto-o(a) porque estou interessado(a) na aquisicao de terrenos na zona de {district}.

Identifiquei que possui um terreno nesta regiao e gostaria de saber se estaria disposto(a) a vende-lo.

Ofereco condicoes competitivas e um processo transparente. Trato de toda a burocracia necessaria.

Caso tenha interesse, agradeco que me contacte para podermos conversar.

Cumprimentos,
{sender_name}
{sender_email}
{sender_phone}

---
Para deixar de receber estas mensagens, responda com "REMOVER".`,
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <p>Exmo(a). Senhor(a) <strong>{owner_name}</strong>,</p>

  <p>Contacto-o(a) porque estou interessado(a) na aquisicao de terrenos na zona de <strong>{district}</strong>.</p>

  <p>Identifiquei que possui um terreno nesta regiao e gostaria de saber se estaria disposto(a) a vende-lo.</p>

  <p>Ofereco <strong>condicoes competitivas</strong> e um processo transparente. Trato de toda a burocracia necessaria.</p>

  <p>Caso tenha interesse, agradeco que me contacte para podermos conversar.</p>

  <p>Cumprimentos,<br/>
  <strong>{sender_name}</strong><br/>
  {sender_email}<br/>
  {sender_phone}</p>

  <hr style="margin-top: 30px; border: none; border-top: 1px solid #ccc;" />
  <p style="font-size: 11px; color: #999;">Para deixar de receber estas mensagens, responda com "REMOVER".</p>
</div>`,
  },
  follow_up: {
    name: 'Follow-up (PT)',
    subject: 'Re: Interesse na sua propriedade',
    body_text: `Exmo(a). Senhor(a) {owner_name},

Enviei-lhe uma mensagem ha alguns dias sobre o meu interesse na sua propriedade em {district} e gostaria de saber se teve oportunidade de considerar a minha proposta.

Compreendo que esta e uma decisao importante e estou disponivel para responder a quaisquer questoes que possa ter.

Se preferir, podemos marcar uma chamada telefonica ou reuniao presencial para discutir os detalhes.

Aguardo a sua resposta.

Cumprimentos,
{sender_name}
{sender_phone}

---
Para deixar de receber estas mensagens, responda com "REMOVER".`,
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <p>Exmo(a). Senhor(a) <strong>{owner_name}</strong>,</p>

  <p>Enviei-lhe uma mensagem ha alguns dias sobre o meu interesse na sua propriedade em <strong>{district}</strong> e gostaria de saber se teve oportunidade de considerar a minha proposta.</p>

  <p>Compreendo que esta e uma decisao importante e estou disponivel para responder a quaisquer questoes que possa ter.</p>

  <p>Se preferir, podemos marcar uma chamada telefonica ou reuniao presencial para discutir os detalhes.</p>

  <p>Aguardo a sua resposta.</p>

  <p>Cumprimentos,<br/>
  <strong>{sender_name}</strong><br/>
  {sender_phone}</p>

  <hr style="margin-top: 30px; border: none; border-top: 1px solid #ccc;" />
  <p style="font-size: 11px; color: #999;">Para deixar de receber estas mensagens, responda com "REMOVER".</p>
</div>`,
  },
}

interface OutreachEmail {
  id: string
  to_email: string
  subject: string
  status: string
  sent_at: string
  created_at: string
  owners?: { name: string }
  properties?: { district: string; property_type: string }
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-600',
  sent: 'bg-blue-600',
  delivered: 'bg-blue-500',
  opened: 'bg-green-600',
  replied: 'bg-green-500',
  bounced: 'bg-red-600',
  failed: 'bg-red-700',
  opted_out: 'bg-yellow-600',
}

export default function OutreachPage() {
  const router = useRouter()
  const { owner_id, email: prefillEmail, name: prefillName } = router.query

  const [emails, setEmails] = useState<OutreachEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success?: boolean; error?: string } | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState('villa_initial')

  // Sender settings
  const [senderSettings, setSenderSettings] = useState({
    sender_name: '',
    sender_email: '',
    sender_phone: '',
  })

  // Email form
  const [emailForm, setEmailForm] = useState({
    to_email: '',
    owner_name: '',
    district: '',
    subject: '',
    body_text: '',
    body_html: '',
    owner_id: '',
    property_id: '',
  })

  useEffect(() => {
    if (prefillEmail) setEmailForm(f => ({ ...f, to_email: prefillEmail as string }))
    if (prefillName) setEmailForm(f => ({ ...f, owner_name: prefillName as string }))
    if (owner_id) setEmailForm(f => ({ ...f, owner_id: owner_id as string }))
  }, [prefillEmail, prefillName, owner_id])

  const fetchEmails = async () => {
    setLoading(true)
    const res = await fetch('/api/outreach')
    const json = await res.json()
    setEmails(json.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchEmails() }, [])

  const applyTemplate = (templateKey: string) => {
    setSelectedTemplate(templateKey)
    const template = EMAIL_TEMPLATES[templateKey as keyof typeof EMAIL_TEMPLATES]
    if (!template) return

    const replacements: Record<string, string> = {
      '{owner_name}': emailForm.owner_name || '[Nome do Proprietario]',
      '{district}': emailForm.district || '[Distrito]',
      '{sender_name}': senderSettings.sender_name || '[O Seu Nome]',
      '{sender_email}': senderSettings.sender_email || '[O Seu Email]',
      '{sender_phone}': senderSettings.sender_phone || '[O Seu Telefone]',
    }

    let subject = template.subject
    let bodyText = template.body_text
    let bodyHtml = template.body_html

    Object.entries(replacements).forEach(([key, value]) => {
      subject = subject.replaceAll(key, value)
      bodyText = bodyText.replaceAll(key, value)
      bodyHtml = bodyHtml.replaceAll(key, value)
    })

    setEmailForm(f => ({ ...f, subject, body_text: bodyText, body_html: bodyHtml }))
  }

  const handleSend = async () => {
    setSending(true)
    setSendResult(null)

    const res = await fetch('/api/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_email: emailForm.to_email,
        subject: emailForm.subject,
        body_text: emailForm.body_text,
        body_html: emailForm.body_html,
        owner_id: emailForm.owner_id || undefined,
        property_id: emailForm.property_id || undefined,
      }),
    })

    const json = await res.json()
    if (res.ok) {
      setSendResult({ success: true })
      fetchEmails()
    } else {
      setSendResult({ error: json.error || 'Failed to send' })
    }
    setSending(false)
  }

  return (
    <>
      <Head><title>Email Outreach - Portugal Outreach</title></Head>
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link href="/portugal-outreach" className="text-gray-400 hover:text-white text-sm mb-1 block">
              &larr; Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Email Outreach</h1>
          </div>

          <Tabs defaultValue="compose" className="space-y-4">
            <TabsList className="bg-zinc-900">
              <TabsTrigger value="compose">Compose</TabsTrigger>
              <TabsTrigger value="sent">Sent Emails ({emails.length})</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Compose Tab */}
            <TabsContent value="compose">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Template Selection */}
                <Card className="bg-zinc-900 border-zinc-800 lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Templates</CardTitle>
                    <CardDescription className="text-gray-400">Portuguese email templates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
                      <Button
                        key={key}
                        variant={selectedTemplate === key ? 'default' : 'outline'}
                        className={`w-full justify-start text-left ${
                          selectedTemplate === key
                            ? 'bg-white text-black'
                            : 'border-zinc-700 text-white hover:bg-zinc-800'
                        }`}
                        onClick={() => applyTemplate(key)}
                      >
                        {template.name}
                      </Button>
                    ))}

                    <div className="pt-4 space-y-3">
                      <div>
                        <Label className="text-gray-400 text-xs">Owner Name</Label>
                        <Input
                          className="bg-zinc-800 border-zinc-700"
                          value={emailForm.owner_name}
                          onChange={e => setEmailForm(f => ({ ...f, owner_name: e.target.value }))}
                          placeholder="Nome do proprietario"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400 text-xs">District</Label>
                        <Input
                          className="bg-zinc-800 border-zinc-700"
                          value={emailForm.district}
                          onChange={e => setEmailForm(f => ({ ...f, district: e.target.value }))}
                          placeholder="e.g. Faro, Lisboa"
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="w-full border-zinc-700 text-white hover:bg-zinc-800"
                        onClick={() => applyTemplate(selectedTemplate)}
                      >
                        Refresh Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Email Composer */}
                <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Compose Email</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>To Email</Label>
                      <Input
                        className="bg-zinc-800 border-zinc-700"
                        type="email"
                        value={emailForm.to_email}
                        onChange={e => setEmailForm(f => ({ ...f, to_email: e.target.value }))}
                        placeholder="proprietario@email.com"
                      />
                    </div>
                    <div>
                      <Label>Subject</Label>
                      <Input
                        className="bg-zinc-800 border-zinc-700"
                        value={emailForm.subject}
                        onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Body (Plain Text)</Label>
                      <Textarea
                        className="bg-zinc-800 border-zinc-700 min-h-[300px] font-mono text-sm"
                        value={emailForm.body_text}
                        onChange={e => setEmailForm(f => ({ ...f, body_text: e.target.value }))}
                      />
                    </div>

                    {sendResult && (
                      <div className={`p-3 rounded ${sendResult.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                        {sendResult.success ? 'Email sent successfully!' : `Error: ${sendResult.error}`}
                      </div>
                    )}

                    <Button
                      onClick={handleSend}
                      disabled={sending || !emailForm.to_email || !emailForm.subject}
                      className="w-full bg-white text-black hover:bg-gray-200"
                    >
                      {sending ? 'Sending...' : 'Send Email'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Sent Emails Tab */}
            <TabsContent value="sent">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                  ) : emails.length === 0 ? (
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
                          {emails.map(e => (
                            <tr key={e.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                              <td className="p-3">
                                <div className="text-sm">{e.to_email}</div>
                                {e.owners?.name && <div className="text-xs text-gray-400">{e.owners.name}</div>}
                              </td>
                              <td className="p-3 text-sm">{e.subject}</td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-1 rounded text-xs ${statusColors[e.status] || 'bg-gray-600'}`}>
                                  {e.status}
                                </span>
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

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card className="bg-zinc-900 border-zinc-800 max-w-lg">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Sender Settings</CardTitle>
                  <CardDescription className="text-gray-400">Your contact info for email templates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Your Name</Label>
                    <Input
                      className="bg-zinc-800 border-zinc-700"
                      value={senderSettings.sender_name}
                      onChange={e => setSenderSettings(s => ({ ...s, sender_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Your Email</Label>
                    <Input
                      className="bg-zinc-800 border-zinc-700"
                      type="email"
                      value={senderSettings.sender_email}
                      onChange={e => setSenderSettings(s => ({ ...s, sender_email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Your Phone</Label>
                    <Input
                      className="bg-zinc-800 border-zinc-700"
                      value={senderSettings.sender_phone}
                      onChange={e => setSenderSettings(s => ({ ...s, sender_phone: e.target.value }))}
                      placeholder="+351..."
                    />
                  </div>
                  <div className="p-3 bg-zinc-800 rounded text-sm text-gray-400">
                    <strong>SMTP Setup:</strong> Configure these environment variables in your <code>.env.local</code>:
                    <pre className="mt-2 text-xs">
{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com`}
                    </pre>
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
