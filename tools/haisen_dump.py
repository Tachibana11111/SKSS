# -*- coding: utf-8 -*-
# Liệt kê phần tử SVG kèm kiểu đã giải (stroke, độ dày, fill) để đọc cấu trúc ga.
import re, sys, collections
import xml.etree.ElementTree as ET
NS = '{http://www.w3.org/2000/svg}'

def styles(root):
    css = ''.join((e.text or '') for e in root.iter(NS + 'style'))
    st = collections.defaultdict(dict)
    for m in re.finditer(r'([^{}]+)\{([^}]*)\}', css):
        props = {k.strip(): v.strip() for k, v in (p.split(':', 1) for p in m.group(2).split(';') if ':' in p)}
        for sel in m.group(1).split(','):
            sel = sel.strip()
            if sel.startswith('.'): st[sel[1:]].update(props)
    return st

def load(path):
    t = re.sub(r'<\?xml[^>]*\?>|<!DOCTYPE[^>]*>', '', open(path, encoding='utf-8').read())
    root = ET.fromstring(t); return root, styles(root)

def sty(el, st):
    d = {}
    for c in (el.get('class') or '').split(): d.update(st.get(c, {}))
    for k in ('stroke', 'fill', 'stroke-width'):
        if el.get(k): d[k] = el.get(k)
    return d

if __name__ == '__main__':
    root, st = load(sys.argv[1])
    print('viewBox', root.get('viewBox'))
    for el in root.iter():
        tag = el.tag.replace(NS, '')
        if tag in ('svg', 'style', 'defs'): continue
        s = sty(el, st); key = 'stroke=%s w=%s fill=%s' % (s.get('stroke', '-'), s.get('stroke-width', '-'), s.get('fill', '-'))
        if tag == 'line': print('L  %7.1f %7.1f -> %7.1f %7.1f  %s' % (float(el.get('x1') or 0), float(el.get('y1') or 0), float(el.get('x2') or 0), float(el.get('y2') or 0), key))
        elif tag == 'rect': print('R  x=%s y=%s w=%s h=%s %s' % (el.get('x'), el.get('y'), el.get('width'), el.get('height'), key))
        elif tag == 'path': print('P  d=%s %s' % (el.get('d')[:200], key))
        elif tag == 'text': print('T  %s %s %r' % (el.get('transform'), s.get('font-size', ''), ''.join(el.itertext()).strip()))
        elif tag == 'g': print('G  %s %s' % (el.get('transform'), dict(el.attrib)))
        else: print(tag, el.attrib)
