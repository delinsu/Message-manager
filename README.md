# 🔐 SubTrack: 隐私至上、零成本的订阅管理方案

SubTrack 是一个基于 GitHub Actions 和网页加密技术的轻量级订阅管理工具。它旨在解决付费订阅项目多、到期提醒难、隐私易泄露的问题。

## ✨ 核心特性

- 🔒 **极致隐私**：数据在浏览器端使用 AES-256 加密。GitHub 仓库中只存储加密后的乱码，即便仓库泄露，数据也无法被破解。
- 💰 **零成本运行**：利用 GitHub Pages 托管 UI，GitHub Actions 执行自动化逻辑，完全免费。
- 📱 **即时推送**：对接 Bark 推送服务，在扣费前 3 天、1 天及当天通过 iOS 弹窗提醒。
- 🛠️ **专业管理**：自带美观的 Web 管理界面，支持添加、删除、自动计算剩余天数。
- ⚙️ **无数据库**：无需数据库，GitHub 存储桶即数据库。

## 🚀 快速上手 (一键部署)

### 1. 准备工作
- 准备一个 [Bark](https://day.app/2018/06/bark-server-is-open-source-now/) 的推送 URL（iOS 用户）。
- 生成一个具有 `contents:write` 权限的 [GitHub Personal Access Token (PAT)](https://github.com/settings/tokens)。

### 2. 部署步骤
1. **点击 "Use this template"** 或 Fork 本仓库。
   - **注意：生成的仓库请务必设置为 `Private` (私有)，以保证数据安全。**
2. **配置 Secrets**：
   - 进入仓库 `Settings -> Secrets and variables -> Actions`。
   - 点击 `New repository secret` 添加：
     - `MASTER_KEY`: 设置你的主加密密钥（用于网页和 Actions 脚本加解密）。
     - `BARK_URL`: 你的 Bark 推送地址（如 `https://api.day.app/XXX/`）。
3. **启用 GitHub Pages**：
   - 进入 `Settings -> Pages`，将 `Branch` 设置为 `main`。
   - 稍等片刻，你将获得一个管理端的访问地址。

### 3. 开始管理
- 打开你的 Pages 地址。
- 在左侧侧边栏填入你的 **Token**、**仓库路径** 和 **Master Key**。
- 添加你的第一个订阅，点击 **“加密并同步至 GitHub”**。

## 🛠️ 技术架构

1.  **管理端 (Frontend)**: Vue 3 + Tailwind CSS + CryptoJS。负责在浏览器本地进行 AES 加密，通过 GitHub API 存取加密文件。
2.  **存储 (Storage)**: 以 `.json.enc` 格式存储在私有仓库中。
3.  **计算与推送 (Backend)**: Python 脚本运行于 GitHub Actions。每天定时解密数据，匹配日期并下发推送请求。

## 🔒 隐私声明

本项目严格遵循“明文不落地”原则：
- 本地配置（Token、Key）仅保存在你浏览器的 `localStorage`。
- 上传到云端的所有订阅明文均经过 AES 加密。
- 除非你的 `MASTER_KEY` 被泄露，否则任何人都无法查看你的订阅服务明文。

## 📝 贡献建议

欢迎提交 Issue 或 Pull Request。你可以通过增加更多的推送通道（如 Telegram Bot, Gotify）来丰富本项目。

---
*制作不易，如果觉得好用，请给个 Star ⭐️ 支持一下！*
