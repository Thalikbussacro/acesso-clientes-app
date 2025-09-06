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
  User
} from 'lucide-react'

interface QuillInstance {
  root: HTMLElement
  getContents(): Record<string, unknown>
  setContents(delta: Record<string, unknown>): void
  getText(): string
  enable(enabled?: boolean): void
  focus(): void
  on(eventName: string, handler: (...args: unknown[]) => void): void
  off(eventName: string, handler?: (...args: unknown[]) => void): void
}

interface RichEditorProps {
  content?: string
  placeholder?: string
  readOnly?: boolean
  onSave?: (content: string) => void
  onCancel?: () => void
  onChange?: (content: string) => void
  className?: string
  accessPointName?: string
  lastEditedBy?: string
  lastEditedAt?: string
}

// Global registry to prevent multiple initializations
const EDITOR_INSTANCES = new Map<string, QuillInstance>()
let editorIdCounter = 0

export function RichEditor({
  content = '',
  placeholder = 'Comece a escrever...',
  readOnly = false,
  onSave,
  onCancel,
  onChange,
  className = '',
  accessPointName = 'Documento',
  lastEditedBy,
  lastEditedAt,
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<QuillInstance | null>(null)
  const editorIdRef = useRef<string>('')
  const isInitializedRef = useRef(false)
  
  const [isEditing, setIsEditing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [currentContent, setCurrentContent] = useState(content)
  const [originalContent, setOriginalContent] = useState(content)
  const [isLoading, setIsLoading] = useState(true)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [componentKey, setComponentKey] = useState(0)

  // Generate unique editor ID
  if (!editorIdRef.current) {
    editorIdRef.current = `rich-editor-${++editorIdCounter}-${Date.now()}`
  }

  // Quill configuration
  const quillConfig = {
    theme: 'snow',
    placeholder,
    modules: {
      toolbar: [
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
    formats: [
      'header', 'bold', 'italic', 'underline', 'strike',
      'color', 'background', 'list', 'align',
      'blockquote', 'code-block', 'link'
    ],
  }

  // Cleanup function
  const cleanup = useCallback(() => {
    const editorId = editorIdRef.current
    console.log(`Cleaning up Quill editor: ${editorId}`)
    
    if (quillRef.current) {
      try {
        quillRef.current.off('text-change')
      } catch (e) {
        console.warn('Error removing Quill event listener:', e)
      }
      quillRef.current = null
    }

    if (editorRef.current) {
      // Remove all Quill-related elements from the editor and its parent, and even grandparent
      const element = editorRef.current
      const parent = element.parentElement
      const grandparent = parent?.parentElement
      
      // Search for toolbars in multiple levels
      const toolbars = [
        ...element.querySelectorAll('.ql-toolbar'),
        ...(parent ? parent.querySelectorAll('.ql-toolbar') : []),
        ...(grandparent ? grandparent.querySelectorAll('.ql-toolbar') : [])
      ]
      const containers = [
        ...element.querySelectorAll('.ql-container'),
        ...(parent ? parent.querySelectorAll('.ql-container') : []),
        ...(grandparent ? grandparent.querySelectorAll('.ql-container') : [])
      ]
      
      console.log(`Found ${toolbars.length} toolbars and ${containers.length} containers to remove`)
      
      // Force remove all Quill elements
      toolbars.forEach(toolbar => {
        console.log('Removing toolbar:', toolbar)
        toolbar.remove()
      })
      containers.forEach(container => {
        console.log('Removing container:', container)
        container.remove()
      })
      
      // Clear all content and classes from editor element
      element.innerHTML = ''
      element.className = element.className
        .split(' ')
        .filter(cls => !cls.startsWith('ql-'))
        .join(' ')
        
      // Force hide any remaining Quill elements with CSS
      const remainingQuillElements = document.querySelectorAll('.ql-toolbar, .ql-container')
      remainingQuillElements.forEach(el => {
        if (element.contains(el) || parent?.contains(el) || grandparent?.contains(el)) {
          (el as HTMLElement).style.display = 'none'
        }
      })
    }

    // Remove from global registry
    if (editorId && EDITOR_INSTANCES.has(editorId)) {
      EDITOR_INSTANCES.delete(editorId)
    }

    isInitializedRef.current = false
    console.log(`Cleanup completed for editor: ${editorId}`)
  }, [])

  // Initialize Quill
  const initializeQuill = useCallback(async () => {
    const editorId = editorIdRef.current
    const element = editorRef.current

    // Only initialize when in editing mode
    if (!isEditing || !element || !editorId) {
      console.log(`Skipping Quill initialization - isEditing: ${isEditing}, element: ${!!element}, editorId: ${editorId}`)
      return
    }
    
    // ALWAYS cleanup first to prevent multiple toolbars
    console.log(`Force cleanup before initializing Quill`)
    cleanup()
    
    // Double-check: remove any remaining Quill elements in the entire document
    const allToolbars = document.querySelectorAll('.ql-toolbar')
    const allContainers = document.querySelectorAll('.ql-container')
    console.log(`Found ${allToolbars.length} total toolbars and ${allContainers.length} total containers in document`)
    
    allToolbars.forEach(toolbar => {
      if (element.contains(toolbar) || toolbar.closest('.rich-editor')) {
        console.log('Removing orphaned toolbar:', toolbar)
        toolbar.remove()
      }
    })
    allContainers.forEach(container => {
      if (element.contains(container) || container.closest('.rich-editor')) {
        console.log('Removing orphaned container:', container)
        container.remove()
      }
    })
    
    // Clear element completely
    element.innerHTML = ''

    try {
      console.log(`Initializing Quill for editor: ${editorId}`)
      
      // Cleanup any existing content first
      element.innerHTML = ''
      
      // Dynamic import
      const Quill = (await import('quill')).default
      
      // Create Quill instance
      const quill = new Quill(element, quillConfig) as unknown as QuillInstance
      
      // Store references
      quillRef.current = quill
      EDITOR_INSTANCES.set(editorId, quill)
      isInitializedRef.current = true

      // Set initial content
      if (content) {
        try {
          const delta = JSON.parse(content)
          quill.setContents(delta)
        } catch {
          quill.root.innerHTML = content
        }
      }

      // Enable editor immediately since we're in editing mode
      quill.enable(true)

      // Handle text changes
      const handleTextChange = () => {
        const htmlContent = quill.root.innerHTML
        setCurrentContent(htmlContent)
        setHasChanges(htmlContent !== originalContent)
        onChange?.(htmlContent)
      }

      quill.on('text-change', handleTextChange)
      setIsLoading(false)
      
      console.log(`Quill initialized successfully for editor: ${editorId}`)

    } catch (error) {
      console.error('Error initializing Quill:', error)
      setIsLoading(false)
      // Clean up on error
      if (editorId && EDITOR_INSTANCES.has(editorId)) {
        EDITOR_INSTANCES.delete(editorId)
      }
      isInitializedRef.current = false
    }
  }, [content, isEditing, onChange, originalContent])

  // Initialize only when entering edit mode
  useEffect(() => {
    if (isEditing && !isInitializedRef.current && editorRef.current) {
      setIsLoading(true)
      initializeQuill()
    } else if (!isEditing) {
      // In read-only mode, clean up any existing instance and hide loading
      if (quillRef.current || isInitializedRef.current) {
        console.log(`Switching to read-only mode, cleaning up Quill instance`)
        cleanup()
      }
      setIsLoading(false)
    }
  }, [isEditing, initializeQuill, cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

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

  // Confirmation dialog handlers
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

  // Editor action handlers
  const handleEdit = () => {
    setIsEditing(true)
    if (quillRef.current) {
      quillRef.current.enable(true)
      quillRef.current.focus()
    }
  }

  const handleSave = async () => {
    if (!hasChanges || !onSave) return

    try {
      await onSave(currentContent)
      setOriginalContent(currentContent)
      setHasChanges(false)
      setIsEditing(false)
      
      // Force component refresh to clean any remaining Quill elements
      setTimeout(() => setComponentKey(prev => prev + 1), 100)
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

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
      
      // Force component refresh to clean any remaining Quill elements
      setTimeout(() => setComponentKey(prev => prev + 1), 100)
      
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

  return (
    <Card className={className} key={componentKey}>
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
        
        {formatLastEdited() && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{formatLastEdited()}</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {isEditing ? (
          <div className="relative">
            {/* Quill Editor - only render in editing mode */}
            <div 
              ref={editorRef}
              className={`min-h-[300px] rich-editor ${isEditing ? 'editing' : ''}`}
              style={{ 
                maxHeight: '500px',
                overflow: 'auto'
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
          </div>
        ) : (
          <div>
            {!isLoading && currentContent ? (
              /* Read-only content display */
              <div 
                className="min-h-[300px] p-4 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: currentContent }}
              />
            ) : !isLoading ? (
              /* Empty state */
              <div className="min-h-[300px] flex items-center justify-center text-muted-foreground">
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
            ) : (
              /* Loading state */
              <div className="min-h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p>Carregando editor...</p>
                </div>
              </div>
            )}
          </div>
        )}
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