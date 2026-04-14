export const filterTabs = [
  { key: 'all', label: '知识库' },
  { key: 'note', label: '笔记' },
  { key: 'link', label: '书签' },
  { key: 'todo', label: '待办' },
] as const

export const emptyFilterMessages: Record<string, string> = {
  all: '暂无内容。先从启动台保存一条记录。',
  note: '暂无笔记。先保存一条想法或文本记录。',
  link: '暂无书签。粘贴链接后会出现在这里。',
  todo: '暂无待办。输入带有处理意图的内容后会出现在这里。',
}
