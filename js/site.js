/*
 * site.js — 全站共享页面行为
 * 页脚年份自动填充、移动端汉堡菜单、.reveal 入场动画。
 * 在所有页面（body 末尾）于页面专属脚本之前引入。
 */
(function () {
  'use strict';

  // 页脚年份
  var y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();

  // 明暗主题 / 暗房模式：统一由 darkroom.js 管理（单击切换 + 长按进暗房）

  // 移动端菜单：开合 + 点击链接后自动收起
  var nav = document.getElementById('nav');
  var menuBtn = document.getElementById('menuBtn');
  if (nav && menuBtn) {
    menuBtn.onclick = function () { nav.classList.toggle('open'); };
    nav.querySelectorAll('a').forEach(function (a) {
      a.onclick = function () { nav.classList.remove('open'); };
    });
  }

  // 入场动画：进入视口时点亮；不支持 IntersectionObserver 的环境直接显示
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('on'); });
    }, { threshold: .1 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('on'); });
  }
})();
