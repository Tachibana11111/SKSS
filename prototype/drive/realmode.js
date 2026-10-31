// Chế độ thực tế: giờ Nhật Bản, thời tiết thật (Open-Meteo) và động đất thật (P2PQuake).
// Gọi mạng chỉ khi người chơi bật chế độ này và bấm Bắt đầu; kết quả được CHỤP LẠI thành một snapshot lưu trong công thức chuyến (recipe.real),
// nên mô phỏng vẫn xác định và xem lại chuyến luôn đúng dữ liệu lúc đó. Mô-đun này không phụ thuộc DOM (chạy được cả trong Node để kiểm thử).
// Thời gian trong snapshot tính bằng giây kể từ 00:00 (giờ Nhật) của NGÀY HÔM NAY, cùng hệ với giờ trong lịch tàu (sau nửa đêm: > 86400).
(function (root) {
  'use strict';
  const R = {};
  const HOURS = 9;                 // số giờ dự báo giữ lại trong snapshot (đủ cho chuyến dài nhất, Tokyo–Hakata ≈ 5 giờ)
  const QUAKE_LOOKBACK = 3 * 3600; // chỉ quan tâm động đất trong 3 giờ gần đây
  const NPTS = 9;                  // số điểm lấy mẫu thời tiết dọc tuyến

  // giờ Nhật Bản: { date: 'YYYY-MM-DD', sec: giây kể từ 00:00 }
  R.jstNow = function (d) {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    const o = {}; for (const p of f.formatToParts(d || new Date())) o[p.type] = p.value;
    return { date: o.year + '-' + o.month + '-' + o.day, sec: (+o.hour % 24) * 3600 + +o.minute * 60 + +o.second };
  };
  R.hhmm = s => { s = Math.floor(s); const h = Math.floor(s / 3600) % 24, m = Math.floor(s % 3600 / 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };
  // giờ rời ga của một dòng lịch [ga, đến, đi, ngang qua]; null nếu ga cuối hoặc đang chạy ngang qua
  R.dep = e => e[3] ? null : (e[2] != null ? e[2] : null);
  // chuyến còn có ga nào đó (không phải ga cuối) rời ga từ giờ `sec` trở đi? (ga cuối chỉ có giờ đến)
  R.canDepart = function (rec, sec) { const st = rec.s.filter(e => !e[3]); for (let k = 0; k < st.length - 1; k++) { const d = R.dep(st[k]); if (d != null && d >= sec) return true; } return false; };
  // các ga còn rời ga từ giờ `sec` trở đi (chỉ số ga trong tuyến); dùng cho ô "Từ"
  R.departable = function (rec, sec) { const st = rec.s.filter(e => !e[3]), out = []; for (let k = 0; k < st.length - 1; k++) { const d = R.dep(st[k]); if (d != null && d >= sec) out.push(st[k][0]); } return out; };

  // các điểm lấy mẫu thời tiết: tối đa NPTS ga trải đều theo km trong đoạn [lo, hi] của tuyến
  R.samplePoints = function (L, lo, hi) {
    const S = L.stations, a = Math.max(0, Math.min(lo, hi)), b = Math.min(S.length - 1, Math.max(lo, hi)), idx = [];
    if (b - a + 1 <= NPTS) for (let i = a; i <= b; i++) idx.push(i);
    else { const k0 = S[a].km, k1 = S[b].km; for (let q = 0; q < NPTS; q++) { const km = k0 + (k1 - k0) * q / (NPTS - 1); let best = a; for (let i = a; i <= b; i++) if (Math.abs(S[i].km - km) < Math.abs(S[best].km - km)) best = i; if (!idx.includes(best)) idx.push(best); } }
    return idx.map(i => ({ i, km: S[i].km, lat: S[i].lat, lon: S[i].lon }));
  };

  // phân tích phản hồi Open-Meteo (mảng một phần tử mỗi toạ độ, hoặc một đối tượng nếu chỉ một toạ độ) thành snapshot thời tiết; h0 = giờ đầu tiên giữ lại
  R.parseWx = function (json, pts, h0) {
    const arr = Array.isArray(json) ? json : [json]; if (arr.length !== pts.length) return null;
    const r1 = x => Math.round((+x || 0) * 10) / 10, cut = a => (a || []).slice(h0, h0 + HOURS).map(r1), out = [];
    for (let k = 0; k < pts.length; k++) { const h = arr[k] && arr[k].hourly; if (!h || !h.precipitation) return null; out.push({ i: pts[k].i, km: pts[k].km, lat: pts[k].lat, lon: pts[k].lon, rain: cut(h.precipitation), snow: cut(h.snowfall), gust: cut(h.wind_gusts_10m) }); }
    return { h0, pts: out };
  };
  R.wxUrl = function (pts) {
    return 'https://api.open-meteo.com/v1/forecast?latitude=' + pts.map(p => p.lat.toFixed(3)).join(',') + '&longitude=' + pts.map(p => p.lon.toFixed(3)).join(',') +
      '&hourly=precipitation,snowfall,wind_gusts_10m&wind_speed_unit=ms&timezone=Asia%2FTokyo&forecast_days=2';
  };
  // P2PQuake: mã 551 = thông tin động đất của JMA. maxScale: 10..70 (震度 1, 2, 3, 4, 5-, 5+, 6-, 6+, 7)
  const SHINDO = { 10: 1, 20: 2, 30: 3, 40: 4, 45: 5, 50: 5.5, 55: 6, 60: 6.5, 70: 7 };
  R.parseQuakes = function (json, now) {
    const out = [], day = now.date.replace(/-/g, '/'); if (!Array.isArray(json)) return out;
    for (const q of json) {
      const e = q && q.earthquake, h = e && e.hypocenter; if (!e || !h || typeof e.time !== 'string' || !(h.latitude > 0) || !(h.longitude > 0)) continue;
      const m = /^(\d{4}\/\d{2}\/\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(e.time); if (!m) continue;
      const days = Math.round((Date.UTC(+m[1].slice(0, 4), +m[1].slice(5, 7) - 1, +m[1].slice(8, 10)) - Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10))) / 86400000);
      const t = days * 86400 + (+m[2]) * 3600 + (+m[3]) * 60 + (+m[4]);
      if (t > now.sec || t < now.sec - QUAKE_LOOKBACK) continue;
      out.push({ t, lat: h.latitude, lon: h.longitude, mag: h.magnitude > 0 ? h.magnitude : 0, depth: h.depth >= 0 ? h.depth : 10, shindo: SHINDO[e.maxScale] || 0, name: h.name || '' });
    }
    return out.sort((a, b) => a.t - b.t);
  };
  R.quakeUrl = () => 'https://api.p2pquake.net/v2/history?codes=551&limit=40';

  const getJson = function (url, fetchFn, ms) {
    const f = fetchFn || (root.fetch && root.fetch.bind(root)); if (!f) return Promise.reject(new Error('no fetch'));
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = ctl ? setTimeout(() => ctl.abort(), ms || 8000) : 0;
    return f(url, ctl ? { signal: ctl.signal } : undefined).then(r => { if (timer) clearTimeout(timer); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }, e => { if (timer) clearTimeout(timer); throw e; });
  };
  // Chụp snapshot cho một chuyến: tFrom = giờ bắt đầu (giây trong ngày dịch vụ), lo/hi = đoạn ga của tuyến. Mỗi nguồn lỗi độc lập (wx/eq = null) để phần còn lại vẫn dùng được.
  R.snapshot = function (L, lo, hi, tFrom, opts) {
    opts = opts || {}; const now = R.jstNow(opts.now), pts = R.samplePoints(L, lo, hi), h0 = Math.max(0, Math.floor(tFrom / 3600) - 1);
    const wx = getJson(R.wxUrl(pts), opts.fetch).then(j => R.parseWx(j, pts, h0)).catch(() => null);
    const eq = getJson(R.quakeUrl(), opts.fetch).then(j => R.parseQuakes(j, now)).catch(() => null);
    return Promise.all([wx, eq]).then(([w, q]) => ({ v: 1, date: now.date, at: now.sec, wx: w, eq: q }));
  };
  // thăm dò động đất mới trong lúc chơi: danh sách (cùng định dạng parseQuakes) hoặc null nếu lỗi mạng
  R.fetchQuakes = function (opts) { opts = opts || {}; const now = R.jstNow(opts.now); return getJson(R.quakeUrl(), opts.fetch).then(j => R.parseQuakes(j, now)).catch(() => null); };
  R.quakeKey = q => q.t + '|' + q.lat + '|' + q.lon;
  // tóm tắt cho người chơi: lớn nhất của mưa/tuyết/gió trong khoảng giờ [tA, tB] (giây trong ngày) trên các điểm trong snapshot
  R.summary = function (snap, tA, tB) {
    const o = { rain: 0, snow: 0, gust: 0 }; if (!snap || !snap.wx) return o;
    const a = Math.floor(tA / 3600) - snap.wx.h0, b = Math.floor(tB / 3600) - snap.wx.h0;
    for (const p of snap.wx.pts) for (let h = Math.max(0, a); h <= Math.min(HOURS - 1, b); h++) { o.rain = Math.max(o.rain, p.rain[h] || 0); o.snow = Math.max(o.snow, p.snow[h] || 0); o.gust = Math.max(o.gust, p.gust[h] || 0); }
    return o;
  };
  R.HOURS = HOURS; R.QUAKE_LOOKBACK = QUAKE_LOOKBACK;
  root.RealMode = R;
  if (typeof module !== 'undefined' && module.exports) module.exports = R;
})(typeof window !== 'undefined' ? window : globalThis);
