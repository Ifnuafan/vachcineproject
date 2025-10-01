'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
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
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  CircleStackIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'

/* ========= Dynamic import: Patient drawer ========= */
const PatientHistoryDrawer = dynamic(() => import('@/components/PatientHistoryDrawer'), {
  ssr: false,
  loading: () => null,
})

/* ========= Types ========= */
type LotStatus = 'USABLE' | 'NEAR_EXPIRE' | 'EXPIRED'
type VStatus = 'COMPLETED' | 'POSTPONED' | 'CANCELED'
type Patient = { id: number; fullName: string; cid: string }
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

type VialSummary = {
  openSessions: number        // จำนวนขวดเปิดค้าง
  remainingDoses: number      // โดสคงเหลือรวม
  nearestExpiryMinutes?: number // จะหมดในอีกกี่นาที (ขวดที่เร็วสุด)
}

const STATUS_BADGE: Record<VStatus, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  POSTPONED: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  CANCELED: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
}
const STATUS_THAI: Record<VStatus, string> = {
  COMPLETED: 'สำเร็จ', POSTPONED: 'เลื่อน', CANCELED: 'ยกเลิก',
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
    size === 'sm' ? 'h-8 w-8 text-[14px]' :
    size === 'lg' ? 'h-12 w-12 text-[18px]' :
    'h-10 w-10 text-[16px]'
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

/* ========= Utils (fetch + date safe) ========= */
async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  const text = await res.text()
  if (!res.ok) throw new Error(`[${res.status}] ${url} → ${text.slice(0, 200)}`)
  try { return JSON.parse(text) } catch { throw new Error(`Expected JSON but got: ${text.slice(0, 120)}`) }
}
function fmtDateTH(d?: string) {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '-'
  return new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium' }).format(dt)
}

/* ========= Saved Views (localStorage) ========= */
type SavedView = {
  id: string
  name: string
  payload: {
    patientId?: number | ''
    vaccineId?: number | ''
    lotNo?: string
    status?: VStatus | ''
    dateFrom?: string
    dateTo?: string
    lotStatus?: LotStatus | ''
  }
}
const VIEWS_KEY = 'vaccination_records_views'

function readViews(): SavedView[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]') } catch { return [] }
}
function writeViews(v: SavedView[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(VIEWS_KEY, JSON.stringify(v.slice(0, 12)))
}

/* ========= Page ========= */
export default function VaccinationRecordsPage() {
  /* ---------- internal states ---------- */
  const [records, setRecords] = useState<VaccinationRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [patients, setPatients] = useState<Patient[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [patientId, setPatientId] = useState<number | ''>('')     // filter
  const [vaccineId, setVaccineId] = useState<number | ''>('')     // filter
  const [lotNo, setLotNo] = useState('')                          // filter quick / lot
  const [status, setStatus] = useState<VStatus | ''>('')          // filter
  const [lotStatus, setLotStatus] = useState<LotStatus | ''>('')  // filter
  const [dateFrom, setDateFrom] = useState('')                    // filter
  const [dateTo, setDateTo] = useState('')                        // filter
  const [q, setQ] = useState('')                                  // quick search input

  const [mounted, setMounted] = useState(false) // for hydration-safe rendering
  useEffect(() => { setMounted(true) }, [])

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerPatientId, setDrawerPatientId] = useState<number | null>(null)

  // Search suggestions (patients)
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggests, setSuggests] = useState<Patient[]>([])
  const suggestTimer = useRef<number | undefined>(undefined)
  const searchBoxRef = useRef<HTMLInputElement | null>(null)

  // Summary top bar
  const [summaryToday, setSummaryToday] = useState<{count: number; completed: number; canceled: number; postponed: number}>({count: 0, completed: 0, canceled: 0, postponed: 0})
  const [nearExpiryCount, setNearExpiryCount] = useState<number | null>(null)
  const [vialSummary, setVialSummary] = useState<VialSummary | null>(null)

  /* ---------- load options & summary ---------- */
  useEffect(() => {
    ;(async () => {
      // patients
      try {
        const pRes = await fetch('/api/patients?limit=500', { cache: 'no-store' })
        const p = await pRes.json()
        setPatients(p.items || [])
      } catch { setPatients([]) }

      // vaccines (try modern → legacy)
      try {
        const v1 = await fetch('/api/vaccines?limit=300', { cache: 'no-store' })
        if (v1.ok) {
          const j = await v1.json(); setVaccines(j.items || [])
        } else { throw new Error() }
      } catch {
        try {
          const v2 = await fetch('/api/cine?limit=300', { cache: 'no-store' })
          const j2 = await v2.json(); setVaccines(j2.items || [])
        } catch { setVaccines([]) }
      }

      // summary today (best-effort)
      try {
        // ถ้าไม่มี endpoint สรุป ให้ดึง 1 หน้าแรกของวันนี้มานับเล่นๆ
        const today = new Date().toISOString().slice(0,10)
        const params = new URLSearchParams({ limit: '500', dateFrom: today, dateTo: today })
        const j = await fetchJSON(`/api/vaccination-records?${params}`)
        const items: VaccinationRecord[] = j.items || []
        const s = {count: items.length, completed: 0, canceled: 0, postponed: 0}
        for (const r of items) {
          if (r.status === 'COMPLETED') s.completed++
          else if (r.status === 'CANCELED') s.canceled++
          else if (r.status === 'POSTPONED') s.postponed++
        }
        setSummaryToday(s)
      } catch { /* ignore */ }

      // lot near expire 7 วัน (best-effort)
      try {
        const seven = new Date(); seven.setDate(seven.getDate()+7)
        const until = seven.toISOString().slice(0,10)
        const q = new URLSearchParams({ status: 'NEAR_EXPIRE', until })
        const j = await fetchJSON(`/api/lots?${q}`)
        setNearExpiryCount(Number(j?.total ?? 0))
      } catch { setNearExpiryCount(null) }

      // vial sessions (ขวดเปิดค้าง)
      try {
        const j = await fetchJSON('/api/vial-sessions/summary')
        const s: VialSummary = {
          openSessions: Number(j?.openSessions ?? 0),
          remainingDoses: Number(j?.remainingDoses ?? 0),
          nearestExpiryMinutes: j?.nearestExpiryMinutes ?? undefined,
        }
        setVialSummary(s)
      } catch { setVialSummary(null) }
    })()
  }, [])

  /* ---------- search suggestions ---------- */
  useEffect(() => {
    if (suggestTimer.current) window.clearTimeout(suggestTimer.current)
    if (!q || q.trim().length < 2) { setSuggests([]); return }
    suggestTimer.current = window.setTimeout(async () => {
      try {
        const j = await fetchJSON(`/api/patients?q=${encodeURIComponent(q.trim())}&limit=8`)
        setSuggests(j?.items || [])
      } catch { setSuggests([]) }
    }, 250)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  /* ---------- main loader ---------- */
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(patientId ? { patientId: String(patientId) } : {}),
        ...(vaccineId ? { vaccineId: String(vaccineId) } : {}),
        ...(lotNo ? { lotNo } : {}),
        ...(status ? { status } : {}),
        ...(lotStatus ? { lotStatus } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
      })
      const res = await fetch(`/api/vaccination-records?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'โหลดรายการไม่สำเร็จ')
      setRecords(data.items || [])
      setTotal(data.total || 0)
    } catch (e: any) {
      setError(e?.message || 'โหลดรายการไม่สำเร็จ')
      setRecords([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, patientId, vaccineId, lotNo, status, lotStatus, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  /* ---------- filter pills ---------- */
  const activePills = useMemo(() => {
    const pills: { key: string; label: string; onClear: () => void }[] = []
    if (patientId) pills.push({ key: 'patient', label: `ผู้ป่วย: ${patients.find(p=>p.id===patientId)?.fullName || patientId}`, onClear: () => setPatientId('') })
    if (vaccineId) pills.push({ key: 'vaccine', label: `วัคซีน: ${vaccines.find(v=>v.id===vaccineId)?.name || vaccineId}`, onClear: () => setVaccineId('') })
    if (lotNo) pills.push({ key: 'lot', label: `Lot: ${lotNo}`, onClear: () => setLotNo('') })
    if (status) pills.push({ key: 'status', label: `สถานะ: ${STATUS_THAI[status]}`, onClear: () => setStatus('') })
    if (lotStatus) pills.push({ key: 'lotStatus', label: `ล็อต: ${lotStatus==='USABLE'?'พร้อมใช้':lotStatus==='NEAR_EXPIRE'?'ใกล้หมดอายุ':'หมดอายุ'}`, onClear: () => setLotStatus('') })
    if (dateFrom) pills.push({ key: 'from', label: `จาก: ${dateFrom}`, onClear: () => setDateFrom('') })
    if (dateTo) pills.push({ key: 'to', label: `ถึง: ${dateTo}`, onClear: () => setDateTo('') })
    return pills
  }, [patientId, vaccineId, lotNo, status, lotStatus, dateFrom, dateTo, patients, vaccines])

  const clearAllFilters = () => {
    setPatientId(''); setVaccineId(''); setLotNo(''); setStatus(''); setLotStatus(''); setDateFrom(''); setDateTo(''); setPage(1)
  }

  /* ---------- Saved Views ---------- */
  const [views, setViews] = useState<SavedView[]>([])
  useEffect(() => { setViews(readViews()) }, [])
  const saveCurrentAsView = () => {
    const name = prompt('ตั้งชื่อมุมมองตัวกรองนี้')
    if (!name) return
    const v: SavedView = {
      id: String(Date.now()),
      name,
      payload: { patientId, vaccineId, lotNo, status, lotStatus, dateFrom, dateTo }
    }
    const next = [v, ...views].slice(0, 12)
    setViews(next); writeViews(next)
  }
  const applyView = (v: SavedView) => {
    setPatientId(v.payload.patientId ?? ''); setVaccineId(v.payload.vaccineId ?? '');
    setLotNo(v.payload.lotNo ?? ''); setStatus(v.payload.status ?? ''); setLotStatus(v.payload.lotStatus ?? '');
    setDateFrom(v.payload.dateFrom ?? ''); setDateTo(v.payload.dateTo ?? '');
    setPage(1)
  }
  const deleteView = (id: string) => {
    const next = views.filter(v => v.id !== id); setViews(next); writeViews(next)
  }

  /* ---------- Export CSV (client-side) ---------- */
  const exportCSV = () => {
    const headers = ['วันที่', 'ผู้ป่วย', 'CID', 'วัคซีน', 'เข็ม', 'ล็อต', 'หมดอายุ', 'สถานะ', 'ผู้ให้บริการ', 'หมายเหตุ']
    const rows = records.map(r => [
      fmtDateTH(r.vaccinationDate),
      r.patient?.fullName || '',
      r.patient?.cid || '',
      r.vaccine?.name || '',
      r.doseNumber ?? '',
      r.lotNo,
      r.lot?.expirationDate ? fmtDateTH(r.lot.expirationDate) : '',
      STATUS_THAI[r.status],
      r.provider ?? '',
      (r.remarks ?? '').replace(/\n/g, ' ')
    ])
    const csv = [headers, ...rows].map(row =>
      row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vaccination-records-page${page}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ---------- JSX ---------- */
  return (
    <div className="relative min-h-screen px-4 py-8">
      {/* Pastel background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-50 via-sky-50 to-white" />
        <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-fuchsia-200/30 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 w-[28rem] h-[28rem] rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IconBadge size="lg"><ClipboardDocumentListIcon className="w-6 h-6" /></IconBadge>
            รายชื่อผู้ฉีด (Records)
          </h1>
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
          <Link
            href="/vaccination-records/new"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 hover:opacity-95"
          >
            <ShieldCheckIcon className="w-5 h-5" />
            บันทึกการฉีดใหม่
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl bg-white ring-1 ring-slate-200 p-4 flex items-center gap-3">
          <ChartBarIcon className="w-8 h-8 text-violet-600" />
          <div>
            <div className="text-xs text-slate-500">ฉีดวันนี้ (ทั้งหมด)</div>
            <div className="text-xl font-semibold text-slate-800">{summaryToday.count.toLocaleString()}</div>
          </div>
        </div>
        <div className="rounded-xl bg-white ring-1 ring-slate-200 p-4 flex items-center gap-3">
          <ShieldCheckIcon className="w-8 h-8 text-emerald-600" />
          <div>
            <div className="text-xs text-slate-500">สำเร็จวันนี้</div>
            <div className="text-xl font-semibold text-slate-800">{summaryToday.completed.toLocaleString()}</div>
          </div>
        </div>
        <div className="rounded-xl bg-white ring-1 ring-slate-200 p-4 flex items-center gap-3">
          <RectangleStackIcon className="w-8 h-8 text-amber-600" />
          <div>
            <div className="text-xs text-slate-500">ล็อตใกล้หมดอายุ ≤7วัน</div>
            <div className="text-xl font-semibold text-slate-800">{nearExpiryCount ?? '-'}</div>
          </div>
        </div>
        <div className="rounded-xl bg-white ring-1 ring-slate-200 p-4 flex items-center gap-3">
          <ClockIcon className="w-8 h-8 text-rose-600" />
          <div>
            <div className="text-xs text-slate-500">ขวดเปิดค้าง</div>
            <div className="text-sm text-slate-700">
              {vialSummary
                ? <>
                    {vialSummary.openSessions} ขวด • เหลือ {vialSummary.remainingDoses} โดส
                    {typeof vialSummary.nearestExpiryMinutes === 'number' && (
                      <> • หมดใน ~{vialSummary.nearestExpiryMinutes} นาที</>
                    )}
                  </>
                : '-'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Filters Bar */}
      <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 rounded-xl ring-1 ring-slate-200 p-3 mb-4">
        {/* Quick search with suggestions */}
        <div className="mb-3 relative">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
            <input
              ref={searchBoxRef}
              value={q}
              onChange={(e) => { setQ(e.target.value); setShowSuggest(true) }}
              onFocus={() => q.trim().length >= 2 && setShowSuggest(true)}
              onBlur={() => setTimeout(()=>setShowSuggest(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // ใช้เป็น lot quick filter
                  setLotNo(q); setPage(1); load()
                }
              }}
              placeholder="ค้นหาชื่อผู้ป่วย / CID / Lot / ผู้ให้บริการ / หมายเหตุ (กด Enter เพื่อกรอง Lot)"
              className="flex-1 bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
            />
            <button
              onClick={() => { setQ(''); searchBoxRef.current?.focus() }}
              className="px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100"
              title="ล้าง"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setLotNo(q); setPage(1); load() }}
              className="px-3 py-1.5 rounded-md bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700"
            >
              ค้นหา
            </button>
          </div>

          {/* Suggestions (patients) */}
          {showSuggest && suggests.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg max-h-72 overflow-auto z-20">
              {suggests.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setPatientId(s.id); setShowSuggest(false); setPage(1) }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-3"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-violet-200 via-fuchsia-200 to-sky-200 ring-1 ring-violet-200 text-slate-700 text-sm">
                    {s.fullName?.[0] ?? '?'}
                  </span>
                  <div>
                    <div className="font-medium text-slate-800">{s.fullName}</div>
                    <div className="text-xs text-slate-500">{s.cid}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Advanced filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          {/* Patient */}
          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="mb-1 flex items-center gap-1 text-slate-600 text-xs">
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
            <label className="mb-1 flex items-center gap-1 text-slate-600 text-xs">
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

          {/* Date from */}
          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="mb-1 flex items-center gap-1 text-slate-600 text-xs">
              <CalendarIcon className="w-4 h-4" /> จากวันที่
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={e=>{ setDateFrom(e.target.value); setPage(1) }}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            />
          </div>

          {/* Date to */}
          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="mb-1 flex items-center gap-1 text-slate-600 text-xs">
              <CalendarIcon className="w-4 h-4" /> ถึงวันที่
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={e=>{ setDateTo(e.target.value); setPage(1) }}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            />
          </div>

          {/* Status */}
          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="mb-1 flex items-center gap-1 text-slate-600 text-xs">
              <AdjustmentsHorizontalIcon className="w-4 h-4" /> สถานะ
            </label>
            <select
              value={status}
              onChange={e=>{ setStatus((e.target.value as VStatus) || ''); setPage(1) }}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            >
              <option value="">ทั้งหมด</option>
              <option value="COMPLETED">สำเร็จ</option>
              <option value="POSTPONED">เลื่อน</option>
              <option value="CANCELED">ยกเลิก</option>
            </select>
          </div>

          {/* Lot status */}
          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="mb-1 flex items-center gap-1 text-slate-600 text-xs">
              <RectangleStackIcon className="w-4 h-4" /> สถานะล็อต
            </label>
            <select
              value={lotStatus}
              onChange={e=>{ setLotStatus((e.target.value as LotStatus) || ''); setPage(1) }}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            >
              <option value="">ทั้งหมด</option>
              <option value="USABLE">พร้อมใช้</option>
              <option value="NEAR_EXPIRE">ใกล้หมดอายุ</option>
              <option value="EXPIRED">หมดอายุ</option>
            </select>
          </div>
        </div>

        {/* Active filter pills + actions */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activePills.length > 0 ? activePills.map(p => (
            <span key={p.key} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white ring-1 ring-slate-200">
              {p.label}
              <button onClick={p.onClear} className="hover:text-rose-600">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          )) : <span className="text-xs text-slate-500">ไม่มีตัวกรองที่ใช้งาน</span>}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={saveCurrentAsView}
              className="px-2.5 py-1.5 rounded-md bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
              title="บันทึกชุดตัวกรองนี้"
            >
              บันทึกมุมมอง
            </button>
            <button
              onClick={clearAllFilters}
              className="px-2.5 py-1.5 rounded-md bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
            >
              ล้างตัวกรอง
            </button>
            <button
              onClick={exportCSV}
              className="px-2.5 py-1.5 rounded-md bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 text-xs flex items-center gap-1"
              title="ส่งออก CSV เฉพาะหน้าปัจจุบัน"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>

        {/* Saved views row */}
        {views.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {views.map(v => (
              <div key={v.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gradient-to-r from-violet-50 to-sky-50 ring-1 ring-violet-200 text-violet-800">
                <button className="hover:underline" onClick={()=>applyView(v)}>{v.name}</button>
                <button className="hover:text-rose-600" onClick={()=>deleteView(v.id)} title="ลบมุมมอง">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5" />
            {error}
          </div>
          <button onClick={load} className="px-2 py-1 rounded-md bg-white ring-1 ring-rose-200 hover:bg-rose-50 text-rose-700 text-xs">
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200 bg-white shadow-md">
        <table className="min-w-full text-sm">
          <thead className="sticky top-[68px] bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 text-slate-700 z-0">
            <tr>
              <th className="p-3 text-left">วันที่</th>
              <th className="p-3 text-left">ผู้ป่วย</th>
              <th className="p-3 text-left">วัคซีน</th>
              <th className="p-3 text-left">เข็ม</th>
              <th className="p-3 text-left">ล็อต / หมดอายุ</th>
              <th className="p-3 text-left">สถานะ</th>
              <th className="p-3 text-left">ผู้ให้บริการ</th>
              <th className="p-3 text-left w-10"></th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
            {loading ? (
              Array.from({length: 6}).map((_,i)=>(
                <tr key={`sk-${i}`} className="border-t border-slate-200/60">
                  <td className="p-3"><div className="h-3 w-24 bg-slate-200/60 rounded animate-pulse" /></td>
                  <td className="p-3"><div className="h-3 w-48 bg-slate-200/60 rounded animate-pulse" /></td>
                  <td className="p-3"><div className="h-3 w-32 bg-slate-200/60 rounded animate-pulse" /></td>
                  <td className="p-3"><div className="h-3 w-10 bg-slate-200/60 rounded animate-pulse" /></td>
                  <td className="p-3"><div className="h-3 w-40 bg-slate-200/60 rounded animate-pulse" /></td>
                  <td className="p-3"><div className="h-3 w-16 bg-slate-200/60 rounded animate-pulse" /></td>
                  <td className="p-3"><div className="h-3 w-24 bg-slate-200/60 rounded animate-pulse" /></td>
                  <td className="p-3"></td>
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  ไม่พบรายการที่ตรงกับเงื่อนไข • <button className="underline" onClick={clearAllFilters}>ล้างตัวกรอง</button> หรือ <Link href="/vaccination-records/new" className="underline">บันทึกการฉีดใหม่</Link>
                </td>
              </tr>
            ) : records.map(r => (
              <tr
                key={r.id}
                className="border-t border-slate-200/60 hover:bg-gradient-to-r hover:from-violet-50/70 hover:to-sky-50/70 transition-colors"
              >
                {/* วันที่ */}
                <td className="p-3 text-slate-700">
                  <span suppressHydrationWarning>
                    {mounted ? fmtDateTH(r.vaccinationDate) : ''}
                  </span>
                </td>

                {/* ผู้ป่วย + ปุ่มดูประวัติ */}
                <td className="p-3">
                  <div className="flex items-center gap-3 text-slate-800">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-violet-200 via-fuchsia-200 to-sky-200 ring-1 ring-violet-200 text-slate-700 text-sm">
                      {r.patient?.fullName?.[0] ?? '?'}
                    </span>
                    <div>
                      <div className="font-medium">{r.patient?.fullName}</div>
                      <div className="text-xs text-slate-500">{r.patient?.cid}</div>

                      <button
                        className="mt-1 inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gradient-to-r from-violet-50 to-sky-50 ring-1 ring-violet-200 text-violet-700 hover:bg-white disabled:opacity-50"
                        disabled={!r.patient?.id}
                        onClick={() => r.patient?.id && (setDrawerPatientId(r.patient.id), setDrawerOpen(true))}
                      >
                        <ClipboardDocumentListIcon className="w-3.5 h-3.5" />
                        ดูประวัติ
                      </button>
                    </div>
                  </div>
                </td>

                {/* วัคซีน / เข็ม */}
                <td className="p-3 text-slate-700">{r.vaccine?.name}</td>
                <td className="p-3 text-slate-700">{r.doseNumber ?? '-'}</td>

                {/* ล็อต / หมดอายุ + badges */}
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">{r.lotNo}</span>
                      {r.lot?.expirationDate ? (
                        <span className="text-xs text-slate-500" suppressHydrationWarning>
                          หมดอายุ {mounted ? fmtDateTH(r.lot.expirationDate) : ''}
                        </span>
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

                {/* สถานะ */}
                <td className="p-3">
                  <span className={classNames('px-2 py-1 rounded-full text-xs font-semibold', STATUS_BADGE[r.status])}>
                    {STATUS_THAI[r.status]}
                  </span>
                </td>

                {/* ผู้ให้บริการ */}
                <td className="p-3 text-slate-700">{r.provider ?? '-'}</td>

                {/* menu  */}
                <td className="p-3">
                  <div className="flex justify-end">
                    <button
                      className="px-2 py-1 rounded-md bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700 text-xs"
                      onClick={() => alert(`Lot: ${r.lotNo}\nเข็มที่: ${r.doseNumber ?? '-'}\nหมายเหตุ: ${r.remarks ?? '-'}`)}
                    >
                      รายละเอียด
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer: pagination + info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4">
        <div className="flex items-center gap-2">
          <RainbowChip label={`รวม ${total.toLocaleString()} รายการ`} />
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <CircleStackIcon className="w-4 h-4" /> แสดงต่อหน้า
            <select
              value={limit}
              onChange={e=>{ setLimit(Number(e.target.value)||20); setPage(1) }}
              className="bg-white ring-1 ring-slate-200 rounded px-2 py-1"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page<=1}
            onClick={()=>setPage(1)}
            className="px-3 py-1 rounded-md bg-white ring-1 ring-slate-200 disabled:opacity-50 shadow-sm hover:bg-slate-50 text-xs"
          >
            หน้าแรก
          </button>
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
          <button
            disabled={page>=pages}
            onClick={()=>setPage(pages)}
            className="px-3 py-1 rounded-md bg-white ring-1 ring-slate-200 disabled:opacity-50 shadow-sm hover:bg-slate-50 text-xs"
          >
            หน้าสุดท้าย
          </button>
        </div>
      </div>

      {/* Drawer: ประวัติผู้ป่วย */}
      <PatientHistoryDrawer
        open={drawerOpen}
        patientId={drawerPatientId}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}
