import osmium, collections, sys
fp = osmium.FileProcessor('D:/Shinkansen/data-osm/kanto-latest.osm.pbf').with_locations().with_filter(osmium.filter.KeyFilter('railway')).with_filter(osmium.filter.EntityFilter(osmium.osm.WAY))
c = collections.Counter(); ex = {}
for w in fp:
    t = w.tags
    try: la = w.nodes[0].lat; lo = w.nodes[0].lon
    except Exception: continue
    if not (36.60 < la < 36.90 and 139.90 < lo < 140.05): continue
    if t.get('gauge') != '1435' and t.get('voltage') != '25000' and '新幹線' not in t.get('name', ''): continue
    k = (t.get('railway'), t.get('name', ''), t.get('highspeed'), t.get('usage'), t.get('service'), t.get('tunnel'), t.get('bridge'), t.get('disused'), t.get('construction'))
    c[k] += 1; ex.setdefault(k, w.id)
for k, v in c.most_common(20): print(v, k, ex[k])
