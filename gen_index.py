#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 index.json —— 预生成内容索引，消除 GitHub API 限流。

扫描 articles/、cases/、projects/ 目录下的 Markdown（一夹一篇 + 散装 md），
解析 front matter 与标题/日期/摘要/封面，连同 photos/ 图片清单一起写入
项目根目录的 index.json。

用法（在 Git Bash 中）：
    cd "E:/ThinkWhatIsWhat Studio/Codex_work_here/NickWangIsHere"
    python gen_index.py

每次新增/修改文章、案例、项目或照片后，重新运行本脚本再推送即可。
"""
import os
import re
import json
import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
IMG_EXT = re.compile(r'\.(jpe?g|png|gif|webp|bmp|svg|avif)$', re.I)


def parse_front_matter(text):
    m = re.match(r'^---\r?\n([\s\S]*?)\r?\n-{3}\s*\n?', text)
    if not m:
        return text, {}
    fm = {}
    for line in m.group(1).split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        idx = line.find(':')
        if idx <= 0:
            continue
        key = line[:idx].strip()
        val = line[idx + 1:].strip()
        if val.startswith('[') and val.endswith(']'):
            val = val[1:-1]
        if len(val) >= 2 and val[0] in '"\'' and val[-1] == val[0]:
            val = val[1:-1]
        fm[key] = val
    return text[m.end():].lstrip('\n'), fm


def extract_summary(body):
    text = body
    text = re.sub(r'^#\s+.+$', '', text, flags=re.M)
    text = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', text)
    text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)
    text = re.sub(r'#+\s*', '', text)
    text = re.sub(r'[*`>_]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) > 120:
        text = text[:120] + '…'
    return text


def build_post(path, name, text):
    body, fm = parse_front_matter(text)
    title = fm.get('title')
    if not title:
        m = re.search(r'^#\s+(.+?)\s*$', body, flags=re.M)
        if m:
            title = m.group(1).strip()
    if not title:
        title = re.sub(r'\.md$', '', name)
    date = fm.get('date', '')
    if not date:
        m = re.match(r'^(\d{4}-\d{2}-\d{2})[-_ ]', name) or re.match(r'^(\d{4}-\d{2}-\d{2})[-_ ]', path)
        if m:
            date = m.group(1)
    folder = path[:path.rfind('/') + 1] if '/' in path else ''
    cover = fm.get('cover', '')
    if cover:
        cover = folder + cover
    return {
        'path': path,
        'title': title,
        'date': date,
        'tags': fm.get('tags', ''),
        'summary': fm.get('summary', extract_summary(body)),
        'cover': cover,
        'fm': fm,
        'body': body,
    }


def collect(dirname):
    posts = []
    base = os.path.join(ROOT, dirname)
    if not os.path.isdir(base):
        return posts
    for entry in sorted(os.listdir(base)):
        if entry.startswith('_'):
            continue
        full = os.path.join(base, entry)
        if os.path.isdir(full):
            for f in sorted(os.listdir(full)):
                if f.endswith('.md') and not f.startswith('_'):
                    p = dirname + '/' + entry + '/' + f
                    with open(os.path.join(full, f), encoding='utf-8') as fh:
                        posts.append(build_post(p, f, fh.read()))
                    break
        elif entry.endswith('.md'):
            p = dirname + '/' + entry
            with open(full, encoding='utf-8') as fh:
                posts.append(build_post(p, entry, fh.read()))
    posts.sort(key=lambda x: x.get('date', ''), reverse=True)
    return posts


def collect_photos():
    photos = []
    base = os.path.join(ROOT, 'photos')
    if not os.path.isdir(base):
        return photos
    for entry in sorted(os.listdir(base)):
        if IMG_EXT.search(entry):
            p = 'photos/' + entry
            photos.append({'name': entry, 'path': p,
                           'size': os.path.getsize(os.path.join(base, entry))})
    return photos


def main():
    data = {
        'generated': datetime.datetime.now().isoformat(timespec='seconds'),
        'articles': collect('articles'),
        'cases': collect('cases'),
        'projects': collect('projects'),
        'photos': collect_photos(),
    }
    out = os.path.join(ROOT, 'index.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    print('index.json 已生成：articles=%d cases=%d projects=%d photos=%d' % (
        len(data['articles']), len(data['cases']),
        len(data['projects']), len(data['photos'])))


if __name__ == '__main__':
    main()
