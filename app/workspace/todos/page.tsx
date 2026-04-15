import { TodosClient } from '@/components/workspace/todos-client'
import { listWorkspaceTodoAssets } from '@/server/modules/assets/assets.service'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'

export default async function TodosPage() {
  const user = await requireWorkspaceUserAccess()

  const todos = await listWorkspaceTodoAssets(user.id)

  return <TodosClient todos={todos} />
}
