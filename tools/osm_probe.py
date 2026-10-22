import osmium, sys, collections
path = sys.argv[1]
cnt = collections.Counter(); names = collections.Counter(); ex = {}
fp = osmium.FileProcessor(path).with_filter(osmium.filter.KeyFilter('railway')).with_filter(osmium.filter.EntityFilter(osmium.osm.WAY))
for w in fp:
    t = w.tags
    if t.get('railway') != 'rail': continue
    nm = t.get('name', '')
    sh = '新幹線' in nm or '新幹線' in t.get('name:ja', '') or t.get('highspeed') == 'yes' or '新幹線' in t.get('operator', '') and False
    if sh:
        key = (t.get('highspeed'), t.get('usage'), t.get('gauge'), t.get('electrified'), t.get('service'), t.get('tunnel') or '', t.get('bridge') or '')
        cnt[key] += 1; names[nm] += 1; ex.setdefault(key, dict(t))
print(sum(cnt.values()), 'ways'); print(names.most_common(12))
for k, v in cnt.most_common(8): print(v, k)
print(ex[cnt.most_common(1)[0][0]])
