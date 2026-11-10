// Relais Cloudflare Worker pour « Premier jour » : questions libres et voix en direct.
// Déploiement : voir README.md, section « Mettre en ligne ».
// Secret requis : OPENROUTER_API_KEY (wrangler secret put OPENROUTER_API_KEY).
// Variable : ORIGINES = liste d'origines autorisées séparées par des virgules.
import { repondreQuestion, genererVoix, ErreurRelais } from './logique.js';

const compteurs = new Map(); // limitation simple par adresse IP (par instance)
const LIMITE = 40, FENETRE = 10 * 60 * 1000;

function limite(ip) {
  const t = Date.now();
  const c = compteurs.get(ip);
  if (!c || t - c.debut > FENETRE) { compteurs.set(ip, { debut: t, n: 1 }); return false; }
  return ++c.n > LIMITE;
}

export default {
  async fetch(requete, env) {
    const origine = requete.headers.get('Origin') || '';
    const autorisees = (env.ORIGINES || '').split(',').map(s => s.trim()).filter(Boolean);
    const ok = autorisees.includes(origine);
    const cors = {
      'Access-Control-Allow-Origin': ok ? origine : autorisees[0] || 'null',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
    const json = (o, statut = 200) => new Response(JSON.stringify(o), { status: statut, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
    const { pathname } = new URL(requete.url);

    if (requete.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (pathname === '/api/etat') return json({ direct: Boolean(env.OPENROUTER_API_KEY) });
    if (requete.method !== 'POST') return json({ erreur: 'Méthode non autorisée.' }, 405);
    if (!ok) return json({ erreur: 'Origine non autorisée.' }, 403);
    if (limite(requete.headers.get('CF-Connecting-IP') || '?')) return json({ erreur: 'Trop de demandes, réessayez dans quelques minutes.' }, 429);

    try {
      const corps = await requete.json();
      if (pathname === '/api/question') return json(await repondreQuestion(env.OPENROUTER_API_KEY, corps));
      if (pathname === '/api/voix') {
        const { audio, type } = await genererVoix(env.OPENROUTER_API_KEY, corps);
        return new Response(audio, { headers: { ...cors, 'Content-Type': type, 'Cache-Control': 'no-store' } });
      }
      return json({ erreur: 'Introuvable.' }, 404);
    } catch (e) {
      const statut = e instanceof ErreurRelais ? e.statut : 500;
      console.error(e);
      return json({ erreur: statut === 400 ? e.message : 'Service momentanément indisponible.' }, statut);
    }
  },
};
