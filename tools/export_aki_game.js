// Xuất cấu trúc ga HIỆN CÓ trong game của đoạn Tazawako (Morioka – Omagari, không gồm hai ga đầu mút) cho tools/haisen_taz_cards.py (không sửa game). Chạy: node tools/export_aki_game.js > docs/data/haisen/taz_game.json
const path = require('path'), D = path.join(__dirname, '..', 'prototype', 'drive');
global.window = global; global.localStorage = { getItem: () => null, setItem() { }, removeItem() { } }; global.hhmm = x => String(x);
require(path.join(D, 'data-lines.js')); require(path.join(D, 'i18n.js')); const Sim = require(path.join(D, 'sim.js')); global.Sim = Sim; require(path.join(D, 'natcat.js')); const Ly = require(path.join(D, 'layout.js'));
const L = Sim.lineOf('aki'), out = { stations: [], single: L.single };
for (const s of L.stations) { if (s.km < 497.5 || s.km > 572) continue; const st = Ly.station(s.lay || '2-2-0', 'down', -1);
  out.stations.push({ jp: s.jp, en: s.en, km: s.km, lay: s.lay, xo: s.xo || null, ours: st.ours.x,
    tracks: st.tracks.map(t => ({ x: t.x, plain: t.plain, main: !!t.main, own: !!t.own, in0: t.in0 === undefined ? null : t.in0, len: t.len === undefined ? null : t.len, out0: t.out0 === undefined ? null : (t.out0 > 1e4 ? 'EXT' : t.out0), len2: t.len2 === undefined ? null : t.len2, fk: !!t.fkr })),
    plats: st.plats.map(p => ({ xa: p.xa, xb: p.xb })), links: (st.links || []).map(l => ({ z0: l.z0, len: l.len, a: st.tracks.indexOf(l.a), b: st.tracks.indexOf(l.b) })) }); }
console.log(JSON.stringify(out));
