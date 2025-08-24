import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'

// Type for client custom data
interface ClientCustomData {
  email?: string
  phone?: string
  status?: 'active' | 'inactive'
  [key: string]: unknown
}

// GET /api/clients - List all clients for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyJWT(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Token de autenticação inválido' },
        { status: 401 }
      )
    }

    // Get database ID from query params
    const { searchParams } = new URL(request.url)
    const databaseId = searchParams.get('database_id')

    if (!databaseId) {
      return NextResponse.json(
        { error: 'ID da base de dados é obrigatório' },
        { status: 400 }
      )
    }

    // Verify user owns the database
    const database = await db.clientDatabase.findFirst({
      where: {
        id: databaseId,
        user_id: user.userId,
      },
    })

    if (!database) {
      return NextResponse.json(
        { error: 'Base de dados não encontrada ou acesso negado' },
        { status: 404 }
      )
    }

    // Get all clients in this database
    const clients = await db.client.findMany({
      where: {
        database_id: databaseId,
      },
      orderBy: {
        created_at: 'desc',
      },
    })

    // Transform the data to match frontend expectations
    const transformedClients = clients.map(client => {
      const customData = client.custom_data as ClientCustomData
      return {
        id: client.id,
        name: client.name,
        email: customData?.email || null,
        phone: customData?.phone || null,
        status: customData?.status || 'active',
        createdAt: client.created_at.toISOString(),
        updatedAt: client.created_at.toISOString(), // Using created_at as placeholder
        customFields: client.custom_data || {},
        lastAccess: client.last_access?.toISOString() || null,
      }
    })

    return NextResponse.json({
      success: true,
      clients: transformedClients,
      count: transformedClients.length,
    })

  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/clients - Create a new client
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyJWT(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Token de autenticação inválido' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, database_id, custom_data } = body

    // Validate required fields
    if (!name || !database_id) {
      return NextResponse.json(
        { error: 'Nome e ID da base de dados são obrigatórios' },
        { status: 400 }
      )
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome deve ser um texto válido' },
        { status: 400 }
      )
    }

    // Verify user owns the database
    const database = await db.clientDatabase.findFirst({
      where: {
        id: database_id,
        user_id: user.userId,
      },
    })

    if (!database) {
      return NextResponse.json(
        { error: 'Base de dados não encontrada ou acesso negado' },
        { status: 404 }
      )
    }

    // Check if client name already exists in this database
    const existingClient = await db.client.findFirst({
      where: {
        database_id: database_id,
        name: name.trim(),
      },
    })

    if (existingClient) {
      return NextResponse.json(
        { error: 'Já existe um cliente com este nome nesta base de dados' },
        { status: 409 }
      )
    }

    // Create the client
    const client = await db.client.create({
      data: {
        name: name.trim(),
        database_id: database_id,
        custom_data: custom_data || {},
      },
    })

    // Transform response to match frontend expectations
    const customData = client.custom_data as ClientCustomData
    const transformedClient = {
      id: client.id,
      name: client.name,
      email: customData?.email || null,
      phone: customData?.phone || null,
      status: customData?.status || 'active',
      createdAt: client.created_at.toISOString(),
      updatedAt: client.created_at.toISOString(),
      customFields: client.custom_data || {},
      lastAccess: client.last_access?.toISOString() || null,
    }

    return NextResponse.json({
      success: true,
      message: 'Cliente criado com sucesso',
      client: transformedClient,
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/clients - Update an existing client
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyJWT(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Token de autenticação inválido' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, name, custom_data, update_last_access } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    // Find the client and verify ownership
    const client = await db.client.findFirst({
      where: { id },
      include: {
        database: {
          select: {
            user_id: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    if (client.database.user_id !== user.userId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: {
      name?: string
      custom_data?: object
      last_access?: Date
    } = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Nome deve ser um texto válido' },
          { status: 400 }
        )
      }

      // Check if new name conflicts with existing client
      if (name.trim() !== client.name) {
        const existingClient = await db.client.findFirst({
          where: {
            database_id: client.database_id,
            name: name.trim(),
            id: { not: id },
          },
        })

        if (existingClient) {
          return NextResponse.json(
            { error: 'Já existe um cliente com este nome nesta base de dados' },
            { status: 409 }
          )
        }
      }

      updateData.name = name.trim()
    }

    if (custom_data !== undefined) {
      updateData.custom_data = custom_data
    }

    if (update_last_access === true) {
      updateData.last_access = new Date()
    }

    // Update the client
    const updatedClient = await db.client.update({
      where: { id },
      data: updateData,
    })

    // Transform response to match frontend expectations
    const customData = updatedClient.custom_data as ClientCustomData
    const transformedClient = {
      id: updatedClient.id,
      name: updatedClient.name,
      email: customData?.email || null,
      phone: customData?.phone || null,
      status: customData?.status || 'active',
      createdAt: updatedClient.created_at.toISOString(),
      updatedAt: updatedClient.created_at.toISOString(),
      customFields: updatedClient.custom_data || {},
      lastAccess: updatedClient.last_access?.toISOString() || null,
    }

    return NextResponse.json({
      success: true,
      message: 'Cliente atualizado com sucesso',
      client: transformedClient,
    })

  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients - Delete a client
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyJWT(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Token de autenticação inválido' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    // Find the client and verify ownership
    const client = await db.client.findFirst({
      where: { id },
      include: {
        database: {
          select: {
            user_id: true,
          },
        },
        access_points: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    if (client.database.user_id !== user.userId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Delete the client (cascade will handle related records)
    await db.client.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente excluído com sucesso',
      deletedId: id,
      accessPointsDeleted: client.access_points.length,
    })

  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}