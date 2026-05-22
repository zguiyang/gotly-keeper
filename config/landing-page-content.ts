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

// Icons only — text moved to locale files
export const featureIcons: Record<string, LucideIcon> = {
  quickCapture: FileText,
  saveLinks: Bookmark,
  timeReminders: Brain,
  naturalSearch: Search,
};

export const painPointKeys = ["savedButLost", "notedButUnorganized", "organizedButTimeConsuming"] as const;
export const scenarioKeys = ["productManager", "researcher", "freelancer", "powerCollector"] as const;

export const roadmapItems: RoadmapItem[] = [
  { label: "Notes / Bookmarks / Todos", status: "shipped" },
  { label: "AI Unified Entry", status: "shipped" },
  { label: "Natural Language Search", status: "shipped" },
  { label: "AI Content Summary", status: "shipped" },
  { label: "PWA Support", status: "shipped" },
  { label: "Link Content Extraction + AI Summary", status: "building" },
  { label: "Markdown Editor", status: "building" },
  { label: "Data Export (Markdown / JSON)", status: "building" },
  { label: "Browser Extension", status: "planned" },
  { label: "Mobile Push Notifications", status: "planned" },
  { label: "Email-to-Asset", status: "planned" },
  { label: "iOS Shortcuts", status: "planned" },
];

export const socialProofData = [
  { key: "earlyUsers", value: "1,000+" },
  { key: "retrievalTime", value: "< 2s" },
  { key: "noCategorization", value: "0" },
];
