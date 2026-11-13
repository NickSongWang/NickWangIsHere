/*
 * heatmap.js — 首页「曝光记录 · EXPOSURE LOG」
 * GitHub 风格的贡献热力图：过去 12 个月，绿方块标识哪些日期发布了手记。
 * 悬停显示日期与篇数；点亮日可点击跳转（单篇直达阅读页，多篇去手记列表）。
 * 数据由 core.js collectPosts 提供，本地预览走本地文件，线上走 GitHub API。
 */
(function () {
  'use strict';

  var box = document.getElementById('heatmap');
  var loading = document.getElementById('hm-loading');
  if (!box) return;

  var CELL = 11;   // 方块边长
  var GAP = 3;     // 间隔
  var PITCH = CELL + GAP;

  // GitHub dark 配色（空 + 四级绿）
  var COLORS = ['#1e1e1e', '#0e4429', '#006d32', '#26a641', '#39d353'];

  NW.collectPosts('articles')
    .then(function (posts) {
      if (loading) loading.style.display = 'none';
      var count = document.getElementById('hm-count');
      if (count) count.textContent = '最近 12 个月 · ' + (posts.length) + ' 篇手记';
      render(box, posts);
    })
    .catch(function () {
      if (loading) {
        loading.textContent = '曝光记录暂时加载不出来（本地预览需启动 dev-server，线上稍后重试）。';
      }
    });

  function render(el, posts) {
    // 日期 → 文章列表
    var byDate = {};
    (posts || []).forEach(function (p) {
      var d = (p.date || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      (byDate[d] = byDate[d] || []).push(p);
    });

    // 网格范围：从今天回推 52 周的周日开始
    var today = new Date();
    today.setHours(12, 0, 0, 0);
    var start = new Date(today);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay()); // 对齐周日

    var weeks = Math.ceil((today - start) / 86400000 / 7) + 1; // 53 左右
    var leftLabels = 26;
    var topLabels = 16;
    var W = leftLabels + weeks * PITCH;
    var H = topLabels + 7 * PITCH;

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="发布手记的日期热力图">';
    svg += '<title>过去 12 个月的手记发布记录</title>';

    // 月份标签
    var lastMonth = -1;
    for (var w = 0; w < weeks; w++) {
      var d0 = new Date(start);
      d0.setDate(d0.getDate() + w * 7);
      if (d0 > today) break;
      if (d0.getMonth() !== lastMonth) {
        lastMonth = d0.getMonth();
        svg += '<text x="' + (leftLabels + w * PITCH) + '" y="11">' + (lastMonth + 1) + '月</text>';
      }
    }

    // 星期标签（一 / 三 / 五）
    [1, 3, 5].forEach(function (row) {
      var names = ['日', '一', '二', '三', '四', '五', '六'];
      svg += '<text x="0" y="' + (topLabels + row * PITCH + CELL - 2) + '">' + names[row] + '</text>';
    });

    // 方块
    for (var wk = 0; wk < weeks; wk++) {
      for (var dow = 0; dow < 7; dow++) {
        var day = new Date(start);
        day.setDate(day.getDate() + wk * 7 + dow);
        if (day > today) continue;
        var key = day.getFullYear() + '-' + pad(day.getMonth() + 1) + '-' + pad(day.getDate());
        var n = (byDate[key] || []).length;
        var level = n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : 4;
        var x = leftLabels + wk * PITCH;
        var y = topLabels + dow * PITCH;
        if (n > 0) {
          var href = byDate[key].length === 1
            ? 'article.html?f=' + encodeURIComponent(byDate[key][0].path)
            : 'blog.html';
          svg += '<a href="' + href + '"><rect class="hm-cell on" x="' + x + '" y="' + y + '" width="' + CELL + '" height="' + CELL + '" rx="2" fill="' + COLORS[level] + '"><title>' + key + ' · ' + n + ' 篇手记</title></rect></a>';
        } else {
          svg += '<rect class="hm-cell" x="' + x + '" y="' + y + '" width="' + CELL + '" height="' + CELL + '" rx="2" fill="' + COLORS[0] + '"><title>' + key + '</title></rect>';
        }
      }
    }
    svg += '</svg>';
    el.innerHTML = svg;
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
})();
