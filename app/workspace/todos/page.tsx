import { headers } from 'next/headers'

import { TodosClient } from '@/components/workspace/todos-client'
import { auth } from '@/server/auth/auth'

export default async function TodosPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return null
  }

  return <TodosClient />
}
