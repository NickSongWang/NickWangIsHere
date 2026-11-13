/*
 * cases.js — 返修台（工程案例库）
 * 数据源：cases/ 目录下的 Markdown 卡片（一卡一文件；带图卡片建同名文件夹，与手记约定一致）。
 * 两类卡片：problem 问题记录卡（问题描述/根因分析/解决方案 分节）、tip 纯知识点卡（自由正文）。
 * 交互：类型分段筛选 + 标签多选 + 即时搜索；问题卡点击展开折叠区。
 */
(function () {
  'use strict';

  var grid = document.getElementById('cs-grid');
  var statsEl = document.getElementById('cs-stats');
  var countEl = document.getElementById('cs-count');
  var segEl = document.getElementById('cs-seg');
  var tagsEl = document.getElementById('cs-tags');
  var searchEl = document.getElementById('cs-search');
  var loading = document.getElementById('cs-loading');
  var errorEl = document.getElementById('cs-error');
  if (!grid) return;

  var state = { type: 'all', tags: {}, q: '' };
  var cards = [];

  var SEV = { high: ['高', '#e07a5f'], mid: ['中', '#e8c47a'], low: ['低', '#8f8a80'] };
  var SECTION_KEYS = {
    '问题描述': ['▸ 问题描述', 'k1'],
    '根因分析': ['▸ 根因分析', 'k2'],
    '解决方案': ['▸ 解决方案', 'k3'],
    '教训': ['▸ 教训', 'k4']
  };

  if (window.marked && marked.use) marked.use({ gfm: true, breaks: false });

  NW.collectPosts('cases')
    .then(function (posts) {
      loading.style.display = 'none';
      cards = posts.map(normalize);
      initToolbar();
      renderStats();
      render();
    })
    .catch(function (e) {
      loading.style.display = 'none';
      errorEl.style.display = '';
      errorEl.textContent = '卡片加载失败：' + e.message + '（刷新重试，或检查 cases/ 文件夹是否存在）';
    });

  /** 统一卡片结构：type、标签数组、正文各节 */
  function normalize(p) {
    var fm = p.fm || {};
    var isProblem = fm.type === 'problem';
    var tags = String(p.tags || '').split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean);
    return {
      path: p.path,
      problem: isProblem,
      title: p.title,
      date: (p.date || '').slice(0, 10),
      tags: tags,
      severity: SEV[fm.severity] ? fm.severity : '',
      device: fm.device || '',
      link: fm.link || '',
      body: p.body || '',
      sections: isProblem ? parseSections(p.body || '') : []
    };
  }

  /** 按 ## 二级标题把正文切成节 */
  function parseSections(body) {
    var lines = body.split('\n');
    var secs = [];
    var cur = null;
    lines.forEach(function (line) {
      var m = line.match(/^##\s+(.+?)\s*$/);
      if (m) {
        cur = { name: m[1], md: [] };
        secs.push(cur);
      } else if (cur) {
        cur.md.push(line);
      }
    });
    return secs
      .filter(function (s) { return SECTION_KEYS[s.name] || s.name; })
      .map(function (s) { s.md = s.md.join('\n').trim(); return s; })
      .filter(function (s) { return s.md; });
  }

  function renderStats() {
    var nP = cards.filter(function (c) { return c.problem; }).length;
    var nT = cards.length - nP;
    var latest = cards.length ? cards[0].date : '';
    statsEl.textContent = nP + ' 张问题卡 · ' + nT + ' 条经验' + (latest ? ' · 最近更新 ' + latest : '');
  }

  function initToolbar() {
    // 类型分段
    var counts = { all: cards.length, problem: 0, tip: 0 };
    cards.forEach(function (c) { counts[c.problem ? 'problem' : 'tip']++; });
    Array.prototype.forEach.call(segEl.querySelectorAll('button'), function (btn) {
      btn.textContent = btn.textContent + ' ' + counts[btn.getAttribute('data-t')];
      btn.addEventListener('click', function () {
        state.type = btn.getAttribute('data-t');
        Array.prototype.forEach.call(segEl.querySelectorAll('button'), function (b) { b.classList.remove('act'); });
        btn.classList.add('act');
        render();
      });
    });
    // 标签聚合
    var tagCount = {};
    cards.forEach(function (c) {
      c.tags.forEach(function (t) { tagCount[t] = (tagCount[t] || 0) + 1; });
    });
    Object.keys(tagCount).sort().forEach(function (t) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cs-chip';
      chip.textContent = '#' + t + ' ' + tagCount[t];
      chip.addEventListener('click', function () {
        state.tags[t] = !state.tags[t];
        chip.classList.toggle('act', !!state.tags[t]);
        render();
      });
      tagsEl.appendChild(chip);
    });
    // 搜索
    var deb = null;
    searchEl.addEventListener('input', function () {
      clearTimeout(deb);
      deb = setTimeout(function () {
        state.q = searchEl.value.trim().toLowerCase();
        render();
      }, 150);
    });
  }

  function matches(c) {
    if (state.type !== 'all' && (state.type === 'problem') !== c.problem) return false;
    var activeTags = Object.keys(state.tags).filter(function (t) { return state.tags[t]; });
    for (var i = 0; i < activeTags.length; i++) {
      if (c.tags.indexOf(activeTags[i]) < 0) return false;
    }
    if (state.q) {
      var hay = (c.title + ' ' + c.tags.join(' ') + ' ' + c.device + ' ' + c.body).toLowerCase();
      if (hay.indexOf(state.q) < 0) return false;
    }
    return true;
  }

  function render() {
    var hits = cards.filter(matches);
    countEl.textContent = hits.length ? '显示 ' + hits.length + ' / ' + cards.length + ' 张卡片' : '';
    if (!cards.length) {
      grid.innerHTML = '';
      loading.style.display = '';
      loading.textContent = '返修台还空着。把写好的卡片 md 放进 cases/ 文件夹（格式参考 cases/_模板.md），刷新即见。';
      return;
    }
    if (!hits.length) {
      grid.innerHTML = '';
      loading.style.display = '';
      loading.textContent = '没有匹配的卡片，换个关键词或标签试试。';
      return;
    }
    loading.style.display = 'none';
    grid.innerHTML = hits.map(renderCard).join('');
    // 公式渲染（KaTeX）
    if (window.renderMathInElement) {
      try {
        renderMathInElement(grid, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false }
          ],
          throwOnError: false
        });
      } catch (e) { /* 单个公式出错不影响整页 */ }
    }
    // 问题卡折叠交互
    Array.prototype.forEach.call(grid.querySelectorAll('.cs-card'), function (card) {
      if (card.querySelector('.cs-fold')) {
        card.classList.add('has-fold');
        card.addEventListener('click', function () { card.classList.toggle('open'); });
      }
    });
  }

  function renderCard(c) {
    var sevHtml = c.severity
      ? '<span class="cs-sev" style="color:' + SEV[c.severity][1] + '">严重度 ' + SEV[c.severity][0] + '</span>'
      : '';
    var head = '<div class="cs-top">' +
      (c.problem
        ? '<span class="cs-badge cs-b-problem">问题</span>'
        : '<span class="cs-badge cs-b-tip">经验</span>') +
      sevHtml + '<span>' + NW.escapeHtml(c.date) + '</span></div>';
    var titleHtml = '<h3>' + NW.escapeHtml(c.title) + '</h3>';

    var bodyHtml;
    if (c.problem && c.sections.length) {
      var html = '';
      var first = true;
      c.sections.forEach(function (s) {
        var key = SECTION_KEYS[s.name] || ['▸ ' + s.name, ''];
        html += '<div class="cs-sec' + (first ? '' : ' cs-fold') + '">' +
          '<b class="cs-k ' + key[1] + '">' + key[0] + '</b>' +
          '<div class="cs-sec-body">' + NW.renderMarkdown(s.md) + '</div></div>';
        first = false;
      });
      bodyHtml = html + '<span class="cs-more">▸ 展开根因与方案 ▾</span>';
    } else {
      bodyHtml = '<div class="cs-sec"><div class="cs-sec-body">' + NW.renderMarkdown(c.body) + '</div></div>';
    }

    var footParts = [];
    if (c.tags.length) footParts.push('<em>' + c.tags.map(function (t) { return '#' + NW.escapeHtml(t); }).join(' ') + '</em>');
    if (c.device) footParts.push('器件 ' + NW.escapeHtml(c.device));
    if (c.link) {
      footParts.push('<a href="article.html?f=' + encodeURIComponent(c.link) + '">关联手记 ↗</a>');
    }
    var foot = footParts.length ? '<div class="cs-foot">' + footParts.join(' · ') + '</div>' : '';

    // 卡内图片相对路径解析（夹内卡片以所在夹为基准）
    var placeholder = '<article class="cs-card' + (c.problem ? ' problem' : '') + '">' +
      head + titleHtml + bodyHtml + foot + '</article>';
    var tmp = document.createElement('div');
    tmp.innerHTML = placeholder;
    var imgs = tmp.querySelectorAll('img');
    if (imgs.length) {
      var base = c.path.indexOf('/') >= 0 ? c.path.slice(0, c.path.lastIndexOf('/') + 1) : '';
      Array.prototype.forEach.call(imgs, function (img) {
        var src = img.getAttribute('src') || '';
        if (!/^(https?:|data:|\/)/i.test(src)) {
          img.setAttribute('src', NW.rawBase + NW.encodePath(base + src));
        }
        img.setAttribute('loading', 'lazy');
      });
    }
    return tmp.innerHTML;
  }
})();
