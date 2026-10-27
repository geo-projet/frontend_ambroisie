/* =========================================================================
   Service worker du tableau de bord.

   Stratégie volontairement prudente :
   - réseau d'abord pour le code (HTML, JS, CSS, GeoJSON), afin qu'une mise à
     jour du tableau de bord soit visible immédiatement, sans purge de cache ;
   - cache d'abord pour les ressources immuables (icônes, images, bibliothèques
     CDN versionnées), qui n'ont aucune raison d'être retéléchargées.

   Tous les chemins sont relatifs : le site fonctionne aussi bien à la racine
   d'un domaine que dans un sous-répertoire.
   ========================================================================= */

const CACHE_NAME = 'ambroisie-pwa-v5';

// Ressources immuables préchargées à l'installation
const RESSOURCES_STABLES = [
  'https://cdn.jsdelivr.net/npm/ol@v9.0.0/dist/ol.js',
  'https://cdn.jsdelivr.net/npm/ol@v9.0.0/ol.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // addAll échoue en bloc si une seule URL est indisponible : on tolère
      // les échecs individuels pour ne jamais empêcher l'installation.
      .then(cache => Promise.allSettled(
        RESSOURCES_STABLES.map(url => cache.add(url))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cles => Promise.all(
        cles.filter(cle => cle !== CACHE_NAME).map(cle => caches.delete(cle))
      ))
  );
  // Pas de clients.claim() : prendre le contrôle d'une page déjà en cours de
  // chargement peut interrompre les requêtes en vol, notamment les tuiles du
  // fond de carte. Le nouveau service worker s'appliquera au prochain
  // chargement, ce qui est le comportement attendu.
});

// Ressources considérées comme immuables : cache d'abord
function estStable(url) {
  return /\.(png|jpe?g|svg|webp|woff2?)$/i.test(url)
    || url.includes('cdn.jsdelivr.net')
    || url.includes('kit.fontawesome.com');
}

self.addEventListener('fetch', event => {
  const requete = event.request;

  if (requete.method !== 'GET') return;

  // L'API iNaturalist et les tuiles de fond de carte ne sont jamais mises en
  // cache : elles ont leur propre repli applicatif.
  const url = requete.url;
  if (url.includes('api.inaturalist.org')
    || url.includes('tile.openstreetmap')
    || url.includes('arcgisonline')
    || url.includes('google.com/vt')) {
    return;
  }

  if (estStable(url)) {
    event.respondWith(
      caches.match(requete).then(reponse => reponse || fetch(requete).then(r => {
        const copie = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(requete, copie)).catch(() => {});
        return r;
      }))
    );
    return;
  }

  // Code et données : réseau d'abord, cache en repli hors ligne
  event.respondWith(
    fetch(requete)
      .then(reponse => {
        const copie = reponse.clone();
        caches.open(CACHE_NAME).then(c => c.put(requete, copie)).catch(() => {});
        return reponse;
      })
      .catch(() => caches.match(requete))
  );
});
