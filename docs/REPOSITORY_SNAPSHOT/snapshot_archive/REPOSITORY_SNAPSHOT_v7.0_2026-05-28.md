---
snapshot_version: v7.0
generated_at: 2026-05-28 02:00 +08:00
language: zh
git_commit: 764ea38
git_branch: main
project_type: polyglot
previous_version: v6.3
previous_file: REPOSITORY_SNAPSHOT_v6.3_2026-05-27.md
line_budget: 300
---

## TL;DR

FastCoin 是一个纯本地、加密安全的个人快捷记账跨平台应用，使用 Tauri 2 (Rust) + React 18 (TypeScript) 构建，支持 Windows/macOS/Linux 桌面端及 Android 原生 APK（已配置 Release 签名）。支持三栏可拖拽布局（手机端 Tab 切换）、深色/浅色主题、中英文双语、自定义记账周期、可视化统计、AES-256-GCM 加密导入导出（完整/当日/当前周期）、Excel/CSV 导出、path.cfg 指针架构、Android SAF 内容模式导入导出、移动端安全区域避让、金额上限校验、记录展开详情、备注历史快选。数据存储在本地 SQLite，不依赖网络。v0.3.2 修复了 Android 端"完整导出"和"当日导出"因 fs 插件路径作用域不匹配导致的"forbidden path"错误。

## 1. 项目概览

- **名称 / 版本**: `fastcoin` v0.3.2 (from `package.json` / `Cargo.toml`)
- **技术栈**: TypeScript (React 18 + Vite 6 + TailwindCSS 3.4 + Zustand 4 + Recharts 2 + i18next) + Rust (Tauri 2 + rusqlite + aes-gcm + chrono + rust_xlsxwriter + base64ct)
- **仓库布局**:

```
FastCoin/
├── src/              # React 前端 (组件、stores、types、utils、i18n、IPC、platform)
├── src-tauri/        # Rust 后端 (db、commands、services、crypto、config)
│   ├── capabilities/ # Tauri 插件权限声明 (含 fs:scope-app-recursive)
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
  - 前端: `src/main.tsx` → `src/App.tsx` → `AppShell.tsx` (100dvh 视口 + popstate 返回键 + 移动端 safe-area 避让 + overflow-y-auto)
  - 后端: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs` (`#[cfg_attr(mobile, mobile_entry_point)]` + setup 闭包初始化 DB)
  - 启动: `npx tauri dev` / `npx tauri build` / `npx tauri android dev` / `npx tauri android build`
- **运行时配置**:
  - 前端: `vite.config.ts` (端口 1420, android→chrome105 target)
  - 后端: `src-tauri/tauri.conf.json` (窗口 1200x800, bundle.android 配置)
  - 权限: `src-tauri/capabilities/default.json` (windows: ["main", "*"], 含 fs:scope-app-recursive + fs:allow-read-text-file/read-file/write-text-file/write-file/remove)
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
- **关键文件**: `AppShell.tsx` (100dvh+popstate返回键+safe-area避让+overflow-y-auto), `ExpensePanel.tsx` (手机端Tab切换), `ExpenseForm.tsx` (金额上限校验MAX_AMOUNT_CENTS+备注历史记录), `ExpenseRow.tsx` (点击展开支付来源/日期/完整备注), `NoteInput.tsx` (前3条备注预览+折叠展开快选), `Modal.tsx` (手机端底部弹窗), `ExportControls.tsx` (Android内容模式导出，绕过fs插件作用域), `ImportControls.tsx` (Android SAF+无扩展名过滤), `GeneralSettings.tsx` (Android隐藏DataPathSetting)
- **依赖模块**: MOD-STORE, MOD-TAURI-IPC, MOD-PLATFORM, MOD-FORMAT, MOD-TYPES, MOD-I18N

### MOD-STORE: 状态管理

- **路径**: `src/stores/`
- **职责**: Zustand slices — UI 状态、面板导航历史、消费缓存、全局刷新、设置缓存、备注历史
- **关键文件**: `uiStore.ts` (面板宽度/Toast/移动Tab/selectedDate/panelHistory+goBack), `expenseStore.ts`, `dataStore.ts`, `settingsStore.ts`, `noteHistoryStore.ts` (备注历史localStorage持久化, 去重LRU, 上限20条)
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
- **公开接口**: ~33 个 async 函数 (CRUD + getStats + exportData + exportDataToTemp + exportDataToBytes + exportDataToContent + importPreview/Confirm + config 路径命令)
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
- **关键文件**: `config_cmd.rs` (set_db_path/reset_db_path Android 禁用), `export_cmd.rs` (export_data + export_data_to_content + export_data_to_temp + export_data_to_bytes async + spawn_blocking), `import_cmd.rs` (import_preview/import_confirm async + spawn_blocking)
- **依赖模块**: MOD-SVC, MOD-CONFIG

### MOD-SVC: 业务逻辑

- **路径**: `src-tauri/src/services/`
- **职责**: 统计计算、导出(文件+内容模式)、导入 diff + 合并、金额校验
- **关键文件**: `export_service.rs` (gather_full/date/period + export_to_fastcoin/csv/xlsx + content模式 + xlsx_to_bytes), `import_service.rs` (事务+外键排序+until_version), `stats_service.rs`, `expense_service.rs` (MAX_AMOUNT_CENTS=9_999_999_999 校验 + 正数校验)
- **依赖模块**: MOD-DB, MOD-CRYPTO

### MOD-CRYPTO: 加密模块

- **路径**: `src-tauri/src/crypto/`
- **职责**: AES-256-GCM + PBKDF2(600K) 认证加密
- **关键文件**: `key.rs` (derive_key, 600K iter), `encrypt.rs`, `decrypt.rs`

### MOD-UTIL: 工具函数

- **路径**: `src-tauri/src/utils/`
- **职责**: 统一错误类型 (AppError 含 Validation 变体 + XlsxError 转换)、金额格式化
- **关键文件**: `error.rs`, `format.rs`

### MOD-SIGN: Android 签名配置

- **路径**: `src-tauri/gen/android/`
- **职责**: Release APK 数字签名，使 Android 允许安装
- **关键文件**: `keystore.properties` (签名凭证，git-ignored), `app/fastcoin-release.jks` (RSA 2048 密钥库，git-ignored), `app/build.gradle.kts` (signingConfigs + keystoreProperties 读取)
- **依赖模块**: 无 (构建时配置)

## 4. 核心工作流

**记账 + 即时同步**:
1. MOD-FEUI/ExpenseForm 输入 → 前端金额上限校验(MAX_AMOUNT_CENTS) → MOD-STORE/expenseStore.addExpense() → MOD-TAURI-IPC
2. MOD-CMD → MOD-SVC 金额正数+上限校验 → SQLite → MOD-STORE/dataStore.triggerRefresh() → 组件实时刷新
3. 提交后日期保持用户选定值不变；备注写入 MOD-STORE/noteHistoryStore

**Android 导出 (内容模式)**:
1. MOD-FEUI/ExportControls 调用 dialog.save() → SAF content URI
2. MOD-TAURI-IPC/exportDataToBytes → MOD-CMD/export_data_to_bytes (async + spawn_blocking) → MOD-SVC 在内存中生成导出内容，base64 编码返回
3. 前端 atob 解码 → new Uint8Array → writeFile 写入 SAF URI（ContentResolver 绕过 fs 插件作用域检查）

## 5. 数据模型与存储

- **实体**: Expense, PaymentSource, Category, AccountingPeriod, AppSettings (singleton, 含 theme/locale/defaultCurrency/last_exported_version/last_imported_version), DeletionLog
- **存储**: SQLite WAL 模式; 桌面端 path.cfg 指针 → config.json; Android 端 Tauri app_data_dir 自动解析; 复合索引 (date,source_id) + (version); localStorage: fastcoin-note-history (备注历史, JSON)
- **迁移**: `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN last_imported_version` (idempotent)

## 6. 外部依赖与服务

- **第三方 API**: 无 (纯本地)
- **架构级依赖包**:
  - 前端: `react@18.3`, `zustand@4.5` (含 persist middleware), `recharts@2.13`, `date-fns@3.6`, `tailwindcss@3.4`, `i18next`, `@tauri-apps/api@2.2`, `@tauri-apps/plugin-dialog@2.2`, `@tauri-apps/plugin-fs@2.2`
  - 后端: `tauri@2.11`, `tauri-plugin-dialog@2`, `tauri-plugin-fs@2`, `rusqlite@0.31`, `aes-gcm@0.10`, `pbkdf2@0.12`, `rust_xlsxwriter@0.77`, `base64ct@1`
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
  - 金额 = i64 cents, 上限 9_999_999_999 (99,999,999.99元); Android 内容模式命令为 async + `spawn_blocking`
  - `AppState.db` 为 `Arc<Mutex<Connection>>`; `AppState.data_dir` 为 `PathBuf`
  - Android 上 `set_db_path`/`reset_db_path` 被条件编译禁用
  - 手机端 Modal 为底部弹窗; ExpensePanel 为 Tab 切换; 触摸目标 >= 44px
  - 导出模式: full / date / period; 仅 full 更新 last_exported_version
  - Android 导出走内容模式 (export_data_to_bytes + writeFile)，绕过 fs 插件作用域限制
  - export_data_to_temp 保留但仅作备用（写入 app_data_dir/tmp，fs 插件在 Android 上无法读取）
  - Android 签名凭证在 keystore.properties（git-ignored），无此文件则 release APK 未签名
  - MOD-STORE/noteHistoryStore 上限 20 条，persist 到 localStorage key `fastcoin-note-history`
  - MOD-FEUI/SpendingTrendChart Y轴手机端使用K/M缩写格式 (>=1K/10K/1M)，无负left margin
  - MOD-FEUI/SourceDistribution 容器高度动态计算，cy上移，Legend有wrapperStyle
  - capabilities/default.json 包含 `fs:scope-app-recursive` 权限（全局作用域，防御性）
- **性能 / 安全热点**:
  - PBKDF2 600K 迭代已移至 spawn_blocking 后台线程（Android 内容模式命令）
  - 桌面端 export_data/import_preview/import_confirm 仍为同步（主线程）
  - `set_db_path` 执行 WAL checkpoint + 文件拷贝，大数据库迁移耗时
  - export_data_to_bytes 返回 base64 编码内容，数据量较大时需关注 IPC 消息大小（个人记账场景通常在安全范围内）

## 9. 文件路径索引

- `src/components/charts/SourceDistribution.tsx` → MOD-FEUI — 动态高度+图例布局
- `src/components/charts/SpendingTrendChart.tsx` → MOD-FEUI — Y轴K/M缩写+零left margin
- `src/components/common/Modal.tsx` → MOD-FEUI — 手机端底部弹窗
- `src/components/expense/DateQuickSelect.tsx` → MOD-FEUI — 日期快选+日期选择器
- `src/components/expense/ExpenseForm.tsx` → MOD-FEUI — 金额上限校验+备注历史记录
- `src/components/expense/ExpensePanel.tsx` → MOD-FEUI — 手机端Tab切换
- `src/components/expense/ExpenseRow.tsx` → MOD-FEUI — 点击展开支付来源/日期/完整备注
- `src/components/expense/NoteInput.tsx` → MOD-FEUI — 前3条预览+折叠快选
- `src/components/layout/AppShell.tsx` → MOD-FEUI — 100dvh+popstate返回键+overflow-y-auto
- `src/components/settings/ExportControls.tsx` → MOD-FEUI — Android内容模式导出(base64→SAF)
- `src/components/settings/ImportControls.tsx` → MOD-FEUI — Android SAF导入(无扩展名过滤)
- `src/components/stats/StatsDashboard.tsx` → MOD-FEUI — 来源名称title tooltip
- `src/i18n/en.json` → MOD-I18N — 英文翻译
- `src/i18n/zh.json` → MOD-I18N — 中文翻译
- `src/lib/platform.ts` → MOD-PLATFORM — isAndroid/isMobile 检测
- `src/lib/tauri.ts` → MOD-TAURI-IPC — 类型安全 IPC (~33 API, 含 exportDataToBytes)
- `src/stores/noteHistoryStore.ts` → MOD-STORE — 备注历史localStorage持久化
- `src/stores/uiStore.ts` → MOD-STORE — 面板历史+goBack+selectedDate
- `src-tauri/capabilities/default.json` → — ACL权限(含 fs:scope-app-recursive)
- `src-tauri/src/commands/export_cmd.rs` → MOD-CMD — export_data + export_data_to_contents + export_data_to_temp + export_data_to_bytes
- `src-tauri/src/config.rs` → MOD-CONFIG — Android分支+resolve_db_path
- `src-tauri/src/db/mod.rs` → MOD-DB — init_db_at(路径参数)
- `src-tauri/src/lib.rs` → MOD-CMD — mobile_entry_point+setup闭包+Arc<Mutex>+data_dir
- `src-tauri/src/services/expense_service.rs` → MOD-SVC — MAX_AMOUNT_CENTS校验
- `src-tauri/gen/android/app/build.gradle.kts` → MOD-SIGN — signingConfigs+keystoreProperties
- `vite.config.ts` → — android chrome105 target

## 10. 变更日志

相对于 v6.3 的变更:

- **新增**: MOD-CMD/export_data_to_bytes — 异步命令，Rust 端在内存中生成导出内容并以 base64 字符串返回，绕过 Android fs 插件对 app_data_dir 临时文件的作用域拒绝问题
- **新增**: MOD-TAURI-IPC/exportDataToBytes — 前端 IPC 封装，返回 `Promise<string>` (base64)
- **变更**: MOD-FEUI/ExportControls — Android 导出流程从临时文件模式 (exportDataToTemp + readFile + writeFile + remove) 重写为内容模式 (exportDataToBytes + atob 解码 + writeFile)；移除 readTextFile/readFile/remove 的 fs 插件导入
- **变更**: MOD-CMD ACL — capabilities/default.json 新增 `fs:scope-app-recursive` 权限，为所有 fs 插件命令提供防御性全局作用域
- **版本**: v0.3.1 → v0.3.2

## 11. 快照元数据

- Snapshot version: v7.0
- Generated at: 2026-05-28 02:00 +08:00
- Language: zh
- Git commit: 764ea38
- Git branch: main
- Project type: polyglot
- Previous version: v6.3
- Previous file: REPOSITORY_SNAPSHOT_v6.3_2026-05-27.md
