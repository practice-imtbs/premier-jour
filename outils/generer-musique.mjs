#!/usr/bin/env node
// Génère la musique d'ambiance de chaque lieu (MP3) à partir des consignes de contenu/contenu.js, via OpenRouter.
// Usage : node outils/generer-musique.mjs            (seulement les lieux sans musique)
//         node outils/generer-musique.mjs --tout     (tout régénérer)
//         node outils/generer-musique.mjs nexus      (seulement ce lieu, régénéré)
// Nécessite la clé dans .env (OPENROUTER_API_KEY=...). Avec ffmpeg, les fichiers sont allégés (112 kb/s).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { META, LIEUX } from '../contenu/contenu.js';
import { lireCle } from './serveur-local.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER = path.join(RACINE, 'audio', 'musique');
const args = process.argv.slice(2), tout = args.includes('--tout'), filtres = args.filter(a => !a.startsWith('--'));
const cle = lireCle();
if (!cle) { console.error('Clé absente : créez un fichier .env contenant OPENROUTER_API_KEY=sk-or-...'); process.exit(1); }
fs.mkdirSync(DOSSIER, { recursive: true });
const ffmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const aFaire = Object.keys(LIEUX).filter(l => LIEUX[l].musique && (filtres.length ? filtres.includes(l) : tout || !fs.existsSync(path.join(DOSSIER, `${l}.mp3`))));
console.log(`${aFaire.length} musique(s) à générer avec ${META.modeleMusique}.`);
let erreurs = 0;

async function generer(lieu) {
  // la sortie audio n'est disponible qu'en flux : on assemble les morceaux reçus
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://www.imt-bs.eu', 'X-Title': 'Premier jour - IMT-BS' },
    body: JSON.stringify({ model: META.modeleMusique, messages: [{ role: 'user', content: LIEUX[lieu].musique }], modalities: ['text', 'audio'], stream: true }),
  });
  const texte = await r.text();
  if (!r.ok) throw new Error(`OpenRouter ${r.status} : ${texte.slice(0, 300)}`);
  let b64 = '', cout = 0;
  for (const ligne of texte.split('\n')) {
    if (!ligne.startsWith('data: ') || ligne.includes('[DONE]')) continue;
    let e; try { e = JSON.parse(ligne.slice(6)); } catch { continue; }
    if (e.error) throw new Error(e.error.message || 'Erreur du fournisseur');
    b64 += e.choices?.[0]?.delta?.audio?.data || ''; cout = e.usage?.cost ?? cout;
  }
  if (b64.length < 1000) throw new Error('Aucun son reçu.');
  const brut = path.join(DOSSIER, `${lieu}.brut.mp3`), fin = path.join(DOSSIER, `${lieu}.mp3`);
  fs.writeFileSync(brut, Buffer.from(b64, 'base64'));
  if (ffmpeg && spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', brut, '-map_metadata', '-1', '-b:a', '112k', fin]).status === 0) fs.unlinkSync(brut); else fs.renameSync(brut, fin);
  console.log(`  ✓ ${lieu} (${Math.round(fs.statSync(fin).size / 1024)} Ko, ${cout} $)`);
}
for (const lieu of aFaire) { try { await generer(lieu); } catch (e) { erreurs++; console.error(`  ✗ ${lieu} : ${e.message}`); } }
console.log(`Terminé : ${aFaire.length - erreurs} fichier(s), ${erreurs} erreur(s).`);
process.exit(erreurs ? 2 : 0);
