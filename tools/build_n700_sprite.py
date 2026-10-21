# Cắt 16 toa N700 từ ảnh gốc (rail.kychung.com, CC BY-NC-ND 4.0, chỉ dùng cá nhân/nội bộ) thành dải ngang có nền trong suốt.
# Chạy: python -X utf8 tools/build_n700_sprite.py   (cần pillow, numpy)
# Đầu ra: prototype/drive/assets/n700_strip.png (toa 1 ở trái, mũi tàu toa 16 ở phải) và n700_strip.json (toạ độ từng toa)
import os, json
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..', 'prototype', 'drive', 'assets')
SRC = os.path.join(ROOT, 'n700_jrwest_large.webp')
im = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
# vị trí hàng (y0 = đầu hàng cửa sổ trắng) của 16 toa, đo từ ảnh gốc
Y0 = [137, 361, 586, 811, 1111, 1336, 1561, 1786, 2011, 2236, 2461, 2761, 2986, 3211, 3436, 3665]
TOP, BOT = 6, 172            # lấy từ y0-TOP đến y0+BOT
# phạm vi x (theo ảnh gốc): toa giữa 418..1575; toa 1 (mũi trái) 318..1585; toa 16 (mũi phải) 412..1680
XR = [(318, 1585)] + [(412, 1580)] * 14 + [(412, 1682)]
SCALE = 0.30

def build_car(i):
    y0 = Y0[i]; xl, xr = XR[i]
    ya, yb = y0 - TOP, y0 + BOT
    crop = im[ya:yb, xl:xr]
    h, w, _ = crop.shape
    # nền: dải trên mái (nền thuần) theo cột + chênh lệch dọc đo ở lề trái/phải không có tàu
    ref = im[y0 - 34:y0 - 10, xl:xr].mean(axis=0)                       # (w,3)
    if i == 0:
        marg = im[ya:yb, 1600:1680].mean(axis=1); marg_ref = im[y0 - 34:y0 - 10, 1600:1680].mean(axis=(0, 1))
    else:
        marg = im[ya:yb, 40:300].mean(axis=1); marg_ref = im[y0 - 34:y0 - 10, 40:300].mean(axis=(0, 1))
    dy = marg - marg_ref                                                # (h,3)
    bg = ref[None, :, :] + dy[:, None, :]
    d = np.abs(crop - bg).max(axis=2)
    a = np.clip((d - 9) / 26.0, 0, 1)
    # thân tàu là hình chữ nhật: ép đặc ở vùng thân/váy gầm (ngoại trừ vùng mũi cong)
    body_bottom = TOP + 156
    if i == 0:
        a[TOP - 3:body_bottom, 260:] = 1
    elif i == 15:
        a[TOP - 3:body_bottom, :w - 280] = 1
    else:
        a[TOP - 3:body_bottom, 4:w - 4] = 1
    # làm mượt biên
    from PIL import ImageFilter
    am = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = np.dstack([crop.astype(np.uint8), np.asarray(am)])
    return Image.fromarray(rgba, 'RGBA')

cars = [build_car(i) for i in range(16)]
# ghép: mỗi toa chồng nhẹ lên toa kế (khe nối) để thành dải liền; toa 1 ở trái, toa 16 (mũi) ở phải
OVER = 2
xs = []; x = 0
for i, c in enumerate(cars):
    xs.append(x); x += c.width - (OVER if i < 15 else 0)
strip = Image.new('RGBA', (x, cars[0].height), (0, 0, 0, 0))
for c, px in zip(cars, xs): strip.alpha_composite(c, (px, 0))
w2, h2 = int(strip.width * SCALE), int(strip.height * SCALE)
strip = strip.resize((w2, h2), Image.LANCZOS)
out = os.path.join(ROOT, 'n700_strip.png'); strip.save(out, optimize=True)
meta = {'scale': SCALE, 'width': w2, 'height': h2, 'pxPerMeter': round((1157 * SCALE) / 25.0, 3),
        'cars': [{'i': i + 1, 'x': round(xs[i] * SCALE), 'w': round(cars[i].width * SCALE)} for i in range(16)],
        'bodyTop': round(TOP * SCALE), 'railY': round((TOP + 168) * SCALE),
        'source': 'rail.kychung.com N700 series 2D drawing (CC BY-NC-ND 4.0), personal use only'}
json.dump(meta, open(os.path.join(ROOT, 'n700_strip.json'), 'w'), indent=1)
open(os.path.join(ROOT, 'n700_strip.js'), 'w', encoding='utf-8').write('// sinh tự động bởi tools/build_n700_sprite.py' + chr(10) + 'window.N700_STRIP = ' + json.dumps(meta) + ';' + chr(10))
print(w2, h2, os.path.getsize(out), 'byte')
# ảnh kiểm tra trên nền caro
chk = Image.new('RGBA', strip.size, (40, 60, 90, 255)); chk.alpha_composite(strip)
chk.crop((strip.width - 1200, 0, strip.width, h2)).save(os.path.join(ROOT, '..', '_tmp', 'check_front.png'))
chk.crop((0, 0, 1200, h2)).save(os.path.join(ROOT, '..', '_tmp', 'check_rear.png'))
chk.crop((2000, 0, 3200, h2)).save(os.path.join(ROOT, '..', '_tmp', 'check_mid.png'))
