# NickWang（尼克松赞干布）的个人网站

纯静态个人网站（HTML + CSS + 原生 JS），由 GitHub Pages 直接托管，**无需任何构建工具与框架**。内容以 Markdown 文件存放，推送 GitHub 后自动变成网页。

**当前地址：** https://nicksongwang.github.io/NickWangIsHere/

## 网站构成

| 页面 | 说明 |
|---|---|
| `index.html` | 首页：Hero、胶片匣（拟真胶片条 + 5294 暗盒）、曝光记录热力图 |
| `blog.html` | 手记列表（自动读取 `articles/` 下的文章） |
| `article.html` | 文章阅读页（浏览器端渲染 Markdown + KaTeX 公式） |
| `cases.html` | 案例经验卡片（问题卡 / 经验卡） |
| `projects.html` | DIY 电子项目墙 |
| `toolbox.html` | 工具箱（全屏窗口系统，内置 dB 换算器等工具） |

全站特性：

- **明暗主题切换**：导航栏「明室 / 暗室」按钮，`localStorage` 记忆选择
- **暗房红灯模式**：原有「暗房」开关保留
- **拟真胶片条**：圆角齿孔、边字、帧号、舌形片头、右侧 5294 暗盒矢量图形；初次下滑触发「胶片抽出」动画；滚轮横向滚动；移动端暗盒移出屏幕只留一角
- **手绘元素**：波浪线、五角星印章、箭头批注等手绘风格装饰
- **Open Graph 元信息**：全站静态 og 标签，文章页动态填入标题/摘要/封面

## 项目结构

```
.
├── index.html            # 首页（胶片匣 + 热力图）
├── blog.html             # 手记列表
├── article.html          # 文章阅读页
├── cases.html            # 案例经验
├── projects.html         # 项目墙
├── toolbox.html          # 工具箱
├── 404.html              # 自定义 404 页（GitHub Pages 自动生效）
│
├── articles/             # ★ 手记 Markdown（一夹一篇或散装 .md）
│   └── 2026-08-06-gyrator/
│       └── images/       # 文章图片
├── cases/                # ★ 案例 Markdown（.md 文件）
├── projects/             # ★ 项目 Markdown（一夹一篇）
│
├── photos/               # 胶片匣照片（webp）
├── img/                  # 头像等图片资源
│
├── index.json            # 预生成内容索引（由 gen_index.py 生成）
├── gen_index.py          # 索引生成脚本（Python 标准库，无依赖）
│
├── js/
│   ├── core.js           # 数据层：优先读 index.json，回退 GitHub API
│   ├── site.js           # 全站通用：导航、主题切换、暗房模式、页脚
│   ├── filmstrip.js      # 胶片条渲染：齿孔/边字/帧号/片头/抽出动画/横向滚动
│   ├── heatmap.js        # 曝光记录热力图
│   ├── holidays.js       # 节假日数据
│   ├── darkroom.js       # 暗房红灯模式
│   ├── blog.js / article.js / cases.js / projects.js  # 各页逻辑
│   ├── toolbox.js        # 工具箱窗口系统 + 工具注册表
│   └── vendor/           # 本地化的第三方库（marked、KaTeX）
├── css/
│   ├── style.css         # 全站样式（含浅色主题 html.light 变量覆盖）
│   ├── toolbox.css       # 工具箱样式
│   ├── vendor/           # katex.min.css + 字体
│   └── ...
├── light-demo.html       # 浅色主题 / 胶片条静态演示原型（参考用）
├── compress_photos.py    # 照片压缩脚本
├── .nojekyll             # 跳过 Jekyll，纯静态发布
└── README.md
```

## 内容工作流

### 写一篇手记（blog）

1. 在 `articles/` 下新建 Markdown 文件（散装 `.md` 或 `日期-标题/` 文件夹）。
2. 文件开头可写 front matter（可选，缺省会自动取第一个 `# 标题` 和文件名日期）：

   ```markdown
   ---
   title: 文章标题
   date: 2026-08-06
   tags: [电路, 学习笔记]
   ---
   ```

3. 图片放 `articles/images/<文章名>/`，正文相对路径引用。
4. 数学公式直接写 LaTeX：行内 `$...$`、独立 `$$...$$`，页面自动用 KaTeX 渲染（库已本地化在 `js/vendor/`，不依赖 CDN）。

### 写案例 / 项目

- 案例：在 `cases/` 下新建 `.md`（可参考 `cases/_模板.md`）
- 项目：在 `projects/` 下新建 `日期-名称/` 文件夹（可参考 `projects/_模板.md`）

### ★ 重要：重新生成索引

新增 / 修改文章、案例、项目或照片后，**推送前先运行**：

```bash
python gen_index.py
```

它会扫描三个内容目录和 `photos/`，重新生成 `index.json`。页面加载时优先读这个文件（只需 1 次请求），避免 GitHub API 匿名限流（60 次/小时）导致加载失败；`index.json` 不存在时自动回退到实时 API。

### 加照片

把照片（webp 为佳）放进 `photos/`，运行 `python gen_index.py` 更新索引，胶片匣会自动读取。可用 `compress_photos.py` 压缩大图。

## 发布到 GitHub Pages

1. 仓库 Settings → **Pages** → Source 选 **Deploy from a branch**，分支 `main`，目录 `/ (root)`。
2. 推送：

   ```bash
   git add -A
   git commit -m "..."
   git push origin main
   ```

3. 等待 1~2 分钟，GitHub Pages 自动重建后线上生效。

## 本地预览

方式一：使用配套预览服务（`../dev-server/preview_server.py`，带保存自动刷新）：

```bash
cd ../dev-server
python preview_server.py 4280
# 浏览器打开 http://127.0.0.1:4280/
```

方式二：任意静态服务器：

```bash
python -m http.server 8000
```

- 首页：http://localhost:8000/index.html
- 文章：http://localhost:8000/article.html?f=articles/2026-08-06-gyrator/xxx.md

本地打开时数据从本地目录直读；部署后优先读 `index.json`，缺失时回退 GitHub API。
