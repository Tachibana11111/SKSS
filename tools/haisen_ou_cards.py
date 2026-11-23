# -*- coding: utf-8 -*-
# Thẻ 7 ga giữa Omagari và Akita (Ou Main Line, 秋田新幹線 đi chung đường): Jingūji, Kariwano, Mineyoshikawa, Ugo-Sakai, Ōbarino, Wada, Yotsugoya.
# Mỗi thẻ: (A) sơ đồ gốc 配線略図.net (CC BY 4.0, ou_1/030_12, 030_13), (B) DỰ KIẾN theo yêu cầu người chơi (23/11/2026), (C) ghi chú khác biệt với sơ đồ.
# Chạy: python -X utf8 tools/haisen_ou_cards.py -> docs/data/haisen/ou_cards.html. KHÔNG sửa game.
import sys, os, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import haisen_yam_aki as H
import haisen_yam_cards as YC
import haisen_taz_cards as TZ

ROOT = H.ROOT
FILES = {'ou_1/030_12.svg': None, 'ou_1/030_13.svg': None}
OM_KM = 572.1
# (jp, hiragana, en, km từ Omagari [N: ja.wikipedia 奥羽本線], file, tâm nhãn (None = tự dò), kiểu, (lat, lon) [N: ja.wikipedia])
ST = [
    ('神宮寺', 'じんぐうじ', 'Jingūji', 6.0, 'ou_1/030_12.svg', None, 'island', (39.49494, 140.42631)),
    ('刈和野', 'かりわの', 'Kariwano', 13.6, 'ou_1/030_12.svg', None, 'island', (39.54764, 140.37239)),
    ('峰吉川', 'みねよしかわ', 'Mineyoshikawa', 18.4, 'ou_1/030_12.svg', None, 'north', (39.56672, 140.32328)),
    ('羽後境', 'うごさかい', 'Ugo-Sakai', 24.9, 'ou_1/030_13.svg', None, 'siding', (39.61867, 140.32072)),
    ('大張野', 'おおばりの', 'Ōbarino', 33.0, 'ou_1/030_13.svg', None, 'north', (39.6635, 140.27378)),
    ('和田', 'わだ', 'Wada', 38.4, 'ou_1/030_13.svg', None, 'siding', (39.65089, 140.21781)),
    ('四ツ小屋', 'よつごや', 'Yotsugoya', 45.3, 'ou_1/030_13.svg', None, 'north', (39.66078, 140.14481)),
]
KIND = {
    'island': ('1-2-0 (có sẵn)', 'đoạn ĐƯỜNG ĐÔI, sân ga đảo nằm giữa hai làn'),
    'north': ('1-1-0 (có sẵn)', 'một đường, sân ga bên phía bắc'),
    'siding': ('mã mới (tạm gọi 1-2-1n)', 'đường chính có sân ga phía bắc + đường nhánh phía nam rẽ khỏi đường chính (chỉ để tránh tàu)'),
}
SVGW, SVGH = 300, 190


def prop_svg(kind, w=SVGW, h=SVGH):
    """DỰ KIẾN: bắc (trên) → nam (dưới); trục ngang ±850 m quanh tâm sân ga; 1 hàng đường = 28 px."""
    cx, cy, k = w / 2, h / 2 + 6, w / 1700.0
    X = lambda m: cx + m * k
    out = ['<svg viewBox="0 0 %d %d" width="%d" height="%d" class="p"><rect width="%d" height="%d" fill="#fafbfc"/>' % (w, h, w, h, w, h)]
    trk = lambda y, x0, x1, c='#0b5cad', sw=2.6: out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%s"/>' % (X(x0), y, X(x1), y, c, sw))
    dia = lambda xa, ya, xb, yb: out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#0b5cad" stroke-width="2.6"/>' % (X(xa), ya, X(xb), yb))
    pl = lambda y0, y1, x0, x1: out.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#e8eef6" stroke="#44607f" stroke-width="1.1"/>' % (X(x0), y0, X(x1) - X(x0), y1 - y0))
    sw = lambda xm, y: out.append('<circle cx="%.1f" cy="%.1f" r="3.4" fill="#c0392b"/>' % (X(xm), y))
    R = 28
    if kind == 'island':
        a, b = cy - R, cy + R
        trk(a, -850, 850); trk(b, -850, 850); pl(a + 4, b - 4, -220, 220)
        out.append('<text x="%.1f" y="%.1f" font-size="9" fill="#555" text-anchor="middle">làn bắc (1435 mm)</text><text x="%.1f" y="%.1f" font-size="9" fill="#555" text-anchor="middle">làn nam (1435 mm)</text>' % (cx, a - 6, cx, b + 14))
    elif kind == 'north':
        trk(cy, -850, 850); pl(cy - 22, cy - 5, -220, 220)
    else:      # siding: chính + sân ga bắc, nhánh nam
        s = cy + R
        trk(cy, -850, 850); pl(cy - 22, cy - 5, -220, 220); trk(s, -430, 430)
        dia(-512, cy, -430, s); dia(512, cy, 430, s); sw(-512, cy); sw(512, cy)
        out.append('<text x="%.1f" y="%.1f" font-size="9" fill="#555" text-anchor="middle">đường nhánh (tránh tàu)</text>' % (cx, s + 14))
    out.append('<text x="3" y="11" font-size="9" fill="#777">← Omagari (đông)</text><text x="%d" y="11" font-size="9" fill="#777" text-anchor="end">Akita (tây) →</text><text x="%d" y="%d" font-size="9" fill="#777" text-anchor="end">bắc (trên) → nam (dưới)</text>' % (w - 3, w - 3, h - 3))
    out.append('<line x1="8" y1="%d" x2="%.1f" y2="%d" stroke="#555" stroke-width="2"/><text x="%.1f" y="%d" font-size="9" fill="#555">100 m</text></svg>' % (h - 14, 8 + 100 * k, h - 14, 8 + 100 * k + 4, h - 11))
    return ''.join(out)


def overview():
    """Dải toàn khu gian: km, ga, đường đôi, đường nhánh, các khối đường đơn (ga có chỗ tránh là biên khối)."""
    W, Hh, pad = 1000, 150, 30
    x = lambda km: pad + (km - OM_KM) / 51.7 * (W - 2 * pad)
    o = ['<svg viewBox="0 0 %d %d" width="%d" height="%d" class="p"><rect width="%d" height="%d" fill="#fafbfc"/>' % (W, Hh, W, Hh, W, Hh)]
    y0 = 62
    # đường đơn
    for a, b in ((OM_KM, 577.5), (586.3, 623.8)):
        o.append('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="#0b5cad" stroke-width="3"/>' % (x(a), y0, x(b), y0))
    # đoạn đôi 577.5 – 586.3
    for dy in (-7, 7):
        o.append('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="#0b5cad" stroke-width="3"/>' % (x(577.5 + .35), y0 + dy, x(586.3 - .35), y0 + dy))
    for xa, xb, s in ((577.5, 577.85, 1), (586.3, 585.95, 1)):
        for dy in (-7, 7): o.append('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="#0b5cad" stroke-width="3"/>' % (x(xa), y0, x(xb), y0 + dy))
    # đường nhánh phía nam (Ugo-Sakai, Wada)
    for en in ('Ugo-Sakai', 'Wada'):
        km = OM_KM + [s for s in ST if s[2] == en][0][3]
        o.append('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="#0b5cad" stroke-width="3"/><line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="#0b5cad" stroke-width="2"/><line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="#0b5cad" stroke-width="2"/>' % (x(km - .25), y0 + 12, x(km + .25), y0 + 12, x(km - .45), y0, x(km - .25), y0 + 12, x(km + .45), y0, x(km + .25), y0 + 12))
    names = [('Omagari', 0.0, 'cap'), ] + [(s[2], s[3], {'island': 'cap', 'siding': 'cap', 'north': 'solo'}[s[6]]) for s in ST] + [('Akita', 51.7, 'cap')]
    for en, d, c in names:
        px = x(OM_KM + d)
        o.append('<circle cx="%.1f" cy="%d" r="%d" fill="%s" stroke="#222"/>' % (px, y0, 6 if c == 'cap' else 4, '#c0392b' if c == 'cap' else '#fff'))
        o.append('<text x="%.1f" y="%d" font-size="11" text-anchor="middle" fill="#222" transform="rotate(-35 %.1f %d)">%s</text>' % (px, y0 - 18, px, y0 - 18, html.escape(en)))
        o.append('<text x="%.1f" y="%d" font-size="9" text-anchor="middle" fill="#666">%.1f</text><text x="%.1f" y="%d" font-size="9" text-anchor="middle" fill="#999">km %.1f</text>' % (px, y0 + 32, d, px, y0 + 44, OM_KM + d))
    # biên khối (ga có chỗ tránh)
    cap = [d for en, d, c in names if c == 'cap']
    blocks = [(a, b) for a, b in zip(cap, cap[1:])]
    for a, b in blocks:
        o.append('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="#e67e22" stroke-width="2" stroke-dasharray="5 3"/><text x="%.1f" y="%d" font-size="10" text-anchor="middle" fill="#e67e22">%.1f km · %d phút</text>' % (x(OM_KM + a) + 6, y0 + 62, x(OM_KM + b) - 6, y0 + 62, (x(OM_KM + a) + x(OM_KM + b)) / 2, y0 + 76, b - a, round((b - a) / 93 * 60 + 1.5)))
    o.append('<text x="10" y="14" font-size="10" fill="#555">● đỏ = ga có chỗ cho hai tàu ngược chiều tránh nhau (biên khối) · ○ trắng = ga một đường (không tránh được) · cam = khối đường đơn (thời gian chạy ước tính ở 93 km/h)</text></svg>')
    return ''.join(o), blocks


def main():
    figs = {f: H.read_fig(os.path.join(ROOT, f)) for f in FILES}
    for f, g in figs.items(): TZ.fix_platforms(g, os.path.join(ROOT, f))
    cards = []
    for i, (jp, hira, en, d, f, cx0, kind, (lat, lon)) in enumerate(ST, 1):
        fg = figs[f]
        lab = [t for t in fg['T'] if t['s'] == jp and t['size'] >= 14]
        cx = cx0 if cx0 is not None else lab[0]['x'] + len(jp) * 16 * 0.8 / 2
        a = YC.crop_svg(dict(fig=fg, cx=cx, ox=0), 'orig')
        code, desc = KIND[kind]
        notes = {
            'Jingūji': 'Sơ đồ: đường 1435 mm tách thành hai làn (bắc y=16,5 / nam y=55,6) ngay trước ga, giữa hai làn có các đường 1067 mm (không vẽ trong game) và sân ga. Dự kiến: hai làn 1435 mm, sân ga đảo giữa hai làn.',
            'Kariwano': 'Cùng đoạn đường đôi với Jingūji (hai làn kéo dài tới sau Kariwano rồi nhập lại). Dự kiến: sân ga đảo giữa hai làn.',
            'Mineyoshikawa': 'Ngay sau chỗ hai làn nhập lại thành đường đơn. Sơ đồ: sân ga phía bắc. Dự kiến: một đường, sân ga bắc.',
            'Ugo-Sakai': 'Sơ đồ: có đường nhánh 1435 mm phía nam (y=82, dài ~520 m, ghi 5 đơn vị ≈ 41 m, sẽ kéo dài cho đủ độ dốc 1:9,8). Dự kiến: sân ga bắc kề đường chính + đường nhánh nam.',
            'Ōbarino': 'KHÁC SƠ ĐỒ: sơ đồ có đường nhánh 1435 mm phía BẮC (y=54,6, x 108–221). Theo yêu cầu: một đường + sân ga bắc, không đường nhánh. Cần bạn xác nhận.',
            'Wada': 'Sơ đồ: có đường nhánh nam (y=82, x 241–305). Dự kiến: sân ga bắc + đường nhánh nam.',
            'Yotsugoya': 'KHÁC SƠ ĐỒ: sơ đồ có đoạn đường nhánh 1435 mm ở phía bắc (y=54,6, x 517–531, nối với phần đường 1067 mm). Theo yêu cầu: một đường + sân ga bắc. Cần bạn xác nhận.',
        }.get(en, '')
        cards.append('<div class="card" id="s%d"><div class="hd"><span class="no">%d</span> <b class="jp">%s</b> <span class="hi">%s</span> <span class="en">%s</span> <span class="km">%.1f km từ Omagari (km game %.1f) · %.5f, %.5f</span> <span class="v" style="background:#4169a8">THÊM MỚI</span></div>'
                     '<div class="row3"><div><div class="cap">Sơ đồ gốc (%s)</div>%s</div><div><div class="cap">Dự kiến</div>%s<div class="n"><b>Mã bố cục</b>: %s · %s</div></div><div><div class="cap">Ghi chú</div><div class="n">%s</div></div></div></div>'
                     % (i, i, html.escape(jp), html.escape(hira), html.escape(en), d, OM_KM + d, lat, lon, f.split('/')[1], a, prop_svg(kind), html.escape(code), html.escape(desc), html.escape(notes)))
    ov, blocks = overview()
    css = H.CSS + ' .card{border:1px solid #ccd;border-radius:6px;margin:10px 0;padding:8px;background:#fff}.hd{font-size:15px;margin-bottom:6px}.no{color:#889;font-size:12px}.jp{font-size:18px}.hi,.en,.km{color:#555;margin-left:8px;font-size:13px}.v{color:#fff;padding:1px 8px;border-radius:9px;font-size:12px;margin-left:10px}.row3{display:flex;gap:10px;flex-wrap:wrap}.row3>div{width:300px}.cap{font-size:12px;color:#667;margin-bottom:2px}.n{font-size:12px;color:#444;margin-top:3px}svg.p{border:1px solid #e1e4ea;background:#fafbfc;display:block;max-width:100%}'
    h = ['<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>7 ga Omagari – Akita</title><style>' + css + '</style></head><body>']
    h.append('<h1>Khu gian Omagari – Akita: thêm 7 ga (Jingūji, Kariwano, Mineyoshikawa, Ugo-Sakai, Ōbarino, Wada, Yotsugoya)</h1>')
    h.append('<p class="note">Nguồn: sơ đồ <b>配線略図.net</b> (CC BY 4.0), <code>ou_1/030_12</code>, <code>030_13</code>; khoảng cách từ Omagari và tọa độ: ja.wikipedia 奥羽本線 và trang từng ga [N]; km game = 572,1 + khoảng cách (Akita = 623,8 khớp) [I]. Sơ đồ gốc không theo tỉ lệ giữa các ga; km thật dùng cho game. Bố cục "dự kiến" theo yêu cầu người chơi (23/11/2026), không phải đọc nguyên từ sơ đồ: những chỗ lệch được ghi ở cột ghi chú.</p>')
    h.append('<h2>Toàn khu gian (51,7 km)</h2><div class="scroll">%s</div>' % ov)
    h.append('<p class="note"><b>Khối đường đơn</b> (cam): ' + '; '.join('%.1f km' % (b - a) for a, b in blocks) + '. Hai tàu ngược chiều chỉ tránh nhau ở ga biên khối (chấm đỏ): Jingūji và Kariwano (đoạn đường đôi, hai tàu chạy qua nhau luôn), Ugo-Sakai và Wada (đường nhánh nam), Omagari và Akita. Ba ga một đường (Mineyoshikawa, Ōbarino, Yotsugoya) không tránh được. Thay cho một khối 51,7 km (35 phút), khối dài nhất còn khoảng 13,5 km (~9 phút).</p>')
    h.extend(cards); h.append('</body></html>')
    out = os.path.join(ROOT, 'ou_cards.html'); open(out, 'w', encoding='utf-8').write('\n'.join(h)); print('ghi', out, os.path.getsize(out), 'byte')


if __name__ == '__main__':
    main()
