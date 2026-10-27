# Tạo prototype/drive/japanmap.js: ranh giới 47 tỉnh Nhật Bản (đơn giản hoá) cho bản đồ toàn quốc.
# Nguồn: geoBoundaries gbOpen JPN ADM1 (simplified), giấy phép ODbL 1.0, dữ liệu năm 2017 — cần ghi nguồn (xem assets/NGUON.md).
# Đầu vào (không đưa lên git): tools/data-src/geoBoundaries-JPN-ADM1_simplified.geojson. Chạy: python -X utf8 tools/build_japan.py
import json, math, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'tools', 'data-src', 'geoBoundaries-JPN-ADM1_simplified.geojson')
OUT = os.path.join(ROOT, 'prototype', 'drive', 'japanmap.js')
TOL = 0.015            # độ, ngưỡng Douglas-Peucker
MIN_AREA = 0.004       # độ², bỏ đảo nhỏ hơn
def dp(pts, tol):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; n = math.hypot(dx, dy); best, bi = -1, 0
    for i in range(1, len(pts) - 1):
        p = pts[i]; d = abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / n if n else math.hypot(p[0] - a[0], p[1] - a[1])
        if d > best: best, bi = d, i
    if best <= tol: return [a, b]
    return dp(pts[:bi + 1], tol)[:-1] + dp(pts[bi:], tol)
def area(r): return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2
d = json.load(open(SRC, encoding='utf-8')); out = []
for f in d['features']:
    g = f['geometry']; polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']; rings = []
    for poly in polys:
        r = poly[0]
        if area(r) < MIN_AREA: continue
        s = dp([(x, y) for x, y in r], TOL)
        if len(s) < 4: continue
        rings.append([round(v * 1000) for p in s for v in p])      # lon,lat xen kẽ, đơn vị 0,001 độ
    out.append({'n': f['properties']['shapeName'], 'r': rings})
open(OUT, 'w', encoding='utf-8').write('// Sinh tự động bởi tools/build_japan.py. Nguồn: geoBoundaries gbOpen JPN ADM1 (ODbL 1.0, 2017). Toạ độ lon,lat ×1000.\nwindow.JPMAP = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(out), os.path.getsize(OUT))
