'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Edit3, 
  Save, 
  X, 
  Eye, 
  AlertCircle,
  Clock,
  User
} from 'lucide-react'

// Quill types (using actual Quill interface)
interface QuillInstance {
  root: HTMLElement
  getContents(): Record<string, unknown>
  setContents(delta: Record<string, unknown>): void
  getText(): string
  enable(enabled?: boolean): void
  focus(): void
  on(eventName: string, handler: (...args: unknown[]) => void): void
  off(eventName: string, handler?: (...args: unknown[]) => void): void
  format(name: string, value: unknown): void
  removeFormat(): void
  updateContents(delta: Record<string, unknown>): void
}

interface RichEditorProps {
  content?: string
  placeholder?: string
  readOnly?: boolean
  onSave?: (content: string) => void
  onCancel?: () => void
  onChange?: (content: string) => void
  className?: string
  autoSave?: boolean
  autoSaveDelay?: number
  accessPointName?: string
  lastEditedBy?: string
  lastEditedAt?: string
  maxHeight?: number
}

export function RichEditor({
  content = '',
  placeholder = 'Comece a escrever...',
  readOnly = false,
  onSave,
  onCancel,
  onChange,
  className = '',
  autoSave = false,
  autoSaveDelay = 3000,
  accessPointName = 'Documento',
  lastEditedBy,
  lastEditedAt,
  maxHeight = 400,
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<QuillInstance | null>(null)
  const [isEditing, setIsEditing] = useState(!readOnly)
  const [hasChanges, setHasChanges] = useState(false)
  const [currentContent, setCurrentContent] = useState(content)
  const [originalContent, setOriginalContent] = useState(content)
  const [isLoading, setIsLoading] = useState(true)
  const [wordCount, setWordCount] = useState(0)
  const [characterCount, setCharacterCount] = useState(0)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Quill configuration
  const quillConfig = {
    theme: 'snow',
    placeholder,
    modules: {
      toolbar: {
        container: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'align': [] }],
          ['blockquote', 'code-block'],
          ['link'],
          ['clean']
        ],
      },
      history: {
        delay: 2000,
        maxStack: 500,
        userOnly: true
      },
    },
    formats: [
      'header', 'bold', 'italic', 'underline', 'strike',
      'color', 'background', 'list', 'bullet', 'align',
      'blockquote', 'code-block', 'link'
    ],
  }

  // Initialize Quill
  useEffect(() => {
    const initializeQuill = async () => {
      if (!editorRef.current || quillRef.current) return

      try {
        // Dynamic import to avoid SSR issues
        const Quill = (await import('quill')).default
        
        // Create Quill instance
        const quill = new Quill(editorRef.current, quillConfig) as unknown as QuillInstance
        quillRef.current = quill

        // Set initial content
        if (content) {
          try {
            // Try to parse as Delta first
            const delta = JSON.parse(content)
            quill.setContents(delta)
          } catch {
            // If not JSON, treat as HTML/text
            quill.root.innerHTML = content
          }
        }

        // Set read-only state
        quill.enable(!readOnly && isEditing)

        // Set up change handler
        const handleTextChange = () => {
          const htmlContent = quill.root.innerHTML
          const textContent = quill.getText()
          
          setCurrentContent(htmlContent)
          setHasChanges(htmlContent !== originalContent)
          setWordCount(textContent.trim().split(/\s+/).filter(word => word.length > 0).length)
          setCharacterCount(textContent.length)
          
          onChange?.(htmlContent)
          
          // Handle auto-save
          if (autoSave && isEditing && !readOnly) {
            setAutoSaveStatus('unsaved')
            
            // Clear existing timeout
            if (autoSaveTimeoutRef.current) {
              clearTimeout(autoSaveTimeoutRef.current)
            }
            
            // Set new timeout
            autoSaveTimeoutRef.current = setTimeout(() => {
              handleAutoSave(htmlContent)
            }, autoSaveDelay)
          }
        }

        quill.on('text-change', handleTextChange)

        // Initial stats calculation
        const initialText = quill.getText()
        setWordCount(initialText.trim().split(/\s+/).filter(word => word.length > 0).length)
        setCharacterCount(initialText.length)

        setIsLoading(false)
      } catch (error) {
        console.error('Error initializing Quill:', error)
        setIsLoading(false)
      }
    }

    initializeQuill()

    // Cleanup
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Browser beforeunload handler for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges && isEditing) {
        e.preventDefault()
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges, isEditing])

  // Update content when prop changes
  useEffect(() => {
    if (quillRef.current && content !== currentContent) {
      try {
        const delta = JSON.parse(content)
        quillRef.current.setContents(delta)
      } catch {
        quillRef.current.root.innerHTML = content
      }
      setCurrentContent(content)
      setOriginalContent(content)
      setHasChanges(false)
    }
  }, [content, currentContent])

  // Update read-only state
  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!readOnly && isEditing)
    }
  }, [readOnly, isEditing])

  // Auto-save handler
  const handleAutoSave = useCallback(async (content: string) => {
    if (!onSave) return
    
    setAutoSaveStatus('saving')
    try {
      await onSave(content)
      setAutoSaveStatus('saved')
      setOriginalContent(content)
      setHasChanges(false)
    } catch (error) {
      console.error('Auto-save failed:', error)
      setAutoSaveStatus('unsaved')
    }
  }, [onSave])

  // Confirmation dialog for unsaved changes
  const confirmWithUnsavedChanges = (action: () => void) => {
    if (hasChanges && isEditing) {
      setPendingAction(() => action)
      setShowUnsavedDialog(true)
    } else {
      action()
    }
  }

  const handleConfirmDiscard = () => {
    setShowUnsavedDialog(false)
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
  }

  const handleCancelDiscard = () => {
    setShowUnsavedDialog(false)
    setPendingAction(null)
  }

  // Handle edit mode toggle
  const handleEdit = () => {
    setIsEditing(true)
    if (quillRef.current) {
      quillRef.current.enable(true)
      quillRef.current.focus()
    }
  }

  // Handle save
  const handleSave = async () => {
    if (!hasChanges || !onSave) return

    try {
      await onSave(currentContent)
      setOriginalContent(currentContent)
      setHasChanges(false)
      setIsEditing(false)
      setAutoSaveStatus('saved')
      
      if (quillRef.current) {
        quillRef.current.enable(false)
      }
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    const performCancel = () => {
      if (quillRef.current) {
        try {
          const delta = JSON.parse(originalContent)
          quillRef.current.setContents(delta)
        } catch {
          quillRef.current.root.innerHTML = originalContent
        }
      }
      
      setCurrentContent(originalContent)
      setHasChanges(false)
      setIsEditing(false)
      setAutoSaveStatus('saved')
      
      if (quillRef.current) {
        quillRef.current.enable(false)
      }
      
      onCancel?.()
    }

    confirmWithUnsavedChanges(performCancel)
  }

  // Format last edited info
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
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            {accessPointName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
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
              <Badge variant="secondary" className="ml-2">
                <AlertCircle className="h-3 w-3 mr-1" />
                Não salvo
              </Badge>
            )}
            {autoSave && autoSaveStatus === 'saving' && (
              <Badge variant="outline" className="ml-2">
                <Clock className="h-3 w-3 mr-1 animate-spin" />
                Salvando...
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {!readOnly && (
              <>
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
                      disabled={!hasChanges}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      size="sm"
                      disabled={!hasChanges}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Metadata */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{wordCount} palavras</span>
            <span>{characterCount} caracteres</span>
          </div>
          {formatLastEdited() && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{formatLastEdited()}</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="relative">
          {/* Quill Editor */}
          <div 
            ref={editorRef}
            className={`
              rich-editor
              ${isEditing ? 'editing' : 'read-only'}
              min-h-[200px]
            `}
            style={{ 
              maxHeight: isEditing ? `${maxHeight}px` : 'none',
              overflow: isEditing ? 'auto' : 'visible'
            }}
          />
          
          {/* Empty state */}
          {!currentContent.trim() && !isEditing && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Edit3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum conteúdo adicionado ainda</p>
                {!readOnly && (
                  <Button 
                    onClick={handleEdit} 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2"
                  >
                    Clique para editar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Alterações Não Salvas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas neste documento. Se continuar, todas as alterações serão perdidas.
              <br /><br />
              Deseja salvar suas alterações antes de continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDiscard}>
              Continuar Editando
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={async () => {
                if (onSave) {
                  try {
                    await onSave(currentContent)
                    setOriginalContent(currentContent)
                    setHasChanges(false)
                    setAutoSaveStatus('saved')
                    handleConfirmDiscard()
                  } catch (error) {
                    console.error('Failed to save:', error)
                  }
                } else {
                  handleConfirmDiscard()
                }
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar e Continuar
            </Button>
            <AlertDialogAction
              onClick={handleConfirmDiscard}
              className="bg-red-600 hover:bg-red-700"
            >
              Descartar Alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}