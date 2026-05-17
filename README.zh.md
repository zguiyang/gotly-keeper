<div align="center">

# Gotly Keeper

**说一句，收好。再问一句，找出来。**

AI 驱动的个人知识工作台 —— 笔记、书签、待办，一个入口搞定。
不用文件夹，不用打标签，零摩擦。

<p>
  <a href="#演示">演示</a> ·
  <a href="#功能特性">功能特性</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#架构">架构</a> ·
  <a href="#部署">部署</a> ·
  <a href="#技术栈">技术栈</a>
</p>

<p>
  <a href="./README.md">English</a> ·
  <a href="./README.zh.md">中文</a>
</p>

<p>
  <a href="https://github.com/zguiyang/gotly-keeper/stargazers">
    <img src="https://img.shields.io/github/stars/zguiyang/gotly-keeper?style=flat&label=Stars" alt="Stars">
  </a>
  <a href="https://github.com/zguiyang/gotly-keeper/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/zguiyang/gotly-keeper?style=flat&label=License" alt="License">
  </a>
</p>

</div>

---

## 演示

![Gotly Keeper 演示](https://raw.githubusercontent.com/zguiyang/gotly-keeper/main/public/demo.webp)

---

## 痛点

脑子里装满了要记住的事。灵感总在不恰当的时候冒出来。链接在聊天记录里越堆越多。
待办分散在三个不同的应用。而当你想找某个东西 —— 那篇关于 RAG 的文章、上周会议
的反馈、同事分享的链接 —— 你只能翻文件夹、滚聊天记录、然后问自己：放哪儿了？

**Gotly Keeper 是你随手扔的地方，也是你随手找到的地方。**

---

## 怎么用

一个输入框。随你写什么 —— 笔记、书签、待办 —— AI 自动识别意图、提取时间信息、
归类存储。下次只需用自然语言问一句，语义搜索就能找到你要的。

> *"记一下：Q3 定价方案的反馈"* → **笔记**
>
> *"存一下：https://example.com/ai-paper"* → **书签**
>
> *"提醒我：周五下午3点发报告"* → **带到期时间的待办**
>
> *"我上个月收藏的那篇 RAG 文章在哪？"* → **瞬间找到**

---

## 功能特性

### 统一输入

一个输入框搞定一切：
- 笔记、书签、待办 —— AI 自动识别
- 时间表达自动解析（"下周三下午3点"）
- 无需下拉菜单、无需表单、零摩擦

### 语义搜索

不用再猜放到哪个文件夹了。用自然语言问：

> *"显示上周的待办"*
> *"我收藏过哪些关于 AI 工具的文章？"*
> *"总结一下这个月的笔记"*

基于 pgvector 嵌入向量和多阶段排序管线。

### 智能摘要

让 AI 总结你收藏的内容：
- *"总结本周笔记"*
- *"查看未完成的待办"*
- *"我最近都收藏了哪些关于 AI 的东西？"*

### 自动书签元信息

保存 URL → 后台自动抓取页面标题、描述和预览图。不用手动填写。

### 资产生命周期

每个资产遵循：**活跃 → 归档 → 回收站 → 彻底删除**

不删除也能移出视线，或者永久清理。

### PWA 支持

可在手机或桌面安装为独立应用。支持离线使用。全屏沉浸体验。

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

启动 PostgreSQL 16（pgvector，端口 `5434`）和 Redis 7（端口 `6382`）。

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少需要配置：

| 变量 | 说明 |
|------|------|
| `BETTER_AUTH_SECRET` | 至少 32 位随机字符 |
| `AI_GATEWAY_API_KEY` | LLM API 密钥 |
| `AI_GATEWAY_URL` | AI 网关地址 |
| `AI_MODEL_NAME` | LLM 模型（如 `qwen3-max`） |
| `AI_EMBEDDING_MODEL_NAME` | 嵌入向量模型 |
| `AI_EMBEDDING_DIMENSIONS` | 嵌入向量维度 |

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

### 技术栈

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
| **测试** | Vitest + Testing Library |
| **PWA** | Next.js PWA manifest + service worker |

### 核心模块

- **`server/modules/workspace-agent/`** — AI 编排：意图分类、计划生成、工具执行
- **`server/services/search/`** — 多阶段搜索：语义（pgvector）+ 关键词 + 排序融合
- **`server/services/queue/`** — Redis 后台任务队列
- **`server/prompts/`** — AI 流水线提示词
- **`server/services/bookmarks|notes|todos/`** — 三类资产的 CRUD 与生命周期
- **`components/workspace/`** — 工作区 UI：统一输入、时间线、资产面板
- **`scripts/run-workers.ts`** — 后台工作器入口

---

## 部署

### 生产部署（deploy.sh）

项目包含 `deploy.sh` 部署脚本：

1. 构建两个 Docker 镜像，目标 `linux/amd64`
2. 推送到私有镜像仓库
3. 通过 SSH + SCP 同步配置
4. 执行数据库迁移
5. 拉取并重启远程容器

```bash
./deploy.sh
```

提供 4 种模式：完整部署、构建+启动、仅启动、仅迁移。

**Docker Compose 文件：**
- `docker-compose.yml` — 本地开发（PostgreSQL + Redis）
- `docker-compose.prod.yml` — 生产（PostgreSQL + Web + Worker）

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
| `pnpm db:studio` | 打开 Drizzle Studio |
| `pnpm db:check` | 检查数据库与迁移一致性 |
| `pnpm worker:start` | 构建并启动 URL 元信息工作器 |
| `pnpm test` | 运行所有测试 |
| `pnpm test:unit` | 运行单元测试 |
| `pnpm test:integration` | 运行集成测试 |
| `pnpm verify` | 类型检查 + 单元测试 |

---

## 项目结构

```
├── app/                      # Next.js App Router 路由
│   ├── api/                  # API 路由
│   ├── auth/                 # 认证页面
│   └── workspace/            # 工作区页面
│
├── server/                   # 服务端逻辑
│   ├── lib/                  # 基础设施
│   ├── modules/              # 服务端入口
│   ├── services/             # 领域服务
│   ├── prompts/              # AI 提示词
│   └── workers/              # 后台工作器
│
├── components/               # 可复用 UI 组件
├── shared/                   # 跨运行时类型、Schema
├── hooks/                    # 客户端 React Hooks
├── config/                   # UI 和应用配置
├── tests/                    # 测试代码
├── drizzle/                  # 数据库迁移文件
└── scripts/                  # 构建与维护脚本
```

---

## 参与开发

1. 阅读 `.ai-rules/` 了解治理规范
2. 提交前运行 `pnpm verify`（类型检查 + 单元测试）
3. 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)
4. 预提交钩子运行代码检查

---

## 许可

本项目开源。详见 [LICENSE](./LICENSE)。

---

<p align="center">
  <em>安静地保管你的一切。</em>
</p>
