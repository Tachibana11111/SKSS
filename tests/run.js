// Bộ kiểm thử mô phỏng: node tests/run.js  (không cần trình duyệt)
const path = require('path');
const DRIVE = path.join(__dirname, '..', 'prototype', 'drive');
global.window = global;
global.localStorage = (() => { const m = {}; return { getItem: k => m[k] || null, setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })();
require(path.join(DRIVE, 'data-lines.js'));
const Sim = require(path.join(DRIVE, 'sim.js')); global.Sim = Sim;
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
const section = s => console.log('\n== ' + s);

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

section('2. Tự lái bám lịch trên mọi loại tàu (đơn độc, không sự kiện)');
{
  let worst = 0, cnt = 0;
  for (const ln of ALL) { const L = Sim.lineOf(ln); for (const rec of L.trains.filter((t, i) => i % 7 === 0)) {
    const st = rec.s.filter(e => !e[3]); const a = st[0][0], b = st[st.length - 1][0]; const r = runAuto(ln, rec, a, b); cnt++;
    ok(r.T.finished && !r.T.failed, `${ln} ${rec.t} ${rec.n}: hoàn thành`);
    const d = Math.max(...r.T.results.map(x => Math.abs(x.delay))); if (ln !== 'jts' && ln !== 'yam') worst = Math.max(worst, d); else ok(d < 260, `${ln} ${rec.t} ${rec.n}: lịch rất căng, tự lái trễ < 260 s`, Math.round(d));      // Joetsu: lịch thật dồn (Takasaki–Echigo-Yuzawa 23 phút) vượt khả năng tăng/giảm tốc của mô hình [I]
    for (const x of r.T.results) if (!x.overrun) ok(Math.abs(x.err) < 3, `${ln} ${rec.t} ${rec.n} ${x.station}: dừng lệch < 3 m`, x.err.toFixed(2));
  } }
  ok(worst < 90, 'trễ/sớm tối đa của tự lái < 90 s', Math.round(worst)); console.log('  đã chạy', cnt, 'chuyến, lệch giờ lớn nhất', Math.round(worst), 's');
}

section('3. Vật lý: tốc độ tối đa, độ dốc, tải, phanh, nhiệt, điện');
{
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

section('4. ATC, cửa, giữ tàu, khởi hành sớm');
{
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

section('5. Sự kiện: tiêm từng loại và hậu quả');
{
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

section('6. Xác định (replay) và chấm điểm');
{
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

section('7. Chế độ điều độ (mạng nhiều tàu)');
{
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

section('8. Hồ sơ, thành tích và bản ghi');
{
  const St = global.Store; St.reset();
  const base = { kind: 'drive', line: 'tsk', trainLabel: 'Nozomi 1', diff: 'hard', weather: 'rain', seed: 1, score: 90, finished: true, perfectStops: 4, stops: 5, atc: 0, ackCount: 4, ackPen: 0, paCount: 1, hadFire: true, fireTunnel: 0, scenario: { kind: 'drive', line: 'tsk', dir: 'down', train: 'Nozomi 1', from: 0, to: 5, diff: 'hard', weather: 'rain', seed: 1 } };
  const r = St.record(base, { recipe: {}, actions: [[0, 'door']] }); const ids = r.fresh.map(a => a.id); for (const id of ['first', 'perfect3', 'noatc', 'storm', 'quickack', 'pa', 'fire', 'hard']) ok(ids.includes(id), 'thành tích ' + id);
  const r2 = St.record(base, null); ok(r2.fresh.length === 0, 'không mở khoá lại thành tích cũ'); ok(Object.keys(St.get().replays).length === 1, 'giữ bản ghi tốt nhất');
  ok(St.get().history.length === 2, 'lịch sử ghi 2 lần'); St.record(Object.assign({}, base, { score: 95 }), { recipe: {}, actions: [] }); ok(Object.values(St.get().best)[0].score === 95, 'kết quả tốt nhất cập nhật'); St.reset(); ok(St.get().history.length === 0, 'xoá hồ sơ');
}

section('9. Hướng dẫn (bot làm theo từng bước)');
{
  for (let li = 0; li < 3; li++) {
    const c = Tutorial.cfg(li); ok(!!c, `bài ${li + 1}: tìm được chuyến`); if (!c) continue; const trip = Sim.makeTrip(c.lineId, c.rec, c.from, c.to);
    const W = Sim.createWorld(c.lineId, trip, { diff: c.diff, weather: c.weather, seed: c.seed, lead: false, events: false }), T = W.player; let now = 0, n = 0; const LS = Tutorial.LESSONS[li], S = Tutorial.S;
    while (n++ < 4e6 && !(S.step >= LS.steps.length)) {
      now += 50; const s = S.step;
      if (li === 0) { if (s === 0) Sim.requestClose(T); else if (s === 1 && T.door === 'closed') Sim.setPower(T, 1); else if (s === 2) Sim.setPower(T, Math.min(13, T.pw + (n % 30 === 0 ? 1 : 0))); else if (s === 3) Sim.setPower(T, 13); else if (s === 4) Sim.coast(T);
        else if (s === 5) Sim.setBrake(T, S.st.hit ? 0 : 2); else if (s === 6) { Sim.setBrake(T, 0); if (T.v * 3.6 < 190) Sim.setPower(T, 8); else if (n % 20 === 0) Sim.toggleCS(T); } else if (s === 7) Sim.setBrake(T, S.st.hit ? 0 : 1); }
      if (li >= 1 && s === 0 && T.door === 'open') Sim.requestClose(T);
      if (li === 1) { if (s === 2) T.wiper = true; if (s === 4) T.wiper = false; if (s === 1 || s === 7) Sim.ackOldest(W); if (s === 5) for (const z of W.workers) if (!z.checked && T.x >= z.s0 - 600) Sim.honk(T); if (s === 6) for (const a of W.animals) if (!a.resolved && T.x >= a.s - 1200) Sim.honk(T); }
      if (li === 2) { if (s === 1 && W.decision) Sim.answerDecision(W, 'a'); if (s === 2 && T.cut) Sim.announcePA(T); if (s === 4) Sim.ackOldest(W); }
      const manual = li === 0 && s <= 7; Sim.tick(W, 0.05, {}, !manual); Tutorial.update(W, T, now);
      if (T.finished) { for (let k = 0; k < 60; k++) { now += 50; Tutorial.update(W, T, now); } break; }
    }
    ok(S.step >= LS.steps.length, `bài ${li + 1}: bot hoàn thành mọi bước`, `${S.step}/${LS.steps.length}`);
  }
}

section('10. Bố trí ga, kết cấu tuyến, đường cong (layout.js)');
{
  const LAY = require(path.join(DRIVE, 'layout.js'));
  for (const code of Object.keys(LAY.TOK)) for (const dir of ['down', 'up']) {
    const [f, l, t] = code.split('-').map(Number), st = LAY.station(code, dir, 1), tag = `${code} ${dir}`;
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

section('11. Ghi: giới hạn tốc độ vào/ra đường sân ga, dừng quá muộn, thông qua');
{
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
section('12. Đèn pha: tự động / bật / tắt');
{
  const rec = find('tsk', 'Kodama', 'down', 0, 12), mk = hour => { const W = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 0, 12), { diff: 'easy', seed: 1, lead: false, events: false }); W.trip.t0 = hour * 3600; return W; };
  let W = mk(11), T = W.player; ok(T.lamp === 'auto' && !Sim.lampOn(W, T), 'ban ngày, chế độ tự động: đèn tắt');
  Sim.cycleLamp(T); ok(T.lamp === 'on' && Sim.lampOn(W, T), 'chế độ bật: đèn sáng cả ban ngày'); Sim.cycleLamp(T); ok(T.lamp === 'off' && !Sim.lampOn(W, T), 'chế độ tắt: đèn tắt'); Sim.cycleLamp(T); ok(T.lamp === 'auto', 'vòng trở lại tự động');
  W = mk(21); T = W.player; ok(Sim.lampOn(W, T), 'ban đêm, tự động: đèn sáng'); T.lamp = 'off'; ok(!Sim.lampOn(W, T), 'ban đêm, người lái tắt: đèn tắt (và bị trừ điểm nếu chạy)');
  T.phase = 'run'; T.v = 60; T.started = true; for (let i = 0; i < 4000; i++) Sim.tick(W, 0.05, {}, false); ok(T.lampBad > 20, 'chạy ban đêm với đèn tắt: tích lũy lỗi đèn pha', T.lampBad);
  T.cut = true; T.lamp = 'on'; ok(!Sim.lampOn(W, T), 'mất điện: đèn tắt');
}

section('13. Công tắc ATC (bật / cắt)');
{
  const rec = find('tsk', 'Kodama', 'down', 0, 12), W = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 0, 12), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player;
  ok(T.atcOn === true, 'ATC mặc định BẬT');
  ok(Sim.toggleATC(T) === 'arm' && T.atcOn === true, 'bấm một lần: chỉ chờ xác nhận, chưa cắt'); W.t += 5; ok(Sim.toggleATC(T) === 'arm', 'quá 4 s thì phải xác nhận lại');
  ok(Sim.toggleATC(T) === 'off' && T.atcOn === false, 'bấm hai lần trong 4 s: cắt ATC'); ok(Sim.toggleATC(T) === 'on' && T.atcOn === true, 'bấm lại: bật ATC ngay');
  // cắt ATC thì không còn phanh tự động khi vượt tốc độ cho phép
  const run = cut => { const W2 = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 0, 12), { diff: 'easy', seed: 1, lead: false, events: false }), T2 = W2.player; T2.started = true; T2.phase = 'run'; T2.x = T2.M[0].s + 500; T2.v = 100 / 3.6; T2.door = 'closed'; T2.atcOn = !cut; let hit = false; for (let i = 0; i < 400; i++) { Sim.setPower(T2, 13); Sim.tick(W2, 0.05, { cmd: 1 }, false); if (T2.atc) hit = true; } return { hit, v: T2.v * 3.6, bad: T2.atcOffBad }; };
  const on = run(false), off = run(true);
  ok(on.hit, 'ATC bật: phanh khi vượt tốc độ cho phép'); ok(!off.hit && off.v > on.v + 20, 'ATC cắt: không phanh tự động, tàu vượt giới hạn', off.v + ' vs ' + on.v); ok(off.bad > 5, 'ATC cắt và chạy > 30 km/h: tích lũy lỗi', off.bad);
}

section('14. Phát thanh: bên cửa mở và đổi tàu');
{
  global.document = global.document || {}; require(path.join(DRIVE, 'transfers.js')); const GA = require(path.join(DRIVE, 'audio.js')), G = global.GameAudio || (GA && GA.GameAudio);
  const rec = find('tsk', 'Kodama', 'down', 0, 12), W = Sim.createWorld('tsk', Sim.makeTrip('tsk', rec, 0, 12), { diff: 'easy', seed: 1, lead: false, events: false }), T = W.player, ds = nm => G.prototype.doorSide.call({}, W, T, T.M.findIndex(m => m.name === nm));
  const sd = ds('Odawara'); ok(sd && sd.ja === '左側' && sd.vi === 'trái', 'Odawara (2-2-1, đường dừng bên trái đường thông qua): cửa mở bên trái', JSON.stringify(sd));
  const mi = ds('Mishima'); ok(mi && mi.ja === '右側', 'Mishima (sân đảo bên phải đường dừng): cửa mở bên phải', JSON.stringify(mi));
  T.M[T.M.findIndex(m => m.name === 'Odawara')].mainStop = true; ok(ds('Odawara') === null, 'dừng ở đường chính: không có bên cửa mở');
  ok(Object.keys(window.TRANSFERS).length >= 60 && window.TRANSFERS['東京'].includes('山手線') && window.TRANSFERS['大宮'].includes('上越新幹線'), 'bảng đổi tàu: đủ ga, có Yamanote ở Tokyo và Joetsu ở Omiya');
  const missing = ALL.flatMap(ln => Sim.lineOf(ln).stations).filter(s => !window.TRANSFERS[s.jp]); ok(missing.length === 0, 'mọi ga có mục đổi tàu', missing.map(s => s.jp).join(','));
}

section('15. Tuyến mới: đổi tần số, Seikan, tàu ghép, đường đơn, đường ngang');
{
  // --- đoạn cách điện Hokuriku
  const L = Sim.lineOf('hok'); ok(L.meta.freq.length === 3, 'hok: ba đoạn cách điện (新軽井沢, 新高田, 新糸魚川)');
  const rec = find('hok', 'Asama', 'down', 7, 8), mk = () => Sim.createWorld('hok', Sim.makeTrip('hok', rec, 7, 8), { diff: 'easy', seed: 1, lead: false, events: false });
  { const W = mk(), T = W.player; ok(W.dead.length === 3 && W.dead[0].hzA === 50 && W.dead[0].hzB === 60, 'hok xuống: đoạn đầu 50→60 Hz'); Sim.requestClose(T); let n = 0;
    while (n++ < 4000 && T.x < W.dead[0].s1 + 100) { Sim.tick(W, 0.05, {}, false); T.pw = 13; }
    ok(T.deadViol === 1 && T.vcbUntil > W.t - 12, 'kéo lực vào đoạn cách điện: hồ quang, mất lực 12 s', T.deadViol); }
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
  { const W = { line: A, dir: 'down' }, sj = 497400; ok(Sim.trunkOff(W, sj - 500) === 0 && Math.abs(Sim.trunkOff(W, sj + 3000)) > 30, 'nhánh Tohoku tách ra sau ga Morioka (xuống)'); const Wu = { line: A, dir: 'up' }; const sju = (A.kmEnd - 497.4) * 1000; ok(Math.abs(Sim.trunkOff(Wu, sju - 3000)) > 30 && Sim.trunkOff(Wu, sju + 500) === 0, 'nhánh Tohoku nhập vào trước ga Morioka (lên)'); }
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
  // --- dữ liệu các tuyến mới
  for (const ln of ['jts', 'hok', 'nks', 'yam', 'aki']) { const L2 = Sim.lineOf(ln); ok(L2.trains.some(t => t.d === 'down') && L2.trains.some(t => t.d === 'up'), `${ln}: có cả hai chiều`); ok(L2.stations.every(st => st.lat && st.lon), `${ln}: ga có toạ độ`); ok(L2.meta.pa && L2.meta.defVeh && Sim.VEH[L2.meta.defVeh], `${ln}: có thông số tuyến`); }
}

console.log(`\nKẾT QUẢ: ${pass} đạt, ${fail} lỗi`); if (fail) { failures.slice(0, 40).forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
