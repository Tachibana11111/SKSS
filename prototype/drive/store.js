// Lưu trữ hồ sơ người chơi (localStorage; bọc try/catch vì có thể bị chặn), thành tích, kết quả tốt nhất, lịch sử và bản ghi lại chuyến.
(function (root) {
  const KEY = 'shinkansen-drive-v1';
  const ACH = [
    { id: 'first', name: 'Chuyến đầu tiên', desc: 'Hoàn thành một chuyến', test: (c) => c.kind === 'drive' && c.finished },
    { id: 'perfect3', name: 'Dừng như bàn tay', desc: '3 lần dừng trong ±0,5 m trong một chuyến', test: (c) => c.kind === 'drive' && c.perfectStops >= 3 },
    { id: 'noatc', name: 'Không cần ATC', desc: 'Hoàn thành chuyến ≥ 3 ga mà ATC không phanh thay lần nào', test: (c) => c.kind === 'drive' && c.finished && c.stops >= 3 && c.atc === 0 },
    { id: 'storm', name: 'Qua bão', desc: 'Đạt ≥ 70 điểm khi thời tiết là mưa hoặc bão', test: (c) => c.kind === 'drive' && ['rain', 'typhoon'].includes(c.weather) && c.score >= 70 },
    { id: 'quickack', name: 'Nghe điều độ', desc: 'Nhắc lại ≥ 3 lệnh điều độ mà không bị trừ điểm', test: (c) => c.kind === 'drive' && c.ackCount >= 3 && c.ackPen === 0 },
    { id: 'pa', name: 'Trấn an hành khách', desc: 'Phát thanh trấn an ít nhất một lần khi gặp sự cố', test: (c) => c.kind === 'drive' && c.paCount >= 1 },
    { id: 'fire', name: 'Bình tĩnh khi cháy', desc: 'Hoàn thành chuyến có báo cháy mà không dừng trong hầm', test: (c) => c.kind === 'drive' && c.hadFire && !c.fireTunnel && c.finished },
    { id: 'hard', name: 'Chuyên nghiệp', desc: 'Đạt ≥ 75 điểm ở độ khó Khó hoặc Chuyên gia', test: (c) => c.kind === 'drive' && ['hard', 'expert'].includes(c.diff) && c.score >= 75 },
    { id: 'tohoku', name: 'Lên phương bắc', desc: 'Hoàn thành một chuyến Tohoku', test: (c) => c.kind === 'drive' && c.line === 'toh' && c.finished },
    { id: 'disp80', name: 'Điều độ viên giỏi', desc: 'Đạt ≥ 80 điểm ở chế độ điều độ', test: (c) => c.kind === 'dispatch' && c.score >= 80 },
    { id: 'tutorial', name: 'Học xong', desc: 'Hoàn thành mọi bài hướng dẫn', test: (c) => c.kind === 'tutorial' && c.allDone }
  ];
  function empty() { return { v: 1, settings: { vol: 60, snd: true, ann: 'ja', pax: true, diff: 'normal' }, history: [], best: {}, ach: {}, replays: {}, tutorial: {}, lastSetup: null }; }
  function load() { try { const s = root.localStorage && root.localStorage.getItem(KEY); if (s) { const d = JSON.parse(s); if (d && d.v === 1) return Object.assign(empty(), d); } } catch (e) { } return empty(); }
  let mem = load();
  function save() { try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify(mem)); return true; } catch (e) { return false; } }
  function get() { return mem; }
  function reset() { mem = empty(); save(); }
  function scenarioKey(o) { return [o.kind, o.line, o.dir, o.train, o.from, o.to, o.diff, o.weather, o.seed].join('|'); }
  // ghi kết quả một lần chơi; trả về danh sách thành tích mới mở khoá
  function record(ctx, replay) {
    const entry = { t: Date.now(), kind: ctx.kind, line: ctx.line, train: ctx.trainLabel, diff: ctx.diff, weather: ctx.weather, seed: ctx.seed, score: ctx.score, finished: !!ctx.finished };
    mem.history.unshift(entry); mem.history = mem.history.slice(0, 60);
    const k = scenarioKey(ctx.scenario || {}); if (!mem.best[k] || ctx.score > mem.best[k].score) { mem.best[k] = { score: ctx.score, t: entry.t, label: ctx.trainLabel + ' · ' + (ctx.diff || '') }; if (replay) mem.replays[k] = replay; }
    const keys = Object.keys(mem.replays); if (keys.length > 12) for (const kk of keys.slice(0, keys.length - 12)) delete mem.replays[kk];
    const fresh = []; for (const a of ACH) if (!mem.ach[a.id] && a.test(ctx)) { mem.ach[a.id] = entry.t; fresh.push(a); }
    save(); return { fresh, best: mem.best[k] };
  }
  function setting(k, v) { if (v === undefined) return mem.settings[k]; mem.settings[k] = v; save(); return v; }
  root.Store = { get, save, reset, record, setting, ACH, scenarioKey };
})(typeof window !== 'undefined' ? window : globalThis);
