# Cắt toa tàu từ các bản vẽ 2D của rail.kychung.com (CC BY-NC-ND 4.0, chỉ dùng cá nhân/nội bộ) thành dải ngang nền trong suốt.
# Ảnh nguồn đặt ở prototype/drive/assets/src_*.webp|png (tải với sự đồng ý của người dùng 21/10/2026; xem assets/NGUON.md).
# Chạy: python -X utf8 tools/build_vehicle_sprites.py   (cần pillow, numpy)
# Đầu ra: assets/<tên>_strip.png + assets/<tên>_strip.js (đăng ký window.SPRITES[tên]); dải đi từ toa đuôi (trái) tới toa mũi (phải).
import os, json, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', 'prototype', 'drive', 'assets')
# tên: (ảnh nguồn, số toa, chiều dài toa giữa (m), đảo thứ tự (toa 1 ở trên là toa MŨI), tỉ lệ thu nhỏ)
SPECS = {
    'e5':    ('src_e5.webp', 10, 25.0, False, 0.30),
    'n700s': ('src_n700s.webp', 16, 25.0, False, 0.30),
    'kamome': ('src_n700s8.webp', 6, 25.0, False, 0.30),   # N700S-8000 sáu toa (Nishi-Kyushu Kamome)
    's800':  ('src_s800.png', 6, 21.7, True, 0.30),
    'e7':    ('e7 w7.png', 12, 25.0, False, 0.30),        # E7/W7 (Joetsu, Hokuriku)
    'e6':    ('e6.png', 7, 21.2, False, 0.30),            # E6 (Komachi)
    'e8':    ('e8.png', 7, 21.2, False, 0.30),            # E8 (Tsubasa)
    'h5':    ('h5.png', 10, 25.0, False, 0.30),           # H5 (Hokkaido)
    't4':    ('doctor yellow.png', 7, 25.0, False, 0.30), # 923 Dr. Yellow
    'e926':  ('east-i.png', 6, 25.0, False, 0.30),        # E926 East i
    'e2':    ('src_e2.png', 10, 25.0, False, 0.30),       # E2-1000 (Tohoku/Joetsu cũ, 10 toa)
    # ba mẫu cũ chỉ dùng cho hình nền menu (không đăng ký vào sprites.js, game không nạp): chạy bằng build_wall_sprites() bên dưới
    'w500':  ('jrwest_500_7000_large.webp', 8, 27.0, False, 0.30),   # 500 series 7000 (Kodama, 8 toa)
    'e4':    ('jreast_e4_pink_large.png', 8, 25.0, False, 0.30),     # E4 Max (8 toa, 2 tầng)
    'e3':    ('jreast_e3-2000_large.webp', 7, 20.0, False, 0.30),    # E3-2000 Tsubasa (mini, 7 toa)
}

def bg_model(im):
    h, w, _ = im.shape
    ys, xs = np.mgrid[0:h, 0:w]
    m = ((xs < 70) | (xs > w - 70))
    X = (xs[m] / w).ravel(); Y = (ys[m] / h).ravel(); C = im[m].reshape(-1, 3)
    def design(x, y): return np.stack([np.ones_like(x), x, y, x * y, x * x, y * y, x * x * y, x * y * y, x ** 3, y ** 3], axis=1)
    A = design(X, Y); keep = np.ones(len(X), bool)
    for _ in range(4):
        coef = np.linalg.lstsq(A[keep], C[keep], rcond=None)[0]
        res = np.abs(A @ coef - C).max(axis=1); keep = res < max(10, np.percentile(res[keep], 90) * 1.5)
    gx = xs / w; gy = ys / h
    B = np.stack([design(gx.ravel(), gy.ravel()) @ coef[:, c] for c in range(3)], axis=1).reshape(h, w, 3)
    return B

def bg_rows(im):
    # nền chuyển sắc theo từng hàng: nội suy tuyến tính giữa lề trái và lề phải
    h, w, _ = im.shape
    L = np.median(im[:, 4:60], axis=1); R = np.median(im[:, w - 60:w - 4], axis=1)
    t = np.linspace(0, 1, w)[None, :, None]
    return L[:, None, :] * (1 - t) + R[:, None, :] * t

def find_bands(diff, n_expected):
    h, w = diff.shape
    mask = diff > 22
    prof = mask[:, int(w * 0.25):int(w * 0.75)].sum(axis=1)
    on = prof > 120
    bands = []; start = None
    for y in range(h):
        if on[y] and start is None: start = y
        if (not on[y] or y == h - 1) and start is not None:
            if y - start > 50: bands.append([start, y])
            start = None
    # gộp các dải gần nhau (bánh xe tách rời)
    merged = []
    for b in bands:
        if merged and b[0] - merged[-1][1] < 14: merged[-1][1] = b[1]
        else: merged.append(b)
    return merged, mask

def build(name):
    src, ncars, carlen, flip, SCALE = SPECS[name]
    im = np.asarray(Image.open(os.path.join(ROOT, src)).convert('RGB')).astype(np.float32)
    B = (bg_rows(im) if name in ('n700s', 'kamome') else bg_model(im)); diff = np.abs(im - B).max(axis=2)
    bands, mask = find_bands(diff, ncars)
    # thân tàu của các dải: bỏ hình mặt trước (icon) ở góc: chỉ giữ cột trong khoảng có thân tàu
    cars = []
    for (y0, y1) in bands:
        cols = mask[y0:y1].sum(axis=0); xs = np.where(cols > (y1 - y0) * 0.25)[0]
        if len(xs) == 0: continue
        # lấy khoảng liên tục lớn nhất
        gaps = np.where(np.diff(xs) > 60)[0]; segs = np.split(xs, gaps + 1); seg = max(segs, key=len)
        cars.append((y0, y1, int(seg.min()), int(seg.max())))
    if len(cars) != ncars:
        print(name, 'cảnh báo: tìm thấy', len(cars), 'dải, cần', ncars, [(c[0], c[1], c[2], c[3]) for c in cars]);
    return im, B, diff, mask, cars

def car_image(im, B, diff, mask, c):
    y0, y1, x0, x1 = c; pad = 6
    y0 = max(0, y0 - pad); y1 = min(im.shape[0], y1 + pad); x0 = max(0, x0 - pad); x1 = min(im.shape[1], x1 + pad)
    crop = im[y0:y1, x0:x1]; d = diff[y0:y1, x0:x1]; m = mask[y0:y1, x0:x1].astype(np.uint8)
    h, w = d.shape
    a = np.clip((d - 10) / 26.0, 0, 1)
    # lấp đầy các hàng thân (trừ phần bánh xe ở đáy ~16%): giữa điểm trái nhất và phải nhất của hàng
    for yy in range(0, int(h * 0.84)):
        xs = np.where(m[yy] > 0)[0]
        if len(xs) > 20: a[yy, xs.min():xs.max() + 1] = 1
    # loại các điểm nhiễu nhỏ ngoài thân
    am = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    return Image.fromarray(np.dstack([crop.astype(np.uint8), np.asarray(am)]), 'RGBA')


def white_bands(im, thr=212, minpix=250):
    white = (im.min(axis=2) > thr); rows = white.sum(axis=1); runs = []; st = None
    for y, v in enumerate(rows):
        if v > minpix and st is None: st = y
        if (v <= minpix or y == len(rows) - 1) and st is not None:
            if y - st > 18: runs.append((st, y))
            st = None
    return runs, white

def skirt_down(im, c):
    a, b, x0, x1 = c; seg = im[a:a + 260, x0:x1]
    red = (seg[:, :, 0] > 150) & (seg[:, :, 1] < 70) & (seg[:, :, 2] < 70); rows = np.where(red.sum(axis=1) > (x1 - x0) * 0.25)[0]
    return int(rows.max()) if len(rows) else 150                # hàng cuối của váy đỏ (so với mép trên dải thân)

def build_ref(name):
    """Dành cho ảnh có nền chuyển sắc phức tạp: tìm dải thân trắng, ước lượng nền bằng dải trống phía trên mái + chênh lệch dọc ở lề."""
    src, ncars, carlen, flip, SCALE = SPECS[name]
    im = np.asarray(Image.open(os.path.join(ROOT, src)).convert('RGB')).astype(np.float32)
    runs, white = white_bands(im)
    # mỗi toa có thể tách làm 2 dải (cửa sổ cắt) - gộp các dải cách nhau < 40 px
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < 40: merged[-1] = (merged[-1][0], r[1])
        else: merged.append(r)
    cars = []
    for (a, b) in merged:
        cols = white[a:b].sum(axis=0); xs = np.where(cols > (b - a) * 0.3)[0]
        if len(xs) == 0: continue
        gaps = np.where(np.diff(xs) > 80)[0]; segs = np.split(xs, gaps + 1); seg = max(segs, key=len)
        if seg.max() - seg.min() > im.shape[1] * 0.35: cars.append((a, b, int(seg.min()), int(seg.max())))
    return im, cars

def car_image_ref(im, c, up=30, down=150, cut_top=False, white_fill=False, xpl=60, xpr=90, ref_rows=(28, 6)):
    a, b, x0, x1 = c; H, W, _ = im.shape
    pad = 10; xl = max(0, x0 - xpl); xr = min(W, x1 + xpr)         # nới ra để lấy mũi tàu cong
    ya = max(0, a - up); yb = min(H, a + down)
    crop = im[ya:yb, xl:xr]
    r0, r1 = ref_rows; ref = im[max(0, a - up - r0):max(1, a - up - r1), xl:xr].mean(axis=0)      # hàng nền mẫu phía trên mái (Kamome: ảnh có dòng chữ tối ở mép trên nên lấy sát mái hơn)
    mL = im[ya:yb, 6:50].mean(axis=1); mref = im[max(0, a - up - r0):max(1, a - up - r1), 6:50].mean(axis=(0, 1))
    bg = ref[None, :, :] + (mL - mref)[:, None, :]
    d = np.abs(crop - bg).max(axis=2); al = np.clip((d - 14) / 30.0, 0, 1)
    h, w = d.shape; m = (d > 22)
    if white_fill:
        mw = crop.min(axis=2) > 140; al[:int(h * 0.8), :] = 0
        for yy in range(0, int(h * 0.8)):
            xs = np.where(mw[yy])[0]
            if len(xs) > 20: al[yy, xs.min():xs.max() + 1] = 1
        m = np.zeros_like(m)
    for yy in range(0, int(h * 0.82)):
        xs = np.where(m[yy])[0]
        if len(xs) > 20: al[yy, xs.min():xs.max() + 1] = 1
    if cut_top: al[:max(0, (a - ya) - 2), :] = 0
    if white_fill:
        gold = ((crop[:, :, 0] - crop[:, :, 2]) > 55) & (crop[:, :, 0] > 110); gold[:int(h * 0.78), :] = False; al[gold] = 0
        top_gold = ((crop[:, :, 0] - crop[:, :, 2]) > 55) & (crop[:, :, 0] > 150) & (crop[:, :, 1] > 130); top_gold[int(h * 0.30):, :] = False; al[top_gold] = 0
    wid = (al > 0.5).sum(axis=1); med = np.median(wid[int(h * 0.2):int(h * 0.7)])
    for yy in range(h):
        if wid[yy] < 0.35 * med: al[yy, :] = 0
    # loại bỏ các điểm rời rạc: giữ cột có đủ điểm đặc
    colsum = (al > 0.5).sum(axis=0); al[:, colsum < 6] = 0
    am = Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    out = Image.fromarray(np.dstack([crop.astype(np.uint8), np.asarray(am)]), 'RGBA')
    bb = am.point(lambda v: 255 if v > 40 else 0).getbbox()
    return out.crop(bb) if bb else out

def main(names):
    reg = {}
    for name in names:
        src, ncars, carlen, flip, SCALE = SPECS[name]
        if name in ('n700s', 'kamome', 'e2'):
            im, cars = build_ref(name)
            if len(cars) != ncars: print(name, 'cảnh báo:', len(cars), 'dải', cars); continue
            imgs = [car_image_ref(im, c, down=(190 if name == 'kamome' else 175 if name == 'e2' else 150), cut_top=(name in ('n700s', 'e2')), white_fill=(name == 'n700s'), **({'ref_rows': (14, 4)} if name == 'kamome' else {}), **({'xpl': 90 if k == 0 else 4, 'xpr': 90 if k == len(cars) - 1 else 6} if name == 'e2' else {})) for k, c in enumerate(cars)]
        else:
            im, B, diff, mask, cars = build(name)
            if len(cars) != ncars: continue
            imgs = [car_image(im, B, diff, mask, c) for c in cars]
        if flip: imgs = imgs[::-1]
        H = max(i.height for i in imgs)
        # căn đáy các toa theo cùng đường ray (đáy ảnh toa)
        OVER = 2; x = 0; xs = []
        for k, i in enumerate(imgs): xs.append(x); x += i.width - (OVER if k < len(imgs) - 1 else 0)
        if name == 'kamome':           # căn đường ray theo mép dưới váy đỏ của từng toa (toa mũi và toa có chắn mái có chiều cao ảnh khác nhau)
            def skirt_row(i):
                a_ = np.asarray(i); red = (a_[:, :, 0] > 150) & (a_[:, :, 1] < 70) & (a_[:, :, 2] < 70) & (a_[:, :, 3] > 128); lo = a_.shape[0] // 2
                rows = [r for r in range(lo, a_.shape[0]) if red[r].sum() > a_.shape[1] * 0.2]; return max(rows)
            sk = [skirt_row(i) for i in imgs]; below = max(i.height - 1 - r for i, r in zip(imgs, sk)); up = max(sk)
            H = up + 1 + below; strip = Image.new('RGBA', (x, H), (0, 0, 0, 0))
            for i, px, r in zip(imgs, xs, sk): strip.alpha_composite(i, (px, up - r))
        else:
            strip = Image.new('RGBA', (x, H), (0, 0, 0, 0))
            for i, px in zip(imgs, xs): strip.alpha_composite(i, (px, H - i.height))
        w2, h2 = int(strip.width * SCALE), int(H * SCALE)
        strip = strip.resize((w2, h2), Image.LANCZOS)
        out = os.path.join(ROOT, name + '_strip.png'); strip.save(out, optimize=True)
        mid = imgs[len(imgs) // 2]
        meta = {'name': name, 'scale': SCALE, 'width': w2, 'height': h2, 'pxPerMeter': round(mid.width * SCALE / carlen, 3),
                'cars': [{'i': k + 1, 'x': round(xs[k] * SCALE), 'w': round(imgs[k].width * SCALE)} for k in range(len(imgs))], 'railY': round(h2 - 2),
                'source': 'rail.kychung.com 2D drawing (CC BY-NC-ND 4.0), personal use only'}
        json.dump(meta, open(os.path.join(ROOT, name + '_strip.json'), 'w'), indent=1)
        reg[name] = meta
        print(name, strip.size, os.path.getsize(out), 'byte', len(imgs), 'toa')
        chk = Image.new('RGBA', strip.size, (40, 60, 90, 255)); chk.alpha_composite(strip)
        os.makedirs(os.path.join(ROOT, '..', '_tmp'), exist_ok=True)
        chk.crop((max(0, strip.width - 1500), 0, strip.width, h2)).save(os.path.join(ROOT, '..', '_tmp', 'chk_' + name + '_front.png'))
        chk.crop((0, 0, min(1500, strip.width), h2)).save(os.path.join(ROOT, '..', '_tmp', 'chk_' + name + '_rear.png'))
    return reg

WALL_ONLY = ('w500', 'e4', 'e3')

# ---- hai mẫu cũ (500 series, E4) có nền chuyển sắc kèm tia sáng chéo / vân xoáy: trừ nền bằng đa thức bậc 5 khớp trên vùng ngoài các toa, rồi lấy thành phần liên thông lớn nhất của mỗi toa
# mui tàu (mũi đầu ở trái toa 1, mũi đuôi ở phải toa cuối) cần lề rộng hơn các toa giữa; (lề trái, lề phải) tính theo toa
WALL = {
    'w500': dict(up=60, down=200, head=(280, 6), mid=(6, 6), tail=(6, 450), thr=34, blue_strip=True),
    'e4':   dict(up=100, down=230, head=(190, 6), mid=(6, 6), tail=(6, 280), thr=34, blue_strip=False),
}

def fit_bg(im, boxes, deg=5, step=6):
    import scipy.ndimage as ndi
    h, w, _ = im.shape; ys, xs = np.mgrid[0:h:step, 0:w:step]; keep = np.ones(ys.shape, bool)
    for (y0, y1, x0, x1) in boxes: keep &= ~((ys >= y0) & (ys < y1) & (xs >= x0) & (xs < x1))
    keep &= ~((ys < 140) & (xs < 260)); keep &= ~((ys < 130) & (xs > w * 0.55)); keep &= ~((ys > h - 120) & (xs < 420))      # biểu tượng mặt trước, tiêu đề, dòng ghi nguồn
    X = (xs[keep] / w).ravel(); Y = (ys[keep] / h).ravel(); C = im[ys[keep], xs[keep]]
    def design(x, y): return np.stack([(x ** i) * (y ** j) for i in range(deg + 1) for j in range(deg + 1 - i)], axis=1)
    A = design(X, Y); k = np.ones(len(X), bool)
    for _ in range(5):
        coef = np.linalg.lstsq(A[k], C[k], rcond=None)[0]; res = np.abs(A @ coef - C).max(axis=1); k = res < max(8, np.percentile(res[k], 92) * 1.6)
    gy, gx = np.mgrid[0:h, 0:w]; D = design((gx / w).ravel(), (gy / h).ravel())
    return np.stack([D @ coef[:, c] for c in range(3)], axis=1).reshape(h, w, 3)

def build_wall_strip(name):
    import scipy.ndimage as ndi
    src, ncars, carlen, flip, SCALE = SPECS[name]; cfg = WALL[name]
    im, cars = build_ref(name)
    if len(cars) != ncars: print(name, 'cảnh báo:', len(cars), 'dải', cars); return None
    H, W, _ = im.shape
    def margins(k): return cfg['head'] if k == 0 else cfg['tail'] if k == len(cars) - 1 else cfg['mid']
    boxes = [(max(0, a - cfg['up']), min(H, a + cfg['down']), max(0, x0 - margins(k)[0] - 80), min(W, x1 + margins(k)[1] + 80)) for k, (a, b, x0, x1) in enumerate(cars)]
    diff = np.abs(im - fit_bg(im, boxes)).max(axis=2); imgs = []
    for k, (a, b, x0, x1) in enumerate(cars):
        ya = max(0, a - cfg['up']); yb = min(H, a + cfg['down']); xa = max(0, x0 - margins(k)[0]); xb = min(W, x1 + margins(k)[1])
        crop = im[ya:yb, xa:xb]; m = diff[ya:yb, xa:xb] > cfg['thr']
        if cfg['blue_strip']:      # tia sáng xanh của nền: màu xanh bão hoà chỉ được giữ ở các hàng thuộc thân tàu (hàng có phần lớn là điểm không xanh); phần dưới (bánh xe) chỉ giữ điểm không xanh
            blue = (crop[:, :, 2] - crop[:, :, 0] > 90) & (crop[:, :, 2] > 150); nb = (m & ~blue).sum(axis=1) > 0.5 * (x1 - x0); rr = np.where(nb)[0]
            if len(rr): r0, r1 = rr.min(), rr.max(); keep_blue = (np.arange(m.shape[0]) >= r0) & (np.arange(m.shape[0]) <= r1) & (blue.sum(axis=1) > 0.3 * (x1 - x0)); m &= ~(blue & ~keep_blue[:, None])
        m = ndi.binary_closing(m, iterations=2); lab, n = ndi.label(m)
        if n == 0: print(name, 'toa', k + 1, 'rỗng'); return None
        mm = lab == (1 + int(np.argmax(ndi.sum(m, lab, range(1, n + 1))))); mm = ndi.binary_opening(ndi.binary_fill_holes(mm), iterations=1)
        al = ndi.gaussian_filter(mm.astype(np.float32), 0.8)
        img = Image.fromarray(np.dstack([crop.astype(np.uint8), (al * 255).astype(np.uint8)]), 'RGBA'); bb = img.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox(); imgs.append(img.crop(bb) if bb else img)
    Hh = max(i.height for i in imgs); OVER = 2; x = 0; xs = []
    for k, i in enumerate(imgs): xs.append(x); x += i.width - (OVER if k < len(imgs) - 1 else 0)
    strip = Image.new('RGBA', (x, Hh), (0, 0, 0, 0))
    for i, px in zip(imgs, xs): strip.alpha_composite(i, (px, Hh - i.height))
    strip = strip.resize((int(strip.width * SCALE), int(Hh * SCALE)), Image.LANCZOS)
    out = os.path.join(ROOT, name + '_strip.png'); strip.save(out, optimize=True); print(name, strip.size, os.path.getsize(out), 'byte', len(imgs), 'toa (chỉ cho hình nền menu)'); return strip

if __name__ == '__main__':
    args = sys.argv[1:]
    for n in [a for a in args if a in WALL]: build_wall_strip(n)
    rest = [a for a in args if a not in WALL] if args else [n for n in SPECS if n not in WALL]
    if not args or [a for a in rest]:
        reg = main(rest)
        for n in WALL_ONLY: reg.pop(n, None)      # mẫu chỉ dùng cho hình nền không đăng ký vào sprites.js
        # đăng ký (gộp với dải N700 cũ nếu có)
        p = os.path.join(ROOT, 'sprites.js'); old = {}
        if os.path.exists(p):
            txt = open(p, encoding='utf-8').read(); i = txt.find('{');
            try: old = json.loads(txt[i:txt.rfind('}') + 1])
            except Exception: old = {}
        old.update(reg)
        open(p, 'w', encoding='utf-8').write('// sinh tự động bởi tools/build_vehicle_sprites.py' + chr(10) + 'window.SPRITES = ' + json.dumps(old) + ';' + chr(10))
