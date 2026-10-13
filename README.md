# Bourdon

Boîte à rythmes et séquenceur de notes qui tourne directement dans le navigateur, sur téléphone comme sur ordinateur.

**Ouvrir l'appli : https://mwisard81-cell.github.io/Bourdon/**

## Ce qu'elle fait

- **Batterie** sur 16 pas : kick, snare, clap, hi-hat, open hat, tom. Tous les sons sont synthétisés en direct, sans échantillons.
- **Basse** et **mélodie** sur une grille de notes. Les notes restent toujours dans la gamme choisie, donc c'est difficile de jouer faux. Plusieurs notes sur un même pas de la mélodie font un accord.
- **Tonalité et gamme** : majeur, mineur, dorien, phrygien, pentatoniques. Changer de gamme transpose tout le morceau.
- **Réglages** : forme d'onde, brillance, octave, tempo de 60 à 180 BPM, swing, écho calé sur le tempo, réverb.
- **Surprise** génère une idée de rythme ou de mélodie. **Annuler** la reprend.
- **Démos** : Vol de nuit, Boom bap, House 124, Techno sombre, Lo-fi du soir.
- **Export WAV** (44,1 kHz, stéréo) de 1 à 8 mesures, prêt pour un logiciel de montage vidéo. Sur Android, le bouton **Partager** envoie le fichier directement dans une autre appli.
- Le morceau en cours est **sauvegardé automatiquement** dans le navigateur.

## L'installer sur le téléphone

1. Ouvrir le lien ci-dessus dans Chrome.
2. Menu ⋮ → **Ajouter à l'écran d'accueil** (ou **Installer l'appli**).
3. Bourdon s'ouvre alors en plein écran comme une appli, et fonctionne aussi hors connexion.

## Utilisation

- Toucher une case pour poser un son. Glisser le doigt pour en poser plusieurs d'un coup.
- Toucher le nom d'un instrument pour couper ou rétablir la piste.
- Toucher le nom du morceau sur l'écran pour le renommer. Ce nom sert aussi pour le fichier exporté.
- Sur ordinateur, la barre d'espace lance et arrête la lecture.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Structure de la page |
| `style.css` | Apparence, thème clair et sombre |
| `app.js` | Moteur audio (Web Audio API), séquenceur, interface, export WAV |
| `sw.js` | Fonctionnement hors connexion |
| `manifest.webmanifest`, `icons/` | Installation comme appli |

Aucune dépendance et aucune étape de compilation : il suffit de servir le dossier tel quel.
