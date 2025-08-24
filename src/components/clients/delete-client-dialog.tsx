'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { getAuthToken } from '@/lib/auth-client'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  customFields: Record<string, unknown>
}

interface DeleteClientDialogProps {
  isOpen: boolean
  onClose: () => void
  client: Client | null
  onClientDeleted: (clientId: string) => void
}

export function DeleteClientDialog({
  isOpen,
  onClose,
  client,
  onClientDeleted,
}: DeleteClientDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = useCallback(async () => {
    if (!client) return

    setIsDeleting(true)
    setError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      const response = await fetch('/api/clients', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: client.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir cliente')
      }

      onClientDeleted(client.id)
      onClose()
      
    } catch (error) {
      console.error('Error deleting client:', error)
      setError(error instanceof Error ? error.message : 'Erro ao excluir cliente')
    } finally {
      setIsDeleting(false)
    }
  }, [client, onClientDeleted, onClose])

  const handleClose = useCallback(() => {
    if (!isDeleting) {
      setError(null)
      onClose()
    }
  }, [isDeleting, onClose])

  if (!client) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Excluir Cliente
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. O cliente e todos os seus dados relacionados serão permanentemente removidos.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você está prestes a excluir o cliente <strong>&quot;{client.name}&quot;</strong>.
              {client.email && (
                <span> ({client.email})</span>
              )}
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive" className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Cliente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}