// app/vaccination-records/new/page.tsx
import NewVaccinationForm from '@/components/vaccination/NewVaccinationForm'

export const dynamic = 'force-dynamic'

export default async function Page() {
  // Server component บาง ๆ โหลด client form
  return <NewVaccinationForm />
}
