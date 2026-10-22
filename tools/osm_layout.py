# Suy ra bố trí ga (chuỗi mã P/d/u/D/U theo chiều xuống, trái -> phải) từ dữ liệu OpenStreetMap quanh từng ga (osm_stations.py) và đường ray thật (osm_align.py).
#   d/u = đường dừng chiều xuống/lên (có sân ga kề), D/U = đường thông qua, P = sân ga. Ra: docs/data/osm-layouts.json  {"<jp>|<tuyến>": {"tok": "...", "conf": 0..1, ...}}
# Dữ liệu © OpenStreetMap contributors, ODbL 1.0. Mã suy ra là [I]: chỉ đảm bảo thứ tự và loại; khoảng cách đường/sân ga vẫn là mô hình chuẩn.
import json, os, sys, glob, pickle, math, collections
import numpy as np
from scipy.spatial import cKDTree

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); OSM = os.path.join(ROOT, 'data-osm')
txt = open(os.path.join(ROOT, 'prototype', 'drive', 'data-lines.js'), encoding='utf-8').read()
LINES = json.loads(txt[txt.index('window.LINES = ') + len('window.LINES = '):].rstrip().rstrip(';'))
START = {'jts': 30.3, 'hok': 105.0, 'yam': 255.1, 'aki': 496.5}


class Frame:
    def __init__(self, pts):
        self.p = np.array(pts); self.tree = cKDTree(np.c_[self.p[:, 0], self.p[:, 1] * 0.81])

    def sd(self, lat, lon):
        lat = np.asarray(lat, float); lon = np.asarray(lon, float); _, i = self.tree.query(np.c_[lat, lon * 0.81]); n = len(self.p); best = np.full(len(lat), 1e18); S = np.zeros(len(lat)); D = np.zeros(len(lat))
        for off in (-1, 0):
            a = np.clip(i + off, 0, n - 2); b = a + 1; la = self.p[a, 0]; ka = 111320 * np.cos(np.radians(la)); kb = 110574
            bx = (self.p[b, 1] - self.p[a, 1]) * ka; by = (self.p[b, 0] - la) * kb; px = (lon - self.p[a, 1]) * ka; py = (lat - la) * kb
            L2 = np.maximum(bx * bx + by * by, 1e-6); t = np.clip((px * bx + py * by) / L2, 0, 1); dist = np.hypot(px - t * bx, py - t * by); cross = bx * py - by * px
            m = dist < best; best = np.where(m, dist, best); S = np.where(m, self.p[a, 2] + t * (self.p[b, 2] - self.p[a, 2]), S); D = np.where(m, np.where(cross >= 0, dist, -dist), D)
        return S, D


def cluster(vals, tol):
    out = []
    for v in sorted(vals, key=lambda x: x[0], reverse=True):
        if out and abs(out[-1][-1][0] - v[0]) <= tol: out[-1].append(v)
        else: out.append([v])
    return out


def analyse(lid, st, objs, fr):
    s0 = st['km'] * 1000; W = 520
    rails = []; plats = []
    for o in objs:
        ll = np.array(o['ll']);
        if len(ll) < 2: continue
        S, D = fr.sd(ll[:, 0], ll[:, 1]); t = o['tags']
        inw = np.abs(S - s0) < W + 120
        if not inw.any(): continue
        if o['k'] == 'rail':
            if t.get('service') in ('yard', 'spur'): continue
            if not (t.get('highspeed') == 'yes' or '新幹線' in t.get('name', '') or '山形' in t.get('name', '') or '秋田' in t.get('name', '')): continue
            # độ dài nằm trong cửa sổ và d trung bình (theo độ dài)
            cov = 0.0; dsum = 0.0; fw = 0.0
            for k in range(len(S) - 1):
                a, b = S[k], S[k + 1]; lo, hi = max(min(a, b), s0 - W), min(max(a, b), s0 + W)
                if hi > lo:
                    l = hi - lo; cov += l; dsum += l * (D[k] + D[k + 1]) / 2; fw += (b - a) / max(abs(b - a), 1e-6) * l
            if cov < 60: continue
            ow = t.get('oneway'); fwd = ow == 'yes' and fw > 0 or ow == '-1' and fw < 0
            direc = 'd' if (ow in ('yes', '-1') and ((fw > 0) == (ow == 'yes'))) else ('u' if ow in ('yes', '-1') else '?')
            rails.append((dsum / cov, cov, direc, t.get('service') or ''))
        elif o['k'] in ('platform', 'edge'):
            m = np.abs(S - s0) < W
            if m.sum() < 2: continue
            ln = float(S[m].max() - S[m].min())
            if o['k'] == 'platform' and ln >= 90 and (D[m].max() - D[m].min()) < 40: plats.append((float(D[m].min()), float(D[m].max()), ln))
    return rails, plats


def tokens(rails, plats):
    # gộp đường theo độ lệch ngang (±1,6 m), loại đường tránh ngắn
    cl = cluster([(r[0], r[1], r[2], r[3]) for r in rails if r[1] >= 150 or r[3] == ''], 1.6)
    tracks = []
    for c in cl:
        cov = sum(v[1] for v in c); d = sum(v[0] * v[1] for v in c) / cov; dirs = collections.Counter(v[2] for v in c); dirs.pop('?', None)
        direc = dirs.most_common(1)[0][0] if dirs else '?'
        tracks.append([d, cov, direc])
    # nếu thiếu hướng: nửa trái = xuống, nửa phải = lên (đường bên trái là đường xuống)
    tracks.sort(key=lambda x: -x[0])
    for i, t in enumerate(tracks):
        if t[2] == '?': t[2] = 'd' if i < len(tracks) / 2 else 'u'
    pl = sorted(plats, key=lambda x: -(x[0] + x[1]) / 2); merged = []
    for p in pl:
        if merged and abs((merged[-1][0] + merged[-1][1]) / 2 - (p[0] + p[1]) / 2) < 3.0: merged[-1] = (min(merged[-1][0], p[0]), max(merged[-1][1], p[1]), max(merged[-1][2], p[2]))
        else: merged.append(p)
    items = [(t[0], 'T', t) for t in tracks] + [((p[0] + p[1]) / 2, 'P', p) for p in merged]; items.sort(key=lambda x: -x[0])
    out = []; stopinfo = []
    for dcenter, kind, o in items:
        if kind == 'P': out.append('P'); continue
        near = any(min(abs(o[0] - p[0]), abs(o[0] - p[1])) < 6.5 and not (p[0] - 0.5 <= o[0] <= p[1] + 0.5) for p in merged)
        ch = o[2]; out.append(ch if near else ch.upper())
    # loại P liên tiếp trùng
    tok = ''.join(out);
    while 'PP' in tok: tok = tok.replace('PP', 'P')
    return tok, len(tracks), len(merged)


def main():
    data = {}
    for p in glob.glob(os.path.join(OSM, 'stations_*.pkl')):
        for k, v in pickle.load(open(p, 'rb')).items(): data.setdefault(k, []).extend(v)
    # bỏ trùng đối tượng
    for k in data:
        seen = set(); u = []
        for o in data[k]:
            if o['id'] in seen: continue
            seen.add(o['id']); u.append(o)
        data[k] = u
    frames = {lid: Frame(json.load(open(os.path.join(OSM, f'align_{lid}.json')))['pts']) for lid in LINES}
    res = {}; seen_st = {}
    for lid, L in LINES.items():
        for st in L['stations']:
            if st['km'] < START.get(lid, 0): continue
            key = f"{st['jp']}|{lid}"
            objs = data.get(st['jp'], [])
            rails, plats = analyse(lid, st, objs, frames[lid])
            tok, nt, npl = tokens(rails, plats)
            conf = 1.0 if (nt >= 2 and npl >= 1 and 'd' in tok.lower() and 'u' in tok.lower() and any(c in tok for c in 'du')) else 0.0
            res[key] = {'tok': tok, 'tracks': nt, 'plats': npl, 'conf': conf, 'old': st.get('lay'), 'en': st['en']}
    json.dump(res, open(os.path.join(ROOT, 'docs', 'data', 'osm-layouts.json'), 'w'), ensure_ascii=False, indent=1)
    ok = sum(1 for v in res.values() if v['conf']); print(len(res), 'ga;', ok, 'có độ tin cậy')
    for k in ('東京|toh', '上野|toh', '大宮|toh', '宇都宮|toh', '福島|toh', '仙台|toh', '盛岡|toh', '福島|yam', '長野|hok', '新大阪|tsk', '名古屋|tsk', '博多|tsk'):
        if k in res: print(k, res[k])


if __name__ == '__main__': main()
