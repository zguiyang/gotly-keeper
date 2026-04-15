import { TodosClient } from '@/components/workspace/todos-client'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import { listWorkspaceTodoAssets } from '@/server/modules/assets/assets.service'

export default async function TodosPage() {
  const user = await requireWorkspaceUserAccess()

  const todos = await listWorkspaceTodoAssets(user.id)

  return <TodosClient todos={todos} />
}
