import osmium, collections
fp = osmium.FileProcessor('D:/Shinkansen/data-osm/kanto-latest.osm.pbf').with_locations().with_filter(osmium.filter.KeyFilter('railway')).with_filter(osmium.filter.EntityFilter(osmium.osm.WAY))
c = collections.Counter(); ex = {}
for w in fp:
    t = w.tags
    if t.get('railway') != 'rail': continue
    try: la = w.nodes[0].lat; lo = w.nodes[0].lon
    except Exception: continue
    if not (35.75 < la < 35.92 and 139.62 < lo < 139.72): continue
    if t.get('gauge') != '1435' and t.get('voltage') != '25000': continue
    k = (t.get('name', ''), t.get('highspeed'), t.get('usage'), t.get('service'), t.get('voltage'), t.get('operator', '')[:12])
    c[k] += 1; ex.setdefault(k, w.id)
for k, v in c.most_common(15): print(v, k, ex[k])
