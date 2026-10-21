// Âm thanh v2: tổng hợp bằng WebAudio + phát thanh bằng giọng nói của trình duyệt (SpeechSynthesis). Không dùng file âm thanh.
// Mọi âm đều là mô phỏng gần đúng [I], không phải ghi âm tàu thật. Lời phát thanh là mẫu tự soạn [I].
(function (root) {
  const JPN = ['東京', '品川', '新横浜', '小田原', '熱海', '三島', '新富士', '静岡', '掛川', '浜松', '豊橋', '三河安城', '名古屋', '岐阜羽島', '米原', '京都', '新大阪'];
  const VI = { Tokyo: 'Tokyo', Shinagawa: 'Shinagawa' };
  const TYPEJ = { Nozomi: 'のぞみ', Hikari: 'ひかり', Kodama: 'こだま' };
  function GameAudio() {
    this.ctx = null; this.enabled = true; this.vol = 0.6; this.ready = false; this.annMode = 'ja'; this.pax = true;
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
    // tiếng người nói chuyện: nhiễu qua hai bộ lọc dải (formant) và điều biến chậm
    const pn = noise(), pf1 = flt('bandpass', 450, 1.6), pf2 = flt('bandpass', 1500, 2.2), pg = c.createGain(); pg.gain.value = 0;
    pn.connect(pf1); pn.connect(pf2); pf1.connect(pg); pf2.connect(pg); pg.connect(this.master); this.murmur = { g: pg, f: pf1, f2: pf2 };
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.37; lg.gain.value = 0.015; lfo.connect(lg); lg.connect(pg.gain); lfo.start();
    // motor kéo
    this.motorO = c.createOscillator(); this.motorO.type = 'sawtooth'; this.motorO.frequency.value = 120;
    this.motorO2 = c.createOscillator(); this.motorO2.type = 'square'; this.motorO2.frequency.value = 240;
    const mf = flt('lowpass', 1800, 1), mg = c.createGain(); mg.gain.value = 0;
    this.motorO.connect(mf); this.motorO2.connect(mf); mf.connect(mg); mg.connect(this.master); this.motor = { g: mg, f: mf };
    this.motorO.start(); this.motorO2.start();
    // quạt gió/điều hoà: tiếng ù thấp liên tục
    this.hvacO = c.createOscillator(); this.hvacO.type = 'sine'; this.hvacO.frequency.value = 118; const hg = c.createGain(); hg.gain.value = 0; this.hvacO.connect(hg); hg.connect(this.master); this.hvac = { g: hg }; this.hvacO.start();
    this.ready = true;
    this.rt = { comp: 20 + Math.random() * 30, oppose: 90 + Math.random() * 120, thunder: 40 + Math.random() * 50, cough: 25 + Math.random() * 30, baby: 150 + Math.random() * 150, board: 0, last: performance.now() };
  };
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
  GameAudio.prototype.horn = function () { this.tone(415, 1.1, 'sawtooth', 0.14); this.tone(554, 1.1, 'sawtooth', 0.12); this.tone(208, 1.1, 'square', 0.06); };
  GameAudio.prototype.doorChime = function () { this.tone(880, 0.28, 'sine', 0.18); this.tone(659, 0.4, 'sine', 0.18, 0.3); this.tone(880, 0.28, 'sine', 0.18, 0.9); this.tone(659, 0.4, 'sine', 0.18, 1.2); this.airRelease(0.1); };
  GameAudio.prototype.doorClosed = function () { this.burst(0.12, 0.35, 300, 2, 'lowpass'); this.tone(150, 0.12, 'sine', 0.2); this.airRelease(0.14); };
  GameAudio.prototype.doorOpen = function () { this.airRelease(0.16); this.burst(0.15, 0.3, 260, 2, 'lowpass', 0.5); this.tone(95, 1.6, 'sine', 0.05, 0.6); };
  GameAudio.prototype.platformBell = function () { for (let i = 0; i < 10; i++) this.tone(1900, 0.09, 'square', 0.05, i * 0.16); };
  GameAudio.prototype.buzzer = function () { this.tone(160, 0.5, 'sawtooth', 0.15); this.tone(155, 0.5, 'square', 0.08, 0.55); };
  GameAudio.prototype.atcAlarm = function () { for (let i = 0; i < 3; i++) this.tone(1200, 0.12, 'square', 0.1, i * 0.2); };
  GameAudio.prototype.eew = function () { for (let i = 0; i < 6; i++) { this.tone(932, 0.16, 'sine', 0.22, i * 0.34); this.tone(698, 0.16, 'sine', 0.22, i * 0.34 + 0.17); } };
  GameAudio.prototype.eb = function () { this.burst(1.2, 0.35, 6000, 0.8, 'highpass'); this.tone(900, 0.2, 'square', 0.12); this.tone(700, 0.2, 'square', 0.12, 0.25); };
  GameAudio.prototype.thud = function () { this.tone(80, 0.35, 'sine', 0.5, 0, 40); this.burst(0.25, 0.4, 500, 1, 'lowpass'); };
  GameAudio.prototype.cough = function () { this.burst(0.12, 0.09, 700, 1.4, 'bandpass'); this.burst(0.1, 0.07, 650, 1.4, 'bandpass', 0.22); };
  GameAudio.prototype.baby = function () { for (let i = 0; i < 3; i++) { const t0 = i * 0.9; this.tone(430, 0.7, 'sawtooth', 0.025, t0, 560); this.tone(860, 0.7, 'sine', 0.012, t0, 1100); } };
  GameAudio.prototype.footstep = function (g) { this.burst(0.07, g, 220, 1, 'lowpass'); };
  GameAudio.prototype.suitcase = function () { this.burst(0.5, 0.05, 900, 1.2, 'bandpass', 0, 600); };
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
    set(this.rumble, (0.55 * Math.pow(sp, 0.8) + (v > 0.3 ? 0.04 : 0)) * (inTun ? 1.5 : 1));
    this.rumble.f.frequency.setTargetAtTime(90 + 420 * sp, t, 0.2);
    set(this.wind, 0.32 * Math.pow(sp, 2.2) * (inTun ? 0.55 : 1) * (1 + 0.15 * Math.sin(now / 1900)));
    this.wind.f.frequency.setTargetAtTime(500 + 1900 * sp, t, 0.2);
    set(this.rain, W.rainHere ? 0.1 : 0);
    const windy = W.zones.some(z => z.kind === 'wind' && W.t >= z.tA && W.t <= z.tB && T.x >= z.s0 - 25000 && T.x < z.s1 + 5000);
    set(this.howl, windy ? 0.11 * (1 + 0.6 * Math.sin(now / 700) * Math.sin(now / 2300)) : 0, 0.3);
    set(this.quake, W.eqkActive || T.cut ? 0.5 : 0, 0.2);
    const drive = frc > 0 ? frc : Math.min(0.4, -frc * 0.5);
    this.motorO.frequency.setTargetAtTime(60 + kmh * 3.2, t, 0.08); this.motorO2.frequency.setTargetAtTime((60 + kmh * 3.2) * 2.01, t, 0.08);
    this.motor.f.frequency.setTargetAtTime(500 + kmh * 7, t, 0.1);
    set(this.motor, v > 1 && !T.cut ? 0.05 * drive * Math.min(1, v / 30) : 0, 0.15);
    set(this.hvac, 0.012 + 0.006 * sp, 0.4);
    set(this.squeal, frc < -0.15 && v > 0.5 && v < 22 ? 0.06 * Math.min(1, -frc) * (1 - v / 22) : 0, 0.05);
    set(this.hiss, T.prevF !== undefined && T.prevF < -0.3 && frc > T.prevF + 0.01 && v < 40 ? 0.12 : 0, 0.08);
    T.prevF = frc;
    // hành khách: ồn hơn khi đỗ ga, mở cửa; nhỏ khi chạy; to khi có sự cố
    const paxLevel = !this.pax ? 0 : (dw && T.door === 'open' ? 0.11 : dw ? 0.07 : 0.045) * (W.eqkActive || T.cut ? 2 : 1) * (inTun ? 0.8 : 1);
    this.murmur.f.frequency.setTargetAtTime(420 + 80 * Math.sin(now / 3100), t, 0.5); this.murmur.f2.frequency.setTargetAtTime(1400 + 300 * Math.sin(now / 2300), t, 0.5);
    set(this.murmur, paxLevel, 0.6);
    // trụ điện lướt qua (mỗi 50 m)
    if (active && v > 8) { const idx = Math.floor(T.x / 50); if (this.lastMast !== undefined && idx !== this.lastMast) this.burst(0.09, 0.05 + 0.18 * sp, 700 + 900 * sp, 0.8); this.lastMast = idx; } else this.lastMast = undefined;
    if (!this.enabled || st.paused) return;
    // ---- âm theo thời gian thực: máy nén khí, tàu ngược chiều, sấm, ho, em bé, bước chân ----
    const R = this.rt; if (st.scale <= 1) {
      R.comp -= dt; if (R.comp < 0) { this.compressor(); R.comp = 35 + Math.random() * 50; }
      if (this.prevWt !== undefined && v > 40) for (const t0 of W.opposing || []) if (this.prevWt < t0 && W.t >= t0) this.oppose(sp);
      if (W.weatherKind === 'typhoon' || W.weatherKind === 'rain') { R.thunder -= dt; if (R.thunder < 0) { if (W.weatherKind === 'typhoon' || Math.random() < 0.4) this.thunder(); R.thunder = 35 + Math.random() * 70; } }
      if (this.pax) { R.cough -= dt; if (R.cough < 0) { this.cough(); R.cough = 20 + Math.random() * 40; } R.baby -= dt; if (R.baby < 0) { this.baby(); R.baby = 200 + Math.random() * 300; } }
      if (this.pax && dw && T.door === 'open' && T.dwellT < 14) { R.board -= dt; if (R.board < 0) { this.footstep(0.07 + Math.random() * 0.05); if (Math.random() < 0.18) this.suitcase(); R.board = 0.22 + Math.random() * 0.3; } }
    }
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
    if (T.horn > 1.3 && !(p.horn > 1.3)) this.horn();
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
    this.announce(W, T, p);
    this.prev = Object.assign(p, { horn: T.horn, atc: T.atc, door: T.door, phase: T.phase, eqk: W.eqkActive, finished: T.finished, pw: T.pw, bk: T.bk, tun: inTun, animalHit: T.animalHit });
  };
  GameAudio.prototype.inTunnel = function (W, T) {
    for (const [k0, k1] of root.Sim.TUNNELS) { const a = root.Sim.sOfKm(k0, W.dir), b = root.Sim.sOfKm(k1, W.dir); if (T.x >= Math.min(a, b) && T.x <= Math.max(a, b)) return true; } return false;
  };
  // ---- lời phát thanh ----
  GameAudio.prototype.announce = function (W, T, p) {
    if (this.annMode === 'off') return;
    const M = T.M, A = this.ann, id = W.trip.rec[0] + W.trip.rec[1];
    const nameJ = k => JPN[M[k].i], typeJ = TYPEJ[W.trip.rec[0]] || '', no = W.trip.rec[1];
    const last = M.length - 1, destJ = nameJ(last), dest = M[last].name;
    const j = root.Sim.nextTarget(T), nxt = M[j];
    // lúc bắt đầu chuyến
    if (T.started && !A.start) { A.start = true;
      this.say(W, { ja: `本日も、東海道新幹線をご利用くださいまして、ありがとうございます。この列車は、${typeJ}${no}号、${destJ}行きです。`, en: `Thank you for riding the Tokaido Shinkansen. This is the ${W.trip.rec[0]} number ${no} bound for ${dest}.`, vi: `Cảm ơn quý khách đã đi Tokaido Shinkansen. Đây là ${W.trip.rec[0]} số ${no} đi ${dest}.` }, false, true); }
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
    // sắp tới ga
    if (T.phase === 'run') { const d = M[j].s - T.x; if (d < 3500 && A.apr !== j && T.v > 15) { A.apr = j;
      this.say(W, { ja: `まもなく、${nameJ(j)}、${nameJ(j)}です。`, en: `We will soon be arriving at ${nxt.name}.`, vi: `Sắp tới ga ${nxt.name}.` }, false, true); } }
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
  GameAudio.prototype.reset = function (W) { this.prev = {}; this.ann = {}; this.q = []; if (root.speechSynthesis) root.speechSynthesis.cancel(); this.speaking = false; this.msgCount = W ? W.msgs.length : 0; this.lastResults = 0; this.lastMast = undefined; };
  root.GameAudio = GameAudio;
})(typeof window !== 'undefined' ? window : globalThis);
