/*
 * filmstrip.js — 首页「胶片匣 · SELECTED FRAMES」
 * 展示 photos/ 下全部照片（按文件名排序），以仿真 135 胶片条呈现：
 * 深棕片基 + 圆角齿孔 + 边字 + 帧号 + 右侧 5294 暗盒。
 * 照片横幅按比例缩放、竖幅旋转 90° 横过来；滚轮转横向滚动。
 */
(function () {
  'use strict';

  var stripEl = document.getElementById('frames');
  if (!stripEl) return;
  var filmStrip = document.getElementById('film-strip');
  var IMG_EXT = /\.(jpe?g|png|gif|webp|bmp|svg|avif)$/i;
  var countEl = document.querySelector('.film-sec .sec-h span');

  function placeholder() {
    return '<div class="frame f1"><span class="cap">待冲印</span></div>' +
           '<div class="frame f2"><span class="cap">待冲印</span></div>' +
           '<div class="frame f3"><span class="cap">待冲印</span></div>' +
           '<div class="frame f4"><span class="cap">待冲印</span></div>';
  }

  // 悬停胶片条时，垂直滚轮 → 横向滚动（到尽头交还页面滚动）
  if (filmStrip) {
    filmStrip.addEventListener('wheel', function (e) {
      var canRight = filmStrip.scrollLeft + filmStrip.clientWidth < filmStrip.scrollWidth - 1;
      var canLeft = filmStrip.scrollLeft > 0;
      var dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if ((dx > 0 && canRight) || (dx < 0 && canLeft)) {
        e.preventDefault();
        filmStrip.scrollLeft += dx;
      }
    }, { passive: false });
  }

  NW.fetchContents('photos')
    .then(function (items) {
      var files = (items || []).filter(function (i) {
        return i.type === 'file' && IMG_EXT.test(i.name);
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });

      if (!files.length) { stripEl.innerHTML = placeholder(); return; }
      if (countEl) countEl.textContent = 'ROLL 01 — ' + files.length + ' EXP';

      stripEl.innerHTML = files.map(function (f) {
        var url = NW.rawBase + NW.encodePath(f.path) + NW.cacheBust();
        return '<div class="frame"><img src="' + url + '" alt="' + NW.escapeHtml(f.name) + '"></div>';
      }).join('');

      buildStrip();
    })
    .catch(function () { stripEl.innerHTML = placeholder(); });

  function buildStrip() {
    // 齿孔（圆角矩形，参考 135 胶片：间距 23.75px、孔宽 10.44px）
    var perfRows = document.querySelectorAll('.perf-row');
    var pitch = 23.75;
    var holeCount = Math.ceil((stripEl.scrollWidth + 24) / pitch);
    perfRows.forEach(function (row) {
      for (var i = 0; i < holeCount; i++) {
        var hole = document.createElement('i');
        row.appendChild(hole);
      }
    });

    // 照片缩放：横幅按比例缩放，竖幅旋转 90° 横过来
    var imgs = stripEl.querySelectorAll('img');
    imgs.forEach(function (img) {
      function fit() {
        var w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) return;
        var FW = 174, FH = 116;
        if (h > w) {
          var rw = FH * (h / w);
          img.style.width = FH + 'px';
          img.style.height = rw + 'px';
          img.style.marginLeft = -(FH / 2) + 'px';
          img.style.marginTop = -(rw / 2) + 'px';
          img.style.transform = 'rotate(90deg)';
        } else {
          var s = Math.min(FW / w, FH / h);
          var dw = w * s, dh = h * s;
          img.style.width = dw + 'px';
          img.style.height = dh + 'px';
          img.style.marginLeft = -(dw / 2) + 'px';
          img.style.marginTop = -(dh / 2) + 'px';
          img.style.transform = 'none';
        }
      }
      if (img.complete) fit();
      else img.addEventListener('load', fit);
    });

    // 帧号印在下边带，与照片对齐（N/NA 样式）
    var numRow = document.querySelector('.edge-num-row');
    var frames = stripEl.querySelectorAll('.frame');
    if (numRow && frames.length) {
      var numRect = numRow.getBoundingClientRect();
      frames.forEach(function (frame, i) {
        var fr = frame.getBoundingClientRect();
        var num = document.createElement('span');
        num.className = 'edge-num';
        num.textContent = (i + 1) + 'A';
        num.style.left = (fr.left - numRect.left) + 'px';
        num.style.width = fr.width + 'px';
        numRow.appendChild(num);
      });
    }
  }
})();
