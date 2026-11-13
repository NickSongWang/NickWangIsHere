---
title: 桌面音频 VU 表灯箱
summary: 【占位】ESP32 + RMS 检波，模拟表头与 WS2812 混合显示的立体声 VU 表
date: 2026-11-02
status: open
level: 3
tags: [音频, 桌面设备]
stack: [ESP32, WS2812, KiCad]
repo: NickSongWang/vu-meter-lightbox
lc: NickWang/vu-meter
license: MIT
release: v1.2.0
---

## 01 · 背景与目标

【占位】在这里写：为什么做这个项目、目标指标（动态范围 / 成本 / 尺寸等）。

## 02 · 原理与设计

【占位】方案框图用 draw.io 导出 SVG 放在本文件夹，引用 `![框图](block.svg)`。
核心公式示例（真有效值检波）：

$$V_{rms} = \sqrt{\frac{1}{T}\int_0^T v^2(t)\,dt}$$

## 03 · 实现过程

【占位】焊接完成的照片放本文件夹，`![实物](photo1.jpg)`。
固件核心代码示例：

```c
// 【占位】RMS 窗口采样
for (int i = 0; i < N; i++) {
  int s = adc_read(MIC_CH) - DC_OFFSET;
  acc += (int64_t)s * s;
}
float vrms = sqrtf((float)acc / N);
```

## 04 · BOM 物料清单

| 元件 | 规格型号 | 数量 | 参考价 |
|---|---|---|---|
| 主控 | 【占位】ESP32-S3 | 1 | ¥ 28 |
| 表头 | 【占位】 | 2 | ¥ 56 |

## 05 · 成果与指标

【占位】实测数据列表 + 示波器截图。

## 06 · 踩坑记录

【占位】例如：WS2812 长线传输丢帧——完整排查见[返修台](cases.html)。

## 07 · 复刻指南

【占位】1. 下载 Gerber；2. 按 BOM 下单；3. 焊接顺序；4. 烧录固件 `idf.py flash`。
本项目以 MIT 协议开源，复刻成功欢迎开 Issue 秀图。
