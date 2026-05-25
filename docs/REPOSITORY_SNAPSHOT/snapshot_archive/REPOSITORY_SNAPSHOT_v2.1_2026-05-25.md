---
snapshot_version: v2.1
generated_at: 2026-05-25 23:00 +08:00
language: zh
git_commit: 8326e2b
git_branch: main
project_type: polyglot
previous_version: v2.0
previous_file: snapshot_archive/REPOSITORY_SNAPSHOT_v2.0_2026-05-25.md
line_budget: 300
---

## TL;DR

FastCoin 是一个纯本地、加密安全的个人快捷记账桌面应用，使用 Tauri 2 (Rust) + React 18 (TypeScript) 构建。支持三栏可拖拽布局、自定义记账周期、可视化统计报表、AES-256-GCM + PBKDF2(600K) 加密导入导出、Excel/CSV 导出、自定义数据存储路径。数据存储在本地 SQLite，不依赖任何网络服务。

## 1. 项目概览

- **名称 / 版本**: `fastcoin` v0.1.0 (from `package.json` / `Cargo.toml`)
- **技术栈**: TypeScript (React 18 + Vite 6 + TailwindCSS 3.4 + Zustand 4 + Recharts 2) + Rust (Tauri 2 + rusqlite + aes-gcm + chrono + rust_xlsxwriter)
- **仓库布局**:

```
FastCoin/
├── src/              # React 前端 (组件、stores、types、utils、IPC、i18n)
├── src-tauri/        # Rust 后端 (db、commands、services、crypto、config)
│   └── capabilities/ # Tauri 插件权限声明
├── public/           # 静态资源 (favicon.svg)
├── dist/             # 前端构建产物
├── index.html        # HTML 入口
├── package.json      # 前端依赖与脚本
├── vite.config.ts    # Vite 配置 (含 Tauri plugin optimizeDeps)
├── tailwind.config.ts# TailwindCSS 主题
├── README.md         # 使用说明
└── .gitignore
```

本项目为 polyglot 类型：前端 TypeScript (~70%) + 后端 Rust (~30%)，通过 Tauri IPC 桥接。

## 2. 入口与配置

- **主入口**:
  - 前端: `src/main.tsx` → `src/App.tsx` (全局主题加载 + ErrorBoundary) → `AppShell.tsx`
  - 后端: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs` (插件+命令注册)
  - 启动: `npx tauri dev` / `npx tauri build`
- **运行时配置**:
  - 前端: `vite.config.ts` (端口 1420，别名 `@/` → `src/`，optimizeDeps 排除 Tauri 插件)
  - 后端: `src-tauri/tauri.conf.json` (窗口 1200x800)
  - 权限: `src-tauri/capabilities/default.json` (core + dialog + fs 权限)
  - 数据路径: `src-tauri/src/config.rs` → `%LOCALAPPDATA%/FastCoin/config.json` (可自定义)
- **构建 / 运行命令**:
  - `npm run dev` — 仅 Vite 开发服务器
  - `npx tauri dev` — 完整 Tauri 开发环境
  - `npx tauri build` — 生产构建 (.msi)

## 3. 模块索引

### MOD-FEUI: 前端组件

- **路径**: `src/components/`
- **职责**: React UI，按功能分 layout / expense / stats / charts / settings / common
- **关键文件**: `AppShell.tsx` (三栏拖拽布局), `ExpenseForm.tsx` (记账表单+数字键盘，Enter 提交), `ExpensePanel.tsx` (垂直可拖拽分区), `StatsDashboard.tsx` (实时统计+周期下拉切换), `SourceDistribution.tsx` (环形图), `SettingsPanel.tsx` (3Tab 设置), `CategoryManager.tsx` (分类CRUD), `SourceManager.tsx` (支付来源CRUD，变更全局刷新), `PeriodManager.tsx` (记账周期CRUD，变更全局刷新), `GeneralSettings.tsx` (即时保存，语言选项已隐藏), `ExportControls.tsx` (密码强度+eye图标), `ImportControls.tsx` (预览+eye图标), `DataPathSetting.tsx` (自定义存储路径), `ErrorBoundary.tsx` (错误边界)
- **依赖模块**: MOD-STORE, MOD-TAURI-IPC, MOD-FORMAT, MOD-TYPES, MOD-THEME

### MOD-STORE: 状态管理

- **路径**: `src/stores/`
- **职责**: Zustand slices — UI 状态、消费缓存、全局刷新信号、设置缓存
- **关键文件**: `uiStore.ts` (面板宽度/Toast/移动Tab), `expenseStore.ts` (CRUD + 自动 refreshKey), `dataStore.ts` (全局 refreshKey 触发器), `settingsStore.ts` (设置缓存 + 货币符号查询)
- **依赖模块**: MOD-TAURI-IPC, MOD-TYPES

### MOD-FORMAT: 格式化工具

- **路径**: `src/utils/format.ts`
- **职责**: 金额格式化（动态货币符号）、分转元
- **公开接口**: `formatAmount(cents)`, `centsToYuan(cents)`
- **依赖模块**: MOD-STORE (settingsStore)

### MOD-THEME: 主题工具

- **路径**: `src/utils/theme.ts`
- **职责**: 共享 `applyTheme()` 函数，统一 dark/light/system 主题切换逻辑
- **公开接口**: `applyTheme(theme: ThemeMode)`
- **使用者**: `App.tsx` (启动时), `GeneralSettings.tsx` (用户切换时)

### MOD-TYPES: 类型定义

- **路径**: `src/types/`
- **职责**: TS 接口，与 Rust `#[serde(rename_all = "camelCase")]` 结构体对应
- **关键文件**: `expense.ts`, `paymentSource.ts`, `period.ts`, `export.ts` (ExportPayload, EncryptedFile, ImportDiff), `settings.ts` (ThemeMode)

### MOD-TAURI-IPC: IPC 封装

- **路径**: `src/lib/tauri.ts`
- **职责**: 类型安全的 `invoke()` 封装，含 config 路径命令
- **公开接口**: ~28 个 async 函数 (get/add/update/delete 各类实体 + getStats + exportData + importPreview/importConfirm + getDbPath/setDbPath/resetDbPath)
- **依赖模块**: MOD-TYPES

### MOD-CONFIG: 应用配置

- **路径**: `src-tauri/src/config.rs`
- **职责**: 读写 `config.json`（自定义 DB 路径），提供 `effective_db_path()`
- **关键文件 / 导出**: `load_config()`, `save_config()`, `effective_db_path()`, `default_db_path()`, `AppConfig { db_path }`

### MOD-DB: 数据库层

- **路径**: `src-tauri/src/db/`
- **职责**: SQLite 初始化、Schema 迁移、种子数据
- **关键文件**: `mod.rs` (init_db 使用 MOD-CONFIG 的 effective_db_path), `models.rs` (6实体 + camelCase), `seed.rs`
- **依赖模块**: MOD-CONFIG, MOD-UTIL

### MOD-CMD: Tauri 命令

- **路径**: `src-tauri/src/commands/`
- **职责**: `#[tauri::command]` 函数，接收 IPC 调用
- **关键文件**: `expense_cmd.rs` (含 UpdateExpenseArgs + camelCase), `source_cmd.rs`, `settings_cmd.rs` (含 UpdateSettingsArgs + camelCase), `config_cmd.rs` (get/set/reset_db_path), `stats_cmd.rs`, `export_cmd.rs`, `import_cmd.rs` (含中文错误上下文)
- **依赖模块**: MOD-SVC, MOD-CONFIG

### MOD-SVC: 业务逻辑

- **路径**: `src-tauri/src/services/`
- **职责**: 统计计算、Excel/CSV 导出、导入 diff + 合并
- **关键文件**: `stats_service.rs` (StatsResponse + camelCase), `export_service.rs` (fastcoin加密/xlsx多sheet/csv), `import_service.rs` (compute_diff + apply_import)
- **依赖模块**: MOD-DB, MOD-CRYPTO

### MOD-CRYPTO: 加密模块

- **路径**: `src-tauri/src/crypto/`
- **职责**: AES-256-GCM + PBKDF2(600K) 认证加密
- **关键文件**: `key.rs` (derive_key, generate_salt, 600K iter), `encrypt.rs` (encrypt_data, EncryptedFile, ExportMetadataHeader), `decrypt.rs` (decrypt_data)

### MOD-UTIL: 工具函数

- **路径**: `src-tauri/src/utils/`
- **职责**: 统一错误类型 (AppError 含 XlsxError 转换)、金额格式化
- **关键文件**: `error.rs`, `format.rs`

## 4. 核心工作流

**记账流程**:

```
1. 用户输入金额、选择来源 → MOD-FEUI/ExpenseForm (Enter 或点击提交)
2. MOD-STORE/expenseStore.addExpense() → MOD-TAURI-IPC invoke("add_expense")
3. MOD-CMD/expense_cmd → MOD-SVC/expense_service → SQLite
4. MOD-STORE/dataStore.triggerRefresh() → MOD-FEUI/StatsDashboard 自动重新 get_stats
5. MOD-STORE/dataStore.triggerRefresh() → MOD-FEUI/SourcePicker, CategoryPicker 同步刷新
6. 货币符号通过 MOD-STORE/settingsStore 全局同步
```

**加密导出流程**:

```
1. 密码 + 确认密码 → showSaveDialog → 获得文件路径
2. invoke("export_data", {password, mode, format, filePath})
3. MOD-SVC/export_service 收集数据 → serde_json → MOD-CRYPTO PBKDF2(600K) → AES-256-GCM → .fastcoin
```

## 5. 数据模型与存储

- **实体**: Expense (id, amount/cents, source_id, category_id, note, date, version), PaymentSource (id, name, type, icon, color, sort_order), Category (id, name, icon, color, parent_id), AccountingPeriod (id, name, start_date, end_date, is_active), AppSettings (singleton), DeletionLog
- **存储**: SQLite，路径由 `config.json` 的 `dbPath` 控制（默认 `%LOCALAPPDATA%/FastCoin/fastcoin.db`），WAL 模式，复合索引 `(date, source_id)` + `(version)`
- **迁移**: `CREATE TABLE IF NOT EXISTS` in db/mod.rs，首次 seed 填充默认来源+分类+周期

## 6. 外部依赖与服务

- **第三方 API**: 无 (纯本地)
- **架构级依赖包**:
  - 前端: `react@18.3`, `zustand@4.5`, `recharts@2.13`, `date-fns@3.6`, `tailwindcss@3.4`, `@tauri-apps/api@2.2`, `@tauri-apps/plugin-dialog@2.2`, `@tauri-apps/plugin-fs@2.2`
  - 后端: `tauri@2.11`, `tauri-plugin-dialog@2`, `tauri-plugin-fs@2`, `rusqlite@0.31`, `aes-gcm@0.10`, `pbkdf2@0.12`, `rust_xlsxwriter@0.77`
- **密钥 / 凭证入口**: 用户密码通过前端输入 → Tauri IPC → Rust PBKDF2；Vite 配置 `optimizeDeps.exclude` 保护 Tauri 插件完整性

## 7. 测试与代码质量

- **测试框架**: 无 (N/A)
- **代码检查**: Rust `#[warn(unused)]`；TypeScript `strict: true`；cargo fix
- **CI 流水线**: 无 (N/A)

## 8. 扩展点与维护指南

- **已知技术债**:
  - 无自动化测试；Tauri dialog 插件需 Vite `optimizeDeps.exclude` + 多层回退以保证可靠性
  - 手机端仅前端响应式，无原生 Tauri Mobile 构建
  - i18n 翻译文件 (`src/i18n/zh.json`, `en.json`) 存在但未接入运行时，语言切换 UI 已隐藏
  - 导入功能 `import_service.rs` 中的删除日志处理块实际为无操作死代码
- **如何新增**:
  - 新前端组件: `src/components/{domain}/` + Panel 引入
  - 新 Rust 命令: `src-tauri/src/commands/` + lib.rs 注册
  - 新数据库表: db/mod.rs CREATE TABLE + models.rs struct
- **公开契约**:
  - `#[serde(rename_all = "camelCase")]` 对所有命令的输入 struct (UpdateSettingsArgs, UpdateExpenseArgs) 和输出 struct 都必须添加
  - 金额 = i64 cents，货币符号通过 settingsStore.getCurrencySymbol() 获取
  - 设置变更后调用 `useDataStore.getState().triggerRefresh()` 以通知全局组件刷新
  - 主题切换使用 `src/utils/theme.ts` 的共享 `applyTheme()`，禁止在组件内重复定义
- **性能 / 安全热点**:
  - PBKDF2 600K 迭代在主线程执行，大数据量导出时可能短暂卡顿
  - `export_service.rs` 全量查询无分页；建议后续添加
  - 加密文件格式 v1: `{salt, iv, ciphertext, metadata}`

## 9. 文件路径索引

- `index.html` → MOD-FEUI — HTML 入口
- `package.json` — 前端依赖
- `src/App.tsx` → MOD-FEUI — 根组件 (全局主题 + ErrorBoundary，使用 MOD-THEME)
- `src/components/charts/SourceDistribution.tsx` → MOD-FEUI — 环形图
- `src/components/charts/SpendingTrendChart.tsx` → MOD-FEUI — 趋势面积图
- `src/components/common/ErrorBoundary.tsx` → MOD-FEUI — 错误边界
- `src/components/expense/CategoryPicker.tsx` → MOD-FEUI — 分类选择器 (订阅 refreshKey)
- `src/components/expense/ExpenseForm.tsx` → MOD-FEUI — 记账表单 (Enter 提交)
- `src/components/expense/ExpensePanel.tsx` → MOD-FEUI — 左栏容器(可拖拽分区)
- `src/components/expense/ExpenseRow.tsx` → MOD-FEUI — 消费行 (动态支付来源图标)
- `src/components/expense/SourcePicker.tsx` → MOD-FEUI — 支付来源选择器 (订阅 refreshKey)
- `src/components/layout/AppShell.tsx` → MOD-FEUI — 三栏拖拽布局
- `src/components/settings/CategoryManager.tsx` → MOD-FEUI — 分类 CRUD (含 triggerRefresh)
- `src/components/settings/ExportControls.tsx` → MOD-FEUI — 导出 (eye图标切换+密码强度)
- `src/components/settings/GeneralSettings.tsx` → MOD-FEUI — 通用设置 (即时保存+使用 MOD-THEME)
- `src/components/settings/ImportControls.tsx` → MOD-FEUI — 导入 (预览+eye图标切换)
- `src/components/settings/PeriodManager.tsx` → MOD-FEUI — 记账周期 CRUD (含 triggerRefresh)
- `src/components/settings/SettingsPanel.tsx` → MOD-FEUI — 设置面板(3Tab)
- `src/components/settings/SourceManager.tsx` → MOD-FEUI — 支付来源 CRUD (含 triggerRefresh)
- `src/components/stats/StatsDashboard.tsx` → MOD-FEUI — 统计仪表盘 (订阅 refreshKey)
- `src/lib/tauri.ts` → MOD-TAURI-IPC — 类型安全 IPC (~28 API)
- `src/stores/dataStore.ts` → MOD-STORE — refreshKey 触发器 (全局刷新机制)
- `src/stores/expenseStore.ts` → MOD-STORE — 消费数据
- `src/stores/settingsStore.ts` → MOD-STORE — 设置缓存+货币符号
- `src/stores/uiStore.ts` → MOD-STORE — UI 状态(面板尺寸/Toast)
- `src/types/export.ts` → MOD-TYPES — 导出/加密文件类型
- `src/utils/format.ts` → MOD-FORMAT — formatAmount, centsToYuan
- `src/utils/theme.ts` → MOD-THEME — 共享 applyTheme (dark/light/system)
- `src/i18n/zh.json` — 中文本地化 (未接入运行时)
- `src/i18n/en.json` — 英文本地化 (未接入运行时)
- `src-tauri/Cargo.toml` — Rust 依赖
- `src-tauri/capabilities/default.json` — Tauri 插件权限
- `src-tauri/src/config.rs` → MOD-CONFIG — 应用配置读写
- `src-tauri/src/lib.rs` — Tauri 入口 (插件+命令注册)
- `src-tauri/src/db/mod.rs` → MOD-DB — SQLite 初始化
- `src-tauri/src/db/models.rs` → MOD-DB — 6实体+camelCase
- `src-tauri/src/commands/config_cmd.rs` → MOD-CMD — 数据路径命令
- `src-tauri/src/commands/expense_cmd.rs` → MOD-CMD — UpdateExpenseArgs+camelCase
- `src-tauri/src/commands/import_cmd.rs` → MOD-CMD — 含中文错误上下文
- `src-tauri/src/commands/settings_cmd.rs` → MOD-CMD — UpdateSettingsArgs+camelCase
- `src-tauri/src/services/export_service.rs` → MOD-SVC — fastcoin/xlsx/csv
- `src-tauri/src/services/import_service.rs` → MOD-SVC — diff+合并
- `src-tauri/src/services/stats_service.rs` → MOD-SVC — StatsResponse+camelCase
- `src-tauri/src/crypto/key.rs` → MOD-CRYPTO — PBKDF2(600K)
- `src-tauri/src/crypto/encrypt.rs` → MOD-CRYPTO — AES-256-GCM 加密 + EncryptedFile
- `src-tauri/src/utils/error.rs` → MOD-UTIL — AppError (含 XlsxError)
- `vite.config.ts` — Vite 配置 (optimizeDeps.exclude, 无 async)
- `tailwind.config.ts` — TailwindCSS darkMode: class

## 10. 变更日志

相对于 v2.0 的变更:

- **新增**: MOD-THEME (`src/utils/theme.ts`) — 共享主题切换逻辑，消除 App.tsx 与 GeneralSettings.tsx 中的重复定义
- **变更**: MOD-STORE/dataStore — refreshKey 订阅范围扩大：SourcePicker、CategoryPicker、StatsDashboard 现订阅 refreshKey 实现设置变更后即时同步
- **变更**: MOD-FEUI/SourceManager, PeriodManager — 增删改操作后调用 `triggerRefresh()` 通知全局组件刷新
- **变更**: MOD-FEUI/ExpenseForm — Enter/NumpadEnter 直接提交（不再要求 Ctrl+Enter）
- **变更**: MOD-FEUI/ExpenseRow — 支付来源图标和颜色从 `getPaymentSources()` 动态获取，替换硬编码 💬
- **变更**: MOD-FEUI/ExportControls — 密码可见性切换改用 SVG eye/eye-off 图标（替换文字 "显示/隐藏"）
- **变更**: MOD-FEUI/ImportControls — 新增密码可见性切换（此前缺失）
- **变更**: MOD-FEUI/GeneralSettings — 移除未生效的语言切换 UI（i18n 翻译文件存在但未接入运行时）
- **变更**: MOD-CMD/import_cmd.rs — 导入命令错误信息增加中文上下文（文件读取/格式/解密/预览分步诊断）
- **变更**: `vite.config.ts` — 移除 defineConfig 不必要的 `async`，build.minify 添加 `as const` 修复类型推断
- **变更**: `package.json` — 新增 devDependency `@types/node` (vite.config.ts 类型支持)

## 11. 快照元数据

- Snapshot version: v2.1
- Generated at: 2026-05-25 23:00 +08:00
- Language: zh
- Git commit: 8326e2b
- Git branch: main
- Project type: polyglot
- Previous version: v2.0
- Previous file: snapshot_archive/REPOSITORY_SNAPSHOT_v2.0_2026-05-25.md
