# Dựng ảnh đoàn tàu cho màn hình chính: với mỗi mẫu (N700S, N700, N700S-8000 Kamome, E5, E7, E6, E8) cắt toa mũi và một toa giữa ở độ phân giải gốc của bản vẽ
# (rail.kychung.com, CC BY-NC-ND 4.0, chỉ dùng cá nhân; nguồn đặt ở prototype/drive/assets, xem NGUON.md), đo cửa sổ (độ rộng, cao, bước, vị trí) và ghi
# assets/mt_<mẫu>_head.png, mt_<mẫu>_mid.png và assets/mt.js (window.MENU_TRAINS). index.html ghép đoàn đủ số toa, lặp toa giữa, dán 5 logo JR lên 5 cửa sổ liền nhau.
# Chạy: python -X utf8 tools/build_menu_trains.py   (cần pillow, numpy, scipy)
import os, sys, json, statistics as st
sys.path.insert(0, r'D:\Shinkansen\tools')
import numpy as np
from PIL import Image
import build_vehicle_sprites as B
import build_setup_preview as P

OUT = sys.argv[1] if len(sys.argv) > 1 else r'D:\Shinkansen\prototype\drive\assets'
ONLY = sys.argv[2:]

def runs(mask, minlen=1):
    r = []; s = None
    for i, v in enumerate(mask):
        if v and s is None: s = i
        if not v and s is not None:
            if i - s >= minlen: r.append((s, i - 1))
            s = None
    if s is not None and len(mask) - s >= minlen: r.append((s, len(mask) - 1))
    return r

def windows(img):
    a = np.array(img.convert('RGBA')).astype(int); H, W = a.shape[:2]
    R, G, Bc = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    dark = ((R + G + Bc) < 230) & (a[:, :, 3] > 200) & (np.abs(Bc - R) < 45)
    x0, x1 = 8, W - 8; top = int(H * 0.10); bot = int(H * 0.66)
    rows = dark[top:bot, x0:x1].sum(axis=1)
    ys = runs(rows >= rows.max() * 0.5); y0, y1 = max(ys, key=lambda r: r[1] - r[0]); y0 += top; y1 += top
    colmask = dark[y0 + 2:y1 - 2, x0:x1].mean(axis=0) > 0.8
    ws = runs(colmask, 6)
    med = st.median([b - a_ + 1 for a_, b in ws])
    ws = [(a_ + x0, b + x0) for a_, b in ws if abs((b - a_ + 1) - med) <= med * 0.2]
    cx = [(a_ + b) / 2 for a_, b in ws]
    return dict(cx=cx, w=med, h=y1 - y0 + 1, yc=(y0 + y1) / 2)

def regular_run(cx, pitch):
    # đoạn dài nhất các cửa sổ cách đều (± 12%)
    best = (0, 0); s = 0
    for i in range(1, len(cx) + 1):
        if i == len(cx) or abs((cx[i] - cx[i - 1]) - pitch) > pitch * 0.12:
            if i - s > best[1] - best[0]: best = (s, i)
            s = i
    return best

def sources(name):
    """trả về (head_img, mid_img, ncars) ở độ phân giải gốc (SCALE 1.0)"""
    src, ncars, carlen, flip, _ = B.SPECS[name]
    if name in ('n700s', 'kamome'):
        im, cars = B.build_ref(name)
        kw = dict(down=(190 if name == 'kamome' else 150), cut_top=(name == 'n700s'), white_fill=(name == 'n700s'), **({'ref_rows': (14, 4)} if name == 'kamome' else {}))
        mk = lambda c, head: B.car_image_ref(im, c, **dict(kw, **({'xpr': int(90 + P.NOSE_EXT * 500)} if head else {})))
        return mk(cars[-1], True), mk(cars[len(cars) // 2], False), ncars
    im, Bg, diff, mask, cars = B.build(name)
    cl = cars[::-1] if flip else cars
    def mk(c, head):
        y0, y1, x0, x1 = c
        if head: x1 = min(im.shape[1] - 1, x1 + int(P.NOSE_EXTS.get(name, P.NOSE_EXT) * (x1 - x0)))
        return B.car_image(im, Bg, diff, mask, (y0, y1, x0, x1))
    return mk(cl[-1], True), mk(cl[len(cl) // 2], False), ncars

def n700_src():
    from PIL import ImageFilter
    import scipy.ndimage as ndi
    SRC = os.path.join(B.ROOT, 'n700_jrwest_large.webp'); im = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
    Y0 = [137, 361, 586, 811, 1111, 1336, 1561, 1786, 2011, 2236, 2461, 2761, 2986, 3211, 3436, 3665]; TOP, BOT = 6, 172
    XR = [(318, 1585)] + [(412, 1580)] * 14 + [(412, 1682)]
    def car(i):
        y0 = Y0[i]; xl, xr = XR[i]; ya, yb = y0 - TOP, y0 + BOT; crop = im[ya:yb, xl:xr]; h, w, _ = crop.shape
        ref = im[y0 - 34:y0 - 10, xl:xr].mean(axis=0); marg = im[ya:yb, 40:300].mean(axis=1); mr = im[y0 - 34:y0 - 10, 40:300].mean(axis=(0, 1))
        bg = ref[None, :, :] + (marg - mr)[:, None, :]; d = np.abs(crop - bg).max(axis=2); a = np.clip((d - 9) / 26.0, 0, 1)
        bb_ = TOP + 156; m = d > 22; a = np.where(m, a, a * 0.0)
        for yy in range(TOP - 3, bb_):
            xs = np.where(m[yy])[0]
            if len(xs) > 20: a[yy, xs.min():xs.max() + 1] = 1
        a[(crop[:, :, 2] - crop[:, :, 0] > 20) & (crop[:, :, 0] > 110)] = 0
        core = ndi.binary_opening(a > 0.5, structure=np.ones((3, 3)), iterations=7); lab, n = ndi.label(core)
        if n: core = lab == 1 + int(np.argmax(ndi.sum(core, lab, range(1, n + 1)))); a = np.where(ndi.binary_dilation(core, iterations=8), a, 0)
        am = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
        blue = (crop[:, :, 2] - crop[:, :, 0] > 60) & (crop[:, :, 0] < 90) & (a > 0.5); blue[:, :int(w * 0.15)] = False; blue[:, int(w * 0.7):] = False
        rows = np.where(blue.sum(axis=1) > 0.3 * w)[0]
        return Image.fromarray(np.dstack([crop.astype(np.uint8), np.asarray(am)]), 'RGBA'), float(rows.mean())
    cs = [car(i) for i in (8, 15)]; up = int(round(max(k for _, k in cs))); HH = max(im_.height + up - int(round(k)) for im_, k in cs); outs = []
    for im_, k in cs:
        d = up - int(round(k)); t = Image.new('RGBA', (im_.width, HH), (0, 0, 0, 0)); t.alpha_composite(im_, (0, d)); outs.append(t)
    return outs[1], outs[0], 16

def clean_top(head, mid):
    """Kamome: bản vẽ nguồn còn dải nền nâu-cam phía trên mái (và các khối xám ở hai đầu toa giữa) nên menu hiện một ô chữ nhật cam-đỏ trên mái: xoá mọi điểm phía trên đường mái của toa giữa; toa mũi chỉ xoá điểm nâu-cam (mái mũi cong)."""
    a = np.array(mid); R, G, Bc = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int)
    white = ((R > 200) & (G > 200) & (Bc > 200) & (a[:, :, 3] > 200)).mean(axis=1)
    y0 = int(np.argmax(white > 0.7)); a[:y0, :, 3] = 0; mid2 = Image.fromarray(a, 'RGBA')
    h = np.array(head); r, g = h[:, :, 0].astype(int), h[:, :, 1].astype(int); bad = (r - g > 20); bad[y0 + 2:, :] = False; h[bad, 3] = 0
    return Image.fromarray(h, 'RGBA'), mid2

names = ['n700s', 'n700', 'kamome', 'e5', 'e7', 'e6', 'e8']
cfg = {}
for n in names:
    if ONLY and n not in ONLY: continue
    head, mid, nc = n700_src() if n == 'n700' else sources(n)
    if n == 'kamome': head, mid = clean_top(head, mid)
    # mid: cắt 2 px đầu để các toa nối liền khi lặp (cùng cách ghép của ảnh xem trước); nếu cạnh trái không có khe thì giữ nguyên
    a = np.array(mid)[:, :, 3]; al = a[:int(mid.height * 0.6)].sum(axis=0) / (int(mid.height * 0.6) * 255.0)
    midc = mid.crop((2, 0, mid.width, mid.height))
    w = windows(midc); cx = w['cx']; pitch = st.median([cx[i + 1] - cx[i] for i in range(len(cx) - 1)])
    r0, r1 = regular_run(cx, pitch)
    midc.save(os.path.join(OUT, f'mt_{n}_mid.png'), optimize=True); head.save(os.path.join(OUT, f'mt_{n}_head.png'), optimize=True)
    cfg[n] = dict(cars=nc, hw=head.width, hh=head.height, mw=midc.width, mh=midc.height, wcx=[round(x, 1) for x in cx[r0:r1]], wp=round(pitch, 2), ww=w['w'], wh=w['h'], wyc=w['yc'], nwin=len(cx), run=[r0, r1])
    print(n, cfg[n]['cars'], 'head', head.size, 'mid', midc.size, 'win', len(cx), 'run', (r0, r1), 'w', w['w'], 'h', w['h'], 'pitch', round(pitch, 1), 'yc', w['yc'])
open(os.path.join(OUT, 'mt.js'), 'w', encoding='utf-8').write('// sinh tự động bởi tools/build_menu_trains.py' + chr(10) + 'window.MENU_TRAINS = ' + json.dumps(cfg, separators=(',', ':')) + ';' + chr(10))
