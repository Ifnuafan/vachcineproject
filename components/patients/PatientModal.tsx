'use client'

import { useEffect, useRef, useState } from 'react'
import {
  UserIcon,
  CalendarIcon,
  IdentificationIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { SparklesIcon, HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

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
    size === 'sm' ? 'h-8 w-8 text-[14px]' : size === 'lg' ? 'h-12 w-12 text-[18px]' : 'h-10 w-10 text-[16px]'
  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl text-white shadow-sm bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-sky-500 ${
        ring ? 'ring-1 ring-violet-200/60' : ''
      }`}
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

/* ========= Component ========= */
export default function PatientModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: Patient | null
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState(editing?.fullName ?? '')
  const [birthDate, setBirthDate] = useState(editing ? editing.birthDate.slice(0, 10) : '')
  const [gender, setGender] = useState<Gender>(editing?.gender ?? 'MALE')
  const [cid, setCid] = useState(editing?.cid ?? '')
  const [phone, setPhone] = useState(editing?.phone ?? '')
  const [address, setAddress] = useState(editing?.address ?? '')
  const [allergies, setAllergies] = useState(editing?.allergies ?? '')
  const [underlyingConditions, setUnderlyingConditions] = useState(editing?.underlyingConditions ?? '')

  const isEdit = !!editing
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ให้โฟกัสช่องชื่อทันที
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setFullName(editing?.fullName ?? '')
    setBirthDate(editing ? editing.birthDate.slice(0, 10) : '')
    setGender(editing?.gender ?? 'MALE')
    setCid(editing?.cid ?? '')
    setPhone(editing?.phone ?? '')
    setAddress(editing?.address ?? '')
    setAllergies(editing?.allergies ?? '')
    setUnderlyingConditions(editing?.underlyingConditions ?? '')
  }, [editing])

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  // ปิดด้วย ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save() {
    setError('')
    if (!fullName || !birthDate || !gender || !cid) {
      setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบ (ชื่อ, วันเกิด, เพศ, CID)')
      return
    }
    if (cid && cid.replace(/\D/g, '').length !== 13) {
      setError('CID ต้องมี 13 หลัก')
      return
    }
    setSaving(true)
    try {
      const payload = {
        fullName: fullName.trim(),
        birthDate,
        gender,
        cid: cid.trim(),
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        allergies: allergies ? allergies.trim() : null,
        underlyingConditions: underlyingConditions ? underlyingConditions.trim() : null,
      }
      const res = await fetch(isEdit ? `/api/patients/${editing!.id}` : '/api/patients', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || 'บันทึกไม่สำเร็จ')
      }
      onSaved()
    } catch (e: any) {
      setError(e?.message || 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  // กด Enter เพื่อบันทึก (ยกเว้นอยู่ใน textarea)
  function onFormKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName.toLowerCase() !== 'textarea') {
      e.preventDefault()
      save()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-slate-800/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal card */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        {/* Header (sticky) */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 border-b border-slate-200/70">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <IconBadge size="sm">
              <UserIcon className="w-4.5 h-4.5" />
            </IconBadge>
            {isEdit ? 'แก้ไขผู้ป่วย' : 'เพิ่มผู้ป่วย'}
          </div>
          <div className="flex items-center gap-2">
            <RainbowChip label={isEdit ? 'โหมดแก้ไข' : 'โหมดเพิ่มใหม่'} />
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100"
              aria-label="ปิด"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[72vh] overflow-y-auto px-6 py-5" onKeyDown={onFormKeyDown}>
          {error && (
            <div className="mb-4 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* กล่องฟอร์มคอนแพ็ค */}
          <div className="grid grid-cols-1 gap-5">
            {/* กลุ่ม: ข้อมูลจำเป็น */}
            <section className="rounded-2xl bg-white ring-1 ring-slate-200 p-4">
              <div className="mb-3 text-sm font-semibold text-slate-800">ข้อมูลจำเป็น</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 mb-1 text-[13px] text-slate-600">
                    <UserIcon className="w-4 h-4" /> ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={nameRef}
                    className="w-full border px-3 py-2.5 rounded-xl bg-white text-slate-800 border-slate-200 focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="เช่น สมชาย ใจดี"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 mb-1 text-[13px] text-slate-600">
                    <CalendarIcon className="w-4 h-4" /> วันเกิด <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full border px-3 py-2.5 rounded-xl bg-white text-slate-800 border-slate-200 focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 text-[13px] text-slate-600">เพศ <span className="text-rose-500">*</span></label>
                  <select
                    className="w-full border px-3 py-2.5 rounded-xl bg-white text-slate-800 border-slate-200 focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                  >
                    <option value="MALE">ชาย</option>
                    <option value="FEMALE">หญิง</option>
                    <option value="OTHER">ไม่ระบุ</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1 mb-1 text-[13px] text-slate-600">
                    <IdentificationIcon className="w-4 h-4" /> CID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="w-full border px-3 py-2.5 rounded-xl bg-white text-slate-800 border-slate-200 focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none font-mono tracking-wide"
                    value={cid}
                    onChange={(e) => setCid(e.target.value.replace(/[^\d]/g, '').slice(0, 13))}
                    inputMode="numeric"
                    maxLength={13}
                    placeholder="เลขบัตร 13 หลัก"
                    autoComplete="off"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">ใส่เฉพาะตัวเลข ระบบจะจำกัดไม่เกิน 13 หลักอัตโนมัติ</p>
                </div>
              </div>
            </section>

            {/* กลุ่ม: การติดต่อ & สุขภาพ */}
            <section className="rounded-2xl bg-white ring-1 ring-slate-200 p-4">
              <div className="mb-3 text-sm font-semibold text-slate-800">การติดต่อ & สุขภาพ</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 mb-1 text-[13px] text-slate-600">
                    <PhoneIcon className="w-4 h-4" /> เบอร์โทร
                  </label>
                  <input
                    className="w-full border px-3 py-2.5 rounded-xl bg-white text-slate-800 border-slate-200 focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
                    value={phone ?? ''}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="เช่น 0812345678"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-1 mb-1 text-[13px] text-slate-600">
                    <MapPinIcon className="w-4 h-4" /> ที่อยู่
                  </label>
                  <textarea
                    className="w-full border px-3 py-2.5 rounded-xl bg-white text-slate-800 border-slate-200 focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
                    rows={2}
                    value={address ?? ''}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="บ้านเลขที่ / ถนน / ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 mb-1 text-[13px] text-slate-600">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" /> แพ้ยา/วัคซีน
                  </label>
                  <textarea
                    className="w-full border px-3 py-2.5 rounded-xl bg-white text-slate-800 border-slate-200 focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
                    rows={3}
                    value={allergies ?? ''}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="เช่น แพ้เพนิซิลลิน, แพ้ยาชา"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 mb-1 text-[13px] text-slate-600">
                    <HeartSolidIcon className="w-4 h-4 text-pink-500" /> โรคประจำตัว
                  </label>
                  <textarea
                    className="w-full border px-3 py-2.5 rounded-xl bg-white text-slate-800 border-slate-200 focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
                    rows={3}
                    value={underlyingConditions ?? ''}
                    onChange={(e) => setUnderlyingConditions(e.target.value)}
                    placeholder="เช่น เบาหวาน, ความดันสูง"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 px-6 py-4 bg-white/90 border-t border-slate-200">
          <RainbowChip label={isEdit ? 'โหมดแก้ไข' : 'โหมดเพิ่มใหม่'} />
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50"
            >
              ยกเลิก (Esc)
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white shadow-sm bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 disabled:opacity-60 hover:opacity-95"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  {isEdit ? 'บันทึกการแก้ไข (Enter)' : 'เพิ่มผู้ป่วย (Enter)'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
