/*
 * projects.js — 工作台（DIY 开源项目墙）
 * 数据源：projects/ 目录，一项目一夹（index.md + 图片素材同层），与手记/返修台同一约定。
 * 卡片：封面（fm.cover 图片，缺省自动生成电路纹样）+ 难度 + 胶片状态 + 技术栈；
 * 筛选：状态分段 + 标签 + 搜索；点击卡片进详情（复用阅读页渲染，仓库大卡由 article.js 按 fm 生成）。
 */
(function () {
  'use strict';

  var grid = document.getElementById('pj-grid');
  var statsEl = document.getElementById('pj-stats');
  var countEl = document.getElementById('pj-count');
  var segEl = document.getElementById('pj-seg');
  var tagsEl = document.getElementById('pj-tags');
  var searchEl = document.getElementById('pj-search');
  var loading = document.getElementById('pj-loading');
  var errorEl = document.getElementById('pj-error');
  if (!grid) return;

  var LEVELS = { 1: ['★', '入门'], 2: ['★★', '进阶'], 3: ['★★★', '硬核'] };
  var STATUS = {
    dev: ['显影中', '#e8c47a', '#d4a24e'],
    open: ['已开源', '#9FE1CB', '#1D9E75'],
    hold: ['搁置', '#8f8a80', '#5F5E5A']
  };
  var state = { status: 'all', tags: {}, q: '' };
  var items = [];

  NW.collectPosts('projects')
    .then(function (posts) {
      loading.style.display = 'none';
      items = posts.map(normalize);
      initToolbar();
      renderStats();
      render();
    })
    .catch(function (e) {
      loading.style.display = 'none';
      errorEl.style.display = '';
      errorEl.textContent = '项目加载失败：' + e.message + '（刷新重试，或检查 projects/ 文件夹是否存在）';
    });

  function normalize(p) {
    var fm = p.fm || {};
    var tags = String(p.tags || '').split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean);
    var stack = String(fm.stack || '').split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean);
    return {
      path: p.path,
      title: p.title,
      summary: p.summary || '',
      date: (p.date || '').slice(0, 10),
      cover: p.cover,
      tags: tags,
      stack: stack,
      level: LEVELS[fm.level] ? fm.level : 2,
      status: STATUS[fm.status] ? fm.status : 'dev',
      progress: fm.progress || '',
      license: fm.license || '',
      release: fm.release || '',
      repo: fm.repo || '',
      lc: fm.lc || ''
    };
  }

  function renderStats() {
    var n = items.length;
    var nOpen = items.filter(function (i) { return i.status === 'open'; }).length;
    var nDev = items.filter(function (i) { return i.status === 'dev'; }).length;
    var latest = items.length ? items[0].date : '';
    statsEl.textContent = n + ' 个项目 · ' + nOpen + ' 卷已开源 · ' + nDev + ' 卷显影中' + (latest ? ' · 最近更新 ' + latest : '');
  }

  function initToolbar() {
    var counts = { all: items.length, dev: 0, open: 0, hold: 0 };
    items.forEach(function (i) { counts[i.status]++; });
    Array.prototype.forEach.call(segEl.querySelectorAll('button'), function (btn) {
      btn.textContent = btn.textContent + ' ' + counts[btn.getAttribute('data-s')];
      btn.addEventListener('click', function () {
        state.status = btn.getAttribute('data-s');
        Array.prototype.forEach.call(segEl.querySelectorAll('button'), function (b) { b.classList.remove('act'); });
        btn.classList.add('act');
        render();
      });
    });
    var tagCount = {};
    items.forEach(function (i) {
      i.tags.concat(i.stack).forEach(function (t) { tagCount[t] = (tagCount[t] || 0) + 1; });
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
    var deb = null;
    searchEl.addEventListener('input', function () {
      clearTimeout(deb);
      deb = setTimeout(function () {
        state.q = searchEl.value.trim().toLowerCase();
        render();
      }, 150);
    });
  }

  function matches(i) {
    if (state.status !== 'all' && i.status !== state.status) return false;
    var active = Object.keys(state.tags).filter(function (t) { return state.tags[t]; });
    var all = i.tags.concat(i.stack);
    for (var k = 0; k < active.length; k++) {
      if (all.indexOf(active[k]) < 0) return false;
    }
    if (state.q) {
      var hay = (i.title + ' ' + i.summary + ' ' + i.tags.join(' ') + ' ' + i.stack.join(' ')).toLowerCase();
      if (hay.indexOf(state.q) < 0) return false;
    }
    return true;
  }

  function render() {
    var hits = items.filter(matches);
    countEl.textContent = hits.length ? '显示 ' + hits.length + ' / ' + items.length + ' 个项目' : '';
    if (!items.length) {
      grid.innerHTML = '';
      loading.style.display = '';
      loading.textContent = '工作台还空着。按 projects/_模板.md 新建一个项目夹，推送后自动亮相。';
      return;
    }
    if (!hits.length) {
      grid.innerHTML = '';
      loading.style.display = '';
      loading.textContent = '没有匹配的项目，换个关键词或标签试试。';
      return;
    }
    loading.style.display = 'none';
    grid.innerHTML = hits.map(renderCard).join('');
  }

  function renderCard(i) {
    var lv = LEVELS[i.level];
    var st = STATUS[i.status];
    var cover = i.cover
      ? '<img src="' + NW.rawBase + NW.encodePath(i.cover) + '" alt="' + NW.escapeHtml(i.title) + '" loading="lazy">'
      : coverArt(i.title);
    var chips = i.stack.concat(i.tags).slice(0, 4).map(function (t) {
      return '<i>' + NW.escapeHtml(t) + '</i>';
    }).join('');
    var meta = [];
    if (i.license) meta.push(i.license);
    if (i.status === 'dev' && i.progress) meta.push('进度 ' + i.progress + '%');
    if (i.repo) meta.push('GitHub ↗');
    return '<a class="pj-card" href="article.html?f=' + encodeURIComponent(i.path) + '">' +
      '<div class="pj-cov">' + cover +
      '<span class="pj-lv">' + lv[0] + ' ' + lv[1] + '</span>' +
      '<span class="pj-st" style="color:' + st[1] + ';border-color:' + st[2] + '">' + st[0] + '</span>' +
      '</div>' +
      '<h3>' + NW.escapeHtml(i.title) + '</h3>' +
      '<p class="pj-one">' + NW.escapeHtml(i.summary) + '</p>' +
      '<div class="pj-chips">' + chips + '</div>' +
      '<div class="pj-meta"><span>' + NW.escapeHtml(meta.join(' · ')) + '</span><span>' + NW.escapeHtml(i.date) + '</span></div>' +
      '</a>';
  }

  /** 无封面时按项目标题确定性生成电路纹样封面（同标题永远同图） */
  function coverArt(seed) {
    var h = 0;
    for (var i = 0; i < seed.length; i++) { h = (h * 31 + seed.charCodeAt(i)) >>> 0; }
    function rnd() { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967295; }
    var tints = ['#241f18', '#1f2730', '#3a2c1c', '#26201f', '#1f2430'];
    var inks = ['#d4a24e', '#e8c47a', '#5DCAA5'];
    var tint = tints[Math.floor(rnd() * tints.length)];
    var ink = inks[Math.floor(rnd() * inks.length)];
    var svg = '<svg viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">';
    var n = 2 + Math.floor(rnd() * 2);
    for (var t = 0; t < n; t++) {
      var x = 10 + rnd() * 60, y = 20 + rnd() * 110;
      var d = 'M' + x.toFixed(0) + ' ' + y.toFixed(0);
      for (var s = 0; s < 4; s++) {
        var len = 30 + rnd() * 90;
        if (s % 2 === 0) { x = Math.min(290, x + len); } else { y = Math.max(14, y - len * (0.4 + rnd() * 0.8)); }
        d += ' L' + x.toFixed(0) + ' ' + y.toFixed(0);
      }
      svg += '<path d="' + d + '" fill="none" stroke="' + ink + '" stroke-width="' + (t ? 1.2 : 2) + '" opacity="' + (t ? 0.55 : 0.85) + '"/>';
      svg += '<circle cx="' + (10 + rnd() * 40).toFixed(0) + '" cy="' + (16 + rnd() * 120).toFixed(0) + '" r="4" fill="none" stroke="' + ink + '" stroke-width="1.4"/>';
    }
    var cx = 150 + rnd() * 80, cy = 40 + rnd() * 60;
    svg += '<rect x="' + cx.toFixed(0) + '" y="' + cy.toFixed(0) + '" width="54" height="38" rx="4" fill="none" stroke="' + ink + '" stroke-width="1.6"/>';
    svg += '<path d="M' + (cx + 8).toFixed(0) + ' ' + cy.toFixed(0) + ' V' + (cy - 10).toFixed(0) + ' M' + (cx + 22).toFixed(0) + ' ' + cy.toFixed(0) + ' V' + (cy - 10).toFixed(0) + ' M' + (cx + 36).toFixed(0) + ' ' + cy.toFixed(0) + ' V' + (cy - 10).toFixed(0) + '" stroke="' + ink + '" stroke-width="1.2" opacity=".7"/>';
    svg += '</svg>';
    return '<span class="pj-cov-art" style="background:' + tint + '">' + svg + '</span>';
  }
})();
