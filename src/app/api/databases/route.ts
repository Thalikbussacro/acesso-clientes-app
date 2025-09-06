import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hashPassword } from '@/lib/password'
import { db } from '@/lib/db'

// Validation schemas
const customFieldSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome do campo é obrigatório')
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Nome deve começar com letra e conter apenas letras, números e _')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  type: z.enum(['text', 'number', 'date']),
  label: z
    .string()
    .min(1, 'Rótulo do campo é obrigatório')
    .max(100, 'Rótulo deve ter no máximo 100 caracteres'),
})

const createDatabaseSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome da base de dados é obrigatório')
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/, 'Nome contém caracteres inválidos'),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres'),
  timeout_minutes: z.number().min(5).max(480),
  custom_fields: z.array(customFieldSchema),
})

const updateDatabaseSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome da base de dados é obrigatório')
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/, 'Nome contém caracteres inválidos')
    .optional(),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres')
    .optional(),
  timeout_minutes: z.number().min(5).max(480).optional(),
  custom_fields: z.array(customFieldSchema).optional(),
})

// Helper function to get user from middleware headers
async function getUserFromMiddleware(request: NextRequest) {
  try {
    // Get user info from middleware headers
    const userId = request.headers.get('x-user-id')
    const username = request.headers.get('x-username')
    
    if (!userId || !username) {
      console.log('[API] No user info from middleware')
      return null
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    })

    return user
  } catch (error) {
    console.error('Error getting user from middleware:', error)
    return null
  }
}

// Helper function to check for duplicate database names
async function checkDuplicateName(name: string, userId: string, excludeId?: string) {
  const existingDatabase = await db.clientDatabase.findFirst({
    where: {
      name,
      user_id: userId,
      ...(excludeId && { id: { not: excludeId } }),
    },
  })
  return !!existingDatabase
}

// GET /api/databases - List user's databases
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const databases = await db.clientDatabase.findMany({
      where: { user_id: user.id },
      select: {
        id: true,
        name: true,
        timeout_minutes: true,
        custom_fields: true,
        created_at: true,
        _count: {
          select: { clients: true }
        }
      },
      orderBy: { created_at: 'desc' },
    })

    // Transform the data to match frontend expectations
    const transformedDatabases = databases.map(db => ({
      id: db.id,
      name: db.name,
      clientCount: db._count.clients,
      lastModified: db.created_at.toISOString(),
      customFieldsCount: Array.isArray(db.custom_fields) ? db.custom_fields.length : 0,
      status: 'active', // All databases are active for now
      timeoutMinutes: db.timeout_minutes,
      customFields: db.custom_fields,
      createdAt: db.created_at.toISOString(),
    }))

    return NextResponse.json({ databases: transformedDatabases })
  } catch (error) {
    console.error('Error fetching databases:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/databases - Create new database
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = createDatabaseSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      )
    }

    const { name, password, timeout_minutes, custom_fields } = validationResult.data

    // Check for duplicate names
    const isDuplicate = await checkDuplicateName(name, user.id)
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Uma base de dados com este nome já existe' },
        { status: 409 }
      )
    }

    // Validate unique custom field names
    const customFieldNames = custom_fields.map(field => field.name.toLowerCase())
    if (customFieldNames.length !== new Set(customFieldNames).size) {
      return NextResponse.json(
        { error: 'Nomes de campos personalizados devem ser únicos' },
        { status: 400 }
      )
    }

    // Hash the database password
    const hashedPassword = await hashPassword(password)

    // Create the database
    const database = await db.clientDatabase.create({
      data: {
        name,
        password_hash: hashedPassword,
        timeout_minutes: timeout_minutes,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        custom_fields: custom_fields as any, // Prisma Json type
        user_id: user.id,
      },
      select: {
        id: true,
        name: true,
        timeout_minutes: true,
        custom_fields: true,
        created_at: true,
        _count: {
          select: { clients: true }
        }
      },
    })

    // Transform the response
    const transformedDatabase = {
      id: database.id,
      name: database.name,
      clientCount: database._count.clients,
      lastModified: database.created_at.toISOString(),
      customFieldsCount: Array.isArray(database.custom_fields) ? database.custom_fields.length : 0,
      status: 'active',
      timeoutMinutes: database.timeout_minutes,
      customFields: database.custom_fields,
      createdAt: database.created_at.toISOString(),
    }

    return NextResponse.json(
      {
        database: transformedDatabase,
        message: 'Base de dados criada com sucesso'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating database:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/databases - Update database (requires database ID in query params)
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const databaseId = searchParams.get('id')

    if (!databaseId) {
      return NextResponse.json(
        { error: 'Database ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = updateDatabaseSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      )
    }

    const { name, password, timeout_minutes, custom_fields } = validationResult.data

    // Check if database exists and belongs to user
    const existingDatabase = await db.clientDatabase.findFirst({
      where: {
        id: databaseId,
        user_id: user.id,
      },
    })

    if (!existingDatabase) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      )
    }

    // Check for duplicate names if name is being updated
    if (name && name !== existingDatabase.name) {
      const isDuplicate = await checkDuplicateName(name, user.id, databaseId)
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Uma base de dados com este nome já existe' },
          { status: 409 }
        )
      }
    }

    // Validate unique custom field names if being updated
    if (custom_fields) {
      const customFieldNames = custom_fields.map(field => field.name.toLowerCase())
      if (customFieldNames.length !== new Set(customFieldNames).size) {
        return NextResponse.json(
          { error: 'Nomes de campos personalizados devem ser únicos' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: {
      name?: string
      password_hash?: string
      timeout_minutes?: number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      custom_fields?: any
    } = {}
    if (name) updateData.name = name
    if (password) updateData.password_hash = await hashPassword(password)
    if (timeout_minutes) updateData.timeout_minutes = timeout_minutes
    if (custom_fields) updateData.custom_fields = custom_fields
    // Update the database
    const database = await db.clientDatabase.update({
      where: { id: databaseId },
      data: updateData,
      select: {
        id: true,
        name: true,
        timeout_minutes: true,
        custom_fields: true,
        created_at: true,
        _count: {
          select: { clients: true }
        }
      },
    })

    // Transform the response
    const transformedDatabase = {
      id: database.id,
      name: database.name,
      clientCount: database._count.clients,
      lastModified: database.created_at.toISOString(),
      customFieldsCount: Array.isArray(database.custom_fields) ? database.custom_fields.length : 0,
      status: 'active',
      timeoutMinutes: database.timeout_minutes,
      customFields: database.custom_fields,
      createdAt: database.created_at.toISOString(),
    }

    return NextResponse.json({
      database: transformedDatabase,
      message: 'Base de dados atualizada com sucesso'
    })
  } catch (error) {
    console.error('Error updating database:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/databases - Delete database (requires database ID in query params)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const databaseId = searchParams.get('id')

    if (!databaseId) {
      return NextResponse.json(
        { error: 'Database ID is required' },
        { status: 400 }
      )
    }

    // Check if database exists and belongs to user
    const existingDatabase = await db.clientDatabase.findFirst({
      where: {
        id: databaseId,
        user_id: user.id,
      },
      include: {
        _count: {
          select: { clients: true }
        }
      }
    })

    if (!existingDatabase) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      )
    }

    // Check if database has clients
    if (existingDatabase._count.clients > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete database with existing clients. Please remove all clients first.',
          clientCount: existingDatabase._count.clients
        },
        { status: 409 }
      )
    }

    // Delete the database
    await db.clientDatabase.delete({
      where: { id: databaseId }
    })

    return NextResponse.json({
      message: 'Base de dados removida com sucesso'
    })
  } catch (error) {
    console.error('Error deleting database:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}