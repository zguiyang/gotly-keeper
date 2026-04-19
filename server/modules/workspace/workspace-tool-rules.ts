export const WORKSPACE_TOOL_RULES = [
  {
    name: 'create_note',
    whenToUse: '记录想法、文案、备忘、灵感，不是在查找或总结。',
    avoidWhen: '输入是网址、待办事项、搜索请求、总结请求。',
    examples: ['记一下首页文案方向', '记录一个新产品想法'],
  },
  {
    name: 'create_todo',
    whenToUse: '用户要记待办、提醒自己后续要做的事。',
    avoidWhen: '输入更像普通笔记、网址收藏、搜索请求、总结请求。',
    examples: ['提醒我周二发报价', '记个待办：整理发布清单'],
  },
  {
    name: 'create_link',
    whenToUse: '输入包含网址，用户想保存链接或网页资料。',
    avoidWhen: '没有链接，且目标是记笔记、待办、搜索或总结。',
    examples: ['存一下这个链接 https://example.com', '收藏这篇关于增长的文章'],
  },
  {
    name: 'search_assets',
    whenToUse: '用户在查找、搜索、回忆过去保存的内容。',
    avoidWhen: '用户只是想新增一条记录。',
    examples: ['帮我找上周收藏的文章', '搜索关于 landing page 的笔记'],
  },
  {
    name: 'summarize_workspace',
    whenToUse: '用户明确要总结、复盘、汇总待办、笔记或书签。',
    avoidWhen: '用户想新增内容或做关键词搜索。',
    examples: ['总结一下最近的笔记', '帮我复盘待办重点'],
  },
] as const

export function buildWorkspaceToolRulesPrompt() {
  return WORKSPACE_TOOL_RULES.map((rule) => {
    return [
      `工具: ${rule.name}`,
      `适用: ${rule.whenToUse}`,
      `避免: ${rule.avoidWhen}`,
      `示例: ${rule.examples.join('；')}`,
    ].join('\n')
  }).join('\n\n')
}
