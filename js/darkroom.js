/* 暗房红灯模式（SAFELIGHT）
   - 点击页头"暗房"按钮切换全站红色安全灯
   - localStorage 跨页保持状态
   - 支持 ?darkroom=1 / ?darkroom=0 链接参数（可直接分享"暗房状态"的链接） */
(function () {
  var KEY = 'nickwang-darkroom';
  var root = document.documentElement;

  // URL 参数优先于本地记忆（用于分享暗房链接）
  try {
    var m = location.search.match(/[?&]darkroom=(1|0)/);
    if (m) {
      if (m[1] === '1') { root.classList.add('darkroom'); }
      else { root.classList.remove('darkroom'); }
    }
  } catch (e) { /* ignore */ }

  var btn = document.getElementById('darkroomBtn');
  if (!btn) return;

  // toast 元素
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

  function syncBtn() {
    btn.setAttribute('aria-pressed', root.classList.contains('darkroom') ? 'true' : 'false');
  }

  btn.addEventListener('click', function () {
    var on = root.classList.toggle('darkroom');
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
    syncBtn();
    showToast(on ? '红灯亮了 · 相纸别见白光' : '咔嗒 · 回到明室');
  });

  syncBtn();
})();
