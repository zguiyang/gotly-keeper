export const assetTimeFixtureNow = new Date('2026-04-13T10:00:00+08:00')

export const assetTimeFixtures = [
  {
    input: '明天下午记得发报价给客户',
    expectedTimeText: '明天下午',
    expectedDueLocalDate: '2026-04-14',
  },
  {
    input: '后天上午整理素材',
    expectedTimeText: '后天上午',
    expectedDueLocalDate: '2026-04-15',
  },
  {
    input: '下周五处理合同',
    expectedTimeText: '下周五',
    expectedDueLocalDate: '2026-04-24',
  },
  {
    input: '这周有什么待处理的事',
    expectedTimeText: '这周',
    expectedDueLocalDate: null,
  },
  {
    input: '下午看看这个',
    expectedTimeText: '下午',
    expectedDueLocalDate: null,
  },
]
