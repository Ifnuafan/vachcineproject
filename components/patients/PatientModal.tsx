'use client'

import { useEffect, useState } from 'react'
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
import { SparklesIcon, HeartIcon as HeartSolidIcon, ShieldCheckIcon } from '@heroicons/react/24/solid'

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

/* ========= UI helpers (สีม่วง+) ========= */
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
      className={`inline-flex items-center justify-center rounded-xl text-white shadow-sm bg-gradient-to-tr from-sky-400 via-violet-400 to-pink-400 ${
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

  useEffect(() => {
    // เมื่อ editing เปลี่ยน (เปิด/ปิด modal ซ้ำ) ให้ sync ค่าอีกรอบ
    setFullName(editing?.fullName ?? '')
    setBirthDate(editing ? editing.birthDate.slice(0, 10) : '')
    setGender(editing?.gender ?? 'MALE')
    setCid(editing?.cid ?? '')
    setPhone(editing?.phone ?? '')
    setAddress(editing?.address ?? '')
    setAllergies(editing?.allergies ?? '')
    setUnderlyingConditions(editing?.underlyingConditions ?? '')
  }, [editing])

  async function save() {
    setError('')
    if (!fullName || !birthDate || !gender || !cid) {
      setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบ')
      return
    }
    setSaving(true)
    try {
      const payload = {
        fullName,
        birthDate,
        gender,
        cid,
        phone: phone || null,
        address: address || null,
        allergies: allergies || null,
        underlyingConditions: underlyingConditions || null,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal card */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <IconBadge size="sm">
              <UserIcon className="w-4.5 h-4.5" />
            </IconBadge>
            {isEdit ? 'แก้ไขผู้ป่วย' : 'เพิ่มผู้ป่วย'}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-slate-100"
            aria-label="ปิด"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-800">
            <div>
              <label className="flex items-center gap-1 mb-1">
                <UserIcon className="w-4 h-4" /> ชื่อ-นามสกุล <span className="text-rose-500">*</span>
              </label>
              <input
                className="w-full border px-3 py-2 rounded-md bg-white text-slate-800 border-slate-200"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="flex items-center gap-1 mb-1">
                <CalendarIcon className="w-4 h-4" /> วันเกิด <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                className="w-full border px-3 py-2 rounded-md bg-white text-slate-800 border-slate-200"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1">เพศ <span className="text-rose-500">*</span></label>
              <select
                className="w-full border px-3 py-2 rounded-md bg-white text-slate-800 border-slate-200"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
              >
                <option value="MALE">ชาย</option>
                <option value="FEMALE">หญิง</option>
                <option value="OTHER">อื่นๆ</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 mb-1">
                <IdentificationIcon className="w-4 h-4" /> CID <span className="text-rose-500">*</span>
              </label>
              <input
                className="w-full border px-3 py-2 rounded-md bg-white text-slate-800 border-slate-200 font-mono tracking-wide"
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                maxLength={13}
              />
            </div>

            <div>
              <label className="flex items-center gap-1 mb-1">
                <PhoneIcon className="w-4 h-4" /> เบอร์โทร
              </label>
              <input
                className="w-full border px-3 py-2 rounded-md bg-white text-slate-800 border-slate-200"
                value={phone ?? ''}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="flex items-center gap-1 mb-1">
                <ExclamationTriangleIcon className="w-4 h-4 text-rose-500" /> แพ้ยา/วัคซีน
              </label>
              <textarea
                className="w-full border px-3 py-2 rounded-md bg-white text-slate-800 border-slate-200"
                rows={3}
                value={allergies ?? ''}
                onChange={(e) => setAllergies(e.target.value)}
              />
            </div>

            <div>
              <label className="flex items-center gap-1 mb-1">
                <HeartSolidIcon className="w-4 h-4 text-pink-500" /> โรคประจำตัว
              </label>
              <textarea
                className="w-full border px-3 py-2 rounded-md bg-white text-slate-800 border-slate-200"
                rows={3}
                value={underlyingConditions ?? ''}
                onChange={(e) => setUnderlyingConditions(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-1 mb-1">
                <MapPinIcon className="w-4 h-4" /> ที่อยู่
              </label>
              <textarea
                className="w-full border px-3 py-2 rounded-md bg-white text-slate-800 border-slate-200"
                rows={2}
                value={address ?? ''}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 px-6 py-4 bg-white/90">
          <RainbowChip label={isEdit ? 'โหมดแก้ไข' : 'โหมดเพิ่มใหม่'} />
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ป่วย'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
