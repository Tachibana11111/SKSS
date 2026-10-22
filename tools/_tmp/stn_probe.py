import pickle, glob, json, sys, math
import numpy as np
sys.path.insert(0, 'D:/Shinkansen/tools')
txt = open('D:/Shinkansen/prototype/drive/data-lines.js', encoding='utf-8').read()
LINES = json.loads(txt[txt.index('window.LINES = ') + 15:].rstrip().rstrip(';'))
data = {}
for p in glob.glob('D:/Shinkansen/data-osm/stations_*.pkl'):
    for k, v in pickle.load(open(p, 'rb')).items(): data.setdefault(k, []).extend(v)
name = sys.argv[1]
objs = data.get(name, [])
import collections
print(name, len(objs), collections.Counter(o['k'] for o in objs))
for o in objs[:12]:
    print(o['k'], o['id'], len(o['ll']), {k: v for k, v in o['tags'].items() if k in ('name','service','highspeed','railway','level','tunnel','bridge','oneway')})
