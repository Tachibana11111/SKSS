# Tạo prototype/drive/data-lines.js: ga (km thực), tuyến và lịch tàu thật cho game.
# Nguồn: docs/data (JR East 2610 ngày thường; JR West 20/10/2026) + km thực từ Wikipedia tiếng Nhật (tra 21/10/2026). Chỉ dùng cá nhân.
# Tuyến 'tsk' = Tokaido + Sanyo + Kyushu liền nhau (Tokyo - Kagoshima-Chuo); tuyến 'toh' = Tohoku (Tokyo - Shin-Aomori).
# Chạy: python -X utf8 tools/build_lines.py
import csv, json, os, re
ROOT = os.path.join(os.path.dirname(__file__), '..')
D = os.path.join(ROOT, 'docs', 'data')

TSK = [  # (JP, EN, km thực cộng dồn từ Tokyo, ga có đường thông qua)
 ('東京','Tokyo',0,0),('品川','Shinagawa',6.8,0),('新横浜','Shin-Yokohama',25.5,0),('小田原','Odawara',76.7,1),('熱海','Atami',95.4,0),('三島','Mishima',111.3,1),
 ('新富士','Shin-Fuji',135.0,1),('静岡','Shizuoka',167.4,1),('掛川','Kakegawa',211.3,1),('浜松','Hamamatsu',238.9,1),('豊橋','Toyohashi',274.2,1),('三河安城','Mikawa-Anjo',312.8,1),
 ('名古屋','Nagoya',342.0,0),('岐阜羽島','Gifu-Hashima',367.1,1),('米原','Maibara',408.2,1),('京都','Kyoto',476.3,0),('新大阪','Shin-Osaka',515.4,0)]
SANYO = [('新神戸','Shin-Kobe',32.6,0),('西明石','Nishi-Akashi',54.8,1),('姫路','Himeji',85.9,1),('相生','Aioi',105.9,1),('岡山','Okayama',160.9,0),('新倉敷','Shin-Kurashiki',186.7,1),
 ('福山','Fukuyama',217.7,1),('新尾道','Shin-Onomichi',235.1,1),('三原','Mihara',245.6,1),('東広島','Higashi-Hiroshima',276.5,1),('広島','Hiroshima',305.8,0),('新岩国','Shin-Iwakuni',350.0,1),
 ('徳山','Tokuyama',388.1,1),('新山口','Shin-Yamaguchi',429.2,1),('厚狭','Asa',453.3,1),('新下関','Shin-Shimonoseki',477.1,1),('小倉','Kokura',497.8,0),('博多','Hakata',553.7,0)]
KYUSHU = [('新鳥栖','Shin-Tosu',26.3,0),('久留米','Kurume',32.0,0),('筑後船小屋','Chikugo-Funagoya',47.9,0),('新大牟田','Shin-Omuta',59.7,0),('新玉名','Shin-Tamana',76.3,0),
 ('熊本','Kumamoto',98.2,0),('新八代','Shin-Yatsushiro',130.0,0),('新水俣','Shin-Minamata',172.8,0),('出水','Izumi',188.8,0),('川内','Sendai',221.5,0),('鹿児島中央','Kagoshima-Chuo',256.8,0)]
TOH = [('東京','Tokyo',0.0,0),('上野','Ueno',3.6,0),('大宮','Omiya',31.3,0),('小山','Oyama',80.3,0),('宇都宮','Utsunomiya',109.0,1),('那須塩原','Nasushiobara',152.4,1),('新白河','Shin-Shirakawa',178.4,0),
 ('郡山','Koriyama',213.9,0),('福島','Fukushima',255.1,0),('白石蔵王','Shiroishi-Zao',286.2,0),('仙台','Sendai',325.4,0),('古川','Furukawa',363.8,0),('くりこま高原','Kurikoma-Kogen',385.7,0),
 ('一ノ関','Ichinoseki',406.3,1),('水沢江刺','Mizusawa-Esashi',431.3,0),('北上','Kitakami',448.6,1),('新花巻','Shin-Hanamaki',463.1,0),('盛岡','Morioka',496.5,0),('いわて沼宮内','Iwate-Numakunai',527.6,0),
 ('二戸','Ninohe',562.2,0),('八戸','Hachinohe',593.1,0),('七戸十和田','Shichinohe-Towada',629.2,0),('新青森','Shin-Aomori',674.9,0)]

def build_stations(lst):
    out = [dict(jp=a, en=b, km=c, loop=d) for a, b, c, d in lst]
    return out
tsk = build_stations(TSK)
for jp, en, km, lp in SANYO: tsk.append(dict(jp=jp, en=en, km=round(515.4 + km, 1), loop=lp))
for jp, en, km, lp in KYUSHU: tsk.append(dict(jp=jp, en=en, km=round(515.4 + 553.7 + km, 1), loop=lp))
toh = build_stations(TOH)
LINES = {'tsk': dict(id='tsk', name='Tokaido – Sanyo – Kyushu', stations=tsk, kmEnd=tsk[-1]['km']), 'toh': dict(id='toh', name='Tohoku (Tokyo – Shin-Aomori)', stations=toh, kmEnd=toh[-1]['km'])}
IDX = {k: {s['jp']: i for i, s in enumerate(v['stations'])} for k, v in LINES.items()}
TYPE = {'のぞみ': 'Nozomi', 'ひかり': 'Hikari', 'こだま': 'Kodama', 'みずほ': 'Mizuho', 'さくら': 'Sakura', 'つばめ': 'Tsubame', 'かもめ': 'Kamome',
        'はやぶさ': 'Hayabusa', 'はやて': 'Hayate', 'やまびこ': 'Yamabiko', 'なすの': 'Nasuno', 'こまち': 'Komachi', 'つばさ': 'Tsubasa'}

def sec(s):
    h, m = s.split(':'); return int(h) * 3600 + int(m) * 60
def vehicle(line, typ, equip):
    if line == 'toh': return 'E5'
    if typ in ('Mizuho', 'Sakura'): return 'N700-8'
    if typ in ('Tsubame', 'Kamome'): return 'S800'
    if 'Ｎ７００Ｓ' in (equip or ''): return 'N700S'
    return 'N700'

def make_seq(line, rows, dedupe_pass=True):
    """rows: [(jp, arr, dep, pass)] theo thứ tự chạy; chỉ giữ phần nằm trong tuyến, điền ga thông qua; trả None nếu không hợp lệ."""
    idx = IDX[line]
    pts = [(idx[j], a, d, p) for j, a, d, p in rows if j in idx]
    if len(pts) < 2: return None
    # phần liền mạch trong tuyến (theo thứ tự chạy)
    first, last = pts[0][0], pts[-1][0]
    if first == last: return None
    inc = last > first
    # bảo đảm đơn điệu
    for a, b in zip(pts, pts[1:]):
        if (b[0] > a[0]) != inc and b[0] != a[0]: return None
    seq = []; have = {p[0]: p for p in pts}
    rng = range(first, last + (1 if inc else -1), 1 if inc else -1)
    t_prev = 0
    for i in rng:
        if i in have:
            _, a, d, p = have[i]
            if p: seq.append([i, None, None, 1]); continue
            seq.append([i, a, d, 0])
        else: seq.append([i, None, None, 1])
    # sửa giờ qua nửa đêm (giờ giảm đột ngột)
    last_t = -1
    for e in seq:
        for k in (1, 2):
            if e[k] is not None:
                while e[k] < last_t - 3600: e[k] += 86400
                last_t = e[k]
    seq[0][1] = None; seq[-1][2] = None
    if seq[0][3] or seq[-1][3]: return None
    return seq

def read_east():
    tr = list(csv.DictReader(open(os.path.join(D, 'trains-weekday-2610.csv'), encoding='utf-8')))
    st = {}
    for r in csv.DictReader(open(os.path.join(D, 'stops-weekday-2610.csv'), encoding='utf-8')): st.setdefault(r['train_id'], []).append(r)
    out = []
    for t in tr:
        name = t['name'].split('+')[0]
        m = re.match(r'(.+?)\s*(\d+)号', name)
        if not m or m.group(1) not in TYPE: continue
        typ, no = TYPE[m.group(1)], m.group(2)
        rows = [r for r in sorted(st[t['train_id']], key=lambda r: int(r['seq'])) if r['branch'] == '0']
        raw = [(r['station'], sec(r['arr']) if r['arr'] else None, sec(r['dep']) if r['dep'] else None, False) for r in rows]
        out.append((typ, no, raw, t.get('equipment', '')))
    return out

def read_west():
    tr = {r['train_id']: r for r in csv.DictReader(open(os.path.join(D, 'jrwest-trains-20261020.csv'), encoding='utf-8'))}
    st = {}
    for r in csv.DictReader(open(os.path.join(D, 'jrwest-stops-20261020.csv'), encoding='utf-8')): st.setdefault(r['train_id'], []).append(r)
    out = []
    for tid, t in tr.items():
        m = re.search(r'(のぞみ|ひかり|こだま|みずほ|さくら|つばめ)(\d+)号', t['name'])
        if not m: continue
        rows = sorted(st[tid], key=lambda r: int(r['seq']))
        raw = [(r['station'], sec(r['arr']) if r['arr'] else None, sec(r['dep']) if r['dep'] else None, r['pass'] == 'Y') for r in rows]
        out.append((TYPE[m.group(1)], m.group(2), raw, ''))
    return out

east, west = read_east(), read_west()
trains = {'tsk': {}, 'toh': {}}
def add(line, typ, no, raw, equip, src):
    seq = make_seq(line, raw)
    if not seq or len(seq) < 2: return
    d = 'down' if seq[-1][0] > seq[0][0] else 'up'
    if line == 'toh' and typ in ('Komachi', 'Tsubasa'): return              # phần mini-Shinkansen: bỏ
    key = (typ, no, d)
    # ưu tiên bản JR East (đầy đủ hơn); bản JR West chỉ bổ sung
    if key in trains[line] and src == 'W': return
    trains[line][key] = dict(t=typ, n=no, d=d, v=vehicle(line, typ, equip), s=seq, src=src, mir=0)
for src, data in (('E', east), ('W', west)):
    for typ, no, raw, equip in data:
        names = {j for j, *_ in raw}
        for line in ('tsk', 'toh'):
            inline = [r for r in raw if r[0] in IDX[line]]
            if len(inline) >= 2 and ({r[0] for r in raw if r[0] not in IDX[line]} <= (set() if line == 'tsk' else {'奥津軽いまべつ', '木古内', '新函館北斗'})):
                if line == 'tsk' and typ in ('Hayabusa', 'Hayate', 'Yamabiko', 'Nasuno'): continue
                if line == 'toh' and typ in ('Nozomi', 'Hikari', 'Kodama', 'Mizuho', 'Sakura', 'Tsubame', 'Kamome'): continue
                add(line, typ, no, inline, equip, src)
# chiều lên cho các chuyến Sanyo-Kyushu nội tuyến chỉ có chiều xuống: tạo bản đối xứng, đánh dấu mir=1
out = {}
for line in trains:
    lst = sorted(trains[line].values(), key=lambda x: (x['s'][0][2] if x['s'][0][2] is not None else x['s'][0][1], x['n']))
    # chiều lên đối xứng cho tuyến tsk phần Sanyo–Kyushu nếu chưa có chuyến chiều lên thật nào bắt đầu ở phía tây
    if line == 'tsk':
        real_up = [t for t in lst if t['d'] == 'up']
        for t in [t for t in lst if t['d'] == 'down' and t['s'][0][0] >= 16 and t['s'][0][0] != 0]:
            s = t['s']; t0 = s[0][2] if s[0][2] is not None else s[0][1]; tEnd = s[-1][1] if s[-1][1] is not None else s[-1][2]
            if t0 is None or tEnd is None: continue
            up = []
            for e in reversed(s):
                i, a, d, p = e
                up.append([i, (t0 + (tEnd - d)) if d is not None else None, (t0 + (tEnd - a)) if a is not None else None, p])
            up[0][1] = None; up[-1][2] = None
            lst.append(dict(t=t['t'], n=str(int(t['n']) + 1) if t['n'].isdigit() else t['n'], d='up', v=t['v'], s=up, src='M', mir=1))
    out[line] = dict(LINES[line], trains=[dict(t=x['t'], n=x['n'], d=x['d'], v=x['v'], s=x['s'], src=x['src'], mir=x['mir']) for x in lst])
js = '// Sinh tự động bởi tools/build_lines.py (lịch JR East 2610 ngày thường + JR West 20/10/2026; km thực từ Wikipedia JP). Chỉ dùng cá nhân.\nwindow.LINES = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(ROOT, 'prototype', 'drive', 'data-lines.js'), 'w', encoding='utf-8').write(js)
for ln, v in out.items():
    from collections import Counter
    c = Counter((t['d'], t['src']) for t in v['trains']); print(ln, len(v['trains']), dict(c), Counter(t['v'] for t in v['trains']))
print(len(js), 'byte')
