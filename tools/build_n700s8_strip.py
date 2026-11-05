# Dựng dải 8 toa (toa mũi + 6 toa giữa + toa đuôi) từ dải N700S 16 toa, cho các chuyến 8 toa (Sakura, Mizuho: 'N700-8'); ghi assets/n700s8_strip.png
# và thêm mục 'n700s8' vào assets/sprites.js. Chạy: python -X utf8 tools/build_n700s8_strip.py
import json, os, re
from PIL import Image
A = os.path.join(os.path.dirname(__file__), '..', 'prototype', 'drive', 'assets')
meta = json.load(open(os.path.join(A, 'n700s_strip.json'), encoding='utf-8')); im = Image.open(os.path.join(A, 'n700s_strip.png')).convert('RGBA')
cars = meta['cars']; pick = [cars[0]] + [cars[7]] * 6 + [cars[-1]]
W = sum(c['w'] for c in pick); out = Image.new('RGBA', (W, im.height), (0, 0, 0, 0)); x = 0; nc = []
for k, c in enumerate(pick):
    out.alpha_composite(im.crop((c['x'], 0, c['x'] + c['w'], im.height)), (x, 0)); nc.append({'i': k + 1, 'x': x, 'w': c['w']}); x += c['w']
out.save(os.path.join(A, 'n700s8_strip.png'), optimize=True)
m = dict(meta); m.update(name='n700s8', width=W, cars=nc)
p = os.path.join(A, 'sprites.js'); t = open(p, encoding='utf-8').read(); i = t.index('{'); j = t.rindex('}')
d = json.loads(t[i:j + 1]); d['n700s8'] = m
open(p, 'w', encoding='utf-8').write(t[:i] + json.dumps(d) + t[j + 1:])
print('ok', W, len(nc))
