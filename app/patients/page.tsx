'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  UserIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import PatientModal from '@/components/patients/PatientModal'

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

export default function PatientsPage() {
  const [items, setItems] = useState<Patient[]>([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)

  const pages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`, { cache: 'no-store' })
      const data = await res.json()
      setItems(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [q, page]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }

  function openEdit(p: Patient) {
    setEditing(p)
    setOpen(true)
  }

  async function handleDelete(id: number) {
    if (!confirm('ลบรายการนี้?')) return
    const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' })
    if (res.ok) load()
    else alert('ลบไม่สำเร็จ')
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-blue-100 via-teal-100 to-emerald-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto backdrop-blur-xl bg-white/70 dark:bg-gray-900/50 border border-white/60 dark:border-white/10 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
            <UserIcon className="w-6 h-6 text-blue-600" />
            ผู้รับวัคซีน (Patients)
          </h1>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
            เพิ่มผู้ป่วย
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <input
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value) }}
            placeholder="ค้นหาชื่อ / CID / เบอร์โทร / แพ้ยา / โรคประจำตัว"
            className="w-full border rounded-md px-4 py-2 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white"
          />
          <button onClick={load} className="px-4 py-2 border rounded-md bg-gray-100 hover:bg-gray-200 transition dark:bg-gray-700 dark:text-white dark:border-gray-600">
            ค้นหา
          </button>
        </div>

        <div className="overflow-x-auto border rounded-lg shadow-sm">
          <table className="min-w-full text-sm text-gray-800 dark:text-white">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left">
              <tr>
                <th className="p-3">ชื่อ-นามสกุล</th>
                <th className="p-3">วันเกิด</th>
                <th className="p-3">เพศ</th>
                <th className="p-3">CID</th>
                <th className="p-3">เบอร์โทร</th>
                <th className="p-3">แพ้ยา/วัคซีน</th>
                <th className="p-3">โรคประจำตัว</th>
                <th className="p-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-6 text-center">⏳ กำลังโหลด…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-red-500">ไม่พบข้อมูล</td></tr>
              ) : items.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-3">{p.fullName}</td>
                  <td className="p-3">{new Date(p.birthDate).toLocaleDateString()}</td>
                  <td className="p-3">{p.gender === 'MALE' ? 'ชาย' : p.gender === 'FEMALE' ? 'หญิง' : 'อื่นๆ'}</td>
                  <td className="p-3">{p.cid}</td>
                  <td className="p-3">{p.phone ?? '-'}</td>
                  <td className="p-3 max-w-[200px] truncate" title={p.allergies ?? ''}>{p.allergies ?? '-'}</td>
                  <td className="p-3 max-w-[200px] truncate" title={p.underlyingConditions ?? ''}>{p.underlyingConditions ?? '-'}</td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(p)} className="flex items-center gap-1 px-3 py-1 border rounded-md text-blue-600 hover:bg-blue-50">
                        <PencilSquareIcon className="w-4 h-4" />
                        แก้ไข
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700">
                        <TrashIcon className="w-4 h-4" />
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 text-sm text-gray-700 dark:text-gray-300">
          <span>รวม {total} รายการ</span>
          <div className="flex gap-2 items-center">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="flex items-center gap-1 px-3 py-1 border rounded disabled:opacity-50">
              <ArrowLeftIcon className="w-4 h-4" />
              ก่อนหน้า
            </button>
            <span>หน้า {page}/{pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 px-3 py-1 border rounded disabled:opacity-50">
              ถัดไป
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {open && (
          <PatientModal
            editing={editing}
            onClose={() => setOpen(false)}
            onSaved={() => { setOpen(false); load() }}
          />
        )}
      </div>
    </div>
  )
}
