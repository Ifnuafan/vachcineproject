import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { UserRole, WarehouseType, Prisma } from '@prisma/client'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || undefined
    const type = searchParams.get('type') as WarehouseType | null
    const withOpen = searchParams.get('withOpen') === '1'
    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') || 20)))
    const skip = (page - 1) * limit

    const where: Prisma.WarehouseWhereInput = {
      ...(q ? { name: { contains: q } } : {}),
      ...(type && Object.values(WarehouseType).includes(type) ? { type } : {}),
    }

    // เตรียม args ของ findMany
    const args: Prisma.WarehouseFindManyArgs = {
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      skip,
      take: limit,
    }

    if (withOpen) {
      args.include = {
        openVials: {
          where: { expiresAt: { gt: new Date() } },
          include: {
            lot: { select: { vaccineId: true, vaccine: { select: { name: true } } } },
          },
          orderBy: { expiresAt: 'asc' },
        },
      }
    }

    const [rawItems, total] = await Promise.all([
      prisma.warehouse.findMany(args),
      prisma.warehouse.count({ where }),
    ])

    const items = withOpen
      ? rawItems.map((w) => ({
          ...w,
          openVials: (w as any).openVials
            ?.map((o: any) => {
              const remain = Math.max(0, (o.dosesTotal ?? 0) - (o.dosesUsed ?? 0))
              return {
                lotNo: o.lotNo as string,
                vaccineId: o.lot?.vaccineId ?? null,
                vaccineName: o.lot?.vaccine?.name ?? null,
                dosesTotal: o.dosesTotal,
                dosesUsed: o.dosesUsed,
                dosesRemain: remain,
                openedAt: o.openedAt,
                expiresAt: o.expiresAt,
              }
            })
            .filter((x: any) => x.dosesRemain > 0) ?? [],
        }))
      : rawItems

    return NextResponse.json({ items, total, page, limit }, { status: 200 })
  } catch (err) {
    console.error('❌ Warehouses GET error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

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

    if (!name || !type) return NextResponse.json({ message: 'name and type are required' }, { status: 400 })
    if (!Object.values(WarehouseType).includes(type)) {
      return NextResponse.json({ message: 'Invalid warehouse type' }, { status: 400 })
    }

    const created = await prisma.warehouse.create({ data: { name, type, note: note ?? null } })
    return NextResponse.json(created, { status: 201 })
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ message: 'Warehouse name already exists' }, { status: 409 })
    console.error('❌ Warehouses POST error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
