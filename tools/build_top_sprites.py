# Dựng hình toa nhìn từ trên xuống cho từng mẫu tàu (đầu / giữa / đuôi) từ MỘT ảnh toa đầu nhìn từ trên (prototype/drive/assets/src_top_head.png).
# Nguồn ảnh: do người dùng cung cấp, lấy từ mô hình SimplePlanes "Shinkansen - The Bullet Train" (https://www.simpleplanes.com/a/5vwi55/Shinkansen-The-Bullet-Train); chỉ dùng cá nhân.
# Toa giữa cắt từ phần thân phẳng rồi kéo dài; toa đuôi = toa đầu lật dọc; tô màu theo từng mẫu tàu. Chạy: python -X utf8 tools/build_top_sprites.py
import os, json
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.join(os.path.dirname(__file__), '..', 'prototype', 'drive', 'assets')
TINT = {'n700': (228, 234, 241), 'n700s': (234, 240, 246), 's800': (217, 221, 226), 'e5': (39, 160, 127),
        'e7': (232, 226, 214), 'e6': (222, 112, 138), 'e8': (146, 108, 170), 'h5': (46, 170, 150), 't4': (246, 208, 30), 'e926': (238, 238, 240)}
src = Image.open(os.path.join(ROOT, 'src_top_head.png')).convert('RGB')
a = np.asarray(src).astype(np.float32)
mask = (a.min(axis=2) < 240).astype(np.uint8) * 255
ys, xs = np.where(mask > 0); box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
gray = a.mean(axis=2)
W0, H0 = box[2] - box[0], box[3] - box[1]
alpha = Image.fromarray(mask).crop(box).filter(ImageFilter.GaussianBlur(0.8))
G = Image.fromarray(gray.astype(np.uint8)).crop(box)
OUT_W = 48; OUT_H = int(round(OUT_W * H0 / W0))
meta = {}
def colorize(g, al, tint):
    ga = np.asarray(g).astype(np.float32) / 136.0
    rgb = np.clip(np.stack([ga * tint[0], ga * tint[1], ga * tint[2]], axis=2), 0, 255).astype(np.uint8)
    out = Image.fromarray(rgb, 'RGB').convert('RGBA'); out.putalpha(al); return out
for key, tint in TINT.items():
    head = colorize(G, alpha, tint).resize((OUT_W, OUT_H), Image.LANCZOS)
    body_rows = (int(H0 * 0.70), int(H0 * 0.83))                       # phần thân phẳng, không có cửa sập/nắp
    g_mid = G.crop((0, body_rows[0], W0, body_rows[1])); a_mid = alpha.crop((0, body_rows[0], W0, body_rows[1]))
    mid = colorize(g_mid, a_mid, tint).resize((OUT_W, OUT_H), Image.LANCZOS)
    tail = head.transpose(Image.FLIP_TOP_BOTTOM)
    for part, im in (('head', head), ('mid', mid), ('tail', tail)): im.save(os.path.join(ROOT, f'top_{key}_{part}.png'), optimize=True)
    meta[key] = {'w': OUT_W, 'h': OUT_H}
open(os.path.join(ROOT, 'tops.js'), 'w', encoding='utf-8').write('// sinh tự động bởi tools/build_top_sprites.py\nwindow.TOPS = ' + json.dumps(meta) + ';\n')
print(meta, 'ok')
