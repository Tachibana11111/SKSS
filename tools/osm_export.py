# Biên dịch cảnh vật OSM (data-osm/feat_all.pkl, từ osm_features.py) thành các tệp nhị phân nhỏ theo đoạn 4 km: prototype/drive/world/<tuyến>/<k>.bin
# (k = floor(s / 4000), s = km·1000 của game). Toạ độ (s, d): d dương = bên TRÁI đường xuống; đường ray là đường ray chiều xuống.
# Tệp ra là dữ liệu phái sinh từ OpenStreetMap (© OpenStreetMap contributors, ODbL 1.0): chỉ dùng cá nhân, đã thêm vào .gitignore.
import os, sys, pickle, struct, math, json
import numpy as np
from PIL import Image, ImageDraw
from shapely.geometry import Polygon, LineString, box

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); OSM = os.path.join(ROOT, 'data-osm'); OUT = os.path.join(ROOT, 'prototype', 'drive', 'world')
CH = 4000.0; PAD = 40.0; DMAX = 800.0
BTYPE = {'house': 0, 'detached': 0, 'residential': 0, 'semidetached_house': 0, 'terrace': 0, 'yes': 0, 'apartments': 1, 'commercial': 1, 'office': 1, 'retail': 1, 'hotel': 1, 'dormitory': 1, 'hospital': 1,
         'school': 1, 'university': 1, 'public': 1, 'civic': 1, 'train_station': 1, 'industrial': 2, 'warehouse': 2, 'factory': 2, 'manufacture': 2, 'barn': 3, 'farm_auxiliary': 3, 'farm': 3, 'shed': 3, 'garage': 3,
         'garages': 3, 'greenhouse': 3, 'service': 3, 'roof': 3, 'hut': 3, 'cabin': 3, 'temple': 4, 'shrine': 4, 'church': 4}


def clip(geom, s0, s1):
    return geom.intersection(box(s0 - PAD, -DMAX, s1 + PAD, DMAX))


def poly_pts(g, s0, simp=2.5):
    out = []
    for p in getattr(g, 'geoms', [g]):
        if p.geom_type != 'Polygon' or p.is_empty: continue
        p = p.simplify(simp)
        if p.is_empty or p.geom_type != 'Polygon': continue
        c = np.array(p.exterior.coords)
        if len(c) >= 4: out.append(c)
    return out


def enc_pts(c, s0):
    a = np.empty(len(c), dtype=[('s', '<i4'), ('d', '<i2')]); a['s'] = np.round((c[:, 0] - s0) * 10); a['d'] = np.clip(np.round(c[:, 1] * 10), -32000, 32000); return a.tobytes()


ORDER = 'yagosmrfpehcwiz'            # thứ tự ưu tiên khi chồng lớp (sau đè trước), như world.js
GS = 20.0                           # kích thước ô lưới lớp phủ (m): 200 hàng (s) × 80 cột (d từ -800 đến 800)


def grid_of(b, s0):
    img = Image.new('L', (int(2 * DMAX / GS), int(CH / GS)), 0); dr = ImageDraw.Draw(img)
    for cls in ORDER:
        for c, pts in b['a']:
            if c != cls or len(pts) < 3: continue
            dr.polygon([((d + DMAX) / GS, (s - s0) / GS) for s, d in pts], fill=ord(cls))
    for cl, br, pts in b['w']:                                        # sông, suối: coi như nước (rộng ≥ 1 ô)
        dr.line([((d + DMAX) / GS, (s - s0) / GS) for s, d in pts], fill=ord('w'), width=max(1, int((8 if cl == 2 else 2.5) / GS + 0.5)))
    return np.asarray(img, dtype=np.uint8).tobytes()


def write_line(lid, F):
    d = os.path.join(OUT, lid); os.makedirs(d, exist_ok=True)
    allS = [f[-1][:, 0] for k in F for f in F[k] if len(f[-1])]
    smin = min(a.min() for a in allS); smax = max(a.max() for a in allS); k0 = int(smin // CH); k1 = int(smax // CH)
    buckets = {k: {'b': [], 'a': [], 'r': [], 'w': [], 'x': []} for k in range(k0, k1 + 1)}
    for f in F['b']:                                                     # tòa nhà -> hình chữ nhật xoay nhỏ nhất
        typ, lev, c = f
        if len(c) < 4: continue
        try: r = Polygon(c).minimum_rotated_rectangle
        except Exception: continue
        if r.geom_type != 'Polygon': continue
        rc = np.array(r.exterior.coords)[:4]; e1 = rc[1] - rc[0]; e2 = rc[2] - rc[1]; w = float(np.hypot(*e1)); l = float(np.hypot(*e2))
        if w * l < 25: continue
        if w < l: w, l = l, w; e1 = e2
        ang = math.atan2(e1[1], e1[0]) % math.pi; cs, cd = rc[:4].mean(axis=0)
        k = int(cs // CH)
        if k in buckets and abs(cd) < DMAX: buckets[k]['b'].append((cs - k * CH, cd, w, l, ang, lev, BTYPE.get(typ, 0)))
    for key in ('a', 'r', 'w', 'x'):
        for f in F[key]:
            c = f[-1]
            if len(c) < 2: continue
            ka, kb = int(c[:, 0].min() // CH), int(c[:, 0].max() // CH)
            for k in range(ka, kb + 1):
                if k not in buckets: continue
                s0, s1 = k * CH, (k + 1) * CH
                try:
                    if key == 'a':
                        g = Polygon(c); g = g if g.is_valid else g.buffer(0)
                        for p in poly_pts(clip(g, s0, s1), s0): buckets[k]['a'].append((f[0], p))
                    else:
                        g = clip(LineString(c), s0, s1)
                        for ln in getattr(g, 'geoms', [g]):
                            if ln.geom_type == 'LineString' and len(ln.coords) >= 2: buckets[k][key].append((f[0], f[1], np.array(ln.simplify(2.0).coords)))
                except Exception: continue
    tot = 0
    for k, b in buckets.items():
        s0 = k * CH; out = bytearray(b'W1')
        out += struct.pack('<IIIII', len(b['b']), len(b['a']), len(b['r']), len(b['w']), len(b['x']))
        for cs, cd, w, l, ang, lev, ty in b['b']:
            out += struct.pack('<HhBBBBBB', int(np.clip(cs * 10, 0, 65535)), int(np.clip(cd * 10, -32000, 32000)), min(255, int(w * 2)), min(255, int(l * 2)), int(ang / math.pi * 255) % 256, min(255, int(lev)), ty, 0)
        for cls, c in b['a']:
            out += struct.pack('<BBH', ord(cls), 0, len(c)) + enc_pts(c, s0)
        for key in ('r', 'w', 'x'):
            for cl, br, c in b[key]:
                out += struct.pack('<BBH', cl, br, len(c)) + enc_pts(c, s0)
        g = grid_of(b, s0); out += struct.pack('<I', len(g)) + g
        open(os.path.join(d, f'{k}.bin'), 'wb').write(bytes(out)); tot += len(out)
    json.dump({'ch': CH, 'k0': k0, 'k1': k1}, open(os.path.join(d, 'index.json'), 'w'))
    print(lid, 'đoạn', k1 - k0 + 1, 'dung lượng', round(tot / 1e6, 1), 'MB;', {k: sum(len(b[k]) for b in buckets.values()) for k in ('b', 'a', 'r', 'w', 'x')}, flush=True)


def main():
    import glob
    files = [os.path.join(OSM, os.environ['IN'])] if os.environ.get('IN') else sorted(glob.glob(os.path.join(OSM, 'feat_*.pkl')))
    res = {}
    for fn in files:                                                      # gộp kết quả các vùng (mỗi vùng một tệp)
        part = pickle.load(open(fn, 'rb'))
        for lid, F in part.items():
            r = res.setdefault(lid, {k: [] for k in F})
            for k, v in F.items(): r[k] += v
    for lid in (sys.argv[1:] or res):
        F = res[lid]
        if not any(len(v) for v in F.values()): continue
        write_line(lid, F)


if __name__ == '__main__': main()
