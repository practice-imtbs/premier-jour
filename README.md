# Premier jour · L'alternance en immersion

[Jouer en ligne](https://practice-imtbs.github.io/premier-jour/) · [Dépôt GitHub](https://github.com/practice-imtbs/premier-jour)

Jeu sérieux **à la première personne** pour la rentrée des apprenti·es d'IMT Business School (Career Center · PracTice).
Troisième proposition du projet, après *L'Entreprise Mystère* (Claude, quiz sur smartphone) et *Le dernier badge* (ChatGPT, vue isométrique). Version d'essai 0.2.0, novembre 2026.

L'apprenti·e vit son premier jour : il ou elle se déplace en 3D sur le campus, dans l'entreprise Nexus puis dans l'espace d'accompagnement, **échange de vive voix avec 9 personnages**, répond à leurs questions (25 au total) et active son badge à la borne finale. Durée visée : 20 à 30 minutes, sur ordinateur.

## Lancer le jeu

```sh
cd PremierJour3D
node outils/serveur-local.mjs
# puis ouvrir http://localhost:8770
```

Aucune installation (Node 18 ou plus récent, sans dépendance). Le serveur local sert le jeu et relaie les questions libres vers OpenRouter. La clé est lue dans un fichier `.env` placé dans ce dossier ou un dossier parent :

```
OPENROUTER_API_KEY=sk-or-...
```

Sans clé, le jeu fonctionne entièrement, seules les questions libres sont masquées.

## Comment ça marche

| Élément | Fonctionnement |
|---|---|
| Répliques scénarisées (97) | Voix **pré-générées** en MP3 avec `google/gemini-3.8-flash-tts`, une voix par personnage. Aucun coût pendant le jeu. |
| Questions libres | L'apprenti·e écrit (ou dicte) sa question. `google/gemini-3.8-flash` répond dans le rôle du personnage, uniquement à partir de `contenu/connaissances.js`, puis `gemini-3.8-flash-lite-tts` vocalise la réponse. |
| Secours | Si un fichier audio manque, la synthèse vocale du navigateur prend le relais. |
| Progression | Enregistrée sur l'appareil (`localStorage`), aucun compte. |

### Générer ou régénérer les voix

```sh
node outils/generer-voix.mjs          # seulement les répliques nouvelles ou modifiées
node outils/generer-voix.mjs --tout   # tout régénérer
node outils/generer-voix.mjs nora     # un seul personnage
```

Le script a besoin de `ffmpeg` pour convertir en MP3. Coût indicatif pour l'ensemble : quelques centimes (environ 15 000 caractères).

## Modifier le contenu

Tout est dans `contenu/contenu.js` : personnages (voix, ton, apparence), répliques, questions proposées, épreuves, borne, calendrier, annuaire. `contenu/connaissances.js` contient ce que l'IA a le droit de dire. Après une modification de réplique, relancer `generer-voix.mjs`.

Les répliques parlées évitent le point médian et épellent certains sigles (« C F A ») pour une diction naturelle ; l'affichage les recolle automatiquement.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html`, `css/style.css` | Interface, charte IMT-BS (violet #AD1D89, cyan #00B8DE, logo officiel) |
| `js/main.js` | État, déplacements, dialogues, épreuves, carnet, borne, bilan |
| `js/monde.js` | Les trois lieux en 3D (géométrie procédurale, aucun modèle externe), mobilier et accessoires |
| `js/textures.js` | Textures procédurales : carrelage, parquet, béton, enduit, bois, tissu, vue extérieure, écrans |
| `js/rendu.js` | Chaîne de rendu : lumière d'ambiance, occlusion ambiante, anticrénelage, qualité adaptative |
| `js/personnages.js` | Personnages : silhouettes, visages, tenues, regard, clignements, gestes, bouche animée par la voix |
| `js/audio.js` | Lecture des voix |
| `contenu/` | Scénario et base de connaissances de l'IA |
| `audio/voix/` | Voix générées + `index.json` |
| `relais/` | Logique OpenRouter partagée + Worker Cloudflare |
| `outils/` | Serveur local et génération des voix |
| `vendor/three.module.min.js`, `vendor/jsm/` | Three.js r170 et quelques modules complémentaires (licence MIT) |

## Rendu graphique

Depuis la version 0.2.0, le jeu vise un rendu plus réaliste, toujours sans aucun modèle ni image externe : matières texturées (carrelage, parquet, béton ciré, enduit, bois, tissu), reflets et lumière d'ambiance, ombres douces, occlusion ambiante, fenêtres avec vue extérieure, mobilier détaillé (postes de travail, sièges, bibliothèques, plantes, suspensions) et personnages aux proportions humaines (visage, coiffure, tenue, regard et gestes).

La qualité s'adapte à l'ordinateur : si l'affichage manque de fluidité, le jeu passe de lui-même de « Élevée » à « Standard » puis « Légère ». Le choix peut être forcé dans l'aide (touche H) ou par l'adresse : `?qualite=2` (élevée), `1` (standard), `0` (légère). Les collisions et le parcours sont identiques à la version 0.1.0.

Pour changer l'apparence d'un personnage, modifier son bloc `look` dans `contenu/contenu.js` : `carrure` (`f` ou `m`), `style` (`veste`, `chemise`, `pull`), `col`, `chemise`, `jupe`, `manches`, `coiffure`, `frange`, `barbe`, `lunettes`, `iris`, `taille`, et les couleurs `peau`, `cheveux`, `tenue`, `bas`.

## Mettre en ligne

Le jeu est un site statique (GitHub Pages convient). La clé OpenRouter ne doit jamais être publiée : les questions libres passent par un petit relais.

1. Publier le dossier, sans `.env`, `outils/` ni `relais/` (facultatif, ils ne contiennent aucun secret).
2. Déployer le relais : `cd relais && npx wrangler deploy`, puis `npx wrangler secret put OPENROUTER_API_KEY`. Renseigner l'adresse du jeu dans `ORIGINES` (`wrangler.toml`).
3. Indiquer l'adresse du Worker dans `config.js` (`relais: 'https://…workers.dev'`).

Le relais n'accepte que les origines autorisées, limite la longueur des questions, construit lui-même la consigne du personnage et applique une limite simple par adresse IP. Pour un amphi complet, ajouter une règle de limitation de débit Cloudflare et un plafond de dépense sur la clé OpenRouter.

## Points à valider avant diffusion

- **Contenu** : il reprend le `content.json` de *L'Entreprise Mystère* (2026-2027). Les questions q21 et q24, signalées comme trop absolues dans la fiche pédagogique du *Dernier badge*, n'ont pas été reprises. Dates, contacts et procédures restent à relire avec le Career Center.
- **Personnages** : Nora, Karim, Claire, Inès, Samuel, Léa, Marc, Hélène et Yanis sont fictifs. L'annuaire du carnet contient les contacts réels de la source.
- **IA** : les réponses libres sont cadrées mais non relues ; les questions saisies transitent par OpenRouter et Google. Une mention invite à ne saisir aucune donnée personnelle. À arbitrer avec la référence RGPD avant un usage en amphi.
- **Voix** : voix de synthèse Google ; le signaler aux apprenti·es fait partie des bonnes pratiques.
- **Durée et difficulté** : à mesurer avec de vrais apprenti·es.
- **Accessibilité** : tout le parcours est jouable au clavier, les répliques sont sous-titrées, le son peut être coupé. Pas de version smartphone à ce stade.
