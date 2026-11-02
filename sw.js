// Mode hors ligne de Sutura. Ce service n'est installé que si la personne l'active
// depuis la page Contact : un site sur les violences ne laisse pas de copie par défaut.
const CACHE = 'sutura-hors-ligne-v1';
const ETAT = 'hors-ligne-etat';

// Seules les pages publiques sont gardées : jamais l'espace de coordination ni l'API.
const RESSOURCES = [
  'index.html',
  'numero-vert.html',
  'contact.html',
  'plateforme.html',
  'projet.html',
  'confidentialite.html',
  'cgu.html',
  'styles.css',
  'fonts.css',
  'script.js',
  'assets/fonts/Caveat.woff2',
  'assets/fonts/DMSans.woff2',
  'assets/fonts/DMSerifDisplay.woff2',
  'assets/fonts/DMSerifDisplay-italic.woff2',
  'assets/geo/regions.json',
  'assets/geo/structures.json',
];

const base = new URL('./', self.location.href);
const gardees = new Set(RESSOURCES.map((chemin) => new URL(chemin, base).pathname));

function noterMiseAJour(cache) {
  return cache.put(ETAT, new Response(JSON.stringify({ miseAJour: new Date().toISOString() }), {
    headers: { 'content-type': 'application/json' },
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(RESSOURCES.map((chemin) => new Request(new URL(chemin, base), { cache: 'reload' })));
    await noterMiseAJour(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter((nom) => nom.startsWith('sutura-hors-ligne-') && nom !== CACHE).map((nom) => caches.delete(nom)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  if (requete.method !== 'GET') return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;
  const chemin = url.pathname === base.pathname ? new URL('index.html', base).pathname : url.pathname;
  const navigation = requete.mode === 'navigate';
  // Tout ce qui n'est pas dans la liste passe directement au réseau, sans copie.
  if (!gardees.has(chemin) && !navigation) return;
  if (!gardees.has(chemin) && navigation && /dashboard/.test(chemin)) return;

  // Réseau d'abord, pour que la copie reste à jour ; la copie seulement si le réseau manque.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cle = new URL(chemin, url.origin).href;
    try {
      const reponse = await fetch(requete);
      if (reponse.ok && gardees.has(chemin)) {
        await cache.put(cle, reponse.clone());
        if (navigation) await noterMiseAJour(cache);
      }
      return reponse;
    } catch {
      const copie = await cache.match(cle);
      if (copie) return copie;
      // Une page inconnue hors connexion ouvre la page des numéros d'urgence.
      if (navigation) {
        const secours = await cache.match(new URL('contact.html', base).href);
        if (secours) return secours;
      }
      return Response.error();
    }
  })());
});
