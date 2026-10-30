// Trình phát nhạc nhỏ (góc dưới trái) phát các giai điệu ga Shinkansen từ video YouTube bddFo2Vzi4A qua trình nhúng chính thức (IFrame API); không lưu tệp âm thanh.
// Video nằm ngoài màn hình (không hiện hình); mỗi bài là một mục (chapter) của video: nhảy tới mốc bắt đầu, tới mốc của bài sau thì chuyển bài theo chế độ lặp.
// Chỉ hiện ở menu (không hiện khi đang lái và ở lớp tạm dừng); ra khỏi menu thì tạm dừng, vào lại thì phát tiếp. Trình duyệt chặn tự phát tới khi người chơi bấm/gõ phím lần đầu.
(function (root) {
  const VID = 'bddFo2Vzi4A', END_FALLBACK = 250;
  // [giây bắt đầu, tên tiếng Anh, tên tiếng Nhật]
  const TR = [
    [0, 'Tōhoku / Akita / Yamagata / Hokkaidō Shinkansen', '東北・秋田・山形・北海道新幹線'],
    [9, 'Jōetsu / Hokuriku Shinkansen', '上越・北陸新幹線'],
    [17, 'Hokuriku Shinkansen (JR West)', '北陸新幹線(JR西日本)'],
    [31, 'Tōkaidō / Sanyō Shinkansen (JR Tōkai) Departure / Arrival', '東海道・山陽新幹線(JR東海)発着'],
    [43, 'Tōkaidō / Sanyō Shinkansen (JR Tōkai)', '東海道・山陽新幹線(JR東海)'],
    [48, 'Tōkaidō / Sanyō Shinkansen (JR West) Departure / Arrival', '東海道・山陽新幹線(JR西日本)発着'],
    [59, 'Tōkaidō / Sanyō Shinkansen (JR West)', '東海道・山陽新幹線(JR西日本)'],
    [68, 'Kyūshū / Sanyō Shinkansen', '九州・山陽新幹線'],
    [80, 'Kyūshū / Sanyō Shinkansen (Hakata)', '九州・山陽新幹線(博多)'],
    [92, 'Kyūshū / Sanyō Shinkansen (Kumamoto)', '九州・山陽新幹線(熊本)'],
    [103, 'Kyūshū / Sanyō Shinkansen (Kagoshima)', '九州・山陽新幹線(鹿児島)'],
    [115, 'Kyūshū Shinkansen Departure Melody (except Hakata / Kumamoto / Kagoshima)', '九州新幹線 発車メロディ(博多・熊本・鹿児島を除く)'],
    [135, 'Kyūshū Shinkansen Departure Melody (Kumamoto)', '九州新幹線 発車メロディ(熊本)'],
    [153, 'Kyūshū Shinkansen Departure Melody (Kagoshima)', '九州新幹線 発車メロディ(鹿児島)'],
    [174, 'West Kyūshū Shinkansen (Departure / Arrival)', '西九州新幹線(発着)'],
    [186, 'West Kyūshū Shinkansen', '西九州新幹線'],
    [192, 'West Kyūshū Shinkansen Departure Melody (Takeo-Onsen)', '西九州新幹線 発車メロディ(武雄温泉)'],
    [203, 'West Kyūshū Shinkansen Departure Melody (Ureshino-Onsen)', '西九州新幹線 発車メロディ(嬉野温泉)'],
    [213, 'West Kyūshū Shinkansen Departure Melody (Shin-Ōmura)', '西九州新幹線 発車メロディ(新大村)'],
    [226, 'West Kyūshū Shinkansen Departure Melody (Isahaya)', '西九州新幹線 発車メロディ(諫早)'],
    [237, 'West Kyūshū Shinkansen Departure Melody (Nagasaki)', '西九州新幹線 発車メロディ(長崎)']
  ];
  const N = TR.length, MODES = ['all', 'one', 'shuf'];
  const ST = () => { try { return root.Store ? root.Store.get().settings : {}; } catch (e) { return {}; } };
  const save = (k, v) => { try { root.Store && root.Store.setting(k, v); } catch (e) { } };
  const S0 = ST();
  const st = { idx: 0, mode: Math.max(0, MODES.indexOf(S0.mMode)), vol: S0.mVol == null ? 60 : S0.mVol, mute: !!S0.mMute, mini: !!S0.mMini, off: !!S0.mOff, vis: false, gesture: false, ready: false, failed: false, playing: false, hist: [], advAt: 0 };
  let P = null, el = null, tick = null;
  const ic = {
    play: '<path d="M7 4v16l13-8z" fill="currentColor" stroke="none"/>', pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>',
    prev: '<path d="M19 5v14L8 12z" fill="currentColor" stroke="none"/><path d="M5 5v14"/>', next: '<path d="M5 5v14l11-7z" fill="currentColor" stroke="none"/><path d="M19 5v14"/>',
    all: '<path d="M4 12v-2a3 3 0 0 1 3-3h13m-3-3 3 3-3 3"/><path d="M20 12v2a3 3 0 0 1-3 3H4m3 3-3-3 3-3"/>', one: '<path d="M4 12v-2a3 3 0 0 1 3-3h13m-3-3 3 3-3 3"/><path d="M20 12v2a3 3 0 0 1-3 3H4m3 3-3-3 3-3"/><path d="M11 10.5l1.5-1v6"/>',
    shuf: '<path d="M18 4l3 3-3 3"/><path d="M18 20l3-3-3-3"/><path d="M3 7h3a5 5 0 0 1 5 5 5 5 0 0 0 5 5h5"/><path d="M21 7h-5a5 5 0 0 0-3.6 1.5M3 17h3a5 5 0 0 0 3.6-1.5"/>',
    vol: '<path d="M6 9H3v6h3l5 4V5z" fill="currentColor"/><path d="M15 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>', mute: '<path d="M6 9H3v6h3l5 4V5z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6"/>',
    list: '<path d="M4 6h16M4 12h16M4 18h16"/>', down: '<path d="M6 9l6 6 6-6"/>', note: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'
  };
  const svg = n => '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ic[n] + '</svg>';
  const lang = () => (root.I18N && root.I18N.lang) || 'vi';
  const tt = i => TR[i][lang() === 'ja' ? 2 : 1], sub = i => TR[i][lang() === 'ja' ? 1 : 2];
  const end = i => i + 1 < N ? TR[i + 1][0] : ((P && P.getDuration && P.getDuration()) || END_FALLBACK);
  const css = `.mp{position:fixed;left:14px;bottom:14px;z-index:56;width:290px;background:rgba(23,28,37,.95);border:1px solid #33475e;border-radius:12px;color:#e8eef5;font:13px/1.4 system-ui,"Segoe UI",sans-serif;padding:10px 12px;display:none;box-sizing:border-box}
.mp *{box-sizing:border-box}.mp button{background:transparent;border:0;color:#e8eef5;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;border-radius:50%;width:28px;height:28px;flex:none}
.mp button:hover{background:rgba(255,255,255,.12)}.mp button svg{width:16px;height:16px}.mp .top{display:flex;align-items:center;gap:8px}
.mp .disc{width:30px;height:30px;border-radius:50%;background:#223042;border:1px solid #3a4352;display:flex;align-items:center;justify-content:center;flex:none}.mp .disc svg{width:16px;height:16px}
.mp .ti{flex:1;min-width:0}.mp .mq{overflow:hidden;white-space:nowrap;font-size:14px}.mp .mq span{display:inline-block;padding-right:36px}.mp .mq.run span{animation:mpmq var(--d,10s) linear infinite}
@keyframes mpmq{from{transform:translateX(0)}to{transform:translateX(-100%)}}.mp .sub{font-size:11px;color:#8d97a8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mp .bar{height:3px;background:#2a3342;border-radius:2px;margin:8px 0 6px;position:relative;cursor:pointer}.mp .bar:before{content:"";position:absolute;left:0;right:0;top:-6px;bottom:-6px}.mp .bar i{position:absolute;left:0;top:0;bottom:0;background:#4aa3ff;border-radius:2px;width:0}
.mp .row{display:flex;align-items:center;gap:2px}.mp .row .pp{background:#2a6fd6;width:34px;height:34px}.mp .row .pp:hover{background:#3a7fe6}.mp .row .pp svg{width:18px;height:18px}.mp .md.on{color:#4aa3ff}
.mp .vol{-webkit-appearance:none;appearance:none;width:54px;height:4px;border-radius:2px;background:#3a4352;outline:none;cursor:pointer;margin:0 0 0 auto;padding:0;border:0}
.mp .vol::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#e8eef5;border:0}.mp .vol::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#e8eef5;border:0}
.mp .mpl{position:absolute;left:0;right:0;bottom:calc(100% + 8px);max-height:264px;overflow-y:auto;background:rgba(23,28,37,.97);border:1px solid #33475e;border-radius:12px;padding:4px;display:none}
.mp .mpl.open{display:block}.mp.mini .mpl{display:none!important}
.mp .mpl button{display:flex;align-items:center;gap:8px;width:100%;height:auto;min-height:34px;padding:5px 8px;border-radius:8px;text-align:left;font:inherit;font-size:12px;line-height:1.35;justify-content:flex-start}
.mp .mpl button .n{flex:none;width:20px;color:#8d97a8;font-size:11px;text-align:right}.mp .mpl button .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mp .mpl button.cur{background:#1d2f4a;color:#9fc8ff}.mp .mpl button.cur .n{color:#4aa3ff}.mp .mpl button.cur .t{font-weight:600}
.mp .mnbtn{display:none;width:34px;height:34px;background:#2a6fd6}.mp.mini{width:auto;padding:5px;border-radius:999px}.mp.mini .full{display:none}.mp.mini .mnbtn{display:inline-flex}
.mp .yt{position:fixed;left:-10000px;top:0;width:200px;height:200px;pointer-events:none}`;
  function build() {
    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    el = document.createElement('div'); el.className = 'mp' + (st.mini ? ' mini' : ''); el.setAttribute('role', 'region'); el.setAttribute('aria-label', _t('Trình phát nhạc'));
    el.innerHTML = '<div class="top full"><div class="disc">' + svg('note') + '</div><div class="ti"><div class="mq" id="mpT"><span></span></div><div class="sub" id="mpS"></div></div><button type="button" data-a="min" aria-label="' + _t('Thu gọn') + '" title="' + _t('Thu gọn') + '">' + svg('down') + '</button></div>' +
      '<div class="bar full" id="mpB"><i id="mpP"></i></div>' +
      '<div class="row full"><button type="button" data-a="prev" aria-label="' + _t('Bài trước') + '" title="' + _t('Bài trước') + '">' + svg('prev') + '</button><button type="button" class="pp" data-a="pp" id="mpPP">' + svg('play') + '</button><button type="button" data-a="next" aria-label="' + _t('Bài sau') + '" title="' + _t('Bài sau') + '">' + svg('next') + '</button>' +
      '<button type="button" class="md" data-a="mode" id="mpM"></button><button type="button" data-a="list" id="mpL" aria-haspopup="listbox" aria-label="' + _t('Danh sách bài hát') + '" title="' + _t('Danh sách bài hát') + '">' + svg('list') + '</button><button type="button" data-a="mute" id="mpMu"></button><input class="vol" id="mpV" type="range" min="0" max="100" aria-label="' + _t('Âm lượng') + '"></div>' +
      '<button type="button" class="mnbtn" data-a="min" aria-label="' + _t('Mở rộng') + '" title="' + _t('Mở rộng') + '">' + svg('note') + '</button><div class="mpl" id="mpList" role="listbox"></div><div class="yt"><div id="mpYT"></div></div>';
    document.body.appendChild(el);
    $('mpList').innerHTML = TR.map((t, i) => '<button type="button" role="option" data-i="' + i + '"><span class="n">' + (i + 1) + '</span><span class="t"></span></button>').join('');
    $('mpList').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b) return; e.stopPropagation(); st.gesture = true; st.off = false; save('mOff', false); jump(+b.dataset.i); });
    document.addEventListener('click', e => { if (listOpen() && !e.target.closest('.mp')) closeList(); });
    el.addEventListener('click', onClick); $('mpV').addEventListener('input', e => { st.vol = +e.target.value; st.mute = false; save('mVol', st.vol); save('mMute', false); applyVol(); render(); });
    $('mpB').addEventListener('click', e => { if (!ready()) return; const r = e.currentTarget.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), a = TR[st.idx][0]; P.seekTo(a + f * (end(st.idx) - a), true); });
    render();
  }
  const $ = id => document.getElementById(id), listOpen = () => $('mpList') && $('mpList').classList.contains('open');
  const closeList = () => { const l = $('mpList'); if (l) l.classList.remove('open'); const b = $('mpL'); if (b) b.classList.remove('on'); };
  function openList() { $('mpList').classList.add('open'); $('mpL').classList.add('on'); const c = $('mpList').querySelector('.cur'); if (c) c.scrollIntoView({ block: 'nearest' }); }
  function jump(j) { if (MODES[st.mode] === 'shuf' && j !== st.idx) { st.hist.push(st.idx); if (st.hist.length > 40) st.hist.shift(); } go(j); if (ready()) P.playVideo(); }
  addEventListener('keydown', e => { if (e.key === 'Escape' && listOpen()) { closeList(); e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  const ready = () => st.ready && P && P.seekTo;
  function setMq() {
    const m = $('mpT'), s = m.firstElementChild; s.textContent = tt(st.idx); m.classList.remove('run'); m.style.removeProperty('--d');
    requestAnimationFrame(() => { if (s.scrollWidth > m.clientWidth + 2) { m.classList.add('run'); m.style.setProperty('--d', Math.max(6, s.scrollWidth / 40) + 's'); } });
  }
  function render() {
    if (!el) return; setMq(); $('mpS').textContent = sub(st.idx);
    const md = MODES[st.mode], mt = [_t('Lặp danh sách'), _t('Lặp một bài'), _t('Phát ngẫu nhiên')][st.mode];
    $('mpPP').innerHTML = svg(st.playing ? 'pause' : 'play'); $('mpPP').setAttribute('aria-label', _t('Phát hoặc tạm dừng')); $('mpPP').title = _t('Phát hoặc tạm dừng');
    $('mpM').innerHTML = svg(md === 'one' ? 'one' : md === 'shuf' ? 'shuf' : 'all'); $('mpM').title = mt; $('mpM').setAttribute('aria-label', mt); $('mpM').classList.toggle('on', true);
    const mu = st.mute || st.vol === 0; $('mpMu').innerHTML = svg(mu ? 'mute' : 'vol'); $('mpMu').title = _t('Tắt tiếng'); $('mpMu').setAttribute('aria-label', _t('Tắt tiếng')); $('mpV').value = st.mute ? 0 : st.vol;
    const items = $('mpList').children; for (let i = 0; i < items.length; i++) { items[i].classList.toggle('cur', i === st.idx); items[i].setAttribute('aria-selected', i === st.idx ? 'true' : 'false'); const tt2 = items[i].querySelector('.t'); if (tt2.textContent !== tt(i)) { tt2.textContent = tt(i); items[i].title = tt(i); } }
    el.style.display = st.vis && !st.failed ? 'block' : 'none';
  }
  const applyVol = () => { if (ready()) { P.setVolume(st.mute ? 0 : st.vol); if (st.mute) P.mute(); else P.unMute(); } };
  function pick(dir) {
    if (MODES[st.mode] === 'shuf') {
      if (dir > 0) { st.hist.push(st.idx); if (st.hist.length > 40) st.hist.shift(); let j; do j = Math.floor(Math.random() * N); while (j === st.idx && N > 1); return j; }
      if (st.hist.length) return st.hist.pop();
    }
    return (st.idx + (dir > 0 ? 1 : N - 1)) % N;
  }
  function go(j) { st.idx = j; st.advAt = Date.now(); if (ready()) { P.seekTo(TR[j][0], true); if (!st.off && st.vis && st.gesture) P.playVideo(); } render(); }
  function onClick(e) {
    const b = e.target.closest('button[data-a]'); if (!b) return; e.stopPropagation(); const a = b.dataset.a; st.gesture = true;
    if (a === 'pp') { if (st.playing) { st.off = true; save('mOff', true); ready() && P.pauseVideo(); } else { st.off = false; save('mOff', false); if (ready()) { P.seekTo(Math.max(TR[st.idx][0], P.getCurrentTime() || 0), true); P.playVideo(); } } }
    else if (a === 'next') go(pick(1));
    else if (a === 'prev') { const t = ready() ? P.getCurrentTime() : 0; if (t - TR[st.idx][0] > 3) go(st.idx); else go(pick(-1)); }
    else if (a === 'list') { if (listOpen()) closeList(); else openList(); }
    else if (a === 'mode') { st.mode = (st.mode + 1) % MODES.length; st.hist = []; save('mMode', MODES[st.mode]); }
    else if (a === 'mute') { st.mute = !st.mute; save('mMute', st.mute); applyVol(); }
    else if (a === 'min') { st.mini = !st.mini; save('mMini', st.mini); el.classList.toggle('mini', st.mini); closeList(); }
    render();
  }
  function poll() {
    if (!ready()) return; const t = P.getCurrentTime() || 0, a = TR[st.idx][0], e = end(st.idx);
    $('mpP').style.width = Math.max(0, Math.min(100, (t - a) / Math.max(1, e - a) * 100)) + '%';
    if (st.playing && Date.now() - st.advAt > 1200 && t >= e - 0.25) { st.advAt = Date.now(); go(MODES[st.mode] === 'one' ? st.idx : pick(1)); }
  }
  function ensureApi() {
    if (P || st.apiLoading || st.failed) return; st.apiLoading = true;
    root.onYouTubeIframeAPIReady = () => {
      try {
        P = new root.YT.Player('mpYT', { width: 200, height: 200, videoId: VID, playerVars: { controls: 0, playsinline: 1, rel: 0, modestbranding: 1, disablekb: 1, fs: 0, iv_load_policy: 3, start: TR[0][0] }, events: {
          onReady: () => { st.ready = true; applyVol(); if (st.vis && !st.off && st.gesture) P.playVideo(); tick = setInterval(poll, 250); },
          onStateChange: e => { st.playing = e.data === 1; if (e.data === 0) go(MODES[st.mode] === 'one' ? st.idx : pick(1)); render(); },
          onError: () => { st.failed = true; render(); } } });
      } catch (err) { st.failed = true; render(); }
    };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => { st.failed = true; render(); }; document.head.appendChild(s);
  }
  // lần bấm/gõ phím đầu tiên của người chơi mở khoá tự phát
  const gesture = () => { if (st.gesture) return; st.gesture = true; if (ready() && st.vis && !st.off) P.playVideo(); };
  addEventListener('pointerdown', gesture, true); addEventListener('keydown', gesture, true);
  function setVisible(v) {
    v = !!v; if (v === st.vis) return; st.vis = v; if (!v) closeList();
    if (v) { if (!el) build(); ensureApi(); if (ready() && !st.off && st.gesture) P.playVideo(); } else if (ready()) P.pauseVideo();
    render();
  }
  root.Music = { setVisible, TR };
})(window);
