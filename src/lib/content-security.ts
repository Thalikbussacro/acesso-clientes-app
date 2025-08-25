import DOMPurify from 'dompurify'
import { z } from 'zod'

// Content validation constants
export const CONTENT_LIMITS = {
  MAX_LENGTH: 50000, // 50KB text content
  MAX_WORD_COUNT: 10000, // Maximum word count
  MAX_PARAGRAPH_COUNT: 500, // Maximum paragraphs
} as const

// Content validation schema
export const contentValidationSchema = z.object({
  content: z.string()
    .max(CONTENT_LIMITS.MAX_LENGTH, `Content must not exceed ${CONTENT_LIMITS.MAX_LENGTH} characters`)
    .refine((content) => {
      // Check word count
      const words = content.trim().split(/\s+/).filter(word => word.length > 0)
      return words.length <= CONTENT_LIMITS.MAX_WORD_COUNT
    }, `Content must not exceed ${CONTENT_LIMITS.MAX_WORD_COUNT} words`)
    .refine((content) => {
      // Check paragraph count (using common paragraph separators)
      const paragraphs = content.split(/\n\s*\n|\r\n\s*\r\n|<\/p>|<br\s*\/?>\s*<br\s*\/?>/).filter(p => p.trim().length > 0)
      return paragraphs.length <= CONTENT_LIMITS.MAX_PARAGRAPH_COUNT
    }, `Content must not exceed ${CONTENT_LIMITS.MAX_PARAGRAPH_COUNT} paragraphs`)
})

// DOMPurify configuration for rich text content
const ALLOWED_TAGS = [
  // Text formatting
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
  // Headers
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Lists
  'ul', 'ol', 'li',
  // Quotes and code
  'blockquote', 'pre', 'code',
  // Links (with restrictions)
  'a',
  // Spans for styling
  'span'
] as const

const ALLOWED_ATTRIBUTES = {
  'a': ['href', 'title', 'target', 'rel'],
  'span': ['style'],
  'p': ['style'],
  'strong': ['style'],
  'em': ['style'],
  'u': ['style'],
  'h1': ['style'],
  'h2': ['style'],
  'h3': ['style'],
  'h4': ['style'],
  'h5': ['style'],
  'h6': ['style'],
  'blockquote': ['style'],
  'ul': ['style'],
  'ol': ['style'],
  'li': ['style']
} as const

// Allowed CSS properties (Quill.js style properties)
const ALLOWED_CSS_PROPERTIES = [
  'color',
  'background-color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-align',
  'line-height',
  'margin',
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'padding',
  'padding-top',
  'padding-bottom',
  'padding-left',
  'padding-right'
] as const

/**
 * Sanitizes HTML content to prevent XSS attacks while preserving rich text formatting
 */
export function sanitizeContent(content: string): string {
  if (typeof window === 'undefined') {
    // Server-side: basic HTML tag stripping for security
    return content
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>.*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/<link[^>]*>/gi, '')
      .replace(/<meta[^>]*>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
      .replace(/javascript:/gi, '') // Remove javascript: URLs
  }

  // Client-side: full DOMPurify sanitization
  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: Object.keys(ALLOWED_ATTRIBUTES).reduce((acc, tag) => {
      acc.push(...ALLOWED_ATTRIBUTES[tag as keyof typeof ALLOWED_ATTRIBUTES])
      return acc
    }, [] as string[]),
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true,
    // Custom hook to validate CSS properties
    PARSER_MEDIA_TYPE: 'text/html'
  })

  // Additional CSS sanitization
  return sanitizeCSS(clean)
}

/**
 * Sanitizes CSS properties in style attributes
 */
function sanitizeCSS(content: string): string {
  return content.replace(/style\s*=\s*["']([^"']+)["']/gi, (match, styles) => {
    const sanitizedStyles = styles
      .split(';')
      .map((style: string) => style.trim())
      .filter((style: string) => {
        if (!style) return false
        const [property] = style.split(':').map(s => s.trim())
        return ALLOWED_CSS_PROPERTIES.includes(property.toLowerCase() as typeof ALLOWED_CSS_PROPERTIES[number])
      })
      .join('; ')
    
    return sanitizedStyles ? `style="${sanitizedStyles}"` : ''
  })
}

/**
 * Validates content length and structure
 */
export function validateContentStructure(content: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  try {
    contentValidationSchema.parse({ content })
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.issues.map(issue => issue.message))
    }
  }
  
  // Additional security checks
  if (content.includes('<script')) {
    errors.push('Script tags are not allowed')
  }
  
  if (content.includes('javascript:')) {
    errors.push('JavaScript URLs are not allowed')
  }
  
  if (content.match(/on\w+\s*=/i)) {
    errors.push('Event handlers are not allowed')
  }
  
  // Check for excessive nesting
  const nestingDepth = getMaxNestingDepth(content)
  if (nestingDepth > 10) {
    errors.push('Content has excessive HTML nesting depth')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Calculates maximum nesting depth of HTML elements
 */
function getMaxNestingDepth(html: string): number {
  let maxDepth = 0
  let currentDepth = 0
  
  // Simple regex-based depth calculation
  const tagPattern = /<\/?(\w+)[^>]*>/g
  let match
  
  while ((match = tagPattern.exec(html)) !== null) {
    const tagName = match[1].toLowerCase()
    const isClosing = match[0].startsWith('</')
    
    // Skip self-closing tags
    if (match[0].endsWith('/>') || ['br', 'hr', 'img', 'input'].includes(tagName)) {
      continue
    }
    
    if (isClosing) {
      currentDepth--
    } else {
      currentDepth++
      maxDepth = Math.max(maxDepth, currentDepth)
    }
  }
  
  return maxDepth
}

/**
 * Extracts plain text from HTML content for search indexing
 */
export function extractPlainText(content: string): string {
  if (typeof window === 'undefined') {
    // Server-side: simple HTML tag removal
    return content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  
  // Client-side: use DOM parsing
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = content
  return tempDiv.textContent || tempDiv.innerText || ''
}

/**
 * Gets content statistics for UI display
 */
export function getContentStats(content: string): {
  characterCount: number
  wordCount: number
  paragraphCount: number
  isWithinLimits: boolean
} {
  const plainText = extractPlainText(content)
  const words = plainText.trim().split(/\s+/).filter(word => word.length > 0)
  const paragraphs = content.split(/\n\s*\n|\r\n\s*\r\n|<\/p>|<br\s*\/?>\s*<br\s*\/?>/).filter(p => p.trim().length > 0)
  
  return {
    characterCount: content.length,
    wordCount: words.length,
    paragraphCount: paragraphs.length,
    isWithinLimits: (
      content.length <= CONTENT_LIMITS.MAX_LENGTH &&
      words.length <= CONTENT_LIMITS.MAX_WORD_COUNT &&
      paragraphs.length <= CONTENT_LIMITS.MAX_PARAGRAPH_COUNT
    )
  }
}