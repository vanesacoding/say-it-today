# 表达母题库

- 24 个主题，每个主题 25 条，共 600 条。
- 每主题固定 B1 5 条、B2 15 条、C1 5 条。
- `cards.json` 是发布资产；`themes.json` 是课程结构。
- 每条母题可以派生看图、中文提示、挖空、纠错和迁移表达，不需要复制五份内容。
- `imagePrompt` 只预留给后续批量制图；本批次不会自动生成 600 张图片。

生成：`ARK_API_KEY=... npm run content:generate`

检查：`npm run content:check`
