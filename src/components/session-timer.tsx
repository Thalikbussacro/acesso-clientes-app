'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertTriangle, LogOut } from 'lucide-react'
import { 
  cleanupDatabaseSession, 
  setupUnloadCleanup 
} from '@/lib/session-cleanup'

interface SessionData {
  databaseId: string
  sessionStart: number
  timeoutMinutes: number
  sessionToken: string
  expiresAt: number
}

interface SessionTimerProps {
  databaseId: string
  onSessionExpired: () => void
  onRevalidationNeeded: () => void
}

export function SessionTimer({ databaseId, onSessionExpired, onRevalidationNeeded }: SessionTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [totalTime, setTotalTime] = useState<number>(0)
  const [isExpired, setIsExpired] = useState(false)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const broadcastRef = useRef<BroadcastChannel | null>(null)
  const revalidationShownRef = useRef(false)

  // Initialize BroadcastChannel for cross-tab synchronization
  const initializeBroadcast = useCallback(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(`session_${databaseId}`)
      
      channel.onmessage = (event) => {
        const { type, data } = event.data
        
        switch (type) {
          case 'SESSION_UPDATED':
            // Another tab updated the session
            if (data.expiresAt) {
              setTimeRemaining(Math.max(0, data.expiresAt - Date.now()))
              setTotalTime(data.timeoutMinutes * 60 * 1000)
              setSessionData(data)
            }
            break
            
          case 'SESSION_EXPIRED':
            // Another tab detected session expiry
            handleSessionExpiry()
            break
            
          case 'SESSION_REVALIDATED':
            // Another tab successfully revalidated
            if (data.expiresAt) {
              setTimeRemaining(data.expiresAt - Date.now())
              setTotalTime(data.timeoutMinutes * 60 * 1000)
              revalidationShownRef.current = false
              setIsExpired(false)
              setSessionData(data)
            }
            break
            
          case 'LOGOUT':
            // Another tab logged out
            handleLogout()
            break
        }
      }
      
      broadcastRef.current = channel
      return channel
    }
    return null
  }, [databaseId])
  
  // Handle session expiry
  const handleSessionExpiry = useCallback(async () => {
    setIsExpired(true)
    setTimeRemaining(0)
    
    // Perform comprehensive session cleanup
    try {
      await cleanupDatabaseSession(databaseId)
      console.log('Database session cleaned up successfully')
    } catch (error) {
      console.error('Error during session cleanup:', error)
    }
    
    // Broadcast expiry to other tabs
    broadcastRef.current?.postMessage({
      type: 'SESSION_EXPIRED',
      data: { databaseId }
    })
    
    // Notify parent component
    onSessionExpired()
  }, [databaseId, onSessionExpired])

  // Handle manual logout
  const handleLogout = useCallback(async () => {
    // Perform comprehensive session cleanup
    try {
      await cleanupDatabaseSession(databaseId)
      console.log('Manual logout cleanup completed successfully')
    } catch (error) {
      console.error('Error during logout cleanup:', error)
    }
    
    // Broadcast logout to other tabs
    broadcastRef.current?.postMessage({
      type: 'LOGOUT',
      data: { databaseId }
    })
    
    // Navigate back to databases page
    router.push('/databases')
  }, [databaseId, router])

  // Load session data from localStorage
  const loadSessionData = useCallback(() => {
    const sessionKey = `db_session_${databaseId}`
    const storedData = localStorage.getItem(sessionKey)
    
    if (storedData) {
      try {
        const data: SessionData = JSON.parse(storedData)
        const now = Date.now()
        const remaining = Math.max(0, data.expiresAt - now)
        
        setSessionData(data)
        setTimeRemaining(remaining)
        setTotalTime(data.timeoutMinutes * 60 * 1000)
        
        if (remaining <= 0) {
          handleSessionExpiry()
        }
        
        return data
      } catch (error) {
        console.error('Error parsing session data:', error)
        handleSessionExpiry()
      }
    } else {
      // No session data found
      handleSessionExpiry()
    }
    
    return null
  }, [databaseId, handleSessionExpiry])

  // Update session data in localStorage and broadcast to other tabs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateSessionData = useCallback((data: Partial<SessionData>) => {
    const sessionKey = `db_session_${databaseId}`
    const currentData = sessionData || loadSessionData()
    
    if (currentData) {
      const updatedData = { ...currentData, ...data }
      localStorage.setItem(sessionKey, JSON.stringify(updatedData))
      setSessionData(updatedData)
      
      // Broadcast to other tabs
      broadcastRef.current?.postMessage({
        type: 'SESSION_UPDATED',
        data: updatedData
      })
    }
  }, [databaseId, sessionData, loadSessionData])

  // Handle revalidation success
  const handleRevalidationSuccess = useCallback((newSessionData: SessionData) => {
    const now = Date.now()
    const updatedData = {
      ...newSessionData,
      expiresAt: now + (newSessionData.timeoutMinutes * 60 * 1000)
    }
    
    // Update localStorage
    const sessionKey = `db_session_${databaseId}`
    localStorage.setItem(sessionKey, JSON.stringify(updatedData))
    
    // Update state
    setSessionData(updatedData)
    setTimeRemaining(updatedData.expiresAt - now)
    setTotalTime(updatedData.timeoutMinutes * 60 * 1000)
    revalidationShownRef.current = false
    setIsExpired(false)
    
    // Broadcast to other tabs
    broadcastRef.current?.postMessage({
      type: 'SESSION_REVALIDATED',
      data: updatedData
    })
  }, [databaseId])


  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (totalTime === 0) return 0
    return Math.max(0, (timeRemaining / totalTime) * 100)
  }

  // Get timer color based on remaining time
  const getTimerColor = () => {
    const percentage = getProgressPercentage()
    if (percentage <= 10) return 'text-red-600'
    if (percentage <= 25) return 'text-orange-600'
    return 'text-blue-600'
  }

  // Get progress bar color
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getProgressColor = () => {
    const percentage = getProgressPercentage()
    if (percentage <= 10) return 'bg-red-500'
    if (percentage <= 25) return 'bg-orange-500'
    return 'bg-blue-500'
  }

  // Main timer update effect
  useEffect(() => {
    // Initialize broadcast channel
    const channel = initializeBroadcast()
    
    // Load initial session data
    loadSessionData()
    
    // Setup cleanup on page unload
    const cleanupUnloadListeners = setupUnloadCleanup(databaseId)
    
    // Set up timer interval
    intervalRef.current = setInterval(() => {
      const sessionKey = `db_session_${databaseId}`
      const storedData = localStorage.getItem(sessionKey)
      
      if (storedData) {
        try {
          const data: SessionData = JSON.parse(storedData)
          const now = Date.now()
          const remaining = Math.max(0, data.expiresAt - now)
          
          setTimeRemaining(remaining)
          
          // Check if we should show revalidation modal (1 minute remaining)
          if (remaining <= 60000 && remaining > 0 && !revalidationShownRef.current) {
            revalidationShownRef.current = true
            onRevalidationNeeded()
          }
          
          // Check if session expired
          if (remaining <= 0) {
            handleSessionExpiry()
          }
        } catch (error) {
          console.error('Error parsing session data in timer:', error)
          handleSessionExpiry()
        }
      } else {
        handleSessionExpiry()
      }
    }, 1000)
    
    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (channel) {
        channel.close()
      }
      // Clean up unload listeners
      cleanupUnloadListeners()
    }
  }, [databaseId, initializeBroadcast, loadSessionData, handleSessionExpiry, onRevalidationNeeded])

  // Expose revalidation success handler to parent
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__sessionTimerRevalidationSuccess = handleRevalidationSuccess
    
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__sessionTimerRevalidationSuccess
    }
  }, [handleRevalidationSuccess])

  if (isExpired) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
        </div>
        <Button onClick={handleLogout} size="sm" variant="ghost" className="text-xs text-red-600 hover:text-red-800">
          <LogOut className="h-3 w-3 mr-1" />
          Expirada
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Circular Progress Timer */}
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
          {/* Background circle */}
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 14}`}
            strokeDashoffset={`${2 * Math.PI * 14 * (1 - getProgressPercentage() / 100)}`}
            className={`transition-all duration-1000 ${getTimerColor()}`}
          />
        </svg>
        
        {/* Timer text inside circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-mono font-semibold ${getTimerColor()}`}>
            {timeRemaining >= 60000 
              ? Math.floor(timeRemaining / 60000)
              : Math.floor(timeRemaining / 1000)
            }
          </span>
        </div>
      </div>
      
      {/* Compact actions */}
      <Button onClick={handleLogout} size="sm" variant="ghost" className="text-xs text-gray-500 hover:text-gray-700 px-2">
        <LogOut className="h-3 w-3 mr-1" />
        Sair
      </Button>
    </div>
  )
}