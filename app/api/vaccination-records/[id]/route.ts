import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { VaccinationStatus } from '@prisma/client'

// GET /api/vaccination-records/[id]
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  const item = await prisma.vaccinationRecord.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, fullName: true, cid: true } },
      vaccine: { select: { id: true, name: true, type: true } },
      lot: { select: { lotNo: true, expirationDate: true } },
    },
  })
  if (!item) return NextResponse.json({ message: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

// PUT /api/vaccination-records/[id]
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

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

    const updated = await prisma.vaccinationRecord.update({
      where: { id },
      data: {
        patientId: patientId ? Number(patientId) : undefined,
        vaccineId: vaccineId ? Number(vaccineId) : undefined,
        lotNo: lotNo ? String(lotNo) : undefined,
        vaccinationDate: vaccinationDate ? new Date(vaccinationDate) : undefined,
        doseNumber: doseNumber !== undefined ? Number(doseNumber) : undefined,
        injectionSite: injectionSite ?? undefined,
        status:
          status && Object.values(VaccinationStatus).includes(status)
            ? status
            : undefined,
        provider: provider ?? undefined,
        remarks: remarks ?? undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('❌ VaccinationRecord PUT error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/vaccination-records/[id]
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  try {
    await prisma.vaccinationRecord.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('❌ VaccinationRecord DELETE error:', err)
    return NextResponse.json({ message: 'ลบไม่สำเร็จ' }, { status: 400 })
  }
}
