import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { VaccinationStatus } from '@prisma/client'

// GET /api/vaccination-records?patientId=&vaccineId=&lotNo=&page=1&limit=20
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patientId')
  const vaccineId = searchParams.get('vaccineId')
  const lotNo = searchParams.get('lotNo')
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') || 20)))
  const skip = (page - 1) * limit

  const where: any = {
    AND: [
      patientId ? { patientId: Number(patientId) } : {},
      vaccineId ? { vaccineId: Number(vaccineId) } : {},
      lotNo ? { lotNo: String(lotNo) } : {},
    ],
  }

  const [items, total] = await Promise.all([
    prisma.vaccinationRecord.findMany({
      where,
      orderBy: { vaccinationDate: 'desc' },
      skip,
      take: limit,
      include: {
        patient: { select: { id: true, fullName: true, cid: true } },
        vaccine: { select: { id: true, name: true, type: true } },
        lot: { select: { lotNo: true, expirationDate: true } },
      },
    }),
    prisma.vaccinationRecord.count({ where }),
  ])

  return NextResponse.json({ items, total, page, limit })
}

// POST /api/vaccination-records
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      patientId,
      vaccineId,
      lotNo,
      vaccinationDate,
      doseNumber,
      injectionSite,
      status,
      provider,
      remarks,
    } = body ?? {}

    if (!patientId || !vaccineId || !lotNo || !vaccinationDate) {
      return NextResponse.json(
        { message: 'กรอกข้อมูลไม่ครบ (patientId, vaccineId, lotNo, vaccinationDate)' },
        { status: 400 },
      )
    }

    // ตรวจสอบ FK
    const [p, v, lot] = await Promise.all([
      prisma.patient.findUnique({ where: { id: Number(patientId) } }),
      prisma.vaccine.findUnique({ where: { id: Number(vaccineId) } }),
      prisma.vaccineLot.findUnique({ where: { lotNo: String(lotNo) } }),
    ])
    if (!p) return NextResponse.json({ message: 'ไม่พบ Patient' }, { status: 404 })
    if (!v) return NextResponse.json({ message: 'ไม่พบ Vaccine' }, { status: 404 })
    if (!lot) return NextResponse.json({ message: 'ไม่พบ VaccineLot' }, { status: 404 })

    const created = await prisma.vaccinationRecord.create({
      data: {
        patientId: Number(patientId),
        vaccineId: Number(vaccineId),
        lotNo: String(lotNo),
        vaccinationDate: new Date(vaccinationDate),
        doseNumber: doseNumber ? Number(doseNumber) : null,
        injectionSite: injectionSite ?? null,
        status: status && Object.values(VaccinationStatus).includes(status)
          ? status
          : VaccinationStatus.COMPLETED,
        provider: provider ?? null,
        remarks: remarks ?? null,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error('❌ VaccinationRecord POST error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
