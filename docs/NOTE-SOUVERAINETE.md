# Note de positionnement — souveraineté technologique

**Projet Sutura · Hackathon 226, édition 2026 · domaine Santé**
Thème du concours : *accélérer la transformation digitale sécurisée et inclusive.*

Ce document prépare la soutenance devant le jury du 12 novembre. Il sert aussi de pièce de dossier : il explique pourquoi les choix techniques du projet répondent au thème, et où ils ne y répondent pas encore.

---

## 1. Notre définition du sujet

Pour un service qui traitera un jour des récits de violences, « souveraineté technologique » n'est pas un mot de contexte. C'est la condition d'existence du service : **une donnée de survivante qui part chez un prestataire étranger non identifié n'est pas seulement un problème juridique, c'est un danger pour la personne.**

Nous jugeons donc le projet sur quatre-autonomies :

| Autonomie | Ce que nous maîtrisons aujourd'hui |
|---|---|
| **Technologique** — ne pas dépendre d'un fournisseur qui peut disparaître, augmenter ses prix ou imposer ses conditions | 414 lignes de JavaScript (666 lignes en comptant les 8 pages et les feuilles de style), **zéro dépendance tierce**, aucun `npm install`, aucun SDK, aucun abonnement. Le serveur utilise quatre modules livrés avec Node.js. |
| **Des données** — savoir où elles sont, qui les lit, et pouvoir le prouver | Aucune donnée personnelle n'est collectée sur les pages publiques. Le prototype n'accepte ni nom, ni téléphone, ni récit, ni audio. Les dossiers de démonstration restent sur le poste de l'équipe, et ne quittent pas la machine. |
| **D'exploitation** — pouvoir faire tourner, dépanner et reprendre le service sans appeler un prestataire | Le projet se déploie avec une seule commande, fonctionne **sans réseau** pour la démonstration, et tient sur une machine de bureau. Coût d'exploitation du prototype : 0 FCFA par mois. |
| **De gouvernance** — décider nous-mêmes de ce qui est collecté, et quand | Le parcours vocal et la transcription sont décrits comme des pistes, jamais comme des services. Le site refuse d'ouvrir une fonction de collecte tant que les règles de protection ne sont pas arrêtées avec les structures d'accompagnement. |

## 2. Les preuves, en chiffres

- **0** paquet tiers dans le dépôt. Rien à auditer en dehors des 666 lignes que nous avons écrites.
- **4** modules utilisés côté serveur : `http`, `fs`, `path`, `crypto`. Tous fournis par l'exécution elle-même.
- **160 Ko et 7 requêtes** pour la page d'accueil avec ses polices, mesurés dans le navigateur, non compressés, **sans une seule requête vers un serveur étranger** : une page chargée ne quitte jamais notre origine.
- **8** ressources de l'annuaire, chacune avec son lien officiel et sa date de consultation. Aucune coordonnée inventée.
- **1** écriture atomique des données, permissions `0600`, liste blanche de fichiers servis (le serveur ne livre ni son propre code, ni sa configuration, ni `.git`), comparaison des mots de passe à temps constant, requêtes plafonnées à 2 Ko, création de demandes limitée par poste, échappement systématique des valeurs affichées.
- **0** origine externe autorisée par la `Content-Security-Policy` : le navigateur refuse d'afficher une ressource qui ne viendrait pas de notre propre serveur.
- **1** réponse au thème « inclusive » : le canal visé est l'appel téléphonique, pas l'application. Il ne demande ni smartphone, ni data mobile, ni savoir lire.

Le point que nous ferions valoir en priorité : **la surface d'audit est de 666 lignes.** Un jury, un auditeur ou une administration peut tout lire en une demi-journée. C'est l'inverse d'une boîte noire achetée à un prestataire, et c'est exactement ce que le mot « open source » du règlement est censé garantir.

## 3. Ce qui contredit encore le thème, et comment nous le corrigeons

Nous préférons arriver devant le jury avec nos faiblesses écrites.

| Écart | Correction |
|---|---|
| Les deux cibles d'hébergement configurées sont des services étrangers. | Décider une cible : vitrine sur un CDN, démonstration sur un poste local. À terme, identifier un hébergement opéré au Burkina ou, à défaut, dans l'Union européenne, en assumant le choix devant la CIL. |
| Le prototype écrit ses données dans un fichier. | C'est un choix de prototype, pas une architecture cible. Avant toute donnée réelle : base PostgreSQL persistante, sauvegardes, journal des accès, comptes nominatifs par structure. |
| Le mot de passe du tableau de bord est partagé entre toute l'équipe. | À remplacer par des comptes individuels avec rôles. Un accès anonyme ne permet pas de savoir qui a consulté un dossier, ce qui est indispensable sur ce type de données. |

## 4. Les questions qui vont arriver, et la réponse

**« Où vont les données, et qui les voit ? »**
Nulle part, pour l'instant. Le site ne collecte rien. Le prototype n'écrit que des dossiers fictifs, dans un fichier sur le poste de l'équipe, sans identité ni téléphone ni récit. Et c'est délibéré : nous avons refusé d'ouvrir la collecte avant d'avoir décidé, avec les structures d'accompagnement, ce qui doit être gardé, par qui, et pendant combien de temps.

**« Vous allez utiliser l'IA pour transcrire des appels de survivantes ? »**
C'est la piste de parcours que nous décrivons, pas ce que nous faisons. Le site l'affiche comme « non opérationnel ». Si nous la construisons, elle devra tourner sur une infrastructure que nous contrôlons, sans envoyer d'audio à un tiers, avec supervision humaine à la validation du dossier. Une transcription envoyée à un service étranger annulerait l'intérêt du projet.

**« Le numéro vert est à vous ? »**
Non. Le 80 00 12 87 est une ligne nationale extérieure au projet, reprise des sources officielles. Nous ne l'exploitons pas et ne recevons aucun appel. C'est écrit sur chaque page qui l'affiche, avec la mention de disponibilité à confirmer.

**« Qu'est-ce qui vous empêche de collecter demain ? »**
Rien dans le code ne le permet, et c'est le contrôle que nous avons choisi. Le formulaire de contact est désactivé côté serveur, la route de création de dossier n'accepte qu'une zone et un besoin pris dans une liste fermée, et aucune route d'importation de récit n'existe. La première fonctionnalité à ajouter ne sera pas technique : ce sera la décision de protection.

**« Pourquoi ne pas avoir pris un framework ? »**
Parce qu'un framework, c'est une dépendance à une communauté, à un cycle de publication et à un risque de maintenance. Pour un service public destiné à durer plus longtemps que nos études, 666 lignes lisibles par n'importe quel développeur burkinabè sont plus souveraines que 60 Mo de modules. Le coût est payé : pas d'outillage de compilation, et une refonte à la main le jour où le design changera.

## 5. Ce que nous ne promettons pas

À dire tel quel devant le jury, parce que le projet entier repose là-dessus :

- Nous n'affirmons pas que le numéro vert est disponible maintenant : nous n'avons pas encore pu le vérifier par appel.
- Nous ne présentons pas de transcription vocale, de notification SMS ou de suivi de dossier comme des fonctions acquises.
- Nous ne disons pas que le prototype est prêt à recevoir des dossiers réels. Il ne le sera qu'après les arbitrages de protection des données.
- Nous ne prétendons pas remplacer les structures d'accompagnement. L'outil n'a de sens que si les centres qui reçoivent les femmes participent à sa conception.

## 6. Trame de la soutenance

| Temps | Appui | Ce qui est dit |
|---|---|---|
| 1 min | Page d'accueil | Le problème : le parcours de la survivante, pas le manque de bonne volonté. |
| 2 min | Annuaire | Ce qui existe vraiment aujourd'hui : 8 ressources, une source par fiche, une date par fiche. |
| 4 min | Démonstration en direct | Un appel enregistré par l'agent, qui apparaît sur les autres postes sans rechargement ; un statut qui change, et l'indicateur qui bouge partout. |
| 2 min | Page confidentialité + cette note | La position : ne pas collecter avant de décider. Le coût de l'erreur n'est pas un incident, c'est une exposition. |
| 1 min | Feuille de route | Ce qui vient, dans quel ordre, et ce qui est refusé. |

**Répéter la démonstration sur le poste qui servira le jour du jury**, avec le réseau coupé. Le flux temps réel fonctionne en local ; une connexion partagée un matin de soutenance est le seul élément qui peut faire échouer la manipulation.
