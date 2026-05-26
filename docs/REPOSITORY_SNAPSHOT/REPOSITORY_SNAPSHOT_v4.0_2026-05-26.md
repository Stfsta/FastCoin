---
snapshot_version: v4.0
generated_at: 2026-05-26 01:00 +08:00
language: zh
git_commit: e959f8d
git_branch: main
project_type: polyglot
previous_version: v3.0
previous_file: snapshot_archive/REPOSITORY_SNAPSHOT_v3.0_2026-05-25.md
line_budget: 300
---

## TL;DR

FastCoin 是一个纯本地、加密安全的个人快捷记账桌面应用，使用 Tauri 2 (Rust) + React 18 (TypeScript) 构建。支持三栏可拖拽布局、深色/浅色主题切换、中英文双语界面、自定义记账周期、可视化统计报表、AES-256-GCM + PBKDF2(600K) 加密导入导出（完整/当日/当前周期三种模式）、Excel/CSV 导出、path.cfg 指针架构自定义数据存储路径、导入后即时数据刷新。数据存储在本地 SQLite，不依赖任何网络服务。

## 1. 项目概览

- **名称 / 版本**: `fastcoin` v0.2.0 (from `package.json` / `Cargo.toml`)
- **技术栈**: TypeScript (React 18 + Vite 6 + TailwindCSS 3.4 + Zustand 4 + Recharts 2 + i18next + react-i18next) + Rust (Tauri 2 + rusqlite + aes-gcm + chrono + rust_xlsxwriter)
- **仓库布局**:

```
FastCoin/
├── src/              # React 前端 (组件、stores、types、utils、i18n、IPC)
├── src-tauri/        # Rust 后端 (db、commands、services、crypto、config)
│   └── capabilities/ # Tauri 插件权限声明
├── docs/             # 仓库快照文档
├── public/           # 静态资源 (favicon.svg)
├── index.html        # HTML 入口
├── package.json      # 前端依赖与脚本
└── vite.config.ts    # Vite 配置 (含 Tauri plugin optimizeDeps)
```

本项目为 polyglot 类型：前端 TypeScript (~70%) + 后端 Rust (~30%)，通过 Tauri IPC 桥接。

## 2. 入口与配置

- **主入口**:
  - 前端: `src/main.tsx` → `src/App.tsx` (i18n 初始化 + 主题加载 + ErrorBoundary) → `AppShell.tsx`
  - 后端: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs` (插件+命令注册)
  - 启动: `npx tauri dev` / `npx tauri build`
- **运行时配置**:
  - 前端: `vite.config.ts` (端口 1420，别名 `@/` → `src/`，optimizeDeps 排除 Tauri 插件)
  - 后端: `src-tauri/tauri.conf.json` (窗口 1200x800)
  - 权限: `src-tauri/capabilities/default.json` (core + dialog + fs 权限)
  - 数据路径: path.cfg 指针 → `%LOCALAPPDATA%/FastCoin/path.cfg` 指向实际数据目录，`config.json` 与数据库同目录
- **构建 / 运行命令**:
  - `npm run dev` — 仅 Vite 开发服务器
  - `npx tauri dev` — 完整 Tauri 开发环境
  - `npx tauri build` — 生产构建 (.msi)

## 3. 模块索引

### MOD-FEUI: 前端组件

- **路径**: `src/components/`
- **职责**: React UI，按功能分 layout / expense / stats / charts / settings / common
- **关键文件**: `AppShell.tsx` (三栏拖拽布局+深色模式), `ExpenseForm.tsx` (记账表单+日期同步uiStore), `StatsDashboard.tsx` (实时统计+周期双向同步), `ExportControls.tsx` (完整/当日/周期三模式+密码强度), `ImportControls.tsx` (预览+导入后即时刷新), `GeneralSettings.tsx` (主题/语言/货币+数据路径+上次导入版本)
- **依赖模块**: MOD-STORE, MOD-TAURI-IPC, MOD-FORMAT, MOD-TYPES, MOD-THEME, MOD-I18N

### MOD-STORE: 状态管理

- **路径**: `src/stores/`
- **职责**: Zustand slices — UI 状态、消费缓存、全局刷新信号、设置缓存、选中日期
- **关键文件**: `uiStore.ts` (面板宽度/Toast/移动Tab/selectedDate), `expenseStore.ts` (CRUD + 自动 refreshKey), `dataStore.ts` (全局 refreshKey 触发器), `settingsStore.ts` (设置缓存 + 货币符号查询)
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

### MOD-I18N: 国际化

- **路径**: `src/i18n/`
- **职责**: i18next + react-i18next 国际化框架，中英文双语支持
- **关键文件**: `index.ts` (i18n 初始化), `zh.json` (150+ 中文翻译键), `en.json` (150+ 英文翻译键)
- **公开接口**: `export default i18n`, `useTranslation()` hook

### MOD-TYPES: 类型定义

- **路径**: `src/types/`
- **职责**: TS 接口，与 Rust `#[serde(rename_all = "camelCase")]` 结构体对应
- **关键文件**: `expense.ts`, `paymentSource.ts`, `period.ts`, `export.ts` (ExportPayload, EncryptedFile, ImportDiff, ExportMode="full"|"date"|"period"), `settings.ts` (ThemeMode, SupportedLocale, lastImportedVersion)

### MOD-TAURI-IPC: IPC 封装

- **路径**: `src/lib/tauri.ts`
- **职责**: 类型安全的 `invoke()` 封装，含 config 路径命令
- **公开接口**: ~28 个 async 函数 (get/add/update/delete 各类实体 + getStats + exportData(date?) + importPreview/importConfirm + getDbPath/setDbPath/resetDbPath)
- **依赖模块**: MOD-TYPES

### MOD-CONFIG: 应用配置 (path.cfg 指针架构)

- **路径**: `src-tauri/src/config.rs`
- **职责**: path.cfg 指针架构 — 数据目录由指针文件决定，config.json 与数据库同目录存放
- **公开接口**: `default_app_data_dir()`, `effective_data_dir()`, `load_pointer()`, `save_pointer()`, `remove_pointer()`, `load_config()`, `save_config()`, `effective_db_path()`

### MOD-DB: 数据库层

- **路径**: `src-tauri/src/db/`
- **职责**: SQLite 初始化、Schema 迁移、种子数据
- **关键文件**: `mod.rs` (init_db, last_imported_version 字段+迁移), `models.rs` (6实体 + camelCase + last_imported_version), `seed.rs`
- **依赖模块**: MOD-CONFIG

### MOD-CMD: Tauri 命令

- **路径**: `src-tauri/src/commands/`
- **职责**: `#[tauri::command]` 函数，接收 IPC 调用
- **关键文件**: `expense_cmd.rs`, `source_cmd.rs`, `settings_cmd.rs` (含 last_imported_version), `config_cmd.rs` (set_db_path 含 WAL checkpoint+文件迁移+旧文件清理), `export_cmd.rs` (date 参数), `import_cmd.rs` (until_version 传递)
- **依赖模块**: MOD-SVC, MOD-CONFIG

### MOD-SVC: 业务逻辑

- **路径**: `src-tauri/src/services/`
- **职责**: 统计计算、Excel/CSV 导出、加密导出(完整/当日/周期)、导入 diff + 合并 + last_imported_version 写入
- **关键文件**: `stats_service.rs`, `export_service.rs` (gather_full/date/period + ExportPayload alias 兼容), `import_service.rs` (compute_diff + apply_import 含事务+外键排序+until_version)
- **依赖模块**: MOD-DB, MOD-CRYPTO

### MOD-CRYPTO: 加密模块

- **路径**: `src-tauri/src/crypto/`
- **职责**: AES-256-GCM + PBKDF2(600K) 认证加密
- **关键文件**: `key.rs` (derive_key, 600K iter), `encrypt.rs` (encrypt_data, EncryptedFile, ExportMetadataHeader), `decrypt.rs` (decrypt_data)

### MOD-UTIL: 工具函数

- **路径**: `src-tauri/src/utils/`
- **职责**: 统一错误类型 (AppError 含 XlsxError 转换)、金额格式化
- **关键文件**: `error.rs`, `format.rs`

## 4. 核心工作流

**记账 + 即时同步流程**:

```
1. 用户输入金额、选择来源 → MOD-FEUI/ExpenseForm (Enter 提交)
2. MOD-STORE/expenseStore.addExpense() → MOD-TAURI-IPC invoke("add_expense")
3. MOD-CMD/expense_cmd → SQLite
4. MOD-STORE/dataStore.triggerRefresh() → MOD-FEUI/StatsDashboard + ExpenseList + SourcePicker 实时刷新
5. 日期同步: ExpenseForm → uiStore.setSelectedDate() → ExportControls 读取 selectedDate
```

**导入后即时生效流程**:

```
1. 用户点击导入确认 → MOD-TAURI-IPC invoke("import_confirm")
2. MOD-CMD/import_cmd → apply_import (事务+外键排序) → 写入 last_imported_version
3. 前端 ImportControls 调用: dataStore.triggerRefresh() + expenseStore.fetchExpenses() + settingsStore.load()
4. refreshKey 变更 → 所有订阅组件 (ExpenseList, SourceManager, CategoryManager, StatsDashboard) 重渲染
```

## 5. 数据模型与存储

- **实体**: Expense (id, amount/cents, source_id, category_id, note, date, version), PaymentSource (id, name, type, icon, color, sort_order), Category (id, name, icon, color, parent_id), AccountingPeriod (id, name, start_date, end_date, is_active), AppSettings (singleton, 含 theme + locale + defaultCurrency + last_imported_version), DeletionLog
- **存储**: SQLite，路径由 path.cfg 指针 → config.json 的 dbPath 控制，WAL 模式，复合索引 `(date, source_id)` + `(version)`
- **迁移**: `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN last_imported_version ... DEFAULT 0` (idempotent)

## 6. 外部依赖与服务

- **第三方 API**: 无 (纯本地)
- **架构级依赖包**:
  - 前端: `react@18.3`, `zustand@4.5`, `recharts@2.13`, `date-fns@3.6`, `tailwindcss@3.4`, `i18next`, `react-i18next`, `@tauri-apps/api@2.2`, `@tauri-apps/plugin-dialog@2.2`, `@tauri-apps/plugin-fs@2.2`
  - 后端: `tauri@2.11`, `tauri-plugin-dialog@2`, `tauri-plugin-fs@2`, `rusqlite@0.31`, `aes-gcm@0.10`, `pbkdf2@0.12`, `rust_xlsxwriter@0.77`
- **密钥 / 凭证入口**: 用户密码通过前端输入 → Tauri IPC → Rust PBKDF2

## 7. 测试与代码质量

- **测试框架**: 无 (N/A)
- **代码检查**: Rust `#[warn(unused)]`；TypeScript `strict: true`；cargo fix
- **CI 流水线**: 无 (N/A)

## 8. 扩展点与维护指南

- **已知技术债**:
  - 无自动化测试；Tauri dialog 插件需 Vite `optimizeDeps.exclude` + 多层回退
  - 手机端仅前端响应式，无原生 Tauri Mobile 构建
- **如何新增**:
  - 新前端组件: `src/components/{domain}/` + Panel 引入
  - 新翻译字符串: 在 `src/i18n/zh.json` 和 `en.json` 中添加相同键，组件中使用 `t('key')`
  - 新 Rust 命令: `src-tauri/src/commands/` + lib.rs 注册
  - 新数据库表: db/mod.rs CREATE TABLE + models.rs struct
- **公开契约**:
  - `#[serde(rename_all = "camelCase")]` 对所有命令 struct 必须添加；ExportPayload 使用 `#[serde(alias)]` 兼容旧格式
  - 金额 = i64 cents，货币符号通过 `formatAmount()` 获取
  - 设置变更后调用 `triggerRefresh()` 通知全局刷新；导入后需额外调用 expenseStore.fetchExpenses() + settingsStore.load()
  - 主题切换使用 `src/utils/theme.ts` 共享 `applyTheme()`
  - i18n 键命名: `{domain}.{element}` 点号分隔
  - 数据路径变更使用 path.cfg 指针架构，config.json 与数据库同目录
  - 导出模式: full / date / period；仅 full 更新 last_exported_version
- **性能 / 安全热点**:
  - PBKDF2 600K 迭代在主线程执行，大数据量导出时可能短暂卡顿
  - `set_db_path` 执行 WAL checkpoint + 文件拷贝，大数据库迁移耗时
  - apply_import 使用事务+外键排序确保数据完整性

## 9. 文件路径索引

- `src/App.tsx` → MOD-FEUI — 根组件 (i18n 初始化 + 主题加载)
- `src/components/expense/ExpenseForm.tsx` → MOD-FEUI — 记账表单 (日期同步uiStore)
- `src/components/expense/ExpenseList.tsx` → MOD-FEUI — 最近记录列表 (refreshKey订阅)
- `src/components/settings/ExportControls.tsx` → MOD-FEUI — 导出 (full/date/period三模式)
- `src/components/settings/ImportControls.tsx` → MOD-FEUI — 导入 (预览+导入后即时刷新)
- `src/components/settings/GeneralSettings.tsx` → MOD-FEUI — 通用设置 (含lastImportedVersion)
- `src/components/settings/SourceManager.tsx` → MOD-FEUI — 支付来源 CRUD (refreshKey订阅)
- `src/components/settings/CategoryManager.tsx` → MOD-FEUI — 分类 CRUD (refreshKey订阅)
- `src/components/stats/StatsDashboard.tsx` → MOD-FEUI — 统计仪表盘
- `src/i18n/zh.json` → MOD-I18N — 中文翻译 (150+ keys)
- `src/i18n/en.json` → MOD-I18N — 英文翻译 (150+ keys)
- `src/lib/tauri.ts` → MOD-TAURI-IPC — 类型安全 IPC (~28 API, exportData含date)
- `src/stores/uiStore.ts` → MOD-STORE — UI状态+selectedDate
- `src/stores/dataStore.ts` → MOD-STORE — refreshKey 触发器
- `src/stores/settingsStore.ts` → MOD-STORE — 设置缓存+货币符号
- `src/types/export.ts` → MOD-TYPES — ExportMode="full"|"date"|"period"
- `src/types/settings.ts` → MOD-TYPES — AppSettings含lastImportedVersion
- `src-tauri/src/config.rs` → MOD-CONFIG — path.cfg 指针架构
- `src-tauri/src/db/mod.rs` → MOD-DB — SQLite 初始化+last_imported_version迁移
- `src-tauri/src/db/models.rs` → MOD-DB — 6实体+last_imported_version字段
- `src-tauri/src/commands/config_cmd.rs` → MOD-CMD — set_db_path含WAL+迁移+清理
- `src-tauri/src/commands/import_cmd.rs` → MOD-CMD — until_version传递
- `src-tauri/src/commands/settings_cmd.rs` → MOD-CMD — 含last_imported_version
- `src-tauri/src/services/export_service.rs` → MOD-SVC — gather_full/date/period
- `src-tauri/src/services/import_service.rs` → MOD-SVC — 事务+外键排序+until_version

## 10. 变更日志

相对于 v3.0 的变更:

- **重构**: MOD-CONFIG — path.cfg 指针架构替代旧 config.json 方案；数据目录由指针文件决定，config.json 与数据库同目录
- **重构**: MOD-SVC/export_service — 删除"增量更新"模式，新增"当日导出"(gather_date_export)和"当前周期导出"(gather_period_export)，使用 full_export+retain 模式
- **重构**: MOD-SVC/import_service — 修复导入顺序(外键依赖前插入)、添加事务包装、新增 until_version 写入 last_imported_version
- **新增**: DB 字段 `last_imported_version` — 记录上次导入的加密备份版本号
- **新增**: uiStore.selectedDate — 全局日期状态，ExpenseForm 写入、ExportControls 读取
- **新增**: ExportPayload `#[serde(alias)]` — 兼容旧 .fastcoin 文件 snake_case 字段名
- **新增**: ImportDiff/DiffCounts `#[serde(rename_all = "camelCase")]` — 修复前端 undefined 崩溃
- **变更**: MOD-FEUI/ImportControls — 导入后调用 triggerRefresh + fetchExpenses + settingsStore.load 实现即时刷新
- **变更**: MOD-FEUI/ExpenseList, SourceManager, CategoryManager — 订阅 refreshKey 实现数据即时同步
- **变更**: MOD-FEUI/GeneralSettings — 显示 lastImportedVersion 替代 dataVersion
- **变更**: MOD-CMD/config_cmd — set_db_path 执行 WAL checkpoint + 文件拷贝迁移 + 旧文件清理
- **变更**: 应用图标 — 全平台重新生成

## 11. 快照元数据

- Snapshot version: v4.0
- Generated at: 2026-05-26 01:00 +08:00
- Language: zh
- Git commit: e959f8d
- Git branch: main
- Project type: polyglot
- Previous version: v3.0
- Previous file: snapshot_archive/REPOSITORY_SNAPSHOT_v3.0_2026-05-25.md
