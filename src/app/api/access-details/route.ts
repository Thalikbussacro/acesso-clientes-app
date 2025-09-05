import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { sanitizeContent, validateContentStructure, contentValidationSchema } from '@/lib/content-security'

// Validation schemas
const getAccessDetailsSchema = z.object({
  access_point_id: z.string().uuid(),
})

const saveAccessDetailsSchema = z.object({
  access_point_id: z.string().uuid(),
  content: contentValidationSchema.shape.content,
})

// GET /api/access-details - Get content for an access point
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const payload = await verifyJWT(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accessPointId = searchParams.get('access_point_id')

    if (!accessPointId) {
      return NextResponse.json({ error: 'access_point_id is required' }, { status: 400 })
    }

    // Validate UUID format
    try {
      getAccessDetailsSchema.parse({ access_point_id: accessPointId })
    } catch {
      return NextResponse.json({ error: 'Invalid access_point_id format' }, { status: 400 })
    }

    // Verify access point exists and user has access
    const accessPoint = await db.accessPoint.findFirst({
      where: {
        id: accessPointId,
        client: {
          database: {
            user_id: payload.userId,
          },
        },
      },
      include: {
        access_details: true,
        client: {
          include: {
            database: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!accessPoint) {
      return NextResponse.json({ error: 'Access point not found or access denied' }, { status: 404 })
    }

    // Return access details
    const accessDetails = accessPoint.access_details
    return NextResponse.json({
      accessPoint: {
        id: accessPoint.id,
        name: accessPoint.name,
        client: {
          id: accessPoint.client.id,
          name: accessPoint.client.name,
          database: {
            name: accessPoint.client.database.name,
          },
        },
        content: accessDetails?.content || '',
        lastEditedBy: accessDetails?.last_edited_by,
        lastEditedAt: accessDetails?.last_edited_at?.toISOString(),
        hasContent: !!accessDetails?.content,
        contentLength: accessDetails?.content?.length || 0,
      },
    })

  } catch (error) {
    console.error('Error fetching access details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/access-details - Save content for an access point
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const payload = await verifyJWT(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { access_point_id, content: rawContent } = saveAccessDetailsSchema.parse(body)

    // Additional content security validation
    const contentValidation = validateContentStructure(rawContent)
    if (!contentValidation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid content', 
        details: contentValidation.errors 
      }, { status: 400 })
    }

    // Sanitize content to prevent XSS
    const content = sanitizeContent(rawContent)

    // Verify access point exists and user has access
    const accessPoint = await db.accessPoint.findFirst({
      where: {
        id: access_point_id,
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

    // Check if access details already exist
    const existingDetails = await db.accessDetail.findFirst({
      where: {
        access_point_id: access_point_id,
      },
    })

    let accessDetails
    const now = new Date()

    if (existingDetails) {
      // Get the next version number
      const lastHistoryEntry = await db.accessDetailHistory.findFirst({
        where: {
          access_point_id: access_point_id,
        },
        orderBy: {
          version: 'desc',
        },
      })

      const nextVersion = (lastHistoryEntry?.version || 0) + 1

      // Create history entry before updating
      await db.accessDetailHistory.create({
        data: {
          access_point_id: access_point_id,
          version: nextVersion,
          content: existingDetails.content,
          edited_by: existingDetails.last_edited_by,
          edited_at: existingDetails.last_edited_at,
        },
      })

      // Update existing details
      accessDetails = await db.accessDetail.update({
        where: {
          id: existingDetails.id,
        },
        data: {
          content,
          last_edited_by: payload.userId,
          last_edited_at: now,
        },
      })
    } else {
      // Create new access details
      accessDetails = await db.accessDetail.create({
        data: {
          access_point_id,
          content,
          last_edited_by: payload.userId,
          last_edited_at: now,
        },
      })
    }

    return NextResponse.json({
      success: true,
      accessDetails: {
        id: accessDetails.id,
        content: accessDetails.content,
        lastEditedBy: accessDetails.last_edited_by,
        lastEditedAt: accessDetails.last_edited_at.toISOString(),
        contentLength: accessDetails.content.length,
      },
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }

    console.error('Error saving access details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}