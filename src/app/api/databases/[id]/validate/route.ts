import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verify, sign } from 'jsonwebtoken'
import { comparePassword } from '@/lib/password'
import { db } from '@/lib/db'

// Validation schema for password validation
const validatePasswordSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
})

// Helper function to get user from JWT token
async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return null
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as { userId: string }
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
    })

    return user
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

// Helper function to generate session token
function generateSessionToken(userId: string, databaseId: string, timeoutMinutes: number) {
  const payload = {
    userId,
    databaseId,
    sessionStart: Date.now(),
    timeoutMinutes,
    type: 'database_session'
  }

  return sign(payload, process.env.JWT_SECRET!, {
    expiresIn: `${timeoutMinutes}m`
  })
}

// POST /api/databases/[id]/validate - Validate database password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: databaseId } = await params
    if (!databaseId) {
      return NextResponse.json(
        { error: 'Database ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = validatePasswordSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      )
    }

    const { password } = validationResult.data

    // Find the database and verify ownership
    const database = await db.clientDatabase.findFirst({
      where: {
        id: databaseId,
        user_id: user.id,
      },
      select: {
        id: true,
        name: true,
        password_hash: true,
        timeout_minutes: true,
      }
    })

    if (!database) {
      return NextResponse.json(
        { error: 'Base de dados não encontrada' },
        { status: 404 }
      )
    }

    // Verify the password
    const isPasswordValid = await comparePassword(password, database.password_hash)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Senha incorreta' },
        { status: 401 }
      )
    }

    // Generate session token
    const sessionToken = generateSessionToken(user.id, database.id, database.timeout_minutes)

    // Return success with session info
    return NextResponse.json({
      success: true,
      message: 'Acesso autorizado',
      sessionToken,
      database: {
        id: database.id,
        name: database.name,
        timeoutMinutes: database.timeout_minutes,
      },
      sessionInfo: {
        sessionStart: Date.now(),
        expiresAt: Date.now() + (database.timeout_minutes * 60 * 1000),
      }
    })

  } catch (error) {
    console.error('Error validating database password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/databases/[id]/validate - Check if session is still valid
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: databaseId } = await params
    if (!databaseId) {
      return NextResponse.json(
        { error: 'Database ID is required' },
        { status: 400 }
      )
    }

    // Get session token from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Session token required' },
        { status: 401 }
      )
    }

    const sessionToken = authHeader.replace('Bearer ', '')

    try {
      const decoded = verify(sessionToken, process.env.JWT_SECRET!) as {
        userId: string
        databaseId: string
        sessionStart: number
        timeoutMinutes: number
        type: string
      }

      // Verify token belongs to current user and database
      if (decoded.userId !== user.id || decoded.databaseId !== databaseId || decoded.type !== 'database_session') {
        return NextResponse.json(
          { error: 'Invalid session token' },
          { status: 401 }
        )
      }

      // Check if session has expired (additional check beyond JWT expiry)
      const now = Date.now()
      const sessionExpiry = decoded.sessionStart + (decoded.timeoutMinutes * 60 * 1000)
      
      if (now > sessionExpiry) {
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        )
      }

      // Session is valid
      return NextResponse.json({
        valid: true,
        sessionInfo: {
          sessionStart: decoded.sessionStart,
          timeoutMinutes: decoded.timeoutMinutes,
          expiresAt: sessionExpiry,
          remainingTime: Math.max(0, sessionExpiry - now),
        }
      })

    } catch (jwtError) {
      console.error('JWT verification error:', jwtError)
      return NextResponse.json(
        { error: 'Invalid or expired session token' },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('Error checking session validity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}