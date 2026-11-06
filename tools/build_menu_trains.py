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

def car_ref(im, c, kw, k, n):
    ext = {'xpr': int(90 + P.NOSE_EXT * 500)} if k == n - 1 else {}
    if k == 0: ext['xpl'] = int(90 + P.NOSE_EXT * 500)
    return B.car_image_ref(im, c, **dict(kw, **ext))

def sources(name):
    """trả về (head_img, mid_img, ncars) ở độ phân giải gốc (SCALE 1.0)"""
    src, ncars, carlen, flip, _ = B.SPECS[name]
    if name in ('n700s', 'kamome', 'e2'):
        im, cars = B.build_ref(name)
        kw = dict(down=(190 if name == 'kamome' else 175 if name == 'e2' else 150), cut_top=(name in ('n700s', 'e2')), white_fill=(name == 'n700s'), **({'ref_rows': (14, 4)} if name == 'kamome' else {}))
        mk = lambda c, head: B.car_image_ref(im, c, **dict(kw, **(({'xpr': int(90 + P.NOSE_EXT * 500)} if name != 'e2' else {'xpr': int(90 + P.NOSE_EXT * 1100)}) if head else {})), **({'xpl': 90 if False else 4} if name == 'e2' and not head else {}))
        pcs = [car_ref(im, c, kw, k, len(cars)) for k, c in enumerate(cars)]
        return mk(cars[-1], True), mk(cars[len(cars) // 2], False), ncars, pcs
    im, Bg, diff, mask, cars = B.build(name)
    cl = cars[::-1] if flip else cars
    def mk(c, head):
        y0, y1, x0, x1 = c
        if head: x1 = min(im.shape[1] - 1, x1 + int(P.NOSE_EXTS.get(name, P.NOSE_EXT) * (x1 - x0)))
        return B.car_image(im, Bg, diff, mask, (y0, y1, x0, x1))
    def mkp(k, c):
        y0, y1, x0, x1 = c; ext = int(P.NOSE_EXTS.get(name, P.NOSE_EXT) * (x1 - x0))
        if k == len(cl) - 1: x1 = min(im.shape[1] - 1, x1 + ext)
        if k == 0: x0 = max(0, x0 - ext)
        return B.car_image(im, Bg, diff, mask, (y0, y1, x0, x1))
    return mk(cl[-1], True), mk(cl[len(cl) // 2], False), ncars, [mkp(k, c) for k, c in enumerate(cl)]

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


def clean_roof(img, mid):
    """Kamome: xoá điểm nằm trên đường mái (toa giữa) hoặc điểm nâu-cam (toa mũi, mái cong)."""
    a = np.array(img.convert('RGBA')); R, G, Bc = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int)
    white = ((R > 200) & (G > 200) & (Bc > 200) & (a[:, :, 3] > 200)).mean(axis=1); y0 = int(np.argmax(white > 0.5))
    if mid: a[:y0, :, 3] = 0
    else: bad = (R - G > 20); bad[y0 + 2:, :] = False; a[bad, 3] = 0
    return Image.fromarray(a, 'RGBA')


def ring_dark(m):
    r = np.concatenate([m[0], m[-1], m[:, 0], m[:, -1]]); return r.mean()

def find_nums(img):
    """Tìm số toa trên ảnh một toa: chữ số lớn viền chấm đỏ (nhiều nhất 2, mỗi đầu toa một số) và ô số nhỏ nền đen cạnh cửa. Trả về hai danh sách bbox (x0, y0, x1, y1)."""
    import scipy.ndimage as ndi
    a = np.array(img.convert('RGBA')); H, W = a.shape[:2]; R, G, Bc = [a[:, :, i].astype(int) for i in range(3)]; ok = a[:, :, 3] > 200
    red = (R > 150) & (G < 130) & (Bc < 130) & ok; red[:int(H * .15)] = False; red[int(H * .55):] = False
    lab, n = ndi.label(ndi.binary_dilation(red, iterations=3)); big = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        if 28 <= h <= 56 and 10 <= w <= 44: big.append((sl[1].start + 3, sl[0].start + 3, sl[1].stop - 3, sl[0].stop - 3))
    dark = (R + G + Bc < 150) & ok; dark[int(H * .4):] = False
    lab, n = ndi.label(dark); small = []
    for sl in ndi.find_objects(lab):
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        if 9 <= h <= 45 and 7 <= w <= 14:      # ô số có thể dính liền các biểu tượng cấm hút thuốc bên dưới: chỉ lấy 9 hàng trên cùng
            y0 = sl[0].start; reg = dark[y0:y0 + 9, sl[1]]
            if ring_dark(reg) > 0.9 and ((R + G + Bc > 330) & ok)[y0:y0 + 9, sl[1]].sum() >= 6: small.append((sl[1].start, y0, sl[1].stop, y0 + 9))
    return sorted(big), sorted(small)

def renumber(imgs):
    """S800: bản vẽ nguồn đánh số 6 ... 1 từ trái sang phải; đổi lại thành 1 ... 6 (toa k nhận số k) bằng cách thay chữ số lớn và ô số nhỏ bằng ảnh cắt từ toa mang đúng số đó."""
    n = len(imgs); arr = [np.array(i.convert('RGBA')) for i in imgs]; nums = [find_nums(i) for i in imgs]; out = [a.copy() for a in arr]
    for k in range(n):
        src = n - 1 - k      # toa trong ảnh k đang mang số n - k; cần đổi thành k + 1, glyph lấy từ ảnh mang số k + 1 (ảnh n - 1 - k)
        for kind in (0, 1):
            glyphs = nums[src][kind]
            if not glyphs: continue
            for (x0, y0, x1, y1) in nums[k][kind]:
                cx, cy = (x0 + x1) // 2, (y0 + y1) // 2; gx0, gy0, gx1, gy1 = glyphs[0]; gw, gh = gx1 - gx0, gy1 - gy0
                pad = 4; ex0, ey0, ex1, ey1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
                ring = np.concatenate([arr[k][ey0:ey0 + 2, ex0:ex1, :3].reshape(-1, 3), arr[k][ey1 - 2:ey1, ex0:ex1, :3].reshape(-1, 3)]); bg = np.median(ring, axis=0).astype(np.uint8)
                if kind == 1: ex0, ey0, ex1, ey1 = x0, y0, x1, y1      # ô nhỏ: thay nguyên ô
                out[k][ey0:ey1, ex0:ex1, :3] = bg; out[k][ey0:ey1, ex0:ex1, 3] = 255
                ty0, tx0 = cy - gh // 2, cx - gw // 2
                out[k][ty0:ty0 + gh, tx0:tx0 + gw] = arr[src][gy0:gy1, gx0:gx1]
    return [Image.fromarray(o, 'RGBA') for o in out]

def clean_top(head, mid):
    """Kamome: bản vẽ nguồn còn dải nền nâu-cam phía trên mái (và các khối xám ở hai đầu toa giữa) nên menu hiện một ô chữ nhật cam-đỏ trên mái: xoá mọi điểm phía trên đường mái của toa giữa; toa mũi chỉ xoá điểm nâu-cam (mái mũi cong)."""
    a = np.array(mid); R, G, Bc = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int)
    white = ((R > 200) & (G > 200) & (Bc > 200) & (a[:, :, 3] > 200)).mean(axis=1)
    y0 = int(np.argmax(white > 0.7)); a[:y0, :, 3] = 0; mid2 = Image.fromarray(a, 'RGBA')
    h = np.array(head); r, g = h[:, :, 0].astype(int), h[:, :, 1].astype(int); bad = (r - g > 20); bad[y0 + 2:, :] = False; h[bad, 3] = 0
    return Image.fromarray(h, 'RGBA'), mid2


def tidy(img, maroon=False):
    """Xoá rác ở ngoài thân tàu: (1) nền đặc cùng màu với góc ảnh (S800), (2) các khối mờ dày còn sót từ bản vẽ nguồn quanh mũi tàu (alpha thấp nhưng thành mảng dày, khác với viền khử răng cưa mỏng), (3) mọi mảng rời xa thân tàu."""
    import scipy.ndimage as ndi
    a = np.array(img.convert('RGBA')); H, W = a.shape[:2]; rgb = a[:, :, :3].astype(int)
    if (a[:, :, 3] > 250).mean() > 0.9 or (a[0, 0, 3] > 250 and a[0, W - 1, 3] > 250 and a[H - 1, 0, 3] > 250):      # ảnh đặc: lọc theo màu nền ở góc rồi loang từ rìa
        bg = rgb[0, 0]; near = (np.abs(rgb - bg).sum(axis=2) < 40) & (a[:, :, 3] > 0); lab, n = ndi.label(near); edge = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1]); edge.discard(0)
        a[np.isin(lab, list(edge)), 3] = 0
    R, G, Bc = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]; mar = (R - G > 25) & (R - Bc > 15) & (R < 190) & (a[:, :, 3] > 0)      # nền nâu đỏ (dải màu khác nhau theo vị trí) bám rìa ảnh, vd. S800
    lab, n = ndi.label(mar); edge = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1]); edge.discard(0)
    if maroon == 'brown': mar = (R - G > 25) & (G > 0.3 * R) & (R < 215) & (a[:, :, 3] > 0); lab, n = ndi.label(mar); edge = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1]); edge.discard(0)      # Kamome toa 1: nền nâu chuyển sắc (khác váy đỏ: G thấp hơn nhiều)
    big = [e for e in edge if (lab == e).sum() > 400]
    if big and maroon: a[ndi.binary_dilation(np.isin(lab, big), iterations=1), 3] = 0
    al = a[:, :, 3]; low = (al > 0) & (al < 110); thick = ndi.binary_erosion(low, iterations=2)
    if thick.any(): a[ndi.binary_dilation(thick, iterations=3) & (al < 110), 3] = 0
    al = a[:, :, 3]; solid = ndi.binary_dilation(al > 40, iterations=5); lab, n = ndi.label(solid)
    if n > 1: keep = 1 + int(np.argmax(ndi.sum(al > 40, lab, range(1, n + 1)))); a[lab != keep, 3] = 0
    return Image.fromarray(a, 'RGBA')

def trim_end(img, left, right):
    """Cắt phần đầu toa (khoảng trong suốt và thanh nối màu tối của bản vẽ) để các toa liền sát nhau, không còn khe/đè chồng: từ mép, bỏ cột ít phủ rồi bỏ thanh tối (nếu có) ở 14 cột đầu."""
    a = np.array(img); H, W = a.shape[:2]; reg = a[int(H * .15):int(H * .6)]
    cov = (reg[:, :, 3] > 128).mean(axis=0); dark = ((reg[:, :, :3].astype(int).sum(axis=2) < 300) & (reg[:, :, 3] > 128)).mean(axis=0)
    def edge(idx):
        i = 0
        while i < W // 3 and cov[idx(i)] < 0.6: i += 1
        j = i; k = i
        while k < min(W // 3, i + 14):      # có thanh tối trong 14 cột đầu thì cắt tới hết thanh (cho phép đứt quãng ≤ 2 cột)
            if dark[idx(k)] > 0.5: j = k + 1
            elif k - j > 2 and j > i: break
            k += 1
        return j if j > i else i
    l = edge(lambda i: i) if left else 0; r = edge(lambda i: W - 1 - i) if right else 0
    return img.crop((l, 0, W - r, H))


# Hộp (x0, y0, x1, y1; toạ độ ảnh toa mũi sau khi cắt) chứa chữ/logo trên thân: khi lật toa mũi để mũi tàu quay sang trái, các hộp này được dán lại KHÔNG lật để chữ vẫn đọc được.
TEXT_BOXES = {
    'kamome': [(62, 18, 100, 58), (165, 20, 305, 33), (495, 20, 630, 33), (355, 68, 445, 102), (225, 78, 248, 96), (550, 78, 578, 96), (180, 104, 610, 121), (712, 26, 797, 64), (798, 20, 822, 52), (912, 46, 978, 74), (1020, 60, 1140, 71), (1118, 122, 1178, 133)],
    's800': [(50, 34, 140, 80), (452, 78, 545, 114), (775, 42, 840, 85), (903, 50, 937, 78), (895, 90, 1085, 106), (460, 33, 545, 43)],
    'e926': [(778, 64, 880, 116)],
    'e5': [(488, 50, 542, 82)], 'e6': [(552, 52, 602, 82)], 'e8': [(688, 58, 738, 84)],
    'e7': [(236, 33, 310, 84)],
}

def mirror_keep_text(head, name):
    """Lật ngang toa mũi (mũi quay trái) nhưng giữ chữ/logo không bị lật: dán lại các nét chữ gốc ở vị trí đối xứng."""
    import scipy.ndimage as ndi
    src = np.array(head.convert('RGBA')); out = src[:, ::-1].copy(); W = src.shape[1]
    for x0, y0, x1, y1 in TEXT_BOXES.get(name, []):
        x1 = min(x1, W); box = src[y0:y1, x0:x1]; rgb = box[:, :, :3].astype(int)
        bg = np.median(rgb, axis=1)[:, None, :]; mask = (np.abs(rgb - bg).sum(axis=2) > 60) & (box[:, :, 3] > 128)
        mask = ndi.binary_dilation(mask, iterations=1)
        tx0 = W - x1; tgt = out[y0:y1, tx0:tx0 + (x1 - x0)]
        mm = mask[:, ::-1]; fill = np.broadcast_to(bg, rgb.shape).astype(np.uint8)
        tgt[mm, :3] = fill[mm]; tgt[mask, :] = box[mask]
    return Image.fromarray(out, 'RGBA')

PERCAR = ('kamome', 's800')      # mẫu có số toa trên thân
names = ['n700s', 'n700', 'kamome', 'e5', 'e7', 'e6', 'e8', 's800', 'h5', 't4', 'e926', 'e2']      # 7 mẫu đầu dùng ở menu chính (có đo cửa sổ để dán logo JR); 5 mẫu sau chỉ cần ảnh cho hoạt ảnh tàu ở màn chọn chuyến (không có cửa sổ để đo thì bỏ qua)
cfg = {}
for n in names:
    if ONLY and n not in ONLY: continue
    r = n700_src() if n == 'n700' else sources(n); head, mid, nc = r[:3]; pcs = r[3] if len(r) > 3 else None
    if n == 'kamome': head, mid = clean_top(head, mid)
    # mid: cắt 2 px đầu để các toa nối liền khi lặp (cùng cách ghép của ảnh xem trước); nếu cạnh trái không có khe thì giữ nguyên
    head, mid = tidy(head, n == 's800'), tidy(mid, n == 's800')
    midc = trim_end(mid, True, True); head = trim_end(head, True, False)
    xs = np.where((np.array(head)[:, :, 3] > 128).any(axis=0))[0]; head = head.crop((0, 0, int(xs.max()) + 1, head.height))      # mũi tàu sát mép phải ảnh: hai đoàn ghép chạm mũi vào nhau      # các đầu nối của toa giữa và đầu nối của toa mũi bám sát nhau
    try:
        w = windows(midc); cx = w['cx']; pitch = st.median([cx[i + 1] - cx[i] for i in range(len(cx) - 1)]); r0, r1 = regular_run(cx, pitch)
    except Exception:
        w = dict(cx=[], w=0, h=0, yc=0); cx = []; pitch = 0; r0 = r1 = 0
    mirror_keep_text(head, n).save(os.path.join(OUT, f'mt_{n}_headL.png'), optimize=True)      # toa mũi quay trái, chữ không lật
    pcw = None
    if pcs and n in PERCAR:      # mẫu có số toa in trên thân (mỗi toa một số): lưu từng toa theo thứ tự trái -> phải (toa 1 ... toa N), không lặp toa giữa
        pcw = []
        if n == 's800': pcs = renumber(pcs)
        for k, im_ in enumerate(pcs):
            if n == 'kamome': im_ = clean_roof(im_, 0 < k < len(pcs) - 1)      # dải nền nâu cam trên mái
            im_ = tidy(im_, 'brown' if (n == 'kamome' and k == 0) else n == 's800'); im_ = trim_end(im_, k > 0, k < len(pcs) - 1)
            xs = np.where((np.array(im_)[:, :, 3] > 128).any(axis=0))[0]
            im_ = im_.crop((int(xs.min()) if k == 0 else 0, 0, (int(xs.max()) + 1) if k == len(pcs) - 1 else im_.width, im_.height))
            im_.save(os.path.join(OUT, f'mt_{n}_c{k + 1}.png'), optimize=True); pcw.append([im_.width, im_.height])
        li = 1 + (len(pcs) - 2 - 1) // 2      # toa mang logo JR trên menu (cùng công thức trong index.html: toa giữa thứ idx = floor((nm-1)/2))
        try:
            lc = Image.open(os.path.join(OUT, f'mt_{n}_c{li + 1}.png')); w = windows(lc); cx = w['cx']; pitch = st.median([cx[i + 1] - cx[i] for i in range(len(cx) - 1)]); r0, r1 = regular_run(cx, pitch)
        except Exception: pass
    midc.save(os.path.join(OUT, f'mt_{n}_mid.png'), optimize=True); head.save(os.path.join(OUT, f'mt_{n}_head.png'), optimize=True)
    cfg[n] = dict(cars=nc, hw=head.width, hh=head.height, mw=midc.width, mh=midc.height, wcx=[round(x, 1) for x in cx[r0:r1]], wp=round(pitch, 2), ww=w['w'], wh=w['h'], wyc=w['yc'], nwin=len(cx), run=[r0, r1], **({'pc': pcw} if pcw else {}))
    print(n, cfg[n]['cars'], 'head', head.size, 'mid', midc.size, 'win', len(cx), 'run', (r0, r1), 'w', w['w'], 'h', w['h'], 'pitch', round(pitch, 1), 'yc', w['yc'])
open(os.path.join(OUT, 'mt.js'), 'w', encoding='utf-8').write('// sinh tự động bởi tools/build_menu_trains.py' + chr(10) + 'window.MENU_TRAINS = ' + json.dumps(cfg, separators=(',', ':')) + ';' + chr(10))
