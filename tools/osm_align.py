# Dựng đường ray thật cho từng tuyến từ OpenStreetMap (tệp .osm.pbf của Geofabrik trong data-osm/).
# Kết quả: data-osm/align_<tuyến>.json = [[lat, lon, s_game_m], ...]; s_game khớp km trong data-lines.js (nội suy tuyến tính giữa các ga)
# Dữ liệu © OpenStreetMap contributors, ODbL 1.0 (chỉ dùng cá nhân, không đưa vào repo).
import osmium, json, math, heapq, sys, glob, os, re
import numpy as np
from scipy.spatial import cKDTree

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); OSM = os.path.join(ROOT, 'data-osm')
txt = open(os.path.join(ROOT, 'prototype', 'drive', 'data-lines.js'), encoding='utf-8').read()
LINES = json.loads(txt[txt.index('window.LINES = ') + len('window.LINES = '):].rstrip().rstrip(';'))
SHIN = {'tsk': ['東海道新幹線', '山陽新幹線', '九州新幹線', 'JR東海道新幹線'], 'toh': ['東北新幹線', '北海道新幹線'], 'jts': ['上越新幹線'], 'hok': ['北陸新幹線'], 'nks': ['西九州新幹線'],
        'yam': ['東北新幹線', '奥羽本線'], 'aki': ['東北新幹線', '田沢湖線', '奥羽本線']}
CONV = ('奥羽本線', '田沢湖線', '山形線')              # đường sắt thường của mini-Shinkansen (khổ 1435 mm sau khi cải tạo)


def isconv(nm): return any(k in nm for k in CONV)
SKIP_SERVICE = {'yard', 'siding', 'spur'}                  # giữ 'crossover': nối đường xuống và đường lên


def read_ways(paths):
    ways = {}; nodes = {}
    for p in paths:
        fp = osmium.FileProcessor(p).with_locations().with_filter(osmium.filter.KeyFilter('railway')).with_filter(osmium.filter.EntityFilter(osmium.osm.WAY))
        for w in fp:
            t = w.tags
            if t.get('railway') != 'rail' or t.get('service') in SKIP_SERVICE or w.id in ways: continue
            nm = t.get('name', '')
            hs = t.get('highspeed') == 'yes' or '新幹線' in nm
            conv = isconv(nm) and t.get('gauge') in ('1435', None) and not t.get('highspeed')
            if not (hs or conv): continue
            try: pts = [(n.ref, n.lat, n.lon) for n in w.nodes]
            except Exception: continue
            ow = 1 if t.get('oneway') in ('yes', '1', 'true') else (-1 if t.get('oneway') == '-1' else 0)
            ways[w.id] = (nm if nm else '', pts, ow)
            for r, la, lo in pts: nodes[r] = (la, lo)
        print('đọc', os.path.basename(p), len(ways), 'đoạn', flush=True)
    return ways, nodes


def build(lid, ways, nodes):
    names = set(SHIN[lid]); adj = {}
    for wid, (nm, pts, ow) in ways.items():
        if isconv(nm) and lid not in ('yam', 'aki'): continue        # đường sắt thường chỉ dùng cho mini-Shinkansen; mọi đoạn Shinkansen (kể cả hầm/đoạn tên khác) đều chấp nhận, đường ngắn nhất tự chọn
        for (a, la, lo), (b, lb, ob) in zip(pts, pts[1:]):
            d = hav(la, lo, lb, ob); adj.setdefault(a, []); adj.setdefault(b, [])
            if ow >= 0: adj[a].append((b, d))             # chỉ đi theo chiều đường một chiều: đường ray chiều xuống (bên trái) là đường ta chạy
            if ow <= 0: adj[b].append((a, d))
    return adj


def hav(la, lo, lb, ob):
    x = math.radians(ob - lo) * math.cos(math.radians((la + lb) / 2)); y = math.radians(lb - la); return 6371000 * math.hypot(x, y)


def dijkstra(adj, srcs, dsts):
    # nhiều điểm xuất phát / đích (các nút gần ga nhất): [(nút, khoảng cách tới ga)]; trả đường đi ngắn nhất có hướng
    dst = {n: w for n, w in dsts}; dist = {}; prev = {}; pq = []
    for n, w in srcs: dist[n] = w; heapq.heappush(pq, (w, n))
    best = None
    while pq:
        d, u = heapq.heappop(pq)
        if best and d > best[0]: break
        if d > dist.get(u, 1e18): continue
        if u in dst and (best is None or d + dst[u] < best[0]): best = (d + dst[u], u)
        for v, w in adj.get(u, ()):
            nd = d + w
            if nd < dist.get(v, 1e18): dist[v] = nd; prev[v] = u; heapq.heappush(pq, (nd, v))
    if best is None: return None, None
    path = [best[1]]
    while path[-1] in prev: path.append(prev[path[-1]])
    return path[::-1], best[0]


def main(only):
    paths = sorted(glob.glob(os.path.join(OSM, '*-latest.osm.pbf')))
    cache = os.path.join(OSM, 'rails.pkl')
    import pickle
    if os.path.exists(cache) and not os.environ.get('REREAD'):
        ways, nodes = pickle.load(open(cache, 'rb'))
    else:
        ways, nodes = read_ways(paths); pickle.dump((ways, nodes), open(cache, 'wb'))
    for lid in only or LINES:
        L = LINES[lid]; adj = build(lid, ways, nodes); ids = np.array(list(adj))
        xy = np.array([[nodes[i][0], nodes[i][1] * math.cos(math.radians(36))] for i in ids]); tree = cKDTree(xy)
        cand = []; snap = []                                         # mỗi ga: các nút ray trong 350 m (cả hai đường); đường ngắn nhất có hướng tự chọn đường đúng chiều
        for st in L['stations']:
            qq = [st['lat'], st['lon'] * math.cos(math.radians(36))]; ii = tree.query_ball_point(qq, 350 / 111000)
            if not ii: d, k0 = tree.query(qq); ii = [int(k0)]
            c = sorted(((int(ids[k]), math.hypot(xy[k][0] - qq[0], xy[k][1] - qq[1]) * 111000) for k in ii), key=lambda x: x[1])[:40]
            cand.append(c); snap.append(c[0][1])
        out = []; warn = []; gs = 0.0
        for k in range(len(L['stations']) - 1):
            km0, km1 = L['stations'][k]['km'], L['stations'][k + 1]['km']
            path, dist = dijkstra(adj, cand[k], cand[k + 1])
            if path is not None: dist = sum(hav(*nodes[path[z - 1]], *nodes[path[z]]) for z in range(1, len(path))) or 1.0
            if path is None:
                warn.append(f"không có đường {L['stations'][k]['en']} → {L['stations'][k + 1]['en']}: nối thẳng")
                a, b = cand[k][0][0], cand[k + 1][0][0]; la, lo = nodes[a]; lb, ob = nodes[b]; path = [a, b]; dist = hav(la, lo, lb, ob)
            sc = (km1 - km0) * 1000 / max(dist, 1); cum = 0.0
            for z, u in enumerate(path):
                if z: cum += hav(*nodes[path[z - 1]], *nodes[u])
                if out and z == 0: continue
                out.append([round(nodes[u][0], 6), round(nodes[u][1], 6), round(km0 * 1000 + cum * sc, 1)])
            if abs(sc - 1) > 0.08: warn.append(f"{L['stations'][k]['en']}–{L['stations'][k + 1]['en']}: tỉ lệ km {sc:.3f} (đường OSM {dist/1000:.2f} km, game {km1 - km0:.2f} km)")
        json.dump({'pts': out, 'warn': warn, 'snap': [round(x) for x in snap]}, open(os.path.join(OSM, f'align_{lid}.json'), 'w'))
        print(lid, len(out), 'điểm;', len(warn), 'cảnh báo; ga lệch tối đa', max(snap), 'm', flush=True)
        for w in warn[:6]: print('   ', w)


if __name__ == '__main__': main(sys.argv[1:])
