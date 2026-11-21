# -*- coding: utf-8 -*-
# Trang nghiên cứu ga Fukushima và ngã rẽ sang Yamagata: (1) sơ đồ gốc vẽ lại từ số liệu 配線略図.net (CC BY 4.0), (2) mô hình HIỆN TẠI trong game, (3) bố cục DỰ KIẾN (bản thảo, chưa áp dụng).
# KHÔNG sửa game, KHÔNG sửa SVG gốc. Chạy: python -X utf8 tools/haisen_fukushima.py -> docs/data/haisen/fukushima_plan.html
import sys, os, math, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import haisen_yam_aki as H
import haisen_morioka as MO

ROOT = H.ROOT
ADJ = -4.3
BLUE, TEAL, GRY, RED, ORG = MO.BLUE, MO.TEAL, MO.GRY, MO.RED, MO.ORG
ease, ramp, Plan, crossover = MO.ease, MO.ramp, MO.Plan, MO.crossover

# ---- 2-4-1 (dPdDUuPu) chiều XUỐNG, đúng số liệu Layout.station: x dương = bắc/trái; cửa sổ rẽ ra / nhập lại theo quy tắc chung của layout.js
def tracks_241():
    s = 'dPdDUuPu'; n = len(s); isT = lambda i: s[i] != 'P'
    width = lambda i: 7.2 if (0 < i < n - 1 and isT(i - 1) and isT(i + 1)) else 9.0
    c = [0.0]
    for i in range(1, n): c.append(c[-1] + (4.3 if isT(i) and isT(i - 1) else 1.75 + width(i - 1 if isT(i) else i) / 2))
    ref = s.index('D'); T = []
    for i in range(n):
        if not isT(i): continue
        T.append(dict(i=i, x=-(c[i] - c[ref]), main=s[i] in 'DU', own=s[i].lower() == 'd', c=s[i]))
    for t in T: t['plain'] = 0.0 if t['own'] else ADJ
    outer = sorted([t for t in T if not t['main']], key=lambda t: abs(t['x'] - t['plain']))
    for k, t in enumerate(outer):
        dx = abs(t['x'] - t['plain']); t['len'] = max(40, min(300, 13 * dx + 25)); t['in0'] = 1130 - 85 * k; t['out0'] = 40 + 70 * (len(outer) - 1 - k); t['len2'] = t['len']
    plats = []
    for i in range(n):
        if s[i] == 'P': plats.append((-(c[i] - c[ref]) - width(i) / 2 + 1.75, -(c[i] - c[ref]) + width(i) / 2 - 1.75))
    return T, plats

TR, PL = tracks_241()
def track_x(t, z, ext=False):
    if t['main']: return t['x']
    w = ease(ramp(-t['in0'], -t['in0'] + t['len'], z))
    plain = t['plain']
    if ext and t['i'] in (0, 7):      # phân cấp: đường rìa (0, 7) tách từ đường nhánh sân ga (2, 5) chứ không từ đường chính; phía đông không nhập lại
        par = next(q for q in TR if q['i'] == (2 if t['i'] == 0 else 5)); plain = track_x(par, z, ext)
    else: w *= 1 - ease(ramp(t['out0'], t['out0'] + t['len2'], z))
    return plain + (t['x'] - plain) * w

def draw_tracks(p, z0, z1, ext=False):
    for t in TR:
        col = BLUE if (t['main'] and t['own']) else TEAL if t['main'] else GRY
        p.poly([(z, track_x(t, z, ext)) for z in range(int(z0), int(z1) + 1, 10)], ORG if (ext and t['i'] in (0, 7)) else col, 2.6 if t['main'] else 2.0)
    for xa, xb in PL: p.rect(-420, 20, xa, xb)
    p.text(-200, 9.5, 'sân ga bắc', 10, '#444', 'middle'); p.text(-200, -13.5, 'sân ga nam', 10, '#444', 'middle')
    p.mark(0, 'vạch dừng (z = 0)', '#444')

def station_plans():
    out = []
    cur = Plan(-1700, 1400, 0.3, 3.0, -44, 20, 'ga'); draw_tracks(cur, -1700, 1400)
    crossover(cur, -1300, 'd'); crossover(cur, 720, 'd'); cur.text(-1300, 6, 'X kép', 11, RED); cur.text(720, 6, 'X kép', 11, RED)
    cur.text(-1680, -40, 'mặc định cũ: chữ X kép ở 1300 m trước và 720 m sau vạch dừng (Fukushima chưa dựng lại, mã 2-4-1)', 11, '#555')
    out.append(('Hiện tại trong game (mã 2-4-1, xo mặc định)', cur.svg()))
    new = Plan(-1700, 1400, 0.3, 3.0, -44, 20, 'ga'); draw_tracks(new, -1700, 1400, True)
    crossover(new, -1490, 's'); crossover(new, -1300, 'r'); crossover(new, 720, 'r')
    new.text(500, 17, 'rìa bắc: tách từ đường nhánh, kéo dài → Yamagata', 10, ORG); new.text(500, -23, 'rìa nam: tách từ đường nhánh, kéo dài ← Yamagata', 10, ORG)
    new.text(-1490, 6, 's', 11, RED); new.text(-1300, 6, 'r', 11, RED); new.text(720, 6, 'r', 11, RED)
    new.text(-1680, -40, 'dự kiến: xo = [b s, ext 190], [b r], [a r] theo sơ đồ; hai đường RÌA (cam) tách từ đường nhánh sân ga (phân cấp: chính → nhánh → rìa) và không nhập lại, kéo dài sang đông (theo mô tả của bạn)', 11, '#555')
    out.append(('Dự kiến (mã 2-4-1 giữ nguyên, xo theo sơ đồ)', new.svg()))
    return out

def arc(z0, R, L, n=40, sign=1):
    pts = []
    for i in range(n + 1):
        th = L / R * i / n; pts.append((z0 + R * math.sin(th), sign * R * (1 - math.cos(th))))
    th = L / R
    return pts, (z0 + R * math.sin(th), sign * R * (1 - math.cos(th)), th)


def mini_paths(zt=970, R=1500, tail=700):
    """Dự kiến theo mô tả của người dùng: hai đường rìa (bắc x=15, nam x=-19,3) kéo dài qua ghi đơn r phía đông (z 720-870), cách ~100 m (z=970) thì rẽ bắc thành đường đôi đi Yamagata; đường rìa nam cắt qua hai đường chính để nhập đường đôi."""
    n, N = 40, []
    th_end = 1200 / R
    for i in range(n + 1):
        th = th_end * i / n; N.append((zt + R * math.sin(th), 15 + R * (1 - math.cos(th))))
    ze = N[-1][0]; ye = N[-1][1]
    N += [(ze + tail * math.cos(th_end) * k / 10, ye + tail * math.sin(th_end) * k / 10) for k in range(1, 11)]
    N = [(z, 15) for z in range(-100, zt, 20)] + N
    def ny(z):
        for a, b in zip(N, N[1:]):
            if a[0] <= z <= b[0]: return a[1] + (b[1] - a[1]) * (z - a[0]) / ((b[0] - a[0]) or 1)
        return N[-1][1]
    S = [(z, -19.3) for z in range(-100, zt, 20)]
    for z in range(zt, int(N[-1][0]) + 1, 20): S.append((z, -19.3 + (ny(z) - 4.3 + 19.3) * ease(ramp(zt, zt + 330, z))))
    return N, S

def dbl_cross(p, N, kind, z0, col=RED, ln=150):
    """Ghi đơn chéo giữa hai đường của đoạn đường đôi Yamagata (đường xuống = N, đường lên = N - 4,3 m): s = lên→xuống, r = xuống→lên (theo chiều xuống)."""
    def ny(z):
        for a, b in zip(N, N[1:]):
            if a[0] <= z <= b[0]: return a[1] + (b[1] - a[1]) * (z - a[0]) / ((b[0] - a[0]) or 1)
        return N[-1][1]
    pts = [(z0 + ln * i / 15, ny(z0 + ln * i / 15) - 4.3 * (ease(i / 15) if kind == 'r' else 1 - ease(i / 15))) for i in range(16)]
    p.poly(pts, col, 2.4)

def zoom_plan():
    """Phóng to đoạn ga - nhánh (z -100..2000): chiều ngang 0,5 px/m, chiều dọc 0,9 px/m; khoảng cách đường thật (4,3 m)."""
    p = Plan(-100, 2000, 0.5, 0.9, -34, 215, 'z')
    for x, col, w in [(0, BLUE, 2.6), (ADJ, TEAL, 2.6)]: p.poly([(z, x) for z in range(-100, 2001, 20)], col, w)
    p.rect(-100, 20, 6.05, 13.25); p.rect(-100, 20, -17.55, -10.35)
    p.text(-40, 16, 'sân ga bắc', 10, '#444', 'middle'); p.text(-40, -23, 'sân ga nam', 10, '#444', 'middle')
    for t in TR:
        if t['i'] in (2, 5): p.poly([(z, track_x(t, z)) for z in range(-100, 400, 10)], GRY, 2.0)
    p.mark(0, 'vạch dừng', '#444'); crossover(p, 720, 'r', RED); p.text(730, 6, 'ghi đơn r (xo)', 10, RED)
    N, S = mini_paths(); p.poly(N, ORG, 3); p.poly(S, ORG, 3)
    p.rect(970, 1300, -4.3, 0, '#f8d7da', '#c0392b'); p.text(1135, -9, 'rìa nam cắt ĐỒNG MỨC hai đường chính (không cầu vượt)', 10, '#c0392b', 'middle')
    dbl_cross(p, N, 's', 1400, RED); dbl_cross(p, N, 'r', 1620, RED); p.text(1400, 120, 's', 11, RED); p.text(1620, 150, 'r', 11, RED); p.text(1100, 175, '2 ghi đơn trên đoạn đường đôi Yamagata', 10, RED)
    p.text(500, 22, 'rìa bắc (chiều xuống) rẽ bắc', 10, ORG); p.text(-90, -32, 'rìa nam: chiều lên Yamabiko CHỜ ở đây, Tsubasa từ Yamagata tới ghép; kéo dài sang đông rồi cắt đồng mức hai đường chính', 10, ORG)
    p.text(1500, 205, 'đường đôi đi Yamagata', 10, ORG)
    return p.svg()

def wrap(p, z, y, txt, col, width=100, step=62, size=11):
    import textwrap
    for k, ln in enumerate(textwrap.wrap(txt, width)): p.text(z, y - k * step, ln, size, col)

def branch_plans():
    out = []
    OFF = ADJ * 7
    def base(h0=-60, h1=1100):
        p = Plan(-600, 3200, 0.2, 0.2, h0, h1, 'b')
        p.poly([(z, 0) for z in range(-600, 3201, 50)], BLUE, 2.6); p.poly([(z, OFF) for z in range(-600, 3201, 50)], TEAL, 2.6)
        p.rect(-420, 20, OFF, 0, '#ddd'); p.text(-200, 24, 'Fukushima', 11, '#444', 'middle')
        p.mark(0, 'vạch dừng Fukushima', '#444'); p.mark(720, 'ghi chéo sau ga', '#c0392b')
        return p
    def branch(p, zb, y0, col, w=3, dash=None):
        pts, end = arc(zb, 1500, 1200); pts = [(z, y + y0) for z, y in pts]; th = end[2]
        pts += [(end[0] + 700 * math.cos(th) * k / 10, end[1] + y0 + 700 * math.sin(th) * k / 10) for k in range(1, 11)]; p.poly(pts, col, w, dash)
    cur = base(); z0 = 2000
    branch(cur, z0, 0, ORG); branch(cur, z0, OFF, ORG)
    wrap(cur, -560, 1060, 'HIỆN TẠI: nhánh Yamagata là cặp đường đôi, nối vào CẢ HAI đường chính (km 257,1, tức 2,0 km sau ga, R 1500 m, dài 1,2 km); đường đơn bắt đầu từ km 262,1. Hai đường chính vẽ cách 30 m cho dễ nhìn (thật 4,3 m); cả hai chiều nhánh nằm CÙNG một phía vật lý (trái khi đi xuống, phải khi đi lên).', ORG)
    out.append(('Hiện tại trong game: nhánh là cặp đường đôi nối vào cả hai đường chính, cách ga 2,0 km', cur.svg()))
    new = Plan(-600, 3200, 0.2, 0.2, -60, 1100, 'b')
    new.poly([(z, 0) for z in range(-600, 3201, 50)], BLUE, 2.6); new.poly([(z, ADJ) for z in range(-600, 3201, 50)], TEAL, 2.6)
    new.rect(-420, 20, -8, 0, '#ddd'); new.text(-200, 24, 'Fukushima', 11, '#444', 'middle'); new.mark(0, 'vạch dừng Fukushima', '#444'); new.mark(720, 'ghi chéo sau ga', '#c0392b')
    N, S = mini_paths(); new.poly(N, ORG, 3); new.poly(S, ORG, 3); crossover(new, 720, 'r', RED); dbl_cross(new, N, 's', 1400, RED); dbl_cross(new, N, 'r', 1620, RED); new.text(1400, 200, 's', 11, RED); new.text(1620, 200, 'r', 11, RED)
    wrap(new, -560, 1060, 'DỰ KIẾN (đã chốt hướng): hai đường RÌA của ga, phía tây tách từ đường nhánh sân ga (phân cấp chính → nhánh → rìa), không nhập lại mà kéo dài sang đông qua ghi đơn r ~100 m (z ~ 970 m) rồi rẽ bắc thành đường đôi đi Yamagata (cách ga ~1,0 km). Đường rìa nam cắt ĐỒNG MỨC hai đường chính (không cầu vượt). Sau khi tách khỏi tuyến cha, đường đôi có 2 ghi đơn s, r. Chiều xuống dùng rìa bắc; chiều lên Yamabiko chờ ở rìa nam để Tsubasa tới ghép. Không dựng Ou Line. Đường đơn vẫn từ km 262,1.', ORG)
    out.append(('Dự kiến (bản thảo theo mô tả của bạn): đường rìa hai bên kéo dài, rẽ thành đường đôi đi Yamagata', new.svg()))
    out.append(('Phóng to đoạn ghi đơn phía đông đến chỗ rẽ và hai ghi đơn trên đường đôi (z -100..2000 m; chiều dọc 0,9 px/m, ngang 0,5 px/m)', zoom_plan()))
    return out

def orig_svg(fn, x0, x1, y0, y1, extra):
    fig = H.read_fig(os.path.join(ROOT, fn)); out = []; H.draw_fig(fig, 0, 0, out)
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%d %d %d %d" width="%d" class="plan"><rect x="%d" y="%d" width="%d" height="%d" fill="#fff"/>%s%s</svg>' % (x0, y0, x1 - x0, y1 - y0, (x1 - x0) * 1.8, x0, y0, x1 - x0, y1 - y0, ''.join(out), extra)

def main():
    h = ['<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fukushima và ngã rẽ Yamagata: bản thảo</title><style>' + MO.CSS + '</style></head><body>']
    h.append('<h1>Ga Fukushima và ngã rẽ sang Yamagata: sơ đồ gốc, hiện tại trong game, dự kiến</h1>')
    h.append('<p class="note">Nguồn sơ đồ: <b>配線略図.net</b> (CC BY 4.0, https://www.haisenryakuzu.net/), hình <code>ou_1/030_01</code> và <code>tohoku/010_05</code>; vẽ lại từ số liệu, không nhúng/sửa SVG gốc. Phần "hiện tại" lấy từ <code>layout.js</code> (mã 2-4-1, xo mặc định) và <code>LINE_META.junctions</code>. Phần "dự kiến" là <b>bản thảo, CHƯA áp dụng vào game</b>. Không theo tỉ lệ: hình ga kéo giãn chiều ngang (1 m ngang ≈ 3 px); hình nhánh theo tỉ lệ ngang 0,2 px/m cả hai trục.</p>')
    h.append('<h2>1. Fukushima trong sơ đồ gốc</h2>')
    ex = (MO.box(206, 120, 290, 150, '#2ecc71') + MO.note(248, 112, 'sân ga đảo bắc', '#1e8449', 'middle') + MO.box(206, 178, 290, 204, '#2ecc71') + MO.note(248, 214, 'sân ga đảo nam', '#1e8449', 'middle')
          + MO.box(160, 150, 195, 177, '#c0392b') + MO.note(178, 190, 's + r', '#c0392b', 'middle') + MO.box(300, 150, 316, 177, '#c0392b') + MO.note(308, 190, 'r', '#c0392b', 'middle')
          + MO.box(340, 40, 395, 205) + MO.note(300, 30, 'hai đường mini cắt qua hai đường chính, lên Yamagata (A) ▲', '#d35400')
          + MO.box(210, 255, 335, 280, '#8e44ad') + MO.note(215, 250, 'đường 1435 mm từ ga tuyến thường (Ou Line), game không dựng', '#8e44ad'))
    h.append('<div class="cmp"><h3>ou_1/030_01 (Fukushima, trang Ou Main Line)</h3><div class="scroll">%s</div></div>' % orig_svg('ou_1/030_01.svg', 0, 580, 0, 370, ex))
    h.append('<div class="cmp"><h3>tohoku/010_05 (Fukushima, trang Tohoku Shinkansen; đối chiếu)</h3><div class="scroll">%s</div></div>' % orig_svg('tohoku/010_05.svg', 0, 710, 0, 245, ''))
    h.append('<p class="note"><b>Đọc sơ đồ:</b> (a) ga Shinkansen có <b>6 đường</b>: hai đường chính ở giữa (y 154,6 chiều xuống ở phía bắc, y 172,3 chiều lên) và <b>hai sân ga đảo</b>, mỗi sân giữa hai đường ngoài (y 126,7 / 145,0 phía bắc; y 181,5 / 199,7 phía nam) → khớp mã <code>2-4-1</code> (<code>dPdDUuPu</code>) của game. '
             '(b) Phía tây (trước ga theo chiều xuống): <b>hai ghi đơn liền nhau giữa hai đường chính</b>, s rồi r (x 167–177 và 182–192, khoảng cách điểm đầu ≈ 15 đơn vị ≈ 120 m [I]), cộng thang nối các đường ngoài. Phía đông (sau ga): <b>một ghi đơn r</b> (x 304,8–314,6) và thang nối đường ngoài. '
             '(c) <b>Nhánh Yamagata có hai đường mini</b> (x 349 và 358,9): rời đường ngoài phía NAM ở phía đông ga (x 290–305), chạy song song rồi <b>vượt qua hai đường chính sang phía bắc</b> ở x 349–359 và đi lên điểm nối <b>A</b> (hình 030_02). Một đường nữa lên từ y 263,5 (đường 1435 mm của ga tuyến thường). '
             '(d) Vị trí tính theo 8,15 m/đơn vị: nhánh cắt đường chính ở z ≈ +620…+700 m sau vạch dừng, còn game đặt nhánh ở km 257,1 (2,0 km) [I].</p>')
    h.append('<h2>2. Ga Fukushima: hiện tại và dự kiến</h2>')
    for t, svg in station_plans(): h.append('<div class="cmp"><h3>%s</h3><div class="scroll">%s</div></div>' % (html.escape(t), svg))
    h.append('<h2>3. Ngã rẽ sang Yamagata: hiện tại và dự kiến</h2>')
    for t, svg in branch_plans(): h.append('<div class="cmp"><h3>%s</h3><div class="scroll">%s</div></div>' % (html.escape(t), svg))
    h.append('<h2>4. Tóm tắt khác biệt và điểm cần bạn quyết</h2><table><tr><th>Hạng mục</th><th>Hiện tại trong game</th><th>Sơ đồ gốc</th><th>Dự kiến</th></tr>'
             '<tr><td>Mã bố trí Fukushima</td><td>2-4-1</td><td>dPdDUuPu (khớp)</td><td>giữ nguyên</td></tr>'
             '<tr><td>Ghi chéo phía tây (trước ga)</td><td>X kép (mặc định)</td><td>hai ghi đơn liền nhau: s rồi r</td><td><code>[b,s,None,190]</code>, <code>[b,r]</code> (xa trước, gần sau)</td></tr>'
             '<tr><td>Ghi chéo phía đông (sau ga)</td><td>X kép (mặc định)</td><td>một ghi đơn r</td><td><code>[a,r]</code></td></tr>'
             '<tr><td>Nhánh Yamagata</td><td>cặp đường đôi nối vào <b>cả hai đường chính</b>, km 257,1 (cách ga 2,0 km), R 1500 m</td><td>mini rời <b>đường ngoài phía nam</b> sau ga, cắt qua hai đường chính sang bắc (cách ga ≈ 0,6–0,7 km ước tính)</td><td><b>Đã chốt hướng:</b> hai đường rìa (bắc, nam) kéo dài sang đông, qua ghi đơn r ~100 m (z ≈ 970 m) rẽ bắc thành đường đôi; chiều xuống dùng rìa bắc, chiều lên vào rìa nam</td></tr>'
             '<tr><td>Ga tuyến thường (Ou Line)</td><td>không có</td><td>có, phía nam; một đường mini đi lên từ đó</td><td>không dựng (đúng yêu cầu)</td></tr></table>')
    h.append('<h3>Đã chốt (chờ lệnh làm)</h3><ol><li><b>Vị trí rẽ:</b> đường đôi bắt đầu cách ga ~1,0 km (z ≈ 970 m; hiện km 257,1 là 2,0 km, đổi thành khoảng km 256,1). Đường đơn vẫn từ km 262,1.</li>'
             '<li><b>Không cầu vượt:</b> đường rìa nam cắt đồng mức hai đường chính (z ≈ 970–1300 m); cần cơ chế như nút giao Takasaki (hai ghi cắt đường chính).</li>'
             '<li><b>Mã bố cục riêng</b> cho Fukushima (đề xuất <code>2-4-1f</code>): phía tây phân cấp chính → nhánh → rìa; phía đông đường nhánh nhập lại, đường rìa kéo dài.</li>'
             '<li><b>Chiều lên:</b> Yamabiko chờ ở <b>đường rìa nhánh phía nam</b> ga để Tsubasa từ Yamagata tới ghép; Tsubasa đi vào cùng đường rìa này.</li>'
             '<li><b>Hai ghi đơn</b> (s rồi r) trên đoạn đường đôi Yamagata, sau khi tách khỏi tuyến cha (z ≈ 1400 và 1620 m, cách nhau 220 m).</li>'
             '<li><b>Không dựng</b> Ou Line / ga tuyến thường.</li></ol><p class="note">Còn lại cần tôi tự chọn khi làm: vị trí chính xác hai ghi đơn trên đường đôi (đang đặt ở z 1400 và 1620 m, đoạn đã thẳng song song) và cách đường đơn từ km 262,1 gặp lại đường đôi; hai ghi này chưa có trong sơ đồ gốc nên tôi coi là [I].</p>')
    h.append('<p><b>Đã áp dụng vào game (22/11/2026), khác mockup:</b> đường rìa nam hội tụ về đôi đường trên <b>600 m</b> (mockup 330 m, quá gắt); hai ghi đơn trên đoạn đường đôi ở z ≈ <b>1700 / 1900 m</b> (mockup 1400 / 1620 m, vì đôi đường hội tụ muộn hơn); ghi nối rìa ↔ nhánh dài 164 m. Chi tiết <code>docs/14</code> §8e.</p>')
    h.append('</body></html>')
    out = os.path.join(ROOT, 'fukushima_plan.html'); open(out, 'w', encoding='utf-8').write('\n'.join(h)); print('ghi', out, os.path.getsize(out), 'byte')

if __name__ == '__main__': main()
