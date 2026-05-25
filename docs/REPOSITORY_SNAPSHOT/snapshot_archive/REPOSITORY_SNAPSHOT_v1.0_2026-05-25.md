---
snapshot_version: v1.0
generated_at: 2026-05-25 12:00 +08:00
language: zh
git_commit: 8326e2b
git_branch: main
project_type: polyglot
previous_version: null
previous_file: null
line_budget: 300
---

## TL;DR

FastCoin 是一个纯本地、加密安全的个人快捷记账桌面应用，使用 Tauri 2 (Rust) + React 18 (TypeScript) 构建。支持三栏响应式布局、自定义记账周期、可视化统计报表、AES-256-GCM 加密导入导出、Excel/CSV 导出。数据存储在本地 SQLite，不依赖任何网络服务。

## 1. 项目概览

- **名称 / 版本**: `fastcoin` v0.1.0 (from `package.json` / `Cargo.toml`)
- **技术栈**: TypeScript (React 18 + Vite 6 + TailwindCSS 3.4) + Rust (Tauri 2 + rusqlite + aes-gcm + chrono + rust_xlsxwriter)
- **仓库布局**:

```
FastCoin/
├── src/              # React 前端 (组件、状态、类型、IPC封装)
├── src-tauri/        # Rust 后端 (数据库、命令、服务、加密)
├── public/           # 静态资源 (favicon.svg)
├── dist/             # 前端构建产物 (Vite 输出)
├── index.html        # HTML 入口
├── package.json      # 前端依赖与脚本
├── vite.config.ts    # Vite 构建配置 (含 Tauri 集成)
├── tailwind.config.ts# TailwindCSS 主题配置
├── tsconfig*.json    # TypeScript 配置 (strict 模式)
├── README.md         # 使用说明与快速开始
└── .gitignore        # 覆盖多语言/多工具忽略规则
```

本项目为 polyglot 类型：前端 TypeScript (~70%) + 后端 Rust (~30%)，通过 Tauri IPC 桥接。

## 2. 入口与配置

- **主入口**: 
  - 前端: `src/main.tsx` → `src/App.tsx` → `src/components/layout/AppShell.tsx`
  - 后端: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs`
  - 启动: `npx tauri dev` (开发) / `npx tauri build` (生产)
- **运行时配置**: 
  - 前端: `vite.config.ts` (端口 1420, 别名 `@/` → `src/`)
  - 后端: `src-tauri/tauri.conf.json` (窗口 1200x800, 插件 fs/dialog)
  - 权限: `src-tauri/capabilities/default.json` (dialog, fs 权限)
- **构建 / 运行命令**:
  - `npm run dev` — 仅启动 Vite 开发服务器
  - `npx tauri dev` — 启动完整 Tauri 开发环境 (Vite + Rust)
  - `npx tauri build` — 生产构建 (.msi 安装包)
  - `npm run build` — 仅前端构建 (tsc + vite build)

## 3. 模块索引

### MOD-FEUI: 前端组件

- **路径**: `src/components/`
- **职责**: React UI 组件，按功能划分为 layout / expense / stats / charts / settings / common
- **关键文件 / 导出**: `AppShell.tsx` (三栏布局+拖拽手柄), `ExpenseForm.tsx` (记账表单+数字键盘), `StatsDashboard.tsx` (统计面板), `SourceDistribution.tsx` (环形图), `SettingsPanel.tsx` (设置面板+Tab路由), `ErrorBoundary.tsx` (错误边界)
- **依赖模块**: MOD-STORE, MOD-TAURI-IPC, MOD-TYPES

### MOD-STORE: 状态管理

- **路径**: `src/stores/`
- **职责**: Zustand 状态切片，管理 UI 状态、消费数据缓存、全局刷新信号
- **关键文件 / 导出**: `uiStore.ts` (面板尺寸/Toast/移动端Tab), `expenseStore.ts` (CRUD + 本地缓存), `dataStore.ts` (refreshKey 全局刷新触发器)
- **依赖模块**: MOD-TAURI-IPC, MOD-TYPES

### MOD-TYPES: 类型定义

- **路径**: `src/types/`
- **职责**: TypeScript 接口定义，与 Rust `#[serde(rename_all = "camelCase")]` 结构体一一对应
- **关键文件 / 导出**: `expense.ts` (Expense, NewExpense), `paymentSource.ts` (PaymentSource, PaymentSourceType), `period.ts` (AccountingPeriod), `export.ts` (ExportPayload, EncryptedFile, ImportDiff, MergeStrategy)

### MOD-TAURI-IPC: IPC 封装

- **路径**: `src/lib/tauri.ts`
- **职责**: 类型安全的 `invoke()` 封装，将 Rust commands 映射为 async TypeScript 函数
- **公开接口**: `getExpenses()`, `addExpense()`, `addPaymentSource()`, `getStats()`, `exportData()`, `importPreview()`, `importConfirm()` 等 ~25 个函数
- **依赖模块**: MOD-TYPES

### MOD-DB: 数据库层

- **路径**: `src-tauri/src/db/`
- **职责**: SQLite 初始化、Schema 迁移、种子数据、Rust 数据模型
- **关键文件 / 导出**: `mod.rs` (init_db, get_db_path), `models.rs` (Expense, PaymentSource, Category, AccountingPeriod, AppSettings, DeletionLog), `seed.rs` (seed_defaults)
- **依赖模块**: MOD-UTIL

### MOD-CMD: Tauri 命令

- **路径**: `src-tauri/src/commands/`
- **职责**: `#[tauri::command]` 函数，接收前端 IPC 调用并委托给服务层
- **关键文件**: `expense_cmd.rs` (get/add/update/delete_expense), `source_cmd.rs` (CRUD+排序), `stats_cmd.rs` (get_stats), `export_cmd.rs` (export_data), `import_cmd.rs` (import_preview/import_confirm)
- **依赖模块**: MOD-SVC, MOD-DB

### MOD-SVC: 业务逻辑

- **路径**: `src-tauri/src/services/`
- **职责**: 纯业务逻辑层，包括统计算法、Excel/CSV 导出、导入差异计算与合并
- **关键文件**: `expense_service.rs` (CRUD + 版本管理), `stats_service.rs` (compute_stats → StatsResponse), `export_service.rs` (fastcoin加密/xlsx多sheet/csv), `import_service.rs` (compute_diff + apply_import)
- **依赖模块**: MOD-DB, MOD-CRYPTO, MOD-UTIL

### MOD-CRYPTO: 加密模块

- **路径**: `src-tauri/src/crypto/`
- **职责**: AES-256-GCM 认证加密 + PBKDF2 密钥派生
- **关键文件**: `key.rs` (derive_key, generate_salt), `encrypt.rs` (encrypt_data → EncryptedFile), `decrypt.rs` (decrypt_data)
- **依赖模块**: MOD-UTIL

### MOD-UTIL: 工具函数

- **路径**: `src-tauri/src/utils/`
- **职责**: 统一错误类型、金额/日期格式化
- **关键文件**: `error.rs` (AppError enum + AppResult<T>), `format.rs` (cents_to_display, now_ms)

## 4. 核心工作流

**记账流程** (前端 → 后端 → 前端):

```
1. 用户在 MOD-FEUI/ExpenseForm 输入金额、选择来源、填写备注
2. ExpenseForm 调用 MOD-STORE/expenseStore.addExpense()
3. expenseStore 通过 MOD-TAURI-IPC 发起 invoke("add_expense", {...})
4. Tauri 路由到 MOD-CMD/expense_cmd::add_expense
5. MOD-CMD 委托 MOD-SVC/expense_service::add_expense 写入 SQLite
6. expense_store 触发 MOD-STORE/dataStore.triggerRefresh()
7. MOD-FEUI/StatsDashboard 检测 refreshKey 变化，重新调用 get_stats
8. MOD-FEUI/ExpenseList 展示最新消费记录
```

**加密导出流程**:

```
1. 用户输入密码 → invoke("export_data", {password, mode, format, filePath})
2. MOD-SVC/export_service 收集全部数据 → serde_json 序列化
3. MOD-CRYPTO: PBKDF2(password, salt, 210K iter) → AES-256-GCM 加密 → .fastcoin 文件
4. 增量模式: 仅导出 version > lastExportedVersion 的记录
```

## 5. 数据模型与存储

- **实体**: `Expense` (id, amount/cents, source_id, category_id, note, date, version), `PaymentSource` (id, name, type, icon, color, sort_order), `Category` (id, name, icon, color, parent_id), `AccountingPeriod` (id, name, start_date, end_date, is_active), `AppSettings` (singleton 行), `DeletionLog` (id, entity_type, entity_id, version)
- **存储**: SQLite (`%LOCALAPPDATA%/FastCoin/fastcoin.db` on Windows)，WAL 模式，复合索引 `(date, source_id)` 和 `(version)` 
- **迁移**: Schema 定义在 `src-tauri/src/db/mod.rs` 的 `CREATE TABLE IF NOT EXISTS` 中，首次启动通过 `seed.rs` 填充默认支付来源(微信/支付宝/现金)、8个消费分类、当月记账周期

## 6. 外部依赖与服务

- **第三方 API**: 无 (纯本地应用)
- **架构级依赖包**: 
  - 前端: `react@18.3`, `zustand@4.5` (状态), `recharts@2.13` (图表), `date-fns@3.6` (日期), `tailwindcss@3.4` (样式), `@tauri-apps/api@2.2` (IPC)
  - 后端: `tauri@2.11`, `rusqlite@0.31` (bundled SQLite), `aes-gcm@0.10`, `pbkdf2@0.12`, `sha2@0.10`, `chrono@0.4`, `rust_xlsxwriter@0.77`, `serde@1`, `serde_json@1`, `uuid@1`, `thiserror@2`
- **密钥 / 凭证入口**: 用户导出密码通过前端输入框传入，经 Tauri IPC 到达 Rust 加密层；PBKDF2 salt 存储在 `app_settings.key_salt` 中 (base64)

## 7. 测试与代码质量

- **测试框架**: 无 (N/A) — 目前未配置自动化测试
- **测试位置**: 无 (N/A)
- **代码检查 / 格式化工具**: Rust 编译器内置 `#[warn(unused)]` 检查；TypeScript `strict: true`；cargo fix 自动修复
- **CI 流水线**: 无 (N/A)

## 8. 扩展点与维护指南

- **已知技术债 / 注意事项**: 
  - 无自动化测试覆盖
  - 手机端仅前端响应式，无原生 Tauri Mobile 构建配置
  - 导入导出依赖 `tauri-plugin-dialog` 原生对话框，需 capabilities 授权
- **如何新增**: 
  - 新前端组件: `src/components/{domain}/` + 在对应 Panel 中引入
  - 新 Rust 命令: `src-tauri/src/commands/` 创建 `#[tauri::command]`，在 `lib.rs` 注册
  - 新数据库表: 在 `db/mod.rs` `CREATE TABLE` + `db/models.rs` 添加 struct
  - 新 Store: `src/stores/` 创建 Zustand slice
- **公开契约（不可破坏）**:
  - Rust struct `#[serde(rename_all = "camelCase")]` 字段名 = TypeScript interface 属性名
  - Tauri command 参数名 camelCase (前端) ↔ snake_case (Rust) 自动转换
  - 金额统一为 `i64` 整数分 (cents)
  - 加密文件格式: `{salt, iv, ciphertext, metadata}` — `formatVersion: 1`
- **性能 / 并发 / 安全热点**:
  - `src-tauri/src/services/export_service.rs` — 全量查询+序列化，大数据量时需分页
  - `src-tauri/src/services/import_service.rs` — `import_all` 策略批量 INSERT，需事务包裹
  - `src-tauri/src/crypto/encrypt.rs` — PBKDF2 210K 迭代在主线程执行，大数据量时可能阻塞 UI
  - 前端统计刷新: `refreshKey` 机制避免不必要的重渲染

## 9. 文件路径索引

- `index.html` → MOD-FEUI — HTML 入口
- `package.json` — 前端依赖与脚本定义
- `public/favicon.svg` — 应用图标 (SVG)
- `src/App.tsx` → MOD-FEUI — React 根组件 (ErrorBoundary + AppShell)
- `src/components/charts/SourceDistribution.tsx` → MOD-FEUI — 来源分布环形图
- `src/components/charts/SpendingTrendChart.tsx` → MOD-FEUI — 消费趋势面积图
- `src/components/common/ErrorBoundary.tsx` → MOD-FEUI — React 错误边界
- `src/components/expense/ExpenseForm.tsx` → MOD-FEUI — 记账表单 (金额输入+来源+分类+备注+日期)
- `src/components/expense/ExpenseList.tsx` → MOD-FEUI — 最近消费记录列表
- `src/components/layout/AppShell.tsx` → MOD-FEUI — 三栏响应式布局+拖拽手柄
- `src/components/settings/SettingsPanel.tsx` → MOD-FEUI — 设置面板 (5个Tab)
- `src/components/settings/CategoryManager.tsx` → MOD-FEUI — 消费分类 CRUD
- `src/components/settings/ExportControls.tsx` → MOD-FEUI — 导出控件 (fastcoin/xlsx/csv)
- `src/components/settings/ImportControls.tsx` → MOD-FEUI — 导入控件 (预览+合并)
- `src/components/settings/GeneralSettings.tsx` → MOD-FEUI — 通用设置 (主题/语言/货币)
- `src/components/settings/SourceManager.tsx` → MOD-FEUI — 支付来源 CRUD
- `src/components/stats/StatsDashboard.tsx` → MOD-FEUI — 统计仪表盘 (卡片+图表)
- `src/constants/defaults.ts` — 默认支付来源、分类、周期
- `src/i18n/zh.json` — 中文本地化字符串
- `src/i18n/en.json` — 英文本地化字符串
- `src/lib/tauri.ts` → MOD-TAURI-IPC — 类型安全的 IPC invoke 封装 (~25 API)
- `src/stores/dataStore.ts` → MOD-STORE — 全局 refreshKey 刷新触发器
- `src/stores/expenseStore.ts` → MOD-STORE — 消费数据 Zustand store
- `src/stores/uiStore.ts` → MOD-STORE — UI 状态 (面板尺寸/Toast/Tab)
- `src/types/export.ts` → MOD-TYPES — 导出/导入/加密文件类型
- `src/types/index.ts` → MOD-TYPES — 类型桶导出
- `src-tauri/Cargo.toml` — Rust 依赖定义
- `src-tauri/capabilities/default.json` — Tauri 插件权限 (dialog, fs)
- `src-tauri/src/lib.rs` — Tauri 应用入口 (插件注册+命令注册)
- `src-tauri/src/main.rs` — Rust 主函数
- `src-tauri/src/db/mod.rs` → MOD-DB — SQLite 初始化+Schema
- `src-tauri/src/db/models.rs` → MOD-DB — 6 个数据实体 struct
- `src-tauri/src/db/seed.rs` → MOD-DB — 首次启动种子数据
- `src-tauri/src/commands/expense_cmd.rs` → MOD-CMD — 消费 CRUD 命令
- `src-tauri/src/commands/stats_cmd.rs` → MOD-CMD — 统计查询命令
- `src-tauri/src/commands/export_cmd.rs` → MOD-CMD — 导出命令
- `src-tauri/src/commands/import_cmd.rs` → MOD-CMD — 导入预览/确认命令
- `src-tauri/src/services/expense_service.rs` → MOD-SVC — 消费 CRUD 业务逻辑
- `src-tauri/src/services/export_service.rs` → MOD-SVC — fastcoin/xlsx/csv 导出
- `src-tauri/src/services/import_service.rs` → MOD-SVC — 导入 diff+合并
- `src-tauri/src/services/stats_service.rs` → MOD-SVC — 统计计算
- `src-tauri/src/crypto/encrypt.rs` → MOD-CRYPTO — AES-256-GCM 加密
- `src-tauri/src/crypto/decrypt.rs` → MOD-CRYPTO — 解密
- `src-tauri/src/crypto/key.rs` → MOD-CRYPTO — PBKDF2 密钥派生
- `src-tauri/src/utils/error.rs` → MOD-UTIL — AppError 统一错误类型
- `src-tauri/tauri.conf.json` — Tauri 应用配置 (窗口/插件/CSP)
- `tailwind.config.ts` — TailwindCSS 主题配置
- `vite.config.ts` — Vite 构建配置 (含 Tauri 集成)

## 10. 变更日志

初始快照 — 无先前版本

## 11. 快照元数据

- Snapshot version: v1.0
- Generated at: 2026-05-25 12:00 +08:00
- Language: zh
- Git commit: 8326e2b
- Git branch: main
- Project type: polyglot
- Previous version: 无 (N/A)
- Previous file: 无 (N/A)
