/* =========================================================================
   Terrains à potentiel de colonisation.

   Issus du rôle d'évaluation foncière, regroupés selon les sept catégories du
   rapport du MSSS 14-244-03W. Chaque terrain est un point : le rôle localise
   les unités d'évaluation par un point, non par le contour de la parcelle.

   Couche complémentaire du modèle prédictif : là où celui-ci infère un risque
   à partir de variables environnementales, celle-ci désigne des terrains
   nommés, identifiés par leur usage réel.
   ========================================================================= */

let terrainsMeta = null;
const terrainsActives = new Set();      // catégories affichées

const terrainsSource = new ol.source.Vector({
    url: 'data/terrains_potentiel.geojson',
    format: new ol.format.GeoJSON({ featureProjection: 'EPSG:3857' })
});

const terrainsStyles = {};

const terrainsLayer = new ol.layer.Vector({
    source: terrainsSource,
    visible: false,
    title: 'terrains',
    style: function (feature) {
        const categorie = feature.get('categorie');
        // Le filtre par catégorie se fait au style : masquer une catégorie ne
        // demande alors aucun rechargement.
        if (terrainsActives.size && !terrainsActives.has(categorie)) return null;
        const couleur = feature.get('couleur') || '#888888';
        if (!terrainsStyles[couleur]) {
            terrainsStyles[couleur] = new ol.style.Style({
                image: new ol.style.RegularShape({
                    points: 4, radius: 5, angle: Math.PI / 4,
                    fill: new ol.style.Fill({ color: couleur }),
                    stroke: new ol.style.Stroke({ color: 'rgba(255,255,255,0.9)', width: 1 })
                })
            });
        }
        return terrainsStyles[couleur];
    }
});

// Même logique de placement que la couche prédictive : au-dessus des aplats de
// contexte, sous les limites administratives et les observations.
(function placerCouche() {
    const couches = vectorLayerGroup.getLayers();
    const titres = couches.getArray().map(l => l.get('title'));
    // Les reperes ne sont plus nommes en dur : sont concernees les couches
    // d'etiquettes — limites administratives — et les observations.
    const reperes = COUCHES.filter(d => d.type === 'etiquette').map(d => d.id)
        .concat(['ambroisie']);
    let position = couches.getLength();
    for (const repere of reperes) {
        const i = titres.indexOf(repere);
        if (i >= 0 && i < position) position = i;
    }
    couches.insertAt(position, terrainsLayer);
})();


function terrainsPanneauHTML() {
    if (!terrainsMeta) {
        return '<p class="prediction-absent">Couche non générée. '
            + 'Voir <code>tools/cubf/</code>.</p>';
    }
    const m = terrainsMeta;
    const c = m.confrontation_observations;

    let html = '<div class="terrains-categories">'
        + m.categories.map(cat =>
            '<label class="terrains-categorie" title="' + cat.description + '">'
            + '<input type="checkbox" data-categorie="' + cat.cle + '" checked>'
            + '<span class="terrains-puce" style="background:' + cat.couleur + '"></span>'
            + '<span class="terrains-libelle">' + cat.libelle + '</span>'
            + '<span class="terrains-nombre">' + cat.terrains.toLocaleString('fr-CA')
            + '</span></label>').join('')
        + '</div>';

    if (c) {
        html += '<div class="terrains-confrontation">'
            + '<strong>' + c.part.toFixed(1).replace('.', ',') + ' %</strong> des '
            + c.observations.toLocaleString('fr-CA') + ' observations d\'ambroisie '
            + 'se trouvent à moins de ' + c.seuil_m + ' m d\'un de ces terrains, '
            + 'contre ' + c.part_hasard.toFixed(1).replace('.', ',')
            + ' % pour des points tirés au hasard.</div>';
    }

    html += '<p class="prediction-avertissement">'
        + '<i class="fas fa-triangle-exclamation"></i> ' + m.avertissement + '</p>';
    return html;
}

function terrainsBrancherPanneau() {
    const zone = document.getElementById('terrains-panneau');
    if (!zone) return;
    zone.innerHTML = terrainsPanneauHTML();

    zone.querySelectorAll('input[data-categorie]').forEach(b => {
        b.addEventListener('change', () => {
            const cle = b.dataset.categorie;
            if (b.checked) terrainsActives.add(cle);
            else terrainsActives.delete(cle);
            terrainsLayer.changed();
            if (window.map) map.renderSync();
        });
    });
}

document.addEventListener('click', function (e) {
    if (e.target.closest('#couches')) {
        setTimeout(terrainsBrancherPanneau, 60);
    }
});

// Clic : usage réel du terrain, tel que déclaré au rôle d'évaluation.
map.on('singleclick', function (evt) {
    if (!terrainsLayer.getVisible()) return;
    let entite = null;
    map.forEachFeatureAtPixel(evt.pixel, function (f, couche) {
        if (couche === terrainsLayer && !entite) entite = f;
    }, { hitTolerance: 4 });
    if (!entite) return;

    if (!window.terrainsPopup) {
        const el = document.createElement('div');
        el.className = 'ol-popup';
        window.terrainsPopup = new ol.Overlay({
            element: el, positioning: 'bottom-center', stopEvent: true, offset: [0, -12]
        });
        map.addOverlay(window.terrainsPopup);
    }
    window.terrainsPopup.getElement().innerHTML =
        '<div class="popup-content">'
        + '<div class="popup-titre">' + entite.get('libelle') + '</div>'
        + (entite.get('usage')
            ? '<div class="popup-taxon">' + entite.get('usage') + '</div>' : '')
        + '<div class="popup-ligne"><strong>Code d\'utilisation :</strong> '
        + entite.get('cubf') + '</div>'
        + '<div class="popup-ligne">Terrain à inspecter, non un terrain '
        + 'nécessairement colonisé.</div></div>';
    window.terrainsPopup.setPosition(entite.getGeometry().getCoordinates());
});


fetch('data/terrains_potentiel_metadonnees.json')
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(m => {
        terrainsMeta = m;
        m.categories.forEach(c => terrainsActives.add(c.cle));
        console.log('Couche des terrains à potentiel : ' + m.terrains + ' terrains');
    })
    .catch(() => {
        console.info('Couche des terrains non générée — voir tools/cubf/');
    });
