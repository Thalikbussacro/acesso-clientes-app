'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { removeAuthToken, getAuthToken } from '@/lib/auth-client'

export default function DatabasesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const token = getAuthToken()
    if (!token) {
      router.push('/login')
      return
    }
    setIsLoading(false)
  }, [router])

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
        <div className="mb-8 flex justify-between items-center">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
            <CardHeader className="text-center">
              <CardTitle className="text-lg text-gray-600">
                + Nova Base de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                Crie uma nova base de dados para organizar os clientes
              </p>
              <Button className="w-full">
                Criar Base de Dados
              </Button>
            </CardContent>
          </Card>

          {/* Placeholder for existing databases */}
          <Card>
            <CardHeader>
              <CardTitle>Base Demo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Base de dados de exemplo para testes
              </p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>15 clientes</span>
                <span>Atualizada há 2 horas</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}