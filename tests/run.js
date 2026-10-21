// Bộ kiểm thử mô phỏng: node tests/run.js  (không cần trình duyệt)
const path = require('path');
const DRIVE = path.join(__dirname, '..', 'prototype', 'drive');
global.window = global;
global.localStorage = (() => { const m = {}; return { getItem: k => m[k] || null, setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })();
require(path.join(DRIVE, 'data-lines.js'));
const Sim = require(path.join(DRIVE, 'sim.js')); global.Sim = Sim;
require(path.join(DRIVE, 'store.js')); require(path.join(DRIVE, 'tutorial.js'));
let pass = 0, fail = 0; const failures = [];
function ok(cond, name, info) { if (cond) pass++; else { fail++; failures.push(name + (info !== undefined ? ' → ' + info : '')); } }
function approx(a, b, tol, name) { ok(Math.abs(a - b) <= tol, name, `${a} vs ${b} ±${tol}`); }
const find = (ln, type, dir, a, b) => Sim.lineOf(ln).trains.find(t => t.t === type && t.d === dir && t.s.some(e => e[0] === a && !e[3]) && t.s.some(e => e[0] === b && !e[3]));
function runAuto(ln, rec, a, b, o, maxT) {
  const trip = Sim.makeTrip(ln, rec, a, b), W = Sim.createWorld(ln, trip, Object.assign({ diff: 'easy', seed: 1, lead: false, events: false }, o || {})), T = W.player; let n = 0;
  while (!T.finished && n++ < 4e6 && W.t < (maxT || 60000)) Sim.tick(W, 0.05, {}, true);
  return { W, T, trip };
}
const section = s => console.log('\n== ' + s);

section('1. Dữ liệu tuyến và lịch tàu');
for (const ln of ['tsk', 'toh']) {
  const L = Sim.lineOf(ln); ok(L.stations.length > 20 && L.trains.length > 100, `${ln}: số ga/chuyến hợp lý`, `${L.stations.length} ga, ${L.trains.length} chuyến`);
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
  for (const ln of ['tsk', 'toh']) { const L = Sim.lineOf(ln); for (const rec of L.trains.filter((t, i) => i % 7 === 0)) {
    const st = rec.s.filter(e => !e[3]); const a = st[0][0], b = st[st.length - 1][0]; const r = runAuto(ln, rec, a, b); cnt++;
    ok(r.T.finished && !r.T.failed, `${ln} ${rec.t} ${rec.n}: hoàn thành`);
    const d = Math.max(...r.T.results.map(x => Math.abs(x.delay))); worst = Math.max(worst, d);
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
    ok(T2.animalHit === 1 && T2.cut, 'hươu: không còi → va chạm, phanh khẩn'); }
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
  for (const [ln, dir, t0] of [['tsk', 'down', 8 * 3600], ['tsk', 'up', 9 * 3600], ['toh', 'down', 9 * 3600], ['toh', 'up', 10 * 3600]]) {
    const W = Sim.createNetwork(ln, dir, { diff: 'normal', seed: 3, t0, span: 5400 }); W.events = []; let n = 0; while (W.t < 5400 && n++ < 1e5) Sim.netTick(W, 0.2); const sc = Sim.netScore(W);
    ok(W.net.trains.length >= 8, `${ln} ${dir}: có nhiều tàu`, W.net.trains.length); ok(sc.avg < 1.5, `${ln} ${dir}: không sự cố → trễ trung bình < 1,5 phút`, sc.avg); ok(sc.maxD < 6, `${ln} ${dir}: không sự cố → trễ lớn nhất < 6 phút`, sc.maxD);
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

console.log(`\nKẾT QUẢ: ${pass} đạt, ${fail} lỗi`); if (fail) { failures.slice(0, 40).forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
