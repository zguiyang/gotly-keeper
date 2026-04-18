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
};

export type LandingScenario = {
  title: string;
  description: string;
  example: string;
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
    title: "Capture",
    subtitle: "你说一句，它帮你收好。",
    description:
      "记录、链接、待办都从一个统一入口进入，先保存原始内容，再做轻量识别。",
  },
  {
    icon: Brain,
    title: "Refine",
    subtitle: "整理发生在后台，不增加前台负担。",
    description:
      "系统自动识别记录类型与时间信息，让结构化成为后台能力，而不是用户工作。",
  },
  {
    icon: Search,
    title: "Retrieve",
    subtitle: "以后再问，我帮你找回来。",
    description:
      "用户只需要自然语言提问，系统基于已有资产做召回与展示。",
  },
];

export const scenarios: LandingScenario[] = [
  {
    title: "随手记一句话",
    description: "想到什么先说一句，不需要先决定它属于哪个页面。",
    example: "“这周要看下用户反馈整理”",
  },
  {
    title: "顺手收藏一个链接",
    description: "看到有价值的内容先收着，之后需要时再回来处理。",
    example: "“https://example.com 这个后面看”",
  },
  {
    title: "以后再自然语言找回",
    description: "不记分类、不记位置，直接向系统问你要找的内容。",
    example: "“我最近记过关于定价的内容吗”",
  },
  {
    title: "做轻量回顾与总结",
    description: "基于已有记录和收藏，获得轻量总结，而不是长篇输出。",
    example: "“帮我总结一下最近记录的重点”",
  },
];

export const principles = [
  "轻量优先，不把记录变成管理工作。",
  "统一入口优先，让用户尽量少决定分类。",
  "低管理成本，把结构化留在后台完成。",
  "以后通过自然语言找回，而不是回忆路径。",
];

export const manifestoTags = ["轻量记录", "智能归档", "自然找回"];
