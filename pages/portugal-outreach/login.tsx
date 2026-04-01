import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) router.push('/portugal-outreach')
  }, [user, authLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email ou palavra-passe incorretos'
        : error.message)
    } else {
      router.push('/portugal-outreach')
    }
    setLoading(false)
  }

  return (
    <>
      <Head><title>Login - Portugal Outreach</title></Head>
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Portugal Outreach</CardTitle>
            <CardDescription className="text-gray-400">Cold email tool for property agents</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input className="bg-zinc-800 border-zinc-700" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Password</Label>
                <Input className="bg-zinc-800 border-zinc-700" type="password" value={password}
                  onChange={e => setPassword(e.target.value)} required />
              </div>

              {error && <div className="p-3 bg-red-900/50 text-red-300 rounded text-sm">{error}</div>}

              <Button type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-gray-200">
                {loading ? 'A entrar...' : 'Entrar'}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-400 mt-4">
              Nao tem conta?{' '}
              <Link href="/portugal-outreach/register" className="text-white hover:underline">
                Criar conta
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
