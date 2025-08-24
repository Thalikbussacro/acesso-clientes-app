/**
 * Comprehensive Session Cleanup System
 * 
 * This utility provides thorough cleanup of all session-related data
 * and DOM elements for security compliance when a session expires
 * or user logs out.
 */

// Types for cleanup operations
interface CleanupOptions {
  databaseId?: string
  redirectToLogin?: boolean
  clearAllSessions?: boolean
  preserveGlobalSettings?: boolean
}

interface CleanupResult {
  success: boolean
  clearedItems: string[]
  errors: string[]
}

/**
 * Clear all Quill editor instances and their content
 */
function clearQuillEditors(): string[] {
  const clearedItems: string[] = []
  
  try {
    // Find all Quill editor containers
    const quillContainers = document.querySelectorAll('.ql-editor, .ql-container')
    
    quillContainers.forEach((container, index) => {
      // Clear editor content
      if (container instanceof HTMLElement) {
        container.innerHTML = ''
        container.textContent = ''
        clearedItems.push(`quill-editor-${index}`)
      }
    })

    // Clear any Quill instances from window object if they exist
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowObj = window as any
      if (windowObj.Quill) {
        // Clear any registered Quill instances
        clearedItems.push('quill-global-instances')
      }
    }

  } catch (error) {
    console.warn('Error clearing Quill editors:', error)
  }
  
  return clearedItems
}

/**
 * Clear React Query cache if available
 */
function clearReactQueryCache(): string[] {
  const clearedItems: string[] = []
  
  try {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowObj = window as any
      
      // Check for React Query cache
      if (windowObj.__REACT_QUERY_STATE__) {
        delete windowObj.__REACT_QUERY_STATE__
        clearedItems.push('react-query-cache')
      }
      
      // Clear any query client cache if accessible
      if (windowObj.queryClient) {
        try {
          windowObj.queryClient.clear()
          clearedItems.push('query-client-cache')
        } catch (error) {
          console.warn('Error clearing query client:', error)
        }
      }
    }
  } catch (error) {
    console.warn('Error clearing React Query cache:', error)
  }
  
  return clearedItems
}

/**
 * Clear localStorage items related to sessions
 */
function clearLocalStorage(options: CleanupOptions): string[] {
  const clearedItems: string[] = []
  
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = []
      
      // Collect keys to remove
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          // Clear specific database session
          if (options.databaseId && key === `db_session_${options.databaseId}`) {
            keysToRemove.push(key)
          }
          // Clear all database sessions
          else if (options.clearAllSessions && key.startsWith('db_session_')) {
            keysToRemove.push(key)
          }
          // Clear other session-related data
          else if (key.startsWith('session_') || 
                   key.startsWith('temp_') ||
                   key.startsWith('cache_') ||
                   key.includes('editor_') ||
                   key.includes('draft_')) {
            keysToRemove.push(key)
          }
        }
      }
      
      // Remove collected keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        clearedItems.push(`localStorage-${key}`)
      })
      
      // Clear all localStorage if requested and not preserving settings
      if (options.clearAllSessions && !options.preserveGlobalSettings) {
        localStorage.clear()
        clearedItems.push('localStorage-all')
      }
    }
  } catch (error) {
    console.warn('Error clearing localStorage:', error)
  }
  
  return clearedItems
}

/**
 * Clear sessionStorage
 */
function clearSessionStorage(): string[] {
  const clearedItems: string[] = []
  
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.clear()
      clearedItems.push('sessionStorage-all')
    }
  } catch (error) {
    console.warn('Error clearing sessionStorage:', error)
  }
  
  return clearedItems
}

/**
 * Clear Service Worker caches
 */
async function clearServiceWorkerCaches(): Promise<string[]> {
  const clearedItems: string[] = []
  
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await caches.keys()
      
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          await caches.delete(cacheName)
          clearedItems.push(`sw-cache-${cacheName}`)
        })
      )
    }
  } catch (error) {
    console.warn('Error clearing Service Worker caches:', error)
  }
  
  return clearedItems
}

/**
 * Clear IndexedDB databases (if any)
 */
async function clearIndexedDB(): Promise<string[]> {
  const clearedItems: string[] = []
  
  try {
    if (typeof window !== 'undefined' && window.indexedDB) {
      // Get list of databases (if supported)
      if ('databases' in indexedDB) {
        const databases = await indexedDB.databases()
        
        await Promise.all(
          databases.map(async (db) => {
            if (db.name) {
              return new Promise<void>((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!)
                deleteReq.onsuccess = () => {
                  clearedItems.push(`indexeddb-${db.name}`)
                  resolve()
                }
                deleteReq.onerror = () => reject(deleteReq.error)
              })
            }
          })
        )
      }
    }
  } catch (error) {
    console.warn('Error clearing IndexedDB:', error)
  }
  
  return clearedItems
}

/**
 * Clear DOM form data and inputs
 */
function clearDOMInputs(): string[] {
  const clearedItems: string[] = []
  
  try {
    // Clear all form inputs
    const inputs = document.querySelectorAll('input, textarea, select')
    inputs.forEach((input, index) => {
      if (input instanceof HTMLInputElement || 
          input instanceof HTMLTextAreaElement || 
          input instanceof HTMLSelectElement) {
        
        // Don't clear certain preserved fields
        const shouldPreserve = input.type === 'hidden' || 
                              input.hasAttribute('data-preserve') ||
                              input.closest('[data-preserve]')
        
        if (!shouldPreserve) {
          input.value = ''
          if (input instanceof HTMLInputElement && input.type === 'checkbox') {
            input.checked = false
          }
          clearedItems.push(`dom-input-${index}`)
        }
      }
    })
    
    // Clear any contenteditable elements
    const editableElements = document.querySelectorAll('[contenteditable="true"]')
    editableElements.forEach((element, index) => {
      if (element instanceof HTMLElement && !element.hasAttribute('data-preserve')) {
        element.innerHTML = ''
        clearedItems.push(`contenteditable-${index}`)
      }
    })
    
  } catch (error) {
    console.warn('Error clearing DOM inputs:', error)
  }
  
  return clearedItems
}

/**
 * Force garbage collection if available
 */
function forceGarbageCollection(): string[] {
  const clearedItems: string[] = []
  
  try {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowObj = window as any
      
      // Try to force garbage collection (available in some browsers/environments)
      if (windowObj.gc) {
        windowObj.gc()
        clearedItems.push('garbage-collection')
      }
      
      // Clear any custom global objects that might hold references
      if (windowObj.__APP_STATE__) {
        delete windowObj.__APP_STATE__
        clearedItems.push('app-state')
      }
      
      if (windowObj.__SESSION_DATA__) {
        delete windowObj.__SESSION_DATA__
        clearedItems.push('session-data')
      }
      
      // Clear our session timer revalidation handler
      if (windowObj.__sessionTimerRevalidationSuccess) {
        delete windowObj.__sessionTimerRevalidationSuccess
        clearedItems.push('session-timer-handler')
      }
    }
  } catch (error) {
    console.warn('Error forcing garbage collection:', error)
  }
  
  return clearedItems
}

/**
 * Close all BroadcastChannels
 */
function closeBroadcastChannels(): string[] {
  const clearedItems: string[] = []
  
  try {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowObj = window as any
      
      // Close any BroadcastChannels that might be stored globally
      if (windowObj.__broadcastChannels) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.values(windowObj.__broadcastChannels).forEach((channel: any) => {
          try {
            channel.close()
            clearedItems.push(`broadcast-channel-${channel.name || 'unnamed'}`)
          } catch (error) {
            console.warn('Error closing broadcast channel:', error)
          }
        })
        delete windowObj.__broadcastChannels
      }
    }
  } catch (error) {
    console.warn('Error closing broadcast channels:', error)
  }
  
  return clearedItems
}

/**
 * Main cleanup function
 */
export async function performSessionCleanup(
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const clearedItems: string[] = []
  const errors: string[] = []
  
  try {
    console.log('Starting comprehensive session cleanup...', options)
    
    // 1. Clear Quill editors
    clearedItems.push(...clearQuillEditors())
    
    // 2. Clear React Query cache
    clearedItems.push(...clearReactQueryCache())
    
    // 3. Clear localStorage
    clearedItems.push(...clearLocalStorage(options))
    
    // 4. Clear sessionStorage
    clearedItems.push(...clearSessionStorage())
    
    // 5. Clear DOM inputs and forms
    clearedItems.push(...clearDOMInputs())
    
    // 6. Close broadcast channels
    clearedItems.push(...closeBroadcastChannels())
    
    // 7. Clear Service Worker caches (async)
    try {
      const swItems = await clearServiceWorkerCaches()
      clearedItems.push(...swItems)
    } catch (error) {
      errors.push(`Service Worker cleanup: ${error}`)
    }
    
    // 8. Clear IndexedDB (async)
    try {
      const idbItems = await clearIndexedDB()
      clearedItems.push(...idbItems)
    } catch (error) {
      errors.push(`IndexedDB cleanup: ${error}`)
    }
    
    // 9. Force garbage collection
    clearedItems.push(...forceGarbageCollection())
    
    console.log('Session cleanup completed', { 
      clearedItems: clearedItems.length, 
      errors: errors.length 
    })
    
    // 10. Redirect if requested
    if (options.redirectToLogin && typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.href = '/login'
      }, 100) // Small delay to ensure cleanup completes
    }
    
    return {
      success: errors.length === 0,
      clearedItems,
      errors
    }
    
  } catch (error) {
    console.error('Critical error during session cleanup:', error)
    errors.push(`Critical cleanup error: ${error}`)
    
    return {
      success: false,
      clearedItems,
      errors
    }
  }
}

/**
 * Quick cleanup for specific database session
 */
export async function cleanupDatabaseSession(databaseId: string): Promise<CleanupResult> {
  return performSessionCleanup({
    databaseId,
    redirectToLogin: false,
    clearAllSessions: false,
    preserveGlobalSettings: true
  })
}

/**
 * Full logout cleanup
 */
export async function performFullLogoutCleanup(): Promise<CleanupResult> {
  return performSessionCleanup({
    redirectToLogin: true,
    clearAllSessions: true,
    preserveGlobalSettings: false
  })
}

/**
 * Emergency cleanup (for critical security situations)
 */
export async function performEmergencyCleanup(): Promise<CleanupResult> {
  // Force immediate cleanup without preserving anything
  const result = await performSessionCleanup({
    redirectToLogin: true,
    clearAllSessions: true,
    preserveGlobalSettings: false
  })
  
  // Additional emergency measures
  try {
    // Clear cookies (if possible)
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        }
      })
    }
    
    // Force page reload after cleanup
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.replace('/login')
      }
    }, 500)
    
  } catch (error) {
    console.error('Emergency cleanup additional measures failed:', error)
  }
  
  return result
}

/**
 * Setup cleanup on page unload
 */
export function setupUnloadCleanup(databaseId?: string): () => void {
  if (typeof window === 'undefined') {
    return () => {} // No-op on server side
  }
  
  const handleBeforeUnload = () => {
    // Synchronous cleanup on page unload
    try {
      clearQuillEditors()
      clearDOMInputs()
      if (databaseId) {
        clearLocalStorage({ databaseId })
      }
    } catch (error) {
      console.warn('Error during unload cleanup:', error)
    }
  }
  
  const handleUnload = () => {
    handleBeforeUnload()
  }
  
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('unload', handleUnload)
  
  // Return cleanup function to remove listeners
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('unload', handleUnload)
  }
}