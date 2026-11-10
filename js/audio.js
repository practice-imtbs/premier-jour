// Lecture des voix : fichiers pré-générés, voix en direct (relais), ou synthèse du navigateur en secours.
export class Voix {
  constructor() {
    this.index = {}; this.el = new Audio(); this.el.preload = 'auto';
    this.ctx = null; this.analyseur = null; this.tampon = null;
    this.active = false; this.secours = false; this.muet = false; this._fin = null; this.duree = 0;
  }
  async init() {
    try { const r = await fetch('audio/voix/index.json', { cache: 'no-cache' }); if (r.ok) this.index = await r.json(); } catch { /* pas de voix générées */ }
    return Object.keys(this.index).length;
  }
  // à appeler sur un geste utilisateur (politique de lecture automatique des navigateurs)
  deverrouiller() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      const src = this.ctx.createMediaElementSource(this.el);
      this.analyseur = this.ctx.createAnalyser(); this.analyseur.fftSize = 256;
      this.tampon = new Uint8Array(this.analyseur.fftSize);
      src.connect(this.analyseur); this.analyseur.connect(this.ctx.destination);
    } catch { this.ctx = null; }
  }
  bip(freq = 660, duree = 0.09, volume = 0.05) {
    if (!this.ctx || this.muet) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(volume, t); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + duree);
  }
  succes() { this.bip(660, 0.12); setTimeout(() => this.bip(990, 0.18), 110); }
  erreur() { this.bip(220, 0.2, 0.06); }

  stop() {
    this.el.pause(); this.el.removeAttribute('src');
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    this.active = false; this.secours = false;
    const f = this._fin; this._fin = null; f?.();
  }
  // Joue une réplique pré-générée (id) ; sinon synthèse du navigateur avec `texte`. Résout à la fin.
  jouer(id, texte) {
    this.stop();
    const entree = this.index[id];
    if (this.muet) return this._attendre(texte);
    if (entree) return this._lire(`audio/voix/${entree.fichier}`, texte);
    return this._synthese(texte);
  }
  jouerBlob(blob, texte) {
    this.stop();
    if (this.muet) return this._attendre(texte);
    const url = URL.createObjectURL(blob);
    return this._lire(url, texte).finally(() => URL.revokeObjectURL(url));
  }
  _attendre(texte) { // mode muet : laisse le temps de lire
    this.duree = Math.max(1.5, texte.length / 22);
    return new Promise(ok => { const t = setTimeout(ok, this.duree * 1000); this._fin = () => { clearTimeout(t); ok(); }; });
  }
  _lire(src, texte) {
    return new Promise(ok => {
      const fin = () => { this.el.onended = this.el.onerror = null; this.active = false; this._fin = null; ok(); };
      this._fin = fin;
      this.duree = Math.max(1.5, texte.length / 15);
      this.el.onloadedmetadata = () => { if (isFinite(this.el.duration)) this.duree = this.el.duration; };
      this.el.onended = fin;
      this.el.onerror = () => { this.el.onended = this.el.onerror = null; this._fin = null; this._synthese(texte).then(ok); };
      this.el.src = src; this.active = true;
      this.el.play().catch(() => this.el.onerror?.());
    });
  }
  _synthese(texte) {
    if (!('speechSynthesis' in window)) return this._attendre(texte);
    return new Promise(ok => {
      const u = new SpeechSynthesisUtterance(texte.replace(/\b([A-Z]) (?=[A-Z]\b)/g, '$1'));
      u.lang = 'fr-FR'; u.rate = 1.03;
      const v = speechSynthesis.getVoices().find(x => x.lang?.startsWith('fr')); if (v) u.voice = v;
      this.duree = Math.max(1.5, texte.length / 15);
      let fini = false; const fin = () => { if (fini) return; fini = true; clearTimeout(garde); this.active = false; this.secours = false; this._fin = null; ok(); };
      const garde = setTimeout(fin, this.duree * 1000 + 6000); // certains navigateurs n'émettent pas onend
      this._fin = fin; u.onend = fin; u.onerror = fin;
      this.active = true; this.secours = true;
      speechSynthesis.speak(u);
    });
  }
  // niveau sonore 0..1 pour animer la bouche
  niveau() {
    if (!this.active) return 0;
    if (this.secours || !this.analyseur) return 0.12 + 0.1 * Math.abs(Math.sin(performance.now() / 70)) * Math.abs(Math.sin(performance.now() / 310));
    this.analyseur.getByteTimeDomainData(this.tampon);
    let s = 0; for (let i = 0; i < this.tampon.length; i++) { const v = (this.tampon[i] - 128) / 128; s += v * v; }
    return Math.sqrt(s / this.tampon.length);
  }
}

// Musique d'ambiance : une piste par lieu, en boucle, qui s'efface pendant les dialogues.
const CLE_MUSIQUE = 'imtbs_premier_jour_musique';
export class Musique {
  constructor() {
    this.el = new Audio(); this.el.loop = true; this.el.preload = 'auto'; this.el.volume = 0;
    this.lieu = null; this.charge = null; this.niveau = 0.2; this.active = true; this.pret = false;
    try { this.active = localStorage.getItem(CLE_MUSIQUE) !== '0'; } catch { /* stockage indisponible */ }
    this.el.addEventListener('error', () => { this.charge = null; this.indisponible = this.lieu; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.el.pause(); });
  }
  // à appeler sur un geste utilisateur (politique de lecture automatique des navigateurs)
  deverrouiller(lieu) { this.pret = true; this.lieu = lieu; this._charger(); }
  jouer(lieu) { this.lieu = lieu; }
  basculer() { this.active = !this.active; try { localStorage.setItem(CLE_MUSIQUE, this.active ? '1' : '0'); } catch { /* stockage indisponible */ } return this.active; }
  _charger() {
    this.charge = this.lieu; this.el.volume = 0; this.el.src = `audio/musique/${this.lieu}.mp3`;
    if (this.active) this.el.play().catch(() => { /* lecture refusée : nouvel essai au prochain passage */ });
  }
  // enMarche : faux pendant un dialogue (la musique s'efface puis reprend où elle en était)
  maj(dt, enMarche) {
    if (!this.pret || !this.lieu || this.indisponible === this.lieu) return;
    const bonnePiste = this.charge === this.lieu, cible = this.active && enMarche && bonnePiste && !document.hidden ? this.niveau : 0;
    const v = this.el.volume, pas = dt * (cible > v ? 0.12 : 0.3);
    this.el.volume = Math.max(0, Math.min(1, Math.abs(cible - v) <= pas ? cible : v + Math.sign(cible - v) * pas));
    if (!bonnePiste && this.el.volume === 0) return this._charger();     // changement de lieu : fondu, puis nouvelle piste
    if (cible > 0 && this.el.paused) this.el.play().catch(() => { });
    else if (cible === 0 && this.el.volume === 0 && !this.el.paused) this.el.pause();
  }
}
