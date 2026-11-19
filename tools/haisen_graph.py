# -*- coding: utf-8 -*-
# Trích đồ thị đường ray từ các SVG 配線略図.net (CC BY 4.0) đã ghép thành một hệ toạ độ, ghi docs/data/haisen/<tên>_graph.json.
# Chạy: python -X utf8 tools/haisen_graph.py [nks|hkd|kyu|hok|jts|tks]   (mặc định nks). Nguồn gốc/giấy phép: docs/data/haisen/README.md
# CẤU HÌNH: mỗi hình đặt tại (x, y) trong hệ ghép; các hình nối nhau tại các đầu mút của hai đường chính (độ chênh dọc = trung bình các cặp đường khớp).
#  nks: 010_01 ở (0,0); 010_02 ở (419.8, -6.8) (Takeo-Onsen – Ureshino-Onsen + Shin-Omura – Isahaya – Nagasaki).
#  kyu: 5 hình Kyushu Shinkansen Hakata – Kagoshima-Chuo; hai đường chính khớp tới ≤ 0,6 ở cả bốn chỗ nối (xem CONFIG).
#  jts: 4 hình Joetsu Shinkansen Jomo-Kogen – Niigata (010_02–020_05); hai đường chính khớp tới ≤ 0,2 ở cả ba chỗ nối.
#  hok: 7 hình Hokuriku Shinkansen Annaka-Haruna – Tsuruga; hai đường chính khớp tới ≤ 1,0 ở cả sáu chỗ nối (chỗ Nagano→Joetsu-Myoko lệch 1,0: khoảng cách hai đường khác nhau giữa hai hình).
#  hkd: 5 hình Hokkaido Shin-Aomori – Shin-Hakodate-Hokuto; đầu mút phải/trái các hình khớp tới 0,1 (hai đường Shinkansen, và hai đường 1067 mm trong đoạn ba ray).
import sys, os, re, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from haisen_dump import load, sty, NS
CONFIG = {
    'nks': {'dir': 'nishi_kyushu', 'out': 'nks_graph.json', 'off': {'010_01.svg': (0.0, 0.0), '010_02.svg': (419.8, -6.8)}, 'seams': [{'x': 419.8, 'dy': -6.8}]},
    'kyu': {'dir': 'kyushu', 'out': 'kyu_graph.json', 'drop_boxes': [[1950, 140, 2075, 217.5]],   # Shin-Yatsushiro: bỏ đường cụt (có chắn cuối) sát sân ga trên cùng ghi vào nó và đường dẫn lên phía bắc (theo yêu cầu giản lược; game chưa có đường cụt)
            'far_skip_x': [[130, 340], [2560, 2900]],   # Hakata và Kagoshima-Chuo: đường chính đổi cao độ y trong hình nên bỏ luật 'xa đường chính = depot' ở hai khoảng x này
             'off': {'010_01.svg': (0.0, 0.0), '010_02.svg': (723.2, 143.1), '010_03.svg': (1412.0, 61.25), '010_04.svg': (1928.6, 42.65), '010_05.svg': (2504.2, 126.8)},
            'seams': [{'x': 723.2, 'dy': 143.1}, {'x': 1412.0, 'dy': -81.85}, {'x': 1928.6, 'dy': -18.6}, {'x': 2504.2, 'dy': 84.15}]},
    'hkd': {'dir': 'hokkaido', 'out': 'hkd_graph.json', 'off': {'010_01.svg': (0.0, 0.0), '010_02.svg': (521.3, -168.55), '010_03.svg': (1033.0, -31.55), '010_04.svg': (1441.3, -4.4), '010_05.svg': (2100.6, 4.75)},
            'seams': [{'x': 521.3, 'dy': -168.55}, {'x': 1033.0, 'dy': 137.0}, {'x': 1441.3, 'dy': 27.15}, {'x': 2100.6, 'dy': 9.15}]}}
CONFIG['hok'] = {'dir': 'hokuriku', 'out': 'hok_graph.json', 'edge_fallback': True,
            'drop_boxes': [[3620.5, -100, 3900, 70]],   # Tsuruga: bỏ ghi chéo đơn sau ga và đường dẫn về depot (theo yêu cầu: ga cuối là 4 đường kết thúc bằng chắn cuối)
            'end_align': [{'x': 3630.0, 'ys': [4.3, 22.6, 40.8, 58.8]}],   # Hokuriku Shinkansen Annaka-Haruna – Tsuruga (7 hình; 030_01 Takasaki dùng chung với Joetsu nên để sau)
            'off': {'021_02.svg': (0.0, 0.0), '030_03.svg': (575.2, -85.35), '030_04.svg': (1136.1, -4.65), '030_05.svg': (1642.9, -4.9), '030_06.svg': (2287.3, -127.95), '030_07.svg': (2853.1, -4.65), '030_08.svg': (3522.2, -96.05)},
            'seams': [{'x': 575.2, 'dy': -85.35}, {'x': 1136.1, 'dy': 80.7}, {'x': 1642.9, 'dy': -0.25}, {'x': 2287.3, 'dy': -123.05}, {'x': 2853.1, 'dy': 123.3}, {'x': 3522.2, 'dy': -91.4}]}
CONFIG['jts'] = {'dir': 'joetsu', 'out': 'jts_graph.json', 'edge_fallback': True,
            # Niigata: bỏ các ghi chéo sau ga và đường chính nối về depot (theo yêu cầu: ga cuối là 4 đường kết thúc bằng chắn cuối).
            # Echigo-Yuzawa: bỏ đuôi phía đông (nhánh sang Joetsu Line / Gala-Yuzawa, theo yêu cầu không vẽ) và dựng lại đuôi nhập lại đường chính theo đúng khuôn của Takasaki (cùng kiểu dPdduuPu): add_lines bên dưới
            'drop_boxes': [[2277.5, 40, 2600, 110], [796.9, 30, 870, 56], [796.9, 89, 870, 112], [836, 54, 858, 92], [796.9, 30, 815, 66], [796.9, 80, 815, 112]],
            'add_lines': [(802.0, 54.7, 811.5, 54.7), (797.0, 36.4, 806.8, 54.7), (811.5, 54.7, 816.4, 63.8), (802.0, 91.2, 811.5, 91.2), (797.0, 109.5, 806.8, 91.2), (811.5, 91.2, 816.4, 82.1)],
            'end_align': [{'x': 2278.0, 'ys': [45.5, 63.8, 82.1, 100.3]}],   # Joetsu Shinkansen Jomo-Kogen – Niigata (4 hình: 010_02 có thêm Honjo-Waseda và Takasaki ở phía tây, không thuộc phạm vi)
            'off': {'010_02.svg': (0.0, 0.0), '010_03.svg': (688.8, 27.4), '020_04.svg': (1338.3, 36.35), '020_05.svg': (1923.8, -36.55)},
            'seams': [{'x': 688.8, 'dy': 27.4}, {'x': 1338.3, 'dy': 8.95}, {'x': 1923.8, 'dy': -72.9}]}
CONFIG['tks'] = {'dir': 'hokuriku', 'out': 'tks_graph.json', 'edge_fallback': True,   # Takasaki nhìn từ hình Hokuriku (030_01): ga nút giao Joetsu – Hokuriku; đối chiếu với hình Joetsu 010_02 (jts_graph.json)
            'off': {'030_01.svg': (0.0, 0.0)}, 'seams': [], 'main_span': 250}
LINE = (sys.argv[1] if len(sys.argv) > 1 else 'nks'); CFG = CONFIG[LINE]
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'data', 'haisen', CFG['dir']); OFF = CFG['off']
SHK, CONV, NAVY, BLK = '#0070c0', '#404040', '#002060', '#000'
def norm_stroke(c):      # một số hình viết '#0070C0'/'#000000'
    c = (c or '').lower(); return '#000' if c == '#000000' else (c or None)

def fw(s):
    v = s.get('stroke-width'); return float(v.replace('px', '')) if v else None

def read():
    L, R, T = [], [], []
    for name, (ox, oy) in OFF.items():
        root, st = load(os.path.join(SRC, name))
        for el in root.iter():
            tag = el.tag.replace(NS, ''); s = sty(el, st)
            if tag == 'line':
                f = lambda k: float(el.get(k) or 0)
                a, b, c, d = f('x1') + ox, f('y1') + oy, f('x2') + ox, f('y2') + oy
                if a > c or (a == c and b > d): a, b, c, d = c, d, a, b
                L.append({'x1': a, 'y1': b, 'x2': c, 'y2': d, 'stroke': norm_stroke(s.get('stroke')), 'w': fw(s), 'fig': name})
            elif tag == 'rect':
                w, h = float(el.get('width')), float(el.get('height'))
                if h <= 1.2 or w <= 1.2: continue
                R.append({'x': float(el.get('x')) + ox, 'y': float(el.get('y')) + oy, 'w': w, 'h': h, 'stroke': norm_stroke(s.get('stroke')), 'sw': fw(s), 'fill': s.get('fill'), 'fig': name})
            elif tag == 'text':
                tr = el.get('transform', ''); m = re.search(r'translate\(\s*([-\d.]+)[ ,]+([-\d.]+)', tr) or re.search(r'matrix\(\s*[-\d.]+[ ,]+[-\d.]+[ ,]+[-\d.]+[ ,]+[-\d.]+[ ,]+([-\d.]+)[ ,]+([-\d.]+)\s*\)', tr)
                if m: T.append({'s': ''.join(el.itertext()).strip(), 'x': float(m.group(1)) + ox, 'y': float(m.group(2)) + oy, 'size': float((s.get('font-size') or '11px').replace('px', '')), 'fig': name})
    return L, R, T

L, R, T = read()
horiz = lambda l: abs(l['y1'] - l['y2']) < 0.3
shk = [l for l in L if l['stroke'] == SHK]
DROPPED = [l for l in shk if any(a <= min(l['x1'], l['x2']) and max(l['x1'], l['x2']) <= c and b <= min(l['y1'], l['y2']) and max(l['y1'], l['y2']) <= d for a, b, c, d in CFG.get('drop_boxes', []))]
shk = [l for l in shk if l not in DROPPED]      # giản lược theo yêu cầu: các đoạn nằm hoàn toàn trong hộp bị bỏ khỏi đồ thị
for al in CFG.get('add_lines', []):      # đường bổ sung (giản lược): ví dụ dựng đuôi nhập lại đường chính của ga có đường tránh khi đuôi trong hình là đường nhánh bị bỏ
    x1, y1, x2, y2 = al; shk.append({'x1': min(x1, x2), 'y1': y1 if x1 <= x2 else y2, 'x2': max(x1, x2), 'y2': y2 if x1 <= x2 else y1, 'stroke': SHK, 'w': 1.5, 'fig': 'add'})
for ea in CFG.get('end_align', []):      # ga cuối được giản lược thành các đường kết thúc đều bằng chắn cuối (Tsuruga: 4 đường): kéo đoạn cuối mỗi đường tới x chung
    for y in ea['ys']:
        for l in shk:      # đường chính vẽ liền một nét vượt quá x chung: cắt lại
            if abs(l['y1'] - l['y2']) < 0.01 and abs(l['y1'] - y) < 0.8 and l['x1'] < ea['x'] < l['x2']: l['x2'] = ea['x']
        cand = [l for l in shk if abs(l['y1'] - l['y2']) < 0.01 and abs(l['y1'] - y) < 0.8 and l['x2'] < ea['x'] and l['x2'] > ea['x'] - 40]
        if cand: max(cand, key=lambda l: l['x2'])['x2'] = ea['x']
conv = [l for l in L if l['stroke'] == CONV]
navy = [l for l in L if l['stroke'] == NAVY]
blk15 = [l for l in L if l['stroke'] == BLK and l['w'] == 1.5]
thin = [l for l in L if l['stroke'] == BLK and l['w'] is not None and l['w'] <= 0.8]

def merge_rails(segs):
    hs = sorted([l for l in segs if horiz(l)], key=lambda l: (l['y1'] + l['y2']) / 2)
    cl = []
    for l in hs:
        y = (l['y1'] + l['y2']) / 2
        if cl and abs(y - cl[-1]['ys'][-1]) < 0.5: cl[-1]['ys'].append(y); cl[-1]['s'].append(l)
        else: cl.append({'ys': [y], 's': [l]})
    rails = []
    for c in cl:
        y = round(sum(c['ys']) / len(c['ys']), 1)
        iv = sorted((l['x1'], l['x2']) for l in c['s']); cur = list(iv[0])
        for a, b in iv[1:]:
            if a <= cur[1] + 0.6: cur[1] = max(cur[1], b)
            else: rails.append({'y': y, 'x1': cur[0], 'x2': cur[1]}); cur = [a, b]
        rails.append({'y': y, 'x1': cur[0], 'x2': cur[1]})
    return rails
rails = merge_rails(shk)
crails = merge_rails(conv)
diags = [l for l in shk if not horiz(l)]
for d in diags:     # chân đường chéo bám vào ray gần nhất (chênh < 0.6)
    for k in ('1', '2'):
        x, y = d['x' + k], d['y' + k]
        for r in rails:
            if abs(y - r['y']) < 0.6 and r['x1'] - 0.6 <= x <= r['x2'] + 0.6: d['y' + k] = r['y']

# ---- nút
nodes = []   # {x,y,kind}
def node_at(x, y, tol=0.7):
    for n in nodes:
        if abs(n['x'] - x) < tol and abs(n['y'] - y) < tol: return n
    n = {'id': 'n%d' % (len(nodes) + 1), 'x': round(x, 1), 'y': round(y, 1), 'kind': 'plain'}; nodes.append(n); return n
rail_nodes = []   # mỗi ray: list nút
for r in rails: r['nodes'] = [node_at(r['x1'], r['y']), node_at(r['x2'], r['y'])]
for d in diags: d['n1'] = node_at(d['x1'], d['y1']); d['n2'] = node_at(d['x2'], d['y2'])
# giao nhau (diamond) giữa hai đường chéo
def inter(a, b):
    x1, y1, x2, y2, x3, y3, x4, y4 = a['x1'], a['y1'], a['x2'], a['y2'], b['x1'], b['y1'], b['x2'], b['y2']
    den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if abs(den) < 1e-9: return None
    t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den; u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den
    if 0.03 < t < 0.97 and 0.03 < u < 0.97: return t, u, x1 + t * (x2 - x1), y1 + t * (y2 - y1)
for d in diags: d['cross'] = []
for i in range(len(diags)):
    for j in range(i + 1, len(diags)):
        h = inter(diags[i], diags[j])
        if h:
            n = node_at(h[2], h[3]); n['kind'] = 'diamond'; diags[i]['cross'].append((h[0], n)); diags[j]['cross'].append((h[1], n))
# nút chân đường chéo nằm giữa ray => ghi (switch)
for d in diags:
    for nk in ('n1', 'n2'):
        n = d[nk]
        for r in rails:
            if abs(n['y'] - r['y']) < 0.6 and r['x1'] + 0.6 < n['x'] < r['x2'] - 0.6:
                n['y'] = r['y']; r.setdefault('mid', [])
                if n not in r['mid']: r['mid'].append(n)
                if n['kind'] == 'plain': n['kind'] = 'switch'
# ---- cạnh
edges = []
def add_edge(a, b, kind, ref):
    edges.append({'id': 'e%d' % (len(edges) + 1), 'a': a['id'], 'b': b['id'], 'kind': kind, 'ref': ref, 'x1': a['x'], 'y1': a['y'], 'x2': b['x'], 'y2': b['y']})
for ri, r in enumerate(rails):
    pts = sorted(set([r['nodes'][0]['id'], r['nodes'][1]['id']] + [n['id'] for n in r.get('mid', [])]), key=lambda i: next(n['x'] for n in nodes if n['id'] == i))
    byid = {n['id']: n for n in nodes}
    for a, b in zip(pts, pts[1:]): add_edge(byid[a], byid[b], 'rail', 'R%d' % ri)
for di, d in enumerate(diags):
    chain = [(0.0, d['n1'])] + sorted(d['cross'], key=lambda c: c[0]) + [(1.0, d['n2'])]
    for (t0, a), (t1, b) in zip(chain, chain[1:]): add_edge(a, b, 'diag', 'D%d' % di)
# bậc nút, phân loại
deg = {}
for e in edges:
    deg[e['a']] = deg.get(e['a'], 0) + 1; deg[e['b']] = deg.get(e['b'], 0) + 1
for n in nodes:
    n['deg'] = deg.get(n['id'], 0)
    if n['kind'] == 'plain' and n['deg'] == 1: n['kind'] = 'end'
    elif n['kind'] == 'plain' and n['deg'] == 3: n['kind'] = 'switch'
byid = {n['id']: n for n in nodes}
# hai đường chính = hai ray dài nhất bao suốt chiều dài
span = [r for r in rails if r['x2'] - r['x1'] > CFG.get('main_span', 700)]      # main_span: ngưỡng chiều dài đường chính (hình ngắn như Takasaki đặt thấp hơn)
mains = sorted(span, key=lambda r: r['y'])
MAIN_D, MAIN_U = mains[0]['y'], mains[1]['y']
midY = (MAIN_D + MAIN_U) / 2
def role_of_y(y): return 'd' if y < midY else 'u'
# ---- vai trò cạnh
byedge_nodes = lambda e: (byid[e['a']], byid[e['b']])
for e in edges:
    a, b = byedge_nodes(e)
    if e['kind'] == 'rail':
        e['role'] = ('main_d' if abs(a['y'] - MAIN_D) < 0.6 else 'main_u' if abs(a['y'] - MAIN_U) < 0.6 else 'other')
    else:
        # đường chéo nối đường chính xuống – đường chính lên (trực tiếp hoặc qua một giao cắt) là ghi chéo; thứ tự hai nút trong cạnh không quan trọng
        kd = lambda n: 'd' if abs(n['y'] - MAIN_D) < 0.6 else 'u' if abs(n['y'] - MAIN_U) < 0.6 else 'x' if n['kind'] == 'diamond' else None
        ka, kb = kd(a), kd(b)
        e['role'] = 'crossover' if ka and kb and ka != kb and abs(a['y'] - b['y']) > 5 else 'other'
# thành phần liên thông của các cạnh 'other' => ga phụ (Nagasaki) hoặc depot
adj = {}
for e in edges:
    if e['role'] in ('other',): adj.setdefault(e['a'], []).append(e); adj.setdefault(e['b'], []).append(e)
seen = set(); comps = []
for e in edges:
    if e['role'] != 'other' or e['id'] in seen: continue
    st = [e]; comp = []; seen.add(e['id'])
    while st:
        c = st.pop(); comp.append(c)
        for nid in (c['a'], c['b']):
            n = byid[nid]
            if abs(n['y'] - MAIN_D) < 0.6 or abs(n['y'] - MAIN_U) < 0.6: continue    # không đi xuyên qua nút trên đường chính
            for o in adj.get(nid, []):
                if o['id'] not in seen: seen.add(o['id']); st.append(o)
    comps.append(comp)
for ci, comp in enumerate(comps):
    xs = [v for c in comp for v in (c['x1'], c['x2'])]; ys = [v for c in comp for v in (c['y1'], c['y2'])]
    big = len(comp)
    xs_ = [v for c in comp for v in (c['x1'], c['x2'])]; skip = any(min(xs_) < b and max(xs_) > a for a, b in CFG.get('far_skip_x', []))
    far = (not skip) and any(v > MAIN_U + 20.5 or v < MAIN_D - 20.5 for v in ys)      # đường ga (ngoài cùng) cách đường chính ≤ ~19; xa hơn là depot/đường phụ      # đường ga (ngoài cùng) cách đường chính ≤ ~19; xa hơn là depot/đường phụ
    kind = 'depot' if big > 8 or far else 'station_loop'
    for c in comp: c['group'] = kind

# ---- sân ga
plats = []
for r in R:
    if r['stroke'] == BLK and r['sw'] == 1.5 and r['w'] > 20: plats.append({'x1': r['x'], 'x2': r['x'] + r['w'], 'y1': r['y'], 'y2': r['y'] + r['h']})
vert15 = [l for l in blk15 if abs(l['x1'] - l['x2']) < 0.3]
for h in [l for l in blk15 if horiz(l) and l['x2'] - l['x1'] > 20]:
    vs = [v for v in vert15 if (abs(v['x1'] - h['x1']) < 0.4 or abs(v['x1'] - h['x2']) < 0.4) and (abs(v['y1'] - h['y1']) < 0.4 or abs(v['y2'] - h['y1']) < 0.4)]
    if len(vs) >= 2:
        y0, y1 = min(v['y1'] for v in vs), max(v['y2'] for v in vs)
        plats.append({'x1': h['x1'], 'x2': h['x2'], 'y1': y0, 'y2': y1})
uniq = []
for p in plats:
    if not any(abs(p['x1'] - q['x1']) < 1 and abs(p['x2'] - q['x2']) < 1 and abs(p['y1'] - q['y1']) < 1.5 and abs(p['y2'] - q['y2']) < 1.5 for q in uniq): uniq.append(p)
plats = uniq
edge_lines = [l for l in thin if horiz(l) and l['x2'] - l['x1'] > 20]
for p in plats:
    p['shk'] = any(abs(l['x1'] - p['x1']) < 3 and abs(l['x2'] - p['x2']) < 3 and (abs(l['y1'] - p['y1']) < 4.5 or abs(l['y1'] - p['y2']) < 4.5) for l in edge_lines)
    if not p['shk'] and CFG.get('edge_fallback'):      # dự phòng, bật riêng cho Hokuriku (Nagano) vì bật cho Kyushu làm lọt ga giả Hakata-Minami: hình không vẽ đường viền mảnh ở mép sân ga; sân ga nằm sát (≤ 6,5) đường màu Shinkansen phủ hết chiều dài sân ga thì vẫn là sân ga Shinkansen
        p['shk'] = any(horiz(l) and l['x1'] <= p['x1'] + 3 and l['x2'] >= p['x2'] - 3 and (abs(l['y1'] - p['y1']) < 6.5 or abs(l['y1'] - p['y2']) < 6.5) for l in shk)
    p['cy'] = (p['y1'] + p['y2']) / 2; p['cx'] = (p['x1'] + p['x2']) / 2
shk_p = sorted([p for p in plats if p['shk']], key=lambda p: (p['cx'], p['cy']))
# tên ga: nhãn kanji cỡ 16 gần tâm sân ga nhất
CJK = re.compile(r'[぀-ヿ一-鿿]'); BADLBL = ('電化', '軌間', '凡例', '線', '方', '軌条', '非電', '点', '不明')
labels = [t for t in T if t['size'] >= 10 and CJK.search(t['s']) and len(t['s']) >= 2 and not any(b in t['s'] for b in BADLBL) and '（信）' not in t['s']]      # nhãn tên ga (cỡ 11 hoặc 16 tuỳ hình)
stations = []
for p in shk_p:
    st = next((s for s in stations if abs(s['cx'] - p['cx']) < 25), None)
    if st: st['plats'].append(p)
    else: stations.append({'cx': p['cx'], 'plats': [p]})
for s in stations:
    s['x1'] = min(p['x1'] for p in s['plats']); s['x2'] = max(p['x2'] for p in s['plats']); s['cx'] = (s['x1'] + s['x2']) / 2
    y2 = max(p['y2'] for p in s['plats'])
    lb = min([t for t in labels if 5 < t['y'] - y2 < 150] or labels, key=lambda t: abs(t['x'] + t['size'] / 2 * len(t['s']) - s['cx']))
    s['jp'] = lb['s']
    en = [t for t in T if 9 < t['size'] < 15 and re.match(r'^[A-Za-z-]+$', t['s']) and 12 < t['y'] - lb['y'] < 20 and abs((t['x'] + 3 * len(t['s'])) - s['cx']) < 40]
    s['en'] = en[0]['s'] if en else ''
    trk = [r for r in rails if r['x1'] <= s['x1'] + 1 and r['x2'] >= s['x2'] - 1]
    items = [(r['y'], role_of_y(r['y'])) for r in trk] + [(p['cy'], 'P') for p in s['plats']]
    items.sort(); s['token'] = ''.join(c for _, c in items)
    s['tracks'] = [{'y': r['y'], 'role': role_of_y(r['y'])} for r in trk]
    for p in s['plats']:
        near = [r['y'] for r in trk if min(abs(r['y'] - p['y1']), abs(r['y'] - p['y2'])) < 7.5]
        p['adj'] = sorted(near)
# đường phụ cách xa mọi ga (> 60 đơn vị) nhưng bị xếp 'đường ga' vì thành phần nhỏ: là mảnh vụn của depot/đường nhánh => depot
for e in edges:
    if e.get('group') == 'station_loop':
        x0, x1 = min(e['x1'], e['x2']), max(e['x1'], e['x2'])
        if min(max(st_['x1'] - x1, x0 - st_['x2'], 0) for st_ in stations) > 60: e['group'] = 'depot'
# ---- tín hiệu, chắn cuối đường
lamps = [l for l in thin if abs(l['x1'] - l['x2']) < 0.3 and 8.3 <= l['y2'] - l['y1'] <= 9.6]
arms = [l for l in navy if horiz(l) and l['x2'] - l['x1'] > 12]
ndiag = [l for l in navy if not horiz(l) and abs(l['x1'] - l['x2']) < 12 and abs(l['y1'] - l['y2']) < 25]
def on_seg(px, py, l, tol=0.7):
    dx, dy = l['x2'] - l['x1'], l['y2'] - l['y1']; ln = math.hypot(dx, dy)
    if ln < 1e-6: return False
    t = ((px - l['x1']) * dx + (py - l['y1']) * dy) / (ln * ln)
    return -0.02 <= t <= 1.02 and abs((px - l['x1']) * dy - (py - l['y1']) * dx) / ln < tol
signals = []
for lp in lamps:
    arm = next((a for a in arms if (abs(a['x2'] - lp['x1']) < 0.6 or abs(a['x1'] - lp['x1']) < 0.6) and lp['y1'] - 1 <= a['y1'] <= lp['y2'] + 1), None)
    if not arm: continue
    startx = arm['x1'] if abs(arm['x2'] - lp['x1']) < 0.6 else arm['x2']
    for d in ndiag:
        if on_seg(startx, arm['y1'], d):
            for k in ('1', '2'):
                bx, by = d['x' + k], d['y' + k]
                r = next((r for r in rails if abs(by - r['y']) < 0.8 and r['x1'] - 0.8 <= bx <= r['x2'] + 0.8), None)
                if r: signals.append({'x': round(bx, 1), 'y': r['y'], 'side': 'above' if arm['y1'] < r['y'] else 'below', 'lampx': round(lp['x1'], 1), 'armx': round(startx, 1), 'role': role_of_y(r['y'])}); break
            break
bumpers = []
vthin = [l for l in thin if abs(l['x1'] - l['x2']) < 0.3 and 8.3 <= l['y2'] - l['y1'] <= 9.8]
for v in vthin:
    for r in rails:
        for x in (r['x1'], r['x2']):
            if abs(v['x1'] - x) < 0.5 and v['y1'] - 0.5 <= r['y'] <= v['y2'] + 0.5 and not any(abs(b['x'] - x) < 0.5 and abs(b['y'] - r['y']) < 0.5 for b in bumpers):
                bumpers.append({'x': round(x, 1), 'y': r['y'], 'end': 'L' if x == r['x1'] else 'R'})
for ea in CFG.get('end_align', []):      # chắn cuối tại x chung; bỏ chắn cuối cũ nằm trong đoạn vừa kéo dài
    bumpers = [b for b in bumpers if not (any(abs(b['y'] - y) < 0.8 for y in ea['ys']) and ea['x'] - 40 < b['x'] < ea['x'] - 0.4)]
    for y in ea['ys']:
        if not any(abs(b['x'] - ea['x']) < 0.5 and abs(b['y'] - y) < 0.8 for b in bumpers): bumpers.append({'x': round(ea['x'], 1), 'y': y, 'end': 'R'})
# ---- công trình (nhà) trong depot, đường phụ, nhãn
bld = [{'x': r['x'], 'y': r['y'], 'w': r['w'], 'h': r['h'], 'fill': r['fill']} for r in R if (r['stroke'] == BLK and r['sw'] == 0.8) or (r['fill'] == '#bfbfbf')]
bld = [b for b in bld if not (b['w'] > 20 and any(abs(b['x'] - p['x1']) < 1 for p in plats))]
aux = [{'x1': l['x1'], 'y1': l['y1'], 'x2': l['x2'], 'y2': l['y2']} for l in navy]
convl = [{'x1': l['x1'], 'y1': l['y1'], 'x2': l['x2'], 'y2': l['y2']} for l in conv]
convp = [{'x1': p['x1'], 'x2': p['x2'], 'y1': p['y1'], 'y2': p['y2']} for p in plats if not p['shk']]
# ga: số ghi, mô tả
switches = []
for n in sorted([n for n in nodes if n['kind'] == 'switch'], key=lambda n: (n['x'], n['y'])):
    es = [e for e in edges if e['kind'] == 'diag' and n['id'] in (e['a'], e['b'])]
    br = []
    for e in es:
        o = byid[e['b'] if e['a'] == n['id'] else e['a']]
        br.append({'to': 'right' if o['x'] > n['x'] else 'left', 'side': 'above' if o['y'] < n['y'] else 'below'})
    switches.append({'id': 'S%d' % (len(switches) + 1), 'node': n['id'], 'x': n['x'], 'y': n['y'], 'branches': br})
sw_of = {s['node']: s['id'] for s in switches}
for n in nodes:
    if n['id'] in sw_of: n['sw'] = sw_of[n['id']]
texts = [{'s': t['s'], 'x': round(t['x'], 1), 'y': round(t['y'], 1), 'size': t['size']} for t in T if t['size'] >= 8]
out = {
    'note': 'Trích từ 配線略図.net (CC BY 4.0). Toạ độ hệ ghép, không theo tỉ lệ thực. Màu: xanh #0070c0 = đường Shinkansen, xám #404040 = đường thường, navy = tín hiệu/ranh giới.',
    'seam': CFG['seams'][0] if CFG['seams'] else None, 'seams': CFG['seams'], 'main': {'down_y': MAIN_D, 'up_y': MAIN_U},
    'nodes': nodes, 'edges': edges, 'switches': switches, 'platforms': [p for p in plats if p['shk']], 'stations': [{k: v for k, v in s.items()} for s in stations],
    'dropped': [[round(l['x1'], 1), round(l['y1'], 1), round(l['x2'], 1), round(l['y2'], 1)] for l in DROPPED], 'signals': signals, 'bumpers': bumpers, 'buildings': bld, 'aux': aux, 'conv': convl, 'conv_platforms': convp, 'texts': texts, 'rails': [{'y': r['y'], 'x1': r['x1'], 'x2': r['x2']} for r in rails]}
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'data', 'haisen', CFG['out']), 'w', encoding='utf-8'), ensure_ascii=False)
print('ray', len(rails), '| chéo', len(diags), '| nút', len(nodes), '| cạnh', len(edges), '| ghi', len(switches), '| diamond', sum(1 for n in nodes if n['kind'] == 'diamond'), '| tín hiệu', len(signals), '| chắn cuối', len(bumpers))
print('đường chính: xuống y=%s, lên y=%s' % (MAIN_D, MAIN_U))
for s in stations: print(' ga', s['jp'], s['en'], 'token', s['token'], 'x %.0f-%.0f' % (s['x1'], s['x2']), 'đường', [t['y'] for t in s['tracks']])
print(' nhóm cạnh:', {k: sum(1 for e in edges if e.get('group') == k) for k in ('depot', 'station_loop')}, '| vai trò:', {k: sum(1 for e in edges if e['role'] == k) for k in ('main_d', 'main_u', 'crossover', 'other')})
