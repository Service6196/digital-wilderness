# Digital Wilderness PRD

## 1. 文档信息
- 产品名称: Digital Wilderness
- 当前版本: v0.0.1
- 文档版本: v1.0
- 文档日期: 2026-02-13
- 技术栈: Astro 5 + React 19 + TailwindCSS 4 + Astro Content Collections

## 2. 产品愿景与定位
- 产品定位: 一个以中文为主、双语辅助的个人数字花园与作品展示站。
- 核心目标:
  - 沉淀长期内容: Journal / Works / Signals / Stack / Now / Manual。
  - 提供一致的沉浸式视觉语言与跨页面体验（主题、导航、音乐播放器、快捷搜索）。
  - 保证内容发布流程稳定，构建可持续、可维护。

## 3. 目标用户
- 访客用户:
  - 浏览作者思考、作品、阅读清单、当下状态。
  - 快速检索文章与标签内容。
- 作者本人:
  - 通过 `src/content/*` 持续发布内容。
  - 低成本维护页面结构与 API 能力。

## 4. 业务目标与成功指标
- 业务目标:
  - 稳定发布，`npm run build` 必须 100% 成功。
  - 关键页面首屏可访问、无阻断错误（500/渲染崩溃）。
  - 内容检索和跳转路径完整可用。
- 指标建议:
  - 构建成功率: 100%
  - 核心路由可访问率: 100%（`/`, `/journal`, `/works`, `/signals`, `/stack`, `/now`, `/manual`, `/search`, `/tags`）
  - 关键交互成功率: > 99%（主题切换、移动端菜单、命令面板、音乐播放）

## 5. 范围定义
### 5.1 本期范围（In Scope）
- 页面:
  - 首页、日志列表与详情、作品列表与详情、信号流、书房、当下、用户手册、搜索、标签页、404、dashboard、lab、about、uses。
- 内容系统:
  - `posts`, `works`, `signals`, `stack`, `now`, `manual` 六类 collection。
- 全局能力:
  - Header 导航、主题切换、全站命令面板、浮动音乐播放器、滚动与 reveal 动画。
- API:
  - `/api/music` + `/music-api` 兼容别名。

### 5.2 非本期范围（Out of Scope）
- 后台 CMS 交互式管理（当前以本地内容文件为主）。
- 用户登录、权限系统、评论系统。
- 全量埋点系统与实时看板（可后续补）。

## 6. 信息架构与路由
- 顶层导航:
  - `/` 索引
  - `/journal` 思考
  - `/works` 作品
  - `/signals` 信号
  - `/stack` 书房/工具
  - `/now` 当下
  - `/manual` 了解我
  - `/search` 搜索
- 动态路由:
  - `/journal/[...slug]`
  - `/works/[...slug]`
  - `/tags/[...tag]`
- 功能路由:
  - `/api/music`
  - `/music-api`
  - `/rss.xml`

## 7. 功能需求（按模块）
### 7.1 全局布局与导航
- `BaseLayout` 提供统一 head、主题初始化、Header、MusicPlayer、CommandPalette。
- 支持 Astro View Transitions 时主题状态保持。
- 移动端菜单可展开/关闭并锁定背景滚动。

### 7.2 内容展示
- Journal:
  - 列表页按发布日期倒序。
  - 支持分类过滤与空状态。
  - 详情页展示目录、阅读进度、标签、封面图。
- Works:
  - 列表页展示案例摘要。
  - 详情页基于 content 渲染正文。
  - 无效 slug 必须返回 404（或等价处理），不可抛 500。
- Signals:
  - 时间线样式，支持 markdown 渲染。
- Stack:
  - 基于 JSON 渲染书籍/工具卡片与进度。
- Now:
  - 加载最新状态并提供合理 fallback。
- Manual:
  - 依据 `order` 排序，按章节展示。

### 7.3 搜索与标签
- `/search` 客户端模糊搜索 title/description/category/tags。
- `/tags` 展示标签聚合；`/tags/<tag>` 展示该标签文章列表。
- 链接应指向有效文章路径，禁止无效 slug。

### 7.4 音乐播放器与 API
- MusicPlayer 支持:
  - 搜索、播放 URL 获取、歌词解析、热歌模式。
  - 页面切换状态持久化。
- `/api/music` 负责:
  - upstream 兼容与失败回退。
  - 参数校验与错误响应。
  - 缓存头与错误码一致性。

## 8. 数据模型与内容规范
- 数据来源: `src/content/*`
- 强校验约束:
  - 所有 `.json` 必须为 UTF-8 无 BOM、合法 JSON 对象。
  - 必填字段完整并符合 `content.config.ts` schema。
  - 动态路由依赖字段（slug/id）必须稳定可解析。
- 发布规范:
  - `draft` 内容在生产环境过滤。
  - 日期字段统一可被 `z.coerce.date()` 解析。

## 9. 非功能需求
- 性能:
  - 首屏关键页面避免阻塞脚本。
  - 重复事件监听需避免多次绑定。
- 可用性:
  - 移动端与桌面均可完成核心浏览路径。
- 可维护性:
  - 错误处理清晰，日志可定位。
  - 关键页面在构建阶段尽早暴露问题。

## 10. 验收标准（Definition of Done）
- 构建:
  - `npm run build` 成功，无 content parse error。
- 运行:
  - `npm run preview` 可启动且核心路径可访问。
- 页面:
  - 动态路由非法参数不出现 500。
  - `/tags` 与 `/tags/<tag>` 均可正常访问。
- 交互:
  - 主题切换、移动菜单、搜索、命令面板、音乐播放器可用。

## 11. 调试与优化计划
### 11.1 调试优先级
- P0（阻断）:
  - 构建失败（内容解析、类型错误、运行时崩溃）。
  - 动态路由导致 500。
- P1（高）:
  - 关键页面逻辑错误（空白页、死链、错误数据映射）。
- P2（中）:
  - 交互与体验问题（重复监听、轻微性能问题）。

### 11.2 优化方向
- 稳定性:
  - 增加动态路由 guard，兜底 404。
  - 统一内容数据健壮性处理（null/undefined/格式异常）。
- 代码质量:
  - 移除重复逻辑，减少事件重复绑定风险。
  - 关键脚本函数封装与命名规范化。
- 构建与发布:
  - 增加本地校验脚本（JSON BOM/字段检查）作为提交前步骤。

## 12. 测试策略
- 静态检查:
  - `npm run build`
- 运行检查:
  - `npm run preview`
- 页面回归（手动 + 浏览器自动化）:
  - 桌面: 首页 -> journal -> journal detail -> works -> works detail -> signals -> stack -> now -> manual -> search -> tags
  - 移动端: 菜单开关、主题切换、搜索输入、播放器交互
- API 验证:
  - `/api/music?action=search`
  - `/api/music?action=url`
  - `/api/music?action=lyrics`

## 13. 风险与依赖
- 外部依赖风险:
  - 音乐上游 API 不稳定、限流、响应结构漂移。
- 内容风险:
  - JSON 编码/BOM/字段不合规导致构建失败。
- 体验风险:
  - 多脚本初始化叠加造成事件重复绑定、状态错乱。

## 14. 里程碑（当前执行）
- M1: PRD 定稿（已完成）
- M2: 构建阻断问题清零（进行中）
- M3: 页面功能回归完成（待执行）
- M4: 优化与复盘报告输出（待执行）
