'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  FileText, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Calendar
} from 'lucide-react'

interface AccessPoint {
  id: string
  name: string
  createdAt: string
  updatedAt?: string
  hasContent: boolean
  contentLength?: number
}

interface AccessPointsListProps {
  accessPoints: AccessPoint[]
  selectedAccessPoint: string | null
  onSelectAccessPoint: (accessPointId: string) => void
  onAddAccessPoint: (name: string) => void
  onEditAccessPoint?: (id: string, name: string) => void
  onDeleteAccessPoint?: (id: string) => void
  isLoading?: boolean
  className?: string
}

export function AccessPointsList({
  accessPoints,
  selectedAccessPoint,
  onSelectAccessPoint,
  onAddAccessPoint,
  onEditAccessPoint,
  onDeleteAccessPoint,
  isLoading = false,
  className = '',
}: AccessPointsListProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [newAccessPointName, setNewAccessPointName] = useState('')
  const [editingAccessPoint, setEditingAccessPoint] = useState<AccessPoint | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingAccessPoint, setDeletingAccessPoint] = useState<AccessPoint | null>(null)

  // Handle adding new access point
  const handleAddAccessPoint = useCallback(() => {
    if (newAccessPointName.trim()) {
      onAddAccessPoint(newAccessPointName.trim())
      setNewAccessPointName('')
      setShowAddDialog(false)
    }
  }, [newAccessPointName, onAddAccessPoint])

  // Handle editing access point
  const handleEditAccessPoint = useCallback((accessPoint: AccessPoint) => {
    setEditingAccessPoint(accessPoint)
    setEditName(accessPoint.name)
    setShowEditDialog(true)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (editingAccessPoint && editName.trim() && onEditAccessPoint) {
      onEditAccessPoint(editingAccessPoint.id, editName.trim())
      setEditingAccessPoint(null)
      setEditName('')
      setShowEditDialog(false)
    }
  }, [editingAccessPoint, editName, onEditAccessPoint])

  // Handle deleting access point
  const handleDeleteAccessPoint = useCallback((accessPoint: AccessPoint) => {
    setDeletingAccessPoint(accessPoint)
    setShowDeleteDialog(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (deletingAccessPoint && onDeleteAccessPoint) {
      onDeleteAccessPoint(deletingAccessPoint.id)
      setDeletingAccessPoint(null)
      setShowDeleteDialog(false)
    }
  }, [deletingAccessPoint, onDeleteAccessPoint])

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Get content status info
  const getContentStatus = (accessPoint: AccessPoint) => {
    if (!accessPoint.hasContent) {
      return { text: 'Vazio', variant: 'secondary' as const }
    }
    
    if (accessPoint.contentLength && accessPoint.contentLength > 0) {
      return { 
        text: `${accessPoint.contentLength} caracteres`, 
        variant: 'default' as const 
      }
    }
    
    return { text: 'Com conteúdo', variant: 'default' as const }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Pontos de Acesso</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {accessPoints.length} ponto{accessPoints.length !== 1 ? 's' : ''} de acesso
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Ponto de Acesso</DialogTitle>
                <DialogDescription>
                  Crie um novo ponto de acesso para organizar informações e documentação.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="access-point-name">Nome do Ponto de Acesso</Label>
                  <Input
                    id="access-point-name"
                    placeholder="Ex: Configurações de Rede, Backup, etc."
                    value={newAccessPointName}
                    onChange={(e) => setNewAccessPointName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddAccessPoint()
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddAccessPoint}
                  disabled={!newAccessPointName.trim()}
                >
                  Criar Ponto de Acesso
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center">
            <FileText className="h-8 w-8 animate-pulse mx-auto mb-2 text-blue-600" />
            <p className="text-sm text-muted-foreground">
              Carregando pontos de acesso...
            </p>
          </div>
        ) : accessPoints.length > 0 ? (
          <div className="divide-y">
            {accessPoints.map((accessPoint) => {
              const isSelected = selectedAccessPoint === accessPoint.id
              const contentStatus = getContentStatus(accessPoint)
              
              return (
                <div
                  key={accessPoint.id}
                  className={`p-4 cursor-pointer transition-colors duration-200 hover:bg-muted/50 ${
                    isSelected 
                      ? 'bg-muted border-r-2 border-r-primary' 
                      : 'hover:bg-muted/30'
                  }`}
                  onClick={() => onSelectAccessPoint(accessPoint.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className={`h-4 w-4 flex-shrink-0 ${
                          isSelected ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <h3 className={`font-medium text-sm truncate ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}>
                          {accessPoint.name}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant={contentStatus.variant} 
                          className="text-xs"
                        >
                          {contentStatus.text}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Criado em {formatDate(accessPoint.createdAt)}</span>
                      </div>
                      
                      {accessPoint.updatedAt && accessPoint.updatedAt !== accessPoint.createdAt && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Edit2 className="h-3 w-3" />
                          <span>Editado em {formatDate(accessPoint.updatedAt)}</span>
                        </div>
                      )}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Abrir menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditAccessPoint(accessPoint)
                          }}
                          className="gap-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteAccessPoint(accessPoint)
                          }}
                          className="gap-2 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-lg mb-2">Nenhum ponto de acesso</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie seu primeiro ponto de acesso para organizar informações e documentação.
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Ponto de Acesso
            </Button>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Ponto de Acesso</DialogTitle>
            <DialogDescription>
              Altere o nome do ponto de acesso. Isso não afetará o conteúdo armazenado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Novo Nome</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={!editName.trim() || editName === editingAccessPoint?.name}
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja excluir o ponto de acesso &ldquo;{deletingAccessPoint?.name}&rdquo;? 
              Esta ação não pode ser desfeita e todo o conteúdo associado será perdido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Excluir Ponto de Acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}