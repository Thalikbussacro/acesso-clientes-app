'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Edit3, Save, X, Eye, User } from 'lucide-react'

interface RichEditorV2Props {
  accessPointName?: string
  content?: string
  onSave?: (content: string) => void
  lastEditedBy?: string
  lastEditedAt?: string
}

export function RichEditorV2({
  accessPointName = 'Documento',
  content = '',
  onSave,
  lastEditedBy,
  lastEditedAt
}: RichEditorV2Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<any>(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentContent, setCurrentContent] = useState(content)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize Quill
  useEffect(() => {
    let mounted = true

    const initQuill = async () => {
      console.log('Starting Quill initialization...')
      
      if (!editorRef.current) {
        console.log('No editor ref found')
        setIsLoading(false)
        return
      }
      
      if (quillRef.current) {
        console.log('Quill already initialized')
        setIsLoading(false)
        return
      }

      try {
        console.log('Importing Quill...')
        const Quill = (await import('quill')).default
        console.log('Quill imported successfully')

        console.log('Creating Quill instance...')
        const quill = new Quill(editorRef.current, {
          theme: 'snow',
          placeholder: 'Clique em Editar para começar a escrever...',
          readOnly: true,
          modules: {
            toolbar: [
              ['bold', 'italic', 'underline'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              ['clean']
            ]
          }
        })
        console.log('Quill instance created successfully')

        quillRef.current = quill

        // Set initial content
        if (content) {
          console.log('Setting initial content')
          quill.root.innerHTML = content
        }

        // Listen for changes
        quill.on('text-change', () => {
          if (!isEditing) return
          const html = quill.root.innerHTML
          setCurrentContent(html)
          setHasChanges(html !== content)
        })

        if (mounted) {
          console.log('Setting isLoading to false')
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Failed to initialize Quill:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initQuill()
    }, 100)

    return () => {
      clearTimeout(timer)
      mounted = false
      if (quillRef.current) {
        quillRef.current = null
      }
    }
  }, [])

  // Update content when prop changes
  useEffect(() => {
    if (quillRef.current && content !== currentContent && !isEditing) {
      quillRef.current.root.innerHTML = content
      setCurrentContent(content)
      setHasChanges(false)
    }
  }, [content, currentContent, isEditing])

  const handleEdit = () => {
    setIsEditing(true)
    if (quillRef.current) {
      quillRef.current.enable(true)
      quillRef.current.focus()
    }
  }

  const handleSave = async () => {
    if (!hasChanges || !onSave) return

    setIsSaving(true)
    try {
      await onSave(currentContent)
      setHasChanges(false)
      setIsEditing(false)
      if (quillRef.current) {
        quillRef.current.enable(false)
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (quillRef.current) {
      quillRef.current.root.innerHTML = content
    }
    setCurrentContent(content)
    setHasChanges(false)
    setIsEditing(false)
    if (quillRef.current) {
      quillRef.current.enable(false)
    }
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Carregando editor...</p>
          </div>
        </CardContent>
      </Card>
    )
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
        <div 
          ref={editorRef}
          className="min-h-[300px] rich-editor-v2"
        />
        
        {!currentContent.trim() && !isEditing && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
            <div className="text-center">
              <Edit3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum conteúdo adicionado ainda</p>
              <p className="text-sm">Clique em "Editar" para começar</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}