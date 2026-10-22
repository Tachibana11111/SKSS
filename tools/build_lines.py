# Tạo prototype/drive/data-lines.js: ga (km thực), tuyến và lịch tàu thật cho game.
# Nguồn: docs/data (JR East 2610 ngày thường; JR West 20/10/2026) + km thực từ Wikipedia tiếng Nhật (tra 21/10/2026). Chỉ dùng cá nhân.
# Tuyến 'tsk' = Tokaido + Sanyo + Kyushu liền nhau (Tokyo - Kagoshima-Chuo); tuyến 'toh' = Tohoku (Tokyo - Shin-Aomori).
# Chạy: python -X utf8 tools/build_lines.py
import csv, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
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
 ('二戸','Ninohe',562.2,0),('八戸','Hachinohe',593.1,0),('七戸十和田','Shichinohe-Towada',629.2,0),('新青森','Shin-Aomori',674.9,0),
 ('奥津軽いまべつ','Okutsugaru-Imabetsu',713.4,1),('木古内','Kikonai',788.2,1),('新函館北斗','Shin-Hakodate-Hokuto',823.7,0)]   # Hokkaido: km = 674.9 + 営業キロ từ Shin-Aomori (38.5 / 113.3 / 148.8) [N]
JTS = [('東京','Tokyo',0.0,0),('上野','Ueno',3.6,0),('大宮','Omiya',30.3,0),('熊谷','Kumagaya',64.7,1),('本庄早稲田','Honjo-Waseda',86.0,1),('高崎','Takasaki',105.0,1),('上毛高原','Jomo-Kogen',151.6,1),
 ('越後湯沢','Echigo-Yuzawa',199.2,1),('浦佐','Urasa',228.9,1),('長岡','Nagaoka',270.6,1),('燕三条','Tsubame-Sanjo',293.8,1),('新潟','Niigata',333.9,0)]    # 営業キロ từ Tokyo [N: Wikipedia JP 上越新幹線 tra 22/10/2026]
HOK = [('東京','Tokyo',0.0,0),('上野','Ueno',3.6,0),('大宮','Omiya',30.3,0),('熊谷','Kumagaya',64.7,1),('本庄早稲田','Honjo-Waseda',86.0,1),('高崎','Takasaki',105.0,1),('安中榛名','Annaka-Haruna',123.5,0),
 ('軽井沢','Karuizawa',146.8,0),('佐久平','Sakudaira',164.4,0),('上田','Ueda',189.2,0),('長野','Nagano',222.4,0),('飯山','Iiyama',252.3,0),('上越妙高','Joetsu-Myoko',281.9,0),('糸魚川','Itoigawa',318.9,0),
 ('黒部宇奈月温泉','Kurobe-Unazuki-Onsen',358.1,0),('富山','Toyama',391.9,0),('新高岡','Shin-Takaoka',410.8,0),('金沢','Kanazawa',450.5,0),('小松','Komatsu',477.6,0),('加賀温泉','Kagaonsen',492.1,1),
 ('芦原温泉','Awara-Onsen',508.4,0),('福井','Fukui',526.4,0),('越前たけふ','Echizen-Takefu',545.4,1),('敦賀','Tsuruga',575.6,0)]                         # 営業キロ từ Tokyo [N: Wikipedia JP 北陸新幹線]

def build_stations(lst):
    out = [dict(jp=a, en=b, km=c, loop=d) for a, b, c, d in lst]
    return out
tsk = build_stations(TSK)
for jp, en, km, lp in SANYO: tsk.append(dict(jp=jp, en=en, km=round(515.4 + km, 1), loop=lp))
for jp, en, km, lp in KYUSHU: tsk.append(dict(jp=jp, en=en, km=round(515.4 + 553.7 + km, 1), loop=lp))
toh = build_stations(TOH)
NKS = [('武雄温泉','Takeo-Onsen',0.0,0),('嬉野温泉','Ureshino-Onsen',10.9,0),('新大村','Shin-Omura',32.2,0),('諫早','Isahaya',44.7,0),('長崎','Nagasaki',66.0,0)]   # km thực 実キロ từ Takeo-Onsen (営業キロ Nagasaki 69,6) [N: Wikipedia JP 西九州新幹線]
YAM_MINI = [('米沢','Yonezawa',295.2,0),('高畠','Takahata',305.0,0),('赤湯','Akayu',311.2,0),('かみのやま温泉','Kaminoyama-Onsen',330.1,0),('山形','Yamagata',342.2,0),('天童','Tendo',355.5,0),
 ('さくらんぼ東根','Sakuranbo-Higashine',363.2,0),('村山','Murayama',368.6,0),('大石田','Oishida',382.0,0),('新庄','Shinjo',403.7,0)]       # km = 255.1 (Fukushima) + 営業キロ từ Fukushima [N: Wikipedia JP 山形新幹線]
AKI_MINI = [('雫石','Shizukuishi',512.5,0),('田沢湖','Tazawako',536.6,0),('角館','Kakunodate',555.3,0),('大曲','Omagari',572.1,0),('秋田','Akita',623.8,0)]           # km = 496.5 (Morioka) + 営業キロ từ Morioka (16,0 / 40,1 / 58,8 / 75,6 / 127,3) [N: Wikipedia JP 秋田新幹線]
def toh_upto(en): i = [x[1] for x in TOH].index(en); return TOH[:i + 1]
YAM = toh_upto('Fukushima') + YAM_MINI
AKI = toh_upto('Morioka') + AKI_MINI
jts, hok, nks, yam, aki = build_stations(JTS), build_stations(HOK), build_stations(NKS), build_stations(YAM), build_stations(AKI)
LINES = {'tsk': dict(id='tsk', name='Tokaido – Sanyo – Kyushu', stations=tsk, kmEnd=tsk[-1]['km']), 'toh': dict(id='toh', name='Tohoku – Hokkaido (Tokyo – Shin-Hakodate-Hokuto)', stations=toh, kmEnd=toh[-1]['km']),
         'jts': dict(id='jts', name='Joetsu (Tokyo – Niigata)', stations=jts, kmEnd=jts[-1]['km']), 'hok': dict(id='hok', name='Hokuriku (Tokyo – Tsuruga)', stations=hok, kmEnd=hok[-1]['km']),
         'nks': dict(id='nks', name='Nishi-Kyushu (Takeo-Onsen – Nagasaki)', stations=nks, kmEnd=nks[-1]['km']),
         'yam': dict(id='yam', name='Yamagata mini-Shinkansen (Tokyo – Shinjo)', stations=yam, kmEnd=yam[-1]['km']),
         'aki': dict(id='aki', name='Akita mini-Shinkansen (Tokyo – Akita)', stations=aki, kmEnd=aki[-1]['km'])}
import build_struct
build_struct.apply(LINES)
IDX = {k: {s['jp']: i for i, s in enumerate(v['stations'])} for k, v in LINES.items()}
TYPE = {'のぞみ': 'Nozomi', 'ひかり': 'Hikari', 'こだま': 'Kodama', 'みずほ': 'Mizuho', 'さくら': 'Sakura', 'つばめ': 'Tsubame', 'かもめ': 'Kamome',
        'はやぶさ': 'Hayabusa', 'はやて': 'Hayate', 'やまびこ': 'Yamabiko', 'なすの': 'Nasuno', 'こまち': 'Komachi', 'つばさ': 'Tsubasa',
        'とき': 'Toki', 'たにがわ': 'Tanigawa', 'あさま': 'Asama', 'はくたか': 'Hakutaka', 'かがやき': 'Kagayaki', 'つるぎ': 'Tsurugi'}
LINE_TYPES = {'tsk': {'Nozomi', 'Hikari', 'Kodama', 'Mizuho', 'Sakura', 'Tsubame', 'Kamome'}, 'toh': {'Hayabusa', 'Hayate', 'Yamabiko', 'Nasuno'},
              'jts': {'Toki', 'Tanigawa'}, 'hok': {'Asama', 'Hakutaka', 'Kagayaki', 'Tsurugi'}, 'nks': set(), 'yam': set(), 'aki': set()}
MINI = {'田沢湖', '雫石', '角館', '大曲', '秋田', '米沢', '高畠', '赤湯', 'かみのやま温泉', '山形', '天童', 'さくらんぼ東根', '村山', '大石田', '新庄'}   # ga trên phần mini-Shinkansen (Tsubasa / Komachi)

def sec(s):
    h, m = s.split(':'); return int(h) * 3600 + int(m) * 60
def vehicle(line, typ, equip):
    if line == 'toh': return 'E5'
    if line in ('jts', 'hok'): return 'E7'
    if line == 'nks': return 'N700S-6'
    if line == 'yam': return 'E8'
    if line == 'aki': return 'E6'
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
        rows = [r for r in sorted(st[t['train_id']], key=lambda r: int(r['seq'])) if r['station'] not in MINI]      # phần Shinkansen thật (chuyến ghép chiều lên ghi phần này ở nhánh 1)
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
trains = {k: {} for k in ('tsk', 'toh', 'jts', 'hok', 'nks', 'yam', 'aki')}
def add(line, typ, no, raw, equip, src):
    seq = make_seq(line, raw)
    if not seq or len(seq) < 2: return
    d = 'down' if seq[-1][0] > seq[0][0] else 'up'
    key = (typ, no, d)
    # ưu tiên bản JR East (đầy đủ hơn); bản JR West chỉ bổ sung
    if key in trains[line] and src == 'W': return
    trains[line][key] = dict(t=typ, n=no, d=d, v=vehicle(line, typ, equip), s=seq, src=src, mir=0)
for src, data in (('E', east), ('W', west)):
    for typ, no, raw, equip in data:
        for line in LINES:
            if typ not in LINE_TYPES[line]: continue
            inline = [r for r in raw if r[0] in IDX[line]]
            if len(inline) >= 2 and not ({r[0] for r in raw if r[0] not in IDX[line]} - set()): add(line, typ, no, inline, equip, src)
# Nishi-Kyushu: Kamome từ bảng giờ PDF đã đọc (docs/data/raw-pdf/parsed-nishikyushu-*.csv; chỉ có giờ khởi hành ở ga giữa -> giờ đến = giờ đi trừ 60 s [I])
def read_nks():
    order = ['武雄温泉', '嬉野温泉', '新大村', '諫早', '長崎']
    for fn, d in (('parsed-nishikyushu-down.csv', 'down'), ('parsed-nishikyushu-up.csv', 'up')):
        rows = list(csv.DictReader(open(os.path.join(D, 'raw-pdf', fn), encoding='utf-8')))
        tr = {}
        for r in rows: tr.setdefault((r['number'], r['name']), {})[r['row']] = r['value']
        for (num, name), cells in tr.items():
            m = re.fullmatch(r'かもめ(\d+)', name)
            if not m: continue
            seq = order if d == 'down' else order[::-1]; raw = []; prev = -1
            for j in seq:
                v = cells.get(j, '‥')
                if v in ('‥', ''): continue
                if v == 'ㇾ': raw.append((j, None, None, True)); continue
                t = sec(v)
                while t < prev - 600: t += 3600 * 3 if prev - t > 3600 else 86400    # sửa lỗi gõ giờ trong PDF (vd. 16:47 thay vì 19:47)
                prev = t; raw.append((j, t - 60, t, False))
            if len(raw) < 2: continue
            raw[0] = (raw[0][0], None, raw[0][2], False); a = raw[-1]; raw[-1] = (a[0], a[2], None, False)          # ga cuối: chỉ có giờ đến (cột 着)
            add('nks', 'Kamome', m.group(1), raw, '', 'P')
read_nks()
# mini-Shinkansen: Tsubasa (Yamagata) và Komachi (Akita). Trang JR East chỉ có giờ ở phần Shinkansen thật (và giờ đầu/cuối của Tsubasa chạy một mình chiều lên);
# phần đường sắt thường được ước tính [I] theo tốc độ trung bình; phần Shinkansen chiều lên của tàu ghép lấy giờ của tàu Yamabiko cùng số (nếu có) hoặc ước tính.
MINI_SET = {'yam': {j for j, *_ in YAM_MINI}, 'aki': {j for j, *_ in AKI_MINI}}
MINI_V = {'yam': (96.0, 70, 90), 'aki': (93.0, 90, 70)}     # tốc độ chạy trung bình (km/h), phụ trội tăng/giảm tốc mỗi chặng (s), thời gian dừng ga (s) [I]
CJ = {'yam': '福島', 'aki': '盛岡'}


def km_of(line, jp): return LINES[line]['stations'][IDX[line][jp]]['km']


def main_leg(line, a, b):
    k0, k1 = km_of(line, a), km_of(line, b); d = abs(k1 - k0); slow = max(0.0, min(30.3, max(k0, k1)) - min(30.3, min(k0, k1)))      # đoạn Tokyo–Omiya chạy chậm
    return int(slow / 90 * 3600 + (d - slow) / 205 * 3600 + 130)


SLOW = {'yam': (255.1, 295.2, 72.0), 'aki': (496.5, 540.0, 78.0)}                      # đèo Itaya / Sengan-toge: dốc 37‰ và cong gắt nên chạy chậm hơn [I]
def mini_leg(line, a, b):
    v, acc, _ = MINI_V[line]; k0, k1 = sorted((km_of(line, a), km_of(line, b))); z0, z1, vs = SLOW[line]
    inz = max(0.0, min(k1, z1) - max(k0, z0)); return int(inz / vs * 3600 + (k1 - k0 - inz) / v * 3600 + acc)


def read_east_mini():
    tr = list(csv.DictReader(open(os.path.join(D, 'trains-weekday-2610.csv'), encoding='utf-8')))
    st = {}
    for r in csv.DictReader(open(os.path.join(D, 'stops-weekday-2610.csv'), encoding='utf-8')): st.setdefault(r['train_id'], []).append(r)
    for t in tr:
        rows = sorted(st[t['train_id']], key=lambda r: int(r['seq']))
        line = next((ln for ln in ('yam', 'aki') if any(r['station'] in MINI_SET[ln] for r in rows)), None)
        if not line: continue
        parts = t['name'].split('+'); mini_part = next((p for p in parts if p.startswith('つばさ' if line == 'yam' else 'こまち')), None) or parts[0]
        m = re.match(r'(.+?)\s*(\d+)号', mini_part)
        if not m or m.group(1) not in TYPE: continue
        typ, no = TYPE[m.group(1)], m.group(2)
        coupled = any(p.startswith(('やまびこ', 'はやぶさ', 'はやて')) for p in parts)
        down = rows[0]['station'] not in MINI_SET[line]
        T_ = lambda r, k: sec(r[k]) if r[k] else None
        main = [(r['station'], T_(r, 'arr'), T_(r, 'dep')) for r in rows if r['station'] in IDX[line] and r['station'] not in MINI_SET[line]]
        mini = [(r['station'], T_(r, 'arr'), T_(r, 'dep')) for r in rows if r['station'] in MINI_SET[line]]
        yield dict(line=line, typ=typ, no=no, coupled=coupled, down=down, main=main, mini=mini, cj=CJ[line])


def build_mini(e):
    line, cj = e['line'], e['cj']; dwell = MINI_V[line][2]
    main = [list(x) for x in e['main']]; mini = e['mini']
    if e['down']:
        main = [x for x in main if km_of(line, x[0]) <= km_of(line, cj)]
        if not main or main[-1][0] != cj: return None
        C = main[-1]
        if C[1] is None: return None
        if C[2] is None: C[2] = C[1] + 120
        t = C[2]; prev = cj; raw = [(j, a, d, False) for j, a, d in main[:-1]] + [(cj, C[1], C[2], False)]
        for k, (j, _, _) in enumerate(mini):
            t += mini_leg(line, prev, j); a = t; t += dwell; raw.append((j, a, None if k == len(mini) - 1 else t, False)); prev = j
        return raw
    # chiều lên: mini -> cj -> Tokyo
    cm = [x for x in main if x[0] == cj]
    if not cm: return None
    C = cm[0]
    have = all(a is not None or d is not None for j, a, d in mini)
    seqm = [j for j, _, _ in mini]
    if have:
        raw = []
        for k, (j, a, d) in enumerate(mini):
            if d is None: d = a + dwell
            raw.append((j, None if k == 0 else a, d if k < len(mini) - 1 else None, False))
        t_last = mini[-1][1] if mini[-1][1] is not None else mini[-1][2]
        C_arr = t_last + mini_leg(line, seqm[-1], cj)
        if raw[-1][2] is None: raw[-1] = (raw[-1][0], raw[-1][1], t_last + dwell, False)
    else:
        C_arr = C[1]
        if C_arr is None: return None
        total = sum(mini_leg(line, a, b) for a, b in zip(seqm, seqm[1:] + [cj])) + dwell * (len(seqm) - 1)
        t = C_arr - total; raw = []
        for k, j in enumerate(seqm):
            if k: t += mini_leg(line, seqm[k - 1], j)
            a = t
            if k < len(seqm) - 1: t += dwell
            raw.append((j, None if k == 0 else a, t if k < len(seqm) - 1 else None, False))
        raw[0] = (seqm[0], None, raw[0][2] if raw[0][2] is not None else C_arr - total, False)
        if raw[-1][2] is None: raw[-1] = (raw[-1][0], raw[-1][1], raw[-1][1] + dwell, False)
    # sau cj (Shinkansen thật): giờ trong dữ liệu nếu đủ; không thì tàu Yamabiko cùng số; không thì ước tính
    after = sorted([x for x in main if km_of(line, x[0]) < km_of(line, cj)], key=lambda x: -km_of(line, x[0]))
    dep_C = C[2] if C[2] is not None and C[2] > C_arr else C_arr + 420
    out = []
    if after and all(a is not None or d is not None for j, a, d in after):
        out = [(j, a, d) for j, a, d in after]; shift = dep_C - (C[2] if C[2] is not None else dep_C)
    else:
        ref = trains['toh'].get(('Yamabiko', e['no'], 'up')) if line == 'yam' else None
        if ref:
            idx_j = {v: k for k, v in IDX['toh'].items()}; rr = {idx_j[x[0]]: x for x in ref['s']}
            if cj in rr and rr[cj][2] is not None and all(j in rr for j, a, d in after):
                shift = dep_C - rr[cj][2]; out = [(j, rr[j][1] + shift if rr[j][1] is not None else None, rr[j][2] + shift if rr[j][2] is not None else None) for j, a, d in after]
        if not out:
            t = dep_C; prev = cj
            for j, a, d in after:
                t += main_leg(line, prev, j); a_ = t; t += 60; out.append((j, a_, t)); prev = j
    raw.append((cj, C_arr, dep_C, False))
    for k, (j, a, d) in enumerate(out):
        raw.append((j, a, d if k < len(out) - 1 else None, False))
    return raw


for e in read_east_mini():
    raw = build_mini(e)
    if not raw: continue
    line, cj = e['line'], e['cj']
    seq = make_seq(line, raw)
    if not seq: continue
    d_ = 'down' if seq[-1][0] > seq[0][0] else 'up'
    solo = {'yam': 'E8', 'aki': 'E6'}[line]; ci = IDX[line][cj]
    comb = (solo + '+E5') if d_ == 'down' else ('E5+' + solo)         # mini ở phía bắc đoàn: đầu đoàn khi rời Tokyo, đuôi đoàn khi về Tokyo [theo người dùng]
    rec = dict(t=e['typ'], n=e['no'], d=d_, v=(comb if d_ == 'down' else solo) if e['coupled'] else solo, s=seq, src='E', mir=0)
    if e['coupled']: rec['cp'] = [ci, solo if d_ == 'down' else comb]        # [chỉ số ga ghép/tách, loại tàu sau khi ghép/tách]
    trains[line][(e['typ'], e['no'], d_)] = rec
# Tàu kiểm tra (923 Doctor Yellow trên Tokaido/Sanyo, E926 East i trên tuyến JR East): không có bảng giờ công bố nên giờ là ước tính [I]; chạy đêm, chỉ dừng ở vài ga.
def synth_run(line, names, t0, vavg, dwell=180):
    raw = []; t = t0; prev = None
    for k, j in enumerate(names):
        if prev is not None: t += int(abs(km_of(line, j) - km_of(line, prev)) / vavg * 3600 + 140)
        a = t
        if k < len(names) - 1 and k > 0: t += dwell
        raw.append((j, None if k == 0 else a, t if k < len(names) - 1 else None, False)); prev = j
    return raw
INSPECT = [('tsk', 'T4', 'Doctor Yellow', '9001', ['東京', '名古屋', '新大阪'], 10 * 60, 215), ('tsk', 'T4', 'Doctor Yellow', '9002', ['新大阪', '名古屋', '東京'], 23 * 3600 + 40 * 60, 215),
           ('toh', 'E926', 'East i', '9101', ['東京', '宇都宮', '仙台', '盛岡'], 20 * 60, 190), ('toh', 'E926', 'East i', '9102', ['盛岡', '仙台', '宇都宮', '東京'], 23 * 3600 + 35 * 60, 190),
           ('jts', 'E926', 'East i', '9103', ['東京', '高崎', '新潟'], 30 * 60, 190), ('hok', 'E926', 'East i', '9104', ['東京', '長野', '金沢'], 30 * 60, 190)]
for line, veh, typ, no, names, t0, vv in INSPECT:
    seq = make_seq(line, synth_run(line, names, t0, vv))
    if seq: d_ = 'down' if seq[-1][0] > seq[0][0] else 'up'; trains[line][(typ, no, d_)] = dict(t=typ, n=no, d=d_, v=veh, s=seq, src='I', mir=0)
# chiều lên cho các chuyến Sanyo-Kyushu nội tuyến chỉ có chiều xuống: tạo bản đối xứng, đánh dấu mir=1
# bỏ chuyến trùng chỗ (chuyến ◆ chỉ chạy một số ngày được xếp cùng giờ với chuyến định kỳ): cùng ga đầu và giờ khởi hành ±60 s, hoặc cùng ga cuối và giờ đến ±60 s -> giữ chuyến có số hiệu nhỏ hơn
def _no(t): return int(t['n']) if t['n'].isdigit() else 10**6
for line in trains:
    keep = {}
    for t in sorted(trains[line].values(), key=_no):
        f, l = t['s'][0], t['s'][-1]; tf = f[2] if f[2] is not None else f[1]; tl = l[1] if l[1] is not None else l[2]
        if tf is None or tl is None: keep[('x', id(t))] = t; continue
        tf //= 60; tl //= 60
        k1, k2 = (t['d'], f[0], tf), (t['d'], l[0], tl)
        if any((t['d'], f[0], tf + e) in keep for e in (-1, 0, 1)) or any((t['d'], l[0], tl + e, 'L') in keep for e in (-1, 0, 1)): continue
        keep[k1] = t; keep[(t['d'], l[0], tl, 'L')] = t
    trains[line] = {(t['t'], t['n'], t['d']): t for t in {id(v): v for v in keep.values()}.values()}
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
    out[line] = dict(LINES[line], trains=[dict(dict(t=x['t'], n=x['n'], d=x['d'], v=x['v'], s=x['s'], src=x['src'], mir=x['mir']), **({'cp': x['cp']} if 'cp' in x else {})) for x in lst])
js = '// Sinh tự động bởi tools/build_lines.py (lịch JR East 2610 ngày thường + JR West 20/10/2026; km thực từ Wikipedia JP). Chỉ dùng cá nhân.\nwindow.LINES = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(ROOT, 'prototype', 'drive', 'data-lines.js'), 'w', encoding='utf-8').write(js)
for ln, v in out.items():
    from collections import Counter
    c = Counter((t['d'], t['src']) for t in v['trains']); print(ln, len(v['trains']), dict(c), Counter(t['v'] for t in v['trains']))
print(len(js), 'byte')
