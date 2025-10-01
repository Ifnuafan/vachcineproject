'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Search, Shield, Mail, User as UserIcon, KeyRound, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

type UserRole = 'ADMIN' | 'STAFF'
type UserRow = { id: number; name: string; email: string; role: UserRole; createdAt: string }
type Paged<T> = { items: T[]; total: number; page: number; limit: number }

function fmt(n: number) { return Intl.NumberFormat().format(n) }
function cls(...xs: (string | false | null | undefined)[]) { return xs.filter(Boolean).join(' ') }

export default function UsersPage() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)

  // form states
  const [showForm, setShowForm] = useState<null | 'create' | { id: number }>(null)
  const [form, setForm] = useState<{ name: string; email: string; role: UserRole; password?: string }>({
    name: '', email: '', role: 'STAFF', password: '',
  })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (q.trim()) params.set('q', q.trim())
    const res = await fetch(`/api/users?${params.toString()}`, { cache: 'no-store' })
    const data = (await res.json()) as Paged<UserRow>
    setItems(data.items || [])
    setTotal(data.total || 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [page, limit])

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  function openCreate() {
    setForm({ name: '', email: '', role: 'STAFF', password: '' })
    setShowForm('create')
  }
  function openEdit(row: UserRow) {
    setForm({ name: row.name, email: row.email, role: row.role })
    setShowForm({ id: row.id })
  }

  async function submitCreate() {
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j?.message || 'สร้างไม่สำเร็จ')
      return
    }
    setShowForm(null)
    setPage(1)
    await load()
  }

  async function submitEdit(id: number) {
    setSaving(true)
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j?.message || 'อัปเดตไม่สำเร็จ')
      return
    }
    setShowForm(null)
    await load()
  }

  async function resetPassword(id: number) {
    const pwd = prompt('กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร):')
    if (!pwd) return
    if (pwd.length < 6) { alert('รหัสสั้นเกินไป'); return }
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j?.message || 'ตั้งรหัสใหม่ไม่สำเร็จ')
      return
    }
    alert('ตั้งรหัสผ่านใหม่เรียบร้อย')
  }

  async function remove(id: number) {
    if (!confirm('ยืนยันการลบผู้ใช้นี้?')) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j?.message || 'ลบไม่สำเร็จ')
      return
    }
    await load()
  }

  return (
    <div className="relative min-h-screen">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-200">
            <Users className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-extrabold text-slate-800">ผู้ใช้ / เจ้าหน้าที่</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 bg-white border border-slate-300 rounded-md px-2 h-9">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load() } }}
              placeholder="ค้นหาชื่อหรืออีเมล…"
              className="outline-none text-sm bg-transparent"
            />
          </div>
          <Button onClick={() => { setPage(1); load() }} variant="secondary" className="hidden md:inline-flex">
            ค้นหา
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> เพิ่มผู้ใช้
          </Button>
        </div>
      </div>

      <Card className="bg-white border-0 ring-1 ring-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-slate-800 text-[15px] md:text-base font-semibold">
            รายการผู้ใช้ในระบบ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-2">ชื่อ</th>
                  <th className="py-2 pr-2">อีเมล</th>
                  <th className="py-2 pr-2">สิทธิ์</th>
                  <th className="py-2 pr-2">สร้างเมื่อ</th>
                  <th className="py-2 pr-2 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="py-6 text-center text-slate-400" colSpan={5}>กำลังโหลด…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td className="py-6 text-center text-slate-400" colSpan={5}>ไม่พบข้อมูล</td></tr>
                ) : (
                  items.map((u) => (
                    <tr key={u.id} className="border-t border-slate-100">
                      <td className="py-2 pr-2">
                        <div className="inline-flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                            <UserIcon className="h-4 w-4" />
                          </span>
                          <span className="font-medium text-slate-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <div className="inline-flex items-center gap-2 text-slate-700">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {u.email}
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'} className={u.role === 'ADMIN' ? 'bg-amber-500' : ''}>
                          <Shield className="h-3.5 w-3.5 mr-1" />
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2 text-slate-600">{new Date(u.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="ghost" className="h-8 px-2 text-sky-700" onClick={() => openEdit(u)}>แก้ไข</Button>
                          <Button variant="outline" className="h-8 px-2 border-amber-200 text-amber-700" onClick={() => resetPassword(u.id)}>
                            <KeyRound className="h-4 w-4 mr-1" /> รีเซ็ตรหัส
                          </Button>
                          <Button variant="ghost" className="h-8 px-2 text-rose-600 hover:bg-rose-50" onClick={() => remove(u.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div>ทั้งหมด {fmt(total)} รายการ</div>
            <div className="inline-flex gap-1">
              <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>ก่อนหน้า</Button>
              <span className="px-2 py-1 rounded-md bg-slate-50 border border-slate-200">หน้า {page}</span>
              <Button variant="ghost" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>ถัดไป</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal (เบาๆ ด้วย div overlay) */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg ring-1 ring-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <Shield className="h-5 w-5 text-sky-600" />
                <div className="font-semibold text-slate-800">
                  {showForm === 'create' ? 'เพิ่มผู้ใช้ใหม่' : 'แก้ไขผู้ใช้'}
                </div>
              </div>
              <button className="text-slate-500 hover:text-slate-800" onClick={() => setShowForm(null)}>✕</button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="text-sm text-slate-600">ชื่อ</label>
                <input
                  className="mt-1 w-full h-9 rounded-md border border-slate-300 px-3 text-sm"
                  value={form.name}
                  onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">อีเมล</label>
                <input
                  className="mt-1 w-full h-9 rounded-md border border-slate-300 px-3 text-sm"
                  value={form.email}
                  onChange={(e) => setForm(s => ({ ...s, email: e.target.value }))}
                  disabled={showForm !== 'create'}
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">สิทธิ์</label>
                <select
                  className="mt-1 w-full h-9 rounded-md border border-slate-300 px-3 text-sm bg-white"
                  value={form.role}
                  onChange={(e) => setForm(s => ({ ...s, role: e.target.value as UserRole }))}
                >
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              {showForm === 'create' && (
                <div>
                  <label className="text-sm text-slate-600">รหัสผ่านเริ่มต้น</label>
                  <input
                    type="password"
                    className="mt-1 w-full h-9 rounded-md border border-slate-300 px-3 text-sm"
                    value={form.password || ''}
                    onChange={(e) => setForm(s => ({ ...s, password: e.target.value }))}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                  />
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(null)}>ยกเลิก</Button>
              {showForm === 'create' ? (
                <Button onClick={submitCreate} disabled={saving} className="gap-2">
                  {saving ? 'กำลังบันทึก…' : 'บันทึก'}
                </Button>
              ) : (
                <Button onClick={() => submitEdit((showForm as any).id)} disabled={saving} className="gap-2">
                  {saving ? 'กำลังบันทึก…' : 'อัปเดต'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
