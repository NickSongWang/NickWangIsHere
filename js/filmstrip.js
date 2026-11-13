/*
 * filmstrip.js — 首页「胶片匣 · SELECTED FRAMES」
 * 展示 photos/ 下全部照片（按文件名排序），照片多时可横向滚动。
 * 悬停在胶片条上时，鼠标滚轮转为横向滚动（有头有尾，无循环）。
 */
(function () {
  'use strict';

  var strip = document.getElementById('frames');
  if (!strip) return;

  var IMG_EXT = /\.(jpe?g|png|gif|webp|bmp|svg|avif)$/i;
  var countEl = document.querySelector('.film-sec .sec-h span');

  function placeholder() {
    return '<div class="frame f1"><span class="no">No.01</span><span class="cap">待冲印</span></div>' +
           '<div class="frame f2"><span class="no">No.02</span><span class="cap">待冲印</span></div>' +
           '<div class="frame f3"><span class="no">No.03</span><span class="cap">待冲印</span></div>' +
           '<div class="frame f4"><span class="no">No.04</span><span class="cap">待冲印</span></div>';
  }

  NW.fetchContents('photos')
    .then(function (items) {
      var files = (items || []).filter(function (i) {
        return i.type === 'file' && IMG_EXT.test(i.name);
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });

      if (!files.length) { strip.innerHTML = placeholder(); return; }

      if (countEl) countEl.textContent = 'ROLL 01 — ' + files.length + ' EXP';

      strip.innerHTML = files.map(function (f, i) {
        var url = NW.rawBase + NW.encodePath(f.path) + NW.cacheBust();
        var no = 'No.' + (i < 9 ? '0' : '') + (i + 1);
        return '<div class="frame" style="background-image:url(\'' + url + '\')">' +
               '<span class="no">' + no + '</span>' +
               '<span class="cap">' + NW.escapeHtml(f.name) + '</span></div>';
      }).join('');
    })
    .catch(function () { strip.innerHTML = placeholder(); });

  // 悬停胶片匣时，垂直滚轮 → 横向滚动（到尽头则交还页面滚动，有头有尾不循环）
  var film = document.querySelector('.film');
  if (film) {
    film.addEventListener('wheel', function (e) {
      var canRight = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1;
      var canLeft = strip.scrollLeft > 0;
      if ((e.deltaY > 0 && canRight) || (e.deltaY < 0 && canLeft)) {
        e.preventDefault();
        strip.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }
})();
