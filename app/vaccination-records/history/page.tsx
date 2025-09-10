'use client'

import { useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import {
  UserIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  ClockIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import {
  UserGroupIcon,
  PhoneIcon,
  IdentificationIcon,
  HeartIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid'
import PatientModal from '@/components/patients/PatientModal'

/* ========= UI helpers (สีม่วง+彩虹) ========= */
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

type LotStatus = 'USABLE' | 'NEAR_EXPIRE' | 'EXPIRED'

type VStatus = 'COMPLETED' | 'POSTPONED' | 'CANCELED'

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
  COMPLETED: 'bg-emerald-100 text-emerald-700',
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
const LOT_BADGE: Record<LotStatus, string> = {
  USABLE: 'bg-violet-100 text-violet-700',
  NEAR_EXPIRE: 'bg-amber-100 text-amber-700',
  EXPIRED: 'bg-rose-100 text-rose-700',
}
const LOT_THAI: Record<LotStatus, string> = {
  USABLE: 'พร้อมใช้',
  NEAR_EXPIRE: 'ใกล้หมดอายุ',
  EXPIRED: 'หมดอายุ',
}

const fmtDate = (d?: string | null) => {
  if (!d) return '-'
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString()
}
async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  const text = await res.text()
  if (!res.ok) throw new Error(`[${res.status}] ${url} → ${text.slice(0, 200)}`)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Expected JSON from ${url} but got: ${text.slice(0, 120)}`)
  }
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
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page])

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
    <div className="relative min-h-screen px-4 py-8">
      {/* Pastel background with extra violet (match VaccineStockPage) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-50 via-sky-50 to-white" />
        <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-fuchsia-200/30 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 w-[28rem] h-[28rem] rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IconBadge size="lg"><UserGroupIcon className="w-6 h-6" /></IconBadge>
            ผู้รับวัคซีน (Patients)
          </h1>
          <RainbowChip label={`รวม ${total.toLocaleString()} คน`} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 bg-white border px-4 py-2 rounded-md shadow-sm hover:bg-slate-50 text-slate-700"
            title="รีเฟรช"
          >
            <ArrowPathIcon className="w-5 h-5 text-sky-500" />
            รีเฟรช
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 hover:opacity-95"
          >
            <UserIcon className="w-5 h-5" />
            เพิ่มผู้ป่วย
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center border px-3 py-2 rounded-md bg-white border-slate-200">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setPage(1)
              setQ(e.target.value)
            }}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
            placeholder="ค้นหาชื่อ / CID / เบอร์โทร / แพ้ยา / โรคประจำตัว"
            className="ml-2 w-full bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPage(1)
              load()
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-95"
          >
            ค้นหา
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-xl shadow-md ring-1 ring-slate-200">
          <thead className="bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 text-slate-700">
            <tr>
              <th className="px-4 py-2 text-left">ชื่อ-นามสกุล</th>
              <th className="px-4 py-2 text-left">วันเกิด</th>
              <th className="px-4 py-2 text-center">เพศ</th>
              <th className="px-4 py-2 text-left">CID</th>
              <th className="px-4 py-2 text-left">เบอร์โทร</th>
              <th className="px-4 py-2 text-left">แพ้ยา/วัคซีน</th>
              <th className="px-4 py-2 text-left">โรคประจำตัว</th>
              <th className="px-4 py-2 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">กำลังโหลด...</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">ไม่พบข้อมูล</td>
              </tr>
            )}
            {!loading && items.map((p) => (
              <tr
                key={p.id}
                className="border-t border-slate-200/60 hover:bg-gradient-to-r hover:from-violet-50/70 hover:to-sky-50/70 transition-colors"
              >
                <td className="px-4 py-2 font-medium text-slate-800 flex items-center gap-3">
                  {/* Avatar-like initial */}
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-violet-200 via-fuchsia-200 to-sky-200 ring-1 ring-violet-200 text-slate-700 text-sm">
                    {p.fullName?.[0] ?? '?'}
                  </span>
                  {p.fullName}
                  {p.allergies && (
                    <span
                      className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-rose-700 bg-rose-50 ring-1 ring-rose-200"
                      title={p.allergies}
                    >
                      <HeartIcon className="w-3.5 h-3.5" /> แพ้ยา
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">{fmtDate(p.birthDate)}</td>
                <td className="px-4 py-2 text-center">
                  <span className={classNames('px-2 py-1 text-sm rounded-full font-semibold',
                    p.gender === 'MALE'
                      ? 'bg-sky-100 text-sky-700'
                      : p.gender === 'FEMALE'
                      ? 'bg-pink-100 text-pink-700'
                      : 'bg-violet-100 text-violet-700')}
                  >
                    {GENDER_THAI[p.gender]}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-700 font-mono tracking-wide">
                  <span className="inline-flex items-center gap-1">
                    <IdentificationIcon className="w-4 h-4 text-slate-400" /> {p.cid}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-700">
                  {p.phone ? (
                    <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 hover:underline">
                      <PhoneIcon className="w-4 h-4 text-slate-400" /> {p.phone}
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-2 max-w-[220px] truncate text-slate-600" title={p.allergies ?? ''}>{p.allergies ?? '-'}</td>
                <td className="px-4 py-2 max-w-[220px] truncate text-slate-600" title={p.underlyingConditions ?? ''}>{p.underlyingConditions ?? '-'}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => openHistory(p)}
                      className="p-1.5 rounded-full hover:bg-emerald-50 text-emerald-600"
                      title="ดูประวัติ"
                    >
                      <ClipboardDocumentListIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded-full hover:bg-emerald-50 text-emerald-600"
                      title="แก้ไข"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-full hover:bg-rose-50 text-rose-600"
                      title="ลบ"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
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
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 rounded-md bg-white ring-1 ring-slate-200 disabled:opacity-50 shadow-sm hover:bg-slate-50 flex items-center gap-1"
          >
            <ArrowLeftIcon className="w-4 h-4" /> ก่อนหน้า
          </button>
          <span className="text-slate-700">หน้า {page} / {pages}</span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="px-3 py-1 rounded-md bg-white ring-1 ring-slate-200 disabled:opacity-50 shadow-sm hover:bg-slate-50 flex items-center gap-1"
          >
            ถัดไป <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <PatientModal
          editing={editing} 
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            load()
          }}
        />
      )}

      {/* ===== Drawer: ประวัติของผู้ป่วยที่เลือก ===== */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-xl transform transition-transform duration-300 z-50 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full bg-white shadow-2xl ring-1 ring-slate-200 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50">
            <div className="flex items-center gap-2 text-slate-800">
              <IconBadge size="sm"><ClipboardDocumentListIcon className="w-4.5 h-4.5" /></IconBadge>
              <div className="font-semibold">
                ประวัติ — {selectedPatient ? `${selectedPatient.fullName} (${selectedPatient.cid})` : '-'}
              </div>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-2 rounded hover:bg-slate-100"
              aria-label="ปิด"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Profile */}
            <div className="rounded-xl p-4 bg-white ring-1 ring-slate-200">
              <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                <div><span className="text-slate-500">ชื่อ-นามสกุล:</span> {selectedPatient?.fullName ?? '-'}</div>
                <div><span className="text-slate-500">CID:</span> {selectedPatient?.cid ?? '-'}</div>
                <div><span className="text-slate-500">เพศ:</span> {selectedPatient ? GENDER_THAI[selectedPatient.gender] : '-'}</div>
                <div><span className="text-slate-500">วันเกิด:</span> {fmtDate(selectedPatient?.birthDate)}</div>
                <div className="sm:col-span-2"><span className="text-slate-500">เบอร์โทร:</span> {selectedPatient?.phone || '-'}</div>
                <div className="sm:col-span-2"><span className="text-slate-500">ที่อยู่:</span> {selectedPatient?.address || '-'}</div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500">แพ้ยา/วัคซีน:</span>{' '}
                  {selectedPatient?.allergies ? (
                    <span className="inline-block mt-1 px-2 py-1 rounded bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                      {selectedPatient.allergies}
                    </span>
                  ) : '-'}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500">โรคประจำตัว:</span>{' '}
                  {selectedPatient?.underlyingConditions ? (
                    <span className="inline-block mt-1 px-2 py-1 rounded bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                      {selectedPatient.underlyingConditions}
                    </span>
                  ) : '-'}
                </div>
              </div>
            </div>

            {/* History */}
            <div className="rounded-xl p-4 bg-white ring-1 ring-slate-200">
              <div className="font-semibold mb-3 text-slate-800">ประวัติการฉีด</div>

              {drawerLoading ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <ClockIcon className="w-5 h-5 animate-spin" />
                  กำลังโหลดประวัติ…
                </div>
              ) : historyItems.length === 0 ? (
                <div className="text-slate-500">ยังไม่มีประวัติการฉีดสำหรับผู้ป่วยรายนี้</div>
              ) : (
                <ul className="space-y-3">
                  {historyItems.map((r) => (
                    <li key={r.id} className="rounded-lg p-3 bg-white ring-1 ring-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-slate-800">{new Date(r.vaccinationDate).toLocaleString()}</div>
                        <span className={classNames('px-2 py-0.5 rounded-full text-xs inline-flex items-center gap-1', STATUS_BADGE[r.status])}>
                          {r.status === 'COMPLETED' ? (
                            <ShieldCheckIcon className="w-3.5 h-3.5" />
                          ) : r.status === 'POSTPONED' ? (
                            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                          ) : null}
                          {STATUS_THAI[r.status]}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                        <div><span className="text-slate-500">วัคซีน:</span> {r.vaccine?.name ?? '-'}</div>
                        <div><span className="text-slate-500">เข็มที่:</span> {r.doseNumber ?? '-'}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">ล็อต:</span> {r.lotNo}
                          {r.lot?.status && (
                            <span className={classNames('px-1.5 py-0.5 rounded-full text-[11px] font-medium', LOT_BADGE[r.lot.status])}>
                              {LOT_THAI[r.lot.status]}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-500">หมดอายุ:</span>{' '}
                          {r.lot?.expirationDate ? new Date(r.lot.expirationDate).toLocaleDateString() : '-'}
                        </div>
                        <div><span className="text-slate-500">ตำแหน่งฉีด:</span> {r.injectionSite ?? '-'}</div>
                        <div><span className="text-slate-500">ผู้ให้บริการ:</span> {r.provider ?? '-'}</div>
                      </div>

                      {r.remarks ? (
                        <div className="mt-2 text-sm text-slate-700">
                          <span className="text-slate-500">หมายเหตุ:</span> {r.remarks}
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setDrawerOpen(false)} />
      )}
    </div>
  )
}
