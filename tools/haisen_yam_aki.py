# -*- coding: utf-8 -*-
# Phác bản thảo kiến trúc toàn tuyến Yamagata và Akita (mini-Shinkansen) để NGHIÊN CỨU: vẽ lại từ dữ liệu 配線略図.net (CC BY 4.0) thành một trang HTML,
# KHÔNG đụng vào game, KHÔNG sửa SVG gốc (chỉ đọc số liệu bằng script rồi tự vẽ lại; không nhúng SVG gốc).
# Chạy: python -X utf8 tools/haisen_yam_aki.py   ->  docs/data/haisen/yam_aki_draft.html
import sys, os, re, json, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from haisen_dump import load, sty, NS
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'data', 'haisen')
M_PER_U = 8.15       # 1 đơn vị sơ đồ ≈ 8,15 m (sân ga 54 đơn vị = 440 m) [I]
BLUE, GREY = '#0070c0', '#404040'

def norm(c):
    c = (c or '').lower()
    return '#000' if c == '#000000' else c

def read_fig(path):
    root, st = load(path)
    L, R, T = [], [], []
    for el in root.iter():
        tag = el.tag.replace(NS, ''); s = sty(el, st)
        if tag == 'line':
            g = lambda k: float(el.get(k) or 0)
            L.append(dict(x1=g('x1'), y1=g('y1'), x2=g('x2'), y2=g('y2'), c=norm(s.get('stroke')), w=(s.get('stroke-width') or '').replace('px', '')))
        elif tag == 'rect':
            w, h = float(el.get('width')), float(el.get('height'))
            if w > 8 and h > 3 and norm(s.get('stroke')) == '#000':
                R.append(dict(x=float(el.get('x') or 0), y=float(el.get('y') or 0), w=w, h=h, sw=(s.get('stroke-width') or '').replace('px', ''), fill=s.get('fill')))
        elif tag == 'path' and not s.get('stroke'):          # sân ga vẽ bằng hai vạch mảnh: lấy cạnh xa của sân ga (xem README)
            m = re.match(r'M([-\d.]+),([-\d.]+)h([-\d.]+)', el.get('d') or '')
            if m and float(m.group(3)) > 15: R.append(dict(x=float(m.group(1)), y=float(m.group(2)), w=float(m.group(3)), h=1.6, sw='thin', fill=None))
        elif tag == 'text':
            tr = el.get('transform', '')
            m = re.search(r'translate\(\s*([-\d.]+)[ ,]+([-\d.]+)', tr) or re.search(r'matrix\([^,\s]+[ ,]+[^,\s]+[ ,]+[^,\s]+[ ,]+[^,\s]+[ ,]+([-\d.]+)[ ,]+([-\d.]+)\s*\)', tr)
            s_ = ''.join(el.itertext()).strip()
            if m and s_: T.append(dict(x=float(m.group(1)), y=float(m.group(2)), s=s_, size=float((s.get('font-size') or '11px').replace('px', ''))))
    return dict(L=L, R=R, T=T)

def edge_rails(fig, side, tol=2.0):
    """Các ray ngang chạm mép phải/trái của hình; chỉ dùng ray XANH (1435 mm) nếu có, để không nối đường xanh với đường xám khi ghép hình."""
    hs = [l for l in fig['L'] if abs(l['y1'] - l['y2']) < .3 and l['c'] in (BLUE, GREY) and abs(l['x2'] - l['x1']) > 30]
    bl = [l for l in hs if l['c'] == BLUE]; use = bl if bl else hs
    if not use: return None, []
    if side == 'r':
        xe = max(max(l['x1'], l['x2']) for l in use)
        return xe, sorted(set(round(l['y1'], 1) for l in use if max(l['x1'], l['x2']) >= xe - tol))
    xe = min(min(l['x1'], l['x2']) for l in use)
    return xe, sorted(set(round(l['y1'], 1) for l in use if min(l['x1'], l['x2']) <= xe + tol))

def place(files, base):
    """Ghép các hình nối tiếp nhau: ox, oy sao cho hai đường chính khớp ở chỗ nối (bỏ phiếu theo độ chênh dọc)."""
    figs = [read_fig(os.path.join(ROOT, f)) for f in files]
    pos = [(0.0, 0.0)]
    for i in range(1, len(figs)):
        xa, ra = edge_rails(figs[i - 1], 'r'); xb, rb = edge_rails(figs[i], 'l')
        votes = {}
        for ya in ra:
            for yb in rb: d = round((ya - yb), 1); votes[d] = votes.get(d, 0) + 1
        if votes:
            top = max(votes.values()); c = sorted(k for k in votes if votes[k] == top)
            dy = sum(c) / len(c) if max(c) - min(c) < 15 else c[0]      # hai bên có số/khoảng cách ray khác nhau (Yamagata 04→05): lấy trung bình để lệch chia đều
        else: dy = 0.0
        ox, oy = pos[-1]; pos.append((ox + xa - xb, oy + dy))
    return figs, pos

# ga của game (nhãn kanji -> tên) và mã bố trí RÚT RA TỪ SƠ ĐỒ (đề xuất nghiên cứu, CHƯA áp dụng vào game); xem bảng trong trang
GAME = {'米沢': 'Yonezawa', '高畠': 'Takahata', '赤湯': 'Akayu', 'かみのやま温泉': 'Kaminoyama-Onsen', '山形': 'Yamagata', '天童': 'Tendo', 'さくらんぼ東根': 'Sakuranbo-Higashine', '村山': 'Murayama', '大石田': 'Oishida', '新庄': 'Shinjo',
        '雫石': 'Shizukuishi', '田沢湖': 'Tazawako', '角館': 'Kakunodate', '大曲': 'Omagari', '秋田': 'Akita', '福島': 'Fukushima', '盛岡': 'Morioka'}
ROWS = [
    dict(id='yam', title='Yamagata mini-Shinkansen: Fukushima → Shinjo (ou_1/030_02 … 030_08; hình 030_01 Fukushima đặt riêng)', files=['ou_1/030_02.svg', 'ou_1/030_03.svg', 'ou_1/030_04.svg', 'ou_1/030_05.svg', 'ou_1/030_06.svg', 'ou_1/030_07.svg', 'ou_1/030_08.svg'], dir='→ (chiều XUỐNG của game đi từ trái sang phải)'),
    dict(id='aki1', title='Akita (1): Omagari → Morioka trên tuyến Tazawako (tazawako/010_01 … 010_04; 010_05 Morioka đặt riêng). Chiều XUỐNG của game đi Morioka → Omagari = từ PHẢI sang TRÁI', files=['tazawako/010_01.svg', 'tazawako/010_02.svg', 'tazawako/010_03.svg', 'tazawako/010_04.svg'], dir='← (chiều XUỐNG đi từ phải sang trái)'),
    dict(id='aki2', title='Akita (2): Omagari → Akita trên Ou Main Line (ou_1/030_12 … 030_14). Chiều XUỐNG đi từ trái sang phải', files=['ou_1/030_12.svg', 'ou_1/030_13.svg', 'ou_1/030_14.svg'], dir='→'),
]
SOLO = [('ou_1/030_01.svg', 'Fukushima (030_01): ga chung với Tohoku; mini rẽ khỏi Tohoku ở đây'), ('tazawako/010_05.svg', 'Morioka (010_05): ga chung với Tohoku; mini rẽ khỏi Tohoku ở đây')]

def draw_fig(fig, ox, oy, out, label=None):
    g = ['<g transform="translate(%.2f %.2f)">' % (ox, oy)]
    for l in fig['L']:
        c = l['c']
        if c == BLUE: col, w, op = '#0070c0', 1.7, 1
        elif c == GREY: col, w, op = '#9aa3ad', 1.0, .85
        elif c == '#000' and l['w'] in ('1.5', '1.5px'): col, w, op = '#111', 1.4, 1
        elif c == '#002060': col, w, op = '#2a4a8a', .5, .6
        else: col, w, op = '#555', .5, .5
        g.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%s" opacity="%s"/>' % (l['x1'], l['y1'], l['x2'], l['y2'], col, w, op))
    for r in fig['R']:
        if r['sw'] == 'thin': g.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#111"/>' % (r['x'], r['y'], r['w'], r['h']))
        else: g.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" stroke="#111" stroke-width="%s"/>' % (r['x'], r['y'], r['w'], r['h'], '#fff' if r['sw'] in ('1.5', '1.5px') else 'none', '1.3' if r['sw'] in ('1.5', '1.5px') else '.6'))
    for t in fig['T']:
        if t['size'] < 8: continue
        g.append('<text x="%.1f" y="%.1f" font-size="%.0f" fill="#222">%s</text>' % (t['x'], t['y'], t['size'] * (0.8 if t['size'] >= 16 else 0.85), html.escape(t['s'])))
    g.append('</g>'); out.append(''.join(g))

def station_marks(fig, ox, oy):
    marks = []
    for t in fig['T']:
        if t['size'] >= 14 and t['s'] in GAME:
            cx = t['x'] + len(t['s']) * 16 * 0.8 / 2; marks.append((GAME[t['s']], t['s'], cx + ox, oy))
    return marks

def build():
    svg_blocks, notes, stations = [], [], []
    yoff = 20.0
    for row in ROWS:
        figs, pos = place(row['files'], ROOT)
        out = []; xs, ys = [], []
        for f, p, fn in zip(figs, pos, row['files']):
            draw_fig(f, p[0], p[1], out)
            for l in f['L']: xs += [l['x1'] + p[0], l['x2'] + p[0]]; ys += [l['y1'] + p[1], l['y2'] + p[1]]
            for m in station_marks(f, p[0], p[1]): stations.append((row['id'],) + m + (fn,))
            for t in f['T']:
                if t['size'] < 14 and re.search(r'\b(Line|Jct|to |Railway|Rikuu|Senzan|Aterazawa|Yonesaka|Flower|Tazawako|Ou |Omagari)', t['s']): notes.append((row['id'], fn, t['s']))
        x0, x1, y0, y1 = min(xs) - 20, max(xs) + 20, min(ys) - 60, max(ys) + 90
        marks = ''.join('<g><rect x="%.1f" y="%.1f" width="120" height="%.1f" fill="#ffd54a" opacity=".22"/><text x="%.1f" y="%.1f" font-size="13" font-weight="bold" fill="#8a5a00" text-anchor="middle">%s</text></g>' % (m[3] - 60, y0 + 10, (y1 - y0) - 20, m[3], y0 + 24, html.escape(m[1])) for m in stations if m[0] == row['id'])
        svg_blocks.append((row, '<svg id="%s" xmlns="http://www.w3.org/2000/svg" viewBox="%.0f %.0f %.0f %.0f" width="%.0f" height="%.0f" class="row">%s%s</svg>' % (row['id'], x0, y0, x1 - x0, y1 - y0, (x1 - x0) * 1.3, (y1 - y0) * 1.3, marks, ''.join(out))))
    solos = []
    for fn, cap in SOLO:
        f = read_fig(os.path.join(ROOT, fn)); out = []; draw_fig(f, 0, 0, out)
        solos.append((cap, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 724 %d" width="1160" class="row">%s</svg>' % (int(max(max(l['y1'], l['y2']) for l in f['L']) + 40), ''.join(out))))
    return svg_blocks, solos, notes

TABLE = [  # (ga, hình, các ray 1435 mm tại ga theo thứ tự bắc→nam (y tăng), sân ga, token chiều XUỐNG, mã hiện tại trong game, nhận xét)
 ('Yonezawa', 'ou_1/030_03', 'đường thẳng 91,2 · ba đường ga 100,3 / 118,6 / 127,7', 'một sân ga đảo giữa 100,3 và 118,6', 'ddPuu', '2-3-0', 'đường thẳng không kề sân ga; đường ga rẽ khỏi nó bằng ghi lồng nhau (91,2 → 118,6 cắt qua 100,3)'),
 ('Takahata', 'ou_1/030_03', 'đường thẳng 91,2 + đường tránh 109,5', 'hai sân ga bên (phía bắc đường thẳng, phía nam đường tránh)', 'PduP', '1-2-0 (đảo)', 'khác game: sơ đồ là hai sân ga bên chứ không phải đảo'),
 ('Akayu', 'ou_1/030_03', '63,8 (đường tránh) · 73,0 và 91,2 (đoạn đôi Akayu–Kita-Akayu)', 'ba sân ga: bên bắc 63,8, đảo giữa 73,0/91,2, bên nam 91,2', 'PddPuP', '2-3-0', 'có đường nhánh Yamagata Railway Flower Nagai Line (ghi chú trên sơ đồ) rẽ lên phía bắc'),
 ('Kaminoyama-Onsen', 'ou_1/030_04', '36,5 · 54,7 (đoạn đôi) · 73,0 (đường tránh)', 'sân ga bên bắc 36,5; đảo giữa 54,7/73,0', 'PduPu', '2-3-0', 'khớp game; ghi chéo thật: 36,5→54,7 cách ga ~160 m trước và 54,7→36,5 ~160 m sau'),
 ('Yamagata', 'ou_1/030_05', '93,6 · 112,3 · 131,0 · 149,8; đường đôi phía tây (121,6 và 131,0)', 'hai sân ga đảo (93,6/112,3 và 131,0/149,8)', 'dPduPu', '2-4-0', 'khớp game; ba ghi chéo phía tây ga, 112,3 là đường cụt (bay); kèm depot Yamagata Shinkansen và nhánh Aterazawa/Senzan'),
 ('Tendo', 'ou_1/030_06', '9,1 (tránh) · 27,4 · 45,6 (đoạn đôi chỉ trong ga)', 'đảo giữa 9,1/27,4; bên nam 45,6', 'dPduP', '2-3-0', 'khác game (PduPu): sân ga đảo ở phía BẮC'),
 ('Sakuranbo-Higashine', 'ou_1/030_07', 'đường thẳng 27,4 + đường tránh 45,6', 'hai sân ga bên', 'PduP', '1-2-0 (đảo)', 'khác game: hai sân ga bên'),
 ('Murayama', 'ou_1/030_07', '9,1 (tránh) · 27,4 · 36,5', 'đảo giữa 9,1/27,4; bên nam 36,5', 'dPduP', '2-3-0', 'khác game (PduPu)'),
 ('Oishida', 'ou_1/030_07', 'đường thẳng 27,4 + đường tránh 45,6', 'sân ga bên phía bắc + đảo giữa 27,4/45,6', 'PdPu', '1-2-0', 'khác game: một sân ga bên và một sân ga đảo'),
 ('Shinjo', 'ou_1/030_08', '51,1 · 60,5 (đường cụt) và các đường 88,6 / 97,9 / 107,3 / 116,6', 'hai sân ga bên quanh hai đường cụt', 'PduP (ga cuối)', '2-3-0', 'ga cuối; nhiều đường khổ 1435 mm phụ và tuyến Rikuu East/West Line'),
 ('Shizukuishi', 'tazawako/010_03', '36,4 · 45,5 · 63,7 (sơ đồ vẽ theo chiều Omagari→Morioka)', 'bên bắc 36,4 + đảo giữa 45,5/63,7', 'dPuuP (ảnh gương)', '1-2-0', 'chiều XUỐNG của game đi ngược chiều sơ đồ nên chuỗi bị đảo'),
 ('Tazawako', 'tazawako/010_02', '45,5 · 63,7 · 82,0 (đường thẳng 72,8 tách ra rồi nhập lại)', 'đảo giữa 45,5/63,7; bên nam 82,0', 'PduPu (ảnh gương)', '2-3-0', 'khớp game'),
 ('Kakunodate', 'tazawako/010_02', '54,6 (tránh) · 72,8 (thẳng) · 91,1', 'một sân ga đảo giữa 72,8 và 91,1', 'dPuu (ảnh gương)', '2-3-0', 'khác game'),
 ('Omagari', 'tazawako/010_01 + ou_1/030_12', '147,1 · 156,5 · 175,2 (đường cụt hình chữ C)', 'sân ga hình chữ C: bên bắc 147,1 + đảo 156,5/175,2', 'dPuuP (ảnh gương)', '2-3-0', 'ga đổi chiều (switchback): tàu từ Tazawako vào đường cụt rồi chạy ra tuyến Ou; game chỉ có thông báo'),
 ('Akita', 'ou_1/030_14', 'hai đường cụt 205,9 và 224,6 (khổ 1435 mm)', 'một sân ga đảo', 'dPu (ga cuối)', '2-4-0', 'ga cuối; các đường khác trong sơ đồ là đường thường 1067 mm'),
]

CSS = """body{font:14px/1.5 system-ui,sans-serif;margin:16px;color:#111;background:#fff}h1{font-size:20px}h2{font-size:16px;margin-top:28px}.scroll{overflow:auto;border:1px solid #ccc;background:#fafafa;margin:8px 0}svg.row{display:block}
table{border-collapse:collapse;font-size:13px}td,th{border:1px solid #ccc;padding:4px 8px;vertical-align:top}th{background:#eee}.tag{display:inline-block;padding:0 6px;border-radius:8px;background:#eef;font-size:12px}
.note{color:#555;font-size:13px}code{background:#f0f0f0;padding:0 4px}"""

def main():
    blocks, solos, notes = build()
    h = ['<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yamagata và Akita: bản thảo</title><style>' + CSS + '</style></head><body>']
    h.append('<h1>Yamagata và Akita (mini-Shinkansen): bản thảo kiến trúc toàn tuyến để nghiên cứu</h1>')
    h.append('<p class="note">Nguồn: <b>配線略図.net</b> (https://www.haisenryakuzu.net/, CC BY 4.0), các hình <code>ou_1/030_01–030_14</code> và <code>tazawako/010_01–010_05</code>. Trang này được <b>vẽ lại từ số liệu</b> của các SVG (đọc bằng <code>tools/haisen_yam_aki.py</code>), không nhúng và không sửa SVG gốc. '
             'Màu: <span style="color:#0070c0"><b>xanh = ray khổ 1435 mm</b></span> (đường mini-Shinkansen chạy), <span style="color:#7d8792">xám = đường thường 1067 mm</span> (làm nền), ô vàng = ga có trong game. Tỉ lệ không theo thực tế (1 đơn vị ≈ 8,15 m theo chiều dài sân ga); chỗ nối hai hình ghép theo đường chính. <b>Chưa áp dụng vào game.</b></p>')
    for row, svg in blocks:
        h.append('<h2>%s</h2><div class="scroll">%s</div>' % (html.escape(row['title']), svg))
    h.append('<h2>Hai ga chung với Tohoku (đặt riêng, không ghép)</h2>')
    for cap, svg in solos: h.append('<p class="note">%s</p><div class="scroll">%s</div>' % (html.escape(cap), svg))
    h.append('<h2>Cấu hình từng ga theo sơ đồ (token chiều XUỐNG) so với mã hiện có trong game</h2><p class="note">Token: <code>d/u</code> = đường dừng chiều xuống/lên (theo lề trái), <code>P</code> = sân ga; đọc từ trái sang phải trong buồng lái chiều xuống. Số trong cột đường là toạ độ y trên sơ đồ (nhỏ = phía bắc). Cột "mã hiện tại" là mã trong <code>tools/build_struct.py</code>.</p><table><tr><th>Ga</th><th>Hình</th><th>Ray 1435 mm</th><th>Sân ga</th><th>Token</th><th>Mã trong game</th><th>Ghi chú</th></tr>')
    for r in TABLE: h.append('<tr>' + ''.join('<td>%s</td>' % html.escape(c) for c in r) + '</tr>')
    h.append('</table>')
    h.append('<h2>Đoạn đường đôi / đường đơn đọc từ sơ đồ (ray xanh chạy song song)</h2><ul>'
             '<li><b>Yamagata</b>, đường đôi: Fukushima – Sekine (030_02: hai ray xanh suốt hình, qua Sasakino, Niwasaka, Itaya, Tōge, Ōsawa); Akayu – Kita-Akayu (030_03); Uzen-Nakayama – Yamagata (030_04–030_05, qua Kaminoyama-Onsen); Ashizawa – Funagata (030_07–030_08). Còn lại là đường đơn, ga có đường tránh để tàu gặp nhau. Khớp với tên đoạn trong <code>docs/11-mo-rong-tuyen.md</code>; km trong game vẫn là [I].</li>'
             '<li><b>Akita</b>: Morioka – Omagari trên tuyến Tazawako toàn đường đơn (ga có đường tránh: Shizukuishi, Jindai, Tazawako, Sashimaki, Kakunodate...); Omagari – Akita trên Ou Main Line đường đơn, trừ đoạn đôi Jingūji – Mineyoshikawa (030_12, qua Kariwano). Đoạn đôi trong ga chỉ nằm trong khuôn ga (tách rồi nhập lại).</li>'
             '<li>Ga <b>chỉ có một đường chính</b> (Takahata, Sakuranbo-Higashine, Murayama, Oishida, Yonezawa, Shizukuishi, Kakunodate...): đường ga rẽ khỏi nó, nên <b>không có ghi chéo giữa hai đường chính</b>; ghi chéo thật chỉ có ở ga nằm trong đoạn đôi (Kaminoyama-Onsen, Akayu, Yamagata).</li></ul>')
    h.append('<h2>Ghi chú rút ra từ chú thích trong sơ đồ</h2><ul>')
    seen = set()
    for rid, fn, s in notes:
        if (fn, s) in seen: continue
        seen.add((fn, s)); h.append('<li><code>%s</code>: %s</li>' % (html.escape(fn), html.escape(s)))
    h.append('</ul>')
    h.append('</body></html>')
    out = os.path.join(ROOT, 'yam_aki_draft.html')
    open(out, 'w', encoding='utf-8').write('\n'.join(h)); print('ghi', out, os.path.getsize(out), 'byte')

if __name__ == '__main__': main()
