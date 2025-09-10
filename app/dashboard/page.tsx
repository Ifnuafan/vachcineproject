import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../api/auth/[...nextauth]/route'
import AdminDashboard from '@/components/AdminDashboard'
import { LogoutButton } from '@/components/logout-button'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/')
  if (session.user?.role !== 'ADMIN') redirect('/home')

  return (
    <>
      <div className="p-4 flex justify-end">
        <LogoutButton role={session.user?.role || ''} />
      </div>
      <AdminDashboard />
    </>
  )
}
