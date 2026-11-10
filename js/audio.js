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
