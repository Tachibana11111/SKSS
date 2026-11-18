# -*- coding: utf-8 -*-
# Liệt kê ghi chéo giữa hai đường chính theo từng ga từ docs/data/haisen/<tên>_graph.json (đầu ra của haisen_graph.py).
# Chạy: python -X utf8 tools/haisen_xo.py hok [kmax_don_vi=220]
# Quy ước (khớp xo của game, viết theo chiều XUỐNG = x tăng): đường chéo đi từ đường xuống (y nhỏ) sang đường lên (y lớn) khi x tăng = 'r' (ours→opp); ngược lại = 's' (opp→ours); hai đường chéo cắt nhau = 'd' (X kép).
# Khoảng cách tính từ mép sân ga; 1 đơn vị sơ đồ ≈ 8,1 m (sân ga 54 đơn vị = 440 m) [I].
import sys, json, os
sys.stdout.reconfigure(encoding='utf-8')
name = sys.argv[1] if len(sys.argv) > 1 else 'hok'; KMAX = float(sys.argv[2]) if len(sys.argv) > 2 else 220.0; M_PER = 440.0 / 54.0
g = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'docs', 'data', 'haisen', name + '_graph.json'), encoding='utf-8'))
dy, uy = g['main']['down_y'], g['main']['up_y']
E = [e for e in g['edges'] if e.get('role') == 'crossover']
par = {}
def find(a):
    while par.setdefault(a, a) != a: par[a] = par[par[a]]; a = par[a]
    return a
for e in E: par[find(e['a'])] = find(e['b'])
comps = {}
for e in E: comps.setdefault(find(e['a']), []).append(e)
units = []
for c in comps.values():
    xs = [v for e in c for v in (e['x1'], e['x2'])]; sl = set()
    for e in c:
        a = e if e['x1'] <= e['x2'] else {**e, 'x1': e['x2'], 'y1': e['y2'], 'x2': e['x1'], 'y2': e['y1']}
        if abs(a['x2'] - a['x1']) < 0.01: continue
        sl.add(1 if (a['y2'] - a['y1']) > 0 else -1)
    kind = 'd' if len(sl) == 2 else ('r' if sl == {1} else 's')
    units.append({'x0': min(xs), 'x1': max(xs), 'kind': kind, 'n': len(c)})
units.sort(key=lambda u: u['x0'])
print(f'{len(E)} cạnh chéo → {len(units)} ghi chéo (d=X kép, r=ours→opp, s=opp→ours) | đường chính xuống y={dy}, lên y={uy}')
# mỗi ghi chéo chỉ thuộc về ga gần nhất (khoảng cách tới mép sân ga)
def dist(u, s):
    if u['x1'] < s['x1']: return s['x1'] - u['x1'], 'trước'
    if u['x0'] > s['x2']: return u['x0'] - s['x2'], 'sau'
    return None, None
owner = {}
for i, u in enumerate(units):
    best = None
    for j, s in enumerate(g['stations']):
        d, side = dist(u, s)
        if d is not None and (best is None or d < best[0]): best = (d, j, side)
    if best: owner[i] = best
for j, s in enumerate(g['stations']):
    out = sorted([(owner[i][2], units[i]['kind'], round(owner[i][0]), round(owner[i][0] * M_PER)) for i in owner if owner[i][1] == j and owner[i][0] <= KMAX], key=lambda t: (t[0] != 'trước', t[2]))
    print(f"{s['jp']} {s.get('en') or ''} token {s['token']}: " + ('; '.join(f"{a} {k} cách mép {gp} đv (~{m} m)" for a, k, gp, m in out) if out else 'không có ghi chéo trong tầm'))
