# Démonstration locale Sutura

Ce prototype comprend une petite API Node.js, un jeu de données fictives en JSON et un tableau de bord. Il est conçu pour une présentation de hackathon sur l’ordinateur de l’équipe.

## Lancer

Dans PowerShell, depuis le dossier du projet :

```powershell
$env:PORT = "4174"
node server.js
```

Ouvrir ensuite `http://127.0.0.1:4174/dashboard.html`. Le serveur affiche un mot de passe temporaire : saisir l’identifiant `demo` et ce mot de passe lorsque le navigateur le demande. Garder le terminal ouvert pendant la présentation.

**Aucun lien du site public ne mène au tableau de bord, et c'est voulu.** Le tableau de coordination est l'outil de l'équipe, pas une page que visite une personne qui cherche de l'aide. On l'ouvre en tapant son adresse, comme ci-dessus.

Le port 4174 est choisi pour éviter le serveur de prévisualisation qui peut déjà utiliser le port 4173. On peut choisir un autre port en modifiant `PORT`.

## Ce que la démo permet

- Charger six dossiers de présentation couvrant l’écoute, l’orientation psychosociale et juridique, la mise à l’abri et l’information santé.
- Créer une demande structurée **depuis le tableau de coordination** (saisie d’un appel reçu) et la voir apparaître instantanément sur les autres postes ouverts via Server-Sent Events.
- Consulter une zone et un type de demande inventés, sans identité, numéro de téléphone, transcription ni audio.
- Modifier un statut de démonstration, enregistré localement dans `.sutura-demo/cases.json`.
- Actualiser les indicateurs et la liste depuis l’API.
- Montrer la **carte de couverture** sur `contact.html` : les 13 régions, les 3 qui ont un contact vérifié, la distance à vol d’oiseau pour les autres. Elle se charge avec le même serveur, sans appeler aucun service de cartographie.

**La démonstration tient réseau coupé.** Pages, feuilles de style, polices, tracés régionaux et calculs de distance sont servis par le poste local : couper le Wi-Fi avant de lancer `node server.js` ne change rien à l’écran, et c’est ce qu’il faut vérifier la veille du jury.

Pour réinitialiser les statuts, arrêter le serveur, supprimer le dossier local `.sutura-demo`, puis relancer `node server.js`. Le jeu initial est dans `data/demo-cases.json`.

## Limites

Le serveur écoute uniquement sur `127.0.0.1`. Il n’est pas déployé par la configuration Netlify du site statique. La saisie d’un dossier n’accepte qu’une zone et un besoin pris dans des listes fermées; elle n’enregistre ni identité, ni numéro, ni récit, et ne passe aucun appel. Le tableau de bord ne déclenche pas de SMS, WhatsApp ou rappel. L’authentification temporaire sert à la présentation locale; ce n’est pas un système de comptes adapté à des données sensibles réelles.

## Deux publications depuis le même dépôt

Le dépôt sert deux choses différentes, et elles ne doivent pas être publiées de la même manière.

La **vitrine** — les pages publiques, l'annuaire et la carte de couverture — est faite pour rester en ligne en permanence. Elle ne contient **aucune saisie** : aucune page publique n'écrit dans l'API, et `dashboard.html` n'est relié à aucune d'elles. `_redirects` masque le tableau de bord, mais aussi `data/`, `docs/`, `tools/`, `server.js` et la configuration, si la publication se fait sans filtrer le dossier. Une vitrine publiée ne peut donc promettre un service qui ne répondrait pas.

La carte est le seul élément des pages publiques qui lise des fichiers de données : `assets/geo/regions.json` (tracés) et `assets/geo/structures.json` (quatre positions vérifiées). Ce sont des fichiers statiques, en lecture seule, sans identifiant ni écriture possible.

La **démonstration** — saisie d'un appel, tableau de coordination, flux temps réel — est un outil de soutenance. Elle a besoin du serveur Node et de l'API, donc d'un poste local ou d'une instance dédiée. C'est elle que l'équipe fait tourner le 7 ou 12 novembre.

## Préparer un hébergement Render pour le prototype

Le Blueprint Render utilise le plan gratuit. Le serveur écoute sur `0.0.0.0` en production, utilise le port fourni par l’hébergeur et expose `/healthz`. Le dossier JSON est conservé uniquement dans le système de fichiers éphémère du service. Le tableau de bord et l’API restent sur le même service et la même origine pour le flux temps réel.

Le plan gratuit peut mettre le service en veille et réinitialiser les statuts lors d’un redémarrage ou redéploiement. Avant d’y traiter de vrais dossiers, remplacer ce stockage par une base PostgreSQL persistante, définir les accès et la conservation des données avec les responsables d’accompagnement, et mettre en place une authentification d’équipe dédiée.
