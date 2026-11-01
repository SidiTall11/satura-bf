// Chaîne de production du fond de carte regional.
//
// Source : geoBoundaries Open, Burkina Faso ADM1 (les 13 regions), licence CC BY 4.0.
// Depot  : https://github.com/wmgeolab/geoBoundaries  -  API : https://www.geoboundaries.org
// Le fichier obtenu est simplifie puis vectorise en SVG par le site lui-meme :
// aucune tuile ni aucun service de cartographie n'est appele par le navigateur.
//
// Usage :  node tools/prep-carte.js  [chemin-du-geojson-brut-deja-telecharge]

const fs = require('node:fs');
const path = require('node:path');

const SOURCE = 'https://raw.githubusercontent.com/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/BFA/ADM1/geoBoundaries-BFA-ADM1_simplified.geojson';
const OUT = path.join(__dirname, '..', 'assets', 'geo', 'regions.json');

// Seuil de simplification en degres : 0.03 degre ~ 3 km. Les enclaves minuscules
// disparaissent, la forme des regions reste reconnaissable a l'ecran.
const EPSILON = 0.03;
const ARRONDI = 2;

function perpendiculaire(point, debut, fin) {
  const [x, y] = point;
  const [x1, y1] = debut;
  const [x2, y2] = fin;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const norme = Math.hypot(dx, dy);
  if (norme === 0) return Math.hypot(x - x1, y - y1);
  return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norme;
}

function douglasPeucker(points, epsilon) {
  if (points.length < 3) return points;
  let indice = -1;
  let distanceMax = 0;
  const dernier = points.length - 1;
  for (let i = 1; i < dernier; i += 1) {
    const d = perpendiculaire(points[i], points[0], points[dernier]);
    if (d > distanceMax) {
      distanceMax = d;
      indice = i;
    }
  }
  if (distanceMax <= epsilon) return [points[0], points[dernier]];
  const gauche = douglasPeucker(points.slice(0, indice + 1), epsilon);
  const droite = douglasPeucker(points.slice(indice), epsilon);
  return gauche.slice(0, -1).concat(droite);
}

function simplifierAnneau(anneau) {
  const reduit = douglasPeucker(anneau, EPSILON);
  return reduit.map(([lon, lat]) => [Number(lon.toFixed(ARRONDI)), Number(lat.toFixed(ARRONDI))]);
}

async function charger(cheminLocal) {
  if (cheminLocal) return JSON.parse(fs.readFileSync(cheminLocal, 'utf8'));
  const reponse = await fetch(SOURCE);
  if (!reponse.ok) throw new Error(`Telechargement impossible : ${reponse.status}`);
  return reponse.json();
}

async function main() {
  const brut = await charger(process.argv[2]);
  let avant = 0;
  let apres = 0;
  const regions = brut.features.map((feature) => {
    const anneaux = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const geometrie = anneaux.map((polygone) => polygone.map((anneau) => {
      avant += anneau.length;
      const reduit = simplifierAnneau(anneau);
      apres += reduit.length;
      return reduit;
    })).flat();
    return {
      nom: feature.properties.shapeName,
      code: feature.properties.shapeISO || feature.properties.shapeName,
      geometrie
    };
  }).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  const emprise = { ouest: 180, est: -180, sud: 90, nord: -90 };
  for (const region of regions) {
    for (const polygone of region.geometrie) {
      for (const [lon, lat] of polygone) {
        emprise.ouest = Math.min(emprise.ouest, lon);
        emprise.est = Math.max(emprise.est, lon);
        emprise.sud = Math.min(emprise.sud, lat);
        emprise.nord = Math.max(emprise.nord, lat);
      }
    }
  }

  const sortie = { source: 'geoBoundaries Open (CC BY 4.0)', projection: 'equirectangulaire', emprise, regions };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(sortie));

  const octets = fs.statSync(OUT).size;
  console.log(`regions        : ${regions.length}`);
  console.log(`points         : ${avant} -> ${apres}  (-${Math.round((1 - apres / avant) * 100)} %)`);
  console.log(`emprise        : ${emprise.ouest}, ${emprise.sud} -> ${emprise.est}, ${emprise.nord}`);
  console.log(`fichier        : ${path.relative(process.cwd(), OUT)}  ${Math.round(octets / 1024)} Ko`);
  console.log(`noms           : ${regions.map((r) => r.nom).join(', ')}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
