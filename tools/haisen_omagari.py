# -*- coding: utf-8 -*-
# Trang nghiên cứu ga Omagari (switchback của tuyến Akita mini-Shinkansen): (1) sơ đồ gốc vẽ lại từ số liệu 配線略図.net (CC BY 4.0: tazawako/010_01 và ou_1/030_12),
# (2) mô hình HIỆN TẠI trong game (mã 2-3-0), (3) bố cục DỰ KIẾN theo chỉ dẫn của người dùng (22/11/2026): hai đường giữa hai sân ga gộp thành đường đơn, ghi tách hai đường,
# ghi chéo nối đường Kita-Ōmagari sang đường Akita, rồi hai đường tách nhau. KHÔNG sửa game, KHÔNG sửa SVG gốc.
# Chạy: python -X utf8 tools/haisen_omagari.py -> docs/data/haisen/omagari_plan.html
import sys, os, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import haisen_yam_aki as H
import haisen_morioka as M

ROOT = H.ROOT
BLUE, GRY, RED, GRN, ORG, PUR = '#1f77b4', '#7f8c8d', '#c0392b', '#1e8449', '#e67e22', '#8e44ad'
e = M.ease


def note(x, y, s, col='#c0392b', anchor='start', size=6.5):
    return '<text x="%s" y="%s" font-size="%s" font-weight="bold" fill="%s" text-anchor="%s">%s</text>' % (x, y, size, col, anchor, html.escape(s))


def box(x0, y0, x1, y1, col='#e67e22'):
    return '<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity=".16" stroke="%s" stroke-dasharray="3 2"/>' % (x0, y0, x1 - x0, y1 - y0, col, col)


def fig_parts(f, texts=True):
    fig = H.read_fig(os.path.join(ROOT, f)); out = []
    if not texts: fig['T'] = []
    H.draw_fig(fig, 0, 0, out)
    return ''.join(out)


def orig_taz():
    ex = (box(172, 130, 224, 172, GRN) + note(104, 103, 'ga: 2 sân ga, 2 đường giữa, 1 đường ngoài', GRN, 'start', 5.5)
          + box(173, 144, 232, 159, '#2980b9') + note(104, 203, 'hai đường 1435 mm giữa hai sân ga CỤT ở x = 177 (bên trái hình gốc)', '#2980b9', 'start', 5.5)
          + box(160, 172, 232, 178, ORG) + note(104, 210, 'đường 1435 mm ngoài (nam): BỎ trong dự kiến', ORG, 'start', 5.5)
          + box(226, 128, 248, 190, PUR) + note(104, 217, 'họng ga duy nhất (x 226–246, bên phải hình gốc): cả hai tuyến vào đây', PUR, 'start', 5.5)
          + note(250, 120, 'Ōu Line → Jingūji, Akita', PUR, 'start', 5.5) + note(262, 196, 'Tazawako Line → Kita-Omagari, Morioka', ORG, 'start', 5.5))
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="100 95 300 126" width="1000" class="plan"><rect x="100" y="95" width="300" height="126" fill="#fff"/>%s%s</svg>' % (fig_parts('tazawako/010_01.svg'), ex)


def orig_rot():
    """Hình gốc xoay 180° quanh tâm vùng ga (bỏ chữ vì chữ sẽ ngược): đầu cụt ra bên PHẢI (đông), họng ga bên TRÁI (tây); đường đi Akita ở dưới (trái khi đi về tây), đường Tazawako ở trên (phải)."""
    cx, cy = 250, 158
    ex = (note(330, 100, 'ĐẦU CỤT (đông)', '#2980b9', 'end', 6) + note(104, 100, 'họng ga / ghi (tây)', PUR, 'start', 6)
          + note(104, 213, 'xuống-trái: đường đi Akita (Ōu Line)', PUR, 'start', 6) + note(104, 107, 'trên-phải: đường đi Kita-Ōmagari (Tazawako)', ORG, 'start', 6)
          + '<line x1="270" y1="158" x2="300" y2="158" stroke="#888" stroke-dasharray="2 2"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="100 95 300 126" width="1000" class="plan"><rect x="100" y="95" width="300" height="126" fill="#fff"/>'
            '<g transform="rotate(180 %s %s)">%s</g>%s</svg>') % (cx, cy, fig_parts('tazawako/010_01.svg', False), ex)


# --- 2-3-0 chiều XUỐNG (đúng số liệu Layout.station('2-3-0', 'down')) -----------------------------------------------------------------------------
TR = [dict(name='đường chính xuống', x=0.0, main=True, col=M.BLUE), dict(name='đường chính lên', x=-4.3, main=True, col=M.TEAL),
      dict(name='đường ngoài nam', x=-15.0, main=False, in0=1130, len=164.1, out0=40, len2=164.1, col=GRY)]
PL = [(1.75, 10.75), (-13.25, -6.05)]


def current():
    p = M.Plan(-1500, 700, 0.45, 3.2, -18, 14, 'ga')
    for t in TR:
        p.poly([(z, M.track_x(t, z)) for z in range(-1500, 701, 10)], t['col'], 2.6 if t['main'] else 2.2)
    for xa, xb in PL:
        p.rect(-420, 20, xa, xb)
    p.text(-200, 12, 'sân ga', 10, '#444', 'middle'); p.text(-200, -17.5, 'sân ga', 10, '#444', 'middle')
    p.mark(0, 'vạch dừng (z = 0)', '#444')
    p.poly([(-1300 + 150 * i / 15, 0 + (-4.3 - 0) * e(i / 15)) for i in range(16)], RED, 2.2); p.poly([(-1300 + 150 * i / 15, -4.3 * (1 - e(i / 15))) for i in range(16)], RED, 2.2)
    p.poly([(720 + 150 * i / 15, -4.3 * e(i / 15)) for i in range(16)], RED, 2.2); p.poly([(720 + 150 * i / 15, -4.3 * (1 - e(i / 15))) for i in range(16)], RED, 2.2)
    p.text(-1480, -26.5, 'mã 2-3-0 (P d u P u): hai đường chính chạy THẲNG qua ga + đường ngoài nam, X kép ở 1300 m trước / 720 m sau vạch dừng; tàu mini đi thẳng, đổi chiều chỉ là thông báo', 10, '#555')
    return p.svg()


# --- DỰ KIẾN: khung nhìn từ trên xuống, đông (đầu cụt) ở bên PHẢI, tây (họng ga) bên TRÁI; lên trên = bắc.
# hai đường giữa hai sân ga (A bắc x = 0, B nam x = -4,3) → gộp đường đơn (x = 0) → ghi tách hai đường song song: đường Akita (phía nam, TRÁI khi đi về tây) và đường Kita-Ōmagari (phía bắc, PHẢI)
# → ghi chéo giữa hai đường (nối đường Kita-Ōmagari sang đường Akita) → hai đường tách hẳn nhau (Akita xuống nam, Kita-Ōmagari lên bắc).
Z_BUF = 15
Z_MERGE = (-520, -440)        # hai đường ga gộp thành một (ghi đơn, ~80 m theo quy tắc ghi 1:13)
Z_SPLIT = (-1100, -1020)        # đường đơn tách thành hai đường song song
Z_XO = (-1370, -1220)          # ghi chéo 150 m
Z_DIV = (-1750, -1450)        # hai đường tách hẳn: 300 m
Y_AK, Y_KO = -4.3, 4.3         # hai đường song song: Akita phía nam (trái), Kita-Ōmagari phía bắc (phải)
Y_AK_END, Y_KO_END = -20.0, 20.0


def planned(path=None, title=''):
    p = M.Plan(-2050, 330, 0.5, 2.7, -26, 26, 'ga')
    # --- sân ga: 2 sân ga 1 mặt, chiều dài theo hình gốc (359 m sau chắn cuối +81 m nối ở đầu cụt)
    p.rect(-359 + Z_BUF, 96, 1.75, 10.75, '#ddd'); p.rect(-359 + Z_BUF, 96, -15.05, -6.05, '#ddd')
    p.text(-200, 12, 'sân ga bắc', 9, '#444', 'middle'); p.text(-200, -18.5, 'sân ga nam', 9, '#444', 'middle')
    # --- hai đường dừng A, B
    p.poly([(Z_MERGE[0], 0.0), (Z_BUF, 0.0)], BLUE, 2.8)
    p.poly([(z, -4.3 * e((z - Z_MERGE[0]) / (Z_MERGE[1] - Z_MERGE[0]))) for z in range(int(Z_MERGE[0]), int(Z_MERGE[1]) + 1, 10)] + [(Z_BUF, -4.3)], M.TEAL, 2.8)
    # --- đường đơn giữa ghi gộp và ghi tách
    p.poly([(Z_SPLIT[1], 0.0), (Z_MERGE[0], 0.0)], GRY, 2.8)
    # --- ghi tách hai đường song song
    p.poly([(z, Y_AK * e((z - Z_SPLIT[1]) / (Z_SPLIT[0] - Z_SPLIT[1]))) for z in range(int(Z_SPLIT[0]), int(Z_SPLIT[1]) + 1, 10)], BLUE, 2.6)
    p.poly([(z, Y_KO * e((z - Z_SPLIT[1]) / (Z_SPLIT[0] - Z_SPLIT[1]))) for z in range(int(Z_SPLIT[0]), int(Z_SPLIT[1]) + 1, 10)], ORG, 2.6)
    # --- hai đường song song (tới z = Z_DIV[1]), ghi chéo, rồi tách hẳn (Z_DIV[1] → Z_DIV[0]) và kéo thẳng ra biên
    p.poly([(Z_SPLIT[0], Y_AK), (Z_DIV[1], Y_AK)], BLUE, 2.6)
    p.poly([(Z_SPLIT[0], Y_KO), (Z_DIV[1], Y_KO)], ORG, 2.6)
    p.poly([(Z_XO[1] - 150 * i / 15, Y_KO + (Y_AK - Y_KO) * e(i / 15)) for i in range(16)], RED, 2.4)
    p.text(Z_XO[0] + 60, 1.2, 'ghi chéo s (theo hình gốc: Kita-Ōmagari → Akita khi rời ga)', 9, RED, 'middle')
    p.poly([(Z_DIV[1] - 300 * i / 30, Y_AK + (Y_AK_END - Y_AK) * e(i / 30)) for i in range(31)] + [(-2000, Y_AK_END - 3.0)], BLUE, 2.6)
    p.poly([(Z_DIV[1] - 300 * i / 30, Y_KO + (Y_KO_END - Y_KO) * e(i / 30)) for i in range(31)] + [(-2000, Y_KO_END + 3.0)], ORG, 2.6)
    # --- chắn cuối
    for x in (0.0, -4.3): p.el.append('<rect x="%.1f" y="%.1f" width="5" height="%.1f" fill="#222"/>' % (p.X(Z_BUF + 1), p.Y(x + 1.2), 2.4 * p.sy))
    p.text(Z_BUF + 12, 4, 'chắn cuối (đông)', 9, '#222')
    p.text(-2040, -19, 'Akita (trái)', 10, BLUE, 'start'); p.text(-2040, 24, 'Kita-Ōmagari / Tokyo (phải)', 10, '#b9770e', 'start')
    for z, lab in ((-480, 'ghi gộp 2→1'), (-1060, 'ghi tách 1→2'), (-1295, 'ghi chéo'), (-1600, 'hai đường tách hẳn')):
        p.mark(z, lab, '#888')
    # --- đường đi của tàu
    if path:
        for pts, col, w, dash in path: p.poly(pts, col, w, dash)
    if title: p.text(-2040, -31, title, 10, '#555')
    return p.svg()


def path_flow1():
    """Chiều xuống (Tokyo → Akita): đến từ đường Kita-Ōmagari (bắc), gộp đường đơn, vào đường ga, tới chắn cuối; sau khi đổi đầu: ra đường đơn, tách, đi đường Akita (trái, nam)."""
    arr = [(-2000, Y_KO_END + 3.0), (Z_DIV[0], Y_KO_END), (Z_DIV[1], Y_KO), (Z_SPLIT[0], Y_KO)] + [(z, Y_KO * e((z - Z_SPLIT[1]) / (Z_SPLIT[0] - Z_SPLIT[1]))) for z in range(int(Z_SPLIT[0]), int(Z_SPLIT[1]) + 1, 20)] + [(Z_MERGE[0], 0.0), (Z_BUF - 8, 0.0)]
    dep = [(Z_BUF - 20, -4.3 + 0.9), (Z_MERGE[1], -4.3 * 0.9)] + [(z, -4.3 * (1 - e((z - Z_MERGE[1]) / (Z_MERGE[0] - Z_MERGE[1])))) for z in range(int(Z_MERGE[1]), int(Z_MERGE[0]) - 1, -20)] + [(Z_SPLIT[1], 0.0)] + [(z, Y_AK * e((z - Z_SPLIT[1]) / (Z_SPLIT[0] - Z_SPLIT[1]))) for z in range(int(Z_SPLIT[1]), int(Z_SPLIT[0]) - 1, -20)] + [(Z_DIV[1], Y_AK), (Z_DIV[0], Y_AK_END), (-2000, Y_AK_END - 3.0)]
    return [(arr, '#c0392b', 5, None), (dep, '#2e7d32', 5, '8 5')]


def path_flow2():
    """Chiều lên (Akita → Tokyo): đến từ đường Akita (nam), qua ghi gộp vào đường ga; sau khi đổi đầu: ra đường đơn, tách, đi đường Kita-Ōmagari (bắc) [bạn viết 'bên trái' cho cả hai chiều: xin xác nhận]."""
    arr = [(-2000, Y_AK_END - 3.0), (Z_DIV[0], Y_AK_END), (Z_DIV[1], Y_AK), (Z_SPLIT[0], Y_AK)] + [(z, Y_AK * e((z - Z_SPLIT[1]) / (Z_SPLIT[0] - Z_SPLIT[1]))) for z in range(int(Z_SPLIT[0]), int(Z_SPLIT[1]) + 1, 20)] + [(Z_MERGE[0], 0.0), (Z_BUF - 8, 0.0)]
    dep = [(Z_BUF - 20, -4.3 + 0.9), (Z_MERGE[1], -4.3 * 0.9)] + [(z, -4.3 * (1 - e((z - Z_MERGE[1]) / (Z_MERGE[0] - Z_MERGE[1])))) for z in range(int(Z_MERGE[1]), int(Z_MERGE[0]) - 1, -20)] + [(Z_SPLIT[1], 0.0)] + [(z, Y_KO * e((z - Z_SPLIT[1]) / (Z_SPLIT[0] - Z_SPLIT[1]))) for z in range(int(Z_SPLIT[1]), int(Z_SPLIT[0]) - 1, -20)] + [(Z_DIV[1], Y_KO), (Z_DIV[0], Y_KO_END), (-2000, Y_KO_END + 3.0)]
    return [(arr, '#c0392b', 5, None), (dep, '#2e7d32', 5, '8 5')]


def main():
    h = ['<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ga Omagari (switchback): bản thảo</title><style>' + M.CSS + '</style></head><body>']
    h.append('<h1>Ga Omagari (switchback tuyến Akita): sơ đồ gốc, hiện tại trong game, dự kiến</h1>')
    h.append('<p class="note">Nguồn sơ đồ: <b>配線略図.net</b> (CC BY 4.0, https://www.haisenryakuzu.net/), hình <code>tazawako/010_01</code> và <code>ou_1/030_12</code>; vẽ lại từ số liệu, không nhúng/sửa SVG gốc. Phần "hiện tại" lấy từ <code>layout.js</code> (mã 2-3-0). Chuyện switchback ở Omagari theo <a href="https://ja.wikipedia.org/wiki/秋田新幹線">ja.wikipedia 秋田新幹線</a> [N]. '
             'Bố cục dự kiến (đường đơn, ghi tách, ghi chéo) là <b>chỉ dẫn của bạn 22/11/2026</b>, đơn giản hoá từ sơ đồ; mọi kích thước là suy luận [I] (1 đơn vị sơ đồ ≈ 8,15 m).</p>')
    h.append('<h2>1. Sơ đồ gốc</h2><div class="cmp"><h3>tazawako/010_01 (nguyên hướng)</h3><div class="scroll">%s</div></div>' % orig_taz())
    h.append('<div class="cmp"><h3>cùng hình, xoay 180° (khớp hướng mockup: đầu cụt bên phải = đông, họng ga bên trái = tây)</h3><div class="scroll">%s</div></div>' % orig_rot())
    h.append('<p class="note"><b>Đọc sơ đồ:</b> ba đường khổ 1435 mm (hai đường giữa hai sân ga + một đường ngoài) kết thúc ở chắn cuối; mọi đường nối ra ngoài qua <b>một họng ga</b> duy nhất, rồi thành <b>hai đường song song</b> (Akita ở trên trong hình gốc, Tazawako ở dưới) có <b>ghi chéo</b> nối đường Tazawako sang đường Akita, rồi tách nhau. '
             'Bố trí đường – sân ga khớp mã <code>2-3-0</code>. Đường thứ ba (ngoài) bỏ trong dự kiến.</p>')
    h.append('<h2>2. Hiện tại trong game</h2><div class="cmp"><div class="scroll">%s</div></div>' % current())
    h.append('<p class="note">Omagari dùng mã <code>2-3-0</code> như các ga giữa tuyến: tàu mini đi <b>thẳng</b> qua ga theo chiều Morioka → Akita, không có đường cụt, không có họng ga hai tuyến; đổi chiều chỉ là thông báo và đồng hồ dừng ga. Camera giữ nguyên hướng nhìn.</p>')
    h.append('<h2>3. Dự kiến</h2><div class="cmp"><h3>bố cục (đông = bên phải; trái / phải theo hướng tàu chạy về tây)</h3><div class="scroll">%s</div></div>' % planned(None, 'ga cụt (đông) → hai đường gộp đường đơn → ghi tách hai đường → ghi chéo (Kita-Ōmagari → Akita) → hai đường tách hẳn: trái Akita, phải Kita-Ōmagari / Tokyo'))
    h.append('<div class="cmp"><h3>Chiều xuống (Tokyo → Akita): đỏ liền = đến, xanh lá nét đứt = đi sau khi đổi đầu</h3><div class="scroll">%s</div></div>' % planned(path_flow1(), ''))
    h.append('<div class="cmp"><h3>Chiều lên (Akita → Tokyo): đỏ liền = đến, xanh lá nét đứt = đi sau khi đổi đầu</h3><div class="scroll">%s</div></div>' % planned(path_flow2(), ''))
    h.append('<h2>4. Logic tàu (theo chỉ dẫn của bạn)</h2><ol>'
             '<li><b>Chiều xuống (Tokyo → Akita):</b> tàu từ Kita-Ōmagari vào ga, <b>chọn 1 trong 2 đường dừng</b> (ngẫu nhiên theo termPick), chạy tới chắn cuối → <b>chờ giờ khởi hành kế tiếp</b> → đóng cửa: <b>góc nhìn đổi qua đuôi tàu thành đầu tàu</b> (khung quay 180°) → rời ghi của ga (ghi gộp) → đi hết đường đơn → ghi tách hai đường → rẽ vào <b>đường bên trái = đường đi Akita</b>.</li>'
             '<li><b>Chiều lên (Akita → Tokyo):</b> tàu từ Akita vào ga theo đường Akita (bên trái), vào 1 trong 2 đường dừng, chạy tới chắn cuối → chờ giờ khởi hành → đóng cửa, đổi góc nhìn → rời ghi ga → đường đơn → ghi tách hai đường → <b>đi đường Kita-Ōmagari (bên phải khi quay đầu về tây)</b>. <i>Đã chốt: nhánh phải = Kita-Ōmagari.</i></li>'
             '<li><b>Ghi chéo</b> <code>s</code> (đọc theo hình gốc <code>tazawako/010_01</code>, x 275–280: khi rời ga, đường chéo đi từ đường Kita-Ōmagari sang đường Akita; <i>tạm gán s, cần xác nhận khi dựng vì phụ thuộc đường nào là "đường ta" trong khung mới</i>) nối đường Kita-Ōmagari sang đường Akita trước khi hai đường tách hẳn.</li>'
             '<li>Hai chiều dùng cùng ga, cùng cơ chế "ga cuối đầu cụt" của Akita (mã <code>1-2-0t</code>) nhưng hai đường dừng thuộc nhóm tàu vào <i>và</i> ra.</li></ol>')
    h.append('<h2>5. Khác biệt và điểm cần bạn quyết</h2><table><tr><th>Hạng mục</th><th>Hiện tại</th><th>Dự kiến</th></tr>'
             '<tr><td>Số đường ga</td><td>3 (hai chính + ngoài nam), chạy thẳng</td><td>2 (giữa hai sân ga), cụt ở đông; <b>đường thứ ba bỏ</b></td></tr>'
             '<tr><td>Phía tây ga</td><td>hai đường chính chạy suốt, X kép</td><td>ghi gộp 2→1, đường đơn ~500 m, ghi tách 1→2, hai đường song song, ghi chéo, hai đường tách hẳn</td></tr>'
             '<tr><td>Đổi hướng</td><td>chỉ thông báo, không đổi hướng nhìn</td><td>dừng ở chắn cuối, chờ giờ, đóng cửa → quay 180° → đi tiếp</td></tr>'
             '<tr><td>Loại ghi chéo</td><td>X kép mặc định</td><td>s (theo hình gốc; xác nhận khi dựng)</td></tr></table>')
    h.append('<p><b>Đã chốt (22/11/2026):</b> chiều lên đi nhánh phải = Kita-Ōmagari; đường đơn ~500 m; tên chiều theo quy ước game (xuống = Tokyo → Akita). <b>Còn lại:</b> loại ghi chéo (tạm <code>s</code>).</p>')
    h.append('</body></html>')
    out = os.path.join(ROOT, 'omagari_plan.html')
    open(out, 'w', encoding='utf-8').write('\n'.join(h)); print('ghi', out, os.path.getsize(out), 'byte')


if __name__ == '__main__':
    main()
