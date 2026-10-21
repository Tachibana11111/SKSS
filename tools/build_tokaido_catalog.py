# Tạo prototype/drive/data-tokaido.js từ docs/data/jrwest-*-20261020.csv (chiều lên Shin-Osaka -> Tokyo, ngày thứ Ba 20/10/2026).
# Dữ liệu chỉ dùng cá nhân. Chạy: python -X utf8 tools/build_tokaido_catalog.py
import csv, json, re, os
D = os.path.join(os.path.dirname(__file__), '..', 'docs', 'data')
EN = {'東京':0,'品川':1,'新横浜':2,'小田原':3,'熱海':4,'三島':5,'新富士':6,'静岡':7,'掛川':8,'浜松':9,'豊橋':10,'三河安城':11,'名古屋':12,'岐阜羽島':13,'米原':14,'京都':15,'新大阪':16}
TYPE = {'のぞみ':'Nozomi','ひかり':'Hikari','こだま':'Kodama'}
def sec(s):
    h, m = s.split(':'); return int(h) * 3600 + int(m) * 60
trains = {r['train_id']: r for r in csv.DictReader(open(os.path.join(D, 'jrwest-trains-20261020.csv'), encoding='utf-8'))}
stops = {}
for r in csv.DictReader(open(os.path.join(D, 'jrwest-stops-20261020.csv'), encoding='utf-8')): stops.setdefault(r['train_id'], []).append(r)
out = []
for tid, t in trains.items():
    if t['direction'] != 'len': continue
    m = re.search(r'(のぞみ|ひかり|こだま)(\d+)号', t['name'])
    if not m: continue
    rows = stops[tid]
    if not rows or rows[0]['station'] != '新大阪': continue
    seq = []
    for r in rows:
        if r['station'] not in EN: continue
        i = EN[r['station']]
        if r['pass'] == 'Y': seq.append([i, None, None, 1])
        else: seq.append([i, sec(r['arr']) if r['arr'] else None, sec(r['dep']) if r['dep'] else None, 0])
    if len(seq) < 2: continue
    out.append([TYPE[m.group(1)], m.group(2), seq])
out.sort(key=lambda x: x[2][0][2] or 0)
js = '// Sinh tự động bởi tools/build_tokaido_catalog.py từ lịch JR West 20/10/2026 (chỉ dùng cá nhân)\nwindow.TOKAIDO_UP = ' + json.dumps(out, separators=(',', ':')) + ';\n'
open(os.path.join(os.path.dirname(__file__), '..', 'prototype', 'drive', 'data-tokaido.js'), 'w', encoding='utf-8').write(js)
print(len(out), 'chuyến', len(js), 'byte')
from collections import Counter; print(Counter(o[0] for o in out)); print(Counter(o[2][-1][0] for o in out))
