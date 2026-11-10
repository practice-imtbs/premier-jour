// Textures procédurales (aucune image externe) : sols, murs, plafonds, bois, tissus, vue extérieure, écrans.
import * as THREE from 'three';

// --- outils ----------------------------------------------------------------
export function alea(graine = 1) { // générateur pseudo-aléatoire reproductible
  let a = graine >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function toile(l, h = l) { const c = document.createElement('canvas'); c.width = l; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, { srgb = true, repete = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repete) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8; return t;
}
// bruit de valeur raccordable (tuilable), n x n, `cellules` mailles
function bruit(n, cellules, rnd) {
  const g = new Float32Array(cellules * cellules); for (let i = 0; i < g.length; i++) g[i] = rnd();
  const s = new Float32Array(n * n), k = cellules / n;
  for (let y = 0; y < n; y++) {
    const fy = y * k, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), ya = (y0 % cellules) * cellules, yb = ((y0 + 1) % cellules) * cellules;
    for (let x = 0; x < n; x++) {
      const fx = x * k, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), xa = x0 % cellules, xb = (x0 + 1) % cellules;
      s[y * n + x] = (g[ya + xa] * (1 - sx) + g[ya + xb] * sx) * (1 - sy) + (g[yb + xa] * (1 - sx) + g[yb + xb] * sx) * sy;
    }
  }
  return s;
}
function fbm(n, base, octaves, rnd) { // somme d'octaves, résultat dans [0,1]
  const s = new Float32Array(n * n); let amp = 1, tot = 0;
  for (let o = 0; o < octaves; o++) { const b = bruit(n, Math.min(n, base << o), rnd); for (let i = 0; i < s.length; i++) s[i] += b[i] * amp; tot += amp; amp *= 0.5; }
  for (let i = 0; i < s.length; i++) s[i] /= tot;
  return s;
}
function hexVersRgb(hex) { const v = parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
// remplit une toile à partir d'une fonction (x, y, i) -> [r, g, b]
function peindre(g, n, f) {
  const im = g.createImageData(n, n), d = im.data;
  for (let y = 0, i = 0; y < n; y++) for (let x = 0; x < n; x++, i++) { const c = f(x, y, i); d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0);
}
const cache = new Map();
const unique = (cle, f) => { if (!cache.has(cle)) cache.set(cle, f()); return cache.get(cle); };

// --- sols ------------------------------------------------------------------
// Carrelage grand format : 2 x 2 carreaux par motif. Renvoie { map, bumpMap }.
export function carrelage(base = '#cbc6be', joint = '#8e8983', graine = 3) {
  return unique(`car${base}${joint}`, () => {
    const n = 1024, rnd = alea(graine), [c, g] = toile(n), [cb, gb] = toile(n);
    const B = hexVersRgb(base), nuage = fbm(n, 4, 5, rnd), grain = fbm(n, 64, 3, rnd), ton = [rnd(), rnd(), rnd(), rnd()];
    peindre(g, n, (x, y, i) => {
      const t = ton[(x >> 9) + (y >> 9) * 2], k = 0.93 + t * 0.06 + (nuage[i] - 0.5) * 0.16 + (grain[i] - 0.5) * 0.07;
      return [B[0] * k, B[1] * k, B[2] * k * (0.99 + t * 0.02)];
    });
    peindre(gb, n, (x, y, i) => { const v = 200 + (grain[i] - 0.5) * 26; return [v, v, v]; });
    const J = 3; // demi-largeur de joint en pixels
    for (const [ctx, coul, ombre] of [[g, joint, 'rgba(255,255,255,0.35)'], [gb, '#3c3c3c', null]]) {
      for (let k = 0; k <= 2; k++) {
        const p = k * 512;
        ctx.fillStyle = coul; ctx.fillRect(p - J, 0, J * 2, n); ctx.fillRect(0, p - J, n, J * 2);
        if (ombre) { ctx.fillStyle = ombre; ctx.fillRect(p + J, 0, 2, n); ctx.fillRect(0, p + J, n, 2); }
      }
    }
    return { map: tex(c), bumpMap: tex(cb, { srgb: false }) };
  });
}

// Parquet à lames (12 lames par motif, sens de la longueur = axe U).
export function parquet(tons = ['#c49a6c', '#b98a5c', '#cfa77a', '#ad7f52'], graine = 11) {
  return unique(`par${tons.join('')}`, () => {
    const n = 1024, rnd = alea(graine), [c, g] = toile(n), [cb, gb] = toile(n), lames = 12, hL = n / lames;
    const fibre = fbm(n, 8, 5, rnd);
    gb.fillStyle = '#c8c8c8'; gb.fillRect(0, 0, n, n);
    for (let r = 0; r < lames; r++) {
      const y0 = Math.round(r * hL), y1 = Math.round((r + 1) * hL), dec = Math.floor(rnd() * n), coupe = [dec, (dec + n / 2 + Math.floor(rnd() * 120)) % n];
      for (let s = 0; s < 2; s++) { // deux lames par rangée
        const T = hexVersRgb(tons[Math.floor(rnd() * tons.length)]), k0 = 0.92 + rnd() * 0.14, xa = coupe[s], larg = ((coupe[(s + 1) % 2] - xa + n) % n) || n;
        const im = g.createImageData(n, y1 - y0), d = im.data, fy = Math.floor(rnd() * n);
        for (let y = 0; y < y1 - y0; y++) for (let x = 0; x < n; x++) {
          const dans = ((x - xa + n) % n) < larg; if (!dans) continue;
          // fibre du bois : bruit très étiré dans la longueur
          const f = fibre[((fy + y * 5) % n) * n + ((x >> 3) % n)], f2 = fibre[((fy + y * 11) % n) * n + ((x >> 1) % n)];
          const k = k0 * (0.9 + f * 0.16 + (f2 - 0.5) * 0.08), i = (y * n + x) * 4;
          d[i] = T[0] * k; d[i + 1] = T[1] * k; d[i + 2] = T[2] * k; d[i + 3] = 255;
        }
        const [tc, tg] = toile(n, y1 - y0); tg.putImageData(im, 0, 0); g.drawImage(tc, 0, y0);
        g.fillStyle = 'rgba(40,24,10,0.55)'; g.fillRect(xa, y0, 2, y1 - y0); gb.fillStyle = '#505050'; gb.fillRect(xa, y0, 2, y1 - y0);
      }
      g.fillStyle = 'rgba(40,24,10,0.5)'; g.fillRect(0, y0, n, 2); gb.fillStyle = '#505050'; gb.fillRect(0, y0, n, 2);
    }
    return { map: tex(c), bumpMap: tex(cb, { srgb: false }) };
  });
}

// Béton ciré (sols sombres ou clairs).
export function beton(base = '#40444c', graine = 5) {
  return unique(`bet${base}`, () => {
    const n = 512, rnd = alea(graine), [c, g] = toile(n), [cb, gb] = toile(n), B = hexVersRgb(base);
    const nuage = fbm(n, 3, 6, rnd), grain = fbm(n, 128, 2, rnd);
    peindre(g, n, (x, y, i) => { const k = 0.86 + (nuage[i] - 0.5) * 0.5 + (grain[i] - 0.5) * 0.1 + 0.14; return [B[0] * k, B[1] * k, B[2] * k]; });
    peindre(gb, n, (x, y, i) => { const v = 180 + (grain[i] - 0.5) * 40 + (nuage[i] - 0.5) * 30; return [v, v, v]; });
    // joints de dilatation discrets
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, n, 2); g.fillRect(0, 0, 2, n); gb.fillStyle = '#404040'; gb.fillRect(0, 0, n, 2); gb.fillRect(0, 0, 2, n);
    return { map: tex(c), bumpMap: tex(cb, { srgb: false }) };
  });
}

// Moquette / tapis : la couleur est donnée par le matériau (texture neutre multiplicative).
export function moquette() {
  return unique('moq', () => {
    const n = 256, rnd = alea(21), [c, g] = toile(n), [cb, gb] = toile(n), a = fbm(n, 128, 2, rnd), b = fbm(n, 6, 3, rnd);
    peindre(g, n, (x, y, i) => { const v = 255 * (0.8 + (a[i] - 0.5) * 0.34 + (b[i] - 0.5) * 0.12); return [v, v, v]; });
    peindre(gb, n, (x, y, i) => { const v = 255 * a[i]; return [v, v, v]; });
    return { map: tex(c), bumpMap: tex(cb, { srgb: false }) };
  });
}

// --- murs, plafonds ----------------------------------------------------------
export function platre() { // relief d'enduit, à utiliser en bumpMap
  return unique('pla', () => {
    const n = 256, rnd = alea(8), [c, g] = toile(n), a = fbm(n, 64, 3, rnd), b = fbm(n, 5, 3, rnd);
    peindre(g, n, (x, y, i) => { const v = 255 * (a[i] * 0.75 + b[i] * 0.25); return [v, v, v]; });
    return tex(c, { srgb: false });
  });
}
export function dallePlafond(base = '#f1efec') { // dalle acoustique 60 x 60 cm
  return unique(`plf${base}`, () => {
    const n = 256, rnd = alea(14), [c, g] = toile(n), [cb, gb] = toile(n), B = hexVersRgb(base), a = fbm(n, 128, 2, rnd);
    peindre(g, n, (x, y, i) => { const k = 0.95 + (a[i] - 0.5) * 0.08; return [B[0] * k, B[1] * k, B[2] * k]; });
    gb.fillStyle = '#b0b0b0'; gb.fillRect(0, 0, n, n);
    g.fillStyle = 'rgba(0,0,0,0.16)'; gb.fillStyle = '#555';
    for (let i = 0; i < 520; i++) { const x = 8 + rnd() * (n - 16), y = 8 + rnd() * (n - 16), r = 0.5 + rnd() * 0.9; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); gb.beginPath(); gb.arc(x, y, r, 0, 7); gb.fill(); }
    // ossature apparente (profilés blancs) et ombre portée
    g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(0, 5, n, 2); g.fillRect(5, 0, 2, n);
    g.fillStyle = '#fbfaf8'; g.fillRect(0, 0, n, 5); g.fillRect(0, 0, 5, n);
    gb.fillStyle = '#ffffff'; gb.fillRect(0, 0, n, 5); gb.fillRect(0, 0, 5, n);
    return { map: tex(c), bumpMap: tex(cb, { srgb: false }) };
  });
}

// --- mobilier ----------------------------------------------------------------
export function bois(base = '#c9a77c', graine = 31) { // veinage dans le sens U
  return unique(`boi${base}`, () => {
    const n = 512, rnd = alea(graine), [c, g] = toile(n), B = hexVersRgb(base), f = fbm(n, 8, 5, rnd);
    peindre(g, n, (x, y, i) => {
      const v = f[((y * 6) % n) * n + ((x >> 3) % n)], w = f[((y * 13 + 97) % n) * n + ((x >> 1) % n)], k = 0.86 + v * 0.22 + (w - 0.5) * 0.1;
      return [B[0] * k, B[1] * k, B[2] * k];
    });
    return tex(c);
  });
}
export function tissu() { // armure de tissu, à utiliser en bumpMap
  return unique('tis', () => {
    const n = 128, [c, g] = toile(n), rnd = alea(4);
    peindre(g, n, (x, y) => { const v = 128 + 70 * Math.sin(x * Math.PI / 2) * Math.sin(y * Math.PI / 2) + (rnd() - 0.5) * 50; return [v, v, v]; });
    return tex(c, { srgb: false });
  });
}

// --- vue extérieure (fenêtres) ----------------------------------------------
export function exterieur(variante = 0) {
  return unique(`ext${variante}`, () => {
    const l = 2048, h = 512, rnd = alea(40 + variante * 17), [c, g] = toile(l, h), hor = Math.round(h * 0.6);
    const ciel = g.createLinearGradient(0, 0, 0, hor);
    ciel.addColorStop(0, '#5fa8e0'); ciel.addColorStop(0.55, '#a9d3f2'); ciel.addColorStop(1, '#e4f1fa');
    g.fillStyle = ciel; g.fillRect(0, 0, l, hor);
    // nuages
    for (let i = 0; i < 26; i++) {
      const x = rnd() * l, y = 20 + rnd() * hor * 0.62, r = 50 + rnd() * 110;
      for (let k = 0; k < 6; k++) {
        const cx = x + (rnd() - 0.5) * r * 2.4, cy = y + (rnd() - 0.5) * r * 0.35, rr = r * (0.45 + rnd() * 0.5), d = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
        d.addColorStop(0, 'rgba(255,255,255,0.75)'); d.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = d; g.save(); g.translate(0, cy); g.scale(1, 0.5); g.translate(0, -cy); g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill(); g.restore();
      }
    }
    // immeubles lointains puis proches
    for (const [n, hMin, hMax, teinte, fen] of [[26, 30, 110, [168, 186, 204], false], [15, 60, 170, [196, 200, 204], true]]) {
      for (let i = 0; i < n; i++) {
        const w = 70 + rnd() * 150, x = rnd() * l, hh = hMin + rnd() * (hMax - hMin), k = 0.88 + rnd() * 0.2;
        g.fillStyle = `rgb(${teinte[0] * k | 0},${teinte[1] * k | 0},${teinte[2] * k | 0})`; g.fillRect(x, hor - hh, w, hh + 4);
        if (fen) { g.fillStyle = 'rgba(70,96,122,0.55)'; for (let yy = hor - hh + 10; yy < hor - 8; yy += 15) for (let xx = x + 8; xx < x + w - 12; xx += 15) g.fillRect(xx, yy, 9, 8); }
        if (x + w > l) { g.fillRect(x - l, hor - hh, w, hh + 4); }
      }
    }
    // pelouse et allée
    const sol = g.createLinearGradient(0, hor, 0, h); sol.addColorStop(0, '#8fae78'); sol.addColorStop(1, '#5f8650');
    g.fillStyle = sol; g.fillRect(0, hor, l, h - hor);
    g.fillStyle = '#c9c4ba'; g.beginPath(); g.moveTo(0, hor + 60); g.bezierCurveTo(l * 0.3, hor + 30, l * 0.6, hor + 110, l, hor + 60); g.lineTo(l, hor + 92); g.bezierCurveTo(l * 0.6, hor + 150, l * 0.3, hor + 62, 0, hor + 92); g.fill();
    // arbres
    for (let i = 0; i < 34; i++) {
      const x = rnd() * l, ech = 0.6 + rnd() * 0.9, y = hor + 6 + rnd() * 26, hh = 90 * ech;
      g.fillStyle = '#5b4a3a'; g.fillRect(x - 3 * ech, y - hh * 0.5, 6 * ech, hh * 0.5);
      for (let k = 0; k < 9; k++) {
        const v = 86 + rnd() * 50; g.fillStyle = `rgb(${v * 0.55 | 0},${v | 0},${v * 0.45 | 0})`;
        g.beginPath(); g.arc(x + (rnd() - 0.5) * 50 * ech, y - hh * 0.55 - rnd() * hh * 0.6, (16 + rnd() * 16) * ech, 0, 7); g.fill();
      }
    }
    // voile atmosphérique
    const voile = g.createLinearGradient(0, hor - 150, 0, hor + 40); voile.addColorStop(0, 'rgba(228,241,250,0)'); voile.addColorStop(0.75, 'rgba(228,241,250,0.42)'); voile.addColorStop(1, 'rgba(228,241,250,0)');
    g.fillStyle = voile; g.fillRect(0, hor - 150, l, 190);
    const t = tex(c); return t;
  });
}

// --- écrans d'ordinateur ----------------------------------------------------
export function ecran(type = 0) {
  return unique(`ecr${type % 4}`, () => {
    const l = 512, h = 300, [c, g] = toile(l, h), rnd = alea(60 + type);
    const rr = (x, y, w, hh, r, coul) => { g.fillStyle = coul; g.beginPath(); g.roundRect(x, y, w, hh, r); g.fill(); };
    g.fillStyle = '#f4f6f9'; g.fillRect(0, 0, l, h);
    g.fillStyle = ['#1f3a5f', '#AD1D89', '#0f766e', '#2b2f3a'][type % 4]; g.fillRect(0, 0, l, 30);
    for (let i = 0; i < 4; i++) rr(12 + i * 62, 9, 48, 12, 6, 'rgba(255,255,255,0.55)');
    if (type % 4 === 0) { // tableau de bord
      g.fillStyle = '#e6eaf0'; g.fillRect(0, 30, 96, h);
      for (let i = 0; i < 7; i++) rr(12, 46 + i * 30, 72, 12, 6, i === 1 ? '#9fb4cf' : '#cdd5df');
      for (let i = 0; i < 3; i++) { rr(112 + i * 130, 44, 118, 62, 8, '#ffffff'); rr(124 + i * 130, 56, 54, 9, 4, '#c5ccd6'); rr(124 + i * 130, 74, 76, 18, 4, ['#00B8DE', '#AD1D89', '#2fbf71'][i]); }
      rr(112, 120, 378, 164, 8, '#ffffff');
      g.strokeStyle = '#00B8DE'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 12; i++) { const x = 128 + i * 29, y = 250 - rnd() * 90 - i * 3; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    } else if (type % 4 === 1) { // messagerie
      g.fillStyle = '#eceff3'; g.fillRect(0, 30, 150, h);
      for (let i = 0; i < 9; i++) { rr(10, 40 + i * 28, 130, 22, 5, i === 2 ? '#ffffff' : '#e1e6ec'); rr(18, 46 + i * 28, 60 + rnd() * 50, 6, 3, '#9aa6b5'); }
      rr(166, 44, 330, 16, 6, '#3a4250'); for (let i = 0; i < 11; i++) rr(166, 76 + i * 19, 200 + rnd() * 130, 8, 4, '#b9c2cd');
    } else if (type % 4 === 2) { // tableur
      g.strokeStyle = '#d5dbe3'; g.lineWidth = 1;
      for (let y = 52; y < h; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(l, y); g.stroke(); }
      for (let x = 40; x < l; x += 78) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x, h); g.stroke(); }
      g.fillStyle = '#dff3ea'; g.fillRect(40, 52, l, 20);
      for (let y = 0; y < 12; y++) for (let x = 0; x < 6; x++) if (rnd() > 0.25) rr(48 + x * 78, 58 + y * 20, 26 + rnd() * 36, 7, 3, y === 0 ? '#3f8f6c' : '#8b96a5');
    } else { // planning
      for (let i = 0; i < 5; i++) { rr(14 + i * 99, 42, 90, 16, 5, '#dfe4ea'); for (let k = 0; k < 4; k++) if (rnd() > 0.3) rr(14 + i * 99, 66 + k * 56, 90, 28 + rnd() * 22, 6, ['#bfe9f5', '#f3c9e6', '#cdebd9', '#fde3b0'][Math.floor(rnd() * 4)]); }
    }
    return tex(c, { repete: false });
  });
}

// Cadran d'horloge murale (l'heure affichée est celle du lancement du jeu).
export function horloge() {
  return unique('hor', () => {
    const n = 256, [c, g] = toile(n), d = new Date();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
    g.strokeStyle = '#1c1c22'; g.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.lineWidth = i % 3 ? 4 : 8; g.beginPath(); g.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); g.lineTo(128 + Math.sin(a) * 114, 128 - Math.cos(a) * 114); g.stroke(); }
    const aig = (a, long, ep, coul) => { g.strokeStyle = coul; g.lineWidth = ep; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * long, 128 - Math.cos(a) * long); g.stroke(); };
    aig((d.getHours() % 12 + d.getMinutes() / 60) * Math.PI / 6, 60, 10, '#1c1c22'); aig(d.getMinutes() * Math.PI / 30, 92, 6, '#1c1c22'); aig(1.1, 96, 2, '#AD1D89');
    g.fillStyle = '#1c1c22'; g.beginPath(); g.arc(128, 128, 8, 0, 7); g.fill();
    return tex(c, { repete: false });
  });
}
