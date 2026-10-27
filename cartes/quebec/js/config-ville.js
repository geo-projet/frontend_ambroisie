/* =========================================================================
   Configuration de la ville couverte par ce tableau de bord.

   Fichier engendré par tools/villes/construire.py — les corrections durables
   se portent dans tools/villes/config.py, sans quoi la prochaine génération
   les effacerait.
   ========================================================================= */

const CONFIG_VILLE = {
    id: "quebec",
    nom: "Québec",

    // Formulations reprises dans le panneau « Informations ».
    article: "la ville de Québec",
    situation: "Québec est l'un des trois sites d'étude, aux côtés de Sherbrooke et de Montréal. La campagne de terrain de l'été 2026 y a parcouru 248 km, dont les trajets sont cartographiés ; les observations viennent pour l'instant surtout de la science citoyenne.",

    // Identifiants iNaturalist
    inaturalist: {
        taxonId: 53587,     // Ambrosia artemisiifolia
        placeId: 229560,    // Québec
        depuis: "2019-01-01"
    },

    // Vue initiale de la carte
    vue: {
        centre: [-71.3, 46.83],
        zoom: 11.0
    },

    // Emprise de filtrage des observations [lonMin, latMin, lonMax, latMax].
    emprise: [-71.62, 46.68, -71.06, 47.02],

    // Jeu local affiché immédiatement, avant la mise à jour iNaturalist
    sauvegardeLocale: 'data/ambroisie_backup.geojson',

    // Guide d'utilisation, commun aux trois villes.
    guide: "../sherbrooke/guide.html",

    /* Couches produites par le projet lui-même. Le modèle prédictif n'existe
       pour l'instant qu'à Sherbrooke ; les terrains à potentiel sont établis
       pour les trois villes. */
    modules: {
        prediction: true,
        terrains: true
    }
};


/* Couches vectorielles de la ville, dans l'ordre de dessin : les aplats
   d'abord, les lignes ensuite, les étiquettes au-dessus. Voir la
   configuration de Sherbrooke pour le détail des champs. */
const COUCHES_VILLE = [
    {
        id: "routes", fichier: "data/Reseau_routier.geojson",
        libelle: "Voies publiques", type: "ligne", visible: false,
        style: {"trait": "#605144", "largeur": 1},
        metadonnees: "metadata_routes"
    },
    {
        id: "trajets", fichier: "data/trajets.geojson",
        libelle: "Trajets de collecte", type: "ligne", visible: true,
        style: {"trait": "#ff7f00", "largeur": 1.5},
        metadonnees: "metadata_trajets"
    },
    {
        id: "quartier", fichier: "data/Quartier.geojson",
        libelle: "Quartiers", type: "etiquette", visible: true,
        decoupage: true, attribut: "NOM", analyse: "Par quartier",
        graphique: "secteurs",
        navigation: true,
        style: {"trait": "#fc0707", "largeur": 2, "tirets": [10, 7]},
        metadonnees: "metadata_quartier"
    }
];

/* Villes du projet, pour le sélecteur de l'en-tête. */
const VILLES_PROJET = [
    { id: 'sherbrooke', nom: 'Sherbrooke', disponible: true,  url: '../sherbrooke/' },
    { id: 'montreal',   nom: 'Montréal',   disponible: true,  url: '../montreal/' },
    { id: 'quebec',     nom: 'Québec',     disponible: true,  url: '../quebec/' },
    // Carte provinciale du volet 3 : ce n'est pas une ville, mais elle se
    // rejoint depuis le même sélecteur.
    { id: 'projections', nom: 'Projections', disponible: true,
      url: '../projections/index.html' }
];
