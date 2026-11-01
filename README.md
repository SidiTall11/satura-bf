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
| `numero-vert.html` | La ligne nationale, le parcours cible en 5 étapes, le parcours de démonstration |
| `contact.html` | Urgences (17, 18, 16), annuaire filtrable de 8 ressources sourcées |
| `plateforme.html` | Feuille de route des services à construire avec les partenaires |
| `projet.html` | Mission, vision, pistes de pérennisation, posture de protection des données |
| `confidentialite.html` · `cgu.html` | État actuel de la collecte, cadre burkinabè (CIL), décisions restant à prendre |

`dashboard.html` est l'espace de coordination réservé à l'équipe ; il n'est pas relié à la navigation publique.

## Architecture

```
Navigateur ── HTML/CSS/JS ──► serveur Node.js (stdlib uniquement)
                                   │
                                   ├── /api/cases      création et lecture des demandes
                                   ├── /api/cases/:id  mise à jour d'un statut
                                   ├── /api/events     flux temps réel (Server-Sent Events)
                                   └── /healthz        sonde de disponibilité
                                            │
                                     cases.json (écriture atomique)
```

**423 lignes de JavaScript, 657 lignes au total (8 pages, 2 feuilles de style, 3 scripts), zéro dépendance tierce.** Le projet n'appelle aucun `npm install`, aucun service d'abonnement, aucun SDK étranger. Mesuré dans le navigateur : la page d'accueil se charge en **7 requêtes et 160 Ko non compressés, toutes dirigées vers la même origine** — une page chargée ne quitte jamais le serveur du projet.

Le serveur est écrit avec les seuls modules `node:http`, `node:fs`, `node:path` et `node:crypto`. Voir [note de positionnement](docs/NOTE-SOUVERAINETE.md) pour l'argumentaire tiré de ce choix.

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

Depuis `numero-vert.html`, choisir un besoin et une zone : la demande apparaît **instantanément** dans le tableau de bord, sans rechargement, via le flux Server-Sent Events. Un agent peut alors faire avancer le statut (`À examiner` → `Orientation à préparer` → `En cours` → `Clôturé`) et voir l'indicateur se mettre à jour chez tous les postes connectés.

Ce que la démonstration ne fait pas, par conception : elle n'accepte qu'une zone et un besoin prédéfinis, ne reçoit **ni nom, ni téléphone, ni récit, ni audio**, et ne déclenche aucun envoi vers une structure.

## Protection intégrée

Le sujet impose une discrétion que le code doit assurer, pas seulement la charte.

- **Aucune donnée personnelle** n'est demandée ni stockée sur les pages publiques.
- **Mots de passe comparés à temps constant** (`timingSafeEqual`), sans inscription en clair.
- **Listes fermées** pour les zones et les besoins : aucune valeur libre n'atteint le stockage.
- **Création de demandes limitée à cinq par poste et par dix minutes**, pour qu'une page publique ne puisse pas saturer le stockage.
- **Requête plafonnée à 2 Ko**, écriture du fichier en deux temps (temporaire puis renommage), permissions `0600` et `0700`.
- **Liste blanche de fichiers servis** : le serveur ne livre que les pages, feuilles de style, scripts et polices du site. Ni `server.js`, ni la configuration, ni `.git`, ni le fichier de données ne sont téléchargeables par une requête HTTP.
- **En-têtes de sécurité** sur chaque réponse : `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`.
- **Échappement systématique** de toute valeur injectée dans le tableau de bord.
- **Bouton « Quitter rapidement »** et touche Échap sur toutes les pages, pour un appareil partagé.

## Ce qui reste à faire avant un service réel

Dans l'ordre, et sans raccourci sur le premier point :

1. **Décider avant de collecter.** Responsable du traitement, données réellement nécessaires, habilitations, durée de conservation, procédure de suppression, lieu d'hébergement et formalités auprès de la CIL. Ces arbitrages se font avec les structures d'accompagnement, pas avec les seuls développeurs.
2. **Remplacer le stockage par fichier** par une base PostgreSQL persistante, avec sauvegardes et journal des accès.
3. **Authentification d'équipe nominative**, avec rôles par structure, en remplacement du mot de passe partagé de démonstration.
4. **Vérifier par appel** la disponibilité du numéro vert et des huit fiches de l'annuaire, puis date de revue périodique.
5. **Ouvrir un canal de contact** vers une adresse réelle pour les partenaires et les corrections d'annuaire.
6. **Concevoir le parcours vocal** avec les structures partenaires, puis seulement le développer.

## Structure du dépôt

```
index.html  numero-vert.html  contact.html  plateforme.html  projet.html
confidentialite.html  cgu.html  dashboard.html
styles.css  dashboard.css  fonts.css        feuilles de style
assets/fonts/                                quatre polices variables, servies en local
script.js   dashboard.js   server.js
data/demo-cases.json                         jeu de dossiers fictifs de départ
docs/NOTE-SOUVERAINETE.md                    argumentaire et préparation du soutenu
netlify.toml  _headers  _redirects           publication de la vitrine
render.yaml                                  instance de démonstration
DEMO.md                                      consignes de la démonstration locale
LICENSE                                      Apache 2.0
```

## Licence

Apache License 2.0 — voir [LICENSE](LICENSE).

© 2026 Les contributeurs du projet Sutura Burkina Faso.
