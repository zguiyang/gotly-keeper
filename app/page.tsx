"use client";

import { useState } from "react";

// Material Symbols component
function MaterialIcon({
  icon,
  className = "",
}: {
  icon: string;
  className?: string;
}) {
  return (
    <span className={`material-symbols-outlined ${className}`} data-icon={icon}>
      {icon}
    </span>
  );
}

// Sidebar Navigation Component
function Sidebar() {
  const navItems = [
    { icon: "dashboard", label: "首页工作台", href: "#", active: true },
    { icon: "inventory_2", label: "全部记录", href: "#" },
    { icon: "checklist", label: "待办", href: "#" },
    { icon: "description", label: "笔记", href: "#" },
    { icon: "bookmark", label: "书签", href: "#" },
    { icon: "search", label: "搜索", href: "#" },
  ];

  const bottomItems = [{ icon: "settings", label: "设置", href: "#" }];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-100 dark:bg-slate-900 flex flex-col py-6 px-4 font-[family-name:var(--font-manrope)] text-sm font-medium z-50">
      {/* Logo */}
      <div className="flex flex-col mb-10">
        <div className="flex items-center gap-3 mb-1">
          <img
            alt="Gotly AI Logo"
            className="w-10 h-10 rounded-xl"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsPabDm2LE2xcHb8R7k8gWtUjDGPSivqvy-kvfu2Tt-Qr94p5Gz0gFLDRnDugJWqNuCTMaIkFC2N5pfGkUuDco1amqU4EbjmxY5s02rWP0qaw_Ghom63FqqfdQx5cVo1f8GB2-ifrp2DQPDHOvvUxIN_sJjTYnEqE0743qjd-sbfJ_Ed_0CrFz7GftSV5FBzHRDHDt2Uk5ItpurDc2a6RVGoDLtfY1H7dh-5pQ5wJqLtb0FFYbrqnWwMQm7k-xb0w26M5AMIkG9Oc"
          />
          <div>
            <h1 className="text-xl font-extrabold text-blue-700 dark:text-blue-400">
              Gotly AI
            </h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
              Quiet Architect
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {navItems.map((item) => (
          <a
            key={item.icon}
            className={`flex items-center gap-3 px-3 py-2 transition-all duration-200 ease-in-out group ${
              item.active
                ? "text-blue-700 dark:text-blue-400 font-bold border-r-2 border-blue-700 bg-slate-200/50 dark:bg-slate-800/50"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
            }`}
            href={item.href}
          >
            <MaterialIcon
              icon={item.icon}
              className="text-xl"
            />
            <span>{item.label}</span>
          </a>
        ))}

        {/* Settings divider */}
        <div className="pt-6 mt-6 border-t border-slate-200/50">
          {bottomItems.map((item) => (
            <a
              key={item.icon}
              className="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all duration-200 ease-in-out group"
              href={item.href}
            >
              <MaterialIcon
                icon={item.icon}
                className="text-xl"
              />
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      </nav>
    </aside>
  );
}

// Top App Bar Component
function TopAppBar() {
  return (
    <header className="h-14 w-full sticky top-0 bg-slate-50 dark:bg-slate-950 flex justify-between items-center px-6 z-40 font-[family-name:var(--font-manrope)] tracking-tight text-sm">
      <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400">
        首页工作台
      </h2>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <button
            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-300 transition-colors active:opacity-70"
            aria-label="Notifications"
          >
            <MaterialIcon icon="notifications" className="text-xl" />
          </button>
          <button
            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-300 transition-colors active:opacity-70"
            aria-label="Help"
          >
            <MaterialIcon icon="help" className="text-xl" />
          </button>
          <button
            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-300 transition-colors active:opacity-70"
            aria-label="Apps"
          >
            <MaterialIcon icon="apps" className="text-xl" />
          </button>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden cursor-pointer border border-slate-200 dark:border-slate-800">
          <img
            alt="User profile avatar"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKsQuNJEu7bxOZdp1mQbsK1jJGpQCuB6cf7nlRhY-auUjdsBIYioX_3WcbxpZ9PRcBN6pmRiE9mcB4yP78oWGbI6-FgIe3Irkpk5tSQ9mgMLL5WTYaar0pMLWUU3RekQs16Y5gjL_YFv3fbdnW85QMJt8100E-_ufP0gAxKwdPGeNlBrIaDirA1uJXddcXuJEMC62nvB3cs6ns0Xokza4kD9gb_W9LuZ2LpxJgrG9Q5RlXvqQyyp3lT-ODtsgzEdFJOb6xl4MczHo"
          />
        </div>
      </div>
    </header>
  );
}

// Quick Action Chips
function QuickActionChips() {
  const chips = [
    "明天下午三点提醒我发邮件",
    "存一下关于AI设计的文章",
    "记一下项目A的思考",
  ];

  return (
    <div className="flex gap-3 mt-4 overflow-x-auto no-scrollbar">
      {chips.map((chip, index) => (
        <button
          key={index}
          className="px-4 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant text-xs font-medium border border-outline-variant/15 hover:bg-primary-container hover:text-on-primary-container transition-all whitespace-nowrap"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

// AI Capture Composer
function AICaptureComposer() {
  return (
    <section className="mb-16">
      <div className="bg-surface-container-lowest rounded-xl shadow-[0_32px_64px_-12px_rgba(42,52,57,0.06)] p-6 border-b-2 border-primary">
        <div className="flex items-start gap-4">
          <div className="mt-2 text-primary">
            <MaterialIcon icon="auto_awesome" className="text-3xl" />
          </div>
          <div className="flex-1">
            <textarea
              className="w-full bg-transparent border-none focus:ring-0 text-xl font-[family-name:var(--font-sans)] text-on-surface placeholder-on-surface-variant/40 resize-none min-h-[120px] p-0"
              placeholder="在这里输入或通过语音捕捉灵感..."
            />
          </div>
        </div>
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-surface-container">
          <div className="flex gap-2 text-on-surface-variant">
            <button
              className="p-2 hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
              aria-label="Voice input"
            >
              <MaterialIcon icon="mic" className="text-xl" />
            </button>
            <button
              className="p-2 hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
              aria-label="Add image"
            >
              <MaterialIcon icon="image" className="text-xl" />
            </button>
            <button
              className="p-2 hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
              aria-label="Add attachment"
            >
              <MaterialIcon icon="attachment" className="text-xl" />
            </button>
          </div>
          <button className="bg-primary text-on-primary px-8 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 active:scale-95 transition-all">
            立即记录
          </button>
        </div>
      </div>
    </section>
  );
}

// Recent Records Item
function RecentRecordItem({
  color,
  title,
  meta,
  type,
}: {
  color: string;
  title: string;
  meta: string;
  type: string;
}) {
  return (
    <div className="group flex items-center gap-4 py-3 border-b border-outline-variant/15 hover:bg-surface-container-low px-2 rounded-lg transition-colors cursor-pointer">
      <span className={`w-2 h-2 rounded-full bg-${color}-400`}></span>
      <div className="flex-1">
        <p className="text-sm font-medium text-on-surface">{title}</p>
        <p className="text-[11px] text-on-surface-variant mt-0.5">
          {meta} · {type}
        </p>
      </div>
      <MaterialIcon
        icon="more_horiz"
        className="text-lg opacity-0 group-hover:opacity-100 text-on-surface-variant cursor-pointer"
      />
    </div>
  );
}

// Recent Note Card
function RecentNoteCard({
  title,
  excerpt,
  tag,
  date,
}: {
  title: string;
  excerpt: string;
  tag: string;
  date: string;
}) {
  return (
    <div className="py-4 hover:bg-surface-container-low px-4 rounded-xl transition-all border border-transparent hover:border-outline-variant/10 cursor-pointer">
      <h5 className="font-bold text-on-surface">{title}</h5>
      <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">
        {excerpt}
      </p>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] bg-primary-container text-on-primary-container px-2 py-0.5 rounded">
          {tag}
        </span>
        <span className="text-[10px] text-on-surface-variant">{date}</span>
      </div>
    </div>
  );
}

// Todo Item
function TodoItem({
  text,
  time,
  completed = false,
  urgent = false,
}: {
  text: string;
  time?: string;
  completed?: boolean;
  urgent?: boolean;
}) {
  if (completed) {
    return (
      <div className="flex items-start gap-4 opacity-60">
        <div className="w-5 h-5 rounded bg-primary flex items-center justify-center mt-0.5 flex-shrink-0">
          <MaterialIcon icon="check" className="text-sm text-on-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-on-surface line-through">
            {text}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">已完成</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4">
      <div className="w-5 h-5 rounded border-2 border-outline mt-0.5 flex-shrink-0 cursor-pointer hover:border-primary transition-colors" />
      <div className="flex-1">
        <p className="text-sm font-medium text-on-surface">{text}</p>
        {urgent && time && (
          <p className="text-xs text-error mt-1 flex items-center gap-1">
            <MaterialIcon icon="schedule" className="text-sm" />
            {time} 截止
          </p>
        )}
        {time && !urgent && (
          <p className="text-xs text-on-surface-variant mt-1">{time}</p>
        )}
      </div>
    </div>
  );
}

// Today Todos Card (Sticky)
function TodayTodosCard() {
  return (
    <div className="bg-surface-container-low rounded-2xl p-8 sticky top-24 border border-outline-variant/10">
      <section>
        <div className="flex items-center gap-2 mb-8">
          <MaterialIcon icon="calendar_today" className="text-primary" />
          <h4 className="text-sm font-[family-name:var(--font-manrope)] font-bold uppercase tracking-widest text-on-surface">
            今日待办
          </h4>
        </div>
        <div className="space-y-6">
          <TodoItem
            text="确认项目 A 的设计终稿"
            time="14:00"
            urgent
          />
          <TodoItem
            text="准备周会汇报材料"
            completed
          />
          <TodoItem
            text="回复关于 AI 插件的邮件"
            time="16:30"
          />
          <TodoItem
            text="晚上去健身房"
            time="19:00"
          />
        </div>
        <button className="w-full mt-10 py-3 rounded-lg border-2 border-dashed border-outline-variant hover:border-primary hover:bg-primary-container/30 transition-all text-xs font-bold text-on-surface-variant hover:text-primary">
          + 添加新任务
        </button>
      </section>

      {/* AI Insights */}
      <div className="mt-12 pt-8 border-t border-outline-variant/20">
        <div className="bg-primary/5 p-4 rounded-xl">
          <h6 className="text-[10px] font-bold text-primary uppercase tracking-tighter mb-2">
            AI 智能洞察
          </h6>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            基于你最近的笔记，你可能需要关注「多模态交互」相关的资料，我已经为你整理了 3
            篇相关文章在书签中。
          </p>
        </div>
      </div>
    </div>
  );
}

// Main Home Page Component
export default function HomePage() {
  const [textareaValue, setTextareaValue] = useState("");

  return (
    <>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Shell */}
      <main className="ml-64 min-h-screen">
        {/* Top App Bar */}
        <TopAppBar />

        {/* Content Area */}
        <div className="max-w-5xl mx-auto px-8 py-12">
          {/* Welcome Message */}
          <div className="mb-12">
            <h3 className="text-3xl font-[family-name:var(--font-manrope)] font-extrabold tracking-tight text-on-surface mb-2">
              下午好，Alex。今天想记录点什么？
            </h3>
            <QuickActionChips />
          </div>

          {/* AI Capture Composer */}
          <AICaptureComposer />

          {/* Content Overview: Asymmetric Editorial Layout */}
          <div className="grid grid-cols-12 gap-12">
            {/* Left Column: Recent Activity */}
            <div className="col-span-12 lg:col-span-7 space-y-12">
              {/* Recently Recorded */}
              <section>
                <div className="flex justify-between items-end mb-6">
                  <h4 className="text-sm font-[family-name:var(--font-manrope)] font-bold uppercase tracking-widest text-primary">
                    最近记录
                  </h4>
                  <a
                    className="text-xs text-on-surface-variant hover:text-primary transition-colors"
                    href="#"
                  >
                    查看全部
                  </a>
                </div>
                <div className="space-y-4">
                  <RecentRecordItem
                    color="blue"
                    title="更新了关于「Quiet Architect」的设计规范"
                    meta="20分钟前"
                    type="笔记"
                  />
                  <RecentRecordItem
                    color="amber"
                    title="明天三点的邮件发送提醒"
                    meta="1小时前"
                    type="待办"
                  />
                  <RecentRecordItem
                    color="emerald"
                    title="收藏文章：2024 AI 交互趋势分析"
                    meta="3小时前"
                    type="书签"
                  />
                </div>
              </section>

              {/* Recent Notes */}
              <section>
                <div className="flex justify-between items-end mb-6">
                  <h4 className="text-sm font-[family-name:var(--font-manrope)] font-bold uppercase tracking-widest text-primary">
                    最近笔记
                  </h4>
                  <a
                    className="text-xs text-on-surface-variant hover:text-primary transition-colors"
                    href="#"
                  >
                    浏览笔记库
                  </a>
                </div>
                <div className="space-y-2">
                  <RecentNoteCard
                    title="项目 A 的核心价值主张梳理"
                    excerpt="我们需要重新定义用户在处理碎片化信息时的焦虑感，通过 AI 自动化归档来降低认知负担..."
                    tag="产品设计"
                    date="4天前更新"
                  />
                  <RecentNoteCard
                    title="每周阅读清单：八月第四周"
                    excerpt="关于大型语言模型在边缘计算设备上的优化策略，以及多模态交互的最新研究进展摘要..."
                    tag="阅读记录"
                    date="1周前更新"
                  />
                </div>
              </section>
            </div>

            {/* Right Column: Focus Items */}
            <div className="col-span-12 lg:col-span-5">
              <TodayTodosCard />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
