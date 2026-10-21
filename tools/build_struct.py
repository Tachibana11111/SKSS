# Bố trí ga, kết cấu tuyến (nền đất/cầu cạn/cầu/hầm) và đường cong cho game. Được build_lines.py nạp (exec) sau khi có LINES.
# Nguồn [N]: Wikipedia tiếng Nhật 東海道/山陽/東北/九州新幹線 (tra 21/10/2026): 配線 từng ga, 構造種別延長割合, 曲線半径. Vị trí từng đoạn kết cấu/đường cong là [I] (không có nguồn công khai theo km), sinh ngẫu nhiên cố định.
import random

# mã 'số sân-số đường-thông qua'. Kiểu sân (đảo/hai bên) chỉ [N] ở ga có ghi (2面4線 đảo, 1面2線 đảo, Shin-Kobe hai bên); còn lại là [I]. Ga Kyushu/Tohoku ghép tên theo thứ tự trong bài nên có thể lệch [?].
LAY = {
    '東京:tsk': '3-6-0', '品川': '2-4-0', '新横浜': '2-4-0', '小田原': '2-2-1', '熱海': '2-2-0', '三島': '1-2-1', '新富士': '2-2-1', '静岡': '2-2-1', '掛川': '2-2-1', '浜松': '2-2-1', '豊橋': '2-3-1', '三河安城': '2-2-1',
    '名古屋': '2-4-0', '岐阜羽島': '2-4-1', '米原': '2-3-1', '京都': '2-4-0', '新大阪': '5-8-0',
    '新神戸': '2-2-0', '西明石': '2-2-1', '姫路': '2-3-1', '相生': '2-2-1', '岡山': '2-4-0', '新倉敷': '2-2-1', '福山': '2-2-1', '新尾道': '2-2-1', '三原': '2-2-1', '東広島': '2-2-1', '広島': '2-4-0', '新岩国': '2-3-1',
    '徳山': '2-2-1', '新山口': '2-2-1', '厚狭': '2-2-1', '新下関': '2-3-1', '小倉': '2-4-0', '博多': '3-6-0',
    '新鳥栖': '2-4-0', '久留米': '2-2-0', '筑後船小屋': '2-3-0', '新大牟田': '2-2-0', '新玉名': '2-2-0', '熊本': '2-4-0', '新八代': '2-2-0', '新水俣': '2-3-0', '出水': '2-2-0', '川内': '2-2-0', '鹿児島中央': '2-4-0',
    '東京:toh': '2-4-0', '上野': '2-4-0', '大宮': '3-6-0', '小山': '2-3-1', '宇都宮': '2-2-1', '那須塩原': '2-3-1', '新白河': '2-2-1', '郡山': '2-3-1', '福島': '2-4-1', '白石蔵王': '2-3-1', '仙台': '2-4-0', '古川': '2-2-1',
    'くりこま高原': '2-2-0', '一ノ関': '2-2-1', '水沢江刺': '2-2-0', '北上': '2-3-1', '新花巻': '2-2-0', '盛岡': '2-4-0', 'いわて沼宮内': '2-2-0', '二戸': '2-2-0', '八戸': '2-4-0', '七戸十和田': '2-2-0', '新青森': '2-4-0'}

# Toạ độ ga (vĩ độ, kinh độ) để tính hướng địa lý của tuyến cho la bàn ở bản đồ nhỏ. [N] từ trường coordinates của Wikipedia tiếng Nhật (tra 22/10/2026 qua API công khai, 3 yêu cầu); các ga đánh dấu [K] là xấp xỉ từ kiến thức nền (Wikipedia không có toạ độ cho trang đó).
COORD = {
 '東京': (35.68111, 139.76667), '品川': (35.62822, 139.73869), '新横浜': (35.50681, 139.61694), '小田原': (35.25583, 139.15556), '熱海': (35.10361, 139.07744), '三島': (35.12634, 138.91116),
 '新富士': (35.1383, 138.6642), '静岡': (34.97161, 138.38856), '掛川': (34.76974, 138.01484), '浜松': (34.70343, 137.7344), '豊橋': (34.76281, 137.38165), '三河安城': (34.96897, 137.06066),
 '名古屋': (35.17069, 136.88164), '岐阜羽島': (35.31583, 136.68556), '米原': (35.31472, 136.29), '京都': (34.98546, 135.75776), '新大阪': (34.73348, 135.50011),
 '新神戸': (34.70672, 135.19622), '西明石': (34.66685, 134.96054), '姫路': (34.82675, 134.69092), '相生': (34.81807, 134.47394), '岡山': (34.66637, 133.91859), '新倉敷': (34.565, 133.67867),
 '福山': (34.48922, 133.36155), '新尾道': (34.43008, 133.19033), '三原': (34.40067, 133.08319), '東広島': (34.38936, 132.75977), '広島': (34.39775, 132.47547), '新岩国': (34.16503, 132.1498),
 '徳山': (34.05, 131.8), '新山口': (34.09306, 131.39716), '厚狭': (34.05328, 131.1598), '新下関': (34.00569, 130.9488), '小倉': (33.88675, 130.88267), '博多': (33.59, 130.42061),
 '新鳥栖': (33.37019, 130.49119), '久留米': (33.32039, 130.50131), '筑後船小屋': (33.17792, 130.49239), '新大牟田': (33.07125, 130.48875), '新玉名': (32.9425, 130.57356), '熊本': (32.79, 130.68889),
 '新八代': (32.51783, 130.63492), '新水俣': (32.211, 130.42933), '出水': (32.08959, 130.35838), '川内': (31.81367, 130.31242), '鹿児島中央': (31.58367, 130.54173),
 '上野': (35.7138, 139.7774), '大宮': (35.90628, 139.62384), '小山': (36.31361, 139.80654), '宇都宮': (36.5586, 139.8983), '那須塩原': (36.93185, 140.02063), '新白河': (37.12278, 140.18837),
 '郡山': (37.39778, 140.38833), '福島': (37.75409, 140.4603), '白石蔵王': (37.99554, 140.63309), '仙台': (38.26028, 140.88222), '古川': (38.5775, 140.9558), 'くりこま高原': (38.74914, 141.0718),
 '一ノ関': (38.92605, 141.13923), '水沢江刺': (39.14533, 141.18873), '北上': (39.28183, 141.12223), '新花巻': (39.40733, 141.17399), '盛岡': (39.70167, 141.13636), 'いわて沼宮内': (39.96083, 141.21765),
 '二戸': (40.25986, 141.28563), '八戸': (40.50944, 141.43083), '七戸十和田': (40.71986, 141.15403), '新青森': (40.8275, 140.69347)}   # [K]: 新富士, 上野, 古川

# tỷ lệ kết cấu theo đoạn: (km0, km1, nền đất, cầu, cầu cạn, hầm) [%]
SHARES = {
    'tsk': [(0, 515.4, 53, 11, 22, 13), (515.4, 1069.1, 12, 9, 28, 50), (1069.1, 1199.1, 5, 14, 51, 30), (1199.1, 1325.9, 12, 7, 12, 69)],
    'toh': [(0, 496.5, 5, 16, 56, 23), (496.5, 593.1, 14, 3, 9, 73), (593.1, 674.9, 15, 5, 18, 62)]}
FIXED_T = {'tsk': [(97.5, 105.5), (549.9, 566.1)], 'toh': [(533, 559), (641, 667)]}        # hầm lớn đã có: Tanna, Rokko, Iwate-Ichinohe, Hakkoda
FORCE = {'tsk': [(0, 8, 'v')], 'toh': [(0, 4.6, 't'), (4.6, 31, 'v')]}                       # Tokyo-Shinagawa trên cao; Tokyo-Ueno-(cửa hầm ~1 km phía bắc Ueno, gần Nippori) ngầm, sau đó trên cao tới Omiya [I vị trí cửa hầm]
NO_TUNNEL = {'tsk': [(515.4 + 54.8, 515.4 + 85.9)], 'toh': [(31.3, 109)]}                    # Nishi-Akashi-Himeji và Omiya-Utsunomiya không có hầm [N]


def gen_struct(lid, ln):
    rnd = random.Random(20261021 + (1 if lid == 'toh' else 0))
    stk = [s['km'] for s in ln['stations']]
    def tunnel_ok(k0, k1):
        if any(k1 > a and k0 < b for a, b in NO_TUNNEL[lid]): return False
        return not any(k0 - 0.8 < k < k1 + 0.8 for k in stk)          # ga không nằm trong hầm; chừa 0,8 km hai đầu
    segs = []
    for a, b, g, br, v, t in SHARES[lid]:
        want = {'g': g, 'b': br, 'v': v, 't': t}
        have = {k: 0.0 for k in want}
        fixed = sorted((x, y) for x, y in FIXED_T[lid] if x >= a and y <= b)
        for x, y in fixed: have['t'] += y - x
        km = a
        while km < b - 0.05:
            if fixed and abs(fixed[0][0] - km) < 1e-6:
                segs.append([km, fixed[0][1], 't']); km = fixed[0][1]; fixed.pop(0); continue
            lim = min(b, fixed[0][0] if fixed else b)
            forced = next((fk for fa, fb, fk in FORCE[lid] if fa <= km < fb), None)
            if forced:
                end = min(lim, next(fb for fa, fb, fk in FORCE[lid] if fa <= km < fb)); segs.append([round(km, 3), round(end, 3), forced]); have[forced] += end - km; km = end; continue
            prog = (km - a + 5) / (b - a + 5)
            wts = {k: max(0.03, want[k] * prog - have[k] * 100.0 / (b - a) + 0.6) for k in want}
            kind = rnd.choices(list(wts), [wts[k] for k in wts])[0]
            ln_ = {'g': 1 + rnd.random() * 6, 'b': 0.3 + rnd.random() * 1.4, 'v': 0.6 + rnd.random() * 5, 't': 1 + rnd.random() * rnd.choice([2, 4, 9])}[kind]
            ln_ = min(ln_, lim - km)
            if kind == 't' and not tunnel_ok(km, km + ln_): kind = 'v' if rnd.random() < 0.55 else 'g'
            have[kind] += ln_; segs.append([round(km, 3), round(km + ln_, 3), kind]); km += ln_
    out = []
    for s in segs:
        if out and out[-1][2] == s[2] and abs(out[-1][1] - s[0]) < 1e-3: out[-1][1] = s[1]
        else: out.append(s)
    return out


def gen_curves(lid, ln):
    rnd = random.Random(777 + (1 if lid == 'toh' else 0)); km = 2.0; out = []; kmEnd = ln['kmEnd']
    def base(k):
        if lid == 'tsk':
            if k < 515.4: return 2500 if (k < 40 or 167 < k < 215 or 300 < k < 380 or k > 440) else 3000   # Tokaido: 2.500 m (Tokyo, đông Shizuoka, Aichi, Kyoto, Osaka) / 3.000 m (nơi khác) [N, chia theo km là I]
            return rnd.choice([3500, 3500, 3500, 4000]) if k < 1069.1 else 4000                              # Sanyo: rải rác 3.500 m; Kyushu 4.000 m [N]
        return 4000
    while km < kmEnd - 3:
        km += 1.2 + rnd.random() * 7.0
        L = 0.8 + rnd.random() * 2.4; R = base(km)
        if lid == 'tsk' and 14 < km < 21 and not any(c[2] == 600 for c in out): R = 600                       # cong gấp nhất Tokaido ~600 m giữa cầu Tamagawa và Musashi-Kosugi [N]
        elif lid == 'tsk' and km < 35 and rnd.random() < 0.4: R = rnd.choice([1000, 1500])                    # đô thị có cong < 2.500 m [N]
        elif lid == 'toh' and km < 31 and rnd.random() < 0.7: R = rnd.choice([400, 600, 1000, 2000])         # Tokyo-Omiya 400-2.000 m [N]
        elif lid == 'tsk' and km > 1069.1 and rnd.random() < 0.08: R = rnd.choice([500, 1000, 1500])         # Kyushu tối thiểu 500 m [N]
        elif lid == 'tsk' and 515.4 < km < 560 and rnd.random() < 0.3: R = rnd.choice([1000, 2000, 3000])    # Sanyo tối thiểu 1.000 m [N]
        out.append([round(km, 2), round(min(km + L, kmEnd), 2), R, 1 if rnd.random() < 0.5 else -1]); km += L
    return out


def apply(LINES):
    for lid, ln in LINES.items():
        for st in ln['stations']:
            code = LAY.get(st['jp'] + ':' + lid) or LAY[st['jp']]
            st['lay'] = code; st['loop'] = int(code.endswith('-1'))     # có đường thông qua => ga tránh được
            st['lat'], st['lon'] = COORD[st['jp']]
        ln['struct'] = gen_struct(lid, ln); ln['curves'] = gen_curves(lid, ln)
        tl = sum(b - a for a, b, k in ln['struct'] if k == 't')
        print(lid, 'hầm', round(tl / ln['kmEnd'] * 100), '%', 'đoạn', len(ln['struct']), 'cong', len(ln['curves']), 'ga thông qua', sum(s['loop'] for s in ln['stations']))
