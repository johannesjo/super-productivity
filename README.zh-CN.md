# Super Productivity

[English](README.md) | 简体中文

Super Productivity 是一款开源的个人任务管理与时间追踪应用。它把待办事项、
时间盒、专注计时、日程和工作日志放在同一个离线优先的工作流中，可运行于
Linux、Windows、macOS、Android、iOS 和浏览器。

项目坚持隐私与本地优先：无需注册账号，不收集分析或追踪数据；核心任务和
时间追踪功能可完全离线使用。只有在你主动配置同步或第三方集成时，数据才会
发送到相应服务。

## 主要功能

- 使用项目、标签、子任务和颜色组织个人任务
- 通过时间盒、时间追踪、工作日志和导出功能回顾投入
- 提供专注模式、番茄钟、休息提醒和抗拖延辅助
- 从日历以及 Jira、GitHub、GitLab、Trello、Gitea、Linear、
  OpenProject、ClickUp、Azure DevOps 等服务导入或关联任务
- 支持 WebDAV、Dropbox 等可选同步方式及本地备份
- 支持笔记、附件、项目书签、自定义主题和插件
- 桌面端、移动端和 Web 端共享主要功能，并可在无网络环境下工作

Web 版与桌面版的能力并不完全相同，具体差异请参阅
[Web App 与桌面版对比](https://github.com/super-productivity/super-productivity/wiki/3.05-Web-App-vs-Desktop)。

## 获取应用

- 在线使用：[app.super-productivity.com](https://app.super-productivity.com)
- 安装包与各平台说明：
  [Downloads and Install](https://github.com/super-productivity/super-productivity/wiki/2.01-Downloads-and-Install)
- 项目主页：[super-productivity.com](https://super-productivity.com)

## 技术栈

- Angular：前端界面与应用逻辑
- NgRx：主要应用状态管理
- Electron：Linux、Windows 和 macOS 桌面应用
- Capacitor：Android 和 iOS 应用
- TypeScript：主开发语言
- npm workspaces：共享协议、同步、插件 API 和相关子包

## 仓库结构

```text
.
├── src/                      # Angular 主应用
│   ├── app/features/         # 任务、项目、计划、专注等业务功能
│   ├── app/core/             # 平台、持久化、通知等核心能力
│   ├── app/op-log/           # 操作日志与同步逻辑
│   ├── app/plugins/          # 应用内插件基础设施
│   └── assets/               # 翻译、图标和主题资源
├── electron/                 # Electron 主进程与预加载脚本
├── android/                  # Android 原生工程
├── ios/                      # iOS 原生工程
├── packages/                 # 共享包、插件开发和 SuperSync 服务
├── e2e/                      # Playwright 端到端测试
├── docs/                     # Wiki、架构和开发文档
├── build/                    # 图标及各平台打包配置
└── tools/                    # 构建、检查与发布脚本
```

## 开发环境

需要 Git、Node.js 22.18.0（以仓库 `.nvmrc` 为准）和 npm。首次准备：

```bash
git clone https://github.com/super-productivity/super-productivity.git
cd super-productivity
nvm use
npm ci
npm run env
```

如果没有使用 nvm，请安装 `.nvmrc` 指定的 Node.js 版本。常用启动方式：

```bash
# 启动 Web 开发服务器
npm run startFrontend

# 另开终端启动 Electron 桌面壳
npm start
```

Web 开发服务器默认可通过
[http://127.0.0.1:4200](http://127.0.0.1:4200) 访问。

## 检查与测试

```bash
npm run checkFile <文件路径>  # 检查单个 TypeScript 或 SCSS 文件
npm run lint                  # 全量代码检查
npm run test:file <spec路径>  # 运行单个单元测试文件
npm test                      # 运行全部单元测试
npm run e2e                   # 运行常规端到端测试
```

涉及同步、操作日志或 E2E 的改动，请先阅读
[AGENTS.md](AGENTS.md) 及其链接的专项文档。

## 编译可安装程序

先完成依赖安装，然后为当前操作系统执行：

```bash
npm run dist
```

构建结果写入 `.tmp/app-builds/`。完整的 `dist` 命令会运行项目规定的检查和
测试；只想在已经完成检查后重新打包，可先构建应用，再调用
`electron-builder` 选择目标格式。

### Linux

Linux 安装包必须包含 Wayland 空闲检测辅助程序，因此打包前还需要安装
Rust/Cargo。缺少 Cargo 时前端仍可编译，但 `electron-builder` 会拒绝生成
功能不完整的 Linux 包。

```bash
npm run buildAllElectron:noTests:prod
npx electron-builder --linux deb AppImage --publish never
```

常见产物：

- `.deb`：适用于 Debian、Ubuntu 及其衍生发行版
- `.AppImage`：无需系统安装，赋予执行权限后即可运行
- `.rpm`：适用于 Fedora、RHEL 及其衍生发行版
- `.snap`：适用于已安装 Snap 的发行版

安装本地 DEB：

```bash
sudo apt install ./.tmp/app-builds/superProductivity-*.deb
```

运行 AppImage：

```bash
chmod +x .tmp/app-builds/superProductivity-*.AppImage
./.tmp/app-builds/superProductivity-*.AppImage
```

### Windows

建议在 Windows 环境中执行：

```powershell
npm run dist:win
```

默认生成 NSIS 安装程序和便携版。未签名的本地构建可能触发 Windows
SmartScreen 提示；正式发布包的签名由项目发布流程处理。

### macOS

建议在 macOS 环境中执行：

```bash
npm run buildAllElectron:noTests:prod
npx electron-builder --mac --publish never
```

本地构建通常没有项目正式发布所需的签名和公证凭据，因此系统可能阻止直接
打开。签名、公证和 Mac App Store 构建应使用项目维护者的发布流程。

### Android

Android 生产构建需要可用的 JDK、Android SDK 和签名配置：

```bash
npm run dist:android:prod
```

Android 工程和离线准备说明位于 [android/](android/)。

## 参与贡献

提交改动前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 和
[AGENTS.md](AGENTS.md)。项目尤其重视：

- 避免功能膨胀，优先解决真实且明确的问题
- 保持安静、可适应的个人深度工作体验
- 隐私与离线优先，不添加分析、追踪或遥测
- 不破坏同步兼容性、已有本地数据和旧客户端
- UI 文案使用翻译系统；新增英文文案只编辑 `src/assets/i18n/en.json`

问题反馈、功能讨论和使用帮助请前往
[GitHub Discussions](https://github.com/super-productivity/super-productivity/discussions)
或 [GitHub Issues](https://github.com/super-productivity/super-productivity/issues)。

## 许可证

本项目使用 [MIT 许可证](LICENSE)。
