'use client'

import { useState } from 'react'
import {
  UserIcon,
  CalendarIcon,
  IdentificationIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

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

  async function save() {
    const payload = {
      fullName, birthDate, gender, cid,
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
    if (res.ok) onSaved()
    else {
      const err = await res.json().catch(() => ({}))
      alert(err?.message || 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-blue-600" />
              {isEdit ? 'แก้ไขผู้ป่วย' : 'เพิ่มผู้ป่วย'}
            </h2>
            <button onClick={onClose} className="px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">ปิด</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800 dark:text-white">
            <div>
              <label className="flex items-center gap-1 mb-1"><UserIcon className="w-4 h-4" /> ชื่อ-นามสกุล *</label>
              <input className="w-full border rounded px-3 py-2 bg-white/80 dark:bg-gray-800" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="flex items-center gap-1 mb-1"><CalendarIcon className="w-4 h-4" /> วันเกิด *</label>
              <input type="date" className="w-full border rounded px-3 py-2 bg-white/80 dark:bg-gray-800" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1">เพศ *</label>
              <select className="w-full border rounded px-3 py-2 bg-white/80 dark:bg-gray-800" value={gender} onChange={e => setGender(e.target.value as Gender)}>
                <option value="MALE">ชาย</option>
                <option value="FEMALE">หญิง</option>
                <option value="OTHER">อื่นๆ</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1 mb-1"><IdentificationIcon className="w-4 h-4" /> CID *</label>
              <input className="w-full border rounded px-3 py-2 bg-white/80 dark:bg-gray-800" value={cid} onChange={e => setCid(e.target.value)} maxLength={13} />
            </div>

            <div>
              <label className="flex items-center gap-1 mb-1"><PhoneIcon className="w-4 h-4" /> เบอร์โทร</label>
              <input className="w-full border rounded px-3 py-2 bg-white/80 dark:bg-gray-800" value={phone ?? ''} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="flex items-center gap-1 mb-1"><ExclamationTriangleIcon className="w-4 h-4 text-red-500" /> แพ้ยา/วัคซีน</label>
              <textarea className="w-full border rounded px-3 py-2 bg-white/80 dark:bg-gray-800" rows={3} value={allergies ?? ''} onChange={e => setAllergies(e.target.value)} />
            </div>
            <div>
              <label className="flex items-center gap-1 mb-1"><HeartIcon className="w-4 h-4 text-pink-500" /> โรคประจำตัว</label>
              <textarea className="w-full border rounded px-3 py-2 bg-white/80 dark:bg-gray-800" rows={3} value={underlyingConditions ?? ''} onChange={e => setUnderlyingConditions(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-1 mb-1"><MapPinIcon className="w-4 h-4" /> ที่อยู่</label>
              <textarea className="w-full border rounded px-3 py-2 bg-white/80 dark:bg-gray-800" rows={2} value={address ?? ''} onChange={e => setAddress(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 sticky bottom-0 pt-4 bg-white/90 dark:bg-gray-900/90">
            <button onClick={onClose} className="px-3 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800">ยกเลิก</button>
            <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
              {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ป่วย'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
