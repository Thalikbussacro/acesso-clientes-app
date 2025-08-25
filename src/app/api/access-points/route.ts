import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Validation schemas
const createAccessPointSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(1).max(255),
})

const updateAccessPointSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
})

const deleteAccessPointSchema = z.object({
  id: z.string().uuid(),
})

// GET /api/access-points - Get access points for a client
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const payload = await verifyJWT(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')

    if (!clientId) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }

    // Verify client exists and user has access
    const client = await db.client.findFirst({
      where: {
        id: clientId,
        database: {
          user_id: payload.userId,
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 })
    }

    // Get access points for the client
    const accessPoints = await db.accessPoint.findMany({
      where: {
        client_id: clientId,
      },
      include: {
        access_details: {
          select: {
            id: true,
            content: true,
            last_edited_at: true,
          },
        },
        _count: {
          select: {
            access_images: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    })

    // Transform data for frontend
    const transformedAccessPoints = accessPoints.map(ap => ({
      id: ap.id,
      name: ap.name,
      createdAt: ap.created_at.toISOString(),
      updatedAt: ap.created_at.toISOString(), // AccessPoint doesn't have updated_at in schema
      hasContent: !!ap.access_details?.content,
      contentLength: ap.access_details?.content?.length || 0,
      imageCount: ap._count.access_images,
      lastEditedAt: ap.access_details?.last_edited_at?.toISOString(),
    }))

    return NextResponse.json({
      accessPoints: transformedAccessPoints,
    })

  } catch (error) {
    console.error('Error fetching access points:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/access-points - Create new access point
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const payload = await verifyJWT(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { client_id, name } = createAccessPointSchema.parse(body)

    // Verify client exists and user has access
    const client = await db.client.findFirst({
      where: {
        id: client_id,
        database: {
          user_id: payload.userId,
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 })
    }

    // Check if access point with same name already exists for this client
    const existingAccessPoint = await db.accessPoint.findFirst({
      where: {
        client_id: client_id,
        name: name,
      },
    })

    if (existingAccessPoint) {
      return NextResponse.json({ error: 'Access point with this name already exists' }, { status: 409 })
    }

    // Create new access point
    const accessPoint = await db.accessPoint.create({
      data: {
        name,
        client_id: client_id,
        created_at: new Date(),
      },
    })

    // Return created access point
    return NextResponse.json({
      accessPoint: {
        id: accessPoint.id,
        name: accessPoint.name,
        createdAt: accessPoint.created_at.toISOString(),
        updatedAt: accessPoint.created_at.toISOString(),
        hasContent: false,
        contentLength: 0,
        imageCount: 0,
      },
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }

    console.error('Error creating access point:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/access-points - Update access point
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const payload = await verifyJWT(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name } = updateAccessPointSchema.parse(body)

    // Verify access point exists and user has access
    const accessPoint = await db.accessPoint.findFirst({
      where: {
        id: id,
        client: {
          database: {
            user_id: payload.userId,
          },
        },
      },
      include: {
        client: true,
      },
    })

    if (!accessPoint) {
      return NextResponse.json({ error: 'Access point not found or access denied' }, { status: 404 })
    }

    // If updating name, check for duplicates
    if (name && name !== accessPoint.name) {
      const existingAccessPoint = await db.accessPoint.findFirst({
        where: {
          client_id: accessPoint.client_id,
          name: name,
          id: {
            not: id,
          },
        },
      })

      if (existingAccessPoint) {
        return NextResponse.json({ error: 'Access point with this name already exists' }, { status: 409 })
      }
    }

    // Update access point  
    const updatedAccessPoint = await db.accessPoint.update({
      where: { id },
      data: {
        ...(name && { name }),
        // Note: AccessPoint model doesn't have updated_at field
      },
    })

    return NextResponse.json({
      accessPoint: {
        id: updatedAccessPoint.id,
        name: updatedAccessPoint.name,
        createdAt: updatedAccessPoint.created_at.toISOString(),
        updatedAt: updatedAccessPoint.created_at.toISOString(),
      },
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }

    console.error('Error updating access point:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/access-points - Delete access point
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const payload = await verifyJWT(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = deleteAccessPointSchema.parse(body)

    // Verify access point exists and user has access
    const accessPoint = await db.accessPoint.findFirst({
      where: {
        id: id,
        client: {
          database: {
            user_id: payload.userId,
          },
        },
      },
    })

    if (!accessPoint) {
      return NextResponse.json({ error: 'Access point not found or access denied' }, { status: 404 })
    }

    // Delete related data first (due to foreign key constraints)
    await db.$transaction(async (tx) => {
      // Delete access images
      await tx.accessImage.deleteMany({
        where: { access_point_id: id },
      })

      // Delete access details history
      await tx.accessDetailHistory.deleteMany({
        where: { access_point_id: id },
      })

      // Delete access details
      await tx.accessDetail.deleteMany({
        where: { access_point_id: id },
      })

      // Finally delete the access point
      await tx.accessPoint.delete({
        where: { id },
      })
    })

    return NextResponse.json({
      message: 'Access point deleted successfully',
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }

    console.error('Error deleting access point:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}