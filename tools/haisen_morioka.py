# -*- coding: utf-8 -*-
# Trang nghiên cứu ga Morioka và ngã rẽ sang Akita: (1) sơ đồ gốc vẽ lại từ số liệu 配線略図.net (CC BY 4.0), (2) mô hình HIỆN TẠI trong game, (3) bố cục DỰ KIẾN.
# KHÔNG sửa game, KHÔNG sửa SVG gốc. Chạy: python -X utf8 tools/haisen_morioka.py -> docs/data/haisen/morioka_plan.html
import sys, os, math, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import haisen_yam_aki as H

ROOT = H.ROOT
M_U = 8.15                         # m / đơn vị sơ đồ
ADJ, TRK = -4.3, 4.3               # layout.js: đường chính lên cách đường chính xuống 4,3 m
BLUE, TEAL, GRY, RED, ORG = '#1f77b4', '#17a589', '#7f8c8d', '#c0392b', '#e67e22'

def ease(u): u = max(0.0, min(1.0, u)); return u * u * (3 - 2 * u)
def ramp(a, b, z): return max(0.0, min(1.0, (z - a) / (b - a)))

# ---- 2-4-0 chiều XUỐNG (đúng số liệu Layout.station('2-4-0', 'down')): toạ độ ngang (m, dương = bắc/trái), cửa sổ rẽ ra / nhập lại
TRACKS = [dict(name='đường ngoài bắc', x=10.7, main=False, in0=1130, len=164.1, out0=110, len2=164.1, col=GRY),
          dict(name='đường chính xuống', x=0.0, main=True, col=BLUE),
          dict(name='đường chính lên', x=-4.3, main=True, col=TEAL),
          dict(name='đường ngoài nam', x=-15.0, main=False, in0=1045, len=164.1, out0=40, len2=164.1, col=GRY)]
PLATS = [(1.75, 8.95), (-13.25, -6.05)]          # sân ga: -420 .. +20 m so với vạch dừng

def track_x(t, z):
    if t['main']: return t['x']
    w = ease(ramp(-t['in0'], -t['in0'] + t['len'], z)) * (1 - ease(ramp(t['out0'], t['out0'] + t['len2'], z)))
    plain = ADJ                                   # đường ngoài nam tách từ đường chính lên; đường ngoài bắc tách từ đường chính xuống (plain 0)
    plain = 0.0 if t['x'] > 0 else ADJ
    return plain + (t['x'] - plain) * w

class Plan:
    def __init__(self, z0, z1, sx, sy, y0, y1, title):
        self.z0, self.z1, self.sx, self.sy, self.y0, self.y1, self.el = z0, z1, sx, sy, y0, y1, []; self.title = title
    def X(self, z): return (z - self.z0) * self.sx + 40
    def Y(self, x): return (self.y1 - x) * self.sy + 28          # x mô hình (m, dương = bắc) -> px (bắc ở trên)
    def poly(self, pts, col, w=2.6, dash=None, op=1):
        d = ' '.join('%.1f,%.1f' % (self.X(z), self.Y(x)) for z, x in pts)
        self.el.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="%s" opacity="%s"%s stroke-linejoin="round"/>' % (d, col, w, op, ' stroke-dasharray="%s"' % dash if dash else ''))
    def rect(self, z0, z1, xa, xb, fill='#ddd', stroke='#222'):
        self.el.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" stroke="%s" stroke-width="1"/>' % (self.X(z0), self.Y(xb), (z1 - z0) * self.sx, (xb - xa) * self.sy, fill, stroke))
    def text(self, z, x, s, size=11, col='#222', anchor='start', dy=0):
        self.el.append('<text x="%.1f" y="%.1f" font-size="%s" fill="%s" text-anchor="%s">%s</text>' % (self.X(z), self.Y(x) + dy, size, col, anchor, html.escape(s)))
    def mark(self, z, label, col='#888'):
        self.el.append('<line x1="%.1f" y1="14" x2="%.1f" y2="%.1f" stroke="%s" stroke-dasharray="3 3"/><text x="%.1f" y="12" font-size="10" fill="%s" text-anchor="middle">%s</text>' % (self.X(z), self.X(z), (self.y1 - self.y0) * self.sy + 40, col, self.X(z), col, html.escape(label)))
    def svg(self):
        W = (self.z1 - self.z0) * self.sx + 80; Hh = (self.y1 - self.y0) * self.sy + 56
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.0f %.0f" width="%.0f" class="plan"><rect width="100%%" height="100%%" fill="#fff"/>%s</svg>' % (W, Hh, W, ''.join(self.el))

def draw_tracks(p, z0, z1):
    for t in TRACKS:
        p.poly([(z, track_x(t, z)) for z in range(int(z0), int(z1) + 1, 10)], t['col'], 2.6 if t['main'] else 2.2)
    for xa, xb in PLATS: p.rect(-420, 20, xa, xb)
    p.text(-200, 11.5, 'sân ga', 10, '#444', 'middle'); p.text(-200, -17.5, 'sân ga', 10, '#444', 'middle')
    p.mark(0, 'vạch dừng (z = 0)', '#444')

def crossover(p, z, kind, col=RED):
    """Ghi chéo giữa đường chính xuống (x=0, bắc) và đường chính lên (x=-4,3); dài 150 m; s: lên→xuống theo chiều chạy, r: xuống→lên, d: cả hai (X kép)."""
    S = lambda u: ease(u)
    pts = lambda f: [(z + 150 * i / 15, f(i / 15)) for i in range(16)]
    if kind in ('d', 's'): p.poly(pts(lambda u: ADJ * (1 - S(u))), col, 2.4)
    if kind in ('d', 'r'): p.poly(pts(lambda u: ADJ * S(u)), col, 2.4)

def build_station_plans():
    out = []
    cur = Plan(-1500, 1400, 0.3, 3.2, -18, 14, 'ga')
    draw_tracks(cur, -1500, 1400)
    crossover(cur, -1300, 'd'); crossover(cur, 720, 'd')
    cur.text(-1300, 6, 'X kép', 11, RED); cur.text(720, 6, 'X kép', 11, RED)
    cur.text(-1480, -26.5, 'mặc định cũ: chữ X kép ở 1300 m trước và 720 m sau vạch dừng (Morioka chưa dựng lại)', 11, '#555')
    out.append(('Hiện tại trong game (mã 2-4-0, xo mặc định)', cur.svg()))
    new = Plan(-1500, 1400, 0.3, 3.2, -18, 14, 'ga')
    draw_tracks(new, -1500, 1400)
    crossover(new, -1300, 'd'); crossover(new, 720, 's'); crossover(new, 910, 'r')
    new.text(-1300, 6, 'X kép', 11, RED); new.text(720, 6, 's', 11, RED); new.text(910, 6, 'r', 11, RED)
    new.text(-1480, -26.5, 'dự kiến: xo = [b d], [a s], [a r, ext 190] theo sơ đồ; giữ vị trí cũ 1300 / 720 m vì ga có đường ngoài (quy tắc như Oyama, Sendai)', 11, '#555')
    out.append(('Dự kiến (mã 2-4-0 giữ nguyên, xo theo sơ đồ)', new.svg()))
    return out

def arc(z0, R, L, n=40, sign=1):
    pts = []
    for i in range(n + 1):
        th = L / R * i / n
        pts.append((z0 + R * math.sin(th), sign * R * (1 - math.cos(th))))
    th = L / R
    return pts, (z0 + R * math.sin(th), sign * R * (1 - math.cos(th)), th)

def build_branch_plans():
    out = []
    OFF = ADJ * 7                                   # đường chính lên vẽ cách 30 m cho dễ nhìn (thật 4,3 m)
    def base():
        p = Plan(-600, 4000, 0.17, 0.17, -120, 1000, 'b')
        p.poly([(z, 0) for z in range(-600, 4001, 50)], BLUE, 2.6)
        p.poly([(z, OFF) for z in range(-600, 4001, 50)], TEAL, 2.6)
        p.rect(-420, 20, OFF, 0, '#ddd'); p.text(-200, 28, 'Morioka', 11, '#444', 'middle')
        p.mark(0, 'vạch dừng Morioka', '#444'); p.mark(720, 'ghi chéo sau ga', '#c0392b')
        return p
    def branch(p, zb, y0, col, w=3, dash=None):
        pts, end = arc(zb, 1500, 1200, sign=1); pts = [(z, y + y0) for z, y in pts]
        th = end[2]; pts += [(end[0] + 700 * math.cos(th) * k / 10, end[1] + y0 + 700 * math.sin(th) * k / 10) for k in range(1, 11)]
        p.poly(pts, col, w, dash)
    # --- hiện tại: CẶP đường nhánh (cả hai đường chính) cùng rẽ ra ở km 498,5 (2,0 km sau ga), R 1500 m, dài 1,2 km
    cur = base(); z0 = 2000
    branch(cur, z0, 0, ORG); branch(cur, z0, OFF, ORG)
    cur.text(-560, 440, 'HIỆN TẠI: nhánh Akita là cặp đường đôi, nối vào CẢ HAI đường chính: đường chính xuống rẽ thành đường trái, đường chính lên rẽ thành đường phải của cặp nhánh', 11, ORG)
    cur.text(-560, 360, 'km 498,5 (2,0 km sau ga), R 1500 m, dài 1,2 km; cả hai chiều nhánh nằm CÙNG một phía vật lý (code: trái khi đi xuống, phải khi đi lên; kiểm trên minimap)', 11, '#555')
    cur.text(-560, -95, 'Kiểm tra trong game (minimap, 21/11/2026): chiều xuống và chiều lên đều thấy hai ray song song rẽ ra cùng phía. Hai đường chính vẽ cách 30 m cho dễ nhìn (thật 4,3 m).', 11, '#555')
    out.append(('Hiện tại trong game: nhánh là cặp đường đôi nối vào cả hai đường chính', cur.svg()))
    # --- dự kiến: chỉ MỘT đường nhánh rẽ khỏi đường chính xuống, ngay sau cặp ghi chéo (hình tazawako/010_05: ~160 m sau ghi r)
    new = base(); zb = 2000                    # ĐÃ CHỐT (21/11/2026): giữ nhánh cách ga 2,0 km
    crossover(new, 720, 's', RED); crossover(new, 910, 'r', RED)
    new.text(720, 14, 's', 11, RED); new.text(910, 14, 'r', 11, RED)
    branch(new, zb, 0, ORG)
    # chiều LÊN: tàu mini đi trên đường chính xuống (làn ngược chiều) rồi qua ghi chéo đơn ('s', gần ga) sang đường chính lên, vào đường ngoài bên trái (phía nam) của ga
    zc = 720
    up = [(zb + 300, 0)] + [(z, 0) for z in range(int(zb), zc + 150, -20)]
    new.poly(up, ORG, 2.2, '7 4')
    x_cross = [(zc + 150 - 150 * i / 15, OFF * ease(i / 15)) for i in range(16)]
    new.poly(x_cross, ORG, 2.2, '7 4')
    new.poly([(zc, OFF), (zc - 400, OFF), (zc - 560, -33), (zc - 1330, -33)], ORG, 2.2, '7 4')
    new.text(-560, 440, 'DỰ KIẾN: chỉ MỘT đường nhánh, gắn vào đường chính xuống; giữ cách ga 2,0 km (đã chốt 21/11/2026)', 11, ORG)
    new.text(-560, 360, 'chiều LÊN (nét đứt cam): tàu mini nhập đường chính XUỐNG (làn ngược chiều), qua ghi chéo đơn s (ghi gần ga của cặp s + r) sang đường chính lên rồi vào đường ngoài bên trái (phía nam) để ghép với Tohoku', 11, '#555')
    new.text(-560, -95, 'Khoảng cách 2,0 km giữ nguyên theo quyết định của bạn; sơ đồ vẽ nhánh sát cặp ghi chéo nhưng hình bị nén, không theo tỉ lệ.', 11, '#555')
    out.append(('Dự kiến: một đường nhánh gắn vào đường chính xuống; chiều lên đi làn ngược rồi qua ghi chéo đơn', new.svg()))
    return out

def orig_svg(fn, x0, x1, extra, h=None):
    fig = H.read_fig(os.path.join(ROOT, fn)); out = []; H.draw_fig(fig, 0, 0, out)
    ys = [max(l['y1'], l['y2']) for l in fig['L']]; hh = h or (max(ys) + 40)
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%d -36 %d %d" width="%d" class="plan"><rect x="%d" y="-36" width="%d" height="%d" fill="#fff"/>%s%s</svg>' % (x0, x1 - x0, hh + 36, (x1 - x0) * 1.8, x0, x1 - x0, hh + 36, ''.join(out), extra)

def note(x, y, s, col='#c0392b', anchor='start'): return '<text x="%s" y="%s" font-size="9" font-weight="bold" fill="%s" text-anchor="%s">%s</text>' % (x, y, col, anchor, html.escape(s))
def box(x0, y0, x1, y1, col='#e67e22'): return '<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity=".16" stroke="%s" stroke-dasharray="3 2"/>' % (x0, y0, x1 - x0, y1 - y0, col, col)

CSS = H.CSS + ' .plan{display:block;max-width:100%;height:auto}.cmp{margin:6px 0 18px}.cmp h3{font-size:14px;margin:10px 0 2px}'

def main():
    h = ['<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Morioka và ngã rẽ Akita: bản thảo</title><style>' + CSS + '</style></head><body>']
    h.append('<h1>Ga Morioka và ngã rẽ sang Akita: sơ đồ gốc, hiện tại trong game, dự kiến</h1>')
    h.append('<p class="note">Nguồn sơ đồ: <b>配線略図.net</b> (CC BY 4.0, https://www.haisenryakuzu.net/), hình <code>tohoku/020_10</code> và <code>tazawako/010_05</code>; vẽ lại từ số liệu, không nhúng/sửa SVG gốc. Phần "hiện tại" lấy từ <code>layout.js</code> (mã 2-4-0, xo mặc định) và <code>LINE_META.junctions</code>. Phần "dự kiến" <b>đã được áp dụng vào game ngày 21/11/2026</b> (xem <code>docs/14</code> §8d). Không theo tỉ lệ: các hình ga ở đây kéo giãn chiều ngang (1 m ngang ≈ 3,2 px); hình nhánh theo tỉ lệ thật.</p>')
    h.append('<h2>1. Morioka trong sơ đồ gốc</h2>')
    # tohoku/020_10: hai đường chính y=108,1 (xuống, bắc) / 126,8 (lên); sân ga x 34,4–88,5; X tây x 4,9–14,8; cặp ghi chéo đông x 108,2–132,8; nhánh x 137,7 trở đi
    ex = (box(34, 86, 90, 143, '#2ecc71') + note(62, 44, 'sân ga 2-4-0', '#1e8449', 'middle') + box(4, 100, 16, 135, '#c0392b') + note(10, 150, 'X kép', '#c0392b', 'middle')
          + box(107, 100, 134, 135, '#c0392b') + note(120, 150, 's + r', '#c0392b', 'middle') + box(137, 50, 170, 110) + note(137, -22, 'nhánh Tazawako/Akita (từ đường chính xuống) ▼', '#d35400')
          + box(190, 50, 350, 100, '#8e44ad') + note(200, -8, 'depot Morioka Shinkansen (game không có)', '#8e44ad'))
    h.append('<div class="cmp"><h3>tohoku/020_10 (đoạn Morioka, x 0–420)</h3><div class="scroll">%s</div></div>' % orig_svg('tohoku/020_10.svg', 0, 420, ex, 215))
    ex2 = (box(266, 245, 330, 312, '#2ecc71') + note(298, 318, 'sân ga Tohoku (2 đảo)', '#1e8449', 'middle') + box(239, 262, 253, 294, '#c0392b') + note(246, 332, 'X kép', '#c0392b', 'middle')
           + box(357, 262, 396, 294, '#c0392b') + note(376, 332, 's + r', '#c0392b', 'middle') + box(411, 150, 480, 272) + note(420, 120, 'nhánh sang Tazawako (A)', '#d35400')
           + box(150, 60, 330, 235, '#2980b9') + note(152, -8, 'ga Morioka tuyến thường (Tōhoku Line, Tazawako Line, IGR)', '#2980b9'))
    h.append('<div class="cmp"><h3>tazawako/010_05 (Morioka nhìn từ tuyến Tazawako)</h3><div class="scroll">%s</div></div>' % orig_svg('tazawako/010_05.svg', 0, 640, ex2, 330))
    h.append('<p class="note"><b>Đọc sơ đồ:</b> (a) ga Shinkansen có <b>4 đường</b>: hai đường chính ở giữa và hai đường ngoài, mỗi đường ngoài có một sân ga đảo ngăn với đường chính cùng phía → đúng mã <code>2-4-0</code> (<code>dPduPu</code>) như game. '
             '(b) Phía tây: <b>X kép</b> (hai đường chéo cắt nhau). Phía đông: <b>hai ghi đơn liền nhau</b>, đường chéo thứ nhất đi từ đường chính lên sang đường chính xuống theo chiều đông (<b>s</b>), đường thứ hai ngược lại (<b>r</b>), cách nhau ~40 m. '
             '(c) <b>Một nhánh duy nhất</b> sang Tazawako Line/Akita rẽ khỏi <b>đường chính xuống</b> (phía bắc), ngay sau cặp ghi chéo (cách ~160 m theo hình 010_05, ~40 m theo hình 020_10: hai hình nén khác nhau). Không có nhánh nào gắn vào đường chính lên. '
             '(d) Nhánh đi lên phía bắc tới các đường khổ 1435 mm trong ga Morioka tuyến thường (4 đường xanh) và depot; ga tuyến thường nằm phía trên (bắc) ga Shinkansen, tách hẳn.</p>')
    h.append('<h2>2. Ga Morioka: hiện tại và dự kiến</h2>')
    for t, svg in build_station_plans(): h.append('<div class="cmp"><h3>%s</h3><div class="scroll">%s</div></div>' % (html.escape(t), svg))
    h.append('<h2>3. Ngã rẽ sang Akita: hiện tại và dự kiến (theo tỉ lệ thật)</h2>')
    for t, svg in build_branch_plans(): h.append('<div class="cmp"><h3>%s</h3><div class="scroll">%s</div></div>' % (html.escape(t), svg))
    h.append('<h2>4. Tóm tắt khác biệt và điểm cần bạn quyết</h2><table><tr><th>Hạng mục</th><th>Hiện tại trong game</th><th>Sơ đồ gốc</th><th>Dự kiến</th></tr>'
             '<tr><td>Mã bố trí Morioka</td><td>2-4-0</td><td>dPduPu (khớp)</td><td>giữ nguyên</td></tr>'
             '<tr><td>Ghi chéo phía tây</td><td>X kép (mặc định)</td><td>X kép</td><td>giữ: <code>[b,d]</code></td></tr>'
             '<tr><td>Ghi chéo phía đông</td><td>X kép (mặc định)</td><td>hai ghi đơn: s rồi r, cách ~40 m</td><td><code>[a,s]</code>, <code>[a,r,null,190]</code> (như Sendai)</td></tr>'
             '<tr><td>Nhánh Akita gắn vào</td><td><b>cả hai đường chính</b>: cặp đường đôi tách ra cùng phía (đã kiểm trên minimap)</td><td>chỉ đường chính xuống</td><td>một đường nhánh gắn đường chính xuống; chiều lên chạy làn ngược rồi qua ghi chéo đơn sang đường ngoài trái ga</td></tr>'
             '<tr><td>Cách ga</td><td>2,0 km (người dùng chốt 22/10/2026)</td><td>sát cặp ghi chéo (hình nén, không theo tỉ lệ)</td><td>giữ 2,0 km (đã chốt 21/11/2026)</td></tr>'
             '<tr><td>Depot Morioka</td><td>không có</td><td>có, phía đông bắc ga</td><td>không dựng</td></tr></table>')
    h.append('<p><b>Cách hiểu của bạn khớp sơ đồ:</b> nhánh chỉ nối vào đường chính xuống; tàu Akita đi lên chạy trên đường chính xuống (làn ngược chiều), qua ghi chéo đơn rồi vào phía rìa trái ga (đường ngoài phía nam) để nối với Tohoku. <b>Đã chốt:</b> giữ nhánh cách ga 2,0 km. Tàu Akita đi lên qua ghi <b>s</b> (ghi gần ga của cặp s + r) để sang làn trái. Game đã có cơ chế tàu đi làn ngược qua ghi chéo (ga cuối), nên phần chiều lên khả thi nhưng phải đổi cách dựng cặp đường nhánh hiện nay.</p>')
    h.append('</body></html>')
    out = os.path.join(ROOT, 'morioka_plan.html'); open(out, 'w', encoding='utf-8').write('\n'.join(h)); print('ghi', out, os.path.getsize(out), 'byte')

if __name__ == '__main__': main()
