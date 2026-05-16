<div align="center">

# Gotly Keeper

**安静地保管重要之事**

AI 驱动的个人知识收纳工作台 —— 随手收集想法、收藏链接、管理待办，
用自然语言就能找回一切。

<p>
  <a href="#功能特性">功能特性</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#架构">架构</a> ·
  <a href="#部署">部署</a> ·
  <a href="#技术栈">技术栈</a> ·
  <a href="#参与开发">参与开发</a>
</p>

<p>
  <a href="./README.md">English</a> ·
  <a href="./README.zh.md">中文</a>
</p>

</div>

---

## 这是什么？

Gotly Keeper 是一个**个人知识管家** —— 一个轻量级的工作台，
让你随手记录想法、收藏链接、管理待办，以后只需问一句就能找回一切。
它填补了"我先记着"和"放哪儿了"之间的鸿沟。

它不强求你预先建立文件夹和分类体系。一句话、一个链接、一条提醒，
扔进来就好——AI 会自动分类、整理并让它可搜索。结构在后台完成，
不在你的屏幕上。

### 核心理念

| 原则 | 含义 |
|------|------|
| **先收纳，后整理** | 一个输入框处理一切 —— 笔记、链接、待办，AI 自动识别类型 |
| **用提问代替翻找** | 用自然语言搜索 —— 语义理解，不是关键词匹配 |
| **后台结构化** | 时间解析、内容摘要、URL 元信息 —— 全部异步完成 |
| **安静可靠** | PWA、离线可用、Docker 部署、没有烦人通知 |

---

## 功能特性

### 🎯 统一输入

一个输入框搞定一切：

- **笔记** —— `"记一下：product review 的几点反馈"`
- **待办** —— `"记个待办：下周三交周报"`
- **书签** —— `"把这个链接存一下 https://example.com"`

AI 自动识别意图、提取时间信息、创建正确的资产类型 ——
无需下拉菜单、无需表单、零摩擦。

### 🔍 语义检索

不用再猜放到哪个文件夹了。用自然语言搜索所有资产：

> *"我上次收藏的那篇关于 RAG 的文章在哪？"*
> *"show me todos from last week"*

基于 pgvector 嵌入向量和多阶段排序管线的语义搜索。

### 📋 智能摘要

让 AI 总结你收藏的内容：

- *"Summarize my notes from this week"*
- *"Review unfinished todos"*
- *"What bookmarks do I have about AI tools?"*

### ⏰ 智能待办

自然地写待办 —— *"明天下午3点发邮件"* —— AI 自动提取到期时间。
逾期、今日、即将到期视图让你不用日历也能把握进度。

### 🔖 书签元信息自动获取

保存一个链接，后台工作器自动抓取页面标题、描述和预览图 ——
无需手动填写。

### 📎 资产生命周期

每个资产（笔记、书签、待办）都有清晰的生命周期：
**活跃 → 归档 → 回收站 → 彻底删除**

不删除也能移出视线，或者彻底清理。

### 📱 PWA 支持

可在手机或桌面安装为独立应用。支持离线使用（Service Worker 缓存）。
全屏沉浸体验。

---

## 快速开始

### 环境要求

- **Node.js** 22.x
- **pnpm** 10+
- **Docker**（用于本地 PostgreSQL + Redis）

### 1. 启动本地基础设施

```bash
docker compose up -d
```

这会启动：

| 服务 | 版本 | 端口 |
|------|------|------|
| PostgreSQL（含 pgvector） | 16 | 5434 |
| Redis | 7 | 6382 |

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件。至少需要配置以下变量：

| 变量 | 说明 |
|------|------|
| `BETTER_AUTH_SECRET` | 至少 32 位随机字符 |
| `AI_GATEWAY_API_KEY` | AI 网关 / LLM API 密钥 |
| `AI_GATEWAY_URL` | AI 网关地址 |
| `AI_MODEL_NAME` | LLM 模型（如 `qwen3-max`） |
| `AI_EMBEDDING_MODEL_NAME` | 嵌入向量模型 |
| `AI_EMBEDDING_DIMENSIONS` | 嵌入向量维度 |

请参阅 `.env.example` 获取完整列表。

### 3. 安装与初始化

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

### 4. 启动开发服务器

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

---

## 架构

```
┌─────────────────────────────────────────────────────┐
│                       用户                            │
└──────────┬──────────────────────────┬───────────────┘
           │                          │
     ┌─────▼──────────┐    ┌──────────▼──────────┐
     │  Next.js 应用    │    │  后台工作器           │
     │  (Web Server)   │    │ (URL 元信息抓取)      │
     │  端口 3000       │    │                     │
     └─────┬──────────┘    └──────────┬──────────┘
           │                          │
     ┌─────▼──────────────────────────▼──────────┐
     │         PostgreSQL 16 (pgvector)            │
     │   笔记 · 书签 · 待办 · 嵌入向量             │
     └──────────────────┬─────────────────────────┘
                        │
     ┌──────────────────▼─────────────────────────┐
     │                  Redis 7                    │
     │         缓存 · 队列 · 会话存储              │
     └─────────────────────────────────────────────┘
```

### 技术栈详情

| 层 | 技术 |
|----|------|
| **框架** | Next.js 16（App Router） |
| **语言** | TypeScript 5 |
| **数据库** | PostgreSQL 16 + pgvector |
| **ORM** | Drizzle ORM |
| **缓存与队列** | Redis 7 + ioredis |
| **AI SDK** | Vercel AI SDK（`@ai-sdk/openai-compatible`） |
| **认证** | Better Auth（邮箱密码 + GitHub OAuth） |
| **UI** | Tailwind CSS v4 + shadcn/ui + Base UI |
| **动画** | Motion（framer-motion） |
| **表单** | TanStack Form |
| **图标** | Lucide |
| **测试** | Vitest + Testing Library |
| **PWA** | Next.js PWA manifest + service worker |

### 核心模块

- **`server/modules/workspace-agent/`** — AI 编排：意图分类、计划生成、
  工具执行、结构化结果返回
- **`server/services/search/`** — 多阶段搜索：语义（pgvector 余弦距离）、
  关键词（三字组）、排序融合
- **`server/services/queue/`** — 基于 Redis 的后台任务队列
- **`server/prompts/`** — 所有 AI 流水线阶段的系统提示词和用户提示词
- **`server/services/bookmarks|notes|todos/`** — 三类资产的 CRUD 与生命周期管理
- **`components/workspace/`** — 工作区 UI：统一输入、运行时间线、资产面板
- **`scripts/run-workers.ts`** — 后台工作器入口（esbuild 打包）

---

## 部署

### 生产部署（deploy.sh）

项目包含部署脚本 `deploy.sh`，实现：

1. **构建**两个 Docker 镜像（`gotly-keeper-web`、`gotly-keeper-worker`），
   多阶段构建，目标 `linux/amd64`
2. **推送**到私有镜像仓库
3. **同步**配置到远程服务器（SSH + SCP）
4. **执行**数据库迁移（Drizzle Kit）
5. **拉取 & 重启**远程服务器上的容器

```bash
# 完整部署（构建 + 迁移 + 启动）
./deploy.sh
```

脚本提供 4 种模式：

| 选项 | 操作 |
|------|------|
| `1` | 构建 + 迁移 + 启动（完整部署） |
| `2` | 构建 + 启动（跳过迁移） |
| `3` | 仅启动（跳过构建与迁移） |
| `4` | 仅迁移 |

### Docker Compose

- **`docker-compose.yml`** — 本地开发（PostgreSQL + Redis）
- **`docker-compose.prod.yml`** — 生产环境（PostgreSQL + Web + Worker，
  使用外部 1panel 网络）

### 环境变量

生产环境需要 `.env.production` 文件 —— 请参考 `.env.example`。

---

## 脚本参考

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm start` | 启动生产服务器 |
| `pnpm lint` | 运行 ESLint |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm db:generate` | 生成 Drizzle 迁移文件 |
| `pnpm db:migrate` | 执行数据库迁移 |
| `pnpm db:studio` | 打开 Drizzle Studio（浏览器数据库管理器） |
| `pnpm db:check` | 检查数据库与迁移文件一致性 |
| `pnpm worker:start` | 构建并启动 URL 元信息后台工作器 |
| `pnpm test` | 运行所有测试 |
| `pnpm test:unit` | 运行单元测试 |
| `pnpm test:integration` | 运行集成测试 |
| `pnpm verify` | 类型检查 + 单元测试 |

---

## 项目结构

```
├── app/                      # Next.js App Router 路由
│   ├── api/                  # API 路由（认证、工作区）
│   ├── auth/                 # 认证页面（登录、注册、重置密码）
│   └── workspace/            # 工作区页面（笔记、待办、书签、全部）
│
├── server/                   # 服务端逻辑
│   ├── lib/                  # 基础设施（数据库、缓存、AI、配置）
│   ├── modules/              # 服务端入口（认证、工作区、工作区 AI 代理）
│   ├── services/             # 领域服务（笔记、待办、书签、搜索）
│   ├── prompts/              # AI 系统/用户提示词
│   └── workers/              # 后台工作器
│
├── components/               # 可复用 UI 组件
│   ├── ui/                   # 基础 UI 原语（shadcn/ui）
│   ├── workspace/            # 工作区专属组件
│   └── auth/                 # 认证表单组件
│
├── shared/                   # 跨运行时类型、Schema、工具函数
├── hooks/                    # 客户端 React Hooks
├── config/                   # UI 和应用配置
├── tests/                    # 单元与集成测试
├── drizzle/                  # 数据库迁移文件
└── scripts/                  # 构建与维护脚本
```

---

## 参与开发

1. 阅读 `.ai-rules/` 了解代码仓库治理和编码规范
2. 提交前运行 `pnpm verify`（类型检查 + 单元测试）
3. 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)
   规范（由 commitlint + husky 强制执行）
4. 预提交钩子会运行代码检查和管理检查

---

## 许可

本项目开源。详见 LICENSE 文件。

---

<p align="center">
  <em>安静地保管重要之事。</em>
</p>
