'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { removeAuthToken, getAuthToken, getAuthHeaders } from '@/lib/auth-client'
import { DatabaseCreationDialog } from '@/components/database-creation-dialog'
import { Search, Plus, Database, Users, Clock } from 'lucide-react'

interface Database {
  id: string
  name: string
  clientCount: number
  lastModified: string
  customFieldsCount: number
  status: 'active' | 'inactive'
  timeoutMinutes: number
  customFields: unknown[]
  createdAt: string
}

export default function DatabasesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [databases, setDatabases] = useState<Database[]>([])
  const [filteredDatabases, setFilteredDatabases] = useState<Database[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Fetch databases from API
  const fetchDatabases = useCallback(async () => {
    try {
      const response = await fetch('/api/databases', {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setDatabases(data.databases)
        setError(null)
      } else if (response.status === 401) {
        removeAuthToken()
        router.push('/login')
      } else {
        setError('Erro ao carregar bases de dados')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    // Check if user is authenticated
    const token = getAuthToken()
    if (!token) {
      router.push('/login')
      return
    }
    fetchDatabases()
  }, [router, fetchDatabases])

  // Filter databases based on search term
  useEffect(() => {
    const filtered = databases.filter(db => 
      db.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredDatabases(filtered)
  }, [searchTerm, databases])

  const handleDatabaseClick = (databaseId: string) => {
    // Navigate to database password validation page (will be implemented in stage 4.2)
    router.push(`/databases/${databaseId}`)
  }

  const handleDatabaseCreation = async (data: {
    name: string
    password: string
    timeoutMinutes: number
    customFields: unknown[]
  }) => {
    try {
      // Convert camelCase to snake_case for API
      const apiData = {
        name: data.name,
        password: data.password,
        timeout_minutes: data.timeoutMinutes,
        custom_fields: data.customFields,
      }
      
      const response = await fetch('/api/databases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(apiData),
      })

      if (response.ok) {
        // Refresh the databases list
        await fetchDatabases()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao criar base de dados')
      }
    } catch {
      setError('Erro de conexão ao criar base de dados')
    }
  }

  const formatLastModified = (date: string) => {
    const now = new Date()
    const modified = new Date(date)
    const diffInHours = Math.floor((now.getTime() - modified.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return `há ${diffInHours} horas`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `há ${diffInDays} dias`
    }
  }

  const handleLogout = () => {
    removeAuthToken()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bases de Dados dos Clientes</h1>
            <p className="text-gray-600 mt-2">
              Gerencie e acesse as bases de dados dos seus clientes
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar bases de dados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <DatabaseCreationDialog
            onSubmit={handleDatabaseCreation}
            trigger={
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Base de Dados
              </Button>
            }
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {filteredDatabases.length} base{filteredDatabases.length !== 1 ? 's' : ''} encontrada{filteredDatabases.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Database Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDatabases.map((database) => (
            <Card 
              key={database.id}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500"
              onClick={() => handleDatabaseClick(database.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg truncate">{database.name}</CardTitle>
                  </div>
                  <Badge variant={database.status === 'active' ? 'default' : 'secondary'}>
                    {database.status === 'active' ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Client Count */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{database.clientCount} cliente{database.clientCount !== 1 ? 's' : ''}</span>
                </div>
                
                {/* Custom Fields Count */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {database.customFieldsCount} campo{database.customFieldsCount !== 1 ? 's' : ''} personalizado{database.customFieldsCount !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {/* Last Modified */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Atualizada {formatLastModified(database.lastModified)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* No results message */}
          {filteredDatabases.length === 0 && searchTerm && (
            <div className="col-span-full text-center py-12">
              <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">Nenhuma base de dados encontrada</p>
              <p className="text-gray-400 text-sm">
                Tente ajustar o termo de busca ou criar uma nova base de dados
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}