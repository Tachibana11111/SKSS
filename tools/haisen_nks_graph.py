# -*- coding: utf-8 -*-
# Chạy: python -X utf8 tools/haisen_nks_graph.py (đọc docs/data/haisen/nishi_kyushu/*.svg, ghi docs/data/haisen/nks_graph.json). Nguồn gốc/giấy phép: docs/data/haisen/README.md
# Trích đồ thị đường ray Nishi-Kyushu từ hai SVG gốc (配線略図.net, CC BY 4.0) rồi ghi nks_graph.json.
# Toạ độ "ghép": 010_01 ở (0,0); 010_02 đặt tại (419.8, -6.8) để hai đường chính Takeo-Onsen–Ureshino khớp hai đường chính Shin-Omura–Nagasaki.
import sys, os, re, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from haisen_dump import load, sty, NS
SRC = r'D:\Shinkansen\docs\data\haisen\nishi_kyushu'
OFF = {'010_01.svg': (0.0, 0.0), '010_02.svg': (419.8, -6.8)}
SHK, CONV, NAVY, BLK = '#0070c0', '#404040', '#002060', '#000'

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
                L.append({'x1': a, 'y1': b, 'x2': c, 'y2': d, 'stroke': s.get('stroke'), 'w': fw(s), 'fig': name})
            elif tag == 'rect':
                w, h = float(el.get('width')), float(el.get('height'))
                if h <= 1.2 or w <= 1.2: continue
                R.append({'x': float(el.get('x')) + ox, 'y': float(el.get('y')) + oy, 'w': w, 'h': h, 'stroke': s.get('stroke'), 'sw': fw(s), 'fill': s.get('fill'), 'fig': name})
            elif tag == 'text':
                m = re.search(r'translate\(\s*([-\d.]+)[ ,]+([-\d.]+)', el.get('transform', ''))
                if m: T.append({'s': ''.join(el.itertext()).strip(), 'x': float(m.group(1)) + ox, 'y': float(m.group(2)) + oy, 'size': float((s.get('font-size') or '11px').replace('px', '')), 'fig': name})
    return L, R, T

L, R, T = read()
horiz = lambda l: abs(l['y1'] - l['y2']) < 0.3
shk = [l for l in L if l['stroke'] == SHK]
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
span = [r for r in rails if r['x2'] - r['x1'] > 700]
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
        ys = {round(a['y'], 1), round(b['y'], 1)}
        on_main = lambda n: abs(n['y'] - MAIN_D) < 0.6 or abs(n['y'] - MAIN_U) < 0.6
        e['role'] = 'crossover' if (on_main(a) or a['kind'] == 'diamond') and (on_main(b) or b['kind'] == 'diamond') and abs(a['y'] - b['y']) > 5 and (abs(a['y'] - MAIN_D) < 0.6 or a['kind'] == 'diamond') and (abs(b['y'] - MAIN_U) < 0.6 or b['kind'] == 'diamond' or abs(b['y'] - MAIN_D) < 0.6) else 'other'
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
    kind = 'depot' if big > 8 else 'station_loop'
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
    p['cy'] = (p['y1'] + p['y2']) / 2; p['cx'] = (p['x1'] + p['x2']) / 2
shk_p = sorted([p for p in plats if p['shk']], key=lambda p: (p['cx'], p['cy']))
# tên ga: nhãn kanji cỡ 16 gần tâm sân ga nhất
labels = [t for t in T if t['size'] >= 15]
stations = []
for p in shk_p:
    st = next((s for s in stations if abs(s['cx'] - p['cx']) < 25), None)
    if st: st['plats'].append(p)
    else: stations.append({'cx': p['cx'], 'plats': [p]})
for s in stations:
    s['x1'] = min(p['x1'] for p in s['plats']); s['x2'] = max(p['x2'] for p in s['plats']); s['cx'] = (s['x1'] + s['x2']) / 2
    lb = min(labels, key=lambda t: abs(t['x'] + 8 * len(t['s']) - s['cx']))
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
    'seam': {'x': 419.8, 'dy': -6.8}, 'main': {'down_y': MAIN_D, 'up_y': MAIN_U},
    'nodes': nodes, 'edges': edges, 'switches': switches, 'platforms': [p for p in plats if p['shk']], 'stations': [{k: v for k, v in s.items()} for s in stations],
    'signals': signals, 'bumpers': bumpers, 'buildings': bld, 'aux': aux, 'conv': convl, 'conv_platforms': convp, 'texts': texts, 'rails': [{'y': r['y'], 'x1': r['x1'], 'x2': r['x2']} for r in rails]}
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'data', 'haisen', 'nks_graph.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print('ray', len(rails), '| chéo', len(diags), '| nút', len(nodes), '| cạnh', len(edges), '| ghi', len(switches), '| diamond', sum(1 for n in nodes if n['kind'] == 'diamond'), '| tín hiệu', len(signals), '| chắn cuối', len(bumpers))
print('đường chính: xuống y=%s, lên y=%s' % (MAIN_D, MAIN_U))
for s in stations: print(' ga', s['jp'], s['en'], 'token', s['token'], 'x %.0f-%.0f' % (s['x1'], s['x2']), 'đường', [t['y'] for t in s['tracks']])
print(' nhóm cạnh:', {k: sum(1 for e in edges if e.get('group') == k) for k in ('depot', 'station_loop')}, '| vai trò:', {k: sum(1 for e in edges if e['role'] == k) for k in ('main_d', 'main_u', 'crossover', 'other')})
