# Sutura · Burkina Faso

**Plateforme d'accès à l'écoute, à l'orientation et aux ressources d'accompagnement des personnes confrontées aux violences basées sur le genre.**

Projet déposé au **Hackathon 226 — édition 2026**, domaine *Santé*, dans le cadre du thème « Souveraineté technologique : accélérer la transformation digitale sécurisée et inclusive ».

---

## Le problème

Au Burkina Faso, la majorité des cas de violence ne sont jamais signalés. Les trois obstacles ne sont pas financiers, ils sont structurels :

- **Personne ne sait quelles ressources existent près de chez soi.** Les contacts des structures d'accueil sont dispersés entre plusieurs sites institutionnels, rarement à jour.
- **Les parcours sont fragmentés.** Le médical, le juridique et le psychosocial fonctionnent sans se parler ; une survivante raconte son histoire plusieurs fois, ou renonce.
- **Le suivi est impossible.** Les dossiers papier ne sont pas standardisés, souvent incomplets ou égarés, et la prise en charge s'arrête dès le premier contact.

À cela s'ajoute un obstacle décisif : la peur légitime que le signalement ne reste pas confidentiel.

## Ce que Sutura est aujourd'hui, et ce qu'il n'est pas

Le projet a été construit sur une règle : **ne jamais laisser croire qu'un service fonctionne alors qu'il ne fonctionne pas.** Une page qui oriente vers une ligne d'aide engage la sécurité de celle qui la lit.

| | État |
|---|---|
| Annuaire de ressources publiques, avec source officielle et date de vérification pour chaque fiche | **Disponible** |
| Carte de couverture des 13 régions, calculée sans service de cartographie externe | **Disponible** |
| Site d'information sur le projet et ses partenaires | **Disponible** |
| Tableau de coordination d'équipe, avec création de demande et mise à jour de statut en temps réel | **Prototype de démonstration** |
| Accueil vocal des appels au numéro vert | **Non opérationnel** |
| Transcription et structuration automatique d'un récit | **Non opérationnel** |
| Notification des structures (SMS, WhatsApp, rappel) | **Non opérationnel** |
| Comptes professionnels, suivi de dossiers réels | **Non opérationnel** |

Le numéro `80 00 12 87` est une **ligne nationale externe** au projet, reprise des sources officielles. Sutura ne l'exploite pas et ne reçoit aucun appel.

## Ce qui est en ligne

Six pages publiques, sans framework ni étape de compilation :

| Page | Rôle |
|---|---|
| `index.html` | Présentation du projet, état réel d'avancement, trois publics ciblés |
| `numero-vert.html` | La ligne nationale, le parcours cible en 5 étapes, les principes d'accès |
| `contact.html` | Urgences (17, 18, 16), annuaire filtrable de 8 ressources sourcées, carte de couverture des 13 régions |
| `plateforme.html` | Feuille de route des services à construire avec les partenaires |
| `projet.html` | Mission, vision, pistes de pérennisation, posture de protection des données |
| `confidentialite.html` · `cgu.html` | État actuel de la collecte, cadre burkinabè (CIL), décisions restant à prendre |

`dashboard.html` est l'espace de coordination réservé à l'équipe ; il n'est pas relié à la navigation publique.

## Architecture

```
Navigateur ── HTML/CSS/JS ──► serveur Node.js (stdlib uniquement)
    │                              │
    │ 2 fichiers lus en lecture    ├── /api/cases      création et lecture des demandes
    │ seule : tracés des régions   ├── /api/cases/:id  mise à jour d'un statut
    │ et positions vérifiées       ├── /api/events     flux temps réel (Server-Sent Events)
    │                              └── /healthz        sonde de disponibilité
    └── assets/geo/*.json                   │
        projettés, rattachés et     cases.json (écriture atomique)
        mesurés dans le navigateur
```

**693 lignes de JavaScript, 1 015 lignes au total (8 pages, 3 feuilles de style, 3 scripts), zéro dépendance tierce.** Le projet n'appelle aucun `npm install`, aucun service d'abonnement, aucun SDK étranger. Mesuré dans le navigateur : la page d'accueil se charge en **7 requêtes et 171 Ko non compressés, la page de contact avec sa carte en 9 requêtes et 185 Ko, toutes dirigées vers la même origine** — une page chargée ne quitte jamais le serveur du projet.

Le serveur est écrit avec les seuls modules `node:http`, `node:fs`, `node:path` et `node:crypto`. Voir [note de positionnement](docs/NOTE-SOUVERAINETE.md) pour l'argumentaire tiré de ce choix.

## Carte de couverture (géomatique)

Aucune bibliothèque de cartographie, aucune tuile, aucun service d'itinéraire. Tout est calculé dans le navigateur à partir de deux fichiers servis par le projet.

| Étape | Où | Quoi |
|---|---|---|
| 1. Collecte | `tools/prep-carte.js` | Limites administratives des 13 régions depuis **geoBoundaries Open — Burkina Faso ADM1** (licence **CC BY 4.0**) |
| 2. Simplification | même script | Douglas-Peucker à 0,03° (~3 km) puis arrondi : **8 797 sommets → 647, soit −93 %**, fichier final de **9 Ko** |
| 3. Positions | `assets/geo/structures.json` | Centre des localités des 4 cliniques juridiques publiées par l'AFJ/BF, jamais l'adresse d'un guichet |
| 4. Rendu | `script.js` | Projection équirectangulaire calée sur l'emprise du pays (−5,52 ; 9,40 → 2,41 ; 15,08), corrigée en longitude à la latitude médiane, dessinée en SVG |
| 5. Calculs | `script.js` | Rattachement des structures aux régions par test point-dans-le-polygone, centre géographique de chaque région (formule des aires), distance à vol d'oiseau (haversine) |
| 6. Contrôle | `tools/verifier-geo.js` | Les mêmes calculs en Node.js (`npm run carte:verifier`) : les 4 structures tombent bien dans la région déclarée, et les 13 distances affichées sont reproductibles hors navigateur |

Résultat assumé : **3 régions sur 13** ont un point d'aide vérifié, et les 10 autres restent grises avec leur distance à la structure la plus proche (jusqu'à 260 km pour la région Est). La carte sert cet argument, pas notre confort : elle montre où l'orientation est possible et où elle ne l'est pas encore.

Deux règles de protection bornent la couche géographique : une structure d'hébergement ne reçoit **jamais** de coordonnée publiée (seule sa ville apparaît), et les coordonnées publiées s'arrêtent au centre de la localité tant que l'adresse n'a pas été confirmée par appel.

## Lancer la démonstration

Aucune installation préalable n'est nécessaire ; Node.js suffit.

```bash
node server.js
```

Le terminal affiche l'adresse du tableau de bord, l'identifiant `demo` et un mot de passe temporaire régénéré à chaque démarrage.

```bash
PORT=4174 node server.js          # changer de port
SUTURA_DATA_DIR=/chemin/donnees node server.js   # déplacer le stockage des dossiers
```

Pour repartir du jeu initial, arrêter le serveur puis supprimer le dossier `.sutura-demo`. Les statuts modifiés sont écrits dans `.sutura-demo/cases.json`, jamais dans le dépôt.

### Ce que la démonstration montre

Depuis `dashboard.html`, l'agent enregistre un appel reçu : il choisit le besoin exprimé et la zone, et le dossier apparaît **instantanément** sur les autres postes de coordination ouverts, sans rechargement, via le flux Server-Sent Events. Il peut alors faire avancer le statut (`À examiner` → `Orientation à préparer` → `En cours` → `Clôturé`) et voir l'indicateur se mettre à jour chez tous les postes connectés.

Ce que la démonstration ne fait pas, par conception : la saisie n'accepte qu'une zone et un besoin pris dans des listes fermées, n'enregistre **ni nom, ni téléphone, ni récit, ni audio**, et ne déclenche aucun envoi vers une structure.

## Protection intégrée

Le sujet impose une discrétion que le code doit assurer, pas seulement la charte.

- **Aucune donnée personnelle** n'est demandée ni stockée sur les pages publiques.
- **Mots de passe comparés à temps constant** (`timingSafeEqual`), sans inscription en clair.
- **Listes fermées** pour les zones et les besoins : aucune valeur libre n'atteint le stockage.
- **Création de dossiers réservée à l'espace d'équipe** (authentification exigée) et limitée à dix par poste et par dix minutes, pour qu'aucune page ne puisse saturer le stockage.
- **Requête plafonnée à 2 Ko**, écriture du fichier en deux temps (temporaire puis renommage), permissions `0600` et `0700`.
- **Liste blanche de fichiers servis** : le serveur ne livre que les pages, feuilles de style, scripts, polices et données géographiques du site. Ni `server.js`, ni la configuration, ni `.git`, ni le fichier de données ne sont téléchargeables par une requête HTTP.
- **Même garde côté vitrine publiée** : `_redirects` masque `data/`, `docs/`, `tools/`, `server.js`, la configuration et le tableau de bord, pour qu'une publication sans filtrage du dossier n'expose pas le backend.
- **En-têtes de sécurité** sur chaque réponse : `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`.
- **Échappement systématique** de toute valeur injectée dans le tableau de bord.
- **Bouton « Quitter rapidement »** et touche Échap sur toutes les pages, pour un appareil partagé.

## Ce qui reste à faire avant un service réel

Dans l'ordre, et sans raccourci sur le premier point :

1. **Décider avant de collecter.** Responsable du traitement, données réellement nécessaires, habilitations, durée de conservation, procédure de suppression, lieu d'hébergement et formalités auprès de la CIL. Ces arbitrages se font avec les structures d'accompagnement, pas avec les seuls développeurs.
2. **Remplacer le stockage par fichier** par une base PostgreSQL persistante, avec sauvegardes et journal des accès.
3. **Authentification d'équipe nominative**, avec rôles par structure, en remplacement du mot de passe partagé de démonstration.
4. **Vérifier par appel** la disponibilité du numéro vert et des huit fiches de l'annuaire, affiner les quatre coordonnées qui s'arrêtent au centre de la localité, puis fixer une date de revue périodique.
5. **Ouvrir un canal de contact** vers une adresse réelle pour les partenaires et les corrections d'annuaire.
6. **Concevoir le parcours vocal** avec les structures partenaires, puis seulement le développer.

## Structure du dépôt

```
index.html  numero-vert.html  contact.html  plateforme.html  projet.html
confidentialite.html  cgu.html  dashboard.html
styles.css  dashboard.css  fonts.css        feuilles de style
assets/fonts/                                quatre polices variables, servies en local
assets/geo/regions.json                      13 régions simplifiées (9 Ko, CC BY 4.0)
assets/geo/structures.json                   4 points d'aide localisés + 3 lignes nationales
script.js   dashboard.js   server.js
tools/prep-carte.js                          téléchargement et simplification du tracé
tools/verifier-geo.js                        recontrôle des rattachements et des distances
data/demo-cases.json                         jeu de dossiers fictifs de départ
docs/NOTE-SOUVERAINETE.md                    argumentaire et préparation de la soutenance
netlify.toml  _headers  _redirects           publication de la vitrine
render.yaml                                  instance de démonstration
DEMO.md                                      consignes de la démonstration locale
LICENSE                                      Apache 2.0
```

## Licence et sources

Apache License 2.0 — voir [LICENSE](LICENSE). © 2026 Les contributeurs du projet Sutura Burkina Faso.

Données géographiques : geoBoundaries Africa, *Open* dataset — Burkina Faso, Administrative Level 1 (ADM1), licence **Creative Commons Attribution 4.0 International (CC BY 4.0)**. Le tracé a été simplifié par nos soins ; les erreurs d'interprétation nous reviennent et n'engagent pas geoBoundaries.

Contacts d'aide : sites officiels des structures citées (Ministère de la Santé, Police nationale, AFJ/BF), consultés le 31 octobre 2026, et positions de localités via l'annuaire libre OpenStreetMap/Nominatim.
