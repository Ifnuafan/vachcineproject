'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import classNames from 'classnames'
import {
  UserIcon,
  BeakerIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid'

/* ========= Types ========= */
type LotStatus = 'USABLE' | 'NEAR_EXPIRE' | 'EXPIRED'
type VStatus = 'COMPLETED' | 'POSTPONED' | 'CANCELED'

type Patient = {
  id: number
  fullName: string
  birthDate: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  cid: string
  address?: string | null
  phone?: string | null
  allergies?: string | null
  underlyingConditions?: string | null
}

type Vaccine = { id: number; name: string }

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

/* ========= UI helpers ========= */
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
        'inline-flex items-center justify-center rounded-2xl text-white shadow-sm',
        'bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-sky-500',
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

const STATUS_BADGE: Record<VStatus, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  POSTPONED: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  CANCELED: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
}
const STATUS_THAI: Record<VStatus, string> = {
  COMPLETED: 'สำเร็จ', POSTPONED: 'เลื่อน', CANCELED: 'ยกเลิก',
}
const LOT_BADGE: Record<LotStatus, string> = {
  USABLE: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
  NEAR_EXPIRE: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  EXPIRED: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
}
const LOT_THAI: Record<LotStatus, string> = {
  USABLE: 'พร้อมใช้',
  NEAR_EXPIRE: 'ใกล้หมดอายุ',
  EXPIRED: 'หมดอายุ',
}

/* ========= utils ========= */
function fmtDateTime(d?: string | null) {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '-'
  return dt.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
function fmtDate(d?: string | null) {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '-'
  return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}
async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  const text = await res.text()
  if (!res.ok) throw new Error(`[${res.status}] ${url} → ${text.slice(0, 200)}`)
  try { return JSON.parse(text) } catch { throw new Error(`Expected JSON: ${text.slice(0,120)}`) }
}
function downloadCSV(filename: string, rows: any[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const v = r[h] ?? ''
      const s = String(v).replace(/"/g, '""')
      return /[",\n]/.test(s) ? `"${s}"` : s
    }).join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ========= Page ========= */
export default function PatientRecordsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const patientId = Number(params?.id)

  const [patient, setPatient] = useState<Patient | null>(null)
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [records, setRecords] = useState<VaccinationRecord[]>([])
  const [loading, setLoading] = useState(false)

  // filters
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline')
  const [vaccineId, setVaccineId] = useState<number | ''>('')
  const [status, setStatus] = useState<VStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!patientId) return
    (async () => {
      setLoading(true)
      try {
        const [p, rec, vs] = await Promise.all([
          fetchJSON(`/api/patients/${patientId}`),
          fetchJSON(`/api/vaccination-records?patientId=${patientId}&limit=500`),
          fetchJSON(`/api/cine?limit=200`), // ชื่อ endpoint ตามระบบเดิม
        ])
        setPatient(p)
        setRecords(rec.items || [])
        setVaccines(vs.items || [])
      } catch (e) {
        console.error(e)
        setRecords([])
      } finally {
        setLoading(false)
      }
    })()
  }, [patientId])

  const filtered = useMemo(() => {
    let list = [...records]
    if (vaccineId) list = list.filter(r => r.vaccine?.id === Number(vaccineId))
    if (status) list = list.filter(r => r.status === status)
    if (dateFrom) {
      const from = new Date(dateFrom + 'T00:00:00')
      list = list.filter(r => new Date(r.vaccinationDate) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59')
      list = list.filter(r => new Date(r.vaccinationDate) <= to)
    }
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      list = list.filter(r =>
        (r.lotNo || '').toLowerCase().includes(s) ||
        (r.provider || '').toLowerCase().includes(s) ||
        (r.remarks || '').toLowerCase().includes(s)
      )
    }
    // เรียงล่าสุดก่อน
    list.sort((a,b)=> new Date(b.vaccinationDate).getTime() - new Date(a.vaccinationDate).getTime())
    return list
  }, [records, vaccineId, status, dateFrom, dateTo, q])

  // quick stats
  const stats = useMemo(() => {
    const total = filtered.length
    const latest = filtered[0]
    const byVaccine = new Map<string, number>()
    filtered.forEach(r => {
      const k = r.vaccine?.name || 'Unknown'
      byVaccine.set(k, (byVaccine.get(k) || 0) + 1)
    })
    let topVac = ''
    let topCnt = 0
    for (const [k,v] of byVaccine.entries()) {
      if (v > topCnt) { topVac = k; topCnt = v }
    }
    return { total, latest, topVac }
  }, [filtered])

  function handleExportCSV() {
    const rows = filtered.map(r => ({
      record_id: r.id,
      patient_id: patient?.id,
      patient_name: patient?.fullName,
      cid: patient?.cid,
      vaccination_datetime: new Date(r.vaccinationDate).toISOString(),
      vaccination_local: fmtDateTime(r.vaccinationDate),
      vaccine: r.vaccine?.name || '',
      dose_number: r.doseNumber ?? '',
      injection_site: r.injectionSite ?? '',
      status: r.status,
      provider: r.provider ?? '',
      lot_no: r.lotNo,
      lot_expiration: r.lot?.expirationDate ? new Date(r.lot.expirationDate).toISOString() : '',
      lot_status: r.lot?.status ?? '',
      remarks: r.remarks ?? '',
    }))
    downloadCSV(`patient_${patient?.id}_records.csv`, rows)
  }

  return (
    <div className="relative min-h-screen px-4 py-8">
      {/* Pastel background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-50 via-sky-50 to-white" />
        <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-fuchsia-200/30 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 w-[28rem] h-[28rem] rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded-md bg-white ring-1 ring-slate-200 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
          >
            <ArrowLeftIcon className="w-4 h-4" /> กลับ
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IconBadge size="lg"><UserIcon className="w-6 h-6" /></IconBadge>
            {patient ? `ประวัติผู้ป่วย — ${patient.fullName}` : 'ประวัติผู้ป่วย'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/vaccination-records/new"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 hover:opacity-95"
          >
            <ShieldCheckIcon className="w-5 h-5" />
            บันทึกการฉีดใหม่
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white border px-4 py-2 rounded-md shadow-sm hover:bg-slate-50 text-slate-700"
            title="พิมพ์"
          >
            <PrinterIcon className="w-5 h-5" />
            พิมพ์
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white border px-4 py-2 rounded-md shadow-sm hover:bg-slate-50 text-slate-700"
            title="Export CSV"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Patient mini-card */}
      <div className="mb-6 rounded-xl bg-white ring-1 ring-slate-200 p-4">
        {patient ? (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-violet-200 via-fuchsia-200 to-sky-200 ring-1 ring-violet-200 text-slate-700 text-lg">
                {patient.fullName?.[0] ?? '?'}
              </span>
              <div>
                <div className="font-semibold text-slate-800">{patient.fullName}</div>
                <div className="text-sm text-slate-600">
                  CID: <span className="font-mono">{patient.cid}</span> • เกิด {fmtDate(patient.birthDate)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RainbowChip label={`รวม ${records.length.toLocaleString()} รายการ`} />
              {stats.latest && (
                <RainbowChip label={`ล่าสุด ${fmtDateTime(stats.latest.vaccinationDate)}`} />
              )}
              {stats.topVac && <RainbowChip label={`วัคซีนที่พบมาก: ${stats.topVac}`} />}
            </div>
          </div>
        ) : (
          <div className="text-slate-500">กำลังโหลดข้อมูลผู้ป่วย…</div>
        )}
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 flex-1">
          <div className="bg-white ring-1 ring-slate-200 rounded-md px-3 py-2">
            <label className="mb-1 flex items-center gap-1 text-slate-600 text-sm">
              <BeakerIcon className="w-4 h-4" /> วัคซีน
            </label>
            <select
              value={vaccineId}
              onChange={(e) => setVaccineId(Number(e.target.value) || '')}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            >
              <option value="">ทั้งหมด</option>
              {vaccines.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          <div className="bg-white ring-1 ring-slate-200 rounded-md px-3 py-2">
            <label className="mb-1 flex items-center gap-1 text-slate-600 text-sm">สถานะ</label>
            <select
              value={status}
              onChange={(e) => setStatus((e.target.value as VStatus) || '')}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            >
              <option value="">ทั้งหมด</option>
              <option value="COMPLETED">สำเร็จ</option>
              <option value="POSTPONED">เลื่อน</option>
              <option value="CANCELED">ยกเลิก</option>
            </select>
          </div>

          <div className="bg-white ring-1 ring-slate-200 rounded-md px-3 py-2">
            <label className="mb-1 flex items-center gap-1 text-slate-600 text-sm">
              <CalendarDaysIcon className="w-4 h-4" /> จากวันที่
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e)=>setDateFrom(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            />
          </div>

          <div className="bg-white ring-1 ring-slate-200 rounded-md px-3 py-2">
            <label className="mb-1 flex items-center gap-1 text-slate-600 text-sm">
              <CalendarDaysIcon className="w-4 h-4" /> ถึงวันที่
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e)=>setDateTo(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            />
          </div>

          <div className="bg-white ring-1 ring-slate-200 rounded-md px-3 py-2 md:col-span-1">
            <label className="mb-1 flex items-center gap-1 text-slate-600 text-sm">
              <MagnifyingGlassIcon className="w-4 h-4" /> ค้นหา
            </label>
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="ล็อต/ผู้ให้บริการ/หมายเหตุ"
              className="w-full bg-transparent focus:outline-none text-slate-800"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('timeline')}
            className={classNames(
              'px-3 py-2 rounded-md ring-1 shadow-sm',
              viewMode === 'timeline'
                ? 'bg-violet-600 text-white ring-violet-600'
                : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
            )}
          >
            Timeline
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={classNames(
              'px-3 py-2 rounded-md ring-1 shadow-sm',
              viewMode === 'table'
                ? 'bg-violet-600 text-white ring-violet-600'
                : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
            )}
          >
            Table
          </button>
          <button
            onClick={() => {
              setVaccineId(''); setStatus(''); setDateFrom(''); setDateTo(''); setQ('')
            }}
            className="px-3 py-2 rounded-md bg-white ring-1 ring-slate-200 shadow-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
          >
            <ArrowPathIcon className="w-4 h-4" />
            รีเซ็ต
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center text-slate-500 py-12">กำลังโหลด…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-white ring-1 ring-slate-200 p-6 text-center text-slate-500">
          ยังไม่มีประวัติที่ตรงกับเงื่อนไข
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-200 via-fuchsia-200 to-sky-200 rounded-full" />
          <ul className="space-y-4">
            {filtered.map(r => (
              <li key={r.id} className="relative pl-16 sm:pl-20">
                {/* dot */}
                <div className={classNames(
                  'absolute left-4 sm:left-6 top-3 h-5 w-5 rounded-full ring-4 ring-white',
                  r.status === 'COMPLETED' ? 'bg-emerald-500' :
                  r.status === 'POSTPONED' ? 'bg-amber-500' : 'bg-rose-500'
                )} />
                {/* card */}
                <div className="rounded-xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-800">{fmtDateTime(r.vaccinationDate)}</div>
                    <span className={classNames('px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_BADGE[r.status])}>
                      {STATUS_THAI[r.status]}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-700">
                    <div><span className="text-slate-500">วัคซีน:</span> {r.vaccine?.name ?? '-'}</div>
                    <div><span className="text-slate-500">เข็มที่:</span> {r.doseNumber ?? '-'}</div>
                    <div><span className="text-slate-500">ตำแหน่งฉีด:</span> {r.injectionSite ?? '-'}</div>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <span className="text-slate-500">ล็อต:</span> {r.lotNo}
                      {r.lot?.status && (
                        <span className={classNames('px-1.5 py-0.5 rounded-full text-[11px] font-medium', LOT_BADGE[r.lot.status])}>
                          {LOT_THAI[r.lot.status]}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500">หมดอายุ:</span>{' '}
                      {r.lot?.expirationDate ? fmtDate(r.lot.expirationDate) : '-'}
                    </div>
                    <div><span className="text-slate-500">ผู้ให้บริการ:</span> {r.provider ?? '-'}</div>
                    {r.remarks && (
                      <div className="md:col-span-3">
                        <span className="text-slate-500">หมายเหตุ:</span> {r.remarks}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <Link
                      href={`/vaccination-records/${r.id}`}
                      className="px-3 py-1.5 rounded-md bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700"
                    >
                      รายละเอียดบันทึก
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        // table mode
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-xl shadow-md ring-1 ring-slate-200 text-sm">
            <thead className="bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 text-slate-700">
              <tr>
                <th className="p-3 text-left">วัน-เวลา</th>
                <th className="p-3 text-left">วัคซีน</th>
                <th className="p-3 text-left">เข็ม</th>
                <th className="p-3 text-left">ตำแหน่ง</th>
                <th className="p-3 text-left">ล็อต / หมดอายุ</th>
                <th className="p-3 text-left">สถานะ</th>
                <th className="p-3 text-left">ผู้ให้บริการ</th>
                <th className="p-3 text-left">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-slate-200/60">
                  <td className="p-3">{fmtDateTime(r.vaccinationDate)}</td>
                  <td className="p-3">{r.vaccine?.name ?? '-'}</td>
                  <td className="p-3">{r.doseNumber ?? '-'}</td>
                  <td className="p-3">{r.injectionSite ?? '-'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{r.lotNo}</span>
                      {r.lot?.expirationDate && (
                        <span className="text-xs text-slate-500">หมดอายุ {fmtDate(r.lot.expirationDate)}</span>
                      )}
                      {r.lot?.status && (
                        <span className={classNames('px-1.5 py-0.5 rounded-full text-[11px] font-medium', LOT_BADGE[r.lot.status])}>
                          {LOT_THAI[r.lot.status]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={classNames('px-2 py-1 rounded-full text-xs font-semibold', STATUS_BADGE[r.status])}>
                      {STATUS_THAI[r.status]}
                    </span>
                  </td>
                  <td className="p-3">{r.provider ?? '-'}</td>
                  <td className="p-3 max-w-[280px] truncate" title={r.remarks ?? ''}>{r.remarks ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
