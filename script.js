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

// Mode hors ligne : rien n'est enregistré sur l'appareil sans un geste explicite.
const CACHE_HORS_LIGNE = 'sutura-hors-ligne-v1';
const horsLigneDisponible = 'serviceWorker' in navigator && 'caches' in window && window.isSecureContext;
const dateLisible = (date) => date.toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

async function dateDeLaCopie() {
  // caches.open créerait un cache vide : on vérifie son existence sans laisser de trace.
  if (!(await caches.has(CACHE_HORS_LIGNE))) return null;
  const etat = await caches.match('hors-ligne-etat', { cacheName: CACHE_HORS_LIGNE });
  if (!etat) return null;
  const { miseAJour } = await etat.json();
  return new Date(miseAJour);
}

function installationTerminee(inscription) {
  return new Promise((resolve, reject) => {
    const travailleur = inscription.installing || inscription.waiting;
    if (!travailleur) return resolve();
    travailleur.addEventListener('statechange', () => {
      if (travailleur.state === 'activated') resolve();
      if (travailleur.state === 'redundant') reject(new Error('installation interrompue'));
    });
  });
}

async function signalerConnexion() {
  const present = document.querySelector('.offline-banner');
  if (navigator.onLine) {
    present?.remove();
    return;
  }
  const date = navigator.serviceWorker.controller ? await dateDeLaCopie() : null;
  const bandeau = present || noeudHtml('p', 'offline-banner');
  bandeau.setAttribute('role', 'status');
  bandeau.textContent = date
    ? `Hors connexion. Vous lisez la copie enregistrée sur cet appareil, mise à jour le ${dateLisible(date)}. Les numéros d’urgence fonctionnent : un appel téléphonique ne passe pas par Internet.`
    : 'Connexion perdue. Cette page reste lisible tant qu’elle est ouverte, et les numéros d’urgence s’appellent sans Internet.';
  if (!present) {
    const notice = document.querySelector('.notice');
    if (notice) notice.after(bandeau);
    else document.body.prepend(bandeau);
  }
}

if (horsLigneDisponible) {
  window.addEventListener('offline', signalerConnexion);
  window.addEventListener('online', signalerConnexion);
  if (!navigator.onLine) signalerConnexion();
}

const carteHorsLigne = document.querySelector('#hors-ligne');
if (carteHorsLigne && horsLigneDisponible) {
  const boutonActiver = document.querySelector('#offline-enable');
  const boutonRetirer = document.querySelector('#offline-remove');
  const statut = document.querySelector('#offline-status');
  carteHorsLigne.hidden = false;

  const afficherEtat = async () => {
    const date = await dateDeLaCopie();
    boutonActiver.hidden = Boolean(date);
    boutonRetirer.hidden = !date;
    carteHorsLigne.classList.toggle('is-saved', Boolean(date));
    statut.textContent = date ? `Enregistré sur cet appareil · dernière mise à jour le ${dateLisible(date)}.` : '';
    return date;
  };

  boutonActiver.addEventListener('click', async () => {
    boutonActiver.disabled = true;
    statut.textContent = 'Enregistrement en cours…';
    try {
      await installationTerminee(await navigator.serviceWorker.register('sw.js'));
      if (!(await afficherEtat())) throw new Error('copie absente');
      statut.textContent += ' Vous pouvez couper la connexion : ces pages s’ouvriront quand même.';
      boutonRetirer.focus();
    } catch {
      statut.textContent = 'L’enregistrement n’a pas abouti. Vérifiez la connexion, puis réessayez.';
    }
    boutonActiver.disabled = false;
  });

  boutonRetirer.addEventListener('click', async () => {
    boutonRetirer.disabled = true;
    const inscriptions = await navigator.serviceWorker.getRegistrations();
    await Promise.all(inscriptions.map((inscription) => inscription.unregister()));
    const noms = await caches.keys();
    await Promise.all(noms.filter((nom) => nom.startsWith('sutura-hors-ligne-')).map((nom) => caches.delete(nom)));
    boutonRetirer.disabled = false;
    await afficherEtat();
    statut.textContent = 'La copie hors ligne a été retirée de ce navigateur. Sur un appareil partagé, pensez aussi à effacer l’historique de navigation.';
    boutonActiver.focus();
  });

  afficherEtat();
}



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

// Le centre géographique d'une région concave tombe parfois hors d'elle : on décale
// l'ancrage du libellé le long d'une direction cardinale jusqu'à rester dans la région.
function ancrageDuLibelle(region, centre) {
  const dedans = (lon, lat) => region.geometrie.some((anneau) => dansAnneau(anneau, lon, lat));
  if (dedans(centre.lon, centre.lat)) return centre;
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
  for (let pas = 0.2; pas <= 3; pas += 0.2) {
    for (const [dx, dy] of directions) {
      const lon = centre.lon + dx * pas;
      const lat = centre.lat + dy * pas;
      if (dedans(lon, lat)) return { lat, lon };
    }
  }
  return centre;
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

function etiquette(x, y, texte, classes) {
  const element = noeudSvg('text', { x: x.toFixed(1), y: y.toFixed(1), class: classes });
  element.textContent = texte;
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
  const boutonReprise = document.querySelector('#map-reset');

  // Renvoie le cadre d'une région, élargi au contact vérifié le plus proche quand la
  // région n'en compte aucun : l'écart kilométrique annoncé dans le panneau se voit.
  function cadre(mesure) {
    let ouest = Infinity;
    let est = -Infinity;
    let haut = Infinity;
    let bas = -Infinity;
    mesure.region.geometrie.forEach((anneau) => anneau.forEach(([lon, lat]) => {
      const x = abscisse(lon);
      const y = ordonnee(lat);
      ouest = Math.min(ouest, x);
      est = Math.max(est, x);
      haut = Math.min(haut, y);
      bas = Math.max(bas, y);
    }));
    const region = { ouest, est, haut, bas };
    const horsPortee = mesure.locales.length === 0 && mesure.proche;
    if (!horsPortee) {
      return { ...region, largeur: est - ouest, hauteur: bas - haut, horsPortee: false };
    }
    const x = abscisse(mesure.proche.lon);
    const y = ordonnee(mesure.proche.lat);
    return {
      ouest: Math.min(ouest, x),
      haut: Math.min(haut, y),
      largeur: Math.max(est, x) - Math.min(ouest, x),
      hauteur: Math.max(bas, y) - Math.min(haut, y),
      horsPortee: true,
      aGauche: x <= region.ouest + 1,
      aDroite: x >= region.est - 1,
      auDessus: y <= region.haut + 1,
      auDessous: y >= region.bas - 1,
    };
  }

  // Le dessin est mis à l'échelle par le navigateur : les marqueurs et les libellés
  // sont recalculés en unités utilisateur pour rester lisibles quand on zoome.
  function ajusterEchelle() {
    const vue = svg.getAttribute('viewBox').split(' ').map(Number);
    const ratio = vue[2] / (svg.getBoundingClientRect().width || vue[2]);
    svg.style.setProperty('--k', ratio.toFixed(3));
    svg.querySelectorAll('.marker-halo').forEach((cercle) => cercle.setAttribute('r', (8 * ratio).toFixed(2)));
    svg.querySelectorAll('.marker-dot').forEach((cercle) => cercle.setAttribute('r', (4.6 * ratio).toFixed(2)));
    svg.querySelectorAll('.locality-label').forEach((libelle) => {
      const cote = Number(libelle.dataset.cote);
      libelle.setAttribute('x', (Number(libelle.dataset.x) + 11 * ratio * cote).toFixed(1));
      libelle.setAttribute('y', (Number(libelle.dataset.y) + 4 * ratio).toFixed(1));
    });
    // Un libellé qui dépasse du cadre serait coupé en plein mot : on le retire.
    const depasse = (libelle) => {
      if (getComputedStyle(libelle).display === 'none') return false;
      const b = libelle.getBBox();
      return b.x < vue[0] || b.y < vue[1] || b.x + b.width > vue[0] + vue[2] || b.y + b.height > vue[1] + vue[3];
    };
    svg.querySelectorAll('.locality-label, .region-label').forEach((libelle) => libelle.classList.toggle('is-out', depasse(libelle)));
  }

  function encadrer(mesure) {
    const b = cadre(mesure);
    const marge = 26;
    let gauche = marge;
    let droite = marge;
    let haut = marge;
    let bas = marge;
    if (b.horsPortee) {
      // Le contact désigné par la liaison doit rester nommé dans le cadre :
      // la place de son libellé s'ajoute du côté où il se trouve.
      if (b.aGauche) gauche += 90;
      if (b.aDroite) droite += 90;
      if (b.auDessus) haut += 40;
      if (b.auDessous) bas += 40;
      liaison.setAttribute('x1', abscisse(mesure.centre.lon).toFixed(1));
      liaison.setAttribute('y1', ordonnee(mesure.centre.lat).toFixed(1));
      liaison.setAttribute('x2', abscisse(mesure.proche.lon).toFixed(1));
      liaison.setAttribute('y2', ordonnee(mesure.proche.lat).toFixed(1));
    }
    svg.classList.add('is-zoomed');
    svg.setAttribute('viewBox', `${(b.ouest - gauche).toFixed(1)} ${(b.haut - haut).toFixed(1)} ${(b.largeur + gauche + droite).toFixed(1)} ${(b.hauteur + haut + bas).toFixed(1)}`);
    liaison.classList.toggle('is-shown', b.horsPortee);
    if (boutonReprise) boutonReprise.hidden = false;
    ajusterEchelle();
  }

  function voirLePays() {
    svg.classList.remove('is-zoomed');
    svg.setAttribute('viewBox', `0 0 ${largeur.toFixed(1)} ${hauteur.toFixed(1)}`);
    liaison.classList.remove('is-shown');
    epingle = null;
    if (boutonReprise) boutonReprise.hidden = true;
    relacher();
    ajusterEchelle();
  }

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
      encadrer(mesure);
    });
    chemin.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      epingle = chemin;
      activer(chemin, mesure);
      encadrer(mesure);
    });
    svg.append(chemin);
  });

  const liaison = noeudSvg('line', { class: 'link-line', x1: 0, y1: 0, x2: 0, y2: 0 });
  svg.append(liaison);

  structures.forEach((structure) => {
    const mesure = mesures.find((item) => item.locales.includes(structure));
    const groupe = noeudSvg('g', {
      class: 'structure-marker',
      tabindex: '0',
      role: 'button',
      'aria-label': `${structure.nom}, ${structure.localite} : ${structure.precision}.`,
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
      encadrer(mesure);
    });
    svg.append(groupe);
  });

  const libelles = noeudSvg('g', { class: 'label-layer' });
  mesures.forEach((mesure) => {
    const ancrage = ancrageDuLibelle(mesure.region, mesure.centre);
    const libelle = etiquette(abscisse(ancrage.lon), ordonnee(ancrage.lat), mesure.region.nom, `region-label${mesure.locales.length ? ' on-covered' : ''}`);
    libelle.dataset.largeur = cadre(mesure).largeur.toFixed(1);
    libelles.append(libelle);
  });
  structures.forEach((structure) => {
    const mesure = mesures.find((item) => item.locales.includes(structure));
    // Deux points d'aide d'une même ville sont écrits de part et d'autre de leur marqueur.
    const cote = mesure && mesure.locales.indexOf(structure) % 2 ? -1 : 1;
    const libelle = etiquette(abscisse(structure.lon), ordonnee(structure.lat), structure.localite, `locality-label${cote < 0 ? ' on-left' : ''}`);
    libelle.dataset.x = abscisse(structure.lon).toFixed(1);
    libelle.dataset.y = ordonnee(structure.lat).toFixed(1);
    libelle.dataset.cote = cote;
    libelles.append(libelle);
  });
  svg.append(libelles);

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
      noeudHtml('p', 'map-detail-hint', 'Survolez une région pour lire son état, cliquez dessus pour zoomer. Une région sans contact sur place est encadrée jusqu’au plus proche, relié par un trait pointillé. Au clavier : touche Tab puis Entrée.'),
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

  function disposerLesLibelles() {
    svg.querySelectorAll('.region-label').forEach((libelle) => {
      libelle.classList.remove('is-tiny');
      if (libelle.getComputedTextLength() > Number(libelle.dataset.largeur) * 1.15) libelle.classList.add('is-tiny');
    });
    // Deux libellés qui se chevauchent s'effacent : les régions équipées et les plus
    // vastes gardent leur nom, les autres le retrouvent quand on zoome sur elles.
    const files = [...svg.querySelectorAll('.region-label:not(.is-tiny)')].sort((a, b) =>
      (Number(b.classList.contains('on-covered')) - Number(a.classList.contains('on-covered')))
      || (Number(b.dataset.largeur) - Number(a.dataset.largeur)));
    const placees = [...svg.querySelectorAll('.marker-dot')].map((cercle) => {
      const rayon = Number(cercle.getAttribute('r')) * 1.7;
      return {
        x: Number(cercle.getAttribute('cx')) - rayon,
        y: Number(cercle.getAttribute('cy')) - rayon,
        largeur: 2 * rayon,
        hauteur: 2 * rayon,
      };
    });
    const genante = (place) => placees.some((p) => place.x < p.x + p.largeur
      && place.x + place.largeur > p.x
      && place.y < p.y + p.hauteur
      && place.y + place.hauteur > p.y);
    files.forEach((libelle) => {
      const b = libelle.getBBox();
      const pas = b.height;
      // Un nom qui tombe sur un marqueur est décalé au-dessus ou en dessous avant d'être tu.
      const tentatives = [0, -1.7, 1.7, -3.4, 3.4].map((dy) => ({
        x: b.x - 4, y: b.y - 2 + dy * pas, largeur: b.width + 8, hauteur: b.height + 4, dy,
      }));
      const libre = tentatives.find((place) => !genante(place));
      if (!libre) {
        libelle.classList.add('is-tiny');
        return;
      }
      if (libre.dy) libelle.setAttribute('transform', `translate(0 ${(libre.dy * pas).toFixed(1)})`);
      placees.push(libre);
    });
  }

  frame.replaceChildren(svg);
  frame.removeAttribute('aria-label');
  boutonReprise?.addEventListener('click', voirLePays);
  window.addEventListener('resize', ajusterEchelle);
  ajusterEchelle();
  disposerLesLibelles();
  afficherResume();
}

const coverageFrame = document.querySelector('#coverage-map');
const coverageDetail = document.querySelector('#map-detail');
if (coverageFrame && coverageDetail) chargerCouverture(coverageFrame, coverageDetail);
