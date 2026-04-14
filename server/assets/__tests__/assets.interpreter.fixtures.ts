export interface AssetInterpreterFixture {
  input: string
  expectedIntent: 'create_note' | 'create_link' | 'create_todo' | 'search_assets' | 'summarize_assets'
}

export const assetInterpreterFixtures: AssetInterpreterFixture[] = [
  {
    input: '记录一下 gotly 的定位是轻量个人信息入口',
    expectedIntent: 'create_note',
  },
  {
    input: '收藏 https://example.com/ai-pricing 这篇 AI 定价文章',
    expectedIntent: 'create_link',
  },
  {
    input: '明天下午记得发报价给客户',
    expectedIntent: 'create_todo',
  },
  {
    input: '我上次收藏的 AI 文章在哪',
    expectedIntent: 'search_assets',
  },
  {
    input: '关于定价的想法',
    expectedIntent: 'create_note',
  },
  {
    input: '帮我看看 https://github.com/vercel/ai 这个项目',
    expectedIntent: 'create_link',
  },
  {
    input: '周一上午记得开会',
    expectedIntent: 'create_todo',
  },
  {
    input: '搜索一下关于 typescript 的笔记',
    expectedIntent: 'search_assets',
  },
  {
    input: '总结最近笔记',
    expectedIntent: 'summarize_assets',
  },
  {
    input: '复盘一下未完成待办',
    expectedIntent: 'summarize_assets',
  },
  {
    input: '总结最近收藏的链接',
    expectedIntent: 'summarize_assets',
  },
  {
    input: '总结一下 AI',
    expectedIntent: 'create_note',
  },
]
