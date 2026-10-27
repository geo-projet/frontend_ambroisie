// ================ DEFINITION DES STYLES ===========
// Application d'un style pour la pédologie
const getStylePedologie = function (feature) {
    const pedo = feature.get('classe');

    // Dictionnaire des couleurs par type de sol
    const colorMap = {
        'Eau': '#08306b', // Etendu d'eau
        'Alluvions': '#115ca5', //Alluvions
        'Loam': '#3282be', // loam
        'Loam argileux': '#5ba3d0', // Loam argileux
        'Loam rocheux': '#8fc2de', // Loam rocheux
        'Loam sableux': '#bed8ec', // Loam sableux
        'Marécage': '#afd1e7', // Marécage
        'Sable fin': '#f7fbff',  // Sable fin
    };
    const fillColor = colorMap[pedo] || '#FFFFFF'; // couleur par défaut si code inconnu
    return new ol.style.Style({
        fill: new ol.style.Fill({
            color: fillColor
        }),
    });
};
// Application d'un style pour l'affectation des sols
const getStyleAffectation = function (feature) {
    const affectation = feature.get('CLASSE');

    // Dictionnaire des couleurs par type
    const colorMap = {
        'CV': '#91d6a0', // Centre-ville
        'CSR': '#a1be5c', // Commerciale et service régional
        'GPEP': '#927aaf', // Grand parc et espace public
        'I': '#f3f025', // Industrielle
        'M': '#1b6d49', // Mixte (multifonctionnelle)
        'PI': 'rgb(195, 236, 180)', // Publique et institutionnelle
        'PU': 'rgb(74, 163, 126)', // Publique utilitaire
        'R': 'rgb(157, 158, 89)', // Résidentielle

    };
    const fillColor = colorMap[affectation] || '#da0b0bff'; // couleur par défaut si code inconnu
    return new ol.style.Style({
        fill: new ol.style.Fill({
            color: fillColor
        }),
    });
};

// ============== BASEMAP LAYERS =================

// OpenStreetMap Standard
const OSMStandard = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    }),
    title: 'osm',
    visible: true
});
// Google Maps - Vue satellite
const SatLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        maxZoom: 10
    }),
    title: 'satellite',
    visible: false
});
// Google Maps - Vue "Streets"
const TopoLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
    }),
    title: 'topo',
    visible: false
});

// Fond de carte sombre de Google Map
const MapLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        maxZoom: 10
    }),
    title: 'map',
    visible: false
});

//=============== COUCHES VECTORIELLES ================
// Les couches ne sont pas ecrites ici mais declarees dans config-ville.js :
// une ville qui n'a ni pedologie ni affectation du sol n'en porte simplement
// pas la declaration, et tout ce qui en depend — panneau, analyses,
// navigation — s'y adapte.

const PALETTES = {
    pedologie: getStylePedologie,
    affectation: getStyleAffectation
};

function styleTrait(style) {
    return new ol.style.Stroke({
        color: style.trait || '#333333',
        width: style.largeur || 1,
        lineDash: style.tirets || undefined,
        lineCap: style.tirets ? 'round' : undefined
    });
}

function construireCouche(declaration) {
    const style = declaration.style || {};

    let fonctionStyle;
    if (declaration.palette && PALETTES[declaration.palette]) {
        fonctionStyle = PALETTES[declaration.palette];
    } else if (declaration.type === 'ligne') {
        const fixe = new ol.style.Style({ stroke: styleTrait(style) });
        fonctionStyle = function () { return fixe; };
    } else if (declaration.type === 'etiquette') {
        // Contour et nom du découpage, dessiné au centre de chaque entité.
        fonctionStyle = function (feature) {
            return new ol.style.Style({
                fill: new ol.style.Fill({ color: [250, 250, 250, 0] }),
                stroke: styleTrait(style),
                text: new ol.style.Text({
                    text: feature.get(declaration.attribut) || '',
                    font: 'italic bold 14px Calibri,sans-serif',
                    fill: new ol.style.Fill({ color: '#0e0d0d' }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 2 }),
                    overflow: true
                })
            });
        };
    } else {
        const fixe = new ol.style.Style({
            fill: new ol.style.Fill({ color: [250, 250, 250, 0] }),
            stroke: styleTrait(style)
        });
        fonctionStyle = function () { return fixe; };
    }

    return new ol.layer.Vector({
        source: new ol.source.Vector({
            url: declaration.fichier,
            format: new ol.format.GeoJSON()
        }),
        style: fonctionStyle,
        title: declaration.id,
        visible: declaration.visible !== false
    });
}

// Couches declarees, dans l'ordre de la configuration. Celles marquees
// `a_venir` ne sont pas construites : elles n'apparaissent que comme case
// desactivee dans le panneau.
const COUCHES = (typeof COUCHES_VILLE !== 'undefined' ? COUCHES_VILLE : [])
    .filter(d => !d.a_venir && d.fichier);

const couchesParId = {};
COUCHES.forEach(d => { couchesParId[d.id] = construireCouche(d); });

// Decoupages exploitables par les analyses de repartition.
const DECOUPAGES = (typeof COUCHES_VILLE !== 'undefined' ? COUCHES_VILLE : [])
    .filter(d => d.decoupage && d.attribut && !d.a_venir);

// ========= Groupes de couches =========

const baseLayerGroup = new ol.layer.Group({
    title: 'Fonds de carte',
    layers: [OSMStandard, SatLayer, TopoLayer, MapLayer]
});

const vectorLayerGroup = new ol.layer.Group({
    title: 'Couches vectorielles',
    layers: COUCHES.map(d => couchesParId[d.id])
});

// ========= Chargement des observations d'ambroisie =========
// Stratégie : le jeu local s'affiche immédiatement, ce qui garantit une carte
// peuplée dès l'ouverture et même sans réseau. La mise à jour iNaturalist se
// fait ensuite en arrière-plan et ne remplace le jeu local que si elle apporte
// davantage d'observations.

const baseUrl = 'https://api.inaturalist.org/v1/observations';
const taxonId = CONFIG_VILLE.inaturalist.taxonId;
const placeId = CONFIG_VILLE.inaturalist.placeId;
const perPage = 200;            // maximum autorisé par iNaturalist
const maxPages = 40;            // plafond de sécurité : 8000 observations
const pagesParVague = 5;        // requêtes simultanées, dans les usages de l'API
const budgetMs = 25000;         // temps maximal accordé à la mise à jour de fond
const localBackupUrl = CONFIG_VILLE.sauvegardeLocale;
const [lonMin, latMin, lonMax, latMax] = CONFIG_VILLE.emprise;

// Source partagée par la couche de points et la couche d'agrégats.
const ambroisieSource = new ol.source.Vector();

// Points individuels (zoom rapproché)
const ambroisieLayer = new ol.layer.Vector({
    source: ambroisieSource,
    style: new ol.style.Style({
        image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({ color: '#4a7c2f' }),
            stroke: new ol.style.Stroke({ color: '#ffffff', width: 1.2 })
        })
    }),
    title: 'ambroisie',
    visible: true,
    minZoom: 13.999
});

// Agrégats (zoom éloigné) : lisibilité en présentation et fluidité avec
// plusieurs milliers de points.
const cacheStylesCluster = {};
const ambroisieClusterLayer = new ol.layer.Vector({
    source: new ol.source.Cluster({
        distance: 32,
        minDistance: 16,
        source: ambroisieSource
    }),
    style: function (feature) {
        const n = feature.get('features').length;
        if (n === 1) {
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 5,
                    fill: new ol.style.Fill({ color: '#4a7c2f' }),
                    stroke: new ol.style.Stroke({ color: '#ffffff', width: 1.2 })
                })
            });
        }
        const rayon = n < 10 ? 12 : n < 50 ? 16 : n < 200 ? 20 : 24;
        const couleur = n < 10 ? '#6aa84f' : n < 50 ? '#4a7c2f' : n < 200 ? '#2f5d1e' : '#1e4213';
        const cle = rayon + '-' + couleur + '-' + n;
        if (!cacheStylesCluster[cle]) {
            cacheStylesCluster[cle] = new ol.style.Style({
                image: new ol.style.Circle({
                    radius: rayon,
                    fill: new ol.style.Fill({ color: couleur }),
                    stroke: new ol.style.Stroke({ color: 'rgba(255,255,255,0.85)', width: 2.5 })
                }),
                text: new ol.style.Text({
                    text: String(n),
                    font: 'bold 12px "Segoe UI", sans-serif',
                    fill: new ol.style.Fill({ color: '#ffffff' })
                })
            });
        }
        return cacheStylesCluster[cle];
    },
    title: 'ambroisie-cluster',
    visible: true,
    maxZoom: 14
});

vectorLayerGroup.getLayers().push(ambroisieLayer);
vectorLayerGroup.getLayers().push(ambroisieClusterLayer);

// ---- Construction des entités, format commun aux deux sources ----

function dansEmprise(lon, lat) {
    return lon >= lonMin && lon <= lonMax && lat >= latMin && lat <= latMax;
}

// Entité construite à partir d'une observation de l'API iNaturalist
function entiteDepuisAPI(obs) {
    const c = obs.geojson && obs.geojson.coordinates;
    if (!c || c.length !== 2 || !dansEmprise(c[0], c[1])) return null;
    const taxon = obs.taxon || {};
    return new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat(c)),
        id: obs.id,
        name: taxon.preferred_common_name || obs.species_guess || 'Ambroisie',
        nomCommun: taxon.preferred_common_name || obs.species_guess || null,
        nomScientifique: taxon.name || 'Ambrosia artemisiifolia',
        date: obs.observed_on || obs.time_observed_at || obs.created_at || null,
        observateur: (obs.user && (obs.user.name || obs.user.login)) || null,
        qualite: obs.quality_grade || null,
        urlObs: obs.uri || ('https://www.inaturalist.org/observations/' + obs.id),
        imageUrl: (obs.photos && obs.photos[0] && obs.photos[0].url)
            ? obs.photos[0].url.replace('square', 'medium') : null
    });
}

// Entité construite à partir du GeoJSON local
function entiteDepuisGeoJSON(f) {
    const g = f.geometry;
    if (!g) return null;
    const c = g.type === 'Point' ? g.coordinates
        : g.type === 'MultiPoint' ? g.coordinates[0] : null;
    if (!c || c.length !== 2 || !dansEmprise(c[0], c[1])) return null;

    const p = f.properties || {};
    return new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat(c)),
        id: p.id || null,
        name: p.common_name || p.name || p.species_guess || 'Ambroisie',
        nomCommun: p.common_name || null,
        nomScientifique: p.scientific_name || 'Ambrosia artemisiifolia',
        // le jeu local porte la date dans time_observed_at
        date: p.time_observed_at || p.date || p.observed_on || p.created_at || null,
        observateur: p.user_name || null,
        qualite: p.quality_grade || null,
        urlObs: p.url || (p.id ? 'https://www.inaturalist.org/observations/' + p.id : null),
        imageUrl: p.image_url || p.imageUrl || null
    });
}

// ---- Sources de données ----

async function chargerSauvegardeLocale() {
    try {
        const reponse = await fetch(localBackupUrl);
        if (!reponse.ok) throw new Error('HTTP ' + reponse.status);
        const geojson = await reponse.json();
        if (!geojson.features || !geojson.features.length) return null;
        return geojson.features.map(entiteDepuisGeoJSON).filter(Boolean);
    } catch (erreur) {
        console.error('Chargement du jeu local impossible :', erreur);
        return null;
    }
}

/* Filtre geographique de la requete. Le lieu iNaturalist de l'agglomeration
   de Montreal est incomplet : cette ville interroge par emprise, ce qui donne
   un decompte fidele. */
const filtreLieu = CONFIG_VILLE.inaturalist.parEmprise
    ? ('&nelat=' + latMax + '&nelng=' + lonMax + '&swlat=' + latMin + '&swlng=' + lonMin)
    : ('&place_id=' + placeId);

/* Le jeu local est constitué par tools/villes/observations.py avec le même
   filtre de qualité : sans lui, les deux sources ne compteraient pas la même
   chose et les totaux affichés mélangeraient deux niveaux de validation. */
function urlPage(page) {
    return baseUrl
        + '?taxon_id=' + taxonId
        + filtreLieu
        + '&quality_grade=research'
        + '&per_page=' + perPage
        + '&page=' + page
        + '&d1=' + CONFIG_VILLE.inaturalist.depuis;
}

/* Renvoie { entites, total } — `total` étant le nombre d'observations que
   l'API déclare pour la requête, ce qui permet de savoir si la récupération
   est complète, et donc si une absence vaut retrait. */
async function chargerPageAPI(page) {
    try {
        const reponse = await fetch(urlPage(page));
        if (!reponse.ok) throw new Error('HTTP ' + reponse.status);
        const donnees = await reponse.json();
        if (!donnees.results || !donnees.results.length) return null;
        return {
            entites: donnees.results.map(entiteDepuisAPI).filter(Boolean),
            lues: donnees.results.length,
            total: donnees.total_results || 0
        };
    } catch (erreur) {
        console.warn('Page ' + page + ' de l’API iNaturalist indisponible :', erreur.message);
        return null;
    }
}

// ---- Séquence de démarrage ----

let sourceDonnees = 'locale';

async function demarrerChargementAmbroisie() {
    // 1. Jeu local : affichage immédiat
    const locales = await chargerSauvegardeLocale();
    if (locales && locales.length) {
        ambroisieSource.addFeatures(locales);
        majIndicateurs('Jeu local', locales.length);
        console.log('Jeu local affiché : ' + locales.length + ' observations');
    } else {
        majIndicateurs('Aucune donnée locale', 0);
    }

    // 2. Mise à jour iNaturalist en arrière-plan
    //
    // Les pages se demandent par vagues : une par une, l'API répondant en
    // environ deux secondes, Sherbrooke demanderait près d'une minute et le
    // budget serait épuisé bien avant la fin.
    majEtatDonnees('Mise à jour iNaturalist en cours…', 'chargement');
    const debut = Date.now();
    const entites = [];
    let apiJoignable = false;
    let totalAnnonce = 0;
    let lues = 0;
    let interrompue = false;

    try {
        for (let page = 1; page <= maxPages; page += pagesParVague) {
            if (Date.now() - debut > budgetMs) {
                console.warn('Budget de temps atteint, mise à jour interrompue page ' + page);
                interrompue = true;
                break;
            }
            const vague = [];
            for (let i = 0; i < pagesParVague && page + i <= maxPages; i++) {
                vague.push(page + i);
            }
            const lots = await Promise.all(vague.map(chargerPageAPI));

            let vagueComplete = true;
            for (const lot of lots) {
                if (!lot) { vagueComplete = false; continue; }
                apiJoignable = true;
                totalAnnonce = Math.max(totalAnnonce, lot.total);
                lues += lot.lues;
                entites.push(...lot.entites);
                if (lot.lues < perPage) vagueComplete = false;
            }
            // Dernière page atteinte, ou page manquante : inutile d'insister.
            if (!vagueComplete) break;
            if (totalAnnonce && lues >= totalAnnonce) break;
        }
    } catch (erreur) {
        console.error('Mise à jour iNaturalist interrompue :', erreur);
    }

    // 3. Fusion sur l'identifiant d'observation.
    //
    // Remplacer en bloc seulement si la récupération est complète : c'est le
    // seul cas où l'absence d'une observation signifie vraiment son retrait.
    // Sinon on ajoute ce qui est nouveau, plutôt que de jeter une récupération
    // partielle — qui, auparavant, ne servait jamais à rien.
    const complete = apiJoignable && totalAnnonce > 0 && lues >= totalAnnonce;

    if (complete) {
        ambroisieSource.clear();
        ambroisieSource.addFeatures(entites);
        sourceDonnees = 'inaturalist';
        majIndicateurs('API iNaturalist', entites.length);
        majEtatDonnees('Données iNaturalist à jour', 'ok');
        showNotification(entites.length + ' observations à jour (iNaturalist)', 'success');
    } else if (apiJoignable) {
        const connues = new Set();
        ambroisieSource.getFeatures().forEach(f => {
            if (f.get('id') != null) connues.add(String(f.get('id')));
        });
        const nouvelles = entites.filter(f => f.get('id') != null
                                              && !connues.has(String(f.get('id'))));
        if (nouvelles.length) ambroisieSource.addFeatures(nouvelles);

        const totalAffiche = ambroisieSource.getFeatures().length;
        majIndicateurs('Jeu local + iNaturalist', totalAffiche);
        majEtatDonnees(interrompue
            ? 'Mise à jour partielle · ' + nouvelles.length + ' observation(s) ajoutée(s)'
            : 'Jeu de référence complété · ' + nouvelles.length + ' observation(s) ajoutée(s)',
            nouvelles.length ? 'ok' : 'degrade');
        if (nouvelles.length) {
            showNotification(nouvelles.length + ' nouvelle(s) observation(s) iNaturalist',
                             'success');
        }
    } else {
        majEtatDonnees('Mode hors ligne : jeu local', 'degrade');
        showNotification('API iNaturalist injoignable, jeu local affiché', 'warning');
    }

    rafraichirGraphiquesOuverts();
}

// ---- Bandeau d'indicateurs ----

function majIndicateurs(source, nombre) {
    const entites = ambroisieSource.getFeatures();
    const parAnnee = {};
    let anneeMin = null;
    let anneeMax = null;

    for (const f of entites) {
        const d = f.get('date');
        if (!d) continue;
        const annee = parseInt(String(d).slice(0, 4), 10);
        if (!(annee > 1900)) continue;
        parAnnee[annee] = (parAnnee[annee] || 0) + 1;
        if (anneeMin === null || annee < anneeMin) anneeMin = annee;
        if (anneeMax === null || annee > anneeMax) anneeMax = annee;
    }

    const ecrire = (id, valeur) => {
        const el = document.getElementById(id);
        if (el) el.textContent = valeur;
    };

    ecrire('kpi-observations', (nombre || entites.length).toLocaleString('fr-CA'));
    ecrire('kpi-periode', anneeMin !== null ? anneeMin + '–' + anneeMax : '—');
    // Volume de la derniere saison : indicateur d'activite du projet.
    // Le nombre d'observateurs n'est pas retenu : le nom du contributeur est
    // absent d'une large part des exports iNaturalist, il serait sous-estime.
    ecrire('kpi-saison', anneeMax !== null ? parAnnee[anneeMax].toLocaleString('fr-CA') : '—');
    ecrire('kpi-saison-libelle', anneeMax !== null ? 'observations en ' + anneeMax : 'dernière saison');
    ecrire('kpi-source', source);
}

function majEtatDonnees(message, etat) {
    const el = document.getElementById('kpi-etat');
    if (!el) return;
    el.textContent = message;
    el.className = 'kpi-etat kpi-etat-' + etat;
}

// Régénère les graphiques du tableau de bord s'il est ouvert au moment où les
// données changent, pour éviter des graphiques calculés sur un jeu incomplet.
function rafraichirGraphiquesOuverts() {
    if (!document.getElementById('graphSolContainer')) return;
    try {
        renderSelectedSolChart();
        if (document.getElementById('monthlyEvolutionChart')) updateEvolutionCharts();
    } catch (erreur) {
        console.warn('Rafraîchissement des graphiques ignoré :', erreur.message);
    }
}

// ---- Notifications ----

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'data-notification ' + type;
    const fond = type === 'success' ? '#2f7d32' : type === 'warning' ? '#ffc107' : '#dc3545';
    const texte = type === 'warning' ? '#000' : '#fff';
    const icone = type === 'success' ? 'fa-check-circle'
        : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-times-circle';
    notification.innerHTML =
        '<div style="position:fixed; bottom:20px; right:20px; z-index:2000;'
        + ' background:' + fond + '; color:' + texte + ';'
        + ' padding:12px 20px; border-radius:8px;'
        + ' box-shadow:0 4px 12px rgba(0,0,0,0.15);'
        + ' font-size:14px; font-family:\'Segoe UI\', sans-serif;'
        + ' animation:slideIn 0.3s ease;">'
        + '<i class="fas ' + icone + ' me-2"></i>' + message
        + '</div>';
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

const styleNotification = document.createElement('style');
styleNotification.textContent =
    '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; }'
    + ' to { transform: translateX(0); opacity: 1; } }';
document.head.appendChild(styleNotification);

// ========= Initialisation de la carte =========
const map = new ol.Map({
    target: 'map',
    layers: [baseLayerGroup, vectorLayerGroup],
    view: new ol.View({
        center: ol.proj.fromLonLat(CONFIG_VILLE.vue.centre),
        zoom: CONFIG_VILLE.vue.zoom
    })
});

// =======LISTE DES CONTROLS ==================
// Add scale control
var scaleLine = new ol.control.ScaleLine({
    target: document.getElementById('scale-container'),
    units: 'metric'
});
// Controle de position de la sourie
var mousePosition = new ol.control.MousePosition({
    coordinateFormat: ol.coordinate.createStringXY(5),
    target: document.getElementById('mouse-position'),
    projection: 'EPSG:4326'
});
map.addControl(scaleLine)
map.addControl(mousePosition)

// ========= Fiabilité du rendu de la carte =========
// La carte est créée pendant que la page finit sa mise en page (bandeau de
// projet, chargement asynchrone des polices d'icônes). OpenLayers fige alors une
// taille de conteneur qui n'est pas la taille définitive, et le fond de carte
// tuilé n'est jamais demandé : la carte reste blanche jusqu'au premier
// redimensionnement de la fenêtre. On observe donc le conteneur et on
// resynchronise la carte à chaque changement de dimensions.

const conteneurCarte = document.getElementById('map');
const fondsDeCarte = [OSMStandard, SatLayer, TopoLayer, MapLayer];

// Nombre de tuiles demandées, tous fonds de carte confondus. Une valeur non
// nulle prouve que la carte a effectué son premier rendu.
let tuilesDemandees = 0;

function resynchroniserCarte(forcerRendu) {
    map.updateSize();
    // renderSync contourne le requestAnimationFrame et provoque un rendu
    // immédiat : c'est lui qui déclenche la demande des tuiles.
    if (forcerRendu) map.renderSync();
}

if (window.ResizeObserver && conteneurCarte) {
    new ResizeObserver(() => resynchroniserCarte(false)).observe(conteneurCarte);
}

window.addEventListener('resize', () => resynchroniserCarte(false));
requestAnimationFrame(() => resynchroniserCarte(true));
window.addEventListener('load', () => resynchroniserCarte(true));

// Les icônes Font Awesome arrivent après le premier rendu et modifient la
// hauteur du bandeau : la carte doit s'y réajuster.
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => resynchroniserCarte(true));
}

fondsDeCarte.forEach(couche => {
    const source = couche.getSource();

    source.on('tileloadstart', () => { tuilesDemandees++; });

    // Une tuile perdue (réseau instable) laisserait un trou définitif dans le
    // fond de carte : on retente une fois, après un court délai.
    source.on('tileloaderror', function (evenement) {
        const tuile = evenement.tile;
        if (tuile.__reessai) return;
        tuile.__reessai = true;
        setTimeout(() => tuile.load(), 900);
    });
});

// Filet de rattrapage : si aucune tuile n'a été demandée passé ce délai, le
// premier rendu n'a pas eu lieu. On force la carte à se redessiner plutôt que
// de laisser un fond blanc.
setTimeout(function verifierFondDeCarte(tentative) {
    tentative = tentative || 1;
    if (tuilesDemandees > 0) return;

    const visible = fondsDeCarte.find(c => c.getVisible());
    if (visible) {
        console.warn('Fond de carte non rendu, nouvelle demande des tuiles (tentative '
            + tentative + ')');
        visible.getSource().refresh();
    }
    map.updateSize();
    map.renderSync();

    if (tentative < 3) {
        setTimeout(() => verifierFondDeCarte(tentative + 1), 1500);
    }
}, 1500);

// ========= Interactions avec les observations =========

let popupOverlay = null;

// Date lisible : « 2 juillet 2024 » plutot que le format ISO renvoye par
// toLocaleDateString('fr-CA').
function formaterDate(valeur) {
    const d = new Date(valeur);
    if (isNaN(d)) return String(valeur);
    return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function contenuPopup(feature) {
    const nomCommun = feature.get('nomCommun');
    const nomScientifique = feature.get('nomScientifique');
    const date = feature.get('date');
    const observateur = feature.get('observateur');
    const qualite = feature.get('qualite');
    const urlObs = feature.get('urlObs');
    const imageUrl = feature.get('imageUrl');

    let html = '<div class="popup-content">';
    if (nomCommun) {
        html += '<div class="popup-titre">' + nomCommun + '</div>';
    }
    if (nomScientifique) {
        html += '<div class="popup-taxon"><em>' + nomScientifique + '</em></div>';
    }
    html += '<div class="popup-ligne"><strong>Observé le :</strong> '
        + (date ? formaterDate(date) : 'date inconnue') + '</div>';
    if (observateur) {
        html += '<div class="popup-ligne"><strong>Observateur :</strong> ' + observateur + '</div>';
    }
    if (qualite === 'research') {
        html += '<div class="popup-badge"><i class="fas fa-certificate"></i> Qualité recherche</div>';
    }
    if (imageUrl) {
        html += '<img id="ImagePopup" src="' + imageUrl + '" alt="Photo de l\'observation">';
    }
    if (urlObs) {
        html += '<div class="popup-lien"><a href="' + urlObs + '" target="_blank" rel="noopener">'
            + 'Voir sur iNaturalist <i class="fas fa-arrow-up-right-from-square"></i></a></div>';
    }
    html += '</div>';
    return html;
}

map.on('singleclick', function (evt) {
    let entiteTrouvee = null;
    let entiteCluster = null;

    map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        if (!layer) return;
        if (layer === ambroisieLayer && !entiteTrouvee) {
            entiteTrouvee = feature;
        } else if (layer === ambroisieClusterLayer && !entiteCluster) {
            entiteCluster = feature;
        }
    });

    // Clic sur un agrégat : on zoome dessus plutôt que d'ouvrir un popup
    if (!entiteTrouvee && entiteCluster) {
        const membres = entiteCluster.get('features') || [];
        if (membres.length > 1) {
            const etendue = ol.extent.createEmpty();
            membres.forEach(m => ol.extent.extend(etendue, m.getGeometry().getExtent()));
            map.getView().fit(etendue, {
                duration: 350,
                padding: [60, 60, 60, 60],
                maxZoom: 17
            });
            if (popupOverlay) popupOverlay.setPosition(undefined);
            return;
        }
        entiteTrouvee = membres[0];
    }

    if (!entiteTrouvee) {
        if (popupOverlay) popupOverlay.setPosition(undefined);
        return;
    }

    if (!popupOverlay) {
        const element = document.createElement('div');
        element.className = 'ol-popup';
        popupOverlay = new ol.Overlay({
            element: element,
            positioning: 'bottom-center',
            stopEvent: true,
            offset: [0, -20]
        });
        map.addOverlay(popupOverlay);
    }
    popupOverlay.getElement().innerHTML = contenuPopup(entiteTrouvee);
    popupOverlay.setPosition(entiteTrouvee.getGeometry().getCoordinates());
});

// Curseur main au survol des observations
map.on('pointermove', function (evt) {
    let survol = false;
    map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        if (layer === ambroisieLayer || layer === ambroisieClusterLayer) {
            survol = true;
            return true;
        }
    });
    map.getTargetElement().style.cursor = survol ? 'pointer' : '';
});

// Lancement du chargement des observations, une fois la carte prête
demarrerChargementAmbroisie();


// =========== GESTION DES PANNEAUX LATERAUX =================
// ======== Gestion du panneau latéral et du redimensionnement ======
const panel = document.getElementById('side-panel');
const panelTitle = document.getElementById('side-panel-title');
const panelContent = document.getElementById('side-panel-content');
const panelClose = document.getElementById('side-panel-close');
const resizer = document.getElementById('side-panel-resizer');

let startX, startWidth;

// Ouvrture du panneau et insertion du contenu
function openPanel(title, contentHTML) {
    panelTitle.textContent = title;
    panelContent.innerHTML = contentHTML;
    panel.classList.add('active');
    // Réinitialisation de la largeur personnalisée pour revenir à la valeur CSS par défaut (30%)
    panel.style.width = '';
    // On efforce la mise à jour de la carte après l'ouverture (laisse le temps à la transition)
    if (window.map) setTimeout(() => map.updateSize(), 100);
}

// Initialisation du redimensionnement (clic sur la poignée)
function initResize(e) {
    startX = e.clientX;
    startWidth = panel.getBoundingClientRect().width; // largeur actuelle (en px)
    document.documentElement.addEventListener('mousemove', doResize);
    document.documentElement.addEventListener('mouseup', stopResize);
    e.preventDefault(); // évite la sélection de texte pendant le glisser
}

// Redimensionnement en cours
function doResize(e) {
    const newWidth = startWidth + (e.clientX - startX);
    // Limites : minimum 200px, maximum 50% de la largeur de la fenêtre
    const minWidth = 200;
    const maxWidth = window.innerWidth * 0.5;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
        panel.style.width = newWidth + 'px';
        // Met à jour la carte pour qu'elle occupe l'espace restant
        if (window.map) map.updateSize();
    }
}

// Fin du redimensionnement
function stopResize() {
    document.documentElement.removeEventListener('mousemove', doResize);
    document.documentElement.removeEventListener('mouseup', stopResize);
}

// Attache l'événement si la poignée existe
if (resizer) {
    resizer.addEventListener('mousedown', initResize);
}

// Fermeture du panneau
panelClose.addEventListener('click', () => {
    panel.classList.remove('active');
    panel.style.width = ''; // supprime la largeur personnalisée pour revenir à 0
    if (window.map) map.updateSize(); // la carte reprend toute la largeur
});
/* Une entree du panneau « Couches » : case a cocher et bouton de metadonnees.
   `a_venir` produit une case desactivee, pour annoncer une couche prevue sans
   laisser croire qu'elle est deja la. */
function ligneCouche(id, libelle, coche, metadonnees, a_venir) {
    const majuscule = id.charAt(0).toUpperCase() + id.slice(1);
    return `
                        <div class="layer-item${a_venir ? ' layer-item-a-venir' : ''}">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox"
                                    name="vectorLayerCheckboxButton"
                                    value="${id}" id="layer${majuscule}"
                                    ${coche ? 'checked' : ''} ${a_venir ? 'disabled' : ''}>
                                <label class="form-check-label" for="layer${majuscule}">
                                    ${libelle}${a_venir ? ' <em class="a-venir">(à venir)</em>' : ''}
                                </label>
                            </div>
                            ${metadonnees ? `
                            <div class="layer-btn-box">
                                <div class="layer-button-box" data-bs-toggle="modal"
                                     data-bs-target="#${metadonnees}">
                                    <i class="fa-solid fa-circle-info"></i>
                                </div>
                            </div>` : ''}
                        </div>`;
}

/* Les couches propres au projet viennent en tete — ce sont celles qu'on vient
   consulter — puis les couches de contexte declarees pour la ville. */
function listeDesCouches() {
    const modules = CONFIG_VILLE.modules || {};
    let html = ligneCouche('ambroisie', 'Ambroisie', true, 'metadataLayer3', false);
    if (modules.prediction) {
        html += ligneCouche('prediction', 'Modèle prédictif', false, 'metadataLayer8', false);
        html += '\n                        <div id="prediction-panneau" class="prediction-panneau"></div>';
    }
    if (modules.terrains) {
        html += ligneCouche('terrains', 'Terrains à potentiel', false, 'metadataLayer9', false);
        html += '\n                        <div id="terrains-panneau" class="prediction-panneau"></div>';
    }
    (typeof COUCHES_VILLE !== 'undefined' ? COUCHES_VILLE : []).forEach(d => {
        html += ligneCouche(d.id, d.libelle, d.visible !== false && !d.a_venir,
                            d.metadonnees, !!d.a_venir);
    });
    return html;
}

// ============ INTERACTION AVEC LES BOUTONS =============
document.getElementById('couches').addEventListener('click', () => {
    openPanel('COUCHES', `
        <div class = "LayerPanel">
            <div class="accordion" id="accordionExample">
            <!-- Premier accordéon -->
            <div class="accordion-item">
                <h2 class="accordion-header" id="headingOne">
                    <button class="accordion-button" type="button" data-bs-toggle="collapse"
                        data-bs-target="#couche" aria-expanded="true" aria-controls="couche">
                        <strong>Liste des couches</strong>
                    </button>
                </h2>
                <div id="couche" class="accordion-collapse collapse show" aria-labelledby="headingOne"
                    data-bs-parent="#accordionExample">
                    <div class="accordion-body">

${listeDesCouches()}

                    </div>
                </div>
            </div>
            <!--Deuxième accordéon-->
            <div class="accordion-item">
                        <h2 class="accordion-header" id="headingThree">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                                data-bs-target="#legende" aria-expanded="false" aria-controls="legende">
                                <strong>Légende</strong>
                            </button>
                        </h2>
                        <div id="legende" class="accordion-collapse collapse" aria-labelledby="headingThree"
                            data-bs-parent="#accordionExample">

                            <div class="accordion-body">
                                <div id = LegendeTrajet></div> 
                                Trajets 
                            </div>

                            <div class="accordion-body">
                                <div id = LegendeRoute></div> 
                                Routes 
                            </div>

                            <div class="accordion-body">
                                <div id = LegendeAmbroisie></div> 
                                Ambroisie
                            </div>

                            <div class="accordion-body">
                                <div id = LegendeArrondissement></div> 
                                Limites des arrondissements
                            </div>

                            <div class="accordion-body">
                                <div id = LegendeSecteur></div> 
                                Limites des secteurs
                            </div>

                            <div class="accordion-body">
                                <strong>Types de sol</strong><br>
                                    <div id = LegendeEau> </div> Eau <br>
                                    <div id = LegendeAlluvion> </div> Alluvions <br>    
                                    <div id = LegendeLoam></div> Loam <br>
                                    <div id = LegendeLoamA></div> Loam argileux <br>
                                    <div id = LegendeLoamR></div> Loam rocheux <br>
                                    <div id = LegendeLoamS></div> Loam sableux <br>
                                    <div id = LegendeMarecage></div> Marécage<br>
                                    <div id = LegendeSable></div> Sable fin <br>
                            </div>

                            <div class="accordion-body">
                                <strong>Affectation des sols</strong><br>
                                    <div id = LegendeCV></div> Centre-ville <br>
                                    <div id = LegendeCSR></div> Commerciale et service régional <br>
                                    <div id = LegendeGPEP></div> Grand parc et espace public <br>
                                    <div id = LegendeI></div> Industrielle <br>
                                    <div id = LegendeM></div> Mixte (multifonctionnelle) <br>
                                    <div id = LegendePI></div> Publique et institutionnelle <br>
                                    <div id = LegendePU></div> Publique utilitaire <br>
                                    <div id = LegendeR></div> Résidentielle<br>
                                    
                            </div>
                        </div>
                        </div>
        </div>
    `);

    // Réinitialisation des modales dynamiques
    document.querySelectorAll('.modal').forEach(modalEl => {
        new bootstrap.Modal(modalEl);
    });

    // Affichage et masquage des couches
    // Ecouteurs après l'insertion dynamique
    const vectorLayerElements = document.querySelectorAll('input[name=vectorLayerCheckboxButton]');
    for (let checkbox of vectorLayerElements) {
        checkbox.addEventListener('change', function () {
            const layerValue = this.value;
            vectorLayerGroup.getLayers().forEach(layer => {
                const titre = layer.get('title');
                // la couche d'agregats suit la meme case que la couche de points
                if (titre === layerValue || titre === layerValue + '-cluster') {
                    layer.setVisible(this.checked);
                }
            });
        });
    }
});

// =================================================
//              ZOOM PAR SECTEUR
// =================================================

/* La liste des secteurs n'est plus ecrite a la main : elle se lit dans la
   couche marquee `navigation: true` de la configuration. Chaque entree cadre
   sur l'emprise reelle de son entite, ce qui vaut mieux qu'un centre et un
   niveau de zoom devines, et une ville qui decoupe autrement n'a rien a
   changer au moteur. */

const COUCHE_NAVIGATION = (typeof COUCHES_VILLE !== 'undefined'
    ? COUCHES_VILLE.find(d => d.navigation && !d.a_venir) : null)
    || DECOUPAGES[DECOUPAGES.length - 1] || null;

function secteursDisponibles() {
    if (!COUCHE_NAVIGATION) return [];
    const couche = couchesParId[COUCHE_NAVIGATION.id];
    if (!couche) return [];
    const secteurs = [];
    couche.getSource().getFeatures().forEach(entite => {
        const nom = entite.get(COUCHE_NAVIGATION.attribut);
        if (!nom) return;
        const emprise = entite.getGeometry().getExtent();
        const connu = secteurs.find(x => x.nom === nom);
        // Un secteur peut arriver en plusieurs morceaux : on les reunit.
        if (connu) ol.extent.extend(connu.emprise, emprise);
        else secteurs.push({ nom: nom, emprise: emprise.slice() });
    });
    secteurs.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    return secteurs;
}

function vueInitiale() {
    map.getView().setCenter(ol.proj.fromLonLat(CONFIG_VILLE.vue.centre));
    map.getView().setZoom(CONFIG_VILLE.vue.zoom);
}

document.getElementById('zoom').addEventListener('click', () => {

    const secteurs = secteursDisponibles();
    const intitule = COUCHE_NAVIGATION ? COUCHE_NAVIGATION.libelle.toLowerCase() : 'secteur';

    let html = '<div class="LayerPanel"><p id="indication">';
    if (!secteurs.length) {
        html += 'La couche de découpage n\'est pas encore chargée. '
              + 'Refermez et rouvrez ce panneau dans un instant.';
        html += '</p></div>';
        openPanel('ZOOM PAR SECTEUR', html);
        return;
    }

    html += 'Cliquez pour cadrer la carte sur un ' + intitule.replace(/s$/, '')
          + ' :</p><ul class="list-group">';

    html += `
        <li class="list-group-item zoom-secteur" data-secteur="">
            <i class="fa-solid fa-expand"></i> Vue d'ensemble
        </li>`;

    secteurs.forEach(s => {
        html += `
        <li class="list-group-item zoom-secteur" data-secteur="${s.nom}">
            <i class="fa-solid fa-location-dot"></i> ${s.nom}
        </li>`;
    });

    html += '</ul></div>';

    openPanel('ZOOM PAR SECTEUR', html);

    document.querySelectorAll('.zoom-secteur').forEach(item => {
        item.addEventListener('click', function () {
            const nom = this.getAttribute('data-secteur');
            if (!nom) { vueInitiale(); return; }
            const secteur = secteurs.find(x => x.nom === nom);
            if (secteur) {
                map.getView().fit(secteur.emprise, {
                    padding: [40, 40, 40, 40], duration: 400, maxZoom: 16
                });
            }
        });
    });

});

// =================================================
//              FOND DE CARTE
// =================================================
// Oiuverture du panneau latéral et affichage des fonds de carte
document.getElementById('basemap').addEventListener('click', () => {
    openPanel('FOND DE CARTE',
        `<div class = "LayerPanel">
        <p><strong>Choisissez un fond de carte.</strong></p>
          <div id="basemap-options" class="mt-3">
              <div class="row g-3">
                  <div class="col-6">
                      <div class="basemap-option" data-basemap="osm">
                          <div class="basemap-thumbnail"><img src="images/osm_thumbnail.JPG"></div>
                          <div class="basemap-label">OpenStreetMap</div>
                      </div>
                  </div>
                  <div class="col-6">
                      <div class="basemap-option" data-basemap="satellite">
                          <div class="basemap-thumbnail"><img src="images/satlayer_thumbnail.JPG"></div>
                          <div class="basemap-label">Satellite</div>
                      </div>
                  </div>
                  <div class="col-6">
                      <div class="basemap-option" data-basemap="topo">
                          <div class="basemap-thumbnail"><img src="images/topo_thumbnail.JPG"></div>
                          <div class="basemap-label">Topographie</div>
                      </div>
                  </div>
                  <div class="col-6">
                      <div class="basemap-option" data-basemap="map">
                          <div class="basemap-thumbnail"><img src="images/map_thumbnail.JPG"></div>
                          <div class="basemap-label">Google Street</div>
                      </div>
                  </div>
              </div>
          </div>
    </div>`
    );
});
// ============== changement de fond de carte =================
// Écoute les clics sur chaque vignette
document.addEventListener('click', function (e) {
    const option = e.target.closest('.basemap-option');
    if (!option) return; // Si on ne clique pas sur une option, rien ne se passe
    const selectedBasemap = option.getAttribute('data-basemap');
    // Active uniquement la couche correspondante
    baseLayerGroup.getLayers().forEach(function (layer) {
        const title = layer.get('title');
        layer.setVisible(title === selectedBasemap);
    });
    // (Optionnel) Ajoute une classe active pour surligner la vignette sélectionnée
    document.querySelectorAll('.basemap-option').forEach(opt => opt.classList.remove('active'));
    option.classList.add('active');
});
// ============= Affichage des informations sur le projet =================
/* État des couches de la ville, tel qu'affiché dans le panneau
   « Informations ». Une couche annoncée mais pas encore livrée le dit
   plutôt que de disparaître sans explication. */
function etatDesCouches() {
    const modules = CONFIG_VILLE.modules || {};
    const entrees = [];
    entrees.push(["Observations d'ambroisie (iNaturalist)", null]);
    if (modules.prediction) entrees.push(['Modèle prédictif de présence', null]);
    if (modules.terrains) entrees.push(['Terrains à potentiel de colonisation', null]);
    (typeof COUCHES_VILLE !== 'undefined' ? COUCHES_VILLE : []).forEach(d => {
        entrees.push([d.libelle, d.a_venir ? 'campagne en cours' : null]);
    });
    return entrees.map(([libelle, note]) => note
        ? `<li>${libelle} &mdash; <em>${note}</em></li>`
        : `<li>${libelle}</li>`).join('');
}

document.getElementById('info').addEventListener('click', () => {
    openPanel('INFORMATIONS',
        `<div class = "LayerPanel">
            <div class="info-container">
            <h5 class="mb-4"> <strong>Tableau de bord d'analyse de l'ambroisie à ${CONFIG_VILLE.nom} </strong></h5>
            <p class="p-info"><em>Projet « Cartographie participative de l'herbe à poux » &mdash; INSPQ et Université de
            Sherbrooke, Département de géomatique appliquée. ${CONFIG_VILLE.situation}</em></p>
            <h7> <strong> I- Contexte </strong></H7>
            <p class="p-info"> L’ambroisie est une plante hautement allergène dont le pollen peut provoquer des réactions importantes chez la population.
            Une meilleure connaissance de sa distribution permet d’optimiser les actions de contrôle. Ce tableau de bord interactif propose des outils
            permettant d’explorer, d’analyser et de visualiser les observations de l’ambroisie (<em>Ambrosia artemisiifolia</em>) sur le territoire
            de ${CONFIG_VILLE.article}.</p>
            <h7><strong> II- Objectifs du tableau de bord</strong></h7>
            <p class="p-info">L'objectif principal du tableau de bord est de proposer des outils de suivi de l'ambroisie au niveau du territoire
            de ${CONFIG_VILLE.article}. Plus spécifiquement, il vise à:</p>
            <ul class = "list">
                <li>Suivre la répartition spatiale de l’ambroisie ;</li>
                <li>Analyser les zones à risque face à la présence de l'espèce ;</li>
                <li>Comprendre l’évolution spatiale et temporelle des observations ;</li>
                <li>Contribuer à des prises de décision pour le contrôle de l'espèce.</li>
            </ul>
            <h7><strong>III- Fonctionnalités principales du tableau de bord</strong></h7>
            <p class="p-info">Le tableau de bord dispose des outils permettant de visualiser les indicateurs. Ces outils présentent des éléments graphiques nécessaires 
            à des prises de décisions dans le cadre des interventions pour l'éradication de cette plante allergène. Les outils du tableau de bord sont disponibles à travers des onglets permettant:</p>
            <ul class = "list">
                <li> La visualisation de graphiques thématiques (${DECOUPAGES.map(d => d.libelle.toLowerCase()).join(', ')}) ;</li>
                <li> L'analyse d'un endroit précis à l'aide de l'outil <strong>Autour de moi</strong> ;</li>
                <li> L'analyse des tendances (mensuelles et annuelles).</li>
            </ul>
            <h7><strong>IV- Couches disponibles pour cette ville</strong></h7>
            <p class="p-info">Les trois villes du projet ne publient pas les mêmes jeux de données : le
            niveau de détail diffère d'une carte à l'autre, et l'interface ne le masque pas.</p>
            <ul class="list">${etatDesCouches()}</ul>
            <p> Pour plus d'informations, consultez le <a href="${CONFIG_VILLE.guide || 'guide.html'}" target="_blank"> Guide d'utilisation complet</a>,
            ou la <a href="../../index.html"> page du projet</a> qui présente la méthodologie, l'état d'avancement et
            les trois sites d'étude (Sherbrooke, Montréal, Québec).</p>
            <hr>
            <h7><strong>Informations de contact : </strong></h7>
            <ul class = "list">
                <li>Fritzno Louis: <a href="mailto:fritzno.louis@usherbrooke.ca">fritzno.louis@usherbrooke.ca</a></li>
                <li>Mickaël Germain: <a href="mailto:mickael.germain@usherbrooke.ca">mickael.germain@usherbrooke.ca</a></li>
                <li>Yacine Bouroubi: <a href="mailto:yacine.bouroubi@usherbrooke.ca">yacine.bouroubi@usherbrooke.ca</a></li>
                <li>Nicolas Balard: <a href="mailto:nicolas.balard@usherbrooke.ca">nicolas.balard@usherbrooke.ca</a></li>
            </ul>
            <p class="text-muted small mt-3">Version 2.1 – Août 2026</p>
            </div>
        <div>
    `);
});

//======================== TABLEAU DE BORD ========================
document.getElementById('dashboard').addEventListener('click', () => {
    openPanel('TABLEAU DE BORD',
        `<div class = "LayerPanel">
            <div class="container py-2">
            <ul class="nav nav-tabs" id="dashboardTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="repartition-tab" data-bs-toggle="tab" data-bs-target="#sol" type="button" role="tab"> <Strong>Répartition</Strong></button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="autour-tab" data-bs-toggle="tab" data-bs-target="#autour" type="button" role="tab"> <Strong>Autour de moi</Strong></button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="evolution-tab" data-bs-toggle="tab" data-bs-target="#evolution" type="button" role="tab"><Strong>Évolution</Strong></button>
                </li>
            </ul>
            <div class="tab-content pt-3" id="dashboardTabsContent">
                
                <div class="tab-pane fade show active" id="sol" role="tabpanel">
                    <div id = "TitreRepartition">Répartition des observations de l'ambroisie </div>
                    <hr>
                    <label id = "LabelRepartition">Répartition des observations:</label>
                    <select id="graphTypeSol" class="form-select mb-2">
                        ${DECOUPAGES.map(d => `<option class="OptionRepartition" value="${d.id}">${d.analyse}</option>`).join('')}
                    </select>
                    <div id="graphSolContainer"></div>
                </div>

                <div class="tab-pane fade" id="autour" role="tabpanel">
                <div id = "TitreAutour">Observations autour d'une zone tampon</div>
                <hr>
                    <p id = "InstructionAutour">Recherchez une adresse ou cliquez sur la carte:</p>
                    <div class="input-group mb-2">
                        <input id="dashboardAddressInput" class="form-control" type="text" placeholder="Entrez une adresse...">
                        <ul id="dashboardSuggestionsList" class="list-group position-absolute"></ul>
                        <button id="dashboardSearchBtn" class="btn btn-secondary" title="Rechercher une adresse"><i class="fa-solid fa-magnifying-glass"></i></button>
                        <button id="dashboardResetBtn" class="btn btn-primary" title="Réinitialiser la recherche"><i class="fa-solid fa-rotate"></i></button>
                    </div>
                    <div id = "OtherOptions">
                    <button id="dashboardLocateBtn" class="btn btn-outline-secondary mb-2"> Me localiser</button>
                    <button id="dashboardClickMapBtn" class="btn btn-outline-secondary mb-2"> Choisir sur la carte</button>
                    </div>
                    <label for="dashboardDistanceRange">Afficher les résultats dans un rayon de <span id="dashboardDistanceLabel">400</span> m</label>
                    <input type="range" id="dashboardDistanceRange" min="100" max="1000" value="400" class="form-range">
                    
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <div id="dashboardAmbroisieGauge">
                        </div>
                        <div id="dashboardYearlyChart"></div>
                    </div>

                </div>

                <div class="tab-pane fade" id="evolution" role="tabpanel">
                <div id = "TitreEvolution">Évolutions spatio-temporelles de l'ambroisie </div>
                <hr>
                    <div class="OptionSelect1">
                        <label for="yearSelect">Choisir une année :</label>
                        <label for="secteurSelect">Choisir un ${COUCHE_NAVIGATION ? COUCHE_NAVIGATION.libelle.toLowerCase().replace(/s$/, '') : 'secteur'} :</label>
                    </div>
                    <div class="OptionSelect2">
                        <select id="yearSelect" class="form-select mb-3"></select>
                        <select id="secteurSelect" class="form-select mb-3"></select>
                    </div>
                    <div id="monthlyEvolutionChart"></div>
                    <hr>
                    <div id="yearlyEvolutionChart"></div>
                </div>
            </div>
            </div>
        <div>
    `);

    // Initialisation différée et intelligente
    setTimeout(() => {
        // Le panneau a pu être remplacé entre-temps — l'utilisateur passe vite
        // d'un bouton à l'autre. Sans cette garde, l'initialisation s'exécute
        // contre un DOM disparu et lève une erreur.
        if (!document.getElementById('graphTypeSol')) return;

        // 1. Initialiser les dropdowns immédiatement
        populateYearDropdown();
        populateSecteurDropdown();

        // 2. Charger uniquement l'onglet actif au démarrage (Sol)
        renderSelectedSolChart();

        // 3. Listeners pour changement de type de sol
        document.getElementById('graphTypeSol').addEventListener('change', renderSelectedSolChart);

        // 4. Listeners pour l'évolution (année et secteur)
        document.getElementById('yearSelect').addEventListener('change', updateEvolutionCharts);
        document.getElementById('secteurSelect').addEventListener('change', updateEvolutionCharts);

        // 5. GESTION DES ONGLETS (Lazy Loading pour la performance)
        const tabEl = document.getElementById('dashboardTabs');
        tabEl.addEventListener('shown.bs.tab', function (event) {
            const targetId = event.target.getAttribute('data-bs-target');

            if (targetId === '#autour') {
                // Initialisation de la fonctionnalité "Autour de moi" dans le tableau de bord
                initDashboardAutourDeMoiTab();
            }
            else if (targetId === '#evolution') {
                // Mettre à jour les graphiques d'évolution (ils utiliseront les sélections courantes)
                updateEvolutionCharts();
            }
        });

    }, 300);
});

/* ============================================================
   OUTILS GÉNÉRAUX 
============================================================ */

function getVectorLayerByTitle(title) {
    return vectorLayerGroup.getLayers().getArray()
        .find(l => l.get('title') === title);
}

function prepareChartDom(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const existingInstance = echarts.getInstanceByDom(container);
    if (existingInstance) {
        existingInstance.resize();
        return existingInstance;
    }

    const chartDiv = document.createElement('div');
    chartDiv.style.width = '100%';
    chartDiv.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(chartDiv);

    return echarts.init(chartDiv);
}
// Création des render pour la présentation des graphiques en barre
function renderBarChart(chart, dataObj, titleText, color = '#1605b1ff') {
    const entries = Object.entries(dataObj)
        .map(([k, v]) => ({ name: k, value: v }))
        .sort((a, b) => b.value - a.value);

    const width = window.innerWidth;
    const isSmallScreen = width <= 1024;   // téléphone + tablette

    // On découpe un nom en deux lignes max
    function formatName(name) {
        if (name.length <= 20) return name;
        const splitIndex = name.lastIndexOf(' ', 20);
        if (splitIndex === -1) return name.slice(0, 20) + '\n' + name.slice(20);
        return name.slice(0, splitIndex) + '\n' + name.slice(splitIndex + 1);
    }

    // Calcule la marge gauche entre 0% et 5% selon la longueur max des noms
    const maxNameLen = Math.max(...entries.map(e => e.name.length), 10);
    const leftMargin = Math.min(5, Math.max(0, maxNameLen * 0.5)) + '%';

    // On met le titre à la ligne si trop long
    const maxTitleLen = 30;
    let formattedTitle = titleText;
    if (formattedTitle.length > maxTitleLen) {
        const split = formattedTitle.lastIndexOf(' ', maxTitleLen);
        if (split > 0) {
            formattedTitle = formattedTitle.slice(0, split) + '\n' + formattedTitle.slice(split + 1);
        } else {
            formattedTitle = formattedTitle.slice(0, maxTitleLen) + '\n' + formattedTitle.slice(maxTitleLen);
        }
    }

    const titleFontSize = isSmallScreen ? 11 : 14;

    chart.setOption({
        title: {
            text: formattedTitle,
            left: 'center',
            top: 8,
            textStyle: { fontSize: titleFontSize, fontWeight: 'normal' }
        },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: {
            left: leftMargin,
            right: isSmallScreen ? '10%' : '8%',
            bottom: '5%',
            top: '10%',          // laisse un peu de place pour le titre sur deux lignes
            containLabel: true
        },
        xAxis: {
            type: 'value',
            axisLabel: {
                show: !isSmallScreen,
                fontSize: 10
            }
        },
        yAxis: {
            type: 'category',
            data: entries.map(e => formatName(e.name)),
            inverse: true,
            axisLabel: {
                interval: 0,
                overflow: 'break',
                fontSize: isSmallScreen ? 9 : 11,
                margin: 6
            }
        },
        series: [{
            type: 'bar',
            data: entries.map(e => e.value),
            label: {
                show: true,
                position: 'right',
                fontSize: isSmallScreen ? 9 : 10,
                fontWeight: 'normal'
            },
            itemStyle: { color }
        }]
    }, true);
}
/* ============================================================
   GRAPHIQUES – SOL & OCCUPATION
============================================================ */
/* Une seule fonction pour toutes les repartitions : le decoupage arrive en
   parametre depuis `COUCHES_VILLE`. Ajouter une analyse revient donc a
   declarer une couche `decoupage: true`, et une ville qui n'a pas de
   pedologie ne propose simplement pas cette entree. */

function compterParDecoupage(decoupage) {
    const ambroisie = getVectorLayerByTitle('ambroisie');
    const couche = couchesParId[decoupage.id];
    if (!ambroisie || !couche) return null;

    const points = ambroisie.getSource().getFeatures();
    const zones = couche.getSource().getFeatures();
    if (!zones.length) return null;   // couche pas encore chargée

    const comptes = {};
    for (let i = 0; i < points.length; i++) {
        const coord = points[i].getGeometry().getCoordinates();
        for (let j = 0; j < zones.length; j++) {
            if (zones[j].getGeometry().intersectsCoordinate(coord)) {
                const valeur = zones[j].get(decoupage.attribut) || 'Non classé';
                comptes[valeur] = (comptes[valeur] || 0) + 1;
                break;
            }
        }
    }
    return comptes;
}

function renderPieChart(chart, comptes, titre) {
    const petitEcran = window.innerWidth <= 1024;

    // Titre replie sur deux lignes plutot que tronque.
    let intitule = titre;
    if (intitule.length > 30) {
        const coupure = intitule.lastIndexOf(' ', 30);
        intitule = coupure > 0
            ? intitule.slice(0, coupure) + '\n' + intitule.slice(coupure + 1)
            : intitule.slice(0, 30) + '\n' + intitule.slice(30);
    }

    chart.setOption({
        title: {
            text: intitule, left: 'center', top: 5,
            textStyle: { fontSize: petitEcran ? 14 : 16, fontWeight: 'normal' }
        },
        tooltip: { trigger: 'item', formatter: '{b}<br/>Nombre : {c} ({d}%)' },
        legend: {
            orient: 'horizontal', bottom: 10, left: 'center',
            itemWidth: 20, itemHeight: 8,
            textStyle: { fontSize: petitEcran ? 10 : 12 }
        },
        series: [{
            type: 'pie',
            radius: ['25%', '70%'],
            center: ['50%', petitEcran ? '58%' : '62%'],
            avoidLabelOverlap: true,
            label: { show: false, fontSize: petitEcran ? 10 : 12, formatter: '{b}' },
            emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
            data: Object.entries(comptes).map(([name, value]) => ({ name, value }))
        }]
    });
}

function genererRepartition(decoupage) {
    const comptes = compterParDecoupage(decoupage);
    if (!comptes) return;
    const chart = prepareChartDom('graphSolContainer');
    if (!chart) return;

    const titre = 'Observations ' + decoupage.analyse.replace(/^Par /, 'par ');
    if (decoupage.graphique === 'secteurs') {
        renderPieChart(chart, comptes, titre);
    } else {
        renderBarChart(chart, comptes, titre, decoupage.couleur);
    }
}

// Fonction pour changer les types de graphique
function renderSelectedSolChart() {
    const select = document.getElementById('graphTypeSol');
    if (!select) return;
    const decoupage = DECOUPAGES.find(d => d.id === select.value);
    if (decoupage) genererRepartition(decoupage);
}

/* ============================================================
   ÉVOLUTION TEMPORELLE AVEC SECTEUR
============================================================ */
function populateYearDropdown() {
    const ambroisie = getVectorLayerByTitle('ambroisie');
    if (!ambroisie) return;

    const years = new Set();
    ambroisie.getSource().getFeatures().forEach(f => {
        const dateVal = f.get('date');
        if (dateVal) {
            const y = new Date(dateVal).getFullYear();
            if (!isNaN(y)) years.add(y);
        }
    });

    const select = document.getElementById('yearSelect');
    const currentVal = select.value;
    select.innerHTML = '';

    [...years].sort((a, b) => b - a).forEach(y => {
        select.innerHTML += `<option value="${y}">${y}</option>`;
    });

    if (currentVal && years.has(parseInt(currentVal))) {
        select.value = currentVal;
    } else if (years.size > 0) {
        select.value = [...years][0];
    }
}

/* Le filtre de l'evolution s'appuie sur la meme couche que la navigation :
   secteurs a Sherbrooke, quartiers a Quebec, arrondissements a Montreal. */
function populateSecteurDropdown() {
    const select = document.getElementById('secteurSelect');
    if (!select) return;

    const secteurs = secteursDisponibles();
    const intitule = COUCHE_NAVIGATION ? COUCHE_NAVIGATION.libelle.toLowerCase() : 'secteurs';
    select.innerHTML = `<option value="Tous">Tous les ${intitule}</option>`;
    secteurs.forEach(s => {
        select.innerHTML += `<option value="${s.nom}">${s.nom}</option>`;
    });
}

// Fonctions d'aide pour le filtre secteur
function getSecteurGeometry(nom) {
    if (!COUCHE_NAVIGATION) return null;
    const couche = couchesParId[COUCHE_NAVIGATION.id];
    if (!couche) return null;

    const feature = couche.getSource().getFeatures()
        .find(f => f.get(COUCHE_NAVIGATION.attribut) === nom);
    return feature ? feature.getGeometry() : null;
}

function isFeatureInSecteur(feature, secteurNom) {
    if (secteurNom === 'Tous') return true;
    const geom = getSecteurGeometry(secteurNom);
    if (!geom) return false;
    const coord = feature.getGeometry().getCoordinates();
    return geom.intersectsCoordinate(coord);
}

function generateAmbroisieMonthlyChart() {
    const yearSelect = document.getElementById('yearSelect');
    const secteurSelect = document.getElementById('secteurSelect');
    if (!yearSelect || !secteurSelect) return;

    const year = parseInt(yearSelect.value);
    const secteur = secteurSelect.value;
    const ambroisie = getVectorLayerByTitle('ambroisie');
    if (!ambroisie || isNaN(year)) return;

    const counts = Array(12).fill(0);
    ambroisie.getSource().getFeatures().forEach(f => {
        if (!isFeatureInSecteur(f, secteur)) return;
        const dateVal = f.get('date');
        if (dateVal) {
            const d = new Date(dateVal);
            if (d.getFullYear() === year) counts[d.getMonth()]++;
        }
    });

    const chart = prepareChartDom('monthlyEvolutionChart');
    if (!chart) return;

    const width = window.innerWidth;
    const isSmallScreen = width <= 1024; // seuil téléphone + tablette

    // --- Titre sur deux lignes si trop long ---
    let baseTitle = secteur === 'Tous'
        ? `Évolutions mensuelles – ${year} (Tous les secteurs)`
        : `Évolutions mensuelles – ${year} (${secteur})`;
    let formattedTitle = baseTitle;
    if (isSmallScreen && baseTitle.length > 25) {
        const split = baseTitle.lastIndexOf(' ', 25);
        if (split > 0) {
            formattedTitle = baseTitle.slice(0, split) + '\n' + baseTitle.slice(split + 1);
        } else {
            formattedTitle = baseTitle.slice(0, 25) + '\n' + baseTitle.slice(25);
        }
    }

    // --- Axe X : première lettre sur petits écrans, nom complet sur grand ---
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const xAxisData = isSmallScreen ? months.map(m => m.charAt(0)) : months;
    const rotateX = isSmallScreen ? 0 : 45;

    const titleFontSize = isSmallScreen ? 9 : 14;

    chart.setOption({
        title: {
            text: formattedTitle,
            left: 'center',
            textStyle: { fontSize: titleFontSize }
        },
        tooltip: { trigger: 'axis' },
        grid: {
            left: isSmallScreen ? '10%' : '3%',
            right: isSmallScreen ? '8%' : '4%',
            bottom: isSmallScreen ? '12%' : '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: xAxisData,
            axisLabel: {
                interval: 0,
                rotate: rotateX,
                fontSize: isSmallScreen ? 10 : 12
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: isSmallScreen ? 10 : 12 }
        },
        series: [{
            type: 'line',
            smooth: true,
            data: counts,
            areaStyle: { opacity: 0.2 },
            label: {
                show: true,
                fontSize: isSmallScreen ? 9 : 12,
                rotate: isSmallScreen ? 45 : 0   // légère rotation des valeurs sur mobile
            }
        }]
    });
}

function generateAmbroisieYearlyChart() {
    const secteurSelect = document.getElementById('secteurSelect');
    if (!secteurSelect) return;

    const secteur = secteurSelect.value;
    const ambroisie = getVectorLayerByTitle('ambroisie');
    if (!ambroisie) return;

    const counts = {};
    ambroisie.getSource().getFeatures().forEach(f => {
        if (!isFeatureInSecteur(f, secteur)) return;
        const dateVal = f.get('date');
        if (dateVal) {
            const y = new Date(dateVal).getFullYear();
            if (!isNaN(y)) counts[y] = (counts[y] || 0) + 1;
        }
    });

    const years = Object.keys(counts).sort();
    const chart = prepareChartDom('yearlyEvolutionChart');
    if (!chart) return;

    const width = window.innerWidth;
    const isSmallScreen = width <= 1024; // seuil téléphone + tablette

    // --- Titre sur deux lignes si trop long ---
    let baseTitle = secteur === 'Tous'
        ? 'Évolution annuelle (Tous les secteurs)'
        : `Évolution annuelle (${secteur})`;
    let formattedTitle = baseTitle;
    if (isSmallScreen && baseTitle.length > 25) {
        const split = baseTitle.lastIndexOf(' ', 25);
        if (split > 0) {
            formattedTitle = baseTitle.slice(0, split) + '\n' + baseTitle.slice(split + 1);
        } else {
            formattedTitle = baseTitle.slice(0, 25) + '\n' + baseTitle.slice(25);
        }
    }

    const titleFontSize = isSmallScreen ? 9 : 14;

    // --- Axe X : rotation si trop d'années (plus de 6) ---
    const rotateX = (isSmallScreen && years.length > 6) ? 45 : 0;
    // Marges adaptées pour les étiquettes tournées
    const bottomMargin = (rotateX === 45) ? '15%' : (isSmallScreen ? '12%' : '10%');

    chart.setOption({
        title: {
            text: formattedTitle,
            left: 'center',
            textStyle: { fontSize: titleFontSize }
        },
        tooltip: { trigger: 'axis' },
        grid: {
            left: isSmallScreen ? '12%' : '3%',
            right: isSmallScreen ? '10%' : '4%',
            bottom: bottomMargin,
            top: isSmallScreen ? '22%' : '18%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: years,
            axisLabel: {
                rotate: rotateX,
                fontSize: isSmallScreen ? 10 : 12,
                interval: 0
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: isSmallScreen ? 10 : 12 }
        },
        series: [{
            type: 'line',
            smooth: true,
            data: years.map(y => counts[y]),
            label: {
                show: true,
                position: 'top',
                fontSize: isSmallScreen ? 9 : 12,
                rotate: isSmallScreen ? 45 : 0
            },
            lineStyle: { width: isSmallScreen ? 3 : 4, color: '#d9534f' },
            symbolSize: isSmallScreen ? 6 : 8
        }]
    });
}

function updateEvolutionCharts() {
    generateAmbroisieMonthlyChart();
    generateAmbroisieYearlyChart();
}

/* ============================================================
   FONCTIONNALITÉ "AUTOUR DE MOI" (dans le tableau de bord)
============================================================ */
let locationLayer = null;
let mapClickListener = null;

function initDashboardAutourDeMoiTab() {
    const distanceRange = document.getElementById('dashboardDistanceRange');
    const distanceLabel = document.getElementById('dashboardDistanceLabel');
    const addressInput = document.getElementById('dashboardAddressInput');
    const searchBtn = document.getElementById('dashboardSearchBtn');
    const suggestionsList = document.getElementById('dashboardSuggestionsList');
    const resetBtn = document.getElementById('dashboardResetBtn');
    const locateBtn = document.getElementById('dashboardLocateBtn');
    const clickMapBtn = document.getElementById('dashboardClickMapBtn');

    // On vérifie que tous les éléments du panneau "Autour de moi" existent
    if (!distanceRange || !distanceLabel || !addressInput || !searchBtn || !resetBtn || !locateBtn || !clickMapBtn) {
        console.error('Un élément du panneau "Autour de moi" est introuvable');
        return;
    }

    // On s'assure que la liste des suggestions a un z-index correct 
    if (suggestionsList) {
        suggestionsList.style.zIndex = '1000';
        suggestionsList.style.width = '100%';
    }

    // Mise à jour du label de distance
    distanceRange.addEventListener('input', (e) => {
        distanceLabel.textContent = e.target.value;
        updateBuffer();
    });

    // --- Fonction de recherche (appelée par le bouton ou Entrée) ---
    function performSearch() {
        const address = addressInput.value.trim();
        if (address.length < 3) {
            suggestionsList.innerHTML = '<li class="list-group-item">Tapez au moins 3 caractères</li>';
            return;
        }

        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=5`;
        fetch(url)
            .then(res => res.json())
            .then(data => {
                suggestionsList.innerHTML = '';

                if (data.length === 0) {
                    suggestionsList.innerHTML = '<li class="list-group-item">Aucune adresse trouvée</li>';
                    return;
                }

                data.forEach(place => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item list-group-item-action';
                    li.textContent = place.display_name;
                    li.style.cursor = 'pointer';

                    li.addEventListener('click', () => {
                        const lon = parseFloat(place.lon);
                        const lat = parseFloat(place.lat);
                        const coords = ol.proj.fromLonLat([lon, lat]);

                        addressInput.value = place.display_name;
                        suggestionsList.innerHTML = '';
                        handleSelectedLocation(coords);
                    });

                    suggestionsList.appendChild(li);
                });
            })
            .catch(error => {
                console.error('Erreur lors de la recherche d\'adresse:', error);
                suggestionsList.innerHTML = '<li class="list-group-item">Erreur de recherche</li>';
            });
    }

    // On attacher l'événement au bouton de recherche avec un nettoyage au préalable pour éviter les doublons
    searchBtn.replaceWith(searchBtn.cloneNode(true)); // on supprime les anciens écouteurs
    const newSearchBtn = document.getElementById('dashboardSearchBtn');
    newSearchBtn.addEventListener('click', performSearch);

    // Déclencher aussi avec la touche Entrée dans le champ
    addressInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    });

    // On vide la liste des suggestions quand l'utilisateur modifie le champ
    addressInput.addEventListener('input', () => {
        suggestionsList.innerHTML = '';
    });

    // --- Réinitialisation ---
    resetBtn.addEventListener('click', () => {
        addressInput.value = '';
        suggestionsList.innerHTML = '';

        if (locationLayer) {
            locationLayer.getSource().clear();
        }

        if (map && map.getView()) {
            map.getView().setCenter(ol.proj.fromLonLat([-71.98, 45.408]));
            map.getView().setZoom(11.4);
        }

        // On effacer la jauge
        const gaugeContainer = document.getElementById('dashboardAmbroisieGauge');
        if (gaugeContainer) {
            gaugeContainer.innerHTML = '';
        }

        // On effacer le graphique annuel
        const yearlyChartContainer = document.getElementById('dashboardYearlyChart');
        if (yearlyChartContainer) {
            yearlyChartContainer.innerHTML = '';
        }
    });

    // --- Autres boutons ---
    clickMapBtn.addEventListener('click', enableClickToSelect);
    locateBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords = ol.proj.fromLonLat([pos.coords.longitude, pos.coords.latitude]);
                    handleSelectedLocation(coords);
                },
                (error) => {
                    console.error('Erreur de géolocalisation:', error);
                    alert('Impossible de vous localiser. Vérifiez que la géolocalisation est activée.');
                }
            );
        } else {
            alert('La géolocalisation n\'est pas supportée par votre navigateur.');
        }
    });
}

function enableClickToSelect() {
    if (!map) return;

    map.getTargetElement().style.cursor = 'crosshair';
    if (mapClickListener) {
        map.un('click', mapClickListener);
    }

    mapClickListener = function (evt) {
        const coords = evt.coordinate;
        handleSelectedLocation(coords);
        map.getTargetElement().style.cursor = '';
        map.un('click', mapClickListener);
    };

    map.on('click', mapClickListener);
}

function handleSelectedLocation(coords) {
    const distanceRange = document.getElementById('dashboardDistanceRange');
    if (!distanceRange) return;

    const radiusMeters = parseFloat(distanceRange.value);
    const circle = ol.geom.Polygon.fromCircle(new ol.geom.Circle(coords, radiusMeters), 64);
    const feature = new ol.Feature({ geometry: circle });

    // Gestion du calque de buffer
    if (!locationLayer) {
        locationLayer = new ol.layer.Vector({
            source: new ol.source.Vector(),
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({ color: 'blue', width: 2 }),
                fill: new ol.style.Fill({ color: '#0000ff1a' }),
            })
        });
        map.addLayer(locationLayer);
    }
    locationLayer.getSource().clear();
    locationLayer.getSource().addFeature(feature);
    map.getView().fit(circle.getExtent(), { duration: 1000, padding: [500, 500, 500, 500] });

    // --- Calcul des données dans le buffer ---
    const ambroisieLayer = getVectorLayerByTitle('ambroisie');
    let ambroisieCount = 0;
    const yearlyCounts = {};

    if (ambroisieLayer) {
        const features = ambroisieLayer.getSource().getFeatures();
        features.forEach(f => {
            const geom = f.getGeometry();
            if (geom) {
                const closestPoint = geom.getClosestPoint(coords);
                if (circle.intersectsCoordinate(closestPoint)) {
                    ambroisieCount++;
                    const dateVal = f.get('date');
                    if (dateVal) {
                        const year = new Date(dateVal).getFullYear();
                        if (!isNaN(year)) {
                            yearlyCounts[year] = (yearlyCounts[year] || 0) + 1;
                        }
                    }
                }
            }
        });
    }

    // --- Mise à jour de la jauge ---
    const gaugeContainer = document.getElementById('dashboardAmbroisieGauge');
    if (gaugeContainer) {
        gaugeContainer.innerHTML = '';
        const gaugeDiv = document.createElement('div');
        gaugeDiv.style.width = '100%';
        gaugeDiv.style.height = '100%';
        gaugeContainer.appendChild(gaugeDiv);
        const gaugeChart = echarts.init(gaugeDiv);

        // Détection de la largeur
        const width = window.innerWidth;
        const isMobile = width < 780;
        const isTablet = width >= 780 && width <= 1024;
        const isSmallScreen = isMobile || isTablet;

        // Ajustement des tailles
        const axisLineWidth = isSmallScreen ? (isMobile ? 6 : 8) : 15;
        const titleFontSize = isSmallScreen ? (isMobile ? 10 : 12) : 14;
        const detailFontSize = isSmallScreen ? (isMobile ? 24 : 28) : 36;
        const pointerLength = isSmallScreen ? '50%' : '60%';
        const pointerWidth = isSmallScreen ? (isMobile ? 6 : 7) : 8;
        const anchorSize = isSmallScreen ? (isMobile ? 6 : 8) : 10;
        const axisLabelFontSize = isSmallScreen ? (isMobile ? 6 : 8) : 9;

        const gaugeOption = {
            series: [
                {
                    type: 'gauge',
                    startAngle: 200,
                    endAngle: -25,
                    min: 0,
                    max: 1000,
                    splitNumber: 10,
                    axisLine: {
                        lineStyle: {
                            width: axisLineWidth,
                            color: [
                                [0.3, '#5cb85c'],
                                [0.7, '#f0ad4e'],
                                [1, '#d9534f']
                            ]
                        }
                    },
                    axisTick: { show: false },
                    splitLine: {
                        length: 8,
                        lineStyle: { color: '#999', width: 2 }
                    },
                    axisLabel: {
                        distance: isSmallScreen ? (isMobile ? 10 : 15) : 20,
                        color: '#070606ff',
                        fontSize: axisLabelFontSize
                    },
                    pointer: {
                        icon: 'path://M0 -20 L4 0 L0 20 L-4 0 Z',
                        length: pointerLength,
                        width: pointerWidth,
                        itemStyle: { color: '#3b6df0' }
                    },
                    anchor: {
                        show: true,
                        showAbove: true,
                        size: anchorSize,
                        itemStyle: {
                            borderWidth: 2,
                            borderColor: '#3b6df0',
                            color: '#fff'
                        }
                    },
                    title: {
                        show: true,
                        offsetCenter: [0, '35%'],
                        fontSize: titleFontSize,
                        color: '#0a0a0aff'
                    },
                    detail: {
                        valueAnimation: true,
                        fontSize: detailFontSize,
                        fontWeight: 'bold',
                        offsetCenter: [0, '60%'],
                        formatter: '{value}'
                    },
                    data: [{ value: ambroisieCount, name: 'Total' }]
                }
            ]
        };

        gaugeChart.setOption(gaugeOption);
    }

    // --- Mise à jour du graphique annuel ---
    const yearlyChartContainer = document.getElementById('dashboardYearlyChart');
    if (yearlyChartContainer) {
        yearlyChartContainer.innerHTML = '';

        if (Object.keys(yearlyCounts).length === 0) {
            const msg = document.createElement('p');
            msg.style.textAlign = 'center';
            msg.style.padding = '20px';
            msg.textContent = 'Aucune observation dans cette zone';
            yearlyChartContainer.appendChild(msg);
        } else {
            const yearlyChartDiv = document.createElement('div');
            yearlyChartDiv.style.width = '100%';
            yearlyChartDiv.style.height = '100%';
            yearlyChartContainer.appendChild(yearlyChartDiv);
            const yearlyChart = echarts.init(yearlyChartDiv);

            const years = Object.keys(yearlyCounts).sort();
            const counts = years.map(y => yearlyCounts[y]);

            // Détection de la taille d'écran
            const width = window.innerWidth;
            const isSmallScreen = width <= 1024;
            const isMobile = width < 780;

            // Titre sur deux lignes pour petits écrans
            let titleText = 'Observations annuelles autour de la zone';
            let formattedTitle = titleText;
            if (isSmallScreen && titleText.length > 30) {
                // Couper au niveau de l'espace le plus proche de la moitié
                const mid = Math.floor(titleText.length / 2);
                let splitIndex = titleText.lastIndexOf(' ', mid);
                if (splitIndex === -1) splitIndex = mid;
                formattedTitle = titleText.slice(0, splitIndex) + '\n' + titleText.slice(splitIndex + 1);
            }

            const titleFontSize = isSmallScreen ? 12 : 14;
            // Augmenter la marge haute si le titre est sur deux lignes
            const isTwoLines = formattedTitle !== titleText;
            const gridTop = isSmallScreen
                ? (isMobile
                    ? (isTwoLines ? '32%' : '28%')
                    : (isTwoLines ? '28%' : '25%'))
                : (isTwoLines ? '24%' : '22%');
            const rotateX = isSmallScreen ? 30 : 45;
            const xAxisFontSize = isSmallScreen ? 9 : 11;

            const option = {
                title: {
                    text: formattedTitle,
                    left: 'center',
                    top: 5,
                    textStyle: { fontSize: titleFontSize }
                },
                tooltip: { trigger: 'axis' },
                grid: {
                    left: isSmallScreen ? '12%' : '10%',
                    right: isSmallScreen ? '8%' : '5%',
                    bottom: isSmallScreen ? '12%' : '15%',
                    top: gridTop,
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: years,
                    axisLabel: {
                        rotate: rotateX,
                        interval: 0,
                        fontSize: xAxisFontSize
                    }
                },
                yAxis: {
                    type: 'value',
                    axisLabel: { fontSize: isSmallScreen ? 9 : 11 }
                },
                series: [{
                    type: 'line',
                    data: counts,
                    itemStyle: { color: '#3b6df0' },
                    label: {
                        show: true,
                        position: 'top',
                        fontSize: isSmallScreen ? 9 : 11,
                        rotate: isSmallScreen ? 30 : 0
                    }
                }]
            };
            yearlyChart.setOption(option);
        }
    }
}

function updateBuffer() {
    if (locationLayer && locationLayer.getSource().getFeatures().length > 0) {
        const feature = locationLayer.getSource().getFeatures()[0];
        const geometry = feature.getGeometry();
        if (geometry && geometry.getCenter) {
            const point = geometry.getCenter();
            handleSelectedLocation(point);
        }
    }
}
