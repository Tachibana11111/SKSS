// Hướng dẫn từng bước: 3 bài lái (cơ bản + dừng ga, thiết bị, sự cố) chạy trên mô phỏng thật với sự kiện được "tiêm" đúng lúc.
(function (root) {
  const pickTrain = (a, b) => {                                  // chuyến Nozomi chiều xuống có dừng ở cả hai ga
    const L = root.Sim.lineOf('tsk');
    return L.trains.find(t => t.d === 'down' && t.t === 'Nozomi' && t.s.some(e => e[0] === a && !e[3]) && t.s.some(e => e[0] === b && !e[3])) ||
           L.trains.find(t => t.d === 'down' && t.s.some(e => e[0] === a && !e[3]) && t.s.some(e => e[0] === b && !e[3]));
  };
  const dist = (W, T) => { const j = root.Sim.nextTarget(T); return T.M[j].s - T.x; };
  const LESSONS = [
    { id: 'basic', title: _t('Bài 1 · Khởi hành, lái, dừng đúng vạch'), line: 'tsk', from: 15, to: 16, diff: 'easy', weather: 'clear', seed: 11, radio: false,
      steps: [
        { text: _t('Nhấn ENTER để trưởng tàu đóng cửa (mất khoảng 10 giây).'), hint: _t('Enter / nút "Đóng cửa"'), check: (W, T) => T.door !== 'open' },
        { text: _t('Khi đèn ĐÓNG CỬA sáng, nhấn W để kéo cần gia tốc. Tàu sẽ khởi hành.'), hint: 'W', check: (W, T) => T.phase === 'run' },
        { text: _t('Nhấn W thêm cho tới nấc P10 trở lên. Vòng xanh trên đồng hồ là tốc độ ATC cho phép: đừng vượt.'), hint: 'W', check: (W, T) => T.pw >= 10 },
        { text: _t('Chờ tốc độ vượt 120 km/h (tàu nặng ~700 tấn nên tăng tốc khá chậm).'), hint: _t('đồng hồ'), check: (W, T) => T.v * 3.6 >= 120 },
        { text: _t('Nhấn SPACE để về N: tàu chạy đà (không kéo, không phanh).'), hint: 'Space', check: (W, T) => T.pw === 0 && T.bk === 0 },
        { text: _t('Phanh nhẹ: nhấn ↓ hai lần (B2), rồi nhấn ↑ hai lần để nhả. Phải nhả phanh về 0 thì mới kéo được lại.'), hint: '↓ ↑', init: st => { st.hit = false; }, check: (W, T, st) => { if (T.bk >= 2) st.hit = true; return st.hit && T.bk === 0; } },
        { text: _t('Kéo lại cho tốc độ gần 200 km/h (W), rồi nhấn C để bật chạy tốc độ không đổi (tàu tự giữ tốc độ).'), hint: 'W, C', check: (W, T) => T.cs },
        { text: _t('Tắt chế độ đó bằng cách đạp phanh nhẹ: nhấn ↓ (B1), rồi nhả ↑.'), hint: '↓ ↑', init: st => { st.hit = false; }, check: (W, T, st) => { if (T.bk >= 1) st.hit = true; return !T.cs && st.hit && T.bk === 0; } },
        { text: _t('Sắp tới Shin-Osaka. Nhìn dòng "Gợi ý" và thanh khoảng cách: về N (Space) rồi bắt đầu phanh dần bằng ↓ (B3–B5) khi tới điểm gợi ý.'), hint: '↓', check: (W, T) => T.phase === 'run' && dist(W, T) < 1500 },
        { text: _t('Dừng đúng vạch xanh, mục tiêu ±2 m. Ở cuối chỉ dùng nấc thấp (B1–B2). Nếu lệch nhiều, nhấn R để thử lại.'), hint: '↓ ↑', check: (W, T) => T.results.length >= 1 && Math.abs(T.results[T.results.length - 1].err) <= 5, note: (W, T) => T.results.length ? (Math.abs(T.results[T.results.length - 1].err) <= 2 ? _t('Rất tốt!') : _t('Hơi lệch, nhấn R để thử lại cho ±2 m.')) : '' }
      ] },
    { id: 'gear', title: _t('Bài 2 · Thiết bị: mưa, nhắc lệnh, cảnh báo đường'), line: 'tsk', from: 12, to: 16, diff: 'normal', weather: 'clear', seed: 12,
      steps: [
        { text: _t('Đóng cửa (Enter) rồi khởi hành (W). Chạy tới khoảng 200 km/h.'), hint: 'Enter, W', check: (W, T) => T.v * 3.6 >= 200 },
        { text: _t('Điều độ báo MƯA. Khi nghe tin, nhấn Y để nhắc lại lệnh (nếu không sẽ bị trừ điểm).'), hint: 'Y', onEnter: (W, T) => root.Sim.inject(W, 'rain', { ahead: 9000 }), check: (W, T) => (W.ackCount || 0) >= 1 },
        { text: _t('Bật gạt mưa (V) trước khi vào vùng mưa.'), hint: 'V', check: (W, T) => T.wiper },
        { text: _t('Vào vùng mưa: ATC giảm xuống 70 km/h, hãy giảm tốc kịp (phanh, rồi N). Chạy qua vùng mưa.'), hint: '↓ Space', init: st => { st.in = false; }, check: (W, T, st) => { if (W.rainHere) st.in = true; return st.in && !W.rainHere; } },
        { text: _t('Ra khỏi vùng mưa: tắt gạt mưa (V), kéo lại tốc độ.'), hint: 'V', check: (W, T) => !T.wiper && !W.rainHere },
        { text: _t('Điều độ báo NHÂN VIÊN LÀM VIỆC cạnh đường: giữ tốc độ ≤ 230 km/h khi qua khu đó (xem thanh cam trên bản đồ). Tàu tự bấm còi báo hiệu.'), hint: '', onEnter: (W, T) => root.Sim.inject(W, 'workers', { ahead: 6000 }), check: (W, T) => W.workers.length && W.workers[0].checked && W.workers[0].hornOK, fail: (W, T) => W.workers.length && W.workers[0].checked && !W.workers[0].hornOK },
        { text: _t('Báo HƯƠU trên đường ray: tàu tự bấm còi khi còn khoảng 1 km để xua hươu; bạn chỉ cần theo dõi và giữ tốc độ an toàn.'), hint: '', onEnter: (W, T) => root.Sim.inject(W, 'animal', { ahead: 5000 }), check: (W, T) => W.animals.length && W.animals[0].resolved && W.animals[0].hornOK, fail: (W, T) => W.animals.length && W.animals[0].resolved && !W.animals[0].hornOK },
        { text: _t('Điều độ GIỮ tàu thêm ở ga tới. Nhấn Y xác nhận, dừng đúng vạch và chờ tới khi được thả.'), hint: 'Y', onEnter: (W, T) => root.Sim.inject(W, 'hold', { sec: 90 }), check: (W, T) => (W.ackCount || 0) >= 2 },
        { text: _t('Chạy tiếp, dừng ở các ga, hoàn thành chuyến.'), hint: '', check: (W, T) => T.finished }
      ] },
    { id: 'crisis', title: _t('Bài 3 · Sự cố: động đất, quyết định, cháy'), line: 'tsk', from: 12, to: 16, diff: 'normal', weather: 'clear', seed: 13,
      steps: [
        { text: _t('Đóng cửa (Enter), khởi hành (W), chạy tới khoảng 200 km/h.'), hint: 'Enter, W', check: (W, T) => T.v * 3.6 >= 200 },
        { text: _t('Điều độ đề nghị CHO TÀU NHANH VƯỢT: Y (chấp nhận, giữ tàu thêm) hay N (từ chối). Tự chọn.'), hint: 'Y / N', onEnter: (W, T) => root.Sim.inject(W, 'overtake'), check: (W, T) => !W.decision && (W.decisions || 0) >= 1 },
        { text: _t('ĐỘNG ĐẤT! Điện bị cắt, tàu tự phanh khẩn cấp. Nhấn M để phát thanh trấn an hành khách.'), hint: 'M', onEnter: (W, T) => root.Sim.inject(W, 'eqk', { sec: 240 }), check: (W, T) => (W.paCount || 0) >= 1 },
        { text: _t('Chờ kiểm tra xong (nhấn 3 để tua ×16). Sau đó tàu được chạy lại với tốc độ ≤ 70 km/h trong 12 km.'), hint: '3', check: (W, T) => !W.eqkActive && !T.cut },
        { text: _t('Báo CHÁY ở toa 6: ngoài hầm thì dừng ở ga gần nhất (không phanh gấp giữa đường). Nhấn Y báo điều độ, rồi tiếp tục.'), hint: 'Y', onEnter: (W, T) => root.Sim.inject(W, 'fire'), check: (W, T) => (W.ackCount || 0) >= 1 },
        { text: _t('Dừng ở ga, chờ khi điều độ thả tàu, rồi hoàn thành chuyến.'), hint: '', check: (W, T) => T.finished }
      ] },
    { id: 'power', title: _t('Bài 4 · Cần vẹt, ATC cắt/bật, tàu đứng phía trước'), line: 'tsk', from: 12, to: 16, diff: 'normal', weather: 'clear', seed: 14, lead: true,
      steps: [
        { text: _t('Đóng cửa (Enter), khởi hành (W), chạy tới khoảng 150 km/h.'), hint: 'Enter, W', check: (W, T) => T.v * 3.6 >= 150 },
        { text: _t('Hạ CẦN VẸT (G) như khi qua đoạn cách điện (dead section): mất điện lưới nên không kéo và không hoàn năng được, tàu chỉ chạy đà.'), hint: 'G', check: (W, T) => T.pan === false },
        { text: _t('Nâng cần vẹt lên lại (G) để có điện, rồi kéo lại tốc độ.'), hint: 'G', check: (W, T) => T.pan !== false },
        { text: _t('ATC là lớp an toàn tự phanh. Nhấn A để CẮT ATC (chỉ khi ATC hỏng; tàu không còn ai phanh thay bạn), rồi nhấn A để BẬT lại.'), hint: 'A', init: st => { st.off = false; }, check: (W, T, st) => { if (T.atcOn === false) st.off = true; return st.off && T.atcOn !== false; } },
        { text: _t('Phía trước có tàu ĐỨNG trên đường chính. Điện đàm sẽ báo khoảng cách. Giảm tốc và dừng lại phía sau nó, cách ít nhất vài trăm mét. Va chạm là kết thúc chuyến (điểm 0).'), hint: '↓', onEnter: (W, T) => { if (W.lead) { W.lead.x = T.x + 3500; W.lead.v = 0; W.leadHoldUntil = 1e9; W.lead.cut = true; } }, check: (W, T) => !W.lead || (T.v < 0.5 && W.lead.x - W.lead.veh.len - T.x > 50), fail: (W, T) => T.collision },
      ] },
  ];
  const S = { lesson: -1, step: 0, st: {}, enteredAt: 0, passedAt: -1, done: {}, banner: '' };
  function cfg(i) {
    const L = LESSONS[i], rec = pickTrain(L.from, L.to); if (!rec) return null;
    S.lesson = i; S.step = 0; S.st = {}; S.passedAt = -1; S.banner = '';
    return { radio: L.radio !== false, lineId: L.line, rec, from: L.from, to: L.to, diff: L.diff, weather: L.weather, seed: L.seed, events: false, lead: !!L.lead, title: L.title };
  }
  function active() { return S.lesson >= 0 && S.lesson < LESSONS.length; }
  function enter(W, T) { const st = LESSONS[S.lesson].steps[S.step]; S.st = {}; if (st.init) st.init(S.st); if (st.onEnter) st.onEnter(W, T); S.enteredAt = W.t; S.entered = true; }
  function update(W, T, now) {
    if (!active()) return;
    const L = LESSONS[S.lesson]; if (S.step >= L.steps.length) return;
    if (!S.entered) enter(W, T);
    const st = L.steps[S.step];
    if (S.passedAt >= 0) { if (now - S.passedAt > 900) { S.passedAt = -1; S.step++; S.entered = false; if (S.step >= L.steps.length) { S.done[L.id] = true; S.banner = _t('Hoàn thành ') + L.title + '!'; const all = LESSONS.every(l => S.done[l.id]); if (root.Store) root.Store.get().tutorial = Object.assign(root.Store.get().tutorial || {}, S.done), root.Store.save(); S.allDone = all; } } return; }
    if (st.fail && st.fail(W, T, S.st)) { S.banner = _t('Chưa đúng: K bỏ qua, R làm lại bài'); }
    if (st.check(W, T, S.st)) { S.passedAt = now; S.banner = ''; }
  }
  function skip(W, T) { if (!active()) return; const L = LESSONS[S.lesson]; if (S.step < L.steps.length) { S.step++; S.entered = false; S.passedAt = -1; S.banner = ''; if (S.step >= L.steps.length) S.done[L.id] = true; } }
  function draw(ctx, px, py, pw, W, T) {
    if (!active()) return; const L = LESSONS[S.lesson], n = L.steps.length, done = S.step >= n;
    const h = 112; ctx.save(); ctx.fillStyle = 'rgba(14,22,34,.9)'; ctx.strokeStyle = '#ffc247'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(px, py, pw, h, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc247'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'left'; ctx.fillText(L.title, px + 14, py + 22); ctx.textAlign = 'right'; ctx.fillText(done ? _t('XONG') : _t('bước ') + (S.step + 1) + '/' + n, px + pw - 12, py + 22); ctx.textAlign = 'left';
    ctx.fillStyle = '#e8eef5'; ctx.font = '14px system-ui';
    const text = done ? (S.banner || _t('Bài đã xong. Bấm P rồi chọn Về menu chính → Học lái để chọn bài khác, hoặc nhấn R để làm lại.')) : L.steps[S.step].text;
    const words = text.split(' '); let line = '', y = py + 46; for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > pw - 28 && line) { ctx.fillText(line, px + 14, y); y += 19; line = w; } else line = t; } ctx.fillText(line, px + 14, y);
    const nt = !done && L.steps[S.step].note && L.steps[S.step].note(W, T); if (nt) { ctx.fillStyle = '#4cd68a'; ctx.textAlign = 'right'; ctx.fillText(nt, px + pw - 12, py + h - 30); ctx.textAlign = 'left'; }
    if (!done && L.steps[S.step].hint) { ctx.fillStyle = '#7a8ea5'; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText(_t('Phím: ') + L.steps[S.step].hint + _t(' · K = bỏ qua bước'), px + 14, py + h - 10); }
    if (S.passedAt >= 0) { ctx.fillStyle = '#4cd68a'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'right'; ctx.fillText(_t('✔ Đúng rồi!'), px + pw - 12, py + h - 12); } else if (S.banner && !done) { ctx.fillStyle = '#ff9a7a'; ctx.font = '12px system-ui'; ctx.textAlign = 'right'; ctx.fillText(S.banner, px + pw - 12, py + h - 12); }
    ctx.restore();
  }
  root.Tutorial = { LESSONS, S, cfg, update, draw, skip, active };
})(typeof window !== 'undefined' ? window : globalThis);
