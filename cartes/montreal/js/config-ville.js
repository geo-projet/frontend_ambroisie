/* =========================================================================
   Configuration de la ville couverte par ce tableau de bord.

   Fichier engendré par tools/villes/construire.py — les corrections durables
   se portent dans tools/villes/config.py, sans quoi la prochaine génération
   les effacerait.
   ========================================================================= */

const CONFIG_VILLE = {
    id: "montreal",
    nom: "Montréal",

    // Formulations reprises dans le panneau « Informations ».
    article: "l'agglomération de Montréal",
    situation: "Montréal est l'un des trois sites d'étude, aux côtés de Sherbrooke et de Québec. La campagne de terrain de l'été 2026 y a parcouru 178 km, dont les trajets sont cartographiés ; le nombre d'observations reste modeste au regard de l'étendue de l'agglomération.",

    // Identifiants iNaturalist
    inaturalist: {
        taxonId: 53587,     // Ambrosia artemisiifolia
        // Le lieu iNaturalist de l'agglomération est incomplet : le filtrage
        // se fait par emprise, ce qui donne un décompte fidèle.
        parEmprise: true,
        depuis: "2019-01-01"
    },

    // Vue initiale de la carte
    vue: {
        centre: [-73.68, 45.54],
        zoom: 10.6
    },

    // Emprise de filtrage des observations [lonMin, latMin, lonMax, latMax].
    emprise: [-74.05, 45.38, -73.45, 45.72],

    // Jeu local affiché immédiatement, avant la mise à jour iNaturalist
    sauvegardeLocale: 'data/ambroisie_backup.geojson',

    // Guide d'utilisation, commun aux trois villes.
    guide: "../sherbrooke/guide.html",

    /* Couches produites par le projet lui-même. Le modèle prédictif n'existe
       pour l'instant qu'à Sherbrooke ; les terrains à potentiel sont établis
       pour les trois villes. */
    modules: {
        prediction: false,
        terrains: true
    }
};


/* Couches vectorielles de la ville, dans l'ordre de dessin : les aplats
   d'abord, les lignes ensuite, les étiquettes au-dessus. Voir la
   configuration de Sherbrooke pour le détail des champs. */
const COUCHES_VILLE = [
    {
        id: "affectation", fichier: "data/Affectation_sol.geojson",
        libelle: "Affectation du sol", type: "polygone", visible: true,
        decoupage: true, attribut: "categorie", analyse: "Par affectation du sol",
        couleur: "#4CAF50",
        style: {"trait": "#7a6a55", "largeur": 1},
        metadonnees: "metadata_affectation"
    },
    {
        id: "routes", fichier: "data/Reseau_routier.geojson",
        libelle: "Réseau routier", type: "ligne", visible: false,
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
        id: "arrondissement", fichier: "data/Arrondissement.geojson",
        libelle: "Arrondissements", type: "etiquette", visible: true,
        decoupage: true, attribut: "NOM", analyse: "Par arrondissement",
        graphique: "secteurs",
        navigation: true,
        style: {"trait": "#050505", "largeur": 2, "tirets": [10, 7]},
        metadonnees: "metadata_arrondissement"
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
