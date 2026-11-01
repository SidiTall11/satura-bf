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
- Créer une demande structurée depuis la page du numéro vert et la voir apparaître instantanément dans le tableau de bord via Server-Sent Events.
- Consulter une zone et un type de demande inventés, sans identité, numéro de téléphone, transcription ni audio.
- Modifier un statut de démonstration, enregistré localement dans `.sutura-demo/cases.json`.
- Actualiser les indicateurs et la liste depuis l’API.

Pour réinitialiser les statuts, arrêter le serveur, supprimer le dossier local `.sutura-demo`, puis relancer `node server.js`. Le jeu initial est dans `data/demo-cases.json`.

## Limites

Le serveur écoute uniquement sur `127.0.0.1`. Il n’est pas déployé par la configuration Netlify du site statique. Le formulaire interactif accepte uniquement une zone et un besoin prédéfinis; il ne reçoit pas d’appel et ne collecte ni récit, ni identité, ni numéro, ni audio. Le tableau de bord ne déclenche pas de SMS, WhatsApp ou rappel. L’authentification temporaire sert à la présentation locale; ce n’est pas un système de comptes adapté à des données sensibles réelles.

## Deux publications depuis le même dépôt

Le dépôt sert deux choses différentes, et elles ne doivent pas être publiées de la même manière.

La **vitrine** — les pages publiques et l'annuaire — est faite pour rester en ligne en permanence. Publiée sur un hébergement statique, elle appelle `/healthz` au chargement de la page du numéro vert ; si l'API n'est pas là, le parcours de démonstration disparaît de lui-même. `dashboard.html` n'est de toute façon relié à aucune page publique, et `_redirects` le masque en plus sur la vitrine. Rien sur la vitrine ne peut donc proposer un service qui ne répondrait pas.

La **démonstration** — formulaire, tableau de coordination, flux temps réel — est un outil de soutenance. Elle a besoin du serveur Node et de l'API, donc d'un poste local ou d'une instance dédiée. C'est elle que l'équipe fait tourner le 7 ou 12 novembre.

## Préparer un hébergement Render pour le prototype

Le Blueprint Render utilise le plan gratuit. Le serveur écoute sur `0.0.0.0` en production, utilise le port fourni par l’hébergeur et expose `/healthz`. Le dossier JSON est conservé uniquement dans le système de fichiers éphémère du service. La page publique et l’API restent sur le même service/origine pour le flux temps réel.

Le plan gratuit peut mettre le service en veille et réinitialiser les statuts lors d’un redémarrage ou redéploiement. Avant d’y traiter de vrais dossiers, remplacer ce stockage par une base PostgreSQL persistante, définir les accès et la conservation des données avec les responsables d’accompagnement, et mettre en place une authentification d’équipe dédiée.
