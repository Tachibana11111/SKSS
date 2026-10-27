// Ô cửa sổ sáng đèn của các đoàn tàu (cam trước/sau, 2D view) khi trời tối, trong hầm hoặc mưa tuyết dày.
// Vị trí các ô lấy từ chính dải ảnh toa (điểm ảnh tối trong thân toa, cùng cách đo kích cỡ cửa sổ ở winview.js), lưu theo từng dải để dùng lại; nếu ảnh không đọc được điểm ảnh (mở bằng file://) thì bỏ qua êm.
(function (root) {
  const hs = (a, b) => { const x = Math.sin(a * 12.9898 + (b || 0) * 78.233) * 43758.5453; return x - Math.floor(x); };
  function detect(sp) {
    const m = sp.meta, out = []; let d;
    try { const cv = document.createElement('canvas'); cv.width = m.width; cv.height = m.height; const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(sp.img, 0, 0); d = g.getImageData(0, 0, m.width, m.height).data; } catch (e) { return out; }
    const W = m.width, ppm = m.pxPerMeter, minW = Math.max(3, 0.38 * ppm);
    for (const car of m.cars) {
      const x0 = car.x, x1 = Math.min(W, car.x + car.w); let top = -1;
      for (let y = 0; y < m.height; y++) { let c = 0; for (let x = x0; x < x1; x += 2) if (d[(y * W + x) * 4 + 3] > 200) c++; if (c > 0.25 * (x1 - x0)) { top = y; break; } }
      if (top < 0) continue; const bandH = Math.max(4, Math.floor(0.62 * (m.railY - top))), thr = Math.max(3, 0.25 * bandH * 0.35);
      let st = -1;
      for (let x = x0; x <= x1; x++) { let c = 0; if (x < x1) for (let y = top; y < top + bandH; y++) { const i = (y * W + x) * 4; if (d[i + 3] > 200 && Math.max(d[i], d[i + 1], d[i + 2]) < 95) c++; }
        if (c > thr && st < 0) st = x;
        if ((c <= thr || x === x1) && st >= 0) { if (x - st >= minW) { let ya = -1, yb = -1; for (let y = top; y < top + bandH; y++) { let k = 0; for (let xx = st; xx < x; xx++) { const i = (y * W + xx) * 4; if (d[i + 3] > 200 && Math.max(d[i], d[i + 1], d[i + 2]) < 95) k++; } if (k > 0.6 * (x - st)) { if (ya < 0) ya = y; yb = y; } }
            if (ya >= 0 && (yb - ya + 1) < 1.1 * ppm) out.push([st, x, ya, yb + 1]); } st = -1; }
      }
    }
    return out;
  }
  function get(sp) { if (!sp || !sp.ready) return null; if (!sp._wl) sp._wl = detect(sp); return sp._wl; }
  // gọi cb(x0, x1, y0, y1, id) cho mọi ô giao với đoạn [a, b] của dải ảnh (px); các ô đã xếp theo x
  function overlap(list, a, b, cb) {
    if (!list || !list.length) return; let lo = 0, hi = list.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid][1] < a) lo = mid + 1; else hi = mid; }
    for (let i = lo; i < list.length; i++) { const w = list[i]; if (w[0] > b) break; cb(w[0], w[1], w[2], w[3], i); }
  }
  // mức sáng 0..1 theo bối cảnh tối
  const level = (night, inTun, wx) => Math.max(0, Math.min(1, night * 0.9 + (inTun ? 0.9 : 0) + (wx || 0) * 0.5));
  // màu ô sáng: vàng ấm; khoảng 15% ô có rèm kéo nên mờ hơn
  const fill = (id, lv) => 'rgba(255,226,150,' + (hs(id, 7) < 0.15 ? 0.3 : 0.88) * lv + ')';
  root.WinLit = { get, overlap, level, fill };
})(typeof window !== 'undefined' ? window : globalThis);
