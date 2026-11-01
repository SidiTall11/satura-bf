const g = require('../assets/geo/regions.json');
const s = require('../assets/geo/structures.json');
const R = 6371;
function dansAnneau(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < xj + ((lat - yi) * (xi - xj)) / (yi - yj)) inside = !inside;
  }
  return inside;
}
function region(lon, lat) {
  return g.regions.find(r => r.geometrie.some(ring => dansAnneau(ring, lon, lat)));
}
function centre(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j], [x1, y1] = ring[i];
    const f = x0 * y1 - x1 * y0;
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-12) return [ring[0][1], ring[0][0]];
  return [cy / (6 * a), cx / (6 * a)];
}
function haversine(la1, lo1, la2, lo2) {
  const r = d => d * Math.PI / 180;
  const dla = r(la2 - la1), dlo = r(lo2 - lo1);
  const h = Math.sin(dla / 2) ** 2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(dlo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
console.log('--- rattachement geometrique ---');
for (const st of s.structures) {
  const r = region(st.lon, st.lat);
  console.log(`${st.nom.padEnd(24)} ${r ? r.nom : 'HORS CARTE'} (déclaré: ${st.region_declaree}) ${r && r.nom === st.region_declaree ? 'OK' : 'DESACCORD'}`);
}
console.log('--- centre geographique et distance a la structure la plus proche ---');
for (const r of g.regions) {
  const [la, lo] = centre(r.geometrie[0]);
  let best = null, d = Infinity;
  for (const st of s.structures) {
    const dist = haversine(la, lo, st.lat, st.lon);
    if (dist < d) { d = dist; best = st; }
  }
  const nb = s.structures.filter(st => region(st.lon, st.lat) === r).length;
  console.log(`${r.nom.padEnd(20)} ${la.toFixed(2)},${lo.toFixed(2)}  sur place:${nb}  plus proche:${best.localite} ${Math.round(d)} km`);
}
