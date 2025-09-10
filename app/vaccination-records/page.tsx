'use client'

import { useEffect, useMemo, useState } from 'react'
import { BeakerIcon, UserIcon, RectangleStackIcon, FunnelIcon } from '@heroicons/react/24/outline'

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
  COMPLETED: 'bg-green-100 text-green-700',
  POSTPONED: 'bg-amber-100 text-amber-700',
  CANCELED: 'bg-rose-100 text-rose-700',
}
const STATUS_THAI: Record<VaccinationRecord['status'], string> = {
  COMPLETED: 'สำเร็จ', POSTPONED: 'เลื่อน', CANCELED: 'ยกเลิก',
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
        fetch('/api/cine?limit=200', { cache: 'no-store' }),
      ])
      setPatients((await pRes.json()).items || [])
      setVaccines((await vRes.json()).items || [])
    })()
  }, [])

  useEffect(() => { load() }, [page, patientId, vaccineId]) // eslint-disable-line

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">ประวัติการฉีดวัคซีน</h1>
          <a href="/vaccination-records/new" className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">
            บันทึกการฉีดใหม่
          </a>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 text-sm">
          <div>
            <label className="mb-1 flex items-center gap-1"><UserIcon className="w-4 h-4" /> ผู้ป่วย</label>
            <select value={patientId} onChange={e=>{ setPage(1); setPatientId(Number(e.target.value)||'') }}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800">
              <option value="">ทั้งหมด</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.cid})</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1"><BeakerIcon className="w-4 h-4" /> วัคซีน</label>
            <select value={vaccineId} onChange={e=>{ setPage(1); setVaccineId(Number(e.target.value)||'') }}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800">
              <option value="">ทั้งหมด</option>
              {vaccines.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 flex items-center gap-1"><RectangleStackIcon className="w-4 h-4" /> ค้นหาล็อต</label>
            <div className="flex gap-2">
              <input value={lotNo} onChange={e=>setLotNo(e.target.value)} placeholder="ใส่ LotNo"
                className="flex-1 border rounded px-3 py-2 bg-white dark:bg-gray-800"/>
              <button onClick={()=>{ setPage(1); load() }} className="px-3 py-2 border rounded flex items-center gap-1">
                <FunnelIcon className="w-4 h-4" /> กรอง
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
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
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-6 text-center">กำลังโหลด…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-gray-500">ไม่มีประวัติ</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{new Date(r.vaccinationDate).toLocaleDateString()}</td>
                  <td className="p-3">{r.patient?.fullName} <span className="text-gray-500">({r.patient?.cid})</span></td>
                  <td className="p-3">{r.vaccine?.name}</td>
                  <td className="p-3">{r.doseNumber ?? '-'}</td>
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{r.lotNo}</span>
                      {r.lot?.expirationDate ? <span className="text-xs text-gray-500">หมดอายุ {new Date(r.lot.expirationDate).toLocaleDateString()}</span> : null}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${STATUS_BADGE[r.status]}`}>
                      {STATUS_THAI[r.status]}
                    </span>
                  </td>
                  <td className="p-3">{r.provider ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4 text-sm">
          <span>ทั้งหมด {total} รายการ</span>
          <div className="flex gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 border rounded disabled:opacity-50">ก่อนหน้า</button>
            <span>หน้า {page}/{pages}</span>
            <button disabled={page>=pages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 border rounded disabled:opacity-50">ถัดไป</button>
          </div>
        </div>
      </div>
    </div>
  )
}
