// Chạy riêng cho từng ngôn ngữ (node tests/i18n_child.js en|ja): đặt ngôn ngữ TRƯỚC khi nạp các mô-đun (như khi mở trang), chạy một chuyến thật và in JSON các chuỗi còn lọt tiếng Việt.
const path = require('path'), DRIVE = path.join(__dirname, '..', 'prototype', 'drive'), lang = process.argv[2];
global.window = global; global.__LANG = lang;
global.localStorage = (() => { const m = {}; return { getItem: k => m[k] || null, setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })();
require(path.join(DRIVE, 'i18n.js')); require(path.join(DRIVE, 'lang-en.js')); require(path.join(DRIVE, 'lang-ja.js')); require(path.join(DRIVE, 'data-lines.js'));
const Sim = require(path.join(DRIVE, 'sim.js')); global.Sim = Sim; require(path.join(DRIVE, 'natcat.js')); require(path.join(DRIVE, 'layout.js')); require(path.join(DRIVE, 'store.js')); require(path.join(DRIVE, 'tutorial.js'));
const VNX = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/;
const leaks = [], n = { msgs: 0 };
const chk = (tag, s) => { if (VNX.test(s)) leaks.push(tag + ': ' + s.slice(0, 90)); };
chk('DIFF', JSON.stringify(Sim.DIFF)); chk('WEATHER', JSON.stringify(Sim.WEATHER)); chk('VEH', JSON.stringify(Sim.VEH));
for (const a of Store.ACH) { chk('ACH.name', a.name); chk('ACH.desc', a.desc); }
for (const l of Tutorial.LESSONS) chk('LESSON ' + l.id, JSON.stringify(l));
for (const id of Object.keys(window.LINES)) { const L = Sim.lineOf(id); chk('LINE.meta ' + id, JSON.stringify(L.meta)); }
// chạy vài chuyến có sự kiện, thời tiết xấu, ghép tàu nhánh: gom mọi tin nhắn
const run = (lid, dir, seed, weather, couple) => {
  const rec = Sim.lineOf(lid).trains.find(t => t.d === dir && !t.cp && t.s.filter(e => !e[3]).length > 3); if (!rec) return; const st = rec.s.filter(e => !e[3]).map(e => e[0]);
  const W = Sim.createWorld(lid, Sim.makeTrip(lid, rec, st[0], st[st.length - 1]), { diff: 'hard', seed, weather, events: true, lead: true, couple }), T = W.player; Sim.requestClose(T);
  let k = 0; while (!T.finished && k++ < 2.5e5 && W.t < 9000) Sim.tick(W, 0.05, {}, true);
  for (const m of W.msgs) { n.msgs++; chk('msg ' + lid, JSON.stringify(m)); }
  for (const l of T.log || []) chk('log ' + lid, JSON.stringify(l));
  // lời khuyên cuối chuyến và tổng kết điểm không nằm trong sim: bỏ qua
};
for (const [lid, dir, seed, w, c] of [['tsk', 'down', 3, 'rain', 'auto'], ['tsk', 'up', 5, 'snow', 'auto'], ['toh', 'down', 2, 'typhoon', 'always'], ['jts', 'down', 4, 'rain', 'auto'], ['hok', 'up', 6, 'snow', 'auto'], ['yam', 'down', 7, 'rain', 'always'], ['aki', 'down', 8, 'clear', 'always'], ['nks', 'down', 9, 'rain', 'auto']]) run(lid, dir, seed, w, c);
console.log(JSON.stringify({ lang, msgs: n.msgs, leaks }));
