'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SessionTimer } from '@/components/session-timer'
import { SessionRevalidationModal } from '@/components/session-revalidation-modal'
import { AccessPointsList } from '@/components/access-points-list'
import { RichEditor } from '@/components/rich-editor'
import { removeAuthToken, getAuthToken } from '@/lib/auth-client'
import { cleanupDatabaseSession } from '@/lib/session-cleanup'
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  Building, 
  Eye,
  FileText
} from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  lastAccess: string | null
  customFields: Record<string, unknown>
}

interface CustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'boolean'
  required: boolean
}

interface Database {
  id: string
  name: string
  timeoutMinutes: number
}

interface AccessPoint {
  id: string
  name: string
  createdAt: string
  updatedAt?: string
  hasContent: boolean
  contentLength?: number
}

export default function ClientDetailsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [client, setClient] = useState<Client | null>(null)
  const [database, setDatabase] = useState<Database | null>(null)
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([])
  const [selectedAccessPoint, setSelectedAccessPoint] = useState<string | null>(null)
  const [accessPointContent, setAccessPointContent] = useState<string>('')
  const [isLoadingAccessPoints, setIsLoadingAccessPoints] = useState(false)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRevalidationModal, setShowRevalidationModal] = useState(false)
  const [hasValidSession, setHasValidSession] = useState(false)
  
  // Mock custom fields (will be fetched from database later)
  const mockCustomFields: CustomField[] = [
    {
      id: 'company',
      name: 'Empresa',
      type: 'text',
      required: true,
    },
    {
      id: 'priority',
      name: 'Prioridade',
      type: 'boolean',
      required: false,
    },
    {
      id: 'last_contact',
      name: 'Último Contato',
      type: 'date',
      required: false,
    },
  ]

  const router = useRouter()
  const params = useParams()
  const databaseId = params.databaseId as string
  const clientId = params.clientId as string

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

  // Fetch client data
  const fetchClientData = useCallback(async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('Token not found')
      }

      // Fetch client details
      const clientResponse = await fetch(`/api/clients?database_id=${databaseId}&client_id=${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (clientResponse.ok) {
        const clientData = await clientResponse.json()
        const foundClient = clientData.clients.find((c: Client) => c.id === clientId)
        if (foundClient) {
          setClient(foundClient)
        } else {
          setError('Cliente não encontrado')
        }
      } else if (clientResponse.status === 401) {
        removeAuthToken()
        router.push('/login')
        return
      } else {
        setError('Erro ao carregar dados do cliente')
      }

      // Fetch database info
      const dbResponse = await fetch('/api/databases', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (dbResponse.ok) {
        const dbData = await dbResponse.json()
        const foundDb = dbData.databases.find((db: Database) => db.id === databaseId)
        if (foundDb) {
          setDatabase(foundDb)
        }
      }

    } catch (error) {
      console.error('Error fetching client data:', error)
      setError('Erro de conexão')
    }
  }, [databaseId, clientId, router])

  // Fetch access points
  const fetchAccessPoints = useCallback(async () => {
    try {
      setIsLoadingAccessPoints(true)
      const token = getAuthToken()
      if (!token) {
        throw new Error('Token not found')
      }

      const response = await fetch(`/api/access-points?client_id=${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAccessPoints(data.accessPoints || [])
      } else if (response.status === 401) {
        removeAuthToken()
        router.push('/login')
      } else {
        console.error('Failed to fetch access points')
        setAccessPoints([])
      }
    } catch (error) {
      console.error('Error fetching access points:', error)
      setAccessPoints([])
    } finally {
      setIsLoadingAccessPoints(false)
    }
  }, [clientId, router])

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

    // Fetch client data and access points
    Promise.all([
      fetchClientData(),
      fetchAccessPoints(),
    ]).finally(() => {
      setIsLoading(false)
    })
  }, [router, databaseId, checkSession, fetchClientData])

  // Handle session expiry from timer
  const handleSessionExpired = useCallback(() => {
    setHasValidSession(false)
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
    
    // Notify session timer about the update
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

  // Navigation handlers
  const handleBackToClients = () => {
    router.push(`/clients/${databaseId}`)
  }

  // Fetch access point content
  const fetchAccessPointContent = useCallback(async (accessPointId: string) => {
    try {
      setIsLoadingContent(true)
      const token = getAuthToken()
      if (!token) {
        throw new Error('Token not found')
      }

      const response = await fetch(`/api/access-details?access_point_id=${accessPointId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAccessPointContent(data.accessPoint.content || '')
      } else if (response.status === 401) {
        removeAuthToken()
        router.push('/login')
      } else {
        console.error('Failed to fetch access point content')
        setAccessPointContent('')
      }
    } catch (error) {
      console.error('Error fetching access point content:', error)
      setAccessPointContent('')
    } finally {
      setIsLoadingContent(false)
    }
  }, [router])

  // Access point handlers
  const handleSelectAccessPoint = (accessPointId: string) => {
    setSelectedAccessPoint(accessPointId)
    fetchAccessPointContent(accessPointId)
  }

  const handleAddAccessPoint = async (name: string) => {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('Token not found')
      }

      const response = await fetch('/api/access-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          client_id: clientId,
          name,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newAccessPoint = data.accessPoint
        setAccessPoints(prev => [newAccessPoint, ...prev])
        setSelectedAccessPoint(newAccessPoint.id)
      } else if (response.status === 401) {
        removeAuthToken()
        router.push('/login')
      } else {
        const errorData = await response.json()
        console.error('Failed to create access point:', errorData.error)
      }
    } catch (error) {
      console.error('Error creating access point:', error)
    }
  }
  
  const handleEditAccessPoint = async (id: string, newName: string) => {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('Token not found')
      }

      const response = await fetch('/api/access-points', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          name: newName,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const updatedAccessPoint = data.accessPoint
        setAccessPoints(prev => prev.map(ap => 
          ap.id === id 
            ? { ...ap, ...updatedAccessPoint }
            : ap
        ))
      } else if (response.status === 401) {
        removeAuthToken()
        router.push('/login')
      } else {
        const errorData = await response.json()
        console.error('Failed to update access point:', errorData.error)
      }
    } catch (error) {
      console.error('Error updating access point:', error)
    }
  }
  
  const handleDeleteAccessPoint = async (id: string) => {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('Token not found')
      }

      const response = await fetch('/api/access-points', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      })

      if (response.ok) {
        // If deleting selected access point, clear selection
        if (selectedAccessPoint === id) {
          setSelectedAccessPoint(null)
        }
        
        setAccessPoints(prev => prev.filter(ap => ap.id !== id))
      } else if (response.status === 401) {
        removeAuthToken()
        router.push('/login')
      } else {
        const errorData = await response.json()
        console.error('Failed to delete access point:', errorData.error)
      }
    } catch (error) {
      console.error('Error deleting access point:', error)
    }
  }

  // Format custom field value for display
  const formatCustomFieldValue = (field: CustomField, value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return '—'
    }

    switch (field.type) {
      case 'boolean':
        return value ? 'Sim' : 'Não'
      case 'date':
        return new Date(value as string).toLocaleDateString('pt-BR')
      case 'email':
        return value as string
      case 'phone':
        return value as string
      default:
        return String(value)
    }
  }

  // Memoize the onSave function to prevent re-renders
  const handleSaveContent = useCallback(async (content: string) => {
    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('Token not found')
      }

      const response = await fetch('/api/access-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          access_point_id: selectedAccessPoint,
          content,
        }),
      })

      if (response.ok) {
        // Update access point content length in the list
        setAccessPoints(prev => prev.map(ap => 
          ap.id === selectedAccessPoint 
            ? { ...ap, hasContent: true, contentLength: content.length }
            : ap
        ))
        console.log('Content saved successfully')
      } else if (response.status === 401) {
        removeAuthToken()
        router.push('/login')
      } else {
        const errorData = await response.json()
        console.error('Failed to save content:', errorData.error)
        throw new Error('Falha ao salvar o conteúdo')
      }
    } catch (error) {
      console.error('Error saving content:', error)
      throw error
    }
  }, [selectedAccessPoint, router])

  // Memoize the onChange function to prevent re-renders
  const handleContentChange = useCallback((content: string) => {
    setAccessPointContent(content)
  }, [])

  // Memoize the lastEditedAt to prevent re-renders - should be stable
  const stableLastEditedAt = useMemo(() => new Date().toISOString(), [selectedAccessPoint])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg">Carregando detalhes do cliente...</p>
        </div>
      </div>
    )
  }

  if (error || !client || !database) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <User className="h-5 w-5" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              {error || 'Cliente não encontrado'}
            </p>
            <Button onClick={handleBackToClients} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos Clientes
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
              <User className="h-5 w-5" />
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header with Navigation and Session Timer */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleBackToClients} 
              variant="ghost" 
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Lista de Clientes
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">{database.name}</span>
          </div>

          {/* Session Timer */}
          <SessionTimer
            databaseId={databaseId}
            onSessionExpired={handleSessionExpired}
            onRevalidationNeeded={handleRevalidationNeeded}
          />
        </div>

        {/* Client Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                      {client.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      ID: {client.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Criado em {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                </div>
                {client.lastAccess && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    Último acesso: {new Date(client.lastAccess).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Client Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Informações de Contato</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {client.email ? (
                        <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                          {client.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {client.phone ? (
                        <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                          {client.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom Fields */}
              {mockCustomFields.map((field) => {
                const value = client.customFields[field.id]
                if (!value && !field.required) return null
                
                return (
                  <div key={field.id} className="space-y-3">
                    <h3 className="font-semibold text-gray-900">{field.name}</h3>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {formatCustomFieldValue(field, value)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Two-Column Layout: Access Points and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Access Points List */}
          <div className="lg:col-span-1">
            <AccessPointsList
              accessPoints={accessPoints}
              selectedAccessPoint={selectedAccessPoint}
              onSelectAccessPoint={handleSelectAccessPoint}
              onAddAccessPoint={handleAddAccessPoint}
              onEditAccessPoint={handleEditAccessPoint}
              onDeleteAccessPoint={handleDeleteAccessPoint}
              isLoading={isLoadingAccessPoints}
              className="h-fit"
            />
          </div>

          {/* Right Column: Access Point Details */}
          <div className="lg:col-span-2">
            {selectedAccessPoint ? (
              isLoadingContent ? (
                <Card className="min-h-[500px]">
                  <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <FileText className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
                      <p className="text-lg">Carregando conteúdo...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <RichEditor
                  accessPointName={accessPoints.find(ap => ap.id === selectedAccessPoint)?.name || 'Documento'}
                  content={accessPointContent}
                  placeholder="Comece a escrever a documentação deste ponto de acesso..."
                  onSave={handleSaveContent}
                  onChange={handleContentChange}
                  lastEditedBy="Usuário Atual"
                  lastEditedAt={stableLastEditedAt}
                  maxHeight={600}
                />
              )
            ) : (
              <Card className="min-h-[500px]">
                <CardContent className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">Nenhum ponto de acesso selecionado</h3>
                    <p className="text-muted-foreground mb-4">
                      Selecione um ponto de acesso da lista ao lado para ver os detalhes e editar o conteúdo
                    </p>
                    <div className="bg-muted/20 p-6 rounded-lg mt-6">
                      <h4 className="font-medium mb-2">Funcionalidades Disponíveis:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Editor de texto rico com formatação completa</li>
                        <li>• Suporte a cabeçalhos, listas e código</li>
                        <li>• Contadores de palavras e caracteres</li>
                        <li>• Salvamento manual com controle de versões</li>
                        <li>• Modo de visualização e edição</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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