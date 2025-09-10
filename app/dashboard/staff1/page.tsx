'use client'

import {
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ExclamationCircleIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline'

export default function StaffDashboard() {
  const stats = [
    {
      name: 'การฉีดวันนี้',
      value: '34 คน',
      icon: CalendarDaysIcon,
      color: 'bg-green-100 text-green-700',
    },
    {
      name: 'วัคซีนคงเหลือ',
      value: '860 โดส',
      icon: ClipboardDocumentCheckIcon,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      name: 'วัคซีนใกล้หมดอายุ',
      value: '2 รายการ',
      icon: ExclamationCircleIcon,
      color: 'bg-yellow-100 text-yellow-700',
    },
    {
      name: 'ผู้ที่ถึงวันเข็มถัดไป',
      value: '11 คน',
      icon: BellAlertIcon,
      color: 'bg-red-100 text-red-600',
    },
  ]

  return (
    <div className="min-h-screen px-4 py-8 bg-gray-50 dark:bg-gray-900">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">แดชบอร์ดเจ้าหน้าที่</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((item) => (
          <div key={item.name} className="flex items-center p-5 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <div className={`p-3 rounded-full ${item.color} mr-4`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.name}</p>
              <p className="text-lg font-semibold text-gray-800 dark:text-white">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
