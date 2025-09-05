'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Edit3, Save, X, Eye, User } from 'lucide-react'

interface TextEditorProps {
  accessPointName?: string
  content?: string
  onSave?: (content: string) => void
  lastEditedBy?: string
  lastEditedAt?: string
}

export function TextEditor({
  accessPointName = 'Documento',
  content = '',
  onSave,
  lastEditedBy,
  lastEditedAt
}: TextEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [currentContent, setCurrentContent] = useState(content)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!hasChanges || !onSave) return

    setIsSaving(true)
    try {
      await onSave(currentContent)
      setHasChanges(false)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setCurrentContent(content)
    setHasChanges(false)
    setIsEditing(false)
  }

  const handleChange = (value: string) => {
    setCurrentContent(value)
    setHasChanges(value !== content)
  }

  const formatLastEdited = () => {
    if (!lastEditedAt || !lastEditedBy) return null
    
    const date = new Date(lastEditedAt)
    const formattedDate = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    return `${lastEditedBy} • ${formattedDate}`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isEditing ? (
              <Edit3 className="h-5 w-5 text-blue-600" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
            {accessPointName}
            {hasChanges && (
              <Badge variant="secondary">
                Não salvo
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button onClick={handleEdit} size="sm">
                <Edit3 className="h-4 w-4 mr-2" />
                Editar
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleCancel} 
                  variant="outline" 
                  size="sm"
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave} 
                  size="sm"
                  disabled={!hasChanges || isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {formatLastEdited() && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{formatLastEdited()}</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {isEditing ? (
          <textarea
            value={currentContent}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full min-h-[300px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Digite o conteúdo aqui..."
            autoFocus
          />
        ) : (
          <div className="min-h-[300px] p-3 border rounded-md bg-gray-50 relative">
            {currentContent ? (
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {currentContent}
              </pre>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Edit3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum conteúdo adicionado ainda</p>
                  <p className="text-sm">Clique em "Editar" para começar</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}