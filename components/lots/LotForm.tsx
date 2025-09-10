// components/lots/LotForm.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
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
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
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
  /** โหมดการแสดงผล: หน้าเดียว (single) หรือ 2 ขั้นตอน (wizard) */
  mode?: 'single' | 'wizard'
  onSaved?: () => void
  onClose?: () => void
  onAdd?: (lot: VaccineLot) => void
  onAddVaccine?: () => void
}

/* ========= helpers: UI (ม่วงพาสเทล + 彩虹) ========= */
function IconBadge({
  children,
  size = 'md',
}: {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const sz =
    size === 'sm' ? 'h-8 w-8 text-[14px]' :
    size === 'lg' ? 'h-12 w-12 text-[18px]' :
    'h-10 w-10 text-[16px]'
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl text-white shadow-sm bg-gradient-to-tr from-sky-400 via-violet-400 to-pink-400 ring-1 ring-violet-200/60"
      style={{ backdropFilter: 'saturate(140%) blur(0.5px)' }}
    >
      <span className={`flex items-center justify-center ${sz}`}>{children}</span>
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

export default function LotForm({
  mode = 'wizard',
  onSaved,
  onClose,
  onAdd,
  onAddVaccine,
}: Props) {
  const router = useRouter()

  // options
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [loadingVaccines, setLoadingVaccines] = useState(false)
  const [loadError, setLoadError] = useState('')

  // form state
  const [vaccineId, setVaccineId] = useState<number | ''>('')
  const [lotNo, setLotNo] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [serialNumber, setSerialNumber] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')

  // wizard
  const [step, setStep] = useState(0) // 0: choose vaccine, 1: fill details
  const [q, setQ] = useState('')

  const filteredVaccines = useMemo(() => {
    if (!q.trim()) return vaccines
    const t = q.toLowerCase()
    return vaccines.filter(v =>
      [v.name, v.type, v.usageType].join(' ').toLowerCase().includes(t)
    )
  }, [q, vaccines])

  const required = (v?: string | number | null) =>
    v !== undefined && v !== null && String(v).trim() !== ''

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

  useEffect(() => { fetchVaccines() }, [])

  const resetForm = () => {
    setVaccineId('')
    setLotNo('')
    setExpirationDate('')
    setBatchNumber('')
    setSerialNumber('')
    setStep(0)
    setQ('')
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOkMsg('')

    if (!required(vaccineId) || !required(lotNo) || !required(expirationDate)) {
      setError('กรอกข้อมูลให้ครบ: วัคซีน, รหัสล็อต, วันหมดอายุ')
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
      onSaved?.()
      resetForm()
      router.push('/lots') // ไปหน้ารายการหลังบันทึก
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

  /* ========= UI layouts ========= */

  function Header({ title, right }: { title: React.ReactNode, right?: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <IconBadge size="lg"><CheckCircleIcon className="w-6 h-6" /></IconBadge>
          {title}
        </h1>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    )
  }

  function Alerts() {
    return (
      <>
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
      </>
    )
  }

  function VaccineChooser() {
    return (
      <>
        <Header
          title={<>เลือกวัคซีน</>}
          right={<RainbowChip label={`ทั้งหมด ${vaccines.length} รายการ`} />}
        />

        {/* Search */}
        <div className="mb-4 flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="ค้นหา ชื่อวัคซีน / ประเภท / การใช้งาน"
            className="flex-1 bg-transparent focus:outline-none text-slate-800"
          />
        </div>

        {/* List */}
        <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
          {loadingVaccines ? (
            <div className="text-center text-slate-500 py-8">กำลังโหลด…</div>
          ) : filteredVaccines.length === 0 ? (
            <div className="text-center text-slate-400 py-8">ไม่พบวัคซีน</div>
          ) : filteredVaccines.map(v => (
            <label
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="vaccine"
                  className="h-4 w-4"
                  checked={vaccineId === v.id}
                  onChange={()=>setVaccineId(v.id)}
                />
                <div>
                  <div className="font-medium text-slate-800">{v.name}</div>
                  <div className="text-xs text-slate-500">{v.type} · {v.usageType} · ต้องฉีด {v.requiredDoses}</div>
                </div>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-slate-400" />
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-between items-center">
          <a
            href="/lots"
            className="inline-flex items-center gap-2 h-11 rounded-xl border border-slate-200 px-4 text-slate-700 hover:bg-slate-50"
          >
            <ArrowTopRightOnSquareIcon className="h-5 w-5" />
            ไปหน้ารายการ
          </a>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={()=>onClose ? onClose() : router.back()}
              className="h-11 rounded-xl border border-slate-200 px-5 text-slate-700 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={!vaccineId}
              onClick={()=>setStep(1)}
              className="h-11 rounded-xl px-5 text-white shadow bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
            >
              ถัดไป
              <CheckCircleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </>
    )
  }

  function DetailsForm() {
    const selected = vaccines.find(v => v.id === vaccineId)

    return (
      <>
        <Header
          title={<>เพิ่มล็อตวัคซีน</>}
          right={
            <>
              {selected ? <RainbowChip label={selected.name} /> : null}
            </>
          }
        />
        <Alerts />

        {/* Info card */}
        {selected && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-sm text-slate-700">
            <div className="font-medium">วัคซีนที่เลือก</div>
            <div className="text-slate-600">
              {selected.name} · {selected.type} · {selected.usageType} · ต้องฉีด {selected.requiredDoses}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
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

          {/* vaccine + add */}
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
            {mode === 'wizard' ? (
              <button
                type="button"
                onClick={()=>setStep(0)}
                className="inline-flex items-center gap-2 h-11 rounded-xl border border-slate-200 px-4 text-slate-700 hover:bg-slate-50"
                title="กลับไปเลือกวัคซีน"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                ย้อนกลับ
              </button>
            ) : (
              <a
                href="/lots"
                className="inline-flex items-center gap-2 h-11 rounded-xl border border-slate-200 px-4 text-slate-700 hover:bg-slate-50"
                title="ไปหน้ารายการล็อต"
              >
                <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                ไปหน้ารายการ
              </a>
            )}

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
                className="h-11 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 px-5 font-medium text-white shadow hover:opacity-95 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {saving ? 'กำลังบันทึก…' : 'บันทึกล็อตใหม่'}
                <CheckCircleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </>
    )
  }

  /* ========= Render ========= */
  return (
    <div className="relative">
      {/* Pastel background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-50 via-sky-50 to-white" />
        <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-fuchsia-200/30 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 w-[28rem] h-[28rem] rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 ring-1 ring-slate-200">
        {mode === 'wizard' ? (step === 0 ? <VaccineChooser /> : <DetailsForm />) : <DetailsForm />}
      </div>
    </div>
  )
}
