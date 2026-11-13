/*
 * article.js — 文章阅读页
 * 读取 articles/ 下的 Markdown 并渲染为网页。
 * 改进点：
 *  - 将不可见的不间断空格（\u00a0，多来自 Word/WPS 复制粘贴）归一化为普通空格，避免公式渲染失败
 *  - 更健壮的行内 / 块级数学公式提取，先于 Markdown 解析保护起来，避免 _ * 等被误解析
 *  - GFM 表格、删除线等语法支持
 *  - 相对路径图片/链接解析、目录、懒加载、KaTeX 自动渲染
 * 仓库访问、路径编码、front matter 解析统一由 core.js 提供。
 */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var file = params.get('f');
  if (!file) {
    showError('缺少文章参数，请在链接后加 ?f=articles/xxx.md');
    return;
  }

  var rawBase = NW.rawBase;

  // 配置 marked：开启 GFM，防止把行内的 _ * 当斜体/加粗误伤代码与公式外的文本
  if (window.marked && marked.use) {
    marked.use({
      gfm: true,
      breaks: false
    });
  }

  fetch(rawBase + NW.encodePath(file))
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function (md) {
      render(preprocess(md));
    })
    .catch(function (e) {
      showError('文章加载失败：' + e.message + '（请确认文件已推送到仓库）');
    });

  /**
   * 预处理原始 Markdown：归一化不间断空格为普通空格
   */
  function preprocess(md) {
    return (md || '').replace(/\u00a0/g, ' ');
  }

  function render(md) {
    var parsed = NW.parseFrontMatter(md);
    var body = parsed.body;
    var meta = parsed.fm;

    // ---- 数学公式保护：先于 Markdown 解析，避免 _ * \ 被误解析 ----
    var blocks = [];
    var inlines = [];

    // 1) 块级公式 $$ ... $$（可跨行）
    body = body.replace(/\$\$([\s\S]+?)\$\$/g, function (m, latex) {
      blocks.push(latex);
      return '@@BLK' + (blocks.length - 1) + '@@';
    });

    // 2) 行内公式 $ ... $（单行、不包含 $、且不是 $$ 已经处理过的）
    body = body.replace(/\$([^$\n]+?)\$/g, function (m, latex) {
      inlines.push(latex);
      return '@@INL' + (inlines.length - 1) + '@@';
    });

    // 3) Markdown -> HTML
    var html;
    try {
      html = window.marked && marked.parse ? marked.parse(body) : fallbackMarked(body);
    } catch (e) {
      html = fallbackMarked(body);
    }

    // 4) 还原数学公式：转义 & < > 后交由 KaTeX 渲染
    inlines.forEach(function (latex, i) {
      html = html.split('@@INL' + i + '@@').join('$' + escapeLatex(latex) + '$');
    });
    blocks.forEach(function (latex, i) {
      html = html.split('@@BLK' + i + '@@').join('$$' + escapeLatex(latex) + '$$');
    });

    // ---- 项目详情：front matter 含仓库字段时，正文顶部渲染开源仓库大卡片 ----
    var repoCard = buildRepoCard(meta);
    if (repoCard) html = repoCard + html;

    var content = document.getElementById('post-content');
    content.innerHTML = html;

    // ---- 标题：front matter 优先，否则取第一个 h1 并移除 ----
    var title = meta.title;
    var h1 = content.querySelector('h1');
    if (!title && h1) title = h1.textContent.trim();
    if (h1) h1.remove();

    // 正文标题降一级（页面标题占 h1）
    content.querySelectorAll('h1, h2, h3, h4').forEach(function (h) {
      var lvl = parseInt(h.tagName.charAt(1), 10) + 1;
      if (lvl <= 6) {
        var nh = document.createElement('h' + lvl);
        nh.innerHTML = h.innerHTML;
        h.parentNode.replaceChild(nh, h);
      }
    });

    // ---- 目录 ----
    buildToc(content);

    // ---- 图片：相对路径基于 md 所在目录解析，懒加载 ----
    var base = file.indexOf('/') >= 0 ? file.substring(0, file.lastIndexOf('/') + 1) : '';
    content.querySelectorAll('img').forEach(function (img) {
      var src = img.getAttribute('src') || '';
      if (!/^(https?:|data:|\/)/i.test(src)) {
        img.setAttribute('src', rawBase + NW.encodePath(base + src));
      }
      img.setAttribute('loading', 'lazy');
    });

    // ---- 相对 .md 链接转成阅读页链接 ----
    content.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (!/^(https?:|mailto:|#|\/)/i.test(href) && href.toLowerCase().endsWith('.md')) {
        a.setAttribute('href', 'article.html?f=' + encodeURIComponent(base + href));
      }
    });

    // 表格等元素横向滚动
    content.querySelectorAll('table').forEach(function (t) {
      var wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });

    // ---- draw.io 图表：.drawio/.xml 由 drawio 渲染器显示（SVG 导出图直接按普通图片渲染）----
    handleDiagrams(content);

    // ---- 数学公式渲染 ----
    if (window.renderMathInElement) {
      try {
        renderMathInElement(content, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false }
          ],
          throwOnError: false
        });
      } catch (e) { /* 单个公式出错不影响整篇 */ }
    }

    // ---- 页面元信息 ----
    if (title) {
      document.title = title + ' - 尼克松赞干布的个人网站';
      document.getElementById('post-title').textContent = title;
    }
    var metaLine = [];
    if (meta.date) metaLine.push(meta.date);
    if (meta.tags) metaLine.push('标签：' + meta.tags);
    document.getElementById('post-meta').textContent = metaLine.join(' · ');
    document.getElementById('loading-msg').style.display = 'none';
  }

  /** draw.io 图表处理：md 中 ![标题](xxx.drawio / xxx.xml) 引用的图，用 drawio viewer 渲染 */
  function handleDiagrams(container) {
    var imgs = container.querySelectorAll('img[src$=".drawio"], img[src$=".xml"]');
    if (!imgs.length) return;
    var targets = Array.prototype.slice.call(imgs);

    loadScriptChain([
      'https://viewer.diagrams.net/js/viewer-static.min.js',
      'https://cdn.jsdelivr.net/gh/jgraph/drawio@master/src/main/webapp/js/viewer-static.min.js'
    ], function () {
      if (!window.GraphViewer) return fallbackAll();
      targets.forEach(function (img) {
        var src = img.getAttribute('src');
        fetchText(src).then(function (xml) {
          var div = document.createElement('div');
          div.className = 'diagram-panel mxgraph';
          div.setAttribute('data-mxgraph', JSON.stringify({ xml: xml, nav: true, resize: true, toolbar: 'zoom' }));
          img.parentNode.replaceChild(div, img);
          try {
            GraphViewer.createViewerForElement(div);
          } catch (e) { fallbackBox(div, src); }
        }, function () { replaceWithFallback(img); });
      });
    }, fallbackAll);

    function fallbackAll() {
      targets.forEach(replaceWithFallback);
    }
    function replaceWithFallback(img) {
      var src = img.getAttribute('src');
      var parent = img.parentNode;
      img.remove();
      if (parent) fallbackBox(parent, src);
    }
    function fallbackBox(parent, src) {
      var box = document.createElement('div');
      box.className = 'diagram-fallback';
      var name = src.split('/').pop();
      box.innerHTML = '图表源文件：<a href="' + src + '" target="_blank" rel="noopener">' + name + '</a> · draw.io 格式，可在 app.diagrams.net 打开查看';
      parent.appendChild(box);
    }
  }

  function fetchText(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }

  /** 逐个尝试加载脚本，全部失败则执行 fail */
  function loadScriptChain(urls, ok, fail) {
    (function tryOne(i) {
      if (i >= urls.length) { fail(); return; }
      var s = document.createElement('script');
      s.src = urls[i];
      s.onload = ok;
      s.onerror = function () { tryOne(i + 1); };
      document.head.appendChild(s);
    })(0);
  }

  /** 项目仓库大卡片：仅当 front matter 提供 repo / lc（开源平台）字段时渲染 */
  function buildRepoCard(meta) {
    if (!meta.repo && !meta.lc) return '';
    function escAttr(s) {
      return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }
    var rows = '';
    if (meta.repo) {
      rows += '<a class="repo-link" href="https://github.com/' + escAttr(meta.repo) + '" target="_blank" rel="noopener">' +
        '<svg width="24" height="24" viewBox="0 0 16 16" fill="#e8e4dc"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A7.995 7.995 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>' +
        '<span class="u">github.com/' + escAttr(meta.repo) + '<small>GITHUB · 代码 / 硬件 / 固件</small></span><span class="go">↗</span></a>';
    }
    if (meta.lc) {
      rows += '<a class="repo-link lc-link" href="https://oshwhub.com/' + escAttr(meta.lc) + '" target="_blank" rel="noopener">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9FE1CB" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8 15 L8 9 L12 9 M15 10a3 3 0 1 0 0 4.6 M15 9v5.6"/></svg>' +
        '<span class="u">oshwhub.com/' + escAttr(meta.lc) + '<small>立创开源平台 · 原理图 / PCB / BOM</small></span><span class="go">↗</span></a>';
    }
    var badges = '';
    if (meta.level) {
      var LV = { '1': '★ 入门', '2': '★★ 进阶', '3': '★★★ 硬核' };
      badges += '<span class="bdg gold">' + escAttr(LV[String(meta.level).trim()] || meta.level) + '</span>';
    }
    if (meta.license) badges += '<span class="bdg">license ' + escAttr(meta.license) + '</span>';
    if (meta.release) badges += '<span class="bdg">release ' + escAttr(meta.release) + '</span>';
    String(meta.stack || '').split(/[,，]/).forEach(function (t) {
      t = t.trim();
      if (t) badges += '<span class="bdg">' + escAttr(t) + '</span>';
    });
    var stText = '';
    if (meta.status === 'dev') stText = '显影中' + (meta.progress ? ' · 进度 ' + escAttr(meta.progress) + '%' : ' · 开发中');
    else if (meta.status === 'open') stText = '已开源 · 欢迎复刻';
    else if (meta.status === 'hold') stText = '已搁置 · 仓库仍可查看';
    if (meta.date) stText += ' · 最近更新 ' + escAttr(meta.date);
    return '<div class="repo-card"><div class="repo-rows">' +
      '<div class="repo-col"><div class="repo-cap">SOURCE · 开源仓库</div>' + rows + '</div>' +
      '<div class="repo-col"><div class="repo-cap">STATUS · 状态与徽章</div>' +
      (badges ? '<div class="badges">' + badges + '</div>' : '') +
      (stText ? '<div class="repo-state">' + stText + '</div>' : '') +
      '<div class="repo-state">参与方式：欢迎 Issue 讨论 · 复刻成功请开 Issue 秀图</div>' +
      '</div></div></div>';
  }

  /** LaTeX 专用转义：只处理 & < >（不转义引号，避免 KaTeX 收到 &quot; 字面量） */
  function escapeLatex(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** 当 marked 未加载时的兜底：仅做最基础的段落/换行处理 */
  function fallbackMarked(md) {
    return md.split(/\n{2,}/).map(function (p) {
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function buildToc(container) {
    var headings = container.querySelectorAll('h2, h3');
    if (headings.length < 2) return;
    headings.forEach(function (h, i) {
      h.id = h.id || 'sec-' + (i + 1);
    });
    var list = document.createElement('ul');
    headings.forEach(function (h) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      list.appendChild(li);
    });
    var nav = document.createElement('nav');
    nav.className = 'toc';
    nav.setAttribute('aria-label', '目录');
    nav.appendChild(list);
    container.parentNode.insertBefore(nav, container);
  }

  function showError(msg) {
    var el = document.getElementById('loading-msg');
    if (el) el.textContent = msg;
  }
})();
