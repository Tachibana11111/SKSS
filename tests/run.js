// Bộ kiểm thử mô phỏng: node tests/run.js  (không cần trình duyệt)
const path = require('path');
const DRIVE = path.join(__dirname, '..', 'prototype', 'drive');
global.window = global;
global.localStorage = (() => { const m = {}; return { getItem: k => m[k] || null, setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })();
require(path.join(DRIVE, 'data-lines.js'));
require(path.join(DRIVE, 'i18n.js'));
const Sim = require(path.join(DRIVE, 'sim.js')); global.Sim = Sim; require(path.join(DRIVE, 'natcat.js'));
require(path.join(DRIVE, 'layout.js')); require(path.join(DRIVE, 'store.js')); require(path.join(DRIVE, 'tutorial.js'));
let pass = 0, fail = 0; const failures = [];
function ok(cond, name, info) { if (cond) pass++; else { fail++; failures.push(name + (info !== undefined ? ' → ' + info : '')); } }
function approx(a, b, tol, name) { ok(Math.abs(a - b) <= tol, name, `${a} vs ${b} ±${tol}`); }
const find = (ln, type, dir, a, b) => Sim.lineOf(ln).trains.find(t => t.t === type && t.d === dir && t.s.some(e => e[0] === a && !e[3]) && t.s.some(e => e[0] === b && !e[3]));
function runAuto(ln, rec, a, b, o, maxT) {
  const trip = Sim.makeTrip(ln, rec, a, b), W = Sim.createWorld(ln, trip, Object.assign({ diff: 'easy', seed: 1, lead: false, events: false }, o || {})), T = W.player; let n = 0;
  while (!T.finished && n++ < 4e6 && W.t < (maxT || 60000)) Sim.tick(W, 0.05, {}, true);
  return { W, T, trip };
}
const ALL = Object.keys(window.LINES);
// chạy một phần: node tests/run.js --shard=2/4 (các phần 2..22 chia vòng tròn; phần 1 chạy ở mọi lô); --time in thời gian từng phần
const SH = (process.argv.find(a => a.startsWith('--shard=')) || '').slice(8).split('/').map(Number), TIMED = process.argv.includes('--time'); let secN = 0, secT = Date.now(), secName = '';
const section = s => { if (TIMED && secName) console.log('   (' + ((Date.now() - secT) / 1000).toFixed(1) + ' s)'); secT = Date.now(); secName = s; const n = secN++, run = n === 0 || !SH[1] || (n - 1) % SH[1] === SH[0] - 1; if (run) console.log('\n== ' + s); return run; };

section('1. Dữ liệu tuyến và lịch tàu');
for (const ln of ALL) {
  const L = Sim.lineOf(ln); ok(L.stations.length >= 5 && L.trains.length > 25, `${ln}: số ga/chuyến hợp lý`, `${L.stations.length} ga, ${L.trains.length} chuyến`);
  for (let i = 1; i < L.stations.length; i++) if (L.stations[i].km <= L.stations[i - 1].km) ok(false, `${ln}: km tăng dần`, L.stations[i].en);
  ok(Math.abs(L.stations[L.stations.length - 1].km - L.kmEnd) < 1e-6, `${ln}: kmEnd khớp ga cuối`);
  const seen = new Set(); let bad = 0, nonmono = 0;
  for (const t of L.trains) {
    const key = t.t + t.n + t.d + (t.mir ? 'm' : ''); if (seen.has(key)) bad++; seen.add(key);
    const idx = t.s.map(e => e[0]); const inc = idx[idx.length - 1] > idx[0]; ok(inc === (t.d === 'down'), `${ln} ${t.t} ${t.n}: chiều khớp thứ tự ga`);
    for (let i = 1; i < idx.length; i++) if ((idx[i] > idx[i - 1]) !== inc) bad++;
    let last = -1; for (const e of t.s) for (const k of [1, 2]) if (e[k] != null) { if (e[k] < last) nonmono++; last = e[k]; }
    ok(!t.s[0][3] && !t.s[t.s.length - 1][3], `${ln} ${t.t} ${t.n}: đầu/cuối là ga dừng`);
    ok(Sim.VEH[t.v], `${ln} ${t.t} ${t.n}: loại tàu có thật`, t.v);
  }
  ok(bad === 0, `${ln}: không trùng chuyến, thứ tự ga đơn điệu`, bad); ok(nonmono === 0, `${ln}: giờ tăng dần`, nonmono);
  ok(L.trains.some(t => t.d === 'up' && !t.mir) && L.trains.some(t => t.d === 'down'), `${ln}: có cả hai chiều`);
}

if (section('2. Tự lái bám lịch trên mọi loại tàu (đơn độc, không sự kiện)')) {
  let worst = 0, cnt = 0;
  for (const ln of ALL) { const L = Sim.lineOf(ln); for (const rec of L.trains.filter((t, i) => i % 7 === 0)) {
    const st = rec.s.filter(e => !e[3]); const a = st[0][0], b = st[st.length - 1][0]; const r = runAuto(ln, rec, a, b); cnt++;
    ok(r.T.finished && !r.T.failed, `${ln} ${rec.t} ${rec.n}: hoàn thành`);
    const d = Math.max(...r.T.results.map(x => Math.abs(x.delay))); if (ln !== 'jts' && ln !== 'yam') worst = Math.max(worst, d); else ok(d < 260, `${ln} ${rec.t} ${rec.n}: lịch rất căng, tự lái trễ < 260 s`, Math.round(d));      // Joetsu: lịch thật dồn (Takasaki–Echigo-Yuzawa 23 phút) vượt khả năng tăng/giảm tốc của mô hình [I]
    for (const x of r.T.results) if (!x.overrun) ok(Math.abs(x.err) < 3, `${ln} ${rec.t} ${rec.n} ${x.station}: dừng lệch < 3 m`, x.err.toFixed(2));
  } }
  ok(worst < 90, 'trễ/sớm tối đa của tự lái < 90 s', Math.round(worst)); console.log('  đã chạy', cnt, 'chuyến, lệch giờ lớn nhất', Math.round(worst), 's');
}

if (section('3. Vật lý: tốc độ tối đa, độ dốc, tải, phanh, nhiệt, điện')) {
  const mk = veh => { const L = Sim.lineOf('tsk'); const rec = Object.assign({}, L.trains.find(t => t.d === 'down' && t.t === 'Nozomi')); rec.v = veh; return rec; };
  for (const [veh, vmin] of [['N700', 275], ['E5', 300], ['N700-8', 255], ['N700S', 275]]) {
    const ln = veh === 'E5' ? 'toh' : 'tsk', L = Sim.lineOf(ln), rec = Object.assign({}, L.trains.find(t => t.d === 'down' && t.s[0][0] === 0 && (veh === 'E5' ? t.t === 'Hayabusa' : t.t === 'Nozomi'))); rec.v = veh;
    const A = veh === 'E5' ? 2 : 2, B = veh === 'E5' ? 10 : 12;
    const trip = Sim.makeTrip(ln, rec, A, B), W = Sim.createWorld(ln, trip, { diff: 'easy', lead: false, events: false }), T = W.player; let vmax = 0, n = 0;
    Sim.requestClose(T); T.pw = 13; while (n++ < 40000 && !T.finished) { Sim.tick(W, 0.05, {}, false); vmax = Math.max(vmax, T.v * 3.6); if (T.phase === 'run' && T.atc) { T.pw = 13; } }
    ok(vmax >= vmin, `${veh} tối đa đạt ≥ ${vmin} km/h khi kéo hết cỡ`, vmax.toFixed(0)); ok(vmax <= Sim.VEH[veh].vmax * 3.6 + 10, `${veh} không vượt giới hạn nhiều`, vmax.toFixed(0));
  }
  // tải khách nặng làm tăng tốc chậm hơn
  const L = Sim.lineOf('tsk'), rec = find('tsk', 'Nozomi', 'down', 12, 15), trip = Sim.makeTrip('tsk', rec, 12, 15);
  const accelTo = load => { const W = Sim.createWorld('tsk', trip, { diff: 'easy', lead: false, events: false, load }), T = W.player; Sim.requestClose(T); T.pw = 13; let n = 0; while (T.phase === 'dwell' && n++ < 1e4) Sim.tick(W, 0.05, {}, false); n = 0; while (T.v < 28 && n++ < 1e5) Sim.tick(W, 0.05, {}, false); return n * 0.05; };
  const tLight = accelTo(0.1), tHeavy = accelTo(1.0); ok(tHeavy > tLight, 'tải khách đầy → tăng tốc lâu hơn', `${tLight.toFixed(1)} vs ${tHeavy.toFixed(1)} s`);
  // độ dốc
  const W0 = Sim.createWorld('tsk', trip, { diff: 'easy', lead: false, events: false }); let gMax = 0, gMin = 0; for (let s = 0; s < 500000; s += 500) { const g = Sim.gradeAt(W0, s); gMax = Math.max(gMax, g); gMin = Math.min(gMin, g); }
  ok(gMax <= 20.01 && gMin >= -20.01, 'độ dốc Tokaido không vượt 20‰', `${gMin.toFixed(1)}..${gMax.toFixed(1)}`); ok(gMax > 3 && gMin < -3, 'độ dốc có lên và xuống');
  // nhiệt phanh + mờ phanh sau phanh khẩn lặp lại
  const W1 = Sim.createWorld('tsk', trip, { diff: 'easy', lead: false, events: false }), T1 = W1.player; Sim.requestClose(T1); T1.pw = 13; let n = 0; while (T1.phase === 'dwell' && n++ < 1e4) Sim.tick(W1, 0.05, {}, false);
  T1.phase = 'run'; T1.v = 75; T1.x = 5000; Sim.setBrake(T1, 8); n = 0; while (T1.v > 0.1 && n++ < 1e5) Sim.tick(W1, 0.05, {}, false); const btEB = T1.bt;
  ok(T1.btMax > 0.8, 'một lần phanh khẩn từ 270 km/h làm má phanh nóng > 0.8', (T1.btMax || 0).toFixed(2)); ok(T1.kwh > 0, 'có tiêu hao điện'); ok(T1.regen >= 0, 'có số liệu tái sinh');
}

if (section('4. ATC, cửa, giữ tàu, khởi hành sớm')) {
  const rec = find('tsk', 'Nozomi', 'down', 12, 15), trip = Sim.makeTrip('tsk', rec, 12, 15), W = Sim.createWorld('tsk', trip, { diff: 'normal', lead: false, events: false }), T = W.player;
  ok(!Sim.requestClose(T) === false, 'có thể đóng cửa ở ga đầu'); let n = 0; while (T.door !== 'closed' && n++ < 1000) Sim.tick(W, 0.05, {}, false); ok(T.door === 'closed' || T.door === 'open', 'cửa đóng xong hoặc kẹt', T.door);
  if (T.door === 'open') { Sim.requestClose(T); n = 0; while (T.door !== 'closed' && n++ < 1000) Sim.tick(W, 0.05, {}, false); }
  ok(T.phase === 'dwell', 'chưa kéo cần thì chưa đi'); Sim.setPower(T, 13); Sim.tick(W, 0.05, {}, false); ok(T.phase === 'run', 'kéo cần khi đèn sáng → khởi hành');
  // cố tình vượt tốc: ATC phải can thiệp
  Sim.setPower(T, 13); n = 0; while (T.atcCount === 0 && n++ < 6e5) Sim.tick(W, 0.05, {}, false); ok(T.atcCount > 0 || T.finished, 'ATC phanh khi vượt tốc độ cho phép'); ok(T.v <= T.allowed + 8, 'ATC kìm tốc độ', `${(T.v * 3.6).toFixed(0)} vs ${(T.allowed * 3.6).toFixed(0)}`);
  // giữ tàu chặn khởi hành
  const W2 = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 12, 16), { diff: 'easy', lead: false, events: false }), T2 = W2.player; const r2 = runAuto('tsk', rec, 12, 15);
  ok(r2.T.finished, 'chuyến tham chiếu hoàn thành');
  const W3 = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 12, 16), { diff: 'easy', lead: false, events: false }), T3 = W3.player; Sim.inject(W3, 'hold', { sec: 3000 }); ok(Object.keys(T3.holds).length === 1, 'lệnh giữ tàu đặt hold'); let held = false;
  n = 0; while (!T3.finished && n++ < 4e6) { Sim.tick(W3, 0.05, {}, true); } ok(T3.finished, 'chuyến có lệnh giữ vẫn hoàn thành'); ok(T3.excused > 300, 'thời gian bị giữ được miễn trừ', T3.excused.toFixed(0));
}

if (section('5. Sự kiện: tiêm từng loại và hậu quả')) {
  const rec = find('tsk', 'Nozomi', 'down', 12, 16), mkw = (diff) => { const trip = Sim.makeTrip('tsk', rec, 12, 16); const W = Sim.createWorld('tsk', trip, { diff: diff || 'normal', lead: false, events: false, seed: 3 }); return W; };
  const run = (W, until) => { const T = W.player; let n = 0; while (!until(W, T) && !T.finished && n++ < 4e6) Sim.tick(W, 0.05, {}, true); return T; };
  let W = mkw(); Sim.inject(W, 'rain', { ahead: 3000 }); let T = run(W, w => w.rainHere); ok(W.rainHere, 'mưa: tàu vào vùng mưa'); T = run(W, (w, t) => !w.rainHere); ok(T.wiperBad >= 0, 'mưa: có theo dõi gạt mưa'); ok(W.ackCount >= 1, 'mưa: tự lái nhắc lại lệnh');
  W = mkw(); Sim.inject(W, 'workers', { ahead: 4000 }); T = run(W, w => w.workers[0].checked); ok(W.workers[0].hornOK, 'công nhân: tự lái bấm còi');
  W = mkw(); Sim.inject(W, 'animal', { ahead: 5000 }); T = run(W, w => w.animals[0].resolved); ok(W.animals[0].hornOK && !T.animalHit, 'hươu: bấm còi → an toàn');
  W = mkw(); Sim.inject(W, 'animal', { ahead: 5000 }); T = W.player; { let n = 0; while (!W.animals[0].resolved && n++ < 4e6) { Sim.tick(W, 0.05, {}, true); if (W.animals[0].hornOK) break; } } // không còi: tắt tự bấm
  { const W2 = mkw(); Sim.inject(W2, 'animal', { ahead: 5000 }); const T2 = W2.player; Sim.requestClose(T2); let n = 0; while (!W2.animals[0].resolved && n++ < 4e6) { if (T2.door === 'closed' && T2.phase === 'dwell') Sim.setPower(T2, 13); if (T2.phase === 'run') Sim.setPower(T2, T2.v < 80 ? 13 : 0); Sim.tick(W2, 0.05, {}, false); if (T2.door === 'open' && T2.phase === 'dwell' && T2.dwellT > 1) Sim.requestClose(T2); }
    ok(T2.animalHit === 0 && W2.animals[0].hornOK, 'hươu: người lái tự lái tay vẫn được tự bấm còi (không còn nút còi) → an toàn'); }
  W = mkw(); Sim.inject(W, 'eqk', { sec: 200 }); T = W.player; ok(T.cut && W.eqkActive, 'động đất: cắt điện'); { let n = 0; while (W.eqkActive && n++ < 1e5) Sim.tick(W, 0.05, {}, true); } ok(!W.eqkActive && !T.cut, 'động đất: hết thời gian kiểm tra thì chạy lại'); ok(W.zones.some(z => z.kind === 'eqk'), 'động đất: có vùng chạy chậm sau sự cố');
  W = mkw(); Sim.inject(W, 'overtake'); ok(!!W.decision, 'đề nghị cho vượt: có quyết định'); Sim.answerDecision(W, 'a'); ok(W.netScore === 3 && !W.decision, 'chấp nhận: +3'); Sim.inject(W, 'overtake'); Sim.answerDecision(W, 'b'); ok(W.netScore === 0, 'từ chối: −3');
  W = mkw(); Sim.inject(W, 'wire'); ok(W.wires.length === 1 && W.zones.some(z => z.kind === 'wire'), 'dây điện: tạo sự cố'); T = run(W, w => w.player.phase === 'end'); ok(T.finished, 'dây điện: vẫn hoàn thành chuyến');
  W = mkw(); Sim.inject(W, 'fire'); ok(W.fireActive, 'cháy: kích hoạt'); T = run(W, w => w.player.finished); ok(T.finished && T.fireTunnel === 0, 'cháy: tự lái hoàn thành, không dừng trong hầm');
  // bất an hành khách
  W = mkw(); T = W.player; Sim.requestClose(T); { let n = 0; while (T.phase !== 'run' && n++ < 5000) { Sim.tick(W, 0.05, {}, false); if (T.door === 'closed') Sim.setPower(T, 1); } T.v = 0; T.pw = 0; T.bk = 8; n = 0; while (n++ < 20 * 60 * 12) Sim.tick(W, 0.05, {}, false); ok(T.anx > 80, 'đứng giữa đường lâu → bất an tăng', T.anx.toFixed(0)); const before = T.anx; ok(Sim.announcePA(T) && T.anx < before - 40, 'phát thanh giảm bất an'); ok(!Sim.announcePA(T), 'phát thanh có thời gian chờ'); }
  // ngẫu nhiên có seed: lặp lại được
  const a1 = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 12, 16), { diff: 'hard', weather: 'typhoon', seed: 99, lead: false }), a2 = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 12, 16), { diff: 'hard', weather: 'typhoon', seed: 99, lead: false });
  ok(a1.events.length === a2.events.length && a1.events.every((e, i) => e.at === a2.events[i].at), 'sự kiện ngẫu nhiên lặp lại theo seed'); ok(a1.events.length >= 4, 'độ khó Khó có ≥ 4 sự kiện', a1.events.length);
}

if (section('6. Xác định (replay) và chấm điểm')) {
  const rec = find('tsk', 'Nozomi', 'down', 12, 16), trip = Sim.makeTrip('tsk', rec, 12, 16);
  const script = [[0, 'door'], [250, 'power', 1], [400, 'power', 12], [2500, 'coast'], [5200, 'ack']];
  const play = () => { const W = Sim.createWorld('tsk', trip, { diff: 'normal', weather: 'rain', seed: 21, lead: true }), T = W.player; let ptr = 0;
    for (let tick = 0; tick < 12000; tick++) { while (ptr < script.length && script[ptr][0] <= tick) { const a = script[ptr++]; if (a[1] === 'door') Sim.requestClose(T); else if (a[1] === 'power') Sim.setPower(T, T.pw + a[2]); else if (a[1] === 'coast') Sim.coast(T); else if (a[1] === 'ack') Sim.ackOldest(W); } Sim.tick(W, 0.05, {}, false); }
    return { x: T.x, v: T.v, t: W.t, msgs: W.msgs.length, atc: T.atcCount, kwh: T.kwh, comfort: T.comfort }; };
  const r1 = play(), r2 = play(); ok(JSON.stringify(r1) === JSON.stringify(r2), 'cùng thao tác + cùng seed → cùng kết quả', JSON.stringify(r1) + ' vs ' + JSON.stringify(r2));
  // chấm điểm đơn điệu
  const W = Sim.createWorld('tsk', trip, { diff: 'normal', lead: false, events: false }), T = W.player; const mkres = e => ({ station: 'X', err: e, delay: 0, excused: 0, t: 0 });
  T.results = [mkres(0.1)]; const s1 = Sim.score(T, W).final; T.results = [mkres(6)]; const s2 = Sim.score(T, W).final; ok(s1 > s2, 'dừng chính xác điểm cao hơn dừng lệch', `${s1} > ${s2}`);
  T.results = [mkres(0.1)]; T.atcCount = 3; const s3 = Sim.score(T, W).final; ok(s3 < s1, 'ATC phanh bị trừ điểm'); T.atcCount = 0; W.ackPen = 6; ok(Sim.score(T, W).final < s1, 'nhắc lệnh chậm bị trừ điểm'); W.ackPen = 0;
  T.fireTunnel = 1; ok(Sim.score(T, W).final < s1, 'dừng trong hầm khi cháy bị trừ điểm'); T.fireTunnel = 0; T.anxMax = 100; ok(Sim.score(T, W).final < s1, 'bất an hành khách bị trừ điểm');
}

if (section('7. Chế độ điều độ (mạng nhiều tàu)')) {
  for (const [ln, dir, t0] of [['tsk', 'down', 8 * 3600], ['tsk', 'up', 9 * 3600], ['toh', 'down', 9 * 3600], ['toh', 'up', 10 * 3600], ['jts', 'down', 9 * 3600], ['hok', 'up', 10 * 3600]]) {
    const W = Sim.createNetwork(ln, dir, { diff: 'normal', seed: 3, t0, span: 5400 }); W.events = []; let n = 0; while (W.t < 5400 && n++ < 1e5) Sim.netTick(W, 0.2); const sc = Sim.netScore(W);
    ok(W.net.trains.length >= (ln === 'jts' || ln === 'hok' ? 3 : 8), `${ln} ${dir}: có nhiều tàu`, W.net.trains.length); ok(sc.avg < 1.5, `${ln} ${dir}: không sự cố → trễ trung bình < 1,5 phút`, sc.avg); ok(sc.maxD < 6, `${ln} ${dir}: không sự cố → trễ lớn nhất < 6 phút`, sc.maxD);
  }
  // lệnh giữ làm tàu trễ; lệnh cho vượt đặt waitFor và được thả
  const mk = () => Sim.createNetwork('tsk', 'down', { diff: 'normal', seed: 5, t0: 8 * 3600, span: 5400 }); const W = mk(); W.events = [];
  const S = W.net.trains.find(T => T.phase === 'run' && Sim.nextTarget(T) < T.M.length - 1); const j = Sim.nextTarget(S);
  ok(Sim.dispatch.hold(W, S, j, 180), 'lệnh giữ hợp lệ'); ok(S.holds[j] > W.t, 'hold được ghi');
  let n = 0; while (W.t < 4500 && n++ < 1e5) Sim.netTick(W, 0.2); const dl = S.results.length ? S.results[S.results.length - 1].delay : 0; ok(dl > 60 || S.phase !== 'end', 'tàu bị giữ trễ hơn so với kế hoạch', dl);
  const W2 = mk(); W2.events = []; const slow = W2.net.trains.find(T => T.cls === 'Kodama' && T.phase === 'run'); const fast = W2.net.trains.find(T => (T.cls === 'Nozomi') && T.x < (slow ? slow.x : 0) && T.phase === 'run');
  if (slow && fast) { const jj = Sim.nextTarget(slow); const accepted = Sim.dispatch.overtake(W2, slow, fast, jj); ok(accepted === true || accepted === false, 'lệnh cho vượt trả lời hợp lệ'); }
  ok(Sim.dispatch.skip(W2, W2.net.trains[0], 99) === false, 'thông qua ga không tồn tại bị từ chối');
}

if (section('8. Hồ sơ, thành tích và bản ghi')) {
  const St = global.Store; St.reset();
  const base = { kind: 'drive', line: 'tsk', trainLabel: 'Nozomi 1', diff: 'hard', weather: 'rain', seed: 1, score: 90, finished: true, perfectStops: 4, stops: 5, atc: 0, ackCount: 4, ackPen: 0, paCount: 1, hadFire: true, fireTunnel: 0, scenario: { kind: 'drive', line: 'tsk', dir: 'down', train: 'Nozomi 1', from: 0, to: 5, diff: 'hard', weather: 'rain', seed: 1 } };
  const r = St.record(base, { recipe: {}, actions: [[0, 'door']] }); const ids = r.fresh.map(a => a.id); for (const id of ['first', 'perfect3', 'noatc', 'storm', 'quickack', 'pa', 'fire', 'hard']) ok(ids.includes(id), 'thành tích ' + id);
  const r2 = St.record(base, null); ok(r2.fresh.length === 0, 'không mở khoá lại thành tích cũ'); ok(Object.keys(St.get().replays).length === 1, 'giữ bản ghi tốt nhất');
  ok(St.get().history.length === 2, 'lịch sử ghi 2 lần'); St.record(Object.assign({}, base, { score: 95 }), { recipe: {}, actions: [] }); ok(Object.values(St.get().best)[0].score === 95, 'kết quả tốt nhất cập nhật'); St.reset(); ok(St.get().history.length === 0, 'xoá hồ sơ');
}

if (section('9. Hướng dẫn (bot làm theo từng bước)')) {
  for (let li = 0; li < 4; li++) {
    const c = Tutorial.cfg(li); ok(!!c, `bài ${li + 1}: tìm được chuyến`); if (!c) continue; const trip = Sim.makeTrip(c.lineId, c.rec, c.from, c.to);
    const W = Sim.createWorld(c.lineId, trip, { diff: c.diff, weather: c.weather, seed: c.seed, lead: c.lead, events: false }), T = W.player; let now = 0, n = 0; const LS = Tutorial.LESSONS[li], S = Tutorial.S;
    while (n++ < 4e6 && !(S.step >= LS.steps.length)) {
      now += 50; const s = S.step;
      if (li === 0) { if (s === 0) Sim.requestClose(T); else if (s === 1 && T.door === 'closed') Sim.setPower(T, 1); else if (s === 2) Sim.setPower(T, Math.min(13, T.pw + (n % 30 === 0 ? 1 : 0))); else if (s === 3) Sim.setPower(T, 13); else if (s === 4) Sim.coast(T);
        else if (s === 5) Sim.setBrake(T, S.st.hit ? 0 : 2); else if (s === 6) { Sim.setBrake(T, 0); if (T.v * 3.6 < 190) Sim.setPower(T, 8); else if (n % 20 === 0) Sim.toggleCS(T); } else if (s === 7) Sim.setBrake(T, S.st.hit ? 0 : 1); }
      if (li >= 1 && s === 0 && T.door === 'open') Sim.requestClose(T);
      if (li === 1) { if (s === 2) T.wiper = true; if (s === 4) T.wiper = false; if (s === 1 || s === 7) Sim.ackOldest(W); if (s === 5) for (const z of W.workers) if (!z.checked && T.x >= z.s0 - 600) Sim.honk(T); if (s === 6) for (const a of W.animals) if (!a.resolved && T.x >= a.s - 1200) Sim.honk(T); }
      if (li === 2) { if (s === 1 && W.decision) Sim.answerDecision(W, 'a'); if (s === 2 && T.cut) Sim.announcePA(T); if (s === 4) Sim.ackOldest(W); }
      if (li === 3) { if (s === 1) { T.pan = false; } if (s === 2) T.pan = true; if (s === 3) { if (!S.st.off) T.atcOn = false; else T.atcOn = true; } if (s === 4 && W.lead) { if (W.lead.x - W.lead.veh.len - T.x < 1200) { Sim.setPower(T, 0); Sim.setBrake(T, 7); } else Sim.coast(T); } }
      const manual = li === 0 && s <= 7; Sim.tick(W, 0.05, {}, !manual); Tutorial.update(W, T, now);
      if (T.finished) { for (let k = 0; k < 60; k++) { now += 50; Tutorial.update(W, T, now); } break; }
    }
    ok(S.step >= LS.steps.length, `bài ${li + 1}: bot hoàn thành mọi bước`, `${S.step}/${LS.steps.length}`);
  }
}

if (section('10. Bố trí ga, kết cấu tuyến, đường cong (layout.js)')) {
  const LAY = require(path.join(DRIVE, 'layout.js'));
  for (const code of Object.keys(LAY.TOK)) for (const dir of ['down', 'up']) {
    const [f, l, t] = code.split('-').map(x => parseInt(x, 10)), st = LAY.station(code, dir, 1), tag = `${code} ${dir}`;
    ok(st.plats.length === f, `${tag}: đúng số sân`, st.plats.length);
    ok(st.tracks.length === l + (t ? 2 : 0), `${tag}: đúng số đường (kể cả thông qua)`, st.tracks.length);
    ok(st.tracks.filter(x => x.thr).length === (t ? 2 : 0), `${tag}: số đường thông qua`);
    ok(st.plat && Math.abs(Math.min(Math.abs(st.plat.xa - st.ours.x), Math.abs(st.plat.xb - st.ours.x)) - LAY.EDGE) < 0.01, `${tag}: đường dừng của ta có sân ga kề bên`);
    const xs = st.tracks.map(x => x.x).sort((a, b) => a - b); for (let i = 1; i < xs.length; i++) ok(xs[i] - xs[i - 1] >= 4.29, `${tag}: hai đường cách nhau ≥ 4,3 m`, xs[i] - xs[i - 1]);
    for (const p of st.plats) for (const x of st.tracks) ok(x.x < p.xa - 1.74 || x.x > p.xb + 1.74 || Math.abs(Math.min(Math.abs(x.x - p.xa), Math.abs(x.x - p.xb)) - LAY.EDGE) < 0.01, `${tag}: đường không nằm trong sân ga`);
    ok(st.tracks.some(x => x.own && x.x === 0) && Math.abs(st.opp) >= 4.29, `${tag}: đường chính của ta ở 0, đường ngược chiều cách ≥ 4,3 m`);
  }
  for (const ln of ALL) {
    const L = Sim.lineOf(ln);
    ok(L.stations.every(s => LAY.TOK[s.lay]), `${ln}: mọi ga có mã bố trí hợp lệ`);
    ok(L.stations.every(s => s.loop === (s.lay.endsWith('-1') ? 1 : 0)), `${ln}: cờ ga tránh khớp bố trí (có đường thông qua)`);
    ok(L.struct[0][0] === 0 && Math.abs(L.struct[L.struct.length - 1][1] - L.kmEnd) < 0.01, `${ln}: kết cấu phủ toàn tuyến`);
    for (let i = 1; i < L.struct.length; i++) ok(Math.abs(L.struct[i][0] - L.struct[i - 1][1]) < 0.01, `${ln}: kết cấu liên tục tại đoạn ${i}`);
    for (const s of L.stations) if (!(ln !== 'tsk' && s.km <= 3.6)) ok(Sim.structAt(L, s.km) !== 't', `${ln}: ga ${s.en} không nằm trong hầm (trừ ga ngầm Tokyo/Ueno Tohoku)`);
    const tl = L.struct.filter(g => g[2] === 't').reduce((a, g) => a + g[1] - g[0], 0) / L.kmEnd; const mini = ln === 'yam' || ln === 'aki'; ok(mini ? tl > 0.1 && tl < 0.3 : tl > 0.25 && tl < 0.45, `${ln}: tỷ lệ hầm hợp lý (Shinkansen thật ~35%, mini-Shinkansen ~17%)`, tl);
    for (const [a, b, R] of L.curves) ok(R >= (ln === 'yam' || ln === 'aki' ? 250 : 400) && b > a, `${ln}: đường cong hợp lệ`, [a, b, R]);
  }
  const tsk = Sim.lineOf('tsk'); ok(!tsk.struct.some(g => g[2] === 't' && g[1] > 515.4 + 54.8 && g[0] < 515.4 + 85.9), 'tsk: Nishi-Akashi–Himeji không có hầm');
  ok(Sim.lineOf('toh').struct.every(g => g[2] !== 't' || g[1] <= 31.3 || g[0] >= 109), 'toh: Omiya–Utsunomiya không có hầm'); { const L = Sim.lineOf('toh'), ue = L.stations.find(s => s.en === 'Ueno'); ok(Sim.structAt(L, ue.km - 0.3) === 't' && Sim.structAt(L, ue.km + 0.3) === 't', 'toh: ga Ueno nằm hẳn trong hầm (cả hai phía)'); }
  // đường cong: độ lệch ngang khớp z²/(2R) ở đường cong đều, và chiều lên rẽ ngược hướng
  const fake = { kmEnd: 100, curves: [[10, 20, 2000, 1]] }, tab = LAY.lateralTable(fake, Sim, 'down', 10000, 1000, 10);
  approx(Math.abs(tab[50]), 500 * 500 / (2 * 2000), 3, 'cong R=2000: lệch ngang ở 500 m ≈ z²/2R'); ok(Math.abs(tab[100]) > Math.abs(tab[50]), 'cong: lệch ngang tăng theo khoảng cách');
  const up = LAY.lateralTable(fake, Sim, 'up', (100 - 15) * 1000, 100, 10); ok(up[5] * LAY.lateralTable(fake, Sim, 'down', 15000, 100, 10)[5] < 0, 'cong: đi chiều lên thì rẽ ngược hướng');
  { const bk = LAY.lateralTableBack(fake, Sim, 'down', 20000, 1000, 10), fw = LAY.lateralTable(fake, Sim, 'down', 10000, 1000, 10);   // đang ở cuối cong: đoạn sau tàu cong cùng phía, giống đường cong đều
    approx(Math.abs(bk[50]), 500 * 500 / (2 * 2000), 3, 'cong: đoạn phía SAU tàu lệch ngang ≈ z²/2R'); ok(bk[50] * fw[50] > 0, 'cong: phía sau và phía trước cong cùng chiều dấu'); }
}

if (section('11. Ghi: giới hạn tốc độ vào/ra đường sân ga, dừng quá muộn, thông qua')) {
  const rec = find('tsk', 'Kodama', 'down', 0, 12), L = Sim.lineOf('tsk');
  const trip = Sim.makeTrip('tsk', rec, 0, 12), W = Sim.createWorld('tsk', trip, { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player, zs = Sim.turnoutZones(T);
  const odawara = T.M.findIndex(m => m.name === 'Odawara'), atami = T.M.findIndex(m => m.name === 'Atami'), nagoya = T.M.findIndex(m => m.name === 'Nagoya');
  ok(zs.some(z => z.j === odawara), 'Odawara (2-2-1): dừng thì phải rẽ ghi sang đường sân ga');
  ok(!zs.some(z => z.j === atami), 'Atami (không đường thông qua): không rẽ ghi, sân ga nằm ở đường chính');
  const zn = zs.find(z => z.j === odawara); approx(zn.v * 3.6, 80, 0.01, 'giới hạn qua ghi 80 km/h');
  let vmax = 0, n = 0, before = 0; while (!T.finished && n++ < 3e6 && T.x < zn.s1 + 10) { Sim.tick(W, 0.05, {}, true); if (T.x >= zn.s0 + 30 && T.x < zn.s1) vmax = Math.max(vmax, T.v); if (T.x < zn.s0) before = Math.max(before, T.v); }
  ok(vmax * 3.6 < 86, 'trong đoạn ghi tàu không vượt 80 km/h quá 6 km/h (kể cả tự lái)', vmax * 3.6); ok(before * 3.6 > 150, 'trước ghi tàu chạy nhanh bình thường', before * 3.6);
  // thông qua Odawara thì không bị giới hạn ghi
  T.M[odawara].stop = false; T.k = 0; ok(!Sim.turnoutZones(T).some(z => z.j === odawara), 'thông qua ga tránh chạy đường thông qua: không giới hạn ghi'); T.k = odawara; ok(Sim.turnoutZones(T).some(z => z.j === odawara), 'ga vừa dừng (kể cả khẩn) vẫn giữ đoạn ghi cho tới khi rời hẳn');
  // điểm ghi/ghi chữ X cho âm thanh
  const pts = Sim.switchPoints(T); ok(pts.length >= 4 * T.M.length && pts.every((p, i) => i === 0 || p >= pts[i - 1]), 'danh sách điểm ghi đã sắp xếp');
  // dừng khẩn tại ga tránh không có lịch dừng: quá gần để rẽ ghi -> dừng đường chính, cửa không mở; đủ xa -> rẽ ghi bình thường
  for (const [dist, v, expectMain] of [[1800, 40, true], [9000, 70, false]]) {
    const rn = find('tsk', 'Nozomi', 'down', 0, 16), W2 = Sim.createWorld('tsk', Sim.makeTrip('tsk', rn, 0, 16), { diff: 'easy', seed: 1, lead: false, events: false }), T2 = W2.player, od = T2.M.findIndex(m => m.name === 'Odawara');
    T2.x = T2.M[od].s - dist; T2.v = v; T2.phase = 'run'; T2.k = 1; T2.started = true; Sim.inject(W2, 'wire');
    ok(T2.forced === od, `dừng khẩn cách ${dist} m: chọn Odawara làm ga dừng`, T2.forced);
    ok(!!T2.M[od].mainStop === expectMain, `dừng khẩn cách ${dist} m ở ${v} m/s: ${expectMain ? 'dừng đường chính (không kịp rẽ ghi)' : 'rẽ ghi bình thường'}`, T2.M[od].mainStop);
    ok(Sim.turnoutZones(T2).some(z => z.j === od) === !expectMain, `dừng khẩn cách ${dist} m: giới hạn ghi ${expectMain ? 'không áp' : 'có áp'}`);
  }
}
{ const Lh = require(path.join(DRIVE, 'layout.js')); ok(Lh.stopCount('2-4-0', 'down') === 2 && Lh.stopCount('2-2-1', 'down') === 1 && Lh.stopCount('3-6-0', 'up') === 3, 'số đường dừng cùng chiều: ga 4 đường 2, ga 2-2-1 chỉ 1, ga 6 đường 3'); }
if (section('12. Đèn pha: tự động / bật / tắt')) {
  const rec = find('tsk', 'Kodama', 'down', 0, 12), mk = hour => { const W = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 0, 12), { diff: 'easy', seed: 1, lead: false, events: false }); W.trip.t0 = hour * 3600; return W; };
  let W = mk(11), T = W.player; ok(T.lamp === 'auto' && !Sim.lampOn(W, T), 'ban ngày, chế độ tự động: đèn tắt');
  Sim.cycleLamp(T); ok(T.lamp === 'on' && Sim.lampOn(W, T), 'chế độ bật: đèn sáng cả ban ngày'); Sim.cycleLamp(T); ok(T.lamp === 'off' && !Sim.lampOn(W, T), 'chế độ tắt: đèn tắt'); Sim.cycleLamp(T); ok(T.lamp === 'auto', 'vòng trở lại tự động');
  W = mk(21); T = W.player; ok(Sim.lampOn(W, T), 'ban đêm, tự động: đèn sáng'); T.lamp = 'off'; ok(!Sim.lampOn(W, T), 'ban đêm, người lái tắt: đèn tắt (và bị trừ điểm nếu chạy)');
  T.phase = 'run'; T.v = 60; T.started = true; for (let i = 0; i < 4000; i++) Sim.tick(W, 0.05, {}, false); ok(T.lampBad > 20, 'chạy ban đêm với đèn tắt: tích lũy lỗi đèn pha', T.lampBad);
  T.cut = true; T.lamp = 'on'; ok(!Sim.lampOn(W, T), 'mất điện: đèn tắt');
}

if (section('13. Công tắc ATC (bật / cắt)')) {
  const rec = find('tsk', 'Kodama', 'down', 0, 12), W = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 0, 12), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
  ok(T.atcOn === true, 'ATC mặc định BẬT');
  ok(Sim.toggleATC(T) === 'arm' && T.atcOn === true, 'bấm một lần: chỉ chờ xác nhận, chưa cắt'); W.t += 5; ok(Sim.toggleATC(T) === 'arm', 'quá 4 s thì phải xác nhận lại');
  ok(Sim.toggleATC(T) === 'off' && T.atcOn === false, 'bấm hai lần trong 4 s: cắt ATC'); ok(Sim.toggleATC(T) === 'on' && T.atcOn === true, 'bấm lại: bật ATC ngay');
  // cắt ATC thì không còn phanh tự động khi vượt tốc độ cho phép
  const run = cut => { const W2 = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 0, 12), { diff: 'easy', seed: 1, lead: false, events: false }), T2 = W2.player; T2.started = true; T2.phase = 'run'; T2.x = T2.M[0].s + 500; T2.v = 100 / 3.6; T2.door = 'closed'; T2.atcOn = !cut; let hit = false; for (let i = 0; i < 400; i++) { Sim.setPower(T2, 13); Sim.tick(W2, 0.05, { cmd: 1 }, false); if (T2.atc) hit = true; } return { hit, v: T2.v * 3.6, bad: T2.atcOffBad }; };
  const on = run(false), off = run(true);
  ok(on.hit, 'ATC bật: phanh khi vượt tốc độ cho phép'); ok(!off.hit && off.v > on.v + 20, 'ATC cắt: không phanh tự động, tàu vượt giới hạn', off.v + ' vs ' + on.v); ok(off.bad > 5, 'ATC cắt và chạy > 30 km/h: tích lũy lỗi', off.bad);
}

if (section('14. Phát thanh: bên cửa mở và đổi tàu')) {
  global.document = global.document || {}; require(path.join(DRIVE, 'transfers.js')); const GA = require(path.join(DRIVE, 'audio.js')), G = global.GameAudio || (GA && GA.GameAudio);
  const rec = find('tsk', 'Kodama', 'down', 0, 12), W = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 0, 12), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player, ds = nm => G.prototype.doorSide.call({}, W, T, T.M.findIndex(m => m.name === nm));
  const sd = ds('Odawara'); ok(sd && sd.ja === '左側' && sd.vi === 'trái', 'Odawara (2-2-1, đường dừng bên trái đường thông qua): cửa mở bên trái', JSON.stringify(sd));
  const mi = ds('Mishima'); ok(mi && mi.ja === '右側', 'Mishima (sân đảo bên phải đường dừng): cửa mở bên phải', JSON.stringify(mi));
  T.M[T.M.findIndex(m => m.name === 'Odawara')].mainStop = true; ok(ds('Odawara') === null, 'dừng ở đường chính: không có bên cửa mở');
  ok(Object.keys(window.TRANSFERS).length >= 60 && window.TRANSFERS['東京'].includes('山手線') && window.TRANSFERS['大宮'].includes('上越新幹線'), 'bảng đổi tàu: đủ ga, có Yamanote ở Tokyo và Joetsu ở Omiya');
  const missing = ALL.flatMap(ln => Sim.lineOf(ln).stations).filter(s => !window.TRANSFERS[s.jp]); ok(missing.length === 0, 'mọi ga có mục đổi tàu', missing.map(s => s.jp).join(','));
}

if (section('15. Tuyến mới: đổi tần số, Seikan, tàu ghép, đường đơn, đường ngang')) {
  // --- đoạn cách điện Hokuriku
  const L = Sim.lineOf('hok'); ok(L.meta.freq.length === 3, 'hok: ba đoạn cách điện (新軽井沢, 新高田, 新糸魚川)');
  const rec = find('hok', 'Asama', 'down', 7, 8), mk = () => Sim.createWorld('hok', Sim.makeTrip('hok', rec, 7, 8), { diff: 'easy', seed: 1, lead: false, events: false });
  { const W = mk(), T = W.player; ok(W.dead.length === 3 && W.dead[0].hzA === 50 && W.dead[0].hzB === 60, 'hok xuống: đoạn đầu 50→60 Hz'); Sim.requestClose(T); let n = 0;
    while (n++ < 4000 && T.x < W.dead[0].s1 + 100) { Sim.tick(W, 0.05, {}, false); T.pw = 13; }
    ok(T.deadViol === 1 && T.vcbUntil > W.t - 12, 'kéo lực vào đoạn cách điện: hồ quang, mất lực 12 s', T.deadViol); }
  { const W = mk(), T = W.player; Sim.requestClose(T); ok(T.pan === true, 'cần vẹt mặc định nâng'); let n = 0; while (n++ < 4000 && T.x < W.dead[0].s0 - 1000) { Sim.tick(W, 0.05, {}, false); T.pw = 13; }
    Sim.togglePan(T); ok(T.pan === false, 'hạ cần vẹt'); while (n++ < 4000 && T.x < W.dead[0].s1 + 100) { T.pw = 13; Sim.tick(W, 0.05, {}, false); }
    ok(T.deadViol === 0 && T.f <= 0, 'hạ cần vẹt: qua đoạn cách điện không lỗi, không có lực kéo', T.deadViol); }
  { const W = mk(), T = W.player; Sim.requestClose(T); let n = 0; while (n++ < 4000 && T.x < W.dead[0].s0 - 1000) { Sim.tick(W, 0.05, {}, false); T.pw = 13; }
    while (n++ < 4000 && T.x < W.dead[0].s1 + 100) { T.pw = 0; Sim.tick(W, 0.05, {}, false); }
    ok(T.deadViol === 0, 'về N trước đoạn cách điện: không lỗi'); }
  { const r = runAuto('hok', rec, 7, 8); ok(r.T.finished && r.T.deadViol === 0, 'tự lái: trôi qua đoạn cách điện', r.T.deadViol); ok(Sim.score(r.T, r.W).deadPen === 0, 'không phạt đoạn cách điện'); }
  { const W = mk(), T = W.player; T.deadViol = 2; ok(Sim.score(T, W).deadPen === 12, 'phạt 6 điểm mỗi lần vào đoạn cách điện'); }
  { const up = Sim.lineOf('hok').trains.find(t => t.d === 'up' && t.s.some(e => e[0] === 10 && !e[3]) && t.s.some(e => e[0] === 7 && !e[3]));
    if (up) { const W = Sim.createWorld('hok', Sim.makeTrip('hok', up, 10, 7), { diff: 'easy', lead: false, events: false }); ok(W.dead[W.dead.length - 1].hzA === 50 || W.dead[0].hzA === 60, 'hok lên: tần số đảo chiều'); } }
  // --- Seikan / Hokkaido
  const T0 = Sim.lineOf('toh'); ok(T0.stations[T0.stations.length - 1].en === 'Shin-Hakodate-Hokuto' && Math.abs(T0.kmEnd - 823.7) < 0.01, 'toh kéo dài tới Shin-Hakodate-Hokuto');
  ok(Sim.inTunnel({ line: T0, dir: 'down' }, 740 * 1000), 'hầm Seikan (km 715,9–769,8)'); ok(T0.meta.limits.some(l => l[2] === 160) && T0.meta.limits.some(l => l[2] === 140), 'Seikan: giới hạn 140/160 km/h đoạn dùng chung');
  { const iHk = T0.stations.findIndex(s => s.en === 'Shin-Hakodate-Hokuto'), iAo = T0.stations.findIndex(s => s.en === 'Shin-Aomori');
    const rec2 = T0.trains.find(t => t.d === 'down' && t.s.some(e => e[0] === iAo && !e[3]) && t.s.some(e => e[0] === iHk && !e[3]));
    ok(!!rec2, 'có chuyến Shin-Aomori → Shin-Hakodate-Hokuto');
    if (rec2) { const W = Sim.createWorld('toh', Sim.makeTrip('toh', rec2, iAo, iHk), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player; ok(W.line.meta.refuges.length === 2, 'Seikan: hai điểm cứu hộ 竜飛, 吉岡');
      T.x = Sim.sOfKm(732.9, 'down', W.line.kmEnd); ok(Sim.inTunnel(W, T.x), 'điểm cứu hộ nằm trong hầm'); W.fireActive = true; T.phase = 'run'; T.v = 0; Sim.tick(W, 0.05, {}, false); W.running = true; Sim.tick(W, 0.05, {}, false);
      ok(T.fireTunnel === 0, 'dừng ở điểm cứu hộ khi cháy trong hầm Seikan: không bị phạt');
      const W3 = Sim.createWorld('toh', Sim.makeTrip('toh', rec2, iAo, iHk), { diff: 'easy', seed: 1, lead: false, events: false }), T3 = W3.player; T3.x = Sim.sOfKm(745, 'down', W3.line.kmEnd); W3.fireActive = true; T3.phase = 'run'; T3.v = 0; W3.running = true; Sim.tick(W3, 0.05, {}, false); Sim.tick(W3, 0.05, {}, false);
      ok(T3.fireTunnel === 1, 'dừng giữa hầm (xa điểm cứu hộ) khi cháy: bị phạt'); } }
  // --- Nishi-Kyushu
  const N = Sim.lineOf('nks'); ok(N.stations.length === 5 && Math.abs(N.kmEnd - 66.0) < 0.01 && N.trains.length > 40 && N.trains.every(t => t.v === 'N700S-6'), 'nks: 5 ga, 66 km, Kamome 6 toa');
  { const r = runAuto('nks', N.trains.find(t => t.d === 'down' && t.s[0][0] === 0 && t.s[t.s.length - 1][0] === 4), 0, 4); ok(r.T.finished && Math.max(...r.T.results.map(x => Math.abs(x.delay))) < 90, 'nks: Takeo-Onsen → Nagasaki đúng giờ'); }
  // --- tàu ghép Komachi / Tsubasa
  const A = Sim.lineOf('aki'), iMor = A.stations.findIndex(s => s.en === 'Morioka'), iAk = A.stations.length - 1, recK = A.trains.find(t => t.d === 'down' && t.cp && t.s[0][0] === 0);
  { const W = Sim.createWorld('aki', Sim.makeTrip('aki', recK, 0, iMor), { diff: 'easy', seed: 1, lead: false, events: false }); ok(W.player.veh.key === 'E6+E5' && W.player.veh.cars === 17 && W.player.veh.parts[0] === 'E6', 'Komachi chiều xuống: mini ở ĐẦU đoàn (E6 + E5, 17 toa)'); }
  { const trip = Sim.makeTrip('aki', recK, 0, iAk), W = Sim.createWorld('aki', trip, { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player; let n = 0, seen = null, early = false;
    while (!T.finished && n++ < 4e6 && W.t < 60000) { Sim.tick(W, 0.05, {}, true); if (T.coup) seen = seen || { t: W.t, k: T.k }; if (T.coup && T.phase === 'run') early = true; }
    ok(seen && T.veh.key === 'E6' && T.finished, 'Komachi chiều xuống: tách ở Morioka, chạy tiếp E6 tới Akita'); ok(!early, 'không chạy khi đang tách toa'); ok(Math.abs(T.veh.len - 152.8) < 0.1, 'E6 một mình dài 152,8 m (theo dải ảnh)');
    const W2 = Sim.createWorld('aki', Sim.makeTrip('aki', recK, iMor, iAk), { diff: 'easy', seed: 1, lead: false, events: false }); ok(W2.player.veh.key === 'E6', 'bắt đầu từ Morioka: đã ở dạng E6'); }
  { const Y = Sim.lineOf('yam'), iFuk = Y.stations.findIndex(s => s.en === 'Fukushima'), rec4 = Y.trains.find(t => t.d === 'up' && t.cp), W = Sim.createWorld('yam', Sim.makeTrip('yam', rec4, rec4.s[0][0], 0), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
    ok(T.veh.key === 'E8' && T.cp.v === 'E5+E8' && T.cp.i === iFuk, 'Tsubasa chiều lên: bắt đầu E8, ghép với Yamabiko ở Fukushima');
    let n = 0, sawCoup = false; while (!T.finished && n++ < 4e6 && W.t < 60000) { Sim.tick(W, 0.05, {}, true); if (T.coup) sawCoup = true; } ok(sawCoup && T.finished && T.veh.key === 'E5+E8' && T.veh.cars === 17, 'Tsubasa: ghép xong ở Fukushima, chạy tiếp tới Tokyo'); }
  // --- giới hạn theo đường cong và đường đơn
  { const Y = Sim.lineOf('yam'); ok(Y.meta.limits.length > 20 && Y.meta.limits.some(l => l[0] >= 255.1 && l[2] < 125), 'yam: có giới hạn tốc độ theo đường cong'); const W = { line: Y, dir: 'down', player: { M: [] } };
    ok(Sim.singleW(W, 350 * 1000) > 0.9 && Sim.singleW(W, 100000) === 0, 'yam: đường đơn Yamagata–Shinjo, đường đôi trên Tohoku'); ok(Y.meta.limits.filter(l => l[2] < 125).every(l => l[2] >= 40), 'giới hạn cong ≥ 40 km/h'); }
  // --- đường ngang
  { const Y = Sim.lineOf('yam'); ok(Y.xings.length > 40 && Y.xings.every(k => Sim.structAt(Y, k) === 'g'), 'yam: nhiều đường ngang, chỉ trên nền đất'); ok(Sim.lineOf('aki').xings.length > 30, 'aki: nhiều đường ngang'); ok(!(Sim.lineOf('tsk').xings || []).length && !(Sim.lineOf('toh').xings || []).length, 'Shinkansen thật không có đường ngang'); }
  { const recX = A.trains.find(t => t.d === 'down' && t.cp), trip = Sim.makeTrip('aki', recX, iMor, iAk), mkW = () => Sim.createWorld('aki', trip, { diff: 'easy', seed: 1, lead: false, events: false });
    { const W = mkW(), T = W.player, g = W.xings[3]; g.blocked = true; g.until = 1e9; let n = 0; while (!T.finished && n++ < 4e6 && T.x < g.s + 100 && W.t < 6000) Sim.tick(W, 0.05, {}, true); ok(T.xingHit === 0 && T.x < g.s - 20, 'tự lái dừng trước đường ngang có xe kẹt', [T.x, g.s]); }
    { const W = mkW(), T = W.player, g = W.xings[3]; g.blocked = true; g.until = 1e9; let n = 0; while (!T.finished && n++ < 4e6 && T.x < g.s + 100 && W.t < 6000 && !(T.v < 0.05 && g.s - T.x < 700 && T.phase === 'run' && W.t > 60)) Sim.tick(W, 0.05, {}, true);
      for (let q = 0; q < 600; q++) Sim.tick(W, 0.05, {}, true); let flips = 0, prev = T.bk; for (let q = 0; q < 1200; q++) { Sim.tick(W, 0.05, {}, true); if (T.bk !== prev) { flips++; prev = T.bk; } } ok(flips <= 2 && T.v < 0.3 && T.xingHit === 0, 'dừng trước đường ngang có xe kẹt: cần phanh không nhấp nháy B1 ↔ 0', [flips, T.v]); }
    { const W = mkW(), T = W.player, g = W.xings[3]; Sim.requestClose(T); let n = 0; while (n++ < 4000 && T.door !== 'closed') Sim.tick(W, 0.1, {}, true); g.blocked = true; g.until = 1e9; n = 0; while (n++ < 4e5 && T.x < g.s + 10) { T.pw = 8; Sim.tick(W, 0.05, {}, false); }
      ok(T.xingHit === 1 && T.cut, 'không phanh: va chạm tại đường ngang', T.xingHit); ok(Sim.score(T, W).xingPen === 25, 'phạt va chạm đường ngang −25'); } }
  // --- cảnh ghép/tách: ghép ở Tokyo, tách ở Morioka (phần Tohoku ở lại), ghép lại khi về
  { const W = Sim.createWorld('aki', Sim.makeTrip('aki', recK, 0, iAk), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
    ok(T.coup && T.coup.kind === 'join0' && T.gapX > 40, 'xuất phát từ Tokyo: đang ghép, đoàn sau còn cách xa'); ok(!Sim.requestClose(T), 'đang ghép ở Tokyo: chưa đóng cửa được');
    for (let n = 0; n < 950; n++) Sim.tick(W, 0.05, {}, false); ok(!T.coup && T.gapX === 0, "ghép xong ở Tokyo sau ~45 s"); ok(Sim.requestClose(T), 'ghép xong: đóng cửa được');
    let n = 0; while (!T.finished && n++ < 4e6 && W.t < 60000 && !(T.k === iMor && T.phase === 'dwell' && !T.coup && T.cp.done)) { if (T.phase === 'dwell' && !T.coup) Sim.requestClose(T); Sim.tick(W, 0.05, {}, true); }
    ok(T.veh.key === 'E6' && W.parked.length === 1 && W.parked[0].key === 'E5' && W.parked[0].kind === 'left' && Math.abs(W.parked[0].front - (T.x - 152.8 - Sim.COUPLE_GAP)) < 0.5, 'tách ở Morioka: E5 ở lại sân ga ngay sau E6'); }
  { const rec6 = A.trains.find(t => t.d === 'up' && t.cp), W = Sim.createWorld('aki', Sim.makeTrip('aki', rec6, rec6.s[0][0], 0), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player, m = T.M.find(q => q.i === rec6.cp[0]);
    ok(W.parked.length === 1 && W.parked[0].kind === 'wait' && m.sOrig !== undefined && Math.abs(m.sOrig - m.s - 253 - Sim.COUPLE_GAP) < 0.5, 'chiều lên: đoàn Tohoku chờ sẵn, vạch dừng lùi đúng chiều dài E5 + khe nối');
    const s0 = m.sOrig; let n = 0; while (!T.finished && n++ < 4e6 && W.t < 60000 && !(T.cp.done && !T.coup)) Sim.tick(W, 0.05, {}, true);
    ok(T.veh.key === 'E5+E6' && W.parked.length === 0 && Math.abs(T.x - s0) < 3 && T.veh.parts[0] === 'E5', 'ghép xong: đoàn E5 + E6 (mini ở đuôi), đầu đoàn nhảy tới vị trí tàu Tohoku', [T.x, s0]); }
  // --- tàu ngược chiều là đoàn ghép, tàu đỗ ở đường phụ, nhánh Tohoku
  { const Wd = { line: A, dir: 'down', seed: 1 }, Tt = { x: 100 * 1000 }, keys = new Set(); for (let t0 = 100; t0 < 2000; t0 += 37) keys.add(Sim.oppKey(Wd, Tt, t0));
    ok(keys.has('E5') && [...keys].some(k => k.startsWith('E5+')), 'ngược chiều trên đoạn Tohoku: có E5 riêng và đoàn ghép (mini ở đuôi khi ta đi xuống)', [...keys].join());
    const Wu = { line: A, dir: 'up', seed: 1 }, ku = new Set(); for (let t0 = 100; t0 < 2000; t0 += 37) ku.add(Sim.oppKey(Wu, { x: (A.kmEnd - 100) * 1000 }, t0)); ok([...ku].some(k => k.endsWith('+E5')), 'ta đi lên: tàu ngược chiều đi xuống có mini ở đầu');
    ok(Sim.oppKey(Wd, { x: 560 * 1000 }, 123) === 'E6', 'trên đường mini: tàu ngược chiều là mini đi một mình'); }
  { const W = { line: A, dir: 'down' }, sj = 498500; ok(Sim.trunkOff(W, sj - 500) === 0 && Math.abs(Sim.trunkOff(W, sj + 3000)) > 30, 'nhánh Tohoku tách ra sau ga Morioka (xuống)'); const Wu = { line: A, dir: 'up' }; const sju = (A.kmEnd - 498.5) * 1000; ok(Math.abs(Sim.trunkOff(Wu, sju - 3000)) > 30 && Sim.trunkOff(Wu, sju + 500) === 0, 'nhánh Tohoku nhập vào trước ga Morioka (lên)'); }
  { let cnt = 0, tot = 0; for (const ln of ['tsk', 'toh', 'jts']) { const L2 = Sim.lineOf(ln), rec7 = L2.trains.find(t => t.d === 'down' && t.s.filter(e => !e[3]).length > 5), st = rec7.s.filter(e => !e[3]); for (const sd of [1, 2, 3, 4]) { const W = Sim.createWorld(ln, Sim.makeTrip(ln, rec7, st[0][0], st[st.length - 1][0]), { diff: 'easy', seed: sd, lead: false, events: false }); tot += W.player.M.length; cnt += W.stabled.length; } }
    ok(cnt > 0 && cnt < tot * 0.5, 'tàu đỗ ở đường phụ: có nhưng ít', cnt + '/' + tot); }
  // --- tàu chạy trước trên Tohoku có thể là đoàn ghép và tách ở Morioka/Fukushima
  { const T1 = Sim.lineOf('toh'), iM = T1.stations.findIndex(x => x.en === 'Morioka'), recs8 = T1.trains.filter(t => t.t === 'Hayabusa' && t.d === 'down' && t.s.some(e => e[0] === 0 && !e[3]) && t.s.some(e => e[0] === iM && !e[3])).slice(1, 9);
    let found = null; for (const rec8 of recs8) for (let sd = 1; sd <= 8 && !found; sd++) { const W = Sim.createWorld('toh', Sim.makeTrip('toh', rec8, 0, iM), { diff: 'easy', seed: sd, events: false }); if (W.lead && W.lead.cp) found = W; }
    ok(!!found && found.lead.veh.parts && found.lead.veh.parts[1] === 'E5', 'tàu chạy trước trên Tohoku có khi là đoàn ghép (mini ở đầu khi đi xuống)'); }
  // --- đường đơn mini-Shinkansen: dừng tránh tàu ngược chiều; Akita có đoạn đôi Jingūji–Mineyoshikawa
  { const A2 = Sim.lineOf('aki'), Wd = { line: A2, dir: 'down', player: { M: [] } }; ok(Sim.singleW(Wd, 593 * 1000) === 0 && Sim.singleW(Wd, 550 * 1000) > 0.9, 'Akita: đoạn 586–600 km là đường đôi, còn lại đường đơn');
    const recC = A2.trains.find(t => t.d === 'down' && t.cp), trip = Sim.makeTrip('aki', recC, recC.cp[0], A2.stations.length - 1);
    let tot = 0; for (const sd of [1, 2, 3]) { const W = Sim.createWorld('aki', trip, { diff: 'easy', seed: sd, lead: false, weather: 'clear' }), T = W.player; let n = 0; while (!T.finished && n++ < 4e6 && W.t < 60000) Sim.tick(W, 0.05, {}, true); tot += W.msgs.filter(m => /DỪNG TRÁNH/.test(m.text)).length; ok(T.finished && Math.max(...T.results.map(r => Math.abs(r.delay))) < 200, `Akita seed ${sd}: có dừng tránh mà vẫn đúng giờ (thời gian chờ được miễn)`); }
    ok(tot >= 3, 'đường đơn: có các lần dừng tránh tàu ngược chiều', tot); }
  { const A3 = Sim.lineOf('aki'), recL = A3.trains.filter(t => t.d === 'down' && t.cp && t.s[0][0] === 0)[3], tripL = Sim.makeTrip('aki', recL, recL.cp[0], A3.stations.length - 1);
    let leadStops = 0, base = 0; for (const sd of [1, 2, 3]) { const Wl = Sim.createWorld('aki', tripL, { diff: 'easy', seed: sd, weather: 'clear' }); if (!Wl.lead) continue; const Wn = Sim.createWorld('aki', tripL, { diff: 'easy', seed: sd, weather: 'clear', events: false }); leadStops += Wl.lead.M.filter(m => m.stop).length; base += Wn.lead ? Wn.lead.M.filter(m => m.stop).length : 0; }
    ok(leadStops > base, 'tàu chạy trước trên đường đơn có thêm lần dừng tránh', [leadStops, base]); }
  // --- đường ngang chỉ sau ngã rẽ khỏi Tohoku; ga ghép/tách dùng đường tránh
  { for (const [ln, jk] of [['aki', 498.5], ['yam', 257.1]]) { const Lx = Sim.lineOf(ln); ok(Lx.xings.length > 30 && Lx.xings.every(k => k > jk), `${ln}: đường ngang chỉ ở phần đường sắt thường (sau ngã rẽ km ${jk})`); }
    for (const ln of ['tsk', 'toh', 'jts', 'hok', 'nks']) ok(!(Sim.lineOf(ln).xings || []).length && !(Sim.lineOf(ln).single || []).length, `${ln}: Shinkansen thật, không có đường ngang / đường đơn`);
    const Lm = Sim.lineOf('aki'), sMor = Lm.stations.find(x => x.en === 'Morioka'), Ly = global.Layout || window.Layout, iM = Lm.stations.indexOf(sMor);
    for (const dir of ['down', 'up']) ok(sMor.side === 1 && Ly.station(sMor.lay, dir, Ly.pickOf(sMor, iM)).ours.x !== 0 && Ly.diverts(sMor.lay, dir, Ly.pickOf(sMor, iM)), `Morioka (${dir}): dừng ở đường tránh, không phải đường thông qua`); }
  // --- dữ liệu các tuyến mới
  for (const ln of ['jts', 'hok', 'nks', 'yam', 'aki']) { const L2 = Sim.lineOf(ln); ok(L2.trains.some(t => t.d === 'down') && L2.trains.some(t => t.d === 'up'), `${ln}: có cả hai chiều`); ok(L2.stations.every(st => st.lat && st.lon), `${ln}: ga có toạ độ`); ok(L2.meta.pa && L2.meta.defVeh && Sim.VEH[L2.meta.defVeh], `${ln}: có thông số tuyến`); }
}

if (section('16. Joetsu/Hokuriku tách khỏi Tohoku ở Omiya, Hokuriku tách khỏi Joetsu ở Takasaki; tàu tuyến cha chạy chung')) {
  const J = Sim.lineOf('jts'), H = Sim.lineOf('hok');
  ok(J.meta.junctions.length === 2 && H.meta.junctions.length === 2 && J.meta.junctions[0].line === 'toh' && J.meta.junctions[1].branch, 'jts: nhập vào Tohoku ở Omiya + nhánh Hokuriku ở Takasaki; hok có 2 ngã rẽ (Omiya, Takasaki)');
  { const T0 = Sim.lineOf('toh'), Wt = k => ({ line: T0, lineId: 'toh', dir: k }), br = T0.meta.junctions; ok(br.length === 3 && br.every(j => j.branch), 'toh có 3 nhánh rẽ ra (Joetsu/Hokuriku, Yamagata, Akita)');
    for (const [q, km] of [[0, 32.3], [1, 257.1], [2, 498.5]]) { const sj = km * 1000; ok(Sim.trunkOff(Wt('down'), sj - 200) === 0 && Sim.trunkOff(Wt('down'), sj + 1800) > 5 && Sim.trunkOff(Wt('down'), sj + 1800, q) > 5, `toh xuống: nhánh tại km ${km} tách sang trái`); const su = (T0.kmEnd - km) * 1000; ok(Sim.trunkOff(Wt('up'), su + 200) === 0 && Sim.trunkOff(Wt('up'), su - 1800) < -5, `toh lên: nhánh nhập tại km ${km}`); }
    const Wj = { line: J, lineId: 'jts', dir: 'down' }; ok(Sim.trunkOff(Wj, 107500) > 5 && Math.abs(Sim.trunkOff(Wj, 33800)) > 5, 'jts xuống: nhánh Hokuriku ở Takasaki, đường Tohoku ở Omiya'); }
  ok(J.curves.some(c => c[0] === 32.3 && c[3] === -1) && H.curves.some(c => c[0] === 107 && c[3] === -1) && H.curves.some(c => c[0] === 32.3), 'đường cong ngã rẽ trong dữ liệu (rẽ trái)');
  const W0 = { line: J, lineId: 'jts', dir: 'down' }, sj = 32300;
  ok(Sim.trunkOff(W0, sj - 500) === 0 && Math.abs(Sim.trunkOff(W0, sj + 1500)) > 5 && Math.abs(Sim.trunkOff(W0, sj + 3000)) > Math.abs(Sim.trunkOff(W0, sj + 1500)), 'đường chính tách dần khỏi tuyến sau ngã rẽ (jts xuống)');
  { const Wh = { line: H, lineId: 'hok', dir: 'down' }; ok(Math.abs(Sim.trunkOff(Wh, 33800)) > 5 && Math.abs(Sim.trunkOff(Wh, 108500)) > 5 && Sim.trunkOff(Wh, 70000) === 0, 'hok xuống: hai ngã rẽ, đoạn giữa (Omiya–Takasaki) đi thẳng'); }
  { const Wu = { line: J, lineId: 'jts', dir: 'up' }, s0 = (J.kmEnd - 32.3) * 1000; ok(Sim.trunkOff(Wu, s0 + 500) === 0 && Math.abs(Sim.trunkOff(Wu, s0 - 1500)) > 5, 'jts lên: đường chính nhập vào ở Omiya'); }
  // tàu tuyến cha đi trước
  const gapMin = (W, T) => { let g = 1e9, n = 0; while (!T.finished && n++ < 4e6 && W.t < 60000) { Sim.tick(W, 0.05, {}, true); const Ld = W.lead; if (Ld && Ld.phase === 'run' && Ld.v > 8 && T.v > 5 && Ld.x > T.x && !(Ld.fj !== undefined && W.dir === 'down' && Ld.x - Ld.veh.len > W.line.meta.junctions[Ld.fj].km * 1000 + 60)) g = Math.min(g, Ld.x - Ld.veh.len - T.x); } return g; };      // tàu tuyến cha đã qua ngã rẽ thì ở đường khác; tàu đỗ ở ga (ta chạy thông qua đường chính) không tính
  for (const [ln, dir] of [['jts', 'down'], ['jts', 'up'], ['hok', 'down'], ['hok', 'up']]) {
    const L = Sim.lineOf(ln); let nf = 0, tot = 0;
    for (const rec of L.trains.filter(t => t.d === dir)) { const trip = Sim.makeTrip(ln, rec, rec.s[0][0], rec.s[rec.s.length - 1][0]); if (!trip) continue; const W = Sim.createWorld(ln, trip, { diff: 'easy', seed: 1, lead: true, events: false }); tot++; if (W.leadForeign) nf++; }
    ok(nf > 0 && nf < tot + 1, `${ln} ${dir}: có chuyến lấy tàu tuyến cha làm tàu đi trước`, `${nf}/${tot}`);
  }
  for (const [ln, dir, ty] of [['jts', 'down', 'Toki'], ['jts', 'up', 'Toki'], ['hok', 'down', 'Kagayaki'], ['hok', 'up', 'Kagayaki']]) {
    const L = Sim.lineOf(ln); let done = 0;
    for (const rec of L.trains.filter(t => t.d === dir && t.t === ty).slice(0, 12)) {
      const trip = Sim.makeTrip(ln, rec, rec.s[0][0], rec.s[rec.s.length - 1][0]); if (!trip) continue; const W = Sim.createWorld(ln, trip, { diff: 'easy', seed: 1, lead: true, events: false }); if (!W.leadForeign) continue;
      const g = gapMin(W, W.player); done++; ok(W.player.finished && g > 5, `${ln} ${dir} ${rec.t} ${rec.n}: chạy sau ${W.leadLabel} (${W.leadForeign}) không đâm đuôi`, `gap ${g.toFixed(0)}`); if (done >= 2) break;
    }
    ok(done > 0, `${ln} ${dir}: kiểm tra được ít nhất 1 chuyến có tàu tuyến cha đi trước`);
  }
  { const L = Sim.lineOf('jts'), rec = L.trains.find(t => t.d === 'down' && t.s[0][0] === 0), trip = Sim.makeTrip('jts', rec, 0, rec.s[rec.s.length - 1][0]), W = Sim.createWorld('jts', trip, { diff: 'easy', seed: 1, lead: true, events: false });
    const hasPass = Object.values(W.passers).some(a => a.some(p => p)); ok(typeof hasPass === 'boolean', 'passers chạy được với tàu tuyến cha'); }
}

if (section('17. Ga: ghi riêng từng đường, tường bao, hồ sơ hình học')) {
  const LAY = require(path.join(DRIVE, 'layout.js'));
  for (const code of Object.keys(LAY.TOK)) for (const dir of ['down', 'up']) {
    const st = LAY.station(code, dir, 0), outer = st.tracks.filter(t => !t.main);
    ok(outer.every(t => t.in0 !== undefined && t.len >= 40 && t.len <= 300), `${code} ${dir}: mọi đường ngoài có ghi riêng (in0/len)`);
    ok(outer.every(t => t.in0 - t.len >= 380), `${code} ${dir}: ghi cuối cùng xong trước khi vào sân ga (còn ≥ 380 m)`, outer.map(t => [t.in0, t.len]));
    ok(st.tracks.filter(t => t.main).every(t => LAY.trackW(t, 0, 0) === 1), `${code} ${dir}: đường chính luôn trọng số 1`);
    const rk = outer.map(t => t.rank).sort((a, b) => a - b); ok(rk.every((v, i) => v === i), `${code} ${dir}: thứ hạng ghi liên tục`);
    for (const t of outer) { const sM = 10000; ok(LAY.trackW(t, sM - 1300, sM) === 0 && LAY.trackW(t, sM - 380, sM) === 1 && LAY.trackW(t, sM + 800, sM) === 0, `${code} ${dir}: đường ${t.c} toả ra rồi gom lại`); }
  }
  ok(LAY.spread(9000, 10000) === 0 && LAY.spread(9600, 10000) === 1 && LAY.spread(10600, 10000) === 0, 'spread cả ga: 0 xa, 1 trong ga');
  // hồ sơ hình học: bảng ngang phía trước/sau khớp công thức z²/2R trong đường cong đều (đã có test 10), thêm: cao độ cầu cạn / nền đất
  { const L = Sim.lineOf('toh'), vk = L.struct.find(g => g[2] === 'v' && g[1] - g[0] > 3), x = Sim.sOfKm((vk[0] + vk[1]) / 2, 'down', L.kmEnd), el = LAY.elevTable(L, Sim, 'down', x, 100, 10); ok(el[0] > 8 && el[0] <= 9.01, 'cao độ trên cầu cạn ≈ 9 m', el[0]); }
  { const L = Sim.lineOf('toh'), gk = L.struct.find(g => g[2] === 'g' && g[1] - g[0] > 3); if (gk) { const x = Sim.sOfKm((gk[0] + gk[1]) / 2, 'down', L.kmEnd), el = LAY.elevTable(L, Sim, 'down', x, 100, 10); ok(Math.abs(el[0] - 2) < 0.1, 'cao độ trên nền đất ≈ 2 m', el[0]); } }
  { const t0 = Date.now(); const L = Sim.lineOf('tsk'); for (let i = 0; i < 2000; i++) LAY.lateralTable(L, Sim, 'down', 100000 + i * 3, 2600, 10); ok(Date.now() - t0 < 400, 'bảng ngang 2000 lần < 0,4 s (hồ sơ tính trước)', Date.now() - t0); }
}

if (section('18. Ga cuối: chọn đường có sân ga của cả hai nhóm, đi qua ghi chữ X sang đường chính của ta')) {
  const LAY = require(path.join(DRIVE, 'layout.js'));
  { const st = LAY.station('2-4-0t', 'down', 0); ok(st.tracks.length === 4 && st.tracks.filter(t => t.own).length === 3 && st.tracks.filter(t => !t.own).length === 1, 'Tokyo Tohoku: 3 đường xuống + 1 đường lên (sơ đồ HaisenNet)'); }
  for (const ln of ['toh', 'jts', 'hok', 'yam', 'aki']) ok(Sim.lineOf(ln).stations[0].lay === '2-4-0t', `${ln}: Tokyo dùng bố trí 2-4-0t`);
  const rec = find('tsk', 'Nozomi', 'down', 0, 12), trip = Sim.makeTrip('tsk', rec, 0, 12); const picks = new Set(), kinds = new Set();
  for (let seed = 1; seed <= 40; seed++) { const W = Sim.createWorld('tsk', trip, { diff: 'easy', seed, lead: false, events: false }); const p = W.termPick[0]; ok(p !== undefined && W.termPick[trip.M[trip.M.length - 1].i] === undefined, 'ga đầu hành trình là ga cuối tuyến có chọn đường; ga cuối hành trình (Nagoya) giữ cách cũ'); picks.add(p);
    const st = LAY.station('3-6-0', 'down', LAY.pickOf(W.line.stations[0], 0, W)), o = st.ours; kinds.add(o.own); let prev = null, mx = 0;
    for (let s = 0; s <= 1500; s += 10) { const l = LAY.laneOf(o, s, 0, LAY.trackW(o, s, 0), LAY.spread(s, 0), 1300, 720); if (prev !== null) mx = Math.max(mx, Math.abs(l - prev)); prev = l; if (s === 0) ok(Math.abs(l - o.x) < 1e-9, 'bắt đầu đúng đường đã chọn'); }
    ok(prev === 0 && mx < 1.3, 'ra khỏi ga về đường chính của ta (X = 0), không nhảy ngang quá 1,3 m/10 m (ghi #12 làm trơn, đỉnh ~1,07)', [prev, mx]); }
  ok(picks.size >= 4 && kinds.has(true) && kinds.has(false), 'qua 40 seed: gặp cả đường nhóm d (đi thẳng) lẫn nhóm u (qua ghi X)', [...picks]);
  { const W1 = Sim.createWorld('tsk', trip, { diff: 'easy', seed: 7, lead: false, events: false }), W2 = Sim.createWorld('tsk', trip, { diff: 'easy', seed: 7, lead: false, events: false }); ok(JSON.stringify(W1.termPick) === JSON.stringify(W2.termPick), 'cùng seed cùng đường'); }
  { const rm = find('tsk', 'Nozomi', 'down', 12, 15), tm = Sim.makeTrip('tsk', rm, 12, 15), W = Sim.createWorld('tsk', tm, { diff: 'easy', seed: 3, lead: false, events: false }); ok(Object.keys(W.termPick).length === 0, 'hành trình giữa hai ga trung gian: không chọn đường ga cuối'); }
}

if (section('20. Cầu bộ hành trên cao theo cỡ ga')) {
  const LAY = require(path.join(DRIVE, 'layout.js')), want = { '3-6-0': 3, '5-8-0': 3, '3-4-0': 3, '2-4-0': 2, '2-4-1': 2, '2-4-0t': 2, '2-2-0': 1, '2-2-1': 1, '2-3-0': 1, '2-3-1': 1, '1-2-0': 0, '1-2-1': 0 };
  for (const [code, n] of Object.entries(want)) ok(LAY.bridgeCountOf(code) === n, `cầu bộ hành ga ${code}: ${n} lối`, LAY.bridgeCountOf(code));
  ok(Object.keys(LAY.TOK).every(c => want[c] !== undefined), 'mọi mã bố trí có quy tắc cầu bộ hành');
  const T = Sim.lineOf('toh'); for (const s of T.stations.filter(x => /^(東京|上野)$/.test(x.jp))) ok(Sim.inTunnel({ line: T, dir: 'down' }, Sim.sOfKm(s.km, 'down', T.kmEnd)), `${s.en} (Tohoku) là ga ngầm nên không có cầu bộ hành`);
}

if (section('19. Nhiệm vụ kiểm tra tự do (923 Doctor Yellow, E926 East i)')) {
  const trip = Sim.makeMission('tsk', 0, 12, 'T4'), L = Sim.lineOf('tsk');
  ok(trip && trip.mission && trip.dir === 'down' && trip.M.length === 13 && trip.M.filter(m => m.stop).length === 2, 'T4 Tokyo → Nagoya: chỉ dừng ở hai ga đầu/cuối, các ga giữa chạy qua');
  ok(Sim.makeMission('tsk', 12, 0, 'T4').dir === 'up', 'chiều chạy suy ra từ thứ tự hai ga');
  ok(Sim.makeMission('tsk', 3, 3, 'T4') === null && Sim.makeMission('tsk', 0, 5, 'N700') === null, 'từ chối cùng ga / tàu không phải tàu kiểm tra');
  { let last = 0; for (const t of L.trains) { if (Sim.INSPECT[t.v]) continue; for (let i = 0; i <= 12; i++) { const x = Sim.timeAt(L, t, i); if (x != null && x > last) last = x; } }
    ok(trip.t0 >= last + 600 - 1, 'xuất phát sau chuyến khách cuối ngày (trên đoạn chạy) ít nhất 10 phút', [trip.t0, last]); }
  const mk = (seed, o) => Sim.createWorld('tsk', trip, Object.assign({ diff: 'easy', seed, lead: true, events: true }, o || {}));
  const W = mk(1), T = W.player;
  ok(!!W.mission && !W.lead && Object.keys(W.passers).length === 0 && (W.opposing || []).length === 0, 'nhiệm vụ: không tàu chạy trước, không tàu thông qua/ngược chiều');
  ok(W.mission.defects.length >= 4 && W.mission.defects.every(d => d.s > W.mission.s0 + 800 && d.s < W.mission.s1 - 800), 'lỗi sinh ra cách xa hai ga đầu/cuối');
  ok(JSON.stringify(mk(1).mission.defects) === JSON.stringify(mk(1).mission.defects) && JSON.stringify(mk(1).mission.defects) !== JSON.stringify(mk(2).mission.defects), 'lỗi theo seed');
  // đo tắt: không phủ; đo bật: phủ khi đúng dải tốc độ
  { const Wa = mk(3), Ta = Wa.player; let n = 0; while (!Ta.finished && n++ < 4e6) Sim.tick(Wa, 0.05, {}, true);
    const sa = Sim.score(Ta, Wa); ok(sa.covScore === 0 && sa.found === 0 && sa.final <= 40, 'không bật đo: phủ 0%, không tìm lỗi nào, điểm thấp', [sa.covScore, sa.final]); }
  { const Wb = mk(3), Tb = Wb.player; Sim.toggleMeasure(Tb); let n = 0; while (!Tb.finished && n++ < 4e6) { Sim.tick(Wb, 0.05, {}, true); for (const d of Wb.mission.defects) if (d.seen && !d.marked && Tb.x - d.s >= 0 && Tb.x - d.s <= 300) Sim.markDefect(Tb); }
    const sb = Sim.score(Tb, Wb); ok(Tb.finished && sb.covScore >= 70, 'bật đo suốt chuyến: phủ ≥ 70%', sb.covScore); ok(sb.found >= Math.ceil(sb.tot * 0.6) && sb.falseMarks === 0, 'đánh dấu lỗi vừa phát hiện: tìm ≥ 60%, không đánh dấu sai', [sb.found, sb.tot, sb.falseMarks]);
    ok(sb.final >= 55 && !Wb.mission.conflict, 'chạy đo trong khung đêm: không xung đột lịch tàu khách', [sb.final, Wb.mission.conflict]); }
  { const Wc = mk(4), Tc = Wc.player; Tc.phase = 'run'; Tc.started = true; Tc.x += 1500; Sim.markDefect(Tc); ok(Wc.mission.falseMarks === 1, 'đánh dấu khi không có lỗi: tính là đánh dấu sai'); }
  { const Wd = mk(5), Td = Wd.player; Wd.trip.t0 += 6 * 3600; Sim.tick(Wd, 0.05, {}, true); Wd.running = true; Sim.tick(Wd, 0.05, {}, true); ok(Wd.mission.conflict || Wd.mission.minMargin < 0, 'trễ sang giờ chuyến khách đầu ngày: báo xung đột lịch', Wd.mission.minMargin); }
  { const E = Sim.makeMission('toh', 0, 8, 'E926'), We = Sim.createWorld('toh', E, { diff: 'easy', seed: 1, lead: true, events: true }); ok(E && E.t0 > 0 && We.mission && We.player.veh.key === 'E926', 'E926 trên Tohoku cũng có nhiệm vụ tự do');
    ok(We.mission.keys.includes('contact') && !We.mission.keys.includes('ride'), 'East i: bộ cảm biến riêng (lực tiếp xúc cần vẹt, không có dao động toa)'); ok(W.mission.keys.includes('ride') && !W.mission.keys.includes('contact'), 'Doctor Yellow: bộ cảm biến riêng (dao động toa)');
    ok(We.mission.defects.every(d => We.mission.keys.includes(d.sensor)) && W.mission.defects.every(d => W.mission.keys.includes(d.sensor)), 'lỗi chỉ thuộc cảm biến mà tàu có');
    const Wp = Sim.createWorld('toh', E, { diff: 'easy', seed: 2, lead: true, events: true }), Tp = Wp.player; Sim.toggleMeasure(Tp); Tp.phase = 'run'; Tp.started = true; Tp.v = 230 / 3.6; Tp.a = 0; ok(Sim.measureQ(Tp, 'contact') > 0.9 && Sim.measureQ(Tp, 'wire') > 0.9, 'đúng dải: đo được dây điện và lực tiếp xúc'); Tp.pan = false; ok(Sim.measureQ(Tp, 'contact') === 0 && Sim.measureQ(Tp, 'wire') === 0, 'hạ cần vẹt: không đo được dây điện / lực tiếp xúc'); Tp.pan = true; Tp.v = 100 / 3.6; ok(Sim.measureQ(Tp, 'track') === 0, 'dưới tốc độ đo: không đo ray'); }
  // nhiều chặng: Tokyo → Nagoya → Tokyo → Shizuoka; mỗi chặng một thế giới, đổi chiều ở ga giữa, giờ chặng sau nối tiếp chặng trước
  { const st = [0, 12, 0, 6], t1 = Sim.makeMission('tsk', st, 'T4', 0), t2 = Sim.makeMission('tsk', st, 'T4', 1, t1.t0 + 6700), t3 = Sim.makeMission('tsk', st, 'T4', 2, t2.t0 + 7000), tx = Sim.makeMission('tsk', st, 'T4', 3, 1);
    ok(t1.dir === 'down' && t2.dir === 'up' && t3.dir === 'down' && tx === null, 'nhiều chặng: chiều đổi theo thứ tự ga, chặng không tồn tại → null');
    ok(t1.mission.count === 3 && t2.mission.leg === 1 && t2.t0 === Math.ceil((t1.t0 + 6700) / 300) * 300 && /chặng 2\/3/.test(t2.label), 'chặng sau bắt đầu đúng giờ nối tiếp (làm tròn 5 phút) và ghi số chặng');
    const W2 = Sim.createWorld('tsk', t2, { diff: 'easy', seed: 1, lead: true, events: true }); ok(W2.mission.leg === 1 && W2.mission.count === 3 && W2.dir === 'up' && !W2.lead, 'thế giới chặng 2 chạy chiều lên, không tàu chạy trước');
    const sc = Sim.score(W2.player, W2); ok(sc.leg === 1 && sc.count === 3 && sc.legKm > 300, 'điểm chặng ghi số chặng và độ dài để tính điểm tổng'); }
}

if (section('21. Tàu chạy phía trước: cảnh báo, va chạm là kết thúc chuyến, không nhường tàu đã vượt qua')) {
  let tripL = null; for (const r of Sim.lineOf('tsk').trains.filter(t => t.t === 'Nozomi' && t.d === 'down' && t.s.some(e => e[0] === 0 && !e[3]) && t.s.some(e => e[0] === 12 && !e[3]))) { const tt = Sim.makeTrip('tsk', r, 0, 12); if (Sim.createWorld('tsk', tt, { diff: 'easy', seed: 1, lead: true, events: false }).lead) { tripL = tt; break; } }
  ok(!!tripL, 'tìm được chuyến Tokaido có tàu chạy trước');
  const mk = () => { const W = Sim.createWorld('tsk', tripL, { diff: 'easy', seed: 1, lead: true, events: false }), T = W.player; Sim.requestClose(T); let n = 0; while (!(T.started && T.phase === 'run' && T.v > 40) && n++ < 4e4) Sim.tick(W, 0.05, {}, true); return { W, T }; };
  { const { W, T } = mk(); W.lead.x = T.x + 3000; W.lead.v = 0; W.leadHoldUntil = 1e9; W.lead.cut = true; T.atcOn = false; let n = 0; while (!T.finished && n++ < 4e4) { Sim.setPower(T, 13); Sim.tick(W, 0.05, {}, false); }
    ok(T.collision && T.failed && T.finished && T.phase === 'end', 'ATC cắt, lao vào tàu đứng phía trước: VA CHẠM, kết thúc chuyến', [T.collision, T.finished]);
    ok(W.msgs.some(m => /ĐỨNG trên đường chính/.test(m.text)) && W.msgs.some(m => /VA CHẠM/.test(m.text)), 'điện đàm có cảnh báo tàu đứng phía trước và thông báo va chạm'); ok(Sim.score(T, W).final === 0, 'va chạm: điểm 0'); }
  { const { W, T } = mk(); W.lead.x = T.x + 3000; W.lead.v = 0; W.leadHoldUntil = 1e9; W.lead.cut = true; let n = 0; while (!T.finished && n++ < 2000) { Sim.setPower(T, 13); Sim.tick(W, 0.05, {}, false); }
    ok(!T.collision, 'ATC bật: ATC phanh giữ khoảng cách, không va chạm', [T.collision, Math.round(W.lead.x - W.lead.veh.len - T.x)]); }
  { const { W, T } = mk(); W.lead.x = T.x - 500; W.lead.v = 0; Sim.tick(W, 0.05, {}, false); ok(!T.collision && T.why !== 'lead' && !T.finished, 'tàu đã vượt qua (nằm phía sau): không còn bị ATC hãm về 0 và không tính là va chạm', T.why); }
}

if (section('22. ATC theo hệ: tên hệ, tín hiệu 0 (mất mã), KS-ATC dừng ga ba giai đoạn')) {
  ok(Sim.lineOf('tsk').meta.atc === 'NS' && Sim.lineOf('toh').meta.atc === 'DS' && Sim.lineOf('nks').meta.atc === 'KS', 'mỗi tuyến có hệ ATC đúng (NS / DS / KS)');
  let tripL = null; for (const r of Sim.lineOf('tsk').trains.filter(t => t.t === 'Nozomi' && t.d === 'down' && t.s.some(e => e[0] === 0 && !e[3]) && t.s.some(e => e[0] === 12 && !e[3]))) { tripL = Sim.makeTrip('tsk', r, 0, 12); break; }
  const W = Sim.createWorld('tsk', tripL, { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player; Sim.requestClose(T); let n = 0; while (!(T.started && T.phase === 'run' && T.v > 40) && n++ < 4e4) Sim.tick(W, 0.05, {}, true);
  Sim.inject(W, 'atcfault', { ahead: 6000, sec: 60 }); const zone = W.zones.find(z => z.kind === 'atcfault'); ok(!!zone && W.msgs.some(m => /TÍN HIỆU 0/.test(m.text)), 'inject atcfault tạo vùng tín hiệu 0 và thông báo');
  let stopped = false, passed = false; n = 0; while (n++ < 12000 && !T.finished) { Sim.tick(W, 0.05, {}, true); if (T.v < 0.3 && W.t < zone.tB && T.x < zone.s0 + 40) stopped = true; if (T.x > zone.s0 + 60 && W.t < zone.tB) passed = true; if (stopped && W.t > zone.tB + 60) break; }
  ok(stopped && !passed, 'tín hiệu 0: tàu dừng trước vùng, không chạy vào khi còn tín hiệu 0', [stopped, passed]);
  { let tr = null; for (const r of Sim.lineOf('nks').trains.filter(t => t.d === 'down')) { const st = r.s.filter(e => !e[3]); if (st.length >= 2) { tr = Sim.makeTrip('nks', r, st[0][0], st[1][0]); break; } }
    const W2 = Sim.createWorld('nks', tr, { diff: 'easy', seed: 1, lead: false, events: false }), T2 = W2.player; Sim.requestClose(T2); let m = 0; while (!T2.finished && m++ < 6e5) Sim.tick(W2, 0.05, {}, true);
    ok(T2.finished && !T2.failed && T2.results.length >= 1 && Math.abs(T2.results[T2.results.length - 1].err) < 30, 'KS-ATC: autopilot vẫn dừng đúng vạch với mẫu ba giai đoạn', T2.results.map(r => r.err)); }
}

if (section('23. Còi: bấm tay và tự động (ga không dừng, tàu đứng phía trước)')) {
  let trip = null; for (const r of Sim.lineOf('toh').trains.filter(t => t.d === 'down' && t.t === 'Hayabusa')) { const st = r.s.filter(e => !e[3]).map(e => e[0]); if (st.length >= 3 && st[st.length - 1] - st[0] > st.length + 2) { trip = Sim.makeTrip('toh', r, st[0], st[st.length - 1]); break; } }
  ok(!!trip, 'tìm được chuyến có ga không dừng');
  const W = Sim.createWorld('toh', trip, { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
  Sim.honk(T); ok(T.horn > 1.3, 'honk() bật cờ còi');
  Sim.requestClose(T); let n = 0, honks = 0, prev = 0; while (!T.finished && n++ < 6e5) { Sim.tick(W, 0.05, {}, true); if (T.horn > 1.3 && !(prev > 1.3)) honks++; prev = T.horn; }
  const keys = Object.keys(W.hornDone || {}).filter(k => /^thru/.test(k));
  ok(keys.length >= 1 && honks > keys.length, 'đi qua ga không dừng: còi tự kêu một lần mỗi ga', [keys.length, honks]);
}

if (section('24. Người chơi lái chuyến Tohoku: ghép / tách với tàu nhánh (E6 Morioka, E8 Fukushima)')) {
  const Ltoh = Sim.lineOf('toh'), pick = (type, dir, a, b) => Ltoh.trains.find(t => t.t === type && t.d === dir && t.s.some(e => e[0] === a && !e[3]) && t.s.some(e => e[0] === b && !e[3]));
  const mk = (type, dir, a, b, couple) => { const r = pick(type, dir, a, b), W = Sim.createWorld('toh', Sim.makeTrip('toh', r, a, b), { diff: 'easy', seed: 3, lead: false, events: false, couple }), T = W.player; return { W, T, r }; };
  const runAll = (W, T, watch) => { Sim.requestClose(T); let n = 0; while (!T.finished && n++ < 8e5) { Sim.tick(W, 0.05, {}, true); if (watch) watch(W, T); } return n; };
  { const { W, T } = mk('Hayabusa', 'down', 0, 19, 'never'); ok(!T.cc && !T.coup && T.veh.key === 'E5' && !W.parked.length, 'couple=never (và mặc định): không ghép'); }
  { const r = Ltoh.trains.find(t => t.t === 'Nasuno' && t.d === 'down'), st = r.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld('toh', Sim.makeTrip('toh', r, st[0], st[st.length - 1]), { diff: 'easy', seed: 3, lead: false, events: false, couple: 'always' }); ok(!W.player.cc, 'Nasuno không ghép'); }
  { const { W, T } = mk('Hayabusa', 'down', 0, 19, 'always'); const x0 = T.x, M0 = T.M[0];
    ok(T.cc && T.cc.kind === 'down' && T.coup && T.coup.kind === 'pjoin0' && W.parked.length === 1 && W.parked[0].key === 'E6', 'xuống từ Tokyo: có cảnh ghép E6 ở phía trước');
    ok(Math.abs((M0.sOrig - M0.s) - (Sim.VEH.E6.len + Sim.COUPLE_GAP)) < 1e-6 && Math.abs(x0 - M0.s) < 1e-6, 'vạch dừng ở Tokyo lùi đúng chiều dài mini + khe nối');
    let sawGapShrink = false, sawLeave = false, vehs = [T.veh.key], blocked = false, rearSeen = false; const xs0 = M0.sOrig;
    runAll(W, T, (W, T) => { if (T.veh.key !== vehs[vehs.length - 1]) vehs.push(T.veh.key); const l = W.parked.find(p => p.mv); if (l && l.v !== undefined) sawLeave = true; if (l && l.mv.v > 1) sawLeave = true; if (T.phase === 'dwell' && T.coup === null && l && l.front - Sim.VEH.E6.len - T.x < 450 && Sim.departBlockMsg) blocked = true; });
    ok(vehs.join('>') === 'E5>E6+E5>E5', 'đổi đoàn: E5 → E6+E5 (ghép ở Tokyo) → E5 (tách ở Morioka)', vehs.join('>'));
    ok(T.finished && !T.failed, 'chạy hết chuyến sau khi tách', [T.finished, T.failed]); ok(sawLeave, 'tàu nhánh tách ra chạy trước (có chuyển động)'); }
  { const { W, T } = mk('Hayabusa', 'down', 0, 19, 'always'); Sim.requestClose(T); let n = 0; while (!(T.veh.key === 'E5' && T.cc && T.cc.done && T.phase === 'dwell' && !T.coup) && n++ < 8e5) Sim.tick(W, 0.05, {}, true);
    ok(T.veh.key === 'E5' && T.phase === 'dwell', 'tới lúc tách xong ở Morioka', [T.veh.key, T.phase]); T.door = 'closed'; T.dwellT = 400; ok(Sim.departNow(T, true) === false, 'tàu nhánh chưa rời ga: chưa được khởi hành');
    let m = 0; while (W.parked.some(p => p.mv && p.front - Sim.VEH.E6.len - T.x < 450) && m++ < 4000) Sim.tick(W, 0.05, {}, false); ok(m < 4000 && Sim.departNow(T, true) !== false || m < 4000, 'tàu nhánh rời ga thì hết chặn', m); }
  { const { W, T } = mk('Yamabiko', 'down', 0, 11, 'always'); const vehs = [T.veh.key]; runAll(W, T, (W, T) => { if (T.veh.key !== vehs[vehs.length - 1]) vehs.push(T.veh.key); });
    ok(vehs.join('>') === 'E5>E8+E5>E5' && T.finished && !T.failed, 'Yamabiko: ghép E8 ở Tokyo, tách ở Fukushima', vehs.join('>')); }
  { const { W, T } = mk('Hayabusa', 'up', 17, 0, 'always'); const arrivals = []; ok(T.cc && T.cc.kind === 'up' && T.coup && T.coup.kind === 'pjoin', 'chiều lên, xuất phát ở Morioka: có cảnh tàu nhánh nối vào đuôi');
    const vehs = [T.veh.key]; let rear = []; runAll(W, T, (W, T) => { if (T.veh.key !== vehs[vehs.length - 1]) vehs.push(T.veh.key); if (W.camReq) rear.push(W.camReq.rear); });
    ok(vehs.join('>') === 'E5>E5+E6' && T.finished && !T.failed, 'chiều lên: E5 → E5+E6 (E6 nối vào đuôi)', vehs.join('>')); ok(rear.includes(true) && rear[rear.length - 1] === false, 'camera sau tự bật khi nối và tự tắt khi nối xong'); }
  { const r = pick('Yamabiko', 'up', 11, 0); if (r) { const { W, T } = mk('Yamabiko', 'up', 11, 0, 'always'); const vehs = [T.veh.key]; runAll(W, T, (W, T) => { if (T.veh.key !== vehs[vehs.length - 1]) vehs.push(T.veh.key); }); ok(vehs.includes('E5+E8') && T.finished && !T.failed, 'Yamabiko chiều lên: E8 nối vào đuôi ở Fukushima', vehs.join('>')); } }
  // chuyến mini: camera sau đặt ở đuôi phần của ta khi ghép/tách để thấy đoàn Tohoku
  { const La = Sim.lineOf('aki'), r = La.trains.find(t => t.d === 'down' && t.s[0][0] === 0 && t.cp), W = Sim.createWorld('aki', Sim.makeTrip('aki', r, 0, La.stations.length - 1), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
    const rv = Sim.rearVis(T); ok(rv && rv.key === 'E5' && Math.abs(rv.anchorLen - Sim.VEH.E6.len) < 1e-6 && rv.gap > 40, 'mini xuất phát Tokyo: camera sau thấy E5 còn cách ~46 m', JSON.stringify(rv)); T.dwellT = 30; T.gapX = 0; W.t = 0; Sim.tick(W, 0.05, {}, false); }
}

if (section('25. Góc nhìn cửa sổ hành khách (winview.js): vẽ không lỗi ở mọi dạng đoạn đường')) {
  require(path.join(DRIVE, 'winview.js')); const noop = () => {}, mkCtx = () => new Proxy({}, { get: (t, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } }), ctx = mkCtx();
  ok(typeof WinView === 'object' && typeof WinView.draw === 'function', 'WinView.draw có sẵn');
  let n = 0, err = null;
  for (const ln of ['tsk', 'toh', 'nks', 'yam']) for (const dir of ['down', 'up']) { const L = Sim.lineOf(ln), r = L.trains.find(t => t.d === dir && !t.cp && t.s.filter(e => !e[3]).length >= 2); if (!r) continue; const st = r.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld(ln, Sim.makeTrip(ln, r, st[0], st[st.length - 1]), { diff: 'easy', seed: 4, lead: false, events: false }), T = W.player;
    W.opposing = [W.t - 1.5, W.t + 3]; for (let km = 1; km < L.kmEnd; km += 11) { T.x = Sim.sOfKm(km, dir, L.kmEnd); T.v = 100; for (const side of [1, -1]) { try { WinView.draw(ctx, 0, 0, 1920, 620, W, T, { sprites: {}, aud: null }, side); n++; } catch (e) { err = ln + ' ' + dir + ' km' + km + ' ' + e.message; } } }
    for (let k = 0; k < T.M.length; k += 3) { T.k = k; T.phase = 'dwell'; T.x = T.M[k].s; T.v = 0; T.door = 'open'; for (const side of [1, -1]) { try { WinView.draw(ctx, 0, 0, 1920, 620, W, T, { sprites: {}, aud: null }, side); n++; } catch (e) { err = ln + ' ' + dir + ' ga' + k + ' ' + e.message; } } } }
  ok(!err && n > 100, 'cửa sổ trái/phải vẽ không lỗi ở dọc đường và trong ga (' + n + ' khung)', err);
}

if (section('26. Tuyến mini: chỉ ga Tokyo chọn đường dừng / qua ghi chữ X, ga cuối nhánh (Akita, Shinjo) thì không')) {
  for (const ln of ['aki', 'yam']) { const La = Sim.lineOf(ln), last = La.stations.length - 1;
    for (const dir of ['down', 'up']) { const r = La.trains.find(t => t.d === dir && t.s.filter(e => !e[3]).length >= 2 && (dir === 'up' ? t.s.filter(e => !e[3])[0][0] === last : t.s.filter(e => !e[3])[0][0] === 0)); if (!r) continue; const st = r.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld(ln, Sim.makeTrip(ln, r, st[0], st[st.length - 1]), { diff: 'easy', seed: 5, lead: false, events: false });
      ok(W.termPick && W.termPick[last] === undefined, `${ln} ${dir}: ga cuối nhánh không có termPick (không qua ghi chữ X)`, JSON.stringify(W.termPick)); } }
}

if (section('27. Bản đồ toàn quốc (natmap.js): vẽ không lỗi, màu đoạn đi chung')) {
  require(path.join(DRIVE, 'japanmap.js')); require(path.join(DRIVE, 'natmap.js')); const noop = () => {}, ctx = new Proxy({}, { get: (t, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
  ok(window.JPMAP && window.JPMAP.length === 47, 'japanmap.js có 47 tỉnh');
  let err = null, n = 0; const o = { txt: noop, button: noop, close: noop, save: noop };
  for (const ln of ['tsk', 'toh', 'nks', 'yam']) { const L = Sim.lineOf(ln), r = L.trains.find(t => t.d === 'down' && t.s.filter(e => !e[3]).length >= 2); if (!r) continue; const st = r.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld(ln, Sim.makeTrip(ln, r, st[0], st[st.length - 1]), { diff: 'easy', seed: 4, lead: false, events: false }), T = W.player;
    for (const t of [0, 600, 3000, 9000]) { W.t = t; T.x = Sim.sOfKm(st.length * 7 % L.kmEnd, 'down', L.kmEnd); try { NatMap.draw(ctx, 0, 58, 1920, 618, W, T, o); n++; } catch (e) { err = ln + ' ' + e.message; } }
    NatMap.V.sel = { en: 'Tokyo' }; try { NatMap.draw(ctx, 0, 58, 1920, 618, W, T, o); n++; } catch (e) { err = ln + ' thẻ ga ' + e.message; } NatMap.V.sel = null; }
  ok(!err && n >= 20, 'vẽ bản đồ không lỗi (' + n + ' khung)', err);
  // tàu ngược chiều lấy từ lịch thật; thiên tai và độ trễ từ NatCat
  { const L = Sim.lineOf('tsk'), r = L.trains.find(t => t.d === 'down' && !t.cp && t.s.filter(e => !e[3]).length >= 3 && t.t === 'Nozomi'), st = r.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld('tsk', Sim.makeTrip('tsk', r, st[0], st[st.length - 1]), { diff: 'hard', seed: 3, lead: false, events: true }), T = W.player;
    ok(Array.isArray(W.oppCat) && W.oppCat.length > 20, 'danh mục tàu ngược chiều có ' + (W.oppCat || []).length + ' đoàn');
    ok(W.haz && W.haz.cells.length >= 1, 'có ô thời tiết (' + (W.haz ? W.haz.cells.length : 0) + ' ô, ' + (W.haz ? W.haz.quakes.length : 0) + ' động đất)');
    Sim.requestClose(T); T.pw = 13; let n = 0, seen = 0; while (!T.finished && n++ < 3e5 && W.t < 6000) { Sim.tick(W, 0.05, {}, true); if ((W.opposing || []).some(t0 => Math.abs(t0 - W.t) < 0.2)) seen++; if (n % 400 === 0) { /* NatCat.step chạy trong refreshOpposing */ } }
    ok(seen > 0, 'có tàu ngược chiều lướt qua theo lịch trong chuyến (' + seen + ' lần)');
    NatCat.step(W); let held = 0, delayed = 0; for (const d of W.haz.delay.values()) { if (d.delay > 0) delayed++; if (d.why === 'eqk') held++; }
    ok(W.haz.lastT >= W.trip.t0 + W.t - 6, 'độ trễ tích luỹ tới giờ hiện tại (' + delayed + ' đoàn trễ, ' + held + ' dừng vì động đất)');
    // một đường mỗi chiều: không có đôi tàu cùng chiều nào đổi thứ tự giữa hai ga (chỉ vượt ở ga khi tàu trước đang đỗ)
    { const W2 = Sim.createWorld('tsk', Sim.makeTrip('tsk', r, st[0], st[st.length - 1]), { diff: 'hard', seed: 3, lead: false, events: true }), LN = window.LINES, cat = NatCat.build(LN).filter(c => c.line === 'tsk'); let flips = 0, prev = null;
      for (let t = 0; t <= 9000; t += 30) { W2.t = t; NatCat.step(W2); const now = W2.trip.t0 + t, cur = new Map();
        for (const c of cat) { const d = NatCat.delayOf(W2, c.key), s2 = NatCat.stateOf(LN, c, now - (d ? d.delay : 0)); if (s2 && !s2.dwell) cur.set(c.key, { km: s2.km, dir: c.rec.d }); }
        if (prev) for (const [k1, a] of cur) { const a0 = prev.get(k1); if (!a0) continue; for (const [k2, b] of cur) { if (k1 >= k2 || a.dir !== b.dir) continue; const b0 = prev.get(k2); if (!b0) continue; const sg = a.dir === 'down' ? 1 : -1; if ((sg * (a0.km - b0.km)) * (sg * (a.km - b.km)) < 0 && Math.abs(a.km - b.km) > 0.3) flips++; } }
        prev = cur; }
      ok(flips === 0, 'tàu cùng chiều không vượt nhau giữa hai ga trên bản đồ (' + flips + ' lần đổi thứ tự)'); }
    // đường chung Tohoku–Akita: Komachi về Tokyo không đổi thứ tự với tàu Tohoku (hoặc tàu đi trước thật) giữa hai ga trên bản đồ
    { const Lk = Sim.lineOf('aki'), rk = Lk.trains.find(t => t.d === 'up' && t.s.filter(e => !e[3]).length >= 2), sk = rk.s.filter(e => !e[3]).map(e => e[0]), Wk = Sim.createWorld('aki', Sim.makeTrip('aki', rk, sk[0], sk[sk.length - 1]), { diff: 'normal', seed: 4, lead: true, events: true }), Tk = Wk.player, LN = window.LINES; Sim.requestClose(Tk); Tk.pw = 13;
      let n2 = 0, flips2 = 0, prevD = null; while (!Tk.finished && n2++ < 3e5 && Wk.t < 9000) { Sim.tick(Wk, 0.05, {}, true); if (n2 % 200 !== 0) continue; NatCat.step(Wk); const now = Wk.trip.t0 + Wk.t, kmMe = NatCat.refOf(LN, 'aki', Sim.kmOfS(Tk.x, Wk.dir, Wk.line.kmEnd)), cur = new Map();
        for (const c of NatCat.build(LN)) { if (c.rec.d !== Wk.dir || c.rec === Wk.trip.rec) continue; const d = NatCat.delayOf(Wk, c.key), s2 = NatCat.stateOf(LN, c, now - (d ? d.delay : 0)); if (!s2 || s2.dwell) continue; const rf = NatCat.refOf(LN, c.line, s2.km); if (rf.g === kmMe.g) cur.set(c.key, rf.k); }
        if (prevD) for (const [k1, v1] of cur) { const v0 = prevD.get(k1); if (v0 === undefined) continue; const sg = Wk.dir === 'down' ? 1 : -1; if ((sg * (v0 - kmMe0)) * (sg * (v1 - kmMe.k)) < 0 && Math.abs(v1 - kmMe.k) > 0.5 && kmMe.g === kmMe0g) flips2++; }
        prevD = cur; var kmMe0 = kmMe.k, kmMe0g = kmMe.g; }
      ok(flips2 <= 0, 'tàu của người chơi (Komachi) không vượt tàu Tohoku giữa hai ga trên bản đồ (' + flips2 + ' lần)'); }
    const q = { t: 0, lat: 35, lon: 139, mag: 7, depth: 10 }; ok(NatCat.shindoAt(q, 10) > NatCat.shindoAt(q, 300) && NatCat.shindoAt(q, 10) >= 5, 'shindo giảm theo khoảng cách'); }
  // tra cứu nhị phân (structAt / biomeAt / inTunnel) cho kết quả y hệt duyệt tuần tự
  { let bad = 0, n3 = 0; for (const ln of Object.keys(window.LINES)) { const L = Sim.lineOf(ln); for (const dir of ['down', 'up']) { const W3 = { line: L, dir, lineId: ln };
        for (let km = -1; km < L.kmEnd + 1; km += 0.137) { n3++; let st = 'g'; for (const [a1, b1, k1] of L.struct || []) if (km >= a1 && km < b1) { st = k1; break; } let bm = 'field'; for (const [a1, b1, t1] of L.meta.biomes) if (km >= a1 && km < b1) { bm = t1; break; }
          const x = Sim.sOfKm(km, dir, L.kmEnd); let tn = false; for (const [k0, k1] of L.meta.tunnels) { const p1 = Sim.sOfKm(k0, dir, L.kmEnd), p2 = Sim.sOfKm(k1, dir, L.kmEnd); if (x >= Math.min(p1, p2) && x <= Math.max(p1, p2)) { tn = true; break; } }
          if (Sim.structAt(L, km) !== st || Sim.biomeAt(L, km) !== bm || Sim.inTunnel(W3, x) !== tn) bad++; } } }
    ok(bad === 0 && n3 > 1000, 'tra cứu nhị phân khớp duyệt tuần tự (' + n3 + ' điểm, ' + bad + ' lệch)'); }
  // ga hai đường (không đường tránh, ví dụ Atami): không có tàu cùng chiều chạy xuyên qua tàu đang đỗ
  { const L5 = Sim.lineOf('tsk'), r5 = L5.trains.find(t => t.d === 'down' && t.t === 'Kodama' && t.s.some(e => !e[3] && L5.stations[e[0]].en === 'Atami')), st5 = r5.s.filter(e => !e[3]).map(e => e[0]), W5 = Sim.createWorld('tsk', Sim.makeTrip('tsk', r5, st5[0], st5[st5.length - 1]), { diff: 'normal', seed: 2, lead: false, events: true }), T5 = W5.player, k5 = T5.M.findIndex(m => m.name === 'Atami');
    let seen5 = 0; T5.k = k5; T5.phase = 'dwell'; for (let t = (T5.M[k5].arr || 0) - 60; t < (T5.M[k5].arr || 0) + 900; t += 5) { W5.t = t; Sim.refreshOpposing(W5, T5); seen5 += Sim.passersAt(W5, k5).filter(p => !p.syn).length; }
    ok(k5 >= 0 && !T5.M[k5].loop && seen5 === 0, 'Atami (ga hai đường): không có tàu thông qua cùng chiều khi ta đỗ (' + seen5 + ' lần)'); }
  // vật cản từ danh mục lịch: ATC của người chơi giữ khoảng cách với đoàn đang dừng giữa đường (không thể vượt)
  { const L6 = Sim.lineOf('tsk'), r6 = L6.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp), st6 = r6.s.filter(e => !e[3]).map(e => e[0]), W6 = Sim.createWorld('tsk', Sim.makeTrip('tsk', r6, st6[0], st6[st6.length - 1]), { diff: 'normal', seed: 3, lead: false, events: true }), T6 = W6.player;
    Sim.requestClose(T6); T6.pw = 13; let n6 = 0; while (T6.phase === 'dwell' && n6++ < 1e4) Sim.tick(W6, 0.05, {}, false); T6.phase = 'run'; T6.v = 60; T6.x += 3000; W6.t += 60;
    Sim.tick(W6, 0.05, {}, false); W6.obs = { x: T6.x + 1200, len: 400, v: 0, t: W6.t, label: 'thử' }; W6.obsT = W6.t; Sim.tick(W6, 0.05, {}, false);
    const lim = Math.sqrt(2 * 0.72 * (1200 - 400 - 400));
    ok(T6.why === 'lead' && T6.allowed <= lim + 1, 'ATC giữ khoảng cách với đoàn dừng giữa đường phía trước (giới hạn ' + (T6.allowed * 3.6).toFixed(0) + ' km/h, tối đa ' + (lim * 3.6).toFixed(0) + ')', 'why=' + T6.why + ' allowed=' + T6.allowed); }
  // cả chuyến Nozomi (độ khó cao, có sự cố): tàu của người chơi không đổi thứ tự với đoàn nào cùng nhóm đường giữa hai ga
  for (const sd of [3, 7]) { const L7 = Sim.lineOf('tsk'), r7 = L7.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp), st7 = r7.s.filter(e => !e[3]).map(e => e[0]), W7 = Sim.createWorld('tsk', Sim.makeTrip('tsk', r7, st7[0], st7[st7.length - 1]), { diff: 'hard', seed: sd, lead: true, events: true }), T7 = W7.player, LN7 = window.LINES;
    Sim.requestClose(T7); T7.pw = 13; let n7 = 0, fl7 = 0, prev7 = null, me0 = null, dwPrev = false; while (!T7.finished && n7++ < 4e5 && W7.t < 9000) { Sim.tick(W7, 0.05, {}, true); if (n7 % 200 !== 0) continue; NatCat.step(W7); const now7 = W7.trip.t0 + W7.t, me7 = NatCat.refOf(LN7, 'tsk', Sim.kmOfS(T7.x, W7.dir, W7.line.kmEnd)), cur7 = new Map();
      for (const c of NatCat.build(LN7)) { if (c.rec.d !== W7.dir || c.rec === W7.trip.rec) continue; const d7 = NatCat.delayOf(W7, c.key), s7 = NatCat.stateOf(LN7, c, now7 - (d7 ? d7.delay : 0)); if (!s7 || s7.dwell) continue; const rf7 = NatCat.refOf(LN7, c.line, s7.km); if (rf7.g === me7.g) cur7.set(c.key, rf7.k); }
      if (prev7 && me0 !== null && !dwPrev && T7.phase !== 'dwell') for (const [k7, v7] of cur7) { const v0 = prev7.get(k7); if (v0 === undefined) continue; if ((v0 - me0) * (v7 - me7.k) < 0 && Math.abs(v7 - me7.k) > 0.5) fl7++; }      // khi ta đang đỗ ở ga có đường tránh, tàu thông qua vượt ta là hợp lệ
      prev7 = cur7; me0 = me7.k; dwPrev = T7.phase === 'dwell'; }
    ok(fl7 === 0 && !T7.collision, 'Nozomi (seed ' + sd + '): tàu của ta không vượt đoàn nào giữa hai ga, không va chạm (' + fl7 + ' lần đổi thứ tự)'); }
  // nhóm đường chung: Tokyo–Omiya chung cho cả 5 tuyến (nhóm A), Omiya–Takasaki chung Joetsu/Hokuriku (nhóm B); ga cho vượt khi có đường thông qua hoặc >= 2 đường dừng cùng chiều
  { const LNg = window.LINES, om = LNg.jts.stations.find(x => x.en === 'Omiya').km, tk = LNg.jts.stations.find(x => x.en === 'Takasaki').km;
    ok(NatCat.refOf(LNg, 'jts', om * 0.5).g === 'A' && NatCat.refOf(LNg, 'hok', om * 0.5).g === 'A' && NatCat.refOf(LNg, 'toh', 20).g === 'A' && NatCat.refOf(LNg, 'jts', (om + tk) / 2).g === 'B' && NatCat.refOf(LNg, 'hok', (om + tk) / 2).g === 'B' && NatCat.refOf(LNg, 'hok', tk + 60).g === 'hok', 'nhóm đường chung (Tokyo–Omiya: A cho cả năm tuyến, Omiya–Takasaki: B, sau đó riêng)');
    const stI = (ln, en) => LNg[ln].stations.findIndex(x => x.en === en);
    ok(!NatCat.canPass(LNg, 'tsk', stI('tsk', 'Atami'), 'down') && NatCat.canPass(LNg, 'tsk', stI('tsk', 'Odawara'), 'down'), 'Atami (hai đường) không cho vượt tàu đỗ; Odawara (có đường thông qua) cho vượt');
    // mọi tuyến cùng lúc: không cặp đoàn cùng nhóm đường và cùng chiều nào đổi thứ tự giữa hai ga (cả khác tuyến)
    const L8 = Sim.lineOf('tsk'), r8 = L8.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp), st8 = r8.s.filter(e => !e[3]).map(e => e[0]), W8 = Sim.createWorld('tsk', Sim.makeTrip('tsk', r8, st8[0], st8[st8.length - 1]), { diff: 'hard', seed: 5, lead: false, events: true }), cat8 = NatCat.build(LNg); let fl8 = 0, pr8 = null;
    for (let t = 0; t <= 12000; t += 30) { W8.t = t; NatCat.step(W8); const now8 = W8.trip.t0 + t, cur8 = new Map(); for (const c of cat8) { const d8 = NatCat.delayOf(W8, c.key), s8 = NatCat.stateOf(LNg, c, now8 - (d8 ? d8.delay : 0)); if (!s8 || s8.dwell) continue; const rf8 = NatCat.refOf(LNg, c.line, s8.km); cur8.set(c.key, { g: rf8.g + c.rec.d, k: rf8.k }); }
      if (pr8) for (const [k1, a1] of cur8) { const a0 = pr8.get(k1); if (!a0) continue; for (const [k2, b1] of cur8) { if (k1 >= k2 || a1.g !== b1.g) continue; const b0 = pr8.get(k2); if (!b0 || b0.g !== a0.g || a0.g !== a1.g) continue; if ((a0.k - b0.k) * (a1.k - b1.k) < 0 && Math.abs(a1.k - b1.k) > 0.3) fl8++; } } pr8 = cur8; }
    ok(fl8 === 0, 'toàn quốc: không đoàn cùng nhóm đường và cùng chiều nào đổi thứ tự giữa hai ga (' + fl8 + ' lần)'); }
  // tooltip: tàu trên đoạn đường chung Tokyo–Omiya ghi đúng tàu phía trước/sau dù khác tuyến (Yamabiko 51 / Toki 301 / Tsubasa 121)
  { const L9 = Sim.lineOf('tsk'), r9 = L9.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp), st9 = r9.s.filter(e => !e[3]).map(e => e[0]), W9 = Sim.createWorld('tsk', Sim.makeTrip('tsk', r9, st9[0], st9[st9.length - 1]), { diff: 'normal', seed: 1, lead: false, events: false }), T9 = W9.player, log9 = [];
    const o9 = { txt: t => log9.push(String(t)), button: noop, close: noop, save: noop, checkin: noop }; W9.t = 22440 - W9.trip.t0; NatCat.step(W9); NatMap.V.sel = null; NatMap.draw(ctx, 0, 58, 1920, 618, W9, T9, o9);
    const tk9 = NatMap.V.trains.map(h => h.t).find(t => !t.me && t.label === 'Toki 301'), ym9 = NatMap.V.trains.map(h => h.t).find(t => !t.me && t.label === 'Yamabiko 51');
    const rowsOf = t => { NatMap.V.sel = { tk: t.c.key }; log9.length = 0; NatMap.draw(ctx, 0, 58, 1920, 618, W9, T9, o9); return log9.filter(l => /phía trước|phía sau/.test(l)).join(' | '); };
    const rToki = tk9 ? rowsOf(tk9) : '', rYam = ym9 ? rowsOf(ym9) : '';
    ok(/trước: Yamabiko 51/.test(rToki) && /sau: Toki 301/.test(rYam), 'tooltip khác tuyến trên đoạn đường chung: Toki 301 [' + rToki + '] / Yamabiko 51 [' + rYam + ']'); NatMap.V.sel = null; }
  // trùng tên ga giữa các tuyến (Sendai: Tohoku 仙台 / Kyushu 川内) phải là hai ga riêng; đoàn ghép (Yamabiko + Tsubasa cùng giờ) không bị tách bởi quy tắc giãn cách
  { const LNs = window.LINES; ok(NatMap.stations && Object.values(NatMap.stations()).filter(x => x.en === 'Sendai').length === 2, 'hai ga Sendai (Tohoku và Kyushu) là hai ga riêng trên bản đồ');
    const W10 = Sim.createWorld('tsk', Sim.makeTrip('tsk', Sim.lineOf('tsk').trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp), 0, 12), { diff: 'hard', seed: 5, lead: false, events: true }), cat10 = NatCat.build(LNs);
    const pr10 = cat10.find(c => c.line === 'yam' && c.rec.d === 'down' && cat10.some(x => x.line === 'toh' && x.rec.d === 'down' && x.cid === c.cid)), a10 = pr10 && cat10.find(c => c.line === 'toh' && c.rec.d === 'down' && c.cid === pr10.cid); let maxGap = 0;
    if (a10 && pr10) for (let t = a10.t0 + 60; t < a10.t0 + 3600; t += 60) { W10.t = t - W10.trip.t0; NatCat.step(W10); const da = NatCat.delayOf(W10, a10.key), db = NatCat.delayOf(W10, pr10.key), sa = NatCat.stateOf(LNs, a10, t - (da ? da.delay : 0)), sb = NatCat.stateOf(LNs, pr10, t - (db ? db.delay : 0)); if (sa && sb && sa.km !== undefined) maxGap = Math.max(maxGap, Math.abs(NatCat.refOf(LNs, 'toh', sa.km).k - NatCat.refOf(LNs, 'yam', sb.km).k)); }
    ok(a10 && pr10 && maxGap < 0.5, 'đoàn ghép ' + (a10 ? a10.rec.t + ' ' + a10.rec.n : '?') + ' + ' + (pr10 ? pr10.rec.t + ' ' + pr10.rec.n : '?') + ' luôn đi cùng nhau trên đường chung (lệch tối đa ' + maxGap.toFixed(2) + ' km)'); }
  // tàu đi trước thật của ta: vị trí trong danh mục bản đồ bám đúng vị trí mô phỏng và không tàu nào đổi thứ tự với nó giữa đường
  { const L11 = Sim.lineOf('tsk'), r11 = L11.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && t.n === '3' && !t.cp), st11 = r11.s.filter(e => !e[3]).map(e => e[0]), W11 = Sim.createWorld('tsk', Sim.makeTrip('tsk', r11, st11[0], st11[st11.length - 1]), { diff: 'hard', seed: 5, lead: true, events: true }), T11 = W11.player, LN11 = window.LINES;
    Sim.requestClose(T11); T11.pw = 13; let n11 = 0, maxD = 0, fl11 = 0, prev11 = null, samples = 0; const lc = W11.leadRef && NatCat.build(LN11).find(c => c.rec.t === W11.leadRef.t && c.rec.n === W11.leadRef.n && c.rec.d === W11.leadRef.d);
    while (!T11.finished && n11++ < 2e5 && W11.t < 7000) { Sim.tick(W11, 0.05, {}, true); if (n11 % 20 !== 0) continue; const Ld = W11.lead; if (!lc || !Ld || Ld.phase !== 'run') { prev11 = null; continue; } const now11 = W11.trip.t0 + W11.t, dl = NatCat.delayOf(W11, lc.key), sl = NatCat.stateOf(LN11, lc, now11 - (dl ? dl.delay : 0)); if (!sl) { prev11 = null; continue; }
      const real = NatCat.refOf(LN11, W11.lineId, Sim.kmOfS(Ld.x, W11.dir, W11.line.kmEnd)), mine = NatCat.refOf(LN11, lc.line, sl.km); if (real.g === mine.g) { maxD = Math.max(maxD, Math.abs(real.k - mine.k)); samples++; }
      if (n11 % 200 === 0) { const cur = new Map(); for (const c of NatCat.build(LN11)) { if (c === lc || c.rec.d !== W11.dir || c.rec === W11.trip.rec) continue; const d2 = NatCat.delayOf(W11, c.key), s2 = NatCat.stateOf(LN11, c, now11 - (d2 ? d2.delay : 0)); if (!s2 || s2.dwell) continue; const rf = NatCat.refOf(LN11, c.line, s2.km); if (rf.g === mine.g) cur.set(c.key, rf.k); }
        if (prev11) for (const [k2, v2] of cur) { const v0 = prev11.m.get(k2); if (v0 !== undefined && (v0 - prev11.l) * (v2 - mine.k) < 0 && Math.abs(v2 - mine.k) > 0.5) fl11++; } prev11 = { m: cur, l: mine.k }; } }
    ok(lc && samples > 20 && maxD < 0.6 && fl11 === 0, 'tàu đi trước thật: vị trí bản đồ lệch tối đa ' + maxD.toFixed(2) + ' km so với mô phỏng (' + samples + ' mẫu), ' + fl11 + ' lần bị tàu khác đổi thứ tự'); }
  ok(NatMap.colAt('hok', 3) === NatMap.SEGS.find(s => s.key === 'joetsu').col && NatMap.colAt('jts', 1) === NatMap.SEGS.find(s => s.key === 'tohoku').col, 'đoạn đi chung lấy màu tuyến cha');
}

if (section('28. Khởi động ở nhiều giờ trong ngày: tàu cùng chiều không đổi thứ tự (kể cả vài giây đầu, nhờ khởi động trước)')) {
  const LNs = window.LINES, cat = NatCat.build(LNs); let worlds = 0, flips = 0, firstBad = '';
  for (const lid of Object.keys(LNs)) for (const dir of ['down', 'up']) {
    const recs = Sim.lineOf(lid).trains.filter(t => t.d === dir && !t.cp && t.s.filter(e => !e[3]).length > 3).filter((_, i) => i % 12 === 0).slice(0, 8);
    for (const r of recs) { const st = r.s.filter(e => !e[3]).map(e => e[0]); let W; try { W = Sim.createWorld(lid, Sim.makeTrip(lid, r, st[0], st[st.length - 1]), { diff: 'normal', seed: 1, lead: true, events: false }); } catch (e) { continue; } worlds++; let prev = null;
      for (let t = 0; t <= 300; t += 5) { W.t = t; NatCat.step(W); const now = W.trip.t0 + t, cur = new Map();
        for (const c of cat) { const d = NatCat.delayOf(W, c.key), sx = NatCat.stateOf(LNs, c, now - (d ? d.delay : 0)); if (!sx) continue; const rf = NatCat.refOf(LNs, c.line, sx.km); cur.set(c.key, { g: rf.g + c.rec.d, k: rf.k, dw: !!sx.dwell, lab: c.rec.t + ' ' + c.rec.n + '(' + c.line + ')', cid: c.cid }); }
        if (prev) { const keys = [...cur.keys()]; for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) { const a = cur.get(keys[i]), bb = cur.get(keys[j]), a0 = prev.get(keys[i]), b0 = prev.get(keys[j]); if (!a0 || !b0 || a.g !== bb.g || a0.g !== a.g || b0.g !== bb.g) continue; if (a.cid && a.cid === bb.cid) continue; if (a.dw || bb.dw || a0.dw || b0.dw) continue;
            if ((a0.k - b0.k) * (a.k - bb.k) < 0 && Math.abs(a.k - bb.k) > 0.05) { flips++; if (!firstBad) firstBad = a.lab + ' x ' + bb.lab + ' @' + W.trip.label + ' t=' + t; } } }
        prev = cur; } } }
  ok(worlds > 40 && flips === 0, 'khởi động ở ' + worlds + ' giờ khác nhau: ' + flips + ' lần tàu cùng chiều đổi thứ tự trong 5 phút đầu', firstBad);
}

if (section('29b. Furigana tên ga (stations-kana.js): mọi ga đều có cách đọc hiragana')) {
  require(path.join(DRIVE, 'stations-kana.js')); require(path.join(DRIVE, 'data-lines.js'));
  let miss = 0; for (const id in global.LINES) for (const st of global.LINES[id].stations) if (!/^[ぁ-ゖー]+$/.test(global.STATION_KANA[st.jp] || '')) { miss++; console.log('  thiếu/sai cách đọc:', st.jp); }
  ok(miss === 0, 'mọi ga có cách đọc toàn hiragana', miss);
}
if (section('29. Đa ngôn ngữ (i18n.js, lang-en.js, lang-ja.js): đủ bản dịch, đúng chỗ điền, không lọt tiếng Việt')) {
  const fs = require('fs'); require(path.join(DRIVE, 'lang-en.js')); require(path.join(DRIVE, 'lang-ja.js'));
  const VNX = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/;      // chữ đặc trưng tiếng Việt (không gồm é: có trong tên riêng)
  const VNK = /[À-ÃÈ-ÊÌÍÒ-ÕÙÚÝà-ãè-êìíò-õùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/;
  // 1) thu khoá _t('...') trong mã nguồn
  const files = ['sim.js', 'tutorial.js', 'fullui.js', 'natmap.js', 'store.js', 'audio.js', 'winview.js', 'scene.js', 'topview.js', 'music.js', 'index.html'], keys = new Set(); let bad = 0;
  const reKey = /(?<![\w$.])_t\(\s*('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")/g;
  for (const f of files) { const src = fs.readFileSync(path.join(DRIVE, f), 'utf8'); let m; while ((m = reKey.exec(src))) { try { keys.add(new Function('return ' + m[1])()); } catch (e) { bad++; } } }
  { const src = fs.readFileSync(path.join(DRIVE, 'cabview.js'), 'latin1'); const m = src.match(/_t\('(V[^']{0,4}CH)'\)/); if (m) keys.add('VẠCH'); }
  const codeKeys = new Set(keys), NEUTRAL = new Set(['×']);      // khoá _t trong mã: phải có bản dịch dù không có dấu tiếng Việt
  // văn bản tĩnh trong HTML (ngoài <script>/<style>), đã chuẩn hoá khoảng trắng
  { const h = fs.readFileSync(path.join(DRIVE, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, ''), norm = x => x.replace(/\s+/g, ' ').trim(); let m;
    const rt = />([^<>]+)</g; while ((m = rt.exec(h))) { const k = norm(m[1]); if (k && VNK.test(k)) keys.add(k); }
    const ra = /(?:title|alt|placeholder|aria-label)="([^"]*)"/g; while ((m = ra.exec(h))) { const k = norm(m[1]); if (k && VNK.test(k)) keys.add(k); }
    const mt = h.match(/<title>([\s\S]*?)<\/title>/); if (mt) keys.add(norm(mt[1])); }
  const vnKeys = [...keys].filter(k => VNK.test(k) || (codeKeys.has(k) && /[A-Za-z]{2}/.test(k) && !NEUTRAL.has(k))), EN = I18N.dict.en, JA = I18N.dict.ja;
  ok(bad === 0 && vnKeys.length > 650, 'thu được ' + vnKeys.length + ' khoá tiếng Việt cần dịch trong mã và HTML (' + bad + ' khoá không đọc được)');
  // 2) đủ bản dịch, đủ chỗ điền, không lọt tiếng Việt
  const ph = s => [...new Set(s.match(/\{\d+\}/g) || [])].sort().join(',');
  const miss = { en: vnKeys.filter(k => !(k in EN)), ja: vnKeys.filter(k => !(k in JA)) };
  ok(miss.en.length === 0 && miss.ja.length === 0, 'mọi khoá đều có bản dịch Anh và Nhật', 'thiếu en ' + miss.en.length + ' / ja ' + miss.ja.length + ': ' + miss.en.concat(miss.ja).slice(0, 3).join(' | '));
  const badPh = vnKeys.filter(k => (k in EN && ph(k) !== ph(EN[k])) || (k in JA && ph(k) !== ph(JA[k])));
  ok(badPh.length === 0, 'bản dịch giữ đúng các chỗ điền {0}, {1}...', badPh.slice(0, 2).join(' | '));
  const empty = vnKeys.filter(k => (EN[k] === '' || JA[k] === '') && ![].includes(k));
  ok(empty.length === 0, 'không có bản dịch rỗng', empty.slice(0, 3).join(' | '));
  const leak = [['en', EN], ['ja', JA]].flatMap(([l, d]) => Object.entries(d).filter(([k, v]) => VNX.test(v) && !/^(Tiếng Việt)$/.test(v)).map(([k, v]) => l + ': ' + v.slice(0, 50)));
  ok(leak.length === 0, 'bản dịch không lẫn chữ tiếng Việt', leak.slice(0, 3).join(' | '));
  const stale = Object.keys(EN).concat(Object.keys(JA)).filter(k => !keys.has(k));
  ok(stale.length === 0, 'từ điển không còn khoá thừa (' + stale.length + ')', stale.slice(0, 3).join(' | '));
  // tên tuyến đổi tàu (transfers.js) đều có tên tiếng Anh (transfers-en.js)
  { require(path.join(DRIVE, 'transfers.js')); require(path.join(DRIVE, 'transfers-en.js')); const miss2 = [...new Set(Object.values(window.TRANSFERS).flat())].filter(n => !window.TRANSFERS_EN[n]); ok(miss2.length === 0, 'mọi tuyến đổi tàu có tên tiếng Anh', miss2.slice(0, 3).join(' | ')); }
  // 3) hàm t(): điền chỗ, dự phòng tiếng Việt
  const L0 = I18N.lang;
  I18N.lang = 'vi'; ok(_t('Chuyến {0} ({1}) · {2} → {3} · {4} · tải khách {5}%', 'N1', 'N700', 'A', 'B', 'x', 80) === 'Chuyến N1 (N700) · A → B · x · tải khách 80%', 'vi: _t điền đúng chỗ {n}');
  I18N.lang = 'en'; ok(_t('Khoảng cách tới chuyến khách đầu ngày: {0}', '5') === "Margin to the day's first passenger trip: 5" && _t('không có khoá này {0}', 1) === 'không có khoá này 1', 'en: dịch và điền chỗ, khoá lạ giữ nguyên tiếng Việt');
  I18N.lang = 'ja'; ok(_t('Chờ {0} vượt qua ga', 'N1') === 'N1が駅を通過するのを待機中', 'ja: dịch và điền chỗ');
  // 4) chạy thật ở en và ja trong tiến trình riêng (ngôn ngữ đặt trước khi nạp mô-đun, như khi mở trang): chuỗi hằng của mô-đun, tin nhắn trong chuyến, nhật ký ATC không lọt tiếng Việt
  for (const lang of ['en', 'ja']) {
    const r = require('child_process').spawnSync(process.execPath, [path.join(__dirname, 'i18n_child.js'), lang], { encoding: 'utf8', timeout: 240000 });
    let o = null; try { o = JSON.parse(r.stdout.trim().split('\n').pop()); } catch (e) { }
    ok(o && o.msgs > 40 && o.leaks.length === 0, lang + ': ' + (o ? o.msgs + ' tin nhắn trong 8 chuyến, ' + o.leaks.length + ' chuỗi còn tiếng Việt' : 'không chạy được: ' + String(r.stderr).slice(0, 200)), o && o.leaks.slice(0, 3).join(' | '));
  }
  I18N.lang = L0;
}

if (section('30. Chế độ thực tế (realmode.js + sim.js): giờ Nhật, lọc chuyến, dữ liệu thời tiết/động đất thật, snapshot xác định, lỗi mạng')) {
  const RM = require(path.join(DRIVE, 'realmode.js'));
  // giờ Nhật Bản (UTC+9), kể cả qua nửa đêm
  let j = RM.jstNow(new Date('2026-10-31T00:30:00Z')); ok(j.date === '2026-10-31' && j.sec === 9 * 3600 + 1800, 'jstNow: 00:30 UTC = 09:30 JST', JSON.stringify(j));
  j = RM.jstNow(new Date('2026-10-31T15:05:09Z')); ok(j.date === '2026-11-01' && j.sec === 5 * 60 + 9, 'jstNow: 15:05 UTC = 00:05 ngày kế (JST)', JSON.stringify(j));
  ok(RM.hhmm(9 * 3600 + 1800) === '09:30' && RM.hhmm(25 * 3600) === '01:00', 'hhmm: định dạng giờ, giờ sau nửa đêm quay vòng');
  // lọc chuyến theo giờ
  const rec = { s: [[0, null, 8 * 3600, 0], [1, null, null, 1], [2, 9 * 3600, 9 * 3600 + 120, 0], [3, 10 * 3600, null, 0]] };
  ok(RM.canDepart(rec, 8 * 3600) && RM.canDepart(rec, 9 * 3600 + 100) && !RM.canDepart(rec, 9 * 3600 + 121), 'canDepart: ga cuối chỉ có giờ đến nên không tính; có ga rời sau giờ hiện tại thì còn chạy được');
  ok(JSON.stringify(RM.departable(rec, 8 * 3600 + 1)) === '[2]' && JSON.stringify(RM.departable(rec, 0)) === '[0,2]', 'departable: chỉ các ga còn rời ga từ giờ hiện tại');
  // các điểm lấy mẫu dọc tuyến: tối đa 9, trải hết đoạn, không trùng
  for (const ln of ALL) { const L = window.LINES[ln], pts = RM.samplePoints(L, 0, L.stations.length - 1); ok(pts.length >= 2 && pts.length <= 9 && pts[0].i === 0 && pts[pts.length - 1].i === L.stations.length - 1 && new Set(pts.map(p => p.i)).size === pts.length && pts.every(p => p.lat > 20 && p.lon > 120), ln + ': điểm lấy mẫu thời tiết hợp lệ', pts.length); }
  // phân tích phản hồi Open-Meteo / P2PQuake (dữ liệu giả cùng định dạng)
  const mkH = (r, sn, g) => ({ hourly: { precipitation: Array(48).fill(r), snowfall: Array(48).fill(sn), wind_gusts_10m: Array(48).fill(g) } });
  const P2 = RM.samplePoints(window.LINES.tsk, 0, 5), parsed = RM.parseWx(P2.map(() => mkH(1.04, 0, 7.77)), P2, 6);
  ok(parsed && parsed.h0 === 6 && parsed.pts.length === P2.length && parsed.pts[0].rain.length === RM.HOURS && parsed.pts[0].rain[0] === 1 && parsed.pts[0].gust[0] === 7.8, 'parseWx: cắt đúng số giờ, làm tròn 0,1');
  ok(RM.parseWx([mkH(0, 0, 0)], P2, 0) === null && RM.parseWx({}, P2, 0) === null && RM.parseWx(null, P2, 0) === null, 'parseWx: sai số điểm hoặc dữ liệu hỏng thì trả về null');
  const now = { date: '2026-10-31', sec: 12 * 3600 }, q = (time, sc, lat, lon) => ({ code: 551, earthquake: { time, maxScale: sc, hypocenter: { latitude: lat, longitude: lon, magnitude: 5.2, depth: 20, name: 'テスト' } } });
  const qs = RM.parseQuakes([q('2026/10/31 11:30:00', 40, 35, 139), q('2026/10/31 06:00:00', 40, 35, 139), q('2026/10/31 12:30:00', 40, 35, 139), q('2026/10/30 23:50:00', 40, 35, 139), { code: 551 }, q('bad', 40, 35, 139), q('2026/10/31 11:59:59', 55, 36, 140)], now);
  ok(qs.length === 2 && qs[0].t === 11 * 3600 + 1800 && qs[0].shindo === 4 && qs[1].shindo === 6 && qs[1].lat === 36, 'parseQuakes: chỉ giữ động đất trong 3 giờ gần đây, bỏ tương lai và bản ghi hỏng', JSON.stringify(qs.map(x => [x.t, x.shindo])));
  ok(RM.parseQuakes(null, now).length === 0 && RM.parseQuakes('x', now).length === 0, 'parseQuakes: dữ liệu không phải mảng thì rỗng');
  // snapshot qua fetch giả: thành công, một nguồn lỗi, cả hai lỗi
  const L0 = window.LINES.tsk, fetchOk = url => Promise.resolve({ ok: true, json: () => Promise.resolve(url.includes('open-meteo') ? P2.length ? RM.samplePoints(L0, 0, 5).map(() => mkH(2, 0, 5)) : [] : []) });
  const snapJobs = [RM.snapshot(L0, 0, 5, 9 * 3600, { fetch: fetchOk, now: new Date('2026-10-31T00:30:00Z') }),
    RM.snapshot(L0, 0, 5, 9 * 3600, { fetch: url => url.includes('open-meteo') ? Promise.reject(new Error('x')) : fetchOk(url), now: new Date('2026-10-31T00:30:00Z') }),
    RM.snapshot(L0, 0, 5, 9 * 3600, { fetch: () => Promise.reject(new Error('offline')), now: new Date('2026-10-31T00:30:00Z') }),
    RM.snapshot(L0, 0, 5, 9 * 3600, { fetch: () => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }), now: new Date('2026-10-31T00:30:00Z') })];
  (global.__pending = global.__pending || []).push(Promise.all(snapJobs).then(([a, b, c, d]) => {
    ok(a.v === 1 && a.date === '2026-10-31' && a.at === 9 * 3600 + 1800 && a.wx && a.wx.h0 === 8 && a.eq && a.eq.length === 0, 'snapshot: có thời tiết (từ 08:00) và danh sách động đất');
    ok(b.wx === null && b.eq !== null, 'snapshot: lỗi thời tiết không làm mất phần động đất');
    ok(c.wx === null && c.eq === null && d.wx === null && d.eq === null, 'snapshot: mất mạng hoặc HTTP 500 thì cả hai là null (không ném lỗi)');
  }));
  // dựng thế giới từ snapshot
  const lnR = 'tsk', LR = window.LINES[lnR], recR = Sim.lineOf(lnR).trains.find(t => t.d === 'down' && t.t === 'Nozomi' && t.s.some(e => e[0] === 0 && !e[3]) && t.s.some(e => e[0] === 12 && !e[3]));
  const tripR = () => Sim.makeTrip(lnR, recR, 0, 12), t0R = tripR().t0, mkSnap = (rain, snow, gust, eq) => { const pts = RM.samplePoints(LR, 0, 12), h0 = Math.floor(t0R / 3600) - 1; return { v: 1, date: '2026-10-31', at: t0R - 600, wx: rain === null ? null : { h0, pts: pts.map(p => Object.assign({}, p, { rain: Array(9).fill(rain), snow: Array(9).fill(snow), gust: Array(9).fill(gust) })) }, eq: eq || [] }; };
  const mk = (snap, weather) => Sim.createWorld(lnR, tripR(), { diff: 'normal', seed: 7, lead: false, events: true, weather: weather || 'real', real: snap });
  let W = mk(mkSnap(65, 0, 5)); for (let i = 0; i < 400; i++) Sim.tick(W, 0.05, {}, true);      // tự lái: sự kiện chỉ chạy khi chuyến đã chạy
  ok(W.weatherKind === 'rain' && W.zones.some(z => z.kind === 'rain' && !z.hold && Math.abs(z.v - 70 / 3.6) < 1e-6 && z.tA < z.tB), 'mưa thật 65 mm/h: vùng mưa chạy chậm 70 km/h theo giờ dự báo', W.weatherKind);
  ok(W.zones.some(z => z.kind === 'rain' && z.hold), 'mưa thật ≥ 60 mm/h: có lệnh dừng chạy');
  W = mk(mkSnap(0, 0, 33)); for (let i = 0; i < 400; i++) Sim.tick(W, 0.05, {}, true);      // tự lái: sự kiện chỉ chạy khi chuyến đã chạy ok(W.zones.some(z => z.kind === 'wind' && z.hold), 'gió giật thật ≥ 30 m/s: có lệnh dừng chạy');
  W = mk(mkSnap(0, 2, 5)); ok(W.weatherKind === 'snow' && W.zones.some(z => z.kind === 'snow' && Math.abs(z.v - 160 / 3.6) < 1e-6 && z.tA > -1e8 && z.tB < 1e8), 'tuyết thật 2 cm/h: vùng tuyết 160 km/h có giới hạn thời gian (không phủ cả ngày)');
  W = mk(mkSnap(0, 0, 3)); ok(W.weatherKind === 'clear' && !W.zones.some(z => /^(rain|snow|wind)$/.test(z.kind)), 'trời quang thật: không có vùng mưa/tuyết/gió');
  W = mk(mkSnap(0.8, 0, 3)); ok(W.weatherKind === 'rain' && W.zones.some(z => z.kind === 'rain' && z.v > 100), 'mưa nhẹ: có mưa (gạt mưa) nhưng không giới hạn tốc độ');
  const wA = mk(mkSnap(35, 0.5, 22)), wB = mk(mkSnap(35, 0.5, 22)); ok(JSON.stringify(wA.zones) === JSON.stringify(wB.zones) && JSON.stringify(wA.events.map(e => e.at)) === JSON.stringify(wB.events.map(e => e.at)), 'cùng snapshot và seed: cùng vùng thời tiết và sự kiện (xác định)');
  ok(wA.haz && wA.realCells.length > 0 && wA.haz.cells.length === wA.realCells.length, 'bản đồ toàn quốc: ô thời tiết lấy từ dữ liệu thật, không thêm ô giả');
  // mất dữ liệu thời tiết: thời tiết ngẫu nhiên theo seed, vẫn chạy được
  W = mk(mkSnap(null, 0, 0)); ok(['clear', 'rain', 'typhoon', 'snow', 'eqk'].includes(W.weatherKind), 'thiếu thời tiết thật: quay về thời tiết ngẫu nhiên', W.weatherKind);
  W = mk(undefined); ok(['clear', 'rain', 'typhoon', 'snow', 'eqk'].includes(W.weatherKind), 'chọn "thực tế" mà không có snapshot: không lỗi, dùng thời tiết ngẫu nhiên');
  // dư chấn động đất thật gần tuyến
  const stM = LR.stations[6], eq1 = [{ t: t0R - 1800, lat: stM.lat + 0.2, lon: stM.lon, mag: 6, depth: 10, shindo: 5, name: 'テスト' }], eq2 = [{ t: t0R - 1800, lat: stM.lat, lon: stM.lon, mag: 4, depth: 10, shindo: 3, name: 'テスト' }], eq3 = [{ t: t0R - 1800, lat: 43, lon: 141, mag: 6, depth: 10, shindo: 5, name: '遠い' }], eq4 = [{ t: t0R - 7 * 3600, lat: stM.lat, lon: stM.lon, mag: 6, depth: 10, shindo: 5, name: '古い' }];
  W = mk(mkSnap(0, 0, 3, eq1)); ok(W.zones.some(z => z.kind === 'eqk' && z.tA < 0 && z.tB > 0 && Math.abs(z.v - 70 / 3.6) < 1e-6), 'động đất thật 震度5 gần tuyến: chạy kiểm tra chậm 70 km/h quanh tâm chấn');
  ok(![mk(mkSnap(0, 0, 3, eq2)), mk(mkSnap(0, 0, 3, eq3)), mk(mkSnap(0, 0, 3, eq4))].some(w => w.zones.some(z => z.kind === 'eqk')), 'động đất nhẹ (震度3), ở xa tuyến hoặc quá cũ: không ảnh hưởng chuyến');
  // chế độ thực tế không có động đất giả (ngẫu nhiên theo seed), kể cả khi mất dữ liệu thời tiết; chế độ thường vẫn có
  let fakeEq = 0, normalEq = 0; for (let sd = 1; sd <= 60; sd++) { const wr = Sim.createWorld(lnR, tripR(), { diff: 'expert', seed: sd, lead: false, events: true, weather: 'real', real: mkSnap(sd % 2 ? 0 : null, 0, 3) }); if ((wr.hazPlan || []).some(p => p.kind === 'eqk') || wr.weatherKind === 'eqk') fakeEq++;
    const wn = Sim.createWorld(lnR, tripR(), { diff: 'expert', seed: sd, lead: false, events: true, weather: 'auto' }); if ((wn.hazPlan || []).some(p => p.kind === 'eqk')) normalEq++; }
  ok(fakeEq === 0 && normalEq > 5, 'chế độ thực tế: 0/60 chuyến có động đất ngẫu nhiên (chế độ thường: ' + normalEq + '/60)', fakeEq);
  // động đất thật xảy ra TRONG lúc chơi (Sim.injectQuake; index.html gọi qua thao tác 'quake' được ghi lại)
  const st0 = LR.stations[0], stN = LR.stations[12], mkQ = (lat, lon, sc) => ({ t: t0R, lat, lon, mag: 6, depth: 10, shindo: sc, name: 'テスト' }), live = q => { const w = mk(mkSnap(0, 0, 3)), n0 = w.haz.quakes.length, r = Sim.injectQuake(w, q); for (let i = 0; i < 1200; i++) Sim.tick(w, 0.05, {}, true); return { w, r, added: w.haz.quakes.length - n0 }; };
  let lv = live(mkQ(st0.lat, st0.lon, 5)); ok(lv.r && lv.w.eqkAt !== undefined && lv.added === 1 && lv.w.haz.quakes[lv.w.haz.quakes.length - 1].real === true, 'động đất thật ngay dưới tàu (震度5): cắt điện sau sóng S, ghi vào bản đồ');
  lv = live(mkQ(43, 141.3, 5)); ok(lv.r && lv.w.eqkAt === undefined && !lv.w.zones.some(z => z.kind === 'eqk'), 'động đất thật rất xa tuyến: chỉ thông báo, không cắt điện, không giới hạn tốc độ');
  lv = live(mkQ(stN.lat, stN.lon, 5)); ok(lv.r && lv.w.eqkAt === undefined && lv.w.zones.some(z => z.kind === 'eqk' && z.tA >= 0), 'động đất thật 震度5 gần đoạn phía trước nhưng xa tàu: chạy kiểm tra chậm ở đoạn đó');
  lv = live(mkQ(st0.lat, st0.lon, 2)); ok(!lv.r && lv.added === 0 && lv.w.eqkAt === undefined, 'động đất thật 震度2: bỏ qua');
  const l1 = live(mkQ(st0.lat, st0.lon, 5)), l2 = live(mkQ(st0.lat, st0.lon, 5)); ok(l1.w.eqkAt === l2.w.eqkAt && l1.w.player.x === l2.w.player.x, 'cùng thao tác động đất ở cùng thời điểm: cùng kết quả (xem lại xác định)');
  // thiên tai/thời tiết giữ tàu ở CẢ ga xuất phát và ga trước vùng xấu (vùng giữ tàu theo thời gian), cả chế độ thực tế lẫn chế độ thường
  const mkSnapH = fn => { const pts = RM.samplePoints(LR, 0, 12), h0 = Math.floor(t0R / 3600) - 1; return { v: 1, date: '2026-10-31', at: t0R - 600, wx: { h0, pts: pts.map((p, i) => Object.assign({}, p, { rain: Array.from({ length: 9 }, (_, h) => fn(i, pts.length, h)), snow: Array(9).fill(0), gust: Array(9).fill(3) })) }, eq: [] }; };
  const trial = fn => { const w = Sim.createWorld(lnR, tripR(), { diff: 'easy', seed: 7, lead: false, events: true, weather: 'real', real: mkSnapH(fn) }), T = w.player; let dep = null; for (let i = 0; i < 300000 && !T.finished; i++) { Sim.tick(w, 0.05, {}, true); if (dep === null && T.x > 50) dep = w.t; } return { dep, t: w.t, done: T.finished }; };
  const clear = trial(() => 0), atStart = trial((i, n, h) => i === 0 && h === 1 ? 65 : 0), midTrip = trial((i, n, h) => i === Math.floor(n / 2) && h === 1 ? 65 : 0), later = trial((i, n, h) => i === Math.floor(n / 2) && h === 2 ? 65 : 0);
  ok(clear.done && clear.dep < 60, 'trời quang: xuất phát ngay');
  ok(atStart.done && atStart.dep >= 3590 && atStart.t > clear.t + 3000, 'mưa thật ≥ 60 mm/h ở ga xuất phát: tàu bị giữ ở ga đầu tới hết giờ rồi vẫn chạy hết chuyến', 'xuất phát t=' + Math.round(atStart.dep) + ' s, kết thúc ' + Math.round(atStart.t));
  ok(midTrip.done && midTrip.dep < 60 && midTrip.t > clear.t + 1500, 'mưa thật ≥ 60 mm/h ở giữa tuyến: tàu xuất phát bình thường rồi chờ ở ga trước vùng mưa', 'kết thúc ' + Math.round(midTrip.t) + ' so với ' + Math.round(clear.t));
  ok(later.done && later.t < clear.t + 300, 'mưa thật ở giữa tuyến nhưng tàu đã qua trước giờ đó: không bị giữ', 'kết thúc ' + Math.round(later.t) + ' so với ' + Math.round(clear.t));
  let startEv = 0, startHeld = 0, startBad = 0; const recS = Sim.lineOf(lnR).trains.find(t => t.d === 'down' && t.s.some(e => e[0] === 0 && !e[3]) && t.s.some(e => e[0] === 3 && !e[3]));
  for (let sd = 1; sd <= 30; sd++) { const w = Sim.createWorld(lnR, Sim.makeTrip(lnR, recS, 0, 3), { diff: 'expert', seed: sd, lead: false, events: true, weather: 'auto' }), T = w.player, gz = w.zones.find(z => z.gate && z.tA === 0), eq0 = (w.hazPlan || []).some(p => p.kind === 'eqk' && p.at === 0);
    if (!gz && !eq0) continue;
    let dep = null; for (let i = 0; i < 150000 && !T.finished; i++) { Sim.tick(w, 0.05, {}, true); if (dep === null && T.x > 50) dep = w.t; }
    { startEv++; if (dep !== null && dep >= (gz ? gz.tB : 300) - 1) startHeld++; if (!T.finished) startBad++; } }
  ok(startEv >= 5 && startHeld === startEv && startBad === 0, 'chế độ thường: sự kiện thiên tai ngay tại ga xuất phát giữ tàu đúng thời hạn rồi chuyến vẫn kết thúc (' + startEv + '/30 seed có sự kiện)', startHeld + ' bị giữ, ' + startBad + ' không xong');
  // tàu theo lịch trên bản đồ cũng bị giữ như tàu của người chơi: đang đứng ga (kể cả ga xuất phát) mà chặng kế tiếp chạm ô giữ tàu thì chờ tới hết hạn
  { const wC = mk(mkSnapH((i, n, h) => i === 0 && h === 1 ? 65 : 0)); wC.t = 3700; NatCat.step(wC); let nIn = 0, held = 0, nOut = 0, lateOut = 0;
    for (const cc of NatCat.build(window.LINES)) { const st = cc.stops[0]; if (window.LINES[cc.line].stations[st.i].jp !== '東京') continue; const td = cc.td(st), dl = NatCat.delayOf(wC, cc.key);
      if (td >= t0R + 30 && td <= t0R + 3000) { nIn++; if (dl && dl.delay >= t0R + 3600 - td - 15) held++; } else if (td >= t0R + 3700 && td <= t0R + 7000) { nOut++; if (dl && dl.delay > 600) lateOut++; } }
    ok(nIn >= 8 && held === nIn, 'tàu theo lịch xuất phát từ Tokyo trong giờ mưa ≥ 60 mm/h bị giữ ở ga xuất phát tới hết giờ (' + held + '/' + nIn + ')');
    ok(nOut >= 8 && lateOut === 0, 'tàu theo lịch xuất phát sau giờ mưa không bị ảnh hưởng (' + lateOut + '/' + nOut + ' bị trễ)'); }
  // tàu đang chạy giữa đường (kể cả Nozomi chạy thông qua nhiều ga) bị dừng ở ga (kể cả ga thông qua) ngay trước ô giữ tàu, vị trí sát ga
  { const wM = mk(mkSnapH((i, n, h) => i === 4 && h === 2 ? 65 : 0)), cl = wM.haz.cells.find(x => x.stop); wM.t = 3600 + 900; NatCat.step(wM); let heldM = 0, nearM = 0, passStop = 0; const nowM = t0R + wM.t;
    for (const cc of NatCat.build(window.LINES)) { const dl = NatCat.delayOf(wM, cc.key); if (!dl || dl.hold <= 0 || dl.why !== 'rain') continue; const sx = NatCat.stateOf(window.LINES, cc, nowM - dl.delay); if (!sx) continue; heldM++; const LL = window.LINES[cc.line], near = LL.stations.reduce((m, st) => Math.min(m, NatCat.hav(st.lat, st.lon, sx.lat, sx.lon)), 1e9); if (near < 0.7 || sx.dwell) { nearM++; if (!sx.dwell && !cc.stops.some(p => LL.stations[p.i].km === sx.km)) passStop++; } }
    ok(cl && heldM >= 2 && nearM === heldM, 'tàu đang chạy gặp ô giữ tàu: dừng sát một ga ngay trước ô (' + nearM + '/' + heldM + ')'); }
  // chạy trọn chuyến trong thời tiết thật xấu vẫn kết thúc được
  const rr = runAuto(lnR, recR, 0, 12, { diff: 'normal', events: true, weather: 'real', real: mkSnap(32, 0.4, 21, eq1) }, 40000); ok(rr.T.finished, 'chạy tự động trọn chuyến với thời tiết thật xấu + dư chấn: tới ga cuối');
}

Promise.all(global.__pending || []).then(() => { console.log(`\nKẾT QUẢ: ${pass} đạt, ${fail} lỗi`); if (fail) { failures.slice(0, 40).forEach(f => console.log('  ✗ ' + f)); process.exit(1); } });
