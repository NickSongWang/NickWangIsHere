/*
 * 法定节假日倒计时模块：浏览器端每秒刷新，无需后端。
 * 数据维护：每年 11~12 月国务院办公厅公布来年放假安排后，更新 HOLIDAYS 表即可。
 * 当前数据：2026 年为官方公布安排；2027 年为按惯例预估，待官方公布后更新。
 */
(function () {
  'use strict';

  var HOLIDAYS = [
    { name: '元旦',   start: '2026-01-01', end: '2026-01-01', work: [] },
    { name: '春节',   start: '2026-02-15', end: '2026-02-22', work: ['2026-02-14', '2026-02-28'] },
    { name: '清明节', start: '2026-04-04', end: '2026-04-06', work: [] },
    { name: '劳动节', start: '2026-05-01', end: '2026-05-05', work: ['2026-04-26'] },
    { name: '端午节', start: '2026-06-19', end: '2026-06-21', work: [] },
    { name: '中秋节', start: '2026-09-25', end: '2026-09-27', work: [] },
    { name: '国庆节', start: '2026-10-01', end: '2026-10-08', work: ['2026-09-28', '2026-10-11'] },
    { name: '元旦',   start: '2027-01-01', end: '2027-01-03', work: [] },
    { name: '春节',   start: '2027-02-05', end: '2027-02-11', work: ['2027-02-14'] },
    { name: '清明节', start: '2027-04-03', end: '2027-04-05', work: [] },
    { name: '劳动节', start: '2027-05-01', end: '2027-05-05', work: ['2027-04-25'] },
    { name: '端午节', start: '2027-06-09', end: '2027-06-11', work: [] },
    { name: '中秋节', start: '2027-09-15', end: '2027-09-17', work: [] },
    { name: '国庆节', start: '2027-10-01', end: '2027-10-07', work: ['2027-10-09'] }
  ];

  var elPanel = document.getElementById('cdPanel');
  var elKicker = document.getElementById('cdKicker');
  var elName = document.getElementById('cdName');
  var elTimer = document.getElementById('cdTimer');
  var elNote = document.getElementById('cdNote');
  var elStampTxt = document.getElementById('cdStampTxt');

  function d(s) { return new Date(s + 'T00:00:00'); }
  function dayEnd(s) { var t = d(s); t.setDate(t.getDate() + 1); return t.getTime() - 1; }
  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function fmtDate(s) {
    var t = d(s);
    return (t.getMonth() + 1) + '月' + t.getDate() + '日（' + WEEK[t.getDay()] + '）';
  }
  function fmtShort(s) {
    var t = d(s);
    return t.getFullYear() + '.' + String(t.getMonth() + 1).padStart(2, '0') + '.' +
      String(t.getDate()).padStart(2, '0') + '（' + WEEK[t.getDay()] + '）';
  }
  function workText(list) {
    if (!list || !list.length) return '无需调休';
    return '调休上班：' + list.map(fmtDate).join('、');
  }
  function pad(n) { return String(n).padStart(2, '0'); }

  function findState(t) {
    var ts = t.getTime(), i, h;
    for (i = 0; i < HOLIDAYS.length; i++) {
      h = HOLIDAYS[i];
      if (ts >= d(h.start).getTime() && ts <= dayEnd(h.end)) return { mode: 'today', h: h };
    }
    for (i = 0; i < HOLIDAYS.length; i++) {
      h = HOLIDAYS[i];
      if (d(h.start).getTime() > ts) return { mode: 'pending', h: h };
    }
    return null;
  }

  function renderTimer(days, hrs, mins, secs) {
    elTimer.innerHTML =
      '<span class="cd-cell"><b class="cd-num cd-days">' + days + '</b><i class="cd-unit">天</i></span>' +
      '<span class="cd-divider" aria-hidden="true"></span>' +
      '<span class="cd-cell"><b class="cd-num">' + pad(hrs) + '</b><i class="cd-unit">时</i></span>' +
      '<span class="cd-cell"><b class="cd-num">' + pad(mins) + '</b><i class="cd-unit">分</i></span>' +
      '<span class="cd-cell"><b class="cd-num">' + pad(secs) + '</b><i class="cd-unit">秒</i></span>';
  }

  function tick() {
    var t = new Date();
    var st = findState(t);
    if (!st) {
      elName.textContent = '数据待更新';
      elNote.textContent = '节假日表需要补充新年度数据。';
      return;
    }
    var h = st.h;
    var span = (d(h.end) - d(h.start)) / 864e5 + 1;

    if (st.mode === 'pending') {
      var left = d(h.start).getTime() - t.getTime();
      var days = Math.floor(left / 864e5);
      var hrs = Math.floor(left % 864e5 / 36e5);
      var mins = Math.floor(left % 36e5 / 6e4);
      var secs = Math.floor(left % 6e4 / 1e3);
      elPanel.classList.remove('today');
      elKicker.textContent = 'NEXT HOLIDAY · 下一个法定节假日';
      elName.innerHTML = h.name + '<span class="cd-date">' + fmtShort(h.start) + ' · 连休 ' + span + ' 天</span>';
      renderTimer(days, hrs, mins, secs);
      elNote.innerHTML = '<b>' + fmtDate(h.start) + '</b> 至 <b>' + fmtDate(h.end) + '</b> 放假 · ' + workText(h.work);
      elStampTxt.textContent = '倒数';
    } else {
      var leftEnd = dayEnd(h.end) - t.getTime();
      var days2 = Math.floor(leftEnd / 864e5);
      var hrs2 = Math.floor(leftEnd % 864e5 / 36e5);
      var mins2 = Math.floor(leftEnd % 36e5 / 6e4);
      var secs2 = Math.floor(leftEnd % 6e4 / 1e3);
      var dayNo = Math.floor((t.getTime() - d(h.start).getTime()) / 864e5) + 1;
      elPanel.classList.add('today');
      elKicker.textContent = 'HOLIDAY · 今天放假 · 距收假倒计时';
      elName.innerHTML = '今天就是' + h.name + '，好好休息<span class="cd-date">假期第 ' + dayNo + ' 天 / 共 ' + span + ' 天</span>';
      renderTimer(days2, hrs2, mins2, secs2);
      elNote.innerHTML = '假期至 <b>' + fmtDate(h.end) + '</b> · ' + workText(h.work);
      elStampTxt.textContent = '今天';
    }
  }

  tick();
  setInterval(tick, 1000);
})();
