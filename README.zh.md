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
  <img src="https://img.shields.io/badge/version-0.1.4-0051b1?style=flat" alt="Version">
  <a href="https://github.com/zguiyang/gotly-keeper/stargazers">
    <img src="https://img.shields.io/github/stars/zguiyang/gotly-keeper?style=flat&label=Stars&color=yellow" alt="Stars">
  </a>
  <a href="https://github.com/zguiyang/gotly-keeper/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/zguiyang/gotly-keeper?style=flat&label=License&color=green" alt="License">
  </a>
  <img src="https://img.shields.io/badge/PRs-welcome-0051b1?style=flat" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/Made%20with-TypeScript-3178c6?style=flat&logo=typescript" alt="TypeScript">
</p>

</div>

---

<details open>
<summary><b>📑 目录</b></summary>

- [演示](#演示)
- [我为什么做这个](#-我为什么做这个)
- [怎么用](#怎么用)
- [为什么不用 Notion / Obsidian？](#-为什么不用-notion--obsidian)
- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [架构](#架构)
- [部署](#部署)
- [来聊聊](#-来聊聊)
- [参与开发](#参与开发)

</details>

---

## 演示

<img src="https://raw.githubusercontent.com/zguiyang/gotly-keeper/main/public/demo.webp" alt="Gotly Keeper 示例视频" width="100%" style="max-width:100%;border-radius:10px;border:1px solid rgba(0,0,0,0.1)">

[▶ 查看完整演示视频](https://cloud.zgyk.cc/f/Y3cO/demo.mp4)

---

## 💡 我为什么做这个

我是一个开发者，平时囤很多东西——Twitter 上的链接、半夜冒出来的想法、用户反馈、
随手记的待办。时间一长就变成了：

- 📌 **收藏了，找不到。** 书签在 Chrome，笔记在 Apple Notes，待办在 TickTick。
  各管各的，互相不认识。
- 📝 **记了，再也不看。** 碎片越堆越多，整理本身比记录还累。
- ⏳ **整理了，太费时间。** 打标签、建文件夹、分类——光整理就劝退了。

我想要**一个地方**。随便写什么，AI 自动判断类型。想找的时候，用自然语言问一句。
不用文件夹，不用标签，零摩擦。于是我自己做了一个。

**Gotly Keeper 是我自己想要的那个工具。**

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

## 🆚 为什么不用 Notion / Obsidian？

这些我都用过。Notion 写文档很强，Obsidian 做双向链接很牛。
但它们都不是为**碎片记录**设计的——那些不值得开一个文档、但不记又会忘的瞬间。

| 我的日常碎片场景 | Notion | Obsidian | Apple Notes | Gotly Keeper |
|---|---|---|---|---|
| 2 秒存一个链接 | 太重了 | 不行 | ✅ | ✅ |
| 「周五下午 3 点提醒我打电话」 | 手动设置 | 不行 | 不行 | ✅ |
| 「上个月那篇 RAG 文章在哪？」 | 翻文件夹 | 搜文件名 | 滚动翻 | ✅ 自然语言问 |
| 半夜冒出来的一个念头 | 打开太慢 | 打开太慢 | ✅ | ✅ |
| 一个输入框搞定一切 | 3 种 block | 1 个文件 | 1 条笔记 | ✅ AI 自动分类 |
| 跑在我自己的服务器上 | ❌ | ✅ | ❌ | ✅ |
| 开源 | ❌ | ❌ | ❌ | ✅ |

> **Gotly Keeper 不替代你的笔记软件。它接住那些没来得及进笔记的东西。**

---

## ⚠️ 还在快速迭代中

Gotly Keeper 还很早期——我在快速出货、持续迭代。
AI 目前还不够聪明，很多想法还在排队，没来得及落地。

哪里做得糙，大概率是我还没来得及改。正在努力。

欢迎提意见，也欢迎吐槽。不喜欢的话直接跳过就好，没关系的。

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

### Docker 部署

项目提供多阶段 `Dockerfile`，构建两个运行时镜像：

| 阶段 | 用途 |
|------|------|
| `web-runner` | Next.js 生产服务器（端口 3000） |
| `worker-runner` | 后台工作器（URL 元信息抓取） |

#### 1. 准备环境变量

创建 `.env` 文件，参考 `.env.example` 填写生产环境配置。

构建时通过 Docker secret 注入环境变量，不会写入镜像：

```bash
docker build --secret id=app_env,src=.env -t gotly-keeper:latest .
```

#### 2. 基础设施

需要 PostgreSQL 16（含 pgvector）和 Redis 7。使用 `docker-compose.yml` 启动基础服务：

```bash
docker compose up -d postgres redis
```

#### 3. 构建与运行

生产环境 `docker-compose.prod.yml` 示例：

```yaml
services:
  web:
    image: gotly-keeper:latest
    target: web-runner
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    image: gotly-keeper:latest
    target: worker-runner
    environment:
      NODE_ENV: production
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

#### 4. 数据库迁移

```bash
# 对生产数据库执行迁移
pnpm db:migrate
```

或在 worker 容器中执行一次性迁移命令。

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

## 💬 来聊聊

我一个人在公开构建这个项目。反馈、bug 报告、功能想法都非常欢迎——每条我都会看。

- 🐛 **[Issues](https://github.com/zguiyang/gotly-keeper/issues)** — bug、想法、功能请求
- ⭐ **Star 一下** 如果对你有用——真的很有帮助
- 📧 **邮箱** — `hi [at] zgyk.cc`

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
  <b>说一句，收好。再问一句，找出来。</b><br>
  <sub>开源 · 自托管 · 数据归你说了算。</sub><br><br>
  <a href="https://github.com/zguiyang/gotly-keeper">⭐ 在 GitHub 上 Star</a>
</p>
