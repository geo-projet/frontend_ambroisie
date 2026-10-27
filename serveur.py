# -*- coding: utf-8 -*-
"""
Serveur local du site.

`python -m http.server` n'envoie aucun en-tete de cache. Le navigateur applique
alors son heuristique de fraicheur — environ un dixieme du temps ecoule depuis
la derniere modification — et reutilise un fichier sans meme demander au
serveur s'il a change. Une correction apportee au code reste donc invisible,
parfois longtemps, et l'on croit a tort que le changement n'a pas ete fait.

Ce serveur repond donc `Cache-Control: no-store` : rien n'est conserve, chaque
rechargement repart du disque. C'est le comportement attendu pendant le
developpement ; en production, Apache fera l'inverse pour les donnees, qui ne
changent qu'a la reconstruction.

Il declare aussi le type `application/geo+json`, qu'aucun serveur ne connait
par defaut.

Usage : python serveur.py [port]
"""

import http.server
import os
import sys

PORT_DEFAUT = 8777

RACINE = os.path.dirname(os.path.abspath(__file__))

PAGES = [
    ('Page du projet', ''),
    ('Sherbrooke', 'cartes/sherbrooke/'),
    ('Montréal', 'cartes/montreal/'),
    ('Québec', 'cartes/quebec/'),
    ('Projections climatiques', 'cartes/projections/'),
    ("Guide d'utilisation", 'cartes/sherbrooke/guide.html'),
]


class Gestionnaire(http.server.SimpleHTTPRequestHandler):

    # Un navigateur ouvre des connexions par avance, sans y envoyer de requete.
    # Sans delai d'attente, chacune retiendrait un fil d'execution jusqu'a
    # l'arret du serveur.
    timeout = 30

    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map)
    extensions_map['.geojson'] = 'application/geo+json'
    extensions_map['.json'] = 'application/json'
    extensions_map['.webmanifest'] = 'application/manifest+json'

    def end_headers(self):
        # Aucune mise en cache : c'est tout l'interet de ce serveur.
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, formatage, *args):
        # Les 200 n'apprennent rien ; les erreurs, si.
        message = formatage % args
        if ' 200 ' not in message and ' 304 ' not in message:
            sys.stderr.write('  %s\n' % message)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT_DEFAUT
    os.chdir(RACINE)

    # Un serveur a fil unique se laisse immobiliser par la premiere connexion
    # ouverte sans requete : tout le reste attend derriere, et le site parait
    # mort alors que le port ecoute. Chaque connexion a donc son fil.
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    http.server.ThreadingHTTPServer.daemon_threads = True
    with http.server.ThreadingHTTPServer(('', port), Gestionnaire) as serveur:
        print('Site servi depuis %s' % RACINE)
        print('Sans cache : un rechargement suffit à voir les modifications.\n')
        for nom, chemin in PAGES:
            print('  %-24s http://localhost:%d/%s' % (nom, port, chemin))
        print('\nCtrl+C pour arrêter.\n')
        try:
            serveur.serve_forever()
        except KeyboardInterrupt:
            print('\nServeur arrêté.')


if __name__ == '__main__':
    main()
