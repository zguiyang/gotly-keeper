import { TodosClient } from '@/components/workspace/todos-client'
import { requireWorkspaceUserOrRedirect } from '@/server/modules/auth/workspace-session'
import { listTodoAssets } from '@/server/modules/assets/assets.service'

export default async function TodosPage() {
  const user = await requireWorkspaceUserOrRedirect()

  const todos = await listTodoAssets(user.id)

  return <TodosClient todos={todos} />
}
