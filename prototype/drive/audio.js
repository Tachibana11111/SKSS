// Âm thanh v2: tổng hợp bằng WebAudio + phát thanh bằng giọng nói của trình duyệt (SpeechSynthesis). Không dùng file âm thanh.
// Mọi âm đều là mô phỏng gần đúng [I], không phải ghi âm tàu thật (còi: không có bản ghi miễn phí đã kiểm chứng, xem docs/10). Lời phát thanh là mẫu tự soạn [I].
(function (root) {
  const JPN = ['東京', '品川', '新横浜', '小田原', '熱海', '三島', '新富士', '静岡', '掛川', '浜松', '豊橋', '三河安城', '名古屋', '岐阜羽島', '米原', '京都', '新大阪'];
  const VI = { Tokyo: 'Tokyo', Shinagawa: 'Shinagawa' };
  const TYPEJ = { Nozomi: 'のぞみ', Hikari: 'ひかり', Kodama: 'こだま', Mizuho: 'みずほ', Sakura: 'さくら', Tsubame: 'つばめ', Kamome: 'かもめ', Hayabusa: 'はやぶさ', Hayate: 'はやて', Yamabiko: 'やまびこ', Nasuno: 'なすの', Komachi: 'こまち', Tsubasa: 'つばさ', Toki: 'とき', Tanigawa: 'たにがわ', Asama: 'あさま', Hakutaka: 'はくたか', Kagayaki: 'かがやき', Tsurugi: 'つるぎ', 'Doctor Yellow': 'ドクターイエロー', 'East i': 'イーストアイ' };
  function GameAudio() {
    this.ctx = null; this.cabin = false; this.enabled = true; this.vol = 0.6; this.ready = false; this.annMode = 'ja';
    this.prev = {}; this.msgCount = 0; this.lastConfirmBeep = 0; this.lastResults = 0; this.q = []; this.ann = {}; this.next = {};
  }
  GameAudio.prototype.unlock = function () {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.enabled ? this.vol : 0; this.master.connect(c.destination);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noiseBuf = buf;
    const noise = () => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 1.5); return s; };
    const flt = (type, freq, q) => { const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q; return f; };
    const mk = (n, filter, gain0) => { const g = c.createGain(); g.gain.value = gain0 || 0; n.connect(filter); filter.connect(g); g.connect(this.master); return { g, f: filter }; };
    this.rumble = mk(noise(), flt('lowpass', 200), 0);
    this.wind = mk(noise(), flt('bandpass', 1200, 0.7), 0);
    this.rain = mk(noise(), flt('highpass', 3500), 0);
    this.howl = mk(noise(), flt('bandpass', 550, 4), 0);
    this.squeal = mk(noise(), flt('bandpass', 3200, 12), 0);
    this.hiss = mk(noise(), flt('highpass', 4500), 0);
    this.quake = mk(noise(), flt('lowpass', 70), 0);
    // motor kéo
    this.motorO = c.createOscillator(); this.motorO.type = 'sawtooth'; this.motorO.frequency.value = 120;
    this.motorO2 = c.createOscillator(); this.motorO2.type = 'square'; this.motorO2.frequency.value = 240;
    const mf = flt('lowpass', 1800, 1), mg = c.createGain(); mg.gain.value = 0;
    this.motorO.connect(mf); this.motorO2.connect(mf); mf.connect(mg); mg.connect(this.master); this.motor = { g: mg, f: mf };
    this.motorO.start(); this.motorO2.start();
    // quạt gió/điều hoà: tiếng ù thấp liên tục
    // tiếng ù cabin máy bay thương mại (bật bằng phím J): chỉ nhiễu trầm đã lọc mạnh (một đường tiếng liên tục, không có âm ù trầm riêng); khi bật thì tiếng chạy/gió thô giảm bớt [I]
    this.cab = mk(noise(), flt('lowpass', 380, 0.6), 0);
    this.hvacO = c.createOscillator(); this.hvacO.type = 'sine'; this.hvacO.frequency.value = 118; const hg = c.createGain(); hg.gain.value = 0; this.hvacO.connect(hg); hg.connect(this.master); this.hvac = { g: hg }; this.hvacO.start();
    // bản ghi thật: Odawara (Internet Archive, public domain): nền ga 10–118 s; tàu qua/rời ga ở các đoạn CLIPS
    try { const mk2 = () => { const e = new Audio('assets/audio/odawara_leaving.mp3'); e.preload = 'metadata'; e.volume = 0; return e; }; this.amb = mk2(); this.clipEl = mk2(); this.ambOn = false; this.clipT = 0; } catch (e) { this.amb = null; }
    this.ready = true;
    this.rt = { comp: 20 + Math.random() * 30, oppose: 90 + Math.random() * 120, thunder: 40 + Math.random() * 50, last: performance.now() };
  };
  // tua tới t giây nếu phần đó đã sẵn sàng (máy chủ không hỗ trợ Range thì phải chờ tải xong)
  function seekTo(e, t) { try { if (e.seekable && e.seekable.length && e.seekable.end(e.seekable.length - 1) >= t) { e.currentTime = t; return true; } } catch (x) { } return false; }
  const CLIPS = [[118.6, 127.8], [176.6, 186.0], [266.6, 275.8], [326.6, 337.4]];
  GameAudio.prototype.playClip = function (gain, i, maxDur) {
    const e = this.clipEl; if (!e || !this.enabled) return; const c = CLIPS[(i != null ? i : Math.floor(Math.random() * CLIPS.length)) % CLIPS.length];
    try { if (!seekTo(e, c[0])) return; e.volume = Math.max(0, Math.min(1, this.vol * (gain || 0.9))); const p = e.play(); if (p && p.catch) p.catch(() => {}); clearTimeout(this.clipT); this.clipT = setTimeout(() => { try { e.pause(); } catch (x) { } }, Math.min(c[1] - c[0], maxDur || 99) * 1000); } catch (x) { }
  };
  // nền ga: lặp đoạn 10–118 s khi tàu đang đỗ ở ga
  GameAudio.prototype.ambience = function (level) {
    const e = this.amb; if (!e) return; const target = this.enabled ? Math.max(0, Math.min(1, this.vol * level)) : 0;
    try {
      if (target > 0.005) { if (!this.ambOn) { if (seekTo(e, 10 + Math.random() * 60)) { const p = e.play(); if (p && p.catch) p.catch(() => {}); this.ambOn = true; } } else if (e.currentTime > 117.5 || e.currentTime < 9.5) seekTo(e, 10); }
      else if (this.ambOn && e.volume < 0.01) { e.pause(); this.ambOn = false; }
      e.volume = e.volume + (target - e.volume) * 0.08;
    } catch (x) { }
  };
  GameAudio.prototype.silence = function () { try { if (this.amb) { this.amb.volume = 0; this.amb.pause(); } if (this.clipEl) this.clipEl.pause(); this.ambOn = false; } catch (x) { } };
  GameAudio.prototype.setVolume = function (v, on) { this.vol = v; this.enabled = on; if (this.master) this.master.gain.setTargetAtTime(on ? v : 0, this.ctx.currentTime, 0.05); if (!on && root.speechSynthesis) root.speechSynthesis.cancel(); };
  GameAudio.prototype.setAnn = function (m) { this.annMode = m; if (m === 'off' || m === 'sub') { this.q = []; if (root.speechSynthesis) root.speechSynthesis.cancel(); } };
  GameAudio.prototype.tone = function (freq, dur, type, gain, delay, freq2) {
    if (!this.ready) return; const c = this.ctx, t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t); if (freq2) o.frequency.linearRampToValueAtTime(freq2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain || 0.2, t + 0.012); g.gain.setValueAtTime(gain || 0.2, t + Math.max(0.013, dur - 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  };
  GameAudio.prototype.burst = function (dur, gain, freq, q, type, delay, sweepTo) {
    if (!this.ready) return; const c = this.ctx, t = c.currentTime + (delay || 0);
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq || 800, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur); f.Q.value = q || 1; const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  };
  // ---- âm thanh cơ khí và sự kiện ----
  // qua ghi / ghi chữ X: chuỗi cú "cạch-cạch" ở khe ray, dồn dập hơn khi nhanh
  GameAudio.prototype.switchClatter = function (v) {
    const sp = Math.min(1, v / 80), gap = 0.085 - 0.04 * sp, n = 6;
    this.tone(62, 0.22, 'sine', 0.2 + 0.2 * sp); this.burst(0.07, 0.12 + 0.16 * sp, 220, 1.2, 'lowpass');
    for (let i = 0; i < n; i++) { const dl = 0.05 + i * gap; this.burst(0.045, 0.16 + 0.22 * sp, 330 + 140 * (i % 2), 2.4, 'bandpass', dl); this.tone(88 + 26 * (i % 2), 0.06, 'square', 0.05 + 0.09 * sp, dl); }
  };
  GameAudio.prototype.click = function (gain) { this.burst(0.03, gain || 0.18, 2800, 1.5, 'bandpass'); this.tone(180, 0.05, 'square', (gain || 0.18) * 0.4); };
  GameAudio.prototype.contactor = function () { this.click(0.22); this.burst(0.05, 0.2, 1800, 1, 'bandpass', 0.09); this.tone(120, 0.08, 'square', 0.1, 0.09); };
  GameAudio.prototype.airRelease = function (g) { this.burst(0.6, g || 0.18, 5200, 0.8, 'highpass'); };
  GameAudio.prototype.brakeApply = function () { this.burst(0.18, 0.12, 4200, 0.8, 'highpass'); this.tone(90, 0.12, 'sine', 0.1); };
  GameAudio.prototype.compressor = function () { for (let i = 0; i < 20; i++) this.burst(0.09, 0.1, 160, 1, 'lowpass', i * 0.2); };
  GameAudio.prototype.insulator = function () { this.tone(75, 0.3, 'sine', 0.22); this.burst(0.22, 0.2, 400, 1, 'lowpass'); };
  GameAudio.prototype.tunnelBoom = function () { this.tone(55, 0.6, 'sine', 0.35, 0, 38); this.burst(0.7, 0.25, 300, 1, 'lowpass'); this.burst(0.5, 0.12, 2500, 1, 'bandpass', 0, 600); };
  GameAudio.prototype.tunnelExit = function () { this.burst(0.35, 0.18, 1800, 1, 'bandpass', 0, 5000); this.tone(70, 0.3, 'sine', 0.12); };
  GameAudio.prototype.oppose = function (sp) { const g = 0.15 + 0.3 * sp; this.burst(0.9, g, 500, 0.8, 'bandpass', 0, 3200); this.burst(0.9, g, 3200, 0.8, 'bandpass', 0.55, 400); this.tone(50, 0.3, 'sine', 0.3 * sp, 0.45, 35); };
  GameAudio.prototype.thunder = function () { this.lastThunder = performance.now(); this.burst(2.4, 0.5, 130, 0.7, 'lowpass'); this.burst(1.2, 0.35, 90, 0.7, 'lowpass', 0.8); };
  // còi hơi (空気笛) của Shinkansen, tổng hợp [I]: hai cao độ hơi lệch nhau (hai còi cùng kêu) có thành phần hơi gió, vào nhanh, ngắt gọn; KHÔNG dùng còi điện/nhạc của tàu thường. Cao độ là ước lượng, chưa có số liệu kiểm chứng [?]
  GameAudio.prototype.horn = function () {
    if (!this.ready) return; const c = this.ctx, t = c.currentTime, dur = 1.1, g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.linearRampToValueAtTime(2400, t + 0.08); lp.frequency.linearRampToValueAtTime(1500, t + dur); lp.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3, t + 0.05); g.gain.setValueAtTime(0.3, t + dur - 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const f of [392, 415, 784, 830, 1176]) { const o = c.createOscillator(), og = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.06); og.gain.value = f < 500 ? 0.5 : 0.18; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.05); }
    lp.connect(g); g.connect(this.master); this.burst(dur, 0.1, 1800, 0.7, 'bandpass');
  };
  GameAudio.prototype.doorChime = function () { this.tone(880, 0.28, 'sine', 0.18); this.tone(659, 0.4, 'sine', 0.18, 0.3); this.tone(880, 0.28, 'sine', 0.18, 0.9); this.tone(659, 0.4, 'sine', 0.18, 1.2); this.airRelease(0.1); };
  GameAudio.prototype.doorClosed = function () { this.burst(0.12, 0.35, 300, 2, 'lowpass'); this.tone(150, 0.12, 'sine', 0.2); this.airRelease(0.14); };
  GameAudio.prototype.doorOpen = function () { this.airRelease(0.16); this.burst(0.15, 0.3, 260, 2, 'lowpass', 0.5); this.tone(95, 1.6, 'sine', 0.05, 0.6); };
  GameAudio.prototype.platformBell = function () { for (let i = 0; i < 10; i++) this.tone(1900, 0.09, 'square', 0.05, i * 0.16); };
  GameAudio.prototype.buzzer = function () { this.tone(160, 0.5, 'sawtooth', 0.15); this.tone(155, 0.5, 'square', 0.08, 0.55); };
  GameAudio.prototype.atcAlarm = function () { for (let i = 0; i < 3; i++) this.tone(1200, 0.12, 'square', 0.1, i * 0.2); };
  GameAudio.prototype.eew = function () { for (let i = 0; i < 6; i++) { this.tone(932, 0.16, 'sine', 0.22, i * 0.34); this.tone(698, 0.16, 'sine', 0.22, i * 0.34 + 0.17); } };
  GameAudio.prototype.eb = function () { this.burst(1.2, 0.35, 6000, 0.8, 'highpass'); this.tone(900, 0.2, 'square', 0.12); this.tone(700, 0.2, 'square', 0.12, 0.25); };
  GameAudio.prototype.thud = function () { this.tone(80, 0.35, 'sine', 0.5, 0, 40); this.burst(0.25, 0.4, 500, 1, 'lowpass'); };
  GameAudio.prototype.msg = function (kind) {
    if (kind === 'bad') { for (let i = 0; i < 3; i++) this.tone(520, 0.14, 'triangle', 0.2, i * 0.2); }
    else if (kind === 'warn') { this.tone(700, 0.12, 'triangle', 0.16); this.tone(880, 0.16, 'triangle', 0.16, 0.16); }
    else if (kind === 'stop') this.tone(784, 0.18, 'sine', 0.12);
    else if (kind === 'pa') { }
    else this.tone(600, 0.1, 'sine', 0.09);
  };
  GameAudio.prototype.arrive = function () { this.tone(988, 0.2, 'sine', 0.14); this.tone(784, 0.2, 'sine', 0.14, 0.22); this.tone(1175, 0.4, 'sine', 0.14, 0.44); this.airRelease(0.2); };
  GameAudio.prototype.chime = function () { [784, 988, 1175, 988].forEach((f, i) => this.tone(f, 0.32, 'sine', 0.12, i * 0.3)); };
  GameAudio.prototype.finish = function (good) { const n = good ? [523, 659, 784, 1047] : [440, 392, 349]; n.forEach((f, i) => this.tone(f, 0.28, 'sine', 0.16, i * 0.22)); };

  // ---- phát thanh trên tàu ----
  GameAudio.prototype.pick = function (lang) {
    const ss = root.speechSynthesis; if (!ss) return null; const vs = ss.getVoices() || [];
    return vs.find(v => v.lang && v.lang.toLowerCase().startsWith(lang) && /google|microsoft|natural|haruka|ichiro|kyoko|samantha|aria|zira/i.test(v.name)) || vs.find(v => v.lang && v.lang.toLowerCase().startsWith(lang)) || null;
  };
  // a = {ja, en, vi}; urgent = true: ngắt câu đang nói
  GameAudio.prototype.say = function (W, a, urgent, chime) {
    if (this.annMode === 'off') return;
    const text = this.annMode === 'en' ? a.en : a.ja;
    W.say('pa', 'PA: ' + (this.annMode === 'en' ? a.en : a.ja) + '  —  ' + a.vi);
    if (this.annMode === 'sub' || !this.enabled || !root.speechSynthesis) return;
    if (urgent) { this.q = []; root.speechSynthesis.cancel(); }
    this.q.push({ text, lang: this.annMode === 'en' ? 'en' : 'ja', t: performance.now(), chime });
    this.drain();
  };
  GameAudio.prototype.drain = function () {
    const ss = root.speechSynthesis; if (!ss || ss.speaking || this.speaking) return;
    while (this.q.length && performance.now() - this.q[0].t > 25000) this.q.shift();
    const it = this.q.shift(); if (!it) return;
    if (it.chime && this.ready) this.chime();
    this.speaking = true;
    const go = () => { const u = new SpeechSynthesisUtterance(it.text); u.lang = it.lang === 'ja' ? 'ja-JP' : 'en-US'; const v = this.pick(it.lang); if (v) u.voice = v; u.volume = Math.min(1, this.vol * 1.3); u.rate = 1.0;
      u.onend = u.onerror = () => { this.speaking = false; setTimeout(() => this.drain(), 400); }; ss.speak(u); };
    if (it.chime) setTimeout(go, 1300); else go();
  };

  // ---- cập nhật mỗi khung hình ----
  GameAudio.prototype.update = function (W, T, st) {
    if (!this.ready || !W || !T) return;
    const c = this.ctx, t = c.currentTime, v = T.v, kmh = v * 3.6, active = this.enabled && !st.paused && st.scale <= 4;
    const now = performance.now(), dt = Math.min(0.25, (now - this.rt.last) / 1000); this.rt.last = now;
    const set = (node, val, tc) => node.g.gain.setTargetAtTime(active ? val : 0, t, tc || 0.12);
    const sp = Math.min(1, v / 80), frc = T.f, inTun = this.inTunnel(W, T), dw = T.phase === 'dwell', run = T.phase === 'run';
    // tiếng chạy; trong hầm ù to hơn và gió nhỏ đi
    const cabK = this.cabin ? 0.3 : 1;      // chế độ ù cabin: bớt tiếng chạy và gió thô
    set(this.cab, this.cabin && v > 0.5 ? 0.6 * Math.pow(sp, 0.6) : 0, 0.5); this.cab.f.frequency.setTargetAtTime(150 + 480 * sp, t, 0.4);      // tỉ lệ theo tốc độ: đứng yên thì im, nhanh thì to và cao dần      // ù liên tục (không phụ thuộc cột điện, ghi), to hơn bản đầu
    set(this.rumble, cabK * (0.55 * Math.pow(sp, 0.8) + (v > 0.3 ? 0.04 : 0)) * (inTun ? 1.5 : 1));
    this.rumble.f.frequency.setTargetAtTime(this.cabin ? 70 + 90 * sp : 90 + 420 * sp, t, 0.2);
    set(this.wind, (this.cabin ? 0.05 : 1) * 0.32 * Math.pow(sp, 2.2) * (inTun ? 0.55 : 1) * (1 + 0.15 * Math.sin(now / 1900)));
    this.wind.f.frequency.setTargetAtTime(500 + 1900 * sp, t, 0.2);
    set(this.rain, W.rainHere ? 0.1 : 0);
    const windy = W.zones.some(z => z.kind === 'wind' && W.t >= z.tA && W.t <= z.tB && T.x >= z.s0 - 25000 && T.x < z.s1 + 5000);
    set(this.howl, windy ? 0.11 * (1 + 0.6 * Math.sin(now / 700) * Math.sin(now / 2300)) : 0, 0.3);
    set(this.quake, W.eqkActive || T.cut ? 0.5 : 0, 0.2);
    const drive = frc > 0 ? frc : Math.min(0.4, -frc * 0.5);
    this.motorO.frequency.setTargetAtTime(60 + kmh * 3.2, t, 0.08); this.motorO2.frequency.setTargetAtTime((60 + kmh * 3.2) * 2.01, t, 0.08);
    this.motor.f.frequency.setTargetAtTime(500 + kmh * 7, t, 0.1);
    set(this.motor, v > 1 && !T.cut && !this.cabin ? 0.05 * drive * Math.min(1, v / 30) : 0, 0.15);
    set(this.hvac, 0.012 + 0.006 * sp, 0.4);
    set(this.squeal, frc < -0.15 && v > 0.5 && v < 22 ? 0.06 * Math.min(1, -frc) * (1 - v / 22) : 0, 0.05);
    set(this.hiss, T.prevF !== undefined && T.prevF < -0.3 && frc > T.prevF + 0.01 && v < 40 ? 0.12 : 0, 0.08);
    T.prevF = frc;
    // trụ điện lướt qua (mỗi 50 m)
    if (active && v > 3 && root.Sim.switchPoints) { const px0 = this.prevSw; if (px0 !== undefined && T.x > px0 && T.x - px0 < 200 && !this.cabin) for (const p of root.Sim.switchPoints(T)) if (px0 < p && T.x >= p) this.switchClatter(v); this.prevSw = T.x; } else this.prevSw = undefined;
    if (active && v > 8) { const idx = Math.floor(T.x / 50); if (this.lastMast !== undefined && idx !== this.lastMast && !this.cabin) this.burst(0.09, 0.05 + 0.18 * sp, 700 + 900 * sp, 0.8); this.lastMast = idx; } else this.lastMast = undefined;
    if (!this.enabled || st.paused) { this.ambience(0); return; }
    // ---- âm theo thời gian thực: máy nén khí, tàu ngược chiều, sấm, ho, em bé, bước chân ----
    const R = this.rt; if (st.scale <= 1) {
      R.comp -= dt; if (R.comp < 0) { this.compressor(); R.comp = 35 + Math.random() * 50; }
      { const xg = (W.xings || []).find(g => g.s - T.x > -25 && g.s - T.x < 520); R.bell = (R.bell || 0) - dt;      // chuông đường ngang (踏切警報機): kêu khi tàu cách đường ngang < 520 m
        if (xg && v > 3 && R.bell < 0) { const d = Math.max(0, xg.s - T.x), vol = 0.03 + 0.07 * (1 - d / 520); this.tone(2150, 0.09, 'sine', vol, 0); this.tone(1750, 0.09, 'sine', vol, 0.14); R.bell = 0.3; } }
      if (this.prevWt !== undefined && v > 40 && !root.Sim.oppHidden(W, T)) for (const t0 of W.opposing || []) if (this.prevWt < t0 - 2.3 && W.t >= t0 - 2.3) this.playClip(0.35 + 0.4 * sp, 0, 5.5);
      if (W.weatherKind === 'typhoon' || W.weatherKind === 'rain') { R.thunder -= dt; if (R.thunder < 0) { if (W.weatherKind === 'typhoon' || Math.random() < 0.4) this.thunder(); R.thunder = 35 + Math.random() * 70; } }
    }
    this.ambience(dw && !st.paused && st.scale <= 4 ? (T.door === 'open' ? 0.55 : 0.4) : 0);
    if (dw && W.passers && W.passers[T.k]) for (const pa of W.passers[T.k]) { const u = (W.t - (pa.t - 4.5)) / 9; if (u > 0 && u < 1 && !pa.played) { pa.played = true; this.playClip(0.95, pa.t | 0); } if (u >= 1) pa.played = false; }
    this.prevWt = W.t;
    // ---- thao tác cần: tiếng gạt, tiếp điểm ----
    const p = this.prev;
    if (p.pw !== undefined && T.pw !== p.pw) { this.click(0.16); if (p.pw === 0 && T.pw > 0 && T.phase === 'run') this.contactor(); }
    if (p.bk !== undefined && T.bk !== p.bk) { this.click(0.14); if (T.bk > p.bk) this.brakeApply(); else if (T.bk === 0 && p.bk > 0 && v > 1) this.airRelease(0.1); }
    if (T.bk === 8 && p.bk !== 8) this.eb();
    // ---- cách điện đoạn và hầm ----
    if (v > 40) { const sec = Math.floor(T.x / 20000); if (p.sec !== undefined && sec !== p.sec) this.insulator(); p.sec = sec; } else p.sec = undefined;
    if (inTun && !p.tun && v > 30) this.tunnelBoom(); if (!inTun && p.tun && v > 30) this.tunnelExit();
    // ---- sự kiện ----
    if ((T.hornN || 0) !== (p.hornN || 0)) this.horn();      // đếm số lần bấm còi, không dựa vào T.horn (bấm một lần rồi giảm về 0 trong 0,1 s: khung hình chậm sẽ bỏ lỡ)
    if (T.atc && !p.atc) this.atcAlarm();
    if (T.needConfirm && t - this.lastConfirmBeep > 1.4) { this.tone(1000, 0.1, 'square', 0.08); this.lastConfirmBeep = t; }
    if (T.door === 'closing' && p.door !== 'closing') { this.doorChime(); if (T.k > 0 || T.started) this.platformBell(); }
    if (T.door === 'closed' && p.door === 'closing') this.doorClosed();
    if (T.door === 'open' && p.door === 'closing') this.buzzer();
    if (T.door === 'open' && p.door !== 'open' && p.door !== 'closing' && dw) this.doorOpen();
    if (T.phase === 'run' && p.phase === 'dwell') this.airRelease(0.14);
    if (T.results.length > this.lastResults) this.arrive();
    this.lastResults = T.results.length;
    if (W.eqkActive && !p.eqk) this.eew();
    if (T.animalHit > (p.animalHit || 0)) this.thud();
    if (T.finished && !p.finished) this.finish(true);
    if (W.msgs.length > this.msgCount) { const nm = W.msgs.slice(this.msgCount).filter(m => m.kind !== 'pa'); this.msgCount = W.msgs.length; if (nm.length && !(W.eqkActive && !p.eqk)) this.msg(nm.some(m => m.kind === 'bad') ? 'bad' : nm.some(m => m.kind === 'warn') ? 'warn' : nm[nm.length - 1].kind); }
    if (W.decision && !p.dec) this.tone(660, 0.12, 'triangle', 0.18) ; p.dec = !!W.decision;
    if (W.fireActive && !p.fire) { for (let i = 0; i < 8; i++) this.tone(i % 2 ? 1400 : 1100, 0.18, 'square', 0.12, i * 0.2); } p.fire = W.fireActive;
    if ((W.wires || []).length > (p.wires || 0)) { this.burst(1.2, 0.4, 3000, 0.6, 'bandpass'); this.tone(90, 0.5, 'sawtooth', 0.12); } p.wires = (W.wires || []).length;
    if (W.paEvent !== undefined && W.paEvent !== p.pa) { this.tone(880, 0.15, 'sine', 0.14); this.tone(1175, 0.35, 'sine', 0.14, 0.18); } p.pa = W.paEvent;
    this.announce(W, T, p);
    this.prev = Object.assign(p, { horn: T.horn, hornN: T.hornN, atc: T.atc, door: T.door, phase: T.phase, eqk: W.eqkActive, finished: T.finished, pw: T.pw, bk: T.bk, tun: inTun, animalHit: T.animalHit });
  };
  GameAudio.prototype.inTunnel = function (W, T) {
    return root.Sim.inTunnel(W, T.x);
  };
  // ---- lời phát thanh ----
  // bên cửa mở ở ga j: theo sân ga kề đường dừng của ta (bên trái/phải theo chiều đi); không có sân ga (dừng đường chính) thì không thông báo
  GameAudio.prototype.doorSide = function (W, T, j) {
    const m = T.M[j], Ly = root.Layout, ls = W.line.stations[m.i]; if (!Ly || !ls || !ls.lay || m.mainStop) return null;
    const st = Ly.station(ls.lay, W.dir, Ly.pickOf(ls, m.i)); if (!st.plat) return null;
    return st.platSign > 0 ? { ja: '左側', en: 'left', vi: 'trái' } : { ja: '右側', en: 'right', vi: 'phải' };
  };
  GameAudio.prototype.announce = function (W, T, p) {
    if (this.annMode === 'off') return;
    const M = T.M, A = this.ann;
    const nameJ = k => M[k].jp || M[k].name, typeJ = TYPEJ[W.trip.rec.t] || '', no = W.trip.rec.n;
    const last = M.length - 1, destJ = nameJ(last), dest = M[last].name;
    const j = root.Sim.nextTarget(T), nxt = M[j];
    // lúc bắt đầu chuyến
    if (T.started && !A.start) { A.start = true;
      this.say(W, { ja: `本日も、${W.line.meta.pa}新幹線をご利用くださいまして、ありがとうございます。この列車は、${typeJ}${no}号、${destJ}行きです。`, en: `Thank you for riding the Shinkansen. This is the ${W.trip.rec.t} number ${no} bound for ${dest}.`, vi: `Cảm ơn quý khách đã đi Shinkansen. Đây là ${W.trip.rec.t} số ${no} đi ${dest}.` }, false, true); }
    // đóng cửa
    if (T.door === 'closing' && p.door !== 'closing' && T.started) this.say(W, { ja: 'ドアが閉まります。ご注意ください。', en: 'The doors are closing. Please stand clear.', vi: 'Cửa sắp đóng, xin quý khách chú ý.' }, false, false);
    // sau khi rời ga: ga dừng kế tiếp, và xin lỗi nếu trễ
    if (T.phase === 'run' && p.phase === 'dwell') {
      const delay = W.t - root.Sim.plannedTime(T);
      if (T.k > 0 || delay > 120) { }
      this.say(W, { ja: `次は、${nameJ(j)}に止まります。`, en: `The next stop is ${nxt.name}.`, vi: `Ga dừng tiếp theo là ${nxt.name}.` }, false, true);
      if (delay > 120) this.say(W, { ja: `お急ぎのところ、列車が約${Math.round(delay / 60)}分遅れております。お詫び申し上げます。`, en: `We apologize for the delay of about ${Math.round(delay / 60)} minutes.`, vi: `Tàu đang trễ khoảng ${Math.round(delay / 60)} phút, xin lỗi quý khách.` }, false, false);
      A.apr = -1;
    }
    // sắp tới ga: tên ga, các tuyến đổi tàu và bên cửa sẽ mở
    if (T.phase === 'run') { const d = M[j].s - T.x; if (d < 3500 && A.apr !== j && T.v > 15) { A.apr = j;
      this.say(W, { ja: `まもなく、${nameJ(j)}、${nameJ(j)}です。`, en: `We will soon be arriving at ${nxt.name}.`, vi: `Sắp tới ga ${nxt.name}.` }, false, true);
      const tr = (root.TRANSFERS || {})[M[j].jp] || [], rail = tr.filter(x => x !== '路線バス');
      if (rail.length) this.say(W, { ja: `${nameJ(j)}では、${rail.join('、')}はお乗り換えです。`, en: `You can change here to other railway lines: ${rail.length} connections.`, vi: `Quý khách có thể đổi tàu tại ${nxt.name}: ${rail.join(', ')}.` }, false, false);
      else if (tr.length) this.say(W, { ja: `${nameJ(j)}では、路線バスはお乗り換えです。`, en: 'Bus connections are available here.', vi: `Tại ga ${nxt.name} có xe buýt kết nối.` }, false, false);
      const sd = this.doorSide(W, T, j);
      if (sd) this.say(W, { ja: `${nameJ(j)}では、${sd.ja}のドアが開きます。`, en: `The doors on the ${sd.en} side will open at ${nxt.name}.`, vi: `Tại ga ${nxt.name}, cửa mở ở bên ${sd.vi}.` }, false, true); } }
    // tới ga
    if (T.results.length > (A.res || 0)) { A.res = T.results.length; const r = T.results[T.results.length - 1];
      if (!r.overrun) { if (T.phase === 'end') this.say(W, { ja: `終点、${nameJ(last)}、${nameJ(last)}です。ご乗車ありがとうございました。`, en: `This is ${dest}, the last stop. Thank you for riding.`, vi: `Ga cuối ${dest}. Cảm ơn quý khách.` }, false, true);
        else if (T.holds[T.k] > W.t) this.say(W, { ja: 'ダイヤ調整のため、しばらく停車いたします。ご迷惑をおかけします。', en: 'We will stop here for a while due to schedule adjustment.', vi: 'Tàu dừng lại một lúc để điều chỉnh lịch chạy.' }, false, false); } }
    // mưa, tuyết, gió, động đất, va chạm, tàu trước dừng
    if (W.rainHere && !p.rain) this.say(W, { ja: 'ただいま、大雨のため、速度を落として運転しております。', en: 'We are running at reduced speed due to heavy rain.', vi: 'Tàu đang chạy chậm do mưa lớn.' }, false, false);
    p.rain = W.rainHere;
    const snow = W.zones.some(z => z.kind === 'snow' && T.x >= z.s0 && T.x < z.s1);
    if (snow && !p.snow) this.say(W, { ja: '雪のため、徐行運転をしております。', en: 'We are running slowly because of snow.', vi: 'Tàu chạy chậm do tuyết.' }, false, false); p.snow = snow;
    if (W.lastHold && W.lastHold.seq !== A.holdSeq) { A.holdSeq = W.lastHold.seq; const rain = W.lastHold.why === 'rain';
      this.say(W, { ja: rain ? 'ただいま、大雨のため、運転を見合わせております。' : 'ただいま、強風のため、運転を見合わせております。', en: rain ? 'Service is suspended due to heavy rain.' : 'Service is suspended due to strong winds.', vi: rain ? 'Tạm ngừng chạy do mưa lớn.' : 'Tạm ngừng chạy do gió mạnh.' }, true, true); }
    if (W.eqkActive && !p.eqk) this.say(W, { ja: 'ただいま、地震のため、緊急停止いたしました。そのまま、しばらくお待ちください。', en: 'The train has made an emergency stop due to an earthquake. Please remain seated.', vi: 'Tàu dừng khẩn cấp do động đất. Xin quý khách ngồi yên chờ.' }, true, true);
    if (!W.eqkActive && p.eqk) this.say(W, { ja: '安全が確認できましたので、運転を再開いたします。', en: 'Safety has been confirmed. We will resume service.', vi: 'Đã xác nhận an toàn, tàu chạy lại.' }, false, true);
    if (T.animalHit > (p.animalHit || 0)) this.say(W, { ja: 'ただいま、動物と衝突したため、停車しております。', en: 'The train has stopped after hitting an animal.', vi: 'Tàu dừng do va chạm động vật.' }, true, true);
    if (W.leadStopAt !== undefined && W.leadStopAt !== A.leadStop) { A.leadStop = W.leadStopAt; this.say(W, { ja: '前を走る列車で、急病のお客様が出たため、間隔をあけて運転しております。', en: 'A passenger on the train ahead is ill, so we are keeping a distance.', vi: 'Tàu phía trước có hành khách bệnh, tàu giữ khoảng cách.' }, false, true); }
  };
  GameAudio.prototype.reset = function (W) { this.silence(); this.prev = {}; this.ann = {}; this.q = []; if (root.speechSynthesis) root.speechSynthesis.cancel(); this.speaking = false; this.msgCount = W ? W.msgs.length : 0; this.lastResults = 0; this.lastMast = undefined; };
  root.GameAudio = GameAudio;
})(typeof window !== 'undefined' ? window : globalThis);
