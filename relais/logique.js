// Logique commune au serveur local (outils/serveur-local.mjs) et au relais
// Cloudflare Worker (relais/worker.js). La clé OpenRouter ne quitte jamais le serveur.
import { META, PERSONNAGES } from '../contenu/contenu.js';
import { consigneSysteme } from '../contenu/connaissances.js';

const OR = 'https://openrouter.ai/api/v1';
const MAX_QUESTION = 300;
const MAX_TOURS = 6;
const MAX_TEXTE_VOIX = 700;

const entetes = (cle) => ({
  Authorization: `Bearer ${cle}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://www.imt-bs.eu',
  'X-Title': 'Premier jour - IMT-BS',
});

const propre = (s, max) => String(s ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max);

export class ErreurRelais extends Error {
  constructor(statut, message) { super(message); this.statut = statut; }
}

// { personnage, programme, question, historique:[{role:'user'|'assistant', content}] } -> { reponse }
export async function repondreQuestion(cle, corps) {
  const systeme = consigneSysteme(corps?.personnage, corps?.programme);
  if (!systeme) throw new ErreurRelais(400, 'Personnage inconnu.');
  const question = propre(corps?.question, MAX_QUESTION);
  if (question.length < 2) throw new ErreurRelais(400, 'Question vide.');
  const historique = (Array.isArray(corps?.historique) ? corps.historique : [])
    .slice(-MAX_TOURS * 2)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
    .map(m => ({ role: m.role, content: propre(m.content, 600) }));

  const r = await fetch(`${OR}/chat/completions`, {
    method: 'POST',
    headers: entetes(cle),
    body: JSON.stringify({
      model: META.modeleTexte,
      messages: [{ role: 'system', content: systeme }, ...historique, { role: 'user', content: question }],
      max_tokens: 400,
      temperature: 0.4,
      reasoning: { effort: 'minimal', exclude: true },
    }),
  });
  if (!r.ok) throw new ErreurRelais(502, `OpenRouter (texte) ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  const reponse = propre(d?.choices?.[0]?.message?.content, 900).replace(/[*_#`]/g, '').replace(/\s*—\s*/g, ', ');
  if (!reponse) throw new ErreurRelais(502, 'Réponse vide.');
  return { reponse };
}

// PCM 16 bits mono -> WAV (les modèles Gemini TTS renvoient du PCM brut à 24 kHz).
export function pcmVersWav(pcm, frequence = 24000) {
  const n = pcm.byteLength;
  const b = new ArrayBuffer(44 + n);
  const v = new DataView(b);
  const txt = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  txt(0, 'RIFF'); v.setUint32(4, 36 + n, true); txt(8, 'WAVE'); txt(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, frequence, true); v.setUint32(28, frequence * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); txt(36, 'data'); v.setUint32(40, n, true);
  new Uint8Array(b, 44).set(new Uint8Array(pcm));
  return b;
}

function estConteneur(octets) {
  const s = String.fromCharCode(...octets.slice(0, 4));
  return s === 'RIFF' || s === 'OggS' || s.startsWith('ID3') || (octets[0] === 0xff && (octets[1] & 0xe0) === 0xe0);
}

// Synthèse brute : renvoie { audio:ArrayBuffer, type } (WAV si le modèle renvoie du PCM).
export async function synthese(cle, { texte, voix, ton, modele }) {
  const corps = { model: modele, input: ton ? `[ton ${ton}] ${texte}` : texte, voice: voix };
  let r = await fetch(`${OR}/audio/speech`, { method: 'POST', headers: entetes(cle), body: JSON.stringify({ ...corps, response_format: 'mp3' }) });
  if (!r.ok && r.status === 400) {
    r = await fetch(`${OR}/audio/speech`, { method: 'POST', headers: entetes(cle), body: JSON.stringify(corps) });
  }
  if (!r.ok) throw new ErreurRelais(502, `OpenRouter (voix) ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const type = r.headers.get('content-type') || '';
  const audio = await r.arrayBuffer();
  const debut = new Uint8Array(audio.slice(0, 4));
  if (/mpeg|mp3/.test(type) || (estConteneur(debut) && !/pcm|l16/i.test(type))) {
    const s = String.fromCharCode(...debut);
    return { audio, type: s === 'RIFF' ? 'audio/wav' : s === 'OggS' ? 'audio/ogg' : 'audio/mpeg' };
  }
  const m = /rate=(\d+)/.exec(type);
  return { audio: pcmVersWav(audio, m ? +m[1] : 24000), type: 'audio/wav' };
}

// { personnage, texte } -> { audio, type } avec la voix du personnage (modèle rapide).
export async function genererVoix(cle, corps) {
  const p = PERSONNAGES.find(x => x.id === corps?.personnage);
  if (!p) throw new ErreurRelais(400, 'Personnage inconnu.');
  const texte = propre(corps?.texte, MAX_TEXTE_VOIX);
  if (texte.length < 2) throw new ErreurRelais(400, 'Texte vide.');
  return synthese(cle, { texte, voix: p.voix, ton: p.ton, modele: META.modeleVoixDirect });
}
