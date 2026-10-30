# Tạo prototype/drive/japanmap_nt.js: đường bờ các đảo Lãnh thổ phương Bắc / nam Kuril (国後島, 択捉島, 色丹島, 歯舞群島) cho bản đồ toàn quốc.
# Nguồn: OpenStreetMap (natural=coastline) qua Overpass API, giấy phép ODbL 1.0 — cần ghi nguồn (xem assets/NGUON.md). Các đảo này do Nga quản lý thực tế, Nhật coi là lãnh thổ của mình: game chỉ vẽ nét đứt để phân biệt với ranh giới tỉnh.
# Đầu vào (không đưa lên git): tools/data-src/kurils_overpass.json = kết quả truy vấn  way["natural"="coastline"](43.2,145.2,45.6,148.95); out geom;
# Chạy: python -X utf8 tools/build_kurils.py
import json, math, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'tools', 'data-src', 'kurils_overpass.json')
OUT = os.path.join(ROOT, 'prototype', 'drive', 'japanmap_nt.js')
TOL = 0.015
def dp(pts, tol):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; n = math.hypot(dx, dy); best, bi = -1, 0
    for i in range(1, len(pts) - 1):
        p = pts[i]; d = abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / n if n else math.hypot(p[0] - a[0], p[1] - a[1])
        if d > best: best, bi = d, i
    if best <= tol: return [a, b]
    return dp(pts[:bi + 1], tol)[:-1] + dp(pts[bi:], tol)
def area(r): return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2
d = json.load(open(SRC, encoding='utf-8'))
ways = [[(g['lon'], g['lat']) for g in e['geometry']] for e in d['elements'] if e['type'] == 'way' and e.get('geometry')]
# nối các đoạn bờ (đầu-cuối trùng toạ độ) thành vành khép kín
by_start = {}
for w in ways: by_start.setdefault(w[0], []).append(w)
used = set(); rings = []
for w in ways:
    if id(w) in used: continue
    used.add(id(w)); chain = list(w)
    while chain[0] != chain[-1]:
        nxt = [x for x in by_start.get(chain[-1], []) if id(x) not in used]
        if not nxt: break
        used.add(id(nxt[0])); chain += nxt[0][1:]
    if chain[0] == chain[-1] and len(chain) > 3: rings.append(chain)
NAMES = [('択捉島', 147.0, 149.0, 44.2, 45.7), ('国後島', 145.2, 146.3, 43.6, 44.6), ('色丹島', 146.5, 147.0, 43.6, 43.95), ('歯舞群島', 145.3, 146.7, 43.2, 43.6)]
out = []
for r in rings:
    xs = [p[0] for p in r]; ys = [p[1] for p in r]; cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    if cx < 145.3 or cy > 45.7: continue       # bỏ phần bờ Hokkaido và đảo ngoài vùng
    name = next((n for n, x0, x1, y0, y1 in NAMES if x0 <= cx <= x1 and y0 <= cy <= y1), None)
    if not name: continue
    s = dp(r, min(TOL, max(0.0008, 0.12 * math.sqrt(area(r)))))
    if len(s) < 4: continue
    out.append({'n': name, 'r': [round(v * 1000) for p in s for v in p]})
out.sort(key=lambda e: e['n'])
open(OUT, 'w', encoding='utf-8').write('// Sinh tự động bởi tools/build_kurils.py. Nguồn: OpenStreetMap (ODbL 1.0). Các đảo Lãnh thổ phương Bắc (Nhật coi là lãnh thổ của mình, Nga quản lý thực tế); toạ độ lon,lat ×1000.\nwindow.JPMAP_NT = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(rings), 'vành khép kín;', len(out), 'đảo giữ lại:', {e['n']: len(e['r']) // 2 for e in out}, os.path.getsize(OUT), 'byte')
