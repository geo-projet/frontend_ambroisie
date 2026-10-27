# Documentation technique

Projet pilote INSPQ / Université de Sherbrooke — Département de géomatique appliquée.

> **Les scripts Python ne font pas partie de ce dépôt.** Ce document décrit la
> méthode et renvoie souvent à `tools/` — chaîne de production des données,
> gardée dans le dépôt de travail du projet. Ces renvois sont des références,
> pas des liens : ils situent le code qui a produit chaque couche, et les
> réglages à reprendre pour la régénérer.
>
> Pour prendre le site en main, commencer par le [README](README.md).

Ce dossier est **autonome et déployable tel quel** : page du projet, trois
tableaux de bord municipaux — Sherbrooke, Montréal, Québec — et carte
provinciale des projections climatiques. Tous les chemins sont relatifs, il
fonctionne donc aussi bien depuis un serveur local que depuis un sous-répertoire
d'un domaine.

Il ne contient que des fichiers statiques. Les scripts qui produisent ses
données vivent à côté, dans [`../tools/`](../tools/) — voir *Régénérer les
données* plus bas.

## Lancer le site en local

```bash
cd main && python tools/serveur_dev.py
```

Puis ouvrir <http://localhost:8777>. Le script imprime l'adresse des six pages.

**Préférer ce script à `python -m http.server`**, qui n'envoie aucun en-tête de
cache : le navigateur applique alors son heuristique de fraîcheur — environ un
dixième du temps écoulé depuis la dernière modification — et réutilise un
fichier sans demander au serveur s'il a changé. Une correction reste donc
invisible, et l'on croit à tort qu'elle n'a pas été faite. `serveur_dev.py`
répond `Cache-Control: no-store` : un simple rechargement suffit.

Si un affichage ancien persiste malgré tout, c'est le **service worker** : il
survit aux rechargements. Dans les outils de développement, onglet
*Application* → *Service Workers* → *Unregister*, ou clic droit sur le bouton
de rechargement → *Vider le cache et effectuer une actualisation forcée*.

Un serveur est nécessaire : ouvrir `index.html` par un double-clic (`file://`)
empêche le chargement des GeoJSON et les appels réseau.

### Reprendre les aperçus des cartes

Les quatre vignettes de la section « Sites d'étude »
(`assets/img/apercu-*.jpg`, 800 × 372) sont des captures : elles vieillissent à
mesure que les données changent. Pour les refaire, ouvrir chaque carte à une
fenêtre de 1 280 × 800, **attendre que plus aucune tuile du fond ne soit en
vol** — sans quoi la capture montre une carte blanche — puis recadrer à partir
de 28 pixels du haut, de façon à garder le bandeau d'indicateurs et la carte.
Le CSS impose `height: 176px` et `object-fit: cover` : seul le ratio de 2,15
compte, et 800 pixels de large suffisent même sur un écran à forte densité.

## Ce que contient le site

| Page | Adresse | Objet |
|---|---|---|
| Page du projet | `index.html` | Contexte, méthode, travaux réalisés, avancement, chronologie, équipe |
| Tableau de bord de Sherbrooke | `cartes/sherbrooke/` | Observations, couches thématiques, modèle prédictif, analyses, zone tampon |
| Tableau de bord de Montréal | `cartes/montreal/` | Observations, arrondissements, affectation du sol, terrains à potentiel |
| Tableau de bord de Québec | `cartes/quebec/` | Observations, quartiers, voies publiques, terrains à potentiel |
| Guide d'utilisation | `cartes/sherbrooke/guide.html` | Mode d'emploi illustré, **commun aux trois cartes** ; les trois y renvoient |
| Projections climatiques | `cartes/projections/` | Déplacement de la bande climatique selon les scénarios |

## Arborescence

```
site/
├── index.html                      Page du projet
├── assets/
│   ├── css/site.css                Charte graphique du site
│   ├── js/site.js                  Compteurs des trois villes, menu des cartes
│   └── img/                        Logos et visuels
└── cartes/
    ├── sherbrooke/                 Tableau de bord municipal — gabarit
    │   ├── index.html              Carte, panneaux, tableau de bord
    │   ├── guide.html              Guide illustré, commun aux trois cartes
    │   ├── js/config-ville.js      ← seul fichier propre à la ville
    │   ├── js/script.js            Moteur cartographique (OpenLayers 9)
    │   ├── js/prediction.js        Couche du modèle prédictif
    │   ├── js/terrains.js          Couche des terrains à potentiel
    │   ├── js/bandeau.js           Sélecteur de carte de l'en-tête
    │   ├── css/style.css           Styles du tableau de bord
    │   ├── css/projet.css          En-tête de projet et indicateurs
    │   ├── serviceworker.js        Mise en cache hors ligne
    │   └── data/                   GeoJSON allégés
    ├── montreal/                   Engendré — ni guide.html ni screenshots/
    ├── quebec/                     Engendré — ni guide.html ni screenshots/
    └── projections/                Carte provinciale du volet 3
        ├── index.html              Carte, commandes, encadré méthodologique
        ├── js/carte.js             Couches, scénarios, horizons, lecture animée
        ├── css/style.css           Styles de la carte
        └── data/                   Couches d'analogie + métadonnées
```

La charte est commune : `cartes/projections/` réutilise `css/projet.css` du
tableau de bord pour son en-tête et son bandeau d'indicateurs.

---

## Le moteur du tableau de bord

Un seul moteur sert les trois villes. Ce qui suit vaut donc pour les trois ;
les chiffres cités sont ceux de Sherbrooke, la ville de référence.

### Chargement des observations

Le tableau de bord affiche **d'abord le jeu de référence local**
(`data/ambroisie_backup.geojson`), ce qui garantit une carte peuplée dès
l'ouverture et même sans réseau — lors d'une présentation, une carte vide en
attendant une trentaine d'appels réseau n'est pas acceptable. Il interroge
**ensuite** l'API iNaturalist en arrière-plan.

Trois points conditionnent cette mise à jour, et chacun a déjà causé une panne :

- **les pages se demandent par vagues de cinq.** L'API répond en environ deux
  secondes ; une par une, les 28 pages de Sherbrooke demanderaient près d'une
  minute et le budget de temps serait épuisé avant la fin. Par vagues, la
  récupération complète prend une à six secondes selon la ville ;
- **le filtre `quality_grade=research` est le même** que dans
  `tools/villes/observations.py`. Sans lui, la carte compterait aussi les
  observations non validées et les totaux ne voudraient plus dire la même chose
  que le jeu local ;
- **la fusion se fait sur l'identifiant d'observation.** Le remplacement en bloc
  n'a lieu que si la récupération est complète, c'est-à-dire si le nombre
  d'observations reçues atteint le `total_results` annoncé par l'API : c'est le
  seul cas où l'absence d'une observation signifie vraiment son retrait. Une
  récupération partielle ajoute ce qui est nouveau au lieu d'être jetée.

Le bandeau distingue les trois issues : mise à jour complète, mise à jour
partielle avec le nombre d'observations ajoutées, ou mode hors ligne.

Le jeu local est filtré à l'emprise définie dans `config-ville.js`, ce qui
écarte les observations régionales hors du territoire couvert — d'où l'écart
entre les 5 462 observations du fichier de Sherbrooke et les 5 391 affichées.
Une fois la mise à jour faite, le total correspond à ce que l'API annonce pour
la même requête.

### Rendu de la carte

La carte se resynchronise sur son conteneur (`ResizeObserver`, `load`, chargement
des polices) et force un premier rendu explicite. Sans cela, OpenLayers fige une
taille de conteneur avant la fin de la mise en page et **le fond de carte tuilé
n'est jamais demandé** : la carte reste blanche jusqu'au premier redimensionnement
de la fenêtre. Un filet de rattrapage redemande les tuiles si aucune n'a été
sollicitée après 1,5 seconde.

Le service worker sert le code **par le réseau d'abord**, le cache ne servant que
de repli hors ligne. Une mise à jour du tableau de bord est donc visible
immédiatement, sans purge manuelle. Au premier chargement après une mise à jour,
un `Ctrl+Shift+R` reste utile si un ancien service worker était installé.

### Titres et nom de la ville

Le nom de la ville n'est écrit nulle part à la main. `js/bandeau.js` renseigne le
sous-titre du bandeau et le titre au-dessus de la carte depuis
`CONFIG_VILLE.nom`, en même temps qu'il construit le sélecteur de carte.
`construire.py` inscrit **en plus** ce nom dans le balisage engendré : la page
est donc juste avant même l'exécution du script — pas de « Sherbrooke » qui
clignote au chargement, et un cache navigateur périmé sur `bandeau.js` ne fait
pas mentir l'en-tête.

Le cache hors ligne est passé à `ambroisie-pwa-v5` à cette occasion, pour que
les visiteurs déjà venus reçoivent les fichiers à jour.

### Fenêtre d'accueil

Elle ne s'affiche qu'à la première visite (mémorisée dans le navigateur). Pour la
réafficher — au début d'une démonstration par exemple — ouvrir
`cartes/sherbrooke/index.html?accueil`.

---

## Couche du modèle prédictif

Sherbrooke et Québec portent une couche de modélisation prédictive à trois
vues : probabilité de présence, incertitude du krigeage, et lecture croisée des
deux en quatre situations de gestion municipale.

Les deux cartes n'ont pas le même statut, et l'interface le dit :

- **à Sherbrooke, une reproduction indépendante** du protocole publié dans
  l'essai de Wilfix Sagard, à partir des données librement accessibles. Ce ne
  sont pas ses cartes, et les valeurs diffèrent des siennes — l'essai porte sur
  ce territoire, donc le résultat s'y compare ;
- **à Québec, une transposition.** L'essai ne couvre pas Québec : aucune valeur
  publiée ne permet de juger le résultat. Il sert de point de départ, non de
  référence.

Montréal n'en a pas : le protocole tire ses pseudo-absences des parcours GPS, et
la campagne de 2026 n'y a couvert que 178 km.

### Régénérer les couches

```bash
cd main/tools/modele
python covariables.py quebec    # NDVI, MNT, SWI, distance aux routes, occupation
python echantillon.py quebec    # présences + pseudo-absences le long des parcours
python modeliser.py quebec      # XGBoost, variogramme, krigeage à dérive externe
python exporter.py quebec       # GeoJSON vers cartes/quebec/data/
```

Sans argument, la chaîne travaille sur Sherbrooke. Chaque ville a **son propre
cache** (`tools/modele/_cache/<ville>/`) : les rasters portent des noms
génériques, et sans cette séparation Québec écraserait Sherbrooke sans rien
dire. `--force` les régénère.

Comptez deux heures pour Sherbrooke et près de trois pour Québec, dont
l'essentiel à lire les scènes Sentinel-2. La grille de Québec compte
2,3 millions de cellules contre 919 219.

Ce que chaque ville déclare dans `tools/modele/config.py` : ses fichiers, la
provenance de son occupation du sol, l'intervalle d'altitude plausible pour le
contrôle — Québec borde un fleuve, et le modèle de terrain y descend à −31 m —
et les réglages d'allègement des couches exportées.

### Résultats

| | Sherbrooke | Québec | Essai de W. Sagard |
|---|---|---|---|
| ROC-AUC hors pli | **0,604** | **0,815** | 0,83 |
| Seuil opérationnel | 0,059 | 0,278 | 0,36 |
| Présences | 1 640 | 975 | 5 124 |
| Pseudo-absences | 2 297 | 1 293 | 10 726 |
| Ratio obtenu | 1:1,40 | 1:1,33 | 1:2,1 |
| Portée du variogramme | 749 m | 835 m | — |
| Résolution | 20 m | 20 m | 10 m |

**Les trois colonnes ne se comparent pas entre elles.** L'essai porte sur
Sherbrooke : seule la première s'y confronte. Québec est un autre territoire,
avec un autre échantillon — un 0,815 n'y est pas « meilleur » qu'un 0,604
ailleurs, il porte sur autre chose.

Ce qui s'interprète, en revanche, c'est pourquoi les covariables fonctionnent
mieux à Québec : le NDVI y sépare nettement les deux groupes, avec une médiane
de 0,86 aux présences contre 0,44 aux pseudo-absences. À Sherbrooke les deux
médianes sont identiques, et c'est le krigeage qui porte seul l'information.

### Ce que vaut la carte de Québec

**31,7 % du territoire ressort en « intervention prioritaire »**, proportion
voisine de celle de Sherbrooke (33,8 %) mais difficilement actionnable pour une
municipalité. Deux causes : le seuil retenu par maximisation du F1 est bas
(0,278), et les pseudo-absences, tirées le long des parcours, sous-représentent
les secteurs jamais visités. C'est un point de méthode à reprendre, non un
défaut d'exécution.

**L'écart de ROC-AUC est réel et rapporté tel quel.** Il ne doit pas être
résorbé en ajustant les hyperparamètres jusqu'à retrouver 0,83. Trois causes
identifiées :

- le modèle numérique de terrain canadien (≈ 20 m) remplace le MNT LiDAR
  municipal (≈ 1 m), ce qui efface les micro-contextes topographiques ;
- l'occupation du sol se limite à l'affectation municipale, sans la couche
  provinciale avec laquelle l'essai la fusionne ;
- les parcours GPS disponibles totalisent 396 km et ne permettent pas
  d'atteindre le ratio 1:2,1 de l'essai.

La deuxième cause est désormais levable : le service provincial d'utilisation
du territoire, mis en place pour Québec, couvre aussi Sherbrooke. L'y appliquer
rapprocherait la reproduction du protocole de l'essai — mais changerait ses
chiffres publiés, dont le 0,604 cité dans la présentation à l'INSPQ.

**Un constat de méthode.** Les pseudo-absences étant tirées le long des mêmes
parcours que les présences, elles partagent leur contexte : ce sont des
absences difficiles. Les covariables les séparent mal — médiane de NDVI
identique des deux côtés — et c'est le krigeage qui porte l'essentiel de
l'information. Le variogramme le confirme : 97 % de la variance
résiduelle est structurée spatialement, sur une portée de 749 m. Dans
cette reproduction, le signal est spatial bien plus qu'environnemental.

### Placement dans la pile des couches

La couche s'insère **au-dessus** de la pédologie et de l'affectation du sol —
des aplats opaques qui la masqueraient entièrement — et **sous** les limites
administratives et les observations, qui doivent rester lisibles par-dessus.
`js/prediction.js` et `js/terrains.js` calculent cette position en cherchant la
première couche **de type `etiquette`** déclarée dans `COUCHES_VILLE`, ou à
défaut la couche d'ambroisie. Les repères ne sont donc plus des noms écrits en
dur : une ville qui appelle son découpage « quartier » plutôt que « secteur »
fonctionne sans ajustement.

### Ce qui se règle où

| Besoin | Fichier |
|---|---|
| Résolution, emprise, sources | `tools/modele/config.py` |
| Protocole d'échantillonnage | `tools/modele/config.py`, section échantillonnage |
| Voisinage et grille de krigeage | `tools/modele/config.py`, `VOISINS_KED`, `PAS_KRIGEAGE` |
| Classes et couleurs | `tools/modele/config.py`, `CLASSES_*` |
| Texte de la fiche de métadonnées | `cartes/sherbrooke/index.html`, modale `metadataLayer8` |

### Substituer les cartes de l'auteur

Le format attendu est le même que pour les projections climatiques : un
GeoJSON par vue, nommé `prediction_<vue>.geojson`, dont les polygones portent
`cle`, `libelle`, `couleur`, `ordre` et `part`, plus un
`prediction_metadonnees.json` décrivant classes, métriques et avertissement.
Produire ces fichiers depuis les sorties de l'auteur suffit à basculer la
couche, sans toucher à l'interface — seul l'avertissement de reproduction sera
à retirer.

## Terrains à potentiel de colonisation

Les trois cartes portent une couche des terrains propices à l'herbe à poux,
identifiés d'après leur **usage réel déclaré au rôle d'évaluation foncière**.
Elle complète le modèle prédictif : là où celui-ci infère un risque à partir de
variables environnementales, celle-ci désigne des terrains nommés.

La méthode vient du rapport du MSSS **14-244-03W** (2015), qui regroupe les
codes d'utilisation des biens-fonds en sept catégories, validées par
l'inspection de 999 terrains à Beauport, Granby et Pierrefonds-Roxboro.

### Ce qui est produit

| Ville | Terrains retenus | Unités du rôle | Part |
|---|---|---|---|
| Sherbrooke | 6 655 | 56 325 | 11.8 % |
| Québec | 10 749 | 175 478 | 6.1 % |
| Montréal | 22 168 | 437 192 | 5.1 % |

L'appariement entre le rôle et sa couche géolocalisée est **complet** dans les
trois villes, et les trois couches sont livrées dans le site.

### Ce que la couche vaut

Part des observations validées situées à moins de 100 m d'un terrain retenu,
comparée à la même mesure sur des points tirés au hasard du même territoire :

| Ville | Observations proches | Points au hasard | Distance médiane |
|---|---|---|---|
| Sherbrooke | **52,6 %** | 0,8 % | 95 m |
| Québec | **65,6 %** | 28,6 % | 85 m |
| Montréal | **37,9 %** | 13,9 % | 165 m |

**Le contraste n'est net qu'à Sherbrooke.** À Québec, les terrains retenus sont
si nombreux et si dispersés qu'un point tiré au hasard en côtoie déjà un près de
trois fois sur dix : l'écart avec les observations réelles perd l'essentiel de
sa force. À Montréal, la faiblesse des deux chiffres reflète surtout le petit
nombre d'observations disponibles au moment de la mesure. La couche garde sa valeur d'aide à l'inspection ; elle
ne constitue pas un test statistique.

Cela n'établit pas non plus que ces terrains sont colonisés : le rapport les
désigne comme terrains **à inspecter**, et conclut lui-même que leur potentiel
de colonisation ne se compare pas d'un territoire à l'autre. L'interface le
dit.

### Régénérer les couches

```bash
cd main/tools/cubf
python categories.py    # annexe du rapport → correspondance code → catégorie
python construire.py    # rôles MAMH, jointure par matricule
python exporter.py      # GeoJSON vers le site
```

Le premier passage télécharge l'archive des rôles géoréférencés (573 Mo, 2,8 Go
décompressés) et les rôles XML des villes (68 à 795 Mo). Le cache va dans le
dossier temporaire du système, pas à côté du projet : la variable
`CUBF_CACHE` permet de le placer ailleurs.

### Deux points à connaître

**La couche est ponctuelle.** Le rôle localise chaque unité d'évaluation par un
point, non par le contour de la parcelle. Restituer les limites des terrains
demanderait le cadastre du Québec, une autre source.

**Les résidentiels haute densité ne se déduisent pas du seul code.** Le rapport
les définit par au moins douze logements : le code 1000 est donc croisé avec le
nombre de logements déclaré au rôle. À Sherbrooke, cela ramène 47 098 unités à
841.

### Ce qui se règle où

| Besoin | Fichier |
|---|---|
| Villes, seuil de logements, couleurs | `tools/cubf/config.py` |
| Codes retenus par catégorie | `tools/cubf/_sortie/cubf_categories.json` |
| Texte de la fiche, Sherbrooke | `cartes/sherbrooke/index.html`, modale `metadataLayer9` |
| Texte de la fiche, villes engendrées | `tools/villes/config.py`, clé `description` de la couche |

Le fichier `cubf_categories.json` est lisible et corrigeable à la main : c'est
lui qui fait autorité, pas le code qui l'a produit. Après retouche, relancer
`construire.py` puis `exporter.py`.

## Carte des projections climatiques

`cartes/projections/` répond à une question précise : **où se trouvera demain le
climat estival qu'ont aujourd'hui les lieux où l'ambroisie est observée ?**

Ce n'est **pas** une prédiction de présence. Ni l'occupation du sol, ni la
dispersion de la plante, ni la concurrence ou l'adaptation n'entrent dans le
calcul. C'est une carte d'analogue climatique, appelée à céder la place à la
sortie du modèle de distribution en préparation.

### Ce qu'elle montre

Quatre situations par cellule, pour la température estivale :

| Classe | Signification |
|---|---|
| Trop frais | En deçà de la bande actuellement occupée |
| Climat analogue | Dans la bande : climat comparable à celui des lieux occupés |
| Plus chaud que la bande | Au-delà, mais dans la gamme présente aujourd'hui quelque part au Québec |
| Au-delà du climat connu | Au-delà de tout climat actuel du territoire — aucune observation ne renseigne ce cas |

La dernière classe est essentielle : sous forte émission en fin de siècle, elle
couvre l'essentiel du territoire. La carte le signale plutôt que d'afficher une
valeur qu'aucune donnée ne soutient.

### Deux limites, affichées dans l'interface

**Le biais d'observation.** Les observations citoyennes se concentrent là où les
gens vivent. En comparant aux observations d'astéracées du Québec — même famille,
même détectabilité, même effort — l'ambroisie occupe un climat estival *plus
frais* de 0,56 °C que le groupe cible. Le contraste thermique apparent entre
présences et territoire tient donc en partie à la répartition de l'effort
d'observation. Ce diagnostic est calculé à chaque calibration et affiché sur la
carte.

**Le versant chaud n'est pas calibrable.** Les données climatiques d'ECCC
s'arrêtent à la frontière canadienne, où la température estivale plafonne à
22 °C, alors que l'ambroisie prospère bien plus au sud. Aucun optimum écologique
ne peut donc être estimé ici — d'où le choix d'une carte d'analogie, qui n'en
demande aucun.

---

## Régénérer les données

Les scripts vivent dans [`../tools/`](../tools/), hors du site : on ne déploie
pas de code Python avec des fichiers statiques.

### Couches des villes engendrées

```bash
cd main/tools/villes
python telecharger.py    # couches municipales, reprojetées et découpées
python observations.py   # jeux locaux d'observations iNaturalist
python construire.py     # assemblage des dossiers de carte
```

Voir *Les trois tableaux de bord* plus bas pour le détail. La suite de cette
section décrit la préparation initiale des couches de Sherbrooke, qui ne
provenaient pas d'un portail de données ouvertes.

### Couches d'origine de Sherbrooke

Les couches d'origine effectivement exploitées par le tableau de bord
(`fritzno/Tableau_de_bord/data/`) totalisent environ **51 Mo** et portent des
coordonnées à 12 décimales, soit une précision sub-nanométrique sans intérêt
cartographique. Le dossier source en contient davantage — habitat, utilisation
du territoire — que le tableau de bord n'affiche pas et qui ne sont donc pas
copiées.

```bash
cd main
python tools/alleger_geojson.py <dossier_source> site/cartes/<ville>/data
```

Le script les ramène à **7,8 Mo** par troncature de précision et simplification
Douglas-Peucker, sans perte visible. Il préserve le membre `crs` de chaque
fichier — OpenLayers s'en sert pour reprojeter, les couches n'étant pas toutes
dans la même projection — ainsi que les attributs exploités par les graphiques
(`classe`, `CLASSE`, `NOM`).

Les couches lourdes (trajets de collecte, réseau routier) ne sont plus affichées
au démarrage : elles se chargent à la première activation de leur case dans le
panneau *Couches*.

### Couches des projections climatiques

```bash
cd main/tools/climat
python telecharger.py    # rasters ECCC (WCS CanDCSU6), mis en cache
python calibrer.py       # bande d'analogie + diagnostic de biais
python projeter.py       # classement par scénario et horizon
python exporter.py       # GeoJSON vers site/cartes/projections/data/
```

Chaque étape imprime ses contrôles et **s'arrête si une incohérence apparaît** :
anomalies non croissantes avec le forçage ou l'horizon, saturation de la bande,
part hors analogue qui diminue avec le temps.

Ajouter `--force` à `telecharger.py` pour ignorer le cache de rasters, à
`calibrer.py` pour retélécharger les observations.

Les résultats intermédiaires restent dans `tools/climat/_rasters/` (GeoTIFF) et
`tools/climat/_sortie/` (calibration, grilles). Ces dossiers peuvent être
supprimés sans risque : ils se reconstruisent.

| Besoin | Fichier |
|---|---|
| Emprise, scénarios, horizons, variables | `tools/climat/config.py` |
| Seuils de la bande d'analogie | `tools/climat/_sortie/appartenance.json`, clé `bande` |
| Couleurs et libellés des classes | `tools/climat/projeter.py`, `CLASSES_ANALOGIE` |
| Textes de l'encadré méthodologique | `site/cartes/projections/index.html` |

Les seuils d'`appartenance.json` sont lisibles et modifiables à la main : après
retouche, relancer `projeter.py` puis `exporter.py`.

---

## Les trois tableaux de bord

Les trois villes partagent un seul moteur cartographique. Ce qui les distingue
tient dans `js/config-ville.js`, qui déclare les couches disponibles ; le
panneau *Couches*, les analyses de répartition, la navigation par découpage et
les fiches de métadonnées s'y adaptent d'eux-mêmes.

| | Sherbrooke | Québec | Montréal |
|---|---|---|---|
| Observations iNaturalist | 5 383 | 2 515 | 990 |
| Découpage administratif | 4 arrondissements, 9 secteurs | 35 quartiers | 34 arrondissements |
| Réseau routier | ✓ | ✓ | ✓ |
| Affectation du sol | ✓ | — | ✓ (plan d'urbanisme) |
| Pédologie | ✓ (IRDA) | — | — |
| Terrains à potentiel | 6 655 | 10 749 | 22 168 |
| Modèle prédictif | ✓ (0,604) | ✓ (0,815) | — |
| Trajets de collecte | ✓ (92 parcours, 396 km) | ✓ (58 parcours, 248 km) | ✓ (20 parcours, 178 km) |

Les écarts sont réels et l'interface les assume : Québec ne propose pas
d'analyse par type de sol parce que la donnée n'existe pas en libre accès, et
Montréal compte 990 observations pour 178 km de parcours, contre 5 383 à
Sherbrooke pour 396 km sur deux saisons — l'écart tient à l'ampleur de la
collecte, non à la rareté de l'ambroisie.

Ces totaux sont ceux de la qualité recherche, relevés en direct auprès de
l'API. Les jeux de référence livrés dans le dépôt, affichés d'emblée et seuls
disponibles hors ligne, comptent 5 462, 2 333 et 836 observations : ils datent
d'août 2026.

La pédologie de l'IRDA n'est pas diffusée en données ouvertes ; celle de
Sherbrooke a été obtenue autrement.

### Ce que déclare `config-ville.js`

```js
const CONFIG_VILLE = {
    id, nom,                    // identité
    article, situation,         // formulations du panneau « Informations »
    inaturalist: { taxonId, placeId | parEmprise, depuis },
    vue: { centre, zoom },
    emprise,                    // [lonMin, latMin, lonMax, latMax]
    sauvegardeLocale,           // jeu affiché avant la mise à jour iNaturalist
    guide,                      // adresse du guide, commun aux trois villes
    modules: { prediction, terrains }
};

const COUCHES_VILLE = [ /* une entrée par couche de contexte */ ];
```

Chaque entrée de `COUCHES_VILLE` porte :

| Champ | Rôle |
|---|---|
| `id` | identifiant interne, aussi utilisé comme titre de couche |
| `fichier` | GeoJSON dans `data/` |
| `libelle` | nom affiché dans le panneau *Couches* |
| `type` | `polygone`, `ligne` ou `etiquette` |
| `visible` | affichée au démarrage |
| `a_venir` | case présente mais désactivée, pour une couche annoncée |
| `decoupage` | utilisable pour agréger les observations |
| `attribut` | champ portant le nom du découpage |
| `analyse` | libellé dans le sélecteur d'analyse |
| `couleur`, `graphique` | rendu du graphique (`secteurs` pour un diagramme circulaire) |
| `navigation` | sert au panneau *Zoom par secteur* et au filtre d'évolution |
| `style` | `trait`, `largeur`, `tirets` |
| `palette` | fonction de style par classe, pour les couches thématiques |
| `metadonnees` | identifiant de la fiche modale dans `index.html` |

**L'ordre de déclaration est l'ordre de dessin** : les aplats d'abord, les
lignes ensuite, les étiquettes au-dessus. Une couche d'étiquettes placée en
premier passerait sous les polygones opaques.

### Verser les trajets de collecte d'une ville

Les trajets ne viennent d'aucun portail de données ouvertes : ils sortent des
GPS des équipes de terrain, à la fin d'une campagne. Ils se déposent donc à la
main, et **c'est la présence du fichier qui active la couche** :

```bash
cp mes_trajets.geojson site/cartes/montreal/data/trajets.geojson
cd tools/villes && python construire.py montreal
```

Le nom `data/trajets.geojson` est attendu tel quel, et `construire.py` fait le
reste :

1. **le fichier déposé part au cache** (`tools/villes/_cache/<ville>_trajets.geojson`),
   avec ses fichiers annexes de QGIS s'il y en a. Il devient la source de
   référence : relancer le script repart toujours du brut, sans simplifier une
   seconde fois ce qui l'a déjà été ;
2. **il est allégé** — cinq décimales et simplification Douglas-Peucker à
   environ 1,1 m, soit le niveau de précision du GPS lui-même. Les 5,3 Mo de
   Québec tombent à 0,22 Mo. Simplifier plus franchement, comme pour le réseau
   routier, ferait couper les virages serrés à travers les pâtés de maisons ;
3. **les attributs sont filtrés** — seuls `trajet`, `debut`, `fin`,
   `distance_m`, `sport` et `n_points` sont publiés. Les exports Garmin et QGIS
   en portent d'autres, `chemin`, `path` et `fitfile`, qui citent l'arborescence
   du poste d'où vient l'export : ils n'ont rien à faire sur un site public ;
4. **la déclaration suit l'état réel** — l'indicateur `a_venir` disparaît, la
   couche s'affiche au démarrage, et le texte de la fiche de métadonnées bascule.
   Sans fichier, la case reste présente mais désactivée, avec la mention
   « à venir ».

Rien d'autre à modifier — surtout pas le `config-ville.js` engendré, qui serait
réécrit au passage suivant.

Le fichier attendu :

| | |
|---|---|
| Géométrie | `LineString` ou `MultiLineString` |
| Projection | WGS84, ou tout code EPSG déclaré dans le membre `crs` du GeoJSON |
| Attributs | facultatifs ; aucun n'est affiché, les trajets ne servent qu'au tracé |
| Poids | aucune limite à l'entrée : l'allègement est fait par `construire.py` |

Le tracé est orange (`#ff7f00`), comme à Sherbrooke, afin de se distinguer du
réseau routier qu'il emprunte en partie.

À Sherbrooke, dont la configuration est écrite à la main et non engendrée, les
trajets restent **décochés au démarrage** : le fichier y pèse 1,4 Mo pour
92 parcours, et les afficher d'emblée encombrerait la carte.

### Ajouter une quatrième ville

1. **Déclarer les sources** dans [`tools/villes/config.py`](../tools/villes/config.py) :
   portail CKAN, identifiant de paquet, libellés, styles et textes de
   métadonnées. Les URL ne sont pas écrites en dur — elles sont résolues par
   l'API du portail, ce qui évite qu'un lien changé casse la chaîne.

2. **Récupérer les données** :

   ```bash
   cd tools/villes
   python telecharger.py maville
   python observations.py maville
   ```

   `telecharger.py` reprojette au besoin (les portails municipaux publient
   volontiers en projection métrique), découpe à l'emprise et devine
   l'attribut de découpage. `observations.py` interroge iNaturalist par
   pagination sur identifiant — la pagination classique de l'API plafonne à
   10 000 résultats.

3. **Assembler le tableau de bord** :

   ```bash
   python construire.py maville
   cd ../cubf && python exporter.py maville
   ```

   `construire.py` copie le gabarit de Sherbrooke, allège les couches, écrit
   `config-ville.js` et adapte `index.html` — titre, nom de la ville, fiches de
   métadonnées, scripts chargés, lien vers le guide. Il ne recopie ni
   `guide.html` ni `screenshots/` : le guide est unique et les villes
   engendrées y renvoient.

4. **Activer la ville** dans `VILLES_PROJET` de chaque `config-ville.js`
   (`disponible: true`), puis sur la page du projet et dans son pied de page.

Relancer `construire.py` après une modification du gabarit met toutes les
villes engendrées à jour. Les corrections durables se portent donc dans
`tools/villes/config.py`, jamais dans les `config-ville.js` engendrés : la
prochaine génération les effacerait.

## Remplacer l'analogie climatique par le modèle de distribution

Le format de couche attendu par la carte des projections est volontairement
simple : un GeoJSON par combinaison de scénario et d'horizon, nommé
`analogie_<SCENARIO>_<HORIZON>.geojson`, contenant des polygones portant
`classe`, `libelle`, `couleur` et `ordre`, plus un `metadonnees.json` décrivant
scénarios, horizons, classes et parts de territoire.

Produire ces fichiers depuis la sortie du futur modèle suffit à basculer la
carte, sans modifier l'interface — seuls les libellés de classe et les textes
méthodologiques seront à revoir.

## Sources des données

| Donnée | Source |
|---|---|
| Observations d'ambroisie | iNaturalist, observations de qualité recherche |
| Scénarios climatiques | CanDCSU6 — Environnement et Changement climatique Canada (CMIP6 mis à l'échelle, ≈ 9 km) |
| Pédologie (Sherbrooke seule) | Institut de recherche et de développement en agroenvironnement (IRDA) |
| Affectation du sol, arrondissements, secteurs — Sherbrooke | Ville de Sherbrooke, données ouvertes |
| Réseau routier — Sherbrooke | Statistique Canada, fichiers du réseau routier |
| Quartiers, voies publiques — Québec | Ville de Québec, données ouvertes (`vque_9`, `vque_18`) |
| Limites de l'agglomération, affectation du plan d'urbanisme, Géobase — Montréal | Ville de Montréal, données ouvertes |
| Terrains à potentiel | Rôle d'évaluation foncière (MAMH) ; catégories du rapport MSSS **14-244-03W** |
| Trajets de collecte | Campagnes de terrain du projet |

## Origine du code

Le tableau de bord est fondé sur le travail de **Fritzno Louis** (Département de
géomatique appliquée). La version d'origine reste intacte dans
`fritzno/Tableau_de_bord/`. Les modifications apportées ici portent sur
l'intégration au site du projet, la performance de chargement, l'agrégation des
observations, l'enrichissement des popups et une série de correctifs.

La modélisation prédictive du risque est due à **Wilfix Sagard**, l'identification
automatique par vision par ordinateur à **Omar Guettache**.
