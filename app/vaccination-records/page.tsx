'use client'

import { useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import {
  BeakerIcon,
  UserIcon,
  RectangleStackIcon,
  FunnelIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import { ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'

type VaccinationRecord = {
  id: number
  vaccinationDate: string
  doseNumber: number | null
  injectionSite: string | null
  status: 'COMPLETED' | 'POSTPONED' | 'CANCELED'
  provider: string | null
  remarks: string | null
  lotNo: string
  patient?: { id: number; fullName: string; cid: string }
  vaccine?: { id: number; name: string; type: string }
  lot?: { lotNo: string; expirationDate: string; status: 'USABLE'|'NEAR_EXPIRE'|'EXPIRED' }
}

type Patient = { id: number; fullName: string; cid: string }
type Vaccine = { id: number; name: string }

const STATUS_BADGE: Record<VaccinationRecord['status'], string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  POSTPONED: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  CANCELED: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
}
const STATUS_THAI: Record<VaccinationRecord['status'], string> = {
  COMPLETED: 'สำเร็จ', POSTPONED: 'เลื่อน', CANCELED: 'ยกเลิก',
}

/** ───────────── UI helpers (สีม่วง+彩虹) ───────────── */
function IconBadge({
  children,
  ring = true,
  size = 'md',
}: {
  children: React.ReactNode
  ring?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const sz =
    size === 'sm'
      ? 'h-8 w-8 text-[14px]'
      : size === 'lg'
      ? 'h-12 w-12 text-[18px]'
      : 'h-10 w-10 text-[16px]'
  return (
    <span
      className={classNames(
        'inline-flex items-center justify-center rounded-xl text-white shadow-sm',
        'bg-gradient-to-tr from-sky-400 via-violet-400 to-pink-400',
        ring && 'ring-1 ring-violet-200/60'
      )}
      style={{ backdropFilter: 'saturate(140%) blur(0.5px)' }}
    >
      <span className={classNames('flex items-center justify-center', sz)}>{children}</span>
    </span>
  )
}

function RainbowChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-700 bg-white shadow-sm ring-1 ring-slate-200">
      <span className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400" />
      {label}
    </span>
  )
}

export default function VaccinationRecordsPage() {
  const [records, setRecords] = useState<VaccinationRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(false)

  const [patients, setPatients] = useState<Patient[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [patientId, setPatientId] = useState<number | ''>('')
  const [vaccineId, setVaccineId] = useState<number | ''>('')
  const [lotNo, setLotNo] = useState('')

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  async function load() {
    setLoading(true)
    try {
      const q = new URLSearchParams({
        page: String(page), limit: String(limit),
        ...(patientId ? { patientId: String(patientId) } : {}),
        ...(vaccineId ? { vaccineId: String(vaccineId) } : {}),
        ...(lotNo ? { lotNo } : {}),
      })
      const res = await fetch(`/api/vaccination-records?${q.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      setRecords(data.items || [])
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      const [pRes, vRes] = await Promise.all([
        fetch('/api/patients?limit=200', { cache: 'no-store' }),
        fetch('/api/cine?limit=200', { cache: 'no-store' }), // คงชื่อ endpoint ตามโค้ดเดิม
      ])
      setPatients((await pRes.json()).items || [])
      setVaccines((await vRes.json()).items || [])
    })()
  }, [])

  useEffect(() => { load() }, [page, patientId, vaccineId]) // eslint-disable-line

  return (
    <div className="relative min-h-screen px-4 py-8">
      {/* Pastel background with extra violet */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-50 via-sky-50 to-white" />
        <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-fuchsia-200/30 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 w-[28rem] h-[28rem] rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IconBadge size="lg"><ClipboardDocumentListIcon className="w-6 h-6" /></IconBadge>
            รายชื่อผู้ฉีก (Records)
          </h1>
          <RainbowChip label={`รวม ${total.toLocaleString()} รายการ`} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 bg-white border px-4 py-2 rounded-md shadow-sm hover:bg-slate-50 text-slate-700"
            title="รีเฟรช"
          >
            <SparklesIcon className="w-5 h-5 text-violet-500" />
            รีเฟรช
          </button>
          <a
            href="/vaccination-records/new"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 hover:opacity-95"
          >
            <ShieldCheckIcon className="w-5 h-5" />
            บันทึกการฉีดใหม่
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Patient */}
        <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
          <label className="mb-1 flex items-center gap-1 text-slate-600 text-sm">
            <UserIcon className="w-4 h-4" /> ผู้ป่วย
          </label>
          <select
            value={patientId}
            onChange={e=>{ setPage(1); setPatientId(Number(e.target.value)||'') }}
            className="w-full bg-transparent focus:outline-none text-slate-800"
          >
            <option value="">ทั้งหมด</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.cid})</option>)}
          </select>
        </div>

        {/* Vaccine */}
        <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
          <label className="mb-1 flex items-center gap-1 text-slate-600 text-sm">
            <BeakerIcon className="w-4 h-4" /> วัคซีน
          </label>
          <select
            value={vaccineId}
            onChange={e=>{ setPage(1); setVaccineId(Number(e.target.value)||'') }}
            className="w-full bg-transparent focus:outline-none text-slate-800"
          >
            <option value="">ทั้งหมด</option>
            {vaccines.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        {/* Lot search */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
          <label className="mb-1 flex items-center gap-1 text-slate-600 text-sm">
            <RectangleStackIcon className="w-4 h-4" /> ค้นหาล็อต
          </label>
          <div className="flex gap-2">
            <input
              value={lotNo}
              onChange={e=>setLotNo(e.target.value)}
              placeholder="ใส่ LotNo"
              className="flex-1 bg-transparent focus:outline-none text-slate-800"
            />
            <button
              onClick={()=>{ setPage(1); load() }}
              className="px-3 py-2 rounded-md text-slate-700 bg-white ring-1 ring-slate-200 hover:bg-slate-50 flex items-center gap-1"
            >
              <FunnelIcon className="w-4 h-4" /> กรอง
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-xl shadow-md ring-1 ring-slate-200 text-sm">
          <thead className="bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 text-slate-700">
            <tr>
              <th className="p-3 text-left">วันที่</th>
              <th className="p-3 text-left">ผู้ป่วย</th>
              <th className="p-3 text-left">วัคซีน</th>
              <th className="p-3 text-left">เข็ม</th>
              <th className="p-3 text-left">ล็อต / หมดอายุ</th>
              <th className="p-3 text-left">สถานะ</th>
              <th className="p-3 text-left">ผู้ให้บริการ</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">กำลังโหลด…</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-slate-400">ไม่มีประวัติ</td></tr>
            ) : records.map(r => (
              <tr key={r.id} className="border-t border-slate-200/60 hover:bg-gradient-to-r hover:from-violet-50/70 hover:to-sky-50/70 transition-colors">
                <td className="p-3 text-slate-700">{new Date(r.vaccinationDate).toLocaleDateString()}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3 text-slate-800">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-violet-200 via-fuchsia-200 to-sky-200 ring-1 ring-violet-200 text-slate-700 text-sm">
                      {r.patient?.fullName?.[0] ?? '?'}
                    </span>
                    <div>
                      <div className="font-medium">{r.patient?.fullName}</div>
                      <div className="text-xs text-slate-500">{r.patient?.cid}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-slate-700">{r.vaccine?.name}</td>
                <td className="p-3 text-slate-700">{r.doseNumber ?? '-'}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">{r.lotNo}</span>
                      {r.lot?.expirationDate ? (
                        <span className="text-xs text-slate-500">หมดอายุ {new Date(r.lot.expirationDate).toLocaleDateString()}</span>
                      ) : null}
                    </div>
                    {r.lot?.status === 'NEAR_EXPIRE' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5" /> ใกล้หมดอายุ
                      </span>
                    )}
                    {r.lot?.status === 'EXPIRED' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                        หมดอายุแล้ว
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <span className={classNames('px-2 py-1 rounded-full text-xs font-semibold', STATUS_BADGE[r.status])}>
                    {STATUS_THAI[r.status]}
                  </span>
                </td>
                <td className="p-3 text-slate-700">{r.provider ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <RainbowChip label={`รวม ${total.toLocaleString()} รายการ`} />
        <div className="flex items-center gap-2">
          <button
            disabled={page<=1}
            onClick={()=>setPage(p=>Math.max(1,p-1))}
            className="px-3 py-1 rounded-md bg-white ring-1 ring-slate-200 disabled:opacity-50 shadow-sm hover:bg-slate-50 flex items-center gap-1"
          >
            <ArrowLeftIcon className="w-4 h-4" /> ก่อนหน้า
          </button>
          <span className="text-slate-700">หน้า {page}/{pages}</span>
          <button
            disabled={page>=pages}
            onClick={()=>setPage(p=>Math.min(pages,p+1))}
            className="px-3 py-1 rounded-md bg-white ring-1 ring-slate-200 disabled:opacity-50 shadow-sm hover:bg-slate-50 flex items-center gap-1"
          >
            ถัดไป <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
