// Biểu tượng tự vẽ (nét vẽ, không dùng emoji): dùng chung cho canvas (Icons.draw) và HTML (Icons.svg / data-ic).
// Mỗi biểu tượng là danh sách nét trên lưới 24×24: [đường SVG, hệ số độ dày nét (tuỳ chọn)]; đường "h.01" + nét tròn dày là chấm.
(function (root) {
  'use strict';
  const P = {
    dice: [['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z'], ['M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01', 1.7]],
    phone: [['M7 2h10a1.5 1.5 0 0 1 1.5 1.5v17A1.5 1.5 0 0 1 17 22H7a1.5 1.5 0 0 1-1.5-1.5v-17A1.5 1.5 0 0 1 7 2z'], ['M10 19h4']],
    pin: [['M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z'], ['M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z']],
    camera: [['M3 8h3.5l1.8-2.5h7.4L17.5 8H21v11H3z'], ['M12 17a3.8 3.8 0 1 0 0-7.6A3.8 3.8 0 0 0 12 17z']],
    search: [['M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z'], ['M16 16l5.5 5.5']],
    train: [['M6 3h12a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2z'], ['M4 11h16'], ['M8 15h.01M16 15h.01', 1.6], ['M8 18l-2 3M16 18l2 3']],
    full: [['M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5']],
    pause: [['M8 5v14M16 5v14', 1.3]],
    back: [['M9 6L4 11l5 5'], ['M4 11h10a6 6 0 0 1 6 6v1']]
  };
  const cache = {};
  const Icons = {
    names: Object.keys(P),
    // vẽ vào canvas: tâm (cx, cy), cỡ s (px), màu col
    draw(ctx, name, cx, cy, s, col, lw) {
      const spec = P[name]; if (!spec || typeof Path2D === 'undefined') return;
      ctx.save(); ctx.translate(cx - s / 2, cy - s / 2); ctx.scale(s / 24, s / 24); ctx.strokeStyle = col || '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [d, k] of spec) { ctx.lineWidth = (lw || 2) * (k || 1); ctx.stroke(cache[d] || (cache[d] = new Path2D(d))); }
      ctx.restore();
    },
    // chuỗi SVG nhúng trong HTML (màu theo chữ xung quanh)
    svg(name, size, extra) {
      const spec = P[name]; if (!spec) return '';
      return '<svg class="ic" width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px' + (extra ? ';' + extra : '') + '">' +
        spec.map(([d, k]) => '<path d="' + d + '"' + (k ? ' stroke-width="' + 2 * k + '"' : '') + '/>').join('') + '</svg>';
    },
    // thay mọi phần tử có data-ic="tên" (kèm data-size) bằng biểu tượng SVG
    hydrate(el) { if (!root.document) return; for (const e of (el || root.document).querySelectorAll('[data-ic]')) e.innerHTML = Icons.svg(e.dataset.ic, +e.dataset.size || 16); }
  };
  root.Icons = Icons;
})(typeof window !== 'undefined' ? window : globalThis);
