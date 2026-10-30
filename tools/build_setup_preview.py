# Dựng ảnh xem trước (màn Thiết lập chuyến đi): toa mũi + 2 toa kế sau, độ phân giải cao (tỉ lệ SCALE), đủ phần mũi tàu.
# Nguồn: các bản vẽ 2D của rail.kychung.com (CC BY-NC-ND 4.0, chỉ dùng cá nhân/nội bộ), đặt ở prototype/drive/assets (xem NGUON.md).
# Chạy: python -X utf8 tools/build_setup_preview.py   (cần pillow, numpy). Đầu ra: assets/pv_<tên>.png + assets/pv.js (window.PREVIEW)
import os, sys, json
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import build_vehicle_sprites as B

ROOT = B.ROOT; SCALE = 0.7; NCAR = 3
NOSE_EXTS = {'s800': 0.12}      # s800: ảnh nguồn có nền lệch màu và biểu tượng mặt trước ngay sau mũi nên chỉ nới ít
NOSE_EXT = 0.35        # nới thêm bên mũi (tỉ lệ chiều dài toa) vì mép toa tính theo mật độ cột nên hay cắt mất đầu mũi nhọn

def compose(imgs, carlen_mid_w, ppm_src):
    OVER = 2; x = 0; xs = []
    for k, i in enumerate(imgs): xs.append(x); x += i.width - (OVER if k < len(imgs) - 1 else 0)
    H = max(i.height for i in imgs); strip = Image.new('RGBA', (x, H), (0, 0, 0, 0))
    for i, px in zip(imgs, xs): strip.alpha_composite(i, (px, H - i.height))
    bb = strip.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    return strip.crop((0, 0, bb[2], strip.height)) if bb else strip      # bỏ phần trong suốt thừa sau mũi để mũi tàu sát mép

def one(name):
    src, ncars, carlen, flip, _ = B.SPECS[name]
    if name in ('n700s', 'kamome', 'e2'):
        im, cars = B.build_ref(name)
        if len(cars) != ncars: print(name, 'cảnh báo', len(cars)); return None
        kw = dict(down=(190 if name == 'kamome' else 175 if name == 'e2' else 150), cut_top=(name in ('n700s', 'e2')), white_fill=(name == 'n700s'), **({'ref_rows': (14, 4)} if name == 'kamome' else {}))
        def mk(k, c, head):
            e = dict(kw); 
            if name == 'e2': e.update(xpl=90 if k == 0 else 4, xpr=int(90 + NOSE_EXT * 1100) if head else 6)
            elif head: e.update(xpr=int(90 + NOSE_EXT * 500))
            return B.car_image_ref(im, c, **e)
        order = list(range(len(cars)))
        imgs = [mk(k, cars[k], k == len(cars) - 1) for k in order[-NCAR:]]
        mid = mk(len(cars) // 2, cars[len(cars) // 2], False)
    else:
        im, Bg, diff, mask, cars = B.build(name)
        if len(cars) != ncars: print(name, 'cảnh báo', len(cars)); return None
        cl = cars[::-1] if flip else cars          # sau khi đảo: toa mũi ở cuối danh sách
        def mk(c, head):
            y0, y1, x0, x1 = c
            if head: x1 = min(im.shape[1] - 1, x1 + int(NOSE_EXTS.get(name, NOSE_EXT) * (x1 - x0)))
            ci = B.car_image(im, Bg, diff, mask, (y0, y1, x0, x1))
            if head and name == 's800':      # nền lệch màu (khối đỏ hồng phía trên mũi) lọt vào phần nới: xoá điểm hồng ở nửa trên, nửa phải toa
                arr = np.array(ci); hh, ww = arr.shape[:2]; r, g = arr[:, :, 0].astype(int), arr[:, :, 1].astype(int)
                bad = (r - g > 25) & (r - g < 115) & (g < 150); bad[:, :int(ww * 0.5)] = False; arr[bad, 3] = 0
                import scipy.ndimage as ndi; lab, n = ndi.label(arr[:, :, 3] > 40)      # biểu tượng mặt trước nằm rời sau mũi: chỉ giữ mảng lớn nhất (thân toa)
                if n > 1: arr[lab != 1 + int(np.argmax(ndi.sum(arr[:, :, 3] > 40, lab, range(1, n + 1)))), 3] = 0
                ci = Image.fromarray(arr, 'RGBA')
            return ci
        imgs = [mk(c, k == len(cl) - 1) for k, c in enumerate(cl)][-NCAR:]
        mid = mk(cl[len(cl) // 2], False)
    strip = compose(imgs, 0, 0); w2, h2 = int(strip.width * SCALE), int(strip.height * SCALE)
    strip = strip.resize((w2, h2), Image.LANCZOS); strip.save(os.path.join(ROOT, 'pv_' + name + '.png'), optimize=True)
    return {'w': w2, 'h': h2, 'ppm': round(mid.width * SCALE / carlen, 3)}

def n700():
    SRC = os.path.join(ROOT, 'n700_jrwest_large.webp'); im = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
    Y0 = [137, 361, 586, 811, 1111, 1336, 1561, 1786, 2011, 2236, 2461, 2761, 2986, 3211, 3436, 3665]; TOP, BOT = 6, 172
    XR = [(318, 1585)] + [(412, 1580)] * 14 + [(412, 1682)]
    from PIL import ImageFilter
    def car(i):
        y0 = Y0[i]; xl, xr = XR[i]; ya, yb = y0 - TOP, y0 + BOT; crop = im[ya:yb, xl:xr]; h, w, _ = crop.shape
        ref = im[y0 - 34:y0 - 10, xl:xr].mean(axis=0); marg = im[ya:yb, 40:300].mean(axis=1); mr = im[y0 - 34:y0 - 10, 40:300].mean(axis=(0, 1))
        bg = ref[None, :, :] + (marg - mr)[:, None, :]; d = np.abs(crop - bg).max(axis=2); a = np.clip((d - 9) / 26.0, 0, 1)
        bb_ = TOP + 156; m = d > 22; a = np.where(m, a, a * 0.0)      # chỉ giữ điểm khác nền rõ rệt (nền xanh chuyển sắc lệch nhẹ không còn lọt vào)
        for yy in range(TOP - 3, bb_):      # lấp đặc từng hàng thân giữa điểm trái nhất và phải nhất (theo hình mũi cong) thay vì ép cả hình chữ nhật
            xs = np.where(m[yy])[0]
            if len(xs) > 20: a[yy, xs.min():xs.max() + 1] = 1
        a[(crop[:, :, 2] - crop[:, :, 0] > 20) & (crop[:, :, 0] > 110)] = 0      # mảnh nền xanh nhạt còn sót (thân tàu là trắng/xám trung tính, vạch xanh thì sẫm nên không bị ảnh hưởng)
        import scipy.ndimage as ndi      # mở hình để cắt các mảnh nền mỏng dính ngoài thân (vệt ở gầm, quanh chóp mũi), giữ mảng lớn nhất rồi nở lại để lấy đủ viền
        core = ndi.binary_opening(a > 0.5, structure=np.ones((3, 3)), iterations=7); lab, n = ndi.label(core)
        if n: core = lab == 1 + int(np.argmax(ndi.sum(core, lab, range(1, n + 1)))); a = np.where(ndi.binary_dilation(core, iterations=8), a, 0)
        am = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
        blue = (crop[:, :, 2] - crop[:, :, 0] > 60) & (crop[:, :, 0] < 90) & (a > 0.5); blue[:, :int(w * 0.15)] = False; blue[:, int(w * 0.7):] = False      # vạch xanh dọc thân (bỏ mũi và đầu toa)
        rows = np.where(blue.sum(axis=1) > 0.3 * w)[0]
        return Image.fromarray(np.dstack([crop.astype(np.uint8), np.asarray(am)]), 'RGBA'), float(rows.mean())      # hàng của vạch xanh để căn các toa cùng độ cao
    cs = [car(i) for i in (13, 14, 15)]; print('vạch xanh (hàng):', [round(k, 1) for _, k in cs]); up = int(round(max(k for _, k in cs)))
    imgs = []
    for im_, k in cs:      # bản vẽ gốc đặt toa mũi lệch vài px so với các toa giữa: căn lại theo vạch xanh
        d = up - int(round(k)); t = Image.new('RGBA', (im_.width, im_.height + d), (0, 0, 0, 0)); t.alpha_composite(im_, (0, d)); imgs.append(t)
    strip = compose(imgs, 0, 0); w2, h2 = int(strip.width * SCALE), int(strip.height * SCALE)
    strip = strip.resize((w2, h2), Image.LANCZOS); strip.save(os.path.join(ROOT, 'pv_n700.png'), optimize=True)
    return {'w': w2, 'h': h2, 'ppm': round(1157 * SCALE / 25.0, 3)}

if __name__ == '__main__':
    names = sys.argv[1:] or ['n700', 'n700s', 'kamome', 's800', 'e5', 'e7', 'h5', 'e6', 'e8', 't4', 'e926', 'e2']
    reg = {}
    for n in names:
        r = n700() if n == 'n700' else one(n)
        if r: reg[n] = r; print(n, r)
    p = os.path.join(ROOT, 'pv.js'); old = {}
    if os.path.exists(p):
        t = open(p, encoding='utf-8').read(); i = t.find('{')
        try: old = json.loads(t[i:t.rfind('}') + 1])
        except Exception: old = {}
    old.update(reg)
    open(p, 'w', encoding='utf-8').write('// sinh tự động bởi tools/build_setup_preview.py' + chr(10) + 'window.PREVIEW = ' + json.dumps(old) + ';' + chr(10))
