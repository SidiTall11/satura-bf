const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');

// Reveal content as it enters the viewport, with a graceful no-JS fallback.
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('js-motion');
  const revealTargets = document.querySelectorAll(
    '.mission-grid, .principles article, .path-heading, .steps article, .path-foot, .platform-heading, .feature, .quote-band blockquote, .action-content, .timeline-item, .phone-benefits h2, .benefit-grid article, .phone-reminder h2',
  );
  revealTargets.forEach((element, index) => {
    element.classList.add('reveal');
    if (element.matches('.principles article, .steps article, .feature')) {
      element.classList.add(`reveal-delay-${(index % 3) + 1}`);
    }
  });

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });

  revealTargets.forEach((element) => observer.observe(element));
}

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation?.classList.toggle('open', !isOpen);
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('open');
  });
});

document.querySelector('.notice-close')?.addEventListener('click', () => {
  document.querySelector('.notice')?.remove();
});

document.querySelectorAll('.notice-quit, .quick-exit').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.replace('about:blank');
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.querySelector('.notice-quit, .quick-exit')) {
    window.location.replace('about:blank');
  }
});



// Annuaire: local filtering, no third-party tracking or user data submission.
const resourceSearch = document.querySelector('#resource-search');
const resourceKind = document.querySelector('#resource-kind');
const resourceCards = [...document.querySelectorAll('#resource-list .resource-card')];
const resourceCount = document.querySelector('#directory-count');
function filterResources() {
  const query = (resourceSearch?.value || '').trim().toLocaleLowerCase('fr');
  const kind = resourceKind?.value || 'all';
  let visible = 0;
  resourceCards.forEach((card) => {
    const matchesText = `${card.textContent} ${card.dataset.search || ''}`.toLocaleLowerCase('fr').includes(query);
    const matchesKind = kind === 'all' || card.dataset.kind === kind;
    const show = matchesText && matchesKind;
    card.hidden = !show;
    if (show) visible += 1;
  });
  if (resourceCount) resourceCount.textContent = `${visible} ressource${visible > 1 ? 's' : ''} affichée${visible > 1 ? 's' : ''}`;
}
resourceSearch?.addEventListener('input', filterResources);
resourceKind?.addEventListener('change', filterResources);
// Fail closed: never send contact data until an approved endpoint is configured.
document.querySelector('#contact-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const status = document.querySelector('#contact-status');
  if (status) status.textContent = 'Le formulaire est désactivé. Aucune donnée n’a été envoyée.';
});

// Carte de couverture : les limites régionales et les positions sont lues en fichiers
// statiques locaux et calculées dans le navigateur. Aucune tuile, aucun service externe.
const rayonTerre = 6371;

function dansAnneau(anneau, lon, lat) {
  let interieur = false;
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    const [xi, yi] = anneau[i];
    const [xj, yj] = anneau[j];
    if ((yi > lat) !== (yj > lat) && lon < xj + ((lat - yi) * (xi - xj)) / (yi - yj)) interieur = !interieur;
  }
  return interieur;
}

function regionContenant(regions, lon, lat) {
  return regions.find((region) => region.geometrie.some((anneau) => dansAnneau(anneau, lon, lat)));
}

function plusGrandAnneau(region) {
  return region.geometrie.reduce((largest, anneau) => (anneau.length > largest.length ? anneau : largest), []);
}

function centreGeographique(anneau) {
  let aire = 0;
  let lon = 0;
  let lat = 0;
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    const [x0, y0] = anneau[j];
    const [x1, y1] = anneau[i];
    const croix = x0 * y1 - x1 * y0;
    aire += croix;
    lon += (x0 + x1) * croix;
    lat += (y0 + y1) * croix;
  }
  aire *= 0.5;
  if (Math.abs(aire) < 1e-12) return { lat: anneau[0][1], lon: anneau[0][0] };
  return { lat: lat / (6 * aire), lon: lon / (6 * aire) };
}

function aVolDoiseau(lat1, lon1, lat2, lon2) {
  const radians = (degres) => (degres * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * rayonTerre * Math.asin(Math.sqrt(h));
}

function lireJson(chemin) {
  return fetch(chemin).then((reponse) => {
    if (!reponse.ok) throw new Error(`${chemin} : ${reponse.status}`);
    return reponse.json();
  });
}

function noeudSvg(nom, attributs) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', nom);
  Object.entries(attributs).forEach(([cle, valeur]) => element.setAttribute(cle, String(valeur)));
  return element;
}

function noeudHtml(nom, classe, texte) {
  const element = document.createElement(nom);
  if (classe) element.className = classe;
  if (texte !== undefined) element.textContent = texte;
  return element;
}

function remplir(panel, enfants) {
  panel.replaceChildren(...enfants.filter(Boolean));
}

async function chargerCouverture(frame, detail) {
  try {
    const [territoire, annuaire] = await Promise.all([
      lireJson('assets/geo/regions.json'),
      lireJson('assets/geo/structures.json'),
    ]);
    dessinerCouverture(frame, detail, territoire, annuaire.structures);
  } catch {
    frame.hidden = true;
    detail.hidden = true;
    const repli = document.querySelector('#map-unavailable');
    if (repli) repli.hidden = false;
  }
}

function dessinerCouverture(frame, detail, territoire, structures) {
  const emprise = territoire.emprise;
  const regions = territoire.regions;
  const correctif = Math.cos((((emprise.nord + emprise.sud) / 2) * Math.PI) / 180);
  const marge = 8;
  const echelle = 520 / (emprise.nord - emprise.sud);
  const largeur = (emprise.est - emprise.ouest) * correctif * echelle + 2 * marge;
  const hauteur = (emprise.nord - emprise.sud) * echelle + 2 * marge;
  const abscisse = (lon) => (lon - emprise.ouest) * correctif * echelle + marge;
  const ordonnee = (lat) => (emprise.nord - lat) * echelle + marge;

  const parRegion = new Map();
  structures.forEach((structure) => {
    const region = regionContenant(regions, structure.lon, structure.lat);
    if (!region) return;
    parRegion.set(region.code, [...(parRegion.get(region.code) || []), structure]);
  });

  const mesures = regions.map((region) => {
    const centre = centreGeographique(plusGrandAnneau(region));
    let proche = null;
    let kilometres = Infinity;
    structures.forEach((structure) => {
      const distance = aVolDoiseau(centre.lat, centre.lon, structure.lat, structure.lon);
      if (distance < kilometres) {
        kilometres = distance;
        proche = structure;
      }
    });
    return { region, centre, proche, kilometres, locales: parRegion.get(region.code) || [] };
  });

  const svg = noeudSvg('svg', {
    class: 'coverage-svg',
    viewBox: `0 0 ${largeur.toFixed(1)} ${hauteur.toFixed(1)}`,
    role: 'group',
    'aria-label': `Carte des ${regions.length} régions du Burkina Faso. ${parRegion.size} régions comptent un point d’aide vérifié.`,
  });

  let epingle = null;

  function relacher() {
    svg.querySelectorAll('.is-active').forEach((element) => element.classList.remove('is-active'));
    if (epingle) {
      epingle.classList.add('is-active');
      return;
    }
    afficherResume();
  }

  function activer(chemin, mesure) {
    svg.querySelectorAll('.is-active').forEach((element) => element.classList.remove('is-active'));
    chemin.classList.add('is-active');
    afficherRegion(mesure);
  }

  mesures.forEach((mesure) => {
    const couvert = mesure.locales.length > 0;
    const chemin = noeudSvg('path', {
      d: mesure.region.geometrie.map((anneau) => anneau
        .map(([lon, lat], index) => `${index ? 'L' : 'M'}${abscisse(lon).toFixed(1)} ${ordonnee(lat).toFixed(1)}`)
        .join('') + 'Z').join(' '),
      class: `region${couvert ? ' is-covered' : ''}`,
      tabindex: '0',
      role: 'button',
      'aria-label': `${mesure.region.nom} : ${couvert ? `${mesure.locales.length} point d’aide vérifié` : 'aucun point d’aide vérifié'}`,
    });
    const titre = noeudSvg('title', {});
    titre.textContent = mesure.region.nom;
    chemin.append(titre);
    chemin.addEventListener('mouseenter', () => activer(chemin, mesure));
    chemin.addEventListener('focus', () => activer(chemin, mesure));
    chemin.addEventListener('mouseleave', relacher);
    chemin.addEventListener('blur', relacher);
    chemin.addEventListener('click', () => {
      epingle = chemin;
      activer(chemin, mesure);
    });
    chemin.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      epingle = chemin;
      activer(chemin, mesure);
    });
    svg.append(chemin);
  });

  structures.forEach((structure) => {
    const mesure = mesures.find((item) => item.locales.includes(structure));
    const groupe = noeudSvg('g', {
      class: 'structure-marker',
      tabindex: '0',
      role: 'button',
      'aria-label': `${structure.nom}, ${structure.localite} : position au centre de la localité.`,
    });
    groupe.append(
      noeudSvg('circle', { cx: abscisse(structure.lon).toFixed(1), cy: ordonnee(structure.lat).toFixed(1), r: 8, class: 'marker-halo' }),
      noeudSvg('circle', { cx: abscisse(structure.lon).toFixed(1), cy: ordonnee(structure.lat).toFixed(1), r: 4.5, class: 'marker-dot' }),
    );
    if (!mesure) {
      svg.append(groupe);
      return;
    }
    const chemin = svg.querySelector(`[aria-label^="${mesure.region.nom} :"]`);
    const afficher = () => {
      if (!chemin) return;
      activer(chemin, mesure);
    };
    groupe.addEventListener('mouseenter', afficher);
    groupe.addEventListener('focus', afficher);
    groupe.addEventListener('mouseleave', relacher);
    groupe.addEventListener('blur', relacher);
    groupe.addEventListener('click', () => {
      epingle = chemin;
      afficher();
    });
    svg.append(groupe);
  });

  const chiffres = (paires) => {
    const bloc = noeudHtml('div', 'map-figure');
    paires.forEach(([valeur, libelle]) => {
      const colonne = document.createElement('div');
      colonne.append(noeudHtml('strong', undefined, valeur), noeudHtml('span', undefined, libelle));
      bloc.append(colonne);
    });
    return bloc;
  };

  function afficherResume() {
    const couvertes = mesures.filter((mesure) => mesure.locales.length > 0);
    const sansCouverture = mesures.filter((mesure) => mesure.locales.length === 0);
    const eloignee = sansCouverture.sort((a, b) => b.kilometres - a.kilometres)[0];
    const avertissement = eloignee
      ? `Le contact vérifié le plus éloigné reste à ${Math.round(eloignee.kilometres)} km à vol d’oiseau du centre de la région ${eloignee.region.nom} (${eloignee.proche.localite}).`
      : null;
    remplir(detail, [
      noeudHtml('p', 'map-detail-eyebrow', 'COUVERTURE NATIONALE'),
      noeudHtml('h3', 'map-detail-title', `${couvertes.length} régions sur ${mesures.length}`),
      chiffres([[String(mesures.length), 'régions'], [String(couvertes.length), 'avec un contact vérifié'], [String(structures.length), 'points d’aide localisés']]),
      noeudHtml('p', 'map-detail-text', `Seules les structures publiées par leurs propres sites officiels sont géolocalisées. Les ${sansCouverture.length} régions grises n’ont encore aucun contact vérifié.`),
      avertissement && noeudHtml('p', 'map-detail-warning', avertissement),
      noeudHtml('p', 'map-detail-hint', 'Survolez une région ou atteignez-la au clavier avec la touche Tab pour lire son état.'),
    ]);
  }

  function afficherRegion(mesure) {
    const couvert = mesure.locales.length > 0;
    const liste = couvert
      ? (() => {
        const ul = document.createElement('ul');
        ul.className = 'map-structures';
        mesure.locales.forEach((structure) => {
          const item = document.createElement('li');
          item.append(
            noeudHtml('strong', undefined, structure.nom),
            noeudHtml('span', undefined, `${structure.localite} · ${structure.telephones.join(' · ')}`),
          );
          ul.append(item);
        });
        return ul;
      })()
      : noeudHtml('p', 'map-detail-warning', 'Aucune orientation n’est possible dans cette région aujourd’hui : le contact y reste à vérifier. Sutura l’affiche plutôt que de la masquer.');
    const definition = document.createElement('dl');
    definition.className = 'map-data';
    [
      ['Région la plus proche', couvert ? 'Sur place' : `${mesure.proche.localite}`],
      ['Distance à vol d’oiseau', couvert ? '—' : `≈ ${Math.round(mesure.kilometres)} km`],
      ['Centre géographique', `${mesure.centre.lat.toFixed(2)}, ${mesure.centre.lon.toFixed(2)}`],
    ].forEach(([terme, valeur]) => {
      definition.append(noeudHtml('dt', undefined, terme), noeudHtml('dd', undefined, valeur));
    });
    remplir(detail, [
      noeudHtml('p', 'map-detail-eyebrow', 'RÉGION'),
      noeudHtml('h3', 'map-detail-title', mesure.region.nom),
      noeudHtml('p', `map-detail-chip ${couvert ? 'is-covered' : 'is-empty'}`, couvert ? 'Point d’aide vérifié' : 'Aucun point d’aide vérifié'),
      liste,
      definition,
      noeudHtml('p', 'map-detail-note', 'Distance mesurée depuis le centre géographique de la région, à vol d’oiseau : elle est indicative et ne remplace pas un temps de trajet.'),
    ]);
  }

  frame.replaceChildren(svg);
  frame.removeAttribute('aria-label');
  afficherResume();
}

const coverageFrame = document.querySelector('#coverage-map');
const coverageDetail = document.querySelector('#map-detail');
if (coverageFrame && coverageDetail) chargerCouverture(coverageFrame, coverageDetail);
