# 叽咕一下 · 亲子分级共读 Alpha

本分支将旧版词卡首页替换为 **Come Back, Cat!**（Book Dash）共读体验。旧版代码和素材暂时保留在仓库，旧版主分支完整快照见备份分支 `backup/pre-jigu-reading-alpha-20261017`。

## 已完成
- 官方 12 幅绘本插画、原书封面和 Book Dash 官方标志，本地静态资源，不依赖外部图片镜像。
- 保留原书对应的英文正文（部分无文字页按无字页处理）；新增中文初稿、妈妈陪读提示。
- 今天 / 绘本介绍 / 妈妈准备 / 一起读 / 听故事 / 读完去玩 / 小书架 / 我的 / 版权说明。
- 前后翻页、键盘/滑动、中文开关、收藏、共读进度保存、重复共读。
- 在独立 HTML 的 Chromium 环境检查 375/390/430px 核心交互均通过。

## 尚未完成（不能宣传为正式上线）
- 英文音频目前为浏览器系统英语 TTS，**不是经过真人听审的原版正式配音**；不同手机存在音质差异。
- 中文翻译为编辑初稿，待人工逐页复核。
- 出版方网页列出作者、插画师和设计师，但未明示编辑姓名，仍需向 Book Dash 核对。
- 真人手机上音频、PWA离线缓存、真机安装尚未验收。
- 当前仅开放一本书，其他9本处于选书阶段。

## 原书来源与许可
- Book Dash: https://bookdash.org/books/come-back-cat/
- 原版正文: https://github.com/bookdash/bookdash-books/blob/gh-pages/come-back-cat/en/index.md
- CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
- 复用规范: https://bookdash.org/re-using-the-book-dash-content/
- 文字 Nicola Rijsdijk；插画 Karen Lilje；设计 Sam Scarborough；其他创作贡献 Book Dash volunteers（编辑署名待核实）。
- 叽咕的中文翻译、家长提示和UI均为追加内容，不代表 Book Dash 官方认可。

## 本地开发
```bash
npm ci
npm run check
npm run build
npm run dev
```

旧 src/ 下的代码暂存保留，避免破坏原用户数据。正式重构和迁移需另行确认。
