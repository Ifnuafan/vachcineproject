'use client'

export default function StatusBadge({ status }: { status: 'USABLE'|'NEAR_EXPIRE'|'EXPIRED' }) {
  const map: Record<string, string> = {
    USABLE: 'bg-green-100 text-green-700',
    NEAR_EXPIRE: 'bg-yellow-100 text-yellow-800',
    EXPIRED: 'bg-red-100 text-red-700',
  }
  const label: Record<string, string> = {
    USABLE: 'ใช้งานอยู่',
    NEAR_EXPIRE: 'ใกล้หมดอายุ',
    EXPIRED: 'หมดอายุแล้ว',
  }
  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${map[status]}`}>
      {label[status]}
    </span>
  )
}
