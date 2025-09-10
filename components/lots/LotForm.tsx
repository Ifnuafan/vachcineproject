// components/lots/LotForm.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PlusIcon,
  TagIcon,
  BeakerIcon,
  CalendarDaysIcon,
  CubeIcon,
  IdentificationIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'

type Vaccine = {
  id: number
  name: string
  type: string
  requiredDoses: number
  usageType: string
  updatedAt: string
}

export type LotStatus = 'USABLE' | 'NEAR_EXPIRE' | 'EXPIRED' | 'DESTROYED'

export type VaccineLot = {
  id: string
  lotNumber: string
  brand: string
  expirationDate: string
  quantity: number
  status: LotStatus
}

type Props = {
  onSaved?: () => void
  onClose?: () => void
  onAdd?: (lot: VaccineLot) => void
  onAddVaccine?: () => void
}

function required(v?: string | number | null) {
  return v !== undefined && v !== null && String(v).trim() !== ''
}

/** ------- Field wrapper: ไอคอนสี + focus-within effect ------- */
function FieldWrapper({
  label,
  hint,
  icon,
  iconBgClass = 'bg-gray-100 text-gray-500',
  children,
}: {
  label: string
  hint?: string
  icon?: React.ReactNode
  iconBgClass?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-800">{label}</label>
      <div className="relative group rounded-xl transition">
        {icon && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 grid place-items-center h-7 w-7 rounded-lg shadow-sm ${iconBgClass} ring-1 ring-black/5 group-focus-within:scale-105 transition-transform`}
          >
            {icon}
          </span>
        )}
        {children}
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

/** ------- base styles ------- */
const baseInput =
  'h-11 w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400/70 focus:border-violet-400 transition shadow-sm'
const withIconPadding = 'pl-12'

export default function LotForm({ onSaved, onClose, onAdd, onAddVaccine }: Props) {
  const router = useRouter()

  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [loadingVaccines, setLoadingVaccines] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [lotNo, setLotNo] = useState('')
  const [vaccineId, setVaccineId] = useState<number | ''>('')
  const [expirationDate, setExpirationDate] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [serialNumber, setSerialNumber] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')

  const fetchVaccines = async () => {
    setLoadingVaccines(true)
    setLoadError('')
    try {
      const qs = new URLSearchParams({ page: '1', limit: '1000' })
      const res = await fetch(`/api/cines?${qs.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setVaccines(json.items ?? [])
    } catch (e: any) {
      setLoadError(e?.message || 'โหลดรายการวัคซีนล้มเหลว')
    } finally {
      setLoadingVaccines(false)
    }
  }

  useEffect(() => {
    fetchVaccines()
  }, [])

  const resetForm = () => {
    setLotNo('')
    setVaccineId('')
    setExpirationDate('')
    setBatchNumber('')
    setSerialNumber('')
  }

  function mapDtoToUI(dto: any): VaccineLot {
    return {
      id: dto?.lotNo ?? lotNo.trim(),
      lotNumber: dto?.lotNo ?? lotNo.trim(),
      brand: dto?.vaccine?.name ?? (vaccines.find(v => v.id === Number(vaccineId))?.name ?? '-'),
      expirationDate: dto?.expirationDate ?? expirationDate,
      quantity: Number(dto?.quantity ?? 0),
      status: (dto?.status as LotStatus) ?? 'USABLE',
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOkMsg('')

    if (!required(lotNo) || !required(vaccineId) || !required(expirationDate)) {
      setError('กรอกข้อมูลให้ครบ: รหัสล็อต, วัคซีน, วันหมดอายุ')
      return
    }

    setSaving(true)
    try {
      const payload = {
        lotNo: lotNo.trim(),
        vaccineId: Number(vaccineId),
        expirationDate,
        batchNumber: batchNumber.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
      }

      const res = await fetch('/api/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let msg = 'บันทึกไม่สำเร็จ'
        try {
          const j = await res.json()
          if (j?.message) msg = j.message
        } catch {}
        throw new Error(msg)
      }

      let created: any = null
      try { created = await res.json() } catch {}

      const ui: VaccineLot =
        created ? mapDtoToUI(created) : {
          id: lotNo.trim(),
          lotNumber: lotNo.trim(),
          brand: vaccines.find(v => v.id === Number(vaccineId))?.name ?? '-',
          expirationDate,
          quantity: 0,
          status: 'USABLE',
        }

      onAdd?.(ui)
      setOkMsg('บันทึกล็อตสำเร็จ')
      resetForm()
      onSaved?.()

      // ✅ หลังบันทึกสำเร็จ → ไปหน้ารายการทันที
      router.push('/lots')

    } catch (e: any) {
      setError(e?.message || 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleAddVaccineClick = () => {
    if (onAddVaccine) onAddVaccine()
    else router.push('/cines')
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 shadow-sm overflow-hidden">
      {/* Top bar gradient (ฟ้า-ม่วงพาสเทล) */}
      <div className="relative">
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-300 via-violet-400 to-pink-300" />
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-sky-400 via-violet-400 to-pink-400 text-white shadow ring-1 ring-white/50">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">เพิ่มล็อตวัคซีน</h3>
              <p className="text-xs text-slate-500">รายละเอียดล็อต วันหมดอายุ และข้อมูลผู้ผลิต</p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
            >
              ปิด
            </button>
          )}
        </div>
      </div>

      <div className="px-6 pb-6">
        {/* Alerts */}
        {loadError && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5" />
            <span>{loadError}</span>
          </div>
        )}
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
        {okMsg && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircleIcon className="mt-0.5 h-5 w-5" />
            <span>{okMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* lotNo */}
          <FieldWrapper
            label="รหัสล็อต (lotNo) *"
            hint="แนะนำรูปแบบ BRAND-YYMM"
            iconBgClass="bg-amber-50 text-amber-600"
            icon={<TagIcon className="h-4.5 w-4.5" />}
          >
            <input
              type="text"
              value={lotNo}
              onChange={(e) => setLotNo(e.target.value)}
              placeholder="เช่น AZPZ-0425"
              className={`${baseInput} ${withIconPadding} group-focus-within:shadow-md`}
            />
          </FieldWrapper>

          {/* vaccineId + add button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-800">วัคซีน (vaccineId) *</label>
              <button
                type="button"
                onClick={handleAddVaccineClick}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-medium text-white hover:from-violet-500 hover:to-indigo-500 active:scale-[.98] transition"
                title="เพิ่มวัคซีน"
              >
                <PlusIcon className="h-4 w-4" />
                เพิ่มวัคซีน
              </button>
            </div>
            <FieldWrapper
              label=""
              iconBgClass="bg-indigo-50 text-indigo-600"
              icon={<BeakerIcon className="h-4.5 w-4.5" />}
            >
              <select
                value={vaccineId}
                onChange={(e) => setVaccineId(e.target.value ? Number(e.target.value) : '')}
                className={`${baseInput} ${withIconPadding} disabled:opacity-60 group-focus-within:shadow-md`}
                disabled={loadingVaccines}
              >
                <option value="">{loadingVaccines ? 'กำลังโหลด...' : '-- เลือกวัคซีน --'}</option>
                {vaccines.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.type} · {v.usageType} (ต้องฉีด {v.requiredDoses})
                  </option>
                ))}
              </select>
            </FieldWrapper>
            <p className="text-xs text-slate-500">ถ้าไม่มี คลิก “เพิ่มวัคซีน” เพื่อสร้างใหม่</p>
          </div>

          {/* expirationDate */}
          <FieldWrapper
            label="วันหมดอายุ (expirationDate) *"
            hint="ระบบจะเตือนอัตโนมัติเมื่อใกล้หมดอายุ"
            iconBgClass="bg-sky-50 text-sky-600"
            icon={<CalendarDaysIcon className="h-4.5 w-4.5" />}
          >
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className={`${baseInput} ${withIconPadding} group-focus-within:shadow-md`}
            />
          </FieldWrapper>

          {/* batchNumber */}
          <FieldWrapper
            label="หมายเลขล็อตผู้ผลิต (batchNumber)"
            iconBgClass="bg-fuchsia-50 text-fuchsia-600"
            icon={<CubeIcon className="h-4.5 w-4.5" />}
          >
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="เช่น BATCH-001"
              className={`${baseInput} ${withIconPadding} group-focus-within:shadow-md`}
            />
          </FieldWrapper>

          {/* serialNumber */}
          <FieldWrapper
            label="Serial Number (serialNumber)"
            iconBgClass="bg-rose-50 text-rose-600"
            icon={<IdentificationIcon className="h-4.5 w-4.5" />}
          >
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="เช่น SN-ABC-123"
              className={`${baseInput} ${withIconPadding} group-focus-within:shadow-md`}
            />
          </FieldWrapper>

          {/* Actions */}
          <div className="md:col-span-2 flex justify-between items-center pt-1">
            <a
              href="/lots"
              className="inline-flex items-center gap-2 h-11 rounded-xl border border-slate-200 px-4 text-slate-700 hover:bg-slate-50"
              title="ไปหน้ารายการล็อต"
            >
              <ArrowTopRightOnSquareIcon className="h-5 w-5" />
              ไปหน้ารายการ
            </a>

            <div className="flex gap-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 font-medium text-white shadow hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกล็อตใหม่'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
