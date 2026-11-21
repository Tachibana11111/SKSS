// Xuất cấu trúc ga/tuyến Yamagata HIỆN CÓ trong game cho tools/haisen_yam_chart.py (không sửa game). Chạy: node tools/export_yam_game.js > docs/data/haisen/yam_game.json
const path = require('path'), D = path.join(__dirname, '..', 'prototype', 'drive');
global.window = global; global.localStorage = { getItem: () => null, setItem() { }, removeItem() { } }; global.hhmm = x => String(x);
require(path.join(D, 'data-lines.js')); require(path.join(D, 'i18n.js')); const Sim = require(path.join(D, 'sim.js')); global.Sim = Sim; require(path.join(D, 'natcat.js')); const Ly = require(path.join(D, 'layout.js'));
const L = Sim.lineOf('yam'), out = { stations: [], single: L.single, curves: L.curves.filter(c => c[0] > 250), junctions: L.meta.junctions.filter(j => j.fk) };
const FUK_EXT = Ly.TKS_EXT;
for (const s of L.stations) { if (s.km < 255) continue; const st = Ly.station(s.lay || '2-2-0', 'down', -1);
  out.stations.push({ jp: s.jp, en: s.en, km: s.km, lay: s.lay, xo: s.xo || null, ours: st.ours.x,
    tracks: st.tracks.map(t => ({ x: t.x, plain: t.plain, main: !!t.main, own: !!t.own, in0: t.in0 === undefined ? null : t.in0, len: t.len === undefined ? null : t.len, out0: t.out0 === undefined ? null : (t.out0 > 1e4 ? 'EXT' : t.out0), len2: t.len2 === undefined ? null : t.len2, fk: !!t.fkr })),
    plats: st.plats.map(p => ({ xa: p.xa, xb: p.xb })), links: (st.links || []).map(l => ({ z0: l.z0, len: l.len, a: st.tracks.indexOf(l.a), b: st.tracks.indexOf(l.b) })) }); }
console.log(JSON.stringify(out));
