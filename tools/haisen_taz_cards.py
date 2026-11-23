# -*- coding: utf-8 -*-
# Thẻ từng ga tuyến Tazawako (Kita-Omagari → Maegata, 18 mục kể cả 2 tín hiệu trường): mỗi thẻ có ba khung cạnh nhau
#   A. sơ đồ gốc 配線略図.net (CC BY 4.0, tazawako/010_01–010_04) cắt quanh ga (vẽ lại từ số liệu, không nhúng SVG);
#   B. DỰ KIẾN: token bố trí đọc từ sơ đồ (bắc → nam theo hình; token chiều XUỐNG của game đọc nam → bắc = đảo chuỗi) và mã đề xuất;
#   C. TRONG GAME: hình học thật của game (docs/data/haisen/taz_game.json: Shizukuishi, Tazawako, Kakunodate) hoặc khung nét đứt "chưa có".
# Chạy: python -X utf8 tools/haisen_taz_cards.py -> docs/data/haisen/taz_cards.html. KHÔNG sửa game.
import sys, os, json, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import haisen_yam_aki as H
import haisen_yam_cards as YC

ROOT = H.ROOT
FILES = ['tazawako/010_01.svg', 'tazawako/010_02.svg', 'tazawako/010_03.svg', 'tazawako/010_04.svg']
OM_KM = 572.1      # km game của Omagari; km game của ga = 572,1 − khoảng cách từ Omagari
# (jp, hiragana, en, khoảng cách từ Omagari (km, ja.wikipedia 田沢湖線), hình, tâm nhãn x (None = tự dò), token bắc→nam theo hình, loại)
ST = [
    ('北大曲', 'きたおおまがり', 'Kita-Omagari', 3.6, 0, None, 'Pd', 'ga'),
    ('羽後四ツ屋', 'うごよつや', 'Ugo-Yotsuya', 5.4, 0, 475, 'PddP', 'ga'),
    ('鑓見内', 'やりみない', 'Yariminai', 7.7, 0, None, 'Pd', 'ga'),
    ('羽後長野', 'うごながの', 'Ugo-Nagano', 11.0, 0, None, 'PddP', 'ga'),
    ('鶯野', 'うぐいすの', 'Uguisuno', 14.0, 1, None, 'dP', 'ga'),
    ('角館', 'かくのだて', 'Kakunodate', 16.8, 1, None, 'ddPd', 'ga'),
    ('生田', 'しょうでん', 'Shoden', 20.3, 1, None, 'Pd', 'ga'),
    ('神代', 'じんだい', 'Jindai', 22.8, 1, None, 'PddP', 'ga'),
    ('刺巻', 'さしまき', 'Sashimaki', 31.2, 1, None, 'PddP', 'ga'),
    ('田沢湖', 'たざわこ', 'Tazawako', 35.5, 1, None, 'dPddP', 'ga'),
    ('志度内信号場', 'しどない', 'Shidonai Jct.', 41.2, 2, 39, 'dd', 'tín hiệu trường'),
    ('大地沢信号場', 'おおちざわ', 'Ochizawa Jct.', 47.1, 2, 152, 'dd', 'tín hiệu trường'),
    ('赤渕', 'あかぶち', 'Akabuchi', 53.6, 2, None, 'dPd', 'ga'),
    ('春木場', 'はるきば', 'Harukiba', 56.9, 2, None, 'dP', 'ga'),
    ('雫石', 'しずくいし', 'Shizukuishi', 59.6, 2, None, 'PddPd', 'ga'),
    ('小岩井', 'こいわい', 'Koiwai', 65.1, 2, None, 'PddP', 'ga'),
    ('大釜', 'おおかま', 'Okama', 69.6, 3, None, 'dPdP', 'ga'),
    ('前潟', 'まえがた', 'Maegata', 72.2, 3, None, 'dP', 'ga'),
]
CODE = {'dP': '1-1-0', 'PddP': '2-2-0', 'dPd': '1-2-0', 'PddPd': '2-3-0', 'dPddP': '2-3-0c'}      # token chiều XUỐNG (nam → bắc) trùng mã có sẵn trong layout.js (d ở đây = đường dừng chung hai chiều)
NOTE = {
    'PddP': 'hai đường (đường tránh) giữa hai sân ga bên',
    'dPd': 'một sân ga đảo giữa hai đường',
    'Pd': 'một đường, một sân ga bên phía bắc (mã 1-1-0, đã dựng ở Kita-Omagari 23/11/2026)',
    'dP': 'một đường, một sân ga bên phía nam: cần biến thể gương của 1-1-0 (chưa có)',
    'dd': 'tín hiệu trường: hai đường tránh nhau, KHÔNG có sân ga (tàu không đỗ khách)',
    'ddPd': 'ba đường, một sân ga đảo kề hai đường phía nam; có ga tuyến Nairiku (1067 mm) bên cạnh: chưa có mã',
    'dPdP': 'hai đường, hai sân ga (một đảo bắc, một bên nam): chưa có mã',
    'dPddP': 'ba đường, sân ga đảo phía bắc + sân ga bên phía nam',
    'PddPd': 'ba đường, sân ga bên phía bắc + sân ga đảo phía nam',
}
COL = {'GIỮ': '#2e8b57', 'SỬA': '#d98a00', 'THÊM MỚI': '#4169a8', 'THÊM (mã có sẵn)': '#3a7f9a'}


SC_M = 8.15          # m / đơn vị sơ đồ [I]
ZM = 22              # lề thêm hai đầu sân ga để lấy trọn ghi (đơn vị sơ đồ, ~180 m)
ZONE = {'Shidonai Jct.': (0, 105), 'Ochizawa Jct.': (112, 218)}      # tín hiệu trường không có sân ga: vùng ghi + đường tránh chọn tay theo số liệu


def fix_platforms(f, path):
    """read_fig bỏ sót sân ga viết bằng lệnh H (tọa độ tuyệt đối), vd Maegata/Uguisuno: bù lại ở đây (không sửa script dùng chung)."""
    raw = open(path, encoding='utf-8').read()
    have = {(round(r['x'], 1), round(r['y'], 1)) for r in f['R']}
    for m in __import__('re').finditer(r'<path[^>]*d="M([-\d.]+),([-\d.]+)H([-\d.]+)v', raw):
        x, y, x2 = float(m.group(1)), float(m.group(2)), float(m.group(3))
        if x2 - x > 15 and (round(x, 1), round(y, 1)) not in have: f['R'].append(dict(x=x, y=y, w=x2 - x, h=1.6, sw='thin', fill=None))


def plan_svg(f, cx, en, w=300):
    """DỰ KIẾN: sơ đồ sạch (chỉ ray 1435 mm + sân ga của chính ga) kèm ghi hai đầu, đường tránh/nhánh, thang mét. Trả về (svg, ghi chú ghi)."""
    pl = [r for r in YC.platforms(f) if abs(r['x'] + r['w'] / 2 - cx) < 60]
    if en in ZONE: lo, hi = ZONE[en]; pa = pb = None
    elif pl: pa = min(r['x'] for r in pl); pb = max(r['x'] + r['w'] for r in pl); lo, hi = pa - ZM, pb + ZM
    else: pa = pb = None; lo, hi = cx - 60, cx + 60
    vlo, vhi = lo - 9, hi + 9
    hs, dg = {}, []
    for l in f['L']:
        if l['c'] not in (H.BLUE, H.GREY): continue
        xa, xb = sorted((l['x1'], l['x2']))
        if abs(l['y1'] - l['y2']) < .3:
            if xb > vlo and xa < vhi: hs.setdefault((round(l['y1'], 1), l['c']), []).append((max(xa, vlo), min(xb, vhi)))
        elif vlo <= (l['x1'] + l['x2']) / 2 <= vhi: dg.append(l)
    segs = []
    for (y, c), v in hs.items():
        for xa, xb in v: segs.append((y, xa, xb, c))
    ys = [y for y, _, _, _ in segs] + [v for l in dg for v in (l['y1'], l['y2'])]
    pls = [r for r in pl if r['x'] >= vlo - 1 and r['x'] + r['w'] <= vhi + 1] if en not in ZONE else []
    ys += [v for r in pls for v in (r['y'], r['y'] + r['h'])]
    y0, y1 = (min(ys) - 6, max(ys) + 6) if ys else (0, 60)
    sx = w / (vhi - vlo); sy = min(3.4, 120.0 / max(1.0, y1 - y0)); hh = int((y1 - y0) * sy) + 34
    X = lambda x: (x - vlo) * sx; Y = lambda y: (y - y0) * sy + 16
    out = ['<svg viewBox="0 0 %d %d" width="%d" height="%d" class="p">' % (w, hh, w, hh)]
    for r in pls: out.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#e8eef6" stroke="#44607f" stroke-width="1.1"/>' % (X(r['x']), Y(r['y']), r['w'] * sx, r['h'] * sy))
    for y, xa, xb, c in segs: out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="2.4"%s/>' % (X(xa), Y(y), X(xb), Y(y), '#0b5cad' if c == H.BLUE else '#9aa3ad', '' if c == H.BLUE else ' stroke-dasharray="5 3"'))
    for l in dg: out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="2.4"/>' % (X(l['x1']), Y(l['y1']), X(l['x2']), Y(l['y2']), '#0b5cad' if l['c'] == H.BLUE else '#9aa3ad'))
    # ghi = nút có ≥ 3 đầu đường gặp nhau (đầu ray + 2 cho mỗi ray đi qua)
    nodes = {}
    key = lambda x, y: (round(x * 2) / 2, round(y * 2) / 2)
    for l in dg:
        for x, y in ((l['x1'], l['y1']), (l['x2'], l['y2'])): nodes[key(x, y)] = nodes.get(key(x, y), 0) + 1
    for y, xa, xb, c in segs:
        for x in (xa, xb):
            k = key(x, y)
            if k in nodes and vlo + .5 < x < vhi - .5: nodes[k] += 1
    sw = []
    for (x, y), n in list(nodes.items()):
        thru = any(abs(y - sy_) < .6 and sa + .6 < x < sb - .6 for sy_, sa, sb, _ in segs)
        if n + (2 if thru else 0) >= 3: sw.append((x, y))
    sw = sorted(set(sw))
    for x, y in sw: out.append('<circle cx="%.1f" cy="%.1f" r="3.4" fill="#c0392b"/>' % (X(x), Y(y)))
    mid = (lo + hi) / 2; note = []
    for side, cond in (('đầu Omagari (trái)', lambda x: x < mid), ('đầu Morioka (phải)', lambda x: x >= mid)):
        g = [x for x, _ in sw if cond(x)]
        if not g: continue
        if pa is not None: d = (pa - max(g)) * SC_M if side.startswith('đầu Omagari') else (min(g) - pb) * SC_M; note.append('%s: %d ghi, ghi gần nhất cách đầu sân ga ~%d m' % (side, len(g), round(d)))
        else: note.append('%s: %d ghi' % (side, len(g)))
    bar = 100 / SC_M; bx = 8; by = hh - 14
    out.append('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="#555" stroke-width="2"/><text x="%.1f" y="%d" font-size="9" fill="#555">100 m</text>' % (bx, by, bx + bar * sx, by, bx + bar * sx + 4, by + 3))
    out.append('<text x="3" y="11" font-size="9" fill="#777">← Omagari</text><text x="%d" y="11" font-size="9" fill="#777" text-anchor="end">Morioka →</text>' % (w - 3))
    out.append('<text x="%d" y="%d" font-size="9" fill="#c0392b" text-anchor="end">● ghi</text><text x="%d" y="%d" font-size="9" fill="#777" text-anchor="end">bắc (trên) → nam (dưới)</text></svg>' % (w - 3, hh - 14, w - 3, hh - 3))
    return ''.join(out), note


def centres(figs):
    out = []
    for fi, f in enumerate(figs):
        out.append({t['s']: t['x'] + len(t['s']) * (16 if t['size'] >= 14 else 11) * 0.8 / 2 for t in f['T'] if t['size'] >= 8})
    return out


def main():
    figs = [H.read_fig(os.path.join(ROOT, f)) for f in FILES]
    for f_, p_ in zip(figs, FILES): fix_platforms(f_, os.path.join(ROOT, p_))
    cen = centres(figs)
    f0 = figs[0]; f0['L'] = [l for l in f0['L'] if not (max(l['y1'], l['y2']) < 125 and min(l['x1'], l['x2']) > 300)]; f0['T'] = [t for t in f0['T'] if not (t['y'] < 120 and t['x'] > 325)]      # bỏ chú giải (凡例) của hình 010_01 khỏi khung cắt
    game = {s['jp']: s for s in json.load(open(os.path.join(ROOT, 'taz_game.json'), encoding='utf-8'))['stations']}
    GAMEJP = {'雫石': '雫石', '田沢湖': '田沢湖', '角館': '角館'}
    cards = []; cnt = {}
    for i, (jp, hira, en, d, fi, cx0, tok, kind) in enumerate(ST, 1):
        cx = cx0 if cx0 is not None else cen[fi].get(jp)
        if cx is None: cx = cen[fi].get(jp + '（信）', 100)
        c = dict(fig=figs[fi], cx=cx, ox=0)
        down = tok[::-1]; code = CODE.get(down); g = game.get(jp)
        if g: verdict = 'GIỮ' if g['lay'] == code else 'SỬA'
        else: verdict = 'THÊM (mã có sẵn)' if code else 'THÊM MỚI'
        cnt[verdict] = cnt.get(verdict, 0) + 1
        a = YC.crop_svg(c, 'orig')
        b, gn = plan_svg(figs[fi], cx, en); bnote = '<b>Dự kiến</b>: token (bắc → nam) <code>%s</code>; chiều XUỐNG (nam → bắc) = <code>%s</code>%s. %s%s' % (tok, down, (' → mã <code>%s</code> (có sẵn)' % code) if code else ' → <b>chưa có mã</b> trong layout.js', html.escape(NOTE.get(tok, '')), (' <br>Ghi: ' + html.escape('; '.join(gn)) + '.') if gn else '')
        near = lambda l: min(l['x1'], l['x2']) < cx + 75 and max(l['x1'], l['x2']) > cx - 75
        c2 = dict(fig=dict(L=[l for l in c['fig']['L'] if near(l)], T=[], R=c['fig']['R']), cx=cx, ox=0)      # khung nét đứt chỉ vẽ các đường quanh ga (không lấy ga bên cạnh)
        cc = YC.game_svg(g) if g else YC.crop_svg(c2, 'dash')
        cnote = ('<b>Trong game</b>: mã <code>%s</code>, %d đường, %d sân ga%s' % (g['lay'], len(g['tracks']), len(g['plats']), '' if g['lay'] == code else '; KHÁC mã dự kiến')) if g else '<b>Chưa có trong game</b> (khung nét đứt = cấu trúc theo sơ đồ).'
        cards.append('<div class="card" id="s%d"><div class="hd"><span class="no">%d</span> <b class="jp">%s</b> <span class="hi">%s</span> <span class="en">%s</span> <span class="km">%.1f km từ Omagari (km game %.1f)</span> <span class="v" style="background:%s">%s</span> <span class="warn">%s</span></div><div class="row3"><div><div class="cap">Sơ đồ gốc (%s)</div>%s</div><div><div class="cap">Dự kiến</div>%s<div class="n">%s</div></div><div><div class="cap">Trong game</div>%s<div class="n">%s</div></div></div></div>' % (i, i, html.escape(jp), html.escape(hira), html.escape(en), d, OM_KM - d, COL[verdict], verdict, html.escape(kind if kind != 'ga' else ''), FILES[fi].split('/')[1], a, b, bnote, cc, cnote))
    css = H.CSS + ' .card{border:1px solid #ccd;border-radius:6px;margin:10px 0;padding:8px;background:#fff}.hd{font-size:15px;margin-bottom:6px}.no{color:#889;font-size:12px}.jp{font-size:18px}.hi,.en,.km{color:#555;margin-left:8px;font-size:13px}.v{color:#fff;padding:1px 8px;border-radius:9px;font-size:12px;margin-left:10px}.row3{display:flex;gap:10px;flex-wrap:wrap}.row3>div{width:300px}.cap{font-size:12px;color:#667;margin-bottom:2px}.n{font-size:12px;color:#444;margin-top:3px}svg.p{border:1px solid #e1e4ea;background:#fafbfc;display:block}.warn{color:#b03;font-size:12px;margin-left:8px}'
    h = ['<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thẻ ga tuyến Tazawako</title><style>' + css + '</style></head><body>']
    h.append('<h1>Tuyến Tazawako: thẻ từng ga (Kita-Omagari → Maegata, 18 mục)</h1>')
    h.append('<p class="note">Nguồn: <b>配線略図.net</b> (CC BY 4.0), <code>tazawako/010_01–010_04</code>; khoảng cách từ Omagari: ja.wikipedia 田沢湖線 [N]; km game = 572,1 − khoảng cách [I]. Hiragana/romaji: nhãn trên sơ đồ và ja.wikipedia; 大地沢信号場 (おおちざわ) là cách đọc tôi chưa kiểm chứng [?]. Tổng kết: %s. Khung Dự kiến vẽ ray 1435 mm + sân ga của chính ga và các ghi hai đầu (chấm đỏ = nút có ≥ 3 đầu đường gặp nhau, đọc tự động từ số liệu sơ đồ; khoảng cách tính từ đầu sân ga, 1 đơn vị ≈ 8,15 m [I]); sân ga viết bằng lệnh H trong SVG (Uguisuno, Maegata) được bù thêm vì script chung bỏ sót. Token đọc tự động từ sơ đồ rồi đối chiếu bằng mắt; sai sót có thể có ở ga có ray nhánh sang tuyến khác (Kakunodate có ga tuyến Nairiku 1067 mm). Hai ga đầu mút Omagari và Morioka không có thẻ (Omagari: <code>omagari_plan.html</code>); Maegata là ga cuối của đoạn yêu cầu, không phải ga sát Morioka (Okama, Maegata, rồi tới Morioka).</p>' % ', '.join('%s: %d' % (k, v) for k, v in cnt.items()))
    h.extend(cards); h.append('</body></html>')
    out = os.path.join(ROOT, 'taz_cards.html'); open(out, 'w', encoding='utf-8').write('\n'.join(h)); print('ghi', out, os.path.getsize(out), 'byte', cnt)


if __name__ == '__main__':
    main()
