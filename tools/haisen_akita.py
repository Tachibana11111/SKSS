# -*- coding: utf-8 -*-
# Trang nghiên cứu ga Akita (ga cuối tuyến Akita mini-Shinkansen): (1) sơ đồ gốc vẽ lại từ số liệu 配線略図.net (CC BY 4.0, ou_1/030_14), (2) mô hình HIỆN TẠI trong game, (3) bố cục DỰ KIẾN.
# KHÔNG sửa game, KHÔNG sửa SVG gốc. Chạy: python -X utf8 tools/haisen_akita.py -> docs/data/haisen/akita_plan.html
import sys, os, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import haisen_yam_aki as H
import haisen_morioka as M

ROOT = H.ROOT
U = 8.15                       # m / đơn vị sơ đồ [I]
BLUE, GRY, RED, GRN = '#1f77b4', '#7f8c8d', '#c0392b', '#1e8449'
X_BUF = 551.0                  # đầu đường khổ 1435 mm (hết đường xanh) trong hình 030_14


def zm(x):
    return (x - X_BUF) * U     # đơn vị sơ đồ -> m dọc đường, 0 = cuối đường xanh (chắn cuối)


def note(x, y, s, col='#c0392b', anchor='start', size=7):
    return '<text x="%s" y="%s" font-size="%s" font-weight="bold" fill="%s" text-anchor="%s">%s</text>' % (x, y, size, col, anchor, html.escape(s))


def box(x0, y0, x1, y1, col='#e67e22'):
    return '<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity=".16" stroke="%s" stroke-dasharray="3 2"/>' % (x0, y0, x1 - x0, y1 - y0, col, col)


def fig_parts():
    fig = H.read_fig(os.path.join(ROOT, 'ou_1/030_14.svg')); out = []
    H.draw_fig(fig, 0, 0, out)
    return ''.join(out)


def original():
    ex = (box(521, 205, 576, 226, GRN) + note(548, 247, 'đảo 3: sân ga duy nhất có đường 1435 mm (hai mặt)', GRN, 'middle')
          + box(477, 155, 552, 228, '#2980b9') + note(443, 254, 'đầu họng ga: một đường xanh → hai mặt', '#2980b9')
          + box(551, 200, 595, 230, '#7f8c8d') + note(598, 216, 'chỉ khổ 1067 mm', '#7f8c8d')
          + box(521, 140, 576, 158, RED) + box(521, 168, 576, 187, RED) + note(578, 152, 'đảo 1, 2: chỉ khổ 1067 mm', RED) + note(578, 181, '(không có tàu mini)', RED))
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="440 80 284 180" width="1000" class="plan"><rect x="440" y="80" width="284" height="180" fill="#fff"/>%s%s</svg>' % (fig_parts(), ex)


def original_wide():
    ex = box(98, 100, 300, 140, '#8e44ad') + note(100, 96, 'đường xanh vào trung tâm xe Akita Shinkansen (game không có)', '#8e44ad')
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 60 724.2 200" width="1000" class="plan"><rect y="60" width="724.2" height="200" fill="#fff"/>%s%s</svg>' % (fig_parts(), ex)


def current():
    p = M.Plan(-1500, 600, 0.45, 3.2, -18, 14, 'ga')
    M.draw_tracks(p, -1500, 600)
    p.text(-1480, -26.5, 'mã 2-4-0 (cũ, dùng chung với Morioka/Ueno): 4 đường chạy THẲNG qua ga, không có chắn cuối; mini dừng ở đường ngoài bắc (x=10,7) hoặc đường chính xuống (x=0)', 10, '#555')
    p.text(300, 6, 'đường vẫn kéo dài', 10, '#999', 'middle')
    return p.svg()


def planned():
    p = M.Plan(-1000, 600, 0.65, 3.4, -6, 22, 'ga')
    N, S = 10.7, 0.0                          # hai mặt sân ga đảo (như game: sân ga 1,75…8,95)
    e = M.ease
    z_end = int(zm(X_BUF))
    p.poly([(z, N) for z in range(-1000, z_end + 11, 10)], BLUE, 2.8)
    cr = [(zm(506.8) + (zm(516.6) - zm(506.8)) * i / 12, N + (S - N) * e(i / 12)) for i in range(13)]
    p.poly([(z, S) for z in range(int(zm(516.6)) + 25, z_end + 11, 10)], BLUE, 2.8)
    p.poly([(cr[0][0] - 70, N)] + cr + [(cr[-1][0] + 40, S)], RED, 2.4)
    p.rect(zm(521.5), zm(575.6), 1.75, 8.95, '#ddd')
    p.text((zm(521.5) + zm(575.6)) / 2, 4.6, 'đảo 3: %d m, trong đó %d m có đường 1435 mm' % (round((575.6 - 521.5) * U), round((X_BUF - 521.5) * U)), 9, '#444', 'middle')
    for x in (N, S):
        p.poly([(0, x), (200, x)], GRY, 1.6, '4 3')
    p.mark(0, 'chắn cuối / vạch dừng (z = 0)', '#444')
    for x in (N, S):
        p.el.append('<rect x="%.1f" y="%.1f" width="5" height="%.1f" fill="#222"/>' % (p.X(2), p.Y(x + 1.2), 2.4 * p.sy))
    p.text(zm(506.8) + 20, N + 2, 'chéo ~80 m trước đầu sân ga', 9, RED, 'middle')
    p.text(-980, -9, 'DỰ KIẾN (mã mới, tạm gọi 1-2-0t): ga cuối đầu cụt, MỘT đường vào (mặt bắc), chéo sang mặt nam, hai mặt của một sân ga đảo, chắn cuối ở z = +2 m; không còn đường chính chạy thẳng', 10, '#555')
    p.text(-980, -12.5, 'tàu mini vào mặt nào cũng được (như termPick hiện nay); đường 1435 mm chỉ ở 240 m đầu sân ga, 200 m còn lại là của tuyến thường [D hình 030_14]', 10, '#555')
    return p.svg()


def main():
    h = ['<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ga Akita: bản thảo</title><style>' + M.CSS + '</style></head><body>']
    h.append('<h1>Ga Akita (ga cuối tuyến Akita mini-Shinkansen): sơ đồ gốc, hiện tại trong game, dự kiến</h1>')
    h.append('<p class="note">Nguồn sơ đồ: <b>配線略図.net</b> (CC BY 4.0, https://www.haisenryakuzu.net/), hình <code>ou_1/030_14</code> (奥羽本線 秋田駅); vẽ lại từ số liệu, không nhúng/sửa SVG gốc. Phần "hiện tại" lấy từ <code>layout.js</code> (mã 2-4-0). 1 đơn vị sơ đồ ≈ 8,15 m [I]. Ngoài sơ đồ chỉ có suy luận [I].</p>')
    h.append('<h2>1. Sơ đồ gốc (030_14)</h2><div class="cmp"><h3>toàn hình</h3><div class="scroll">%s</div></div>' % original_wide())
    h.append('<div class="cmp"><h3>phóng ga Akita (khung màu = cách tôi đọc)</h3><div class="scroll">%s</div></div>' % original())
    h.append('<p class="note"><b>Đọc sơ đồ:</b> (a) <b>chỉ MỘT sân ga đảo (đảo 3, phía nam)</b> có đường khổ 1435 mm, ở cả hai mặt; hai đảo còn lại phía bắc chỉ tuyến thường. '
             '(b) Một đường xanh duy nhất từ phía tây (trái hình, hướng trung tâm xe Akita Shinkansen và tuyến Omagari) tới họng ga, xuống mặt bắc của đảo 3, rồi một đường chéo ngắn (x 507–517) sang mặt nam. '
             '(c) Đường xanh <b>kết thúc ở x = 551</b>; từ đó sân ga (tới x = 575,6) chỉ còn khổ 1067 mm. Đường dừng mini dài ~240 m, sân ga đảo 3 dài ~440 m. '
             '(d) Phía đông là họng ga tuyến thường (Ōu, đi Izumi-Sotoasahikawa), không có đường xanh: với tàu mini ga là <b>ga cuối đầu cụt</b>.</p>')
    h.append('<h2>2. Hiện tại trong game</h2><div class="cmp"><div class="scroll">%s</div></div>' % current())
    h.append('<p class="note">Game gán Akita mã <code>2-4-0</code> (như Morioka, Ueno): 4 đường (hai đường chính xuyên suốt + hai đường ngoài), 2 sân ga đảo 440 m, X kép mặc định ở 1300 m trước và 720 m sau vạch dừng. Hậu quả: hai đường chính chạy thẳng qua ga (thực tế không có), mini dừng ở đường ngoài bắc hoặc đường chính xuống, sân ga thứ hai và đường ngoài nam không dùng cho mini.</p>')
    h.append('<h2>3. Dự kiến</h2><div class="cmp"><div class="scroll">%s</div></div>' % planned())
    h.append('<h2>4. Khác biệt và điểm cần bạn quyết</h2><table><tr><th>Hạng mục</th><th>Hiện tại trong game</th><th>Sơ đồ gốc</th><th>Dự kiến</th></tr>'
             '<tr><td>Đường vào ga</td><td>4 (2 chính + 2 ngoài), chạy thẳng</td><td>1 đường xanh + chéo → 2 mặt đảo 3; đầu cụt</td><td>1 đường vào + chéo → 2 mặt đảo</td></tr>'
             '<tr><td>Sân ga</td><td>2 đảo, 440 m, từ −420 đến +20 m</td><td>1 đảo cho mini (240 m xanh + 200 m xám)</td><td>1 đảo từ −240 đến +200 m quanh chắn cuối</td></tr>'
             '<tr><td>Chắn cuối</td><td>không có</td><td>có (hết đường xanh x = 551)</td><td>chắn ở z = +2 m</td></tr>'
             '<tr><td>Ghi chéo</td><td>X kép mặc định 1300 / 720 m</td><td>một chéo ~80 m trước sân ga</td><td>một chéo ở −360…−280 m</td></tr>'
             '<tr><td>Đường 1067 mm</td><td>không phân biệt</td><td>xám, chạy tiếp quá chắn</td><td>nét đứt xám sau chắn (không mô phỏng)</td></tr>'
             '<tr><td>Depot Akita Shinkansen</td><td>không có</td><td>có, phía tây</td><td>không dựng</td></tr></table>')
    h.append('<p><b>Cần bạn quyết:</b> (1) có bỏ hai đường chính chạy thẳng và dựng ga cuối đầu cụt với chắn cuối không (game cần một mã bố cục mới và chắn cuối ở ga cuối); (2) sân ga đảo dài 440 m (240 m + 200 m xám) hay rút còn 240 m; (3) có vẽ đường 1067 mm xám sau chắn cuối không.</p>')
    h.append('</body></html>')
    out = os.path.join(ROOT, 'akita_plan.html')
    open(out, 'w', encoding='utf-8').write('\n'.join(h)); print('ghi', out, os.path.getsize(out), 'byte')


if __name__ == '__main__':
    main()
