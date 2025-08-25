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
  User,
  Shield
} from 'lucide-react'
import { sanitizeContent, getContentStats, CONTENT_LIMITS } from '@/lib/content-security'

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
  console.log('RichEditor: Component initialized with props:', { content: content?.substring(0, 50), readOnly, accessPointName })
  
  const editorRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<QuillInstance | null>(null)
  const [isEditing, setIsEditing] = useState(!readOnly)
  const [hasChanges, setHasChanges] = useState(false)
  const [currentContent, setCurrentContent] = useState(content)
  const [originalContent, setOriginalContent] = useState(content)
  const [isLoading, setIsLoading] = useState(true)
  const [contentStats, setContentStats] = useState(() => getContentStats(content))
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [contentErrors, setContentErrors] = useState<string[]>([])
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

  // Initialize Quill when element is available
  const initializeQuill = useCallback(async (element: HTMLDivElement) => {
    console.log('RichEditor: Starting Quill initialization...')
    
    if (quillRef.current) {
      console.log('RichEditor: Quill already initialized, skipping')
      return
    }

    try {
      console.log('RichEditor: Importing Quill...')
      // Dynamic import to avoid SSR issues
      const Quill = (await import('quill')).default
      console.log('RichEditor: Quill imported successfully')
      
      console.log('RichEditor: Creating Quill instance...')
      // Create Quill instance
      const quill = new Quill(element, quillConfig) as unknown as QuillInstance
      quillRef.current = quill
      console.log('RichEditor: Quill instance created')

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
          
          // Sanitize content for security
          const sanitizedContent = sanitizeContent(htmlContent)
          
          // Update content stats
          const stats = getContentStats(sanitizedContent)
          setContentStats(stats)
          
          // Check for content limit violations
          const errors: string[] = []
          if (!stats.isWithinLimits) {
            if (sanitizedContent.length > CONTENT_LIMITS.MAX_LENGTH) {
              errors.push(`Conteúdo excede ${CONTENT_LIMITS.MAX_LENGTH} caracteres`)
            }
            if (stats.wordCount > CONTENT_LIMITS.MAX_WORD_COUNT) {
              errors.push(`Conteúdo excede ${CONTENT_LIMITS.MAX_WORD_COUNT} palavras`)
            }
            if (stats.paragraphCount > CONTENT_LIMITS.MAX_PARAGRAPH_COUNT) {
              errors.push(`Conteúdo excede ${CONTENT_LIMITS.MAX_PARAGRAPH_COUNT} parágrafos`)
            }
          }
          setContentErrors(errors)
          
          setCurrentContent(sanitizedContent)
          setHasChanges(sanitizedContent !== originalContent)
          
          onChange?.(sanitizedContent)
          
          // Handle auto-save (only if content is valid)
          if (autoSave && isEditing && !readOnly && errors.length === 0) {
            setAutoSaveStatus('unsaved')
            
            // Clear existing timeout
            if (autoSaveTimeoutRef.current) {
              clearTimeout(autoSaveTimeoutRef.current)
            }
            
            // Set new timeout
            autoSaveTimeoutRef.current = setTimeout(() => {
              handleAutoSave(sanitizedContent)
            }, autoSaveDelay)
          }
        }

        quill.on('text-change', handleTextChange)

        // Initial stats calculation
        const initialContent = content || ''
        const initialStats = getContentStats(initialContent)
        setContentStats(initialStats)

      console.log('RichEditor: Initialization complete, setting isLoading to false')
      setIsLoading(false)
    } catch (error) {
      console.error('RichEditor: Error initializing Quill:', error)
      setIsLoading(false)
    }
  }, [content, isEditing, readOnly])

  // Effect to initialize Quill when element is ready
  useEffect(() => {
    console.log('RichEditor: useEffect for initialization, editorRef.current:', editorRef.current)
    
    if (editorRef.current && !quillRef.current) {
      console.log('RichEditor: Element ready, calling initializeQuill')
      initializeQuill(editorRef.current)
      return
    }
    
    // If element is not ready yet, try again after a short delay
    if (!editorRef.current && !quillRef.current) {
      console.log('RichEditor: Element not ready, trying again in 100ms')
      const timer = setTimeout(() => {
        if (editorRef.current && !quillRef.current) {
          console.log('RichEditor: Element ready after timeout, calling initializeQuill')
          initializeQuill(editorRef.current)
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [initializeQuill])

  // Additional effect to check for element availability
  useEffect(() => {
    const checkElement = () => {
      console.log('RichEditor: Checking element availability, editorRef.current:', editorRef.current)
      if (editorRef.current && !quillRef.current) {
        console.log('RichEditor: Element found, initializing Quill')
        initializeQuill(editorRef.current)
      }
    }
    
    // Check immediately
    checkElement()
    
    // Check again after DOM updates
    const timer = setTimeout(checkElement, 0)
    
    return () => clearTimeout(timer)
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
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

  console.log('RichEditor: Rendering component, isLoading:', isLoading)

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
                      disabled={!hasChanges || contentErrors.length > 0}
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
            <span className={contentStats.wordCount > CONTENT_LIMITS.MAX_WORD_COUNT ? 'text-red-600' : ''}>
              {contentStats.wordCount} palavras
            </span>
            <span className={contentStats.characterCount > CONTENT_LIMITS.MAX_LENGTH ? 'text-red-600' : ''}>
              {contentStats.characterCount} caracteres
            </span>
            {contentStats.paragraphCount > 0 && (
              <span className={contentStats.paragraphCount > CONTENT_LIMITS.MAX_PARAGRAPH_COUNT ? 'text-red-600' : ''}>
                {contentStats.paragraphCount} parágrafos
              </span>
            )}
            {!contentStats.isWithinLimits && (
              <Badge variant="destructive" className="ml-2">
                <Shield className="h-3 w-3 mr-1" />
                Limite excedido
              </Badge>
            )}
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
        {/* Content Errors */}
        {contentErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                Erros de Validação de Conteúdo
              </span>
            </div>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
              {contentErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
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
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Carregando editor...</p>
              </div>
            </div>
          )}
          
          {/* Empty state */}
          {!isLoading && !currentContent.trim() && !isEditing && (
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