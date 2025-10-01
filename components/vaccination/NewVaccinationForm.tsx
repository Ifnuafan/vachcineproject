// components/vaccination/NewVaccinationForm.tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import classNames from 'classnames'
import {
  UserIcon, IdentificationIcon, MagnifyingGlassIcon, BeakerIcon, CalendarIcon,
  MapPinIcon, InformationCircleIcon, ArrowPathIcon, PlusCircleIcon,
  BuildingStorefrontIcon, RectangleStackIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'

/* ================= Types ================= */
type Gender = 'MALE'|'FEMALE'|'OTHER'
type LotStatus = 'USABLE'|'NEAR_EXPIRE'|'EXPIRED'
type Patient = { id: number; fullName: string; gender: Gender; birthDate: string; cid: string; phone?: string|null; allergies?: string|null; underlyingConditions?: string|null }
type Vaccine = { id: number; name: string; type?: string|null }
type Lot = { lotNo: string; vaccineId: number; expirationDate: string|null; status: LotStatus }
type Warehouse = { id: number; name: string }
type VialSession = {
  id: number
  warehouseId: number
  vaccineId: number|null
  lotNo: string
  dosesTotal: number
  dosesUsed: number
  openedAt: string
  expiresAt: string
  status: 'OPEN'|'EXPIRED'
  vaccine?: { id: number; name: string } | null
}

/* ================= Small UI helpers ================= */
function IconBadge({ children, size='md' }:{children:React.ReactNode; size?:'sm'|'md'|'lg'}) {
  const sz = size==='lg' ? 'h-12 w-12 text-[18px]' : size==='sm' ? 'h-8 w-8 text-[14px]' : 'h-10 w-10 text-[16px]'
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-violet-200/60 bg-gradient-to-tr from-sky-400 via-violet-400 to-pink-400"
      style={{ backdropFilter: 'saturate(140%) blur(0.5px)' }}
    >
      <span className={classNames('flex items-center justify-center', sz)}>{children}</span>
    </span>
  )
}
function RainbowChip({ label }:{label:string}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-700 bg-white shadow-sm ring-1 ring-slate-200">
      <span className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400" />
      {label}
    </span>
  )
}
const LOT_BADGE: Record<LotStatus, string> = {
  USABLE: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
  NEAR_EXPIRE: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  EXPIRED: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
}

/* ================= Utils ================= */
function isValidThaiCID(cid: string) {
  const s = (cid||'').replace(/\D/g,'')
  if (s.length !== 13) return false
  let sum = 0
  for (let i=0;i<12;i++) sum += Number(s[i])*(13-i)
  const check = (11 - (sum % 11)) % 10
  return check === Number(s[12])
}
function fmtDate(d?: string|null) {
  if (!d) return '-'
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric' })
}
function fmtDateTime(d?: string|null) {
  if (!d) return '-'
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? '-' : dt.toLocaleString('th-TH', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
}
async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  const text = await res.text()
  if (!res.ok) throw new Error(`[${res.status}] ${url} → ${text.slice(0,200)}`)
  try { return JSON.parse(text) } catch { throw new Error(`Expected JSON but got: ${text.slice(0,120)}`) }
}

/* ================= Recent vaccines (localStorage) ================= */
const RECENT_KEY = 'recent_vaccines'
function getRecentVaccines(): number[] {
  if (typeof window==='undefined') return []
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function pushRecentVaccine(id: number) {
  if (typeof window==='undefined') return
  const now = getRecentVaccines().filter(x=>x!==id)
  now.unshift(id)
  localStorage.setItem(RECENT_KEY, JSON.stringify(now.slice(0,6)))
}

/* ================= Component ================= */
export default function NewVaccinationForm() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // ----- Background blobs -----
  const bg = (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-tr from-violet-50 via-sky-50 to-white" />
      <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-fuchsia-200/30 blur-3xl" />
      <div className="absolute -bottom-28 -left-28 w-[28rem] h-[28rem] rounded-full bg-sky-200/30 blur-3xl" />
    </div>
  )

  /* ---------- state: patient via CID + autocomplete ---------- */
  const [cid, setCid] = useState('')
  const [cidValid, setCidValid] = useState<boolean|null>(null)
  const [patient, setPatient] = useState<Patient|null>(null)
  const cidTimer = useRef<number|undefined>(undefined)
  const [cidSuggests, setCidSuggests] = useState<Patient[]>([])
  const [showSuggests, setShowSuggests] = useState(false)
  const suggestBoxRef = useRef<HTMLDivElement|null>(null)
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!suggestBoxRef.current) return
      if (!suggestBoxRef.current.contains(e.target as Node)) setShowSuggests(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  // debounce CID lookup + suggestions
  useEffect(() => {
    setCidValid(null)
    setPatient(null)
    setCidSuggests([])
    setShowSuggests(false)
    if (cidTimer.current) window.clearTimeout(cidTimer.current)

    const digits = cid.replace(/\D/g,'')
    if (digits.length < 4) return

    cidTimer.current = window.setTimeout(async () => {
      const is13 = digits.length === 13
      if (is13) setCidValid(isValidThaiCID(digits))
      try {
        const data = await fetchJSON(`/api/patients?q=${encodeURIComponent(digits)}&limit=8`)
        const items: Patient[] = data?.items || []
        setCidSuggests(items)
        setShowSuggests(true)
        if (is13 && isValidThaiCID(digits)) {
          const exact = items.find(p => p.cid === digits)
          if (exact) { setPatient(exact); setShowSuggests(false) }
        }
      } catch (e) {
        console.error(e)
      }
    }, 250)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid])

  /* ---------- vaccine picker ---------- */
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [vaccSearch, setVaccSearch] = useState('')
  const [vaccineId, setVaccineId] = useState<number|''>('')

  useEffect(() => {
    (async () => {
      try {
        let data: any
        try { data = await fetchJSON('/api/cines?limit=200') } catch {
          try { data = await fetchJSON('/api/cine?limit=200') } catch {
            data = await fetchJSON('/api/vaccines?limit=200')
          }
        }
        setVaccines(data?.items || [])
      } catch (e) {
        console.error('Load vaccines failed:', e)
      }
    })()
  }, [])

  const recentIds = getRecentVaccines()
  const recentVaccines = useMemo(() => recentIds
    .map(id => vaccines.find(v => v.id===id))
    .filter(Boolean) as Vaccine[], [vaccines, recentIds])

  const filteredVaccines = useMemo(() => {
    const s = vaccSearch.trim().toLowerCase()
    if (!s) return vaccines
    return vaccines.filter(v => v.name.toLowerCase().includes(s))
  }, [vaccines, vaccSearch])

  /* ---------- FEFO preview ---------- */
  const [fefoLot, setFefoLot] = useState<Lot|null>(null)
  const [loadingFefo, setLoadingFefo] = useState(false)
  useEffect(() => {
    (async () => {
      setFefoLot(null)
      if (!vaccineId) return
      setLoadingFefo(true)
      try {
        const q = new URLSearchParams({ limit:'100', status:'USABLE', vaccineId: String(vaccineId) })
        const data = await fetchJSON(`/api/lots?${q.toString()}`)
        const items: Lot[] = data?.items || []
        const sorted = items
          .filter(l => l.expirationDate)
          .sort((a,b)=> new Date(a.expirationDate||0).getTime() - new Date(b.expirationDate||0).getTime())
        setFefoLot(sorted[0] || items[0] || null)
      } catch (e) {
        console.error('Load FEFO failed:', e)
      } finally {
        setLoadingFefo(false)
      }
    })()
  }, [vaccineId])

  /* ---------- fixed warehouse (“คลังย่อย”) ---------- */
  const [warehouseId, setWarehouseId] = useState<number| null>(null)
  const [warehouseName, setWarehouseName] = useState<string>('คลังย่อย')
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchJSON('/api/warehouses?limit=50')
        const items: Warehouse[] = data?.items || []
        const sub = items.find(w => w.name.includes('ย่อย')) || items[0]
        if (sub) { setWarehouseId(sub.id); setWarehouseName(sub.name) }
        else { setWarehouseId(1) }
      } catch (e) {
        console.warn('Load warehouses failed; default id=1', e)
        setWarehouseId(1)
      }
    })()
  }, [])

  /* ---------- open vials (ใช้ endpoint /api/open-vials ให้ตรงกับหน้า list) ---------- */
  const [openVials, setOpenVials] = useState<VialSession[]>([])
  useEffect(() => {
    (async () => {
      setOpenVials([])
      if (!vaccineId || !warehouseId) return
      try {
        const q = new URLSearchParams({
          vaccineId: String(vaccineId),
          warehouseId: String(warehouseId),
          status: 'OPEN',
          limit: '5',
        })
        const data = await fetchJSON(`/api/open-vials?${q.toString()}`)
        setOpenVials(data?.items || [])
      } catch (e) {
        console.warn('load open vials failed', e)
      }
    })()
  }, [vaccineId, warehouseId])

  /* ---------- form ---------- */
  const [vaccinationDate, setVaccinationDate] = useState<string>('') // set on mount
  useEffect(() => {
    setVaccinationDate(new Date().toISOString().slice(0,10))
  }, [])

  const [doseNumber, setDoseNumber] = useState<number|''>('') // auto only
  const [quantity, setQuantity] = useState<number>(1)
  const [injectionSite, setInjectionSite] = useState('')
  const [provider, setProvider] = useState('')
  const [remarks, setRemarks] = useState('')

  // Auto เข็มที่
  useEffect(() => {
    (async () => {
      setDoseNumber('')
      if (!patient?.id || !vaccineId) return
      try {
        const q = new URLSearchParams({ patientId: String(patient.id), vaccineId: String(vaccineId), limit: '1' })
        const data = await fetchJSON(`/api/vaccination-records?${q.toString()}`)
        const total = Number(data?.total ?? 0)
        setDoseNumber(total + 1)
      } catch (e) {
        console.error('Auto dose number failed:', e)
      }
    })()
  }, [patient?.id, vaccineId])

  // ใช้ “1 ต่อ 10” อัตโนมัติฝั่ง backend แล้ว (เลือก open-vial ก่อน / เปิดใหม่ FEFO / ISSUE stock)
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = !!(patient?.id && vaccineId && warehouseId && vaccinationDate && doseNumber && quantity>0)

  const submit = useCallback(async () => {
    if (!canSubmit) {
      alert('กรอกข้อมูลให้ครบ (CID ผู้ป่วยถูกต้อง, เลือกวัคซีน, วันที่ฉีด, ระบบจะกำหนดเข็มที่ให้เอง)')
      return
    }
    setSubmitting(true)
    try {
      const body: any = {
        patientId: patient!.id,
        vaccineId: Number(vaccineId),
        warehouseId: Number(warehouseId),
        vaccinationDate,
        quantity: Number(quantity) || 1, // สำหรับ 1:10 แนะนำให้คง 1/ครั้ง
        doseNumber: Number(doseNumber),
        injectionSite: injectionSite || null,
        provider: provider || null,
        remarks: remarks || null,
      }
      const res = await fetch('/api/vaccination-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        pushRecentVaccine(Number(vaccineId))
        alert('บันทึกสำเร็จ')
        router.push('/vaccination-records')
      } else {
        const err = await res.json().catch(()=>({}))
        alert(err?.message || 'บันทึกไม่สำเร็จ')
      }
    } catch (e:any) {
      alert(e?.message || 'บันทึกไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, patient, vaccineId, warehouseId, vaccinationDate, quantity, doseNumber, injectionSite, provider, remarks, router])

  /* ---------- layout ---------- */
  return (
    <div className="relative min-h-screen px-4 py-8">
      {bg}

      <div className="max-w-5xl mx-auto bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl p-6 ring-1 ring-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <IconBadge size="lg"><CheckCircleIcon className="w-6 h-6" /></IconBadge>
              บันทึกการฉีดวัคซีน
            </h1>
            <RainbowChip label="โหมดอัตโนมัติ (FEFO + คลังย่อย)" />
          </div>
          <Link href="/vaccination-records" className="text-sm text-slate-600 hover:underline">กลับรายการบันทึก</Link>
        </div>

        {/* Info bar */}
        <div className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2 bg-white ring-1 ring-slate-200 text-slate-700">
          <BuildingStorefrontIcon className="w-5 h-5 text-violet-600" />
          วันนี้เบิกจาก: <b className="ml-1">{warehouseName || 'คลังย่อย'}</b>
          <span className="mx-2">•</span>
          <InformationCircleIcon className="w-4 h-4 text-slate-400" />
          ระบบจะเลือกล็อตแบบ FEFO และหักสต็อกให้อัตโนมัติ
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT column: Patient & Vaccine */}
          <div className="lg:col-span-2 space-y-6">
            {/* CID + Patient card */}
            <div className="rounded-xl bg-white ring-1 ring-slate-200 p-4">
              <div className="mb-3 text-slate-800 font-semibold flex items-center gap-2">
                <IconBadge size="sm"><IdentificationIcon className="w-4 h-4" /></IconBadge>
                เลือกผู้ป่วยด้วย CID
              </div>

              <div className="flex gap-2 items-start">
                <div className="flex-1" ref={suggestBoxRef}>
                  <div className="flex items-center gap-2 ring-1 ring-slate-200 rounded-md bg-white px-3 py-2">
                    <UserIcon className="w-5 h-5 text-slate-400" />
                    <input
                      value={cid}
                      onChange={(e)=>setCid(e.target.value)}
                      onFocus={()=> cidSuggests.length>0 && setShowSuggests(true)}
                      inputMode="numeric"
                      maxLength={13}
                      placeholder="กรอกเลขบัตรประชาชน (พิมพ์ ≥ 4 ตัวจะมีรายชื่อแนะนำ)"
                      className="w-full bg-transparent focus:outline-none text-slate-800"
                    />
                    {cid && (
                      <span className={classNames(
                        'text-xs px-2 py-0.5 rounded-full ring-1',
                        cidValid===true ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                        cidValid===false ? 'bg-rose-50 text-rose-700 ring-rose-200' :
                        'bg-slate-50 text-slate-600 ring-slate-200'
                      )}>
                        {cidValid===true ? 'รูปแบบถูกต้อง' : cidValid===false ? 'CID ไม่ถูกต้อง' : 'กำลังค้นหา'}
                      </span>
                    )}
                  </div>

                  {/* Suggestions */}
                  {showSuggests && cidSuggests.length>0 && (
                    <div className="absolute z-20 mt-1 w-[calc(100%-2rem)] rounded-md border border-slate-200 bg-white shadow-md max-h-72 overflow-auto">
                      {cidSuggests.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-slate-50"
                          onClick={() => {
                            setPatient(p)
                            setCid(p.cid)
                            setShowSuggests(false)
                            setCidValid(true)
                          }}
                        >
                          <div className="font-medium text-slate-800">{p.fullName}</div>
                          <div className="text-xs text-slate-600">CID: <span className="font-mono">{p.cid}</span></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Link href="/patients/new" className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700">
                  <PlusCircleIcon className="w-5 h-5" /> เพิ่มผู้ป่วยใหม่
                </Link>
              </div>

              <div className="mt-3">
                {patient ? (
                  <div className="rounded-lg border border-slate-200 p-3 bg-gradient-to-r from-violet-50/60 via-fuchsia-50/60 to-sky-50/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-violet-200 via-fuchsia-200 to-sky-200 ring-1 ring-violet-200 text-slate-700 text-base">
                          {patient.fullName?.[0] ?? '?'}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-800">{patient.fullName}</div>
                          <div className="text-xs text-slate-600">CID: <span className="font-mono">{patient.cid}</span></div>
                        </div>
                      </div>
                      <Link href={`/patients/${patient.id}/records`} className="text-sm text-violet-700 hover:underline">
                        ดูประวัติ
                      </Link>
                    </div>
                    {(patient.allergies || patient.underlyingConditions) && (
                      <div className="mt-2 text-sm">
                        {patient.allergies && (
                          <span className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-full text-xs">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5" /> แพ้: {patient.allergies}
                          </span>
                        )}
                        {patient.underlyingConditions && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-full text-xs">
                            โรคประจำตัว: {patient.underlyingConditions}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500">พิมพ์ CID ให้ครบ 13 หลัก หรืออย่างน้อย 4 หลักเพื่อค้นหา</div>
                )}
              </div>
            </div>

            {/* Vaccine picker */}
            <div className="rounded-xl bg-white ring-1 ring-slate-200 p-4">
              <div className="mb-3 text-slate-800 font-semibold flex items-center gap-2">
                <IconBadge size="sm"><BeakerIcon className="w-4 h-4" /></IconBadge>
                เลือกวัคซีน
              </div>

              {/* Recent chips */}
              {recentVaccines.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 mb-1">ที่ใช้บ่อย / ล่าสุด</div>
                  <div className="flex flex-wrap gap-2">
                    {recentVaccines.map(v => (
                      <button
                        key={`r-${v.id}`}
                        onClick={()=>setVaccineId(v.id)}
                        className={classNames(
                          'px-3 py-1.5 rounded-full text-sm ring-1 shadow-sm',
                          vaccineId===v.id
                            ? 'bg-violet-600 text-white ring-violet-600'
                            : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                        )}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search box */}
              <div className="flex items-center gap-2 ring-1 ring-slate-200 rounded-md bg-white px-3 py-2">
                <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
                <input
                  value={vaccSearch}
                  onChange={(e)=>setVaccSearch(e.target.value)}
                  placeholder="ค้นหาชื่อวัคซีน"
                  className="w-full bg-transparent focus:outline-none text-slate-800"
                />
              </div>

              {/* Result list */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-auto pr-1">
                {filteredVaccines.length===0 ? (
                  <div className="text-slate-500 text-sm p-2">ไม่พบวัคซีนตามคำค้น</div>
                ) : filteredVaccines.map(v => (
                  <button
                    key={v.id}
                    onClick={()=>setVaccineId(v.id)}
                    className={classNames(
                      'text-left px-3 py-2 rounded-md ring-1 shadow-sm',
                      vaccineId===v.id
                        ? 'bg-gradient-to-r from-violet-600 to-sky-600 text-white ring-violet-600'
                        : 'bg-white text-slate-800 ring-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <div className="font-medium">{v.name}</div>
                    {v.type && <div className="text-xs opacity-80">{v.type}</div>}
                  </button>
                ))}
              </div>

              {/* FEFO preview */}
              <div className="mt-3 rounded-lg border border-slate-200 p-3 bg-gradient-to-r from-violet-50/60 via-fuchsia-50/60 to-sky-50/60">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-800 flex items-center gap-2">
                    <RectangleStackIcon className="w-4 h-4 text-violet-600" />
                    FEFO ที่จะใช้
                  </div>
                  {loadingFefo && <ArrowPathIcon className="w-4 h-4 animate-spin text-slate-400" />}
                </div>
                {vaccineId ? (
                  fefoLot ? (
                    <div className="mt-2 text-sm text-slate-700 flex items-center gap-3 flex-wrap">
                      <span className="font-semibold">{fefoLot.lotNo}</span>
                      {mounted && fefoLot.expirationDate && (
                        <span className="text-xs text-slate-600">หมดอายุ {fmtDate(fefoLot.expirationDate)}</span>
                      )}
                      {fefoLot.status && (
                        <span className={classNames('px-1.5 py-0.5 rounded-full text-[11px]', LOT_BADGE[fefoLot.status])}>
                          {fefoLot.status==='USABLE' ? 'พร้อมใช้' : fefoLot.status==='NEAR_EXPIRE' ? 'ใกล้หมดอายุ' : 'หมดอายุ'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-rose-700 flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      ไม่มีล็อตพร้อมใช้สำหรับวัคซีนนี้ในคลังย่อย
                    </div>
                  )
                ) : (
                  <div className="mt-2 text-sm text-slate-500">เลือกวัคซีนเพื่อดูล็อตที่ระบบจะเลือกให้อัตโนมัติ</div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT column: details & confirm */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-xl bg-white ring-1 ring-slate-200 p-4">
              <div className="mb-3 text-slate-800 font-semibold flex items-center gap-2">
                <IconBadge size="sm"><CalendarIcon className="w-4 h-4" /></IconBadge>
                รายละเอียดการฉีด
              </div>

              <div className="space-y-3 text-sm">
                <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                  <label className="text-slate-600 text-xs">วันที่ฉีด *</label>
                  <input
                    type="date"
                    value={vaccinationDate}
                    onChange={(e)=>setVaccinationDate(e.target.value)}
                    className="w-full bg-transparent focus:outline-none text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                    <label className="text-slate-600 text-xs">เข็มที่ (อัตโนมัติ)</label>
                    <div className="flex items-center gap-2">
                      <input
                        value={doseNumber || ''}
                        disabled
                        placeholder="-"
                        className="w-full bg-slate-50 text-slate-800 rounded-md px-2 py-1.5 border border-slate-200"
                      />
                      <svg className="w-4 h-4 text-violet-500" viewBox="0 0 24 24" fill="currentColor"><path d="M5 13l4 4L19 7"/></svg>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                    <label className="text-slate-600 text-xs">จำนวนโดส</label>
                    <input
                      type="number" min={1}
                      value={quantity}
                      onChange={(e)=>setQuantity(Math.max(1, Number(e.target.value)||1))}
                      className="w-full bg-transparent focus:outline-none text-slate-800"
                    />
                  </div>
                </div>

                {/* Injection site */}
                <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                  <label className="text-slate-600 text-xs">ตำแหน่งฉีด</label>
                  <div className="flex gap-2">
                    <input
                      value={injectionSite}
                      onChange={(e)=>setInjectionSite(e.target.value)}
                      placeholder="เช่น L-Deltoid"
                      className="flex-1 bg-transparent focus:outline-none text-slate-800"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['L-Deltoid','R-Deltoid','L-Vastus','R-Vastus'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={()=>setInjectionSite(s)}
                        className={classNames(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs ring-1 bg-gradient-to-r hover:brightness-105',
                          'text-slate-700 ring-slate-200 from-slate-50 to-white',
                          injectionSite===s && 'font-semibold ring-2'
                        )}
                        title={s}
                      >
                        <MapPinIcon className="w-4 h-4" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                  <label className="text-slate-600 text-xs">ผู้ให้บริการ</label>
                  <input
                    value={provider}
                    onChange={(e)=>setProvider(e.target.value)}
                    placeholder="เช่น รพ.สต. บ้านเหนือ"
                    className="w-full bg-transparent focus:outline-none text-slate-800"
                  />
                </div>

                <div className="bg-white border border-slate-200 rounded-md px-3 py-2">
                  <label className="text-slate-600 text-xs">หมายเหตุ</label>
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={(e)=>setRemarks(e.target.value)}
                    className="w-full bg-transparent focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* Open vials panel (view only; backend will decide) */}
              {vaccineId && (
                <div className="mt-4 rounded-xl bg-white ring-1 ring-slate-200 p-4">
                  <div className="mb-2 text-slate-800 font-semibold flex items-center gap-2">
                    <IconBadge size="sm"><RectangleStackIcon className="w-4 h-4" /></IconBadge>
                    ขวดเปิดค้าง (ใช้งานได้ 8 ชั่วโมง)
                  </div>
                  {openVials.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      ยังไม่มีขวดเปิดค้างสำหรับวัคซีนนี้ • เมื่อกดบันทึก ระบบจะเปิดขวดใหม่อัตโนมัติ
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {openVials.map(v => {
                        const remain = Math.max(0, v.dosesTotal - v.dosesUsed)
                        let badge = 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        let timeText = '—'
                        if (mounted) {
                          const ms = new Date(v.expiresAt).getTime() - Date.now()
                          const hours = Math.max(0, Math.floor(ms/3600000))
                          const minutes = Math.max(0, Math.floor((ms%3600000)/60000))
                          timeText = ms <= 0 ? 'หมดเวลาแล้ว' : `หมดใน ${hours}ชม ${minutes}น`
                          if (ms <= 3600000) badge = 'bg-rose-50 text-rose-700 ring-rose-200'
                          else if (ms <= 4*3600000) badge = 'bg-amber-50 text-amber-700 ring-amber-200'
                        }
                        return (
                          <li key={`${v.warehouseId}-${v.lotNo}`} className="border border-slate-200 rounded-md p-3">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-slate-800">
                                {v.vaccine?.name ? `${v.vaccine.name} • ` : ''}Lot {v.lotNo}
                              </div>
                              <span className={classNames('px-2 py-0.5 rounded-full text-xs ring-1', badge)}>
                                เหลือ {remain} โดส • {timeText}
                              </span>
                            </div>
                            {mounted && (
                              <div className="text-xs text-slate-600 mt-1">
                                เปิดเมื่อ {fmtDateTime(v.openedAt)} • หมดอายุ {fmtDateTime(v.expiresAt)}
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <div className="mt-2 text-xs text-slate-500">
                    * ระบบจะเลือกใช้ขวดที่เปิดอยู่และใกล้หมดเวลาก่อนโดยอัตโนมัติ (ถ้ามี) เพื่อให้เหลือทิ้งน้อยที่สุด
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <InformationCircleIcon className="w-4 h-4" />
                  ระบบจะเลือกล็อต/ขวดอัตโนมัติเมื่อกด “บันทึกการฉีด”
                </div>
                <button
                  onClick={submit}
                  disabled={!canSubmit || submitting}
                  className={classNames(
                    'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white shadow-sm',
                    'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 hover:opacity-95',
                    (!canSubmit || submitting) && 'opacity-60'
                  )}
                >
                  {submitting ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      กำลังบันทึก…
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon className="w-5 h-5" />
                      บันทึกการฉีด
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tiny help card */}
            <div className="rounded-xl bg-white ring-1 ring-slate-200 p-4">
              <div className="text-sm text-slate-600">
                <div className="font-medium mb-1">ทิปส์การใช้งาน</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>พิมพ์ CID อย่างน้อย 4 ตัว ระบบจะแนะนำรายชื่อ • ครบ 13 ตัวจะตรวจหลักทันที</li>
                  <li>เลือกวัคซีนจากชิป “ที่ใช้บ่อย/ล่าสุด” หรือค้นหาชื่อวัคซีน</li>
                  <li>เข็มที่ ระบบจะกำหนดให้อัตโนมัติจากประวัติ (นับ +1)</li>
                  <li>ระบบหักสต็อกจาก “{warehouseName || 'คลังย่อย'}” และเลือกล็อตแบบ FEFO ให้อัตโนมัติ</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
