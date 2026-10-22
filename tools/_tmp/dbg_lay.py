import sys, json, pickle, glob, numpy as np
sys.path.insert(0,'D:/Shinkansen/tools')
import osm_layout as O
name, lid = sys.argv[1], sys.argv[2]
data={}
for p in glob.glob('D:/Shinkansen/data-osm/stations_*.pkl'):
    for k,v in pickle.load(open(p,'rb')).items(): data.setdefault(k,[]).extend(v)
fr=O.Frame(json.load(open(f'D:/Shinkansen/data-osm/align_{lid}.json'))['pts'])
st=[s for s in O.LINES[lid]['stations'] if s['jp']==name][0]; s0=st['km']*1000
print(name, st['km'], st['lat'], st['lon'])
for o in data[name]:
    ll=np.array(o['ll']); S,D=fr.sd(ll[:,0],ll[:,1])
    if o['k'] in ('platform','station'):
        print(o['k'], o['id'], len(ll), 'S', round(S.min()-s0), round(S.max()-s0), 'D', round(D.min(),1), round(D.max(),1), o['tags'].get('name'))
rails=[(round(float(np.mean(fr.sd(np.array(o['ll'])[:,0],np.array(o['ll'])[:,1])[1])),1), o['tags'].get('oneway'), o['tags'].get('service'), len(o['ll'])) for o in data[name] if o['k']=='rail']
rails.sort(reverse=True); print(rails[:40])
