/*
 * blog.js — 手记列表页（文章流）
 * 数据收集由 core.js 提供（支持"一夹一篇"与旧式散放两种存放方式）。
 * 首页已不再引入本文件；手记列表在 blog.html（手记页）展示。
 */
(function () {
  'use strict';

  var list = document.getElementById('post-list');
  var loading = document.getElementById('loading');
  var error = document.getElementById('error');
  if (!list || !loading || !error) return;

  var DIR = (new URLSearchParams(window.location.search).get('dir') || 'articles').replace(/^\/+|\/+$/g, '');

  NW.collectPosts(DIR)
    .then(function (posts) {
      loading.style.display = 'none';
      if (!posts.length) {
        loading.textContent = '还没有手记。在 articles/ 下新建一个文件夹，放入 index.md 和配图，推送后会自动出现在这里。';
        loading.style.display = '';
        return;
      }
      list.innerHTML = posts.map(renderPost).join('');
    })
    .catch(function (e) {
      loading.style.display = 'none';
      error.style.display = '';
      error.textContent = '手记列表加载失败：' + e.message + '（刷新重试，或检查 articles/ 文件夹是否存在）';
    });

  function renderPost(p, i) {
    var num = 'N.' + (i < 9 ? '0' : '') + (i + 1);
    var d = (p.date || '').slice(0, 10);
    var tags = (p.tags || '').split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean);
    var tagHtml = tags.map(function (t) {
      return '<span class="tag">' + NW.escapeHtml(t) + '</span>';
    }).join('');
    return '<a class="essay' + (p.cover ? ' has-cover' : '') + '" href="article.html?f=' + encodeURIComponent(p.path) + '">' +
      '<span class="no">' + num + '</span>' +
      (p.cover ? '<span class="cover" style="background-image:url(\'' + NW.rawBase + NW.encodePath(p.cover) + '\')"></span>' : '') +
      '<div class="body">' +
      '<h3>' + NW.escapeHtml(p.title) + '</h3>' +
      '<p class="meta">' + NW.escapeHtml(d) + (tagHtml ? ' · ' + tagHtml : '') + '</p>' +
      (p.summary ? '<p class="sum">' + NW.escapeHtml(p.summary) + '</p>' : '') +
      '</div>' +
      '</a>';
  }
})();
