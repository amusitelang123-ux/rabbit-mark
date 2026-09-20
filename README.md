# 小兔鲜电商平台（XiaoTuXian Mall）

平台自营式 B2C 电商系统。业务链路：**商品 → 购物车 → 订单 → 支付 → 发货 → 售后**。

- 开发企划书：`docs/小兔鲜电商-开发企划.md`
- 当前进度：用户端页面 + 用户端完整 API + MySQL 库表；后台管理页面待开发

## 技术栈

| 层 | 技术 |
| --- | --- |
| 用户端 | Vue 3 + TypeScript + Vite 5 + Pinia + Vue Router 4 |
| 后端 | Node.js 20+ + Express 4 + TypeScript + Sequelize 6 |
| 数据库 | MySQL 8.0（InnoDB / utf8mb4） |
| 鉴权 | JWT（access + refresh 双 Token） |

## 目录结构

```
rabbit-mark/
├── docs/                        开发企划书
├── web/                         用户端前端（Vue3 + TS + Vite）
│   ├── src/api/                 接口层（contract + mock/real 双实现）
│   ├── src/stores/              Pinia（user / cart / ui / app）
│   ├── src/views/client/        用户端页面
│   └── vite.config.ts           /api、/uploads 反向代理到后端
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
npm run dev
```

打开 http://localhost:5173

> 前端已配置代理：`/api`、`/uploads` → `http://localhost:3000`，无需额外配置。
> 若后端端口不是 3000，请同步修改 `web/vite.config.ts` 的 proxy target。

## 在 IntelliJ IDEA 中运行（推荐）

项目根目录 `.run/` 已内置运行配置，IDEA 会自动识别：

| 配置名 | 说明 |
| --- | --- |
| **Dev (server + web)** | 一键同时启动前后端 |
| `server: dev` | 只启动后端（热重载） |
| `web: dev` | 只启动前端 |
| `db: reset` | 重置数据库（drop→create→migrate→seed） |

使用步骤：

1. 用 IDEA 打开项目根目录 `rabbit-mark`，等待扫描完成
2. 首次先运行一次 `db: reset` 初始化数据库
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
| `npm run dev` | 开发启动 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run typecheck` | TypeScript 类型检查 |

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
| 订单 | `POST/GET /api/client/v1/orders`、`GET /orders/:orderNo`、`PUT /orders/:orderNo/cancel` `/confirm` |
| 优惠券 | `GET /api/client/v1/coupons/center`、`POST /coupons/:id/receive` |

数据库设计详见 `server/database/sql/xtx_mall.schema.sql`。

## 常见问题

| 现象 | 排查 |
| --- | --- |
| `[db] 数据库连接失败` | 确认 MySQL 已启动，`server/.env` 的账号/密码/库名正确 |
| `Unknown database 'xtx_mall'` | 先执行 `npm run db:create && npm run db:migrate` |
| 首页/商品无数据 | 执行 `npm run db:seed` 写入演示数据 |
| 图片 404 | 确认后端已启动（图片经 `http://localhost:3000/uploads/...` 提供） |
| 端口被占用 | 修改 `server/.env` 的 `PORT`，并同步 `web/vite.config.ts` 代理 |
| 前端 401 | Token 失效，重新登录；或清空浏览器 localStorage 后重试 |

## 说明

本项目为教学演示用途，支付/短信/物流均为沙箱或模拟实现，非真实交易平台。
