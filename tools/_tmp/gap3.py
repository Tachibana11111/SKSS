import sys, pickle, math
sys.path.insert(0, 'D:/Shinkansen/tools')
import numpy as np
import osm_align as A
ways, nodes = pickle.load(open('D:/Shinkansen/data-osm/rails.pkl', 'rb'))
adj = A.build('toh', ways, nodes)
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
ids = np.array(list(adj)); pos = {int(r): i for i, r in enumerate(ids)}
rows = [pos[u] for u in adj for v, _ in adj[u]]; cols = [pos[v] for u in adj for v, _ in adj[u]]
n, lab = connected_components(coo_matrix((np.ones(len(rows)), (rows, cols)), shape=(len(ids), len(ids))), directed=False)
sz = np.bincount(lab); big = np.argsort(-sz)[:8]
for c in big:
    m = np.where(lab == c)[0]; la = [nodes[int(ids[i])][0] for i in m]; print('comp', c, sz[c], 'lat', round(min(la), 2), round(max(la), 2))
# trong thành phần lớn nhất: tìm đầu mút (bậc 1) trong khoảng 36.4-37.1
c0 = big[0]; m = np.where(lab == c0)[0]
ends = [int(ids[i]) for i in m if len(adj[int(ids[i])]) == 1]
print('đầu mút', len(ends)); 
for e in ends:
    la, lo = nodes[e]
    if 36.3 < la < 37.2: print(' ', e, round(la, 4), round(lo, 4))
