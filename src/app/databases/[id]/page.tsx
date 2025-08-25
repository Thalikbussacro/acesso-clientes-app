'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { removeAuthToken, getAuthToken, getAuthHeaders } from '@/lib/auth-client'
import { Database, Lock, Users, Clock, Eye, EyeOff, ArrowLeft } from 'lucide-react'

interface DatabaseInfo {
  id: string
  name: string
  clientCount: number
  timeoutMinutes: number
  customFieldsCount: number
}

export default function DatabaseAccessPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [database, setDatabase] = useState<DatabaseInfo | null>(null)
  const [attempts, setAttempts] = useState(0)
  
  const router = useRouter()
  const params = useParams()
  const databaseId = params.id as string

  // Fetch database info
  const fetchDatabaseInfo = useCallback(async () => {
    try {
      const response = await fetch('/api/databases', {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        const dbInfo = data.databases.find((db: DatabaseInfo) => db.id === databaseId)
        
        if (dbInfo) {
          setDatabase(dbInfo)
        } else {
          setError('Base de dados não encontrada')
        }
      } else if (response.status === 401) {
        removeAuthToken()
        router.push('/login')
      } else {
        setError('Erro ao carregar informações da base de dados')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }, [databaseId, router])

  useEffect(() => {
    // Check if user is authenticated
    const token = getAuthToken()
    if (!token) {
      router.push('/login')
      return
    }

    if (databaseId) {
      fetchDatabaseInfo()
    } else {
      setError('ID da base de dados inválido')
      setIsLoading(false)
    }
  }, [router, databaseId, fetchDatabaseInfo])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password.trim()) {
      setError('Digite a senha da base de dados')
      return
    }

    if (attempts >= 3) {
      setError('Muitas tentativas incorretas. Recarregue a página para tentar novamente.')
      return
    }

    setIsValidating(true)
    setError(null)

    try {
      const response = await fetch(`/api/databases/${databaseId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Store session info in localStorage
        const sessionStart = Date.now()
        const timeoutMinutes = database?.timeoutMinutes || 30
        const sessionData = {
          databaseId,
          sessionStart,
          timeoutMinutes,
          expiresAt: sessionStart + (timeoutMinutes * 60 * 1000),
          sessionToken: data.sessionToken
        }
        localStorage.setItem(`db_session_${databaseId}`, JSON.stringify(sessionData))

        // Navigate to client list
        router.push(`/clients/${databaseId}`)
      } else {
        const errorData = await response.json()
        setAttempts(prev => prev + 1)
        setError(errorData.error || 'Senha incorreta')
        setPassword('')
      }
    } catch {
      setError('Erro de conexão ao validar senha')
    } finally {
      setIsValidating(false)
    }
  }

  const handleBack = () => {
    router.push('/databases')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Database className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg">Carregando informações da base de dados...</p>
        </div>
      </div>
    )
  }

  if (!database) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Database className="h-5 w-5" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              {error || 'Base de dados não encontrada'}
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar às Bases de Dados
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Back button */}
        <Button 
          onClick={handleBack} 
          variant="ghost" 
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar às Bases de Dados
        </Button>

        {/* Database Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{database.name}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{database.clientCount} cliente{database.clientCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{database.timeoutMinutes} min</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline">
                {database.customFieldsCount} campo{database.customFieldsCount !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Password Validation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Acesso Protegido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha da Base de Dados
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a senha de acesso"
                    disabled={isValidating || attempts >= 3}
                    className="pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isValidating}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {attempts > 0 && attempts < 3 && (
                <Alert>
                  <AlertDescription>
                    Tentativa {attempts}/3. {3 - attempts} tentativa{3 - attempts !== 1 ? 's' : ''} restante{3 - attempts !== 1 ? 's' : ''}.
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={isValidating || attempts >= 3}
              >
                {isValidating ? (
                  <>
                    <Database className="h-4 w-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Acessar Base de Dados
                  </>
                )}
              </Button>

              {attempts >= 3 && (
                <div className="text-center">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="mt-2"
                  >
                    Recarregar Página
                  </Button>
                </div>
              )}
            </form>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Sessão expira em:</span>
                <span className="font-medium">{database.timeoutMinutes} minutos</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                O tempo será reiniciado a cada interação
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}