# Trích bố trí ga thật từ OpenStreetMap: sân ga (railway=platform, public_transport=platform), mép sân ga, đường ray (kể cả đường tránh/đề-pô/chéo) quanh từng ga
# trong bán kính ~900 m. Vào: data-osm/*.osm.pbf + toạ độ ga trong prototype/drive/data-lines.js. Ra: data-osm/stations_<vùng>.pkl
# Dữ liệu © OpenStreetMap contributors, ODbL 1.0 (chỉ dùng cá nhân, không đưa vào repo).
import osmium, json, os, sys, glob, pickle, math
import numpy as np
from scipy.spatial import cKDTree

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); OSM = os.path.join(ROOT, 'data-osm')
txt = open(os.path.join(ROOT, 'prototype', 'drive', 'data-lines.js'), encoding='utf-8').read()
LINES = json.loads(txt[txt.index('window.LINES = ') + len('window.LINES = '):].rstrip().rstrip(';'))
R_DEG = 0.0085                      # ~ 900 m

def main(only):
    st = {}
    for lid, L in LINES.items():
        for s in L['stations']: st.setdefault(s['jp'], (s['lat'], s['lon'], s['en']))
    names = list(st); pts = np.array([[st[n][0], st[n][1] * 0.81] for n in names]); tree = cKDTree(pts)
    for path in sorted(glob.glob(os.path.join(OSM, '*-latest.osm.pbf'))):
        reg = os.path.basename(path).split('-')[0]
        if only and reg not in only: continue
        out = {n: [] for n in names}; cnt = 0
        fp = osmium.FileProcessor(path, osmium.osm.NODE | osmium.osm.WAY).with_locations().with_filter(osmium.filter.KeyFilter('railway', 'public_transport')).with_filter(osmium.filter.EntityFilter(osmium.osm.WAY))
        for w in fp:
            t = w.tags; rw = t.get('railway'); pt = t.get('public_transport')
            kind = None
            if rw == 'platform' or pt == 'platform': kind = 'platform'
            elif rw == 'platform_edge': kind = 'edge'
            elif rw == 'rail' and (t.get('highspeed') == 'yes' or '新幹線' in t.get('name', '') or t.get('service') in ('siding', 'yard', 'crossover', 'spur') or t.get('gauge') == '1435'): kind = 'rail'
            elif rw in ('station', 'halt') or pt in ('station', 'stop_area'): kind = 'station'
            if not kind: continue
            try: ll = [(n.lat, n.lon) for n in w.nodes]
            except Exception: continue
            if not ll: continue
            la, lo = ll[0]; d, i = tree.query([la, lo * 0.81])
            if d > R_DEG:
                la, lo = ll[len(ll) // 2]; d, i = tree.query([la, lo * 0.81])
                if d > R_DEG: continue
            out[names[i]].append({'k': kind, 'id': w.id, 'll': ll, 'tags': {k: v for k, v in t if k in ('name', 'ref', 'level', 'layer', 'tunnel', 'bridge', 'service', 'highspeed', 'usage', 'area', 'surface', 'covered', 'shelter', 'oneway', 'height', 'railway', 'public_transport', 'operator', 'electrified', 'gauge')}})
            cnt += 1
        pickle.dump(out, open(os.path.join(OSM, f'stations_{reg}.pkl'), 'wb'))
        print(reg, cnt, 'đối tượng', flush=True)

if __name__ == '__main__': main(sys.argv[1:])
