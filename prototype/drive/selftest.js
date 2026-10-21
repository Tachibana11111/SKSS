// Kiểm tra nhanh bằng tự lái: node selftest.js
global.window = global; require('./data-lines.js'); const Sim = require('./sim.js');
const cases = [['tsk','Nozomi','down',0,16,'normal','clear',1],['tsk','Nozomi','up',16,0,'normal','rain',2],['tsk','Hikari','down',0,16,'hard','typhoon',3],['tsk','Kodama','down',0,16,'easy','clear',4],['toh','Hayabusa','down',0,22,'normal','auto',5],['tsk','Mizuho','down',16,45,'normal','auto',6]];
for (const [ln, type, dir, a, b, diff, wx, seed] of cases) {
  const L = Sim.lineOf(ln), rec = L.trains.find(t => t.t === type && t.d === dir && t.s.some(e => e[0] === a && !e[3]) && t.s.some(e => e[0] === b && !e[3]));
  if (!rec) { console.log('bỏ qua', ln, type, dir, a, b); continue; }
  const trip = Sim.makeTrip(ln, rec, a, b), W = Sim.createWorld(ln, trip, { diff, weather: wx, seed }), T = W.player; let n = 0;
  while (!T.finished && n++ < 4e6 && W.t < 40000) Sim.tick(W, 0.05, {}, true);
  const sc = Sim.score(T, W);
  console.log(`${ln} ${type} ${rec.n} ${dir} ${L.stations[a].en}→${L.stations[b].en} ${diff}/${wx} veh=${rec.v} t=${Sim.fmtT(W.t)} kế hoạch=${Sim.fmtT(trip.M[trip.M.length-1].arr)} điểm=${sc.final} fin=${T.finished} atc=${T.atcCount} kWh=${sc.kwh} btMax=${(T.btMax||0).toFixed(2)}`);
}
