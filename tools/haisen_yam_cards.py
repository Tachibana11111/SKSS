# -*- coding: utf-8 -*-
# Thẻ từng ga tuyến Yamagata (Sasakino → Shinjo, 34 ga, không có Fukushima và Kita-Akayu): mỗi thẻ có ba khung cạnh nhau
#   A. sơ đồ gốc 配線略図.net (CC BY 4.0) cắt quanh ga (vẽ lại từ số liệu, không nhúng SVG);
#   B. DỰ KIẾN: với 10 ga đã phân tích có token layout rút từ sơ đồ (docs/data/haisen/yam_aki_draft.html); ga còn lại chỉ có bản rút gọn ray 1435 mm tự đọc từ hình (chưa phải thiết kế, ghi rõ);
#   C. TRONG GAME: hình học thật của game (docs/data/haisen/yam_game.json) hoặc khung nét đứt "chưa có".
# Chạy: python -X utf8 tools/haisen_yam_cards.py -> docs/data/haisen/yam_cards.html. KHÔNG sửa game.
import sys, os, json, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import haisen_yam_aki as H
import haisen_yam_chart as C

PLAN = {   # token chiều XUỐNG đọc từ sơ đồ (yam_aki_draft.html), kết luận so với mã game
    '米沢': ('ddPuu', 'XEM LẠI', 'sơ đồ: đường thẳng không kề sân ga, ba đường ga, một sân ga đảo (ddPuu); mã game 2-3-0 là PduPu'),
    '高畠': ('PduP', 'SỬA', 'sơ đồ: hai sân ga BÊN (phía bắc đường thẳng, phía nam đường tránh); game 1-2-0 là một sân ga đảo'),
    '赤湯': ('PddPuP', 'SỬA', 'sơ đồ: ba sân ga (bên bắc, đảo giữa, bên nam); game 2-3-0 chỉ có hai; có nhánh Flower Nagai Line'),
    'かみのやま温泉': ('PduPu', 'GIỮ', 'khớp mã 2-3-0; chỉ thiếu xo (ghi chéo ~160 m trước và sau ga)'),
    '山形': ('dPduPu', 'GIỮ', 'khớp mã 2-4-0; thiếu xo (ba ghi chéo phía tây); kèm depot và nhánh Aterazawa/Senzan (không dựng)'),
    '天童': ('dPduP', 'SỬA', 'sơ đồ: sân ga đảo ở phía BẮC; game 2-3-0 (PduPu) đặt sân ga đảo phía nam'),
    'さくらんぼ東根': ('PduP', 'SỬA', 'sơ đồ: hai sân ga bên; game 1-2-0 là sân ga đảo'),
    '村山': ('dPduP', 'SỬA', 'sơ đồ dPduP; game 2-3-0 (PduPu)'),
    '大石田': ('PdPu', 'SỬA', 'sơ đồ: một sân ga bên + một sân ga đảo; game 1-2-0'),
    '新庄': ('PduP', 'SỬA', 'ga cuối: hai đường cụt, hai sân ga bên; game 2-3-0'),
}
COL = {'GIỮ': '#2e8b57', 'SỬA': '#d98a00', 'XEM LẠI': '#b8860b', 'THÊM MỚI': '#4169a8'}

def token_svg(tok, w=300, h=190):
    rows = []; y = 22
    for ch in tok:
        if ch == 'P': rows.append(('P', y, 16)); y += 20
        else: rows.append((ch, y, 0)); y += 22
    hh = max(h, y + 10); out = ['<svg viewBox="0 0 %d %d" width="%d" height="%d" class="p">' % (w, hh, w, hh)]
    for ch, yy, _ in rows:
        if ch == 'P': out.append('<rect x="60" y="%d" width="190" height="14" fill="#e8eef6" stroke="#44607f"/><text x="150" y="%d" font-size="9" text-anchor="middle" fill="#44607f">sân ga</text>' % (yy - 7, yy + 3))
        else:
            col = {'d': '#2a7fd0', 'D': '#0b4f96', 'u': '#17a589', 'U': '#0e6b5a'}.get(ch, '#555')
            out.append('<line x1="25" y1="%d" x2="275" y2="%d" stroke="%s" stroke-width="2.6"/><text x="8" y="%d" font-size="10" fill="%s">%s</text>' % (yy, yy, col, yy + 4, col, ch))
    out.append('<text x="150" y="%d" font-size="9" fill="#777" text-anchor="middle">token chiều XUỐNG (trên = bắc)</text></svg>' % (hh - 3)); return ''.join(out)

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

def platforms(f):
    """Sân ga của một hình: hộp lớn (viền 1,5) giữ nguyên; sân ga vẽ bằng một vạch mảnh (cạnh xa, xem README) dựng thành hộp cao 8,2 đơn vị nằm về phía đường ray gần nhất. Bỏ các ô vuông nhỏ (viền 0,8: depot, tàu địa phương, nhà ga...)."""
    hs = [l for l in f['L'] if l['c'] == H.BLUE and abs(l['y1'] - l['y2']) < .3]
    out = []
    for r in f['R']:
        if r['sw'] in ('1.5', '1.5px') or (r['sw'] == '.8' and r['w'] >= 40): out.append(dict(x=r['x'], y=r['y'], w=r['w'], h=r['h'], kind='box'))      # hộp viền 0,8 rộng ≥ 40 là sân ga (Shinjo); hộp nhỏ hơn là depot/nhà ga/tàu địa phương: bỏ
        elif r['sw'] == 'thin':
            near = [l for l in hs if min(l['x1'], l['x2']) < r['x'] + r['w'] and max(l['x1'], l['x2']) > r['x']]
            ty = min((l['y1'] for l in near), key=lambda y: abs(y - r['y'])) if near else r['y'] + 10
            hh = max(4.0, min(10.0, abs(ty - r['y']) - 2.5))      # từ cạnh xa tới ray gần nhất (chừa 2,5 đơn vị), cao 4–10
            out.append(dict(x=r['x'], y=(r['y'] if ty > r['y'] else r['y'] - hh + 1.6), w=r['w'], h=hh, kind='edge'))
    return out

def crop_svg(c, mode, w=300, h=190):
    f = c['fig']; cx = c['cx'] - c['ox']; half = 105      # tâm khung = tâm nhãn kanji của ga (tâm sân ga tự dò có thể nhầm sang ga bên cạnh)
    ys = [v for l in f['L'] for v in (l['y1'], l['y2']) if cx - half <= (l['x1'] if abs(l['x1'] - cx) < abs(l['x2'] - cx) else l['x2']) <= cx + half and l['c'] in (H.BLUE, H.GREY)] or [0, 100]
    ylo, yhi = min(ys) - 28, max(ys) + 22
    out = []
    if mode == 'orig':
        g = dict(L=f['L'], T=f['T'], R=[r for r in f['R'] if r['sw'] in ('1.5', '1.5px', 'thin') or (r['sw'] == '.8' and r['w'] >= 40)]); H.draw_fig(g, 0, 0, out)      # bỏ ô vuông nhỏ (depot, tàu địa phương)
    else:
        for l in f['L']:
            if l['c'] == H.BLUE: out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="2.4" %s/>' % (l['x1'], l['y1'], l['x2'], l['y2'], '#0b5cad' if mode == 'clean' else '#8aa0bb', '' if mode == 'clean' else 'stroke-dasharray="6 4"'))
        for r in platforms(f):
            if abs(r['x'] + r['w'] / 2 - cx) > 60: continue      # chỉ sân ga của chính ga này (không lấy sân ga ga bên cạnh lọt vào khung)
            out.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" stroke="#44607f" stroke-width="1.2" %s/>' % (r['x'], r['y'], r['w'], r['h'], '#e8eef6' if mode == 'clean' else 'none', '' if mode == 'clean' else 'stroke-dasharray="4 3"'))
    return '<svg viewBox="%.0f %.0f %d %.0f" width="%d" height="%d" class="p" preserveAspectRatio="xMidYMid meet"><rect x="%.0f" y="%.0f" width="%d" height="%.0f" fill="#fff"/>%s</svg>' % (cx - half, ylo, 2 * half, yhi - ylo, w, h, cx - half, ylo, 2 * half, yhi - ylo, ''.join(out))

def main():
    figs, pos = H.place(C.FILES, C.ROOT); cen = C.label_centres(figs, pos)
    cards = []
    for s in C.ST:
        if s['jp'] == '福島' or s['jp'] not in cen: continue
        c = cen[s['jp']]; g = C.GAME.get(s['jp']); plan = PLAN.get(s['jp'])
        verdict = (plan[1] if plan else 'THÊM MỚI')
        a = crop_svg(c, 'orig')
        if plan: b = token_svg(plan[0]); bnote = '<b>Dự kiến</b> theo sơ đồ: token <code>%s</code>. %s' % (plan[0], html.escape(plan[2]))
        else: b = crop_svg(c, 'clean'); bnote = '<b>Chưa có thiết kế</b>: chỉ là ray 1435 mm rút gọn tự đọc từ hình gốc; chưa xác định token layout (cần đọc sơ đồ).'
        cc = game_svg(g) if g else crop_svg(c, 'dash')
        cnote = ('<b>Trong game</b>: mã <code>%s</code>, %d đường, %d sân ga' % (g['lay'], len(g['tracks']), len(g['plats']))) if g else '<b>Chưa có trong game</b> (khung nét đứt = cấu trúc theo sơ đồ).'
        note = ' <span class="warn">Osawa đang tạm ngừng khai thác (2024).</span>' if s['jp'] == '大沢' else ''
        cards.append('<div class="card" id="s%d"><div class="hd"><span class="no">%d</span> <b class="jp">%s</b> <span class="hi">%s</span> <span class="en">%s</span> <span class="km">%.1f km (km game %.1f)</span> <span class="v" style="background:%s">%s</span>%s</div><div class="row3"><div><div class="cap">Sơ đồ gốc (%s)</div>%s</div><div><div class="cap">Dự kiến</div>%s<div class="n">%s</div></div><div><div class="cap">Trong game</div>%s<div class="n">%s</div></div></div></div>' % (s['order'], s['order'], html.escape(s['jp']), html.escape(s['hira']), html.escape(s['en']), s['kmFromFukushima'], s['gameKm'], COL[verdict], verdict, note, 'ou_1', a, b, bnote, cc, cnote))
    cnt = {}
    for s in C.ST:
        if s['jp'] == '福島': continue
        v = PLAN[s['jp']][1] if s['jp'] in PLAN else 'THÊM MỚI'; cnt[v] = cnt.get(v, 0) + 1
    css = H.CSS + ' .card{border:1px solid #ccd;border-radius:6px;margin:10px 0;padding:8px;background:#fff}.hd{font-size:15px;margin-bottom:6px}.no{color:#889;font-size:12px}.jp{font-size:18px}.hi,.en,.km{color:#555;margin-left:8px;font-size:13px}.v{color:#fff;padding:1px 8px;border-radius:9px;font-size:12px;margin-left:10px}.row3{display:flex;gap:10px;flex-wrap:wrap}.row3>div{width:300px}.cap{font-size:12px;color:#667;margin-bottom:2px}.n{font-size:12px;color:#444;margin-top:3px}svg.p{border:1px solid #e1e4ea;background:#fafbfc;display:block}.warn{color:#b03;font-size:12px;margin-left:8px}'
    h = ['<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thẻ ga tuyến Yamagata</title><style>' + css + '</style></head><body>']
    h.append('<h1>Tuyến Yamagata: thẻ từng ga (Sasakino → Shinjo, 34 ga)</h1>')
    h.append('<p class="note">Nguồn: <b>配線略図.net</b> (CC BY 4.0), <code>ou_1/030_02–030_08</code>; danh sách ga/km/romaji: <code>docs/data/yam_stations.json</code>. Không có Fukushima (đã dựng) và Kita-Akayu (tín hiệu trường). Tổng kết: %s. Mười ga có bản dự kiến (token đọc từ sơ đồ); 24 ga còn lại <b>chưa có thiết kế</b>, khung "Dự kiến" chỉ là ray rút gọn. Khung "Trong game": ga chưa có vẽ nét đứt.</p>' % ', '.join('%s: %d' % (k, v) for k, v in cnt.items()))
    h.extend(cards); h.append('</body></html>')
    out = os.path.join(C.ROOT, 'yam_cards.html'); open(out, 'w', encoding='utf-8').write('\n'.join(h)); print('ghi', out, os.path.getsize(out), 'byte', cnt)

if __name__ == '__main__': main()
