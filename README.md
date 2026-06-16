# FastCoin ⚡ 快捷记账

纯本地、加密安全的个人记账应用。支持 Windows / macOS / Linux 桌面端，响应式适配手机屏幕。

## 快速开始

### 环境要求

| 工具 | 版本要求 |
|------|---------|
| Node.js | >= 18 |
| Rust | >= 1.70 (MSVC 工具链) |
| Visual Studio Build Tools | 含 "C++ 桌面开发" 工作负载 |
| NSIS (v3.x) | Windows 构建安装包必需 (winget: `NSIS.NSIS`) |

### 开发运行（调试模式）

```bash
# 1. 安装前端依赖
npm install

# 2. 确保 NSIS 在 PATH 中（否则构建时跳过安装包生成）：
#    方法一（推荐）：安装时勾选 "Add to PATH"
#    方法二：手动添加 C:\Program Files (x86)\NSIS 到系统环境变量
makensis -VERSION  # 验证：应输出 v3.x

# 3. 启动开发模式
npx tauri dev
```

首次编译需要下载 Rust 依赖，约 3~5 分钟。后续热更新秒级生效。

### 构建桌面安装包

```bash
npx tauri build
```

构建产物：
- `src-tauri/target/release/fastcoin.exe` — 可直接运行的便携版
- `src-tauri/target/release/bundle/nsis/FastCoin_0.4.1_x64-setup.exe` — NSIS 安装包（推荐分发）
- `src-tauri/target/release/bundle/msi/FastCoin_0.4.1_x64_zh-CN.msi` — MSI 安装包（需安装 WiX Toolset v3）

### 构建 Android APK

#### 前置条件

| 工具 | 版本要求 | 安装方式 |
|------|---------|---------|
| Android SDK | API 34+ | 命令行工具或 Android Studio |
| Android NDK | r27+ | 通过 sdkmanager 安装 |
| JDK | 17+ | `winget install Microsoft.OpenJDK.17` |
| Rust Android targets | aarch64, armv7, x86_64 | `rustup target add` |
| Windows 开发者模式 | 必须开启 | 设置 → 开发者选项 |

#### 一次性设置

```bash
# 1. 安装 Android SDK 命令行工具（如果没有 Android Studio）
# 下载：https://developer.android.com/studio#command-line-tools-only
# 解压到 %LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\

# 2. 安装 SDK 组件
sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools" "ndk;27.0.12077973"

# 3. 设置环境变量
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set NDK_HOME=%ANDROID_HOME%\ndk\27.0.12077973
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot  # 根据实际安装路径调整

# 4. 添加 Rust Android 编译目标
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android

# 5. 初始化 Android 项目（仅首次）
npx tauri android init

# 6. 开启 Windows 开发者模式（设置 → 开发者选项），用于符号链接
```

#### 构建与运行

```bash
# 开发调试（连接 Android 设备或模拟器）
npx tauri android dev

# 构建 APK
npx tauri android build
```

构建产物：
- `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk`

> ⚠️ 上述产物为**未签名 APK**，Android 会拒绝安装。需按下方「签名配置」步骤生成签名后重新构建。

#### 签名配置

Release APK 必须经过数字签名才能安装。首次构建前需完成以下一次性配置：

**1. 生成密钥库**（使用 JDK 自带的 `keytool`）：

```bash
keytool -genkey -v \
  -keystore src-tauri/gen/android/app/fastcoin-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias fastcoin
```

按提示设置密码并记住，密钥库有效期为约 27 年。**务必妥善保管此文件**，丢失后将无法更新已安装的应用。

**2. 创建签名配置文件** `src-tauri/gen/android/keystore.properties`：

```properties
storeFile=fastcoin-release.jks
keyAlias=fastcoin
storePassword=你设置的密钥库密码
keyPassword=你设置的密钥密码
```

**3. 重新构建**：

```bash
npx tauri android build
```

构建产物将变为已签名的 `app-universal-release.apk`（文件名不再含 `unsigned`），可直接安装到手机。

> 注：`keystore.properties` 和 `fastcoin-release.jks` 已在 `.gitignore` 中排除，不会提交到版本库。

### 数据存储位置

| 系统 | 路径 |
|------|------|
| Windows | `%LOCALAPPDATA%\FastCoin\fastcoin.db` |
| macOS | `~/Library/Application Support/FastCoin/fastcoin.db` |
| Linux | `~/.local/share/FastCoin/fastcoin.db` |

数据为 SQLite 格式，加密备份文件（`.fastcoin`）通过 AES-256-GCM 保护。

### 手机端支持

Android APK 已支持原生运行。前端界面通过 TailwindCSS 响应式断点适配手机宽度（< 1024px 时自动切换为底部 Tab 导航、底部弹窗、放大触摸目标等）。桌面端和手机端功能完全一致。

---

## 使用指南

### 记账（核心功能）

```
┌──────────────────────────────────────┐
│  ¥ 25.50                 = 25.50 元  │  ← 金额显示区
│  [1] [2] [3]                         │
│  [4] [5] [6]     ← 数字键盘（手机）    │
│  [7] [8] [9]                         │
│  [.] [0] [⌫]                         │
│                                      │
│  💬 微信  🔵 支付宝  💵 现金   ← 支付来源 │
│                                      │
│  🍔 餐饮  🚗 交通  🛒 购物  ...  ← 分类  │
│                                      │
│  备注: 午餐外卖                        │
│                                      │
│  今天 | 昨天 | 前天 | 📅  ← 日期      │
│                                      │
│  [       记录 ¥25.50       ]  ← 提交  │
└──────────────────────────────────────┘
```

**操作流程：**
1. 输入金额（手机端用数字键盘，桌面端直接键盘输入）
2. 选择支付来源（微信/支付宝/银行卡/现金...）
3. 可选：选择分类、填写备注
4. 点击「记录消费」或按 `Ctrl+Enter`

提交后表单自动清空，可连续快速记账。

### 管理支付来源

进入 **设置 → 支付来源**：

- 点击 **+ 添加** 创建新来源（如 "工商银行卡"、"花呗"）
- 可自定义名称、类型、图标（Emoji）、颜色
- 点击 ✏️ 编辑，点击 🗑️ 软删除

内置默认来源：微信钱包 💬、支付宝 🔵、现金 💵

### 自定义记账周期

进入 **设置 → 记账周期**：

- 点击 **+ 添加**，设置任意起止日期
- 例如：`5.17 ~ 6.16` （不限于自然月）
- 点击「设为当前」切换活跃周期，统计数据实时刷新

### 查看统计报表

```
┌─────────────────────────────────────┐
│  财务统计               [5月消费▼]  │  ← 切换周期
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐ │
│  │周期总额│ │今日支出│ │日均消费│ │进度│ │  ← 统计卡片
│  │¥1,250│ │ ¥85  │ │ ¥52  │ │5/31│ │
│  └──────┘ └──────┘ └──────┘ └────┘ │
│                                     │
│  支付来源分布                        │
│  💬 微信  ████████░░  850.00  68%   │
│  🔵 支付宝 ███░░░░░░░  320.00  26%  │
│  💵 现金   █░░░░░░░░░   80.00   6%  │
│                                     │
│  消费趋势 📈 (折线图)                │
│  来源分布 🍩 (环形图)                │
└─────────────────────────────────────┘
```

### 数据导出

**加密备份（.fastcoin）**— 用于跨设备同步
1. 设置 → 导入导出 → 导出数据
2. 选择「加密备份」格式
3. 选择模式：
   - **完整导出**：导出所有数据，用于初始化另一台设备
   - **当日导出**：仅导出记账栏所选日期的消费数据
   - **当前周期导出**：仅导出当前活跃记账周期的消费数据
4. 设置密码 → 点击导出
5. 文件通过任意方式传输到另一台设备

**Excel / CSV**— 用于数据分析
1. 选择 Excel 或 CSV 格式
2. 无需密码，直接导出明文

### 数据导入

1. 设置 → 导入导出 → 选择文件（.fastcoin）
2. 输入导出时的密码
3. 点击「预览导入」查看差异：
   - 🟢 新增记录数
   - 🔵 更新记录数
   - ⚪ 不变记录数
4. 选择合并策略：
   - **合并（保留最新）**：逐条对比版本号，高版本覆盖低版本
   - **覆盖全部**：清空本地数据，完全替换

---

## 技术架构

```
React (UI)  ←→  Tauri IPC  ←→  Rust Backend
                                  ├── SQLite (数据存储)
                                  ├── AES-256-GCM (加密)
                                  └── rust_xlsxwriter (Excel导出)
```

- 金额以**整数分（cents）**存储，杜绝浮点精度误差
- 每条记录带 `version` 字段，支持增量同步冲突解决
- 加密密钥通过 PBKDF2 (600,000 次迭代) 从密码派生

## 项目结构

```
FastCoin/
├── src/                    # React 前端
│   ├── components/
│   │   ├── expense/        # 记账面板
│   │   ├── stats/          # 统计面板
│   │   ├── charts/         # 图表组件
│   │   ├── settings/       # 设置面板
│   │   ├── layout/         # 响应式布局
│   │   └── common/         # 通用 UI 组件
│   ├── stores/             # Zustand 状态管理
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # Tauri IPC 封装
│   ├── types/              # TypeScript 类型
│   └── i18n/               # 国际化
└── src-tauri/              # Rust 后端
    └── src/
        ├── db/             # SQLite 数据层
        ├── commands/       # Tauri 命令
        ├── services/       # 业务逻辑
        └── crypto/         # 加密模块
```
