/*
 * toolbox.js — 工具箱（暗房工作台）
 * 窗口系统：打开 / 最小化 / 恢复 / 关闭 / 聚焦，工具默认全屏铺满工作区。
 * 工具通过 TOOLS 数组注册，每项提供 render(root) 负责填充内容与绑定交互。
 * 首个工具：dB 单位换算器（dBu / dBV / dBFS / dB SPL / 比值，双向实时换算）。
 */
(function () {
  'use strict';

  /* ============================================================
     工具注册表
     ============================================================ */
  var TOOLS = [
    {
      id: 'dbconv', name: 'dB 换算', icon: 'dB',
      desc: 'dBu · dBV · dBFS · dB SPL · 比值',
      render: renderDbConverter
    }
  ];

  /* ============================================================
     窗口系统
     ============================================================ */
  var stageEl = document.getElementById('tbStage');
  var gridEl = document.getElementById('tbGrid');
  var dockEl = document.getElementById('tbDock');

  var winMap = {};     // id -> { status:'open'|'min', el }
  var zTop = 10;       // 层级计数，聚焦时自增
  var activeId = null;

  function init() {
    if (!stageEl || !gridEl || !dockEl) return;
    gridEl.innerHTML = TOOLS.map(function (t) {
      return '<div class="tb-card" data-id="' + t.id + '">' +
        '<div class="ic">' + t.icon + '</div><h3>' + t.name + '</h3><p>' + t.desc + '</p></div>';
    }).join('');

    gridEl.addEventListener('click', function (e) {
      var c = e.target.closest('.tb-card');
      if (!c) return;
      openTool(c.getAttribute('data-id'));
    });

    dockEl.addEventListener('click', function (e) {
      var it = e.target.closest('.dock-item');
      if (!it) return;
      var id = it.getAttribute('data-id');
      var w = winMap[id];
      if (!w) return;
      if (w.status === 'min') restoreTool(id);
      else if (activeId === id) minimizeTool(id);
      else focusTool(id);
    });

    renderDock();
  }

  function openTool(id) {
    if (winMap[id]) {
      if (winMap[id].status === 'min') restoreTool(id);
      else focusTool(id);
      return;
    }
    var t = TOOLS.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var el = document.createElement('div');
    el.className = 'tb-win';
    el.innerHTML =
      '<div class="bar"><span class="ttl"><span class="dot"></span>' + t.name + '</span>' +
      '<span class="btns"><button class="mn" title="最小化">–</button><button class="x" title="关闭">×</button></span></div>' +
      '<div class="body"></div>';
    stageEl.appendChild(el);
    winMap[id] = { status: 'open', el: el };

    if (t.render) t.render(el.querySelector('.body'));

    markCard(id, true);
    renderDock();
    focusTool(id);

    el.addEventListener('mousedown', function () { focusTool(id); });
    el.querySelector('.mn').addEventListener('click', function (e) { e.stopPropagation(); minimizeTool(id); });
    el.querySelector('.x').addEventListener('click', function (e) { e.stopPropagation(); closeTool(id); });
  }

  function focusTool(id) {
    var w = winMap[id];
    if (!w || w.status !== 'open') return;
    w.el.style.zIndex = ++zTop;
    if (activeId && winMap[activeId]) winMap[activeId].el.classList.remove('active');
    activeId = id;
    w.el.classList.add('active');
    renderDock();
  }

  function minimizeTool(id) {
    var w = winMap[id];
    if (!w || w.status !== 'open') return;
    w.status = 'min';
    w.el.style.display = 'none';
    if (activeId === id) activeId = null;
    renderDock();
  }

  function restoreTool(id) {
    var w = winMap[id];
    if (!w || w.status !== 'min') return;
    w.status = 'open';
    w.el.style.display = 'flex';
    renderDock();
    focusTool(id);
  }

  function closeTool(id) {
    var w = winMap[id];
    if (!w) return;
    if (w.el && w.el.parentNode) w.el.parentNode.removeChild(w.el);
    delete winMap[id];
    if (activeId === id) activeId = null;
    markCard(id, false);
    renderDock();
  }

  function markCard(id, on) {
    var card = gridEl.querySelector('.tb-card[data-id="' + id + '"]');
    if (card) card.classList.toggle('open', on);
  }

  function renderDock() {
    var ids = Object.keys(winMap);
    var cap = '<div class="cap">DOCK · 已打开 ' + ids.length + ' 个工具</div>';
    if (!ids.length) {
      dockEl.innerHTML = cap + '<span class="dock-empty">任务栏为空 —— 点上方工具卡片打开</span>';
      return;
    }
    dockEl.innerHTML = cap + ids.map(function (id) {
      var w = winMap[id];
      var t = TOOLS.filter(function (x) { return x.id === id; })[0];
      var cls = 'dock-item ' + w.status + (w.status === 'open' && activeId === id ? ' active' : '');
      return '<button class="' + cls + '" data-id="' + id + '">' +
        '<span class="st"></span><span class="ic">' + t.icon + '</span><span class="nm">' + t.name + '</span></button>';
    }).join('');
  }

  /* ============================================================
     工具实现：dB 单位换算器
     基准：0 dBu = √0.6 V ≈ 0.7745966692 V；0 dBV = 1 V；
           0 dB SPL = 20 µPa；dBFS 以「0 dBFS = X dBu」为参考。
     三组独立双向换算：电平 / 声压级 / 比值
     ============================================================ */
  function renderDbConverter(root) {
    var V0 = 0.7745966692;   // 0 dBu 参考电压 (V)
    var P0 = 2e-5;           // 0 dB SPL 参考声压 (Pa)
    var fsRef = 22;          // 0 dBFS 对应的 dBu 值（可调）

    root.innerHTML =
      '<div class="db-wrap">' +
        '<div class="db-head"><div class="db-ic">dB</div><h2>音频单位换算</h2>' +
        '<p>dBu · dBV · dBFS · dB SPL · 比值 —— 任意输入，实时双向换算</p></div>' +

        '<section class="db-sec"><h3>电平 LEVEL <span>0 dBu = 0.7746 V · 0 dBV = 1 V</span></h3>' +
          '<div class="db-grid">' +
            '<label>电压 RMS<input data-f="V" inputmode="decimal" autocomplete="off"><i>V</i></label>' +
            '<label>dBu<input data-f="dBu" inputmode="decimal" autocomplete="off"><i>dBu</i></label>' +
            '<label>dBV<input data-f="dBV" inputmode="decimal" autocomplete="off"><i>dBV</i></label>' +
            '<label>dBFS<input data-f="dBFS" inputmode="decimal" autocomplete="off"><i>dBFS</i></label>' +
          '</div>' +
          '<div class="db-ref">0 dBFS 参考电平 <input id="dbFsRef" type="number" value="22" step="1" min="0"> dBu' +
          ' <span>（即 -18 dBFS = +4 dBu 的常用对齐）</span></div>' +
        '</section>' +

        '<section class="db-sec"><h3>声压级 SPL <span>0 dB SPL = 20 µPa（人耳听阈）</span></h3>' +
          '<div class="db-grid">' +
            '<label>声压<input data-f="Pa" inputmode="decimal" autocomplete="off"><i>Pa</i></label>' +
            '<label>dB SPL<input data-f="dBSPL" inputmode="decimal" autocomplete="off"><i>dB SPL</i></label>' +
          '</div>' +
        '</section>' +

        '<section class="db-sec"><h3>比值 RATIO <span>电压比 20·log · 功率比 10·log</span></h3>' +
          '<div class="db-grid">' +
            '<label>dB<input data-f="dB" inputmode="decimal" autocomplete="off"><i>dB</i></label>' +
            '<label>电压比<input data-f="vr" inputmode="decimal" autocomplete="off"><i>×</i></label>' +
            '<label>功率比<input data-f="pr" inputmode="decimal" autocomplete="off"><i>×</i></label>' +
          '</div>' +
        '</section>' +
      '</div>';

    /* ---- 通用组联动：编辑任一字段 → 以它为源，换算同组其余字段 ---- */
    function bindGroup(fields, fromCommon, toCommon, common0) {
      var inputs = {};
      fields.forEach(function (f) {
        inputs[f.key] = root.querySelector('[data-f="' + f.key + '"]');
      });
      function refresh(srcKey) {
        var v = parseFloat(inputs[srcKey].value);
        if (!isFinite(v)) return;
        var common = toCommon[srcKey](v);
        if (!isFinite(common)) return;   // 对数定义域外（≤0）则忽略
        fields.forEach(function (f) {
          if (f.key === srcKey) return;
          inputs[f.key].value = fmt(fromCommon[f.key](common), f.mode);
        });
      }
      fields.forEach(function (f) {
        inputs[f.key].addEventListener('input', function () { refresh(f.key); });
      });
      fields.forEach(function (f) {
        inputs[f.key].value = fmt(fromCommon[f.key](common0), f.mode);
      });
      return inputs;
    }

    /* 电平组：中间量 = 电压 V */
    var lvl = bindGroup(
      [
        { key: 'V', mode: 'lin' },
        { key: 'dBu', mode: 'db' },
        { key: 'dBV', mode: 'db' },
        { key: 'dBFS', mode: 'db' }
      ],
      { // fromCommon: V -> 字段值
        V: function (V) { return V; },
        dBu: function (V) { return 20 * Math.log10(V / V0); },
        dBV: function (V) { return 20 * Math.log10(V); },
        dBFS: function (V) { return 20 * Math.log10(V / V0) - fsRef; }
      },
      { // toCommon: 字段值 -> V
        V: function (x) { return x; },
        dBu: function (x) { return V0 * Math.pow(10, x / 20); },
        dBV: function (x) { return Math.pow(10, x / 20); },
        dBFS: function (x) { return V0 * Math.pow(10, (x + fsRef) / 20); }
      },
      V0
    );

    /* 声压组：中间量 = 声压 Pa */
    bindGroup(
      [
        { key: 'Pa', mode: 'lin' },
        { key: 'dBSPL', mode: 'db' }
      ],
      {
        Pa: function (Pa) { return Pa; },
        dBSPL: function (Pa) { return 20 * Math.log10(Pa / P0); }
      },
      {
        Pa: function (x) { return x; },
        dBSPL: function (x) { return P0 * Math.pow(10, x / 20); }
      },
      P0
    );

    /* 比值组：中间量 = dB */
    bindGroup(
      [
        { key: 'dB', mode: 'db' },
        { key: 'vr', mode: 'lin' },
        { key: 'pr', mode: 'lin' }
      ],
      {
        dB: function (dB) { return dB; },
        vr: function (dB) { return Math.pow(10, dB / 20); },
        pr: function (dB) { return Math.pow(10, dB / 10); }
      },
      {
        dB: function (x) { return x; },
        vr: function (x) { return 20 * Math.log10(x); },
        pr: function (x) { return 10 * Math.log10(x); }
      },
      0
    );

    /* dBFS 参考电平改变时：以当前电压 V 为基准，重算 dBFS */
    var fsInput = root.querySelector('#dbFsRef');
    fsInput.addEventListener('input', function () {
      var r = parseFloat(fsInput.value);
      if (!isFinite(r) || r <= 0) return;
      fsRef = r;
      var V = parseFloat(lvl.V.value);
      if (isFinite(V) && V > 0) {
        lvl.dBFS.value = fmt(20 * Math.log10(V / V0) - fsRef, 'db');
      }
    });
  }

  /* ---- 数值格式化：dB 保留 3 位小数；线性值智能精度 / 科学计数 ---- */
  function fmt(v, mode) {
    if (!isFinite(v)) return '';
    if (mode === 'db') return String(Math.round(v * 1000) / 1000);
    if (v === 0) return '0';
    var a = Math.abs(v);
    if (a >= 1e6 || a < 1e-4) return v.toExponential(3);
    return String(parseFloat(v.toPrecision(6)));
  }

  init();
})();
