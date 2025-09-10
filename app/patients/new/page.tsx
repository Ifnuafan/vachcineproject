'use client'

import { useState } from 'react'
import { CalendarDaysIcon, MapPinIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { FaSyringe } from 'react-icons/fa'

const patients = ['สมชาย แซ่ลิ้ม', 'ศิริพร ใจดี', 'วัชรี แสงทอง']
const vaccines = ['วัคซีนโควิด-19', 'วัคซีนไข้หวัดใหญ่', 'วัคซีนบาดทะยัก']
const doses = ['เข็มที่ 1', 'เข็มที่ 2', 'Booster', 'Booster 2']
const staff = ['พยาบาล กนกพร', 'หมอสมชาย', 'เจ้าหน้าที่ ภัทร']

export default function NewVaccineLogPage() {
  const [form, setForm] = useState({
    patient: '',
    vaccine: '',
    doseType: '',
    date: '',
    time: '',
    location: '',
    provider: '',
    batch: '',
    note: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('💾 Form data:', form)
    // TODO: call API
  }

  return (
    <div className="min-h-screen px-6 py-10 bg-gradient-to-tr from-blue-100 to-green-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-blue-700 dark:text-green-400 mb-6 flex items-center gap-2">
          <FaSyringe className="w-6 h-6 text-red-500" />
          บันทึกการฉีดวัคซีน
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Patient */}
          <div>
            <label className="block text-sm font-medium mb-1">👤 ผู้รับวัคซีน</label>
            <select
              name="patient"
              value={form.patient}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md py-2 px-3 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- เลือกผู้รับวัคซีน --</option>
              {patients.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Vaccine */}
          <div>
            <label className="block text-sm font-medium mb-1">🧬 วัคซีน</label>
            <select
              name="vaccine"
              value={form.vaccine}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md py-2 px-3 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- เลือกวัคซีน --</option>
              {vaccines.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          
          {/* Dose Type */}
          <div>
            <label className="block text-sm font-medium mb-1">🧪 ชนิดเข็ม</label>
            <select
              name="doseType"
              value={form.doseType}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md py-2 px-3 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- เลือกชนิดเข็ม --</option>
              {doses.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">📅 วันที่</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md py-2 px-3 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">⏰ เวลา</label>
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md py-2 px-3 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-1">📍 สถานที่</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              required
              placeholder="เช่น รพ.สต ยาบี"
              className="w-full border border-gray-300 rounded-md py-2 px-3 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium mb-1">👨‍⚕️ ผู้ให้บริการ</label>
            <select
              name="provider"
              value={form.provider}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md py-2 px-3 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- เลือกเจ้าหน้าที่ --</option>
              {staff.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Batch / Dose Ratio */}
          <div>
            <label className="block text-sm font-medium mb-1">🧪 ปริมาณ/อัตราโดส (เช่น 1:1, 1:10)</label>
            <input
              type="text"
              name="batch"
              value={form.batch}
              onChange={handleChange}
              placeholder="1:1, 1:10"
              className="w-full border border-gray-300 rounded-md py-2 px-3 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium mb-1">📝 หมายเหตุเพิ่มเติม</label>
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              rows={3}
              placeholder="พิมพ์รายละเอียดเพิ่มเติม..."
              className="w-full border border-gray-300 rounded-md py-2 px-3 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-3 rounded-full font-semibold text-lg hover:opacity-90 transition-all"
          >
            💾 บันทึกข้อมูล
          </button>
        </form>
      </div>
    </div>
  )
}
