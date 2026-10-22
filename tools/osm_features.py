# Trích cảnh vật OpenStreetMap trong hành lang ±~800 m quanh đường ray từng tuyến, đổi sang toạ độ (s, d):
#   s = vị trí dọc tuyến theo km của game (mét), d = độ lệch ngang (mét, dương = bên TRÁI theo chiều xuống), như X của mô hình.
# Vào: data-osm/*.osm.pbf, data-osm/align_<tuyến>.json (osm_align.py). Ra: data-osm/feat_all.pkl
# Dữ liệu © OpenStreetMap contributors, ODbL 1.0 (chỉ dùng cá nhân, không đưa vào repo).
import osmium, json, math, os, sys, glob, pickle, time
import numpy as np
from scipy.spatial import cKDTree
import shapely, shapely.wkb
from shapely.geometry import LineString, box
from shapely.prepared import prep

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); OSM = os.path.join(ROOT, 'data-osm')
START = {'jts': 30300, 'hok': 105000, 'yam': 255100, 'aki': 496500}        # đoạn đầu dùng chung với tuyến cha: không lấy lại
HALF = 0.0072                                                                 # nửa bề rộng hành lang (độ, ~800 m)
HW = {'motorway': 6, 'trunk': 5, 'primary': 5, 'motorway_link': 4, 'trunk_link': 4, 'secondary': 4, 'primary_link': 4, 'tertiary': 3, 'unclassified': 2, 'residential': 2, 'secondary_link': 3, 'tertiary_link': 2}
LU = {'forest': 'f', 'wood': 'f', 'farmland': 'a', 'meadow': 'g', 'grass': 'g', 'orchard': 'o', 'vineyard': 'o', 'plant_nursery': 'o', 'residential': 'h', 'commercial': 'c', 'retail': 'c', 'industrial': 'i',
      'cemetery': 'e', 'recreation_ground': 'p', 'park': 'p', 'village_green': 'p', 'allotments': 'a', 'basin': 'w', 'reservoir': 'w', 'water': 'w', 'wetland': 'm', 'scrub': 's', 'grassland': 'g', 'heath': 's', 'bare_rock': 'r',
      'scree': 'r', 'sand': 'y', 'beach': 'y', 'construction': 'i', 'brownfield': 'i'}
LEIS = ('park', 'garden', 'pitch', 'golf_course')


def load_aligns(only):
    A = {}
    for p in glob.glob(os.path.join(OSM, 'align_*.json')):
        lid = os.path.basename(p)[6:-5]
        if only and lid not in only: continue
        pts = np.array(json.load(open(p))['pts']); s0 = START.get(lid, 0)
        k = np.where(pts[:, 2] >= s0 - 3000)[0][0]; A[lid] = pts[k:]
    return A


class Frame:
    def __init__(self, pts):
        self.p = pts; self.tree = cKDTree(np.c_[pts[:, 0], pts[:, 1] * 0.81]); self.line = LineString(np.c_[pts[:, 1], pts[:, 0]])
        self.poly = self.line.buffer(HALF); self.pp = prep(self.poly)

    def sd(self, lat, lon):
        # (s, d) của các điểm: chiếu lên đoạn gần nhất bằng mặt phẳng địa phương tại đỉnh gần nhất
        _, i = self.tree.query(np.c_[lat, lon * 0.81]); n = len(self.p); best = np.full(len(lat), 1e18); S = np.zeros(len(lat)); D = np.zeros(len(lat))
        for off in (-1, 0):
            a = np.clip(i + off, 0, n - 2); b = a + 1
            la = self.p[a, 0]; ka = 111320 * np.cos(np.radians(la)); kb = 110574
            bx = (self.p[b, 1] - self.p[a, 1]) * ka; by = (self.p[b, 0] - la) * kb
            px = (lon - self.p[a, 1]) * ka; py = (lat - la) * kb
            L2 = np.maximum(bx * bx + by * by, 1e-6); t = np.clip((px * bx + py * by) / L2, 0, 1)
            dist = np.hypot(px - t * bx, py - t * by); cross = bx * py - by * px           # cross > 0: điểm nằm bên TRÁI hướng đi (chiều tăng s)
            m = dist < best; best = np.where(m, dist, best)
            S = np.where(m, self.p[a, 2] + t * (self.p[b, 2] - self.p[a, 2]), S); D = np.where(m, np.where(cross >= 0, dist, -dist), D)
        return S, D


def simp(g, tol=0.00003):
    return g.simplify(tol, preserve_topology=False)


def rings(g):
    out = []
    for poly in getattr(g, 'geoms', [g]):
        if poly.geom_type == 'Polygon' and not poly.is_empty: out.append(np.array(poly.exterior.coords)[:, ::-1])         # (lat, lon)
    return out


def lines_of(g):
    return [x for x in getattr(g, 'geoms', [g]) if x.geom_type == 'LineString' and len(x.coords) >= 2]


CELL = 0.02


def cell_set(F, margin=2):
    cells = set()
    for f in F.values():
        ij = np.unique(np.c_[np.floor(f.p[:, 0] / CELL).astype(int), np.floor(f.p[:, 1] / CELL).astype(int)], axis=0)
        for i, j in ij:
            for a in range(-margin, margin + 1):
                for b in range(-margin, margin + 1): cells.add((int(i) + a, int(j) + b))
    return cells


def first_loc(o, is_area):
    try:
        if is_area:
            for r in o.outer_rings():
                n = r[0]; return n.lat, n.lon
        n = o.nodes[0]; return n.lat, n.lon
    except Exception:
        return None


def main(only):
    A = load_aligns(only); F = {lid: Frame(p) for lid, p in A.items()}; res = {lid: {'b': [], 'a': [], 'r': [], 'w': [], 'x': []} for lid in A}
    wkb = osmium.geom.WKBFactory(); t0 = time.time(); cells = cell_set(F)
    keys = ('building', 'landuse', 'natural', 'leisure', 'water', 'waterway', 'highway', 'railway')
    only_pbf = os.environ.get('PBFS', '').split(',') if os.environ.get('PBFS') else None
    for path in sorted(glob.glob(os.path.join(OSM, '*-latest.osm.pbf'))):
        if only_pbf and os.path.basename(path).split('-')[0] not in only_pbf: continue
        fp = osmium.FileProcessor(path, osmium.osm.NODE | osmium.osm.WAY | osmium.osm.RELATION | osmium.osm.AREA).with_locations('sparse_file_array,' + os.path.join(OSM, 'nodes_' + os.path.basename(path).split('-')[0] + '.idx')).with_areas(osmium.filter.KeyFilter('building', 'landuse', 'natural', 'leisure', 'water', 'waterway'))
        fp = fp.with_filter(osmium.filter.KeyFilter(*keys))
        n = 0; keep = 0
        for o in fp:
            n += 1; t = o.tags; is_area = o.is_area(); kind = None
            if is_area:
                if 'building' in t and t['building'] != 'no': kind = 'b'
                elif t.get('landuse') in LU or t.get('natural') in LU or t.get('leisure') in LEIS or t.get('waterway') == 'riverbank': kind = 'a'
                else: continue
            else:
                if t.get('highway') in HW or t.get('railway') in ('rail', 'subway', 'light_rail', 'tram', 'narrow_gauge') or t.get('waterway') in ('river', 'canal', 'stream', 'drain'): kind = 'l'
                else: continue
                if t.get('railway') == 'rail' and (t.get('highspeed') == 'yes' or '新幹線' in t.get('name', '')): continue
            if kind == 'b' or kind == 'l':
                fl = first_loc(o, is_area)
                if fl is None or (int(math.floor(fl[0] / CELL)), int(math.floor(fl[1] / CELL))) not in cells: continue
            try:
                g = shapely.wkb.loads(wkb.create_multipolygon(o) if is_area else wkb.create_linestring(o), hex=True)
            except Exception:
                continue
            for lid, f in F.items():
                if not f.pp.intersects(g): continue
                gg = g.intersection(f.poly)
                if gg.is_empty: continue
                keep += 1
                if kind == 'b':
                    lev = t.get('building:levels'); h = t.get('height')
                    try: lev = float(lev) if lev else (float(str(h).split()[0]) / 3.2 if h else 0)
                    except Exception: lev = 0
                    for r in rings(gg):
                        if len(r) < 4: continue
                        S, D = f.sd(r[:, 0], r[:, 1]); res[lid]['b'].append((t.get('building', 'yes'), lev, np.c_[S, D].astype(np.float32)))
                elif kind == 'a':
                    cls = LU.get(t.get('landuse')) or LU.get(t.get('natural')) or ('p' if t.get('leisure') in LEIS else 'w')
                    for r in rings(simp(gg)):
                        if len(r) < 4: continue
                        S, D = f.sd(r[:, 0], r[:, 1]); res[lid]['a'].append((cls, np.c_[S, D].astype(np.float32)))
                else:
                    if 'highway' in t: layer, cl, br = 'r', HW.get(t.get('highway'), 1), 1 if t.get('bridge') in ('yes', 'viaduct') else (2 if t.get('tunnel') in ('yes', 'building_passage') else 0)
                    elif 'railway' in t: layer, cl, br = 'x', 0, 1 if t.get('bridge') in ('yes', 'viaduct') else (2 if t.get('tunnel') == 'yes' else 0)
                    else: layer, cl, br = 'w', 1 if t.get('waterway') in ('stream', 'drain') else 2, 0
                    for ln in lines_of(simp(gg)):
                        c = np.array(ln.coords)[:, ::-1]; S, D = f.sd(c[:, 0], c[:, 1]); res[lid][layer].append((cl, br, np.c_[S, D].astype(np.float32)))
            if n % 500000 == 0: print(os.path.basename(path), n, 'đối tượng, giữ', keep, f'{time.time() - t0:.0f}s', flush=True)
        print('xong', os.path.basename(path), n, 'giữ', keep, f'{time.time() - t0:.0f}s', flush=True)
        pickle.dump(res, open(os.path.join(OSM, os.environ.get('OUT', 'feat_all.pkl')), 'wb'))
    for lid in res: print(lid, {k: len(v) for k, v in res[lid].items()})


if __name__ == '__main__': main(sys.argv[1:])
