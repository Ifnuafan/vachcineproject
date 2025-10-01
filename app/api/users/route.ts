// app/api/users/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') || 20)))
  const skip = (page - 1) * limit

  const where: any = q
    ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
        ],
      }
    : {}

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip, take: limit,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ items, total, page, limit }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, email, password, role } = body ?? {}

    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: 'กรอกข้อมูลไม่ครบ' }, { status: 400 })
    }
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json({ message: 'role ไม่ถูกต้อง' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(String(password), 10)
    const created = await prisma.user.create({
      data: { name: String(name), email: String(email), password: hashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ message: 'อีเมลนี้ถูกใช้แล้ว' }, { status: 409 })
    }
    return NextResponse.json({ message: 'สร้างไม่สำเร็จ' }, { status: 500 })
  }
}
