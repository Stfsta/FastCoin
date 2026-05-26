---
snapshot_version: v6.1
generated_at: 2026-05-26 21:00 +08:00
language: zh
git_commit: 6b207ba
git_branch: main
project_type: polyglot
previous_version: v6.0
previous_file: snapshot_archive/REPOSITORY_SNAPSHOT_v6.0_2026-05-26.md
line_budget: 300
---

## TL;DR

FastCoin 是一个纯本地、加密安全的个人快捷记账跨平台应用，使用 Tauri 2 (Rust) + React 18 (TypeScript) 构建，支持 Windows/macOS/Linux 桌面端及 Android 原生 APK（已配置 Release 签名）。支持三栏可拖拽布局（手机端 Tab 切换）、深色/浅色主题、中英文双语、自定义记账周期、可视化统计、AES-256-GCM 加密导入导出（完整/当日/当前周期）、Excel/CSV 导出、path.cfg 指针架构、Android SAF 内容模式导入导出、移动端安全区域避让。数据存储在本地 SQLite，不依赖网络。

## 1. 项目概览

- **名称 / 版本**: `fastcoin` v0.2.1 (from `package.json` / `Cargo.toml`)
- **技术栈**: TypeScript (React 18 + Vite 6 + TailwindCSS 3.4 + Zustand 4 + Recharts 2 + i18next) + Rust (Tauri 2 + rusqlite + aes-gcm + chrono + rust_xlsxwriter)
- **仓库布局**:

```
FastCoin/
├── src/              # React 前端 (组件、stores、types、utils、i18n、IPC、platform)
├── src-tauri/        # Rust 后端 (db、commands、services、crypto、config)
│   ├── capabilities/ # Tauri 插件权限声明
│   ├── gen/android/  # Android 项目 (Gradle, NDK linker, 签名配置)
│   └── .cargo/       # Android NDK linker/ar paths
├── docs/             # 仓库快照文档
├── public/           # 静态资源 (favicon.svg)
├── index.html        # HTML 入口 (viewport maximum-scale=1.0, viewport-fit=cover)
├── package.json      # 前端依赖与脚本
└── vite.config.ts    # Vite 配置 (含 android chrome105 target)
```

## 2. 入口与配置

- **主入口**:
  - 前端: `src/main.tsx` → `src/App.tsx` → `AppShell.tsx` (100dvh 视口 + popstate 返回键 + 移动端 safe-area 避让)
  - 后端: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs` (`#[cfg_attr(mobile, mobile_entry_point)]` + setup 闭包初始化 DB)
  - 启动: `npx tauri dev` / `npx tauri build` / `npx tauri android dev` / `npx tauri android build`
- **运行时配置**:
  - 前端: `vite.config.ts` (端口 1420, android→chrome105 target)
  - 后端: `src-tauri/tauri.conf.json` (窗口 1200x800, bundle.android 配置)
  - 权限: `src-tauri/capabilities/default.json` (windows: ["main", "*"])
  - Android NDK: `src-tauri/.cargo/config.toml` (aarch64/armv7/x86_64 linker paths)
  - Android 签名: `src-tauri/gen/android/keystore.properties` + `app/fastcoin-release.jks` (git-ignored)
  - 数据路径: path.cfg 指针架构; Android 使用 `app.path().app_data_dir()`
- **构建 / 运行命令**:
  - `npm run dev` — 仅 Vite 开发服务器
  - `npx tauri dev` — 桌面端 Tauri 开发环境
  - `npx tauri build` — 桌面端生产构建
  - `npx tauri android build` — Android APK 构建（需先配置签名）

## 3. 模块索引

### MOD-FEUI: 前端组件

- **路径**: `src/components/`
- **职责**: React UI，按功能分 layout / expense / stats / charts / settings / common
- **关键文件**: `AppShell.tsx` (100dvh+popstate返回键+safe-area避让), `ExpensePanel.tsx` (手机端Tab切换), `ExpenseForm.tsx` (日期+提交按钮在来源下方; 提交后日期保持), `Modal.tsx` (手机端底部弹窗), `ExportControls.tsx` (Android SAF+内容模式), `ImportControls.tsx` (Android SAF+内容模式), `GeneralSettings.tsx` (Android隐藏DataPathSetting)
- **依赖模块**: MOD-STORE, MOD-TAURI-IPC, MOD-PLATFORM, MOD-FORMAT, MOD-TYPES, MOD-I18N

### MOD-STORE: 状态管理

- **路径**: `src/stores/`
- **职责**: Zustand slices — UI 状态、面板导航历史、消费缓存、全局刷新、设置缓存
- **关键文件**: `uiStore.ts` (面板宽度/Toast/移动Tab/selectedDate/panelHistory+goBack), `expenseStore.ts`, `dataStore.ts`, `settingsStore.ts`
- **依赖模块**: MOD-TAURI-IPC, MOD-TYPES

### MOD-PLATFORM: 平台检测

- **路径**: `src/lib/platform.ts`
- **职责**: 运行时平台/设备检测（isAndroid, isMobile）
- **公开接口**: `isAndroid(): boolean`, `isMobile(): boolean`
- **依赖模块**: 无

### MOD-FORMAT: 格式化工具

- **路径**: `src/utils/format.ts`
- **职责**: 金额格式化（动态货币符号）、分转元
- **公开接口**: `formatAmount(cents)`, `centsToYuan(cents)`
- **依赖模块**: MOD-STORE (settingsStore)

### MOD-I18N: 国际化

- **路径**: `src/i18n/`
- **职责**: i18next + react-i18next 国际化框架，中英文双语支持
- **关键文件**: `index.ts`, `zh.json`, `en.json`
- **公开接口**: `export default i18n`, `useTranslation()` hook

### MOD-TYPES: 类型定义

- **路径**: `src/types/`
- **职责**: TS 接口，与 Rust `#[serde(rename_all = "camelCase")]` 对应
- **关键文件**: `expense.ts`, `paymentSource.ts`, `period.ts`, `export.ts` (ExportMode="full"|"date"|"period"), `settings.ts`

### MOD-TAURI-IPC: IPC 封装

- **路径**: `src/lib/tauri.ts`
- **职责**: 类型安全 `invoke()` 封装，含 path/内容模式命令
- **公开接口**: ~31 个 async 函数 (CRUD + getStats + exportData + exportDataToContent + importPreview/Confirm + importPreviewFromContent/importConfirmFromContent + config 路径命令)
- **依赖模块**: MOD-TYPES

### MOD-CONFIG: 应用配置

- **路径**: `src-tauri/src/config.rs`
- **职责**: path.cfg 指针架构 + Android 平台数据目录 + resolve_db_path
- **公开接口**: `default_app_data_dir()`, `effective_data_dir()`, `load_pointer()`, `save_pointer()`, `remove_pointer()`, `load_config()`, `save_config()`, `effective_db_path()`, `resolve_db_path()`

### MOD-DB: 数据库层

- **路径**: `src-tauri/src/db/`
- **职责**: SQLite 初始化、Schema 迁移、种子数据
- **关键文件**: `mod.rs` (`init_db_at` 接受路径参数), `models.rs` (6实体 + camelCase + last_imported_version), `seed.rs`
- **依赖模块**: MOD-CONFIG (仅桌面端)

### MOD-CMD: Tauri 命令

- **路径**: `src-tauri/src/commands/`
- **职责**: `#[tauri::command]` 函数，含 Android 条件编译和 async 内容模式命令
- **关键文件**: `config_cmd.rs` (set_db_path/reset_db_path Android 禁用), `export_cmd.rs` (export_data_to_content async), `import_cmd.rs` (import_preview_from_content/import_confirm_from_content async + spawn_blocking)
- **依赖模块**: MOD-SVC, MOD-CONFIG

### MOD-SVC: 业务逻辑

- **路径**: `src-tauri/src/services/`
- **职责**: 统计计算、导出(文件+内容模式)、导入 diff + 合并
- **关键文件**: `export_service.rs` (gather_full/date/period + export_fastcoin_to_content/csv_to_content/xlsx_to_bytes), `import_service.rs` (事务+外键排序+until_version), `stats_service.rs`
- **依赖模块**: MOD-DB, MOD-CRYPTO

### MOD-CRYPTO: 加密模块

- **路径**: `src-tauri/src/crypto/`
- **职责**: AES-256-GCM + PBKDF2(600K) 认证加密
- **关键文件**: `key.rs` (derive_key, 600K iter), `encrypt.rs`, `decrypt.rs`

### MOD-UTIL: 工具函数

- **路径**: `src-tauri/src/utils/`
- **职责**: 统一错误类型 (AppError 含 XlsxError 转换)、金额格式化
- **关键文件**: `error.rs`, `format.rs`

### MOD-SIGN: Android 签名配置

- **路径**: `src-tauri/gen/android/`
- **职责**: Release APK 数字签名，使 Android 允许安装
- **关键文件**: `keystore.properties` (签名凭证，git-ignored), `app/fastcoin-release.jks` (RSA 2048 密钥库，git-ignored), `app/build.gradle.kts` (signingConfigs + keystoreProperties 读取)
- **依赖模块**: 无 (构建时配置)

## 4. 核心工作流

**记账 + 即时同步**:
1. MOD-FEUI/ExpenseForm 输入 → MOD-STORE/expenseStore.addExpense() → MOD-TAURI-IPC
2. MOD-CMD → SQLite → MOD-STORE/dataStore.triggerRefresh() → 组件实时刷新
3. 提交后日期保持用户选定值不变（连续记账无需重新选日期）

**Android SAF 导出**:
1. MOD-FEUI/ExportControls 调用 dialog.save() → SAF content URI
2. MOD-TAURI-IPC/exportDataToContent → MOD-CMD (async + spawn_blocking) → MOD-SVC 内容模式导出
3. 前端 plugin-fs.writeTextFile / writeFile 写入 URI

**Android 签名构建**:
1. keytool 生成 fastcoin-release.jks → keystore.properties 配置密码
2. Gradle signingConfigs.release 读取 properties → release 构建自动签名 APK

## 5. 数据模型与存储

- **实体**: Expense, PaymentSource, Category, AccountingPeriod, AppSettings (singleton, 含 theme/locale/defaultCurrency/last_imported_version), DeletionLog
- **存储**: SQLite WAL 模式; 桌面端 path.cfg 指针 → config.json; Android 端 Tauri app_data_dir 自动解析; 复合索引 (date,source_id) + (version)
- **迁移**: `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN last_imported_version` (idempotent)

## 6. 外部依赖与服务

- **第三方 API**: 无 (纯本地)
- **架构级依赖包**:
  - 前端: `react@18.3`, `zustand@4.5`, `recharts@2.13`, `date-fns@3.6`, `tailwindcss@3.4`, `i18next`, `@tauri-apps/api@2.2`, `@tauri-apps/plugin-dialog@2.2`, `@tauri-apps/plugin-fs@2.2`
  - 后端: `tauri@2.11`, `tauri-plugin-dialog@2`, `tauri-plugin-fs@2`, `rusqlite@0.31`, `aes-gcm@0.10`, `pbkdf2@0.12`, `rust_xlsxwriter@0.77`
- **密钥 / 凭证入口**: 用户密码 → Tauri IPC → Rust PBKDF2; Android 签名密码 → keystore.properties → Gradle

## 7. 测试与代码质量

- **测试框架**: 无 (N/A)
- **代码检查**: Rust `#[warn(unused)]`; TypeScript `strict: true`; cargo fix
- **CI 流水线**: 无 (N/A)

## 8. 扩展点与维护指南

- **已知技术债**:
  - 无自动化测试; bundle identifier `com.fastcoin.app` 以 `.app` 结尾，macOS 可能冲突
- **如何新增**:
  - 新前端组件: `src/components/{domain}/` + Panel 引入
  - 新翻译: `src/i18n/zh.json` / `en.json` 添加键，组件用 `t('key')`
  - 新 Rust 命令: `src-tauri/src/commands/` + lib.rs 注册; Android 禁用用 `#[cfg(not(target_os = "android"))]`
  - 新数据库表: db/mod.rs CREATE TABLE + models.rs struct
- **公开契约**:
  - `#[serde(rename_all = "camelCase")]` 对所有命令 struct 必须添加; ExportPayload 用 `#[serde(alias)]` 兼容旧格式
  - 金额 = i64 cents; Android 内容模式命令为 async + `spawn_blocking`
  - `AppState.db` 为 `Arc<Mutex<Connection>>`（支持跨线程 clone + spawn_blocking）
  - Android 上 `set_db_path`/`reset_db_path` 被条件编译禁用
  - 手机端 Modal 为底部弹窗; ExpensePanel 为 Tab 切换; 触摸目标 ≥ 44px
  - 导出模式: full / date / period; 仅 full 更新 last_exported_version
  - Android 签名凭证在 keystore.properties（git-ignored），无此文件则 release APK 未签名
- **性能 / 安全热点**:
  - PBKDF2 600K 迭代已移至 spawn_blocking 后台线程（Android 内容模式命令）
  - 桌面端 export_data/import_preview/import_confirm 仍为同步（主线程）
  - `set_db_path` 执行 WAL checkpoint + 文件拷贝，大数据库迁移耗时

## 9. 文件路径索引

- `src/lib/platform.ts` → MOD-PLATFORM — isAndroid/isMobile 检测
- `src/lib/tauri.ts` → MOD-TAURI-IPC — 类型安全 IPC (~31 API)
- `src/components/layout/AppShell.tsx` → MOD-FEUI — 100dvh+popstate返回键+safe-area避让
- `src/components/expense/ExpenseForm.tsx` → MOD-FEUI — 表单(日期+提交在来源下方; 提交后日期保持)
- `src/components/expense/ExpensePanel.tsx` → MOD-FEUI — 手机端Tab切换
- `src/components/expense/DateQuickSelect.tsx` → MOD-FEUI — 日期快选+日期选择器
- `src/components/common/Modal.tsx` → MOD-FEUI — 手机端底部弹窗
- `src/components/settings/ExportControls.tsx` → MOD-FEUI — Android SAF导出
- `src/components/settings/ImportControls.tsx` → MOD-FEUI — Android SAF导入
- `src/components/settings/GeneralSettings.tsx` → MOD-FEUI — Android隐藏数据路径
- `src/stores/uiStore.ts` → MOD-STORE — 面板历史+goBack+selectedDate
- `src/i18n/zh.json` → MOD-I18N — 中文翻译(含 expense.newEntry)
- `src/i18n/en.json` → MOD-I18N — 英文翻译(含 expense.newEntry)
- `src-tauri/src/lib.rs` → MOD-CMD — mobile_entry_point+setup闭包+Arc<Mutex>
- `src-tauri/src/config.rs` → MOD-CONFIG — Android分支+resolve_db_path
- `src-tauri/src/db/mod.rs` → MOD-DB — init_db_at(路径参数)
- `src-tauri/src/commands/export_cmd.rs` → MOD-CMD — export_data_to_content async
- `src-tauri/src/commands/import_cmd.rs` → MOD-CMD — content模式 async+spawn_blocking
- `src-tauri/src/commands/config_cmd.rs` → MOD-CMD — set_db_path Android禁用
- `src-tauri/src/services/export_service.rs` → MOD-SVC — 内容模式导出(to_content/to_bytes)
- `src-tauri/gen/android/app/build.gradle.kts` → MOD-SIGN — signingConfigs+keystoreProperties
- `src-tauri/gen/android/keystore.properties` → MOD-SIGN — 签名凭证(git-ignored)
- `src-tauri/.cargo/config.toml` → — Android NDK linker/ar paths
- `src-tauri/tauri.conf.json` → — bundle.android + window config
- `vite.config.ts` → — android chrome105 target

## 10. 变更日志

相对于 v6.0 的变更:

- **变更**: MOD-FEUI/ExpenseForm — 日期选择和提交按钮移至支付来源下方（分类和备注移到提交按钮之后）
- **变更**: MOD-FEUI/ExpenseForm — 提交消费后日期保持选定值，不再强制重置为今天
- **变更**: MOD-I18N — 新增 `expense.newEntry` 翻译键（中文"添加记录"，英文"Add Record"），修复移动端 Tab 显示原始键名
- **变更**: MOD-FEUI/AppShell — 移动端容器添加 `paddingTop: env(safe-area-inset-top)` 避让状态栏
- **变更**: 版本号升级至 v0.2.1 (package.json / Cargo.toml / tauri.conf.json)

## 11. 快照元数据

- Snapshot version: v6.1
- Generated at: 2026-05-26 21:00 +08:00
- Language: zh
- Git commit: 6b207ba
- Git branch: main
- Project type: polyglot
- Previous version: v6.0
- Previous file: snapshot_archive/REPOSITORY_SNAPSHOT_v6.0_2026-05-26.md
