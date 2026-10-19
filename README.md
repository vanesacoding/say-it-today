# 叽咕一下 · 20本亲子分级共读 Alpha

当前小书架包含20本完整英文绘本、四大主题和S1/S2/S3共读阶段。所有书均保留原版插画与英文正文，并追加中文辅助、持续在线的陪读模式、三个原书重点词和可选生活活动。

## 内容与朗读

- 20本、217个正文页，S1 7本 / S2 6本 / S3 7本；阶段为叽咕编辑判断，不直接等同原平台Level。
- 7本来自African Storybook / Storybooks Canada，沿用明确标注CC BY 3.0或4.0的图文及原版英文真人朗读。
- 13本来自Book Dash官方HTML书库，图文按CC BY 4.0复用。每本的实际朗读类型和来源记录在目录中；仅在整本有字页均通过音频校验后更新为固定AI配音。
- 已确认的豆包试听采用“天才童声2.0”（seed-tts-2.0，语速-8、自然音调）。每个有文字的页面对应独立MP3，无字页保留看图停顿；界面和来源页均标明AI合成。此前的Isla试配不是经平台标注的童声。
- 本批未使用CC BY-NC版本，也未使用许可范围不明确的第三方配音。中文为编辑初稿，仍应持续复核。
- 每本详情和阅读器都能查看实际来源、创作者与许可。Book Dash书籍展示原出版方标志，并说明叽咕的翻译与界面改编。

## 多书交互

- 小书架按主题与阶段组合筛选；空组合可以重置，不展示虚构内容。
- 每本书独立保存阅读进度、收藏和完成状态；最近阅读、收藏卡片可继续阅读。
- 首次访问会迁移旧版《I Like to Read!》的进度、收藏与陪读偏好，不修改旧存储键。
- 支持前后翻页、键盘、轻扫、逐页或连续播放、重复共读和无字页。
- 重点词匹配原文页；浏览重点词不改变共读进度，关闭/换书时停止音频。

## 数据与素材

`public/books/catalog.js` 是完整内容目录，保存书籍与逐页来源。图片、真人音频和已完成的AI配音由 `scripts/fetch-reading-library.py` 下载到忽略跟踪的 `public/books/library/`，本地和CI使用相同清单及文件签名校验。AI配音额外核对音频SHA256及生成时的英文正文摘要。部署后的图片与音频均由本站提供。

`node scripts/prepare-reading-audio.mjs` 生成剩余待配音页面清单，不调用收费服务。制作记录保存在忽略跟踪的 `.reading-audio/`；`python3 scripts/import-reading-audio.py LEDGER BOOK_ID` 仅在一本书的全部朗读页已完成、文本完全匹配、MP3可完整解码且非静音后，才原子更新目录。工具不读取或保存API密钥，二进制音频不提交到公开源码仓库。

素材按书籍ID与正文页编号映射。Storybooks Canada源站01为封面，正文从02开始；Book Dash HTML按正文图与相邻原文配对，保留无字页。

PWA预缓存界面和目录；书籍媒体按阅读需求缓存，避免首次打开下载全部绘本。

## 开发与验证

整批制作：更新 `scripts/doubao-production-request.json` 后合入main，或手动运行 `Doubao reading production`。固定为已确认的13本、150段、9252字符；逐页保存请求ID、正文摘要、音频摘要和服务返回用量，失败不自动重试，完整/部分结果均保留为artifact。全部音频解码及非静音检查、阅读流程测试、生产构建通过后才部署。音频使用内容摘要文件名，部署成功后在源码中持久保存目录；后续部署从本站下载并按SHA256核验，避免重复调用语音服务。源码仓库不包含音频二进制和API密钥。

豆包语音试听：在仓库 Actions secrets 中配置 `DOUBAO_SPEECH_API_KEY`（新版豆包语音控制台的 API Key），手动运行 `Doubao reading audition`。默认使用官方音色ID `zh_male_tiancaitongsheng_uranus_bigtts`，生成与此前相同的三段原文，语速-8、自然音调；仅用于试听，尚未确认其英文效果。工作流使用固定的官方HTTP接口、不开自动重试，不输出密钥，生成后验证MP3解码与非静音，并上传仅含音频、署名和非敏感元数据的artifact。它不修改线上书籍目录，也不自动开始整批收费制作。`python3 scripts/doubao-reading-audition.py --dry-run` 可离线查看源文和请求参数。

```bash
npm ci
python3 scripts/fetch-reading-library.py
npm run check
npm run build
npm run dev
```

`reading:check` 覆盖20本的所有正文页、中文提示、重点词、不同页数的结束与再读、主题/阶段筛选、独立进度/收藏、刷新恢复、旧数据迁移，以及真人、固定AI、设备三种朗读。新增录音路径、远端及设备回退、明确AI署名、无字页连续播放检查。CI要求所有声明的媒体存在，并校验AI音频及对应正文的摘要。

浏览器和真机的画面、设备语音质量、PWA安装仍需实际体验；设备语音取决于操作系统。本项目仍为Alpha。

## 来源

- https://storybookscanada.ca/stories/en/
- https://github.com/global-asp/gsn-audio
- https://bookdash.github.io/bookdash-books/
- https://bookdash.org/re-using-the-book-dash-content/
- 各书具体来源、署名和许可见目录及应用内来源说明。
