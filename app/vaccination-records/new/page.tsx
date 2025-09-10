'use client'

import { useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import { useRouter } from 'next/navigation'
import {
  UserIcon, BeakerIcon, RectangleStackIcon, BuildingStorefrontIcon,
  CalendarIcon, HashtagIcon, MapPinIcon, CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'

type Patient = { id: number; fullName: string; cid: string }
type Vaccine = { id: number; name: string }
type LotStatus = 'USABLE'|'NEAR_EXPIRE'|'EXPIRED'
type Lot = { lotNo: string; vaccineId: number; expirationDate: string; status: LotStatus }
type Warehouse = { id: number; name: string }

// -------- helpers --------
async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`[${res.status}] ${url} → ${text.slice(0, 200)}`)
  }
  try { return JSON.parse(text) } catch {
    throw new Error(`Expected JSON from ${url} but got: ${text.slice(0, 120)}`)
  }
}

/** ───────────── UI helpers (reuse from PatientsPage style) ───────────── */
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

export default function NewVaccinationPage() {
  const router = useRouter()

  // form state
  const [patientId, setPatientId] = useState<number | ''>('')
  const [vaccineId, setVaccineId] = useState<number | ''>('')
  const [lotNo, setLotNo] = useState('')
  const [warehouseId, setWarehouseId] = useState<number | ''>('')

  const [vaccinationDate, setVaccinationDate] = useState<string>(() =>
    new Date().toISOString().slice(0,10)
  )
  const [doseNumber, setDoseNumber] = useState<number | ''>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [injectionSite, setInjectionSite] = useState('')
  const [provider, setProvider] = useState('')
  const [remarks, setRemarks] = useState('')

  // options
  const [patients, setPatients] = useState<Patient[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  const usableLots = useMemo(
    () => lots.filter(l => l.status === 'USABLE' && (vaccineId ? l.vaccineId === Number(vaccineId) : true)),
    [lots, vaccineId]
  )

  // โหลด options เริ่มต้น
  useEffect(() => {
    (async () => {
      try {
        const [p, v, w] = await Promise.all([
          fetchJSON('/api/patients?limit=200'),
          fetchJSON('/api/cines?limit=200'), // คง endpoint ตามโค้ดเดิมที่คุณใช้
          fetchJSON('/api/warehouses?limit=200'),
        ])
        setPatients(p.items || [])
        setVaccines(v.items || [])
        setWarehouses(w.items || [])
      } catch (err) {
        console.error('Init load failed:', err)
        alert('โหลดข้อมูลเริ่มต้นไม่สำเร็จ — ดู Console > Network เพื่อรายละเอียด')
      }
    })()
  }, [])

  // โหลด lots เมื่อเลือกวัคซีน (หรือดึง usable ทั้งหมดถ้ายังไม่เลือก)
  useEffect(() => {
    (async () => {
      try {
        const q = new URLSearchParams({
          limit: '200',
          status: 'USABLE',
          ...(vaccineId ? { vaccineId: String(vaccineId) } : {}),
        })
        const data = await fetchJSON(`/api/lots?${q}`)
        setLots(data.items || [])
      } catch (e) {
        console.error('Load lots failed:', e)
        setLots([])
      }
    })()
  }, [vaccineId])

  // คำนวณเข็มอัตโนมัติเมื่อเลือกผู้ป่วย + วัคซีน
  useEffect(() => {
    (async () => {
      if (!patientId || !vaccineId) { setDoseNumber(''); return }
      try {
        const data = await fetchJSON(
          `/api/vaccination-records?patientId=${patientId}&vaccineId=${vaccineId}&limit=1`
        )
        const total = Number(data?.total ?? 0)
        setDoseNumber(total + 1)
      } catch (e) {
        console.error('Auto doseNumber failed:', e)
        setDoseNumber('')
      }
    })()
  }, [patientId, vaccineId])

  async function submit() {
    if (!patientId || !vaccineId || !lotNo || !warehouseId || !vaccinationDate) {
      alert('กรอกข้อมูลให้ครบ (ผู้ป่วย, วัคซีน, ล็อต, คลัง, วันที่ฉีด)')
      return
    }
    const body = {
      patientId: Number(patientId),
      vaccineId: Number(vaccineId),
      lotNo,
      vaccinationDate,
      warehouseId: Number(warehouseId),
      quantity: Number(quantity) || 1,
      doseNumber: doseNumber || undefined,
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
      alert('บันทึกสำเร็จ')
      router.push('/vaccination-records')
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err?.message || 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="relative min-h-screen px-4 py-8">
      {/* Pastel background with extra violet */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-50 via-sky-50 to-white" />
        <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-fuchsia-200/30 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 w-[28rem] h-[28rem] rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IconBadge size="lg"><CheckCircleIcon className="w-6 h-6" /></IconBadge>
            บันทึกการฉีดวัคซีน
          </h1>
          <RainbowChip label="ฟอร์มบันทึก" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Patient */}
          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="flex items-center gap-2 mb-1 text-slate-600">
              <UserIcon className="w-4 h-4" /> ผู้ป่วย *
            </label>
            <select
              value={patientId}
              onChange={e => setPatientId(Number(e.target.value) || '')}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            >
              <option value="">-- เลือกผู้ป่วย --</option>
              {patients.length === 0 && <option disabled>(ไม่มีข้อมูล)</option>}
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.cid})
                </option>
              ))}
            </select>
          </div>

          {/* Vaccine */}
          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="flex items-center gap-2 mb-1 text-slate-600">
              <BeakerIcon className="w-4 h-4" /> วัคซีน *
            </label>
            <select
              value={vaccineId}
              onChange={e => setVaccineId(Number(e.target.value) || '')}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            >
              <option value="">-- เลือกวัคซีน --</option>
              {vaccines.length === 0 && <option disabled>(ไม่มีข้อมูล)</option>}
              {vaccines.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Lot */}
          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="flex items-center gap-2 mb-1 text-slate-600">
              <RectangleStackIcon className="w-4 h-4" /> ล็อต (USABLE) *
            </label>
            <select
              value={lotNo}
              onChange={e => setLotNo(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            >
              <option value="">-- เลือกล็อต --</option>
              {usableLots.length === 0 && <option disabled>(ไม่มีข้อมูล)</option>}
              {usableLots.map(l => (
                <option key={l.lotNo} value={l.lotNo}>
                  {l.lotNo} (หมดอายุ {new Date(l.expirationDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse */}
          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="flex items-center gap-2 mb-1 text-slate-600">
              <BuildingStorefrontIcon className="w-4 h-4" /> คลังที่ใช้เบิก *
            </label>
            <select
              value={warehouseId}
              onChange={e => setWarehouseId(Number(e.target.value) || '')}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            >
              <option value="">-- เลือกคลัง --</option>
              {warehouses.length === 0 && <option disabled>(ไม่มีข้อมูล)</option>}
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Date / Dose / Qty */}
          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="flex items-center gap-2 mb-1 text-slate-600">
              <CalendarIcon className="w-4 h-4" /> วันที่ฉีด *
            </label>
            <input
              type="date"
              value={vaccinationDate}
              onChange={e => setVaccinationDate(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="flex items-center gap-2 mb-1 text-slate-600">
              <HashtagIcon className="w-4 h-4" /> เข็มที่
            </label>
            <input
              type="number"
              min={1}
              value={doseNumber as number | ''}
              onChange={e => setDoseNumber(Number(e.target.value) || '')}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="flex items-center gap-2 mb-1 text-slate-600">
              <HashtagIcon className="w-4 h-4" /> จำนวนโดส
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            />
          </div>

          {/* Site / Provider */}
          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="flex items-center gap-2 mb-1 text-slate-600">
              <MapPinIcon className="w-4 h-4" /> ตำแหน่งฉีด
            </label>
            <input
              value={injectionSite}
              onChange={e => setInjectionSite(e.target.value)}
              placeholder="เช่น L-Deltoid"
              className="w-full bg-transparent focus:outline-none text-slate-800"
            />
          </div>
          <div className="bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="mb-1 text-slate-600">ผู้ให้บริการ</label>
            <input
              value={provider}
              onChange={e => setProvider(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            />
          </div>

          {/* Remarks */}
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
            <label className="mb-1 text-slate-600">หมายเหตุ</label>
            <textarea
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-slate-800"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-md bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1"
          >
            ยกเลิก
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 hover:opacity-95 flex items-center gap-2"
          >
            <ShieldCheckIcon className="w-5 h-5" />
            บันทึกการฉีด
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <SparklesIcon className="w-4 h-4 text-violet-500" />
          ระบบจะคำนวณ “เข็มที่” ให้อัตโนมัติเมื่อเลือกทั้งผู้ป่วยและวัคซีนแล้ว
        </div>
      </div>
    </div>
  )
}
