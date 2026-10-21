// Kiểm tra mô phỏng bằng tự lái. Chạy: node selftest.js
global.window = {};
require('./data-tokaido.js');
const Sim = require('./sim.js');
const CAT = global.window.TOKAIDO_UP;
const find = (type, no) => CAT.find(r => r[0] === type && r[1] === no);
function run(rec, dir, fromI, toI, diff, weather, seed, verbose) {
  const trip = Sim.makeTrip(rec, dir, fromI, toI);
  if (!trip) return null;
  const W = Sim.createWorld(CAT, trip, { diff, weather, seed });
  const T = W.player; let n = 0;
  while (!T.finished && n < 3e6) { Sim.tick(W, 0.05, {}, true); n++; if (W.t > 20000) break; }
  const sc = Sim.score(T, W);
  return { W, T, sc, n };
}
const cases = [
  [find('Nozomi', '230'), 'up', 16, 0, 'normal', 'auto', 1],
  [find('Nozomi', '230'), 'up', 16, 12, 'normal', 'rain', 2],
  [find('Nozomi', '230'), 'down', 0, 16, 'hard', 'typhoon', 3],
  [find('Nozomi', '230'), 'up', 16, 0, 'expert', 'eqk', 4],
  [find('Nozomi', '230'), 'up', 16, 0, 'normal', 'snow', 5],
];
const kod = CAT.find(r => r[0] === 'Kodama'); const hik = CAT.find(r => r[0] === 'Hikari');
cases.push([kod, 'up', 16, kod[2][kod[2].length - 1][0], 'easy', 'clear', 6]);
cases.push([hik, 'up', 16, hik[2][hik[2].length - 1][0], 'hard', 'auto', 7]);
for (const c of cases) {
  const r = run(...c);
  if (!r) { console.log('bỏ qua', c[0][0], c[0][1]); continue; }
  const lastErr = r.T.results.map(x => (x.overrun ? 'QUÁ' : x.err.toFixed(1))).join(',');
  console.log(`${c[0][0]} ${c[0][1]} ${c[1]} ${Sim.STN[c[2]][0]}→${Sim.STN[c[3]][0]} ${c[4]}/${c[5]} t=${Sim.fmtT(r.W.t)} điểm=${r.sc.final} kết=${r.T.finished} lead=${r.W.leadLabel || '-'} atc=${r.T.atcCount} msgs=${r.W.msgs.length} lệch[${lastErr}]`);
  if (process.argv[2] === '-v') r.W.msgs.forEach(m => console.log('   ', Sim.fmtT(m.t), m.kind, m.text));
}
