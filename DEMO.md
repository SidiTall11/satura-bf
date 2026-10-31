# Démonstration locale Sutura

Ce prototype comprend une petite API Node.js, un jeu de données fictives en JSON et un tableau de bord. Il est conçu pour une présentation de hackathon sur l’ordinateur de l’équipe.

## Lancer

Dans PowerShell, depuis le dossier du projet :

```powershell
$env:PORT = "4174"
node server.js
```

Ouvrir ensuite `http://127.0.0.1:4174/dashboard.html`. Le serveur affiche un mot de passe temporaire : saisir l’identifiant `demo` et ce mot de passe lorsque le navigateur le demande. Garder le terminal ouvert pendant la présentation.

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

## Préparer un hébergement Render pour le prototype

Le serveur sait utiliser le port fourni par l’hébergeur, écouter sur `0.0.0.0` en production et servir `/healthz` pour le contrôle de disponibilité. Pour garder les statuts après un redémarrage sur Render, configure un Web Service avec la commande de démarrage `node server.js`, puis un disque persistant monté sur `/var/data` et la variable `SUTURA_DATA_DIR=/var/data`. Configure aussi `NODE_ENV=production` et un secret `SUTURA_DEMO_TOKEN` long et aléatoire. La page publique et l’API doivent rester sur ce même service/origine pour le flux temps réel.

Le stockage JSON sur disque est adapté au prototype à instance unique. Avant d’y traiter de vrais dossiers, remplacer ce stockage par une base PostgreSQL, définir les accès et la conservation des données avec les responsables d’accompagnement, et mettre en place une authentification d’équipe dédiée.
