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
  const { signIn, signInWithGoogle, user, loading: authLoading } = useAuth()
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
            <Button
              onClick={async () => {
                const { error } = await signInWithGoogle()
                if (error) setError(error.message)
              }}
              className="w-full bg-white text-black hover:bg-gray-200 flex items-center justify-center gap-2 mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google
            </Button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-zinc-900 px-2 text-gray-500">ou</span></div>
            </div>

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

              <Button type="submit" disabled={loading} className="w-full bg-zinc-800 text-white hover:bg-zinc-700">
                {loading ? 'A entrar...' : 'Entrar com Email'}
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
