// Lõi mô phỏng lái Shinkansen v0.3 (không phụ thuộc trình duyệt).
// Số liệu: docs/03 (tàu), 04 (lịch), 06 (ATC, ngưỡng thời tiết), 07 (lái), 09 (sự cố). Nhãn [I] = đơn giản hóa/suy luận.
(function (root) {
  const G = {
    m: 715e3, Fstart: 515e3, P: 14.5e6,        // N700: 715 t, 2,6 km/h/s, ~17 MW x hiệu suất [I]
    aB7: 0.75, aEB: 1.04, aATC: 0.72,          // phanh B7, phanh khẩn (~3 km từ 285), mẫu ATC [I]
    stopTol: 30, trainLen: 400, atcBuf: 400    // ATC chặn ở vạch + 30 m; tàu 16 toa 400 m; đệm khoảng cách [I]
  };
  const resist = v => 2000 + 80 * v + 19.5 * v * v;
  const tractive = v => Math.min(G.Fstart, G.P / Math.max(v, 1));
  const EBCMD = -G.aEB / G.aB7;
  const NOTCH_MIN = -8, NOTCH_MAX = 13;
  const notchName = n => n > 0 ? 'P' + n : n === 0 ? 'N' : n === -8 ? 'EB' : 'B' + (-n);
  const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));

  // ---- Tuyến Tokaido (docs/04 §2): [tên, km thực từ Tokyo, ga có đường tránh?]
  const STN = [['Tokyo', 0, 0], ['Shinagawa', 6.8, 0], ['Shin-Yokohama', 25.5, 0], ['Odawara', 76.7, 1], ['Atami', 95.4, 0], ['Mishima', 111.3, 1],
    ['Shin-Fuji', 135.0, 1], ['Shizuoka', 167.4, 1], ['Kakegawa', 211.3, 1], ['Hamamatsu', 238.9, 1], ['Toyohashi', 274.2, 1], ['Mikawa-Anjo', 312.8, 1],
    ['Nagoya', 342.0, 0], ['Gifu-Hashima', 367.1, 1], ['Maibara', 408.2, 1], ['Kyoto', 476.3, 0], ['Shin-Osaka', 515.4, 0]];
  const STN_JP = ['東京', '品川', '新横浜', '小田原', '熱海', '三島', '新富士', '静岡', '掛川', '浜松', '豊橋', '三河安城', '名古屋', '岐阜羽島', '米原', '京都', '新大阪'];
  const KM_END = 515.4;
  // Hầm lớn (vị trí xấp xỉ [I], chỉ dùng cho âm thanh/hình ảnh): hầm Tanna giữa Atami và Mishima
  const TUNNELS = [[97.5, 105.5, 'Tanna']];
  const LIMITS_KM = [[0, 6.8, 110], [6.8, 90, 270], [90, KM_END, 285]];       // giới hạn tuyến [I]
  const sOfKm = (km, dir) => dir === 'up' ? (KM_END - km) * 1000 : km * 1000;

  const DIFF = {
    easy:   { name: 'Dễ',         events: [1, 1], hint: 2, atcOver: 6 / 3.6, tolK: 2.0, comfortK: 6,  rate: 1.0, timeK: 0.5, eqk: 0,    fault: 0,   reopen: 0.05, confirm: 'auto' },
    normal: { name: 'Thường',     events: [2, 3], hint: 1, atcOver: 2 / 3.6, tolK: 1.0, comfortK: 12, rate: 1.0, timeK: 1.0, eqk: 0.1,  fault: 0,   reopen: 0.10, confirm: 'auto5' },
    hard:   { name: 'Khó',        events: [4, 5], hint: 0, atcOver: 0.5 / 3.6, tolK: 0.7, comfortK: 16, rate: 0.85, timeK: 1.3, eqk: 0.25, fault: 0.2, reopen: 0.15, confirm: 'manual' },
    expert: { name: 'Chuyên gia', events: [6, 7], hint: 0, atcOver: 0.3 / 3.6, tolK: 0.5, comfortK: 20, rate: 0.7, timeK: 1.6, eqk: 0.45, fault: 0.5, reopen: 0.20, confirm: 'manual' }
  };
  const WEATHER = { auto: 'Ngẫu nhiên', clear: 'Trời quang', rain: 'Mưa lớn', typhoon: 'Bão (mưa + gió)', snow: 'Tuyết (Sekigahara)', eqk: 'Động đất' };

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---- Lịch tàu --------------------------------------------------------------
  function trainSeq(rec, dir) {
    const up = rec[2];
    if (dir === 'up') return up.map(e => ({ i: e[0], arr: e[1], dep: e[2], stop: !e[3] }));
    const t0 = up[0][2], tEnd = up[up.length - 1][1] != null ? up[up.length - 1][1] : up[up.length - 1][2];
    const out = up.slice().reverse().map(e => ({ i: e[0], arr: e[2] != null ? t0 + (tEnd - e[2]) : null, dep: e[1] != null ? t0 + (tEnd - e[1]) : null, stop: !e[3] }));
    out[0].arr = null; out[out.length - 1].dep = null;
    return out;
  }
  function timeAt(seq, i, dir) {
    const km = j => STN[j][1];
    const e = seq.find(x => x.i === i); if (e && e.stop) return e.arr != null ? e.arr : e.dep;
    const idxs = seq.map(x => x.i); const lo = Math.min(idxs[0], idxs[idxs.length - 1]), hi = Math.max(idxs[0], idxs[idxs.length - 1]);
    if (i < lo || i > hi) return null;
    let a = null, b = null;
    for (const x of seq) { if (!x.stop) continue; const before = dir === 'up' ? km(x.i) >= km(i) : km(x.i) <= km(i); if (before) a = x; else { b = x; break; } }
    if (!a || !b) return null;
    const ta = a.dep != null ? a.dep : a.arr, tb = b.arr != null ? b.arr : b.dep;
    const p = (km(i) - km(a.i)) / (km(b.i) - km(a.i)); return ta + (tb - ta) * p;
  }
  function makeTrip(rec, dir, fromI, toI) {
    const seq = trainSeq(rec, dir);
    const a = seq.findIndex(e => e.i === fromI && e.stop), b = seq.findIndex(e => e.i === toI && e.stop);
    if (a < 0 || b < 0 || b <= a) return null;
    const t0 = seq[a].dep != null ? seq[a].dep : seq[a].arr;
    const M = seq.slice(a, b + 1).map(e => ({ name: STN[e.i][0], i: e.i, s: sOfKm(STN[e.i][1], dir), stop: e.stop, loop: !!STN[e.i][2], arr: e.arr != null ? e.arr - t0 : null, dep: e.dep != null ? e.dep - t0 : null }));
    M[0].arr = null; M[0].dep = 0;
    M[M.length - 1].dep = null;
    return { rec, dir, M, t0, label: `${rec[0]} ${rec[1]}`, seq };
  }
  function fillPlan(M) {
    const stops = M.map((m, k) => m.stop ? k : -1).filter(k => k >= 0);
    M.forEach((m, k) => {
      if (m.stop) { m.pt = m.arr != null ? m.arr : m.dep; return; }
      const a = stops.filter(q => q < k).pop(), b = stops.find(q => q > k);
      if (a === undefined || b === undefined) { m.pt = null; return; }
      const ta = M[a].dep != null ? M[a].dep : M[a].arr, tb = M[b].arr != null ? M[b].arr : M[b].dep;
      m.pt = ta + (tb - ta) * (m.s - M[a].s) / (M[b].s - M[a].s);
    });
    return M;
  }
  function pickLead(catalog, trip) {
    const dir = trip.dir, ours = trip.seq, fromI = trip.M[0].i, toI = trip.M[trip.M.length - 1].i;
    const lo = Math.min(fromI, toI), hi = Math.max(fromI, toI);
    const tOurFrom = timeAt(ours, fromI, dir);
    let best = null, bestGap = 1e9;
    for (const rec of catalog) {
      if (rec === trip.rec) continue;
      const seq = trainSeq(rec, dir);
      const tf = timeAt(seq, fromI, dir); if (tf == null) continue;
      const gap = tOurFrom - tf; if (gap < 60 || gap > 1500) continue;
      let ok = true;
      for (let i = lo; i <= hi; i++) { const a = timeAt(seq, i, dir), b = timeAt(ours, i, dir); if (a == null || b == null) continue; if (a > b + 5) { ok = false; break; } }
      if (ok && gap < bestGap) { best = rec; bestGap = gap; }
    }
    return best;
  }
  function passers(catalog, trip) {
    const dir = trip.dir, out = {};
    trip.M.forEach((m, k) => {
      if (k === 0 || k === trip.M.length - 1 || !m.stop || !m.loop || m.arr == null) return;
      const arr = trip.t0 + m.arr, dep = trip.t0 + (m.dep != null ? m.dep : m.arr);
      for (const rec of catalog) {
        if (rec === trip.rec) continue; const seq = trainSeq(rec, dir); const e = seq.find(x => x.i === m.i);
        if (e && e.stop) continue; const t = timeAt(seq, m.i, dir); if (t == null) continue;
        if (t > arr - 5 && t < dep + 60) (out[k] = out[k] || []).push({ label: rec[0] + ' ' + rec[1], t: t - trip.t0 });
      }
    });
    return out;
  }

  // ---- Tàu -------------------------------------------------------------------
  function newTrain(M, W, opts) {
    return { M, W, k: 0, x: M[0].s, v: 0, f: 0, cmd: 0, pw: 0, bk: 0, notch: 0, a: 0, phase: 'dwell', dwellT: 0, started: false, atc: false, atcCount: 0, atcOk: 0, confirmed: false, needConfirm: false,
      allowed: 0, why: '', results: [], log: [], comfort: 0, jerkTime: 0, earlyDep: 0, excused: 0, holds: {}, forced: -1, cut: false, arrT: 0, free: 0,
      door: opts && opts.lead ? 'closed' : 'open', doorT: 0, doorDur: 0, willReopen: false, doorFaultOnce: false,
      cs: false, csSet: 0, wiper: false, horn: 0, hornAt: -99, hornPen: 0, wiperBad: 0, animalHit: 0,
      isLead: !!(opts && opts.lead), label: (opts && opts.label) || '' };
  }
  const nextTarget = T => { for (let j = T.k + 1; j < T.M.length; j++) if (T.M[j].stop || T.forced === j) return j; return T.M.length - 1; };

  function staticLimit(W, s) {
    let v = 285 / 3.6;
    for (const [k0, k1, kv] of LIMITS_KM) { const a = sOfKm(k0, W.dir), b = sOfKm(k1, W.dir); if (s >= Math.min(a, b) && s < Math.max(a, b)) v = kv / 3.6; }
    return v;
  }
  function staticBoundaries(W) {
    const out = [];
    for (const [k0, k1, kv] of LIMITS_KM) { const a = sOfKm(k0, W.dir), b = sOfKm(k1, W.dir); out.push([Math.min(a, b), kv / 3.6]); }
    return out;
  }
  function allowedSpeed(T) {
    const W = T.W;
    if (T.phase === 'dwell' || T.phase === 'end') { T.why = T.phase === 'end' ? '' : 'ga'; return 0; }
    if (T.cut) { T.why = 'eqk'; return 0; }
    const x = T.x;
    let a = staticLimit(W, x), why = 'line';
    for (const [s0, vz] of staticBoundaries(W)) if (s0 > x && vz < a) { const q = Math.sqrt(vz * vz + 2 * G.aATC * (s0 - x)); if (q < a) a = q; }
    for (const z of W.zones) {
      if (z.hold || W.t < z.tA || W.t > z.tB) continue;
      if (x >= z.s0 && x < z.s1) { if (z.v < a) { a = z.v; why = z.kind; } }
      else if (z.s0 > x && z.v < a) { const q = Math.sqrt(z.v * z.v + 2 * G.aATC * (z.s0 - x)); if (q < a) { a = q; why = z.kind; } }
    }
    T.free = a;
    const j = nextTarget(T), tgt = T.M[j].s;
    const d = tgt + G.stopTol - x, q = d > 0 ? Math.sqrt(2 * G.aATC * d) : 0;
    if (q < a) { a = q; why = 'stop'; }
    const L = W.lead;
    if (!T.isLead && L && L.phase !== 'end' && !(L.phase === 'dwell' && L.atMark)) {
      const gap = L.x - G.trainLen - x - G.atcBuf;
      if (gap < 15000) { const qq = gap > 0 ? Math.sqrt(2 * G.aATC * gap) : 0; if (qq < a) { a = qq; why = 'lead'; } }
    }
    T.why = why; return a;
  }

  // ---- Điều khiển của người lái ---------------------------------------------------
  const handleCmd = T => T.bk > 0 ? (T.bk >= 8 ? EBCMD : -T.bk / 7) : T.pw / 13;
  function cancelCS(T, why) { if (T.cs) { T.cs = false; if (!T.isLead) T.W.say('info', 'Chạy tốc độ không đổi: TẮT' + (why ? ' (' + why + ')' : '')); } }
  function setPower(T, n) { n = clamp(Math.round(n), 0, 13); if (T.bk > 0 && n > 0) { if (!T.isLead) T.W.say('warn', 'Cần phanh chưa về 0: không kéo được (liên động).'); return false; } if (n !== T.pw && T.cs) cancelCS(T, 'thao tác cần gia tốc'); T.pw = n; return true; }
  function setBrake(T, n) { n = clamp(Math.round(n), 0, 8); T.bk = n; if (n > 0) { T.pw = 0; cancelCS(T, 'phanh'); } }
  function coast(T) { T.pw = 0; T.bk = 0; cancelCS(T, 'về N'); }
  function toggleCS(T) {
    if (T.cs) { cancelCS(T); return; }
    if (T.phase !== 'run' || T.v < 70 / 3.6 || T.atc) { T.W.say('warn', 'Chỉ bật tốc độ không đổi khi đang chạy ≥ 70 km/h và ATC không phanh.'); return; }
    T.cs = true; T.csSet = Math.round(T.v * 3.6 / 5) * 5 / 3.6; T.pw = 0; T.bk = 0; T.W.say('info', `Chạy tốc độ không đổi: BẬT ${Math.round(T.csSet * 3.6)} km/h ([ ] đổi ±5 km/h).`);
  }
  function adjustCS(T, d) { if (T.cs) { T.csSet = clamp(T.csSet + d / 3.6, 70 / 3.6, 285 / 3.6); } }
  function toggleWiper(T) { T.wiper = !T.wiper; }
  function honk(T) {
    const W = T.W; if (W.t - T.hornAt < 0.6 && T.started) return; T.hornAt = W.t; T.horn = 1.4;
    for (const z of W.workers || []) if (!z.checked && T.x >= z.s0 - 800 && T.x <= z.s1) z.hornOK = true;
    for (const an of W.animals || []) if (!an.resolved && an.active && T.x >= an.s - 1500 && T.x <= an.s - 100) { an.hornOK = true; if (an.fleeT0 === undefined) an.fleeT0 = W.t; }
  }
  function confirmATC(T) { if (T.atc) T.confirmed = true; }
  function requestClose(T) {
    const W = T.W;
    if (T.phase !== 'dwell' || T.v > 0.05 || T.door !== 'open') return false;
    if (T.k > 0 && T.dwellT < 20) { if (!T.isLead) W.say('warn', 'Chưa thể đóng cửa (cần mở cửa ≥ 20 s)'); return false; }
    T.door = 'closing'; T.doorT = 0; T.doorDur = 9 + (T.k === 0 ? 0 : W.rnd() * 6);
    T.willReopen = T.doorFaultOnce || W.rnd() < W.diff.reopen; T.doorFaultOnce = false;
    if (!T.isLead) W.say('info', 'Trưởng tàu: bắt đầu đóng cửa...');
    return true;
  }
  function doorStep(T, dt) {
    if (T.door !== 'closing') return;
    const W = T.W; T.doorT += dt;
    if (T.doorT >= T.doorDur) {
      if (T.willReopen) { T.door = 'open'; T.willReopen = false; T.dwellT = Math.max(T.dwellT, 20); W.say('warn', 'Trưởng tàu: cửa bị kẹt (hành khách/cửa lỗi), mở lại. Đóng cửa lại (Enter).'); W.faults = (W.faults || []).filter(f => f.kind !== 'door'); }
      else {
        T.door = 'closed'; W.say('info', 'Đèn ĐÓNG CỬA sáng. Được khởi hành: kéo cần gia tốc.');
        if (T.k === 0 && !T.started) { T.started = true; W.running = true; }
      }
    }
  }
  function departNow(T, silent) {
    const W = T.W;
    if (T.phase !== 'dwell' || T.v > 0.05) return false;
    const blk = T.k > 0 ? departBlock(T) : null;
    if (blk) { if (!silent && !T.isLead && W.t - (T.lastBlockMsg || -99) > 6) { W.say('warn', blk); T.lastBlockMsg = W.t; } return false; }
    const mk = T.M[T.k], dep = mk.dep != null ? mk.dep : 0;
    if (T.holds[T.k] != null && T.holds[T.k] > dep) T.excused += T.holds[T.k] - Math.max(dep, T.arrT);
    if (!T.isLead && T.k > 0 && mk.dep != null && W.t < mk.dep - 0.5) { T.earlyDep += mk.dep - W.t; T.log.push(['EARLY', W.t, 'Khởi hành sớm']); W.say('warn', `Khởi hành sớm ${(mk.dep - W.t).toFixed(0)} s`); }
    T.started = true; T.phase = 'run'; return true;
  }
  function departBlock(T) {
    const W = T.W, hold = T.holds[T.k];
    if (hold != null && W.t < hold) return 'Đang giữ tàu theo lệnh điều độ (còn ' + Math.ceil(hold - W.t) + ' s)';
    if (T.cut) return 'Mất điện / kiểm tra sau sự cố';
    return null;
  }

  function step(T, dt, input) {
    if (T.phase === 'end') return;
    const W = T.W, D = W.diff, M = T.M;
    let cmd = input && input.cmd !== undefined ? input.cmd : handleCmd(T);
    T.allowed = allowedSpeed(T);
    // tốc độ không đổi (hoặc bị huỷ)
    if (T.cs) {
      if (T.phase !== 'run' || T.atc || T.cut) cancelCS(T, T.atc ? 'ATC phanh' : '');
      else { const vset = Math.min(T.csSet, Math.max(0, T.allowed - 3 / 3.6)), err = vset - T.v; cmd = clamp(resist(T.v) / tractive(T.v) + 0.6 * err, -0.25, 1); }
    }
    if (T.cut) { cmd = EBCMD; T.atc = false; }
    else {
      if (!T.atc && T.v > T.allowed + (T.isLead ? 0.3 : D.atcOver) && T.v > 0.5) {
        T.atc = true; T.atcOk = 0; T.confirmed = false;
        const grace = W.zones.some(z => z.kind === T.why && W.t - z.tA < 45 && W.t >= z.tA) || (T.why === 'lead' && W.t - (W.leadStopAt || -999) < 60) || T.why === 'eqk' || (T.why === 'stop' && W.t - (T.holdAt || -999) < 60) || W.t - (T.orderAt || -999) < 60;
        if (!grace) T.atcCount++;
        if (!T.isLead) T.log.push(['ATC', W.t, 'ATC phanh tự động (' + T.why + ')' + (grace ? ' — không tính lỗi' : '')]);
      }
      if (T.atc) {
        if (T.v <= T.allowed - 0.8) {
          T.atcOk += dt; const need = T.isLead || D.confirm === 'auto' ? 0 : D.confirm === 'auto5' ? 5 : 1e9;
          if (T.confirmed || T.atcOk >= need) { T.atc = false; T.atcOk = 0; T.confirmed = false; T.needConfirm = false; }
          else T.needConfirm = true;
        } else { T.atcOk = 0; T.needConfirm = false; }
      } else T.needConfirm = false;
      if (T.atc) cmd = Math.min(cmd, -1);
    }
    if (T.phase === 'dwell') {
      doorStep(T, dt);
      if (T.door === 'closed' && cmd > 0.01) { if (!departNow(T)) cmd = 0; }
      if (T.phase === 'dwell') cmd = Math.min(cmd, 0);
    }
    T.notch = T.bk > 0 ? -T.bk : T.pw;
    T.cmd = cmd;
    const rate = T.isLead ? 1 : D.rate, r = rate * dt, rUp = (T.f >= 0 && cmd > T.f ? 0.6 * rate : rate) * dt;
    T.f += Math.max(-r, Math.min(rUp, cmd - T.f));
    const Rv = T.v > 0.01 ? resist(T.v) : 0;
    let a = T.f >= 0 ? (T.f * tractive(T.v) - Rv) / G.m : (T.f * G.aB7) - Rv / G.m;
    if (T.v <= 0 && a < 0) a = 0;
    if (T.phase === 'dwell') { a = 0; T.v = 0; }
    const prevA = T.a;
    T.v = Math.max(0, T.v + a * dt); T.x += T.v * dt; T.a = a;
    if (T.horn > 0) T.horn = Math.max(0, T.horn - dt);
    if (!T.isLead) {
      if (T.v > 0.5 && !T.atc && !T.cut) {
        const jerk = (a - prevA) / dt;
        if (Math.abs(jerk) > 0.7) T.jerkTime += dt;
        T.comfort += Math.max(0, Math.abs(jerk) - 0.7) * dt;
      }
      if (W.rainHere && !T.wiper && T.v > 5) T.wiperBad += dt;
      checkRoadEvents(T);
    }
    if (!T.isLead && T.phase === 'run' && T.why !== 'line' && T.why !== 'stop' && T.free > 1) T.excused += dt * Math.max(0, 1 - T.v / T.free);
    if (T.phase === 'run') {
      const j = nextTarget(T), mk = M[j];
      if (T.v < 0.05 && Math.abs(T.x - mk.s) <= G.stopTol + 5) {
        T.v = 0; T.f = 0; T.k = j; T.arrT = W.t; T.atMark = true; T.door = T.isLead ? 'closed' : 'open'; T.doorT = 0; T.cs = false;
        const e = T.x - mk.s, planned = mk.arr != null ? mk.arr : mk.pt;
        if (!T.isLead) {
          const res = { station: mk.name, err: e, delay: planned != null ? W.t - planned : 0, excused: T.excused, atc: T.atcCount, extra: !mk.stop };
          T.results.push(res);
          W.say('stop', `${mk.name}: lệch ${e >= 0 ? '+' : ''}${e.toFixed(1)} m` + (planned != null ? `, ${res.delay >= 0 ? 'trễ' : 'sớm'} ${Math.abs(res.delay).toFixed(0)} s` : '') + (j < M.length - 1 ? '. Cửa mở.' : ''));
          const pl = W.passers && W.passers[j];
          if (pl && pl.length) W.say('info', `${mk.name}: ${pl.map(p => p.label + ' thông qua ' + fmtT(p.t)).join(', ')} (trên đường thông qua). Ta ở đường tránh.`);
        }
        if (T.forced === j) T.forced = -1;
        if (j === M.length - 1) { T.phase = 'end'; if (!T.isLead) T.finished = true; }
        else { T.phase = 'dwell'; T.dwellT = 0; }
      } else if (T.x > mk.s + G.stopTol + 80) {
        T.phase = 'end';
        if (!T.isLead) { T.finished = true; T.failed = true; T.log.push(['FAIL', W.t, 'Chạy quá ga']); W.say('bad', 'Chạy quá ga ' + mk.name); T.results.push({ station: mk.name, err: T.x - mk.s, delay: NaN, overrun: true }); }
      }
    }
    if (T.phase === 'dwell') T.dwellT += dt; else T.atMark = false;
  }
  // sự kiện theo vị trí: khu nhân viên làm việc (còi), động vật trên đường
  function checkRoadEvents(T) {
    const W = T.W;
    for (const z of W.workers || []) {
      if (z.checked || T.x <= z.s1) continue;
      z.checked = true;
      if (z.hornOK) W.say('info', 'Đã bấm còi báo hiệu khi qua khu có nhân viên làm việc.');
      else { T.hornPen += 4; W.say('bad', 'Quên bấm còi khi qua khu có nhân viên làm việc trên đường.'); }
    }
    for (const an of W.animals || []) {
      if (!an.active || an.resolved || T.x < an.s - 120) continue;
      an.resolved = true;
      if (an.hornOK) W.say('info', 'Con vật chạy khỏi đường ray khi nghe còi. An toàn.');
      else {
        T.animalHit++; W.shakeAt = W.t; W.shakeAmp = 5; T.cut = true; W.eqkActive = true; W.eqkRelease = W.t + 360 + W.rnd() * 240; W.recoverText = 'Kiểm tra xe và đường xong sau va chạm động vật.'; W.recoverV = 120;
        W.say('bad', 'VA CHẠM ĐỘNG VẬT: phanh khẩn cấp. Dừng kiểm tra đầu máy và đường.');
      }
    }
  }
  function plannedTime(T) {
    const M = T.M;
    if (T.phase !== 'run') { const m = M[Math.min(T.k, M.length - 1)]; return m.dep != null ? m.dep : (m.arr != null ? m.arr : T.W.t); }
    const a = T.k; let b = a + 1; while (b < M.length - 1 && M[b].pt == null) b++;
    const ta = M[a].dep != null ? M[a].dep : M[a].pt, tb = M[b].pt;
    const p = Math.max(0, Math.min(1, (T.x - M[a].s) / (M[b].s - M[a].s)));
    return ta + (tb - ta) * p;
  }

  // ---- Tự lái (tàu chạy trước và chế độ xem mẫu) -------------------------------
  function autoDepart(T) {
    if (T.phase !== 'dwell') return;
    const mk = T.M[T.k], dep = mk.dep != null ? mk.dep : 0, W = T.W;
    if (T.isLead) { if (!T.started) { T.started = true; departNow(T, true); } else if (T.dwellT >= 20 && W.t >= dep) departNow(T, true); return; }
    if (T.door === 'open') {
      if (T.k === 0 && !T.started) requestClose(T);
      else if (T.k > 0 && T.dwellT >= 20 && W.t >= Math.max(dep, T.holds[T.k] || 0) - 10) requestClose(T);
    }
  }
  function autoExtras(T) {
    const W = T.W;
    T.wiper = !!W.rainHere;
    const p = (W.pending || []).find(m => !m.done); if (p && W.t - p.t > 6) ackOldest(W);
    if (T.needConfirm || T.atc) confirmATC(T);
    for (const z of W.workers || []) if (!z.checked && T.x >= z.s0 - 600 && T.x <= z.s0 + 200) honk(T);
    for (const an of W.animals || []) if (an.active && !an.resolved && T.x >= an.s - 1200 && T.x <= an.s - 800) honk(T);
  }
  function autopilot(T, margin) {
    const c = autoRaw(T, margin);
    if (c === undefined) { T._ap = 0; return c; }
    const p = T._ap || 0, lim = (c < p ? 0.8 : 0.35) * 0.05;
    T._ap = Math.max(p - lim, Math.min(p + lim, c));
    return T._ap;
  }
  function autoRaw(T, margin) {
    if (T.phase === 'dwell' && T.door === 'closed') return 0.3;
    if (T.phase !== 'run') return undefined;
    const W = T.W, j = nextTarget(T), mk = T.M[j], d = mk.s - T.x, v = T.v;
    const m = (margin === undefined ? (T.isLead ? 4 : (W.diff.atcOver * 3.6 < 1 ? 9 : 4)) : margin) / 3.6;
    let vT = Math.max(0, T.allowed - m);
    const arr = mk.arr != null ? mk.arr : (mk.pt != null && mk.stop ? mk.pt : null), remT = arr != null ? arr - W.t : 0;
    if (arr != null && remT > 20 && T.forced < 0) { const vNeed = (d + 600) / Math.max(remT - 20, 1); vT = Math.min(vT, Math.max(vNeed * 1.06, 15)); }
    const lead = Math.max(d - v * 1.6, 0);
    vT = Math.min(vT, Math.sqrt(2 * 0.55 * lead) + 0.5);
    if (d < 400 && v * v / (2 * Math.max(d - v * 1.2, 0.3)) > 0.35) { const need = (v * v) / (2 * Math.max(d - v * 1.2, 0.3)); return -Math.min(1, Math.max(0.03, need / G.aB7)); }
    if (d < 60) { if (v < 0.25 && d > 0.8) return 0.04; const need = (v * v) / (2 * Math.max(d, 0.15)); return -Math.min(1, Math.max(v < 0.25 ? 0.01 : 0.05, need / G.aB7)); }
    const err = vT - v;
    if (err < -0.15) return -Math.min(0.9, (-err) * 0.6 + 0.05);
    return Math.max(0, Math.min(1, resist(v) / tractive(v) + 0.6 * err));
  }

  // ---- Thế giới: sự kiện, thời tiết, điều độ -----------------------------------
  function createWorld(catalog, trip, opts) {
    opts = opts || {};
    const diff = DIFF[opts.diff || 'normal'], rnd = rng(opts.seed || 1);
    const W = { t: 0, dir: trip.dir, diff, diffKey: opts.diff || 'normal', zones: [], msgs: [], events: [], lead: null, running: false, catalog, trip, weather: opts.weather || 'auto',
      pending: [], faults: [], workers: [], animals: [], ackPen: 0, rainHere: false, rnd: rng((opts.seed || 1) * 7919 + 13),
      say(kind, text, o) { const m = { t: this.t, kind, text }; this.msgs.push(m); if (kind !== 'pa') this.newMsg = true; if (o && o.ack) { m.ack = true; this.pending.push(m); } } };
    const M = fillPlan(trip.M.map(m => Object.assign({}, m)));
    W.player = newTrain(M, W, { label: trip.label });
    W.passers = passers(catalog, { ...trip, M });
    const leadRec = opts.lead === false ? null : pickLead(catalog, trip);
    if (leadRec) {
      const seq = trainSeq(leadRec, trip.dir);
      const LM = fillPlan(seq.map(e => ({ name: STN[e.i][0], i: e.i, s: sOfKm(STN[e.i][1], trip.dir), stop: e.stop, arr: e.arr != null ? e.arr - trip.t0 : null, dep: e.dep != null ? e.dep - trip.t0 : null })));
      LM[0].arr = null; LM[LM.length - 1].dep = null;
      W.leadLabel = leadRec[0] + ' ' + leadRec[1];
      W.lead = newTrain(LM, W, { lead: true, label: W.leadLabel });
      W.leadStartT = LM[0].dep != null ? LM[0].dep : -600;
    }
    genEvents(W, M, rnd);
    W.t = W.lead ? W.leadStartT - 5 : 0;
    prerun(W);
    return W;
  }
  function advanceLead(W, dt) {
    const L = W.lead; if (!L) return;
    if (W.leadHoldUntil && W.t < W.leadHoldUntil) L.cut = true;
    else if (L.cut && !W.eqkActive) L.cut = false;
    autoDepart(L);
    const c = autopilot(L); step(L, dt, c === undefined ? {} : { cmd: c });
  }
  function prerun(W) {
    const dt = 0.1, saved = W.events;
    W.events = [];
    while (W.t < 0) { W.t += dt; advanceLead(W, dt); }
    W.t = 0; W.running = false; W.events = saved;
  }
  function ackOldest(W) {
    const m = (W.pending || []).find(p => !p.done); if (!m) return false;
    m.done = true;
    if (W.t - m.t > 60 && !m.timeout) { W.ackPen += 2; W.say('warn', 'Nhắc lại lệnh chậm (> 60 s): −2 điểm.'); }
    else W.say('stop', 'Đã nhắc lại lệnh với điều độ: "' + m.text.slice(0, 48) + (m.text.length > 48 ? '…' : '') + '"');
    return true;
  }
  function tick(W, dt, input, auto) {
    const T = W.player;
    if (auto) { autoDepart(T); autoExtras(T); }
    if (W.running) {
      W.t += dt; fire(W); advanceLead(W, dt);
      for (const m of W.pending) if (!m.done && !m.timeout && W.t - m.t > 120) { m.timeout = true; W.ackPen += 4; W.say('bad', 'Điều độ: KHÔNG nhận được nhắc lại lệnh! (−4 điểm). Hãy nhấn Y để nhắc lại.'); }
    }
    W.rainHere = W.zones.some(z => z.kind === 'rain' && !z.hold && W.t >= z.tA && W.t <= z.tB && T.x >= z.s0 && T.x < z.s1);
    if (auto) {
      const c = autopilot(T);
      if (c !== undefined) { if (c >= 0) { T.pw = Math.round(c * 13); T.bk = 0; } else { T.pw = 0; T.bk = c < -1.05 ? 8 : Math.max(1, Math.round(-c * 7)); } }
      step(T, dt, c === undefined ? {} : { cmd: c });
    } else step(T, dt, input || {});
    if (W.eqkActive && W.t >= W.eqkRelease) {
      W.eqkActive = false;
      for (const X of [T, W.lead]) if (X) { X.cut = false; if (X === T) W.zones.push({ s0: X.x - 2000, s1: X.x + 12000, v: (W.recoverV || 70) / 3.6, tA: W.t, tB: W.t + 1500, kind: 'eqk', label: 'chạy kiểm tra sau sự cố' }); }
      W.say('info', W.recoverText || 'Điều độ: kiểm tra xong. Được chạy lại, tốc độ ≤ 70 km/h trong 12 km đầu.');
      W.recoverText = null; W.recoverV = null;
    }
  }
  function fire(W) { for (const e of W.events) if (!e.done && W.t >= e.at) { e.done = true; e.fire(W); } }
  const fmtT = s => { s = Math.round(s); const m = Math.floor(s / 60), r = ((s % 60) + 60) % 60; return m + ':' + String(r).padStart(2, '0'); };

  function genEvents(W, M, rnd) {
    const D = W.diff, lastS = M[M.length - 1].s, firstS = M[0].s, span = Math.abs(lastS - firstS), sgn = lastS >= firstS ? 1 : -1;
    const planT = M[M.length - 1].arr || 600;
    const sAt = f => firstS + sgn * span * f;
    const pts = []; M.forEach(m => { if (m.arr != null) pts.push([m.arr, m.s]); if (m.dep != null) pts.push([m.dep, m.s]); if (m.pt != null && !m.stop) pts.push([m.pt, m.s]); }); pts.sort((a, b) => a[0] - b[0]);
    const sAtTime = t => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, s0_] = pts[i - 1], [t1, s1_] = pts[i]; return t1 === t0 ? s1_ : s0_ + (s1_ - s0_) * (t - t0) / (t1 - t0); } return pts[pts.length - 1][1]; };
    const ev = (at, fn) => W.events.push({ at, fire: fn, done: false });
    const stopsIdx = M.map((m, k) => m.stop && k > 0 && k < M.length - 1 ? k : -1).filter(k => k >= 0), usedJ = new Set();
    const pickJ = list => { const c = list.filter(k => !usedJ.has(k)); if (!c.length) return -1; const j = c[Math.floor(rnd() * c.length)]; usedJ.add(j); return j; };
    let weather = W.weather;
    if (weather === 'auto') { const r = rnd(); weather = r < 0.3 ? 'clear' : r < 0.62 ? 'rain' : r < 0.76 ? 'typhoon' : r < 0.88 ? 'snow' : 'eqk'; }
    W.weatherKind = weather;
    const n = D.events[0] + Math.floor(rnd() * (D.events[1] - D.events[0] + 1));
    const pool = [];
    if (weather === 'eqk' || rnd() < D.eqk) pool.push('eqk');
    if (weather === 'snow') {
      const sn = (k0, k1, v, lab) => { const a = sOfKm(k0, W.dir), b = sOfKm(k1, W.dir); W.zones.push({ s0: Math.min(a, b), s1: Math.max(a, b), v: v / 3.6, tA: -1e9, tB: 1e9, kind: 'snow', label: lab }); };
      sn(385, 405, 120, 'tuyết Sekigahara'); sn(405, 462, 170, 'tuyết Maibara–Otsu');
      ev(0, w => w.say('info', 'Dự báo: tuyết dày khu vực Sekigahara–Maibara. Chạy chậm 120/170 km/h (tài liệu 06 §5.3).'));
    }
    if (weather === 'rain') pool.push('rain', 'rain');
    if (weather === 'typhoon') pool.push('rain', 'wind', 'rain');
    const orders = ['hold', 'skip', 'addstop', 'slow', 'workers', 'animal', 'doorfault']; if (W.lead) orders.push('leadstop');
    while (pool.length < n) pool.push(orders[Math.floor(rnd() * orders.length)]);
    if (D.fault && rnd() < D.fault) pool.push('fault');
    for (const kind of pool) {
      const at = Math.round(planT * (0.12 + rnd() * 0.6));
      if (kind === 'rain') {
        const c = sAtTime(at + 350 + rnd() * 400) , hw = 20000 + rnd() * 20000, d50 = 900 + rnd() * 900, stop = rnd() < 0.4, stopDelay = 240 + rnd() * 300, stopDur = 600 + rnd() * 600;
        const ss0 = Math.min(c - hw, c + hw), ss1 = Math.max(c - hw, c + hw);
        ev(at - 240, w => w.say('info', 'Cục Khí tượng: mưa lớn sắp tới đoạn phía trước (dự báo ~50 mm/h). Chuẩn bị chạy chậm, bật gạt mưa (V).'));
        ev(at, w => { w.zones.push({ s0: ss0, s1: ss1, v: 70 / 3.6, tA: w.t, tB: w.t + d50, kind: 'rain', label: 'mưa ≥ 50 mm/h' }); w.say('warn', 'Mưa 50 mm/h: chạy chậm 70 km/h trong vùng mưa (tài liệu 06 §5.3). Nhấn Y để nhắc lại lệnh.', { ack: true }); });
        if (stop) ev(at + stopDelay, w => { w.zones.push({ s0: ss0, s1: ss1, v: 0, tA: w.t, tB: w.t + stopDur, kind: 'rain', hold: true, label: 'mưa ≥ 60 mm/h' }); startHold(w, ss1, stopDur, 'rain'); w.say('bad', `Mưa ≥ 60 mm/h: DỪNG chạy. Về ga gần nhất rồi chờ lệnh (~${fmtT(stopDur)}). Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      } else if (kind === 'wind') {
        const c = sAtTime(at + 300 + rnd() * 400), hw = 25000 + rnd() * 20000, dur = 600 + rnd() * 900, ss0 = Math.min(c - hw, c + hw), ss1 = Math.max(c - hw, c + hw);
        ev(at - 300, w => w.say('info', 'Cảnh báo gió mạnh 25–30 m/s ở đoạn phía trước.'));
        ev(at, w => { w.zones.push({ s0: ss0, s1: ss1, v: 0, tA: w.t, tB: w.t + dur, kind: 'wind', hold: true, label: 'gió ≥ 30 m/s' }); startHold(w, ss1, dur, 'wind'); w.say('bad', `Gió ≥ 30 m/s: DỪNG chạy. Về ga gần nhất, chờ kiểm tra ray (~${fmtT(dur)}). Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      } else if (kind === 'eqk') {
        const at2 = Math.round(planT * (0.2 + rnd() * 0.6)), dur = 480 + rnd() * 600;
        ev(at2, w => { w.eqkAt = w.t; w.eqkActive = true; w.eqkRelease = w.t + dur + 20; w.player.cut = true; if (w.lead) w.lead.cut = true; w.say('bad', 'CẢNH BÁO ĐỘNG ĐẤT: cắt điện, tàu phanh khẩn cấp. Giữ nguyên, chờ kiểm tra ray và dây điện.'); });
      } else if (kind === 'leadstop') {
        const d = 240 + rnd() * 420;
        ev(at, w => { w.leadHoldUntil = w.t + d; w.leadStopAt = w.t; w.say('warn', `Điều độ: tàu phía trước (${w.leadLabel}) dừng khẩn do hành khách bệnh, ~${fmtT(d)}. ATC sẽ giữ khoảng cách.`); });
      } else if (kind === 'hold' && stopsIdx.length) {
        const j = pickJ(stopsIdx); if (j < 0) continue;
        const extra = 60 + Math.floor(rnd() * 5) * 30, tNotice = Math.max(0, (M[j].arr || 0) - 600 - rnd() * 300);
        ev(tNotice, w => { const T = w.player; if (T.k >= j || !M[j].stop) return; const rel = (M[j].dep != null ? M[j].dep : M[j].arr) + extra; T.holds[j] = rel; w.say('warn', `Điều độ: giữ tàu tại ${M[j].name} thêm ${extra} s (chờ tàu nhanh vượt / nối chuyến). Không khởi hành trước ${fmtT(rel)}. Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      } else if (kind === 'skip' && stopsIdx.length > 1) {
        const j = pickJ(stopsIdx.slice(1)); if (j < 0) continue;
        const tNotice = Math.max(0, (M[j].arr || 0) - 700);
        ev(tNotice, w => { const T = w.player; if (T.k >= j - 1 || !M[j].stop) return; M[j].stop = false; T.orderAt = w.t; fillPlan(M); w.say('warn', `Điều độ: THÔNG QUA ga ${M[j].name} (không dừng). Chạy tiếp tới ${M[nextTarget(T)].name}. Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      } else if (kind === 'addstop') {
        const passIdx = M.map((m, k) => !m.stop && k > 0 && k < M.length - 1 ? k : -1).filter(k => k >= 0);
        if (!passIdx.length) continue;
        const j = pickJ(passIdx); if (j < 0) continue;
        const tNotice = Math.max(0, (M[j].pt || 0) - 700);
        ev(tNotice, w => { const T = w.player; if (T.k >= j - 1 || M[j].stop || M[j].pt == null) return; M[j].stop = true; M[j].arr = M[j].pt; M[j].dep = M[j].pt + 60; T.orderAt = w.t; fillPlan(M); w.say('warn', `Điều độ: DỪNG THÊM tại ${M[j].name} (60 s) vì tàu phía sau cần vượt. Phanh đúng vạch. Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      } else if (kind === 'slow') {
        const c = sAtTime(at + 500 + rnd() * 500), len = 15000 + rnd() * 15000, ss0 = Math.min(c, c + sgn * len), ss1 = Math.max(c, c + sgn * len), dur = 900 + rnd() * 900;
        ev(Math.max(0, at - 300), w => { w.zones.push({ s0: ss0, s1: ss1, v: 170 / 3.6, tA: w.t, tB: w.t + dur, kind: 'order', label: 'chạy chậm theo lệnh' }); w.say('warn', 'Điều độ: kiểm tra nền đường/thi công, chạy chậm ≤ 170 km/h trên một đoạn phía trước (xem bản đồ). Nhấn Y để nhắc lại lệnh.', { ack: true }); });
      } else if (kind === 'workers') {
        const gap = 20000 + rnd() * 10000, len = 3000;
        ev(at, w => { const T = w.player, s = T.x + sgn * gap; if ((s - lastS) * sgn > -len) return; const s0 = Math.min(s, s + sgn * len), s1 = Math.max(s, s + sgn * len);
          const z = { s0, s1, checked: false, hornOK: false }; w.workers.push(z); w.zones.push({ s0, s1, v: 230 / 3.6, tA: w.t, tB: w.t + 1500, kind: 'order', label: 'nhân viên làm việc' });
          w.say('warn', 'Điều độ: có nhân viên bảo trì làm việc cạnh đường ở phía trước (3 km). Chạy ≤ 230 km/h và BẤM CÒI (H) khi tới gần. Nhấn Y để nhắc lại lệnh.', { ack: true }); });
      } else if (kind === 'animal') {
        const gap = 18000 + rnd() * 9000;
        ev(at, w => { const T = w.player, s = T.x + sgn * gap; if ((s - lastS) * sgn > -2000) return; const an = { s, active: true, resolved: false, hornOK: false }; w.animals.push(an);
          w.say('warn', 'Báo từ trạm: hươu/lợn rừng xuất hiện gần đường ray phía trước. Bấm còi (H) khi còn khoảng 1 km để xua đuổi, nếu không có thể va chạm.'); });
      } else if (kind === 'doorfault') {
        ev(at, w => { const car = 1 + Math.floor(rnd() * 16); w.faults.push({ car, kind: 'door', text: `Toa ${car}: cửa lỗi (không đóng hoàn toàn)`, level: 'warn', t: w.t }); w.player.doorFaultOnce = true; w.say('warn', `TIMS: toa ${car} báo lỗi cửa. Lần đóng cửa tới có thể phải mở lại.`); });
      } else if (kind === 'fault') {
        ev(at, w => { const car = 1 + Math.floor(rnd() * 16); w.faults.push({ car, kind: 'hotbox', text: `Toa ${car}: nhiệt độ ổ trục cao`, level: 'bad', t: w.t }); w.zones.push({ s0: -1e9, s1: 1e9, v: 230 / 3.6, tA: w.t, tB: 1e9, kind: 'fault', label: 'nhiệt độ ổ trục cao' }); w.say('bad', `CẢNH BÁO TIMS: toa ${car} nhiệt độ bệ ổ trục cao. Hạn chế ≤ 230 km/h tới hết chuyến (tài liệu 06 §5.4). Nhấn Y để nhắc lại lệnh.`, { ack: true }); });
      }
    }
    W.opposing = []; for (let t = 100 + rnd() * 120; t < planT + 900; t += 90 + rnd() * 140) W.opposing.push(Math.round(t));
    W.events.sort((a, b) => a.at - b.at);
  }
  function startHold(W, sEnd, dur, why) {
    const rel = W.t + dur; W.lastHold = { t: W.t, why: why || 'khác', dur, seq: ((W.lastHold && W.lastHold.seq) || 0) + 1 };
    for (const T of [W.player, W.lead]) {
      if (!T || T.phase === 'end' || T.x >= sEnd) continue;
      T.holdAt = W.t;
      let jj = -1;
      const brk = T.v * T.v / (2 * 0.6) + 300;
      for (let j = T.k + (T.phase === 'dwell' ? 0 : 1); j < T.M.length; j++) { if (T.M[j].s - T.x > brk || (T.phase === 'dwell' && j === T.k)) { jj = j; break; } }
      if (jj < 0) jj = T.M.length - 1;
      if (jj === T.k && T.phase === 'dwell') { T.holds[jj] = Math.max(T.holds[jj] || 0, rel); continue; }
      if (!T.M[jj].stop) T.forced = jj;
      T.holds[jj] = Math.max(T.holds[jj] || 0, rel);
    }
  }

  function score(T, W) {
    const D = W.diff, out = []; let tot = 0, n = 0;
    T.results.forEach(r => {
      if (r.overrun) { out.push([r.station, 'CHẠY QUÁ GA', 0, 0]); n++; return; }
      const ae = Math.abs(r.err), k = D.tolK;
      const acc = ae <= 0.5 * k ? 100 : ae <= 1 * k ? 90 : ae <= 2 * k ? 75 : ae <= 5 * k ? 50 : ae <= 15 * k ? 30 : 10;
      const ex = r.excused || 0, late = r.delay - ex;
      const pun = late <= 15 && late >= -30 ? 100 : late > 15 ? Math.max(20, 100 - (late - 15) * 0.5 * D.timeK) : Math.max(60, 100 + (late + 30) * 0.2);
      out.push([r.station + (r.extra ? ' (dừng thêm)' : ''), `lệch ${r.err >= 0 ? '+' : ''}${r.err.toFixed(2)} m · ${r.delay >= 0 ? 'trễ' : 'sớm'} ${Math.abs(r.delay).toFixed(0)} s` + (ex > 5 ? ` (miễn ${ex.toFixed(0)} s do sự kiện)` : ''), acc, Math.round(pun)]);
      tot += acc + pun; n++;
    });
    n = Math.max(1, n);
    const comfort = Math.max(0, 100 - T.comfort * D.comfortK);
    const atcPen = T.atcCount * 8, earlyPen = Math.min(30, T.earlyDep * 0.3);
    const ackPen = Math.min(20, W.ackPen), hornPen = Math.min(20, T.hornPen + T.animalHit * 8), wiperPen = Math.min(10, Math.round(T.wiperBad / 20));
    const final = Math.max(0, Math.round(tot / (2 * n) * 0.7 + comfort * 0.3 - atcPen - earlyPen - ackPen - hornPen - wiperPen));
    return { out, comfort: Math.round(comfort), atcPen, earlyPen: Math.round(earlyPen), ackPen, hornPen, wiperPen, final };
  }

  const api = { G, resist, tractive, notchName, STN, DIFF, WEATHER, NOTCH_MIN, NOTCH_MAX, sOfKm, trainSeq, timeAt, makeTrip, fillPlan, pickLead, passers,
    TUNNELS, STN_JP, createWorld, tick, allowedSpeed, plannedTime, autopilot, autoDepart, nextTarget, score, fmtT, step, rng,
    setPower, setBrake, coast, toggleCS, adjustCS, toggleWiper, honk, confirmATC, requestClose, ackOldest, departBlock };
  if (typeof module !== 'undefined') module.exports = api; else root.Sim = api;
})(typeof window !== 'undefined' ? window : globalThis);
