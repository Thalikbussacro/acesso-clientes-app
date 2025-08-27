'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
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

// Global DOM-based registry to prevent duplicate initialization
const GLOBAL_QUILL_INSTANCES = new Set<string>()

// Cleanup function for page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    GLOBAL_QUILL_INSTANCES.clear()
  })
}

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
  
  // Generate stable editor ID based on access point and a random suffix
  const editorId = useMemo(() => {
    const cleanName = accessPointName?.replace(/[^a-zA-Z0-9]/g, '-') || 'default'
    const randomSuffix = Math.random().toString(36).substr(2, 9)
    return `quill-${cleanName}-${randomSuffix}`
  }, [accessPointName])
  
  // Instance tracking refs
  const isInitializingRef = useRef(false)
  const isInitializedRef = useRef(false)
  
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
      'color', 'background', 'list', 'align',
      'blockquote', 'code-block', 'link'
    ],
  }

  // Destroy Quill instance
  const destroyQuill = useCallback(() => {
    console.log(`RichEditor[${editorId}]: Destroying Quill instance...`)
    
    if (quillRef.current) {
      // Remove all event listeners
      quillRef.current.off('text-change')
      quillRef.current = null
    }
    
    // Clean up DOM
    if (editorRef.current) {
      // Remove any Quill-generated content
      const toolbars = editorRef.current.querySelectorAll('.ql-toolbar')
      toolbars.forEach(toolbar => toolbar.remove())
      
      const containers = editorRef.current.querySelectorAll('.ql-container')
      containers.forEach(container => container.remove())
      
      // Reset the element
      editorRef.current.innerHTML = ''
      editorRef.current.className = editorRef.current.className.replace(/ql-\w+/g, '').trim()
      editorRef.current.removeAttribute('data-quill-initialized')
    }
    
    // Clear initialization state and remove from global registry
    GLOBAL_QUILL_INSTANCES.delete(editorId)
    isInitializedRef.current = false
    isInitializingRef.current = false
    
    console.log(`RichEditor[${editorId}]: Quill instance destroyed`)
  }, [editorId])

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

  // Initialize Quill when element is available
  const initializeQuill = useCallback(async () => {
    const element = editorRef.current
    if (!element) {
      console.log(`RichEditor[${editorId}]: No element available for initialization`)
      return
    }

    // ROBUST CHECK: if element already has a Quill container or is marked as initialized, abort
    const hasQuillContainer = element.classList.contains('ql-container') || element.querySelector('.ql-container')
    const isMarkedInitialized = element.dataset.quillInitialized === 'true'
    const isInGlobalRegistry = GLOBAL_QUILL_INSTANCES.has(editorId)
    
    if (hasQuillContainer || isMarkedInitialized || isInGlobalRegistry) {
      console.log(`RichEditor[${editorId}]: Already initialized (container: ${hasQuillContainer}, marked: ${isMarkedInitialized}, registry: ${isInGlobalRegistry}), skipping`)
      return
    }

    // Additional safety check: scan for any existing toolbars in this specific element tree
    const existingToolbar = element.querySelector('.ql-toolbar')
    if (existingToolbar) {
      console.log(`RichEditor[${editorId}]: Found existing toolbar in element tree, removing it`)
      existingToolbar.remove()
    }

    // Prevent concurrent initialization
    if (isInitializingRef.current || isInitializedRef.current) {
      console.log(`RichEditor[${editorId}]: Already initializing or initialized, skipping`)
      return
    }

    // Mark element as being initialized and add to global registry
    element.dataset.quillInitialized = 'initializing'
    GLOBAL_QUILL_INSTANCES.add(editorId)

    console.log(`RichEditor[${editorId}]: Starting Quill initialization...`)
    isInitializingRef.current = true

    try {
      // Clean up any existing Quill instance in this element only
      if (quillRef.current) {
        quillRef.current.off('text-change')
        quillRef.current = null
      }
      
      // Clean up only this element's Quill content
      if (element.classList.contains('ql-container') || element.classList.contains('ql-editor')) {
        console.log(`RichEditor[${editorId}]: Clearing Quill classes from target element`)
        element.className = element.className.replace(/ql-\w+/g, '').trim()
        element.innerHTML = ''
      }

      console.log(`RichEditor[${editorId}]: Importing Quill...`)
      // Dynamic import to avoid SSR issues
      const Quill = (await import('quill')).default
      console.log(`RichEditor[${editorId}]: Quill imported successfully`)
      
      // Small delay to ensure DOM cleanup is processed
      await new Promise(resolve => setTimeout(resolve, 50))
      
      console.log(`RichEditor[${editorId}]: Creating Quill instance...`)
      // Create Quill instance
      const quill = new Quill(element, quillConfig) as unknown as QuillInstance
      quillRef.current = quill
      console.log(`RichEditor[${editorId}]: Quill instance created`)

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

      isInitializedRef.current = true
      // Mark element as successfully initialized
      if (editorRef.current) {
        editorRef.current.dataset.quillInitialized = 'true'
      }
      console.log(`RichEditor[${editorId}]: Initialization complete, setting isLoading to false`)
      setIsLoading(false)
    } catch (error) {
      console.error(`RichEditor[${editorId}]: Error initializing Quill:`, error)
      // Remove from global registry on failure
      GLOBAL_QUILL_INSTANCES.delete(editorId)
      // Mark element as failed
      if (editorRef.current) {
        editorRef.current.dataset.quillInitialized = 'failed'
      }
      setIsLoading(false)
    } finally {
      isInitializingRef.current = false
    }
  }, [editorId, content, isEditing, readOnly, onChange, autoSave, autoSaveDelay, originalContent, onSave, destroyQuill])

  // Single effect to initialize Quill when element is ready
  useEffect(() => {
    console.log(`RichEditor[${editorId}]: useEffect for initialization, editorRef.current:`, editorRef.current, 'initialized:', isInitializedRef.current)
    
    // Only initialize if element exists and not already initialized
    if (editorRef.current && !isInitializedRef.current && !isInitializingRef.current) {
      console.log(`RichEditor[${editorId}]: Element ready, calling initializeQuill`)
      
      // Small delay to handle React StrictMode double mounting
      const initTimer = setTimeout(() => {
        // Triple check: element exists, not initialized, and not in global registry
        if (editorRef.current && 
            !isInitializedRef.current && 
            !isInitializingRef.current && 
            !GLOBAL_QUILL_INSTANCES.has(editorId)) {
          initializeQuill()
        } else {
          console.log(`RichEditor[${editorId}]: Skipping delayed initialization - already handled`)
        }
      }, 10)
      
      return () => clearTimeout(initTimer)
    }
  }, [editorId, initializeQuill])

  // Cleanup on unmount with StrictMode protection
  useEffect(() => {
    let cleanupExecuted = false
    
    return () => {
      if (cleanupExecuted) {
        console.log(`RichEditor[${editorId}]: Cleanup already executed (StrictMode double cleanup), skipping`)
        return
      }
      
      cleanupExecuted = true
      console.log(`RichEditor[${editorId}]: Component unmounting, cleaning up...`)
      
      // Clear auto-save timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      // Clean up Quill instance
      destroyQuill()
    }
  }, [editorId, destroyQuill])

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

  // This effect is now handled by the access point change effect above

  // Update content when access point changes without reinitializing
  useEffect(() => {
    if (quillRef.current && isInitializedRef.current) {
      console.log(`RichEditor[${editorId}]: Access point changed, updating content only`)
      // Just update the content, don't reinitialize the entire editor
      if (content) {
        try {
          const delta = JSON.parse(content)
          quillRef.current.setContents(delta)
        } catch {
          quillRef.current.root.innerHTML = content
        }
      } else {
        quillRef.current.root.innerHTML = ''
      }
      setCurrentContent(content)
      setOriginalContent(content)
      setHasChanges(false)
    }
  }, [editorId, content])

  // Update read-only state
  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!readOnly && isEditing)
    }
  }, [readOnly, isEditing])

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