/*
 * heatmap.js — 首页「曝光记录 · EXPOSURE LOG」
 * GitHub 风格的贡献热力图：过去 12 个月。
 * 三板块合并展示：学习文档（绿）/ 经验记录（橙）/ 开源项目（蓝），
 * 同一天多板块更新时，格子按板块分段拼接（左→右固定顺序）。
 * 仅作展示：不跳转，悬停显示日期与各板块记录数。
 * 颜色由 CSS 变量驱动（--hm-a / --hm-c / --hm-p / --hm-empty），自动适配明暗主题。
 * 数据由 core.js collectPosts 提供，本地预览走本地文件，线上走 index.json。
 */
(function () {
  'use strict';

  var box = document.getElementById('heatmap');
  var loading = document.getElementById('hm-loading');
  if (!box) return;

  var CELL = 11;   // 方块边长
  var GAP = 3;     // 间隔
  var PITCH = CELL + GAP;

  var BOARDS = [
    { key: 'articles', cls: 'hm-a', label: '学习文档' },
    { key: 'cases',    cls: 'hm-c', label: '经验记录' },
    { key: 'projects', cls: 'hm-p', label: '开源项目' }
  ];

  Promise.all(BOARDS.map(function (b) {
    return NW.collectPosts(b.key).catch(function () { return []; });
  }))
    .then(function (lists) {
      if (loading) loading.style.display = 'none';

      // 日期 → { articles: n, cases: n, projects: n }
      var byDate = {};
      var totals = [0, 0, 0];
      lists.forEach(function (posts, i) {
        (posts || []).forEach(function (p) {
          var d = (p.date || '').slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
          totals[i]++;
          var e = byDate[d] = byDate[d] || {};
          e[BOARDS[i].key] = (e[BOARDS[i].key] || 0) + 1;
        });
      });

      var count = document.getElementById('hm-count');
      if (count) {
        count.textContent = '最近 12 个月 · 学习文档 ' + totals[0]
          + ' · 经验记录 ' + totals[1] + ' · 开源项目 ' + totals[2];
      }
      render(box, byDate);
    })
    .catch(function () {
      if (loading) {
        loading.textContent = '曝光记录暂时加载不出来（本地预览需启动 dev-server，线上稍后重试）。';
      }
    });

  function render(el, byDate) {
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

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="内容更新日期热力图">';
    svg += '<title>过去 12 个月的学习文档 / 经验记录 / 开源项目更新记录</title>';
    var clipId = 0;

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
        var x = leftLabels + wk * PITCH;
        var y = topLabels + dow * PITCH;

        var active = BOARDS.filter(function (b) {
          return byDate[key] && byDate[key][b.key] > 0;
        });

        if (active.length === 0) {
          svg += '<rect class="hm-cell hm-empty" x="' + x + '" y="' + y + '" width="' + CELL + '" height="' + CELL + '" rx="2"><title>' + key + '</title></rect>';
          continue;
        }

        // 同一天多板块：按板块顺序左右分段拼色（clip 保证圆角整齐）
        var cid = 'hmc' + (clipId++);
        var seg = CELL / active.length;
        var tip = key + ' · ' + active.map(function (b) {
          return b.label + ' ×' + byDate[key][b.key];
        }).join('，');
        svg += '<clipPath id="' + cid + '"><rect x="' + x + '" y="' + y + '" width="' + CELL + '" height="' + CELL + '" rx="2"/></clipPath>';
        svg += '<g clip-path="url(#' + cid + ')">';
        active.forEach(function (b, i) {
          // 分段多留 0.5px 重叠，避免亚像素缝隙
          var sw = (i === active.length - 1) ? seg : seg + 0.5;
          svg += '<rect class="hm-cell ' + b.cls + '" x="' + (x + i * seg) + '" y="' + y + '" width="' + sw + '" height="' + CELL + '"/>';
        });
        svg += '</g>';
        // 透明覆盖层：整格悬停显示统一 tooltip
        svg += '<rect fill="transparent" x="' + x + '" y="' + y + '" width="' + CELL + '" height="' + CELL + '"><title>' + tip + '</title></rect>';
      }
    }
    svg += '</svg>';
    el.innerHTML = svg;
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
})();
