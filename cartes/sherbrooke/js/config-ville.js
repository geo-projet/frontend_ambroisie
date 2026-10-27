/* =========================================================================
   Configuration de la ville couverte par ce tableau de bord.

   C'est le seul fichier a adapter pour decliner le tableau de bord vers une
   autre ville (Montreal, Quebec) : le reste du code lit ces valeurs.
   Voir site/README.md pour la marche a suivre complete.
   ========================================================================= */

const CONFIG_VILLE = {
    id: 'sherbrooke',
    nom: 'Sherbrooke',

    // Formulations reprises dans le panneau « Informations ».
    article: 'la ville de Sherbrooke',
    situation: "Sherbrooke est le premier des trois sites d'étude ; "
             + 'Montréal et Québec suivent le même gabarit.',

    // Identifiants iNaturalist
    inaturalist: {
        taxonId: 53587,     // Ambrosia artemisiifolia
        placeId: 199762,    // Sherbrooke
        depuis: '2019-01-01'
    },

    // Vue initiale de la carte
    vue: {
        centre: [-71.98, 45.408],
        zoom: 11.4
    },

    // Emprise de filtrage des observations [lonMin, latMin, lonMax, latMax].
    // Ecarte les observations regionales situees hors du territoire couvert.
    emprise: [-72.15, 45.28, -71.75, 45.55],

    // Jeu local affiche immediatement, avant la mise a jour iNaturalist
    sauvegardeLocale: 'data/ambroisie_backup.geojson',

    // Guide d'utilisation, commun aux trois villes ; il vit ici.
    guide: 'guide.html',

    /* Couches produites par le projet lui-meme, par opposition aux couches
       de contexte declarees plus bas. Toutes les villes n'en portent pas
       autant : le modele predictif n'existe pour l'instant qu'a Sherbrooke. */
    modules: {
        prediction: true,
        terrains: true
    }
};


/* Couches vectorielles de la ville.

   C'est ici que se déclare ce qui existe : le moteur cartographique les
   construit à partir de cette liste, le panneau « Couches » s'y adapte, et
   les analyses de répartition ne proposent que les découpages présents.
   Ajouter une couche à une nouvelle ville ne demande donc pas de toucher au
   moteur.

   Champs :
     id          identifiant interne, aussi utilisé comme titre de couche ;
     fichier     GeoJSON dans data/ ;
     libelle     nom affiché dans le panneau ;
     type        'polygone', 'ligne' ou 'etiquette' ;
     visible     affichée au démarrage ;
     decoupage   utilisable pour agréger les observations ;
     attribut    champ portant le nom du découpage ;
     analyse     libellé de l'entrée dans le sélecteur d'analyse ;
     navigation  sert à la navigation « zoom par secteur » ;
     style       trait, remplissage, largeur, tirets ;
     couleur     couleur des barres de l'analyse ;
     graphique   'secteurs' pour un diagramme circulaire, barres sinon ;
     palette     fonction de style par classe, pour les couches thématiques.
*/
const COUCHES_VILLE = [
    {
        id: 'pedologie', fichier: 'data/pedologie.geojson',
        libelle: 'Types de sol', type: 'polygone', visible: true,
        decoupage: true, attribut: 'classe', analyse: 'Par type de sol',
        palette: 'pedologie', metadonnees: 'metadataLayer4'
    },
    {
        id: 'affectation', fichier: 'data/Affectation_sol.geojson',
        libelle: 'Affectation des sols', type: 'polygone', visible: true,
        decoupage: true, attribut: 'TYPE', analyse: "Par affectation des sols",
        couleur: '#4CAF50', palette: 'affectation', metadonnees: 'metadataLayer5'
    },
    {
        id: 'routes', fichier: 'data/Reseau_routier.geojson',
        libelle: 'Routes', type: 'ligne', visible: false,
        style: { trait: 'rgb(96,81,68)', largeur: 1 },
        metadonnees: 'metadataLayer2'
    },
    {
        id: 'trajets', fichier: 'data/trajets_24_25.geojson',
        libelle: 'Trajets de collecte', type: 'ligne', visible: false,
        style: { trait: '#ff7f00', largeur: 1.5 },
        metadonnees: 'metadataLayer1'
    },
    {
        id: 'secteur', fichier: 'data/Secteur.geojson',
        libelle: 'Secteurs', type: 'etiquette', visible: true,
        decoupage: true, attribut: 'NOM', analyse: 'Par secteur',
        couleur: '#40691e', navigation: true,
        style: { trait: '#fc0707', largeur: 2, tirets: [10, 7] },
        metadonnees: 'metadataLayer7'
    },
    {
        id: 'arrondissement', fichier: 'data/arrondissement_sherbrooke.geojson',
        libelle: 'Arrondissements', type: 'polygone', visible: true,
        decoupage: true, attribut: 'NOM', analyse: 'Par arrondissement',
        graphique: 'secteurs',
        style: { trait: '#050505', largeur: 2, tirets: [10, 7] },
        metadonnees: 'metadataLayer6'
    }
];

/* Villes du projet, pour le selecteur de l'en-tete.
   Passer `disponible: true` et renseigner `url` des qu'une ville est livree. */
const VILLES_PROJET = [
    { id: 'sherbrooke', nom: 'Sherbrooke', disponible: true,  url: '../sherbrooke/' },
    { id: 'montreal',   nom: 'Montréal',   disponible: true,  url: '../montreal/' },
    { id: 'quebec',     nom: 'Québec',     disponible: true,  url: '../quebec/' },
    // Carte provinciale du volet 3 : ce n'est pas une ville, mais elle se
    // rejoint depuis le même sélecteur.
    { id: 'projections', nom: 'Projections', disponible: true,
      url: '../projections/index.html' }
];
