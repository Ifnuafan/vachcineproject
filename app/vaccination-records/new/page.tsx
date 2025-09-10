'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserIcon, BeakerIcon, RectangleStackIcon, BuildingStorefrontIcon,
  CalendarIcon, HashtagIcon, MapPinIcon, CheckCircleIcon
} from '@heroicons/react/24/outline'

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
    // โยน error พร้อมเนื้อหาแรก ๆ เพื่อ debug ได้จาก Console
    throw new Error(`[${res.status}] ${url} → ${text.slice(0, 200)}`)
  }
  try { return JSON.parse(text) } catch {
    throw new Error(`Expected JSON from ${url} but got: ${text.slice(0, 120)}`)
  }
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
          fetchJSON('/api/cines?limit=200'),
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
    <div className="min-h-screen p-6 bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-3xl mx-auto bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
          บันทึกการฉีดวัคซีน
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Patient */}
          <div>
            <label className="flex items-center gap-2 mb-1">
              <UserIcon className="w-4 h-4" /> ผู้ป่วย *
            </label>
            <select
              value={patientId}
              onChange={e => setPatientId(Number(e.target.value) || '')}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"
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
          <div>
            <label className="flex items-center gap-2 mb-1">
              <BeakerIcon className="w-4 h-4" /> วัคซีน *
            </label>
            <select
              value={vaccineId}
              onChange={e => setVaccineId(Number(e.target.value) || '')}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"
            >
              <option value="">-- เลือกวัคซีน --</option>
              {vaccines.length === 0 && <option disabled>(ไม่มีข้อมูล)</option>}
              {vaccines.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Lot */}
          <div>
            <label className="flex items-center gap-2 mb-1">
              <RectangleStackIcon className="w-4 h-4" /> ล็อต (USABLE) *
            </label>
            <select
              value={lotNo}
              onChange={e => setLotNo(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"
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
          <div>
            <label className="flex items-center gap-2 mb-1">
              <BuildingStorefrontIcon className="w-4 h-4" /> คลังที่ใช้เบิก *
            </label>
            <select
              value={warehouseId}
              onChange={e => setWarehouseId(Number(e.target.value) || '')}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"
            >
              <option value="">-- เลือกคลัง --</option>
              {warehouses.length === 0 && <option disabled>(ไม่มีข้อมูล)</option>}
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Date / Dose / Qty */}
          <div>
            <label className="flex items-center gap-2 mb-1">
              <CalendarIcon className="w-4 h-4" /> วันที่ฉีด *
            </label>
            <input
              type="date"
              value={vaccinationDate}
              onChange={e => setVaccinationDate(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 mb-1">
              <HashtagIcon className="w-4 h-4" /> เข็มที่
            </label>
            <input
              type="number"
              min={1}
              value={doseNumber as number | ''}
              onChange={e => setDoseNumber(Number(e.target.value) || '')}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 mb-1">
              <HashtagIcon className="w-4 h-4" /> จำนวนโดส
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </div>

          {/* Site / Provider */}
          <div>
            <label className="flex items-center gap-2 mb-1">
              <MapPinIcon className="w-4 h-4" /> ตำแหน่งฉีด
            </label>
            <input
              value={injectionSite}
              onChange={e => setInjectionSite(e.target.value)}
              placeholder="เช่น L-Deltoid"
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="mb-1">ผู้ให้บริการ</label>
            <input
              value={provider}
              onChange={e => setProvider(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </div>

          {/* Remarks */}
          <div className="md:col-span-2">
            <label className="mb-1">หมายเหตุ</label>
            <textarea
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => router.back()} className="px-4 py-2 border rounded">ยกเลิก</button>
          <button onClick={submit} className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">
            บันทึกการฉีด
          </button>
        </div>
      </div>
    </div>
  )
}
