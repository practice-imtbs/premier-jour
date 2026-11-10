#!/usr/bin/env node
// Serveur local sans dépendance : sert le jeu et relaie les questions libres vers OpenRouter.
// Usage : node outils/serveur-local.mjs   puis ouvrir http://localhost:8770
// La clé est lue dans .env (dossier du jeu ou dossiers parents) : OPENROUTER_API_KEY=sk-or-...
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repondreQuestion, genererVoix, ErreurRelais } from '../relais/logique.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8770);

export function lireCle(depart = RACINE) {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim();
  let d = depart;
  for (let i = 0; i < 5; i++) {
    const f = path.join(d, '.env');
    if (fs.existsSync(f)) {
      const m = /^\s*OPENROUTER_API_KEY\s*=\s*["']?([^"'\r\n]+)/m.exec(fs.readFileSync(f, 'utf8'));
      if (m) return m[1].trim();
    }
    d = path.dirname(d);
  }
  return '';
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ico': 'image/x-icon' };

const lireCorps = (req) => new Promise((ok, ko) => {
  let s = ''; req.on('data', c => { s += c; if (s.length > 20000) { ko(new ErreurRelais(400, 'Trop long.')); req.destroy(); } });
  req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch { ko(new ErreurRelais(400, 'JSON invalide.')); } });
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cle = lireCle();
  http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const json = (o, s = 200) => { res.writeHead(s, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
    try {
      if (url.pathname === '/api/etat') return json({ direct: Boolean(cle) });
      if (url.pathname.startsWith('/api/')) {
        if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée.' }, 405);
        if (!cle) return json({ erreur: 'Clé OpenRouter absente (.env).' }, 503);
        const corps = await lireCorps(req);
        if (url.pathname === '/api/question') return json(await repondreQuestion(cle, corps));
        if (url.pathname === '/api/voix') {
          const { audio, type } = await genererVoix(cle, corps);
          res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
          return res.end(Buffer.from(audio));
        }
        return json({ erreur: 'Introuvable.' }, 404);
      }
      let chemin = path.normalize(path.join(RACINE, decodeURIComponent(url.pathname)));
      if (!chemin.startsWith(RACINE) || /(^|\/)\.env/.test(url.pathname)) return json({ erreur: 'Interdit.' }, 403);
      if (fs.existsSync(chemin) && fs.statSync(chemin).isDirectory()) chemin = path.join(chemin, 'index.html');
      if (!fs.existsSync(chemin)) { res.writeHead(404); return res.end('Introuvable'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(chemin)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      fs.createReadStream(chemin).pipe(res);
    } catch (e) {
      console.error(e.message);
      json({ erreur: e.message }, e instanceof ErreurRelais ? e.statut : 500);
    }
  }).listen(PORT, () => {
    console.log(`Premier jour : http://localhost:${PORT}`);
    console.log(cle ? 'Questions libres et voix en direct : activées.' : 'Clé OpenRouter absente : questions libres désactivées (le reste du jeu fonctionne).');
  });
}
