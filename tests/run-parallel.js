// Chạy bộ kiểm thử song song: node tests/run-parallel.js [--jobs=N]
// Mỗi phần của tests/run.js chạy trong một tiến trình riêng (--only=k), tối đa N tiến trình cùng lúc, phần chậm nhất xếp trước (thời gian đo lần chạy trước lưu ở tests/.timings.json).
// Thời gian ≈ phần chậm nhất (hoặc tổng/N nếu nhiều phần chậm), thay vì tổng như chạy tuần tự. Thoát mã 0 nếu mọi phần đều không lỗi, ngược lại mã 1.
// Lưu ý: các kiểm tra dùng đồng hồ thật (phát thanh) có thể kém ổn định khi máy quá tải: dùng --jobs nhỏ hơn nếu thấy lỗi lẻ tẻ.
const { spawn, spawnSync } = require('child_process'), os = require('os'), path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..'), RUN = path.join(__dirname, 'run.js'), TIMES = path.join(__dirname, '.timings.json');
const arg = (process.argv.find(a => a.startsWith('--jobs=')) || '').slice(7), N = Math.max(1, Math.min(16, +arg || Math.min(8, Math.max(2, os.cpus().length - 1))));
const cnt = spawnSync(process.execPath, [RUN, '--only=-1', '--count'], { cwd: ROOT, encoding: 'utf8' }), m0 = /SECTIONS (\d+)/.exec(cnt.stdout || '');
if (!m0) { console.log('Không đếm được số phần:\n' + (cnt.stdout || '') + (cnt.stderr || '')); process.exit(1); }
const total = +m0[1]; let times = {}; try { times = JSON.parse(fs.readFileSync(TIMES, 'utf8')); } catch (e) { }
const SPLIT = { 1: 4 };      // phần 1 (tự lái mọi chuyến, phần chậm nhất) chia 4 lát --sub=a/4
const queue = []; for (let k = 1; k < total; k++) { if (SPLIT[k]) for (let q = 0; q < SPLIT[k]; q++) queue.push({ k, sub: q + '/' + SPLIT[k], id: k + '.' + q }); else queue.push({ k, id: String(k) }); }
queue.sort((a, b) => (times[b.id] || 60) - (times[a.id] || 60));      // phần 0 (dữ liệu) chạy kèm trong mọi tiến trình
const t0 = Date.now(), results = []; let next = 0, running = 0, doneN = 0;
function runOne(task) {
  return new Promise(res => {
    const k = task.k, s0 = Date.now(), p = spawn(process.execPath, [RUN, '--only=' + k].concat(task.sub ? ['--sub=' + task.sub] : []), { cwd: ROOT }); let out = '';
    p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
    p.on('close', code => { const mm = /KẾT QUẢ: (\d+) đạt, (\d+) lỗi/.exec(out), title = (/== ([^\n]*)/g.exec(out.split('== ').slice(2, 3).map(x => '== ' + x).join('')) || [])[1] || ''; res({ k, id: task.id, code, out, pass: mm ? +mm[1] : 0, fail: mm ? +mm[2] : -1, sec: (Date.now() - s0) / 1000, title }); });
  });
}
async function worker() { while (next < queue.length) { const task = queue[next++], r = await runOne(task); results.push(r); times[task.id] = Math.round(r.sec); doneN++; console.log('  phần ' + task.id + ' (' + doneN + '/' + queue.length + '): ' + (r.fail === 0 ? 'đạt' : r.fail < 0 ? 'KHÔNG CHẠY XONG (mã ' + r.code + ')' : r.fail + ' lỗi') + ' · ' + r.sec.toFixed(0) + ' s'); } }
(async () => {
  console.log('Chạy ' + queue.length + ' phần trên ' + N + ' tiến trình...');
  await Promise.all(Array.from({ length: N }, worker));
  try { fs.writeFileSync(TIMES, JSON.stringify(times)); } catch (e) { }
  const lines = new Set(); let crashed = 0, pass = 0;
  for (const r of results) { pass += Math.max(0, r.pass); if (r.fail < 0) { crashed++; console.log('\n--- phần ' + r.id + ' dừng giữa chừng ---\n' + r.out.split('\n').slice(-20).join('\n')); } for (const l of r.out.split('\n')) if (/^\s+✗/.test(l)) lines.add(l); }
  const slow = results.slice().sort((a, b) => b.sec - a.sec).slice(0, 4).map(r => 'phần ' + r.id + ' ' + r.sec.toFixed(0) + ' s').join(', ');
  console.log('\nTổng: ' + pass + ' lượt kiểm (phần 0 tính nhiều lần), ' + lines.size + ' lỗi khác nhau, ' + crashed + ' phần sập, ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s. Chậm nhất: ' + slow);
  for (const l of lines) console.log(l);
  process.exit(lines.size || crashed ? 1 : 0);
})();
