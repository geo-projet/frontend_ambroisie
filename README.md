# Cartographie participative de l'herbe à poux

Interface web du projet pilote mené par le **Département de géomatique
appliquée de l'Université de Sherbrooke** pour l'**Institut national de santé
publique du Québec**.

L'ambroisie (*Ambrosia artemisiifolia*) cause de 50 à 90 % des rhinites
allergiques saisonnières. La dernière cartographie de sa densité au Québec
remonte à 2001. Ce projet reconstitue cette connaissance en combinant science
citoyenne, vision par ordinateur et modélisation géospatiale, sur trois villes
pilotes — Sherbrooke, Montréal et Québec.

Ce dépôt contient **l'interface seule** : des fichiers statiques, sans serveur
d'application ni base de données.

---

## Lancer la page web

```bash
python serveur.py
```

Puis ouvrir <http://localhost:8777>. Le script imprime l'adresse des six pages.
Python 3.7 ou plus récent suffit — aucune dépendance à installer.

> **Un serveur est nécessaire.** Ouvrir `index.html` par un double-clic ne
> fonctionne pas : le protocole `file://` empêche le chargement des GeoJSON et
> les appels réseau.

`serveur.py` répond `Cache-Control: no-store`, à la différence de
`python -m http.server` qui n'envoie aucun en-tête de cache — le navigateur
réutilise alors les fichiers sans demander s'ils ont changé, et une
modification peut rester invisible longtemps.

---

## Ce que contient le site

| Page | Adresse | Contenu |
|---|---|---|
| Page du projet | `index.html` | Contexte, méthode, travaux, avancement, équipe |
| Sherbrooke | `cartes/sherbrooke/` | 5 462 observations, 92 parcours de collecte, modèle prédictif |
| Montréal | `cartes/montreal/` | 836 observations, 34 arrondissements, 22 168 terrains à inspecter |
| Québec | `cartes/quebec/` | 2 333 observations, 35 quartiers, modèle prédictif |
| Projections climatiques | `cartes/projections/` | 3 scénarios × 3 horizons, sud et centre du Québec |
| Guide d'utilisation | `cartes/sherbrooke/guide.html` | Mode d'emploi illustré, commun aux trois cartes |

### Les tableaux de bord

Les trois villes partagent **un seul moteur cartographique**. Ce qui les
distingue tient dans un fichier de configuration par ville, `js/config-ville.js`,
qui déclare les couches disponibles : le panneau *Couches*, les analyses de
répartition et la navigation s'y adaptent d'eux-mêmes.

Chaque carte propose les observations d'ambroisie — affichées depuis un jeu
local, puis rafraîchies depuis l'API iNaturalist —, les parcours de collecte,
les couches de contexte publiées par la municipalité, une couche de **terrains
à potentiel de colonisation** établie d'après le rôle d'évaluation foncière, des
analyses par découpage administratif, un outil de zone tampon autour d'une
adresse et le suivi de l'évolution mensuelle et annuelle.

Sherbrooke et Québec portent en outre une **couche de modélisation prédictive**
à trois vues : probabilité de présence, incertitude du krigeage, et lecture
croisée des deux en quatre situations de gestion municipale.

Leur niveau de détail diffère, parce que les municipalités ne publient pas les
mêmes jeux de données — Québec n'a ni pédologie ni affectation du sol, par
exemple. L'interface l'assume plutôt que de le masquer : le panneau
*Informations* de chaque carte dresse la liste de ce dont elle dispose.

### La carte des projections climatiques

Elle répond à une question précise : **où se trouvera demain le climat estival
qu'ont aujourd'hui les lieux où l'ambroisie est observée ?** Ce n'est pas une
prédiction de présence — ni l'occupation du sol, ni la dispersion de la plante
n'entrent dans le calcul. Deux limites sont affichées dans l'interface : le
biais d'observation de la science citoyenne, et l'impossibilité de calibrer le
versant chaud, les données climatiques s'arrêtant à la frontière canadienne.

---

## Déployer

Le dossier se copie tel quel dans un serveur web. Tous les chemins sont
relatifs : le site fonctionne à la racine d'un domaine comme dans un
sous-répertoire.

Trois points conditionnent le résultat :

- **HTTPS.** La géolocalisation — bouton *Me localiser* de l'outil *Autour de
  moi* — et le service worker, qui porte le mode hors ligne et l'installation
  comme application, exigent un contexte sécurisé. En `http://` sur un nom de
  domaine, ces deux fonctions se taisent ; le reste marche.
- **Compression.** Les données pèsent 41 Mo brutes et 5 Mo compressées. Les
  serveurs ne connaissent pas l'extension `.geojson` et la servent en
  `application/octet-stream`, que les filtres de compression laissent passer :
  il faut déclarer `application/geo+json` avant de l'ajouter au filtre.
- **Cache.** Les couches de `data/` ne changent qu'à la reconstruction et
  méritent un cache long ; le code, lui, doit rester frais.

---

## Structure

```
.
├── index.html                  Page du projet
├── serveur.py                  Serveur local, sans cache
├── assets/                     Charte graphique, compteurs, visuels
└── cartes/
    ├── sherbrooke/             Tableau de bord — sert de gabarit
    │   ├── index.html          Carte, panneaux, tableau de bord
    │   ├── guide.html          Guide illustré, commun aux trois cartes
    │   ├── js/config-ville.js  ← seul fichier propre à la ville
    │   ├── js/script.js        Moteur cartographique (OpenLayers 9)
    │   ├── js/prediction.js    Couche du modèle prédictif
    │   ├── js/terrains.js      Couche des terrains à potentiel
    │   ├── serviceworker.js    Mise en cache hors ligne
    │   └── data/               GeoJSON allégés
    ├── montreal/
    ├── quebec/
    └── projections/            Carte provinciale des analogues climatiques
```

Technologies libres : **OpenLayers 9** pour la cartographie, **ECharts** pour
les graphiques, **Bootstrap 5** pour l'interface. Aucune étape de compilation.

Pour la méthode — modèle prédictif, terrains à potentiel, projections
climatiques, écarts déclarés —, voir [DOCUMENTATION.md](DOCUMENTATION.md).

---

## Sources des données

| Donnée | Source |
|---|---|
| Observations d'ambroisie | iNaturalist, qualité recherche |
| Parcours de collecte | Campagnes de terrain du projet |
| Découpages, affectation du sol, voirie | Données ouvertes des villes de Sherbrooke, Montréal et Québec |
| Pédologie (Sherbrooke) | Institut de recherche et de développement en agroenvironnement |
| Utilisation du territoire (Québec) | Ministère de l'Environnement, de la Lutte contre les changements climatiques, de la Faune et des Parcs |
| Terrains à potentiel | Rôle d'évaluation foncière (MAMH), catégories du rapport MSSS 14-244-03W |
| Scénarios climatiques | CanDCSU6 — Environnement et Changement climatique Canada |

---

## Crédits

Le tableau de bord analytique est fondé sur le travail de **Fritzno Louis**
(essai de maîtrise, mai 2026). La modélisation prédictive du risque est due à
**Wilfix Sagard**, l'identification automatique par vision par ordinateur à
**Omar Guettache**.

Les couches de modélisation versées dans ce site sont des **reproductions
indépendantes** du protocole publié, à partir des données librement
accessibles : ce ne sont pas les cartes de leurs auteurs, et les valeurs
diffèrent des leurs. Chaque carte le déclare dans sa fiche de métadonnées.

Direction scientifique : Pr Mickaël Germain (chercheur principal), Pr Yacine
Bouroubi, Pr Samuel Foucher, Pr Philippe Apparicio.

Données et outils de sources ouvertes ; produits cartographiques conformes aux
normes de l'Open Geospatial Consortium, en vue d'une intégration au Géoportail
de l'INSPQ.
