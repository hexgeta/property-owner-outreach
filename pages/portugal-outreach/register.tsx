import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/AuthContext'

export default function RegisterPage() {
  const router = useRouter()
  const { signUp, user, loading: authLoading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!authLoading && user) router.push('/portugal-outreach')
  }, [user, authLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await signUp(email, password, fullName)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <>
      <Head><title>Register - Portugal Outreach</title></Head>
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Criar Conta</CardTitle>
            <CardDescription className="text-gray-400">14 dias gratis — sem cartao de credito</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-900/50 text-green-300 rounded">
                  Conta criada! Verifique o seu email para confirmar.
                </div>
                <Link href="/portugal-outreach/login">
                  <Button className="bg-white text-black hover:bg-gray-200">Ir para Login</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input className="bg-zinc-800 border-zinc-700" value={fullName}
                    onChange={e => setFullName(e.target.value)} required placeholder="Joao Silva" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input className="bg-zinc-800 border-zinc-700" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label>Palavra-passe</Label>
                  <Input className="bg-zinc-800 border-zinc-700" type="password" value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>

                {error && <div className="p-3 bg-red-900/50 text-red-300 rounded text-sm">{error}</div>}

                <Button type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-gray-200">
                  {loading ? 'A criar...' : 'Criar Conta Gratis'}
                </Button>

                <div className="text-xs text-gray-500 text-center space-y-1">
                  <p>14 dias de trial gratis. 50 emails/mes durante o trial.</p>
                  <p>Planos a partir de 29 EUR/mes.</p>
                </div>
              </form>
            )}

            <p className="text-center text-sm text-gray-400 mt-4">
              Ja tem conta?{' '}
              <Link href="/portugal-outreach/login" className="text-white hover:underline">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
