# 叽咕一下 · 亲子分级共读 Alpha

当前入口为《I Like to Read!》：原版插画、英文真人朗读和可持续开启的中文陪读模式。旧版词卡代码与素材暂存于仓库；旧版快照在 `backup/pre-jigu-reading-alpha-20261017`。

## 当前体验

- 今天 / 小书架 / 我的 / 竖屏阅读器 / 读完页 / 来源与授权。
- 八页原版插画，逐页或连续播放原版英文朗读；音频不可访问时，明确提示降级为设备朗读。
- 前后翻页、键盘与滑动、收藏、进度保存、重复共读；陪读开关跨页与刷新保留。
- 三个原书重点词：read（第1页）、asleep（第3页）、busy（第5页）。从书籍卡片或读完页进入，查看原图与中英文原句，播放对应的完整原版朗读句子。
- 读完去发现：邀请家人或玩偶听自己读家里的书；活动可选。

重点词帮助理解故事，无背诵、拼写、考试或强制任务。目前播放原句，未提供独立切词音频。

## 主题与分级

书籍字段包含 `primaryTheme`、`themeIds`、`tags`、`stageId`、`keywords` 与 `activity`。主主题必须包含在主题列表中；每本书只指定一个推荐共读阶段。这是叽咕的共读阶段，不等同于原出版方级别。

| 主题 ID | 展示名 |
| --- | --- |
| everyday | 我的每一天 |
| nature | 动物与自然 |
| discovery | 颜色与发现 |
| feelings | 情绪与朋友 |

阶段为 S1 看图听故事 / S2 重复句型 / S3 简单故事理解。《I Like to Read!》归入 everyday，推荐 S1，标签为家庭、阅读、日常活动。

目前只展示一本书的实际标签，不展示空分类或筛选器。后续多书阅读器与筛选仍需实现；本次先确定统一元数据。建议至少有四本书且出现两个以上可选主题/阶段后，再展示相应筛选。

## 本地开发与验证

```bash
npm ci
npm run check
npm run build
npm run dev
```

`reading:check` 覆盖陪读模式、收藏、重点词对应原图/原句、原句播放目标、退出停止、浏览单词不改变阅读进度、读完与再读。GitHub Actions 会下载授权音频，并在 CI 中验证 MP3 文件。

## 来源与许可

- 原书：https://storybookscanada.ca/stories/en/0087/
- 文字：Letta Machoga；插画：Wiehan de Jager。
- 英文朗读：Darshan Soni（Storybooks Canada / Global Storybooks）。
- 故事及相应朗读：CC BY 3.0，https://creativecommons.org/licenses/by/3.0/
- 音频项目：https://github.com/global-asp/gsn-audio
- 中文辅助、陪读建议与生活活动由叽咕追加，不代表原出版方官方内容或商业背书。

中文辅助仍需人工逐页复核；真人手机的音频、PWA 安装与离线缓存尚需验收。当前为 Alpha，不应宣传为已完成正式产品。
