/* =========================================================================
   Bandeau de projet : sélecteur de ville.
   Alimenté par VILLES_PROJET (js/config-ville.js) : ajouter une ville au
   projet consiste à passer son entrée à `disponible: true`.
   ========================================================================= */

document.addEventListener('DOMContentLoaded', function () {
    /* Le nom de la ville n'est pas ecrit dans la page : il vient de la
       configuration, sans quoi une carte engendree porterait le nom du
       gabarit. */
    if (typeof CONFIG_VILLE !== 'undefined') {
        const sousTitre = document.getElementById('bandeau-sous-titre');
        if (sousTitre) {
            sousTitre.innerHTML = 'Tableau de bord analytique &mdash; <strong>'
                + CONFIG_VILLE.nom + '</strong>';
        }
        const titreCarte = document.getElementById('map-header');
        if (titreCarte) {
            titreCarte.textContent = "Tableau de bord analytique de l'ambroisie à "
                + CONFIG_VILLE.nom;
        }
    }

    const conteneur = document.getElementById('bandeau-villes');
    if (!conteneur || typeof VILLES_PROJET === 'undefined') return;

    VILLES_PROJET.forEach(function (ville) {
        const actuelle = ville.id === CONFIG_VILLE.id;

        if (actuelle) {
            const onglet = document.createElement('span');
            onglet.className = 'ville-onglet active';
            onglet.textContent = ville.nom;
            onglet.setAttribute('aria-current', 'page');
            conteneur.appendChild(onglet);
            return;
        }

        if (!ville.disponible) {
            const onglet = document.createElement('span');
            onglet.className = 'ville-onglet indisponible';
            onglet.title = 'Carte en préparation';
            onglet.innerHTML = ville.nom + ' <span class="pastille">à venir</span>';
            conteneur.appendChild(onglet);
            return;
        }

        const lien = document.createElement('a');
        lien.className = 'ville-onglet';
        lien.href = ville.url;
        lien.textContent = ville.nom;
        conteneur.appendChild(lien);
    });
});
