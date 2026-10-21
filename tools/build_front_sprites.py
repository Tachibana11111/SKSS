# Cắt hình mặt trước (nhìn thẳng) của từng dòng tàu từ các bản vẽ rail.kychung.com (CC BY-NC-ND 4.0, chỉ dùng cá nhân).
# Hình nhỏ này nằm ở góc ảnh nguồn đã tải (assets/src_*, n700_jrwest_large.webp). Chạy: python -X utf8 tools/build_front_sprites.py
import os, json
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.join(os.path.dirname(__file__), '..', 'prototype', 'drive', 'assets')
SPECS = {'n700': ('n700_jrwest_large.webp', (20, 100, 260, 330)), 'n700s': ('src_n700s.webp', (40, 110, 280, 360)),
         'e5': ('src_e5.webp', (60, 90, 290, 320)), 's800': ('src_s800.png', (1400, 130, 1650, 360))}

def shift(a, dy, dx):
    out = np.zeros_like(a)
    h, w = a.shape[:2]
    ys0, ys1 = max(0, dy), min(h, h + dy); xs0, xs1 = max(0, dx), min(w, w + dx)
    out[ys0:ys1, xs0:xs1] = a[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out

def cut(name, f, box, thr=26):
    im = np.asarray(Image.open(os.path.join(ROOT, f)).convert('RGB').crop(box)).astype(np.float32)
    h, w, _ = im.shape
    ys, xs = np.mgrid[0:h, 0:w]
    ring = (xs < 6) | (xs >= w - 6) | (ys < 6) | (ys >= h - 6)
    A = np.stack([np.ones(ring.sum()), xs[ring] / w, ys[ring] / h, (xs[ring] / w) * (ys[ring] / h)], axis=1)
    bgm = np.zeros_like(im)
    for c in range(3):
        coef = np.linalg.lstsq(A, im[:, :, c][ring], rcond=None)[0]
        bgm[:, :, c] = coef[0] + coef[1] * xs / w + coef[2] * ys / h + coef[3] * (xs / w) * (ys / h)
    d = np.abs(im - bgm).max(axis=2)
    m = d > thr
    # lấp đầy theo hàng (hình mặt trước lồi) và loại điểm nhiễu
    filled = m.copy()
    for yy in range(h):
        xx = np.where(m[yy])[0]
        if len(xx) > 6: filled[yy, xx.min():xx.max() + 1] = True
    a = filled.astype(np.uint8) * 255
    am = Image.fromarray(a).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    out = Image.fromarray(np.dstack([im.astype(np.uint8), np.asarray(am)]), 'RGBA')
    bb = am.point(lambda v: 255 if v > 60 else 0).getbbox()
    return out.crop(bb)

meta = {}
for name, (f, box) in SPECS.items():
    img = cut(name, f, box); img.save(os.path.join(ROOT, 'front_' + name + '.png'), optimize=True)
    meta[name] = {'w': img.width, 'h': img.height}
    chk = Image.new('RGBA', img.size, (30, 40, 60, 255)); chk.alpha_composite(img); chk = chk.resize((img.width * 2, img.height * 2)); os.makedirs(os.path.join(ROOT, '..', '_tmp'), exist_ok=True); chk.save(os.path.join(ROOT, '..', '_tmp', 'chkfront_' + name + '.png'))
    print(name, img.size)
open(os.path.join(ROOT, 'fronts.js'), 'w', encoding='utf-8').write('// sinh tự động bởi tools/build_front_sprites.py' + chr(10) + 'window.FRONTS = ' + json.dumps(meta) + ';' + chr(10))
