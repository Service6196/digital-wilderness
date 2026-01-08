# 产品需求文档 (PRD) - THE FRAME 前端架构规范

| 文档版本           | V1.0                                             |
| ------------------ | ------------------------------------------------ |
| **项目名称** | THE FRAME (个人数字化策展空间)                   |
| **技术栈**   | Native HTML5, CSS3 (CSS Variables), Vanilla ES6+ |
| **核心理念** | 结构主义、响应式、无依赖(Zero-Dependency)        |

## 1. 架构总述 (Executive Summary)

本架构旨在构建一个**"反脆弱"**的静态前端系统。它拒绝沉重的框架依赖，回归 Web 标准本身，以换取极致的加载速度（Lighthouse 评分 98+）和长达 5-10 年的代码生命周期。

系统采用 **Atomic Design (原子设计)** 理念，将页面拆解为独立的、可复用的组件。样式控制通过 **Design Tokens (CSS 变量)** 集中管理，确保视觉的一致性与后续维护的便捷性。

## 2. 核心数据结构与内容替换指南

虽然目前为静态渲染，但代码遵循严格的数据结构。您可以通过修改 HTML 标签内的文本轻松更换内容。

### 2.1 核心数据模型 (Data Schema)

如果您计划接入后台，以下是前端组件对应的隐性数据结构：

#### A. 文章卡片 (Journal Item)

在代码中对应 `.grid-item` 结构：

* **ID** : (隐含)
* **Cover Image** (`src`): 16:10 比例图片 (推荐 1200x800px)
* **Category** (`.item-meta`): 类别 / 序号 (例如: "PHILOSOPHY / 01")
* **Title** (`.item-title`): 标题文本 (推荐 15-25 字)
* **Summary** (`p`): 简短摘要 (推荐 30-50 字)
* **Link** (`href`): 详情页跳转链接

#### B. 实验室项目 (Lab Item)

在代码中对应 `.lab-card` 结构：

* **Icon** (`data-lucide`): 图标名称 (参考 Lucide Icon 库)
* **Code** (`.font-mono`): 项目编号 (例如: "EXP_082")
* **Name** (`h4`): 项目名称

### 2.2 如何更换内容

1. **更换文字** ：直接搜索 HTML 中的中文文本（如“为什么极简主义...”）并替换。
2. **更换图片** ：找到 `<img>` 标签，修改 `src="URL"` 中的 URL 链接。
3. **更换图标** ：找到 `<i data-lucide="name">`，将 `name` 替换为其他 Lucide 图标名（如 `camera`, `pen-tool`）。

## 3. 设计系统 (Design System Implementation)

系统视觉由 CSS 变量 (`:root`) 全局接管，这是整个网站的“控制台”。

### 3.1 令牌 (Design Tokens)

* **色彩系统** :
* `--bg / --text`: 智能适配深色模式 (Dark Mode)，自动跟随系统。
* `--accent`: 交互强调色 (当前为国际克莱因蓝 `#0055ff`)，修改一处即可改变全站按钮和高亮风格。
* `--grid-line`: 网格线颜色，控制页面“结构感”的强弱。
* **排版系统** :
* `--font-main`: **Inter** (用于正文与大标题，理性、中立)。
* `--font-mono`: **IBM Plex Mono** (用于元数据、日期、标签，营造工业代码感)。

### 3.2 布局系统 (The Grid)

* **Bento Grid (便当盒布局)** :
* 核心类名：`.bento-grid`
* 逻辑：12 列网格系统 (`grid-template-columns: repeat(12, 1fr)`)。
* **灵活性** ：通过修改子元素的 `grid-column: span X` 属性，可以随意改变卡片占据的宽度（目前预设了 6/6, 4/8 两种组合）。

## 4. 交互与动效规范 (Interaction & Motion)

前端集成了轻量级 JS 逻辑，用于增强“高级感”体验，非装饰性，而是为了提供物理反馈。

### 4.1 滚动视差 (Parallax Scroll)

* **对象** : 英雄区标题 (`.hero-title`) 与 标签 (`.hero-tag`)。
* **逻辑** : 监听 `window.scroll`，计算偏移量。
* 标题：Y轴向下移动 + 轻微 X 轴倾斜 (Skew)，模拟物体重量感。
* 标签：X轴横向位移，制造层次错位。

### 4.2 渐入揭示 (Scroll Reveal)

* **技术** : `IntersectionObserver` API (性能极佳，不占用主线程)。
* **表现** : 元素进入视口 10% 时，触发 `opacity: 1` 和 `translateY(0)`。
* **类名** : 给任何元素添加 `data-reveal` 属性即可自动获得此效果。

### 4.3 实验室横滑 (Horizontal Scroll)

* **对象** : `.lab-container`
* **逻辑** : 将鼠标滚轮的垂直滚动 (`deltaY`) 转换为水平滚动 (`scrollLeft`)，提供符合直觉的浏览体验。

## 5. 响应式策略 (Responsive Strategy)

系统预设了三个关键断点，确保全终端覆盖：

1. **桌面端 (>1024px)** :

* 完整 12 列网格。
* 英雄区文字超大尺寸展示。
* Hover 状态启用（图片放大、去色/上色）。

1. **平板端 (768px - 1024px)** :

* 页脚网格从 3 列变为 2 列。
* 字号自动缩小 (`clamp()` 函数动态计算)。

1. **移动端 (<768px)** :

* **核心变更** : 网格彻底解构，`.grid-item` 强制占满 12 列（单栏流）。
* **导航** : 隐藏具体链接，保留 Logo 与 搜索，增加空间感。
* **触控优化** : 增加按钮和卡片的点击热区，消除 Hover 依赖。

## 6. 扩展性建议 (Scalability)

作为架构师，对未来开发的建议：

1. **添加新页面** : 复制 `index.html`，保留 `<head>`, `<nav>`, `<footer>`，仅清空 `<main>` (或 section) 内容即可保持风格统一。
2. **性能优化** : 目前图片使用的是 Picsum 随机图。上线时建议使用 WebP 格式，并添加 `loading="lazy"` 属性。
3. **SEO 增强** :

* 在 `<head>` 中补充 `og:image`, `twitter:card` 等社交媒体元数据。
* 确保每个页面只有一个 `<h1>`。
