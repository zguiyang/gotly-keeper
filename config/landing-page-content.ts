import {
  Brain,
  Search,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type LandingFloatCard = {
  eyebrow: string;
  title: string;
  description: string;
};

export type LandingFeatureCard = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  example: string;
};

export type LandingScenario = {
  title: string;
  description: string;
  example: string;
};

export type SocialProofItem = {
  value: string;
  label: string;
};

export const floatingCards: LandingFloatCard[] = [
  {
    eyebrow: "Capture",
    title: "记一下首页 slogan 想法",
    description: "一条普通记录，先收着，后面再继续完善。",
  },
  {
    eyebrow: "Retrieve",
    title: "我上次收藏的那个 AI 文章在哪",
    description: "直接问，不用再回忆它当时放在哪。",
  },
  {
    eyebrow: "Todo",
    title: "明天下午记得发报价",
    description: "带时间感的事项会被轻量收纳，不需要先建项目。",
  },
];

export const featureCards: LandingFeatureCard[] = [
  {
    icon: Zap,
    title: "① 扔进来",
    subtitle: "先存再说，零决策成本",
    description:
      "记录、链接、待办都从一个入口进，先保存再整理。你只管扔进来，剩下的交给系统。",
    example: '\u201c这周要看下用户反馈整理\u201d',
  },
  {
    icon: Brain,
    title: "② 自动整理",
    subtitle: "后台归类，你永远不用管",
    description:
      "系统自动识别类型与时间信息。结构化是后台能力，不是你的工作。",
    example: '\u201chttps://example.com 这个后面看\u201d',
  },
  {
    icon: Search,
    title: "③ 随时找回",
    subtitle: "自然语言一问，什么都能找回",
    description:
      "忘记分类也没关系，直接问就能找到。系统基于已有内容做智能召回。",
    example: '\u201c我最近记过关于定价的内容吗\u201d',
  },
];

export const scenarios: LandingScenario[] = [
  {
    title: "产品经理",
    description: "会议结束后随手记一句结论，不需要先打开笔记 app、新建文档、想好标题。",
    example: '"刚才讨论的定价方案先记一下"',
  },
  {
    title: "研究者",
    description: "看到有价值的论文或文章先收着，之后用自然语言找回，不需要记住放在哪。",
    example: '"我收藏过关于 RAG 的文章吗"',
  },
  {
    title: "自由职业者",
    description: "把客户跟进事项直接说出来，系统识别时间信息，不需要手动建任务。",
    example: '"下周三记得跟李总确认报价"',
  },
  {
    title: "重度收藏者",
    description: "不再为「收藏了但找不到」烦恼，所有内容都能被问出来。",
    example: '"帮我总结最近收藏的内容"',
  },
];

export const socialProof: SocialProofItem[] = [
  { value: "1,000+", label: "早期用户" },
  { value: "< 2s",   label: "平均找回时间" },
  { value: "0",      label: "需要手动分类" },
];
