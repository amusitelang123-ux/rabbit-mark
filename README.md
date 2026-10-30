# 小兔鲜电商平台（XiaoTuXian Mall）

平台自营式 B2C 电商系统。业务链路：**商品 → 购物车 → 订单 → 支付 → 发货 → 售后**。

- 开发企划书：`docs/小兔鲜电商-开发企划.md`
- AI 客服设计说明：`docs/AI智能客服-实现说明.md`
- 当前进度：用户端页面 + 用户端完整 API + 后台管理端（独立应用）+ MySQL 库表 + AI 智能客服（DeepSeek，可离线降级）

## 技术栈

| 层 | 技术 |
| --- | --- |
| 用户端 | Vue 3 + TypeScript + Vite 5 + Pinia + Vue Router 4 |
| 后端 | Node.js 20+ + Express 4 + TypeScript + Sequelize 6 |
| 数据库 | MySQL 8.0（InnoDB / utf8mb4） |
| 鉴权 | JWT（access + refresh 双 Token） |
| AI | DeepSeek（OpenAI 兼容协议；`mock` 适配器可离线演示） |

## 目录结构

```
rabbit-mark/
├── docs/                        开发企划书
├── web/                         前端（同一份依赖，两个独立应用）
│   ├── index.html               用户端入口（端口 5173）
│   ├── vite.config.ts           用户端应用配置，/api、/uploads 反向代理到后端
│   ├── admin/                   后台管理端应用（独立入口，端口 5174）
│   │   ├── index.html           后台入口
│   │   ├── main.ts / App.vue    后台应用装配（Element Plus 仅在此引入）
│   │   ├── router.ts            后台路由 + 登录/权限守卫 + 侧边栏菜单
│   │   ├── AdminLayout.vue      后台骨架布局
│   │   ├── views/               后台页面（商品/订单/营销/财务/权限…）
│   │   ├── api/                 管理端接口层（前缀 /api/admin，独立 token）
│   │   ├── stores/admin.ts      Token 与权限码
│   │   └── utils/               图标白名单等
│   ├── vite.admin.config.ts     后台应用配置（端口 5174、产物 dist-admin）
│   └── src/                     用户端代码 + 两端共用层
│       ├── api/                 用户端接口层（contract + mock/real 双实现）
│       ├── stores/              Pinia（user / cart / ui / app）
│       ├── views/client/        用户端页面
│       └── router/index.ts      用户端路由（不含后台）
├── server/                      后端服务（Node + Express + Sequelize）
│   ├── src/                     models / services / controllers / routes / middlewares
│   ├── database/
│   │   ├── sql/xtx_mall.schema.sql   完整建表 SQL（数据库设计，35 张表）
│   │   ├── migrations/              执行 schema.sql 的迁移
│   │   └── seeders/                 演示数据（分类/品牌/商品/用户/订单/评价…）
│   ├── uploads/demo/            种子数据生成的占位图
│   └── .env.example             环境变量模板
└── .run/                        IntelliJ IDEA 一键运行配置
```

## 环境要求

- Node.js **20+**（推荐 20/22 LTS）
- MySQL **8.0**，已启动
- npm 10+

## 快速开始

### 1. 初始化数据库（首次运行）

```bash
cd server
npm install

# 复制环境变量模板并按需修改数据库账号密码
# Windows: copy .env.example .env
# macOS/Linux: cp .env.example .env

npm run db:create     # 创建数据库 xtx_mall
npm run db:migrate    # 建表
npm run db:seed       # 写入演示数据
```

> 之后想重置数据，一条命令搞定：`npm run db:reset`
> （= drop → create → migrate → seed）

### 2. 启动后端（终端 1）

```bash
cd server
npm run dev
```

- 地址：http://localhost:3000
- 健康检查：http://localhost:3000/api/health

生产模式：`npm run build` 然后 `npm start`

### 3. 启动前端（终端 2）

```bash
cd web
npm install
npm run dev          # 用户端 → http://localhost:5173
```

后台管理端是**独立应用**（独立入口、独立端口、独立构建产物），另开一个终端：

```bash
cd web
npm run dev:admin    # 后台管理端 → http://localhost:5174/admin/login
```

> 两个应用共用一份 `web/node_modules`，但入口、路由、构建配置互不影响：
> 用户端在 5173（`vite.config.ts`），后台在 5174（`vite.admin.config.ts`）。
> Element Plus / echarts 只在后台应用引入，用户端产物里没有它们。
>
> 两个应用都已配置代理：`/api`、`/uploads` → `http://localhost:3000`，无需额外配置。
> 若后端端口不是 3000，请同步修改 `web/vite.config.ts` 与 `web/vite.admin.config.ts` 的 proxy target。

## 在 IntelliJ IDEA 中运行（推荐）

项目根目录 `.run/` 已内置运行配置，IDEA 会自动识别：

| 配置名 | 说明 |
| --- | --- |
| **Dev (server + web)** | 一键同时启动后端 + 用户端 |
| **Admin (server + admin)** | 一键同时启动后端 + 后台管理端 |
| `server: dev` | 只启动后端（热重载） |
| `web: dev` | 只启动用户端 |
| `admin: dev` | 只启动后台管理端 |
| `db:reset` | 重置数据库（drop→create→migrate→seed） |

使用步骤：

1. 用 IDEA 打开项目根目录 `rabbit-mark`，等待扫描完成
2. 首次先运行一次 `db:reset` 初始化数据库
3. 右上角运行下拉框选择 `Dev (server + web)`，点绿色三角
4. 浏览器访问 http://localhost:5173

其他入口：

- 右键 `server/package.json`（或 `web/package.json`）→ **Show npm Scripts**，双击任意脚本
- 新增配置：`Run → Edit Configurations → + → npm`，Package.json 选对应目录、Command 选 `run`、Script 选 `dev`
- 若配置未出现：重启 IDEA 或 `File → Reload All from Disk`
- 需要 **Node.js 插件**（Ultimate 自带；Community 在 Settings → Plugins 安装）

## 演示账号

| 用途 | 账号 | 密码 |
| --- | --- | --- |
| 用户端 | `user1` ~ `user20` | `123456` |
| 后台 API | `admin` | `admin123` |

> 订单操作演示：`user2`（待发货 → 提醒发货）、`user3`（待收货 → 查看物流）、`user4`（已完成 → 评价晒单，种子数据保留了一个待评价订单）、`user1`（已取消 → 再次购买 / 删除订单）。

## 纯前端调试（无需后端 / MySQL）

把 `web/.env.development` 改为：

```env
VITE_USE_MOCK=true
```

前端将使用内置演示数据，可脱离数据库独立调试。

## 环境变量

`server/.env`（从 `.env.example` 复制，**不要提交到 Git**）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 后端端口 |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | MySQL 地址 |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `xtx_mall` / `root` / 空 | 数据库连接 |
| `JWT_SECRET` | `change_me` | JWT 密钥（生产务必修改） |
| `JWT_ACCESS_EXPIRES` | `2h` | access token 有效期 |
| `JWT_REFRESH_EXPIRES` | `7d` | refresh token 有效期 |
| `UPLOAD_DIR` | `./uploads` | 本地图片目录 |
| `PAY_ADAPTER` | `sandbox` | 支付适配器（沙箱） |
| `CORS_ORIGIN` | `http://localhost:5173` | 允许的前端来源 |
| `DEEPSEEK_API_KEY` | 空 | DeepSeek 密钥；**留空自动降级为演示模式** |
| `DEEPSEEK_MODEL` | `deepseek-chat` | 对话模型（可换 `deepseek-reasoner`） |
| `AI_ADAPTER` | `deepseek` | `deepseek` / `mock` |
| `AI_DAILY_BUDGET_CNY` | `20` | 每日成本上限，超出后停止调用并引导转人工 |

## 常用脚本

### server

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发启动（tsx 热重载） |
| `npm run build` / `npm start` | 编译 / 生产启动 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run db:create` / `db:drop` | 创建 / 删除数据库 |
| `npm run db:migrate` / `db:migrate:undo` | 执行 / 回滚迁移 |
| `npm run db:seed` / `db:seed:undo` | 写入 / 清空种子数据 |
| `npm run db:reset` | 重置数据库（常用） |

### web

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 用户端开发启动（5173） |
| `npm run dev:admin` | 后台管理端开发启动（5174） |
| `npm run build` | 类型检查 + 用户端生产构建（`dist/`） |
| `npm run build:admin` | 类型检查 + 后台生产构建（`dist-admin/`） |
| `npm run preview` / `preview:admin` | 预览各自构建产物 |
| `npm run typecheck` | TypeScript 类型检查（含用户端 + 后台） |

## API 概览

统一前缀：用户端 `/api/client/v1`，管理端 `/api/admin`；公共响应结构：

```json
{ "code": 0, "message": "success", "data": {}, "timestamp": 1790000000000 }
```

`code = 0` 为成功，非 0 为业务错误（错误码分段见企划 5.2）。

主要接口：

| 模块 | 方法与路径 |
| --- | --- |
| 认证 | `POST /api/client/v1/auth/register` `/login` `/sms-code` `/refresh` |
| 首页 | `GET /api/client/v1/home` |
| 分类 / 品牌 | `GET /api/client/v1/categories` `/brands` |
| 商品 | `GET /api/client/v1/products`、`/products/:id`、`/products/:id/comments`、`/products/:id/recommend` |
| 购物车 | `GET/POST /api/client/v1/cart`、`PUT /cart/:id`、`PUT /cart/select-all`、`DELETE /cart` |
| 用户 | `GET/PUT /api/client/v1/user/profile`、`/user/addresses`、`/user/favorites`、`/user/footprints`、`/user/coupons` |
| 钱包 / 余额充值 | `GET /api/client/v1/user/wallet`、`POST /user/wallet/recharges`、`GET /user/wallet/recharges/:payNo`、`POST /payments/recharge/callback/:channel` |
| 订单 | `POST/GET /api/client/v1/orders`、`GET /orders/:orderNo`、`PUT /orders/:orderNo/cancel` `/confirm`、`GET /orders/:orderNo/logistics`、`POST /orders/:orderNo/rebuy` `/remind-ship`、`DELETE /orders/:orderNo` |
| 评价 | `GET /api/client/v1/user/comments`、`POST /comments`、`POST /comments/images`（晒单图上传） |
| 优惠券 | `GET /api/client/v1/coupons/center`、`POST /coupons/:id/receive` |
| 公告 | `GET /api/client/v1/notices`、`/notices/:id` |
| AI 客服 | `GET /ai/config`、`POST /ai/chat`（SSE 流式）、`GET /ai/conversations`、`GET /ai/conversations/:id/messages`、`POST /ai/conversations/:id/transfer` |

> 订单删除遵循企划 4.1「订单类不删除只置状态」：`DELETE /orders/:orderNo` 仅置 `orders.user_deleted=1` 做用户侧隐藏，订单、支付与财务记录全部保留，后台订单管理仍可查询。
>
> 用户「提醒发货」会累加 `orders.remind_ship_count` 并记录 `last_remind_ship_at`；后台订单列表顶部展示催发货告警，支持 `onlyReminded=1` 筛选，订单详情展示催发货次数与最近提醒时间。
>
> 余额支付（U-30）：用户端「个人中心 → 我的钱包」可充值，收银台余额不足时会引导充值；充值单独立于订单支付单，回调成功后入账并写入余额流水（充值 / 余额支付 / 售后退款 / 后台调账）。

数据库设计详见 `server/database/sql/xtx_mall.schema.sql`。

## AI 智能客服（DeepSeek）

用户端有两个入口：

- **订单详情 → 联系客服 → AI 客服**：自动带上当前订单，可直接问物流/发货
- **帮助中心 → AI 客服**：可选择要咨询的订单，也可以选择「不选择订单」咨询退换货、发票等通用问题

回答基于两层数据：

- **知识库**：`faqs`、`notices`、`logistics_companies`、`freight_templates`，以及 `server/src/services/aiPolicies.ts` 中的平台规则（发货、退换货、退款、运费、发票、积分、账户安全）
- **订单数据**：通过 function calling 调用 `get_order_detail` / `get_order_logistics`，**只能查询当前登录用户自己的订单**

### 配置 Key（位置已预留）

打开 `server/.env`，填这一行即可：

```env
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

- 留空也能跑：自动降级为 `mock` 适配器，页面显示「演示模式」，功能链路完整但回答是内置话术
- 改完重启后端（`npm run dev`）生效
- 密钥只从环境变量读取，不落库、不进日志；`.env` 已在 `.gitignore` 中

### 能力与边界

- SSE 流式输出，支持「停止生成」；「转人工」会把最近对话摘要写成 `feedbacks` 工单，进入现有客服处理流
- 会话按订单隔离：选择订单进入该订单的会话，不选订单则进入通用会话，互不串台
- 回答写入 `ai_messages`，知识引用 `[1]`/`[2]` 可追溯；调用 token、耗时、成本写入 `ai_call_logs`
- **AI 不参与金额计算、库存扣减与订单状态流转**；退款/赔付类只复述规则，结果以人工审核为准
- 单用户 12 次/分钟限流；`AI_DAILY_BUDGET_CNY` 超限后自动停止调用并提示转人工

### 后台

「AI 客服」菜单（`/admin/ai`，权限码 `ai:view` / `ai:manage`）可查看会话与消息、今日/近 7 天用量与成本，并**重建知识库**——改了 FAQ、公告、物流或运费模板后点一次即可生效。

### 相关表与代码

- 表：`ai_conversations` / `ai_messages` / `ai_kb_chunks` / `ai_call_logs`（迁移 `20261030000026-ai-customer-service.js`）
- 适配器：`server/src/adapters/ai/`（`deepseek` + `mock`，与支付适配器同一套分层）
- 编排：`server/src/services/aiChatService.ts`、`aiKnowledgeService.ts`、`aiPrompt.ts`

> 首次升级到本版本需要执行 `npm run db:migrate` 建 AI 表，并执行一次 `npm run db:seed` 写入「AI 客服」菜单权限。

## 常见问题

| 现象 | 排查 |
| --- | --- |
| `[db] 数据库连接失败` | 确认 MySQL 已启动，`server/.env` 的账号/密码/库名正确 |
| `Unknown database 'xtx_mall'` | 先执行 `npm run db:create && npm run db:migrate` |
| 首页/商品无数据 | 执行 `npm run db:seed` 写入演示数据 |
| 图片 404 | 确认后端已启动（图片经 `http://localhost:3000/uploads/...` 提供） |
| 端口被占用 | 修改 `server/.env` 的 `PORT`，并同步 `web/vite.config.ts` 代理 |
| 前端 401 | Token 失效，重新登录；或清空浏览器 localStorage 后重试 |
| 5173 打开 `/admin/login` 跳回首页 | 正常：后台管理端在 5174（`npm run dev:admin`），5173 只有用户端路由 |
| 后台提示未登录 / 刚登录就掉线 | 后台 Token 存在 `http://localhost:5174` 这个源的 localStorage 下，换端口或换域名需要重新登录 |
| 5174 启动报端口占用 | 关闭已在运行的 `dev:admin`，或改 `vite.admin.config.ts` 的 `server.port` |
| AI 客服显示「演示模式」 | 正常：`server/.env` 的 `DEEPSEEK_API_KEY` 为空，填入后重启后端 |
| AI 回答「额度已用完」 | 今日成本超过 `AI_DAILY_BUDGET_CNY`，可调大或次日再试 |
| 后台看不到「AI 客服」菜单 | 执行 `npm run db:seed` 写入权限，并重新登录后台 |

## 说明

本项目为教学演示用途，支付/短信/物流均为沙箱或模拟实现，非真实交易平台。
