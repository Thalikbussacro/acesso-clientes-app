'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SessionTimer } from '@/components/session-timer'
import { SessionRevalidationModal } from '@/components/session-revalidation-modal'
import { removeAuthToken, getAuthToken } from '@/lib/auth-client'
import { cleanupDatabaseSession } from '@/lib/session-cleanup'
import { Database, Users, Plus, ArrowLeft } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { columns, type Client } from '@/components/clients/columns'

interface DatabaseInfo {
  id: string
  name: string
  clientCount: number
  timeoutMinutes: number
  customFieldsCount: number
}

export default function ClientsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [database, setDatabase] = useState<DatabaseInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRevalidationModal, setShowRevalidationModal] = useState(false)
  const [hasValidSession, setHasValidSession] = useState(false)
  
  // Mock client data for testing
  const mockClients: Client[] = [
    {
      id: '1',
      name: 'João Silva',
      email: 'joao.silva@email.com',
      phone: '(11) 99999-9999',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customFields: {},
    },
    {
      id: '2',
      name: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone: '(11) 88888-8888',
      status: 'active',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      customFields: {},
    },
    {
      id: '3',
      name: 'Pedro Costa',
      email: null,
      phone: '(11) 77777-7777',
      status: 'inactive',
      createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      updatedAt: new Date(Date.now() - 172800000).toISOString(),
      customFields: {},
    },
  ]
  
  const router = useRouter()
  const params = useParams()
  const databaseId = params.databaseId as string

  // Check if user has valid session for this database
  const checkSession = useCallback(() => {
    const sessionKey = `db_session_${databaseId}`
    const storedData = localStorage.getItem(sessionKey)
    
    if (storedData) {
      try {
        const sessionData = JSON.parse(storedData)
        const now = Date.now()
        const isValid = sessionData.expiresAt > now
        
        setHasValidSession(isValid)
        return isValid
      } catch (error) {
        console.error('Error parsing session data:', error)
        setHasValidSession(false)
        return false
      }
    }
    
    setHasValidSession(false)
    return false
  }, [databaseId])

  // Fetch database info
  const fetchDatabaseInfo = useCallback(async () => {
    try {
      const response = await fetch('/api/databases')
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
    }
  }, [databaseId, router])

  // Initialize page
  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push('/login')
      return
    }

    // Check if user has valid session for this database
    const hasSession = checkSession()
    if (!hasSession) {
      // Redirect to database password validation
      router.push(`/databases/${databaseId}`)
      return
    }

    // Fetch database info
    fetchDatabaseInfo().finally(() => {
      setIsLoading(false)
    })
  }, [router, databaseId, checkSession, fetchDatabaseInfo])

  // Handle session expiry from timer
  const handleSessionExpired = useCallback(() => {
    setHasValidSession(false)
    // Redirect to database password validation
    router.push(`/databases/${databaseId}`)
  }, [router, databaseId])

  // Handle revalidation needed from timer
  const handleRevalidationNeeded = useCallback(() => {
    setShowRevalidationModal(true)
  }, [])

  // Handle successful revalidation
  const handleRevalidationSuccess = useCallback((sessionData: unknown) => {
    setHasValidSession(true)
    setShowRevalidationModal(false)
    
    // Notify session timer about the update (if needed)
    const broadcastChannel = new BroadcastChannel(`session_${databaseId}`)
    broadcastChannel.postMessage({
      type: 'SESSION_REVALIDATED',
      data: sessionData
    })
    broadcastChannel.close()
  }, [databaseId])

  // Handle forced logout
  const handleForceLogout = useCallback(async () => {
    setHasValidSession(false)
    setShowRevalidationModal(false)
    
    // Perform comprehensive cleanup
    try {
      await cleanupDatabaseSession(databaseId)
      console.log('Force logout cleanup completed successfully')
    } catch (error) {
      console.error('Error during force logout cleanup:', error)
    }
    
    // Redirect to databases page
    router.push('/databases')
  }, [databaseId, router])

  // Navigate back to databases
  const handleBackToDatabases = () => {
    router.push('/databases')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Database className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg">Carregando clientes...</p>
        </div>
      </div>
    )
  }

  if (error || !database) {
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
            <Button onClick={handleBackToDatabases} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar às Bases de Dados
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Database className="h-5 w-5" />
              Sessão Inválida
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Sua sessão expirou ou é inválida. Faça login novamente.
            </p>
            <Button onClick={() => router.push(`/databases/${databaseId}`)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Fazer Login na Base de Dados
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with session timer */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleBackToDatabases} 
                  variant="ghost" 
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Bases de Dados
                </Button>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Database className="h-8 w-8 text-blue-600" />
                  {database.name}
                </h1>
                <p className="text-gray-600 mt-1">
                  Gerencie os clientes desta base de dados
                </p>
              </div>
            </div>
          </div>

          {/* Session Timer */}
          <SessionTimer
            databaseId={databaseId}
            onSessionExpired={handleSessionExpired}
            onRevalidationNeeded={handleRevalidationNeeded}
          />
        </div>

        {/* Database Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{database.clientCount}</div>
              <p className="text-xs text-muted-foreground">
                cliente{database.clientCount !== 1 ? 's' : ''} registrado{database.clientCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Campos Personalizados</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{database.customFieldsCount}</div>
              <p className="text-xs text-muted-foreground">
                campo{database.customFieldsCount !== 1 ? 's' : ''} configurado{database.customFieldsCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Timeout da Sessão</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{database.timeoutMinutes}</div>
              <p className="text-xs text-muted-foreground">
                minuto{database.timeoutMinutes !== 1 ? 's' : ''} de sessão
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Client Management Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Clientes</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Clientes cadastrados nesta base de dados
                </p>
              </div>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable 
              columns={columns} 
              data={mockClients}
              searchKey="name"
              searchPlaceholder="Buscar clientes..."
            />
          </CardContent>
        </Card>
      </div>

      {/* Session Revalidation Modal */}
      <SessionRevalidationModal
        isOpen={showRevalidationModal}
        onClose={() => setShowRevalidationModal(false)}
        databaseId={databaseId}
        databaseName={database.name}
        onRevalidationSuccess={handleRevalidationSuccess}
        onForceLogout={handleForceLogout}
      />
    </div>
  )
}