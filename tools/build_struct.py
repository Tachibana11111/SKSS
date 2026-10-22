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
    '東京:toh': '2-4-0', '東京:jts': '2-4-0', '東京:hok': '2-4-0', '上野': '2-4-0', '大宮': '3-6-0', '小山': '2-3-1', '宇都宮': '2-2-1', '那須塩原': '2-3-1', '新白河': '2-2-1', '郡山': '2-3-1', '福島': '2-4-1', '白石蔵王': '2-3-1', '仙台': '2-4-0', '古川': '2-2-1',
    'くりこま高原': '2-2-0', '一ノ関': '2-2-1', '水沢江刺': '2-2-0', '北上': '2-3-1', '新花巻': '2-2-0', '盛岡': '2-4-0', 'いわて沼宮内': '2-2-0', '二戸': '2-2-0', '八戸': '2-4-0', '七戸十和田': '2-2-0', '新青森': '2-4-0',
    # Hokkaido (nối dài tuyến toh): 2面2線 + 通過線 một bên ở Okutsugaru-Imabetsu và Kikonai [N, trang Wikipedia JP; gán ga theo thứ tự trong bài nên có thể lệch [?]]
    '奥津軽いまべつ': '2-2-1', '木古内': '2-2-1', '新函館北斗': '2-2-0',
    # Joetsu [N: 配線 từng ga theo Wikipedia JP 上越新幹線]
    '熊谷': '2-3-1', '本庄早稲田': '2-2-1', '高崎': '2-4-1', '上毛高原': '2-2-1', '越後湯沢': '2-4-1', '浦佐': '2-2-1', '長岡': '2-2-1', '燕三条': '2-3-1', '新潟': '3-4-0',
    # Hokuriku [N: Wikipedia JP 北陸新幹線; Fukui là ga duy nhất 1面2線]
    '安中榛名': '2-2-0', '軽井沢': '2-4-0', '佐久平': '2-2-0', '上田': '2-2-0', '長野': '2-4-0', '飯山': '2-2-0', '上越妙高': '2-4-0', '糸魚川': '2-2-0', '黒部宇奈月温泉': '2-2-0', '富山': '2-4-0', '新高岡': '2-2-0',
    '金沢': '2-4-0', '小松': '2-2-0', '加賀温泉': '2-2-1', '芦原温泉': '2-2-0', '福井': '1-2-0', '越前たけふ': '2-2-1', '敦賀': '2-4-0',
    # Nishi-Kyushu [N: 武雄温泉 2面2線; 嬉野温泉/新大村/諫早 2面2線; 長崎 2面4線; không có đường tránh]
    '武雄温泉': '2-2-0', '嬉野温泉': '2-2-0', '新大村': '2-2-0', '諫早': '2-2-0', '長崎': '2-4-0',
    # mini-Shinkansen (Yamagata / Akita): ga đường sắt thường cũ; có đường tránh để tàu đối hướng gặp nhau ở ga (đường đơn) [I]
    '米沢': '2-3-0', '高畠': '1-2-0', '赤湯': '2-3-0', 'かみのやま温泉': '2-3-0', '山形': '2-4-0', '天童': '2-3-0', 'さくらんぼ東根': '1-2-0', '村山': '2-3-0', '大石田': '1-2-0', '新庄': '2-3-0',
    '雫石': '1-2-0', '田沢湖': '2-3-0', '角館': '2-3-0', '大曲': '2-3-0', '秋田': '2-4-0'}

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
 '二戸': (40.25986, 141.28563), '八戸': (40.50944, 141.43083), '七戸十和田': (40.71986, 141.15403), '新青森': (40.8275, 140.69347),
 '奥津軽いまべつ': (41.145, 140.51556), '木古内': (41.67758, 140.43395), '新函館北斗': (41.9043, 140.6485),
 '熊谷': (36.13969, 139.38992), '本庄早稲田': (36.2117, 139.1655), '高崎': (36.32217, 139.01283), '上毛高原': (36.6933, 138.9856), '越後湯沢': (36.93592, 138.80964), '浦佐': (37.16722, 138.92275),
 '長岡': (37.44732, 138.8542), '燕三条': (37.64903, 138.93936), '新潟': (37.91203, 139.06189),
 '安中榛名': (36.36242, 138.8496), '軽井沢': (36.34256, 138.63521), '佐久平': (36.27796, 138.46424), '上田': (36.39661, 138.24967), '長野': (36.64311, 138.18883), '飯山': (36.8527, 138.3597), '上越妙高': (37.06, 138.2506),
 '糸魚川': (37.0436, 137.8631), '黒部宇奈月温泉': (36.8978, 137.4247), '富山': (36.70122, 137.21321), '新高岡': (36.7366, 136.9922), '金沢': (36.57828, 136.64775), '小松': (36.4043, 136.4465),
 '加賀温泉': (36.3078, 136.3503), '芦原温泉': (36.21453, 136.23504), '福井': (36.0618, 136.2233), '越前たけふ': (35.9027, 136.1798), '敦賀': (35.64472, 136.07667),
 '武雄温泉': (33.19673, 130.02351), '嬉野温泉': (33.10666, 129.99994), '新大村': (32.93276, 129.95706), '諫早': (32.85184, 130.04147), '長崎': (32.75275, 129.86906),
 '米沢': (37.90964, 140.12821), '高畠': (38.0017, 140.1925), '赤湯': (38.04722, 140.14909), 'かみのやま温泉': (38.15224, 140.27865), '山形': (38.24871, 140.32746), '天童': (38.35997, 140.3695),
 'さくらんぼ東根': (38.42856, 140.38088), '村山': (38.47708, 140.38631), '大石田': (38.59569, 140.37529), '新庄': (38.76268, 140.30606),
 '雫石': (39.68936, 140.97486), '田沢湖': (39.70028, 140.72241), '角館': (39.59172, 140.571), '大曲': (39.4642, 140.4767), '秋田': (39.71684, 140.12975)}   # [K]: 高畠, 大曲   # [K]: 新富士, 上野, 古川, 本庄早稲田, 高崎, 上毛高原, 長野, 飯山, 上越妙高, 糸魚川, 黒部宇奈月温泉, 新高岡, 小松, 加賀温泉, 福井, 越前たけふ, 新函館北斗

# tỷ lệ kết cấu theo đoạn: (km0, km1, nền đất, cầu, cầu cạn, hầm) [%]
SHARES = {
    'tsk': [(0, 515.4, 53, 11, 22, 13), (515.4, 1069.1, 12, 9, 28, 50), (1069.1, 1199.1, 5, 14, 51, 30), (1199.1, 1325.9, 12, 7, 12, 69)],
    'toh': [(0, 496.5, 5, 16, 56, 23), (496.5, 593.1, 14, 3, 9, 73), (593.1, 674.9, 15, 5, 18, 62), (674.9, 823.7, 7, 4, 24, 65)],                          # Hokkaido: 7/4/24/65 [N]
    'jts': [(30.3, 105.0, 5, 12, 62, 21), (105.0, 333.9, 1, 8, 34, 57)],                                                                                      # cả tuyến: 1/11/49/39 [N]; chia đoạn là [I]
    'hok': [(105.0, 222.4, 15, 9, 25, 51), (222.4, 450.5, 2, 14, 40, 44), (450.5, 575.6, 2, 14, 51, 33)],
    'nks': [(0, 66.0, 8, 8, 34, 50)],
    'yam': [(255.1, 403.7, 62, 10, 8, 20)], 'aki': [(496.5, 623.8, 58, 10, 4, 28)]}                                                           # mini-Shinkansen: chủ yếu nền đất của đường sắt thường [I]                                                                                                           # chưa có tỷ lệ chính thức: [I] từ các hầm đã biết (Tawarazaka 5,7; Shin-Nagasaki 7,5; Kuyama 5,0; Kiba 2,9 km)                                                      # [N] theo ba đoạn Takasaki–Nagano / Nagano–Kanazawa / Kanazawa–Tsuruga
# hầm lớn đã có: Tanna, Rokko, Iwate-Ichinohe, Hakkoda, Seikan (đáy biển 23,3 km; hầm 53,85 km [N], vị trí theo km thực [I]); Joetsu: Nakayama 14,9 km, Oshimizu 22,2 km [K vị trí]; Hokuriku: Iiyama 22,2 km, Kubiki 11 km [K vị trí]
FIXED_T = {'tsk': [(97.5, 105.5), (549.9, 566.1)], 'toh': [(533, 559), (641, 667), (715.9, 769.8)], 'jts': [(113.0, 127.9), (164.0, 186.2)], 'hok': [(254.0, 276.2), (284.0, 295.0)], 'nks': [(1.2, 6.9), (14.5, 17.4), (35.5, 40.5), (50.0, 57.5)],
           'yam': [(269.0, 271.8), (275.6, 278.4), (281.5, 284.0), (286.6, 289.4)], 'aki': [(519.0, 524.0), (527.5, 533.5)]}                               # Itaya (Yamagata) và Sengan-toge (Akita): hầm ngắn trên núi [I vị trí]
FORCE = {'tsk': [(0, 8, 'v')], 'toh': [(0, 4.6, 't'), (4.6, 31, 'v')],                                                                                   # Tokyo-Shinagawa trên cao; Tokyo-Ueno-(cửa hầm ~1 km phía bắc Ueno) ngầm, sau đó trên cao tới Omiya [I vị trí cửa hầm]
         'jts': [(0, 4.6, 't'), (4.6, 30.3, 'v')], 'hok': [], 'nks': [], 'yam': [], 'aki': []}
NO_TUNNEL = {'tsk': [(515.4 + 54.8, 515.4 + 85.9)], 'toh': [(31.3, 109)], 'jts': [(30.3, 105.0)], 'hok': [], 'nks': [], 'yam': [(305.0, 403.7)], 'aki': [(540.0, 623.8)]}                                              # Nishi-Akashi-Himeji, Omiya-Utsunomiya và Omiya-Takasaki không có hầm [N cho hai đoạn đầu; Omiya-Takasaki là I]
SEED = {'tsk': (20261021, 777), 'toh': (20261022, 778), 'jts': (20261023, 779), 'hok': (20261024, 780), 'nks': (20261025, 781), 'yam': (20261026, 782), 'aki': (20261027, 783)}
# đoạn dùng chung đường với tuyến khác: sao chép kết cấu/đường cong của tuyến cha cho km < ngưỡng (để Tokyo–Omiya... giống nhau ở mọi tuyến)
SHARE_FROM = {'jts': ('toh', 30.3), 'hok': ('jts', 105.0), 'yam': ('toh', 255.1), 'aki': ('toh', 496.5)}
BASE_CURVE = {'jts': 4000, 'hok': 4000, 'nks': 4000}
JUNC = {'yam': (257.1, 1.2, 1500, -1), 'aki': (498.5, 1.2, 1500, -1), 'jts': (32.3, 1.5, 4000, -1), 'hok': (107.0, 1.5, 4000, -1)}      # (km, chiều dài km, R m, dấu: -1 = rẽ trái khi đi xuống)
MINI = {'yam': 255.1, 'aki': 496.5}                                    # km bắt đầu phần đường sắt thường (mini-Shinkansen)
SINGLE = {'yam': [(255.1 + 7.0, 311.2), (313.5, 322.0), (342.2, 392.0), (400.0, 403.7)], 'aki': [(498.5, 586.0), (600.0, 623.8)]}     # đường đơn (Akita: đoạn Jingūji–Mineyoshikawa là đường đôi [N tên đoạn], km 586–600 là I); đoạn đôi: Fukushima–Sekine, Akayu–Kita-Akayu, Uzen-Nakayama–Yamagata, Ashizawa–Funagata [N tên đoạn, km là I]
XING = {'yam': (41, 12), 'aki': (45, 0)}                                # số đường ngang: (Yamagata–Shinjo [N: 41 sau năm 1999]; phần Fukushima–Yamagata [I]) và Akita [I]
CURVE_PREFIX = {'jts': (0, 30.3), 'hok': (0, 105.0)}


DONE = {}
def share_struct(lid):
    # phần đường dùng chung với tuyến cha: sao chép đúng kết cấu của tuyến cha cho km < ngưỡng
    if lid not in SHARE_FROM: return []
    par, k = SHARE_FROM[lid]; out = []
    for a, b, kind in DONE[par]['struct']:
        if a >= k: break
        out.append([a, min(b, k), kind])
    return out


def gen_struct(lid, ln):
    rnd = random.Random(SEED[lid][0])
    stk = [s['km'] for s in ln['stations']]
    def tunnel_ok(k0, k1):
        if any(k1 > a and k0 < b for a, b in NO_TUNNEL[lid]): return False
        return not any(k0 - 0.8 < k < k1 + 0.8 for k in stk)          # ga không nằm trong hầm; chừa 0,8 km hai đầu
    segs = share_struct(lid)
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
    rnd = random.Random(SEED[lid][1]); km = 2.0; out = []; kmEnd = ln['kmEnd']
    if lid in SHARE_FROM:                                                  # đoạn dùng chung: sao chép đường cong của tuyến cha
        par, kp = SHARE_FROM[lid]; out = [c[:] for c in DONE[par]['curves'] if c[1] <= kp]; km = out[-1][1] + 0.0 if out else 2.0
        if lid in JUNC: jk, jl, jr, jsg = JUNC[lid]; out.append([jk, round(jk + jl, 2), jr, jsg]); km = jk + jl         # đường mini rẽ khỏi trục Tohoku ngay sau ga ghép/tách: cong trái ~46° [I]
    def base(k):
        if lid == 'tsk':
            if k < 515.4: return 2500 if (k < 40 or 167 < k < 215 or 300 < k < 380 or k > 440) else 3000   # Tokaido: 2.500 m (Tokyo, đông Shizuoka, Aichi, Kyoto, Osaka) / 3.000 m (nơi khác) [N, chia theo km là I]
            return rnd.choice([3500, 3500, 3500, 4000]) if k < 1069.1 else 4000                              # Sanyo: rải rác 3.500 m; Kyushu 4.000 m [N]
        if lid in MINI:                                                                                    # đường sắt thường: cong nhỏ, nhiều; Itaya (km 268–292) và Sengan-toge (km 515–540) cong gắt [I phân bố]
            hard = (268 < k < 292) if lid == 'yam' else (515 < k < 540)
            return rnd.choice([250, 300, 300, 400, 400, 500, 600]) if hard else rnd.choice([400, 500, 600, 800, 800, 1000, 1200, 1500, 2000, 2500, 3000])
        return BASE_CURVE.get(lid, 4000)
    sp = (0.5, 2.0, 0.4, 1.2) if lid in MINI else (1.2, 7.0, 0.8, 2.4)
    while km < kmEnd - 3:
        km += sp[0] + rnd.random() * sp[1]
        if km > kmEnd - 0.3: break
        L = sp[2] + rnd.random() * sp[3]; R = base(km)
        if lid == 'tsk' and 14 < km < 21 and not any(c[2] == 600 for c in out): R = 600                       # cong gấp nhất Tokaido ~600 m giữa cầu Tamagawa và Musashi-Kosugi [N]
        elif lid == 'tsk' and km < 35 and rnd.random() < 0.4: R = rnd.choice([1000, 1500])                    # đô thị có cong < 2.500 m [N]
        elif lid == 'toh' and km < 31 and rnd.random() < 0.7: R = rnd.choice([400, 600, 1000, 2000])         # Tokyo-Omiya 400-2.000 m [N]
        elif lid == 'tsk' and km > 1069.1 and rnd.random() < 0.08: R = rnd.choice([500, 1000, 1500])         # Kyushu tối thiểu 500 m [N]
        elif lid == 'tsk' and 515.4 < km < 560 and rnd.random() < 0.3: R = rnd.choice([1000, 2000, 3000])    # Sanyo tối thiểu 1.000 m [N]
        elif lid == 'jts' and 113 < km < 127 and not any(c[2] == 1500 for c in out): R = 1500                  # trong hầm Nakayama có cong R=1.500 m, hạn chế 160 km/h [N]
        elif lid == 'hok' and 515 < km < 526 and not any(c[2] == 600 for c in out): R = 600                   # cong nhỏ nhất Hokuriku 600 m, phía bắc ga Fukui [N, vị trí km là I]
        out.append([round(km, 2), round(min(km + L, kmEnd), 2), R, 1 if rnd.random() < 0.5 else -1]); km += L
    return out


def gen_single_xing(lid, ln):
    # đường đơn và đường ngang (chỉ có ở phần đường sắt thường của mini-Shinkansen); đường ngang không nằm trong hầm hoặc sát ga
    if lid not in MINI: return [], []
    rnd = random.Random(SEED[lid][1] + 5); k0 = JUNC[lid][0];       # đường ngang chỉ có SAU ngã rẽ khỏi Tohoku (đoạn Tohoku là Shinkansen thật: tuyệt đối không có)
    stk = [s['km'] for s in ln['stations']]; out = []
    for key, (a, b) in (('x1', (342.2, 403.7)), ('x2', (k0, 342.2))) if lid == 'yam' else (('x1', (k0, ln['kmEnd'])),):
        n = XING[lid][0] if key == 'x1' else XING[lid][1]; tries = 0; part = []
        while len(part) < n and tries < 5000:
            tries += 1; k = round(a + rnd.random() * (b - a), 2)
            if any(abs(k - s) < 1.0 for s in stk) or any(abs(k - p) < 0.35 for p in out + part): continue
            if any(g[2] != 'g' and g[0] - 0.4 < k < g[1] + 0.4 for g in ln['struct']): continue          # đường ngang chỉ ở đoạn nền đất
            part.append(k)
        out += part
    return [list(x) for x in SINGLE[lid]], sorted(out)


def apply(LINES):
    for lid, ln in LINES.items():
        for st in ln['stations']:
            code = LAY.get(st['jp'] + ':' + lid) or LAY.get(st['jp']) or LAY[st['jp'] + ':toh']
            st['lay'] = code; st['loop'] = int(code.endswith('-1'))     # có đường thông qua => ga tránh được
            if st['jp'] in ('盛岡', '福島'): st['side'] = 1                  # ga ghép/tách đoàn: tàu dừng ở đường TRÁNH (không phải đường thông qua)
            st['lat'], st['lon'] = COORD[st['jp']]
        ln['struct'] = gen_struct(lid, ln); ln['curves'] = gen_curves(lid, ln); DONE[lid] = ln
        ln['single'], ln['xings'] = gen_single_xing(lid, ln)
        tl = sum(b - a for a, b, k in ln['struct'] if k == 't')
        print(lid, 'hầm', round(tl / ln['kmEnd'] * 100), '%', 'đoạn', len(ln['struct']), 'cong', len(ln['curves']), 'ga thông qua', sum(s['loop'] for s in ln['stations']))
