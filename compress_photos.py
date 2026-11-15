#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""压缩 photos/ 目录下的照片原图为 WebP，并删除原图。

用法（在 Git Bash 中）：
    cd "E:/ThinkWhatIsWhat Studio/Codex_work_here/NickWangIsHere"
    python compress_photos.py

参数默认值：最长边 2048px，WebP 质量 80。如需调整可改下方常量。
依赖 Pillow：未安装时脚本会提示执行  python -m pip install pillow
"""
import os
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    print("未安装 Pillow，请先执行：python -m pip install pillow")
    sys.exit(1)

# 兼容 Windows 控制台中文输出
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET_DIR = os.path.join(SCRIPT_DIR, "photos")

MAX_SIDE = 2048      # 最长边像素
QUALITY = 80         # WebP 质量（0-100）
IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


def mb(n):
    return "%.2fMB" % (n / 1e6)


def compress_one(path):
    stem, ext = os.path.splitext(path)
    if ext.lower() not in IMG_EXTS:
        return None
    name = os.path.basename(path)
    before = os.path.getsize(path)
    try:
        img = Image.open(path)
        img.load()
        img = ImageOps.exif_transpose(img)  # 按 EXIF 方向纠正，避免竖图躺倒
        w, h = img.size
        longest = max(w, h)
        if longest > MAX_SIDE:
            scale = MAX_SIDE / float(longest)
            img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
        out = stem + ".webp"
        img.save(out, "WEBP", quality=QUALITY, method=6)
        after = os.path.getsize(out)
        os.remove(path)  # 删除原图（git 历史中仍保留，可找回）
        return name, before, os.path.basename(out), after
    except Exception as e:
        print("  跳过 %s：%s" % (name, e))
        return None


def main():
    if not os.path.isdir(TARGET_DIR):
        print("目录不存在：%s" % TARGET_DIR)
        sys.exit(1)
    files = sorted(
        f for f in os.listdir(TARGET_DIR)
        if os.path.splitext(f)[1].lower() in IMG_EXTS
    )
    if not files:
        print("photos/ 下没有需要压缩的原图。")
        return
    total_before = total_after = 0
    print("处理目录：%s\n" % TARGET_DIR)
    for f in files:
        r = compress_one(os.path.join(TARGET_DIR, f))
        if r:
            name, before, out_name, after = r
            total_before += before
            total_after += after
            print("  %s  %s -> %s  (存为 %s)" % (name, mb(before), mb(after), out_name))
    print("\n完成：%s -> %s" % (mb(total_before), mb(total_after)))


if __name__ == "__main__":
    main()
