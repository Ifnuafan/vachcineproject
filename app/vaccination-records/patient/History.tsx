// 'use client'

// import { useMemo, useState } from 'react'
// import Link from 'next/link'
// import classNames from 'classnames'

// type LotStatus = 'USABLE' | 'NEAR_EXPIRE' | 'EXPIRED'
// type VStatus = 'COMPLETED' | 'POSTPONED' | 'CANCELED'

// type Patient = {
//   id: number
//   fullName: string
//   birthDate: string
//   gender: 'MALE' | 'FEMALE' | 'OTHER'
//   cid: string
// }

// type RecordItem = {
//   id: number
//   vaccinationDate: string
//   doseNumber: number | null
//   injectionSite: string | null
//   status: VStatus
//   provider: string | null
//   remarks: string | null
//   lotNo: string
//   vaccine?: { id: number; name: string }
//   lot?: { lotNo: string; expirationDate: string | null; status: LotStatus }
// }

// const STATUS_BADGE: Record<VStatus, string> = {
//   COMPLETED: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
//   POSTPONED: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
//   CANCELED: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
// }
// const STATUS_THAI: Record<VStatus, string> = {
//   COMPLETED: 'สำเร็จ', POSTPONED: 'เลื่อน', CANCELED: 'ยกเลิก',
// }
// const LOT_BADGE: Record<LotStatus, string> = {
//   USABLE: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
//   NEAR_EXPIRE: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
//   EXPIRED: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
// }
// const LOT_THAI: Record<LotStatus, string> = {
//   USABLE: 'พร้อมใช้',
//   NEAR_EXPIRE: 'ใกล้หมดอายุ',
//   EXPIRED: 'หมดอายุ',
// }

// function fmtDateTime(d?: string | null) {
//   if (!d) return '-'
//   const dt = new Date(d)
//   if (isNaN(dt.getTime())) return '-'
//   return dt.toLocaleString('th-TH', {
//     year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
//   })
// }
// function fmtDate(d?: string | null) {
//   if (!d) return '-'
//   const dt = new Date(d)
//   if (isNaN(dt.getTime())) return '-'
//   return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
// }

// export default function History({
//   loading,
//   patient,
//   records,
// }: {
//   loading: boolean
//   patient: Patient | null
//   records: RecordItem[]
// }) {
//   // filters
//   const [view, setView] = useState<'timeline' | 'table'>('timeline')
//   const [vaccineId, setVaccineId] = useState<number | ''>('')
//   const [status, setStatus] = useState<VStatus | ''>('')
//   const [q, setQ] = useState('')
//   const [dateFrom, setDateFrom] = useState('')
//   const [dateTo, setDateTo] = useState('')

//   // list of vaccines (derive from records เพื่อไม่ต้องยิง /api/cine)
//   const vaccines = useMemo(() => {
//     const seen = new Map<number, string>()
//     records.forEach(r => { if (r.vaccine?.id) seen.set(r.vaccine.id, r.vaccine.name) })
//     return Array.from(seen, ([id, name]) => ({ id, name }))
//   }, [records])

//   const filtered = useMemo(() => {
//     let list = [...records]
//     if (vaccineId) list = list.filter(r => r.vaccine?.id === Number(vaccineId))
//     if (status) list = list.filter(r => r.status === status)
//     if (q.trim()) {
//       const s = q.trim().toLowerCase()
//       list = list.filter(r =>
//         (r.lotNo || '').toLowerCase().includes(s) ||
//         (r.provider || '').toLowerCase().includes(s) ||
//         (r.remarks || '').toLowerCase().includes(s)
//       )
//     }
//     if (dateFrom) {
//       const from = new Date(dateFrom + 'T00:00:00')
//       list = list.filter(r => new Date(r.vaccinationDate) >= from)
//     }
//     if (dateTo) {
//       const to = new Date(dateTo + 'T23:59:59')
//       list = list.filter(r => new Date(r.vaccinationDate) <= to)
//     }
//     list.sort((a,b)=> new Date(b.vaccinationDate).getTime() - new Date(a.vaccinationDate).getTime())
//     return list
//   }, [records, vaccineId, status, q, dateFrom, dateTo])

//   const latest = filtered[0]

//   return (
//     <div className="space-y-6">
//       {/* patient mini card */}
//       <div className="rounded-xl bg-white ring-1 ring-slate-200 p-4">
//         {patient ? (
//           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
//             <div className="flex items-center gap-3">
//               <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-violet-200 via-fuchsia-200 to-sky-200 ring-1 ring-violet-200 text-slate-700 text-lg">
//                 {patient.fullName?.[0] ?? '?'}
//               </span>
//               <div>
//                 <div className="font-semibold text-slate-800">{patient.fullName}</div>
//                 <div className="text-sm text-slate-600">
//                   CID: <span className="font-mono">{patient.cid}</span>
//                 </div>
//               </div>
//             </div>
//             <div className="flex items-center gap-2 text-sm">
//               <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-white ring-1 ring-slate-200">
//                 รวม {filtered.length.toLocaleString()} รายการ
//               </span>
//               {latest && (
//                 <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-white ring-1 ring-slate-200">
//                   ล่าสุด {fmtDateTime(latest.vaccinationDate)}
//                 </span>
//               )}
//             </div>
//           </div>
//         ) : (
//           <div className="text-slate-500">กำลังโหลดข้อมูลผู้ป่วย…</div>
//         )}
//       </div>

//       {/* controls */}
//       <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
//         <div className="bg-white ring-1 ring-slate-200 rounded-md px-3 py-2">
//           <label className="text-sm text-slate-600">วัคซีน</label>
//           <select
//             value={vaccineId}
//             onChange={(e) => setVaccineId(Number(e.target.value) || '')}
//             className="w-full bg-transparent focus:outline-none text-slate-800"
//           >
//             <option value="">ทั้งหมด</option>
//             {vaccines.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
//           </select>
//         </div>
//         <div className="bg-white ring-1 ring-slate-200 rounded-md px-3 py-2">
//           <label className="text-sm text-slate-600">สถานะ</label>
//           <select
//             value={status}
//             onChange={(e) => setStatus((e.target.value as VStatus) || '')}
//             className="w-full bg-transparent focus:outline-none text-slate-800"
//           >
//             <option value="">ทั้งหมด</option>
//             <option value="COMPLETED">สำเร็จ</option>
//             <option value="POSTPONED">เลื่อน</option>
//             <option value="CANCELED">ยกเลิก</option>
//           </select>
//         </div>
//         <div className="bg-white ring-1 ring-slate-200 rounded-md px-3 py-2">
//           <label className="text-sm text-slate-600">จากวันที่</label>
//           <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full bg-transparent focus:outline-none" />
//         </div>
//         <div className="bg-white ring-1 ring-slate-200 rounded-md px-3 py-2">
//           <label className="text-sm text-slate-600">ถึงวันที่</label>
//           <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full bg-transparent focus:outline-none" />
//         </div>
//         <div className="bg-white ring-1 ring-slate-200 rounded-md px-3 py-2">
//           <label className="text-sm text-slate-600">ค้นหา (ล็อต/ผู้ให้บริการ/หมายเหตุ)</label>
//           <input value={q} onChange={e=>setQ(e.target.value)} className="w-full bg-transparent focus:outline-none" />
//         </div>
//       </div>

//       {/* content */}
//       {loading ? (
//         <div className="text-center text-slate-500 py-12">กำลังโหลด…</div>
//       ) : filtered.length === 0 ? (
//         <div className="rounded-xl bg-white ring-1 ring-slate-200 p-6 text-center text-slate-500">
//           ไม่พบรายการที่ตรงกับเงื่อนไข
//         </div>
//       ) : view === 'timeline' ? (
//         <div className="relative">
//           <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-200 via-fuchsia-200 to-sky-200 rounded-full" />
//           <ul className="space-y-4">
//             {filtered.map(r => (
//               <li key={r.id} className="relative pl-16 sm:pl-20">
//                 <div className={classNames(
//                   'absolute left-4 sm:left-6 top-3 h-5 w-5 rounded-full ring-4 ring-white',
//                   r.status === 'COMPLETED' ? 'bg-emerald-500' :
//                   r.status === 'POSTPONED' ? 'bg-amber-500' : 'bg-rose-500'
//                 )} />
//                 <div className="rounded-xl bg-white ring-1 ring-slate-200 p-4 shadow-sm">
//                   <div className="flex items-center justify-between">
//                     <div className="font-semibold text-slate-800">{fmtDateTime(r.vaccinationDate)}</div>
//                     <span className={classNames('px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_BADGE[r.status])}>
//                       {STATUS_THAI[r.status]}
//                     </span>
//                   </div>
//                   <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-700">
//                     <div><span className="text-slate-500">วัคซีน:</span> {r.vaccine?.name ?? '-'}</div>
//                     <div><span className="text-slate-500">เข็มที่:</span> {r.doseNumber ?? '-'}</div>
//                     <div><span className="text-slate-500">ตำแหน่งฉีด:</span> {r.injectionSite ?? '-'}</div>
//                     <div className="md:col-span-2 flex items-center gap-2">
//                       <span className="text-slate-500">ล็อต:</span> {r.lotNo}
//                       {r.lot?.status && (
//                         <span className={classNames('px-1.5 py-0.5 rounded-full text-[11px] font-medium', LOT_BADGE[r.lot.status])}>
//                           {LOT_THAI[r.lot.status]}
//                         </span>
//                       )}
//                     </div>
//                     <div>
//                       <span className="text-slate-500">หมดอายุ:</span>{' '}
//                       {r.lot?.expirationDate ? fmtDate(r.lot.expirationDate) : '-'}
//                     </div>
//                     <div><span className="text-slate-500">ผู้ให้บริการ:</span> {r.provider ?? '-'}</div>
//                     {r.remarks && (
//                       <div className="md:col-span-3">
//                         <span className="text-slate-500">หมายเหตุ:</span> {r.remarks}
//                       </div>
//                     )}
//                   </div>
//                   <div className="mt-3">
//                     <Link href={`/vaccination-records/${r.id}`} className="px-3 py-1.5 rounded-md bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-700 text-sm">
//                       รายละเอียดบันทึก
//                     </Link>
//                   </div>
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </div>
//       ) : (
//         <div className="overflow-x-auto">
//           <table className="min-w-full bg-white rounded-xl shadow-md ring-1 ring-slate-200 text-sm">
//             <thead className="bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 text-slate-700">
//               <tr>
//                 <th className="p-3 text-left">วัน-เวลา</th>
//                 <th className="p-3 text-left">วัคซีน</th>
//                 <th className="p-3 text-left">เข็ม</th>
//                 <th className="p-3 text-left">ตำแหน่ง</th>
//                 <th className="p-3 text-left">ล็อต / หมดอายุ</th>
//                 <th className="p-3 text-left">สถานะ</th>
//                 <th className="p-3 text-left">ผู้ให้บริการ</th>
//                 <th className="p-3 text-left">หมายเหตุ</th>
//               </tr>
//             </thead>
//             <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
//               {filtered.map(r => (
//                 <tr key={r.id} className="border-t border-slate-200/60">
//                   <td className="p-3">{fmtDateTime(r.vaccinationDate)}</td>
//                   <td className="p-3">{r.vaccine?.name ?? '-'}</td>
//                   <td className="p-3">{r.doseNumber ?? '-'}</td>
//                   <td className="p-3">{r.injectionSite ?? '-'}</td>
//                   <td className="p-3">
//                     <div className="flex items-center gap-2">
//                       <span className="font-medium text-slate-800">{r.lotNo}</span>
//                       {r.lot?.expirationDate && (
//                         <span className="text-xs text-slate-500">หมดอายุ {fmtDate(r.lot.expirationDate)}</span>
//                       )}
//                       {r.lot?.status && (
//                         <span className={classNames('px-1.5 py-0.5 rounded-full text-[11px] font-medium', LOT_BADGE[r.lot.status])}>
//                           {LOT_THAI[r.lot.status]}
//                         </span>
//                       )}
//                     </div>
//                   </td>
//                   <td className="p-3">
//                     <span className={classNames('px-2 py-1 rounded-full text-xs font-semibold', STATUS_BADGE[r.status])}>
//                       {STATUS_THAI[r.status]}
//                     </span>
//                   </td>
//                   <td className="p-3">{r.provider ?? '-'}</td>
//                   <td className="p-3 max-w-[280px] truncate" title={r.remarks ?? ''}>{r.remarks ?? '-'}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* view toggle */}
//       <div className="flex items-center gap-2">
//         <button
//           onClick={() => setView('timeline')}
//           className={classNames('px-3 py-1.5 rounded-md ring-1 shadow-sm',
//             view==='timeline' ? 'bg-violet-600 text-white ring-violet-600'
//                               : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}
//         >
//           Timeline
//         </button>
//         <button
//           onClick={() => setView('table')}
//           className={classNames('px-3 py-1.5 rounded-md ring-1 shadow-sm',
//             view==='table' ? 'bg-violet-600 text-white ring-violet-600'
//                             : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}
//         >
//           Table
//         </button>
//       </div>
//     </div>
//   )
// }
