#!/usr/bin/env node
// Génère les voix des personnages (MP3) à partir de contenu/contenu.js, via OpenRouter.
// Usage : node outils/generer-voix.mjs            (ne régénère que les répliques nouvelles ou modifiées)
//         node outils/generer-voix.mjs --tout     (régénère tout)
//         node outils/generer-voix.mjs nora karim (seulement ces personnages)
// Nécessite la clé dans .env (OPENROUTER_API_KEY=...) et ffmpeg pour la conversion en MP3.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { META, repliques } from '../contenu/contenu.js';
import { synthese } from '../relais/logique.js';
import { lireCle } from './serveur-local.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER = path.join(RACINE, 'audio', 'voix');
const INDEX = path.join(DOSSIER, 'index.json');
const args = process.argv.slice(2);
const tout = args.includes('--tout');
const filtres = args.filter(a => !a.startsWith('--'));

const cle = lireCle();
if (!cle) { console.error('Clé absente : créez un fichier .env contenant OPENROUTER_API_KEY=sk-or-...'); process.exit(1); }
fs.mkdirSync(DOSSIER, { recursive: true });
const index = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, 'utf8')) : {};
const ffmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
if (!ffmpeg) console.warn('ffmpeg introuvable : les fichiers resteront au format reçu (WAV possible, plus lourd).');

const empreinte = (r) => crypto.createHash('sha1').update([META.modeleVoix, r.voix, r.ton, r.texte].join('|')).digest('hex').slice(0, 12);
const aFaire = repliques().filter(r => (!filtres.length || filtres.includes(r.perso))
  && (tout || index[r.id]?.empreinte !== empreinte(r) || !fs.existsSync(path.join(DOSSIER, index[r.id].fichier))));

console.log(`${aFaire.length} réplique(s) à générer avec ${META.modeleVoix}.`);
let caracteres = 0, erreurs = 0;

async function generer(r) {
  for (let essai = 1; ; essai++) {
    try {
      const { audio, type } = await synthese(cle, { texte: r.texte, voix: r.voix, ton: r.ton, modele: META.modeleVoix });
      let fichier = `${r.id}.${type.includes('mpeg') ? 'mp3' : type.includes('ogg') ? 'ogg' : 'wav'}`;
      fs.writeFileSync(path.join(DOSSIER, fichier), Buffer.from(audio));
      if (!fichier.endsWith('.mp3') && ffmpeg) {
        const mp3 = `${r.id}.mp3`;
        const c = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(DOSSIER, fichier), '-ac', '1', '-b:a', '64k', path.join(DOSSIER, mp3)]);
        if (c.status === 0) { fs.unlinkSync(path.join(DOSSIER, fichier)); fichier = mp3; }
      }
      index[r.id] = { fichier, empreinte: empreinte(r) };
      caracteres += r.texte.length;
      console.log(`  ✓ ${r.id} (${r.voix}, ${r.texte.length} car.)`);
      return;
    } catch (e) {
      if (essai >= 3) { erreurs++; console.error(`  ✗ ${r.id} : ${e.message}`); return; }
      await new Promise(ok => setTimeout(ok, 1500 * essai));
    }
  }
}

// 4 synthèses en parallèle
const file = [...aFaire];
await Promise.all(Array.from({ length: 4 }, async () => { while (file.length) await generer(file.shift()); }));
fs.writeFileSync(INDEX, JSON.stringify(index, null, 1));
console.log(`Terminé : ${aFaire.length - erreurs} fichier(s), ${caracteres} caractères, ${erreurs} erreur(s).`);
process.exit(erreurs ? 2 : 0);
