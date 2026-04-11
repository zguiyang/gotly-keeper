import { headers } from 'next/headers'

import { AllClient } from '@/components/workspace/all-client'
import { auth } from '@/server/auth/auth'

export default async function AllPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return null
  }

  return <AllClient />
}