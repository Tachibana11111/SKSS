// Đa ngôn ngữ (Anh, Nhật, Việt): khoá là chính câu tiếng Việt gốc, _t('câu gốc', a, b) điền {0}, {1}... vào bản dịch.
// Thiếu bản dịch thì dùng lại câu tiếng Việt. Ngôn ngữ chọn một lần lúc nạp trang (đổi ngôn ngữ = tải lại trang):
// lấy từ cài đặt đã lưu, nếu chưa có thì theo ngôn ngữ trình duyệt (vi/ja/en, còn lại là en); chạy ngoài trình duyệt (kiểm thử) luôn là vi.
(function (root) {
  const STORE_KEY = 'shinkansen-drive-v1', LANGS = ['en', 'ja', 'vi'], D = { en: {}, ja: {} };
  function detect() {
    if (root.__LANG && LANGS.includes(root.__LANG)) return root.__LANG;
    try { const s = root.localStorage && root.localStorage.getItem(STORE_KEY); if (s) { const l = JSON.parse(s).settings.lang; if (LANGS.includes(l)) return l; } } catch (e) { }
    if (typeof root.document === 'undefined') return 'vi';
    try { const nl = (root.navigator && (root.navigator.languages && root.navigator.languages.length ? root.navigator.languages : [root.navigator.language])) || []; for (const x of nl) { const p = String(x || '').toLowerCase().slice(0, 2); if (LANGS.includes(p)) return p; } } catch (e) { }
    return 'en';
  }
  const I18N = { lang: detect(), LANGS, dict: D };
  I18N.locale = { vi: 'vi-VN', en: 'en-GB', ja: 'ja-JP' }[I18N.lang];
  I18N.add = function (lang, obj) { Object.assign(D[lang] = D[lang] || {}, obj); };
  function fill(s, args) { return args.length ? s.replace(/\{(\d+)\}/g, (m, i) => (i < args.length ? String(args[i]) : m)) : s; }
  I18N.t = function (key, ...args) { const d = D[I18N.lang]; const s = d && Object.prototype.hasOwnProperty.call(d, key) ? d[key] : key; return fill(s, args); };
  // chuẩn hoá khoảng trắng để so khớp văn bản tĩnh trong HTML
  const norm = x => x.replace(/\s+/g, ' ').trim();
  // dịch văn bản tĩnh và thuộc tính (title, alt, placeholder, aria-label) của một nhánh DOM: khoá là nội dung đã chuẩn hoá khoảng trắng
  I18N.applyDom = function (el) {
    const d = D[I18N.lang]; if (!d || !el) return;
    const w = root.document.createTreeWalker(el, 4 /* SHOW_TEXT */, null); const nodes = []; for (let n = w.nextNode(); n; n = w.nextNode()) nodes.push(n);
    for (const n of nodes) { const p = n.parentNode; if (p && /^(SCRIPT|STYLE)$/.test(p.nodeName)) continue; const k = norm(n.nodeValue); if (k && Object.prototype.hasOwnProperty.call(d, k)) { const m = n.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/); n.nodeValue = m[1] + d[k] + m[2]; } }
    const all = el.querySelectorAll ? el.querySelectorAll('[title],[alt],[placeholder],[aria-label]') : [];
    for (const e of all) for (const a of ['title', 'alt', 'placeholder', 'aria-label']) { const v = e.getAttribute(a); if (v) { const k = norm(v); if (Object.prototype.hasOwnProperty.call(d, k)) e.setAttribute(a, d[k]); } }
  };
  // tên ga hiển thị: tiếng Nhật dùng chữ Hán (jp), các ngôn ngữ khác giữ chữ La-tinh (en); tên tuyến tiếng Nhật lấy từ meta.pa (+ 新幹線)
  I18N.stn = s => (I18N.lang === 'ja' && s.jp) ? s.jp : s.en;
  I18N.ln = L => (I18N.lang === 'ja' && L.meta && L.meta.pa) ? L.meta.pa + '新幹線' : L.name;
  root.I18N = I18N; root._t = I18N.t; root._s = I18N.stn; root._ln = I18N.ln;
})(typeof window !== 'undefined' ? window : globalThis);
