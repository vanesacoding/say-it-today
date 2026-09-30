# 今天怎么说 · Say It Today

一个手机优先的个人英语学习 PWA。它把现实生活中“想说但不会自然说”的中文，变成可以回答、朗读、跟读并按间隔复习的英语学习卡。

## 本地运行（Windows PowerShell）

```powershell
cd "C:\Users\熊晓\Documents\Codex\英语软件"
npm install
npm run dev
```

终端会显示本地地址，通常是 `http://localhost:5173`。

## 常用命令

```powershell
npm run dev       # 开发模式，本地 AI 自动使用 Mock
npm run check     # 检查复习算法与跟读相似度
npm run build     # 类型检查并生成生产包到 dist
npm run preview   # 本地预览生产包
```

## 配置豆包 API

复制环境变量模板：

```powershell
Copy-Item .env.example .env.local
```

填写：

```dotenv
DOUBAO_API_KEY=你的密钥
DOUBAO_MODEL=你的模型或推理接入点 ID
DOUBAO_BASE_URL=完整的兼容 Chat Completions 请求地址
MOCK_AI=false
```

`DOUBAO_BASE_URL` 故意不写死，因为豆包的接入地址和模型 ID 取决于你的火山方舟配置。密钥只由 `api/generate-cards.ts` 在服务端读取，不会进入前端代码、本地数据库或浏览器网络请求载荷。

## Mock 模式

- `npm run dev` 时，前端自动返回 Mock 卡片，因此无需启动 Serverless 环境。
- Vercel 环境中设置 `MOCK_AI=true`，Serverless API 也会返回 Mock 卡片。
- 改为真实豆包时，将 `MOCK_AI=false` 并配置上面的三个豆包变量。

## 部署

推荐导入到 Vercel：

1. 将项目推送到 Git 仓库并在 Vercel 导入。
2. Build Command 使用 `npm run build`，Output Directory 使用 `dist`。
3. 在项目环境变量中配置豆包变量；首次部署可只设 `MOCK_AI=true`。
4. 部署后，`/api/generate-cards` 会作为 Vercel Function 运行。

其他静态托管可以运行学习与离线功能，但 AI 生成功能需要同时托管 `api/generate-cards.ts` 或将该接口迁移到兼容的 Serverless 平台。

## 安装为 PWA

生产环境必须使用 HTTPS。部署后在手机浏览器打开：

- Android Chrome：菜单 → 添加到主屏幕 / 安装应用。
- iPhone Safari：分享 → 添加到主屏幕。

安装后会以竖屏独立窗口运行。首次打开完成资源缓存后，断网仍可使用已有卡片、学习、收藏和设置；AI 生成仍需联网。

## 当前 MVP

- 今日学习：选择题、答案、单一知识点、自评和简单间隔复习
- 10 个生活场景，内置 32 条高质量种子卡
- AI 单句与按场景批量生成，严格 JSON 校验，开发环境 Mock 可用
- 收藏、错题、AI 生成、已掌握、易混表达
- 原生英文朗读、0.8x / 1x；浏览器支持时提供跟读识别和文本相似度提示
- IndexedDB 本地持久化、JSON 导入导出、清空学习记录
- Manifest、Service Worker、离线缓存和安装图标

## 项目结构

```text
api/                    Vercel Serverless API
scripts/                最小可运行检查
public/                 PWA 图标
src/
  components/           学习卡、语音、导航、进度条
  data/                 场景和 32 条种子卡
  db/                   IndexedDB
  pages/                今日、场景、AI 生成、我的、设置
  prompts/              豆包提示词
  services/             AI 调用、Mock 和 Schema 校验
  types/                TypeScript 数据模型
  utils/                复习调度、跟读相似度
```

## 后续最值得扩展

接入你自己的豆包 endpoint 和 model ID 后，用真实输出连续生成 20～30 张卡，再根据实际内容微调 Prompt。等真实使用一段时间后，再决定是否需要更复杂的复习算法；当前阶段不需要账号、云同步或状态框架。
