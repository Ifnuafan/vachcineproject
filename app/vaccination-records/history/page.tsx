'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  UserIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import PatientModal from '@/components/patients/PatientModal'

/* ========= Types ========= */
type Gender = 'MALE' | 'FEMALE' | 'OTHER'
type Patient = {
  id: number
  fullName: string
  birthDate: string
  gender: Gender
  cid: string
  address?: string | null
  phone?: string | null
  allergies?: string | null
  underlyingConditions?: string | null
}
type LotStatus = 'USABLE'|'NEAR_EXPIRE'|'EXPIRED'
type VStatus = 'COMPLETED'|'POSTPONED'|'CANCELED'
type VaccinationRecord = {
  id: number
  vaccinationDate: string
  doseNumber: number | null
  injectionSite: string | null
  status: VStatus
  provider: string | null
  remarks: string | null
  lotNo: string
  patient?: { id: number; fullName: string; cid: string }
  vaccine?: { id: number; name: string; type?: string }
  lot?: { lotNo: string; expirationDate: string | null; status: LotStatus }
}

/* ========= Helpers ========= */
const STATUS_BADGE: Record<VStatus, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  POSTPONED: 'bg-amber-100 text-amber-700',
  CANCELED: 'bg-rose-100 text-rose-700',
}
const STATUS_THAI: Record<VStatus, string> = {
  COMPLETED: 'สำเร็จ',
  POSTPONED: 'เลื่อน',
  CANCELED: 'ยกเลิก',
}
const GENDER_THAI: Record<Gender, string> = {
  MALE: 'ชาย',
  FEMALE: 'หญิง',
  OTHER: 'ไม่ระบุ',
}
function fmtDate(d?: string | null) {
  if (!d) return '-'
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString()
}
async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  const text = await res.text()
  if (!res.ok) throw new Error(`[${res.status}] ${url} → ${text.slice(0,200)}`)
  try { return JSON.parse(text) } catch { throw new Error(`Expected JSON from ${url} but got: ${text.slice(0,120)}`) }
}

/* ========= Page ========= */
export default function PatientsPage() {
  const [items, setItems] = useState<Patient[]>([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)

  // Drawer: ประวัติของผู้ป่วยหนึ่งคน
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [historyItems, setHistoryItems] = useState<VaccinationRecord[]>([])

  const pages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit])

  async function load() {
    setLoading(true)
    try {
      const data = await fetchJSON(`/api/patients?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`)
      setItems(data.items || [])
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [q, page]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }
  function openEdit(p: Patient) {
    setEditing(p)
    setOpen(true)
  }
  async function handleDelete(id: number) {
    if (!confirm('ลบรายการนี้?')) return
    const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' })
    if (res.ok) load()
    else alert('ลบไม่สำเร็จ')
  }

  async function openHistory(p: Patient) {
    // ถ้ากังวลว่า p ข้อมูลไม่ครบ สามารถ fetch เพิ่มเติมได้:
    // const full = await fetchJSON(`/api/patients/${p.id}`)
    // setSelectedPatient({ ...p, ...full })
    setSelectedPatient(p)
    setDrawerOpen(true)
    setDrawerLoading(true)
    try {
      const data = await fetchJSON(`/api/vaccination-records?patientId=${p.id}&limit=100`)
      setHistoryItems(data.items || [])
    } catch (e) {
      console.error('Load history error:', e)
      setHistoryItems([])
      alert('โหลดประวัติไม่สำเร็จ')
    } finally {
      setDrawerLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-blue-100 via-teal-100 to-emerald-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto backdrop-blur-xl bg-white/70 dark:bg-gray-900/50 border border-white/60 dark:border-white/10 rounded-2xl shadow-xl p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
            <UserIcon className="w-6 h-6 text-blue-600" />
            ผู้รับวัคซีน (Patients)
          </h1>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
            เพิ่มผู้ป่วย
          </button>
        </div>

        {/* Search */}
        <div className="mb-4 flex gap-2">
          <input
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value) }}
            placeholder="ค้นหาชื่อ / CID / เบอร์โทร / แพ้ยา / โรคประจำตัว"
            className="w-full border rounded-md px-4 py-2 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white"
          />
          <button onClick={load} className="px-4 py-2 border rounded-md bg-gray-100 hover:bg-gray-200 transition dark:bg-gray-700 dark:text-white dark:border-gray-600">
            ค้นหา
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border rounded-lg shadow-sm">
          <table className="min-w-full text-sm text-gray-800 dark:text-white">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left">
              <tr>
                {[
                  'ชื่อ-นามสกุล',
                  'วันเกิด',
                  'เพศ',
                  'CID',
                  'เบอร์โทร',
                  'แพ้ยา/วัคซีน',
                  'โรคประจำตัว',
                  'จัดการ',
                ].map(h => (
                  <th key={h} className="p-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="p-6 text-center">⏳ กำลังโหลด…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-red-500">ไม่พบข้อมูล</td></tr>
              )}
              {!loading && items.length > 0 && items.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-3">{p.fullName}</td>
                  <td className="p-3">{fmtDate(p.birthDate)}</td>
                  <td className="p-3">{GENDER_THAI[p.gender]}</td>
                  <td className="p-3">{p.cid}</td>
                  <td className="p-3">{p.phone ?? '-'}</td>
                  <td className="p-3 max-w-[200px] truncate" title={p.allergies ?? ''}>{p.allergies ?? '-'}</td>
                  <td className="p-3 max-w-[200px] truncate" title={p.underlyingConditions ?? ''}>{p.underlyingConditions ?? '-'}</td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openHistory(p)}
                        className="flex items-center gap-1 px-3 py-1 border rounded-md text-emerald-700 hover:bg-emerald-50"
                        title="ดูประวัติการฉีดของผู้ป่วยรายนี้"
                      >
                        <ClipboardDocumentListIcon className="w-4 h-4" />
                        ดูประวัติ
                      </button>
                      <button onClick={() => openEdit(p)} className="flex items-center gap-1 px-3 py-1 border rounded-md text-blue-600 hover:bg-blue-50">
                        <PencilSquareIcon className="w-4 h-4" />
                        แก้ไข
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700">
                        <TrashIcon className="w-4 h-4" />
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 text-sm text-gray-700 dark:text-gray-300">
          <span>รวม {total} รายการ</span>
          <div className="flex gap-2 items-center">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="flex items-center gap-1 px-3 py-1 border rounded disabled:opacity-50">
              <ArrowLeftIcon className="w-4 h-4" />
              ก่อนหน้า
            </button>
            <span>หน้า {page}/{pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 px-3 py-1 border rounded disabled:opacity-50">
              ถัดไป
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal */}
        {open && (
          <PatientModal
            editing={editing}
            onClose={() => setOpen(false)}
            onSaved={() => { setOpen(false); load() }}
          />
        )}
      </div>

      {/* ===== Drawer: ประวัติของผู้ป่วยที่เลือก ===== */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-xl transform transition-transform duration-300 z-50
        ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/50 backdrop-blur">
            <div className="flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-5 h-5 text-emerald-600" />
              <div className="font-semibold">
                ประวัติ — {selectedPatient ? `${selectedPatient.fullName} (${selectedPatient.cid})` : '-'}
              </div>
            </div>
            <button
              onClick={()=>setDrawerOpen(false)}
              className="p-2 rounded hover:bg-gray-200/60 dark:hover:bg-gray-800"
              aria-label="ปิด"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Profile */}
            <div className="border rounded-xl p-4 bg-white/70 dark:bg-gray-900/60">
              <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><span className="text-gray-500">ชื่อ-นามสกุล:</span> {selectedPatient?.fullName ?? '-'}</div>
                <div><span className="text-gray-500">CID:</span> {selectedPatient?.cid ?? '-'}</div>
                <div><span className="text-gray-500">เพศ:</span> {selectedPatient ? GENDER_THAI[selectedPatient.gender] : '-'}</div>
                <div><span className="text-gray-500">วันเกิด:</span> {fmtDate(selectedPatient?.birthDate)}</div>
                <div className="sm:col-span-2"><span className="text-gray-500">เบอร์โทร:</span> {selectedPatient?.phone || '-'}</div>
                <div className="sm:col-span-2"><span className="text-gray-500">ที่อยู่:</span> {selectedPatient?.address || '-'}</div>
                <div className="sm:col-span-2">
                  <span className="text-gray-500">แพ้ยา/วัคซีน:</span>{' '}
                  {selectedPatient?.allergies ? (
                    <span className="inline-block mt-1 px-2 py-1 rounded bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
                      {selectedPatient.allergies}
                    </span>
                  ) : '-'}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-gray-500">โรคประจำตัว:</span>{' '}
                  {selectedPatient?.underlyingConditions ? (
                    <span className="inline-block mt-1 px-2 py-1 rounded bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                      {selectedPatient.underlyingConditions}
                    </span>
                  ) : '-'}
                </div>
              </div>
            </div>

            {/* History */}
            <div className="border rounded-xl p-4 bg-white/70 dark:bg-gray-900/60">
              <div className="font-semibold mb-3">ประวัติการฉีด</div>

              {drawerLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <ClockIcon className="w-5 h-5 animate-spin" />
                  กำลังโหลดประวัติ…
                </div>
              ) : historyItems.length === 0 ? (
                <div className="text-gray-500">ยังไม่มีประวัติการฉีดสำหรับผู้ป่วยรายนี้</div>
              ) : (
                <ul className="space-y-3">
                  {historyItems.map((r) => (
                    <li key={r.id} className="border rounded-lg p-3 bg-white/60 dark:bg-gray-900/60">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{new Date(r.vaccinationDate).toLocaleString()}</div>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[r.status]}`}>
                          {STATUS_THAI[r.status]}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">วัคซีน:</span> {r.vaccine?.name ?? '-'}</div>
                        <div><span className="text-gray-500">เข็มที่:</span> {r.doseNumber ?? '-'}</div>
                        <div><span className="text-gray-500">ล็อต:</span> {r.lotNo}</div>
                        <div>
                          <span className="text-gray-500">หมดอายุ:</span>{' '}
                          {r.lot?.expirationDate ? new Date(r.lot.expirationDate).toLocaleDateString() : '-'}
                        </div>
                        <div><span className="text-gray-500">ตำแหน่งฉีด:</span> {r.injectionSite ?? '-'}</div>
                        <div><span className="text-gray-500">ผู้ให้บริการ:</span> {r.provider ?? '-'}</div>
                      </div>

                      {r.remarks ? (
                        <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="text-gray-500">หมายเหตุ:</span> {r.remarks}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* overlay ปิด drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={()=>setDrawerOpen(false)} />
      )}
    </div>
  )
}
