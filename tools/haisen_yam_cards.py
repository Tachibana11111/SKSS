# -*- coding: utf-8 -*-
# Thẻ từng ga tuyến Yamagata (Sasakino → Shinjo, 34 ga + tín hiệu trường Kita-Akayu Jct.). Làm lại 28/11/2026: mỗi ga một thẻ độc lập, đo từ chính sơ đồ.
#   A. sơ đồ gốc 配線略図.net (CC BY 4.0): các SVG gốc nhúng nguyên byte, chỉ cắt khung quanh ga (viewBox) — không sửa nội dung;
#   B. DỰ KIẾN: ray 1435 mm đã lọc khối depot / đầu cụt + sân ga (cả sân ga vẽ bằng vạch mảnh), ghi (đỏ), kèm số đo: dài sân ga, khoảng cách từ đầu sân ga tới từng ghi (1 đơn vị sơ đồ = 8,15 m [I]),
#      và đoạn đơn / đôi hai bên ga; Shinjo dựng riêng (một đường vào, ghi thành 2 đường, giảm chấn cuối ga);
#   C. TRONG GAME: hình học thật (docs/data/haisen/yam_game.json) hoặc "chưa có".
# Chạy: python -X utf8 tools/haisen_yam_cards.py -> docs/data/haisen/yam_cards.html. KHÔNG sửa game.
import sys, os, json, html, re, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import haisen_yam_aki as H
import haisen_yam_chart as C

# Kita-Akayu Jct. (北赤湯信号場): tín hiệu trường sau Akayu, đoạn đường đôi từ Akayu kéo dài tới đây (yêu cầu 28/11/2026); km 61,6 từ Fukushima và toạ độ 38.07806, 140.18639 theo ja.wikipedia 北赤湯信号場 [N] (https://ja.wikipedia.org/wiki/北赤湯信号場); nhãn trong sơ đồ là 北赤湯（信）
if not any(q['jp'] == '北赤湯（信）' for q in C.ST):
    _i = [q['jp'] for q in C.ST].index('赤湯') + 1
    C.ST.insert(_i, dict(order=C.ST[_i - 1]['order'] + 0.5, jp='北赤湯（信）', hira='きたあかゆ（しんごうじょう）', en='Kita-Akayu Jct.', kmFromFukushima=61.6, lat=38.07806, lon=140.18639, inGame=False, tsubasaStop=False))

M = C.M_U                      # mét / đơn vị sơ đồ [I]
HALF = 160                     # nửa bề rộng khung quanh mỗi ga (đơn vị sơ đồ)

def split_segs(segs):
    pts = [(a, b) for a, b, c, d in segs] + [(c, d) for a, b, c, d in segs]
    out = []
    for a, b, c, d in segs:
        L2 = (c - a) ** 2 + (d - b) ** 2; cuts = [0.0, 1.0]
        if L2 > 1:
            for (px, py) in pts:
                t = ((px - a) * (c - a) + (py - b) * (d - b)) / L2
                if 0.002 < t < 0.998 and abs(a + t * (c - a) - px) < 1.6 and abs(b + t * (d - b) - py) < 1.6: cuts.append(t)
        cuts = sorted(set(round(t, 4) for t in cuts))
        for t0, t1 in zip(cuts, cuts[1:]): out.append((a + t0 * (c - a), b + t0 * (d - b), a + t1 * (c - a), b + t1 * (d - b)))
    return out

def prune(segs, x0, x1, joinx):
    reps, memo = [], {}
    def key(x, y):          # gộp các điểm cách nhau < 0,9 đơn vị (đầu ghi lệch 0,3 so với ray chính do làm tròn khi vẽ)
        k0 = (round(x, 2), round(y, 2))
        if k0 not in memo:
            for i, (rx, ry) in enumerate(reps):
                if abs(rx - x) < 1.6 and abs(ry - y) < 1.6: memo[k0] = i; break
            else: reps.append((x, y)); memo[k0] = len(reps) - 1
        return memo[k0]
    segs = list(segs)
    while True:
        deg = {}
        for a, b, c, d in segs:
            for k_ in (key(a, b), key(c, d)): deg[k_] = deg.get(k_, 0) + 1
        keep = []; cut_ = 0
        for sg_ in segs:
            a, b, c, d = sg_
            if any(deg[key(x, y)] == 1 and x0 + 60 < x < x1 - 8 and all(abs(x - jx) > 8 for jx in joinx) for x, y in ((a, b), (c, d))): cut_ += 1
            else: keep.append(sg_)
        segs = keep
        if not cut_: return segs

def game_svg(g, w=300, h=190):
    zlo, zhi = -1500, 1500; xm = lambda z: 20 + (z - zlo) / (zhi - zlo) * 260
    xs = [t['x'] for t in g['tracks']]; ky = min(8.0, 130.0 / max(1, (max(xs) - min(xs)) + 6)); yc = 95 + (max(xs) + min(xs)) / 2 * ky
    out = ['<svg viewBox="0 0 %d %d" width="%d" height="%d" class="p">' % (w, h, w, h)]
    for p in g['plats']: out.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#e8eef6" stroke="#44607f"/>' % (xm(-420), yc - p['xb'] * ky, xm(20) - xm(-420), (p['xb'] - p['xa']) * ky))
    for t in g['tracks']:
        pts = ' '.join('%.1f,%.1f' % (xm(z), yc - C.track_x(t, z) * ky) for z in range(zlo, zhi + 1, 30))
        out.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="2.4"/>' % (pts, '#0b5cad' if t['main'] else '#3b7dc4'))
    main = [t for t in g['tracks'] if t['main']]
    for xv in (g['xo'] if g['xo'] is not None else [['b', 'd'], ['a', 'd']]):
        side, kind = xv[0], xv[1]; gap = xv[2] if len(xv) > 2 else None; ext = xv[3] if len(xv) > 3 else 0
        zz = (-(420 + gap) - 150 if side == 'b' else 20 + gap) if gap is not None else (-(1300 + (ext or 0)) if side == 'b' else 720 + (ext or 0))
        if len(main) < 2 or not (zlo <= zz <= zhi - 150): continue
        ya, yb = yc - main[0]['x'] * ky, yc - main[1]['x'] * ky
        if kind in ('d', 's'): out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#c0392b" stroke-width="1.6"/>' % (xm(zz), yb, xm(zz + 150), ya))
        if kind in ('d', 'r'): out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#c0392b" stroke-width="1.6"/>' % (xm(zz), ya, xm(zz + 150), yb))
    out.append('<text x="150" y="%d" font-size="9" fill="#777" text-anchor="middle">hình học game (co ngang; đỏ = ghi chéo)</text></svg>' % (h - 4)); return ''.join(out)

def main():
    figs_i, pos_i = H.place(C.FILES, C.ROOT); pos_i = C.adjust_pos(figs_i, pos_i, C.FILES); cen_i = C.label_centres(figs_i, pos_i)      # SVG gốc (khung A)
    figs, pos = C.place_fixed(C.FILES, C.ROOT); cen = C.label_centres(figs, pos)      # hình học đã phóng lại hình Yamagata (khung B)
    RAW_I = [l for f, p in zip(figs_i, pos_i) for l in C.blue_lines(f, p[0], p[1])]
    allx = [l[k] + p[0] for f, p in zip(figs, pos) for l in f['L'] for k in ('x1', 'x2')]
    x0, x1 = min(allx) - 30, max(allx) + 40
    RAW = [l for f, p in zip(figs, pos) for l in C.blue_lines(f, p[0], p[1])]
    SEGS = split_segs(RAW)
    # đầu cụt ở mép hình đầu/cuối là do cắt hình (không phải depot): được giữ; mảnh vụn < 4 đơn vị bị bỏ
    KEPT = [sg for sg in prune(SEGS, x0, x1, [p[0] for p in pos] + [pos[-1][0] + 724.2]) if (sg[0] - sg[2]) ** 2 + (sg[1] - sg[3]) ** 2 > 16]
    # Yamagata: bỏ cụm ray và ghi dẫn vào depot (phía tây ga, nằm hẳn về phía bắc đường chính)
    YAM_YL = None
    _cy = cen['山形']['cx']; _hr = [(min(l[0], l[2]), max(l[0], l[2]), l[1]) for l in RAW if abs(l[1] - l[3]) < .3 and min(l[0], l[2]) < _cy - 200 and max(l[0], l[2]) > _cy + 200]
    if _hr:
        _ym = max(_hr, key=lambda r: r[2])[2]      # đường chính nam (y lớn nhất trong các đường chạy suốt qua ga)
        KEPT = [l for l in KEPT if not (min(l[1], l[3]) < _ym - 30 and max(l[0], l[2]) < _cy - 100)]
        KEPT = [l for l in KEPT if not (abs((l[0] + l[2]) / 2 - (_cy - 116)) < 6 and abs(l[0] - l[2]) > 1.5 and abs(l[1] - l[3]) > 1.5)]      # Yamagata: chỉ có 2 ghi chéo đơn trước ga (bỏ cái thứ 3, xa nhất); không dựng đường cụt phía nam
        # Yamagata: ga có 3 đường -> hạ đường giữa (đang ở giữa đường vòng bắc và đường đôi) xuống ngang đường đôi phía bắc (đường đôi kéo thẳng qua ga), bỏ ghi 141 m; hai đầu ga vẫn 2 ghi
        _y2 = next((l[1] for l in RAW if abs(l[1] - l[3]) < .3 and min(l[0], l[2]) < _cy - 200 and abs(max(l[0], l[2]) - (_cy - 44.5)) < 3 and _ym - 30 < l[1] < _ym - 10), None)
        _mid = [l for l in KEPT if abs(l[1] - l[3]) < .3 and _ym - 50 < l[1] < (_y2 or 0) - 10 and _cy - 60 < min(l[0], l[2]) and max(l[0], l[2]) < _cy + 60]
        if _y2 is not None and _mid:
            _ymid = _mid[0][1]; near_ = lambda l: any(abs(y - _ymid) < 1.7 for y in (l[1], l[3])) and all(_cy - 60 < x < _cy + 70 for x in (l[0], l[2]))
            _rm = [l for l in KEPT if near_(l)]; KEPT = [l for l in KEPT if not near_(l)]
            _pts = [(x, y) for l in _rm for x, y in ((l[0], l[1]), (l[2], l[3])) if abs(y - _ymid) >= 1.7]      # đầu xa của các đoạn bị bỏ
            _loop = [p for p in _pts if p[1] < _ymid - 10]; _west = [p for p in _loop if p[0] < _cy]; _east = [p for p in _loop if p[0] >= _cy]
            _mainE = [p for p in _pts if p[1] > _ymid + 10 and p[0] > _cy]
            if _west and _east and _mainE:
                xw, yw = _west[0]; xl, yl = _east[0]; xm, ym2 = _mainE[0]; t_ = (_y2 - yl) / (ym2 - yl); xn = xl + t_ * (xm - xl)
                YAM_YL = _y2 - 19.2      # hạ đảo ga bắc: đường vòng cách đường giữa 19,2 đơn vị (sân ga rộng 10,4 + 2 × 4,5), không còn cách xa 56 đơn vị như trong sơ đồ đã phóng lại
                KEPT = [l for l in KEPT if not (abs(l[1] - l[3]) < .3 and abs(l[1] - yl) < 1.7 and _cy - 60 < min(l[0], l[2]) and max(l[0], l[2]) < _cy + 60)]
                t_ = (_y2 - YAM_YL) / (ym2 - YAM_YL); xn = xl + t_ * (xm - xl)
                KEPT += [(_cy - 44.5, _y2, xn, _y2), (_cy - 44.5, _y2, xw, YAM_YL), (xw, YAM_YL, xl, YAM_YL), (xl, YAM_YL, xn, _y2), (xn, _y2, xm, ym2)]
    hrail = [(min(a, c), max(a, c), b) for a, b, c, d in RAW if abs(b - d) < .3 and abs(a - c) > 20]      # ray gốc (chưa cắt ở chỗ nối Zao → Yamagata) để dựng sân ga
    PLAT = []
    for f, p in zip(figs, pos):
        for r in f['R']:
            rx, ry = r['x'] + p[0], r['y'] + p[1]
            if r['sw'] != 'thin':
                if r['w'] >= 40: PLAT.append((rx, ry, r['w'], r['h']))      # ô vuông nhỏ (depot, tàu địa phương, nhà ga) không phải sân ga
            else:
                near = sorted(((abs(y - ry), y) for xa_, xb_, y in hrail if xa_ - 2 <= rx + r['w'] / 2 <= xb_ + 2 and abs(y - ry) <= 34))
                if near:
                    dn, y = near[0]
                    if dn < 7:      # vạch sát ray (cạnh gần của sân ga đảo): sân ga nằm phía bên kia vạch, kéo tới ray kế tiếp (chừa 4,5)
                        cover = [yy for xa_, xb_, yy in hrail if xa_ - 2 <= rx + r['w'] / 2 <= xb_ + 2 and abs(yy - ry) <= 34]
                        if y > ry:
                            up = [yy for yy in cover if yy < ry - 3]; y0_, y1_ = ((max(up) + 4.5) if up else ry - 8.2), ry
                        else:
                            dn_ = [yy for yy in cover if yy > ry + 3]; y0_, y1_ = ry, ((min(dn_) - 4.5) if dn_ else ry + 8.2)
                    else: y0_, y1_ = (ry, y - 4.5) if ry < y else (y + 4.5, ry)
                    if y1_ - y0_ > 2: PLAT.append((rx, y0_, r['w'], y1_ - y0_))
    # Yonezawa: sân ga phía bắc bị sơ đồ vẽ ngắn (một vạch mảnh 19,7 đơn vị); theo yêu cầu làm bằng sân ga dài nhất của ga (54,1 đơn vị, cùng vị trí)
    for _jp, _drop in (('米沢', True), ('山形', False)):      # sân ga ngắn bất thường (vạch mảnh bị cắt) làm bằng sân ga dài nhất cùng ga; Yonezawa: bỏ sân ga cách tâm > 40
        _cx = cen[_jp]['cx']
        if _drop: PLAT = [r for r in PLAT if not (40 <= abs(r[0] + r[2] / 2 - _cx) < 75)]
        _near = [r for r in PLAT if abs(r[0] + r[2] / 2 - _cx) < 75]
        if _near:
            _lg = max(_near, key=lambda r: r[2])
            PLAT = [((_lg[0], r[1], _lg[2], r[3]) if r in _near and r[2] < 40 else r) for r in PLAT]
    if YAM_YL is not None:      # Yamagata: sân ga đảo bắc hạ theo đường vòng
        _cxy = cen['山形']['cx']
        PLAT = [((r[0], YAM_YL + 4.5, r[2], r[3]) if abs(r[0] + r[2] / 2 - _cxy) < 75 and r[1] < YAM_YL + 6 else r) for r in PLAT]
    hl = [(min(a, c), max(a, c), b) for a, b, c, d in KEPT if abs(b - d) < .3 and abs(a - c) > 12]
    def ncount(x):
        ys = sorted(y for xa_, xb_, y in hl if xa_ <= x <= xb_); n = 0; last = None
        for y in ys:
            if last is None or y - last > 3: n += 1
            last = y
        return n
    NAME = lambda n: 'ngoài khung sơ đồ' if n == 0 else 'đường đơn' if n == 1 else 'đường đôi' if n == 2 else '%d đường' % n
    # defs: mỗi SVG gốc nhúng một lần
    defs = []
    for i, (fn, p) in enumerate(zip(C.FILES, pos_i)):
        vb = re.search(r'viewBox="([^"]+)"', open(os.path.join(C.ROOT, fn), encoding='utf-8').read()).group(1).split()
        b64 = base64.b64encode(open(os.path.join(C.ROOT, fn), 'rb').read()).decode('ascii')
        defs.append('<image id="f%d" href="data:image/svg+xml;base64,%s" width="%s" height="%s"/>' % (i, b64, vb[2], vb[3]))
    figbox = [(p[0], p[0] + float(re.search(r'viewBox="[\d. ]+ ([\d.]+) ', open(os.path.join(C.ROOT, fn), encoding='utf-8').read()).group(1))) for fn, p in zip(C.FILES, pos_i)]
    SJ = cen['新庄']['pcx']
    names = [s for s in C.ST if s['jp'] in cen]
    cards, rowsum = [], []
    # --- gán từng ghi cho đúng một ga: gộp các ghi liền nhau (cách < 30 đơn vị) thành cụm, mỗi cụm thuộc ga có đầu sân ga gần cụm nhất
    PS = []
    for q in names:
        cxq = cen[q['jp']]['cx']; ps = [(rx, rx + w) for rx, ry, w, h in PLAT if abs(rx + w / 2 - cxq) < 75]
        PS.append((min([a for a, b in ps], default=cxq - 27), max([b for a, b in ps], default=cxq + 27)))
    dg_all = sorted(((a + c_) / 2, (a, b, c_, d)) for a, b, c_, d in KEPT if abs(a - c_) > 1.5 and abs(b - d) > 1.5)
    OWNER = {}; CLS = []; cur = []
    for xm, sg in dg_all:
        if cur and xm - cur[-1][0] > 30: CLS.append(cur); cur = []
        cur.append((xm, sg))
    if cur: CLS.append(cur)
    CXS = [cen[q['jp']]['cx'] for q in names]
    for xm, sg in dg_all: OWNER[sg] = min(range(len(names)), key=lambda j: abs(CXS[j] - xm))      # mặc định: ga gần nhất theo trục ngang
    for cluster in CLS:                      # cụm có ghi ở xa (> 100 đơn vị) mọi ga: cả cụm thuộc ga có đầu sân ga gần cụm nhất
        if any(min(abs(CXS[j] - xm) for j in range(len(names))) > 100 for xm, sg in cluster):
            best = min(range(len(names)), key=lambda j: min(max(PS[j][0] - xm, xm - PS[j][1], 0) for xm, sg in cluster))
            for xm, sg in cluster: OWNER[sg] = best
    # Niwasaka: đường xuống uốn lượn (S) ở hai đầu ga chỉ là đường cong, không phải ghi; cả ga thực tế chỉ có 4 ghi (như Sendai, Omiya) → bỏ đoạn chéo ngoài cùng mỗi phía khỏi danh sách ghi, vẽ như ray thường
    CURVE = set()
    for sg in list(OWNER):      # đoạn chéo dài (> 35 đơn vị ngang) là chỗ khoảng cách hai đường đổi dần (Zao → Yamagata), không phải ghi
        if abs(sg[0] - sg[2]) > 35: CURVE.add(sg); del OWNER[sg]
    nwi = [i for i, q in enumerate(names) if q['jp'] == '庭坂'][0]
    mine = [sg for sg, j in OWNER.items() if j == nwi]
    if len(mine) >= 4:
        for sg in (min(mine, key=lambda t: t[0] + t[2]), max(mine, key=lambda t: t[0] + t[2])): CURVE.add(sg); del OWNER[sg]
    # --- đoạn giữa hai ga liền kề: lấy mẫu số đường ở GIỮA khoảng trống giữa ga này (kể cả ghi của nó) và ga kề, nơi không còn ghi nào; không lấy ở mép khung vì mép khung có thể rơi vào ga kề
    EXT = []
    for j, q in enumerate(names):
        xs_ = [(sg[0] + sg[2]) / 2 for sg, o_ in OWNER.items() if o_ == j] + [PS[j][0], PS[j][1]]
        EXT.append((min(xs_), max(xs_)))
    GAP = {}
    for j in range(len(names)):
        l_ = None if j == 0 else ncount((EXT[j - 1][1] + EXT[j][0]) / 2) if EXT[j - 1][1] < EXT[j][0] else None
        r_ = None if j == len(names) - 1 else ncount((EXT[j][1] + EXT[j + 1][0]) / 2) if EXT[j][1] < EXT[j + 1][0] else None
        GAP[j] = (l_, r_)
    for idx, s in enumerate(names):
        c = cen[s['jp']]; pcx = c['cx']; wx0, wx1 = pcx - HALF, pcx + HALF
        isSJ = s['jp'] == '新庄'; XCUT = SJ - 112
        plats = [(rx, ry, w, h) for rx, ry, w, h in PLAT if abs(rx + w / 2 - pcx) < 75 and (not isSJ or True)]
        pl = min([p[0] for p in plats], default=pcx); pr = max([p[0] + p[2] for p in plats], default=pcx)      # tín hiệu trường không có sân ga: đo từ tâm
        rails = [(a, b, cc, d) for a, b, cc, d in KEPT if max(a, cc) >= wx0 and min(a, cc) <= wx1 and (not isSJ or max(a, cc) <= XCUT + 1)]
        ytop = min([r[1] for r in rails] + [r[1] for r in plats] + [c['ly'] - 80]); ybot = max([r[1] for r in rails] + [r[3] for r in rails] + [r[1] + r[3] for r in plats] + [ytop + 40])
        ymain = None
        if isSJ:
            ysj = sorted(y for xa_, xb_, y in hl if xa_ <= XCUT - 5 <= xb_ + 5); ymain = ysj[len(ysj) // 2] if ysj else (ytop + ybot) / 2
            ybot = max(ybot, ymain + 40); ytop = min(ytop, ymain - 28)
        own_sg = lambda sg: OWNER.get(sg) == idx      # ghi thuộc cụm ghi gần đầu sân ga của ga này nhất; ghi của ga khác chỉ vẽ mờ, không đo
        diag = [(a, b, cc, d) for a, b, cc, d in rails if abs(a - cc) > 1.5 and abs(b - d) > 1.5 and own_sg((a, b, cc, d))]
        sw = []                                          # ghi: (vị trí x giữa đoạn chéo, khoảng cách tới đầu sân ga gần nhất theo mét, phía)
        # hai đoạn chéo chung một đầu (đường đơn tách đối xứng thành hai đường: dạng chữ Y) chỉ là MỘT ghi (Ashisawa, Funagata): gộp, vẽ vẫn đủ hai đoạn
        _used = set(); _diag_m = []
        for i1, g1 in enumerate(diag):
            if i1 in _used: continue
            ends1 = [(g1[0], g1[1]), (g1[2], g1[3])]; grp = [g1]
            for i2, g2 in enumerate(diag):
                if i2 <= i1 or i2 in _used: continue
                ends2 = [(g2[0], g2[1]), (g2[2], g2[3])]
                sh_ = [(e1, e2) for e1 in ends1 for e2 in ends2 if abs(e1[0] - e2[0]) < 1.6 and abs(e1[1] - e2[1]) < 1.6]
                if sh_:      # chung một đầu P; hai đầu kia cùng phía theo x và khác phía theo y -> chữ Y (một ghi); khác phía theo x -> hai ghi nối tiếp (giữ 2)
                    P_ = sh_[0][0]; Q1 = [e for e in ends1 if e is not sh_[0][0]][0]; Q2 = [e for e in ends2 if e is not sh_[0][1]][0]
                    if (Q1[0] - P_[0]) * (Q2[0] - P_[0]) > 0 and (Q1[1] - P_[1]) * (Q2[1] - P_[1]) < 0:
                        _used.add(i2); grp.append(g2)
            _diag_m.append(grp)
        for grp in _diag_m:
            a, b, cc, d = grp[0]
            xm = sum((g[0] + g[2]) / 2 for g in grp) / len(grp)
            if xm < pl: sw.append((xm, (pl - xm) * M, 'tây'))
            elif xm > pr: sw.append((xm, (xm - pr) * M, 'đông'))
            else: sw.append((xm, 0.0, 'giữa'))
        nl, nr = GAP[idx][0] or 0, (2 if isSJ else (GAP[idx][1] or 0)); nc = ncount(pcx) if not isSJ else 2
        # --- khung A: SVG gốc cắt khung
        ci = cen_i[s['jp']]; yi = [v for l in RAW_I if max(l[0], l[2]) >= wx0 and min(l[0], l[2]) <= wx1 for v in (l[1], l[3])]
        ya0, ya1 = (min(yi) if yi else ytop) - 28, ci['ly'] + 34      # khung A theo toạ độ gốc (không phóng)
        use = ''.join('<use href="#f%d" x="%.2f" y="%.2f"/>' % (i, p[0], p[1]) for i, (p, fb) in enumerate(zip(pos_i, figbox)) if fb[1] >= wx0 and fb[0] <= wx1)
        A = '<svg viewBox="%.0f %.0f %d %.0f" class="p" preserveAspectRatio="xMidYMid meet"><rect x="%.0f" y="%.0f" width="%d" height="%.0f" fill="#fff"/>%s</svg>' % (wx0, ya0, 2 * HALF, ya1 - ya0, wx0, ya0, 2 * HALF, ya1 - ya0, use)
        # --- khung B: dự kiến
        by0, by1 = ytop - 30, ybot + 34 + 12 * max(1, len(sw)) + 10
        o = ['<clipPath id="k%d"><rect x="%.0f" y="%.0f" width="%d" height="%.0f"/></clipPath><g clip-path="url(#k%d)">' % (idx, wx0, by0, 2 * HALF, by1 - by0, idx)]
        for rx, ry, w, h in plats: o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#e8eef6" stroke="#44607f" stroke-width="1.2"/>' % (rx, ry, w, h))
        for a, b, cc, d in rails:
            dg = abs(a - cc) > 1.5 and abs(b - d) > 1.5
            o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="2.4" stroke-linecap="round"/>' % (a, b, cc, d, ('#0b5cad' if (a, b, cc, d) in CURVE else '#d12f2f' if own_sg((a, b, cc, d)) else '#d9a8a8') if dg else '#0b5cad'))
        if isSJ:
            TS = 17.6; sx = XCUT
            o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#0b5cad" stroke-width="2.4"/><line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#d12f2f" stroke-width="2.4"/><line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#0b5cad" stroke-width="2.4"/><line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#0b5cad" stroke-width="2.4"/>' % (sx - 40, ymain, sx, ymain, sx, ymain, sx + 70, ymain + TS, sx, ymain, SJ + 55, ymain, sx + 70, ymain + TS, SJ + 55, ymain + TS))
            for yy_ in (ymain, ymain + TS): o.append('<rect x="%.1f" y="%.1f" width="5" height="11" fill="#333"/>' % (SJ + 55, yy_ - 5.5))
            o.append('<rect x="%.1f" y="%.1f" width="54.1" height="9" fill="#e8eef6" stroke="#44607f" stroke-width="1.2"/><rect x="%.1f" y="%.1f" width="54.1" height="9" fill="#e8eef6" stroke="#44607f" stroke-width="1.2"/>' % (SJ - 27, ymain - 15, SJ - 27, ymain + TS + 6))
            pl, pr = SJ - 27, SJ + 27; sw = [(sx + 35, (pl - (sx + 35)) * M, 'tây')]      # Shinjo: sân ga 441 m, ghi cách đầu sân ga ≥ 100 m
        # kích thước: sân ga và khoảng cách tới ghi
        dy = ybot + 14
        if plats: o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#44607f"/><text x="%.1f" y="%.1f" font-size="9" text-anchor="middle" fill="#44607f">sân ga %d m</text>' % (pl, dy, pr, dy, (pl + pr) / 2, dy - 3, round((pr - pl) * M)))
        for k_, (xm, dist, side) in enumerate(sorted(sw)):
            if side == 'giữa': continue
            xe = pl if side == 'tây' else pr; yy_ = dy + 13 + k_ * 12
            o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#d12f2f" stroke-dasharray="2 2"/><text x="%.1f" y="%.1f" font-size="9" text-anchor="middle" fill="#d12f2f">%d m</text><line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#d12f2f" stroke-dasharray="1 2"/>' % (xm, ytop - 20, xm, dy + 14, (xm + xe) / 2, yy_, round(dist), xm, yy_ - 8, xe, yy_ - 8))
        o.append('</g><text x="%.0f" y="%.0f" font-size="10" fill="#555">◄ %s</text><text x="%.0f" y="%.0f" font-size="10" fill="#555" text-anchor="end">%s ►</text>' % (wx0 + 4, by0 + 11, NAME(nl) + (' (tới ' + names[idx - 1]['en'] + ')' if idx else ''), wx1 - 4, by0 + 11, ('ga cuối: giảm chấn' if isSJ else NAME(nr) + ' (tới ' + names[idx + 1]['en'] + ')')))
        B = '<svg viewBox="%.0f %.0f %d %.0f" class="p" preserveAspectRatio="xMidYMid meet"><rect x="%.0f" y="%.0f" width="%d" height="%.0f" fill="#fff"/>%s</svg>' % (wx0, by0, 2 * HALF, by1 - by0, wx0, by0, 2 * HALF, by1 - by0, ''.join(o))
        # --- khung C: game
        g = C.GAME.get(s['jp'])
        Cg = game_svg(g) if g else '<div class="none">Chưa có trong game</div>'
        cnote = ('Mã game <code>%s</code>, %d đường, %d sân ga, xo = <code>%s</code>' % (g['lay'], len(g['tracks']), len(g['plats']), html.escape(json.dumps(g['xo'])))) if g else 'Chưa có trong game.'
        tok = 'P' * len(plats)
        facts = ['%d đường tại ga (%s)' % (nc, NAME(nc)), ('%d sân ga (dài %s m)' % (len(plats), ', '.join(str(round(p[2] * M)) for p in sorted(plats)))) if plats else 'không có sân ga (tín hiệu trường); khoảng cách ghi đo từ tâm']
        if sw:
            w_ = [x for x in sorted(sw) if x[2] == 'tây']; e_ = [x for x in sorted(sw) if x[2] == 'đông']
            facts.append('ghi phía tây (trái, về Fukushima): %s; phía đông (phải, về Shinjo): %s' % (', '.join('%d m' % round(x[1]) for x in sorted(w_, key=lambda t: -t[0])) or 'không', ', '.join('%d m' % round(x[1]) for x in e_) or 'không'))
        facts.append('đoạn giữa hai ga (đo ở giữa khoảng trống, ngoài vùng ghi): về %s = %s; về %s = %s' % (names[idx - 1]['en'] if idx else 'Fukushima', NAME(nl), names[idx + 1]['en'] if idx + 1 < len(names) else 'cuối tuyến', 'ga cuối, giảm chấn' if isSJ else NAME(nr)))
        ing = s['inGame']
        cards.append('<div class="card" id="s%d"><div class="hd"><span class="no">%d</span> <b class="jp">%s</b> <span class="hi">%s</span> <span class="en">%s</span> <span class="km">%.1f km từ Fukushima</span> <span class="v" style="background:%s">%s</span></div><div class="row3"><div><div class="cap">A. Sơ đồ gốc (SVG nguyên vẹn, cắt khung)</div>%s</div><div><div class="cap">B. Dự kiến (đã lọc depot / đầu cụt; số đo theo sơ đồ)</div>%s</div><div><div class="cap">C. Trong game</div>%s</div></div><ul class="facts">%s</ul><div class="note">%s</div></div>' % (idx + 1, idx + 1, html.escape(s['jp']), html.escape(s['hira']), html.escape(s['en']), s['kmFromFukushima'], '#2e8b57' if ing else '#4169a8', 'đã có trong game' if ing else 'thêm mới', A, B, Cg, ''.join('<li>%s</li>' % html.escape(f) for f in facts), html.escape(cnote)))
        rowsum.append('<tr><td>%d</td><td><a href="#s%d">%s %s</a></td><td>%.1f</td><td>%s</td><td>%s</td><td>%d</td><td>%s</td><td>%s</td></tr>' % (idx + 1, idx + 1, html.escape(s['jp']), html.escape(s['en']), s['kmFromFukushima'], NAME(nl), NAME(nr), len(plats), 'có' if ing else '-', html.escape(g['lay']) if g else ''))
    css = H.CSS + ' .card{border:1px solid #ccd;border-radius:6px;margin:12px 0;padding:8px;background:#fff}.hd{font-size:15px;margin-bottom:6px}.no{color:#889;font-size:12px}.jp{font-size:19px}.hi,.en,.km{color:#555;margin-left:8px;font-size:13px}.v{color:#fff;padding:1px 8px;border-radius:9px;font-size:12px;margin-left:10px}.row3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.cap{font-size:12px;color:#444;margin-bottom:2px}svg.p{width:100%;height:auto;border:1px solid #dde;background:#fff}.none{border:1px dashed #aab;color:#889;padding:60px 0;text-align:center;font-size:13px}.facts{margin:6px 0 2px;padding-left:20px;font-size:13px}@media(max-width:900px){.row3{grid-template-columns:1fr}}'
    h = ['<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thẻ ga tuyến Yamagata</title><style>' + css + '</style></head><body>']
    h.append('<svg width="0" height="0" style="position:absolute"><defs>' + ''.join(defs) + '</defs></svg>')
    h.append('<h1>Tuyến Yamagata: thẻ từng ga (Sasakino → Shinjo, 34 ga + Kita-Akayu Jct.)</h1>')
    h.append('<p class="note">Nguồn: <b>配線略図.net</b> (CC BY 4.0, https://www.haisenryakuzu.net/), <code>ou_1/030_02–030_08</code>; danh sách ga/km/romaji: <code>docs/data/yam_stations.json</code>. Không có Fukushima (đã dựng); có thêm tín hiệu trường Kita-Akayu Jct. (61,6 km từ Fukushima, 5,5 km sau Akayu và 2,8 km trước Nakagawa; toạ độ 38,07806 N 140,18639 E; mở 27/9/1963, từ 25/7/1968 là tín hiệu trường cuối đường đôi, phía Akayu đường đôi, phía Nakagawa đường đơn [N: ja.wikipedia 北赤湯信号場]), nơi đoạn đường đôi từ Akayu kết thúc. Làm lại ngày 28/11/2026: mỗi ga một thẻ, đo từ chính sơ đồ. 1 đơn vị sơ đồ = 8,15 m [I] (sơ đồ không theo tỉ lệ, số đo chỉ là ước lượng); trái = phía Fukushima, phải = phía Shinjo. Đỏ = ghi. <b>Khung A là SVG gốc không sửa</b>; khung B vẽ lại từ số liệu, bỏ khối depot và đường cụt (mạng ray cắt nhánh cụt lặp lại); Shinjo dựng riêng theo yêu cầu (một đường vào, ghi thành 2 đường, giảm chấn cuối ga).</p>')
    h.append('<table><tr><th>#</th><th>Ga</th><th>km</th><th>Bên trái</th><th>Bên phải</th><th>Sân ga</th><th>Trong game</th><th>Mã game</th></tr>' + ''.join(rowsum) + '</table>')
    h.extend(cards); h.append('</body></html>')
    out = os.path.join(C.ROOT, 'yam_cards.html'); open(out, 'w', encoding='utf-8').write('\n'.join(h)); print('ghi', out, os.path.getsize(out), 'byte', len(cards), 'thẻ')

if __name__ == '__main__': main()
