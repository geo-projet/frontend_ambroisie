/* =========================================================================
   Couche de modélisation prédictive.

   Reproduit le modèle hybride XGB–KED de l'essai de Wilfix Sagard. Trois
   états sont proposés :

     probabilité   probabilité de présence prédite
     incertitude   variance de krigeage, normalisée
     décision      croisement des deux, en quatre situations de gestion

   Les couches sont pré-calculées par tools/modele/ : des polygones dissous
   par classe, donc légers à charger et à styliser.
   ========================================================================= */

const PREDICTION_ETATS = {
    probabilite: {
        fichier: 'data/prediction_probabilite.geojson',
        titre: 'Probabilité de présence',
        classes: 'probabilite'
    },
    incertitude: {
        fichier: 'data/prediction_incertitude.geojson',
        titre: 'Incertitude du krigeage',
        classes: 'incertitude'
    },
    decision: {
        fichier: 'data/prediction_decision.geojson',
        titre: 'Aide à la décision',
        classes: 'decision'
    }
};

let predictionMeta = null;
let predictionEtat = 'probabilite';
let predictionOpacite = 0.7;
const predictionSources = {};

const predictionLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    opacity: predictionOpacite,
    visible: false,
    title: 'prediction',
    style: function (feature) {
        return new ol.style.Style({
            fill: new ol.style.Fill({ color: feature.get('couleur') || '#cccccc' }),
            stroke: new ol.style.Stroke({ color: 'rgba(255,255,255,0.35)', width: 0.5 })
        });
    }
});

// Placement dans la pile : au-dessus des couches de contexte — pédologie et
// affectation sont des aplats opaques qui la masqueraient entièrement — mais
// sous les limites administratives et les observations, qui doivent rester
// lisibles par-dessus.
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
    couches.insertAt(position, predictionLayer);
})();


function predictionSource(etat) {
    if (!predictionSources[etat]) {
        predictionSources[etat] = new ol.source.Vector({
            url: PREDICTION_ETATS[etat].fichier,
            format: new ol.format.GeoJSON({ featureProjection: 'EPSG:3857' })
        });
    }
    return predictionSources[etat];
}

function predictionAfficher(etat) {
    predictionEtat = etat;
    const source = predictionSource(etat);
    predictionLayer.setSource(source);
    predictionMajPanneau();

    // La couche pèse quelques mégaoctets : sans ce rendu différé, la carte
    // reste inchangée jusqu'à la prochaine interaction et l'on croit que la
    // couche ne s'affiche pas.
    if (source.getState() !== 'ready' || !source.getFeatures().length) {
        source.once('featuresloadend', () => {
            if (window.map) map.renderSync();
        });
    }
    if (window.map) map.renderSync();
}

function predictionMajPanneau() {
    const zone = document.getElementById('prediction-legende');
    if (!zone || !predictionMeta) return;

    const definition = PREDICTION_ETATS[predictionEtat];
    const classes = predictionMeta.classes[definition.classes] || [];
    const parts = (predictionMeta.parts || {})['prediction_' + predictionEtat] || {};

    zone.innerHTML = classes.map(c =>
        '<div class="prediction-classe" title="' + (c.description || '') + '">'
        + '<span class="prediction-puce" style="background:' + c.couleur + '"></span>'
        + '<span class="prediction-libelle">' + c.libelle + '</span>'
        + '<span class="prediction-part">'
        + ((parts[c.cle] || 0).toFixed(1).replace('.', ',')) + ' %</span></div>'
    ).join('');

    document.querySelectorAll('.prediction-etat').forEach(b => {
        b.classList.toggle('actif', b.dataset.etat === predictionEtat);
    });
}

function predictionPanneauHTML() {
    if (!predictionMeta) {
        return '<p class="prediction-absent">Couches de prédiction non générées. '
            + 'Voir <code>tools/modele/</code>.</p>';
    }
    const m = predictionMeta;
    return ''
        + '<div class="prediction-etats">'
        + Object.keys(PREDICTION_ETATS).map(cle =>
            '<button class="prediction-etat" data-etat="' + cle + '">'
            + PREDICTION_ETATS[cle].titre + '</button>').join('')
        + '</div>'
        + '<div id="prediction-legende" class="prediction-legende"></div>'
        + '<label class="prediction-opacite">Opacité'
        + '<input type="range" id="prediction-opacite" min="20" max="100" value="'
        + Math.round(predictionOpacite * 100) + '"></label>'
        + '<div class="prediction-metriques">'
        + '<div><span>ROC-AUC hors pli</span><strong>'
        + m.auc_hors_pli.toFixed(2).replace('.', ',') + '</strong></div>'
        + '<div><span>Seuil opérationnel</span><strong>'
        + m.seuil_t1.toFixed(2).replace('.', ',') + '</strong></div>'
        + '<div><span>Portée du variogramme</span><strong>'
        + Math.round(m.variogramme.portee_m) + ' m</strong></div>'
        + '<div><span>Résolution</span><strong>' + m.resolution_m + ' m</strong></div>'
        + '</div>'
        + '<p class="prediction-avertissement"><i class="fas fa-triangle-exclamation"></i> '
        + m.avertissement + '</p>';
}

function predictionBrancherPanneau() {
    const zone = document.getElementById('prediction-panneau');
    if (!zone) return;
    zone.innerHTML = predictionPanneauHTML();
    predictionMajPanneau();

    zone.querySelectorAll('.prediction-etat').forEach(b => {
        b.addEventListener('click', () => predictionAfficher(b.dataset.etat));
    });
    const curseur = document.getElementById('prediction-opacite');
    if (curseur) {
        curseur.addEventListener('input', e => {
            predictionOpacite = e.target.value / 100;
            predictionLayer.setOpacity(predictionOpacite);
        });
    }
}

// Le panneau des couches est reconstruit à chaque ouverture : on rebranche
// les commandes après coup.
document.addEventListener('click', function (e) {
    if (e.target.closest('#couches')) {
        setTimeout(predictionBrancherPanneau, 60);
    }
});

// Clic sur la carte : valeur de la cellule prédite.
map.on('singleclick', function (evt) {
    if (!predictionLayer.getVisible()) return;
    let entite = null;
    map.forEachFeatureAtPixel(evt.pixel, function (f, couche) {
        if (couche === predictionLayer && !entite) entite = f;
    });
    if (!entite) return;

    const el = document.createElement('div');
    el.className = 'ol-popup';
    el.innerHTML = '<div class="popup-content">'
        + '<div class="popup-titre">' + PREDICTION_ETATS[predictionEtat].titre + '</div>'
        + '<div class="popup-ligne"><strong>Classe :</strong> ' + entite.get('libelle') + '</div>'
        + (entite.get('description')
            ? '<div class="popup-ligne">' + entite.get('description') + '</div>' : '')
        + '<div class="popup-ligne"><strong>Part du territoire :</strong> '
        + entite.get('part').toFixed(1).replace('.', ',') + ' %</div>'
        + '</div>';

    if (!window.predictionPopup) {
        window.predictionPopup = new ol.Overlay({
            element: el, positioning: 'bottom-center', stopEvent: true, offset: [0, -12]
        });
        map.addOverlay(window.predictionPopup);
    } else {
        window.predictionPopup.getElement().innerHTML = el.innerHTML;
    }
    window.predictionPopup.setPosition(evt.coordinate);
});


fetch('data/prediction_metadonnees.json')
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(m => {
        predictionMeta = m;
        predictionAfficher('probabilite');
        console.log('Couche de prédiction disponible (ROC-AUC hors pli %s)',
            m.auc_hors_pli);
    })
    .catch(() => {
        console.info('Couches de prédiction non générées — voir tools/modele/');
    });
