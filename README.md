# NickWang（尼克松赞干布）的个人网站

纯静态网站（HTML + CSS + 少量 JS），由 GitHub Pages 直接托管，无需构建工具。博客文章以 **Markdown** 文件存放在 `articles/` 文件夹，推送到 GitHub 后自动变成网页，无需手动转换。

**当前地址：** https://NickSongWang.github.io/NickWang.Website/

## 项目结构

```
.
├── index.html      # 首页
├── blog.html       # 博客列表（自动读取 articles/ 下的文章）
├── article.html    # 文章阅读页（浏览器端渲染 Markdown）
├── articles/       # ★ 文章 Markdown 放这里（含图片）
│   ├── 2026-08-06-gyrator.md
│   └── images/gyrator/       # 文章图片
├── js/             # 列表与渲染脚本
├── css/style.css   # 样式
└── .nojekyll       # 跳过 Jekyll，纯静态发布
```

## 怎么写一篇新文章（日常流程）

1. 写一个 **Markdown 文件**，放到 `articles/` 文件夹。
   - 文件名建议带日期前缀，如 `2026-08-06-我的文章.md`（日期会自动显示，也可以不写）
   - 文件开头可以用 `---` 包起来写标题/日期/标签（可选）：

     ```markdown
     ---
     title: 文章标题
     date: 2026-08-06
     tags: [电路, 学习笔记]
     ---

     # 文章标题

     正文……
     ```

     不写 front matter 也没关系，会自动取第一个 `# 标题` 和文件名里的日期。

2. 文章里的图片：放到 `articles/images/<文章名>/` 目录，正文用相对路径引用，例如：

   ```markdown
   ![电路图](images/gyrator/img01.png)
   ```

3. 数学公式直接写 LaTeX：行内公式 `$...$`，独立公式 `$$...$$`，页面会自动用 KaTeX 渲染。

4. 推送代码到 GitHub（`git push origin main`），博客列表会自动出现这篇文章，点开即看。

## 发布到 GitHub Pages（只需 3 步，做过一次即可）

1. 仓库 Settings → **Pages** → Source 选 **Deploy from a branch**，分支 `main`，目录 `/ (root)`，保存。
2. 本地推代码：

   ```bash
   git push origin main
   ```

3. 等待 1~2 分钟，访问 https://NickSongWang.github.io/NickWang.Website/

## 本地预览

在项目根目录启动一个静态服务器，例如：

```bash
python -m http.server 8000
```

然后浏览器打开：

- 博客列表：http://localhost:8000/blog.html
- 某篇文章：http://localhost:8000/article.html?f=articles/2026-08-06-gyrator.md

本地打开时文章从本地读取；部署后自动改为从 GitHub 读取。
