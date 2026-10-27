/* =========================================================================
   Carte des projections climatiques.

   Les couches sont pré-calculées par tools/climat/ : chaque combinaison de
   scénario et d'horizon est un GeoJSON de quelques polygones, dissous par
   classe. Le changement d'horizon ne fait que substituer une source, ce qui
   rend la lecture animée fluide.
   ========================================================================= */

const DONNEES = 'data/';

let meta = null;              // metadonnees.json
let scenarioActif = 'SSP245';
let horizonActif = 'reference';
let lecture = null;           // minuterie de la lecture automatique

const sourcesCache = {};      // clé de couche -> ol.source.Vector

// ---------------------------------------------------------------- carte

const fond = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attributions: '© OpenStreetMap'
    }),
    opacity: 0.55
});

const coucheAnalogie = new ol.layer.Vector({
    source: new ol.source.Vector(),
    opacity: 0.72,
    style: function (feature) {
        return new ol.style.Style({
            fill: new ol.style.Fill({ color: feature.get('couleur') || '#cccccc' }),
            stroke: new ol.style.Stroke({ color: 'rgba(255,255,255,0.55)', width: 0.6 })
        });
    }
});

const coucheObservations = new ol.layer.Vector({
    source: new ol.source.Vector(),
    visible: false,
    style: new ol.style.Style({
        image: new ol.style.Circle({
            radius: 2.2,
            fill: new ol.style.Fill({ color: 'rgba(20,20,20,0.75)' })
        })
    })
});

const map = new ol.Map({
    target: 'map',
    layers: [fond, coucheAnalogie, coucheObservations],
    view: new ol.View({
        center: ol.proj.fromLonLat([-72.0, 47.6]),
        zoom: 5.6,
        minZoom: 4,
        maxZoom: 11
    }),
    controls: ol.control.defaults.defaults({ attributionOptions: { collapsible: true } })
});

map.addControl(new ol.control.ScaleLine({
    target: document.getElementById('scale-container'),
    units: 'metric'
}));

// Le conteneur prend sa taille définitive après la mise en page : sans cette
// resynchronisation, le premier rendu n'a pas lieu et la carte reste vide.
const conteneur = document.getElementById('map');
function resynchroniser(forcer) {
    map.updateSize();
    if (forcer) map.renderSync();
}
if (window.ResizeObserver) new ResizeObserver(() => resynchroniser(false)).observe(conteneur);
requestAnimationFrame(() => resynchroniser(true));
window.addEventListener('load', () => resynchroniser(true));
window.addEventListener('resize', () => resynchroniser(false));
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => resynchroniser(true));
}

// ---------------------------------------------------------------- couches

function cleCouche(scenario, horizon) {
    return horizon === 'reference' ? 'reference' : scenario + '_' + horizon;
}

function chargerSource(cle) {
    if (!sourcesCache[cle]) {
        sourcesCache[cle] = new ol.source.Vector({
            url: DONNEES + 'analogie_' + cle + '.geojson',
            format: new ol.format.GeoJSON({ featureProjection: 'EPSG:3857' })
        });
    }
    return sourcesCache[cle];
}

function afficher() {
    const cle = cleCouche(scenarioActif, horizonActif);
    coucheAnalogie.setSource(chargerSource(cle));
    majTitre(cle);
    majIndicateurs(cle);
    majLegende(cle);
    majBoutons();
    resynchroniser(true);
    // Les horizons voisins sont préchargés : la lecture automatique enchaîne
    // alors sans temps mort.
    prechargerVoisins();
}

function prechargerVoisins() {
    const horizons = ['reference'].concat(meta.horizons);
    horizons.forEach(h => chargerSource(cleCouche(scenarioActif, h)));
}

// ---------------------------------------------------------------- affichage

function majTitre(cle) {
    const s = meta.scenarios[scenarioActif];
    document.getElementById('titre-scenario').textContent =
        horizonActif === 'reference' ? 'Climat de référence' : s.nom + ' · ' + s.libelle;
    document.getElementById('titre-horizon').textContent =
        horizonActif === 'reference' ? meta.reference : horizonActif;
}

function majIndicateurs(cle) {
    const parts = meta.parts[cle];
    const temp = meta.temperature_mediane[cle];
    const ecrire = (id, valeur) => {
        const el = document.getElementById(id);
        if (el) el.textContent = valeur;
    };
    if (!parts) return;
    ecrire('kpi-analogue', parts.analogue.toFixed(1).replace('.', ',') + ' %');
    ecrire('kpi-hors', parts.hors_analogue.toFixed(1).replace('.', ',') + ' %');
    ecrire('kpi-temp', temp.toFixed(1).replace('.', ',') + ' °C');

    const etat = document.getElementById('kpi-etat');
    if (parts.hors_analogue > 50) {
        etat.textContent = 'La majorité du territoire sort du climat connu';
        etat.className = 'kpi-etat kpi-etat-degrade';
    } else {
        etat.textContent = 'Données ECCC · CMIP6';
        etat.className = 'kpi-etat kpi-etat-ok';
    }
}

function majLegende(cle) {
    const parts = meta.parts[cle] || {};
    document.getElementById('legende').innerHTML = meta.classes.map(c =>
        '<li><span class="puce" style="background:' + c.couleur + '"></span>'
        + c.libelle
        + '<span class="part">' + ((parts[c.cle] || 0).toFixed(1).replace('.', ',')) + ' %</span></li>'
    ).join('');
}

function majBoutons() {
    document.querySelectorAll('#choix-scenario .segment').forEach(b => {
        b.classList.toggle('actif', b.dataset.scenario === scenarioActif);
        b.disabled = horizonActif === 'reference';
        b.style.opacity = horizonActif === 'reference' ? 0.45 : 1;
    });
    document.querySelectorAll('#choix-horizon .segment').forEach(b => {
        b.classList.toggle('actif', b.dataset.horizon === horizonActif);
    });
    const s = meta.scenarios[scenarioActif];
    document.getElementById('aide-scenario').textContent =
        horizonActif === 'reference'
            ? 'Le climat de référence est commun aux trois scénarios.'
            : s.nom + ' — ' + s.libelle.toLowerCase() + '.';
}

// ---------------------------------------------------------------- commandes

function construireCommandes() {
    document.getElementById('choix-scenario').innerHTML =
        Object.keys(meta.scenarios).map(cle =>
            '<button class="segment" data-scenario="' + cle + '">'
            + meta.scenarios[cle].nom + '</button>').join('');

    const horizons = [['reference', meta.reference, 'observé']]
        .concat(meta.horizons.map(h => [h, h, 'projeté']));
    document.getElementById('choix-horizon').innerHTML = horizons.map(([cle, lib, note]) =>
        '<button class="segment" data-horizon="' + cle + '">' + lib
        + '<span class="detail">' + note + '</span></button>').join('');

    document.getElementById('choix-scenario').addEventListener('click', e => {
        const b = e.target.closest('.segment');
        if (!b || b.disabled) return;
        scenarioActif = b.dataset.scenario;
        afficher();
    });

    document.getElementById('choix-horizon').addEventListener('click', e => {
        const b = e.target.closest('.segment');
        if (!b) return;
        arreterLecture();
        horizonActif = b.dataset.horizon;
        afficher();
    });

    document.getElementById('voir-observations').addEventListener('change', e => {
        coucheObservations.setVisible(e.target.checked);
        if (e.target.checked && !coucheObservations.getSource().getUrl()) {
            coucheObservations.setSource(new ol.source.Vector({
                url: DONNEES + 'observations.geojson',
                format: new ol.format.GeoJSON({ featureProjection: 'EPSG:3857' })
            }));
        }
        resynchroniser(true);
    });

    document.getElementById('lecture').addEventListener('click', basculerLecture);
}

function basculerLecture() {
    if (lecture) { arreterLecture(); return; }

    const suite = ['reference'].concat(meta.horizons);
    let i = suite.indexOf(horizonActif);
    const bouton = document.getElementById('lecture');
    bouton.classList.add('en-cours');
    bouton.querySelector('span').textContent = 'Arrêter';
    bouton.querySelector('i').className = 'fas fa-pause';

    lecture = setInterval(() => {
        i = (i + 1) % suite.length;
        horizonActif = suite[i];
        afficher();
    }, 1600);
}

function arreterLecture() {
    if (!lecture) return;
    clearInterval(lecture);
    lecture = null;
    const bouton = document.getElementById('lecture');
    bouton.classList.remove('en-cours');
    bouton.querySelector('span').textContent = 'Dérouler les horizons';
    bouton.querySelector('i').className = 'fas fa-play';
}

// ---------------------------------------------------------------- popup

let popup = null;

map.on('singleclick', function (evt) {
    let trouvee = null;
    map.forEachFeatureAtPixel(evt.pixel, function (f, couche) {
        if (couche === coucheAnalogie && !trouvee) trouvee = f;
    });

    if (!trouvee) {
        if (popup) popup.setPosition(undefined);
        return;
    }

    if (!popup) {
        const el = document.createElement('div');
        el.className = 'ol-popup-clim';
        popup = new ol.Overlay({ element: el, stopEvent: true });
        map.addOverlay(popup);
    }

    const lonlat = ol.proj.toLonLat(evt.coordinate);
    const b = meta.bande;
    popup.getElement().innerHTML =
        '<h3>' + trouvee.get('libelle') + '</h3><dl>'
        + '<dt>Position</dt><dd>' + lonlat[1].toFixed(2) + '° N, '
        + Math.abs(lonlat[0]).toFixed(2) + '° O</dd>'
        + '<dt>Bande occupée</dt><dd>' + b.p10.toFixed(1).replace('.', ',') + ' – '
        + b.p90.toFixed(1).replace('.', ',') + ' °C</dd>'
        + '<dt>Climat connu</dt><dd>jusqu\'à ' + meta.plafond_connu.toFixed(1).replace('.', ',')
        + ' °C</dd></dl>';
    popup.setPosition(evt.coordinate);
});

map.on('pointermove', function (evt) {
    const survol = map.hasFeatureAtPixel(evt.pixel, {
        layerFilter: c => c === coucheAnalogie
    });
    map.getTargetElement().style.cursor = survol ? 'pointer' : '';
});

// ---------------------------------------------------------------- démarrage

fetch(DONNEES + 'metadonnees.json')
    .then(r => r.json())
    .then(m => {
        meta = m;
        construireCommandes();

        // Le diagnostic de biais est affiché tel quel : il qualifie la carte.
        const d = m.calibration.diagnostic_biais;
        const tete = d.tete;
        document.getElementById('note-biais').innerHTML =
            'La bande est calibrée sur <strong>' + m.calibration.presences.toLocaleString('fr-CA')
            + ' observations</strong> validées. À effort d\'observation comparable, '
            + 'l\'ambroisie occupe un climat estival ' + (tete.ecart_effort < 0 ? 'plus frais' : 'plus chaud')
            + ' de ' + Math.abs(tete.ecart_effort).toFixed(2).replace('.', ',')
            + ' °C que les autres astéracées du Québec : le contraste thermique '
            + 'apparent tient donc en partie à la répartition de l\'effort d\'observation, '
            + 'concentré dans les zones habitées.';

        document.getElementById('sources').innerHTML =
            m.source_climat + '<br>' + m.source_observations;

        afficher();
    })
    .catch(e => {
        console.error('Métadonnées introuvables :', e);
        const etat = document.getElementById('kpi-etat');
        etat.textContent = 'Données absentes — lancer tools/climat/';
        etat.className = 'kpi-etat kpi-etat-degrade';
    });
