import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { UserRole, WarehouseType } from '@prisma/client'

/**
 * GET /api/warehouses
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || undefined
    const type = searchParams.get('type') as WarehouseType | null
    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') || 20)))
    const skip = (page - 1) * limit

    const where: any = {
      ...(q ? { name: { contains: q } } : {}),
      ...(type && Object.values(WarehouseType).includes(type) ? { type } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.warehouse.count({ where }),
    ])

    return NextResponse.json({ items, total, page, limit }, { status: 200 })
  } catch (err) {
    console.error('❌ Warehouses GET error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/warehouses
 * เฉพาะ ADMIN
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any)?.role as UserRole | undefined
  if (role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = (await req.json()) as { name?: string; type?: WarehouseType; note?: string }
    const { name, type, note } = body

    if (!name || !type) {
      return NextResponse.json({ message: 'name and type are required' }, { status: 400 })
    }
    if (!Object.values(WarehouseType).includes(type)) {
      return NextResponse.json({ message: 'Invalid warehouse type' }, { status: 400 })
    }

    const created = await prisma.warehouse.create({
      data: { name, type, note: note ?? null },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ message: 'Warehouse name already exists' }, { status: 409 })
    }
    console.error('❌ Warehouses POST error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
