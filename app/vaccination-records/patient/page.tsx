// 'use client'

// import { useEffect, useMemo, useState } from 'react'
// import { useSearchParams, useRouter } from 'next/navigation'
// import History from './History'

// type Patient = {
//   id: number
//   fullName: string
//   birthDate: string
//   gender: 'MALE' | 'FEMALE' | 'OTHER'
//   cid: string
// }

// async function fetchJSON(url: string) {
//   const res = await fetch(url, { cache: 'no-store' })
//   const txt = await res.text()
//   if (!res.ok) throw new Error(`[${res.status}] ${url} → ${txt.slice(0,160)}`)
//   try { return JSON.parse(txt) } catch { throw new Error(`Expected JSON from ${url}`) }
// }

// export default function PatientHistoryPage() {
//   const router = useRouter()
//   const sp = useSearchParams()
//   const patientId = Number(sp.get('patientId') || 0)

//   const [patient, setPatient] = useState<Patient | null>(null)
//   const [records, setRecords] = useState<any[]>([])
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState<string>('')

//   useEffect(() => {
//     if (!patientId || Number.isNaN(patientId)) return
//     ;(async () => {
//       setLoading(true)
//       setError('')
//       try {
//         const [p, rec] = await Promise.all([
//           fetchJSON(`/api/patients/${patientId}`),
//           fetchJSON(`/api/vaccination-records?patientId=${patientId}&limit=500`),
//         ])
//         setPatient(p)
//         setRecords(Array.isArray(rec?.items) ? rec.items : [])
//       } catch (e: any) {
//         setError(e?.message || 'โหลดข้อมูลไม่สำเร็จ')
//         setRecords([])
//       } finally {
//         setLoading(false)
//       }
//     })()
//   }, [patientId])

//   return (
//     <div className="px-4 py-6">
//       {/* header */}
//       <div className="mb-4 flex items-center justify-between">
//         <button
//           onClick={() => router.back()}
//           className="px-3 py-1.5 rounded-md bg-white ring-1 ring-slate-200 hover:bg-slate-50"
//         >
//           ← กลับ
//         </button>
//         <div className="text-lg font-semibold">
//           {patient ? `ประวัติผู้ป่วย: ${patient.fullName} (${patient.cid})` : 'ประวัติผู้ป่วย'}
//         </div>
//         <div />
//       </div>

//       {/* guard: ไม่มี patientId */}
//       {!patientId ? (
//         <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
//           ไม่พบ <span className="font-semibold">patientId</span> ใน URL
//           — โปรดเปิดจากลิงก์ในหน้ารายการ หรือเพิ่ม <code>?patientId=123</code>
//         </div>
//       ) : null}

//       {/* error banner */}
//       {error && (
//         <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700">
//           {error}
//         </div>
//       )}

//       {/* content */}
//       <History
//         loading={loading}
//         patient={patient}
//         records={records}
//       />
//     </div>
//   )
// }
