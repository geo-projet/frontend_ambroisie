/* =========================================================================
   Page du projet : compteurs d'observations.

   Le compteur se remplit à partir du jeu de référence local du tableau de bord
   de Sherbrooke, puis se met à jour depuis l'API iNaturalist si elle répond.
   La page reste donc chiffrée même hors ligne.
   ========================================================================= */

const API_INAT = 'https://api.inaturalist.org/v1/observations';
const TAXON_AMBROISIE = 53587;

/* Les trois villes du projet pilote. Le lieu iNaturalist de l'agglomération
   de Montréal étant incomplet, cette ville se compte par emprise. */
const VILLES = [
    {
        id: 'sherbrooke', compteur: 'compteur-sherbrooke',
        jeu: 'cartes/sherbrooke/data/ambroisie_backup.geojson',
        emprise: [-72.15, 45.28, -71.75, 45.55], lieu: 199762
    },
    {
        id: 'montreal', compteur: 'compteur-montreal',
        jeu: 'cartes/montreal/data/ambroisie_backup.geojson',
        emprise: [-74.05, 45.38, -73.45, 45.72]
    },
    {
        id: 'quebec', compteur: 'compteur-quebec',
        jeu: 'cartes/quebec/data/ambroisie_backup.geojson',
        emprise: [-71.62, 46.68, -71.06, 47.02], lieu: 229560
    }
];

function ecrire(ids, valeur) {
    const formate = valeur.toLocaleString('fr-CA');
    ids.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.textContent = formate;
    });
}

function noterSource(texte) {
    const src = document.getElementById('compteur-source');
    if (src) src.textContent = texte;
}

async function compterJeuLocal(ville) {
    const reponse = await fetch(ville.jeu);
    if (!reponse.ok) throw new Error('HTTP ' + reponse.status);
    const geojson = await reponse.json();
    const [lonMin, latMin, lonMax, latMax] = ville.emprise;

    return (geojson.features || []).filter(function (f) {
        const g = f.geometry;
        if (!g || g.type !== 'Point') return false;
        const [lon, lat] = g.coordinates;
        return lon >= lonMin && lon <= lonMax && lat >= latMin && lat <= latMax;
    }).length;
}

async function compterAPI(ville) {
    /* per_page=0 : iNaturalist renvoie le total sans les résultats.
       Le filtre de qualité est celui des tableaux de bord et des jeux locaux :
       sans lui, cette page annoncerait des totaux supérieurs à ceux que montre
       la carte, pour la même ville et au même instant. */
    const [lonMin, latMin, lonMax, latMax] = ville.emprise;
    const filtre = ville.lieu
        ? '&place_id=' + ville.lieu
        : '&nelat=' + latMax + '&nelng=' + lonMax + '&swlat=' + latMin + '&swlng=' + lonMin;
    const reponse = await fetch(API_INAT + '?taxon_id=' + TAXON_AMBROISIE
                                + filtre + '&quality_grade=research&per_page=0');
    if (!reponse.ok) throw new Error('HTTP ' + reponse.status);
    const donnees = await reponse.json();
    return donnees.total_results || 0;
}

(async function () {
    const totaux = {};

    // Les jeux locaux d'abord : la page reste chiffrée même hors ligne.
    await Promise.all(VILLES.map(async function (ville) {
        try {
            totaux[ville.id] = await compterJeuLocal(ville);
            ecrire([ville.compteur], totaux[ville.id]);
        } catch (erreur) {
            console.warn('Jeu local de ' + ville.id + ' indisponible :', erreur.message);
        }
    }));

    const cumul = Object.values(totaux).reduce(function (a, b) { return a + b; }, 0);
    if (cumul) {
        ecrire(['compteur-observations'], cumul);
        noterSource('Jeux de référence du projet, trois villes');
    } else {
        noterSource('Comptage indisponible');
    }

    // Puis la mise à jour en direct, ville par ville.
    await Promise.all(VILLES.map(async function (ville) {
        try {
            /* Quand l'API répond, elle fait autorité : le jeu local date de sa
               dernière régénération et peut compter des observations retirées
               depuis. Ne la retenir que si elle annonce davantage figerait le
               compteur sur un chiffre périmé. */
            const total = await compterAPI(ville);
            if (total > 0) {
                totaux[ville.id] = total;
                ecrire([ville.compteur], total);
            }
        } catch (erreur) {
            console.warn('API iNaturalist (' + ville.id + ') :', erreur.message);
        }
    }));

    const cumulApi = Object.values(totaux).reduce(function (a, b) { return a + b; }, 0);
    if (cumulApi && cumulApi !== cumul) {
        ecrire(['compteur-observations'], cumulApi);
        noterSource('iNaturalist, mis à jour en direct');
    }
})();

/* Surlignage de la section courante dans la navigation */
document.addEventListener('DOMContentLoaded', function () {
    const liens = [...document.querySelectorAll('nav.principale a[href^="#"]')];
    if (!liens.length || !('IntersectionObserver' in window)) return;

    const parId = {};
    liens.forEach(function (a) { parId[a.getAttribute('href').slice(1)] = a; });

    const observateur = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (entree) {
            const lien = parId[entree.target.id];
            if (!lien) return;
            lien.style.borderBottomColor = entree.isIntersecting ? 'var(--bleu)' : 'transparent';
        });
    }, { rootMargin: '-45% 0px -50% 0px' });

    Object.keys(parId).forEach(function (id) {
        const section = document.getElementById(id);
        if (section) observateur.observe(section);
    });
});


/* Menu des cartes de l'en-tête : ouverture au clic, fermeture au clic
   extérieur ou sur Échap. */
document.addEventListener('DOMContentLoaded', function () {
    const menu = document.querySelector('.menu-cartes');
    if (!menu) return;
    const bouton = menu.querySelector('#menu-cartes-bouton');
    const liste = menu.querySelector('#menu-cartes-liste');

    function basculer(ouvrir) {
        liste.hidden = !ouvrir;
        menu.dataset.ouvert = ouvrir ? 'oui' : 'non';
        bouton.setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
    }

    bouton.addEventListener('click', function (evenement) {
        evenement.stopPropagation();
        basculer(liste.hidden);
    });

    document.addEventListener('click', function (evenement) {
        if (!menu.contains(evenement.target)) basculer(false);
    });

    document.addEventListener('keydown', function (evenement) {
        if (evenement.key === 'Escape') basculer(false);
    });
});
