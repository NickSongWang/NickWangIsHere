/*
 * core.js — 全站共享核心（数据访问层）
 * 提供仓库配置、GitHub Contents API 访问、路径编码、HTML 转义、front matter 解析。
 * 所有页面脚本（blog.js / article.js / cases.js / projects.js / filmstrip.js）通过 window.NW 使用。
 */
window.NW = (function () {
  'use strict';

  var REPO = 'NickSongWang/NickWangIsHere';
  var BRANCH = 'main';

  // 本地预览（localhost / 127.0.0.1）走相对路径，线上走 raw.githubusercontent.com
  var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  var rawBase = isLocal ? '' : 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/';

  function cacheBust() { return '?t=' + Date.now(); }

  /** 路径分段 URL 编码（保留 /） */
  function encodePath(p) {
    return String(p).split('/').map(encodeURIComponent).join('/');
  }

  /** HTML 文本与属性转义（对文本节点与属性值均安全） */
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** GitHub Contents API（线上）/ 本地预览服务 API（localhost）：列出 dir 下全部条目 */
  function fetchContents(dir) {
    var url = isLocal
      ? '/__api/contents/' + encodePath(dir) + cacheBust()
      : 'https://api.github.com/repos/' + REPO + '/contents/' + dir + cacheBust();
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
  }

  /**
   * front matter 解析：支持普通键值、内联列表 [a, b]、带引号字符串、含冒号的值。
   * 返回 { body: 去除头部的正文, fm: 键值对象 }
   */
  function parseFrontMatter(text) {
    var m = String(text || '').match(/^---\r?\n([\s\S]*?)\r?\n-{3}\s*\n?/);
    if (!m) return { body: String(text || ''), fm: {} };
    var fm = {};
    m[1].split('\n').forEach(function (line) {
      line = line.trim();
      if (!line || line.charAt(0) === '#') return; // 跳过注释与空行
      var idx = line.indexOf(':');
      if (idx <= 0) return;
      var key = line.slice(0, idx).trim();
      var val = line.slice(idx + 1).trim();
      if (!key) return;
      // 内联列表 [a, b, c] -> 逗号分隔字符串
      if (val.charAt(0) === '[' && val.charAt(val.length - 1) === ']') {
        val = val.slice(1, -1);
      }
      // 去掉字符串包裹引号
      if (val.length >= 2 && (val.charAt(0) === '"' && val.charAt(val.length - 1) === '"' ||
                             val.charAt(0) === "'" && val.charAt(val.length - 1) === "'")) {
        val = val.slice(1, -1);
      }
      fm[key] = val;
    });
    return { body: String(text || '').slice(m[0].length).replace(/^\s*\n/, ''), fm: fm };
  }

  /**
   * collectPosts(dir)：收集一篇文章的全部元信息，供列表页与首页热力图共用。
   * 文章存放约定：
   *   - 新式（推荐）：每篇文章一个文件夹，内含一个 .md 与图片/图表 —— articles/<slug>/index.md
   *   - 旧式（兼容）：直接放在 articles/ 根目录的散装 .md
   * 返回 Promise<[{ path, title, date, tags, summary, cover }]>，按日期倒序。
   */
  function collectPosts(dir) {
    function isMd(i) { return i.type === 'file' && /\.md$/i.test(i.name) && i.name.charAt(0) !== '_'; }
    return fetchContents(dir)
      .then(function (items) {
        var mdFiles = (items || []).filter(isMd);
        var folders = (items || []).filter(function (i) { return i.type === 'dir' && i.name.charAt(0) !== '_'; });
        // 每个文件夹里找第一个 md（约定一夹一篇）
        return Promise.all(folders.map(function (f) {
          return fetchContents(f.path)
            .then(function (inner) {
              var md = (inner || []).filter(isMd)[0];
              return md || null;
            })
            .catch(function () { return null; });
        })).then(function (folderMds) {
          var all = mdFiles.concat(folderMds.filter(Boolean));
          return Promise.all(all.map(function (f) {
            return fetch(f.download_url + cacheBust())
              .then(function (r) { return r.ok ? r.text() : ''; })
              .then(function (text) { return buildPost(f, text); })
              .catch(function () { return null; });
          }));
        });
      })
      .then(function (posts) {
        return (posts || []).filter(Boolean).sort(function (a, b) {
          return (b.date || '').localeCompare(a.date || '');
        });
      });
  }

  /** 从 md 文本 + 文件信息构建文章元信息（front matter 优先，文件名日期兜底） */
  function buildPost(file, text) {
    var parsed = parseFrontMatter(text);
    var fm = parsed.fm;
    var body = parsed.body;
    var title = fm.title;
    if (!title) { var h1 = body.match(/^#\s+(.+?)\s*$/m); if (h1) title = h1[1].trim(); }
    if (!title) title = file.name.replace(/\.md$/i, '');
    var date = fm.date || ((file.name.match(/^(\d{4}-\d{2}-\d{2})[-_ ]/) || (file.path || '').match(/^(\d{4}-\d{2}-\d{2})[-_ ]/) || [])[1] || '');
    var folder = (file.path || '').indexOf('/') >= 0 ? file.path.slice(0, file.path.lastIndexOf('/') + 1) : '';
    var cover = fm.cover ? folder + fm.cover : '';
    return { path: file.path, title: title, date: date, tags: fm.tags || '', summary: fm.summary || extractSummary(body), cover: cover, fm: fm, body: body };
  }

  /** 从正文提取纯文本摘要（最多 120 字） */
  function extractSummary(body) {
    var text = body
      .replace(/^#\s+.+$/m, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/#+\s*/g, '')
      .replace(/[*`>_]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length > 120) text = text.substring(0, 120) + '…';
    return text;
  }

  /**
   * renderMarkdown(body)：Markdown → HTML，带数学公式保护（先于解析收起 $..$ / $$..$$，
   * 解析后还原为可被 KaTeX auto-render 识别的文本）。文章页与案例卡片共用。
   */
  function renderMarkdown(body) {
    body = String(body || '');
    var blocks = [];
    var inlines = [];
    body = body.replace(/\$\$([\s\S]+?)\$\$/g, function (m, latex) {
      blocks.push(latex);
      return '@@BLK' + (blocks.length - 1) + '@@';
    });
    body = body.replace(/\$([^$\n]+?)\$/g, function (m, latex) {
      inlines.push(latex);
      return '@@INL' + (inlines.length - 1) + '@@';
    });
    var html;
    try {
      html = window.marked && marked.parse ? marked.parse(body) : fallbackMarked(body);
    } catch (e) {
      html = fallbackMarked(body);
    }
    inlines.forEach(function (latex, i) {
      html = html.split('@@INL' + i + '@@').join('$' + escapeLatex(latex) + '$');
    });
    blocks.forEach(function (latex, i) {
      html = html.split('@@BLK' + i + '@@').join('$$' + escapeLatex(latex) + '$$');
    });
    return html;
  }

  /** LaTeX 专用转义：只处理 & < >（引号交给 KaTeX 自己） */
  function escapeLatex(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** marked 未加载时的兜底渲染 */
  function fallbackMarked(md) {
    return String(md || '').split(/\n{2,}/).map(function (p) {
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  return {
    REPO: REPO,
    BRANCH: BRANCH,
    isLocal: isLocal,
    rawBase: rawBase,
    cacheBust: cacheBust,
    encodePath: encodePath,
    escapeHtml: escapeHtml,
    fetchContents: fetchContents,
    parseFrontMatter: parseFrontMatter,
    collectPosts: collectPosts,
    renderMarkdown: renderMarkdown
  };
})();
