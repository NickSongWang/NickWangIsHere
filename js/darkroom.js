/*
 * darkroom.js — 页头唯一的模式控制按钮
 * - 单击：明室 / 暗室 互换（localStorage 记忆，按钮文字显示当前状态）
 * - 暗室下悬停按钮：光标旁显示「长按试一下」提示（仅暗室可长按时显示）
 * - 暗室下长按按钮（550ms）：进入「暗房开红灯」模式（localStorage 记忆）
 * - 暗房模式中单击：关灯，返回暗室（不切到明室）
 * - 支持 ?darkroom=1 / ?darkroom=0 链接参数（分享暗房状态链接）
 * - 防误触：普通单击在 550ms 内松开，长按定时器随即取消，二者互不干扰
 */
(function () {
  'use strict';

  var KEY_DR = 'nickwang-darkroom';
  var KEY_LT = 'nickwang-light';
  var PRESS_MS = 550;
  var root = document.documentElement;

  var btn = document.getElementById('themeBtn');
  if (!btn) return;

  // URL 参数优先于本地记忆（用于分享暗房链接）
  try {
    var m = location.search.match(/[?&]darkroom=(1|0)/);
    if (m) {
      if (m[1] === '1') { root.classList.add('darkroom'); }
      else { root.classList.remove('darkroom'); }
    }
  } catch (e) { /* ignore */ }

  // toast（暗房进出提示，底部居中）
  var toast = document.createElement('div');
  toast.className = 'darkroom-toast';
  document.body.appendChild(toast);
  var toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  // 「长按试一下」提示（跟随光标的小气泡）
  var hint = document.createElement('div');
  hint.className = 'press-hint';
  hint.textContent = '长按试一下';
  document.body.appendChild(hint);
  function showHint(x, y) {
    hint.style.left = Math.min(x + 16, window.innerWidth - 130) + 'px';
    hint.style.top = Math.min(y + 20, window.innerHeight - 44) + 'px';
    hint.classList.add('show');
  }
  function hideHint() { hint.classList.remove('show'); }

  function inLight() { return root.classList.contains('light'); }
  function inRed() { return root.classList.contains('darkroom'); }
  // 可长按的状态：暗室（非明室、非暗房）
  function canPress() { return !inLight() && !inRed(); }

  // ---- 悬停提示（仅鼠标；仅暗室状态） ----
  btn.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse' && canPress()) showHint(e.clientX, e.clientY);
  });
  btn.addEventListener('pointermove', function (e) {
    if (hint.classList.contains('show')) showHint(e.clientX, e.clientY);
  });
  btn.addEventListener('pointerleave', hideHint);
  btn.addEventListener('pointerdown', hideHint);

  // ---- 长按检测 ----
  var pressTimer = null;
  var suppressClick = false; // 长按触发后，吞掉随后到来的 click

  btn.addEventListener('pointerdown', function () {
    suppressClick = false;
    clearTimeout(pressTimer);
    if (canPress()) {
      pressTimer = setTimeout(function () {
        suppressClick = true;
        enterDarkroom();
      }, PRESS_MS);
    }
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    btn.addEventListener(ev, function () { clearTimeout(pressTimer); });
  });
  // 触屏长按不弹出系统菜单
  btn.addEventListener('contextmenu', function (e) {
    if (!inLight()) e.preventDefault();
  });

  function enterDarkroom() {
    root.classList.add('darkroom');
    try { localStorage.setItem(KEY_DR, '1'); } catch (e) { /* ignore */ }
    showToast('红灯亮了 · 相纸别见白光');
  }
  function exitDarkroom() {
    root.classList.remove('darkroom');
    try { localStorage.setItem(KEY_DR, '0'); } catch (e) { /* ignore */ }
    showToast('咔嗒 · 关灯，回到暗室');
  }

  // ---- 单击：状态机 ----
  btn.addEventListener('click', function () {
    if (suppressClick) { suppressClick = false; return; } // 长按后的 click，忽略
    if (inRed()) {
      // 暗房中单击 = 关灯，回暗室
      exitDarkroom();
      return;
    }
    // 明暗互换
    var on = root.classList.toggle('light');
    try { localStorage.setItem(KEY_LT, on ? '1' : '0'); } catch (e) { /* ignore */ }
  });
})();
