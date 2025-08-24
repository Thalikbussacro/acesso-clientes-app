'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
// import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  Clock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle,
  XCircle 
} from 'lucide-react'

interface SessionRevalidationModalProps {
  isOpen: boolean
  onClose: () => void
  databaseId: string
  databaseName: string
  onRevalidationSuccess: (sessionData: SessionData) => void
  onForceLogout: () => void
}

interface SessionData {
  databaseId: string
  sessionStart: number
  timeoutMinutes: number
  sessionToken: string
  expiresAt: number
}

export function SessionRevalidationModal({
  isOpen,
  onClose,
  databaseId,
  databaseName,
  onRevalidationSuccess,
  onForceLogout
}: SessionRevalidationModalProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(60) // 60 seconds countdown
  const [isExpired, setIsExpired] = useState(false)
  
  // const router = useRouter() // May be needed for future navigation features
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const modalOpenTimeRef = useRef<number>(0)

  // Start countdown when modal opens
  useEffect(() => {
    if (isOpen) {
      modalOpenTimeRef.current = Date.now()
      setCountdown(60)
      setIsExpired(false)
      setPassword('')
      setError(null)
      
      countdownIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - modalOpenTimeRef.current) / 1000)
        const remaining = Math.max(0, 60 - elapsed)
        
        setCountdown(remaining)
        
        if (remaining <= 0) {
          handleTimeout()
        }
      }, 1000)
    } else {
      // Clean up countdown when modal closes
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [isOpen])

  // Handle timeout (60 seconds elapsed)
  const handleTimeout = useCallback(() => {
    setIsExpired(true)
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    
    // Force logout after a short delay to show the expired message
    setTimeout(() => {
      onForceLogout()
    }, 2000)
  }, [onForceLogout])

  // Handle password validation and session renewal
  const handleRevalidation = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password.trim()) {
      setError('Digite a senha da base de dados')
      return
    }

    if (isExpired) {
      setError('Tempo esgotado. Redirecionando...')
      return
    }

    setIsValidating(true)
    setError(null)

    try {
      const response = await fetch(`/api/databases/${databaseId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Create new session data with extended time
        const now = Date.now()
        const newSessionData: SessionData = {
          databaseId,
          sessionStart: now,
          timeoutMinutes: data.database.timeoutMinutes,
          sessionToken: data.sessionToken,
          expiresAt: now + (data.database.timeoutMinutes * 60 * 1000)
        }

        // Update localStorage
        const sessionKey = `db_session_${databaseId}`
        localStorage.setItem(sessionKey, JSON.stringify(newSessionData))

        // Notify parent component about successful revalidation
        onRevalidationSuccess(newSessionData)

        // Close modal
        onClose()
        
        // Clear password for security
        setPassword('')
        
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Senha incorreta')
        setPassword('')
      }
    } catch {
      setError('Erro de conexão ao validar senha')
    } finally {
      setIsValidating(false)
    }
  }, [password, isExpired, databaseId, onRevalidationSuccess, onClose])

  // Handle manual close (if user clicks outside or presses escape)
  const handleModalClose = useCallback(() => {
    if (!isExpired && !isValidating) {
      // Allow manual close only if not expired and not validating
      onClose()
    }
  }, [isExpired, isValidating, onClose])

  // Calculate progress for countdown
  const getCountdownProgress = () => {
    return ((60 - countdown) / 60) * 100
  }

  // Get countdown color based on remaining time
  const getCountdownColor = () => {
    if (countdown <= 10) return 'text-red-600'
    if (countdown <= 30) return 'text-orange-600'
    return 'text-blue-600'
  }

  // Format countdown display
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    return `${secs}s`
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleModalClose}
    >
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => {
          // Prevent closing if expired or validating
          if (isExpired || isValidating) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing with escape if expired or validating
          if (isExpired || isValidating) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isExpired ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : (
              <Shield className="h-5 w-5 text-orange-600" />
            )}
            {isExpired ? 'Sessão Expirada' : 'Revalidação de Sessão'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Database info */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Base de dados</p>
            <p className="font-semibold text-gray-900">{databaseName}</p>
          </div>

          {/* Countdown display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${getCountdownColor()}`} />
                <span className="text-sm text-gray-600">
                  {isExpired ? 'Tempo esgotado' : 'Tempo restante'}
                </span>
              </div>
              <span className={`font-mono font-bold ${getCountdownColor()}`}>
                {formatCountdown(countdown)}
              </span>
            </div>
            <Progress 
              value={getCountdownProgress()} 
              className="h-2"
            />
          </div>

          {isExpired ? (
            /* Expired state */
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Tempo esgotado para revalidação. Você será redirecionado para fazer login novamente.
              </AlertDescription>
            </Alert>
          ) : (
            /* Active revalidation form */
            <form onSubmit={handleRevalidation} className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Sua sessão expirará em breve. Digite a senha da base de dados para continuar:
                </p>
                
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a senha da base de dados"
                    disabled={isValidating || isExpired}
                    className="pr-12"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isValidating || isExpired}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onForceLogout()}
                  disabled={isValidating}
                  className="flex-1"
                >
                  Sair
                </Button>
                <Button
                  type="submit"
                  disabled={isValidating || isExpired || !password.trim()}
                  className="flex-1"
                >
                  {isValidating ? (
                    <>
                      <Shield className="h-4 w-4 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Continuar Sessão
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Additional info */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Esta validação é necessária para manter sua sessão segura.</p>
            {!isExpired && (
              <p>Você pode fechar este modal, mas a sessão expirará automaticamente.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}