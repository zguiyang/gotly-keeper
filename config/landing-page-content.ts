import { Bookmark, Brain, FileText, Search, type LucideIcon } from "lucide-react";

export type FeatureCard = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

export type PainPoint = {
  title: string;
  desc: string;
};

export type Scenario = {
  role: string;
  desc: string;
  example: string;
};

export type RoadmapItem = {
  label: string;
  status: "shipped" | "building" | "planned";
};

export const featureCards: FeatureCard[] = [
  {
    icon: FileText,
    title: "随手记录",
    desc: "一句话输入，自动识别是笔记、待办还是书签。",
  },
  {
    icon: Bookmark,
    title: "收藏链接",
    desc: "粘贴链接，标题摘要自动抓取，以后直接检索。",
  },
  {
    icon: Brain,
    title: "时间提醒",
    desc: '说"下周三跟进报价"，时间自动提取，不用手动建任务。',
  },
  {
    icon: Search,
    title: "自然语言找回",
    desc: "不记得放在哪了？描述一下就能找到。",
  },
];

export const painPoints: PainPoint[] = [
  {
    title: "收藏了，但找不到",
    desc: "书签、微信收藏、笔记 app，分散在各处，需要时想不起来放在哪。",
  },
  {
    title: "记了，但没整理",
    desc: "随手记的东西堆在一起，时间一长就成了信息垃圾场。",
  },
  {
    title: "整理了，但太费时",
    desc: "分类、打标签、写摘要，整理本身比记录更费劲。",
  },
];

export const scenarios: Scenario[] = [
  {
    role: "产品经理",
    desc: "会议结束，随手记一句结论。不用新建文档，不用想标题。",
    example: '"刚才讨论的定价方案先记一下"',
  },
  {
    role: "研究者",
    desc: "看到有价值的论文先收藏，之后用自然语言找回。",
    example: '"我收藏过关于 RAG 的文章吗"',
  },
  {
    role: "自由职业者",
    desc: "说出客户跟进事项，时间自动识别，不用手动建任务。",
    example: '"下周三记得跟李总确认报价"',
  },
  {
    role: "重度收藏者",
    desc: '所有收藏都能通过提问找到，再也不为"找不到"烦恼。',
    example: '"帮我总结最近收藏的内容"',
  },
];

export const roadmapItems: RoadmapItem[] = [
  { label: "笔记 / 书签 / 待办", status: "shipped" },
  { label: "AI 统一入口", status: "shipped" },
  { label: "自然语言检索", status: "shipped" },
  { label: "AI 内容摘要", status: "shipped" },
  { label: "PWA 支持", status: "shipped" },
  { label: "链接正文提取 + AI 摘要", status: "building" },
  { label: "Markdown 编辑器", status: "building" },
  { label: "数据导出（Markdown / JSON）", status: "building" },
  { label: "浏览器插件", status: "planned" },
  { label: "移动端推送提醒", status: "planned" },
  { label: "邮件转资产", status: "planned" },
  { label: "iOS 快捷指令", status: "planned" },
];

export const socialProof = [
  { value: "1,000+", label: "早期用户" },
  { value: "< 2s", label: "平均找回时间" },
  { value: "0", label: "需要手动分类" },
];
