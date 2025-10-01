// 'use client'

// import { useEffect, useMemo, useState } from 'react'
// import * as XLSX from 'xlsx'
// import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
// import { FileSpreadsheet } from 'lucide-react'

// type MovementAction = 'RECEIVE' | 'TRANSFER' | 'ISSUE' | 'DISPOSE'

// type MovementRow = {
//   id: number
//   action: MovementAction
//   lotNo: string
//   vaccineName?: string | null
//   quantity: number
//   transactionDate: string // ISO
//   sourceWarehouse?: { id: number; name: string } | null
//   targetWarehouse?: { id: number; name: string } | null
//   remarks?: string | null
// }


// function fmt(d?: string) {
//   if (!d) return '-'
//   const x = new Date(d)
//   if (isNaN(x.getTime())) return d
//   const dd = String(x.getDate()).padStart(2, '0')
//   const mm = String(x.getMonth() + 1).padStart(2, '0')
//   const yy = String(x.getFullYear())
//   return `${dd}/${mm}/${yy}`
// }

// function norm(s: unknown) {
//   return String(s ?? '').toLowerCase().normalize('NFKD').replace(/\s+/g, ' ').trim()
// }

// export default function IssueMovementsPage() {
//   // ฟิลเตอร์
//   const [from, setFrom] = useState<string>(() => {
//     const d = new Date()
//     d.setDate(d.getDate() - 30)
//     return d.toISOString().slice(0, 10)
//   })
//   const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10))
//   const [search, setSearch] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState('')

//   // ข้อมูล
//   const [items, setItems] = useState<MovementRow[]>([])

//   function buildQuery() {
//     const params = new URLSearchParams()
//     params.set('action', 'ISSUE')
//     if (from) params.set('from', from)
//     if (to) params.set('to', to)
//     if (search.trim()) params.set('search', search.trim())
//     return `/api/movements?${params.toString()}`
//   }

//   async function load() {
//     setLoading(true)
//     setError('')
//     try {
//       const url = buildQuery()
//       const res = await fetch(url, { cache: 'no-store' })
//       if (!res.ok) {
//         const txt = await res.text()
//         throw new Error(txt || 'โหลดข้อมูลไม่สำเร็จ')
//       }
//       const data = await res.json()
//       // รองรับทั้งรูปแบบ {items: MovementRow[]} หรือ MovementRow[]
//       const rows: MovementRow[] = Array.isArray(data) ? data : (data?.items ?? [])
//       // กรองเฉพาะ ISSUE เผื่อ backend ยังไม่กรอง
//       const onlyIssue = rows.filter((r) => r.action === 'ISSUE')
//       setItems(onlyIssue)
//     } catch (e: any) {
//       setError(e?.message || 'เกิดข้อผิดพลาด')
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     load()
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [])

//   const filtered = useMemo(() => {
//     const q = norm(search)
//     if (!q) return items
//     return items.filter((r) => {
//       const hay = norm([
//         r.lotNo,
//         r.vaccineName ?? '',
//         r.remarks ?? '',
//         r.sourceWarehouse?.name ?? '',
//         r.targetWarehouse?.name ?? '',
//         fmt(r.transactionDate),
//       ].join(' '))
//       return hay.includes(q)
//     })
//   }, [items, search])

//   // สรุป (จำนวนเบิกรวม)
//   const totalIssued = filtered.reduce((sum, r) => sum + (r.quantity || 0), 0)

//   // Export Excel
//   const handleExport = () => {
//     const data = filtered.map((r) => ({
//       วันที่: fmt(r.transactionDate),
//       Lot: r.lotNo,
//       ยี่ห้อ: r.vaccineName ?? '-',
//       จำนวนที่เบิก: r.quantity,
//       จากคลัง: r.sourceWarehouse?.name ?? '-',
//       ไปที่: r.targetWarehouse?.name ?? '-', // กรณีระบบนับ OUT จากคลัง target อาจเป็นคลินิก/หน่วยงาน
//       หมายเหตุ: r.remarks ?? '',
//     }))
//     const ws = XLSX.utils.json_to_sheet(data)
//     const wb = XLSX.utils.book_new()
//     XLSX.utils.book_append_sheet(wb, ws, 'Issues')
//     const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
//     XLSX.writeFile(wb, `issues-${stamp}.xlsx`)
//   }

//   return (
//     <div className="min-h-screen px-4 py-8 bg-gray-50 dark:bg-gray-900">
//       {/* Header */}
//       <div className="flex items-center justify-between mb-4">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-800 dark:text-white">📤 รายการวัคซีนที่เบิก (ISSUE)</h1>
//           <p className="text-sm text-gray-500 dark:text-gray-400">
//             รวมจำนวนที่เบิก: <span className="font-semibold">{totalIssued.toLocaleString()}</span> โดส
//           </p>
//         </div>
//         <div className="flex gap-2">
//           <button
//             onClick={load}
//             className="flex items-center gap-2 bg-white border px-4 py-2 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
//             title="รีเฟรช"
//           >
//             <ArrowPathIcon className="w-5 h-5" />
//             รีเฟรช
//           </button>
//           <button
//             onClick={handleExport}
//             className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700"
//             title="ส่งออก Excel"
//           >
//             <FileSpreadsheet className="w-5 h-5" />
//             ส่งออก Excel
//           </button>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
//         <div className="col-span-1">
//           <label className="block mb-1 text-sm text-gray-600 dark:text-gray-300">จากวันที่</label>
//           <input
//             type="date"
//             value={from}
//             onChange={(e) => setFrom(e.target.value)}
//             className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
//           />
//         </div>
//         <div className="col-span-1">
//           <label className="block mb-1 text-sm text-gray-600 dark:text-gray-300">ถึงวันที่</label>
//           <input
//             type="date"
//             value={to}
//             onChange={(e) => setTo(e.target.value)}
//             className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
//           />
//         </div>
//         <div className="md:col-span-2">
//           <label className="block mb-1 text-sm text-gray-600 dark:text-gray-300">ค้นหา (Lot/ยี่ห้อ/หมายเหตุ/คลัง)</label>
//           <div className="relative">
//             <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
//             <input
//               type="text"
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               placeholder="พิมพ์คำค้น…"
//               className="pl-10 pr-3 py-2 w-full border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
//             />
//           </div>
//         </div>
//         <div className="md:col-span-4">
//           <button
//             onClick={load}
//             className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
//           >
//             ใช้ตัวกรอง
//           </button>
//         </div>
//       </div>

//       {loading && (
//         <div className="mb-3 text-sm text-gray-500 dark:text-gray-300">กำลังโหลดข้อมูล…</div>
//       )}
//       {error && (
//         <div className="mb-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
//           {error}
//         </div>
//       )}

//       {/* Table */}
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow">
//           <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
//             <tr>
//               <th className="px-4 py-2 text-center w-16">ลำดับ</th>
//               <th className="px-4 py-2 text-left">วันที่</th>
//               <th className="px-4 py-2 text-left">Lot</th>
//               <th className="px-4 py-2 text-left">ยี่ห้อ</th>
//               <th className="px-4 py-2 text-right">จำนวนที่เบิก</th>
//               <th className="px-4 py-2 text-left">คลังที่เบิก</th>
//               <th className="px-4 py-2 text-left">หมายเหตุ</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filtered.map((r, idx) => (
//               <tr key={r.id ?? `${r.lotNo}-${idx}`} className="border-t dark:border-gray-700">
//                 <td className="px-4 py-2 text-center">{idx + 1}</td>
//                 <td className="px-4 py-2">{fmt(r.transactionDate)}</td>
//                 <td className="px-4 py-2">{r.lotNo}</td>
//                 <td className="px-4 py-2">{r.vaccineName ?? '-'}</td>
//                 <td className="px-4 py-2 text-right">{(r.quantity ?? 0).toLocaleString()}</td>
//                 <td className="px-4 py-2">{r.sourceWarehouse?.name ?? r.targetWarehouse?.name ?? '-'}</td>
//                 <td className="px-4 py-2">{r.remarks ?? ''}</td>
//               </tr>
//             ))}
//             {!loading && filtered.length === 0 && (
//               <tr>
//                 <td colSpan={7} className="text-center py-6 text-gray-400">
//                   ไม่พบรายการเบิกในช่วงที่เลือก
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   )
// }
