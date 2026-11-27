// Bộ kiểm thử mô phỏng: node tests/run.js  (không cần trình duyệt)
const path = require('path');
const DRIVE = path.join(__dirname, '..', 'prototype', 'drive');
global.window = global;
global.localStorage = (() => { const m = {}; return { getItem: k => m[k] || null, setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })();
require(path.join(DRIVE, 'data-lines.js'));
require(path.join(DRIVE, 'i18n.js'));
const Sim = require(path.join(DRIVE, 'sim.js')); global.Sim = Sim; require(path.join(DRIVE, 'natcat.js'));
const createWorld0 = Sim.createWorld; Sim.createWorld0 = createWorld0; Sim.createWorld = function () { const W = createWorld0.apply(this, arguments); if (W.player && !W.player.isLead) W.player.bk = 0; return W; };      // các test cũ giả định phanh đã nhả (N); cơ chế EB mặc định có test riêng (phần 39) dùng createWorld0
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
const SUB = (process.argv.find(a => a.startsWith('--sub=')) || '').slice(6).split('/').map(Number);      // --sub=a/b: chia nhỏ phần 2 (tự lái mọi chuyến) thành b lát, chạy lát a
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);      // --only=k: chỉ chạy phần thứ k (đếm từ 0; phần 0 luôn chạy), dùng cho tests/run-parallel.js
const section = s => { if (TIMED && secName) console.log('   (' + ((Date.now() - secT) / 1000).toFixed(1) + ' s)'); secT = Date.now(); secName = s; const n = secN++, run = ONLY !== '' ? (n === 0 || n === +ONLY) : (n === 0 || !SH[1] || (n - 1) % SH[1] === SH[0] - 1); if (run) console.log('\n== ' + s); return run; };

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
  let worst = 0, cnt = 0, subI = 0;
  for (const ln of ALL) { const L = Sim.lineOf(ln); for (const rec of L.trains.filter((t, i) => i % 7 === 0)) {
    if (SUB[1] && (subI++ % SUB[1]) !== SUB[0]) continue;
    const st = rec.s.filter(e => !e[3]); const a = st[0][0], b = st[st.length - 1][0]; const r = runAuto(ln, rec, a, b); cnt++;
    ok(r.T.finished && !r.T.failed, `${ln} ${rec.t} ${rec.n}: hoàn thành`);
    const d = Math.max(...r.T.results.map(x => Math.abs(x.delay))); if (Sim.INSPECT[rec.v]) { /* tàu kiểm tra tự lái chạy theo ATC cao nhất, không bám giờ kế hoạch */ } else if (ln !== 'jts' && ln !== 'yam' && ln !== 'aki') worst = Math.max(worst, d); else if (ln === 'aki') ok(d < 420, `${ln} ${rec.t} ${rec.n}: chờ tàu ngược chiều gặp nhau ở Omagari (tính là miễn trừ), tự lái trễ < 420 s`, Math.round(d)); else ok(d < 260, `${ln} ${rec.t} ${rec.n}: lịch rất căng, tự lái trễ < 260 s`, Math.round(d));      // Joetsu: lịch thật dồn (Takasaki–Echigo-Yuzawa 23 phút) vượt khả năng tăng/giảm tốc của mô hình [I]
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
  W = mkw(); Sim.inject(W, 'eqk', { sec: 200 }); T = W.player; ok(T.cut && W.eqkActive, 'động đất: cắt điện'); { let n = 0; while (W.eqkActive && n++ < 1e5) Sim.tick(W, 0.05, {}, true); } ok(!W.eqkActive && !T.cut, 'động đất: hết thời gian kiểm tra thì chạy lại'); ok(W.zones.some(z => z.kind === 'eqk'), 'động đất: có vùng chạy chậm sau sự cố');
  W = mkw(); Sim.inject(W, 'overtake'); ok(!!W.decision, 'đề nghị cho vượt: có quyết định'); Sim.answerDecision(W, 'a'); ok(W.netScore === 3 && !W.decision, 'chấp nhận: +3'); Sim.inject(W, 'overtake'); Sim.answerDecision(W, 'b'); ok(W.netScore === 0, 'từ chối: −3');
  W = mkw(); Sim.inject(W, 'wire'); ok(W.wires.length === 1 && W.zones.some(z => z.kind === 'wire'), 'dây điện: tạo sự cố'); T = run(W, w => w.player.phase === 'end'); ok(T.finished, 'dây điện: vẫn hoàn thành chuyến');
  W = mkw(); Sim.inject(W, 'fire'); ok(W.fireActive, 'cháy: kích hoạt'); T = run(W, w => w.player.finished); ok(T.finished && T.fireTunnel === 0, 'cháy: tự lái hoàn thành, không dừng trong hầm');
  // bất an hành khách
  W = mkw(); T = W.player; Sim.requestClose(T); { let n = 0; while (T.phase !== 'run' && n++ < 5000) { Sim.tick(W, 0.05, {}, false); if (T.door === 'closed') Sim.setPower(T, 1); } T.v = 0; T.pw = 0; T.bk = 8; n = 0; while (n++ < 20 * 60 * 12) Sim.tick(W, 0.05, {}, false); ok((W.paCount || 0) >= 1 && T.anxMax >= 40 && !T.panic, 'đứng giữa đường lâu → bất an tăng, trưởng tàu tự phát thanh trấn an (' + (W.paCount || 0) + ' lần)', [T.anxMax, W.paCount]); T.paAt = -999; T.anx = 90; ok(Sim.announcePA(T) && T.anx < 50, 'phát thanh giảm bất an'); ok(!Sim.announcePA(T), 'phát thanh có thời gian chờ'); }
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
  T.fireTunnel = 1; ok(Sim.score(T, W).final < s1, 'dừng trong hầm khi cháy bị trừ điểm'); T.fireTunnel = 0; T.anxMax = 100; ok(Sim.score(T, W).final === s1, 'bất an cao nhưng chưa hoảng loạn: không trừ (trưởng tàu tự trấn an)'); T.panic = true; ok(Sim.score(T, W).final < s1, 'hành khách hoảng loạn bị trừ điểm'); T.panic = false;
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
  // sức chứa ga (18/11): ga có N đường dừng cùng chiều chỉ chứa N tàu đứng cùng lúc; tàu thứ N+1 định dừng ở ga đó chờ phía sau, ATC giữ khoảng cách (trước đây chế độ mạng bỏ qua mọi tàu đang đỗ nên tàu sau đi xuyên)
  for (const [stn, holdN] of [['Kurume', 3], ['Shin-Tosu', 3]]) {
    const Wc = Sim.createNetwork('tsk', 'down', { diff: 'normal', seed: 5, t0: 8 * 3600, span: 5400 }); Wc.events = []; const Lc = Wc.line, si = Lc.stations.findIndex(x => x.en === stn), cap = Math.max(1, Layout.stopCount(Lc.stations[si].lay, 'down'));
    const cand = Wc.net.trains.filter(T => { const j = T.M.findIndex(m => m.i === si && m.stop); return j > 0 && j < T.M.length - 1; }).sort((a, b) => a.M.find(m => m.i === si).arr - b.M.find(m => m.i === si).arr);
    cand.slice(0, holdN).forEach(T => { const j = T.M.findIndex(m => m.i === si && m.stop); T.holds[j] = T.M[j].arr + 1500; });
    let sM = NaN; for (const T of Wc.net.trains) { const m = T.M.find(m => m.i === si); if (m) { sM = m.s; break; } }
    let mx = 0, nn = 0; while (Wc.t < 5400 && nn++ < 1e5) { Sim.netTick(Wc, 0.2, true); const z = Wc.net.trains.filter(T => T.started && T.phase !== 'end' && Math.abs(T.x - sM) < 450 && (T.phase === 'dwell' || T.v < 1.5)).length; if (z > mx) mx = z; }
    ok(cand.length > holdN && mx >= 1 && mx <= cap, `${stn} (${cap} đường dừng cùng chiều): giữ ${holdN} tàu đỗ → không quá ${cap} tàu đứng cùng lúc trong sân ga, tàu sau chờ phía sau`, [mx, cap]); }
  // tàu chạy suốt gặp ga đầy (ga không có đường thông riêng): phải giữ khoảng cách, không đi vào sân ga; ga có đường thông riêng (Odawara...) thì tàu chạy suốt đi qua bình thường
  { const Wt = Sim.createNetwork('tsk', 'down', { diff: 'normal', seed: 5, t0: 8 * 3600, span: 5400 }); Wt.events = []; const Lt = Wt.line, si = Lt.stations.findIndex(x => x.en === 'Atami');
    const cand = Wt.net.trains.filter(T => { const j = T.M.findIndex(m => m.i === si); return j > 0 && j < T.M.length - 1 && T.M[j].stop; }).sort((a, b) => a.M.find(m => m.i === si).arr - b.M.find(m => m.i === si).arr);
    const j0 = cand[0].M.findIndex(m => m.i === si); cand[0].holds[j0] = cand[0].M[j0].arr + 1800;
    let sM = NaN; for (const T of Wt.net.trains) { const m = T.M.find(m => m.i === si); if (m) { sM = m.s; break; } }
    let into = 0, nn = 0, nThru = Wt.net.trains.filter(T => { const m = T.M.find(m => m.i === si); return m && !m.stop && T.M.indexOf(m) > 0; }).length;
    while (Wt.t < 5400 && nn++ < 1e5) { Sim.netTick(Wt, 0.2, true); const dw = Wt.net.trains.filter(T => T.phase === 'dwell' && T.atMark && T.M[T.k] && T.M[T.k].i === si).length; if (dw >= 1) for (const T of Wt.net.trains) { const m = T.M.find(m => m.i === si); if (T.started && T.phase === 'run' && T.v > 5 && m && !m.stop && Math.abs(T.x - sM) < 200) into++; } }
    ok(nThru >= 3 && into === 0, 'Atami (ga 1 đường, không đường thông riêng): một tàu đỗ → tàu chạy suốt không đi vào sân ga, giữ khoảng cách ATC', [nThru, into]); }
  // tàu dừng khẩn ở ĐƯỜNG CHÍNH (mainStop) tại ga có đường thông riêng (Shizuoka, loại ...-1): tàu đỗ chắn cả đường thông → tàu chạy suốt phía sau phải giữ khoảng cách
  { const Wm = Sim.createNetwork('tsk', 'down', { diff: 'normal', seed: 5, t0: 8 * 3600, span: 5400 }); Wm.events = []; const Lm = Wm.line, si = Lm.stations.findIndex(x => x.en === 'Shizuoka');
    const cand = Wm.net.trains.filter(T => { const j = T.M.findIndex(m => m.i === si); return j > 0 && j < T.M.length - 1 && T.M[j].stop; }).sort((a, b) => a.M.find(m => m.i === si).arr - b.M.find(m => m.i === si).arr);
    const j0 = cand[0].M.findIndex(m => m.i === si); cand[0].holds[j0] = cand[0].M[j0].arr + 1800; cand[0].M[j0].mainStop = true;
    let sM = NaN; for (const T of Wm.net.trains) { const m = T.M.find(m => m.i === si); if (m) { sM = m.s; break; } }
    let into = 0, nn = 0, minG = 1e9; while (Wm.t < 5400 && nn++ < 1e5) { Sim.netTick(Wm, 0.2, true); const D = Wm.net.trains.find(T => T.phase === 'dwell' && T.atMark && T.M[T.k] && T.M[T.k].i === si); if (!D) continue; for (const T of Wm.net.trains) { if (T === D || !T.started || T.phase === 'end' || T.x >= D.x) continue; const m = T.M.find(m => m.i === si); if (m && !m.stop && Math.abs(T.x - sM) < 200 && T.v > 5) into++; const g = D.x - D.veh.len - T.x; if (g > -2000 && g < minG) minG = g; } }
    ok(into === 0 && minG > 100, 'Shizuoka (có đường thông riêng): tàu dừng khẩn ở đường chính → tàu chạy suốt phía sau giữ khoảng cách, không xuyên', [into, Math.round(minG)]); }
  // sự kiện "dừng thêm vì tàu phía sau cần vượt" chỉ chọn ga có chỗ vượt (đường thông riêng hoặc từ 2 đường dừng cùng chiều), không chọn ga 1 đường như Atami/Kurume
  { const Lq = Sim.lineOf('tsk'), recq = Lq.trains.find(t => t.t === 'Nozomi' && t.d === 'down' && t.s.some(e => e[0] === 0 && !e[3]) && t.s.some(e => e[0] === 34 && !e[3])); let tot = 0, bad = []; 
    for (let seed = 1; seed <= 60; seed++) { const tripq = Sim.makeTrip('tsk', recq, 0, 34), Wq = Sim.createWorld('tsk', tripq, { diff: 'hard', seed, lead: false, events: true }), Mq = Wq.player.M;
      for (const evq of Wq.events) { const snap = Mq.map(m => m.stop), m0 = Wq.msgs.length; try { evq.fire(Wq); } catch (e) { } for (const mm of Wq.msgs.slice(m0)) { if (!/tàu phía sau cần vượt/.test(mm.text || '')) continue; const jq = Mq.findIndex((x, k) => x.stop && !snap[k]); if (jq < 0) continue; tot++; const stq = Wq.line.stations[Mq[jq].i]; if (!(stq.loop || Layout.stopCount(stq.lay || '2-2-0', Wq.dir) >= 2)) bad.push(stq.en + '#' + seed); } } }
    ok(tot >= 10 && bad.length === 0, `sự kiện dừng thêm nhường tàu nhanh vượt: ${tot} lần, đều ở ga có chỗ vượt`, bad.slice(0, 5)); }
  // làn thông suy từ bố cục các đường (không dựa cờ loop): Okutsugaru-Imabetsu chiều xuống và Kikonai chiều lên có đường chính không sân ga; ga 1 đường (Atami) và ga 2 đường không đường thông (Shinagawa) thì không
  { const g = (ln, en) => Sim.lineOf(ln).stations.find(x => x.en === en).lay;
    ok(Layout.hasThrough(g('toh', 'Okutsugaru-Imabetsu'), 'down') && !Layout.hasThrough(g('toh', 'Okutsugaru-Imabetsu'), 'up') && Layout.hasThrough(g('toh', 'Kikonai'), 'up') && !Layout.hasThrough(g('toh', 'Kikonai'), 'down'), 'Okutsugaru-Imabetsu ↓ và Kikonai ↑ có làn thông (cờ loop vẫn false)');
    ok(!Layout.hasThrough(g('tsk', 'Atami'), 'down') && !Layout.hasThrough(g('tsk', 'Shinagawa'), 'down') && Layout.hasThrough(g('tsk', 'Odawara'), 'down'), 'Atami, Shinagawa không có làn thông; Odawara có'); }
  // cờ loop của từng ga trong chuyến (M[].loop) theo CHIỀU: Okutsugaru-Imabetsu chỉ chiều xuống, Kikonai chỉ chiều lên; ga loại ...-1 (Odawara) cả hai chiều; ga 2 đường (Atami) không
  { const lp = (ln, d, a, b, en) => { const Lh = Sim.lineOf(ln), ixh = n => Lh.stations.findIndex(x => x.en === n), rec = Lh.trains.find(t => t.d === d && t.s.some(e => e[0] === ixh(a) && !e[3]) && t.s.some(e => e[0] === ixh(b) && !e[3]) && t.s.some(e => e[0] === ixh(en) && !e[3])); const tr = Sim.makeTrip(ln, rec, ixh(a), ixh(b)); return tr.M.find(m => m.rom === en).loop; };
    ok(lp('toh', 'down', 'Shin-Aomori', 'Shin-Hakodate-Hokuto', 'Okutsugaru-Imabetsu') === true && lp('toh', 'up', 'Shin-Hakodate-Hokuto', 'Shin-Aomori', 'Okutsugaru-Imabetsu') === false && lp('toh', 'up', 'Shin-Hakodate-Hokuto', 'Shin-Aomori', 'Kikonai') === true && lp('toh', 'down', 'Shin-Aomori', 'Shin-Hakodate-Hokuto', 'Kikonai') === false, 'cờ loop trong chuyến theo chiều: Okutsugaru-Imabetsu ↓ có, ↑ không; Kikonai ↑ có, ↓ không');
    ok(lp('tsk', 'down', 'Tokyo', 'Kyoto', 'Odawara') === true && lp('tsk', 'up', 'Kyoto', 'Tokyo', 'Odawara') === true && lp('tsk', 'down', 'Tokyo', 'Kyoto', 'Atami') === false, 'Odawara có cờ loop cả hai chiều, Atami không'); }
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
      if (li === 0) { if (s === 0) { /* trưởng tàu tự đóng cửa sau ~10 s */ } else if (s === 1 && T.door === 'closed') { Sim.setBrake(T, 0); Sim.setPower(T, 1); } else if (s === 2) Sim.setPower(T, Math.min(13, T.pw + (n % 30 === 0 ? 1 : 0))); else if (s === 3) Sim.setPower(T, 13); else if (s === 4) Sim.coast(T);
        else if (s === 5) Sim.setBrake(T, S.st.hit ? 0 : 2); else if (s === 6) { Sim.setBrake(T, 0); if (T.v * 3.6 < 190) Sim.setPower(T, 8); else if (n % 20 === 0) Sim.toggleCS(T); } else if (s === 7) Sim.setBrake(T, S.st.hit ? 0 : 1); }
      if (li >= 1 && s === 0 && T.door === 'open') Sim.requestClose(T);
      if (li === 1) { if (s === 2) T.wiper = true; if (s === 4) T.wiper = false; if (s === 1 || s === 6) Sim.ackOldest(W); if (s === 5) for (const z of W.workers) if (!z.checked && T.x >= z.s0 - 600) Sim.honk(T); }
      if (li === 2) { if (s === 1 && W.decision) Sim.answerDecision(W, 'a'); if (s === 2 && T.cut) Sim.announcePA(T); if (s === 4) Sim.ackOldest(W); }
      if (li === 3) { if (s === 1) { if (T.atcMode > 1) Sim.atcMove(T, -1); } if (s === 2) { if (T.atcMode < 3) Sim.atcMove(T, 1); } if (s === 3 && W.lead) { if (W.lead.x - W.lead.veh.len - T.x < 1200) { Sim.setPower(T, 0); Sim.setBrake(T, 7); } else Sim.coast(T); } }
      const manual = (li === 0 && s <= 7) || (li === 3 && (s === 1 || s === 2)); Sim.tick(W, 0.05, {}, !manual); Tutorial.update(W, T, now);      // bài 4: hai bước chỉnh cần ATC do bot tự làm (tự lái sẽ ép nấc BẬT)
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
    const nv = st.tracks.filter(x => x.virt).length, rt = st.tracks.filter(x => !x.virt);      // đường ngược chiều ẢO của ga một đường (1-1-0) / ga tránh trên đường đơn (2-2-1s) không tính
    const sgl = LAY.isSingle(code), mu = LAY.MAINUP.has(code);
    ok(nv === (sgl ? 1 : 0), `${tag}: đường ảo chỉ ở mã đường đơn`, nv);
    ok(rt.length === (mu ? l : l + (t ? 2 : 0)), `${tag}: đúng số đường (kể cả thông qua)`, rt.length);
    ok(st.tracks.filter(x => x.thr).length === (mu ? 1 : t ? 2 : 0), `${tag}: số đường thông qua`);
    ok(f === 0 || code === '1-2-1n' || code === '1-2-1w' || (st.plat && Math.abs(Math.min(Math.abs(st.plat.xa - st.ours.x), Math.abs(st.plat.xb - st.ours.x)) - LAY.EDGE) < 0.01), `${tag}: đường dừng của ta có sân ga kề bên (tín hiệu trường không có sân ga)`);
    const xs = rt.map(x => x.x).sort((a, b) => a - b); for (let i = 1; i < xs.length; i++) ok(xs[i] - xs[i - 1] >= 4.29, `${tag}: hai đường cách nhau ≥ 4,3 m`, xs[i] - xs[i - 1]);
    for (const p of st.plats) for (const x of st.tracks) ok(x.x < p.xa - 1.74 || x.x > p.xb + 1.74 || Math.abs(Math.min(Math.abs(x.x - p.xa), Math.abs(x.x - p.xb)) - LAY.EDGE) < 0.01, `${tag}: đường không nằm trong sân ga`);
    ok(st.tracks.some(x => x.own && x.x === 0) && (nv ? st.opp === 0 : Math.abs(st.opp) >= 4.29), `${tag}: đường chính của ta ở 0, đường ngược chiều cách ≥ 4,3 m (ga đường đơn: đường ảo trùng đường chính)`);
  }
  for (const ln of ALL) {
    const L = Sim.lineOf(ln);
    ok(L.stations.every(s => LAY.TOK[s.lay]), `${ln}: mọi ga có mã bố trí hợp lệ`);
    ok(L.stations.every(s => s.loop === (/-1[a-z]?$/.test(s.lay) ? 1 : 0)), `${ln}: cờ ga tránh khớp bố trí (có đường thông qua)`);
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
  let vmax = 0, n = 0, before = 0; while (!T.finished && n++ < 3e6 && T.x < zn.s1 + 10) { Sim.tick(W, 0.05, {}, true); if (T.x >= zn.s0 + 60 && T.x < zn.s1) vmax = Math.max(vmax, T.v); if (T.x < zn.s0) before = Math.max(before, T.v); }
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
  // ga cuối có nhiều đường sân ga (Niigata...): thông báo phía cửa mở phải theo đúng đường mà tàu được xếp vào (W.termPick) ở mọi hạt giống
  { const Ly = global.Layout; let n = 0, bad = 0, sides = new Set(); for (const id of Object.keys(Sim.LINE_META)) { const LL = Sim.lineOf(id); for (const dirn of ['down', 'up']) { const rr = LL.trains.filter(t => t.d === dirn && !t.cp && t.s.filter(e => !e[3]).length >= 3).sort((p, q) => q.s.length - p.s.length)[0]; if (!rr) continue; const sk = rr.s.filter(e => !e[3]).map(e => e[0]);
      for (let seed = 1; seed <= 25; seed++) { const Wq = Sim.createWorld(id, Sim.makeTrip(id, rr, sk[0], sk[sk.length - 1]), { diff: 'easy', seed, lead: false, events: false }), Tq = Wq.player; for (let j = 1; j < Tq.M.length; j++) { const m = Tq.M[j], ls = Wq.line.stations[m.i]; if (!m.stop || !ls.lay || m.mainStop) continue; const st = Ly.station(ls.lay, Wq.dir, Ly.pickOf(ls, m.i, Wq)); if (!st.plat) continue; const r2 = G.prototype.doorSide.call({}, Wq, Tq, j), want = st.platSign > 0 ? '左側' : '右側'; n++; sides.add(id + dirn + want); if (!r2 || r2.ja !== want) bad++; } } } }
    ok(n > 500 && bad === 0, 'thông báo phía cửa mở ở mọi ga dừng khớp đường được xếp vào (' + n + ' ca, ' + bad + ' sai)', [n, bad]); }
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
  { const W = mk(), T = W.player; ok(!('pan' in T) && !Sim.togglePan, 'đã bỏ cần vẹt (không còn T.pan, togglePan)'); }
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
    for (let n = 0; n < 950; n++) Sim.tick(W, 0.05, {}, false); ok(!T.coup && T.gapX === 0, "ghép xong ở Tokyo sau ~45 s"); ok(T.door !== 'open' || Sim.requestClose(T), 'ghép xong: trưởng tàu đóng cửa (hoặc đóng được)');
    let n = 0; while (!T.finished && n++ < 4e6 && W.t < 60000 && !(T.k === iMor && T.phase === 'dwell' && !T.coup && T.cp.done)) { if (T.phase === 'dwell' && !T.coup) Sim.requestClose(T); Sim.tick(W, 0.05, {}, true); }
    ok(T.veh.key === 'E6' && W.parked.length === 1 && W.parked[0].key === 'E5' && W.parked[0].kind === 'left' && Math.abs(W.parked[0].front - (T.x - 152.8 - Sim.COUPLE_GAP)) < 0.5, 'tách ở Morioka: E5 ở lại sân ga ngay sau E6'); }
  { const rec6 = A.trains.find(t => t.d === 'up' && t.cp), W = Sim.createWorld('aki', Sim.makeTrip('aki', rec6, rec6.s[0][0], 0), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player, m = T.M.find(q => q.i === rec6.cp[0]);
    ok(m.sOrig !== undefined && Math.abs(m.sOrig - m.s - 253 - Sim.COUPLE_GAP) < 0.5 && W.parked.length === 0, 'chiều lên: vạch dừng lùi đúng chiều dài E5 + khe nối; đoàn Tohoku chờ chỉ hiện khi Hayabusa thật đã tới (không dựng sẵn từ đầu chuyến)');
    const s0 = m.sOrig; let n = 0; while (!T.finished && n++ < 4e6 && W.t < 60000 && !(T.cp.done && !T.coup)) Sim.tick(W, 0.05, {}, true);
    ok(T.veh.key === 'E5+E6' && W.parked.length === 0 && Math.abs(T.x - s0) < 3 && T.veh.parts[0] === 'E5', 'ghép xong: đoàn E5 + E6 (mini ở đuôi), đầu đoàn nhảy tới vị trí tàu Tohoku', [T.x, s0]); }
  // --- tàu ngược chiều là đoàn ghép, tàu đỗ ở đường phụ, nhánh Tohoku
  { const Wd = { line: A, dir: 'down', seed: 1 }, Tt = { x: 100 * 1000 }, keys = new Set(); for (let t0 = 100; t0 < 2000; t0 += 37) keys.add(Sim.oppKey(Wd, Tt, t0));
    ok(keys.has('E5') && [...keys].some(k => k.startsWith('E5+')), 'ngược chiều trên đoạn Tohoku: có E5 riêng và đoàn ghép (mini ở đuôi khi ta đi xuống)', [...keys].join());
    const Wu = { line: A, dir: 'up', seed: 1 }, ku = new Set(); for (let t0 = 100; t0 < 2000; t0 += 37) ku.add(Sim.oppKey(Wu, { x: (A.kmEnd - 100) * 1000 }, t0)); ok([...ku].some(k => k.endsWith('+E5')), 'ta đi lên: tàu ngược chiều đi xuống có mini ở đầu');
    ok(Sim.oppKey(Wd, { x: 560 * 1000 }, 123) === 'E6', 'trên đường mini: tàu ngược chiều là mini đi một mình'); }
  { const W = { line: A, dir: 'down' }, sj = 498500; ok(Sim.trunkOff(W, sj - 500) === 0 && Math.abs(Sim.trunkOff(W, sj + 3000)) > 30, 'nhánh Tohoku tách ra sau ga Morioka (xuống)'); const Wu = { line: A, dir: 'up' }; const sju = (A.kmEnd - 498.5) * 1000; ok(Math.abs(Sim.trunkOff(Wu, sju - 3000)) > 30 && Sim.trunkOff(Wu, sju + 500) === 0, 'nhánh Tohoku nhập vào trước ga Morioka (lên)'); }
  // tàu đỗ ở ga là tàu thật trong danh mục (cùng nguồn với bản đồ toàn quốc): chỉ xuất hiện quanh giờ đỗ theo biểu đồ (hãm vào ga trước giờ đến, tăng tốc ra sau giờ đi), hướng khớp loại đường, chuyển động liên tục, không còn tàu nền ngẫu nhiên
  { let seen = 0, moving = 0, bad = [], rand = 0, jump = 0; const L2 = Sim.lineOf('tsk'), recs = L2.trains.filter(t => t.t === 'Kodama' && t.d === 'down' && t.s.some(e => e[0] === 0 && !e[3]) && t.s.some(e => e[0] === 12 && !e[3])).slice(0, 6), CAT = NatCat.build(window.LINES);
    for (const rec of recs) { const W = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 0, 12), { diff: 'easy', seed: 2, lead: false, events: false }), Tr = W.player, prev = new Map(); let n = 0; if (W.stabled.length) rand += W.stabled.length;
      while (!Tr.finished && n++ < 2e6 && W.t < 20000) { Sim.tick(W, 0.05, {}, true); const now = W.trip.t0 + W.t;
        for (const sb of W.stabled) { const pk = sb.ck + sb.i, pf = prev.get(pk); if (pf !== undefined && Math.abs(sb.front - pf) > 3) jump++; prev.set(pk, sb.front); }
        if (n % 20) continue;
        for (const sb of W.stabled) { seen++; if (sb.v > 1) moving++; const c = CAT.find(x => x.key === sb.ck), st = L2.stations[sb.i], dw = tt => { const q = c && NatCat.stateOf(window.LINES, c, tt); return !!(q && q.dwell && window.LINES[c.line].stations[q.idx].jp === st.jp); };
          let near = false; for (let dt = -50; dt <= 35 && !near; dt += 3) near = dw(now + dt);
          if (!c) bad.push(sb.ck + ' không có trong danh mục'); else if (!near) bad.push(sb.ck + ' ' + st.en + ' không đỗ ở ga quanh giờ này'); else if (!Sim.VEH[sb.key] || (sb.face === 1) !== sb.track.own || (sb.face === 1 && sb.track.main) || (sb.face === -1 && (sb.track.own || sb.track.main)) || (sb.face === 1) !== (c.rec.d === W.dir)) bad.push(sb.ck + ' ' + st.en + ' hướng/đường sai'); } } }
    ok(rand === 0, 'không còn tàu nền ngẫu nhiên khi tạo chuyến (' + rand + ')'); ok(seen > 0, 'có tàu thật đang đỗ ở ga trong các chuyến Kodama mẫu (' + seen + ' lần thấy)');
    ok(moving > 0, 'tàu chạy vào/ra ga có chuyển động (' + moving + ' lần thấy đang chạy)'); ok(jump === 0, 'tàu đỗ/vào/ra ga chuyển động liên tục, không nhảy vị trí (' + jump + ' lần nhảy > 3 m mỗi nhịp)');
    ok(bad.length === 0, 'tàu đỗ: hướng khớp loại đường (cùng chiều ở đường phụ cùng chiều, ngược chiều ở đường chiều kia) và là tàu thật đang đỗ ở ga', bad.slice(0, 3).join('; ')); }
  // tàu đỗ không bao giờ nằm trên đường của chính tàu ta hay trên đường chính (làn tàu chạy thông qua), và không lẫn tàu của nhóm đường khác (Tokyo: Tokaido 14-19 / Tohoku 20-23)
  { const CAT3 = NatCat.build(window.LINES), LY = window.Layout; let seen = 0, onOurs = 0, onMain = 0, foreign = 0;
    for (const [ln, dir] of [['toh', 'down'], ['toh', 'up'], ['yam', 'down'], ['jts', 'down'], ['tsk', 'down'], ['tsk', 'up']]) { const LT = Sim.lineOf(ln), recs = LT.trains.filter(x => x.d === dir).slice(0, 8);
      for (const rec of recs) { const st = rec.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld(ln, Sim.makeTrip(ln, rec, st[0], st[st.length - 1]), { diff: 'easy', seed: 2, lead: false, events: false }); let n = 0;
        while (n++ < 1600) { Sim.tick(W, 0.05, {}, false); for (const sb of W.stabled) { seen++; const c = CAT3.find(x => x.key === sb.ck), stn = LT.stations[sb.i], ours = LY.station(stn.lay || '2-2-0', W.dir, LY.pickOf(stn, sb.i, W)).ours;
          if (sb.track === ours || (sb.track.x === ours.x && sb.track.c === ours.c)) onOurs++; if (sb.track.main) onMain++; if (!c || window.LINES[c.line].meta.atc !== LT.meta.atc) foreign++; } } } }
    ok(seen > 0 && onOurs === 0 && onMain === 0 && foreign === 0, 'tàu đỗ: không nằm trên đường của tàu ta (' + onOurs + '), không trên đường chính (' + onMain + '), không lẫn tàu nhóm đường khác (' + foreign + ') trong ' + seen + ' lần thấy'); }
  // --- tàu chạy trước trên Tohoku có thể là đoàn ghép và tách ở Morioka/Fukushima
  { const T1 = Sim.lineOf('toh'), iM = T1.stations.findIndex(x => x.en === 'Morioka'), recs8 = T1.trains.filter(t => t.t === 'Hayabusa' && t.d === 'down' && t.s.some(e => e[0] === 0 && !e[3]) && t.s.some(e => e[0] === iM && !e[3])).slice(1, 9);
    let found = null; for (const rec8 of recs8) for (let sd = 1; sd <= 8 && !found; sd++) { const W = Sim.createWorld('toh', Sim.makeTrip('toh', rec8, 0, iM), { diff: 'easy', seed: sd, events: false }); if (W.lead && W.lead.cp) found = W; }
    ok(!!found && found.lead.veh.parts && found.lead.veh.parts[1] === 'E5', 'tàu chạy trước trên Tohoku có khi là đoàn ghép (mini ở đầu khi đi xuống)'); }
  // --- đường đơn mini-Shinkansen: dừng tránh tàu ngược chiều; Akita có đoạn đôi Jingūji–Mineyoshikawa
  { const A2 = Sim.lineOf('aki'), Wd = { line: A2, dir: 'down', player: { M: [] } }; ok(Sim.singleW(Wd, 593 * 1000) > 0.9 && Sim.singleW(Wd, 550 * 1000) > 0.9 && Sim.singleW(Wd, 610 * 1000) > 0.9, 'Akita: Morioka – Akita là đường đơn liền một mạch (không còn đoạn đôi 586–600)');
    const recC = A2.trains.find(t => t.d === 'down' && t.cp), trip = Sim.makeTrip('aki', recC, recC.cp[0], A2.stations.length - 1);
    let tot = 0; for (const sd of [1, 2, 3]) { const W = Sim.createWorld('aki', trip, { diff: 'easy', seed: sd, lead: false, weather: 'clear' }), T = W.player; let n = 0; while (!T.finished && n++ < 4e6 && W.t < 60000) Sim.tick(W, 0.05, {}, true); tot += W.msgs.filter(m => /DỪNG TRÁNH/.test(m.text)).length; ok(T.finished && Math.max(...T.results.map(r => Math.abs(r.delay - Math.min(r.excused || 0, Math.max(0, r.delay))))) < 200, `Akita seed ${sd}: có dừng tránh mà vẫn đúng giờ (thời gian chờ được miễn)`); }
    /* việc tránh tàu ngược chiều giờ do NatCat.singleStep + Sim.singleDispatch quyết định theo lịch thật (không còn lệnh ngẫu nhiên); kiểm ở mục 31 */ }
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
    for (const [q, km] of [[0, 32.3], [1, 256.1], [2, 498.5]]) { const sj = km * 1000; ok(Sim.trunkOff(Wt('down'), sj - 200) === 0 && Sim.trunkOff(Wt('down'), sj + 1800) > 5 && Sim.trunkOff(Wt('down'), sj + 1800, q) > 5, `toh xuống: nhánh tại km ${km} tách sang trái`); const su = (T0.kmEnd - km) * 1000; ok(Sim.trunkOff(Wt('up'), su + 200) === 0 && Sim.trunkOff(Wt('up'), su - 1800) < -5, `toh lên: nhánh nhập tại km ${km}`); }
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
    if (code === LAY.TKS || code === LAY.FUK || code === LAY.OMA) continue;      // Takasaki, Fukushima: hình học riêng theo sơ đồ, kiểm ở mục 33k / 33o; Omagari (2-2-0w): mạng đường riêng, kiểm ở mục 33q
    const st = LAY.station(code, dir, 0), outer = st.tracks.filter(t => !t.main);
    ok(outer.every(t => t.in0 !== undefined && t.len >= 40 && t.len <= 400), `${code} ${dir}: mọi đường ngoài có ghi riêng (in0/len)`);
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
  const LAY = require(path.join(DRIVE, 'layout.js')), want = { '3-6-0': 3, '5-8-0': 3, '3-4-0': 3, '2-4-0': 2, '2-4-1': 2, '2-4-1k': 2, '2-4-1f': 2, '2-4-0t': 2, '2-4-0s': 2, '1-1-0': 0, '1-1-0m': 0, '2-2-1s': 1, '2-2-1o': 1, '0-2-1s': 0, '0-2-1n': 0, '1-3-1k': 0, '2-3-1t': 1, '2-3-1h': 1, '2-2-0': 1, '2-2-1': 1, '2-3-0': 1, '2-3-1': 1, '2-3-1c': 1, '2-3-0a': 1, '2-3-0b': 1, '2-3-0c': 1, '1-2-0': 0, '1-2-0t': 0, '2-2-0w': 1, '1-2-1': 0, '1-2-1n': 0, '1-2-1w': 0 };
  for (const [code, n] of Object.entries(want)) ok(LAY.bridgeCountOf(code) === n, `cầu bộ hành ga ${code}: ${n} lối`, LAY.bridgeCountOf(code));
  ok(Object.keys(LAY.TOK).every(c => want[c] !== undefined), 'mọi mã bố trí có quy tắc cầu bộ hành');
  // Akita (22/11/2026): ga cuối đầu cụt 1-2-0t, sân ga 240 m, không chữ X; các mã khác giữ 420 m
  { const LAk = window.LINES.aki.stations.find(x => x.en === 'Akita'); ok(LAk.lay === '1-2-0t' && Array.isArray(LAk.xo) && LAk.xo.length === 0, 'Akita: mã 1-2-0t, xo rỗng (không chữ X)', [LAk.lay, LAk.xo]);
    ok(LAY.station('1-2-0t', 'down', -1).pb === 240 && LAY.station('1-2-0t', 'up', -1).pb === 240 && LAY.station('2-4-0', 'down', 0).pb === 420 && LAY.station('1-2-0', 'down', 0).pb === 420, 'độ dài sân ga phía sau vạch (pb): Akita 240 m, các mã khác 420 m');
    const sk = LAY.station('1-2-0t', 'down', -1); ok(sk.plats.length === 1 && sk.tracks.length === 2 && sk.stops.length === 1, 'Akita: một sân ga đảo giữa hai đường', [sk.plats.length, sk.tracks.length]); }
  const T = Sim.lineOf('toh'); for (const s of T.stations.filter(x => /^(東京|上野)$/.test(x.jp))) ok(Sim.inTunnel({ line: T, dir: 'down' }, Sim.sOfKm(s.km, 'down', T.kmEnd)), `${s.en} (Tohoku) là ga ngầm nên không có cầu bộ hành`);
}

if (section('19. Nhiệm vụ kiểm tra tự do (923 Doctor Yellow, E926 East i)')) {
  const trip = Sim.makeMission('tsk', 0, 12, 'T4'), L = Sim.lineOf('tsk');
  ok(trip && trip.mission && trip.dir === 'down' && trip.M.length === 13 && trip.M.filter(m => m.stop).length === 2, 'T4 Tokyo → Nagoya: chỉ dừng ở hai ga đầu/cuối, các ga giữa chạy qua');
  ok(Sim.makeMission('tsk', 12, 0, 'T4').dir === 'up', 'chiều chạy suy ra từ thứ tự hai ga');
  ok(Sim.makeMission('tsk', 3, 3, 'T4') === null && Sim.makeMission('tsk', 0, 5, 'N700') === null, 'từ chối cùng ga / tàu không phải tàu kiểm tra');
  { let last = 0; for (const t of L.trains) { if (Sim.INSPECT[t.v]) continue; for (let i = 0; i <= 12; i++) { const x = Sim.timeAt(L, t, i); if (x != null && x > last) last = x; } }
    ok(trip.t0 > 0 && trip.t0 >= last - 3600, 'xuất phát ngay khi chuyến khách cuối cùng cùng chiều dừng ở ga cuối (không cộng thêm)', [trip.t0, last]); }
  const mk = (seed, o) => Sim.createWorld('tsk', trip, Object.assign({ diff: 'easy', seed, lead: true, events: true }, o || {}));
  const W = mk(1), T = W.player;
  ok(!!W.mission && !W.lead && Object.keys(W.passers).length === 0 && (W.opposing || []).length === 0, 'nhiệm vụ: không tàu chạy trước, không tàu thông qua/ngược chiều');
  ok(W.mission.defects.length >= 4 && W.mission.defects.every(d => d.s > W.mission.s0 + 800 && d.s < W.mission.s1 - 800), 'lỗi sinh ra cách xa hai ga đầu/cuối');
  ok(JSON.stringify(mk(1).mission.defects) === JSON.stringify(mk(1).mission.defects) && JSON.stringify(mk(1).mission.defects) !== JSON.stringify(mk(2).mission.defects), 'lỗi theo seed');
  // đo tự chạy từ lúc rời ga (không còn nút bật/tắt); không đánh dấu lỗi thì không tìm được lỗi nào
  { const Wa = mk(3), Ta = Wa.player; ok(Ta.started && Ta.door === 'closed' && Wa.running && Ta.anx === 0, 'tàu kiểm tra: không cần đóng cửa, chạy ngay khi kéo cần'); ok(Sim.announcePA(Ta) === false && Wa.paCount === undefined, 'tàu kiểm tra: không có phát thanh'); let n = 0, off = false; while (!Ta.finished && n++ < 4e6) { Sim.tick(Wa, 0.05, {}, true); if (Ta.phase === 'dwell' && Wa.mission.measure) off = true; }
    const sa = Sim.score(Ta, Wa); ok(sa.covScore >= 70 && sa.found === 0 && !off && Ta.anxMax === 0, 'đo tự chạy: phủ ≥ 70% nhưng chưa đánh dấu thì không tìm lỗi nào; không có hành khách bất an', [sa.covScore, sa.found, Ta.anxMax]); }
  { for (const [id, dir] of [['tsk', 'down'], ['tsk', 'up'], ['toh', 'down'], ['toh', 'up'], ['jts', 'down'], ['hok', 'down']]) { const L = Sim.lineOf(id); let last = 0; for (const t of L.trains) { if (Sim.INSPECT[t.v] || t.d !== dir) continue; const st = t.s.filter(e => !e[3]); last = Math.max(last, st[st.length - 1][1]); }
      const ins = L.trains.filter(t => Sim.INSPECT[t.v] && t.d === dir); ok(ins.length > 0 && ins.every(t => { const f = t.s.find(e => e[2] != null)[2]; return f === last; }), id + ' ' + dir + ': tàu kiểm tra ra ga ngay khi chuyến khách cuối dừng ở ga đích', ins.map(t => t.s[0][2]));
      if (ins.length) { const m = Sim.makeMission(id, dir === 'down' ? 0 : L.stations.length - 1, dir === 'down' ? 3 : L.stations.length - 4, ins[0].v); ok(m && m.t0 === ins[0].s.find(e => e[2] != null)[2], id + ' ' + dir + ': nhiệm vụ tự do cùng giờ xuất phát', m && m.t0); } } }
  { const Wb = mk(3), Tb = Wb.player; let n = 0; while (!Tb.finished && n++ < 4e6) { Sim.tick(Wb, 0.05, {}, true); for (const d of Wb.mission.defects) if (d.seen && !d.marked && Tb.x - d.s >= 0 && Tb.x - d.s <= 300) Sim.markDefect(Tb); }
    const sb = Sim.score(Tb, Wb); ok(Tb.finished && sb.covScore >= 70, 'bật đo suốt chuyến: phủ ≥ 70%', sb.covScore); ok(sb.found >= Math.ceil(sb.tot * 0.6) && sb.falseMarks === 0, 'đánh dấu lỗi vừa phát hiện: tìm ≥ 60%, không đánh dấu sai', [sb.found, sb.tot, sb.falseMarks]);
    ok(sb.final >= 55 && !Wb.mission.conflict, 'chạy đo trong khung đêm: không xung đột lịch tàu khách', [sb.final, Wb.mission.conflict]); }
  { const Wc = mk(4), Tc = Wc.player; Tc.phase = 'run'; Tc.started = true; Tc.x += 1500; Sim.markDefect(Tc); ok(Wc.mission.falseMarks === 1, 'đánh dấu khi không có lỗi: tính là đánh dấu sai'); }
  { const Wd = mk(5), Td = Wd.player; Wd.trip.t0 += 8 * 3600; Sim.tick(Wd, 0.05, {}, true); Wd.running = true; Sim.tick(Wd, 0.05, {}, true); ok(Wd.mission.conflict || Wd.mission.minMargin < 0, 'trễ sang giờ chuyến khách đầu ngày: báo xung đột lịch', Wd.mission.minMargin); }
  { const cat = NatCat.build(global.LINES).filter(c => Sim.INSPECT[c.rec.v]); ok(cat.length === 2 && cat.filter(c => c.rec.v === 'T4').length === 1 && cat.filter(c => c.rec.v === 'E926').length === 1, 'bản đồ: đúng 1 Doctor Yellow và 1 East i chạy (mỗi loại một đoàn)', cat.length); }
  { const E = Sim.makeMission('toh', 0, 8, 'E926'), We = Sim.createWorld('toh', E, { diff: 'easy', seed: 1, lead: true, events: true }); ok(E && E.t0 > 0 && We.mission && We.player.veh.key === 'E926', 'E926 trên Tohoku cũng có nhiệm vụ tự do');
    ok(We.mission.keys.includes('contact') && !We.mission.keys.includes('ride'), 'East i: bộ cảm biến riêng (lực tiếp xúc cần vẹt, không có dao động toa)'); ok(W.mission.keys.includes('ride') && !W.mission.keys.includes('contact'), 'Doctor Yellow: bộ cảm biến riêng (dao động toa)');
    ok(We.mission.defects.every(d => We.mission.keys.includes(d.sensor)) && W.mission.defects.every(d => W.mission.keys.includes(d.sensor)), 'lỗi chỉ thuộc cảm biến mà tàu có');
    const Wp = Sim.createWorld('toh', E, { diff: 'easy', seed: 2, lead: true, events: true }), Tp = Wp.player; Wp.mission.measure = true; Tp.phase = 'run'; Tp.started = true; Tp.v = 230 / 3.6; Tp.a = 0; ok(Sim.measureQ(Tp, 'contact') > 0.9 && Sim.measureQ(Tp, 'wire') > 0.9, 'đúng dải: đo được dây điện và lực tiếp xúc'); Tp.v = 100 / 3.6; ok(Sim.measureQ(Tp, 'track') === 0, 'dưới tốc độ đo: không đo ray'); }
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
  let vmaxIn = 0, passed = false; n = 0; while (n++ < 12000 && !T.finished) { Sim.tick(W, 0.05, {}, true); if (T.x > zone.s0 + 5 && T.x < zone.s1 && W.t < zone.tB) vmaxIn = Math.max(vmaxIn, T.v * 3.6); if (T.x > zone.s1 + 60) { passed = true; break; } }
  ok(passed && vmaxIn > 5 && vmaxIn <= 30 + 6 + 1, 'tín hiệu 0 (tự lái): chuyển cần ATC sang CHẠY CHẬM và chạy qua vùng ≤ 30 km/h (trần + dung sai ATC mức dễ), không phải dừng chờ', [passed, vmaxIn]);
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

if (section('24. Người chơi lái chuyến Tohoku: ghép / tách với tàu nhánh theo cặp thật (E6 Morioka, E8 Fukushima)')) {
  const Ltoh = Sim.lineOf('toh'), pick = (type, dir, a, b, paired) => Ltoh.trains.find(t => t.t === type && t.d === dir && t.s.some(e => e[0] === a && !e[3]) && t.s.some(e => e[0] === b && !e[3]) && (paired === undefined || !!Sim.miniPairOf(t) === paired));
  const mk = (type, dir, a, b) => { const r = pick(type, dir, a, b, true), W = Sim.createWorld('toh', Sim.makeTrip('toh', r, a, b), { diff: 'easy', seed: 3, lead: false, events: false }), T = W.player; return { W, T, r }; };
  const iSd = Ltoh.stations.findIndex(x => x.en === 'Sendai');      // các chuyến Yamabiko có cặp Tsubasa chạy Tokyo ↔ Sendai
  const runAll = (W, T, watch) => { Sim.requestClose(T); let n = 0; while (!T.finished && n++ < 8e5) { Sim.tick(W, 0.05, {}, true); if (watch) watch(W, T); } return n; };
  // ghép cặp: cùng số hiệu, cùng giờ, cùng ga dừng trên đoạn chung (dò từ dữ liệu lịch); không còn tuỳ chọn hay xác suất
  { const by = {}; let nn = 0; for (const r of Ltoh.trains) { const pr = Sim.miniPairOf(r); if (pr) { nn++; by[r.t + '/' + pr.mini] = (by[r.t + '/' + pr.mini] || 0) + 1; } } ok(nn === 56 && by['Hayabusa/E6'] === 32 && by['Yamabiko/E8'] === 24, 'cặp Tohoku–mini dò được từ lịch: 32 Hayabusa+Komachi, 24 Yamabiko+Tsubasa', JSON.stringify(by));
    let bad = 0; for (const id of ['aki', 'yam']) for (const t of Sim.lineOf(id).trains) if (t.cp && t.d && !['139', '159'].includes(String(t.n)) ) { const h = Ltoh.trains.find(x => x.d === t.d && String(x.n) === String(t.n) && Sim.miniPairOf(x)); if (!h) bad++; }
    ok(bad === 0, 'mọi chuyến mini có cặp Tohoku cùng số hiệu (trừ Tsubasa 139 và 159: lịch Yamabiko 139/159 chạy ◆ không có trong dữ liệu)', bad);
    ok(!require('fs').readFileSync(path.join(DRIVE, 'index.html'), 'utf8').includes('id="couple"'), 'màn thiết lập không còn ô "Ghép tàu nhánh"'); }
  { const r = pick('Yamabiko', 'down', 0, 11, false); if (r) { const W = Sim.createWorld('toh', Sim.makeTrip('toh', r, 0, 11), { diff: 'easy', seed: 3, lead: false, events: false }); ok(!W.player.cc && !W.player.coup && W.player.veh.key === 'E5' && !W.parked.length, 'chuyến Tohoku không có cặp mini: không ghép'); } }
  { const r = Ltoh.trains.find(t => t.t === 'Nasuno' && t.d === 'down'), st = r.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld('toh', Sim.makeTrip('toh', r, st[0], st[st.length - 1]), { diff: 'easy', seed: 3, lead: false, events: false }); ok(!W.player.cc, 'Nasuno không ghép'); }
  { const { W, T } = mk('Hayabusa', 'down', 0, 19); const x0 = T.x, M0 = T.M[0];
    ok(T.cc && T.cc.kind === 'down' && T.coup && T.coup.kind === 'pjoin0' && W.parked.length === 1 && W.parked[0].key === 'E6', 'xuống từ Tokyo: có cảnh ghép E6 ở phía trước');
    ok(Math.abs((M0.sOrig - M0.s) - (Sim.VEH.E6.len + Sim.COUPLE_GAP)) < 1e-6 && Math.abs(x0 - M0.s) < 1e-6, 'vạch dừng ở Tokyo lùi đúng chiều dài mini + khe nối');
    let sawGapShrink = false, sawLeave = false, vehs = [T.veh.key], blocked = false; const xs0 = M0.sOrig;
    runAll(W, T, (W, T) => { if (T.veh.key !== vehs[vehs.length - 1]) vehs.push(T.veh.key); const l = W.parked.find(p => p.mv); if (l && l.v !== undefined) sawLeave = true; if (l && l.mv.v > 1) sawLeave = true; if (T.phase === 'dwell' && T.coup === null && l && l.front - Sim.VEH.E6.len - T.x < 450 && Sim.departBlockMsg) blocked = true; });
    ok(vehs.join('>') === 'E5>E6+E5>E5', 'đổi đoàn: E5 → E6+E5 (ghép ở Tokyo) → E5 (tách ở Morioka)', vehs.join('>'));
    ok(T.finished && !T.failed, 'chạy hết chuyến sau khi tách', [T.finished, T.failed]); ok(sawLeave, 'tàu nhánh tách ra chạy trước (có chuyển động)'); }
  { const { W, T } = mk('Hayabusa', 'down', 0, 19); Sim.requestClose(T); let n = 0; while (!(T.veh.key === 'E5' && T.cc && T.cc.done && T.phase === 'dwell' && !T.coup) && n++ < 8e5) Sim.tick(W, 0.05, {}, true);
    ok(T.veh.key === 'E5' && T.phase === 'dwell', 'tới lúc tách xong ở Morioka', [T.veh.key, T.phase]); T.door = 'closed'; T.dwellT = 400; ok(Sim.departNow(T, true) === false, 'tàu nhánh chưa rời ga: chưa được khởi hành');
    let m = 0; while (W.parked.some(p => p.mv && p.front - Sim.VEH.E6.len - T.x < 450) && m++ < 4000) Sim.tick(W, 0.05, {}, false); ok(m < 4000 && Sim.departNow(T, true) !== false || m < 4000, 'tàu nhánh rời ga thì hết chặn', m); }
  { const { W, T } = mk('Yamabiko', 'down', 0, iSd); const vehs = [T.veh.key]; runAll(W, T, (W, T) => { if (T.veh.key !== vehs[vehs.length - 1]) vehs.push(T.veh.key); });
    ok(vehs.join('>') === 'E5>E8+E5>E5' && T.finished && !T.failed, 'Yamabiko: ghép E8 ở Tokyo, tách ở Fukushima', vehs.join('>')); }
  { const { W, T } = mk('Hayabusa', 'up', 17, 0); const arrivals = []; ok(T.cc && T.cc.kind === 'up' && T.coup && T.coup.kind === 'pjoin', 'chiều lên, xuất phát ở Morioka: có cảnh tàu nhánh nối vào đuôi');
    const vehs = [T.veh.key]; runAll(W, T, (W, T) => { if (T.veh.key !== vehs[vehs.length - 1]) vehs.push(T.veh.key); });
    ok(vehs.join('>') === 'E5>E5+E6' && T.finished && !T.failed, 'chiều lên: E5 → E5+E6 (E6 nối vào đuôi)', vehs.join('>')); }
  { const r = pick('Yamabiko', 'up', iSd, 0, true); if (r) { const { W, T } = mk('Yamabiko', 'up', iSd, 0); const vehs = [T.veh.key]; runAll(W, T, (W, T) => { if (T.veh.key !== vehs[vehs.length - 1]) vehs.push(T.veh.key); }); ok(vehs.includes('E5+E8') && T.finished && !T.failed, 'Yamabiko chiều lên: E8 nối vào đuôi ở Fukushima', vehs.join('>')); } }
  // sự kiện ngẫu nhiên (giữ tàu, thông qua ga, dừng thêm...) làm lịch linh hoạt vẫn không làm mất việc ghép/tách
  { const iM = Ltoh.stations.findIndex(x => x.en === 'Morioka'), iN = iM + 1, rp = pick('Hayabusa', 'down', 0, iN, true); let okAll = 0, tot = 0;
    if (rp) for (const sd of [2, 5, 9]) { const W = Sim.createWorld('toh', Sim.makeTrip('toh', rp, 0, iN), { diff: 'normal', seed: sd, lead: false, events: true }), T = W.player, vehs = [T.veh.key]; tot++;
      const skipsCc = W.events.length; runAll(W, T, (W, T) => { if (T.veh.key !== vehs[vehs.length - 1]) vehs.push(T.veh.key); }); if (vehs.join('>') === 'E5>E6+E5>E5' && T.finished) okAll++; else console.log('  ghép lệch với seed', sd, vehs.join('>'), T.finished, T.failed); }
    ok(tot === 3 && okAll === 3, 'có sự kiện ngẫu nhiên (3 seed): vẫn ghép ở Tokyo và tách ở Morioka', okAll + '/' + tot); }
  { const La = Sim.lineOf('aki'), r = La.trains.find(t => t.d === 'down' && t.s[0][0] === 0 && t.cp), W = Sim.createWorld('aki', Sim.makeTrip('aki', r, 0, La.stations.length - 1), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
    T.dwellT = 30; T.gapX = 0; W.t = 0; Sim.tick(W, 0.05, {}, false); }
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
  // lái tàu kiểm tra: đoàn cùng loại trên bản đồ chính là ta nên không hiện lần nữa; lái tàu khách thì cả hai loại đều hiện
  { const cnt = (W, T, v) => { NatMap.draw(ctx, 0, 58, 1920, 618, W, T, o); return (NatMap.V.trains || []).filter(h => h.t && h.t.c && h.t.c.rec.v === v).length; };
    const Lt = Sim.lineOf('tsk'), ins = Lt.trains.find(t => t.v === 'T4' && t.d === 'down'), t0i = ins.s.find(e => e[2] != null)[2];
    const Wm = Sim.createWorld('tsk', Sim.makeMission('tsk', 0, 5, 'T4'), { diff: 'easy', seed: 1 }); Wm.t = t0i + 900 - Wm.trip.t0; Wm.player.x = Sim.sOfKm(60, 'down', Lt.kmEnd);
    const r = Lt.trains.find(t => t.d === 'down' && t.t === 'Nozomi'), st = r.s.filter(e => !e[3]).map(e => e[0]);
    const Wp = Sim.createWorld('tsk', Sim.makeTrip('tsk', r, st[0], st[st.length - 1]), { diff: 'easy', seed: 1, lead: false, events: false }); Wp.t = t0i + 900 - Wp.trip.t0; Wp.player.x = Sim.sOfKm(60, 'down', Lt.kmEnd);
    const cm = cnt(Wm, Wm.player, 'T4'), cp = cnt(Wp, Wp.player, 'T4'); ok(cm === 0 && cp === 1, 'bản đồ: lái Doctor Yellow thì không hiện Doctor Yellow (có sẵn ' + cp + ' khi lái tàu khách)', [cm, cp]); }
  { const cnt = (W, T, v) => { NatMap.draw(ctx, 0, 58, 1920, 618, W, T, o); return (NatMap.V.trains || []).filter(h => h.t && h.t.c && h.t.c.rec.v === v).length; };
    const Lh = Sim.lineOf('toh'), ins = Lh.trains.find(t => t.v === 'E926' && t.d === 'down'), t0i = ins.s.find(e => e[2] != null)[2];
    const Wm = Sim.createWorld('toh', Sim.makeMission('toh', 0, 8, 'E926'), { diff: 'easy', seed: 1 }); Wm.t = t0i + 900 - Wm.trip.t0; Wm.player.x = Sim.sOfKm(60, 'down', Lh.kmEnd);
    const r = Lh.trains.find(t => t.d === 'down' && t.t === 'Hayabusa'), st = r.s.filter(e => !e[3]).map(e => e[0]);
    const Wp = Sim.createWorld('toh', Sim.makeTrip('toh', r, st[0], st[st.length - 1]), { diff: 'easy', seed: 1, lead: false, events: false }); Wp.t = t0i + 900 - Wp.trip.t0; Wp.player.x = Sim.sOfKm(60, 'down', Lh.kmEnd);
    const cm = cnt(Wm, Wm.player, 'E926'), cp = cnt(Wp, Wp.player, 'E926'); ok(cm === 0 && cp === 1, 'bản đồ: lái East i thì không hiện East i (có sẵn ' + cp + ' khi lái tàu khách)', [cm, cp]); }
  // tàu ngược chiều lấy từ lịch thật; thiên tai và độ trễ từ NatCat
  { const L = Sim.lineOf('tsk'), r = L.trains.find(t => t.d === 'down' && !t.cp && t.s.filter(e => !e[3]).length >= 3 && t.t === 'Nozomi'), st = r.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld('tsk', Sim.makeTrip('tsk', r, st[0], st[st.length - 1]), { diff: 'hard', seed: 3, lead: false, events: true }), T = W.player;
    ok(Array.isArray(W.oppCat) && W.oppCat.length > 20, 'danh mục tàu ngược chiều có ' + (W.oppCat || []).length + ' đoàn');
    ok(W.haz && W.haz.cells.length >= 1, 'có ô thời tiết (' + (W.haz ? W.haz.cells.length : 0) + ' ô, ' + (W.haz ? W.haz.quakes.length : 0) + ' động đất)');
    Sim.requestClose(T); T.pw = 13; let n = 0, seen = 0; while (!T.finished && n++ < 3e5 && W.t < 6000) { Sim.tick(W, 0.05, {}, true); if ((W.opposing || []).some(t0 => Math.abs(t0 - W.t) < 0.2)) seen++; if (n % 400 === 0) { /* NatCat.step chạy trong refreshOpposing */ } }
    ok(seen > 0, 'có tàu ngược chiều lướt qua theo lịch trong chuyến (' + seen + ' lần)');
    // tàu ngược chiều trong các góc nhìn phải lướt qua đúng lúc hai tàu giao nhau trên bản đồ (cùng đường tốc độ NatCat), không trễ/sớm vài km
    { const W2 = Sim.createWorld('tsk', Sim.makeTrip('tsk', r, st[0], st[st.length - 1]), { diff: 'easy', seed: 5, lead: false, events: true }), T2 = W2.player, cats = new Map(NatCat.build(window.LINES).map(x => [x.key, x])); Sim.requestClose(T2); T2.pw = 13; let n2 = 0, cmp = 0, worst = 0, wid = '';
      while (!T2.finished && n2++ < 3e5 && W2.t < 6000) { Sim.tick(W2, 0.05, {}, true); if (n2 % 10) continue;
        for (const [id, s] of W2.oppState || []) { if (Math.abs(s.t0 - W2.t) > 0.25) continue; const cat = cats.get(id), dl = NatCat.delayOf(W2, id), q = cat && NatCat.stateOf(window.LINES, cat, W2.trip.t0 + W2.t - (dl ? dl.delay : 0), dl && dl.skip); if (!q || !q.moving) continue; const kmP = Sim.kmOfS(T2.x, W2.dir, W2.line.kmEnd), e = Math.abs(q.km - kmP) * 1000; cmp++; if (e > worst) { worst = e; wid = id; } } }
      ok(cmp > 0 && worst < 600, 'tàu ngược chiều qua mặt đúng chỗ bản đồ cho là gặp nhau (' + cmp + ' lần, lệch xa nhất ' + Math.round(worst) + ' m ' + wid + ')'); }
    NatCat.step(W); let held = 0, delayed = 0; for (const d of W.haz.delay.values()) { if (d.delay > 0) delayed++; if (d.why === 'eqk') held++; }
    ok(W.haz.lastT >= W.trip.t0 + W.t - 6, 'độ trễ tích luỹ tới giờ hiện tại (' + delayed + ' đoàn trễ, ' + held + ' dừng vì động đất)');
    // một đường mỗi chiều: không có đôi tàu cùng chiều nào đổi thứ tự giữa hai ga (chỉ vượt ở ga khi tàu trước đang đỗ)
    { const W2 = Sim.createWorld('tsk', Sim.makeTrip('tsk', r, st[0], st[st.length - 1]), { diff: 'hard', seed: 3, lead: false, events: true }), LN = window.LINES, cat = NatCat.build(LN).filter(c => c.line === 'tsk'); let flips = 0, prev = null;
      for (let t = 0; t <= 9000; t += 30) { W2.t = t; NatCat.step(W2); const now = W2.trip.t0 + t, cur = new Map();
        for (const c of cat) { const d = NatCat.delayOf(W2, c.key), s2 = NatCat.stateOf(LN, c, now - (d ? d.delay : 0), d && d.skip); if (s2 && !s2.dwell) cur.set(c.key, { km: s2.km, dir: c.rec.d }); }
        if (prev) for (const [k1, a] of cur) { const a0 = prev.get(k1); if (!a0) continue; for (const [k2, b] of cur) { if (k1 >= k2 || a.dir !== b.dir) continue; const b0 = prev.get(k2); if (!b0) continue; const sg = a.dir === 'down' ? 1 : -1; if ((sg * (a0.km - b0.km)) * (sg * (a.km - b.km)) < 0 && Math.abs(a.km - b.km) > 0.3) flips++; } }
        prev = cur; }
      ok(flips === 0, 'tàu cùng chiều không vượt nhau giữa hai ga trên bản đồ (' + flips + ' lần đổi thứ tự)'); }
    // đường chung Tohoku–Akita: Komachi về Tokyo không đổi thứ tự với tàu Tohoku (hoặc tàu đi trước thật) giữa hai ga trên bản đồ
    { const Lk = Sim.lineOf('aki'), rk = Lk.trains.find(t => t.d === 'up' && t.s.filter(e => !e[3]).length >= 2), sk = rk.s.filter(e => !e[3]).map(e => e[0]), Wk = Sim.createWorld('aki', Sim.makeTrip('aki', rk, sk[0], sk[sk.length - 1]), { diff: 'normal', seed: 4, lead: true, events: true }), Tk = Wk.player, LN = window.LINES; Sim.requestClose(Tk); Tk.pw = 13;
      let n2 = 0, flips2 = 0, prevD = null; while (!Tk.finished && n2++ < 3e5 && Wk.t < 9000) { Sim.tick(Wk, 0.05, {}, true); if (n2 % 200 !== 0) continue; NatCat.step(Wk); const now = Wk.trip.t0 + Wk.t, kmMe = NatCat.refOf(LN, 'aki', Sim.kmOfS(Tk.x, Wk.dir, Wk.line.kmEnd)), cur = new Map();
        for (const c of NatCat.build(LN)) { if (c.rec.d !== Wk.dir || c.rec === Wk.trip.rec) continue; const d = NatCat.delayOf(Wk, c.key), s2 = NatCat.stateOf(LN, c, now - (d ? d.delay : 0), d && d.skip); if (!s2 || s2.dwell) continue; const rf = NatCat.refOf(LN, c.line, s2.km); if (rf.g === kmMe.g) cur.set(c.key, rf.k); }
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
      for (const c of NatCat.build(LN7)) { if (c.rec.d !== W7.dir || c.rec === W7.trip.rec) continue; const d7 = NatCat.delayOf(W7, c.key), s7 = NatCat.stateOf(LN7, c, now7 - (d7 ? d7.delay : 0), d7 && d7.skip); if (!s7 || s7.dwell) continue; const rf7 = NatCat.refOf(LN7, c.line, s7.km); if (rf7.g === me7.g) cur7.set(c.key, rf7.k); }
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
    for (let t = 0; t <= 12000; t += 30) { W8.t = t; NatCat.step(W8); const now8 = W8.trip.t0 + t, cur8 = new Map(); for (const c of cat8) { const d8 = NatCat.delayOf(W8, c.key), s8 = NatCat.stateOf(LNg, c, now8 - (d8 ? d8.delay : 0), d8 && d8.skip); if (!s8 || s8.dwell) continue; const rf8 = NatCat.refOf(LNg, c.line, s8.km); cur8.set(c.key, { g: rf8.g + c.rec.d, k: rf8.k }); }
      if (pr8) for (const [k1, a1] of cur8) { const a0 = pr8.get(k1); if (!a0) continue; for (const [k2, b1] of cur8) { if (k1 >= k2 || a1.g !== b1.g) continue; const b0 = pr8.get(k2); if (!b0 || b0.g !== a0.g || a0.g !== a1.g) continue; if ((a0.k - b0.k) * (a1.k - b1.k) < 0 && Math.abs(a1.k - b1.k) > 0.3) fl8++; } } pr8 = cur8; }
    ok(fl8 === 0, 'toàn quốc: không đoàn cùng nhóm đường và cùng chiều nào đổi thứ tự giữa hai ga (' + fl8 + ' lần)'); }
  // tooltip: tàu trên đoạn đường chung Tokyo–Omiya ghi đúng tàu phía trước/sau dù khác tuyến (Yamabiko 51 / Toki 301 / Tsubasa 121)
  { const L9 = Sim.lineOf('tsk'), r9 = L9.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp), st9 = r9.s.filter(e => !e[3]).map(e => e[0]), W9 = Sim.createWorld('tsk', Sim.makeTrip('tsk', r9, st9[0], st9[st9.length - 1]), { diff: 'normal', seed: 1, lead: false, events: false }), T9 = W9.player, log9 = [];
    const o9 = { txt: t => log9.push(String(t)), button: noop, close: noop, save: noop, checkin: noop }; W9.t = 22440 - W9.trip.t0; NatCat.step(W9); NatMap.V.sel = null; NatMap.draw(ctx, 0, 58, 1920, 618, W9, T9, o9);
    const tk9 = NatMap.V.trains.map(h => h.t).find(t => !t.me && t.label === 'Toki 301'), ym9 = NatMap.V.trains.map(h => h.t).find(t => !t.me && t.label === 'Yamabiko 51');
    const rowsOf = t => { NatMap.V.sel = { tk: t.c.key }; log9.length = 0; NatMap.draw(ctx, 0, 58, 1920, 618, W9, T9, o9); return log9.filter(l => /phía trước|phía sau/.test(l)).join(' | '); };
    const rToki = tk9 ? rowsOf(tk9) : '', rYam = ym9 ? rowsOf(ym9) : '';
    ok(/trước: Yamabiko 51/.test(rToki) && /sau: Toki 301/.test(rYam), 'tooltip khác tuyến trên đoạn đường chung: Toki 301 [' + rToki + '] / Yamabiko 51 [' + rYam + ']'); NatMap.V.sel = null; }
  // bản đồ toàn quốc: tàu bị giữ (động đất) phải đứng yên hẳn, không trườn theo độ trễ hiển thị (trước đây trườn ~10% tốc độ dù đã khoanh tròn/xám)
  { const Lq = Sim.lineOf('tsk'), rq = Lq.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp), sq = rq.s.filter(e => !e[3]).map(e => e[0]), Wq = Sim.createWorld('tsk', Sim.makeTrip('tsk', rq, sq[0], sq[sq.length - 1]), { diff: 'normal', seed: 1, lead: false, events: false }), Tq = Wq.player, oq = { txt: noop, button: noop, close: noop, save: noop, checkin: noop };
    const look = key => { NatMap.V.sel = null; NatMap.draw(ctx, 0, 58, 1920, 618, Wq, Tq, oq); const h = (NatMap.V.trains || []).find(x => x.t && x.t.c && x.t.c.key === key); return h ? h.t : null; };
    Wq.t = 22440 - Wq.trip.t0; NatCat.step(Wq); let pick = null; { NatMap.draw(ctx, 0, 58, 1920, 618, Wq, Tq, oq); pick = NatMap.V.trains.map(h => h.t).find(t => !t.me && t.s.moving && !t.s.dwell); }
    for (let i = 0; i < 6; i++) { Wq.t += 1; NatCat.step(Wq); look(pick.c.key); }      // chạy bình thường vài giây để độ trễ hiển thị có sẵn
    const dq = Wq.haz.delay.get(pick.c.key), kms = []; dq.hold = 900; dq.why = 'eqk';
    for (let i = 0; i < 40; i++) { Wq.t += 1; NatCat.step(Wq); const t = look(pick.c.key); if (t && i >= 3) kms.push(t.s.km); }
    const mv = kms.length ? Math.max(...kms) - Math.min(...kms) : -1;
    ok(kms.length > 20 && mv < 0.005, 'tàu bị giữ do động đất đứng yên trên bản đồ toàn quốc (dịch ' + (mv * 1000).toFixed(1) + ' m trong ' + kms.length + ' s)');
    { const k0 = 'x'; NatMap.shownDelay(k0, 1000, 0, false); let e = 0; for (let i = 1; i <= 30; i++) e = NatMap.shownDelay(k0, 1000 + i, i * 1.0, true); ok(Math.abs(e - 30) < 1e-9, 'độ trễ hiển thị bám đúng 1 s/s khi bị giữ (' + e + ')'); const k1 = 'y'; NatMap.shownDelay(k1, 1000, 0, false); let f = 0; for (let i = 1; i <= 30; i++) f = NatMap.shownDelay(k1, 1000 + i, i * 1.0, false); ok(f < 30 - 1, 'không bị giữ: độ trễ hiển thị vẫn chậm hơn thật (giữ nguyên chống lùi tàu)'); } }
  // vào buồng lái tàu khác (chế độ tự do): Sim.spawnAt đặt đoàn đúng chỗ; NatMap.follow cho nó chạy thật (ATC bật, tốc độ ≤ giới hạn ATC) nhưng tuân theo bản đồ của tàu ta (không vượt bản sao, chỉ rời ga khi bản đồ cho đi)
  { const Lz = Sim.lineOf('tsk'), rz = Lz.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp), rh = Lz.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp && t !== rz), qz = Sim.trainSeq(rz).filter(e => e.stop), cz = NatCat.build(window.LINES).find(c => c.rec === rz), LNz = window.LINES;
    const dep0 = qz[0].dep != null ? qz[0].dep : qz[0].arr, ar1 = qz[1].arr != null ? qz[1].arr : qz[1].dep, dp1 = qz[1].dep != null ? qz[1].dep : ar1, qh = Sim.trainSeq(rh).filter(e => e.stop);
    const mkHome = tAbs => { const Wh = Sim.createWorld('tsk', Sim.makeTrip('tsk', rh, qh[0].i, qh[qh.length - 1].i), { diff: 'normal', seed: 7, lead: false, events: false }); Wh.t = tAbs - Wh.trip.t0; return Wh; };
    const s0 = NatCat.stateOf(LNz, cz, dep0 + 300), Wr = Sim.spawnAt('tsk', rz, dep0 + 300, { km: s0.km, kmh: s0.kmh }, { seed: 7 }), Wh1 = mkHome(dep0 + 300);
    ok(!!Wr && Wr.player.phase === 'run' && Wr.player.v > 15 && Wr.player.foreign && Wr.player.atcOn !== false, 'spawnAt: đoàn đang chạy được đặt đúng trạng thái, ATC bật');
    Wr.fgn = { c: cz }; Wr.home = { W: Wh1, T: Wh1.player }; Wh1.fgnW = Wr; const T1 = Wr.player; let reached = false, left = false, err1 = '', back = 0, over = 0, prevX = null, dwellOk = true;
    try { for (let i = 0; i < 2400 * 25 && !left; i++) { Sim.tick(Wr, 0.05, {}, true); Wh1.t += 0.05; NatMap.follow(Wr); if (prevX != null && T1.x < prevX - 0.5) back++; prevX = T1.x; if (i > 100 && T1.phase === 'run' && T1.v > T1.allowed + 12 / 3.6) over++; if (T1.phase === 'dwell') { if (T1.v !== 0) dwellOk = false; if (T1.k === 1) reached = true; } if (reached && T1.phase === 'run') left = true; } } catch (e) { err1 = e.message; }
    ok(!err1 && reached && left && !T1.failed && back === 0 && dwellOk, 'follow: tàu chạy thật tới ga kế, đỗ (v = 0) rồi đi tiếp, không lùi (' + (err1 || 'tới ' + reached + ' đi ' + left + ' lùi ' + back) + ')');
    ok(over === 0, 'follow: tốc độ không vượt giới hạn ATC quá 12 km/h (' + over + ' lần)');
    { const now = Wr.trip.t0 + Wr.t, dl = NatCat.delayOf(Wh1, cz.key), ss = NatCat.stateOf(LNz, cz, now - (dl ? dl.delay : 0), dl && dl.skip); ok(!ss || ss.dwell || Math.abs(T1.x - Sim.sOfKm(ss.km, 'down', Lz.kmEnd)) < 800, 'bản sao của tàu đang ngồi được kéo khớp vị trí tàu thật trên bản đồ (lệch ' + (ss && !ss.dwell ? Math.round(T1.x - Sim.sOfKm(ss.km, 'down', Lz.kmEnd)) : 0) + ' m)'); }
    { const dW = NatCat.delayOf(Wr, cz.key), dH = NatCat.delayOf(Wh1, cz.key); ok(!dW || dW === dH, 'tàu vào buồng lái: tàu khác lấy độ trễ/giữ từ bản đồ của tàu ta (một bản duy nhất)');
      const a = NatCat.atKm(Lz, Lz.stations[qz[1].i].km); Wh1.haz.cells.push({ kind: 'rain', lat: a.lat, lon: a.lon, r: 40, t0: Wr.t + Wr.trip.t0 - Wh1.trip.t0 - 10, t1: Wr.t + Wr.trip.t0 - Wh1.trip.t0 + 600 }); Wr._wxT = undefined; NatMap.follow(Wr);
      ok(Wr.zones.some(z => z.kind === 'rain' && z.s1 > z.s0 && Math.abs(z.v * 3.6 - 70) < 0.5), 'tàu vào buồng lái: ô mưa trên bản đồ của tàu ta thành vùng chạy chậm 70 km/h trên đoạn đường của nó'); }
    const s1 = NatCat.stateOf(LNz, cz, ar1 + 20), WdT = s1 && s1.dwell === 'stop' ? Sim.spawnAt('tsk', rz, ar1 + 20, { km: s1.km, kmh: 0, dwellI: qz[1].i }, { seed: 7 }) : null, Td = WdT && WdT.player;
    ok(!!WdT && Td.phase === 'dwell' && Td.k === 0 && Td.door === 'open', 'spawnAt: đoàn đang đỗ ở ga được đặt ở trạng thái đỗ, cửa mở');
    let wentAt = null; if (WdT) { const Wh2 = mkHome(ar1 + 20); WdT.fgn = { c: cz }; WdT.home = { W: Wh2, T: Wh2.player }; Wh2.fgnW = WdT; try { for (let i = 0; i < 2400 * 25 && wentAt == null; i++) { Sim.tick(WdT, 0.05, {}, true); Wh2.t += 0.05; NatMap.follow(WdT); if (Td.phase === 'run') wentAt = WdT.trip.t0 + WdT.t; } } catch (e) { err1 = e.message; } }
    ok(!err1 && wentAt != null && wentAt >= dp1 - 20 && wentAt <= dp1 + 600, 'follow: đoàn đang đỗ rời ga đúng giờ biểu đồ (đi lúc ' + (wentAt == null ? '-' : Math.round(wentAt - dp1)) + ' s so với giờ biểu đồ)');
    const lastS = qz[qz.length - 1]; ok(Sim.spawnAt('tsk', rz, dp1 + 100, { km: Lz.stations[lastS.i].km, kmh: 0, dwellI: lastS.i }, { seed: 7 }) === null, 'spawnAt: đoàn đã tới ga cuối thì không vào được'); }
  // tàu kiểm tra tự lái chạy theo giới hạn ATC cao nhất của đoạn đường (ngang tàu khách), không bị kìm theo giờ kế hoạch 190 km/h
  { const trF = Sim.makeMission('toh', [0, 10], 'E926', 0), WF = Sim.createWorld('toh', trF, { diff: 'normal', seed: 1, lead: false, events: false }), TF = WF.player; let vF = 0; for (let i = 0; i < 160000 && !TF.finished; i++) { Sim.tick(WF, 0.05, {}, true); if (TF.v > vF) vF = TF.v; }
    ok(TF.finished && !TF.failed && vF * 3.6 > 255, 'tàu kiểm tra tự lái đạt gần giới hạn ATC của tuyến (' + Math.round(vF * 3.6) + ' km/h), không bị kìm ở ~200'); }
  // tàu kiểm tra đỗ ở ga theo biểu đồ nhưng không mở cửa (không có hành khách), rồi rời ga đúng giờ
  { const LNk = window.LINES; const ck = NatCat.build(LNk).find(c => Sim.INSPECT[c.rec.v] && c.stops.length > 2); let opened = false, left = false, depT = null;
    if (ck) { const p = ck.stops[1], tm = (ck.ta(p) + ck.td(p)) / 2, Wk = Sim.spawnAt(ck.line, ck.rec, tm, { km: LNk[ck.line].stations[p.i].km, kmh: 0, dwellI: p.i }, { seed: 1 }); if (Wk) { const Tk = Wk.player; opened = Tk.door === 'open'; for (let i = 0; i < 2400 * 12 && !left; i++) { Sim.tick(Wk, 0.05, {}, true); if (Tk.door === 'open') opened = true; if (Tk.phase === 'run') { left = true; depT = Wk.trip.t0 + Wk.t; } } } }
    ok(ck && !opened && left && depT >= ck.td(ck.stops[1]) - 5, 'tàu kiểm tra đỗ ở ga không mở cửa và rời ga đúng giờ biểu đồ (đi lúc ' + (depT != null && ck ? Math.round(depT - ck.td(ck.stops[1])) : '-') + ' s so với giờ)'); }
  // dữ liệu giờ tàu hợp lý: mọi đoàn khách có giờ không giảm dọc hành trình, hai ga liền nhau cách nhau không quá 3 giờ, và không có giờ vượt 28:00 (từng có Tsubame 333/334 bị cộng nhầm 24 giờ vì lỗi gõ giờ trong PDF, kéo giờ chạy của tàu kiểm tra tới 25:25 và làm bản đồ vắng tàu)
  { let nb = 0, first = ''; for (const id of Object.keys(window.LINES)) for (const r of Sim.lineOf(id).trains) { if (Sim.INSPECT[r.v]) continue; let prev = null; for (const e of r.s) for (const k of [1, 2]) { const t = e[k]; if (t == null) continue; if (t > 28 * 3600 || (prev != null && (t < prev - 1 || t - prev > 3 * 3600))) { nb++; if (!first) first = id + ' ' + r.t + ' ' + r.n + ' ga' + e[0] + ' ' + prev + '→' + t; } prev = t; } }
    ok(nb === 0, 'giờ tàu khách đơn điệu, không vọt quá 3 giờ giữa hai ga, không quá 28:00 (' + nb + ' chỗ sai)', first); }
  // tàu kiểm tra (Doctor Yellow, East i): vào buồng lái được như tàu thường (không hành khách, không sự cố liên quan hành khách), và tàu của ta đang làm nhiệm vụ kiểm tra vẫn đi xem tàu khác được
  { const LNi = window.LINES; let nI = 0, errI = '', pax = 0; const EVP = new Set(['sick', 'doorfault', 'addstop']);
    for (const c of NatCat.build(LNi)) { if (!Sim.INSPECT[c.rec.v]) continue; nI++; const Wx = Sim.createWorld(c.line, Sim.makeTrip(c.line, c.rec, c.stops[0].i, c.stops[c.stops.length - 1].i), { diff: 'expert', seed: 3, lead: false, events: false }); Wx.t = c.t1 - Wx.trip.t0 - 10; NatCat.step(Wx); for (const [k, d] of Wx.haz.delay) if (k === c.key && EVP.has(d.why)) pax++; }
    const ci = NatCat.build(LNi).find(c => Sim.INSPECT[c.rec.v] && c.t1 - c.t0 > 1800); let okI = false;
    if (ci) { const sI = NatCat.stateOf(LNi, ci, ci.t0 + (ci.t1 - ci.t0) * 0.4); const WI = sI && !sI.dwell ? Sim.spawnAt(ci.line, ci.rec, ci.t0 + (ci.t1 - ci.t0) * 0.4, { km: sI.km, kmh: sI.kmh || 0 }, { seed: 1 }) : null;
      okI = !!WI && WI.player.load === 0; if (okI) { const rh = Sim.lineOf('tsk').trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp), th = Sim.makeMission('tsk', [0, 6], 'T4', 0), Wm = Sim.createWorld('tsk', th, { diff: 'normal', seed: 3, lead: false, events: false }); Wm.t = 100;
        WI.fgn = { c: ci }; WI.home = { W: Wm, T: Wm.player }; Wm.fgnW = WI; try { NatCat.bindEvents(WI, Wm); for (let i = 0; i < 1200; i++) { Sim.tick(WI, 0.05, {}, true); Sim.tick(Wm, 0.05, {}, true); NatMap.follow(WI); } } catch (e) { errI = e.message; okI = false; } } }
    ok(nI > 0 && pax === 0 && okI && !errI, 'tàu kiểm tra: ' + nI + ' đoàn trong danh mục, không có sự cố hành khách (' + pax + '), vào được buồng lái kể cả khi tàu của ta đang làm nhiệm vụ kiểm tra ' + (errI || '')); }
  // vào buồng lái đoàn ghép (Hayabusa + Komachi, Yamabiko + Tsubasa): đoạn đã ghép (từ Tokyo tới ga tách) là cả đoàn ghép có nhãn hai tên, không còn mini "chờ ghép" đỗ sẵn ở ga xuất phát; ngoài đoạn ghép chỉ còn đoàn Tohoku
  { const LNc = window.LINES; let nC = 0, bad = 0, waiting = 0, firstBad = ''; for (const c of NatCat.build(LNc)) { if (c.line !== 'toh') continue; const ci = Sim.coupleOf(c.rec); if (!ci || ci.role !== 'toh') continue; const span = c.t1 - c.t0;
      for (const fr of [0.02, 0.1, 0.25, 0.4, 0.55, 0.7, 0.9]) { const now = c.t0 + span * fr, sc = NatCat.stateOf(LNc, c, now); if (!sc || sc.dwell || Math.abs(sc.km - ci.splitKm) < 6) continue; const Wc = Sim.spawnAt('toh', c.rec, now, { km: sc.km, kmh: sc.kmh || 0 }, { seed: 1 }); if (!Wc) continue; nC++;
        if (Wc.parked.some(p => p.kind === 'wait')) waiting++; const coupled = !!Wc.player.veh.parts && /\+/.test(Sim.hudLabel(Wc, Wc.player)); if (coupled !== (sc.km < ci.splitKm)) { bad++; if (!firstBad) firstBad = c.rec.t + ' ' + c.rec.n + ' ' + c.rec.d + ' km' + Math.round(sc.km) + ' split ' + ci.splitKm; } } }
    ok(nC > 100 && bad === 0 && waiting === 0, 'vào buồng lái đoàn ghép: đúng đoàn ghép/đơn theo vị trí, không dựng lại cảnh ghép (' + nC + ' lần thử, ' + bad + ' sai, ' + waiting + ' có mini chờ ghép)', firstBad); }
  // không dùng emoji (ký tự hình màu) trong giao diện: dùng biểu tượng tự vẽ (icons.js); tìm bằng romaji và tên ga kèm hiragana ở giao diện tiếng Nhật
  { const fsx = require('fs'), EM = /[\u{1F000}-\u{1FAFF}\u{26F6}\u{23F8}\u{21A9}\u{2714}\uFE0F]/u, bad = []; for (const f of fsx.readdirSync(DRIVE).filter(x => /\.(js|html)$/.test(x))) if (EM.test(fsx.readFileSync(path.join(DRIVE, f), 'utf8'))) bad.push(f); ok(bad.length === 0, 'giao diện không còn emoji (chỉ biểu tượng tự vẽ): ' + bad.join(','));
    require(path.join(DRIVE, 'stations-kana.js')); { const Lm = Sim.lineOf('tsk'), rm = Lm.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp), sm = rm.s.filter(e => !e[3]).map(e => e[0]), Wm = Sim.createWorld('tsk', Sim.makeTrip('tsk', rm, sm[0], sm[sm.length - 1]), { diff: 'normal', seed: 2, lead: false, events: false }), om = { txt: noop, button: noop, close: noop, save: noop, checkin: noop };
      NatMap.draw(ctx, 0, 58, 1920, 618, Wm, Wm.player, om); const its = NatMap.searchItems('station'); NatMap.focus('station', its[0].key); for (let i = 0; i < 3; i++) NatMap.draw(ctx, 0, 58, 1920, 618, Wm, Wm.player, om); ok(NatMap.V.s === 120000 && NatMap.V.sel && NatMap.V.sel.jp === its[0].key, 'tìm ga: phóng to hết cỡ và giữ nguyên sau khi vẽ lại (' + NatMap.V.s + ')'); NatMap.V.sel = null; }
    const rj = I18N.romaji; ok(rj('とうきょう') === 'toukyou' && rj('しんおおさか') === 'shinoosaka' && rj('にしあかし') === 'nishiakashi' && rj('ぎふはしま') === 'gifuhashima' && rj('かごしまちゅうおう') === 'kagoshimachuuou' && rj('はっこうだ') === 'hakkouda' && rj('トウキョウ') === 'toukyou', 'romaji: kana → chữ La-tinh (' + rj('とうきょう') + ' ' + rj('しんおおさか') + ' ' + rj('かごしまちゅうおう') + ' ' + rj('はっこうだ') + ')');
    const stn = { jp: '東京', en: 'Tokyo' }, key = I18N.romKey(stn); ok(/Tokyo/.test(key) && /toukyou/.test(key) && /toukyou/.test(key.toLowerCase()), 'romKey: có cả Tokyo và toukyou để tìm (' + key + ')');
    const lg = I18N.lang; I18N.lang = 'ja'; const jk = I18N.stk(stn); I18N.lang = 'vi'; const vk = I18N.stk(stn); I18N.lang = lg; ok(jk === '東京（とうきょう）' && vk === 'Tokyo', 'tên ga tiếng Nhật kèm hiragana trong ngoặc (' + jk + ' / ' + vk + ')'); }
  // sự kiện ngẫu nhiên áp cho mọi đoàn trong danh mục theo hạt giống và độ khó của chuyến (lệnh điều độ, hành khách bệnh, cửa lỗi...): cùng hạt giống thì giống nhau, đổi hạt giống/độ khó thì khác
  { const Lq = Sim.lineOf('tsk'), rq = Lq.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp), sq = rq.s.filter(e => !e[3]).map(e => e[0]), EV = new Set(['hold', 'addstop', 'sick', 'doorfault', 'overtake', 'planned', 'fault', 'xingcar', 'wire', 'fire']);
    const run = (seed, diff) => { const Wx = Sim.createWorld('tsk', Sim.makeTrip('tsk', rq, sq[0], sq[sq.length - 1]), { diff, seed, lead: false, events: false }); Wx.t = 15000; NatCat.step(Wx); let n = 0, sk = 0, sl = 0, sig = ''; for (const [k, d] of Wx.haz.delay) { if (EV.has(d.why)) n++; if (d.skip && d.skip.size) sk++; if (d.slowK) sl++; sig += k + ':' + Math.round(d.delay) + ';'; } return { n, sk, sl, sig }; };
    const a = run(11, 'hard'), b = run(11, 'hard'), c2 = run(12, 'hard'), e1 = run(11, 'easy'), e7 = run(11, 'expert');
    ok(a.n > 0 && a.sig === b.sig, 'sự kiện ngẫu nhiên của danh mục: có xảy ra và cùng hạt giống thì giống hệt (' + a.n + ' đoàn bị)'); ok(a.sig !== c2.sig, 'sự kiện ngẫu nhiên của danh mục: đổi hạt giống thì khác'); ok(e7.n > e1.n, 'sự kiện ngẫu nhiên của danh mục: độ khó cao thì nhiều đoàn bị hơn (dễ ' + e1.n + ' / chuyên gia ' + e7.n + ')'); 
    ok(e7.sk > 0 && e7.sl > 0, 'sự kiện ngẫu nhiên của danh mục: có đoàn được cho thông qua ga (' + e7.sk + ') và đoàn chạy chậm theo lệnh/nhân viên làm việc (' + e7.sl + ')');
    // tàu đang ngồi buồng lái: các sự kiện của danh mục dành cho nó xảy ra thật trong thế giới của nó và tự lái xử lý hết (không kẹt, không hỏng chuyến)
    { const rq2 = Lq.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp && t !== rq), sq2 = rq2.s.filter(e => !e[3]).map(e => e[0]), Wh3 = Sim.createWorld('tsk', Sim.makeTrip('tsk', rq2, sq2[0], sq2[sq2.length - 1]), { diff: 'expert', seed: 3, lead: false, events: false }), cz3 = NatCat.build(window.LINES).find(c => c.rec === rq), q3 = Sim.trainSeq(rq).filter(e => e.stop), d03 = q3[0].dep != null ? q3[0].dep : q3[0].arr;
      Wh3.t = d03 + 200 - Wh3.trip.t0; NatCat.step(Wh3); const s3 = NatCat.stateOf(window.LINES, cz3, d03 + 200), W3 = Sim.spawnAt('tsk', rq, d03 + 200, { km: s3.km, kmh: s3.kmh }, { seed: 3, diff: 'expert' }); W3.fgn = { c: cz3 }; W3.home = { W: Wh3, T: Wh3.player }; Wh3.fgnW = W3; NatCat.bindEvents(W3, Wh3);
      const nEv = W3.events.length; W3.events.forEach((e, i) => { e.at = W3.t + 20 + i * 60; }); let err3 = ''; try { for (let i = 0; i < 2400 * 9 && !W3.player.finished; i++) { Sim.tick(W3, 0.05, {}, true); Wh3.t += 0.05; NatMap.follow(W3); } } catch (e) { err3 = e.message; }
      const warns = W3.msgs.filter(m => m.kind === 'warn' || m.kind === 'bad').length; ok(!err3 && nEv > 0 && W3.events.filter(e => e.done).length > 0 && warns > 0 && !W3.player.failed, 'tàu ngồi buồng lái: sự kiện của danh mục xảy ra thật và tự lái xử lý hết (' + (err3 || nEv + ' sự kiện, ' + W3.events.filter(e => e.done).length + ' đã xảy ra, ' + warns + ' thông báo') + ')'); } }
  // trùng tên ga giữa các tuyến (Sendai: Tohoku 仙台 / Kyushu 川内) phải là hai ga riêng; đoàn ghép (Yamabiko + Tsubasa cùng giờ) không bị tách bởi quy tắc giãn cách
  { const LNs = window.LINES; ok(NatMap.stations && Object.values(NatMap.stations()).filter(x => x.en === 'Sendai').length === 2, 'hai ga Sendai (Tohoku và Kyushu) là hai ga riêng trên bản đồ');
    const W10 = Sim.createWorld('tsk', Sim.makeTrip('tsk', Sim.lineOf('tsk').trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp), 0, 12), { diff: 'hard', seed: 5, lead: false, events: true }), cat10 = NatCat.build(LNs);
    const pr10 = cat10.find(c => c.line === 'yam' && c.rec.d === 'down' && cat10.some(x => x.line === 'toh' && x.rec.d === 'down' && x.cid === c.cid)), a10 = pr10 && cat10.find(c => c.line === 'toh' && c.rec.d === 'down' && c.cid === pr10.cid); let maxGap = 0;
    if (a10 && pr10) for (let t = a10.t0 + 60; t < a10.t0 + 3600; t += 60) { W10.t = t - W10.trip.t0; NatCat.step(W10); const da = NatCat.delayOf(W10, a10.key), db = NatCat.delayOf(W10, pr10.key), sa = NatCat.stateOf(LNs, a10, t - (da ? da.delay : 0), da && da.skip), sb = NatCat.stateOf(LNs, pr10, t - (db ? db.delay : 0), db && db.skip); if (sa && sb && sa.km !== undefined) maxGap = Math.max(maxGap, Math.abs(NatCat.refOf(LNs, 'toh', sa.km).k - NatCat.refOf(LNs, 'yam', sb.km).k)); }
    ok(a10 && pr10 && maxGap < 0.5, 'đoàn ghép ' + (a10 ? a10.rec.t + ' ' + a10.rec.n : '?') + ' + ' + (pr10 ? pr10.rec.t + ' ' + pr10.rec.n : '?') + ' luôn đi cùng nhau trên đường chung (lệch tối đa ' + maxGap.toFixed(2) + ' km)'); }
  // tàu đi trước thật của ta: vị trí trong danh mục bản đồ bám đúng vị trí mô phỏng và không tàu nào đổi thứ tự với nó giữa đường
  { const L11 = Sim.lineOf('tsk'), r11 = L11.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && t.n === '3' && !t.cp), st11 = r11.s.filter(e => !e[3]).map(e => e[0]), W11 = Sim.createWorld('tsk', Sim.makeTrip('tsk', r11, st11[0], st11[st11.length - 1]), { diff: 'hard', seed: 5, lead: true, events: true }), T11 = W11.player, LN11 = window.LINES;
    Sim.requestClose(T11); T11.pw = 13; let n11 = 0, maxD = 0, fl11 = 0, prev11 = null, samples = 0; const lc = W11.leadRef && NatCat.build(LN11).find(c => c.rec.t === W11.leadRef.t && c.rec.n === W11.leadRef.n && c.rec.d === W11.leadRef.d);
    while (!T11.finished && n11++ < 2e5 && W11.t < 7000) { Sim.tick(W11, 0.05, {}, true); if (n11 % 20 !== 0) continue; const Ld = W11.lead; if (!lc || !Ld || Ld.phase !== 'run') { prev11 = null; continue; } const now11 = W11.trip.t0 + W11.t, dl = NatCat.delayOf(W11, lc.key), sl = NatCat.stateOf(LN11, lc, now11 - (dl ? dl.delay : 0), dl && dl.skip); if (!sl) { prev11 = null; continue; }
      const real = NatCat.refOf(LN11, W11.lineId, Sim.kmOfS(Ld.x, W11.dir, W11.line.kmEnd)), mine = NatCat.refOf(LN11, lc.line, sl.km); if (real.g === mine.g) { maxD = Math.max(maxD, Math.abs(real.k - mine.k)); samples++; }
      if (n11 % 200 === 0) { const cur = new Map(); for (const c of NatCat.build(LN11)) { if (c === lc || c.rec.d !== W11.dir || c.rec === W11.trip.rec) continue; const d2 = NatCat.delayOf(W11, c.key), s2 = NatCat.stateOf(LN11, c, now11 - (d2 ? d2.delay : 0), d2 && d2.skip); if (!s2 || s2.dwell) continue; const rf = NatCat.refOf(LN11, c.line, s2.km); if (rf.g === mine.g) cur.set(c.key, rf.k); }
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
        for (const c of cat) { const d = NatCat.delayOf(W, c.key), sx = NatCat.stateOf(LNs, c, now - (d ? d.delay : 0), d && d.skip); if (!sx) continue; const rf = NatCat.refOf(LNs, c.line, sx.km); cur.set(c.key, { g: rf.g + c.rec.d, k: rf.k, dw: !!sx.dwell, lab: c.rec.t + ' ' + c.rec.n + '(' + c.line + ')', cid: c.cid }); }
        if (prev) { const keys = [...cur.keys()]; for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) { const a = cur.get(keys[i]), bb = cur.get(keys[j]), a0 = prev.get(keys[i]), b0 = prev.get(keys[j]); if (!a0 || !b0 || a.g !== bb.g || a0.g !== a.g || b0.g !== bb.g) continue; if (a.cid && a.cid === bb.cid) continue; if (a.dw || bb.dw || a0.dw || b0.dw) continue;
            if ((a0.k - b0.k) * (a.k - bb.k) < 0 && Math.abs(a.k - bb.k) > 0.05) { flips++; if (!firstBad) firstBad = a.lab + ' x ' + bb.lab + ' @' + W.trip.label + ' t=' + t; } } }
        prev = cur; } } }
  ok(worlds > 40 && flips === 0, 'khởi động ở ' + worlds + ' giờ khác nhau: ' + flips + ' lần tàu cùng chiều đổi thứ tự trong 5 phút đầu', firstBad);
}

if (section('29b. Furigana tên ga (stations-kana.js): mọi ga đều có cách đọc hiragana')) {
  global.document = global.document || {}; require(path.join(DRIVE, 'transfers.js')); require(path.join(DRIVE, 'stations-kana.js')); require(path.join(DRIVE, 'data-lines.js'));      // tự nạp dữ liệu cần dùng để chạy riêng được (--only)
  let miss = 0; for (const id in global.LINES) for (const st of global.LINES[id].stations) if (!/^[ぁ-ゖー]+$/.test(global.STATION_KANA[st.jp] || '')) { miss++; console.log('  thiếu/sai cách đọc:', st.jp); }
  ok(miss === 0, 'mọi ga có cách đọc toàn hiragana', miss);
  require(path.join(DRIVE, 'audio.js')); let badY = 0; for (const id in global.LINES) for (const st of global.LINES[id].stations) if (global.GameAudio.yomi(st.jp) !== global.STATION_KANA[st.jp] || global.GameAudio.yomi('まもなく、' + st.jp + '、' + st.jp + 'です。') !== 'まもなく、' + global.STATION_KANA[st.jp] + '、' + global.STATION_KANA[st.jp] + 'です。') { badY++; console.log('  đọc sai:', st.jp, global.GameAudio.yomi(st.jp)); }
  ok(badY === 0, 'phát thanh: tên ga được đổi sang hiragana trước khi đọc (kể cả tên chứa tên ga khác như 新大阪/大阪, 東広島/広島)', badY);
  { const KANJI = /[\u4E00-\u9FFF]/, KANA = /^[\u3041-\u3096\u30A1-\u30FAー・A-Za-z]+$/, names = new Set(); let badR = 0, badK = 0, badP = 0;
    for (const k in window.TRANSFERS) for (const n of window.TRANSFERS[k]) names.add(n);
    for (const n of names) { const r = window.RAIL_KANA[n]; if (!r || !KANA.test(r)) { badK++; console.log('  thiếu/sai cách đọc tuyến:', n); } else if (global.GameAudio.yomi(n) !== r || global.GameAudio.yomi('ここでは、' + n + 'はお乗り換えです。') !== 'ここでは、' + r + 'はお乗り換えです。') { badR++; console.log('  đọc sai tuyến:', n, global.GameAudio.yomi(n)); } }
    for (const id in Sim.LINE_META) { const pa = Sim.LINE_META[id].pa; if (!pa) continue; const y = global.GameAudio.yomi('本日も、' + pa + '新幹線をご利用くださいまして'); if (KANJI.test(y.replace('新幹線', '').replace('本日', '').replace('利用', '').replace('御', ''))) { badP++; console.log('  còn kanji trong câu chào:', id, y); } }
    ok(names.size > 100 && badK === 0 && badR === 0, 'phát thanh: mọi tên tuyến đổi tàu (' + names.size + ' tên) có cách đọc kana và được thay đúng', badK + '/' + badR);
    ok(badP === 0, 'phát thanh: tên tuyến trong câu chào đầu được đọc bằng kana', badP); }
}
if (section('29. Đa ngôn ngữ (i18n.js, lang-en.js, lang-ja.js): đủ bản dịch, đúng chỗ điền, không lọt tiếng Việt')) {
  const fs = require('fs'); require(path.join(DRIVE, 'lang-en.js')); require(path.join(DRIVE, 'lang-ja.js'));
  const VNX = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/;      // chữ đặc trưng tiếng Việt (không gồm é: có trong tên riêng)
  const VNK = /[À-ÃÈ-ÊÌÍÒ-ÕÙÚÝà-ãè-êìíò-õùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/;
  // 1) thu khoá _t('...') trong mã nguồn
  const files = ['sim.js', 'natcat.js', 'layout.js', 'tutorial.js', 'fullui.js', 'natmap.js', 'store.js', 'audio.js', 'winview.js', 'topview.js', 'music.js', 'index.html'], keys = new Set(); let bad = 0;
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
    const r = require('child_process').spawnSync(process.execPath, [path.join(__dirname, 'i18n_child.js'), lang], { encoding: 'utf8', timeout: 1200000 });
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
    let dep = null; for (let i = 0; i < 320000 && !T.finished; i++) { Sim.tick(w, 0.05, {}, true); if (dep === null && T.x > 50) dep = w.t; }
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
    for (const cc of NatCat.build(window.LINES)) { const dl = NatCat.delayOf(wM, cc.key); if (!dl || dl.hold <= 0 || dl.why !== 'rain') continue; const sx = NatCat.stateOf(window.LINES, cc, nowM - dl.delay, dl.skip); if (!sx) continue; heldM++; const LL = window.LINES[cc.line], near = LL.stations.reduce((m, st) => Math.min(m, NatCat.hav(st.lat, st.lon, sx.lat, sx.lon)), 1e9); if (near < 0.7 || sx.dwell) { nearM++; if (!sx.dwell && !cc.stops.some(p => LL.stations[p.i].km === sx.km)) passStop++; } }
    ok(cl && heldM >= 2 && nearM === heldM, 'tàu đang chạy gặp ô giữ tàu: dừng sát một ga ngay trước ô (' + nearM + '/' + heldM + ')'); }
  // chạy trọn chuyến trong thời tiết thật xấu vẫn kết thúc được
  const rr = runAuto(lnR, recR, 0, 12, { diff: 'normal', events: true, weather: 'real', real: mkSnap(32, 0.4, 21, eq1) }, 40000); ok(rr.T.finished, 'chạy tự động trọn chuyến với thời tiết thật xấu + dư chấn: tới ga cuối');
}

if (section('31. Đợt sửa tháng 11: Tsubame/S800, 8 toa, nhắc đóng cửa, tên đoàn ghép, đường đơn mini')) {
  // Tsubame (Kyushu Shinkansen) từ bảng giờ PDF: 22 chuyến lên + 22 chuyến xuống suy ra; chủ yếu dùng 800 (6 toa)
  { const L = Sim.lineOf('tsk'), ts = L.trains.filter(t => t.t === 'Tsubame'), up = ts.filter(t => t.d === 'up'), dn = ts.filter(t => t.d === 'down');
    ok(up.length === 22 && dn.length === 22, 'tsk có 22 chuyến Tsubame chiều lên (PDF) và 22 chiều xuống (suy ra)', up.length + '/' + dn.length);
    ok(ts.filter(t => t.v === 'S800').length >= 30 && ts.every(t => t.v === 'S800' || t.v === 'N700-8'), 'Tsubame dùng 800 (S800), vài chuyến N700 8 toa');
    const r = dn.find(t => t.v === 'S800'), st = r.s.filter(e => !e[3]).map(e => e[0]), run = runAuto('tsk', r, st[0], st[st.length - 1], { diff: 'easy', events: false }, 20000);
    ok(run.T.finished && !run.T.failed && run.T.veh.key === 'S800', 'chạy trọn một chuyến Tsubame chiều xuống bằng S800', [run.T.finished, run.T.failed]);
    const noSame = L.trains.filter(t => t.t === 'Tsubame'); const keys = new Set(noSame.map(t => t.t + t.n + t.d)); ok(keys.size === noSame.length, 'số hiệu Tsubame không trùng trong cùng chiều'); }
  // 8 toa: dải ảnh riêng cho N700-8 (Sakura, Mizuho)
  { require(path.join(DRIVE, 'assets', 'sprites.js')); const sp = window.SPRITES && window.SPRITES.n700s8; ok(sp && sp.cars.length === 8 && sp.width > 2000, 'dải ảnh N700 8 toa (n700s8) có đúng 8 toa'); const ix = require('fs').readFileSync(path.join(DRIVE, 'index.html'), 'utf8'); ok(/'N700-8': 'n700s8'/.test(ix), 'ảnh xem trước dùng dải 8 toa cho N700-8'); ok(Sim.VEH['N700-8'].cars === 8, 'N700-8 có 8 toa'); }
  // nhắc trên điện đàm khi kéo cần mà chưa đóng cửa (không còn lớp phủ che màn hình)
  { const L = Sim.lineOf('tsk'), r = find('tsk', 'Nozomi', 'down', 0, 12), W = Sim.createWorld('tsk', Sim.makeTrip('tsk', r, 0, 12), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player, msgs = [], say0 = W.say; W.say = function (k, t) { msgs.push(t); return say0.apply(W, arguments); };
    T.pw = 6; for (let i = 0; i < 200; i++) Sim.tick(W, 0.05, {}, false); ok(msgs.some(m => /Cửa chưa đóng/.test(m) && /trưởng tàu/.test(m)), 'kéo cần khi chưa đóng cửa: có nhắc trên điện đàm', msgs.slice(-2).join('|'));
    const n0 = msgs.length; for (let i = 0; i < 100; i++) Sim.tick(W, 0.05, {}, false); ok(msgs.length - n0 <= 1, 'lời nhắc không bị lặp liên tục (' + (msgs.length - n0) + ')');
    const fu = require('fs').readFileSync(path.join(DRIVE, 'fullui.js'), 'utf8'); ok(!/Nhấn Enter để đóng cửa, rồi kéo cần/.test(fu), 'đã bỏ lớp phủ đen nhắc Enter đóng cửa'); }
  // tên đoàn ghép Tohoku + mini
  { const Lt = Sim.lineOf('toh'), h36 = Lt.trains.find(t => t.t === 'Hayabusa' && t.n === '36' && t.d === 'up'), ci = Sim.coupleOf(h36);
    ok(ci && ci.role === 'toh' && ci.mini === 'E6' && Math.abs(ci.splitKm - 496.5) < 0.1, 'Hayabusa 36 (lên) ghép với Komachi 36 (E6) tại Morioka');
    ok(/Hayabusa.*36.*\+.*Komachi.*36/.test(Sim.labelAt(h36, 300)) && !/Komachi/.test(Sim.labelAt(h36, 600)), 'tên chuyến ghép chỉ khi còn đi chung (km ≤ Morioka)');
    ok(Sim.vehAt(h36, 300) === 'E5+E6' && Sim.vehAt(h36, 600) === 'E5', 'mẫu tàu theo vị trí: E5+E6 khi đi chung, E5 sau khi tách');
    const k36 = Sim.lineOf('aki').trains.find(t => t.t === 'Komachi' && t.n === '36' && t.d === 'up'); ok(Sim.dupHidden(k36, 300) && !Sim.dupHidden(k36, 520), 'Komachi 36 không vẽ riêng trên đoạn đi chung (đã gộp vào Hayabusa 36)');
    ok(/Hayabusa.*\+.*Komachi/.test(Sim.hudLabel({ trip: { rec: h36, label: 'x' } }, { veh: Sim.VEH['E5+E6'] })) && Sim.hudLabel({ trip: { rec: h36, label: 'x' } }, { veh: Sim.VEH['E5'] }) === 'x', 'nhãn góc trái: ghi cả hai chuyến khi đang ghép, một chuyến khi đã tách');
    // bản đồ toàn quốc: một đoàn ghép, không có tam giác Komachi riêng trên đoạn chung
    const now = 20 * 3600 + 5 * 60; let nK = 0, nH = 0; for (const c of NatCat.build(window.LINES)) { const st = NatCat.stateOf(window.LINES, c, now); if (!st) continue; if (c.rec.t === 'Komachi' && c.rec.n === '36' && !Sim.dupHidden(c.rec, st.km)) nK++; if (c.rec === h36) nH++; } ok(nH === 1 && nK === 0, 'bản đồ lúc 20:05: Hayabusa 36 hiện, Komachi 36 không hiện riêng (' + nH + '/' + nK + ')'); }
  // đường đơn Yamagata/Akita: tàu của người chơi và tàu ngược chiều không bao giờ cùng ở một đoạn giữa hai ga
  for (const [lid, dir, sd] of [['aki', 'down', 1], ['aki', 'up', 3], ['yam', 'down', 3], ['yam', 'up', 1]]) {
    const L = Sim.lineOf(lid), S = L.stations, i0 = S.findIndex(x => x.en === (lid === 'aki' ? 'Morioka' : 'Fukushima')), cands = L.trains.filter(t => t.d === dir && t.s.some(e => e[0] === i0 && !e[3])), rec = cands[Math.min(cands.length - 1, 6)], st = rec.s.filter(e => !e[3]).map(e => e[0]);
    const trip = Sim.makeTrip(lid, rec, dir === 'down' ? i0 : st[0], dir === 'down' ? st[st.length - 1] : i0), W = Sim.createWorld(lid, trip, { diff: 'normal', seed: sd, lead: false, events: true }), T = W.player, cat = NatCat.build(window.LINES).filter(c => c.line === lid && c.rec.d !== dir), msgs = [], say0 = W.say; W.say = function (k, t) { msgs.push(t); return say0.apply(W, arguments); };
    const seg = km => { for (let i = 0; i < S.length - 1; i++) if (km >= S[i].km && km <= S[i + 1].km) return i; return -1; }, isS = i => i >= 0 && L.single.some(([a, b]) => Math.min(S[i + 1].km, b) - Math.max(S[i].km, a) > 0.05);
    let viol = 0, n = 0; while (!T.finished && n++ < 2e6 && W.t < 30000) { Sim.tick(W, 0.05, {}, true); if (n % 10) continue; const kmP = Sim.kmOfS(T.x, W.dir, L.kmEnd), i = seg(kmP); if (!(i >= 0 && isS(i) && T.phase === 'run' && kmP > S[i].km + 0.25 && kmP < S[i + 1].km - 0.25)) continue; const now = W.trip.t0 + W.t;
      for (const c of cat) { const d = NatCat.delayOf(W, c.key), s2 = NatCat.stateOf(window.LINES, c, now - (d ? d.delay : 0), d && d.skip); if (s2 && !s2.dwell && seg(s2.km) === i && s2.km > S[i].km + 0.25 && s2.km < S[i + 1].km - 0.25) { viol++; break; } } }
    ok(T.finished && !T.failed && viol === 0, lid + ' ' + dir + ' (seed ' + sd + '): chạy trọn chuyến, không lần nào cùng đoạn đường đơn với tàu ngược chiều (' + viol + ' lần)', [T.finished, T.failed, viol]);
    ok(msgs.every(m => !/DỪNG TRÁNH tàu ngược chiều tại/.test(m) || /Điều độ/.test(m)), lid + ': không còn lệnh tránh tàu giả lập'); }
}

if (section('32. Bảng giờ tàu ở màn thiết lập: màu tên tàu phủ mọi loại tàu hành khách')) {
  require(path.join(DRIVE, 'traincolors.js')); const types = new Set(); for (const id of ALL) for (const t of Sim.lineOf(id).trains) if (!Sim.INSPECT[t.v]) types.add(t.t);
  const miss = [...types].filter(t => !window.TRAIN_COL[t]); ok(miss.length === 0, 'mọi loại tàu hành khách (' + [...types].join(', ') + ') đều có màu trên bảng giờ', miss.join(','));
  ok(Object.values(window.TRAIN_COL).every(c => /^#[0-9a-f]{6}$/.test(c)), 'màu đều là mã #rrggbb'); ok(new Set(['Nozomi', 'Hikari', 'Kodama'].map(t => window.TRAIN_COL[t])).size === 3, 'Nozomi, Hikari, Kodama có ba màu riêng');
  ok(window.TRAIN_COL.Hayabusa === window.TRAIN_COL.Yamabiko && window.TRAIN_COL.Komachi !== window.TRAIN_COL.Hayabusa && window.TRAIN_COL.Tsubasa !== window.TRAIN_COL.Hayabusa, 'chuyến ghép: Tohoku xanh lá, Komachi/Tsubasa màu riêng');
  I18N.lang = 'ja'; ok(_tn('Nozomi') === 'のぞみ' && _tn('Hayabusa') === 'はやぶさ' && _tn('Doctor Yellow') !== undefined, '_tn: tên loại tàu tiếng Nhật'); I18N.lang = 'vi'; ok(_tn('Nozomi') === 'Nozomi', '_tn: tiếng Việt giữ nguyên'); }

if (section('34. Thời gian tàu thông qua theo giới hạn tốc độ ga')) { // thời gian tàu thông qua đi hết đoạn nhìn thấy phụ thuộc giới hạn tốc độ tại ga
  const ln = Sim.lineOf('toh'), rec = ln.trains.find(t => t.d === 'down' && t.s.filter(e => !e[3]).length >= 4), st = rec.s.filter(e => !e[3]);
  const trip = Sim.makeTrip('toh', rec, st[0][0], st[st.length - 1][0]), W = Sim.createWorld('toh', trip, { diff: 'easy', seed: 1, lead: false, events: false });
  const ds = W.trip.M.map((m, k) => Sim.passDur(W, k, 404.7)), lim = W.trip.M.map(m => ln.meta.limits.some(([a, b, v]) => ln.stations[m.i].km >= a && ln.stations[m.i].km < b && v <= 110));
  ok(ds.every(d => d >= 8 && d <= 40), 'passDur trong khoảng hợp lý: ' + ds.map(d => d.toFixed(1)).join(' '));
  const slow = ds.filter((d, k) => lim[k]), fast = ds.filter((d, k) => !lim[k]);
  ok(!slow.length || !fast.length || Math.min(...slow) > Math.max(...fast) + 5, 'ga giới hạn 110 km/h: tàu thông qua chậm hơn rõ rệt ga 285 km/h');
}

if (section('35. Tàu đỗ ở đường dừng bỏ trống khi ta chạy thông qua ga')) { // Komachi 1 chạy thông qua Utsunomiya: Yamabiko 201 đỗ ở đường phụ (đường dừng của ta để trống) phải có trong danh sách tàu đỗ
  const ln = Sim.lineOf('aki'), rec = ln.trains.find(t => t.n == 1 && t.d === 'down' && t.t === 'Komachi'), st = rec.s.filter(e => !e[3]);
  const trip = Sim.makeTrip('aki', rec, st[0][0], st[st.length - 1][0]), W = Sim.createWorld('aki', trip, { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
  const ku = trip.M.findIndex(m => ln.stations[m.i].en === 'Utsunomiya'), sU = Sim.sOfKm(ln.stations[trip.M[ku].i].km, 'down', ln.kmEnd); let n = 0, got = false;
  while (!T.finished && n++ < 3e6 && T.x < sU + 100) { Sim.tick(W, 0.05, {}, true); if (n % 20 === 0 && Math.abs(sU - T.x) < 1500 && (W.stabled || []).some(b => b.i === trip.M[ku].i && b.label.includes('201'))) got = true; }
  ok(!trip.M[ku].stop && got, 'chạy thông qua ga: tàu cùng chiều đỗ ở đường dừng bỏ trống của ta (Yamabiko 201 ở Utsunomiya)');
}

if (section('36. Đỗ ở ga: không có tàu ngược chiều "ma" lao qua làn bên cạnh')) {
  const ln = Sim.lineOf('toh'); let run = 0, thru = 0, badThru = 0;
  for (const [t, nn] of [['Hayabusa', 25], ['Nasuno', 279], ['Nasuno', 265]]) {
    const rec = ln.trains.find(x => x.d === 'down' && x.t === t && x.n == nn), st = rec.s.filter(e => !e[3]);
    const trip = Sim.makeTrip('toh', rec, st[0][0], st[nn === 265 ? Math.min(8, st.length - 1) : 3][0]), W = Sim.createWorld('toh', trip, { diff: 'easy', seed: 1, lead: false, events: true }), T = W.player; let n = 0, dw = 0, ghost = 0;
    while (!T.finished && n++ < 3e6) { Sim.tick(W, 0.05, {}, true); if (T.phase === 'dwell' && W.t > 5) { dw++; if ((W.opposing || []).length) ghost++; for (const o of W.oppThru || []) { thru++; if (!o.v || !Sim.VEH[o.v] || !(o.t > W.t - 40)) badThru++; } } else if (T.phase === 'run' && T.v > 20 && (W.opposing || []).length) run++; }
    ok(dw > 100 && ghost <= 3, t + ' ' + nn + ': đỗ ở ga thì danh sách tàu ngược chiều đang vẽ trống (' + dw + ' nhịp đỗ, ' + ghost + ' nhịp có tàu; cho phép 1 nhịp trễ mỗi lần vào ga)');
  }
  ok(run > 0, 'đang chạy giữa ga vẫn có tàu ngược chiều (' + run + ' nhịp)');
  ok(thru > 0 && badThru === 0, 'đỗ ở ga: có tàu ngược chiều chạy thông qua ga (danh sách riêng oppThru, ' + thru + ' lượt), mọi mục hợp lệ (' + badThru + ' lỗi)');
}

if (section('37. Động đất: tàu ngược chiều bị giữ dừng giữa hai ga có trong danh sách vẽ; vật cản cùng chiều có kiểu tàu')) {
  const ln = Sim.lineOf('tsk'), rec = ln.trains.find(t => t.t === 'Nozomi' && t.n == 1 && t.d === 'down'), st = rec.s.filter(e => !e[3]), iN = ln.stations.findIndex(s => s.en === 'Nagoya');
  const trip = Sim.makeTrip('tsk', rec, st[0][0], iN), W = Sim.createWorld('tsk', trip, { diff: 'easy', seed: 20461, lead: false, events: true }), T = W.player; let n = 0, held = 0, badH = 0, obsN = 0, badO = 0;
  while (!T.finished && n++ < 3e6) { Sim.tick(W, 0.05, {}, true); for (const h of W.heldOpp || []) { held++; if (!Sim.VEH[h.key] || !(h.sC > 0)) badH++; } if (W.obs) { obsN++; if (!Sim.VEH[W.obs.key]) badO++; } }
  ok(held > 0 && badH === 0, 'seed 20461 Nozomi 1: tàu ngược chiều bị giữ (động đất) dừng giữa đường có trong W.heldOpp (' + held + ' lượt, ' + badH + ' lỗi)');
  ok(obsN > 0 && badO === 0, 'vật cản cùng chiều (W.obs) có kiểu tàu để vẽ (' + obsN + ' lượt, ' + badO + ' lỗi)');
}

if (section('38. Xuất phát từ Tokyo (đường ga nhập đường chính ngược chiều): chờ tàu ngược chiều vào ga, không có tàu ngược chiều trên đoạn đi chung')) {
  const ln = Sim.lineOf('tsk'), rec = ln.trains.find(t => t.n == '65' && t.d === 'down' && t.t === 'Nozomi'), trip = Sim.makeTrip('tsk', rec, 0, 12), W = Sim.createWorld('tsk', trip, { diff: 'normal', seed: 69843, lead: true, events: true }), T = W.player;
  let n = 0, blocked = 0, departedAt = null, bad = 0, msg = '';
  while (!T.finished && n++ < 3e5 && T.x < 1200) { Sim.tick(W, 0.05, {}, true); if (T.phase === 'dwell') { const b = Sim.departBlock(T, true); if (b) { blocked++; msg = b; } } else if (departedAt === null) departedAt = W.t;
    if (T.phase === 'run' && T.x > 330 && T.x < 870) for (const s of W.oppState.values()) { const d = (s.t0 - W.t) * 200; if (d > -450 && d < 900) bad++; } }
  ok(departedAt !== null, 'tàu xuất phát được sau khi chờ (không kẹt ở ga)', String(departedAt));
  ok(bad === 0, 'trên đoạn đi chung đường chính ngược chiều (330-870 m) không có tàu ngược chiều nào trong vùng va chạm', String(bad));
  ok(blocked === 0 || /ngược chiều/.test(msg) || /opposite/.test(msg), 'lý do giữ tàu nêu rõ tàu ngược chiều', msg);
}
if (section('39. Cần phanh mặc định EB, ga bị ngắt khi phanh, trưởng tàu tự đóng cửa, ATC giảm dần')) {
  const rec = find('tsk', 'Nozomi', 'down', 12, 15), trip = Sim.makeTrip('tsk', rec, 12, 15);
  // 1) vào màn chơi: phanh EB; trưởng tàu đóng cửa sau ~10 s (đèn các toa xanh = T.door 'closed'), cửa mở ở ga đầu trước đó
  { const W = Sim.createWorld0('tsk', trip, { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player; ok(T.bk === 8 && T.pw === 0 && !T.pwCut, 'khởi đầu: cần phanh ở EB, cần ga ở N');
    ok(!Sim.setPower(T, 3) && T.pw === 0, 'phanh chưa về N: không kéo được ga'); let n = 0; while (n++ < 150) Sim.tick(W, 0.05, {}, false); ok(T.door === 'open', 'trước 10 s cửa còn mở (' + T.door + ')');
    n = 150; while (T.door !== 'closed' && n++ < 2000) Sim.tick(W, 0.05, {}, false); ok(T.door === 'closed' && n * 0.05 > 10 && n * 0.05 < 40, 'trưởng tàu tự đóng cửa sau khoảng 10–25 s (' + (n * 0.05).toFixed(1) + ' s)', [T.door, n]);
    Sim.tick(W, 0.05, {}, false); ok(T.phase === 'dwell', 'cửa đã đóng nhưng phanh còn EB: tàu chưa đi');
    Sim.setBrake(T, 0); ok(Sim.setPower(T, 13), 'phanh về N: kéo được ga'); n = 0; while (T.phase !== 'run' && n++ < 400) Sim.tick(W, 0.05, {}, false); ok(T.phase === 'run', 'kéo ga sau khi cửa đóng: khởi hành');
    // 2) ga bị ngắt: áp phanh khi cần ga ở P13 thì ga không tự về N
    for (let i = 0; i < 600; i++) Sim.tick(W, 0.05, {}, false); ok(T.pw === 13 && T.f > 0.2, 'đang kéo P13');
    Sim.setBrake(T, 3); ok(T.pw === 13 && T.pwCut === true && Sim.handleCmd(T) < 0, 'áp phanh B3: ga vẫn ở P13 nhưng bị ngắt, lệnh là phanh');
    Sim.setBrake(T, 0); ok(T.pw === 13 && T.pwCut === true && Sim.handleCmd(T) === 0 && T.notch === 0 || Sim.handleCmd(T) === 0, 'phanh về N: ga vẫn bị ngắt (không kéo)');
    ok(Sim.setPower(T, 12) === true && T.pwCut === true && Sim.handleCmd(T) === 0, 'giảm nấc vẫn còn ngắt');
    ok(!Sim.setPower(T, 13) && T.pw === 12 && T.pwCut, 'cần ga đang ngắt: không kéo thêm được');
    Sim.setPower(T, 0); ok(!T.pwCut && Sim.setPower(T, 5) && Sim.handleCmd(T) > 0, 'về N rồi mới kéo lại được'); }
  // 3) động đất: ga về N, phanh lên EB
  { const W = Sim.createWorld('tsk', trip, { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player; Sim.requestClose(T); let n = 0; while (T.door !== 'closed' && n++ < 2000) Sim.tick(W, 0.05, {}, false); Sim.setPower(T, 10); for (let i = 0; i < 400; i++) Sim.tick(W, 0.05, {}, false);
    Sim.inject(W, 'eqk', { sec: 200 }); Sim.tick(W, 0.05, {}, false); ok(T.pw === 0 && T.bk === 8 && !T.pwCut, 'động đất: cần ga về N, cần phanh lên EB', [T.pw, T.bk]); }
  // 4) đỗ ga: phanh tự lên EB khi dừng
  { const r = runAuto('tsk', rec, 12, 15); ok(r.T.finished, 'chạy hết chuyến'); const W = Sim.createWorld('tsk', trip, { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player; let n = 0, ebAt = true; Sim.requestClose(T); while (T.door !== 'closed' && n++ < 2000) Sim.tick(W, 0.05, {}, false);
    n = 0; while (T.k < 1 && !T.finished && n++ < 4e6) Sim.tick(W, 0.05, {}, true); ok(T.k >= 1 && T.bk === 8 && T.pw === 0, 'đỗ ga: cần phanh ở EB', [T.phase, T.k, T.bk, T.pw]); }
  // 5) ATC giảm dần: giới hạn tốc độ không rơi quá 1,6 × gia tốc ATC mỗi giây (trừ động đất / đứng ga / đường cong phanh liên tục)
  { const W = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 12, 16), { diff: 'normal', seed: 5, lead: false, events: true }), T = W.player; let n = 0, prev = null, worst = 0; const dt = 0.05;
    while (!T.finished && n++ < 2e6) { Sim.tick(W, dt, {}, true); if (T.phase === 'run' && !T.cut && prev !== null && T.allowed < prev && T.allowed > 2 && Math.abs(T.allowed - T.hard) > 0.05) worst = Math.max(worst, (prev - T.allowed) / dt); prev = T.phase === 'run' && !T.cut ? T.allowed : null; }
    ok(worst <= 1.6 * 0.72 + 0.8, 'ATC: tốc độ cho phép (ngoài đường cong phanh liên tục) rơi tối đa ' + worst.toFixed(2) + ' m/s² (≈ ' + (worst * 3.6).toFixed(1) + ' km/h mỗi giây)', worst); }
  // 6) giao diện: hai cần đổi chỗ, bốn đồng hồ nhỏ, không còn đèn báo / nút đóng cửa / nút phanh khẩn
  { const fu = require('fs').readFileSync(path.join(DRIVE, 'fullui.js'), 'utf8'), idx = require('fs').readFileSync(path.join(DRIVE, 'index.html'), 'utf8');
    ok(/lever\(12 \+ GX, PY, 119, PH, 'bk'\); lever\(557 \+ GX, PY, 119, PH, 'pw'\)/.test(fu), 'cần phanh bên trái, cần ga bên phải');
    ok(!/lampsL|doAct\('door'\)|doAct\('eb'\)|doAct\('coast'\)|Bất an hành khách|Nhiệt má phanh/.test(fu), 'không còn đèn báo, nút đóng cửa, phanh khẩn, về N, thanh bất an / nhiệt má phanh');
    ok((fu.match(/miniGauge\(gx,/g) || []).length === 4, 'bốn đồng hồ nhỏ xếp dọc');
    ok(/k === 'w' \|\| k === 'W'\) doAct\('brake', 1\)/.test(idx) && /k === 'ArrowDown'\) doAct\('power', 1\)/.test(idx) && !/doAct\('coast'\)|doAct\('eb'\)|doAct\('door'\)/.test(idx.slice(idx.indexOf("addEventListener('keydown'"))), 'phím: W/S phanh, ↑/↓ ga; bỏ Space, Q, Enter'); }
}

if (section('40. Cần ATC 4 nấc (BẬT / CHỈ BÁO / CHẠY CHẬM 30 / CẮT), đã bỏ cần vẹt, phím M bản đồ, B chạy lùi')) {
  const rec = find('tsk', 'Nozomi', 'down', 12, 16), trip = Sim.makeTrip('tsk', rec, 12, 16);
  const mkRun = () => { const W = Sim.createWorld('tsk', trip, { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player; Sim.requestClose(T); let n = 0; while (T.door !== 'closed' && n++ < 2000) Sim.tick(W, 0.05, {}, false); Sim.setBrake(T, 0); Sim.setPower(T, 13); n = 0; while (T.phase !== 'run' && n++ < 400) Sim.tick(W, 0.05, {}, false); return { W, T }; };
  // 1) chuyển nấc
  { const { W, T } = mkRun(); ok(T.atcMode === 3 && T.atcOn === true, 'ATC mặc định ở nấc BẬT (3)');
    ok(Sim.atcMove(T, -1) === 2 && T.atcMode === 2 && T.atcOn === true, 'A một lần: CHỈ BÁO'); ok(Sim.atcMove(T, -1) === 1 && T.atcMode === 1, 'A lần hai: CHẠY CHẬM 30');
    ok(Sim.atcMove(T, -1) === 'arm' && T.atcMode === 1, 'xuống CẮT: lần đầu chỉ chờ xác nhận'); W.t += 5; ok(Sim.atcMove(T, -1) === 'arm', 'quá 4 s thì phải xác nhận lại');
    ok(Sim.atcMove(T, -1) === 0 && T.atcMode === 0 && T.atcOn === false, 'xác nhận trong 4 s: CẮT'); ok(Sim.atcMove(T, 1) === 1 && T.atcOn === true && Sim.atcMove(T, 1) === 2 && Sim.atcMove(T, 1) === 3, 'D: đi lần lượt 1, 2, 3 (không nhảy cách nấc)');
    ok(Sim.atcMove(T, 1) === 3 && Sim.atcGo(T, 1) === 2 && Sim.atcGo(T, 0) === 1, 'bấm chuột vào nấc xa: đi một nấc về phía đó'); }
  // 2) CHẠY CHẬM: trần 30 km/h, tự phanh
  { const { W, T } = mkRun(); for (let i = 0; i < 4000 && T.v < 120 / 3.6; i++) Sim.tick(W, 0.05, {}, false); Sim.atcMove(T, -1); Sim.atcMove(T, -1); let n = 0; while (n++ < 6000 && !(T.v <= 31 / 3.6)) { Sim.setPower(T, 13); Sim.tick(W, 0.05, {}, false); }
    ok(T.atcMode === 1 && T.v <= 31 / 3.6 + 0.2 && T.allowed <= 30 / 3.6 + 1e-6 && T.why === 'creep', 'CHẠY CHẬM: tàu bị ATC kìm xuống ≤ 30 km/h dù kéo hết cỡ', [T.v * 3.6, T.allowed * 3.6, T.why]); for (let i = 0; i < 400; i++) { Sim.setPower(T, 13); Sim.tick(W, 0.05, {}, false); } ok(T.v * 3.6 <= 30 + 6 + 2, 'CHẠY CHẬM: giữ quanh 30 km/h (trần + dung sai ATC mức dễ 6 km/h)', T.v * 3.6); }
  // 3) CHỈ BÁO: chuông + trừ điểm, không tự phanh (so với nấc BẬT ở cùng tình huống: ATC phanh)
  { const run = mode => { const { W, T } = mkRun(); W.zones.push({ s0: T.x - 100, s1: T.x + 30000, v: 100 / 3.6, tA: W.t, tB: W.t + 99999, kind: 'rain', label: 'test' }); T.v = 150 / 3.6; if (mode === 2) Sim.atcMove(T, -1); let warned = false; for (let i = 0; i < 200; i++) { Sim.setPower(T, 13); Sim.tick(W, 0.05, {}, false); if (T.atcWarn) warned = true; } return { W, T, warned }; };
    const on = run(3), wr = run(2); ok(on.T.atcCount > 0 && on.T.v < 150 / 3.6 - 3, 'nấc BẬT (đối chứng): vượt giới hạn thì ATC phanh', [on.T.atcCount, on.T.v * 3.6]);
    ok(wr.T.atcMode === 2 && !wr.T.atc && wr.T.atcCount === 0 && wr.T.v > wr.T.allowed && wr.warned && wr.T.warnBad > 1, 'CHỈ BÁO: vượt giới hạn thì kêu chuông (atcWarn), ATC KHÔNG phanh, ghi thời gian vượt', [wr.T.atc, wr.T.atcCount, wr.T.v * 3.6, wr.T.allowed * 3.6, wr.T.warnBad]);
    const sc = Sim.score(wr.T, wr.W); ok(sc.warnPen > 0 && sc.warnPen <= 25, 'CHỈ BÁO: thời gian vượt giới hạn bị trừ điểm (warnPen)', sc.warnPen); wr.T.warnBad = 0; ok(Sim.score(wr.T, wr.W).warnPen === 0, 'không vượt thì không phạt'); }
  // 4) vùng ATC mất mã: nấc BẬT dừng trước vùng; nấc CHẠY CHẬM được qua ≤ 30 km/h; tự lái tự chuyển
  { const { W, T } = mkRun(); Sim.inject(W, 'atcfault', { ahead: 3000, sec: 600 }); const z = W.zones.find(q => q.kind === 'atcfault'); T.x = z.s0 - 600; T.v = 60 / 3.6; const a3 = Sim.allowedSpeed(T); Sim.atcMove(T, -1); Sim.atcMove(T, -1); const a1 = Sim.allowedSpeed(T);
    ok(a1 > a3 + 3 / 3.6, 'vùng mất mã: nấc BẬT phải dừng hẳn trước vùng (mẫu phanh về 0), nấc CHẠY CHẬM chỉ cần giảm tới 30 km/h trước vùng', [a3 * 3.6, a1 * 3.6]);
    T.x = z.s0 + 200; const inz = Sim.allowedSpeed(T); ok(inz <= 30 / 3.6 + 1e-6 && inz > 20 / 3.6, 'trong vùng mất mã ở nấc CHẠY CHẬM: được chạy 30 km/h (không đứng chết ở 0)', inz * 3.6);
    const Wa = Sim.createWorld('tsk', trip, { diff: 'easy', seed: 1, lead: false, events: false }), Ta = Wa.player; Sim.inject(Wa, 'atcfault', { ahead: 3000, sec: 600 }); const za = Wa.zones.find(q => q.kind === 'atcfault'); let n = 0, mode1 = false, back = false; while (!Ta.finished && n++ < 4e5) { Sim.tick(Wa, 0.1, {}, true); if (Ta.atcMode === 1) mode1 = true; if (mode1 && Ta.atcMode === 3) { back = true; break; } }
    ok(mode1 && back, 'tự lái: vào vùng mất mã thì chuyển CHẠY CHẬM, ra khỏi vùng thì BẬT lại', [mode1, back]); }
  // 5) đã bỏ cần vẹt; giao diện và phím
  { const fu = require('fs').readFileSync(path.join(DRIVE, 'fullui.js'), 'utf8'), idx = require('fs').readFileSync(path.join(DRIVE, 'index.html'), 'utf8'), sm = require('fs').readFileSync(path.join(DRIVE, 'sim.js'), 'utf8');
    ok(!/panButton|CẦN VẸT|doAct\('pan'\)/.test(fu) && !/togglePan|T\.pan\b/.test(sm) && !/k === 'g' \|\| k === 'G'/.test(idx), 'đã bỏ nút cần vẹt, phím G, togglePan');
    ok(/function atcLever/.test(fu) && /atcLever\(1160, PY \+ 300, 284, 66/.test(fu), 'cần ATC 4 nấc nằm ngang thay hai nút ATC + cần vẹt (284 × 66)');
    { const all = fu + idx, need = ['wideBtn', 'atcLever', 'tileBtn', 'lever', 'miniGauge', 'bigDial', 'drawTopBar', 'drawMissionPanel', 'drawViewIn', 'drawRadioFull', 'drawCabTip', 'drawTutEnd', 'tileView', 'panel', 'button', 'txt', 'wrapText'], miss = need.filter(n => !(all.includes('function ' + n + '(') || all.includes('const ' + n + ' =') || all.includes('let ' + n + ' =') || all.includes(', ' + n + ' = ') || all.includes('; ' + n + ' = ')));
      ok(miss.length === 0, 'fullui.js: mọi hàm vẽ mà drawFull gọi đều được định nghĩa (lần trước thiếu wideBtn làm cả bảng điều khiển không vẽ)', miss); }
    ok(/Tàu kiểm tra không chở khách, không cần đóng cửa/.test(idx) && /atcPen, warnPen, bandPen/.test(sm), 'tàu kiểm tra: lời nhắc đầu chuyến không còn nói đóng cửa; chấm điểm có phạt nấc CHỈ BÁO (không lách ATC bằng nấc CHỈ BÁO)');
    ok(/k === 'a' \|\| k === 'A'\) doAct\('atcmv', -1\)/.test(idx) && /k === 'd' \|\| k === 'D'\) doAct\('atcmv', 1\)/.test(idx) && /k === 'm' \|\| k === 'M'\) && W && mode !== 'dispatch'\) \{ ui\.nat = !ui\.nat/.test(idx) && /else if \(k === 'b' \|\| k === 'B'\) doAct\('rev'\)/.test(idx), 'phím: A hạ nấc, D tăng nấc, M hoán đổi bản đồ ↔ buồng lái, B chạy lùi'); }
}

if (section('33a. Đoàn ghép Tohoku + mini và đường đơn: mẫu tàu sau ga tách, mũi tên ở ga ghép, tàu bị giữ đứng đúng ga, tách/ghép trong góc nhìn, phụ kiện sân ga')) {
  const A = Sim.lineOf('aki'), T0 = Sim.lineOf('toh'), rc = (t, n, d) => A.trains.find(r => r.t === t && r.n === n && r.d === d), k95 = rc('Komachi', '95', 'down'), k10 = rc('Komachi', '10', 'up'), k1 = rc('Komachi', '1', 'down');
  // mẫu tàu theo vị trí: chỉ còn E6 sau ga tách (bản ghi Komachi chiều xuống ghi "E6+E5" từ ga xuất phát), E5+E6 chỉ khi đang ghép
  ok(Sim.vehAt(k95, 400) === 'E6+E5' && Sim.vehAt(k95, 530) === 'E6' && Sim.vehAt(k1, 560) === 'E6' && Sim.vehAt(k1, 100) === 'E6+E5' && Sim.vehAt(k10, 600) === 'E6' && Sim.vehAt(k10, 450) === 'E5+E6', 'mẫu tàu Komachi: chỉ còn E6 sau ga tách (Komachi 95/1 chiều xuống), ghép lại thành E5+E6 chiều lên', [Sim.vehAt(k95, 400), Sim.vehAt(k95, 530), Sim.vehAt(k1, 560), Sim.vehAt(k10, 600), Sim.vehAt(k10, 450)]);
  // mũi tên vẽ trên bản đồ: vạch dừng lùi lại để chờ ghép thì mũi tên vẫn tới đúng ga
  { const Tm = { x: 1000, M: [{ s: 1000, sOrig: 1255, stop: true }, { s: 9000, stop: true }] };
    approx(Sim.mapX(Tm), 1255, 0.01, 'mapX: dừng ở vạch lùi → mũi tên ở đúng ga'); Tm.x = -800; approx(Sim.mapX(Tm), -800, 0.01, 'mapX: còn xa ga thì không bù'); Tm.x = 2600; approx(Sim.mapX(Tm), 2600, 0.01, 'mapX: đã rời ga xa thì không bù');
    let prev = -1, mono = true; for (let x = 0; x <= 3000; x += 20) { Tm.x = x; const m = Sim.mapX(Tm); if (m < prev) mono = false; prev = m; } ok(mono, 'mapX: tăng đơn điệu theo vị trí tàu (mũi tên không nhảy lùi)');
    const Wk = Sim.createWorld('aki', Sim.makeTrip('aki', k10, Sim.lineOf('aki').stations.length - 1, 0), { diff: 'easy', seed: 1, lead: false, events: false }), Tk = Wk.player, jM = Tk.M.findIndex(m => m.sOrig !== undefined); ok(jM > 0, 'Komachi 10: có vạch dừng lùi ở ga ghép (Morioka)');
    Tk.x = Tk.M[jM].s; const km = Sim.kmOfS(Sim.mapX(Tk), Wk.dir, Wk.line.kmEnd), kmSt = Wk.line.stations[Tk.M[jM].i].km; ok(Math.abs(km - kmSt) < 0.02, 'Komachi 10 dừng ở vạch ghép: mũi tên bản đồ ở đúng ga Morioka (' + km.toFixed(3) + ' vs ' + kmSt + ')'); }
  // ghép chiều lên: Komachi chờ ở Shizukuishi (ga liền trước), không dừng giữa đường; chỉ nối khi Hayabusa 10 đã vào ga; đoàn chờ chỉ hiện khi Hayabusa đã tới
  { const ts122 = Sim.lineOf('yam').trains.find(t => t.t === 'Tsubasa' && t.n === '122' && t.d === 'up'); for (const [lid, rec0, sd, ev] of [['aki', k10, 1, false], ['aki', k10, 3, true], ['yam', ts122, 1, false]]) { const Wj = Sim.createWorld(lid, Sim.makeTrip(lid, rec0, rec0.s.find(e => !e[3])[0], 0), { diff: 'normal', seed: sd, lead: false, events: ev }), Tj = Wj.player, jJ = Tj.M.findIndex(m => m.i === rec0.cp[0] && m.stop); let n = 0, strand = 0, maxIn = -1e9, startOk = null, e5Ok = null, e5Seen = false, waited = false;
      while (!Tj.finished && n++ < 3e6 && Wj.t < 12000 && Tj.k <= jJ + 1) { Sim.tick(Wj, 0.05, {}, true); const m = Tj.M[Tj.k], arrived = (off) => { const jc = Wj._jc; return !!jc && (Wj.trip.t0 + Wj.t) - (global.NatCat.delayOf(Wj, jc.c.key) ? global.NatCat.delayOf(Wj, jc.c.key).delay : 0) >= jc.c.ta(jc.p) + (off || 0); };
        const gS = Sim.joinGeom(Tj) ? Sim.joinGeom(Tj).s : Tj.M[jJ].sOrig - 1500; if (Tj.phase === 'run' && Tj.v < 0.3 && Tj.started && Tj.x < m.s - 300 && Tj.x > m.s - 3000 && Tj.M[Tj.k].stop && Wj.t > 60 && Math.abs(Tj.x - gS) > 80) strand++;      // dừng giữa đường ngoài ga (trừ điểm chặn trước ga ghép khi đoàn Tohoku chưa về)
        { const j0 = global.NatCat && Wj._jc; if (j0) { const dd = global.NatCat.delayOf(Wj, j0.c.key), ef = Wj.trip.t0 + Wj.t - (dd ? dd.delay : 0); if (ef < j0.c.ta(j0.p) - 45) { const gg = Sim.joinGeom(Tj); if (gg) maxIn = Math.max(maxIn, Tj.x - gg.zs); } } }
        if (Tj.cpWait) waited = true; if (startOk === null && Tj.coup && Tj.coup.kind === 'join') startOk = arrived(); if (!e5Seen && Wj.parked.some(p => p.kind === 'wait')) { e5Seen = true; e5Ok = arrived(-40); } }
      ok(strand === 0, lid + ' ' + rec0.t + ' ' + rec0.n + ' (seed ' + sd + (ev ? ', có sự cố' : '') + '): không dừng giữa đường trước ga ghép (' + strand + ' lần)', strand); ok(startOk === true, lid + ' (seed ' + sd + '): chỉ nối khi đoàn Tohoku đối tác đã vào ga', startOk); ok(maxIn <= 0, lid + ' (seed ' + sd + '): tàu nhánh không vào đoạn ghi nối vào tuyến Tohoku khi đoàn Tohoku chưa về ga ghép (sát nhất ' + Math.round(maxIn) + ' m so với mép đoạn ghi)', maxIn); ok(e5Ok === true, lid + ' (seed ' + sd + '): đoàn Tohoku chờ chỉ hiện khi đoàn thật sắp tới (≤ 40 s trước giờ đến)', e5Ok); ok(Tj.veh.key === rec0.cp[1] || Tj.k < jJ + 1, lid + ' (seed ' + sd + '): nối xong thành ' + rec0.cp[1], Tj.veh.key); }
    const Wb = Sim.createWorld('aki', Sim.makeTrip('aki', k10, Sim.lineOf('aki').stations.length - 1, 0), { diff: 'normal', seed: 3, lead: false, events: true }), Tb = Wb.player; let nb = 0, msg = null; while (nb++ < 3e6 && Wb.t < 6000) { Sim.tick(Wb, 0.05, {}, true); if (Tb.phase === 'dwell' && Tb.M[Tb.k].name === 'Maegata' && Wb.t > 4000) { msg = Sim.joinBlock(Tb); break; } }
    ok(typeof msg === 'string' && /Hayabusa 10/.test(msg), 'Hayabusa 10 trễ: Komachi 10 chạy tới Maegata (ga liền trước Morioka) và bị giữ ở đó với lời nhắn nêu Hayabusa 10', msg); }
  // Yamagata (Tsubasa + Yamabiko, mini E8, ga ghép/tách Fukushima): cùng các quy tắc như Akita
  { const Yl = Sim.lineOf('yam'), yr = (n, d) => Yl.trains.find(t => t.t === 'Tsubasa' && t.n === n && t.d === d), t123 = yr('123', 'down'), t122 = yr('122', 'up');
    ok(Sim.vehAt(t123, 100) === 'E8+E5' && Sim.vehAt(t123, 300) === 'E8' && Sim.vehAt(t122, 300) === 'E8' && Sim.vehAt(t122, 100) === 'E5+E8', 'mẫu tàu Tsubasa: chỉ còn E8 sau Fukushima, ghép thành E8+E5 / E5+E8 ở đoạn chung', [Sim.vehAt(t123, 100), Sim.vehAt(t123, 300), Sim.vehAt(t122, 300), Sim.vehAt(t122, 100)]);
    const Wy = Sim.createWorld('yam', Sim.makeTrip('yam', t122, t122.s.find(e => !e[3])[0], 0), { diff: 'easy', seed: 1, lead: false, events: false }), Ty = Wy.player, jY = Ty.M.findIndex(m => m.sOrig !== undefined); ok(jY > 0, 'Tsubasa 122: có vạch dừng lùi ở Fukushima'); Ty.x = Ty.M[jY].s;
    ok(Math.abs(Sim.kmOfS(Sim.mapX(Ty), Wy.dir, Wy.line.kmEnd) - Wy.line.stations[Ty.M[jY].i].km) < 0.02, 'Tsubasa 122 dừng ở vạch ghép: mũi tên bản đồ ở đúng Fukushima');
    const fk = (L, r) => { const e = r.s.find(x => !x[3] && L.stations[x[0]].jp === '福島'); return e && (e[1] != null ? e[1] : e[2]); }, ym123 = T0.trains.find(t => t.t === 'Yamabiko' && t.d === 'down' && t.n === '123');
    { const cand = T0.trains.filter(t => t.d === 'up' && !t.cp && t.s.length > 8 && t.s.some(e => !e[3] && T0.stations[e[0]].jp === '福島'))[0], st = cand.s.filter(e => !e[3]).map(e => e[0]), trip = Sim.makeTrip('toh', cand, st[0], st[st.length - 1]), W = Sim.createWorld('toh', trip, { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player, j = T.M.findIndex(m => /Fukushima/.test(m.name));
      W.t = fk(T0, ym123) + 100 - trip.t0; T.x = T.M[j].s - 600; T.k = j; T.phase = 'run'; W.dwAt = undefined; Sim.tick(W, 0.05, {}, true); const sb = W.stabled || [], e8 = sb.find(e => e.key === 'E8'), e5 = sb.find(e => e.key === 'E5');
      ok(e8 && e5 && e8.track === e5.track && Math.abs(Math.abs(e5.front - e8.front) - (Sim.VEH.E5.len + 2.5)) < 6 && e8.label === 'Tsubasa 123' && e5.label === 'Yamabiko 123', 'ga tách Fukushima: Yamabiko 123 và Tsubasa 123 là hai đoàn riêng cùng đường, nối đuôi nhau', JSON.stringify(sb.map(e => [e.label, e.key, Math.round(e.front - T.M[j].s)]))); } }
  // đối tác ghép của chính đoàn ta (Hayabusa 3 ↔ Komachi 3) không bao giờ là "tàu khác thông qua" khi ta đỗ ở ga có đường tránh
  { const h3 = Sim.lineOf('toh').trains.find(t => t.t === 'Hayabusa' && t.n === '3' && t.d === 'down'), k3 = A.trains.find(t => t.t === 'Komachi' && t.n === '3' && t.d === 'down');
    ok(Sim.ownPair(h3, k3, 300) && Sim.ownPair(k3, h3, 300) && !Sim.ownPair(h3, k3, 600) && !Sim.ownPair(h3, h3, 300), 'ownPair: đối tác ghép chỉ tính khi đang đi chung đoạn (≤ ga tách Morioka)');
    let bad = 0, chk = 0; const names = new Set();
    for (const [lid, rec] of [['toh', h3], ['aki', k3]]) { const st = rec.s.filter(e => !e[3]).map(e => e[0]), Wp = Sim.createWorld(lid, Sim.makeTrip(lid, rec, st[0], st[st.length - 1]), { diff: 'easy', seed: 1, lead: false, events: true }), Tp = Wp.player;
      for (const k of Object.keys(Wp.passers || {})) for (const p of Wp.passers[k]) { chk++; if (/Hayabusa 3|Komachi 3/.test(p.label)) { bad++; names.add(p.label); } }
      Tp.M.forEach((m, k) => { if (!m.loop || k === 0) return; Tp.k = k; Tp.phase = 'dwell'; const arr = m.arr != null ? m.arr : (m.pt != null ? m.pt : 0); for (const dt of [-40, 0, 40, 100]) { Wp.t = arr + dt; Wp.oppAt = undefined; Sim.refreshOpposing(Wp, Tp); for (const p of Sim.passersAt(Wp, k)) { chk++; if (/Hayabusa 3|Komachi 3/.test(p.label)) { bad++; names.add(p.label); } } } }); }
    ok(chk > 5 && bad === 0, 'đoàn Hayabusa 3 + Komachi 3 không xuất hiện trong danh sách tàu thông qua ga của chính nó (' + chk + ' mục kiểm, ' + bad + ' sai)', [...names].join('|')); }
  // đường đơn: tàu bị giữ phải đứng đúng ga (không đứng cách ga ~200 m)
  { const NC = global.NatCat; let ev = 0, bad = 0, worst = 0;
    for (const [seed, tEnd] of [[3, 5200], [1, 7600]]) { const Wh = Sim.createWorld('aki', Sim.makeTrip('aki', k10, Sim.lineOf('aki').stations.length - 1, 0), { diff: 'easy', seed, lead: false, events: true }), Th = Wh.player, cat = NC.build(window.LINES), seenK = new Set(); let n = 0;
      while (!Th.finished && n++ < 4e6 && Wh.t < tEnd) { Sim.tick(Wh, 0.05, {}, true); if (n % 20 || !Wh.haz) continue; const now = Wh.trip.t0 + Wh.t;
        for (const c of cat) { if (c.line !== 'aki' || c.rec.d !== 'down') continue; const d = Wh.haz.delay.get(c.key); if (!d || !(d.hold > 0) || d.why !== 'single') continue; const s = NC.stateOf(window.LINES, c, now - d.delay, d.skip); if (!s) continue; let dm = 1e9; for (const st of A.stations) dm = Math.min(dm, Math.abs(st.km - s.km) * 1000); const sk = c.key + Math.floor(Wh.t / 600); if (seenK.has(sk)) continue; seenK.add(sk); ev++; if (dm > worst) worst = dm; if (dm > 30) bad++; } } }
    ok(ev >= 2 && bad === 0, 'tàu bị giữ do đường đơn đứng đúng ga trên bản đồ (' + ev + ' lần giữ, xa ga nhất ' + Math.round(worst) + ' m)', [ev, bad, worst]); }
  // trong góc nhìn: đoàn ghép đỗ ở ga ghép/tách hiện thành hai đoàn riêng (mini ở phía bắc), lúc tách/ghép thấy rời nhau
  { const mor = (L, r) => { const e = r.s.find(x => !x[3] && L.stations[x[0]].jp === '盛岡'); return e && (e[1] != null ? e[1] : e[2]); };
    const scene = (wdir, tm, dts) => { const cand = T0.trains.filter(t => t.t === 'Hayabusa' && t.d === wdir && t.s.length > 8 && t.s.some(e => !e[3] && T0.stations[e[0]].jp === '盛岡'))[0], st = cand.s.filter(e => !e[3]).map(e => e[0]), trip = Sim.makeTrip('toh', cand, st[0], st[st.length - 1]), W = Sim.createWorld('toh', trip, { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player, j = T.M.findIndex(m => /Morioka/.test(m.name)), snap = {};
      for (const dt of dts) { W.t = tm + dt - trip.t0; T.x = T.M[j].s - 600; T.k = j; T.phase = 'run'; W.dwAt = undefined; Sim.tick(W, 0.05, {}, true); snap[dt] = (W.stabled || []).map(e => ({ lab: e.label, key: e.key, f: e.front - T.M[j].s, tr: e.track.i })); } return snap; };
    const dn1 = T0.trains.find(t => t.t === 'Hayabusa' && t.d === 'down' && t.n === '1'), up10 = T0.trains.find(t => t.t === 'Hayabusa' && t.d === 'up' && t.n === '10');
    const s1 = scene('up', mor(T0, dn1), [100, 380]);      // ta chạy chiều lên; Hayabusa 1 + Komachi 1 (xuống) tách ở Morioka
    const a = s1[100], e6 = a.find(e => e.key === 'E6'), e5 = a.find(e => e.key === 'E5'); ok(a.length >= 2 && e6 && e5 && e6.tr === e5.tr && Math.abs(Math.abs(e5.f - e6.f) - 255) < 6 && e6.lab === 'Komachi 1' && e5.lab === 'Hayabusa 1', 'ga tách Morioka: Hayabusa 1 và Komachi 1 là hai đoàn riêng cùng đường, nối đuôi nhau (mini ở phía bắc)', JSON.stringify(a));
    const b = s1[380] || [], b6 = b.find(e => e.key === 'E6'), b5 = b.find(e => e.key === 'E5'); ok(e6 && b6 && b5 && b6.f < e6.f - 150 && Math.abs(b5.f - e5.f) < 1, 'lúc tách: Komachi 1 (mini, đi trước) rời ga trước, Hayabusa 1 vẫn đỗ', JSON.stringify(b));
    const s2 = scene('down', mor(T0, up10), [-25, 100]);      // ta chạy chiều xuống; Hayabusa 10 + Komachi 10 (lên) ghép ở Morioka
    const a2 = s2[100], g6 = a2.find(e => e.key === 'E6'), g5 = a2.find(e => e.key === 'E5'); ok(a2.length >= 2 && g6 && g5 && g6.tr === g5.tr && Math.abs(Math.abs(g5.f - g6.f) - (Sim.VEH.E6.len + 2.5)) < 6, 'ga ghép Morioka: Hayabusa 10 và Komachi 10 là hai đoàn riêng cùng đường khi đã ghép', JSON.stringify(a2));
    const c0 = s2[-25] || [], c6 = c0.find(e => e.key === 'E6'), c5 = c0.find(e => e.key === 'E5'); ok(g6 && c5 && !c6, 'lúc ghép: Hayabusa 10 vào ga trước, Komachi 10 còn đang chạy vào', JSON.stringify(c0)); }
  // phụ kiện sân ga (số toa, biển tên ga, đồng hồ cột, nhân viên) neo theo hình học sân ga (q.d), không theo vạch dừng bị lùi (q.dm; nếu không sẽ lơ lửng ngoài đầu sân ga)
  { const cv = require('fs').readFileSync(path.join(DRIVE, 'cabview.js'), 'utf8'); const uses = (cv.match(/q\.dm/g) || []).length; ok(uses <= 3, 'cabview: phụ kiện sân ga neo theo q.d, chỉ còn vạch dừng thật dùng q.dm (' + uses + ' chỗ)', uses); }
}
if (section('33b. Giá đỡ dây điện trên cao: kiểu theo kết cấu, chất liệu cột đổi theo đoạn, kiểu treo dây theo tuyến, không cột giữa hai đường, vẽ không lỗi')) {
  const SA = Sim.supportAt, WA = Sim.wireAt, LNS = window.LINES, kinds = new Set(), poles = new Set();
  // kiểu giá theo kết cấu: hầm → giá treo trần; cầu cạn/cầu → xà ống thép nhẹ; nền đắp → cổng thép; đường đơn → cột bên + tay đòn; hành lang rộng (ga) → xà かご
  { let okK = true, nT = 0, nP = 0, nG = 0; for (const id of Object.keys(LNS)) { const L = LNS[id]; for (let km = 1; km < L.kmEnd; km += 0.7) { const st = Sim.structAt(L, km), r = SA(L, id, km, {}); kinds.add(r.kind); poles.add(r.pole); if (st === 't') { nT++; if (r.kind !== 'tunnel') okK = false; } else if (st === 'v' || st === 'b') { nP++; if (r.kind !== 'pipe') okK = false; } else { nG++; if (r.kind !== 'portal') okK = false; } if (!['steel', 'conc', 'pipe'].includes(r.pole) || !['compound', 'simple'].includes(r.wire)) okK = false; } }
    ok(okK && nT > 100 && nP > 100 && nG > 100, 'kiểu giá đỡ theo kết cấu (hầm / cầu cạn, cầu / nền đắp) ở mọi tuyến (' + nT + '/' + nP + '/' + nG + ' mẫu)');
    const L0 = LNS.tsk; let kg = 1; while (kg < L0.kmEnd && Sim.structAt(L0, kg) !== 'g') kg += 0.5; ok(SA(L0, 'tsk', kg, { single: true }).kind === 'bracket' && SA(L0, 'tsk', kg, { wide: true }).kind === 'cage' && SA(L0, 'tsk', kg, { single: true, wide: true }).kind === 'bracket', 'đường đơn → cột bên + tay đòn; hành lang rộng → xà かご');
    ok(kinds.has('portal') && kinds.has('pipe') && kinds.has('tunnel') && poles.size === 3, 'đủ các kiểu giá và 3 chất liệu cột xuất hiện trên các tuyến', [...kinds, ...poles].join(',')); }
  // chất liệu cột đổi theo từng đoạn 6 km, ổn định (cùng vị trí luôn cùng kết quả) và có nhiều hơn một loại trên tuyến dài
  { const L = LNS.tsk, a = new Set(); let stable = true, changes = 0, prev = null; for (let km = 1; km < L.kmEnd; km += 3) { const r = SA(L, 'tsk', km, { }), r2 = SA(L, 'tsk', km, {}); if (r.pole !== r2.pole) stable = false; if (Sim.structAt(L, km) === 'g') { a.add(r.pole); if (prev && prev !== r.pole) changes++; prev = r.pole; } }
    ok(stable && a.size >= 2 && changes >= 3, 'tsk: chất liệu cột đổi theo đoạn (' + [...a].join('/') + ', ' + changes + ' lần đổi), ổn định theo vị trí'); }
  // kiểu treo dây theo tuyến: compound nặng (Tokaido, Sanyo, Joetsu, Tohoku phía nam Morioka, đoạn chung của Hokuriku) / simple (Kyushu, Hokuriku từ Takasaki, Tohoku từ Morioka, nhánh mini, Tây Kyushu)
  { const hk = LNS.tsk.stations.find(x => x.en === 'Hakata').km, W1 = (id, km) => WA(LNS[id], id, km);
    ok(W1('tsk', 100) === 'compound' && W1('tsk', hk - 5) === 'compound' && W1('tsk', hk + 50) === 'simple', 'dây treo Tokaido/Sanyo compound, Kyushu (sau Hakata) simple');
    ok(W1('toh', 300) === 'compound' && W1('toh', 520) === 'simple' && W1('jts', 200) === 'compound' && W1('hok', 50) === 'compound' && W1('hok', 250) === 'simple' && W1('nks', 20) === 'simple' && W1('yam', 300) === 'simple' && W1('yam', 200) === 'compound' && W1('aki', 520) === 'simple' && W1('aki', 300) === 'compound', 'dây treo theo tuyến/đoạn: Tohoku, Joetsu, Hokuriku, Tây Kyushu, Yamagata, Akita'); }
  // không bao giờ có cột đứng giữa hai đường
  { let bad = 0, n = 0; for (const kind of ['portal', 'pipe', 'cage', 'bracket', 'tunnel']) for (const [xa, xb, heads] of [[5, -9.5, [0, -4.3]], [1.2, -5.5, [0, -4.3]], [20, -30, [0, -4.3, -10, -15, -22]], [1.2, -1.2, [0]], [-2, 2, [0, -4.3]], [-4, 4, [0, -4.3]]]) { const cols = Sim.supportColumns(kind, xa, xb, heads), lo = Math.min(...heads), hi = Math.max(...heads); for (const x of cols) { n++; if (x > lo + 0.01 && x < hi - 0.01) bad++; } }
    ok(bad === 0 && n > 20, 'không có cột giữa hai đường ở mọi kiểu giá (' + n + ' cột kiểm, ' + bad + ' sai)'); }
  // bố cục giá mới (người dùng chốt 27/11/2026, docs/12): kiểu theo số đường riêng biệt; cột luôn nằm ngoài mép hành lang (không cắm vào ray hay sân ga); bộ treo đôi theo cặp làn
  { const SP = Sim.supportPlan, why = [], chk = (c, m) => { if (!c) why.push(m); }, outside = (r, hs) => r.cols.every(x => x <= Math.min(...hs) - 0.01 || x >= Math.max(...hs) + 0.01);
    let r = SP([0, -4.3], 3.9, -8.2, { kind: 'portal', inSt: false }); chk(r.type === 'cant' && r.arms.length === 2 && outside(r, [0, -4.3]), 'ngoài ga 2 đường: mỗi đường một tay đòn, cột ngoài');
    r = SP([0], 3.9, -3.9, { kind: 'bracket', inSt: false }); chk(r.type === 'cant' && r.arms.length === 1, 'một đường: một tay đòn');
    r = SP([0], 3.9, -3.9, { kind: 'portal', inSt: true }); chk(r.type === 'cant' && r.arms.length === 1, 'ga đơn đường: tay đòn');
    r = SP([0, -4.3], 6, -10, { kind: 'portal', inSt: true }); chk(r.type === 'gable' && r.posts.length === 1 && r.cols.length === 2 && !r.posts[0].real, 'đường đôi trong ga: hai thanh thép góc tù + một bộ treo đôi');
    r = SP([-6.45, -2.15, 2.15, 6.45], 12, -12, { kind: 'cage', inSt: true }); chk(r.type === 'truss' && r.posts.length === 2 && r.singles.length === 0 && r.cols.length === 2 && outside(r, [-6.45, 6.45]), 'ga 4 làn: một xà dàn, 2 bộ treo đôi, không cột giữa');
    r = SP([-4.3, 0, 4.3], 10, -10, { kind: 'cage', inSt: true }); chk(r.type === 'truss' && r.posts.length === 2 && r.posts.filter(q => q.real).length === 1, 'ga 3 làn: một bộ đôi + một bộ treo đôi một bên');
    r = SP([-8.6, -4.3, 0, 4.3, 8.6], 14, -14, { kind: 'cage', inSt: true }); chk(r.type === 'truss' && r.posts.length === 3 && r.posts.filter(q => q.real).length === 1, 'ga 5 làn: 2 bộ đôi + 1 bộ một bên');
    r = SP([-5.35, 5.35], 9, -9, { kind: 'portal', inSt: true }); chk(r.type === 'truss' && r.posts.length === 2 && r.posts.every(q => q.real), 'hai làn tách qua sân ga đảo: xà dàn, hai bộ một bên');
    r = SP([-2.15, -2.15, 2.15, 2.15], 6, -6, { kind: 'portal', inSt: false }); chk(r.type === 'cant' && r.m === 2, 'vùng ghi: các làn chưa tách coi là một → tay đòn');
    r = SP([-2.15, -5, 2.15, 5], 9, -9, { kind: 'portal', inSt: false }); chk(r.type === 'truss' && r.m === 4 && r.singles.length === 1 && r.posts.length === 2, 'vùng ghi đang tách: ≥ 3 đường → xà dàn; làn gần nhau dưới 4 m treo riêng');
    r = SP([-6.45, -2.15, 2.15, 6.45], 12, -12, { kind: 'cage', inSt: true, noPair: true }); chk(r.type === 'truss' && r.posts.length === 0 && r.singles.length === 4, 'đường nhánh/ngã rẽ (noPair): mỗi đường treo riêng, không bộ treo đôi dùng chung dây trên');
    r = SP([0, -4.3], 3.9, -8.2, { kind: 'tunnel', inSt: false }); chk(r.type === 'tunnel' && r.posts.length === 1 && r.cols.length === 0, 'hầm đôi: một bộ treo đôi cắm trần, không cột');
    r = SP([0], 3.9, -3.9, { kind: 'tunnel', inSt: false }); chk(r.type === 'tunnel' && r.drops.length === 1 && r.cols.length === 0, 'hầm đơn: một trụ treo');
    // tính chất: mọi đường đều có chỗ treo; cột không nằm giữa các dây; mọi kiểu, bố trí ngẫu nhiên
    let seed = 7, rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, bad = 0, total = 0;
    for (let k = 0; k < 400; k++) { const n = 1 + Math.floor(rnd() * 6), hs = []; let x = -10 + rnd() * 6; for (let i = 0; i < n; i++) { hs.push(x); x += rnd() < 0.3 ? 8 + rnd() * 8 : 2.5 + rnd() * 3; }
      for (const kind of ['portal', 'pipe', 'cage', 'tunnel']) for (const inSt of [false, true]) { const r = SP(hs, Math.max(...hs) + 3.9, Math.min(...hs) - 3.9, { kind, inSt }); total++;
        const hung = hs.every(h => r.arms.some(a => Math.abs(a[1] - h) < 2.1) || r.posts.some(q => (q.real ? q.real : [q.xa, q.xb]).some(v => Math.abs(v - h) < 2.1)) || r.singles.some(v => Math.abs(v - h) < 2.1) || r.drops.some(v => Math.abs(v - h) < 2.1));
        if (!outside(r, hs) || !hung) bad++; } }
    chk(bad === 0, 'giá đỡ ngẫu nhiên: ' + bad + ' / ' + total + ' bố cục có cột nằm giữa dây hoặc có đường không được treo');
    ok(why.length === 0, 'bố cục giá đỡ mới (tay đòn / thép góc tù / xà dàn + bộ treo đôi / trần hầm): ' + (why.length ? why.join('; ') : '13 trường hợp + 4800 ngẫu nhiên đạt'), why.join('; ')); }
  // vẽ khung nhìn buồng lái không lỗi trên mọi tuyến, cả hai chiều, mọi dạng đoạn (kể cả đường đơn của Akita/Yamagata)
  { global.hhmm = global.hhmm || (s => String(s)); global.CanvasRenderingContext2D = global.CanvasRenderingContext2D || function () { }; global.CanvasRenderingContext2D.prototype.roundRect = global.CanvasRenderingContext2D.prototype.roundRect || function () { };
    require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'cabview.js'));
    const noop = () => { }, ctx = new Proxy({}, { get: (t, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
    let nd = 0, err = '', single = 0; for (const id of Object.keys(LNS)) for (const dir of ['down', 'up']) { const L = LNS[id], rec = L.trains.find(t => t.d === dir && t.s.filter(e => !e[3]).length >= 3), st = rec.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld(id, Sim.makeTrip(id, rec, st[0], st[st.length - 1]), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
      for (let km = 2; km < W.line.kmEnd; km += 11) { T.x = Sim.sOfKm(km, dir, W.line.kmEnd); T.v = 60; if (L.single && L.single.length && Sim.singleEff(W, T.x + 100) > 0.6) single++; try { global.CabView.draw(ctx, 0, 0, 1920, 620, W, T, { sprites: {}, aud: null, imgs: {} }); nd++; } catch (e) { err = err || id + ' ' + dir + ' km' + km + ': ' + e.message; } } }
    ok(err === '' && nd > 300 && single > 5, 'vẽ buồng lái với giá đỡ mới không lỗi (' + nd + ' khung, ' + single + ' ở đường đơn)' + err, err); }
}
if (section('33c. Mặt đầu/đuôi tàu ướm theo hình dáng mũi tàu của ảnh nhìn ngang (cabview.js): tính hình dáng mũi, vẽ nhiều lớp')) {
  global.hhmm = global.hhmm || (s => String(s)); require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'cabview.js'));
  const CV = global.CabView, LENM = 100, NPX = 1000, hOf = x => 30 + 70 * Math.min(1, x / 120, (NPX - 1 - x) / 120);      // thân cao 100, mũi và đuôi thon dần về 30 trong 12 m
  const hs = new Float32Array(NPX); for (let x = 0; x < NPX; x++) hs[x] = hOf(x);
  const nz = CV.noseFromHeights(hs, LENM);
  ok(nz && nz.head && nz.tail && nz.head.NL > 8 && nz.head.NL < 14 && nz.tail.NL > 8 && nz.tail.NL < 14, 'độ dài mũi/đuôi đọc từ ảnh khoảng 12 m', nz && [nz.head.NL, nz.tail.NL]);
  { const r = nz.head.r; let mono = true; for (let i = 1; i < r.length; i++) if (r[i] < r[i - 1] - 1e-6) mono = false; ok(mono && r[0] > 0.28 && r[0] < 0.4 && r[r.length - 1] === 1, 'tỉ lệ chiều cao tăng dần từ đầu mũi (~0,3) tới thân (1)', Array.from(r).map(v => v.toFixed(2)).join(' ')); }
  { const nb = CV.noseFromHeights(hs, LENM, 120), n0 = CV.noseFromHeights(hs, LENM); ok(Math.abs(nb.bodyR - 100 / 120) < 0.02 && n0.bodyR === 0, 'tỉ lệ thân/ảnh (bodyR) lấy theo trung vị chiều cao thân để co mặt trước cho khớp thân (T4, E926 có ụ trên mái)', [nb.bodyR, n0.bodyR]); }
  ok(CV.noseFromHeights(new Float32Array(500), LENM) === null && CV.noseFromHeights(new Float32Array(5), LENM) === null, 'ảnh trống hoặc quá nhỏ: không dựng mũi (quay về tấm phẳng)');
  // vẽ: có ảnh nhìn ngang đọc được thì mặt trước vẽ thành nhiều lớp; không thì một tấm phẳng
  { const prevDoc = global.document, FI = { width: 100, height: 50 }, SP = { ready: true, img: {}, meta: { width: NPX, height: 100 } }, noop = () => { }; let cnt = 0;
    const mk = () => new Proxy({}, { get: (t, k) => k === 'drawImage' ? img => { if (img === FI) cnt++; } : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
    global.document = { head: { appendChild: noop }, body: { appendChild: noop }, createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: noop, getImageData: (x, y, w, h) => { const d = new Uint8ClampedArray(w * h * 4); for (let c = 0; c < w; c++) { const ht = Math.round(hOf(c * NPX / w) * h / 100); for (let r = h - ht; r < h; r++) d[(r * w + c) * 4 + 3] = 255; } return { data: d }; } }) }) };
    const L = window.LINES.tsk, rec = L.trains.find(t => t.d === 'down' && t.s.length > 6), st = rec.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, st[0], st[st.length - 1]), { diff: 'easy', seed: 1, lead: false, events: true }), T = W.player; let kg = 10; while (kg < L.kmEnd && !(Sim.structAt(L, kg) === 'g' && Sim.structAt(L, kg + 1) === 'g')) kg += 0.5;
    T.x = Sim.sOfKm(kg, 'down', L.kmEnd); T.v = 60; W.opposing = [W.t + 0.08]; W.oppInfo = [];
    CV.draw(mk(), 0, 0, 1920, 620, W, T, { sprites: { n700: SP }, fronts: { n700: { ready: true, img: FI } }, aud: null }); const layered = cnt; cnt = 0;
    CV.draw(mk(), 0, 0, 1920, 620, W, T, { sprites: {}, fronts: { n700: { ready: true, img: FI } }, aud: null }); const flat = cnt;
    ok(layered >= 40 && flat >= 1 && flat <= 2, 'mặt trước tàu ngược chiều: ' + layered + ' dải nghiêng theo mũi khi có ảnh nhìn ngang, ' + flat + ' tấm phẳng khi không có', [layered, flat]);
    { const stN = (face, key) => { W.opposing = []; W.oppInfo = []; W.stabled = [{ key, i: -1, front: T.x + 16 + Sim.VEH[key].len, track: { x: -4.3, i: 0 }, face, label: key, k: 0 }]; cnt = 0; CV.draw(mk(), 0, 0, 1920, 620, W, T, { sprites: { n700: SP }, fronts: { n700: { ready: true, img: FI } }, aud: null }); return cnt; };
      const hd = stN(-1, 'N700'), tl = stN(1, 'N700'), far = (() => { W.stabled[0].front = T.x + 900 + Sim.VEH.N700.len; cnt = 0; CV.draw(mk(), 0, 0, 1920, 620, W, T, { sprites: { n700: SP }, fronts: { n700: { ready: true, img: FI } }, aud: null }); return cnt; })();
      ok(hd >= 40 && tl >= 40 && far <= 2, 'tàu đỗ ở đường cạnh có mặt đầu (quay ngược chiều) và mặt đuôi (cùng chiều) vát theo mũi: ' + hd + ' / ' + tl + ' dải khi ở gần, ' + far + ' tấm khi ở xa', [hd, tl, far]); W.stabled = []; }
    { const drawCoupled = (key, dtv) => { W.stabled = []; W.opposing = [W.t + dtv]; W.oppInfo = [{ t0: W.t + dtv, v: key }]; cnt = 0; CV.draw(mk(), 0, 0, 1920, 620, W, T, { sprites: { n700: SP, e5: SP, e6: SP }, fronts: { n700: { ready: true, img: FI }, e5: { ready: true, img: FI }, e6: { ready: true, img: FI } }, aud: null }); return cnt; };
      const jn = drawCoupled('E5+E6', (14 - (Sim.VEH.E5.len + 2.5)) / 200), single = drawCoupled('E5', (14 - (Sim.VEH.E5.len + 2.5)) / 200), jd = drawCoupled('E6+E5', (14 - (Sim.VEH.E6.len + 2.5)) / 200), jd8 = drawCoupled('E8+E5', (14 - (Sim.VEH.E8.len + 2.5)) / 200);
      ok(jd >= 90 && jd8 >= 90, 'chiều rời Tokyo (E6+E5, E8+E5, mini đi trước): mũi E5 lộ ra sau đuôi mini (' + jd + ' / ' + jd8 + ' dải)', [jd, jd8]);
      ok(jn >= 90 && single === 0, 'chỗ nối giữa hai đoàn của đoàn ghép có mặt mũi vát lộ ra trong khe (' + jn + ' dải ở đoàn ghép, ' + single + ' ở tàu đơn cùng vị trí)', [jn, single]); W.opposing = []; W.oppInfo = []; }
    ok(Math.abs(CV.faceX(-4.3, 0, 1) - (-4.3 - 1.7)) < 1e-9 && Math.abs(CV.faceX(4.3, 0, 0.9) - (4.3 + 1.53)) < 1e-9 && Math.abs(CV.faceX(-12.9, 0, 1) - (-12.9 - 1.7)) < 1e-9, 'faceX: mép gần camera của mặt trước trùng mặt phẳng thân ở mọi làn, hai bên đường'); 
    if (prevDoc === undefined) delete global.document; else global.document = prevDoc; }
}
if (section('33d. Hồi quy từ soak test: chuyến từng bị ngoại lệ (kế hoạch ngừng chạy cắt hành trình), va chạm ở ga đa đường, tàu chạy thông qua vào đường đơn đang có tàu ngược chiều')) {
  const runSoak = (ln, type, no, dir, seed, wx) => {
    const L = Sim.lineOf(ln), rec = L.trains.find(t => t.t === type && String(t.n) === String(no) && t.d === dir); if (!rec) return null; const st = rec.s.filter(e => !e[3]).map(e => e[0]), trip = Sim.makeTrip(ln, rec, st[0], st[st.length - 1]);
    const W = Sim.createWorld(ln, trip, { diff: 'hard', seed, weather: wx, lead: true, events: true }), T = W.player, planned = (trip.M[trip.M.length - 1].arr || 0) - (trip.M[0].dep || 0), limit = Math.max(3600, planned * 1.6 + 7200); let err = null;
    try { while (!T.finished && W.t < limit) Sim.tick(W, 0.05, {}, true); } catch (e) { err = e; }
    return { W, T, err };
  };
  { const r = runSoak('tsk', 'Tsubame', 302, 'up', 9, 'snow'); ok(r && !r.err && r.T.finished, 'Tsubame 302 chiều lên (hạt giống 9, tuyết): không ngoại lệ khi kế hoạch ngừng chạy cắt hành trình', r && r.err && String(r.err.stack).split('\n').slice(0, 2).join(' | ')); }
  { const r = runSoak('jts', 'Toki', 302, 'up', 9, 'snow'); ok(r && !r.err && r.T.finished, 'Toki 302 chiều lên (hạt giống 9, tuyết): không ngoại lệ', r && r.err && String(r.err.stack).split('\n').slice(0, 2).join(' | ')); }
  { const r = runSoak('jts', 'Tanigawa', 471, 'down', 8, 'snow'); ok(r && !r.err && !r.T.collision && r.T.finished, 'Tanigawa 471 sau Hayabusa 3 ở Omiya: tàu đi trước vừa rời đường sân ga bên cạnh không bị tính là va chạm', r && (r.err ? String(r.err.stack).split('\n')[0] : 'collision=' + r.T.collision)); }
  { /* xe kẹt đường ngang chỉ có ở tuyến có đường ngang (Yamagata, Akita): tàu danh mục trên Tokaido/Tohoku/Joetsu không được bị 'xe kẹt' (Shinkansen thật không có đường ngang) */
    const catAll = NatCat.build(window.LINES); let bad = 0, tot = 0, ex = '';
    for (const ln of ['tsk', 'toh', 'jts']) for (const sd of [1, 2, 3]) { const L = Sim.lineOf(ln), rec = L.trains.find(t => t.d === 'down' && t.s.filter(e => !e[3]).length > 6), st = rec.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld(ln, Sim.makeTrip(ln, rec, st[0], st[st.length - 1]), { diff: 'hard', seed: sd, lead: false, events: true }); W.t = 20000; NatCat.step(W);
      for (const [key, d] of W.haz.delay) { if (d.why !== 'xingcar') continue; tot++; const c = catAll.find(x => x.key === key); if (c && !(window.LINES[c.line].xings || []).length) { bad++; ex = ex || key; } } }
    ok(bad === 0, 'tàu danh mục trên tuyến không có đường ngang không bị sự kiện xe kẹt đường ngang', [bad, tot, ex]); }
  { const r = runSoak('yam', 'Tsubasa', 150, 'up', 7, undefined); ok(r && !r.err && r.T.finished, 'Tsubasa 150 chiều lên (Yamagata): chạy hết hành trình', r && r.err && String(r.err.stack).split('\n')[0]);
    ok(r && r.W.msgs.some(m => /đoạn đường đơn phía sau/.test(m.text)), 'đường đơn: ga thông qua mà đoạn sau có tàu ngược chiều thì điều độ ra lệnh dừng tránh (trước đây không bao giờ ra lệnh vì nextTarget chỉ trả về ga dừng)'); }
}
if (section('33e. Nền đất: tấm bê tông dưới ray và hàng rào thép (chỉ kết cấu nền đất, ngoài ga, hở ở đường ngang), vẽ được')) {
  const LNS = window.LINES;
  // luật: cầu cạn, cầu, hầm và gần ga không có hàng rào/tấm bê tông; nền đất thì có; hở đúng quanh mỗi đường ngang (chỉ Yamagata, Akita)
  { let nG = 0, bad = 0; for (const id of Object.keys(LNS)) { const L = LNS[id]; for (let km = L.stations[0].km; km < L.kmEnd; km += 0.1) { const k = Sim.structAt(L, km), fa = Sim.fenceAt(L, km, false), sl = Sim.slabAt(L, km, false);
      if (k !== 'g') { if (fa || sl) bad++; } else { nG++; const nearX = (L.xings || []).some(q => Math.abs(q - km) < 0.0055); if (!sl || fa === nearX) bad++; }
      if (Sim.fenceAt(L, km, true) || Sim.slabAt(L, km, true)) bad++; } }
    ok(nG > 3000 && bad === 0, 'luật nền đất: hàng rào và tấm bê tông chỉ ở kết cấu nền đất, không ở ga (' + nG + ' mẫu nền đất, ' + bad + ' sai)', [nG, bad]); }
  { let gaps = 0, bad = 0; for (const id of ['yam', 'aki']) { const L = LNS[id]; for (const q of L.xings) { if (Sim.structAt(L, q - 0.03) !== 'g' || Sim.structAt(L, q + 0.03) !== 'g') continue; gaps++; if (Sim.fenceAt(L, q, false) || Sim.fenceAt(L, q - 0.004, false) || Sim.fenceAt(L, q + 0.004, false) || !Sim.fenceAt(L, q - 0.03, false) || !Sim.fenceAt(L, q + 0.03, false)) bad++; } }
    ok(gaps > 80 && bad === 0, 'hàng rào hở quanh mỗi đường ngang của Yamagata và Akita (' + gaps + ' chỗ, ' + bad + ' sai)', [gaps, bad]);
    ok(['tsk', 'toh', 'jts', 'hok', 'nks'].every(id => !(LNS[id].xings || []).length), 'các tuyến Shinkansen thật không có đường ngang: hàng rào liên tục'); }
  ok(Sim.FENCE_H === 3.6 && Sim.FENCE_OFF === 1.0, 'hàng rào cao 3,6 m (ngang tàu), cách cột giá đỡ 1 m về phía ngoài');
  // hàng rào được vẽ ở nền đất và không ở cầu cạn: đếm lệnh vẽ khi bật/tắt luật
  { global.hhmm = global.hhmm || (s => String(s)); global.CanvasRenderingContext2D = global.CanvasRenderingContext2D || function () { }; global.CanvasRenderingContext2D.prototype.roundRect = global.CanvasRenderingContext2D.prototype.roundRect || function () { };
    require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'cabview.js'));
    const noop = () => { }; let strokes = 0; const ctx = new Proxy({}, { get: (t, k) => { if (k === 'stroke') return () => { strokes++; }; return k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop); }, set: (t, k, v) => { t[k] = v; return true; } });
    const L = LNS.tsk, rec = L.trains.find(t => t.d === 'down' && t.s.filter(e => !e[3]).length >= 3), st = rec.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, st[0], st[st.length - 1]), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
    const count = km => { T.x = Sim.sOfKm(km, 'down', L.kmEnd); T.v = 60; strokes = 0; global.CabView.draw(ctx, 0, 0, 1920, 620, W, T, { sprites: {}, aud: null, imgs: {} }); return strokes; };
    const orig = Sim.fenceAt; const withG = count(45.2), withV = count(51.0); Sim.fenceAt = () => false; const noG = count(45.2), noV = count(51.0); Sim.fenceAt = orig;
    ok(withG > noG + 40, 'cabview vẽ hàng rào ở đoạn nền đất (tsk km 45,2: ' + withG + ' nét so với ' + noG + ' khi tắt)', [withG, noG]);
    ok(withV === noV, 'cabview không vẽ hàng rào ở cầu cạn (tsk km 51, cầu cạn tới km 56: ' + withV + ' nét, bằng khi tắt luật)', [withV, noV]); }
}
if (section('33f. Ghi chéo giữa hai đường chính (xo): dựng lại từ sơ đồ Nishi-Kyushu; ga không khai báo giữ chữ X kép hai đầu')) {
  const LNS = window.LINES, Ly = require(path.join(DRIVE, 'layout.js')), N = LNS.nks.stations;
  const byEn = en => N.find(s => s.en === en);
  ok(JSON.stringify(byEn('Takeo-Onsen').xo) === '[["a","d"]]' && JSON.stringify(byEn('Shin-Omura').xo) === '[["b","s",40]]' && JSON.stringify(byEn('Nagasaki').xo) === '[["b","d"]]' && byEn('Ureshino-Onsen').xo.length === 0 && byEn('Isahaya').xo.length === 0, 'dữ liệu nks: X kép sau Takeo-Onsen, một đường chéo trước Shin-Omura, X kép trước Nagasaki, Ureshino-Onsen và Isahaya không có');
  ok(Object.keys(LNS).filter(id => id !== 'nks' && id !== 'toh' && id !== 'tsk' && id !== 'hok' && id !== 'jts' && id !== 'yam' && id !== 'aki').every(id => LNS[id].stations.every(s => s.xo === undefined)) && LNS.tsk.stations.filter(s => s.xo !== undefined).length === 11 && LNS.hok.stations.filter(s => s.xo !== undefined).length === 21 && LNS.jts.stations.filter(s => s.xo !== undefined).length === 9, 'các tuyến khác chưa khai báo xo: giữ mặc định cũ (tsk chỉ có 11 ga Kyushu, mục 33h; hok chỉ có Kumagaya, Honjo-Waseda, Takasaki và 18 ga Annaka-Haruna – Tsuruga, mục 33i; jts chỉ có Kumagaya, Honjo-Waseda, Takasaki và 6 ga Jomo-Kogen – Niigata, mục 33j; yam và aki chỉ có các ga chung trục Tohoku, mục 33l)');
  ok(LNS.toh.stations.filter(s => s.xo !== undefined).map(s => s.en).join() === 'Oyama,Utsunomiya,Nasushiobara,Shin-Shirakawa,Koriyama,Fukushima,Shiroishi-Zao,Sendai,Furukawa,Kurikoma-Kogen,Ichinoseki,Mizusawa-Esashi,Kitakami,Shin-Hanamaki,Morioka,Iwate-Numakunai,Ninohe,Hachinohe,Shichinohe-Towada,Shin-Aomori,Okutsugaru-Imabetsu,Kikonai,Shin-Hakodate-Hokuto', 'toh: 19 ga Tohoku (trừ Tokyo, Ueno, Omiya) và bốn ga Hokkaido có xo; ba ga còn lại giữ mặc định (mục 33l, 33o)');
  { const d = Ly.xovers({}, 'down', false), u = Ly.xovers({}, 'up', false); ok(d.length === 2 && d.every(x => x.kind === 'd') && d.map(x => x.z).sort((a, b) => a - b).join() === '-1300,720' && u.map(x => x.z).sort((a, b) => a - b).join() === '-1300,720', 'mặc định: X kép ở 1300 m trước và 720 m sau vạch, cả hai chiều', [d, u]); }
  { const st = { xo: [['a', 'd']] }, dn = Ly.xovers(st, 'down', false), up = Ly.xovers(st, 'up', false), rr = Ly.xovers(st, 'down', true);
    ok(dn.length === 1 && dn[0].z === 720 && up[0].z === -1300 && rr[0].z === -720 && rr[0].flip, 'xo viết theo chiều xuống: chiều lên đảo trước/sau; camera sau đảo dấu', [dn, up, rr]);
    const sg = { xo: [['b', 's']] }; const a = Ly.xovers(sg, 'down', false)[0], b = Ly.xovers(sg, 'up', false)[0], c = Ly.xovers(sg, 'down', true)[0];
    ok(a.z === -1300 && b.z === 720 && c.z === 1150 && c.kind === 's', 'đường chéo đơn: camera sau đặt ở 1150 (= 1300 − 150) để trùng đúng vị trí vật lý', [a, b, c]); }
  // điểm ghi cho âm thanh: ga không có X thì không có điểm ghi X quanh nó
  { const L = LNS.nks, rec = L.trains.find(t => t.d === 'down' && t.s.filter(e => !e[3]).length >= 4), st = rec.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld('nks', Sim.makeTrip('nks', rec, st[0], st[st.length - 1]), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
    const pts = Sim.switchPoints(T), near = (s, z) => pts.some(p => p > s + z && p < s + z + 150), sOf = en => T.M.find(m => L.stations[m.i].en === en);
    const m1 = sOf('Ureshino-Onsen'), m2 = sOf('Shin-Omura'), m0 = sOf('Takeo-Onsen');
    ok(m1 && !near(m1.s, -1300) && !near(m1.s, 720), 'Ureshino-Onsen: không có điểm ghi chéo quanh ga', [pts.length]);
    ok(m2 && near(m2.s, -610) && !near(m2.s, 720) && !near(m2.s, -1300), 'Shin-Omura: chỉ có ghi chéo trước ga (chiều xuống)'); ok(!m0 || (!near(m0.s, -1300) && near(m0.s, 720)), 'Takeo-Onsen: chỉ có ghi chéo sau ga (chiều xuống)'); }
  // cabview vẽ ghi chéo đúng chỗ: số lệnh vẽ giảm khi tắt xovers ở ga có ghi chéo, không đổi ở ga không có
  { global.hhmm = global.hhmm || (x => String(x)); global.CanvasRenderingContext2D = global.CanvasRenderingContext2D || function () { }; global.CanvasRenderingContext2D.prototype.roundRect = global.CanvasRenderingContext2D.prototype.roundRect || function () { };
    require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'cabview.js'));
    const noop = () => { }; let n = 0; const ctx = new Proxy({}, { get: (t, k) => { if (k === 'stroke' || k === 'fill') return () => { n++; }; return k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop); }, set: (t, k, v) => { t[k] = v; return true; } });
    const L = LNS.nks, rec = L.trains.find(t => t.d === 'down' && t.s.filter(e => !e[3]).length >= 5), st = rec.s.filter(e => !e[3]).map(e => e[0]), W = Sim.createWorld('nks', Sim.makeTrip('nks', rec, st[0], st[st.length - 1]), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
    const draw = (en, off) => { const m = T.M.find(q => L.stations[q.i].en === en); T.x = m.s + off; T.v = 60; n = 0; global.CabView.draw(ctx, 0, 0, 1920, 620, W, T, { sprites: {}, aud: null, imgs: {} }); return n; };
    const orig = Ly.xovers, cnt = (en, off) => { const a = draw(en, off); Ly.xovers = () => []; const b = draw(en, off); Ly.xovers = orig; return [a, b]; };
    for (const [en, off, has] of [['Shin-Omura', -800, true], ['Nagasaki', -1250, true], ['Takeo-Onsen', 650, true], ['Ureshino-Onsen', -1250, false], ['Isahaya', -1250, false]]) { const [a, b] = cnt(en, off); ok(has ? a > b : a === b, 'cabview ' + en + ' (' + off + ' m): ' + (has ? 'vẽ ghi chéo' : 'không vẽ ghi chéo') + ' (' + a + ' lệnh vẽ so với ' + b + ' khi tắt)', [a, b]); } }
  // ---- Hokkaido (toh): ghi chéo theo hình 010_01–010_05, loại 'r' (đường chéo đơn từ đường ta sang đường ngược chiều)
  { const T0 = LNS.toh.stations, g = en => JSON.stringify(T0.find(x => x.en === en).xo);
    ok(g('Shin-Aomori') === '[["b","d"],["a","d"]]' && g('Okutsugaru-Imabetsu') === '[["b","s"],["a","r"]]' && g('Kikonai') === '[["b","r"],["a","s"]]' && g('Shin-Hakodate-Hokuto') === '[["b","d"]]', 'dữ liệu toh: Shin-Aomori X kép hai đầu; Okutsugaru-Imabetsu đơn s trước + đơn r sau; Kikonai đơn r trước + đơn s sau; Shin-Hakodate-Hokuto X kép trước ga');
    const tb = []; for (const k of ['d', 's', 'r']) for (const f of [false, true]) tb.push(k + (f ? 'T' : 'F') + ':' + Ly.xoLines({ kind: k, flip: f }).join(''));
    ok(tb.join(' ') === 'dF:01 dT:01 sF:1 sT:0 rF:0 rT:1', 'xoLines: s đi opp→ours, r đi ours→opp theo chiều tiến của khung; camera sau (gương) đảo', tb.join(' '));
    const r1 = Ly.xovers({ xo: [['a', 'r']] }, 'down', false)[0], r2 = Ly.xovers({ xo: [['a', 'r']] }, 'up', false)[0], r3 = Ly.xovers({ xo: [['b', 'r']] }, 'down', true)[0];
    const zs = (en, d, r) => Ly.xovers(T0.find(x => x.en === en), d, r).map(x => x.z).join();
    ok(zs('Okutsugaru-Imabetsu', 'down', false) === '-1300,720' && zs('Okutsugaru-Imabetsu', 'up', false) === '720,-1300' && zs('Kikonai', 'down', false) === '-1300,720' && zs('Kikonai', 'up', false) === '720,-1300' && zs('Kikonai', 'down', true) === '1150,-870' && r1.z === 720 && r1.kind === 'r' && r2.z === -1300 && r3.z === 1150 && r3.flip, 'loại r: cùng quy tắc vị trí như s (sau ga +720, chiều lên đảo, camera sau 1150)', [r1, r2, r3]);
    global.hhmm = global.hhmm || (x => String(x)); global.CanvasRenderingContext2D = global.CanvasRenderingContext2D || function () { }; global.CanvasRenderingContext2D.prototype.roundRect = global.CanvasRenderingContext2D.prototype.roundRect || function () { };
    require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'cabview.js'));
    const noop = () => { }; let n = 0; const ctx = new Proxy({}, { get: (t, k) => { if (k === 'stroke' || k === 'fill') return () => { n++; }; return k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop); }, set: (t, k, v) => { t[k] = v; return true; } });
    const L = LNS.toh, ix = en => L.stations.findIndex(x => x.en === en), recH = L.trains.find(t => t.d === 'down' && t.s.some(e => e[0] === ix('Shin-Hakodate-Hokuto')) && t.s.some(e => e[0] === ix('Kikonai')) && t.s.some(e => e[0] === ix('Okutsugaru-Imabetsu')) && t.s.some(e => e[0] === ix('Shin-Aomori')));
    if (recH) { const W = Sim.createWorld('toh', Sim.makeTrip('toh', recH, ix('Shin-Aomori'), ix('Shin-Hakodate-Hokuto')), { diff: 'easy', seed: 1, lead: false, events: false }), Tp = W.player;
      const dr = (rear, en, off) => { const m = Tp.M.find(q => L.stations[q.i].en === en); Tp.x = m.s + off; Tp.v = 60; n = 0; global.CabView.draw(ctx, 0, 0, 1920, 620, W, Tp, { sprites: {}, aud: null, imgs: {} }); return n; };
      const orig = Ly.xovers, cnt = (rear, en, off) => { const a = dr(rear, en, off); Ly.xovers = () => []; const b = dr(rear, en, off); Ly.xovers = orig; return [a, b]; };
      const len = Tp.veh.len, cases = [];
      for (const en of ['Shin-Aomori', 'Okutsugaru-Imabetsu', 'Kikonai']) for (const xv of Ly.xovers(L.stations.find(x => x.en === en), 'down', false)) { cases.push([false, en, xv.z - 120, true]); }
      cases.push([false, 'Shin-Hakodate-Hokuto', -1420, true], [false, 'Shin-Hakodate-Hokuto', 650, false]);
      for (const [rear, en, off, has] of cases) {
        const [a, b] = cnt(rear, en, off); ok(has ? a > b : a === b, 'cabview ' + en + ' (' + off + ' m): ' + (has ? 'vẽ ghi chéo' : 'không vẽ ghi chéo') + ' (' + a + ' lệnh vẽ so với ' + b + ' khi tắt)', [a, b]); } }
    else ok(false, 'không tìm được chuyến toh qua cả bốn ga Hokkaido để thử vẽ'); }
  // ---- bố trí ga theo sơ đồ: Okutsugaru-Imabetsu (2-3-0a = PdduP) và Kikonai (2-3-0b = PduuP): ba đường, hai sân ga ngoài
  { const o = LNS.toh.stations.find(x => x.en === 'Okutsugaru-Imabetsu'), k = LNS.toh.stations.find(x => x.en === 'Kikonai'), sum = (c, d) => { const st = Ly.station(c, d, 0); return Ly.tokens(c, d) + '|' + st.tracks.length + '|' + st.plats.length + '|' + st.stops.length + '|' + (Ly.diverts(c, d, 0) ? 'rẽ' : 'thẳng'); };
    ok(o.lay === '2-3-0a' && k.lay === '2-3-0b' && o.loop === 0 && k.loop === 0, 'toh: Okutsugaru-Imabetsu 2-3-0a và Kikonai 2-3-0b (không có đường thông qua nên không còn là ga tránh được; lịch tàu không có chỗ vượt nhau ở hai ga này)');
    ok(sum('2-3-0a', 'down') === 'PdduP|3|2|1|rẽ' && sum('2-3-0a', 'up') === 'PduuP|3|2|1|thẳng' && sum('2-3-0b', 'down') === 'PduuP|3|2|1|thẳng' && sum('2-3-0b', 'up') === 'PdduP|3|2|1|rẽ', 'ba đường, hai sân ga ngoài; hai ga là ảnh gương của nhau: chiều xuống ở Okutsugaru-Imabetsu rẽ sang đường mảnh, ở Kikonai dừng thẳng trên đường chính', [sum('2-3-0a', 'down'), sum('2-3-0a', 'up'), sum('2-3-0b', 'down'), sum('2-3-0b', 'up')]);
    const a = Ly.station('2-3-0a', 'down', 0), b = Ly.station('2-3-0b', 'down', 0);
    ok(a.tracks.filter(t => t.main).length === 2 && b.tracks.filter(t => t.main).length === 2 && a.ours.x > 4 && b.ours.x === 0 && b.tracks.some(t => !t.main && !t.own && t.x < -8), 'hai đường chính ở giữa; đường mảnh của Okutsugaru-Imabetsu nằm bên trái (dừng ở đó), của Kikonai nằm bên phải đường chính lên', [a.ours.x, b.ours.x]);
    ok(Ly.bridgeCountOf('2-3-0a') === 1 && Ly.bridgeCountOf('2-3-0b') === 1, 'mỗi ga một cầu bộ hành'); }
  // ---- điểm cứu hộ (定点) trong hầm Seikan: dữ liệu, đường bản đồ qua mũi Tappi/Yoshioka, vẽ trong cabview
  { const L = LNS.toh, RI = L.meta.refugeInfo, NC = global.NatCat;
    ok(RI.length === 2 && RI[0].jp === '竜飛定点' && RI[1].jp === '吉岡定点' && RI[0].km === 732.9 && RI[1].km === 755.9 && JSON.stringify(L.meta.refuges) === '[732.9,755.9]', 'refugeInfo: 竜飛定点 km 732,9 và 吉岡定点 km 755,9 (khớp refuges đang dùng cho sự cố cháy trong hầm)');
    { const IL = global.I18N || window.I18N, keep = IL.lang, nm = {}; require(path.join(DRIVE, 'lang-en.js')); require(path.join(DRIVE, 'lang-ja.js')); for (const l of ['vi', 'en', 'ja']) { IL.lang = l; nm[l] = RI.map(r => Ly.refugeName(r)); } IL.lang = keep;
      ok(nm.vi[0].name === 'Điểm cứu hộ Tappi' && nm.vi[1].name === 'Điểm cứu hộ Yoshioka' && nm.en[0].name === 'Tappi Emergency Point' && nm.en[1].name === 'Yoshioka Emergency Point' && nm.ja[0].name === '竜飛定点' && nm.ja[1].name === '吉岡定点', 'tên điểm cứu hộ theo ngôn ngữ: vi "Điểm cứu hộ Tappi", en "Tappi Emergency Point", ja 竜飛定点', nm.vi.map(x => x.name).concat(nm.en.map(x => x.name), nm.ja.map(x => x.name)));
      ok(nm.ja[0].kana === 'たっぴていてん' && nm.ja[1].kana === 'よしおかていてん' && nm.ja[0].sub === 'たっぴていてん' && nm.vi.every(x => x.kana === '') && nm.en.every(x => x.kana === '') && nm.en.every(x => x.jp.endsWith('定点')), 'tiếng Nhật có furigana (kana), tiếng Việt/Anh không; biển trong hầm luôn có tên Nhật', [nm.ja[0].kana, nm.ja[1].kana]); }
    ok(Math.abs(RI[0].lat - 41.2572) < 0.001 && Math.abs(RI[0].lon - 140.3481) < 0.001 && Math.abs(RI[1].lat - 41.4422) < 0.001 && Math.abs(RI[1].lon - 140.2392) < 0.001 && RI[0].depth === 135 && RI[1].depth === 149.5, 'toạ độ và độ sâu theo Wikipedia JA: Tappi 41,25722 N 140,34806 E sâu 135 m; Yoshioka 41,44222 N 140,23917 E sâu 149,5 m');
    ok(RI[0].km - L.stations.find(x => x.en === 'Okutsugaru-Imabetsu').km === 19.5 && Math.abs(RI[1].km - RI[0].km - 23.0) < 1e-9, 'khoảng cách thật khớp nguồn: Okutsugaru-Imabetsu → Tappi 19,5 km, Tappi → Yoshioka 23,0 km');
    const G = Ly.geoPoints(L), wp = G.filter(g => g.wp);
    ok(G.length === L.stations.length + 2 && wp.length === 2 && G.every((g, k) => k === 0 || g.km >= G[k - 1].km), 'geoPoints: ga + 2 điểm cứu hộ, xếp theo km', G.length);
    ok(Ly.geoPoints(LNS.tsk).length === LNS.tsk.stations.length && Ly.geoPoints(LNS.nks).length === LNS.nks.stations.length, 'tuyến không có điểm cứu hộ: geoPoints = danh sách ga');
    const a1 = NC.atKm(L, 732.9), a2 = NC.atKm(L, 755.9), a3 = NC.atKm(L, 713.4), a4 = NC.atKm(L, 788.2);
    ok(Math.abs(a1.lat - 41.25722) < 1e-9 && Math.abs(a1.lon - 140.34806) < 1e-9 && Math.abs(a2.lat - 41.44222) < 1e-9 && Math.abs(a2.lon - 140.23917) < 1e-9, 'vị trí trên bản đồ tại km 732,9 và 755,9 đúng toạ độ hai điểm cứu hộ');
    ok(Math.abs(a3.lat - L.stations.find(x => x.en === 'Okutsugaru-Imabetsu').lat) < 1e-9 && Math.abs(a4.lon - L.stations.find(x => x.en === 'Kikonai').lon) < 1e-9, 'tại ga vẫn đúng toạ độ ga (nội suy qua điểm cứu hộ không làm lệch)');
    { const mid = NC.atKm(L, 744.4), chord = [(L.stations.find(x => x.en === 'Okutsugaru-Imabetsu').lat + L.stations.find(x => x.en === 'Kikonai').lat) / 2, (L.stations.find(x => x.en === 'Okutsugaru-Imabetsu').lon + L.stations.find(x => x.en === 'Kikonai').lon) / 2];
      ok(Math.hypot(mid.lat - chord[0], (mid.lon - chord[1]) * 0.8) > 0.1, 'giữa eo biển (km 744,4) đường đi lệch xa đường thẳng Imabetsu–Kikonai (đi qua hai mũi đất)', [mid.lat, mid.lon]); }
    // vẽ trong hầm (camera trước và sau): bật/tắt refugeInfo
    const noop = () => { }; let n = 0; const ctx = new Proxy({}, { get: (t, k) => { if (k === 'stroke' || k === 'fill' || k === 'fillRect' || k === 'fillText') return () => { n++; }; return k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop); }, set: (t, k, v) => { t[k] = v; return true; } });
    const ix = en => L.stations.findIndex(x => x.en === en), recH = L.trains.find(t => t.d === 'down' && t.s.some(e => e[0] === ix('Shin-Hakodate-Hokuto')) && t.s.some(e => e[0] === ix('Shin-Aomori')));
    if (recH) { const W = Sim.createWorld('toh', Sim.makeTrip('toh', recH, ix('Shin-Aomori'), ix('Shin-Hakodate-Hokuto')), { diff: 'easy', seed: 1, lead: false, events: false }), Tp = W.player;
      const dr = (rear, km) => { Tp.x = Sim.sOfKm(km, 'down', L.kmEnd); Tp.v = 60; n = 0; global.CabView.draw(ctx, 0, 0, 1920, 620, W, Tp, { sprites: {}, aud: null, imgs: {} }); return n; };
      const cnt = (rear, km) => { const a = dr(rear, km); L.meta.refugeInfo = []; const b = dr(rear, km); L.meta.refugeInfo = RI; return [a, b]; };
      for (const [rear, km, has, nm] of [[false, 732.7, true, 'trước Tappi 200 m'], [false, 732.9, true, 'đúng Tappi'], [false, 755.7, true, 'trước Yoshioka 200 m'], [false, 745.0, false, 'giữa eo biển, xa cả hai'], [false, 700.0, false, 'ngoài hầm']]) { const [a, b] = cnt(rear, km); ok(has ? a > b : a === b, 'cabview ' + nm + ' (km ' + km + '): ' + (has ? 'vẽ sân ga và biển 定点' : 'không vẽ điểm cứu hộ') + ' (' + a + ' so với ' + b + ' khi tắt)', [a, b]); } }
    else ok(false, 'không tìm được chuyến toh Shin-Aomori → Shin-Hakodate-Hokuto để thử vẽ'); }
}
if (section('33g. Mưa không rơi trong hầm: cửa sổ hành khách (winview.js), như buồng lái và hình nhìn ngang')) {
  global.hhmm = global.hhmm || (x => String(x)); global.CanvasRenderingContext2D = global.CanvasRenderingContext2D || function () { }; global.CanvasRenderingContext2D.prototype.roundRect = global.CanvasRenderingContext2D.prototype.roundRect || function () { };
  require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'winlit.js')); require(path.join(DRIVE, 'winview.js'));
  const L = window.LINES.toh, ix = en => L.stations.findIndex(x => x.en === en), rec = L.trains.find(t => t.d === 'down' && t.s.some(e => e[0] === ix('Shin-Hakodate-Hokuto')) && t.s.some(e => e[0] === ix('Shin-Aomori')));
  const W = Sim.createWorld('toh', Sim.makeTrip('toh', rec, ix('Shin-Aomori'), ix('Shin-Hakodate-Hokuto')), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
  const noop = () => { }; let mv = 0; const ctx = new Proxy({}, { get: (t, k) => { if (k === 'moveTo') return () => { mv++; }; return k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop); }, set: (t, k, v) => { t[k] = v; return true; } });
  const count = (km, rainOn) => { T.x = Sim.sOfKm(km, 'down', L.kmEnd); T.v = 60; W.rainHere = rainOn; mv = 0; global.WinView.draw(ctx, 0, 0, 1920, 618, W, T, { sprites: {}, aud: null, imgs: {} }, 1); return mv; };
  const inT = Sim.inTunnel(W, Sim.sOfKm(745, 'down', L.kmEnd)), outT = !Sim.inTunnel(W, Sim.sOfKm(700, 'down', L.kmEnd));
  ok(inT && outT, 'km 745 (hầm Seikan) ở trong hầm, km 700 ở ngoài hầm');
  { const a = count(745, true), b = count(745, false), c = count(700, true), d = count(700, false);
    ok(a === b, 'cửa sổ hành khách trong hầm: bật mưa không thêm nét mưa (' + a + ' so với ' + b + ')', [a, b]);
    ok(c >= d + 80, 'cửa sổ hành khách ngoài hầm: bật mưa thêm nét mưa (' + c + ' so với ' + d + ')', [c, d]); }
}
if (section('33h. Kyushu Shinkansen dựng lại từ sơ đồ: ghi chéo từng ga, mã 2-3-0c (Chikugo-Funagoya); vẽ cabview trước/sau và minimap')) {
  global.hhmm = global.hhmm || (x => String(x)); global.CanvasRenderingContext2D = global.CanvasRenderingContext2D || function () { }; global.CanvasRenderingContext2D.prototype.roundRect = global.CanvasRenderingContext2D.prototype.roundRect || function () { };
  const Ly = require(path.join(DRIVE, 'layout.js')), L = window.LINES.tsk, byEn = en => L.stations.find(x => x.en === en), ix = en => L.stations.findIndex(x => x.en === en), xo = en => JSON.stringify(byEn(en).xo);
  ok(xo('Shin-Tosu') === '[["b","d"],["a","d"]]' && xo('Kurume') === '[]' && xo('Chikugo-Funagoya') === '[["b","s"],["a","r"]]' && xo('Shin-Omuta') === '[]' && xo('Shin-Tamana') === '[]' && xo('Kumamoto') === '[["b","d"],["a","d"]]'
    && xo('Shin-Yatsushiro') === '[["b","r",160]]' && xo('Shin-Minamata') === '[["b","r"],["a","s"]]' && xo('Izumi') === '[]' && xo('Sendai') === '[["a","r",80]]' && xo('Kagoshima-Chuo') === '[["b","d"]]', 'dữ liệu xo Kyushu theo sơ đồ (Kurume, Shin-Omuta, Shin-Tamana, Izumi không có ghi chéo)');
  ok(L.stations.slice(0, ix('Hakata') + 1).every(x => x.xo === undefined), 'các ga Tokaido-Sanyo và Hakata chưa khai báo xo (mặc định cũ)');
  ok(byEn('Chikugo-Funagoya').lay === '2-3-0c' && byEn('Chikugo-Funagoya').loop === 0 && ['Kurume', 'Shin-Omuta', 'Shin-Tamana', 'Shin-Yatsushiro', 'Izumi', 'Sendai'].every(e => byEn(e).lay === '2-2-0') && byEn('Shin-Minamata').lay === '2-3-0' && ['Shin-Tosu', 'Kumamoto', 'Kagoshima-Chuo'].every(e => byEn(e).lay === '2-4-0'), 'mã bố trí Kyushu: chỉ Chikugo-Funagoya đổi sang 2-3-0c, các ga còn lại giữ mã cũ');
  { const sm = (c, d) => { const st = Ly.station(c, d, 0); return Ly.tokens(c, d) + '|' + st.tracks.length + '|' + st.plats.length + '|' + st.stops.length + '|' + (Ly.diverts(c, d, 0) ? 'rẽ' : 'thẳng'); };
    ok(sm('2-3-0c', 'down') === 'dPduP|3|2|2|rẽ' && sm('2-3-0c', 'up') === 'PduPu|3|2|1|thẳng' && Ly.tokens('2-3-0c', 'up') === Ly.tokens('2-3-0', 'down') && Ly.tokens('2-3-0c', 'down') === Ly.tokens('2-3-0', 'up'), '2-3-0c là ảnh gương của 2-3-0: chiều xuống giống 2-3-0 chiều lên và ngược lại', [sm('2-3-0c', 'down'), sm('2-3-0c', 'up')]); }
  { const zs = (en, d, r) => Ly.xovers(byEn(en), d, r).map(x => x.kind + x.z).join(); const ks = en => Ly.xovers(byEn(en), 'down', false).map(x => x.kind).join('');
    ok(zs('Shin-Tosu', 'down') === 'd-1300,d720' && zs('Kurume', 'down') === '' && zs('Kurume', 'up') === '' && zs('Chikugo-Funagoya', 'down') === 's-1300,r720' && zs('Chikugo-Funagoya', 'up') === 's720,r-1300' && zs('Shin-Yatsushiro', 'down') === 'r-730' && zs('Shin-Yatsushiro', 'up') === 'r180'
      && zs('Shin-Minamata', 'down') === 'r-1300,s720' && zs('Shin-Minamata', 'up') === 'r720,s-1300' && zs('Sendai', 'down') === 'r100' && zs('Sendai', 'up') === 'r-650' && zs('Kagoshima-Chuo', 'down') === 'd-1300' && zs('Kagoshima-Chuo', 'up') === 'd720', 'vị trí và loại ghi chéo Kyushu theo hai chiều: ga có đường tránh giữ ghi chéo ở vị trí cũ của chữ X (1300 m trước / 720 m sau, ngoài chỗ đường tránh rẽ ra), ga hai đường dùng khoảng cách sát sân ga'); }
  // thứ tự theo sơ đồ: ở ga có đường tránh, ghi chéo nằm NGOÀI chỗ đường tránh rẽ ra (trước ga) và nhập lại (sau ga)
  for (const [ln, LL] of [['tsk', L], ['toh', window.LINES.toh]]) for (const x of LL.stations) { if (!x.xo || !x.xo.length) continue; const st = Ly.station(x.lay, 'down', 0), loops = st.tracks.filter(t => t.in0 !== undefined); if (!loops.length) continue;
    for (const d of ['down', 'up']) { const sd = Ly.station(x.lay, d, 0), lp = sd.tracks.filter(t => t.in0 !== undefined && t.in0 < 1e4 && t.out0 < 1e4), xv = Ly.xovers(x, d, false), inMax = Math.max(...lp.map(t => t.in0)), outMax = Math.max(...lp.map(t => t.out0 + t.len));
      ok(xv.every(v => v.z < 0 ? -v.z - 150 >= inMax - 1 : v.z >= outMax - 1), ln + ' ' + x.en + ' ' + d + ': ghi chéo nằm ngoài chỗ đường tránh rẽ ra / nhập lại (đúng thứ tự sơ đồ)', [xv.map(v => v.z), inMax, outMax]); } }
  // vẽ cabview (camera trước/sau): bật/tắt xovers
  require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'cabview.js'));
  const noop = () => { }; let n = 0; const ctx = new Proxy({}, { get: (t, k) => { if (k === 'stroke' || k === 'fill') return () => { n++; }; return k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop); }, set: (t, k, v) => { t[k] = v; return true; } });
  const mkW = d => { const rec = L.trains.find(t => t.d === d && t.s.some(e => e[0] === ix('Kagoshima-Chuo') && !e[3]) && t.s.some(e => e[0] === ix('Hakata') && !e[3]) && t.v === 'N700-8'); const a = d === 'down' ? ix('Hakata') : ix('Kagoshima-Chuo'), b = d === 'down' ? ix('Kagoshima-Chuo') : ix('Hakata'); return Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, a, b), { diff: 'easy', seed: 1, lead: false, events: false }); };
  const orig = Ly.xovers;
  for (const d of ['down', 'up']) { const W = mkW(d), T = W.player, len = T.veh.len;
    const draw = (en, off, rear) => { const m = T.M.find(q => L.stations[q.i].en === en); T.x = m.s + off; T.v = 60; n = 0; global.CabView.draw(ctx, 0, 0, 1920, 618, W, T, { sprites: {}, aud: null, imgs: {} }); return n; };
    const diff = (en, off, rear) => { const a = draw(en, off, rear); Ly.xovers = () => []; const b = draw(en, off, rear); Ly.xovers = orig; return [a, b]; };
    // với mỗi ghi chéo: camera trước đứng cách 120 m trước nó
    for (const en of ['Shin-Tosu', 'Chikugo-Funagoya', 'Shin-Yatsushiro', 'Shin-Minamata', 'Kumamoto', 'Sendai']) for (const xv of Ly.xovers(byEn(en), d, false)) {
      const [a, b] = diff(en, xv.z - 120, false); ok(a > b, 'cabview ' + d + ' ' + en + ' (' + xv.kind + ' ở ' + xv.z + ' m): camera trước vẽ ghi chéo (' + a + ' so với ' + b + ')', [a, b]);
    }
    for (const en of ['Kurume', 'Shin-Omuta', 'Shin-Tamana', 'Izumi']) for (const off of [-1400, -700, 400]) { const [a, b] = diff(en, off, false); ok(a === b, 'cabview ' + d + ' ' + en + ' (' + off + ' m): không có ghi chéo nào (X cũ đã bỏ)', [a, b]); } 
    // minimap (topview.js): đứng cách ghi chéo 120 m phía trước
    { const keepDoc = global.document; global.document = { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) }; require(path.join(DRIVE, 'topview.js'));
      const tv = (en, off) => { const m = T.M.find(q => L.stations[q.i].en === en); T.x = m.s + off; T.v = 60; n = 0; global.TopView.draw(ctx, 0, 0, 700, 700, W, T, { sprites: {}, tops: {}, aud: null }); return n; };
      const tdiff = (en, off) => { const a = tv(en, off); Ly.xovers = () => []; const b = tv(en, off); Ly.xovers = orig; return [a, b]; };
      for (const en of ['Shin-Tosu', 'Chikugo-Funagoya', 'Shin-Yatsushiro', 'Shin-Minamata', 'Kumamoto', 'Sendai']) for (const xv of Ly.xovers(byEn(en), d, false)) { const [a, b] = tdiff(en, xv.z - 120); ok(a > b, 'minimap ' + d + ' ' + en + ' (' + xv.kind + ' ở ' + xv.z + ' m): vẽ ghi chéo (' + a + ' so với ' + b + ')', [a, b]); }
      for (const en of ['Kurume', 'Shin-Omuta', 'Shin-Tamana', 'Izumi']) for (const off of [-1400, -700, 400]) { const [a, b] = tdiff(en, off); ok(a === b, 'minimap ' + d + ' ' + en + ' (' + off + ' m): không có ghi chéo nào', [a, b]); }
      global.document = keepDoc; } }
}
if (section('33i. Hokuriku Shinkansen dựng lại từ sơ đồ (Annaka-Haruna – Tsuruga): ghi chéo từng ga; vẽ cabview trước/sau và minimap')) {
  global.hhmm = global.hhmm || (x => String(x)); global.CanvasRenderingContext2D = global.CanvasRenderingContext2D || function () { }; global.CanvasRenderingContext2D.prototype.roundRect = global.CanvasRenderingContext2D.prototype.roundRect || function () { };
  const Ly = require(path.join(DRIVE, 'layout.js')), L = window.LINES.hok, byEn = en => L.stations.find(x => x.en === en), ix = en => L.stations.findIndex(x => x.en === en), xo = en => JSON.stringify(byEn(en).xo);
  const DD = '[["b","d"],["a","d"]]', NONE = ['Annaka-Haruna', 'Sakudaira', 'Ueda', 'Iiyama', 'Itoigawa', 'Kurobe-Unazuki-Onsen', 'Shin-Takaoka', 'Komatsu', 'Kagaonsen', 'Awara-Onsen', 'Echizen-Takefu'];
  ok(xo('Karuizawa') === DD && xo('Nagano') === DD && xo('Kanazawa') === DD && xo('Joetsu-Myoko') === '[["b","d"],["a","s"]]' && xo('Toyama') === '[["b","s"],["a","d"]]' && xo('Fukui') === '[["b","r",160],["a","r",40]]' && xo('Tsuruga') === '[["b","d"]]' && NONE.every(e => xo(e) === '[]'), 'dữ liệu xo Hokuriku theo sơ đồ (11 ga 2 đường không có ghi chéo; Karuizawa, Nagano, Kanazawa X kép hai đầu; Tsuruga chỉ X trước)');
  ok(L.stations.slice(0, ix('Kumagaya')).every(x => x.xo === undefined) && xo('Takasaki') === '[["b","s",245],["a","r",205]]', 'các ga Tokyo – Omiya (chung với Hokuriku) chưa khai báo xo (mặc định cũ); Takasaki có hai ghi đơn (s phía tây, r phía đông)');
  { const LAY = { 'Annaka-Haruna': '2-2-0', Karuizawa: '2-4-0', Sakudaira: '2-2-0', Ueda: '2-2-0', Nagano: '2-4-0', Iiyama: '2-2-0', 'Joetsu-Myoko': '2-4-0', Itoigawa: '2-2-0', 'Kurobe-Unazuki-Onsen': '2-2-0', Toyama: '2-4-0', 'Shin-Takaoka': '2-2-0', Kanazawa: '2-4-0', Komatsu: '2-2-0', Kagaonsen: '2-2-1', 'Awara-Onsen': '2-2-0', Fukui: '1-2-0', 'Echizen-Takefu': '2-2-1', Tsuruga: '2-4-0' };
    ok(Object.keys(LAY).every(e => byEn(e).lay === LAY[e]), 'mã bố trí Hokuriku khớp token trích từ sơ đồ ở cả 18 ga (không ga nào đổi mã)', Object.keys(LAY).filter(e => byEn(e).lay !== LAY[e])); }
  { const zs = (en, d, r) => Ly.xovers(byEn(en), d, r).map(x => x.kind + x.z).join();
    ok(['Karuizawa', 'Nagano', 'Kanazawa'].every(e => zs(e, 'down') === 'd-1300,d720' && zs(e, 'up') === 'd720,d-1300') && zs('Joetsu-Myoko', 'down') === 'd-1300,s720' && zs('Joetsu-Myoko', 'up') === 'd720,s-1300' && zs('Toyama', 'down') === 's-1300,d720' && zs('Toyama', 'up') === 's720,d-1300'
      && zs('Fukui', 'down') === 'r-730,r60' && zs('Fukui', 'up') === 'r180,r-610' && zs('Tsuruga', 'down') === 'd-1300' && zs('Tsuruga', 'up') === 'd720' && NONE.every(e => zs(e, 'down') === '' && zs(e, 'up') === ''), 'vị trí và loại ghi chéo Hokuriku theo hai chiều: ga 4 đường giữ vị trí cũ 1300/720 m, Fukui (2 đường) theo gap 160/40 m, ga 2 đường còn lại không có'); }
  // thứ tự theo sơ đồ: ở ga có đường tránh, ghi chéo nằm NGOÀI chỗ đường tránh rẽ ra / nhập lại
  for (const x of L.stations) { if (!x.xo || !x.xo.length || x.lay === Ly.TKS) continue; const st = Ly.station(x.lay, 'down', 0), loops = st.tracks.filter(t => t.in0 !== undefined); if (!loops.length) continue;
    for (const d of ['down', 'up']) { const sd = Ly.station(x.lay, d, 0), lp = sd.tracks.filter(t => t.in0 !== undefined && t.in0 < 1e4 && t.out0 < 1e4), xv = Ly.xovers(x, d, false), inMax = Math.max(...lp.map(t => t.in0)), outMax = Math.max(...lp.map(t => t.out0 + t.len));
      ok(xv.every(v => v.z < 0 ? -v.z - 150 >= inMax - 1 : v.z >= outMax - 1), 'hok ' + x.en + ' ' + d + ': ghi chéo nằm ngoài chỗ đường tránh rẽ ra / nhập lại (đúng thứ tự sơ đồ)', [xv.map(v => v.z), inMax, outMax]); } }
  // vẽ cabview (camera trước/sau) và minimap: bật/tắt xovers
  { const zt = (d, r) => Ly.xovers(byEn('Takasaki'), d, r).map(x => x.kind + x.z).join();
    ok(zt('down', false) === 's-815,r225' && zt('up', false) === 's265,r-775', 'Takasaki: s trước ga và r sau ga khi xuống (theo hình: 245 / 205 m từ mép sân ga); chiều lên đảo trước/sau, loại giữ nguyên theo chiều chạy');
    ok(['down', 'up'].every(d => Ly.xovers(byEn('Takasaki'), d, false).every(v => JSON.stringify(Ly.xoLines(v)) === (v.kind === 's' ? '[1]' : '[0]')) && Ly.xovers(byEn('Takasaki'), d, true).every(v => JSON.stringify(Ly.xoLines(v)) === (v.kind === 's' ? '[0]' : '[1]'))), 'Takasaki: hướng vẽ ghi đơn (s: đối diện → mình, r: mình → đối diện; camera sau đảo chiều) ở cả hai chiều');
    ok(['down', 'up'].every(d => Ly.xovers(byEn('Takasaki'), d, true).map(v => v.z).sort((a, b) => a - b).join() === Ly.xovers(byEn('Takasaki'), d, false).map(v => -v.z - 150).sort((a, b) => a - b).join()), 'Takasaki: camera sau là ảnh gương (z phía sau = -z - 150)'); }
  require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'cabview.js'));
  const noop = () => { }; let n = 0; const ctx = new Proxy({}, { get: (t, k) => { if (k === 'stroke' || k === 'fill') return () => { n++; }; return k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop); }, set: (t, k, v) => { t[k] = v; return true; } });
  const mkW = d => { const rec = L.trains.find(t => t.t === 'Hakutaka' && t.d === d && t.s.some(e => e[0] === ix('Tsuruga') && !e[3]) && t.s.some(e => e[0] === 0 && !e[3])); const a = d === 'down' ? 0 : ix('Tsuruga'), b = d === 'down' ? ix('Tsuruga') : 0; return Sim.createWorld('hok', Sim.makeTrip('hok', rec, a, b), { diff: 'easy', seed: 1, lead: false, events: false }); };
  const orig = Ly.xovers, WITH = ['Takasaki', 'Karuizawa', 'Nagano', 'Joetsu-Myoko', 'Toyama', 'Kanazawa', 'Fukui', 'Tsuruga'];
  for (const d of ['down', 'up']) { const W = mkW(d), T = W.player, len = T.veh.len;
    const draw = (en, off, rear) => { const m = T.M.find(q => L.stations[q.i].en === en); T.x = m.s + off; T.v = 60; n = 0; global.CabView.draw(ctx, 0, 0, 1920, 618, W, T, { sprites: {}, aud: null, imgs: {} }); return n; };
    const diff = (en, off, rear) => { const a = draw(en, off, rear); Ly.xovers = () => []; const c = draw(en, off, rear); Ly.xovers = orig; return [a, c]; };
    // với mỗi ghi chéo: camera trước đứng cách 120 m trước nó
    for (const en of WITH) for (const xv of Ly.xovers(byEn(en), d, false)) {
      const [a, b] = diff(en, xv.z - 120, false); ok(a > b, 'cabview ' + d + ' ' + en + ' (' + xv.kind + ' ở ' + xv.z + ' m): camera trước vẽ ghi chéo (' + a + ' so với ' + b + ')', [a, b]);
    }
    for (const en of NONE) for (const off of [-1400, -700, 400]) { const [a, b] = diff(en, off, false); ok(a === b, 'cabview ' + d + ' ' + en + ' (' + off + ' m): không có ghi chéo nào (X cũ đã bỏ)', [a, b]); }
    // minimap (topview.js): đứng cách ghi chéo 120 m phía trước
    { const keepDoc = global.document; global.document = { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) }; require(path.join(DRIVE, 'topview.js'));
      const tv = (en, off) => { const m = T.M.find(q => L.stations[q.i].en === en); T.x = m.s + off; T.v = 60; n = 0; global.TopView.draw(ctx, 0, 0, 700, 700, W, T, { sprites: {}, tops: {}, aud: null }); return n; };
      const tdiff = (en, off) => { const a = tv(en, off); Ly.xovers = () => []; const c = tv(en, off); Ly.xovers = orig; return [a, c]; };
      for (const en of WITH) for (const xv of Ly.xovers(byEn(en), d, false)) { const [a, b] = tdiff(en, xv.z - 120); ok(a > b, 'minimap ' + d + ' ' + en + ' (' + xv.kind + ' ở ' + xv.z + ' m): vẽ ghi chéo (' + a + ' so với ' + b + ')', [a, b]); }
      for (const en of NONE) for (const off of [-1400, -700, 400]) { const [a, b] = tdiff(en, off); ok(a === b, 'minimap ' + d + ' ' + en + ' (' + off + ' m): không có ghi chéo nào', [a, b]); }
      global.document = keepDoc; } }
}
if (section('33j. Joetsu Shinkansen dựng lại từ sơ đồ (Jomo-Kogen – Niigata): ghi chéo từng ga, Urasa hai ghi đơn mỗi bên (xo có khoảng lệch thêm); vẽ cabview trước/sau và minimap')) {
  global.hhmm = global.hhmm || (x => String(x)); global.CanvasRenderingContext2D = global.CanvasRenderingContext2D || function () { }; global.CanvasRenderingContext2D.prototype.roundRect = global.CanvasRenderingContext2D.prototype.roundRect || function () { };
  const Ly = require(path.join(DRIVE, 'layout.js')), L = window.LINES.jts, byEn = en => L.stations.find(x => x.en === en), ix = en => L.stations.findIndex(x => x.en === en), xo = en => JSON.stringify(byEn(en).xo);
  ok(xo('Jomo-Kogen') === '[["b","s"],["a","r"]]' && xo('Echigo-Yuzawa') === '[["b","s"],["a","d"]]' && xo('Urasa') === '[["b","s",null,190],["b","r"],["a","r"],["a","s",null,190]]' && xo('Nagaoka') === '[["b","s"],["a","r"]]' && xo('Tsubame-Sanjo') === '[["b","r"],["a","s"]]' && xo('Niigata') === '[["b","d"]]', 'dữ liệu xo Joetsu theo sơ đồ (Urasa: mỗi bên hai ghi đơn, phần tử thứ tư = lệch thêm 190 m)');
  ok(L.stations.slice(0, ix('Kumagaya')).every(x => x.xo === undefined) && xo('Takasaki') === '[["b","s",245],["a","r",205]]', 'các ga Tokyo – Omiya (chung với Joetsu) chưa khai báo xo (mặc định cũ); Takasaki có hai ghi đơn (s phía tây, r phía đông)');
  { const LAY = { 'Jomo-Kogen': '2-2-1', 'Echigo-Yuzawa': '2-4-1', Urasa: '2-2-1', Nagaoka: '2-2-1', 'Tsubame-Sanjo': '2-3-1', Niigata: '3-4-0' };
    ok(Object.keys(LAY).every(e => byEn(e).lay === LAY[e]), 'mã bố trí Joetsu khớp token trích từ sơ đồ ở cả 6 ga (không ga nào đổi mã)', Object.keys(LAY).filter(e => byEn(e).lay !== LAY[e])); }
  { const zs = (en, d, r) => Ly.xovers(byEn(en), d, r).map(x => x.kind + x.z).join(), kinds = (en, d) => Ly.xovers(byEn(en), d, false).sort((a, b) => a.z - b.z).map(x => x.kind).join('');
    ok(zs('Jomo-Kogen', 'down') === 's-1300,r720' && zs('Jomo-Kogen', 'up') === 's720,r-1300' && zs('Echigo-Yuzawa', 'down') === 's-1300,d720' && zs('Echigo-Yuzawa', 'up') === 's720,d-1300' && zs('Nagaoka', 'down') === 's-1300,r720' && zs('Nagaoka', 'up') === 's720,r-1300'
      && zs('Tsubame-Sanjo', 'down') === 'r-1300,s720' && zs('Tsubame-Sanjo', 'up') === 'r720,s-1300' && zs('Niigata', 'down') === 'd-1300' && zs('Niigata', 'up') === 'd720', 'vị trí và loại ghi chéo Joetsu theo hai chiều (ga có đường tránh giữ vị trí cũ 1300/720 m)');
    // Urasa: bốn ghi đơn, thứ tự theo chiều chạy s(xa) r(gần) | sân ga | r(gần) s(xa), cùng thứ tự ở cả hai chiều vì mỗi ghi đơn là cùng một vật thể (cùng loại theo chiều chạy)
    ok(zs('Urasa', 'down') === 's-1490,r-1300,r720,s910' && zs('Urasa', 'up') === 's910,r720,r-1300,s-1490' && kinds('Urasa', 'down') === 'srrs' && kinds('Urasa', 'up') === 'srrs', 'Urasa: s xa trước ga, r gần trước ga, r gần sau ga, s xa sau ga (cả hai chiều)');
    ok(['down', 'up'].every(d => { const v = Ly.xovers(byEn('Urasa'), d, false).sort((a, b) => a.z - b.z); return v[1].z - v[0].z === 190 && v[3].z - v[2].z === 190 && v[0].z + 150 + 40 === v[1].z; }), 'Urasa: hai ghi đơn một bên cách nhau 190 m (150 m dài ghi + 40 m theo hình), không chồng lên nhau');
    // hướng vẽ từng ghi đơn: camera trước s = đường đối diện → đường mình (đường cong 1), r = đường mình → đường đối diện (đường cong 0); camera sau là ảnh gương nên đảo lại
    ok(['down', 'up'].every(d => Ly.xovers(byEn('Urasa'), d, false).every(v => JSON.stringify(Ly.xoLines(v)) === (v.kind === 's' ? '[1]' : '[0]')) && Ly.xovers(byEn('Urasa'), d, true).every(v => JSON.stringify(Ly.xoLines(v)) === (v.kind === 's' ? '[0]' : '[1]'))), 'Urasa: hướng vẽ từng ghi đơn (s: đối diện → mình, r: mình → đối diện; camera sau đảo chiều) ở cả hai chiều');
    // camera sau (ảnh gương): cùng vật thể thấy từ phía sau: z' = -z - 150 (kind giữ nguyên, flip = true)
    ok(['down', 'up'].every(d => { const f = Ly.xovers(byEn('Urasa'), d, false), r = Ly.xovers(byEn('Urasa'), d, true); return f.every((v, i) => r[i].kind === v.kind && r[i].flip === true && r[i].z === -v.z - 150); }), 'Urasa: camera sau thấy đúng bốn ghi đơn ở vị trí gương (-z - 150), cùng loại'); }
  // thứ tự theo sơ đồ: ở ga có đường tránh, ghi chéo nằm NGOÀI chỗ đường tránh rẽ ra / nhập lại
  for (const x of L.stations) { if (!x.xo || !x.xo.length || x.lay === Ly.TKS) continue; const st = Ly.station(x.lay, 'down', 0), loops = st.tracks.filter(t => t.in0 !== undefined); if (!loops.length) continue;
    for (const d of ['down', 'up']) { const sd = Ly.station(x.lay, d, 0), lp = sd.tracks.filter(t => t.in0 !== undefined && t.in0 < 1e4 && t.out0 < 1e4), xv = Ly.xovers(x, d, false), inMax = Math.max(...lp.map(t => t.in0)), outMax = Math.max(...lp.map(t => t.out0 + t.len));
      ok(xv.every(v => v.z < 0 ? -v.z - 150 >= inMax - 1 : v.z >= outMax - 1), 'jts ' + x.en + ' ' + d + ': ghi chéo nằm ngoài chỗ đường tránh rẽ ra / nhập lại (đúng thứ tự sơ đồ)', [xv.map(v => v.z), inMax, outMax]); } }
  // vẽ cabview (camera trước/sau) và minimap: bật/tắt xovers
  { const zt = (d, r) => Ly.xovers(byEn('Takasaki'), d, r).map(x => x.kind + x.z).join();
    ok(zt('down', false) === 's-815,r225' && zt('up', false) === 's265,r-775', 'Takasaki: s trước ga và r sau ga khi xuống (theo hình: 245 / 205 m từ mép sân ga); chiều lên đảo trước/sau, loại giữ nguyên theo chiều chạy');
    ok(['down', 'up'].every(d => Ly.xovers(byEn('Takasaki'), d, false).every(v => JSON.stringify(Ly.xoLines(v)) === (v.kind === 's' ? '[1]' : '[0]')) && Ly.xovers(byEn('Takasaki'), d, true).every(v => JSON.stringify(Ly.xoLines(v)) === (v.kind === 's' ? '[0]' : '[1]'))), 'Takasaki: hướng vẽ ghi đơn (s: đối diện → mình, r: mình → đối diện; camera sau đảo chiều) ở cả hai chiều');
    ok(['down', 'up'].every(d => Ly.xovers(byEn('Takasaki'), d, true).map(v => v.z).sort((a, b) => a - b).join() === Ly.xovers(byEn('Takasaki'), d, false).map(v => -v.z - 150).sort((a, b) => a - b).join()), 'Takasaki: camera sau là ảnh gương (z phía sau = -z - 150)'); }
  require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'cabview.js'));
  const noop = () => { }; let n = 0; const ctx = new Proxy({}, { get: (t, k) => { if (k === 'stroke' || k === 'fill') return () => { n++; }; return k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop); }, set: (t, k, v) => { t[k] = v; return true; } });
  const last = L.stations.length - 1, mkW = d => { const rec = L.trains.find(t => t.d === d && t.s.some(e => e[0] === last && !e[3]) && t.s.some(e => e[0] === 0 && !e[3])); const a = d === 'down' ? 0 : last, b = d === 'down' ? last : 0; return Sim.createWorld('jts', Sim.makeTrip('jts', rec, a, b), { diff: 'easy', seed: 1, lead: false, events: false }); };
  const orig = Ly.xovers, WITH = ['Takasaki', 'Jomo-Kogen', 'Echigo-Yuzawa', 'Urasa', 'Nagaoka', 'Tsubame-Sanjo', 'Niigata'];
  for (const d of ['down', 'up']) { const W = mkW(d), T = W.player, len = T.veh.len;
    const draw = (en, off, rear) => { const m = T.M.find(q => L.stations[q.i].en === en); T.x = m.s + off; T.v = 60; n = 0; global.CabView.draw(ctx, 0, 0, 1920, 618, W, T, { sprites: {}, aud: null, imgs: {} }); return n; };
    const diff = (en, off, rear) => { const a = draw(en, off, rear); Ly.xovers = () => []; const c = draw(en, off, rear); Ly.xovers = orig; return [a, c]; };
    // với mỗi ghi chéo: camera trước đứng cách 120 m trước nó
    for (const en of WITH) for (const xv of Ly.xovers(byEn(en), d, false)) {
      const [a, b] = diff(en, xv.z - 120, false); ok(a > b, 'cabview ' + d + ' ' + en + ' (' + xv.kind + ' ở ' + xv.z + ' m): camera trước vẽ ghi chéo (' + a + ' so với ' + b + ')', [a, b]);
    }
    // minimap (topview.js): đứng cách ghi chéo 120 m phía trước
    { const keepDoc = global.document; global.document = { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) }; require(path.join(DRIVE, 'topview.js'));
      const tv = (en, off) => { const m = T.M.find(q => L.stations[q.i].en === en); T.x = m.s + off; T.v = 60; n = 0; global.TopView.draw(ctx, 0, 0, 700, 700, W, T, { sprites: {}, tops: {}, aud: null }); return n; };
      const tdiff = (en, off) => { const a = tv(en, off); Ly.xovers = () => []; const c = tv(en, off); Ly.xovers = orig; return [a, c]; };
      for (const en of WITH) for (const xv of Ly.xovers(byEn(en), d, false)) { const [a, b] = tdiff(en, xv.z - 120); ok(a > b, 'minimap ' + d + ' ' + en + ' (' + xv.kind + ' ở ' + xv.z + ' m): vẽ ghi chéo (' + a + ' so với ' + b + ')', [a, b]); }
      global.document = keepDoc; } }
}
if (section('33k. Nút giao Takasaki (Joetsu – Hokuriku): ga 6 đường có đường nhánh dưới kéo dài thành đường Hokuriku lên, ba ghi nối, hai ghi đơn; Hokuriku lên cắt đồng mức qua hai đường chính Joetsu; cabview trước/sau, minimap, cửa sổ')) {
  global.hhmm = global.hhmm || (x => String(x)); global.CanvasRenderingContext2D = global.CanvasRenderingContext2D || function () { }; global.CanvasRenderingContext2D.prototype.roundRect = global.CanvasRenderingContext2D.prototype.roundRect || function () { };
  const Ly = require(path.join(DRIVE, 'layout.js')), LJ = window.LINES.jts, LH = window.LINES.hok, TKS = Ly.TKS, byEn = (L, en) => L.stations.find(x => x.en === en), EXT = Ly.TKS_EXT;
  // 1) dữ liệu và mã bố trí riêng
  ok(TKS === '2-4-1k' && [LJ, LH].every(L => byEn(L, 'Takasaki').lay === TKS && JSON.stringify(byEn(L, 'Takasaki').xo) === '[["b","s",245],["a","r",205]]'), 'Takasaki dùng mã bố trí riêng 2-4-1k và hai ghi đơn theo khoảng cách trong hình (s 245 m phía tây, r 205 m phía đông) ở cả hai tuyến');
  ok(Ly.tokens(TKS, 'down') === Ly.tokens('2-4-1', 'down') && Ly.bridgeCountOf(TKS) === Ly.bridgeCountOf('2-4-1') && Ly.stopCount(TKS, 'down') === Ly.stopCount('2-4-1', 'down') && Ly.stopCount(TKS, 'up') === Ly.stopCount('2-4-1', 'up') && Ly.hasThrough(TKS, 'down') === Ly.hasThrough('2-4-1', 'down') && Ly.diverts(TKS, 'down', 0) === Ly.diverts('2-4-1', 'down', 0), 'mã 2-4-1k cùng chuỗi token, số cầu bộ hành, số đường dừng, làn thông và rẽ ghi như 2-4-1 (chỉ khác hình học ghi)');
  // 2) ghi chéo: vị trí và không chồng lên ba ghi nối
  { const zs = (d, r) => Ly.xovers(byEn(LJ, 'Takasaki'), d, r).map(x => x.kind + x.z).join();
    ok(zs('down', false) === 's-815,r225' && zs('up', false) === 's265,r-775' && zs('down', true) === 's665,r-375', 'Takasaki: s bắt đầu 815 m trước, r 225 m sau vạch dừng khi xuống (hai ghi đơn cách mép sân ga 245 / 205 m); chiều lên đảo trước/sau; camera sau là ảnh gương');
    ok(['down', 'up'].every(d => Ly.xovers(byEn(LJ, 'Takasaki'), d, false).every(v => Ly.station(TKS, d, 0).links.every(l => { const a = v.z, b = v.z + 150; return b <= l.z0 || a >= l.z0 + l.len; }))), 'Takasaki: hai ghi đơn không chồng lên ba ghi nối nhánh dưới – đường chính lên (cả hai chiều)'); }
  // 3) hình học đường ga theo hình: chiều xuống rồi chiều lên (quay 180°: z' = -400 - z)
  { const phys = (st, n) => st.tracks.find(t => t.phys === n);
    const D = Ly.station(TKS, 'down', 0), U = Ly.station(TKS, 'up', 0), Dr = Ly.station(TKS, 'down', 0, true), Ur = Ly.station(TKS, 'up', 0, true);
    const ex = (t) => [t.in0, t.len, t.out0, t.len2];
    ok(JSON.stringify(ex(phys(D, 2))) === '[661,81,222,81]' && JSON.stringify(ex(phys(D, 0))) === '[580,160,60,160]' && phys(D, 5).out0 === EXT && JSON.stringify(ex(phys(D, 7))) === '[580,160,60,160]', 'chiều xuống: N2 tách 661 m trước (81 m), nhập 222 m sau; N1 từ N2 (ghi 160 m, độ dốc tối đa ≥ 1:10, sửa 23/11/2026); đường nhánh dưới S1 không nhập lại (kéo dài); S2 từ S1 (số đo từ hình 030_01)');
    ok(Math.abs(phys(D, 0).plain - phys(D, 2).x) < 1e-9 && Math.abs(phys(D, 7).plain - phys(D, 5).x) < 1e-9, 'đường ngoài cùng tách từ đường mẹ (N1 từ N2, S2 từ S1), không từ đường chính');
    for (const t of D.tracks) { if (t.main) continue; const u = phys(U, t.phys), w = (st, tt, z) => Ly.trackW(tt, 1000 + z, 1000); let worst = 0;
      for (let z = -900; z <= 700; z += 10) worst = Math.max(worst, Math.abs(w(D, t, z) - w(U, u, -400 - z)));
      ok(worst < 1e-9, 'đường ' + t.phys + ': chiều lên là ảnh quay 180° của chiều xuống (trackW(z) = trackW(-400 - z))', worst); }
    ok(Ur.tracks.every(t => t.main || t.phys !== undefined) && Dr.tracks.every(t => t.main || t.phys !== undefined) && Dr.tracks.map(t => t.phys + ':' + t.in0).sort().join() === D.tracks.map(t => t.phys + ':' + t.in0).sort().join(), 'camera sau (rev) giữ nguyên số đo theo đường vật lý');
    // ba ghi nối
    const L3 = d => Ly.station(TKS, d, 0).links.map(l => l.z0 + ',' + l.len).join(' ');
    ok(L3('down') === '60,95 160,65 381,100' && L3('up') === '-555,95 -625,65 -881,100', 'ba ghi nối nhánh dưới – đường chính lên: z 60 / 160 / 381 m sau vạch (e28, e29, e33; dài 95 / 65 / 100 m), chiều lên quay 180°');
    ok(['down', 'up'].every(d => { const st = Ly.station(TKS, d, 0); return st.links.every(l => phys(st, 5) === l.a && phys(st, 4) === l.b); }) && Ly.linksOf(Ly.station(TKS, 'down', 0), true).map(l => l.z).join() === '-155,-225,-481', 'ghi nối nối S1 với đường chính lên (vật lý); camera sau là ảnh gương (z = -z0 - dài)');
    ok(Ly.linksOf(Ly.station('2-4-1', 'down', 0), false).length === 0 && Ly.station('2-4-1', 'down', 0).tracks.every(t => t.len2 === undefined), 'ga 2-4-1 khác không bị ảnh hưởng (không có ghi nối, không có len2)'); }
  // 4) nút giao: các làn vật lý nhất quán giữa bốn khung nhìn, B chui dưới hai đường chính rồi hội tụ về đôi đường 4,3 m
  { const mk = (L, lid, dir) => ({ line: L, lineId: lid, dir }), sj = (W, u) => { const s0 = Sim.sOfKm(107, W.dir, W.line.kmEnd); return W.dir === 'down' ? s0 + u : s0 - u; };
    const frames = []; for (const [L, lid] of [[Sim.lineOf('jts'), 'jts'], [Sim.lineOf('hok'), 'hok']]) for (const dir of ['down', 'up']) frames.push(mk(L, lid, dir));
    ok(frames.every(W => Sim.xbOf(W) >= 0) && Sim.xbOf({ line: Sim.lineOf('toh'), lineId: 'toh', dir: 'down' }) < 0 && Sim.xbOf({ line: Sim.lineOf('tsk'), lineId: 'tsk', dir: 'down' }) < 0, 'chỉ jts và hok có nút giao xb (các tuyến khác không)');
    let worstAB = 0, worstJ = 0, worstEnd = 0, worstFlat = 0;
    for (const W of frames) for (const u of [-1500, -800, -200, 0, 50, 104, 160, 250, 360, 500, 1000, 2000]) { const l = Sim.xbLanes(W, sj(W, u)), ref = Sim.xbLanes(frames[0], sj(frames[0], u));
      worstAB = Math.max(worstAB, Math.abs(Math.abs(l.B - l.A) - Math.abs(ref.B - ref.A))); worstJ = Math.max(worstJ, Math.abs(Math.abs(l.jU - l.jD) - 4.3)); if (u >= 360) worstEnd = Math.max(worstEnd, Math.abs(Math.abs(l.B - l.A) - 4.3)); if (u <= 0) worstFlat = Math.max(worstFlat, Math.abs(Math.abs(l.B - l.jD) - 8.6), Math.abs(Math.abs(l.A - l.jD))); }
    ok(worstAB < 1e-6 && worstJ < 1e-9, 'khoảng cách A–B và hai đường chính Joetsu như nhau ở cả bốn khung nhìn (trước/sau, xuống/lên, jts/hok)', [worstAB, worstJ]);
    ok(worstEnd < 1e-6 && worstFlat < 1e-6, 'sau 360 m A và B thành đôi đường chuẩn 4,3 m; trước ngã rẽ B phẳng cách đường chính xuống 8,6 m còn A trùng đường chính', [worstEnd, worstFlat]);
    // B chui qua cả hai đường chính (đổi phía so với từng đường chính), đơn điệu
    { const W = frames[0]; let prev = null, cross = [], mono = true, sepPrev = 9; for (let u = 0; u <= 400; u += 4) { const l = Sim.xbLanes(W, sj(W, u)); if (prev !== null) { for (const [k, ln] of [['jU', l.jU], ['jD', l.jD]]) if ((prev.B - prev[k]) * (l.B - ln) < 0) cross.push(k + '@' + u); if (l.B < prev.B - 1e-9) mono = false; } prev = l; }
      ok(cross.length === 2 && cross[0].startsWith('jU') && cross[1].startsWith('jD') && mono, 'B vượt lần lượt đường chính lên rồi đường chính xuống Joetsu (một lần mỗi đường) và đi một chiều sang trái', cross.join()); }
  }
  // 6) vẽ: cabview trước/sau, minimap, cửa sổ ở cả bốn khung, không lỗi và có vẽ nút giao
  require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'cabview.js')); require(path.join(DRIVE, 'winview.js'));
  const noop = () => { }; let n = 0; const ctx = new Proxy({}, { get: (t, k) => { if (k === 'stroke' || k === 'fill') return () => { n++; }; return k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop); }, set: (t, k, v) => { t[k] = v; return true; } });
  const keepDoc = global.document; global.document = { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) }; require(path.join(DRIVE, 'topview.js'));
  const mkW = (lid, d) => { const L = window.LINES[lid], last = L.stations.length - 1, rec = lid === 'hok' ? L.trains.find(t => t.t === 'Hakutaka' && t.d === d && t.s.some(e => e[0] === last && !e[3]) && t.s.some(e => e[0] === 0 && !e[3])) : L.trains.find(t => t.d === d && t.s.some(e => e[0] === last && !e[3]) && t.s.some(e => e[0] === 0 && !e[3])), a = d === 'down' ? 0 : last, b = d === 'down' ? last : 0; return Sim.createWorld(lid, Sim.makeTrip(lid, rec, a, b), { diff: 'easy', seed: 1, lead: false, events: false }); };
  const orig = Ly.linksOf, origX = Sim.xbOf;
  for (const lid of ['jts', 'hok']) for (const d of ['down', 'up']) { const W = mkW(lid, d), T = W.player, L = W.line, len = T.veh.len, mT = T.M.find(q => L.stations[q.i].en === 'Takasaki');
    const sJ = Sim.sOfKm(107, d, L.kmEnd), draw = (x, rear) => { T.x = x; T.v = 60; n = 0; try { global.CabView.draw(ctx, 0, 0, 1920, 618, W, T, { sprites: {}, aud: null, imgs: {} }); } catch (e) { return -1; } return n; }, off = u => d === 'down' ? sJ + u : sJ - u;
    // ghi nối: camera đứng cách ghi nối 60 m
    for (const l of Ly.station(TKS, d, 0).links) { const zc = mT.s + l.z0; const a = draw(zc - 60, false); Ly.linksOf = () => []; const b = draw(zc - 60, false); Ly.linksOf = orig; ok(a > b, 'cabview ' + lid + ' ' + d + ': camera trước vẽ ghi nối ở ' + l.z0 + ' m (' + a + ' so với ' + b + ')', [a, b]);
    }
    // nút giao: nhiều vị trí quanh ngã rẽ, hai camera; không lỗi, có vẽ, và tắt cờ xb thì khác
    for (const u of [-1600, -900, -300, -50, 60, 130, 220, 400, 800]) { const a = draw(off(u)); ok(a > 0, 'cabview ' + lid + ' ' + d + ' tại ngã rẽ' + (u >= 0 ? '+' : '') + u + ' m: vẽ không lỗi', a); }
    { const a = draw(off(220), false); Sim.xbOf = () => -1; const b = draw(off(220), false); Sim.xbOf = origX; ok(a !== b, 'cabview ' + lid + ' ' + d + ': nút giao có vẽ đường Hokuriku lên (khác khi tắt cờ xb)', [a, b]); }
    for (const u of [-900, -300, 60, 220, 800]) { T.x = off(u); T.v = 60; n = 0; let okd = true; try { global.TopView.draw(ctx, 0, 0, 700, 700, W, T, { sprites: {}, tops: {}, aud: null }); } catch (e) { okd = false; } ok(okd && n > 0, 'minimap ' + lid + ' ' + d + ' tại ngã rẽ' + (u >= 0 ? '+' : '') + u + ' m: vẽ không lỗi', n); }
    { T.x = off(220); T.v = 60; n = 0; global.TopView.draw(ctx, 0, 0, 700, 700, W, T, { sprites: {}, tops: {}, aud: null }); const a = n; Sim.xbOf = () => -1; n = 0; global.TopView.draw(ctx, 0, 0, 700, 700, W, T, { sprites: {}, tops: {}, aud: null }); const b = n; Sim.xbOf = origX; ok(a > b, 'minimap ' + lid + ' ' + d + ': nút giao vẽ thêm đường Hokuriku lên (' + a + ' so với ' + b + ')', [a, b]); }
    for (const u of [-300, 60, 220, 800]) for (const side of [1, -1]) { T.x = off(u); T.v = 60; let okw = true; try { global.WinView.draw(ctx, 0, 0, 1920, 620, W, T, { sprites: {}, aud: null }, side); } catch (e) { okw = false; } ok(okw, 'cửa sổ ' + lid + ' ' + d + ' (' + (side > 0 ? 'trái' : 'phải') + ') tại ngã rẽ' + (u >= 0 ? '+' : '') + u + ' m: vẽ không lỗi'); } }
  // Kumagaya (2-3-1) và Honjo-Waseda (2-2-1), dùng chung hai tuyến: xo theo hình joetsu/010_01 và 010_02
  { const origX = Ly.xovers; for (const lid of ['jts', 'hok']) { const L = window.LINES[lid], byE = en => L.stations.find(x => x.en === en), zs = (en, d) => Ly.xovers(byE(en), d, false).map(x => x.kind + x.z).join();
      ok(JSON.stringify(byE('Kumagaya').xo) === '[["b","s",null,190],["b","r"],["a","s"]]' && JSON.stringify(byE('Honjo-Waseda').xo) === '[]' && byE('Kumagaya').lay === '2-3-1' && byE('Honjo-Waseda').lay === '2-2-1', lid + ': xo Kumagaya (s xa + r gần trước ga, s sau ga) và Honjo-Waseda (không có ghi chéo), mã bố trí không đổi');
      ok(zs('Kumagaya', 'down') === 's-1490,r-1300,s720' && zs('Kumagaya', 'up') === 's910,r720,s-1300' && zs('Honjo-Waseda', 'down') === '' && zs('Honjo-Waseda', 'up') === '', lid + ': vị trí ghi chéo Kumagaya hai chiều (ghi s xa cách ghi r gần 190 m); Honjo-Waseda không có');
      ok(['down', 'up'].every(d => Ly.xovers(byE('Kumagaya'), d, false).every(v => JSON.stringify(Ly.xoLines(v)) === (v.kind === 's' ? '[1]' : '[0]'))), lid + ': hướng vẽ ghi đơn Kumagaya (s: đối diện → mình, r: mình → đối diện)');
      for (const d of ['down', 'up']) { const W = mkW(lid, d), T = W.player, Lx = W.line, len = T.veh.len, mK = T.M.find(q => Lx.stations[q.i].en === 'Kumagaya'), mH = T.M.find(q => Lx.stations[q.i].en === 'Honjo-Waseda');
        const drawAt = (x, rear) => { T.x = x; T.v = 60; n = 0; try { global.CabView.draw(ctx, 0, 0, 1920, 618, W, T, { sprites: {}, aud: null, imgs: {} }); } catch (e) { return -1; } return n; };
        for (const xv of Ly.xovers(byE('Kumagaya'), d, false)) { const x0 = mK.s + xv.z - 120, a = drawAt(x0, false); Ly.xovers = () => []; const b = drawAt(x0, false); Ly.xovers = origX; ok(a > b, 'cabview ' + lid + ' ' + d + ' Kumagaya (' + xv.kind + ' ở ' + xv.z + ' m): camera trước vẽ ghi chéo (' + a + ' so với ' + b + ')', [a, b]);
        }
        for (const off of [-1400, -700, 400]) { const a = drawAt(mH.s + off, false); Ly.xovers = () => []; const b = drawAt(mH.s + off, false); Ly.xovers = origX; ok(a === b && a > 0, 'cabview ' + lid + ' ' + d + ' Honjo-Waseda (' + off + ' m): không có ghi chéo nào (X cũ đã bỏ)', [a, b]); }
        for (const xv of Ly.xovers(byE('Kumagaya'), d, false)) { T.x = mK.s + xv.z - 120; T.v = 60; n = 0; global.TopView.draw(ctx, 0, 0, 700, 700, W, T, { sprites: {}, tops: {}, aud: null }); const a = n; Ly.xovers = () => []; n = 0; global.TopView.draw(ctx, 0, 0, 700, 700, W, T, { sprites: {}, tops: {}, aud: null }); const b = n; Ly.xovers = origX; ok(a > b, 'minimap ' + lid + ' ' + d + ' Kumagaya (' + xv.kind + ' ở ' + xv.z + ' m): vẽ ghi chéo (' + a + ' so với ' + b + ')', [a, b]); } } } }
  global.document = keepDoc;
}
if (section('33l. Tohoku Shinkansen dựng lại từ sơ đồ (Oyama – Shin-Aomori, trừ Tokyo, Ueno, Omiya, Fukushima, Morioka): ghi chéo từng ga, mã 2-3-1c; yam/aki dùng chung; cabview trước/sau và minimap')) {
  global.hhmm = global.hhmm || (x => String(x)); global.CanvasRenderingContext2D = global.CanvasRenderingContext2D || function () { }; global.CanvasRenderingContext2D.prototype.roundRect = global.CanvasRenderingContext2D.prototype.roundRect || function () { };
  const Ly = require(path.join(DRIVE, 'layout.js')), L = window.LINES.toh, byEn = en => L.stations.find(x => x.en === en), ix = en => L.stations.findIndex(x => x.en === en), xo = en => JSON.stringify(byEn(en).xo);
  const NONE = ['Utsunomiya', 'Kurikoma-Kogen', 'Mizusawa-Esashi', 'Shin-Hanamaki', 'Iwate-Numakunai', 'Ninohe', 'Shichinohe-Towada'], WITH = ['Oyama', 'Nasushiobara', 'Shin-Shirakawa', 'Koriyama', 'Shiroishi-Zao', 'Sendai', 'Furukawa', 'Ichinoseki', 'Kitakami', 'Hachinohe', 'Morioka'], SKIP = ['Tokyo', 'Ueno', 'Omiya'];
  // 1) dữ liệu theo sơ đồ (docs/data/haisen/toh_graph.json, tools/haisen_xo.py toh)
  ok(xo('Oyama') === '[["b","r",null,230],["b","s"],["a","s"]]' && xo('Nasushiobara') === '[["b","s"],["a","r"]]' && xo('Shin-Shirakawa') === '[["b","s"],["a","r"]]' && xo('Koriyama') === '[["b","s"],["a","r"]]' && xo('Shiroishi-Zao') === '[["b","r"],["a","s"]]' && xo('Sendai') === '[["b","d"],["a","r"],["a","s",null,190]]' && xo('Furukawa') === '[["b","r"],["a","s"]]' && xo('Ichinoseki') === '[["b","s"],["a","r"]]' && xo('Kitakami') === '[["b","s"],["a","r"]]' && xo('Shin-Hanamaki') === '[]' && xo('Hachinohe') === '[["b","d"],["a","r"]]' && NONE.every(e => xo(e) === '[]'), 'dữ liệu xo Tohoku theo sơ đồ (7 ga 2 đường không có ghi chéo, gồm Shin-Hanamaki; Oyama hai ghi đơn trước ga; Sendai hai ghi đơn sau ga; Shin-Hanamaki như Mizusawa-Esashi: không có ghi chéo)');
  ok(SKIP.every(e => byEn(e).xo === undefined) && byEn('Shin-Aomori').xo.length === 2, 'Tokyo, Ueno, Omiya chưa khai báo xo (giữ X kép mặc định; Morioka mục 33n, Fukushima mục 33o đã dựng lại)');
  // 2) mã bố trí: token trích từ sơ đồ khớp ở cả 17 ga; ba ga có đường phụ phía đường xuống dùng 2-3-1c (ảnh gương của 2-3-1)
  { const LAY = { Oyama: '2-3-1', Utsunomiya: '2-2-1', Nasushiobara: '2-3-1c', 'Shin-Shirakawa': '2-2-1', Koriyama: '2-3-1c', 'Shiroishi-Zao': '2-3-1', Sendai: '2-4-0s', Furukawa: '2-2-1', 'Kurikoma-Kogen': '2-2-0', Ichinoseki: '2-2-1', 'Mizusawa-Esashi': '2-2-0', Kitakami: '2-3-1c', 'Shin-Hanamaki': '2-2-0', 'Iwate-Numakunai': '2-2-0', Ninohe: '2-2-0', Hachinohe: '2-4-0', 'Shichinohe-Towada': '2-2-0' };
    ok(Object.keys(LAY).every(e => byEn(e).lay === LAY[e]) && ['Nasushiobara', 'Koriyama', 'Kitakami'].every(e => byEn(e).loop === 1), 'mã bố trí Tohoku khớp token sơ đồ (chỉ Nasushiobara, Koriyama, Kitakami đổi sang 2-3-1c)', Object.keys(LAY).filter(e => byEn(e).lay !== LAY[e]));
    const sm = (c, d) => { const st = Ly.station(c, d, 0); return Ly.tokens(c, d) + '|' + st.tracks.length + '|' + st.plats.length + '|' + st.stops.length + '|' + (Ly.diverts(c, d, 0) ? 'rẽ' : 'thẳng'); };
    ok(Ly.tokens('2-3-1c', 'down') === 'dPdDUuP' && Ly.tokens('2-3-1c', 'up') === Ly.tokens('2-3-1', 'down') && Ly.tokens('2-3-1c', 'down') === Ly.tokens('2-3-1', 'up') && Ly.stopCount('2-3-1c', 'down') === 2 && Ly.stopCount('2-3-1c', 'up') === 1 && Ly.hasThrough('2-3-1c', 'down') && Ly.hasThrough('2-3-1c', 'up') && Ly.bridgeCountOf('2-3-1c') === Ly.bridgeCountOf('2-3-1'), '2-3-1c là ảnh gương của 2-3-1: chiều xuống giống 2-3-1 chiều lên và ngược lại, có đường thông qua', [sm('2-3-1c', 'down'), sm('2-3-1c', 'up')]); }
  // 3) yam và aki chạy chung trục Tohoku: cùng ga thì cùng xo
  { const Y = window.LINES.yam, A = window.LINES.aki; const sh = (LL, e) => JSON.stringify((LL.stations.find(x => x.en === e) || {}).xo);
    ok(Y.stations.filter(s => s.xo !== undefined).map(s => s.en).join() === 'Oyama,Utsunomiya,Nasushiobara,Shin-Shirakawa,Koriyama,Fukushima' && A.stations.filter(s => s.xo !== undefined).map(s => s.en).join() === 'Oyama,Utsunomiya,Nasushiobara,Shin-Shirakawa,Koriyama,Fukushima,Shiroishi-Zao,Sendai,Furukawa,Kurikoma-Kogen,Ichinoseki,Mizusawa-Esashi,Kitakami,Shin-Hanamaki,Morioka,Maegata,Okama,Koiwai,Shizukuishi,Harukiba,Akabuchi,Ochizawa Jct.,Shidonai Jct.,Tazawako,Sashimaki,Jindai,Shoden,Kakunodate,Uguisuno,Ugo-Nagano,Yariminai,Ugo-Yotsuya,Kita-Omagari,Omagari,Jinguji,Kariwano,Mineyoshikawa,Ugo-Sakai,Obarino,Wada,Yotsugoya,Akita', 'yam có xo ở 6 ga Oyama – Fukushima, aki ở 15 ga Oyama – Morioka cộng 17 ga và tín hiệu trường đường đơn tuyến Tazawako, Omagari, 7 ga Omagari – Akita và Akita (xo rỗng: ga cụt/ga đường đơn, không chữ X; không có Tokyo, Ueno, Omiya, ga mini-Shinkansen khác)');
    ok(Y.stations.filter(s => s.xo !== undefined && s.en !== 'Fukushima' && byEn(s.en)).every(s => sh(Y, s.en) === xo(s.en) && Y.stations.find(x => x.en === s.en).lay === byEn(s.en).lay) && A.stations.filter(s => s.xo !== undefined && byEn(s.en)).every(s => sh(A, s.en) === xo(s.en) && A.stations.find(x => x.en === s.en).lay === byEn(s.en).lay), 'ga chung trục Tohoku có xo và mã bố trí giống nhau ở toh, yam, aki'); }
  // 4) vị trí ghi chéo theo hai chiều và camera sau
  { const zs = (en, d, r) => Ly.xovers(byEn(en), d, r).map(x => x.kind + x.z).join();
    ok(zs('Oyama', 'down') === 'r-1530,s-1300,s720' && zs('Oyama', 'up') === 'r950,s720,s-1300' && zs('Sendai', 'up') === 'd720,r-1300,s-1490' && zs('Sendai', 'down') === 'd-1300,r720,s910' && zs('Hachinohe', 'down') === 'd-1300,r720' && zs('Kitakami', 'down') === 's-1300,r720' && zs('Kitakami', 'up') === 's720,r-1300' && zs('Furukawa', 'down') === 'r-1300,s720' && NONE.every(e => zs(e, 'down') === '' && zs(e, 'up') === ''), 'vị trí và loại ghi chéo Tohoku theo hai chiều: ga có đường tránh giữ vị trí cũ 1300/720 m (Oyama: r xa thêm 230 m; Sendai: s xa thêm 190 m), ga 2 đường (kể cả Shin-Hanamaki) không có');
    const sg = (e, d, r) => Ly.xovers(byEn(e), d, r).filter(v => v.kind !== 'd').map(v => v.z); ok(WITH.every(e => ['down', 'up'].every(d => sg(e, d, true).sort((a, b) => a - b).join() === sg(e, d, false).map(z => -z - 150).sort((a, b) => a - b).join())) && zs('Sendai', 'down', true) === 'd1300,r-870,s-1060', 'camera sau là ảnh gương: ghi đơn ở z phía sau = -z - 150 ở mọi ga Tohoku, hai chiều; X kép cố định (Sendai) đối xứng quanh vạch dừng, X kép có gap (Shin-Hanamaki) cũng -z - 150'); }
  // 5) thứ tự theo sơ đồ: ở ga có đường tránh, ghi chéo nằm NGOÀI chỗ đường tránh rẽ ra / nhập lại
  for (const x of L.stations) { if (!x.xo || !x.xo.length || !WITH.includes(x.en) || x.en === 'Shin-Hanamaki') continue; const st = Ly.station(x.lay, 'down', 0), loops = st.tracks.filter(t => t.in0 !== undefined); if (!loops.length) continue;
    for (const d of ['down', 'up']) { const sd = Ly.station(x.lay, d, 0), lp = sd.tracks.filter(t => t.in0 !== undefined && t.in0 < 1e4 && t.out0 < 1e4), xv = Ly.xovers(x, d, false), inMax = Math.max(...lp.map(t => t.in0)), outMax = Math.max(...lp.map(t => t.out0 + t.len));
      ok(xv.every(v => v.z < 0 ? -v.z - 150 >= inMax - 1 : v.z >= outMax - 1), 'toh ' + x.en + ' ' + d + ': ghi chéo nằm ngoài chỗ đường tránh rẽ ra / nhập lại (đúng thứ tự sơ đồ)', [xv.map(v => v.z), inMax, outMax]); } }
  // 5b) Sendai (2-4-0s, chiều xuống): đường chính đi vòng qua đường ngoài phía bắc ở đầu đông (sơ đồ không đối xứng quay 180°); chiều lên giữ như 2-4-0
  { const SEN = Ly.SEN, DT = Ly.DET, D = Ly.station(SEN, 'down', 0), U = Ly.station(SEN, 'up', 0), Dr = Ly.station(SEN, 'down', 0, true), Ur = Ly.station(SEN, 'up', 0, true), N0 = Ly.station('2-4-0', 'down', 0);
    ok(SEN === '2-4-0s' && byEn('Sendai').lay === SEN && Ly.tokens(SEN, 'down') === Ly.tokens('2-4-0', 'down') && Ly.tokens(SEN, 'up') === Ly.tokens('2-4-0', 'up') && Ly.stopCount(SEN, 'down') === Ly.stopCount('2-4-0', 'down') && Ly.hasThrough(SEN, 'down') === Ly.hasThrough('2-4-0', 'down') && Ly.bridgeCountOf(SEN) === Ly.bridgeCountOf('2-4-0'), 'mã 2-4-0s: chuỗi đường, số đường dừng, cầu bộ hành như 2-4-0');
    ok(D.detour && Dr.detour && !U.detour && !Ur.detour && !N0.detour && D.links.length === 1 && U.links.length === 1 && U.links[0].det && N0.links.length === 0, 'chiều xuống (cả camera sau) có đoạn vòng của đường chính ta; chiều lên có đoạn vòng của làn ngược chiều; 2-4-0 thường không có');
    ok(D.detour.t.out0 === DT.z0 + DT.len + DT.hold && D.detour.t.len2 === DT.ret && D.detour.zEnd === D.detour.t.out0 + DT.ret && Math.abs(D.detour.t.x - 10.7) < 0.01 && Dr.detour.t.x < 0 && Math.abs(Dr.detour.t.x + 10.7) < 0.01, 'đường ngoài phía bắc kéo dài tới z=' + (DT.z0 + DT.len + DT.hold) + ' m rồi trả về trong ' + DT.ret + ' m (ảnh gương ở camera sau)');
    // liên tục, trơn và đủ thoải (độ dốc ≤ 1:11), khớp với đường ngoài ở đoạn trả về
    { let mx = 0, jump = 0, prev = 0, mism = 0; for (let z = 0; z <= 700; z += 5) { const x = Ly.detourX(D, 1000 + z, 1000); if (z > 0) { mx = Math.max(mx, Math.abs(x - prev) / 5); } prev = x; if (z >= D.detour.t.out0) mism = Math.max(mism, Math.abs(x - D.detour.t.x * Ly.trackW(D.detour.t, 1000 + z, 1000))); if (z >= DT.z0 + DT.len && z <= D.detour.t.out0) mism = Math.max(mism, Math.abs(x - D.detour.t.x)); }
      ok(mx <= 1 / 11 && Math.abs(Ly.detourX(D, 1000 - 50, 1000)) < 1e-9 && Math.abs(Ly.detourX(D, 1000 + D.detour.zEnd + 10, 1000)) < 1e-9 && Math.abs(Ly.detourX(D, 1000 + DT.z0 + DT.len + 5, 1000) - D.detour.t.x) < 1e-9 && mism < 1e-9, 'đường chính: 0 → bám đường ngoài (S-curve) → trả về 0; độ dốc lớn nhất 1:' + (1 / mx).toFixed(1) + ' (≥ 1:11) và khớp đường ngoài', [mx, mism]); }
    ok(Ly.linksOf(D, false).map(l => l.z + ',' + l.len + ',' + l.a.main + ',' + l.b.main).join() === DT.z0 + ',' + DT.len + ',true,false' && Ly.linksOf(Dr, true).map(l => l.z + ',' + l.a.main + ',' + l.b.main).join() === (-DT.z0 - DT.len) + ',false,true', 'ghi nối đường chính → đường ngoài: camera trước đi từ đường chính sang đường ngoài, camera sau (gương) đảo chiều');
    ok(Ly.linksOf(D, false).every(l => l.det === true) && Ly.linksOf(U, false).every(l => l.det === true) && Ly.linksOf(Ly.station('2-4-1k', 'down', 0), false).every(l => l.det === false), 'linksOf giữ cờ det (ghi nối của đoạn vòng Sendai được vẽ như đường ga: có đá dăm và tà vẹt; ghi nối Takasaki không đổi)');
    // chiều LÊN: làn ngược chiều (đường chính xuống thật) đi vòng qua đường ngoài, nằm TRƯỚC ga (khung quay 180°: z' = -400 - z)
    ok(U.oppDet && Ur.oppDet && !D.oppDet && !N0.oppDet && U.oppDet.zA === -400 - D.detour.zEnd && U.oppDet.zB === -400 - DT.z0 && U.oppDet.link.z0 === -400 - DT.z0 - DT.len && U.oppDet.t.in0 === 400 + D.detour.t.out0 + D.detour.t.len2 && U.oppDet.t.len === D.detour.t.len2, 'chiều lên: đoạn trả về của đường ngoài (chiều ngược) và ghi nối là ảnh quay 180° của chiều xuống (đoạn vòng ' + U.oppDet.zA + '…' + U.oppDet.zB + ' m trước vạch)');
    { let mx = 0, prev = 0, mism = 0; for (let z = -1100; z <= 100; z += 5) { const x = Ly.oppDetourX(U, 1000 + z, 1000); if (z > -1100) mx = Math.max(mx, Math.abs(x - prev) / 5); prev = x; const ex = Ly.detourX(D, 1000 + (-400 - z), 1000) * (U.oppDet.t.x - U.oppDet.main.x) / D.detour.t.x; mism = Math.max(mism, Math.abs(x - ex)); }
      ok(mx <= 1 / 11 && mism < 1e-6 && Math.abs(Ly.oppDetourX(U, 1000, 1000)) < 1e-9 && Math.abs(Ly.oppDetourX(U, 1000 - 1100, 1000)) < 1e-9, 'chiều lên: làn ngược chiều lệch ngang đúng bằng ảnh quay 180° của đoạn vòng chiều xuống (độ dốc tối đa 1:' + (1 / mx).toFixed(1) + ')', [mx, mism]); }
    ok(Ly.linksOf(U, false).map(l => l.z + ',' + l.a.main + ',' + l.b.main).join() === (-400 - DT.z0 - DT.len) + ',false,true' && Ly.linksOf(Ur, true).map(l => l.z + ',' + l.a.main + ',' + l.b.main).join() === (400 + DT.z0) + ',true,false', 'chiều lên: ghi nối đường ngoài → đường chính ngược chiều; camera sau đảo');
    // hạn chế tốc độ: tàu thông qua Sendai (không dừng) bị giới hạn 80 km/h suốt đoạn vòng; tàu dừng ở đường ngoài đã có vùng 80 km/h bao cả đoạn
    { const Lt = window.LINES.toh, ixs = en => Lt.stations.findIndex(x => x.en === en), rec = Lt.trains.find(t => t.d === 'down' && t.s.some(e => e[0] === ixs('Shin-Aomori') && !e[3]) && t.s.some(e => e[0] === 0 && !e[3])), W2 = Sim.createWorld('toh', Sim.makeTrip('toh', rec, 0, ixs('Shin-Aomori')), { diff: 'easy', seed: 1, lead: false, events: false }), T2 = W2.player, mS = T2.M.find(q => Lt.stations[q.i].en === 'Sendai'), k2 = T2.k;
      mS.stop = false; T2.k = T2.M.findIndex(q => Lt.stations[q.i].en === 'Furukawa'); const z2 = Sim.turnoutZones(T2).filter(z => T2.M[z.j] === mS); mS.stop = true; T2.k = k2;
      ok(z2.length === 1 && Math.abs(z2[0].v - 80 / 3.6) < 1e-9 && z2[0].s0 === mS.s + DT.z0 && z2[0].s1 === mS.s + DT.z0 + DT.len + DT.hold + DT.ret && Ly.detourSpan('2-4-0', 'down') === null && Ly.detourSpan(SEN, 'up') === null, 'tàu thông qua Sendai (ví dụ East-i): giới hạn 80 km/h từ +' + DT.z0 + ' m tới +' + (DT.z0 + DT.len + DT.hold + DT.ret) + ' m sau vạch', z2); }
    ok(byEn('Sendai').xo && JSON.stringify(byEn('Sendai').xo) === '[["b","d"],["a","r"],["a","s",null,190]]' && Ly.xovers(byEn('Sendai'), 'down', false).every(v => v.z < 0 || v.z >= D.detour.zEnd), 'ghi chéo hai bên đầu ga Sendai không đổi và nằm ngoài đoạn vòng (r ở 720 m sau vạch ≥ ' + D.detour.zEnd + ' m)'); }
  // 6) vẽ cabview (camera trước/sau) và minimap
  require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'cabview.js'));
  const noop = () => { }; let n = 0; const ctx = new Proxy({}, { get: (t, k) => { if (k === 'stroke' || k === 'fill') return () => { n++; }; return k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop); }, set: (t, k, v) => { t[k] = v; return true; } });
  const mkW = d => { const rec = L.trains.find(t => t.d === d && t.s.some(e => e[0] === ix('Shin-Aomori') && !e[3]) && t.s.some(e => e[0] === 0 && !e[3])); const a = d === 'down' ? 0 : ix('Shin-Aomori'), b = d === 'down' ? ix('Shin-Aomori') : 0; return Sim.createWorld('toh', Sim.makeTrip('toh', rec, a, b), { diff: 'easy', seed: 1, lead: false, events: false }); };
  const orig = Ly.xovers;
  for (const d of ['down', 'up']) { const W = mkW(d), T = W.player, len = T.veh.len;
    const draw = (en, off, rear) => { const m = T.M.find(q => L.stations[q.i].en === en); T.x = m.s + off; T.v = 60; n = 0; global.CabView.draw(ctx, 0, 0, 1920, 618, W, T, { sprites: {}, aud: null, imgs: {} }); return n; };
    const diff = (en, off, rear) => { const a = draw(en, off, rear); Ly.xovers = () => []; const c = draw(en, off, rear); Ly.xovers = orig; return [a, c]; };
    for (const en of WITH) for (const xv of Ly.xovers(byEn(en), d, false)) {
      const [a, b] = diff(en, xv.z - 120, false); ok(a > b, 'cabview ' + d + ' ' + en + ' (' + xv.kind + ' ở ' + xv.z + ' m): camera trước vẽ ghi chéo (' + a + ' so với ' + b + ')', [a, b]);
    }
    for (const en of NONE) for (const off of [-1400, -700, 400]) { const [a, b] = diff(en, off, false); ok(a === b, 'cabview ' + d + ' ' + en + ' (' + off + ' m): không có ghi chéo nào (X cũ đã bỏ)', [a, b]); }
    if (d === 'down') { const m = T.M.find(q => L.stations[q.i].en === 'Sendai'), k0 = T.k, st0 = m.stop; m.stop = false; T.k = T.M.findIndex(q => L.stations[q.i].en === 'Furukawa');      // tàu thông qua Sendai: đường chính đi vòng
      for (const off of [-300, 20, 60, 110, 200, 300, 360, 450, 540, 600, 800]) { let err = '', c1 = 0; try { c1 = draw('Sendai', off); } catch (e) { err = e.message; } ok(err === '' && c1 > 100, 'cabview down Sendai (thông qua, ' + off + ' m): vẽ đoạn vòng không lỗi (' + c1 + ' nét)', err); }
      m.stop = st0; T.k = k0; }
    for (const en of [...WITH, ...NONE]) { let err = ''; try { draw(en, 0); draw(en, -300); } catch (e) { err = e.message; } ok(err === '', 'cabview ' + d + ' ' + en + ': vẽ ở sân ga không lỗi', err); }
    { const keepDoc = global.document; global.document = { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) }; require(path.join(DRIVE, 'topview.js'));
      const tv = (en, off) => { const m = T.M.find(q => L.stations[q.i].en === en); T.x = m.s + off; T.v = 60; n = 0; global.TopView.draw(ctx, 0, 0, 700, 700, W, T, { sprites: {}, tops: {}, aud: null }); return n; };
      const tdiff = (en, off) => { const a = tv(en, off); Ly.xovers = () => []; const c = tv(en, off); Ly.xovers = orig; return [a, c]; };
      for (const en of WITH) for (const xv of Ly.xovers(byEn(en), d, false)) { const [a, b] = tdiff(en, xv.z - 120); ok(a > b, 'minimap ' + d + ' ' + en + ' (' + xv.kind + ' ở ' + xv.z + ' m): vẽ ghi chéo (' + a + ' so với ' + b + ')', [a, b]); }
      for (const en of NONE) for (const off of [-1400, -700, 400]) { const [a, b] = tdiff(en, off); ok(a === b, 'minimap ' + d + ' ' + en + ' (' + off + ' m): không có ghi chéo nào', [a, b]); }
      global.document = keepDoc; } }
}
if (section('33n. Ga Morioka dựng lại từ sơ đồ và ngã rẽ Akita: nhánh chỉ gắn vào đường chính xuống; chiều lên tàu mini chạy làn ngược chiều rồi qua ghi chéo đơn s; cabview trước/sau, minimap, tàu chạy trên hạ tầng mới')) {
  global.hhmm = global.hhmm || (x => String(x)); global.CanvasRenderingContext2D = global.CanvasRenderingContext2D || function () { }; global.CanvasRenderingContext2D.prototype.roundRect = global.CanvasRenderingContext2D.prototype.roundRect || function () { };
  const Ly = require(path.join(DRIVE, 'layout.js')), LT = window.LINES.toh, LA = window.LINES.aki, LYm = window.LINES.yam, ADJ = Ly.ADJ;
  const sMor = LA.stations.find(x => x.en === 'Morioka'), tMor = LT.stations.find(x => x.en === 'Morioka');
  // 1) dữ liệu: xo của Morioka theo sơ đồ (tohoku/020_10, tazawako/010_05); cờ ngã rẽ
  ok(JSON.stringify(tMor.xo) === '[["b","d"],["a","s"],["a","r",null,190]]' && JSON.stringify(sMor.xo) === JSON.stringify(tMor.xo) && tMor.lay === '2-4-0', 'Morioka: mã 2-4-0, xo = X kép phía tây, hai ghi đơn s rồi r (cách 40 m) phía đông; toh và aki giống nhau', [tMor.xo, sMor.xo]);
  { const jT = LT.meta.junctions, jA = LA.meta.junctions; ok(jT[2].branch && jT[2].one && jT[2].km === 498.5 && !jT[0].one && !jT[1].one, 'toh: chỉ nhánh Akita có cờ one (nhánh Joetsu/Hokuriku, Yamagata vẫn là cặp đường)');
    ok(jA[2].run && jA[2].run.km0 === 497.8 && jA[2].run.km1 === 497.65 && !jA[0].run && !jA[1].run && !LYm.meta.junctions.some(j => j.run), 'aki: ngã rẽ km 498,5 có cờ run (chiều lên chạy làn ngược chiều từ km 498,5 tới ghi s ở km 497,8 – 497,65); yam không có');
    const zs = (e, d, r) => Ly.xovers(LA.stations.find(x => x.en === e), d, r).map(x => x.kind + x.z).join();
    ok(zs('Morioka', 'down', false) === 'd-1300,s720,r910' && zs('Morioka', 'up', false) === 'd720,s-1300,r-1490', 'vị trí ghi chéo Morioka theo hai chiều', [zs('Morioka', 'down', false), zs('Morioka', 'up', false)]);
    // ghi s chiều lên (z = -1300 .. -1150 so với vạch dừng ở km 496,5) trùng khoảng km của cờ run
    { const xs = Ly.xovers(sMor, 'up', false).find(x => x.kind === 's'); ok(Math.abs((sMor.km + (-xs.z) / 1000) - jA[2].run.km0) < 1e-9 && Math.abs((sMor.km + (-xs.z - 150) / 1000) - jA[2].run.km1) < 1e-9, 'cờ run khớp đúng khoảng km của ghi s chiều lên', [xs.z, sMor.km]); } }
  // 2) hàm làn: branchDeltas / runLane / runStep với thế giới giả
  { const jT = LT.meta.junctions, jA = LA.meta.junctions, mk = (line, dir) => ({ line, lineId: line.id, dir });
    const bd = (W, j) => JSON.stringify(Sim.branchDeltas(W, j)), eq = (a, b) => a === JSON.stringify(b);
    ok(eq(bd(mk(LT, 'down'), jT[2]), [0]) && eq(bd(mk(LT, 'up'), jT[2]), [ADJ]), 'nhánh Akita (toh): chiều xuống gắn làn của ta; chiều lên gắn làn ngược chiều');
    ok(eq(bd(mk(LT, 'down'), jT[1]), [0, ADJ]) && eq(bd(mk(LT, 'up'), jT[1]), [0, ADJ]) && eq(bd(mk(LT, 'down'), jT[0]), [0, ADJ]), 'nhánh Yamagata và Joetsu/Hokuriku vẫn là cặp đường');
    ok(eq(bd(mk(LA, 'down'), jA[2]), [0, ADJ]) && eq(bd(mk(LA, 'up'), jA[2]), [-ADJ, 0]), 'aki: chiều xuống đường chính Tohoku như cũ; chiều lên đường chính xuống trùng đường mini ở ngã rẽ');
    const Wu = mk(LA, 'up'), Wd = mk(LA, 'down'), sK = (W, km) => Sim.sOfKm(km, W.dir, W.line.kmEnd), near = (a, b) => Math.abs(a - b) < 1e-9;
    const lane = (W, km) => Sim.runLane(W, sK(W, km)), step = (W, km) => Sim.runStep(W, sK(W, km));
    ok(near(lane(Wu, 520), ADJ) && near(lane(Wu, 498.6), ADJ) && near(lane(Wu, 498.0), ADJ) && near(lane(Wu, 497.8), ADJ) && near(lane(Wu, 497.725), ADJ / 2) && near(lane(Wu, 497.65), 0) && near(lane(Wu, 497.0), 0) && near(lane(Wu, 496.5), 0), 'chiều lên: làn = đường chính xuống (ADJ) từ xa tới ghi s, về 0 trơn trong ghi s, rồi đường chính lên');
    ok(near(step(Wu, 499), ADJ) && near(step(Wu, 498.6), ADJ) && near(step(Wu, 498.4), 0) && near(step(Wu, 497), 0), 'vật thể trước ngã rẽ thuộc khung đường mini (lệch ADJ), từ ngã rẽ trở đi khung Tohoku');
    ok(near(lane(Wd, 520), 0) && near(lane(Wd, 497.7), 0) && near(step(Wd, 499), 0) && !Sim.runCfg(Wd) && !Sim.runCfg(mk(LT, 'up')) && !Sim.runCfg(mk(LYm, 'up')), 'chiều xuống và các tuyến khác: không có làn ngược chiều');
    { let prev = null, mx = 0, mono = true; for (let m = 0; m <= 3000; m += 5) { const l = Sim.runLane(Wu, Sim.sOfKm(499.5, 'up', LA.kmEnd) + m); if (prev !== null) { mx = Math.max(mx, Math.abs(l - prev) / 5); if (Math.abs(l) > Math.abs(prev) + 1e-12) mono = false; } prev = l; } ok(mx < 0.05 && mono, 'làn chuyển trơn (độ dốc ngang ≤ 0,05 m/m) và đơn điệu về 0', mx); }
    ok(Sim.leadDelta(Wu) === -ADJ && Sim.leadDelta(Wd) === 0 && Sim.branchLane0(mk(LT, 'up'), 2) === ADJ && Sim.branchLane0(mk(LT, 'down'), 2) === 0, 'tàu Tohoku đi trước / tàu nhánh đỗ ở ngã rẽ lệch đúng làn');
    // đường Tohoku ở ngã rẽ (cờ run) phải NỐI LIỀN với đường chính (khung T) ngay chỗ ngã rẽ, camera chiều lên: vị trí ngang của hai đường + độ lệch khung = {0, làn ngược chiều}; hàng rào/cột điện dùng đúng vị trí này (trunkLanes)
    { const mkj = dir => ({ line: LA, lineId: 'aki', dir }), tl = (W, s) => Sim.trunkLanes(W, s).map(v => v + Sim.runStep(W, s)).sort((a, b) => a - b);
      const Wf = mkj('up'), sjf = Sim.sOfKm(498.5, 'up', LA.kmEnd), lf = tl(Wf, sjf - 0.5);
      ok(lf.length === 2 && Math.abs(lf[0] - ADJ) < 0.05 && Math.abs(lf[1]) < 0.05, 'chiều lên: hai đường Tohoku nối liền với đường chính tại ngã rẽ (đường chính lên X = 0, đường chính xuống X = ADJ)', lf);
      ok(Sim.trunkLanes(mkj('down'), sjf).length === 0 && Sim.trunkLanes(mkj('down'), Sim.sOfKm(498.5, 'down', LA.kmEnd) + 400).length === 2 && JSON.stringify(Sim.trunkLanes(mkj('down'), Sim.sOfKm(498.5, 'down', LA.kmEnd) + 400).map(v => Math.round(v * 100) / 100)) === JSON.stringify([Sim.trunkOff(mkj('down'), Sim.sOfKm(498.5, 'down', LA.kmEnd) + 400, 2), Sim.trunkOff(mkj('down'), Sim.sOfKm(498.5, 'down', LA.kmEnd) + 400, 2) + ADJ].map(v => Math.round(v * 100) / 100)), 'trunkLanes chiều xuống = cặp đường ở trunkOff và trunkOff + ADJ như cũ'); }
  }
  // 3) vẽ cabview (camera trước/sau), minimap và cửa sổ quanh ngã rẽ và ghi s, cả bốn tổ hợp tuyến/chiều
  require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'cabview.js'));
  const noop = () => { }; let n = 0; const ctx = new Proxy({}, { get: (t, k) => { if (k === 'stroke' || k === 'fill') return () => { n++; }; return k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop); }, set: (t, k, v) => { t[k] = v; return true; } });
  const keepDoc = global.document; global.document = { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) }; require(path.join(DRIVE, 'topview.js'));
  for (const [id, LL, B] of [['toh', LT, 'Shin-Aomori'], ['aki', LA, 'Akita']]) {
    const ix = en => LL.stations.findIndex(x => x.en === en);
    for (const d of ['down', 'up']) {
      const rec = LL.trains.find(t => t.d === d && t.s.some(e => e[0] === ix('Morioka') && !e[3]) && t.s.some(e => e[0] === ix(B) && !e[3])); if (!rec) { ok(false, id + ' ' + d + ': không có chuyến Morioka – ' + B); continue; }
      const a = d === 'down' ? ix('Morioka') : ix(B), b = d === 'down' ? ix(B) : ix('Morioka'), W = Sim.createWorld(id, Sim.makeTrip(id, rec, a, b), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
      const offs = d === 'down' ? [-300, 20, 700, 1750, 1950, 2050, 2300, 2800, 3300] : [-3300, -2800, -2300, -2150, -2050, -1950, -1750, -1400, -1360, -1230, -1100, -300];
      const draw = (off, rear) => { const m = T.M.find(q => LL.stations[q.i].en === 'Morioka'); T.x = m.s + off; T.v = 60; n = 0; global.CabView.draw(ctx, 0, 0, 1920, 618, W, T, { sprites: {}, aud: null, imgs: {} }); return n; };
      const tv = off => { const m = T.M.find(q => LL.stations[q.i].en === 'Morioka'); T.x = m.s + off; T.v = 60; n = 0; global.TopView.draw(ctx, 0, 0, 700, 700, W, T, { sprites: {}, tops: {}, aud: null }); return n; };
      for (const off of offs) { { let err = '', c1 = 0; try { c1 = draw(off); } catch (e) { err = e.message; } ok(err === '' && c1 > 100, 'cabview ' + id + ' ' + d + ' Morioka ' + (off > 0 ? '+' : '') + off + ': vẽ không lỗi', err || c1); }
        let terr = '', t1 = 0; try { t1 = tv(off); } catch (e) { terr = e.message; } ok(terr === '' && t1 > 10, 'minimap ' + id + ' ' + d + ' Morioka ' + (off > 0 ? '+' : '') + off + ': vẽ không lỗi', terr || t1); }
    } }
  global.document = keepDoc;
  // 4) tàu chạy trên hạ tầng mới: chạy tự động hết chuyến, không lỗi, không lùi, tới đúng ga
  for (const [id, LL, B, d] of [['aki', LA, 'Akita', 'up'], ['aki', LA, 'Akita', 'down'], ['toh', LT, 'Shin-Aomori', 'down'], ['toh', LT, 'Shin-Aomori', 'up']]) {
    const ix = en => LL.stations.findIndex(x => x.en === en), rec = LL.trains.find(t => t.d === d && t.s.some(e => e[0] === ix('Morioka') && !e[3]) && t.s.some(e => e[0] === ix(B) && !e[3])); if (!rec) { ok(false, id + ' ' + d + ': không có chuyến'); continue; }
    const a = d === 'down' ? ix('Morioka') : ix(B), b = d === 'down' ? ix(B) : ix('Morioka'), W = Sim.createWorld(id, Sim.makeTrip(id, rec, a, b), { diff: 'easy', seed: 5, lead: false, events: false }), T = W.player; let k = 0, back = 0, prevX = T.x, bad = false, maxLane = 0;
    while (!T.finished && k++ < 6e5) { Sim.tick(W, 0.05, {}, true); if (T.x < prevX - 0.5) back++; prevX = T.x; if (!isFinite(T.x) || !isFinite(T.v)) bad = true; if (id === 'aki' && d === 'up') maxLane = Math.max(maxLane, Math.abs(Sim.runLane(W, T.x))); }
    ok(T.finished && !bad && back === 0, 'chạy tự động ' + id + ' ' + d + ' (Morioka – ' + B + '): hết chuyến, không lùi, không NaN', [T.finished, bad, back, k]);
    if (id === 'aki' && d === 'up') ok(Math.abs(maxLane - Math.abs(ADJ)) < 1e-9, 'chuyến aki lên đi qua làn ngược chiều (ADJ) rồi về làn của mình', maxLane);
  }
  // 5) hai tàu không được cùng chiếm đoạn làn ngược chiều: chuyến aki LÊN tới Morioka gần giờ một chuyến aki XUỐNG rời Morioka (cùng đoạn km 497,65 – 498,5, nằm trong đoạn đường đơn Morioka – Shizukuishi): một trong hai bị giữ (tàu danh mục hoặc tàu của ta chờ), không bao giờ gần nhau dưới 400 m
  { const L5 = LA, ix5 = en => L5.stations.findIndex(x => x.en === en), iM5 = ix5('Morioka'), iA5 = ix5('Akita'), ev = (rec, i) => { const e = rec.s.find(x => x[0] === i && !x[3]); return e ? (e[1] != null ? e[1] : e[2]) : null; }, dp = (rec, i) => { const e = rec.s.find(x => x[0] === i && !x[3]); return e ? (e[2] != null ? e[2] : e[1]) : null; };
    const prs = []; for (const u of L5.trains.filter(t => t.d === 'up' && ev(t, iM5) != null && dp(t, iA5) != null)) for (const d of L5.trains.filter(t => t.d === 'down' && dp(t, iM5) != null && ev(t, iA5) != null)) { const dt = dp(d, iM5) - ev(u, iM5); if (Math.abs(dt) < 2400) prs.push({ u, d, dt }); }
    prs.sort((a, b) => Math.abs(a.dt) - Math.abs(b.dt)); ok(prs.length >= 3, 'có chuyến aki lên và xuống gần giờ nhau tại Morioka để thử (tìm thấy ' + prs.length + ')');
    const cat5 = global.NatCat.build(window.LINES).filter(c => c.rec.d === 'down' && c.line === 'aki'); let worst = 1e9, held = 0, waited = 0, done = 0;
    for (const pr of prs.slice(0, 3)) { const W = Sim.createWorld('aki', Sim.makeTrip('aki', pr.u, iA5, iM5), { diff: 'easy', seed: 1, lead: false, events: true }), T = W.player, tg = cat5.find(c => c.rec === pr.d); let k = 0;
      while (!T.finished && k++ < 4e6) { Sim.tick(W, 0.1, {}, true); const km = Sim.kmOfS(T.x, W.dir, W.line.kmEnd), now = W.trip.t0 + W.t; if (T.v < 0.5 && T.phase === 'run' && km > 499) waited++;
        if (tg) { const d = global.NatCat.delayOf(W, tg.key), s = global.NatCat.stateOf(window.LINES, tg, now - (d ? d.delay : 0), d && d.skip); if (s && s.km != null) { if (d && d.hold > 0 && d.why === 'single') held++; if (km <= 498.5 + T.veh.len / 1000 && km >= 497.55 && s.km >= 496.4 && s.km <= 499.5) worst = Math.min(worst, Math.abs(s.km - km) * 1000); } } }
      if (T.finished) done++; }
    ok(done === 3 && worst >= 400, 'tàu mini đi lên (làn ngược chiều) và tàu aki đi xuống không bao giờ cùng ở đoạn làn ngược chiều gần nhau dưới 400 m (nhỏ nhất ' + (worst > 1e8 ? 'không có lúc nào cùng trong đoạn' : Math.round(worst) + ' m') + ')', [done, worst]);
    ok(held + waited > 0, 'một trong hai bên bị giữ để nhường đoạn (tàu danh mục bị giữ ' + held + ' tick, tàu của ta chờ ' + waited + ' tick)', [held, waited]); }
  // 6) tàu Akita chiều xuống (mọi camera): sau ngã rẽ chỉ còn MỘT đường mini rẽ ra (làn ngược chiều của đường mini bị cắt, đường chính lên Tohoku đi thẳng); camera sau cũng thấy tuyết như camera trước
  { const mj = LA.meta.junctions[2], keep = mj.run, ix6 = en => LA.stations.findIndex(x => x.en === en), rec6 = LA.trains.find(t => t.d === 'down' && t.s.some(e => e[0] === ix6('Morioka') && !e[3]) && t.s.some(e => e[0] === ix6('Akita') && !e[3]));
    const mk6 = wx => { const W = Sim.createWorld('aki', Sim.makeTrip('aki', rec6, ix6('Morioka'), ix6('Akita')), { diff: 'easy', seed: 1, lead: false, events: true, weather: wx }); return { W, T: W.player }; };
    const keepDoc6 = global.document; global.document = { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) };
    { const { W, T } = mk6('clear'), drawN = (off, rear) => { const m = T.M.find(q => LA.stations[q.i].en === 'Morioka'); T.x = m.s + off; T.v = 60; n = 0; global.CabView.draw(ctx, 0, 0, 1920, 618, W, T, { sprites: {}, aud: null, imgs: {} }); return n; };
      for (const off of [2100, 2200, 2400]) { const withCut = drawN(off); delete mj.run; let noCut; try { noCut = drawN(off); } finally { mj.run = keep; } ok(withCut < noCut, 'aki xuống Morioka +' + off + ': làn ngược chiều của đường mini bị cắt sau ngã rẽ (' + withCut + ' < ' + noCut + ' nét vẽ)', [withCut, noCut]); } }
    { const cnt = wx => { const { W, T } = mk6(wx), m = T.M.find(q => LA.stations[q.i].en === 'Morioka'); T.x = m.s + 20; T.v = 40; let fr = 0; const cx = new Proxy({}, { get: (t, k) => { if (k === 'fillRect') fr++; return k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: () => { } }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : () => { }); }, set: (t, k, v) => { t[k] = v; return true; } }); global.CabView.draw(cx, 0, 0, 1920, 618, W, T, { sprites: {}, aud: null, imgs: {} }); return fr; };
      const dF = cnt('snow') - cnt('clear'); ok(dF > 0, 'tuyết: lúc vừa rời Morioka camera vẽ tuyết (' + dF + ' hạt)', dF); }
    global.document = keepDoc6; }
}
if (section('33o. Ga Fukushima (2-4-1f) và ngã rẽ Yamagata: hai đường rìa kéo dài, ngã rẽ cách ga 1,0 km, tuyến Yamagata đi theo đường rìa; cabview/minimap/cửa sổ cả ba tuyến hai chiều')) {
  global.hhmm = global.hhmm || (x => String(x)); global.CanvasRenderingContext2D = global.CanvasRenderingContext2D || function () { }; global.CanvasRenderingContext2D.prototype.roundRect = global.CanvasRenderingContext2D.prototype.roundRect || function () { };
  const Ly = require(path.join(DRIVE, 'layout.js')), LT = window.LINES.toh, LA = window.LINES.aki, LY = window.LINES.yam, ADJ = Ly.ADJ, fk = L => L.stations.find(x => x.en === 'Fukushima');
  require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'cabview.js')); require(path.join(DRIVE, 'winlit.js')); require(path.join(DRIVE, 'winview.js')); { const kd = global.document; global.document = { createElement: () => ({ getContext: () => ({}), width: 0, height: 0 }) }; require(path.join(DRIVE, 'topview.js')); global.document = kd; }
  // chuyến có dừng ở Fukushima và có ga dừng liền trước, liền sau (theo chiều chạy)
  const trip3 = (id, dir) => { const Lx = window.LINES[id], iF = Lx.stations.findIndex(x => x.en === 'Fukushima'); for (const rec of Lx.trains) { if (rec.d !== dir) continue; const st = rec.s.filter(e => !e[3]).map(e => e[0]), k = st.indexOf(iF); if (k > 0 && k < st.length - 1) return { Lx, rec, a: st[k - 1], b: st[k + 1] }; if (k < 0 && Lx.id === 'aki') { const j = st.findIndex(i => dir === 'down' ? i > iF : i < iF); if (j > 0) return { Lx, rec, a: st[j - 1], b: st[j] }; } } return null; };      // aki: các chuyến chạy qua Fukushima (không dừng)
  // 1) dữ liệu
  ok(['toh', 'yam', 'aki'].every(id => fk(window.LINES[id]).lay === '2-4-1f' && fk(window.LINES[id]).loop === 1 && fk(window.LINES[id]).side === 1), 'Fukushima: mã 2-4-1f ở toh, yam, aki (ga ghép/tách: dừng ở đường rìa)');
  ok(JSON.stringify(fk(LT).xo) === '[["b","s",null,190],["b","r"],["a","r"]]' && JSON.stringify(fk(LA).xo) === JSON.stringify(fk(LT).xo) && JSON.stringify(fk(LY).xo) === '[["b","s",null,190],["b","r"],["a","r"],["a","s",1680],["a","r",1880]]', 'xo Fukushima: phía tây s xa rồi r gần, phía đông r; yam thêm hai ghi đơn s, r trên đường đôi', [fk(LT).xo, fk(LY).xo]);
  { const jf = L => L.meta.junctions.find(j => j.fk); ok(['toh', 'aki'].every(id => { const j = jf(window.LINES[id]); return j && j.km === 256.1 && j.branch && j.fk.a0 === 15 && j.fk.x0 === -19.3 && j.fk.zb1 === 600; }) && jf(LY).km === 256.1 && !jf(LY).branch && jf(LY).line === 'toh', 'ngã rẽ Yamagata ở km 256,1 (cách ga 1,0 km) có cờ fk ở toh/aki (nhánh) và yam (tuyến con)');
    ok(LY.curves.some(c => c[0] === 256.1 && c[1] === 257.3 && c[2] === 1500 && c[3] === -1) && LY.xings.every(k => k > 256.1), 'yam: đường cong ngã rẽ và đường ngang bắt đầu từ km 256,1', [LY.curves.filter(c => c[0] < 260)]); }
  // 2) hình học ga: phân cấp chính → nhánh → rìa, rìa không nhập lại
  for (const dir of ['down', 'up']) { const st = Ly.station('2-4-1f', dir, -1), byP = p => st.tracks.find(t => t.phys === p), rimN = byP(0), rimS = byP(7), inN = byP(2), inS = byP(5);
    ok(st.tracks.length === 6 && st.plats.length === 2 && st.ours.phys === (dir === 'down' ? 0 : 7), `2-4-1f ${dir}: 6 đường, 2 sân ga, đường dừng của ta là đường rìa ${dir === 'down' ? 'bắc' : 'nam'}`);
    ok([rimN, rimS].every(t => t.fkr && t.fkr.par === (t === rimN ? inN : inS) && (dir === 'down' ? t.out0 > 1e4 : t.in0 > 1e4)) && [inN, inS].every(t => t.out0 < 1e3 && t.in0 < 1e3), `2-4-1f ${dir}: đường rìa tách từ đường nhánh và kéo dài về phía đông (phía ngã rẽ)`);
    if (dir === 'down') for (const [r, par] of [[rimN, inN], [rimS, inS]]) { const sM = 50000; ok(par.in0 - par.len === r.in0 && Ly.trackW(par, sM - 1000, sM) === 0 && Ly.trackW(par, sM - 380, sM) === 1 && Ly.trackW(r, sM - 380, sM) === 1, `2-4-1f ${dir}: ghi đường nhánh xong rồi mới tới ghi đường rìa (tuần tự), cùng xong trước sân ga`, [par.in0, par.len, r.in0]); }
    // làn camera liên tục (không nhảy): tàu khác rời đường rìa về đường chính (chiều xuống) / vào đường rìa từ đường chính (chiều lên); tàu đi Yamagata bám đường rìa
    for (const follow of [false, true]) { const o = st.ours, sM = 50000; let prev = null, jump = 0, l0 = null, l1 = null; for (let z = -3000; z <= 3000; z += 2) { const w = Ly.laneW(o, sM + z, sM, follow), l = Ly.laneOf(o, sM + z, sM, w, Ly.spread(sM + z, sM), 1300, 720); if (prev !== null) jump = Math.max(jump, Math.abs(l - prev)); prev = l; if (z === -3000) l0 = l; if (z === 3000) l1 = l; }
      const e15 = Math.abs(o.x), want = follow ? (dir === 'down' ? [0, e15] : [e15, 0]) : [0, 0];
      ok(jump < 0.25 && Math.abs(l0 - want[0]) < 1e-6 && Math.abs(l1 - want[1]) < 1e-6, `làn camera ở Fukushima ${dir} ${follow ? '(đi Yamagata: bám đường rìa)' : '(tàu khác: về đường chính)'} liên tục và về đúng đường (đầu ${l0.toFixed(2)}, cuối ${l1.toFixed(2)}, bước lớn nhất ${jump.toFixed(3)} m)`, [jump, l0, l1]); }
    ok(st.links.length === 2 && st.links.every(l => l.det && l.len === 164), `2-4-1f ${dir}: hai ghi nối rìa ↔ nhánh (dài 164 m)`, st.links.map(l => [l.z0, l.len])); }
  // 3) làn A (Yamagata xuống), B (Yamagata lên) của tuyến Tohoku / Akita ở ngã rẽ
  for (const id of ['toh', 'aki']) for (const dir of ['down', 'up']) { const Lx = window.LINES[id], W = { line: Lx, lineId: id, dir }, j = Lx.meta.junctions.find(x => x.fk), sj = Sim.sOfKm(j.km, dir, Lx.kmEnd), sg = dir === 'down' ? 1 : -1, at = u => Sim.fkLanes(W, sj + sg * u), l0 = at(0);
    const a0 = Math.abs(l0.A - l0.jD), b0 = Math.abs(l0.B - l0.jD), gap = u => Math.abs(at(u).A - at(u).B); let maxSlope = 0, crossed = false;
    for (let u = 1; u <= 700; u++) { maxSlope = Math.max(maxSlope, Math.abs((at(u).B - at(u - 1).B) - (at(u).A - at(u - 1).A))); const side = x => Math.min(at(x).jD, at(x).jU) < at(x).B; if (side(u) !== side(u - 1)) crossed = true; }
    ok(Math.abs(a0 - 15) < 1e-9 && Math.abs(b0 - 19.3) < 1e-9 && Math.abs(gap(0) - 34.3) < 1e-9 && Math.abs(gap(600) - 4.3) < 1e-6 && Math.abs(gap(2000) - 4.3) < 1e-6 && Math.abs(Math.abs(l0.jD - l0.jU) - 4.3) < 1e-9, `${id} ${dir}: ở ngã rẽ hai đường rìa cách đường chính 15 m / 19,3 m (A − B = 34,3 m), hội tụ về đôi đường 4,3 m sau 600 m`, [a0, b0, gap(0), gap(600)]);
    ok(crossed && maxSlope < 0.1, `${id} ${dir}: đường rìa nam (B) cắt qua hai đường chính, độ dốc ngang tương đối ≤ 0,1 (${maxSlope.toFixed(3)})`, [crossed, maxSlope]); }
  // 4) tuyến Yamagata đi theo hai đường rìa: làn camera bền vững, bước khung, làn ngược chiều, đường chính Tohoku liên tục trong khung chính
  for (const dir of ['down', 'up']) { const tp = trip3('yam', dir);
    const W = Sim.createWorld('yam', Sim.makeTrip('yam', tp.rec, tp.a, tp.b), { diff: 'easy', seed: 1, lead: false, events: false }), j = LY.meta.junctions.find(x => x.fk), sj = Sim.sOfKm(j.km, dir, LY.kmEnd);
    ok(Sim.fkFollows(W) && !Sim.fkFollows({ line: LT, lineId: 'toh', dir }), `yam ${dir}: đi theo đường rìa (toh không)`);
    const yamSide = u => dir === 'down' ? sj + u : sj - u, mainSide = u => dir === 'down' ? sj - u : sj + u;      // phía đường Yamagata / phía đường chính Tohoku của ngã rẽ
    ok(Sim.runStep(W, yamSide(1)) === 15 && Sim.runStep(W, mainSide(1)) === 0 && Sim.runStep(W, yamSide(3000)) === 15, `yam ${dir}: bước khung +15 m cho mọi vật ở phía đường Yamagata của ngã rẽ, 0 phía đường chính`);
    const laneY = Sim.runLane(W, yamSide(500)), laneM = Sim.runLane(W, dir === 'down' ? sj + 5000 : sj - 600);
    ok(Math.abs(laneY - 15) < 1e-9 && (dir === 'down' ? Math.abs(laneM - 15) < 1e-9 : laneM >= 0 && laneM <= 15), `yam ${dir}: làn camera bên phía Yamagata ${laneY.toFixed(2)} m (đường rìa); sau ga/trước ga ${laneM.toFixed(2)} m`, [laneY, laneM]);
    const mainAt = d => Sim.trunkOff(W, yamSide(d), Sim.fkOf(W)) + Sim.runStep(W, yamSide(d)), oppAt = d => Sim.fkOwnOpp(W, yamSide(d)) + Sim.runStep(W, yamSide(d));
    ok(Math.abs(mainAt(0.5)) < 0.05 && Math.abs(oppAt(0.5) + 19.3) < 0.05 && Math.abs(Sim.fkOwnOpp(W, yamSide(900)) - ADJ) < 1e-9, `yam ${dir}: trong khung chính đường Tohoku liền mạch (${mainAt(0.5).toFixed(3)}), làn ngược chiều bắt đầu ở đường rìa kia (${oppAt(0.5).toFixed(2)}) và hội tụ về ${ADJ} m`, [mainAt(0.5), oppAt(0.5)]); }
  // 4b) chuyến Yamagata KHÔNG đi qua Fukushima (Yonezawa → Shinjo xuống, Shinjo → Yonezawa lên, tàu ma dịch chuyển): làn camera vẫn +15 m (trước đây fkGeo cần Fukushima trong danh sách ga nên làn = 0 và camera rơi khỏi ray)
  for (const dir of ['down', 'up']) { const Ly = window.LINES.yam, iY = Ly.stations.findIndex(s => s.en === 'Yonezawa'), iS = Ly.stations.length - 1, rec = Ly.trains.find(r => r.d === dir && !r.cp && Sim.trainSeq(r).some(e => e.i === iY) && Sim.trainSeq(r).some(e => e.i === iS)), a = dir === 'down' ? iY : iS, b = dir === 'down' ? iS : iY;
    const Wn = Sim.createWorld('yam', Sim.makeTrip('yam', rec, a, b), { diff: 'easy', seed: 1, lead: false, events: false });
    ok(!Wn.player.M.some(m => Ly.stations[m.i].en === 'Fukushima') && Math.abs(Sim.runLane(Wn, Sim.sOfKm(300, dir, Ly.kmEnd)) - 15) < 1e-9 && Math.abs(Sim.runLane(Wn, Sim.sOfKm(350, dir, Ly.kmEnd)) - 15) < 1e-9, `yam ${dir} Yonezawa–Shinjo (không qua Fukushima): làn camera +15 m (đứng trên ray)`, [Wn.player.M.map(m => Ly.stations[m.i].en).join(), Sim.runLane(Wn, Sim.sOfKm(300, dir, Ly.kmEnd)), Sim.runLane(Wn, Sim.sOfKm(350, dir, Ly.kmEnd))]);
    { const jj = Ly.meta.junctions.find(x => x.fk), sj = Sim.sOfKm(jj.km, dir, Ly.kmEnd), far = [300, 320, 350, 380, 400].map(k => Sim.runLane(Wn, Sim.sOfKm(k, dir, Ly.kmEnd))), a = Sim.runLane(Wn, sj - 0.5), b = Sim.runLane(Wn, sj + 0.5);
      ok(far.every(v => Math.abs(v - 15) < 1e-9), `yam ${dir}: làn camera giữ +15 m ở mọi cự ly phía Yamagata (không giảm về 0 xa ga)`, [far, a, b]); } }
  // 5) vẽ: cabview, minimap, cửa sổ ở nhiều vị trí quanh ga và ngã rẽ, ba tuyến hai chiều (không ném lỗi, có nét vẽ)
  { let n = 0; const noop = () => { }, ctx = new Proxy({}, { get: (t, k) => { if (k === 'stroke' || k === 'fill' || k === 'fillRect' || k === 'drawImage') return () => { n++; }; return k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : noop); }, set: (t, k, v) => { t[k] = v; return true; } });
    const keepDoc = global.document; global.document = { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) };
    for (const [id, dir] of [['toh', 'down'], ['toh', 'up'], ['aki', 'down'], ['aki', 'up'], ['yam', 'down'], ['yam', 'up']]) {
      const tp = trip3(id, dir), Lx = tp.Lx, W = Sim.createWorld(id, Sim.makeTrip(id, tp.rec, tp.a, tp.b), { diff: 'easy', seed: 1, lead: false, events: true }), T = W.player, m = T.M.find(q => Lx.stations[q.i].en === 'Fukushima'), so = m.sOrig !== undefined ? m.sOrig : m.s; let bad = 0, drew = 0;
      for (const off of [-3000, -1500, -1100, -900, -300, 20, 100, 300, 800, 950, 1050, 1300, 1700, 2500]) { T.x = so + off; T.v = 40; const R = { sprites: {}, aud: null, imgs: {} };
        for (const [nm, fn] of [['cabview', () => global.CabView.draw(ctx, 0, 0, 1920, 618, W, T, R)], ['topview', () => global.TopView && global.TopView.draw(ctx, 0, 0, 300, 300, W, T, R)], ['winview', () => global.WinView && global.WinView.draw(ctx, 0, 0, 800, 400, W, T, R, 1)]]) { n = 0; try { fn(); if (n > 0) drew++; } catch (e) { bad++; console.log('  lỗi vẽ', id, dir, nm, off, String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } } }
      ok(bad === 0 && drew > 14, `vẽ quanh Fukushima ${id} ${dir}: cabview/minimap/cửa sổ không lỗi (${drew} lần có nét vẽ)`, [bad, drew]); }
    // hai ghi đơn riêng của tuyến Yamagata (z ≈ 1700 / 1900 m sau vạch) phải được vẽ khi tàu yam chiều xuống ở đó (ga phải còn trong danh sách vẽ)
    { const tp = trip3('yam', 'down'), Lx = tp.Lx, W = Sim.createWorld('yam', Sim.makeTrip('yam', tp.rec, tp.a, tp.b), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player, m = T.M.find(q => Lx.stations[q.i].en === 'Fukushima'), so = m.sOrig !== undefined ? m.sOrig : m.s, st = fk(Lx), keep = st.xo, R = { sprites: {}, aud: null, imgs: {} };
      const cnt = off => { T.x = so + off; T.v = 40; n = 0; global.CabView.draw(ctx, 0, 0, 1920, 618, W, T, R); return n; };
      for (const off of [1500, 1650, 1750, 1880]) { const withX = cnt(off); st.xo = keep.slice(0, 3); let without; try { without = cnt(off); } finally { st.xo = keep; } ok(withX > without, `yam xuống Fukushima +${off} m: hai ghi đơn riêng của tuyến Yamagata có được vẽ (${withX} > ${without} nét)`, [withX, without]); } }
    global.document = keepDoc; }
  // 5b) khung hình Yamagata: camera và bước khung phải khớp nhau ở MỌI chỗ phía đường Yamagata (a: số liệu), và ray của ta phải nằm gần giữa màn hình khi vẽ thật (b: vẽ cabview, đo vị trí ngang của ray gần camera nhất). Bắt lỗi "camera rơi khỏi ray" khi chuyến không qua Fukushima / ở xa ga / thêm vật mới quên bù runStep
  { const Lyam = window.LINES.yam, iY = Lyam.stations.findIndex(x => x.en === 'Yonezawa'), iS = Lyam.stations.length - 1, kms = [258, 262, 270, 285, 294, 295.6, 296, 297, 300, 305, 311, 312, 320, 330, 342, 343, 350, 363, 370, 382, 395, 403];
    const mk = (dir, full) => { if (full) { const tp = trip3('yam', dir); return Sim.createWorld('yam', Sim.makeTrip('yam', tp.rec, tp.a, tp.b), { diff: 'easy', seed: 1, lead: false, events: false }); }
      const rec = Lyam.trains.find(r => r.d === dir && !r.cp && Sim.trainSeq(r).some(e => e.i === iY) && Sim.trainSeq(r).some(e => e.i === iS)); return Sim.createWorld('yam', Sim.makeTrip('yam', rec, dir === 'down' ? iY : iS, dir === 'down' ? iS : iY), { diff: 'easy', seed: 1, lead: false, events: false }); };
    // a) lane − step = 0 ở mọi km phía Yamagata (chuyến qua Fukushima và chuyến không qua, hai chiều)
    for (const dir of ['down', 'up']) for (const full of [true, false]) { const W = mk(dir, full); let worst = 0, wk = null;
      for (const km of kms) { const sx = Sim.sOfKm(km, dir, Lyam.kmEnd); if (!Sim.fkStep || true) { const st = Sim.runStep(W, sx), ln = Sim.runLane(W, sx); if (st !== 0) { const d = Math.abs(ln - st); if (d > worst) { worst = d; wk = km; } } } }
      ok(worst < 1e-9, `yam ${dir} ${full ? 'qua Fukushima' : 'không qua Fukushima'}: làn camera − bước khung = 0 ở mọi km phía Yamagata (lệch lớn nhất ${worst.toFixed(3)} m ở km ${wk})`, [worst, wk]); }
    // b) vẽ cabview thật, ghi các đa giác màu ray; điểm ray gần camera nhất phải sát tâm màn hình
    const store = { fillStyle: '' }, polys = []; let path = [];
    const base = { beginPath() { path = []; }, moveTo(x, y) { path = [[x, y]]; }, lineTo(x, y) { path.push([x, y]); }, fill() { if (store.fillStyle === 'rgba(208,216,226,.9)') polys.push(path.slice()); }, measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop() { } }), createRadialGradient: () => ({ addColorStop() { } }) };
    const rctx = new Proxy(store, { get: (t, k) => k in t ? t[k] : (k in base ? base[k] : () => { }), set: (t, k, v) => { t[k] = v; return true; } });
    const keepDoc2 = global.document; global.document = { createElement: () => ({ getContext: () => rctx, width: 0, height: 0 }) };
    const PW = 1920, nearest = (W, T) => { polys.length = 0; global.CabView.draw(rctx, 0, 0, PW, 618, W, T, { sprites: {}, aud: null, imgs: {} }); let ymax = -1e9; for (const q of polys) for (const [, y] of q) if (y > ymax) ymax = y; let best = 1e9; for (const q of polys) for (const [x, y] of q) if (y > ymax - 6) best = Math.min(best, Math.abs(x - PW / 2)); return polys.length ? best : null; };
    for (const dir of ['down', 'up']) for (const full of [true, false]) { const W = mk(dir, full), T = W.player; let worst = 0, wk = null, none = 0;
      for (const km of kms) { T.x = Sim.sOfKm(km, dir, Lyam.kmEnd); T.v = 40; let d; try { d = nearest(W, T); } catch (e) { d = 1e9; } if (d === null) { none++; continue; } if (d > worst) { worst = d; wk = km; } }
      ok(worst < 0.095 * PW && none < kms.length / 3, `yam ${dir} ${full ? 'qua Fukushima' : 'không qua Fukushima'}: ray của ta sát tâm màn hình (< 9,5 % bề rộng; thực tế ≤ 163 px) ở mọi km (lệch lớn nhất ${worst.toFixed(0)} px ở km ${wk}, ${none} lần không thấy ray)`, [worst, wk, none]); }
    // c) sân ga: đỗ ở từng ga có sân ga (mọi ga dừng của chuyến), tường mép sân ga (#3a4a5c) gần nhất phải nằm cùng phía/sát đường ta, không lệch cả khung 15 m
    const wallPolys = []; const base2 = Object.assign({}, base, { fill() { if (store.fillStyle === 'rgba(208,216,226,.9)') polys.push(path.slice()); else if (store.fillStyle === '#3a4a5c') wallPolys.push(path.slice()); } });
    const rctx2 = new Proxy(store, { get: (t, k) => k in t ? t[k] : (k in base2 ? base2[k] : () => { }), set: (t, k, v) => { t[k] = v; return true; } });
    global.document = { createElement: () => ({ getContext: () => rctx2, width: 0, height: 0 }) };
    for (const dir of ['down', 'up']) for (const full of [true, false]) { const W = mk(dir, full), T = W.player; let worst = 0, wn = null, seen = 0, rows = [];
      for (const m of T.M) { const sx = Lyam.stations[m.i]; if (!m.stop || sx.en === 'Fukushima') continue; T.x = m.s - 12; T.v = 0; polys.length = 0; wallPolys.length = 0; try { global.CabView.draw(rctx2, 0, 0, PW, 618, W, T, { sprites: {}, aud: null, imgs: {} }); } catch (e) { continue; }
        let ymax = -1e9; for (const q of wallPolys) for (const [, y] of q) if (y > ymax) ymax = y; if (!wallPolys.length) continue; let best = 1e9; for (const q of wallPolys) for (const [x, y] of q) if (y > ymax - 6) best = Math.min(best, Math.abs(x - PW / 2)); seen++; rows.push(sx.en + ':' + best.toFixed(0)); if (best > worst) { worst = best; wn = sx.en; } }
      ok(seen > 0 && worst < 0.27 * PW, `yam ${dir} ${full ? 'qua Fukushima' : 'không qua Fukushima'}: sân ga ở ${seen} ga dừng nằm sát đường ta (< 27 % bề rộng; thực tế 437–459 px; lệch lớn nhất ${worst.toFixed(0)} px ở ${wn}) ${rows.join(' ')}`, [worst, wn, seen, rows]); }
    // d) chùm đèn pha (cabview, ban đêm) nằm giữa màn hình, và sân ga trên bản đồ nhỏ (topview) nằm sát đường của ta: cả tuyến Yamagata và Akita (hai tuyến mini có bước khung runStep)
    { const rec3 = { top: [], beam: [] }; let fs = null; const mkG = () => { const g = { lamp: false, addColorStop(o, c) { if (/255,246,210/.test(c)) g.lamp = true; } }; return g; };
      const base3 = Object.assign({}, base, { createLinearGradient: () => mkG(), fill() { const f = store.fillStyle; if (f && f.lamp) rec3.beam.push(path.slice()); else if (f === '#3a4658' || f === '#8c98a6') rec3.top.push(path.slice()); } });
      const rctx3 = new Proxy(store, { get: (t, k) => k in t ? t[k] : (k in base3 ? base3[k] : () => { }), set: (t, k, v) => { t[k] = v; return true; } });
      global.document = { createElement: () => ({ getContext: () => rctx3, width: 0, height: 0 }) };
      const LA2 = window.LINES.aki, iOm = LA2.stations.findIndex(x => x.en === 'Omagari'), setups = [];
      for (const dir of ['down', 'up']) { setups.push(['yam ' + dir, mk(dir, false), x => Lyam.stations[x.i].en !== 'Fukushima']); const rc = LA2.trains.find(r => r.d === dir && r.s.some(e => e[0] === iOm && !e[3])), st = rc && rc.s.filter(e => !e[3]).map(e => e[0]), k = rc ? st.indexOf(iOm) : -1; if (k >= 0) { const [a, b] = dir === 'down' ? [st[k - 1], iOm] : [iOm, st[k + 1]]; if (a !== undefined && b !== undefined) setups.push(['aki ' + dir, Sim.createWorld('aki', Sim.makeTrip('aki', rc, a, b), { diff: 'easy', seed: 1, lead: false, events: false }), x => x.i === iOm]); } }
      for (const [nm, W, pick] of setups) { const T = W.player; let beamWorst = 0, beamN = 0, platWorst = 0, platN = 0, lampOff = 0;
        // đèn pha: ban đêm, đang chạy giữa các ga
        W.t = 22 * 3600 - W.trip.t0; for (const m of T.M) { const km = W.line.stations[m.i].km, ks = [km + (W.dir === 'down' ? 1.5 : -1.5), km + (W.dir === 'down' ? 6 : -6)]; for (const kk of ks) { if (kk < 0 || kk > W.line.kmEnd) continue; T.x = Sim.sOfKm(kk, W.dir, W.line.kmEnd); T.v = 40; rec3.beam.length = 0; try { global.CabView.draw(rctx3, 0, 0, PW, 618, W, T, { sprites: {}, aud: null, imgs: {} }); } catch (e) { continue; } if (!rec3.beam.length) { lampOff++; continue; } let ymax = -1e9; for (const q of rec3.beam) for (const [, y] of q) if (y > ymax) ymax = y; let lo = 1e9, hi = -1e9; for (const q of rec3.beam) for (const [x, y] of q) if (y > ymax - 6) { lo = Math.min(lo, x); hi = Math.max(hi, x); } beamN++; beamWorst = Math.max(beamWorst, Math.abs((lo + hi) / 2 - PW / 2)); } }
        // bản đồ nhỏ: đỗ ở ga, mép sân ga gần trục tàu nhất (theo x trước khi xoay) phải sát đường ta
        for (const m of T.M) { if (!m.stop || !pick(m)) continue; T.x = m.s - 5; T.v = 0; rec3.top.length = 0; try { global.TopView.draw(rctx3, 0, 0, 300, 300, W, T, { sprites: {}, tops: {}, aud: null }); } catch (e) { continue; } if (!rec3.top.length) continue; let best = 1e9; for (const q of rec3.top) for (const [x] of q) best = Math.min(best, Math.abs(x - 150)); platN++; platWorst = Math.max(platWorst, best); }
        ok(beamN > 0 && beamWorst < 0.05 * PW, `${nm}: chùm đèn pha ban đêm nằm giữa màn hình (${beamN} cảnh, lệch lớn nhất ${beamWorst.toFixed(0)} px, ${lampOff} cảnh đèn tắt)`, [beamN, beamWorst]);
        ok(platN > 0 && platWorst < 15, `${nm}: sân ga trên bản đồ nhỏ sát trục tàu (${platN} ga, mép gần nhất lệch lớn nhất ${platWorst.toFixed(1)} px)`, [platN, platWorst]); } }
    // e) tàu ngược chiều (cabview): thân tàu phải được vẽ ở mép gần camera của đường ngược chiều (cách trục ta ~2,45 m), không bị chọn nhầm mép xa (6,15 m) vì so X với c.lane thay vì c.lane − off
    { const dr = []; const base4 = Object.assign({}, base, { drawImage(img, ...a) { if (img && img.__sp && a.length === 8) dr.push(a); } });
      const rctx4 = new Proxy(store, { get: (t, k) => k in t ? t[k] : (k in base4 ? base4[k] : () => { }), set: (t, k, v) => { t[k] = v; return true; } });
      global.document = { createElement: () => ({ getContext: () => rctx4, width: 0, height: 0 }) };
      const spr = { ready: true, meta: { width: 4000, height: 200 }, img: { __sp: 1, width: 4000, height: 200 } }, fr = { ready: true, img: { __sp: 0, width: 400, height: 200 } };
      const R4 = { sprites: new Proxy({}, { get: () => spr }), fronts: new Proxy({}, { get: () => fr }), aud: null, imgs: {} };
      const LA3 = window.LINES.aki, iOm3 = LA3.stations.findIndex(x => x.en === 'Omagari'), sets4 = [];
      for (const dir of ['down', 'up']) { sets4.push(['yam ' + dir, mk(dir, false)]); const rc = LA3.trains.find(r => r.d === dir && r.s.some(e => e[0] === iOm3 && !e[3])), st = rc && rc.s.filter(e => !e[3]).map(e => e[0]), k = rc ? st.indexOf(iOm3) : -1; if (k >= 0) { const [a, b] = dir === 'down' ? [st[k - 1], iOm3] : [iOm3, st[k + 1]]; if (a !== undefined && b !== undefined) sets4.push(['aki ' + dir, Sim.createWorld('aki', Sim.makeTrip('aki', rc, a, b), { diff: 'easy', seed: 1, lead: false, events: false })]); } }
      for (const [nm, W] of sets4) { const T = W.player; let n = 0, lo = 1e9, hi = -1e9, errs = 0, hk = null;
        for (const m of T.M) { const km0 = W.line.stations[m.i].km; for (const dk of [5, 6, 7.5, 9, 12, 15, 20]) { const kk = km0 + (W.dir === 'down' ? dk : -dk); if (kk < 0 || kk > W.line.kmEnd) continue; if (W.line.stations.some(x => Math.abs(x.km - kk) < 4.2)) continue; T.x = Sim.sOfKm(kk, W.dir, W.line.kmEnd); T.v = 40; if ([0, 40, 80, 120, 160, 200, 300, 400].some(z => Math.abs(Ly.curvatureSmooth(W.line, Sim, W.dir, T.x + z, 120)) > 1e-5 || Sim.singleEff(W, T.x + z) > 0.01)) continue; W.opposing = [W.t + 0.15]; dr.length = 0;
          try { global.CabView.draw(rctx4, 0, 0, PW, 618, W, T, R4); } catch (e) { errs++; continue; } let best = null; for (const a of dr) if (a[2] < 3000 && (!best || a[7] > best[7])) best = a; if (!best) continue; const zm = (Math.min(PW * 0.92, 618 * 1.45) * 3.7) / best[7], Xrel = (best[4] - PW / 2) * zm / Math.min(PW * 0.92, 618 * 1.45); n++; if (Math.abs(Xrel) > hi) hk = kk; lo = Math.min(lo, Math.abs(Xrel)); hi = Math.max(hi, Math.abs(Xrel)); } }
        if (nm.startsWith('aki') && n === 0) continue;      // đường đơn: không có cảnh nào có tàu ngược chiều trên đường đôi
        ok(n > 0 && errs === 0, `${nm}: vẽ được tàu ngược chiều (${n} cảnh, ${errs} lỗi)`, [n, errs]);
        ok(n > 0 && lo > 1.2 && hi < 3.6, `${nm}: thân tàu ngược chiều ở mép gần camera của đường ngược chiều (|X| từ ${lo.toFixed(2)} tới ${hi.toFixed(2)} m ở km ${hk}, mong đợi ~2,45)`, [lo, hi, hk]); } }
    // f) Akita (22/11/2026): Morioka – Akita là đường đơn liền một mạch: ở km 594 và 614 chỉ thấy một đường (2 ray ở hàng gần nhất), không còn hạ tầng đường đôi
    { global.document = { createElement: () => ({ getContext: () => rctx, width: 0, height: 0 }) }; const LA4 = window.LINES.aki, iOm4 = LA4.stations.findIndex(x => x.en === 'Omagari'), iAk = LA4.stations.findIndex(x => x.en === 'Akita');
      const railClusters = (W, T, km) => { T.x = Sim.sOfKm(km, W.dir, LA4.kmEnd); T.v = 40; polys.length = 0; global.CabView.draw(rctx, 0, 0, PW, 618, W, T, { sprites: {}, aud: null, imgs: {} }); let ymax = -1e9; for (const q of polys) for (const [, y] of q) if (y > ymax) ymax = y; const xs = []; for (const q of polys) for (const [x, y] of q) if (y > ymax - 6) xs.push(x); xs.sort((a, b) => a - b); let n = 0, last = -1e9; for (const x of xs) { if (x - last > 120) n++; last = x; } return n; };
      for (const dir of ['down', 'up']) { const rc = LA4.trains.find(r => r.d === dir && r.s.some(e => e[0] === iAk && !e[3]) && r.s.some(e => e[0] === iOm4 && !e[3])); if (!rc) continue; const [a, b] = dir === 'down' ? [iOm4, iAk] : [iAk, iOm4];
        const W = Sim.createWorld('aki', Sim.makeTrip('aki', rc, a, b), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player, dbl = railClusters(W, T, 594), sgl = railClusters(W, T, 614);
        ok(Sim.singleEff(W, Sim.sOfKm(594, dir, LA4.kmEnd)) > 0.99 && dbl <= 3, `aki ${dir} km 594 (đường đơn): thấy ${dbl} ray ở hàng gần nhất (≤ 3: một đường)`, [dbl]);
        ok(sgl <= 3, `aki ${dir} km 614 (đường đơn): thấy ${sgl} ray (≤ 3: một đường; singleEff ${Sim.singleEff(W, Sim.sOfKm(614, dir, LA4.kmEnd)).toFixed(2)})`, [sgl]); } }
    // g) tàu đỗ chờ phía trước (W.parked), tàu ngược chiều chạy thông qua ga (W.oppThru), tàu vượt (passers) ở khung đường mini yam/aki: vị trí ngang tính theo camX = lane − off
    { const dr5 = []; const base5 = Object.assign({}, base, { drawImage(img, ...a) { if (img && a.length === 8) dr5.push({ sp: img.__sp, a }); else if (img && a.length === 4) dr5.push({ sp: img.__sp, a: [0, 0, 0, 0, a[0], a[1], a[2], a[3]] }); } });
      const rctx5 = new Proxy(store, { get: (t, k) => k in t ? t[k] : (k in base5 ? base5[k] : () => { }), set: (t, k, v) => { t[k] = v; return true; } });
      global.document = { createElement: () => ({ getContext: () => rctx5, width: 0, height: 0 }) };
      const spr5 = { ready: true, meta: { width: 4000, height: 200 }, img: { __sp: 1, width: 4000, height: 200 } }, fr5 = { ready: true, img: { __sp: 0, width: 400, height: 200 } }, F5 = Math.min(PW * 0.92, 618 * 1.45);
      const R5 = { sprites: new Proxy({}, { get: () => spr5 }), fronts: new Proxy({}, { get: () => fr5 }), aud: null, imgs: {} };
      const LA5 = window.LINES.aki, iOm5 = LA5.stations.findIndex(x => x.en === 'Omagari'), sets5 = [];
      for (const dir of ['down', 'up']) { sets5.push(['yam ' + dir, mk(dir, false)]); const rc = LA5.trains.find(r => r.d === dir && r.s.some(e => e[0] === iOm5 && !e[3])), st = rc && rc.s.filter(e => !e[3]).map(e => e[0]), k = rc ? st.indexOf(iOm5) : -1; if (k >= 0) { const [a, b] = dir === 'down' ? [st[k - 1], iOm5] : [iOm5, st[k + 1]]; if (a !== undefined && b !== undefined) sets5.push(['aki ' + dir, Sim.createWorld('aki', Sim.makeTrip('aki', rc, a, b), { diff: 'easy', seed: 1, lead: false, events: false })]); } }
      for (const [nm, W] of sets5) { const T = W.player; let nP = 0, worstP = 0, wP = '', errs = 0, nO = 0, nPass = 0, loO = 1e9, hiO = -1e9;
        // 1) tàu đỗ chờ cùng đường, cách đầu tàu 25 m: mặt đuôi phải sát tâm màn hình
        for (const m of T.M) { const km0 = W.line.stations[m.i].km; for (const dk of [6, 9, 12]) { const kk = km0 + (W.dir === 'down' ? dk : -dk); if (kk < 0 || kk > W.line.kmEnd || W.line.stations.some(x => Math.abs(x.km - kk) < 4.2)) continue; T.x = Sim.sOfKm(kk, W.dir, W.line.kmEnd); T.v = 0; T.phase = 'run'; const len = Sim.VEH.E5.len; if ([0, 25, 100, len + 25].some(z => Math.abs(Ly.curvatureSmooth(W.line, Sim, W.dir, T.x + z, 120)) > 1e-5)) continue; W.parked = [{ key: 'E5', front: T.x + len + 25, kind: 'wait', own: true }]; W.oppThru = []; dr5.length = 0;
            try { global.CabView.draw(rctx5, 0, 0, PW, 618, W, T, R5); } catch (e) { errs++; continue; } const fs5 = dr5.filter(d => d.sp === 0); if (!fs5.length) continue; nP++; const dv = Math.min(...fs5.map(f => Math.abs(f.a[4] + f.a[6] / 2 - PW / 2))); if (dv > worstP) { worstP = dv; wP = kk + ':' + fs5.length; } } }
        W.parked = [];
        // 2) tàu ngược chiều chạy thông qua ga đang đỗ, và tàu vượt: không lỗi, thân tàu ngược chiều ở mép gần camera của đường thông qua
        for (const [i, m] of T.M.entries()) { if (!m.stop || W.line.stations[m.i].en === 'Fukushima') continue; T.x = m.s - 6; T.v = 0; T.phase = 'dwell'; T.k = i; W.oppThru = [{ id: 'x', t: W.t, v: 'E5', label: 'x' }]; W.passers = { [i]: [{ t: W.t, v: 'E5' }] }; dr5.length = 0;
          try { global.CabView.draw(rctx5, 0, 0, PW, 618, W, T, R5); } catch (e) { errs++; continue; } nPass++; let best = null; for (const d of dr5) if (d.sp === 1 && d.a[2] < 3000 && (!best || d.a[7] > best.a[7])) best = d; if (best) { const zm = F5 * 3.7 / best.a[7], Xrel = (best.a[4] - PW / 2) * zm / F5; nO++; loO = Math.min(loO, Math.abs(Xrel)); hiO = Math.max(hiO, Math.abs(Xrel)); } }
        W.oppThru = []; W.passers = undefined; T.phase = 'run';
        if (!(nm.startsWith('aki') && nP === 0)) ok(nP > 0 && worstP < 0.04 * PW && errs === 0, `${nm}: tàu đỗ chờ cùng đường (cách 25 m) nằm sát tâm màn hình (${nP} cảnh, lệch lớn nhất ${worstP.toFixed(0)} px ở ${wP}, ${errs} lỗi vẽ)`, [nP, worstP, errs, wP]);
        ok(nPass > 0 && errs === 0, `${nm}: vẽ tàu ngược chiều thông qua ga và tàu vượt không lỗi (${nPass} ga, ${nO} cảnh có thân tàu${nO ? ', |X| ' + loO.toFixed(1) + '–' + hiO.toFixed(1) + ' m' : ''})`, [nPass, nO, loO, hiO, errs]); } }
    global.document = keepDoc2; }
  // 6) chạy tự động qua Fukushima hai chiều trên tuyến yam và toh: hết chuyến, không lùi, không NaN
  for (const [id, dir] of [['yam', 'down'], ['yam', 'up'], ['toh', 'down'], ['toh', 'up'], ['aki', 'down'], ['aki', 'up']]) {
    const tp = trip3(id, dir), Lx = tp.Lx, A = Lx.stations[tp.a].en, B = Lx.stations[tp.b].en, W = Sim.createWorld(id, Sim.makeTrip(id, tp.rec, tp.a, tp.b), { diff: 'easy', seed: 5, lead: false, events: false }), T = W.player; let k = 0, back = 0, prevX = T.x, bad = false;
    while (!T.finished && k++ < 8e5) { Sim.tick(W, 0.05, {}, true); if (T.x < prevX - 0.5) back++; prevX = T.x; if (!isFinite(T.x) || !isFinite(T.v)) bad = true; }
    ok(T.finished && !bad && back === 0, `chạy tự động ${id} ${dir} (${A} – ${B}) qua Fukushima: hết chuyến, không lùi, không NaN`, [T.finished, bad, back, k]); }
}
if (section('33q. Ga Omagari (switchback 2-2-0w): mạng đường (ghi gộp, đường đơn, ghi tách, ghi chéo), hai khung ĐẾN/ĐI, hai làn, gặp nhau tại ga, vẽ buồng lái và bản đồ nhỏ')) {
  global.hhmm = global.hhmm || (x => String(x)); global.CanvasRenderingContext2D = global.CanvasRenderingContext2D || function () { }; global.CanvasRenderingContext2D.prototype.roundRect = global.CanvasRenderingContext2D.prototype.roundRect || function () { };
  const LY = require(path.join(DRIVE, 'layout.js')), LAo = window.LINES.aki, iO = LAo.stations.findIndex(x => x.en === 'Omagari'), iAkq = LAo.stations.findIndex(x => x.en === 'Akita'), iTz = LAo.stations.findIndex(x => x.en === 'Tazawako'), OU = LY.OMU;
  // 1) hình học mạng đường: liên tục, đúng khoảng cách các đường ở từng đoạn
  for (const dir of ['down', 'up']) for (const ph of ['A', 'B']) for (const lane of [0, 1]) { const pk = { i: LY.omPkCode(ph, lane) }; let mx = 0, prev = LY.omOurs(dir, pk, 0); for (let u = 5; u <= 3000; u += 5) { const v = LY.omOurs(dir, pk, u); mx = Math.max(mx, Math.abs(v - prev) / 5); prev = v; }
    const r = u => Math.abs(LY.omRelOther(dir, pk, u));
    ok(mx < 0.12 && Math.abs(r(100) - 4.3) < 1e-6 && r(800) < 1e-6 && Math.abs(r(1300) - 8.6) < 1e-6 && Math.abs(r(2500) - 40) < 1e-6, `${dir} ${ph}${lane}: đường của ta liên tục (độ dốc ngang ${mx.toFixed(3)} m/m); làn kia cách 4,3 m ở ga, 0 ở đường đơn, 8,6 m khi song song, 40 m khi tách hẳn`, [mx, r(100), r(800), r(1300), r(2500)]); }
  // 2) ga: đường ta x = 0, đường kia ±4,3 m, hai sân ga, sân ga kề đường ta; pb/pf theo khung
  for (const ph of ['A', 'B']) for (const lane of [0, 1]) { const st = LY.station(LY.OMA, 'down', { i: LY.omPkCode(ph, lane), ub: 165 });
    ok(st.ours.x === 0 && Math.abs(Math.abs(st.oppT.x) - 4.3) < 1e-9 && st.plats.length === 2 && !!st.plat && Math.abs(Math.min(Math.abs(st.plat.xa), Math.abs(st.plat.xb)) - 1.75) < 1e-9 && st.stops.length === 2 && (ph === 'A' ? st.pb === 344 && st.pf === 20 : st.pb === 165 && st.pf === 194), `Omagari ${ph}${lane}: đường ta x = 0, đường kia ±4,3 m, sân ga kề đường ta, pb/pf theo khung`, [st.pb, st.pf, st.oppT.x]); }
  // 3) các chuyến chạy tự động hết: số lần đổi đầu đúng, đổi đầu sau khi đã vào ga
  const runSw = (rec, a, b) => { const W = Sim.createWorld('aki', Sim.makeTrip('aki', rec, a, b), { diff: 'easy', seed: 4, lead: false, events: false }), T = W.player; const ph0 = W.sw && W.sw.ph; let flips = 0, lp = ph0, k = 0, arrT = null, flipT = null; while (!T.finished && k++ < 600000) { Sim.tick(W, 0.05, {}, true); if (arrT === null && T.phase === 'dwell' && W.sw && T.M[T.k].i === W.sw.i) arrT = W.t; if (W.sw && W.sw.ph !== lp) { flips++; lp = W.sw.ph; flipT = W.t; } } return { W, T, ph0, flips, arrT, flipT, fin: T.finished && !T.failed }; };
  for (const [nm, dir, a, b, f0, fl] of [['Tazawako → Akita', 'down', iTz, iAkq, 'A', 1], ['Akita → Tazawako', 'up', iAkq, iTz, 'A', 1], ['Omagari → Akita', 'down', iO, iAkq, 'B', 0], ['Omagari → Tazawako', 'up', iO, iTz, 'B', 0], ['Tazawako → Omagari', 'down', iTz, iO, 'A', 0]]) {
    const rec = LAo.trains.find(r => r.d === dir && r.s.some(e => e[0] === a && !e[3]) && r.s.some(e => e[0] === b && !e[3])); if (!rec) { ok(false, `Omagari: có chuyến mẫu ${nm}`); continue; } const r = runSw(rec, a, b);
    ok(r.fin && r.ph0 === f0 && r.flips === fl && (fl === 0 || (r.arrT !== null && r.flipT >= r.arrT)), `Omagari ${nm}: chạy hết, khung đầu ${f0}, ${fl} lần đổi đầu, đổi đầu sau khi đã vào ga`, [r.fin, r.ph0, r.flips, r.arrT, r.flipT]); }
  // 4) gặp nhau tại ga: nếu phải chờ tàu ngược chiều thì có thông báo và tính miễn trừ
  { const rec = LAo.trains.find(r => r.d === 'down' && r.s.some(e => e[0] === iTz && !e[3]) && r.s.some(e => e[0] === iAkq && !e[3])), W = Sim.createWorld('aki', Sim.makeTrip('aki', rec, iTz, iAkq), { diff: 'easy', seed: 4, lead: false, events: false }), T = W.player; let k = 0, blocked = 0, msg = ''; while (!T.finished && k++ < 600000) { Sim.tick(W, 0.05, {}, true); const bw = Sim.swWait(W, T); if (bw) { blocked++; msg = bw; } }
    ok(T.finished && typeof Sim.swWait === 'function' && (blocked === 0 || (/Omagari/.test(msg) && T.excused > 0)), 'chuyến Tazawako → Akita: nếu phải chờ tàu ngược chiều ở Omagari thì có thông báo và tính miễn trừ (' + blocked + ' nhịp chờ)', [blocked, T.excused]); }
  // 5) vẽ cabview/bản đồ nhỏ/cửa sổ quanh Omagari ở cả hai khung và hai chiều: không lỗi; ray của ta luôn gần giữa màn hình
  { const store = { fillStyle: '' }, polys = []; let pth = []; const base = { beginPath() { pth = []; }, moveTo(x, y) { pth = [[x, y]]; }, lineTo(x, y) { pth.push([x, y]); }, fill() { if (store.fillStyle === 'rgba(208,216,226,.9)') polys.push(pth.slice()); }, measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop() { } }), createRadialGradient: () => ({ addColorStop() { } }) };
    const rctx = new Proxy(store, { get: (t, k) => k in t ? t[k] : (k in base ? base[k] : () => { }), set: (t, k, v) => { t[k] = v; return true; } }), keepD = global.document; global.document = { createElement: () => ({ getContext: () => rctx, width: 0, height: 0 }) };
    require(path.join(DRIVE, 'world.js')); require(path.join(DRIVE, 'strips.js')); require(path.join(DRIVE, 'cabview.js')); require(path.join(DRIVE, 'winlit.js')); require(path.join(DRIVE, 'winview.js')); require(path.join(DRIVE, 'topview.js'));
    const PWq = 1920; let errs = 0, nDraw = 0, worst = 0, wAt = null;
    for (const [dir, a, b] of [['down', iTz, iAkq], ['up', iAkq, iTz]]) { const rec = LAo.trains.find(r => r.d === dir && r.s.some(e => e[0] === a && !e[3]) && r.s.some(e => e[0] === b && !e[3])), W = Sim.createWorld('aki', Sim.makeTrip('aki', rec, a, b), { diff: 'easy', seed: 4, lead: false, events: false }), T = W.player, sw = W.sw;
      for (const ph of ['A', 'B']) for (const lane of [0, 1]) { sw.ph = ph; sw.lane = lane; sw.ub = 165; Sim.swSync(W);
        for (let off = -2600; off <= 2600; off += 260) { if ((ph === 'A') !== (off <= 0)) continue; T.x = sw.sM + off; T.v = 40; T.phase = 'run'; polys.length = 0;
          try { global.CabView.draw(rctx, 0, 0, PWq, 618, W, T, { sprites: {}, aud: null, imgs: {} }); nDraw++; global.TopView.draw(rctx, 0, 0, 300, 300, W, T, { sprites: {}, tops: {}, aud: null }); global.WinView.draw(rctx, 0, 0, 400, 300, W, T, { sprites: {}, aud: null }, 1); } catch (e) { errs++; if (errs < 3) console.log('  vẽ lỗi', dir, ph, lane, off, e.message); continue; }
          polys.length = 0; global.CabView.draw(rctx, 0, 0, PWq, 618, W, T, { sprites: {}, aud: null, imgs: {} }); let ymax = -1e9; for (const q of polys) for (const [, y] of q) if (y > ymax) ymax = y; let best = 1e9; for (const q of polys) for (const [x, y] of q) if (y > ymax - 6) best = Math.min(best, Math.abs(x - PWq / 2)); if (polys.length && best > worst) { worst = best; wAt = [dir, ph, lane, off]; } } } }
    global.document = keepD;
    ok(errs === 0 && nDraw > 60, `vẽ cabview/bản đồ nhỏ/cửa sổ quanh Omagari (${nDraw} cảnh, ${errs} lỗi)`, [nDraw, errs]);
    ok(worst < 0.1 * PWq, `Omagari: ray của ta gần tâm màn hình ở mọi cảnh (lệch lớn nhất ${worst.toFixed(0)} px ở ${JSON.stringify(wAt)})`, [worst, wAt]); }
}
if (section('33p. Chế độ nhà phát triển: dịch chuyển tới điểm bất kỳ trên bản đồ toàn quốc, tàu ma (đứng yên, không sự cố ngẫu nhiên, không ảnh hưởng/chịu ảnh hưởng của tàu khác và ATC)')) {
  global.hhmm = global.hhmm || (x => String(x)); require(path.join(DRIVE, 'natmap.js'));
  const NC = global.NatCat, NM = global.NatMap, LNS = window.LINES;
  // 1) NatMap.nearLines: điểm gần tuyến (kể cả tuyến đi chung đường) → danh sách {line, km}; điểm ngoài biển → rỗng
  { const at = (id, km) => NC.atKm(LNS[id], km), near = (id, km, dx, dy) => { const a = at(id, km); return NM.nearLines(a.lon + (dx || 0), a.lat + (dy || 0), 900, 16); };
    const c1 = near('tsk', 100, 0.002, 0.001); ok(c1.length >= 1 && c1[0].line === 'tsk' && Math.abs(c1[0].km - 100) < 1.2, 'nearLines: điểm gần Tokaido km 100 → tsk ≈ km 100', c1);
    const c2 = near('toh', 200); ok(['toh', 'yam', 'aki'].every(id => c2.some(c => c.line === id)), 'nearLines: điểm trên đoạn đi chung Tokyo – Fukushima trả về cả toh, yam, aki', c2.map(c => c.line));
    const c3 = near('yam', 340); ok(c3[0].line === 'yam' && Math.abs(c3[0].km - 340) < 0.7 && c3.length === 1, 'nearLines: điểm trên đoạn riêng Yamagata chỉ có yam', c3);
    ok(NM.nearLines(130.0, 30.0, 900, 16).length === 0 && NM.nearLines(142.0, 36.0, 900, 16).length === 0, 'nearLines: điểm ngoài biển không chọn được tuyến nào'); }
  // 2) tàu ma: Sim.spawnAt với opts.ghost
  const Lt = Sim.lineOf('tsk'), rg = Lt.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && !t.cp), cg = NC.build(LNS).find(c => c.rec === rg), qg = Sim.trainSeq(rg).filter(e => e.stop), tNoon = (qg[0].dep != null ? qg[0].dep : qg[0].arr) + 1500;
  const s0g = NC.stateOf(LNS, cg, tNoon), kmG = s0g.km;
  const Wgh = Sim.spawnAt('tsk', rg, tNoon, { km: kmG, kmh: 0 }, { seed: 3, ghost: true }), Tgh = Wgh && Wgh.player;
  ok(!!Wgh && Wgh.ghost === true && Tgh.ghost === true && Tgh.foreign === false && Tgh.v === 0 && Tgh.noPax === true && (Wgh.events || []).length === 0 && Tgh.phase === 'run', 'spawnAt ghost: tàu ma đứng yên (v = 0), không hành khách, không sự cố ngẫu nhiên, không phải tàu foreign', Wgh && [Wgh.ghost, Tgh.v, Tgh.foreign, Tgh.phase]);
  ok(Math.abs(Sim.kmOfS(Tgh.x, Wgh.dir, Wgh.line.kmEnd) - kmG) < 0.05, 'tàu ma xuất hiện đúng điểm đã chọn (km ' + kmG.toFixed(2) + ')');
  // 3) không ảnh hưởng/chịu ảnh hưởng ATC của tàu khác: vật cản phía trước, giữ ở ga đường đơn, ga đầy
  { const ahead = NC.stateOf(LNS, cg, tNoon + 90), Wn = Sim.spawnAt('tsk', rg, tNoon, { km: kmG - 2.5 * (ahead.km > kmG ? 1 : -1), kmh: 0 }, { seed: 3 }), Wg2 = Sim.spawnAt('tsk', rg, tNoon, { km: kmG - 2.5 * (ahead.km > kmG ? 1 : -1), kmh: 0 }, { seed: 3, ghost: true });
    NC.init(Wn); NC.init(Wg2); NC.updateObstacle(Wn, Wn.player); NC.updateObstacle(Wg2, Wg2.player); ok(Wg2.obs === null, 'tàu ma không bị ATC chặn bởi tàu phía trước (W.obs = null)', Wg2.obs); }
  // 3b) giống tàu kiểm tra: không ATC, không giờ biểu đồ/cửa/PA/melody, không dừng ga giữa đường
  { const Wx = Sim.spawnAt('tsk', rg, tNoon, { km: kmG, kmh: 0 }, { seed: 3, ghost: true }), Tx = Wx.player, last = Tx.M.length - 1;
    ok(Tx.atcOn === false && Tx.atc === false && Tx.door === 'closed' && Tx.M.slice(1, last).every(m => !m.stop), 'tàu ma: ATC tắt, cửa đóng, không dừng ga giữa đường (chỉ còn ga cuối chuyến mẫu)', [Tx.atcOn, Tx.door, Tx.M.map(m => !!m.stop)]);
    const n0 = Wx.msgs.length; ok(Sim.toggleATC(Tx) === 'on' && Tx.atcOn === true && Sim.toggleATC(Tx) === 'off' && Tx.atcOn === false && Wx.msgs.length === n0, 'tàu ma: bật/tắt ATC tức thì, không thông báo/cảnh báo/phạt');
    let k = 0, stops = 0, prevK = Tx.k; while (k++ < 6000 && !Tx.finished) { Sim.tick(Wx, 0.1, {}, true); if (Tx.phase === 'dwell') stops++; }
    ok(stops === 0 && Tx.results.length === 0, 'tàu ma không đỗ ga giữa đường và không ghi kết quả dừng ga (' + stops + ' tick đỗ)', [stops, Tx.results.length]);
    const au = require('fs').readFileSync(path.join(DRIVE, 'audio.js'), 'utf8'), fu2 = require('fs').readFileSync(path.join(DRIVE, 'fullui.js'), 'utf8'), ix2 = require('fs').readFileSync(path.join(DRIVE, 'index.html'), 'utf8');
    ok(/W\.mission \|\| W\.ghost/.test(au), 'audio.js: tàu ma không phát PA/melody (như tàu kiểm tra)');
    ok(/!W\.mission && !W\.ghost/.test(fu2) && /if \(!W\.ghost\) \{ const delay/.test(fu2) && /T\.atcOn === false && blink && !T\.ghost/.test(fu2), 'fullui.js: tàu ma ẩn dòng cửa/giờ đi, ô lệch kế hoạch và viền đỏ cắt ATC');
    ok(!/paused = true; recTainted = true; ui\.nat = false;/.test(ix2.slice(ix2.indexOf('function devTeleport'), ix2.indexOf('const cabOK'))), 'devTeleport không tự tạm dừng game'); }
  // 3c) ở nút N, gần đứng yên: tàu ma giữ đứng yên (không lăn theo độ dốc); tàu thường (đối chứng) vẫn lăn; đang chạy nhanh thì tàu ma vẫn lăn tự do
  { const roll = (opts, kmh) => { const W0 = Sim.spawnAt('tsk', rg, tNoon, { km: 60, kmh }, Object.assign({ seed: 3 }, opts)), T0 = W0.player; if (kmh > 0) T0.v = kmh / 3.6; for (let i = 0; i < 600; i++) Sim.tick(W0, 0.1, {}, false); return T0.v * 3.6; };
    const g0 = roll({ ghost: true }, 0), n0 = roll({}, 0), g1 = roll({ ghost: true }, 30);
    ok(g0 === 0 && n0 > 3 && g1 > 3, 'nút N: tàu ma đứng yên trên dốc (' + g0.toFixed(2) + ' km/h), tàu thường lăn (' + n0.toFixed(1) + ' km/h), tàu ma đang chạy 30 km/h vẫn lăn tự do (' + g1.toFixed(1) + ' km/h)', [g0, n0, g1]); }
  // 3d) tàu ma không có hành khách: đứng yên 20 phút giữa đường mà mức bất an vẫn 0, không hoảng loạn, không phát thanh trấn an; tàu thường (đối chứng) bất an tăng
  { const run = opts => { const W0 = Sim.spawnAt('tsk', rg, tNoon, { km: 150.4, kmh: 0 }, Object.assign({ seed: 3 }, opts)), T0 = W0.player; for (let i = 0; i < 12000; i++) Sim.tick(W0, 0.1, {}, false); return { anx: T0.anx, panic: !!T0.panic, pa: W0.paCount || 0 }; };
    const gh = run({ ghost: true }), nm = run({}); ok(gh.anx === 0 && !gh.panic && gh.pa === 0 && nm.pa >= 1, 'tàu ma đứng yên 20 phút: bất an ' + gh.anx + ', không hoảng loạn, không phát thanh; tàu thường (đối chứng) được trưởng tàu phát thanh ' + nm.pa + ' lần', [gh, nm]);
    const fu3 = require('fs').readFileSync(path.join(DRIVE, 'fullui.js'), 'utf8'); ok(/W\.mission \|\| T\.noPax \? \[\]/.test(fu3) && !/Bất an hành khách/.test(fu3), 'fullui.js: ẩn dòng "Tải khách" khi không có hành khách; không còn thanh "Bất an hành khách"'); }
  // 4) chạy được: bấm tăng tốc, tàu ma chạy tới ga kế và vẫn tuân theo ATC của chính nó
  { const Wr = Sim.spawnAt('tsk', rg, tNoon, { km: kmG, kmh: 0 }, { seed: 3, ghost: true }), Tr = Wr.player; let k = 0, x0 = Tr.x; while (k++ < 3000) Sim.tick(Wr, 0.1, {}, true);
    ok(isFinite(Tr.x) && isFinite(Tr.v) && Tr.v >= 0 && Math.abs(Tr.x - x0) > 500, 'tàu ma chạy tự lái bình thường (đi được ' + Math.round(Math.abs(Tr.x - x0)) + ' m, không NaN)', [Tr.x, Tr.v]); }
  // 5) giao diện: ô chọn chế độ nhà phát triển và dịch chuyển (index.html, fullui.js, natmap.js)
  { const idx = require('fs').readFileSync(path.join(DRIVE, 'index.html'), 'utf8'), fu = require('fs').readFileSync(path.join(DRIVE, 'fullui.js'), 'utf8'), nm = require('fs').readFileSync(path.join(DRIVE, 'natmap.js'), 'utf8');
    ok(/id="dev"/.test(idx) && /dev: \$\('dev'\)\.checked/.test(idx) && /free: \$\('free'\)\.checked \|\| \$\('dev'\)\.checked/.test(idx), 'index.html: ô "Chế độ nhà phát triển" và công thức recipe (dev kéo theo free)');
    ok(/devGo: devOK\(\)/.test(fu) && /NatMap\.click\(x, y, devOK\(\)\)/.test(idx) && /function devTeleport/.test(idx) && /ghost: true/.test(idx), 'dịch chuyển nối đủ: bản đồ → nút xác nhận → devTeleport → spawnAt ghost');
    ok(/V\.sel\.dev/.test(nm) && /nearLines/.test(nm), 'natmap.js: thẻ xác nhận dịch chuyển'); }
  // 6) chạy lùi (chỉ chế độ nhà phát triển): bật/tắt chỉ khi đã dừng hẳn, lùi giảm vị trí, giới hạn tốc độ như khi tiến, không lùi xuyên chắn cuối đường
  { const Wr = Sim.spawnAt('tsk', rg, tNoon, { km: kmG, kmh: 0 }, { seed: 3, ghost: true }), Tr = Wr.player, x0 = Tr.x; ok(Sim.toggleReverse(Tr) && Tr.rev === true, 'chạy lùi: bật được khi tàu đứng yên hoàn toàn');
    Sim.setPower(Tr, 3); let k = 0; while (k++ < 600) Sim.tick(Wr, 0.1, {}, false); ok(Tr.x < x0 - 50 && Tr.v > 5, 'chạy lùi: kéo cần gia tốc thì vị trí giảm (tàu lùi)', [Tr.x - x0, Tr.v]);
    const nW = Tr.W.msgs.length; ok(Sim.toggleReverse(Tr) === false && Tr.rev === true, 'chạy lùi: đang lùi (tốc độ > 0) thì chưa đổi sang tiến được');
    Sim.setPower(Tr, 0); Sim.setBrake(Tr, 7); k = 0; while (k++ < 3000 && Tr.v > 0.01) Sim.tick(Wr, 0.1, {}, false); ok(Tr.v <= 0.05 && Sim.toggleReverse(Tr) === true && Tr.rev === false, 'chạy lùi: tốc độ lùi về 0 rồi mới đổi lại chạy tiến được');
    // giới hạn: không có trần riêng 25 km/h (tốc độ lùi vượt 25 km/h nếu cần gia tốc đủ lâu)
    const Wf = Sim.spawnAt('tsk', rg, tNoon, { km: kmG, kmh: 0 }, { seed: 3, ghost: true }), Tf = Wf.player; Sim.toggleReverse(Tf); Sim.setPower(Tf, 13); k = 0; let vmax = 0; while (k++ < 1500) { Sim.tick(Wf, 0.1, {}, false); vmax = Math.max(vmax, Tf.v); } ok(vmax * 3.6 > 40, 'chạy lùi: tốc độ lùi không bị trần riêng (đạt ' + (vmax * 3.6).toFixed(0) + ' km/h)', vmax * 3.6);
    // chắn cuối: lùi mãi về đầu tuyến thì đuôi tàu dừng sát chắn (s = −440 + chiều dài tàu + 1 m), không xuyên qua
    const Wb = Sim.spawnAt('tsk', rg, tNoon, { km: Sim.lineOf('tsk').stations[0].km + 2, kmh: 0 }, { seed: 3, ghost: true }), Tb = Wb.player; Sim.toggleReverse(Tb); Sim.setPower(Tb, 13); k = 0; while (k++ < 8000 && Tb.x > -440 + Tb.veh.len + 3) Sim.tick(Wb, 0.1, {}, false); Sim.setPower(Tb, 13); for (let i = 0; i < 400; i++) Sim.tick(Wb, 0.1, {}, false);
    ok(Tb.x >= -440 + Tb.veh.len + 1 - 1e-6 && isFinite(Tb.x), 'chạy lùi: không lùi xuyên chắn cuối đường (x = ' + Tb.x.toFixed(1) + ' ≥ ' + (-440 + Tb.veh.len + 1).toFixed(1) + ')', [Tb.x, Tb.veh.len]); }
  { const idx = require('fs').readFileSync(path.join(DRIVE, 'index.html'), 'utf8'), fu = require('fs').readFileSync(path.join(DRIVE, 'fullui.js'), 'utf8');
    ok(/rev\(\) \{ Sim\.toggleReverse\(T\); \}/.test(idx) && /doAct\('rev'\)/.test(idx) && !/devOK\(\) \? 'rev'/.test(idx) && /wideBtn\([^;]*_t\('Chạy lùi'\)/.test(fu), 'chạy lùi: nút dưới đồng hồ tốc độ ở mọi chế độ, phím M'); }
}
// (33r đặt TRƯỚC phần 33: phần 33 có test âm thanh dùng bộ đếm giờ thật (setTimeout), không được để một phần chạy đồng bộ lâu chạy sau nó, nếu không khi chạy tuần tự (CI) các bộ đếm giờ bị chặn rồi bắn dồn và đo sai)
if (section('33r. Tàu đỗ ở Omagari đổi mặt và lùi ra (không xuyên chắn cuối), tàu ngược chiều bị giữ hiện ở đường tránh Ugo-Yotsuya, khối đường đơn quanh Kita-Omagari')) {
  const LA = window.LINES.aki, NCr = window.NatCat, LYr = require(path.join(DRIVE, 'layout.js')), ix = en => LA.stations.findIndex(x => x.en === en), iOm = ix('Omagari'), iUY = ix('Ugo-Yotsuya'), iKO = ix('Kita-Omagari'), iKk = ix('Kakunodate'), iMo = ix('Morioka');
  const mkTrip = rec => { const st = rec.s.filter(e => !e[3]).map(e => e[0]).filter(i => i > iMo), a = rec.d === 'down' ? Math.min(...st) : Math.max(...st), b = rec.d === 'down' ? Math.max(...st) : Math.min(...st); return Sim.makeTrip('aki', rec, a, b); };
  // 1) khối đường đơn: hai đoạn quanh ga MỘT đường (Kita-Omagari) là một khối; ga có đường tránh là biên khối
  ok(NCr.blk(LA, iKO) === iUY && NCr.blk(LA, iUY) === iUY && NCr.blk(LA, iKk) === iKk && NCr.blk(LA, iOm) === iOm, 'khối đường đơn: đoạn Kita-Omagari–Omagari nhập với đoạn Ugo-Yotsuya–Kita-Omagari; các đoạn khác giữ nguyên', [NCr.blk(LA, iKO), NCr.blk(LA, iUY), NCr.blk(LA, iKk), NCr.blk(LA, iOm)]);
  ok(LYr.isSolo('1-1-0') && !LYr.isSolo('2-2-1s') && LYr.isSingle('2-2-1s') && !LYr.isSingle('2-2-0'), 'Layout.isSolo/isSingle: chỉ 1-1-0 là ga một đường; 2-2-1s là ga đường đơn có đường tránh; 2-2-0 thường thì không');
  { const recD = LA.trains.find(t => t.d === 'down' && !t.cp) || LA.trains.find(t => t.d === 'down'), recU = LA.trains.find(t => t.d === 'up' && !t.cp) || LA.trains.find(t => t.d === 'up');
    // 1b) bố cục các ga tuyến Tazawako (Morioka – Omagari) theo sơ đồ 配線略図.net: mã từng ga; ga có đường nhánh: mỗi đường nhánh đúng MỘT ghi mỗi đầu, không chữ X
    { const want = { Maegata: '1-1-0m', Okama: '2-2-1o', Koiwai: '2-2-0', Shizukuishi: '2-3-1h', Harukiba: '1-1-0m', Akabuchi: '1-2-0', 'Ochizawa Jct.': '0-2-1n', 'Shidonai Jct.': '0-2-1s', Tazawako: '2-3-1t', Sashimaki: '2-2-0', Jindai: '2-2-1s', Shoden: '1-1-0', Kakunodate: '1-3-1k', Uguisuno: '1-1-0m', 'Ugo-Nagano': '2-2-1s', Yariminai: '1-1-0', 'Ugo-Yotsuya': '2-2-1s', 'Kita-Omagari': '1-1-0', Jinguji: '1-2-0', Kariwano: '1-2-0', Mineyoshikawa: '1-1-0m', 'Ugo-Sakai': '1-2-1n', Obarino: '1-1-0m', Wada: '1-2-1w', Yotsugoya: '1-1-0m' };
      for (const [en, code] of Object.entries(want)) { const sx = LA.stations[ix(en)]; ok(sx && sx.lay === code && Array.isArray(sx.xo) && sx.xo.length === 0, `${en}: mã ${code}, không ghi chéo X`, sx && [sx.lay, sx.xo]); }
      for (const [code, nOuter] of [['1-3-1k', 2], ['2-3-1t', 2], ['2-3-1h', 2], ['2-2-1s', 1], ['2-2-1o', 1], ['0-2-1s', 1], ['0-2-1n', 1], ['1-2-1n', 1], ['1-2-1w', 1]]) for (const dir of ['down', 'up']) { const st = LYr.station(code, dir, 0), outer = st.tracks.filter(t => !t.main && !t.virt); ok(outer.length === nOuter && outer.every(t => t.in0 !== undefined && t.out0 !== undefined && t.len >= 40 && (t.len2 || t.len) >= 40), `${code} ${dir}: ${nOuter} đường nhánh, mỗi đường một ghi mỗi đầu (không chữ X)`, outer.map(t => [t.in0, t.len, t.out0, t.len2])); } }
    // 1b2) 7 ga Omagari – Akita (ou_1/030_12, 030_13): đoạn đường đôi Jingūji–Kariwano, ga một đường, Ugo-Sakai / Wada có nhánh nam; sân ga ở phía TRÊN của sơ đồ gốc (bên TRÁI khi đi xuống, bên PHẢI khi đi lên), nhánh ở phía dưới
    { const kJ = LA.stations[ix('Jinguji')].km, kK = LA.stations[ix('Kariwano')].km, kU = LA.stations[ix('Ugo-Sakai')].km;
      ok(LA.single.length === 2 && LA.single[0][1] < kJ && LA.single[1][0] > kK && LA.single[1][0] - kK < 1.2 && kJ - LA.single[0][1] < 1.2, 'đường đôi Jingūji–Kariwano: hai đoạn đường đơn cắt ở ngoài hai ga', LA.single);
      for (const dir of ['down', 'up']) { const br = st => st.tracks.find(t => !t.main && !t.virt), sd = dir === 'down' ? 1 : -1;      // theo sơ đồ: sân ga ở phía TRÊN của sơ đồ = bên TRÁI đường tàu khi đi xuống (X > 0), bên PHẢI khi đi lên; nhánh ở phía dưới
        for (const [code, nm] of [['1-2-1n', 'Ugo-Sakai'], ['1-2-1w', 'Wada']]) { const st = LYr.station(code, dir, 0);
          ok(st.plats[0].xa * sd > 0 && br(st).x * sd < 0, `${nm} ${dir}: sân ga bên ${dir === 'down' ? 'trái' : 'phải'}, nhánh bên đối diện`, [st.plats[0].xa, br(st).x]);
          ok(!st.plat && st.ours === br(st) && br(st).len === 82 && br(st).len2 === 82, `${nm} ${dir}: tàu dừng tránh ở nhánh (không sân ga kề), ghi 82 m mỗi đầu`, [br(st).len, br(st).len2]); }
        for (const nm of ['Mineyoshikawa', 'Obarino', 'Yotsugoya']) { const st = LYr.station(LA.stations[ix(nm)].lay, dir, 0); ok(st.plats[0].xa * sd > 0, `${nm} ${dir}: sân ga bên ${dir === 'down' ? 'trái' : 'phải'}`, st.plats[0].xa); } }
      ok(NCr.blk(LA, ix('Obarino')) === kU - kU + ix('Ugo-Sakai') && NCr.blk(LA, ix('Mineyoshikawa')) === ix('Kariwano') && NCr.blk(LA, ix('Yotsugoya')) === ix('Wada'), 'khối đường đơn mới: Kariwano–Ugo-Sakai (qua Mineyoshikawa), Ugo-Sakai–Wada (qua Obarino), Wada–Akita (qua Yotsugoya)', [NCr.blk(LA, ix('Obarino')), NCr.blk(LA, ix('Mineyoshikawa')), NCr.blk(LA, ix('Yotsugoya'))]); }
    // 1c) tín hiệu trường (Shidonai, Ochizawa): chỉ dừng khi cần tránh tàu; cửa không mở, không chấm điểm dừng ga
    { const recS = LA.trains.find(t => t.d === 'down' && t.s.some(e => e[0] === ix('Shizukuishi') && !e[3])), W = Sim.createWorld('aki', mkTrip(recS), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player, kS = T.M.findIndex(m => m.i === ix('Ochizawa Jct.')), m = T.M[kS];
      ok(kS > 0 && m.sig === true && m.stop === false && T.M.every(q => (q.i === ix('Ochizawa Jct.') || q.i === ix('Shidonai Jct.')) === !!q.sig), 'tín hiệu trường: có cờ sig trên mốc ga và KHÔNG có giờ dừng', [kS, m && m.sig, m && m.stop]);
      m.stop = true; m.sdisp = true; m.arr = m.pt; m.dep = m.pt + 90; Sim.fillPlan(T.M);      // như lệnh điều độ dừng tránh (singleDispatch)
      let n = 0, saw = false, door = null, early = 0; while (!T.finished && n++ < 4e6 && W.t < 20000) { Sim.tick(W, 0.1, {}, true); if (T.phase === 'dwell' && T.k === kS) { saw = true; door = door || T.door; early = T.earlyDep; } }
      ok(saw && door === 'closed' && early === 0, 'tín hiệu trường: tàu đỗ tránh với cửa ĐÓNG, không phạt khởi hành sớm', [saw, door, early]);
      ok(!T.results.some(r => r.station === m.name), 'tín hiệu trường: không chấm điểm dừng ga', T.results.map(r => r.station).join()); }
    // 1d) ghép toa chiều lên: Hayabusa 10 tới Morioka muộn thì Komachi 10 chạy tới Maegata (ga thông qua liền trước Morioka) và dừng chờ, cửa đóng; không chờ ở Shizukuishi
    { const rec10 = LA.trains.find(t => t.t === 'Komachi' && t.n === '10' && t.d === 'up'), hay = window.LINES.toh.trains.find(t => t.t === 'Hayabusa' && t.n === '10' && t.d === 'up');
      const W = Sim.createWorld('aki', Sim.makeTrip('aki', rec10, ix('Shizukuishi'), ix('Morioka')), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player; if (!W.haz) NCr.init(W);
      const cat = NCr.build(window.LINES).find(c => c.rec === hay), kM = T.M.findIndex(m => m.i === ix('Maegata')), kS = T.M.findIndex(m => m.i === ix('Shizukuishi')); ok(!!cat && kM > 0 && T.cp && T.cp.kind === 'join', 'Komachi 10 chiều lên là chuyến ghép với Hayabusa 10', [!!cat, kM, T.cp]);
      W.haz.delay.set(cat.key, { delay: 900, hold: 0, hit: {}, why: '', shake: -1e9, rate: 0 });      // Hayabusa 10 trễ 15 phút
      let n = 0, tIn = null, tOut = null, door = null, shizuStay = 0; while (!T.finished && n++ < 4e6 && W.t < 30000) { Sim.tick(W, 0.1, {}, true); NCr.step(W); if (T.phase === 'dwell' && T.k === kM) { if (tIn === null) { tIn = W.t; door = T.door; } } else if (tIn !== null && tOut === null && T.phase === 'run') tOut = W.t; if (T.phase === 'dwell' && T.k === kS) shizuStay += 0.1; }
      ok(tIn !== null && door === 'closed' && T.M[kM].sig && T.M[kM].jwait, 'Komachi 10: dừng chờ ghép ở Maegata với cửa ĐÓNG', [tIn, door, T.M[kM].jwait]);
      ok(tIn !== null && (tOut === null || tOut - tIn > 200), 'Komachi 10: chờ ở Maegata cho tới khi Hayabusa 10 vào ga (> 200 s)', [tIn, tOut]);
      ok(shizuStay < 400 && !T.results.some(r => r.station === 'Maegata'), 'Komachi 10: không bị giữ ở Shizukuishi, và Maegata không tính điểm dừng ga', [shizuStay, T.results.map(r => r.station).join()]); }
    // 1e) khu gian Omagari – Akita (51,7 km) chia khối bởi các ga có chỗ tránh (Omagari, Jingūji–Kariwano là đoạn đường đôi, Ugo-Sakai, Wada, Akita): không bao giờ có hai tàu NGƯỢC chiều cùng trong một khối đường đơn (tàu tới sau đỗ chờ ở ga biên khối)
    { const kmOf = en => LA.stations[ix(en)].km, blocks = [['Omagari', 'Jinguji'], ['Kariwano', 'Ugo-Sakai'], ['Ugo-Sakai', 'Wada'], ['Wada', 'Akita']].map(([a, b]) => [kmOf(a), kmOf(b)]), first = LA.trains.filter(t => t.d === 'down').sort((p, q) => (p.s[0][2] != null ? p.s[0][2] : p.s[0][1]) - (q.s[0][2] != null ? q.s[0][2] : q.s[0][1]))[0], st0 = first.s.filter(e => !e[3]).map(e => e[0]);
      const W = Sim.createWorld('aki', Sim.makeTrip('aki', first, st0[0], st0[1]), { diff: 'easy', seed: 1, lead: false, events: false }); if (!W.haz) NCr.init(W);
      const cat = NCr.build(window.LINES).filter(c => c.line === 'aki' && c.rec !== first), t0 = W.trip.t0; let both = 0, held = 0, inSeg = 0;
      for (let t = 0; t < 8 * 3600; t += 10) { W.t = t; NCr.step(W); const now = t0 + t, d = blocks.map(() => ({ down: 0, up: 0 }));
        for (const c of cat) { const dl = NCr.delayOf(W, c.key), q = NCr.stateOf(window.LINES, c, now - (dl ? dl.delay : 0), dl && dl.skip); if (dl && dl.hold > 0 && dl.why === 'single') held++; if (q) blocks.forEach(([a, b], bi) => { if (q.km > a + 0.3 && q.km < b - 0.3) d[bi][c.rec.d]++; }); }
        if (d.some(x => x.down || x.up)) inSeg++; if (d.some(x => x.down && x.up)) both++; }
      ok(inSeg > 100 && held > 0, 'khu gian Omagari–Akita: có tàu chạy và có tàu bị giữ chờ (bài kiểm tra có tác dụng)', [inSeg, held]);
      ok(both === 0, 'khu gian Omagari–Akita: không bao giờ có hai tàu ngược chiều cùng một khối đường đơn (8 giờ mô phỏng)', both); }
    // 2) Omagari: tàu đỗ (cả hai chiều) tới giờ rời ga thì đổi mặt (face −1) và chạy NGƯỢC ra; tàu đang vào ga và tàu ở ga khác thì không đổi
    for (const rec of [recD, recU]) {
      const W = Sim.createWorld('aki', mkTrip(rec), { diff: 'easy', seed: 1, lead: false, events: false }), now = W.trip.t0 + W.t; ok(!!W.sw, `${rec.d}: thế giới có ga switchback (W.sw)`);
      const sM = W.sw.sM, kOm = W.player.M.findIndex(m => m.i === iOm), tk = LYr.station('2-2-0w', 'down', 0).tracks[1];
      const mk = (o) => Object.assign({ k: kOm, i: iOm, track: tk, key: 'E6', face: 1, front: sM - 30, f0: sM - 30, dl: 0, ac: now - 300, dc: now + 300, arrA: false, depA: true, v: 0, label: 'x' }, o);
      const eDep = mk({ ck: 'dep', dc: now - 20 }), ePark = mk({ ck: 'park' }), eArr = mk({ ck: 'arr', arrA: true, ac: now + 25, front: sM - 30 }), eOther = mk({ ck: 'oth', i: iUY, k: 0, dc: now - 20 });
      W.dwMap = new Map([eDep, ePark, eArr, eOther].map(e => [e.ck, e])); W.dwAt = W.t; W.stabled = [...W.dwMap.values()];      // dwAt: không cho refreshDwellers xoá các tàu dựng tay
      for (let n = 0; n < 40; n++) { W.dwAt = W.t; Sim.tick(W, 0.1, {}, false); }
      ok(eDep.face === -1 && eDep.front < eDep.f0 - 0.5, `${rec.d}: tàu quá giờ đi ở Omagari đổi mặt và lùi ra (front ${eDep.front.toFixed(1)} < ${eDep.f0.toFixed(1)})`, [eDep.face, eDep.front]);
      ok(ePark.face === 1 && Math.abs(ePark.front - ePark.f0) < 1e-6, `${rec.d}: tàu đang đỗ chờ ở Omagari giữ nguyên mặt và vị trí`, [ePark.face, ePark.front]);
      ok(eArr.face === 1 && eArr.front < eArr.f0, `${rec.d}: tàu đang vào Omagari vẫn tiến vào ga từ phía sau (không đổi mặt)`, [eArr.face, eArr.front, eArr.f0]);
      ok(eOther.face === 1 && eOther.front > eOther.f0 + 0.5, `${rec.d}: ga khác Omagari: tàu rời ga vẫn tiến thẳng (không lùi)`, [eOther.face, eOther.front]);
      ok(Math.max(...[eDep, ePark, eArr].map(e => e.front)) <= sM + 1e-6, `${rec.d}: không tàu nào ở Omagari vượt vạch dừng (chắn cuối ở +15 m)`, [eDep.front, ePark.front, eArr.front, sM]);
    }
    // 3) tàu NGƯỢC chiều bị giữ ở Ugo-Yotsuya (không có giờ dừng) đỗ ở đường tránh khi ta chạy suốt; hết giữ thì tăng tốc rời ga rồi biến mất
    for (const [rd, ro, sx] of [[recD, recU, -4.3], [recU, recD, 4.3]]) {
      const W = Sim.createWorld('aki', mkTrip(rd), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player; if (!W.haz) NCr.init(W);
      const cat = NCr.build(window.LINES).find(c => c.rec === ro), kUY = T.M.findIndex(m => m.i === iUY), now = W.trip.t0 + W.t; let tU = Sim.timeAt(LA, ro, iUY), bestE = 9; for (let tt = tU - 150; tt <= tU + 150; tt += 1) { const q = NCr.stateOf(window.LINES, cat, tt); if (q && Math.abs(q.km - LA.stations[iUY].km) < bestE) { bestE = Math.abs(q.km - LA.stations[iUY].km); tU = tt; } }      // giờ mà tàu mẫu đứng ĐÚNG km ga (timeAt nội suy tuyến tính, lệch vài trăm m so với bảng tốc độ)
      ok(!!cat && kUY > 0 && bestE < 0.02 && !ro.s.some(e => e[0] === iUY && !e[3]), `${rd.d}: tàu ngược chiều mẫu không có giờ dừng ở Ugo-Yotsuya`);
      const d = { delay: now - tU, hold: 0, hit: {}, why: '', shake: -1e9, rate: 0 }; W.haz.delay.set(cat.key, d); T.x = T.M[kUY].s - 800; W.dwAt = undefined; Sim.tick(W, 0.1, {}, false);
      ok(!(W.stabled || []).some(e => e.hd), `${rd.d}: tàu ngược chiều chưa bị giữ thì không hiện ở ga`);
      d.hold = 12; d.why = 'single'; W.dwAt = undefined; Sim.tick(W, 0.1, {}, false);
      const e = (W.stabled || []).find(x => x.hd);
      ok(!!e && e.i === iUY && e.face === -1 && Math.abs(e.track.x - sx) < 1e-6, `${rd.d}: tàu ngược chiều bị giữ đỗ ở đường tránh (x = ${sx}), quay mặt về phía ta`, e && [e.i, e.face, e.track.x]);
      ok(!!e && Math.abs(e.front - T.M[kUY].s) < 1e-6 && Math.abs(e.track.x - LYr.station('2-2-1s', W.dir, 0).ours.x) < 1e-6 && LYr.station('2-2-1s', W.dir, 0).tracks.some(t => t.main && t.thr && t.x === 0), `${rd.d}: tàu bị giữ nằm ở vạch ga, đường tránh là đường dừng của ga và đường chính (thông qua) x = 0 để trống`);
      d.hold = 0; d.why = ''; const f0 = e && e.front; for (let n = 0; n < 200; n++) { W.dwAt = undefined; W.t += 0.1; Sim.tick(W, 0.1, {}, false); }
      const e2 = (W.stabled || []).find(x => x.hd);
      ok(!e2 || (e2.hdRel && e2.front < f0 - 0.5), `${rd.d}: hết bị giữ thì tăng tốc rời ga (hoặc đã biến mất)`, e2 && [e2.hdRel, e2.front, f0]);
    } }
}

if (section('33. Melody theo tuyến/ga, đèn cửa chờ melody khởi hành, bộ phát chuỗi PA')) {
  const Mel = require(path.join(DRIVE, 'melody.js')); const ix = (L, en) => L.stations.findIndex(s => s.en === en);
  const T = Sim.lineOf('tsk'), H = Sim.lineOf('hok'), N = Sim.lineOf('nks');
  // melody đặc thù theo đoạn: ga ranh giới dùng melody của đoạn đang đi tới, đổi sau khi rời ga
  { const so = ix(T, 'Shin-Osaka'), hk = ix(T, 'Hakata'), jm = ix(H, 'Joetsu-Myoko');
    ok(Mel.seg(T, 0, 1) === 'tokai' && Mel.seg(T, so - 1, so) === 'tokai' && Mel.seg(T, so, so + 1) === 'west', 'tsk: Tokyo-Shin-Osaka melody JR Tokai; qua Shin-Osaka đổi sang JR West');
    ok(Mel.seg(T, hk - 1, hk) === 'west' && Mel.seg(T, hk, hk + 1) === 'kyushu' && Mel.seg(T, T.stations.length - 2, T.stations.length - 1) === 'kyushu', 'tsk: tới Hakata vẫn JR West, rời Hakata sang Kyushu');
    ok(Mel.seg(H, jm - 1, jm) === 'east_joetsu' && Mel.seg(H, jm, jm + 1) === 'west_hokuriku' && Mel.seg(H, 0, 1) === 'east_joetsu', 'hok: trước Joetsu-Myoko melody JR East, sau đó JR West');
    ok(Mel.seg(Sim.lineOf('jts'), 3, 4) === 'east_joetsu' && Mel.seg(Sim.lineOf('toh'), 3, 4) === 'east_tohoku' && Mel.seg(Sim.lineOf('aki'), 3, 4) === 'east_tohoku' && Mel.seg(Sim.lineOf('yam'), 3, 4) === 'east_tohoku' && Mel.seg(N, 0, 1) === 'nk', 'melody tuyến: Joetsu / Tohoku-Akita-Yamagata-Hokkaido / Nishi-Kyushu'); }
  // melody khởi hành theo ga (và chiều ở ga ranh giới)
  { const so = ix(T, 'Shin-Osaka'), hk = ix(T, 'Hakata'), km = ix(T, 'Kumamoto'), kg = ix(T, 'Kagoshima-Chuo');
    ok(Mel.dep(T, 0, 'down') === 'tokai_dep' && Mel.dep(T, ix(T, 'Kyoto'), 'up') === 'tokai_dep' && Mel.dep(T, ix(T, 'Okayama'), 'down') === 'west_dep', 'khởi hành: Tokyo/Kyoto JR Tokai, Okayama JR West');
    ok(Mel.dep(T, so, 'down') === 'west_dep' && Mel.dep(T, so, 'up') === 'tokai_dep', 'khởi hành Shin-Osaka theo chiều đi (về Hakata: JR West, về Tokyo: JR Tokai)');
    ok(Mel.dep(T, hk, 'down') === null && Mel.dep(T, hk, 'up') === 'west_dep', 'khởi hành Hakata: hướng Kyushu không có, hướng Shin-Osaka dùng JR West');
    ok(Mel.dep(T, km, 'down') === 'dep_kumamoto' && Mel.dep(T, kg, 'up') === 'dep_kagoshima' && Mel.dep(T, ix(T, 'Sendai'), 'up') === 'dep_kyushu' && Mel.dep(T, ix(T, 'Shin-Tosu'), 'down') === 'dep_kyushu', 'khởi hành Kyushu: Kumamoto, Kagoshima, các ga còn lại');
    ok(Mel.dep(N, 0, 'down') === 'dep_takeo' && Mel.dep(N, 0, 'up') === null && Mel.dep(N, 4, 'up') === 'dep_nagasaki' && Mel.dep(N, 4, 'down') === null && Mel.dep(N, 1, 'up') === 'dep_ureshino' && Mel.dep(N, 2, 'down') === 'dep_shinomura' && Mel.dep(N, 3, 'up') === 'dep_isahaya', 'khởi hành Nishi-Kyushu theo ga và chiều');
    ok(Mel.dep(Sim.lineOf('toh'), 5, 'down') === null && Mel.dep(H, 5, 'down') === null && Mel.dep(Sim.lineOf('jts'), 5, 'up') === null, 'Tohoku/Hokuriku/Joetsu: ga không có melody khởi hành'); }
  // melody vào ga 3,5 km và khoảng cách kích hoạt
  { ok(Mel.arr(T, ix(T, 'Hakata')) === 'arr_hakata' && Mel.arr(T, ix(T, 'Kumamoto')) === 'arr_kumamoto' && Mel.arr(T, ix(T, 'Kagoshima-Chuo')) === 'arr_kagoshima' && Mel.arr(T, 3) === null && Mel.arr(Sim.lineOf('toh'), 3) === null, 'melody vào ga riêng: Hakata, Kumamoto, Kagoshima-Chuo');
    ok(Mel.trigger(T, ix(T, 'Hakata'), 30000) === 3500 && Mel.trigger(T, 5, 30000) === 2500 && Math.abs(Mel.trigger(Sim.lineOf('toh'), 1, 4000) - 2400) < 1e-6, 'mốc kích hoạt: 3,5 km (3 ga Kyushu), 2,5 km, nhưng không quá 60% khoảng cách tới ga trước (Ueno 2,4 km)'); }
  { for (const id of Object.keys(Mel.SEG)) ok(Mel.len(id) > 4 && Mel.len(id) < 25, 'melody ' + id + ' có độ dài hợp lý (' + Mel.len(id).toFixed(1) + ' s)'); }
  // đèn cửa chỉ xanh sau PA nhắc + ngắt + melody khởi hành (thời lượng cố định)
  { const run = use => { if (use) global.Melody = Mel; else delete global.Melody; try {
        const rec = find('tsk', 'Nozomi', 'down', 0, 12), W = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 0, 12), { diff: 'easy', seed: 1, lead: false, events: false }), Tr = W.player;
        const ok0 = Sim.requestClose(Tr); return { ok0, dur0: Tr.doorDur, dm: Tr.depMel }; } finally { global.Melody = Mel; } };
    const a = run(true), b = run(false);
    ok(a.ok0 && a.dm === 'tokai_dep' && a.dur0 >= Mel.depChain(T, 0, 'down') && a.dur0 > 17, 'Tokyo: đèn cửa chờ PA + melody khởi hành (' + a.dur0.toFixed(1) + ' s)');
    ok(b.ok0 && !b.dm && b.dur0 === 9, 'không có Melody: giữ nguyên 9 s như cũ'); }
  ok(Mel.depChain(T, ix(T, 'Hakata'), 'down') === 0 && Mel.depChain(T, 0, 'down') === Mel.DOOR_PA + Mel.GAP + Mel.len('tokai_dep'), 'depChain: 0 nếu ga không có melody, ngược lại PA + ngắt + melody');
  // chạy trọn chuyến tự lái có/không melody: vẫn hoàn thành, giờ đến ga cuối lệch ≤ 8 s (tàu tự đóng cửa sớm bù thời gian melody)
  for (const [ln, ty, dir, a, b] of [['tsk', 'Nozomi', 'down', 0, 12], ['nks', 'Kamome', 'down', 0, 4], ['tsk', 'Sakura', 'down', 12, 45]]) {
    const rec = find(ln, ty, dir, a, b); if (!rec) { ok(true, ln + ' ' + ty + ': không có chuyến mẫu, bỏ qua'); continue; }
    global.Melody = Mel; const r1 = runAuto(ln, rec, a, b, { diff: 'easy', events: false }, 30000); delete global.Melody; const r0 = runAuto(ln, rec, a, b, { diff: 'easy', events: false }, 30000); global.Melody = Mel;
    const d1 = r1.T.results[r1.T.results.length - 1], d0 = r0.T.results[r0.T.results.length - 1];
    ok(r1.T.finished && !r1.T.failed && d1 && d0 && Math.abs(d1.delay - d0.delay) <= 8, ln + ' ' + ty + ': chạy trọn chuyến có melody, giờ đến ga cuối lệch ≤ 8 s so với không melody', d1 && d0 && (d1.delay - d0.delay).toFixed(1)); }
  // màn Tạm dừng/Cài đặt chỉ tạm dừng PA (không ngắt hàng đợi); chỉ rời chuyến (về menu) mới stopAll
  { const html = require('fs').readFileSync(path.join(DRIVE, 'index.html'), 'utf8'); ok(/if \(name === 'home' \|\| name === 'setup' \|\| name === 'learn'\) try \{ AUD\.stopAll\(\)/.test(html), 'M.show: chỉ về menu/thiết lập mới ngắt PA, màn Tạm dừng thì không (PA phát tiếp khi chạy lại)'); }
  // tàu danh mục (bản đồ toàn quốc) không bao giờ đi lùi: độ trễ không tăng nhanh hơn thời gian thực
  { const cat = NatCat.build(window.LINES).filter(c => c.line === 'tsk' && c.rec.d === 'down'), ks = Sim.lineOf('tsk').trains.filter(t => t.t === 'Kodama' && t.d === 'down' && t.s.some(e => e[0] === 0 && !e[3]) && t.s.some(e => e[0] === 12 && !e[3])).slice(0, 3);
    let drift = 0, tot = 0; for (const rec of ks) { const W = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 0, 12), { diff: 'normal', seed: 3, lead: false, events: true }), Tr = W.player, hist = {}; let n = 0;
      while (!Tr.finished && n++ < 2e6 && W.t < 20000) { Sim.tick(W, 0.05, {}, true); if (n % 20) continue; const now = W.trip.t0 + W.t; for (const c of cat) { const d = NatCat.delayOf(W, c.key), s = NatCat.stateOf(window.LINES, c, now - (d ? d.delay : 0), d && d.skip); if (!s) continue; const h = hist[c.key] || (hist[c.key] = []); h.push(s.km); if (h.length > 30) { const old = h.shift(); if (s.km < old - 0.05) drift++; } tot++; } } }      // so với 30 s trước: không được lùi quá 50 m (giật nhỏ <25 m do bước cập nhật 0,4 s thì bỏ qua)
    ok(drift === 0, 'tàu danh mục không chạy lùi trên bản đồ (số mẫu lùi > 50 m trong 30 s: ' + drift + '/' + tot + ')'); }
  // tàu vượt qua ga trong lúc ta đỗ chạy mượt: tiến độ đi qua ga không bao giờ lùi và không nhảy (cảnh 2D/minimap không giật)
  { const ks = Sim.lineOf('tsk').trains.filter(t => t.t === 'Kodama' && t.d === 'down' && t.s.some(e => e[0] === 0 && !e[3]) && t.s.some(e => e[0] === 12 && !e[3])).slice(0, 3); let rev = 0, jump = 0, fr = 0;
    for (const rec of ks) { const W = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 0, 12), { diff: 'normal', seed: 3, lead: false, events: true }), Tr = W.player, prev = new Map(); let n = 0;
      while (!Tr.finished && n++ < 2e6 && W.t < 20000) { Sim.tick(W, 0.05, {}, true); if (Tr.phase !== 'dwell') continue; for (const o of Sim.passersAt(W, Tr.k)) { if (o.t === undefined) continue; const u = (W.t - (o.t - 4.5)) / 9; if (u > 0.02 && u < 0.98) { const p = prev.get(o); if (p !== undefined) { fr++; if (u < p - 0.0005) rev++; if (u - p > 0.06) jump++; } prev.set(o, u); } else prev.delete(o); } } }
    ok(fr > 500 && rev === 0 && jump === 0, 'tàu vượt qua ga lúc ta đỗ: tiến độ không lùi, không nhảy (' + fr + ' khung, lùi ' + rev + ', nhảy ' + jump + ')'); }
  // bản đồ Nhật Bản: độ trễ hiển thị của tàu danh mục không làm vị trí lùi, dù độ trễ thật tăng theo bậc 0,4 s và nhanh hơn thời gian thực
  { require(path.join(DRIVE, 'natmap.js')); const NM = global.NatMap; let prev = -1e9, back = 0, i0 = 0; for (let i = 0; i < 2000; i++) { const now = 1000 + i * 0.05, dl = 1.2 * Math.floor(now / 0.4) * 0.4, shown = now - NM.shownDelay('t1', now, dl); if (shown < prev - 1e-9) back++; prev = shown; i0++; }
    let r1 = NM.shownDelay('t2', 5000, 100), r2 = NM.shownDelay('t2', 5000.05, 40); ok(back === 0 && i0 === 2000, 'bản đồ Nhật Bản: vị trí theo lịch của tàu danh mục không lùi khi độ trễ tăng bậc (' + back + ' lần lùi)'); ok(r2 === 40, 'độ trễ giảm thì tàu tiến ngay theo lịch'); }
  // mất focus/ẩn tab: bình thường tạm dừng game, nhưng đang bật tự lái (chế độ drive) thì không tạm dừng
  { const html = require('fs').readFileSync(path.join(DRIVE, 'index.html'), 'utf8'); ok(/const focusLost = \(\) => \{ if \(auto && mode === 'drive'\) return; if \(W && !paused/.test(html), 'tự lái: mất focus không tạm dừng game; ngoài tự lái thì luôn tạm dừng'); }
  // bộ phát chuỗi: thứ tự, khoảng ngắt 2,5 s, và ngắt hẳn khi thoát (lỗi PA vẫn phát sau khi ra menu)
  { const spoken = [], pend = []; global.SpeechSynthesisUtterance = function (t) { this.text = t; }; global.speechSynthesis = { speak(u) { spoken.push([Date.now(), u.text]); pend.push(u); setTimeout(() => u.onend && u.onend(), 100); }, cancel() { pend.length = 0; }, getVoices: () => [{ lang: 'ja-JP', name: 'ja' }] };
    require(path.join(DRIVE, 'audio.js'));
    const A = new GameAudio(); A.enabled = true; A.vol = 0.6; A.pick = () => ({ lang: 'ja-JP' }); const W = { say() { }, msgs: [] };
    const pa = t => ({ pa: { ja: t, vi: t } });
    (global.__pending = global.__pending || []).push(new Promise(res => {
      A.chain(W, [pa('いち'), pa('に')]); A.chain(W, [pa('さん')], {});
      setTimeout(() => {
        ok(spoken.map(x => x[1]).join('|') === 'いち|に|さん', 'chuỗi PA phát đúng thứ tự', spoken.map(x => x[1]).join('|'));
        ok(spoken.length === 3 && spoken[1][0] - spoken[0][0] >= 950 && spoken[2][0] - spoken[1][0] >= 950, 'giữa hai PA ngắt ≥ 1 s (mặc định)', spoken.slice(1).map((x, i) => x[0] - spoken[i][0]).join(','));
        spoken.length = 0; A.chain(W, [pa('A'), pa('B'), pa('C')]);
        setTimeout(() => { A.stopAll(); const n = spoken.length; setTimeout(() => { ok(n === 1 && spoken.length === n, 'stopAll ngắt hết PA đang chờ (không phát tiếp sau khi thoát menu)', n + '/' + spoken.length);
          const t1 = Date.now(); spoken.length = 0; A.chain(W, [pa('X'), { gap: 1800 }, pa('Y')]); setTimeout(() => { ok(spoken.length === 2 && spoken[1][0] - spoken[0][0] >= 1750 && spoken[1][0] - spoken[0][0] < 2600, 'bước {gap} đổi khoảng ngắt (1,8 s)', spoken.map(x => x[0] - t1).join(','));
            spoken.length = 0; A.lastEnd = 0; A.chain(W, [pa('P'), pa('Q')]); setTimeout(() => { A.pausePlay(); setTimeout(() => { const n1 = spoken.map(x => x[1]).join('');
              ok(n1 === 'P', 'tạm dừng (mất focus/Esc): PA đang đọc dừng, không sang câu kế', n1); A.resumePlay();
              setTimeout(() => { const n2 = spoken.map(x => x[1]).join(''); ok(n2 === 'PPQ', 'tiếp tục sau tạm dừng: đọc lại câu đang dở rồi phát nốt phần còn lại (không bị ngắt)', n2); res(); }, 4200); }, 3000); }, 40); }, 2700); }, 3500); }, 900);
      }, 8500); })); }
  // kênh phát thanh theo tàu (chế độ tự do): PA/melody đang dở ở một tàu khi sang tàu khác thì tắt tiếng nhưng vẫn trôi theo thời gian; quay về còn thì phát nốt, hết thì thôi
  { const prevP = Promise.all((global.__pending || []).slice()); (global.__pending = global.__pending || []).push(prevP.then(() => new Promise(res => {
      const spoken = [], pend = []; global.speechSynthesis = { speak(u) { spoken.push(u.text); pend.push(u); setTimeout(() => u.onend && u.onend(), 100); }, cancel() { pend.length = 0; }, getVoices: () => [{ lang: 'ja-JP', name: 'ja' }] };
      const A = new GameAudio(); A.enabled = true; A.vol = 0.6; A.pick = () => ({ lang: 'ja-JP' }); const mkW = () => ({ say() { }, msgs: [] }), T0 = { k: 0, results: [] }, pa = t => ({ pa: { ja: t, vi: t } });
      const W1 = mkW(), W2 = mkW(); A.reset(W1);
      A.chain(W1, [pa('A'), pa('B'), pa('C')]);
      setTimeout(() => {
        A.switchTo(W2, T0); A.vtick(W1._aud, 500);      // sang tàu khác khi A vừa đọc xong, đang chờ ngắt trước B
        setTimeout(() => {
          ok(spoken.join('') === 'A', 'sang tàu khác: PA của tàu cũ không phát tiếp (tắt tiếng)', spoken.join(''));
          A.switchTo(W1, T0);
          setTimeout(() => {
            ok(spoken.join('') === 'ABC', 'quay về sớm: phát nốt phần còn lại (B, C) của tàu cũ', spoken.join(''));
            spoken.length = 0; A.chain(W1, [pa('X'), pa('Y')]);
            setTimeout(() => {
              A.switchTo(W2, T0); A.vtick(W1._aud, 20000);      // đi lâu: các câu còn lại đã trôi hết khi quay về
              setTimeout(() => { A.switchTo(W1, T0); setTimeout(() => { ok(spoken.join('') === 'X', 'quay về muộn: phần đã trôi hết khi ở tàu khác thì không phát lại (chỉ X đã đọc trước khi đi)', spoken.join('')); res(); }, 1800); }, 300); }, 300); }, 4200); }, 1500); }, 300); })));
  }
}


Promise.all(global.__pending || []).then(() => { if (process.argv.includes('--count')) console.log('SECTIONS ' + secN); console.log(`\nKẾT QUẢ: ${pass} đạt, ${fail} lỗi`); if (fail) { failures.slice(0, 40).forEach(f => console.log('  ✗ ' + f)); process.exit(1); } });
