// Adresse du relais pour les questions libres et la voix en direct.
// ''  : même origine (serveur local `node outils/serveur-local.mjs`).
// Sur GitHub Pages, indiquer l'adresse du Worker Cloudflare, par exemple :
// 'https://premier-jour-relais.<votre-compte>.workers.dev'
export const CONFIG = {
  relais: ['localhost', '127.0.0.1'].includes(location.hostname) ? '' : 'https://premier-jour-relais.practice-a86.workers.dev',
};
