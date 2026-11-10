// Construction des trois lieux en géométrie procédurale (aucun modèle externe).
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/jsm/geometries/RoundedBoxGeometry.js';
import * as TX from './textures.js';

export const H = 3.4; // hauteur sous plafond
const VIOLET = '#AD1D89', CYAN = '#00B8DE', ALU = '#2b2d33';

// --- matériaux (mis en cache) ----------------------------------------------
const mats = new Map();
const memo = (k, f) => { if (!mats.has(k)) mats.set(k, f()); return mats.get(k); };
export function mat(couleur, o = {}) {
  return memo(couleur + JSON.stringify(o), () => new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.85, metalness: 0, ...o }));
}
const matMur = (c) => memo(`mur${c}`, () => { const b = TX.platre(); b.repeat.set(0.7, 0.7); return new THREE.MeshStandardMaterial({ color: c, roughness: 0.94, bumpMap: b, bumpScale: 0.3 }); });
const matBois = (c = '#c9a77c', o = {}) => memo(`bois${c}${JSON.stringify(o)}`, () => { const t = TX.bois(c); t.repeat.set(0.9, 0.9); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, ...o }); });
const matMetal = (c = '#9a9ea6', r = 0.32) => memo(`met${c}${r}`, () => new THREE.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: r }));
const matTissu = (c) => memo(`tis${c}`, () => { const b = TX.tissu(); b.repeat.set(16, 16); return new THREE.MeshStandardMaterial({ color: c, roughness: 0.96, bumpMap: b, bumpScale: 0.5 }); });
const matLaque = (c, r = 0.32) => memo(`laq${c}${r}`, () => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.02 }));
const matVerre = (teinte = '#cfeaf2', opacite = 0.2) => memo(`ver${teinte}${opacite}`, () => new THREE.MeshStandardMaterial({ color: teinte, transparent: true, opacity: opacite, roughness: 0.04, metalness: 0.1, envMapIntensity: 2.2, depthWrite: false }));
const matLumiere = (c = '#ffffff', force = 1.6) => memo(`lum${c}${force}`, () => { const m = new THREE.MeshBasicMaterial({ color: c }); m.color.multiplyScalar(force); return m; });

// coordonnées de texture en mètres (les textures se répètent à la même échelle quel que soit l'objet)
function uvMonde(geo, l, h, p) {
  const uv = geo.attributes.uv; if (!uv || uv.count !== 24) return geo;
  const ech = [[p, h], [p, h], [l, p], [l, p], [l, h], [l, h]];
  for (let i = 0; i < 24; i++) { const e = ech[i >> 2]; uv.setXY(i, uv.getX(i) * e[0], uv.getY(i) * e[1]); }
  return geo;
}

export function textureTexte(lignes, { l = 1024, h = 256, fond = '#ffffff', bord = null } = {}) {
  const c = document.createElement('canvas'); c.width = l; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = fond; g.fillRect(0, 0, l, h);
  if (bord) { g.fillStyle = bord; g.fillRect(0, 0, 18, h); }
  g.textBaseline = 'middle';
  for (const t of lignes) {
    let taille = t.taille; const dispo = (t.align === 'center' ? l : l - (t.x ?? 48)) - 40;
    do { g.font = `${t.gras ? '700' : '400'} ${taille}px "Helvetica Neue", Helvetica, Arial, sans-serif`; } while (g.measureText(t.texte).width > dispo && (taille -= 4) > 20);
    g.fillStyle = t.couleur || '#16161d';
    g.textAlign = t.align || 'left';
    g.fillText(t.texte, t.x ?? 48, t.y);
  }
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  return tx;
}

function textureQR() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
  let s = 7; const alea = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#111';
  for (let i = 0; i < 21; i++) for (let j = 0; j < 21; j++) if (alea() > 0.52) g.fillRect(23 + i * 10, 23 + j * 10, 10, 10);
  for (const [x, y] of [[23, 23], [163, 23], [23, 163]]) {
    g.fillStyle = '#111'; g.fillRect(x, y, 70, 70); g.fillStyle = '#fff'; g.fillRect(x + 10, y + 10, 50, 50); g.fillStyle = '#111'; g.fillRect(x + 20, y + 20, 30, 30);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// feuille de plante : lame effilée, légèrement pliée et retombante (origine au pétiole, pointe vers +y)
let geoFeuille = null;
function feuille() {
  if (geoFeuille) return geoFeuille;
  const g = new THREE.PlaneGeometry(1, 1, 4, 8), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i) + 0.5, larg = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.75)), 0.8) * 0.36;
    p.setXYZ(i, u * 2 * larg, v, -0.3 * v * v + Math.abs(u) * 0.22 * larg * 2);
  }
  g.computeVertexNormals(); geoFeuille = g; return g;
}

export class Monde {
  constructor(scene) {
    this.scene = scene;
    this.groupe = new THREE.Group(); scene.add(this.groupe);
    this.logo = new THREE.TextureLoader().load('assets/logo-imtbs.png'); this.logo.colorSpace = THREE.SRGBColorSpace; this.logo.anisotropy = 8;
    this.vider();
  }

  vider() {
    this.groupe.traverse(o => { if (o.geometry && o.geometry !== geoFeuille) o.geometry.dispose(); if (o.material?.userData?.jetable) { o.material.map?.dispose(); o.material.dispose(); } });
    this.groupe.clear();
    this.colliders = []; this.portes = {}; this.interactifs = []; this.places = {}; this.anim = [];
    this.rnd = TX.alea(7); this.nFenetre = 0; this.nEcran = 0;
  }

  // --- primitives -----------------------------------------------------------
  boite(l, h, p, m, x, y, z, { coll = false, ombre = true, recoit = true, rayon = 0, parent = this.groupe } = {}) {
    const mm = typeof m === 'string' ? mat(m) : m;
    const geo = rayon ? new RoundedBoxGeometry(l, h, p, 3, Math.min(rayon, l / 2, h / 2, p / 2)) : uvMonde(new THREE.BoxGeometry(l, h, p), l, h, p);
    const o = new THREE.Mesh(geo, mm);
    o.position.set(x, y, z); o.castShadow = ombre && !mm.transparent; o.receiveShadow = recoit; parent.add(o);
    if (coll) this.colliders.push({ minX: x - l / 2, maxX: x + l / 2, minZ: z - p / 2, maxZ: z + p / 2, actif: true });
    return o;
  }
  cyl(r, h, m, x, y, z, { coll = false, r2 = r, parent = this.groupe, seg = 28, ombre = true } = {}) {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), typeof m === 'string' ? mat(m) : m);
    o.position.set(x, y, z); o.castShadow = ombre; o.receiveShadow = true; parent.add(o);
    if (coll) this.colliders.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, actif: true });
    return o;
  }
  plan(l, h, m, x, y, z, rotY = 0, parent = this.groupe) {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(l, h), m);
    o.position.set(x, y, z); o.rotation.y = rotY; parent.add(o); return o;
  }
  // sous-ensemble orienté : les pièces s'y placent en coordonnées locales (face avant = +z)
  bloc(x, y, z, rotY = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; this.groupe.add(g); return g; }

  // mur aligné sur un axe, de (x1,z1) à (x2,z2)
  mur(x1, z1, x2, z2, { h = H, y0 = 0, ep = 0.2, m = '#f4f3f1', coll = true } = {}) {
    const l = Math.abs(x2 - x1) + (x1 === x2 ? ep : 0), p = Math.abs(z2 - z1) + (z1 === z2 ? ep : 0);
    if (y0 === 0 && h > 1 && typeof m === 'string') this.boite(l + 0.03, 0.11, p + 0.03, mat(this.plinthe || '#3d3d47', { roughness: 0.5 }), (x1 + x2) / 2, 0.055, (z1 + z2) / 2, { ombre: false });
    return this.boite(l, h, p, typeof m === 'string' ? matMur(m) : m, (x1 + x2) / 2, y0 + h / 2, (z1 + z2) / 2, { coll: coll && y0 < 1.8 });
  }
  // mur percé d'une porte coulissante vitrée ; axe 'x' = mur le long de x (z fixe), axe 'z' = mur le long de z (x fixe)
  murPorte(axe, fixe, de, a, centre, { larg = 1.8, id, m = '#f4f3f1', hPorte = 2.35, double = false } = {}) {
    const A = centre - larg / 2, B = centre + larg / 2, X = axe === 'x';
    const seg = (u, v, o) => X ? this.mur(u, fixe, v, fixe, o) : this.mur(fixe, u, fixe, v, o);
    if (A > de) seg(de, A, { m }); if (a > B) seg(B, a, { m });
    seg(A, B, { m, y0: hPorte, h: H - hPorte });
    // huisserie fixe
    const alu = mat(ALU, { roughness: 0.4, metalness: 0.6 });
    const cadre = this.bloc(X ? centre : fixe, 0, X ? fixe : centre, X ? 0 : Math.PI / 2);
    for (const s of [-1, 1]) this.boite(0.05, hPorte, 0.25, alu, s * (larg / 2 - 0.025), hPorte / 2, 0, { parent: cadre });
    this.boite(larg, 0.05, 0.25, alu, 0, hPorte - 0.025, 0, { parent: cadre });
    // vantail vitré (coulisse dans l'épaisseur du mur)
    const panneau = this.bloc(X ? centre : fixe, 0, X ? fixe : centre, X ? 0 : Math.PI / 2);
    const lv = larg - 0.1, hv = hPorte - 0.06;
    this.boite(lv, hv, 0.024, matVerre('#cfeaf2', 0.26), 0, hv / 2, 0, { parent: panneau, ombre: false });
    for (const s of [-1, 1]) this.boite(0.045, hv, 0.05, alu, s * (lv / 2 - 0.022), hv / 2, 0, { parent: panneau });
    this.boite(lv, 0.045, 0.05, alu, 0, hv - 0.022, 0, { parent: panneau }); this.boite(lv, 0.09, 0.05, alu, 0, 0.045, 0, { parent: panneau });
    const inox = matMetal('#c9ccd2', 0.25), cote = X ? -1 : 1;
    const poignees = double ? [-0.13, 0.13] : [cote * (lv / 2 - 0.16)];
    if (double) this.boite(0.05, hv, 0.05, alu, 0, hv / 2, 0, { parent: panneau });
    for (const px of poignees) for (const s of [-1, 1]) {
      this.cyl(0.013, 0.46, inox, px, 1.08, s * 0.06, { parent: panneau, seg: 12 });
      for (const dy of [-0.17, 0.17]) this.boite(0.016, 0.016, 0.05, inox, px, 1.08 + dy, s * 0.04, { parent: panneau, ombre: false });
    }
    // voyant d'état au-dessus de la porte (rouge : verrouillée, vert : ouverte)
    const mv = new THREE.MeshStandardMaterial({ color: '#e04848', emissive: '#e04848', emissiveIntensity: 1.6 });
    const voyant = this.boite(larg - 0.1, 0.035, 0.27, mv, 0, hPorte + 0.03, 0, { parent: cadre, ombre: false });
    const coll = X ? { minX: A, maxX: B, minZ: fixe - 0.15, maxZ: fixe + 0.15, actif: true } : { minX: fixe - 0.15, maxX: fixe + 0.15, minZ: A, maxZ: B, actif: true };
    this.colliders.push(coll);
    const porte = { id, panneau, voyant, coll, ouverte: false, axe, base: centre, larg, centre: X ? new THREE.Vector3(centre, 1.4, fixe) : new THREE.Vector3(fixe, 1.4, centre) };
    if (id) this.portes[id] = porte;
    return porte;
  }
  ouvrirPorte(id, ouverte = true, garderFermee = false) {
    const p = this.portes[id]; if (!p) return;
    p.ouverte = ouverte;
    p.voyant.material.color.set(ouverte ? '#2fbf71' : '#e04848'); p.voyant.material.emissive.set(ouverte ? '#2fbf71' : '#e04848');
    if (garderFermee) return; // porte de sortie : reste visible, on la franchit avec E
    p.coll.actif = !ouverte;
    p.cible = ouverte ? p.larg * 0.96 : 0;
  }
  panneau(lignes, x, y, z, rotY, l = 2.2, h = 0.55, opts = {}) {
    const t = textureTexte(lignes, { l: 1024, h: Math.round(1024 * h / l), ...opts });
    this.boite(Math.abs(Math.sin(rotY)) > 0.5 ? 0.02 : l + 0.03, h + 0.03, Math.abs(Math.sin(rotY)) > 0.5 ? l + 0.03 : 0.02, mat('#d9dade', { roughness: 0.4, metalness: 0.5 }), x - Math.sin(rotY) * 0.012, y, z - Math.cos(rotY) * 0.012, { ombre: false });
    return this.plan(l, h, new THREE.MeshBasicMaterial({ map: t }), x, y, z, rotY);
  }
  enseigne(titre, sous, x, z, rotY, couleur = VIOLET, l = 2.3) {
    return this.panneau([{ texte: titre, taille: 92, gras: true, y: 96, x: 60 }, { texte: sous, taille: 56, y: 190, x: 60, couleur }], x, 2.86, z, rotY, l, l * 0.25, { bord: couleur });
  }
  affiche(titre, lignes, x, y, z, rotY, couleur = VIOLET, l = 1.3, h = 1.7) {
    const hh = Math.round(1024 * h / l);
    const L = [{ texte: titre, taille: 104, gras: true, y: 124, x: 70, couleur: '#fff' }, ...lignes.map((t, i) => ({ texte: t, taille: 104, y: 350 + i * 136, x: 70 }))];
    const c = document.createElement('canvas'); c.width = 1024; c.height = hh; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 1024, hh); g.fillStyle = couleur; g.fillRect(0, 0, 1024, 240);
    g.textBaseline = 'middle';
    for (const t of L) { let ta = t.taille; do { g.font = `${t.gras ? 700 : 400} ${ta}px "Helvetica Neue", Arial, sans-serif`; } while (g.measureText(t.texte).width > 900 && (ta -= 4) > 20); g.fillStyle = t.couleur || '#1b1b22'; g.fillText(t.texte, t.x, t.y); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
    this.boite(rotY % Math.PI === 0 ? l + 0.06 : 0.03, h + 0.06, rotY % Math.PI === 0 ? 0.03 : l + 0.06, mat('#2a2a30', { roughness: 0.45, metalness: 0.4 }), x, y, z, { ombre: false });
    const d = 0.025, m = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.35, emissive: '#ffffff', emissiveMap: tx, emissiveIntensity: 0.35 }); m.userData.jetable = true;
    return this.plan(l, h, m, x + Math.sin(rotY) * d, y, z + Math.cos(rotY) * d, rotY);
  }
  logoMural(x, y, z, rotY, l = 3) {
    const h = l * 335 / 600, d = 0.02;
    return this.plan(l, h, new THREE.MeshBasicMaterial({ map: this.logo }), x + Math.sin(rotY) * d, y, z + Math.cos(rotY) * d, rotY);
  }
  // fenêtre : châssis aluminium, vue extérieure, reflet du vitrage, tablette
  fenetre(x, z, rotY, l = 3, h = 1.9) {
    const g = this.bloc(x, 1.75, z, rotY), alu = mat(ALU, { roughness: 0.4, metalness: 0.6 });
    const t = TX.exterieur(0).clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(l / 9, 0.9); t.offset.set((this.nFenetre++ * 0.37) % 1, 0.05);
    const vue = new THREE.MeshBasicMaterial({ map: t }); vue.color.multiplyScalar(1.15); vue.userData.jetable = true;
    this.plan(l, h, vue, 0, 0, 0.012, 0, g);
    this.plan(l, h, matVerre('#ffffff', 0.1), 0, 0, 0.05, 0, g);
    for (const s of [-1, 1]) { this.boite(0.06, h + 0.12, 0.09, alu, s * (l / 2 + 0.03), 0, 0.045, { parent: g, ombre: false }); this.boite(l + 0.12, 0.06, 0.09, alu, 0, s * (h / 2 + 0.03), 0.045, { parent: g, ombre: false }); }
    const n = Math.max(1, Math.round(l / 1.5));
    for (let i = 1; i < n; i++) this.boite(0.045, h, 0.07, alu, -l / 2 + i * l / n, 0, 0.04, { parent: g, ombre: false });
    this.boite(l + 0.3, 0.035, 0.17, matLaque('#eeeceb', 0.4), 0, -h / 2 - 0.08, 0.085, { parent: g });
  }
  solPlafond(l, p, sol, { taille = 1.2, rugosite = 0.4, relief = 0.6, plafond = '#f1efec' } = {}) {
    const ech = (geo, pas) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * l / pas, uv.getY(i) * p / pas); return geo; };
    const s = new THREE.Mesh(ech(new THREE.PlaneGeometry(l, p), taille), new THREE.MeshStandardMaterial({ map: sol.map, bumpMap: sol.bumpMap, bumpScale: relief, roughness: rugosite, metalness: 0.02, envMapIntensity: 1.3 }));
    s.rotation.x = -Math.PI / 2; s.receiveShadow = true; this.groupe.add(s);
    const d = TX.dallePlafond(plafond);
    const pl = new THREE.Mesh(ech(new THREE.PlaneGeometry(l, p), 0.6), new THREE.MeshStandardMaterial({ map: d.map, bumpMap: d.bumpMap, bumpScale: 0.4, roughness: 1 }));
    pl.rotation.x = Math.PI / 2; pl.position.y = H; this.groupe.add(pl);
  }
  // luminaire encastré
  dalle(x, z, l = 1.2, p = 1.2, intensite = 5, couleur = '#ffffff') {
    this.boite(l + 0.06, 0.03, p + 0.06, mat('#d6d7da', { roughness: 0.4, metalness: 0.6 }), x, H - 0.012, z, { ombre: false, recoit: false });
    const o = new THREE.Mesh(new THREE.PlaneGeometry(l, p), matLumiere(couleur, 1.5)); o.rotation.x = Math.PI / 2; o.position.set(x, H - 0.03, z); this.groupe.add(o);
    if (intensite) { const pt = new THREE.PointLight(couleur, intensite * 0.58, 13, 1.6); pt.position.set(x, H - 0.4, z); this.groupe.add(pt); }
  }
  // suspension décorative
  suspension(x, z, bas = 2.2, couleur = '#2b2d33', lumiere = 0) {
    this.cyl(0.004, H - bas - 0.2, '#1c1c22', x, (H + bas + 0.2) / 2, z, { seg: 6, ombre: false });
    const abat = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.19, 0.2, 32, 1, true), mat(couleur, { roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide }));
    abat.position.set(x, bas + 0.1, z); abat.castShadow = true; this.groupe.add(abat);
    this.cyl(0.05, 0.02, mat(couleur, { roughness: 0.45, metalness: 0.3 }), x, bas + 0.2, z, { ombre: false });
    const amp = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), matLumiere('#fff1d6', 2.2)); amp.position.set(x, bas + 0.06, z); this.groupe.add(amp);
    if (lumiere) { const pt = new THREE.PointLight('#ffe9c4', lumiere, 6, 1.8); pt.position.set(x, bas - 0.05, z); this.groupe.add(pt); }
  }
  // --- mobilier ------------------------------------------------------------
  // poste informatique posé sur un plan (g : bloc orienté, face utilisateur = +z)
  poste(g, { clavier = true, extras = true } = {}) {
    const noir = mat('#17171c', { roughness: 0.35 }), t = TX.ecran(this.nEcran++);
    this.boite(0.56, 0.335, 0.022, noir, 0, 0.345, -0.1, { parent: g });
    this.plan(0.535, 0.31, new THREE.MeshBasicMaterial({ map: t }), 0, 0.345, -0.0885, 0, g);
    this.boite(0.045, 0.2, 0.025, noir, 0, 0.1, -0.125, { parent: g }); this.boite(0.22, 0.012, 0.16, noir, 0, 0.006, -0.12, { parent: g, rayon: 0.005 });
    if (clavier) { this.boite(0.36, 0.014, 0.12, mat('#2a2b31', { roughness: 0.6 }), -0.03, 0.007, 0.14, { parent: g, rayon: 0.005 }); this.boite(0.055, 0.022, 0.095, mat('#2a2b31', { roughness: 0.5 }), 0.27, 0.011, 0.15, { parent: g, rayon: 0.01 }); }
    if (extras) {
      const r = this.rnd();
      if (r < 0.55) { const c = ['#ffffff', VIOLET, CYAN, '#f1b434'][Math.floor(this.rnd() * 4)]; this.cyl(0.036, 0.09, matLaque(c, 0.3), -0.36, 0.045, 0.02, { parent: g, r2: 0.04, seg: 20 }); }
      if (r > 0.3) { this.boite(0.15, 0.014, 0.21, matLaque(['#23324a', '#7a2e8e', '#2f5d50'][Math.floor(this.rnd() * 3)], 0.6), 0.36, 0.007, -0.02, { parent: g }).rotation.y = 0.2; this.boite(0.21, 0.004, 0.297, matLaque('#fbfbf9', 0.8), -0.33, 0.002, 0.3, { parent: g, ombre: false }).rotation.y = -0.15; }
    }
  }
  bureau(x, z, l, p, { h = 0.75, plateau = '#d8c3a5', pied = '#3a3a42', ecran = 0, extras = true } = {}) {
    this.boite(l, 0.04, p, matBois(plateau), x, h, z, { coll: true });
    this.boite(l - 0.1, 0.07, p - 0.1, mat(pied, { roughness: 0.4, metalness: 0.6 }), x, h - 0.055, z, { ombre: false });
    const dx = l / 2 - 0.06, dz = p / 2 - 0.06, acier = mat(pied, { roughness: 0.4, metalness: 0.6 });
    for (const [a, b] of [[-dx, -dz], [dx, -dz], [-dx, dz], [dx, dz]]) this.boite(0.045, h - 0.02, 0.045, acier, x + a, (h - 0.02) / 2, z + b);
    if (ecran) this.poste(this.bloc(x, h + 0.02, z, [0, 0, Math.PI, Math.PI / 2, -Math.PI / 2][ecran]), { extras }); // 1 = face +z, 2 = -z, 3 = +x, 4 = -x
  }
  comptoir(x, z, l, p, couleur = '#ffffff', bandeau = VIOLET, h = 1.05) {
    this.boite(l, h, p, matLaque(couleur === '#ffffff' ? '#eeedea' : couleur, 0.3), x, h / 2, z, { coll: true });
    this.boite(l + 0.08, 0.05, p + 0.12, matBois('#3b3029', { roughness: 0.35 }), x, h + 0.025, z, { rayon: 0.012 });
    this.boite(l + 0.012, 0.1, p + 0.012, new THREE.MeshStandardMaterial({ color: bandeau, emissive: bandeau, emissiveIntensity: 0.9 }), x, 0.2, z, { ombre: false });
    this.boite(l - 0.06, 0.08, p - 0.06, '#1c1c22', x, 0.04, z, { ombre: false });
  }
  // type 'visiteur' : quatre pieds ; 'bureau' : siège pivotant à roulettes
  chaise(x, z, rotY = 0, couleur = '#3b3b45', type = 'visiteur') {
    const g = this.bloc(x, 0, z, rotY), tis = matTissu(couleur), chrome = matMetal('#b9bcc2', 0.25), noir = mat('#1c1c22', { roughness: 0.5 });
    if (type === 'bureau') {
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 0.4, b = this.boite(0.045, 0.03, 0.3, noir, Math.sin(a) * 0.15, 0.075, Math.cos(a) * 0.15, { parent: g }); b.rotation.y = a; this.cyl(0.028, 0.045, noir, Math.sin(a) * 0.29, 0.03, Math.cos(a) * 0.29, { parent: g, seg: 10 }); }
      this.cyl(0.025, 0.36, chrome, 0, 0.26, 0, { parent: g, seg: 12 });
      this.boite(0.48, 0.09, 0.46, tis, 0, 0.47, 0, { parent: g, rayon: 0.035 });
      const d = this.boite(0.44, 0.52, 0.07, tis, 0, 0.82, -0.23, { parent: g, rayon: 0.03 }); d.rotation.x = -0.12;
      this.boite(0.05, 0.3, 0.04, noir, 0, 0.56, -0.24, { parent: g });
      for (const s of [-1, 1]) { this.boite(0.04, 0.2, 0.04, noir, s * 0.26, 0.57, -0.02, { parent: g }); this.boite(0.06, 0.03, 0.26, noir, s * 0.26, 0.68, 0, { parent: g, rayon: 0.012 }); }
    } else {
      this.boite(0.44, 0.045, 0.43, tis, 0, 0.46, 0, { parent: g, rayon: 0.02 });
      const d = this.boite(0.42, 0.34, 0.04, tis, 0, 0.74, -0.205, { parent: g, rayon: 0.018 }); d.rotation.x = -0.1;
      for (const [a, b] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) this.cyl(0.013, b < 0 ? 0.6 : 0.44, chrome, a, b < 0 ? 0.3 : 0.22, b, { parent: g, seg: 10 });
    }
  }
  fauteuil(x, z, rotY = 0, couleur = VIOLET) {
    const g = this.bloc(x, 0, z, rotY), m = matTissu(couleur), bois = matBois('#8a6a48');
    this.boite(0.8, 0.22, 0.74, m, 0, 0.3, 0, { parent: g, rayon: 0.06 });
    this.boite(0.62, 0.12, 0.6, m, 0, 0.44, 0.04, { parent: g, rayon: 0.05 });
    const d = this.boite(0.8, 0.58, 0.18, m, 0, 0.6, -0.3, { parent: g, rayon: 0.07 }); d.rotation.x = -0.1;
    for (const s of [-1, 1]) this.boite(0.14, 0.36, 0.72, m, s * 0.4, 0.46, 0, { parent: g, rayon: 0.06 });
    for (const [a, b] of [[-0.33, -0.3], [0.33, -0.3], [-0.33, 0.3], [0.33, 0.3]]) this.cyl(0.02, 0.2, bois, a, 0.1, b, { parent: g, r2: 0.028, seg: 10 });
    this.colliders.push({ minX: x - 0.45, maxX: x + 0.45, minZ: z - 0.45, maxZ: z + 0.45, actif: true });
  }
  banc(x, z, l, p, couleur = '#2a2a30') {
    this.boite(l, 0.3, p, mat('#22232a', { roughness: 0.5 }), x, 0.15, z, { coll: true });
    this.boite(l + 0.02, 0.13, p + 0.02, matTissu(couleur), x, 0.365, z, { rayon: 0.04 });
  }
  plante(x, z, h = 1.5) {
    const rnd = this.rnd;
    this.cyl(0.17, 0.42, matLaque(rnd() > 0.5 ? '#eceae6' : '#3a3c44', 0.35), x, 0.21, z, { coll: true, r2: 0.25 });
    this.colliders[this.colliders.length - 1] = { minX: x - 0.2, maxX: x + 0.2, minZ: z - 0.2, maxZ: z + 0.2, actif: true };
    this.cyl(0.235, 0.02, mat('#3b2f26', { roughness: 1 }), x, 0.41, z, { ombre: false });
    const n = Math.round(46 * h / 1.5), feuilles = new THREE.InstancedMesh(feuille(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, side: THREE.DoubleSide }), n);
    const tronc = mat('#6b4f3a', { roughness: 0.9 }), M = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), haut = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < 4; i++) { const a = i * 1.7 + rnd(), t = this.cyl(0.012, h * 0.62, tronc, x + Math.cos(a) * 0.05, 0.42 + h * 0.3, z + Math.sin(a) * 0.05, { seg: 6, r2: 0.007 }); t.rotation.set(Math.sin(a) * 0.13, 0, -Math.cos(a) * 0.13); }
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996 + rnd() * 0.5, t = (i + 0.5) / n, y = 0.55 + t * (h - 0.75), r = (0.06 + 0.2 * Math.sin(Math.PI * (0.12 + 0.8 * t))) * (0.6 + rnd() * 0.5);
      d.set(Math.cos(a), 0.35 + t * 0.5 + (rnd() - 0.5) * 0.5, Math.sin(a)).normalize();
      q.setFromUnitVectors(haut, d); q2.setFromAxisAngle(d, Math.atan2(-Math.cos(a), Math.sin(a)) + (rnd() - 0.5) * 0.8 + Math.PI / 2); q.premultiply(q2);
      const e = 0.2 + rnd() * 0.13;
      M.compose(new THREE.Vector3(x + Math.cos(a) * r, y, z + Math.sin(a) * r), q, new THREE.Vector3(e, e, e));
      feuilles.setMatrixAt(i, M);
      c.setHSL(0.34 + (rnd() - 0.5) * 0.05, 0.42 + rnd() * 0.16, 0.2 + rnd() * 0.13 + t * 0.06); feuilles.setColorAt(i, c);
    }
    feuilles.castShadow = true; feuilles.receiveShadow = true; feuilles.frustumCulled = false; this.groupe.add(feuilles);
  }
  etagere(x, z, l, rotY = 0, couleur = '#e9e6e1') {
    const versX = Math.abs(Math.sin(rotY)) > 0.5, g = this.bloc(x, 0, z, rotY), bois = matLaque(couleur, 0.55), fond = mat('#cfcac3', { roughness: 0.8 });
    for (const s of [-1, 1]) this.boite(0.03, 1.9, 0.36, bois, s * (l / 2 - 0.015), 0.95, 0, { parent: g });
    this.boite(l, 1.9, 0.02, fond, 0, 0.95, -0.17, { parent: g });
    for (const y of [0.05, 0.25, 0.67, 1.09, 1.51, 1.885]) this.boite(l - 0.06, 0.03, 0.34, bois, 0, y, 0.005, { parent: g });
    this.colliders.push(versX ? { minX: x - 0.18, maxX: x + 0.18, minZ: z - l / 2, maxZ: z + l / 2, actif: true } : { minX: x - l / 2, maxX: x + l / 2, minZ: z - 0.18, maxZ: z + 0.18, actif: true });
    // livres et classeurs
    const rnd = this.rnd, cs = [VIOLET, CYAN, '#2d2d38', '#f1b434', '#7a7a86', '#f4f2ee', '#b23a48', '#2f5d50', '#e8e2d6', '#23324a'];
    const livres = [];
    for (let n = 0; n < 4; n++) {
      let u = -l / 2 + 0.06;
      while (u < l / 2 - 0.1) {
        if (rnd() < 0.1) { u += 0.1 + rnd() * 0.25; continue; }
        const ep = 0.022 + rnd() * 0.04, hh = 0.2 + rnd() * 0.12, pr = 0.19 + rnd() * 0.07, pen = rnd() < 0.07 ? (rnd() - 0.5) * 0.4 : 0;
        livres.push({ u: u + ep / 2, y: 0.265 + n * 0.42 + hh / 2, ep, hh, pr, pen, c: cs[Math.floor(rnd() * cs.length)] }); u += ep + 0.002 + Math.abs(pen) * 0.1;
      }
    }
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), livres.length);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), Z = new THREE.Vector3(0, 0, 1);
    livres.forEach((b, i) => { q.setFromAxisAngle(Z, b.pen); M.compose(new THREE.Vector3(b.u, b.y, 0.04), q, new THREE.Vector3(b.ep, b.hh, b.pr)); im.setMatrixAt(i, M); im.setColorAt(i, c.set(b.c)); });
    im.castShadow = true; im.receiveShadow = true; g.add(im);
  }
  tapis(x, z, l, p, couleur) {
    const t = TX.moquette(), geo = new THREE.PlaneGeometry(l, p), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * l / 0.5, uv.getY(i) * p / 0.5);
    const o = new THREE.Mesh(geo, memo(`tap${couleur}`, () => new THREE.MeshStandardMaterial({ color: couleur, map: t.map, bumpMap: t.bumpMap, bumpScale: 0.8, roughness: 1 })));
    o.rotation.x = -Math.PI / 2; o.position.set(x, 0.012, z); o.receiveShadow = true; this.groupe.add(o);
  }
  // --- accessoires muraux --------------------------------------------------
  horloge(x, y, z, rotY) {
    const g = this.bloc(x, y, z, rotY);
    const c = this.cyl(0.19, 0.035, mat('#1c1c22', { roughness: 0.35 }), 0, 0, 0.018, { parent: g, seg: 40 }); c.rotation.x = Math.PI / 2;
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.172, 40), new THREE.MeshBasicMaterial({ map: TX.horloge() })); f.position.z = 0.037; g.add(f);
  }
  tele(x, y, z, rotY, l = 1.5, type = 0) {
    const g = this.bloc(x, y, z, rotY), h = l * 0.5625;
    this.boite(l + 0.04, h + 0.04, 0.045, mat('#111114', { roughness: 0.3 }), 0, 0, 0.03, { parent: g });
    this.plan(l, h, new THREE.MeshBasicMaterial({ map: TX.ecran(type) }), 0, 0, 0.054, 0, g);
  }
  interrupteur(x, y, z, rotY) { const g = this.bloc(x, y, z, rotY); this.boite(0.085, 0.085, 0.012, matLaque('#f7f7f5', 0.4), 0, 0, 0.006, { parent: g, ombre: false }); this.boite(0.03, 0.045, 0.008, matLaque('#ffffff', 0.3), 0, 0, 0.014, { parent: g, ombre: false }); }
  extincteur(x, z, rotY) {
    const g = this.bloc(x, 0, z, rotY), rouge = matLaque('#c8102e', 0.3);
    this.cyl(0.062, 0.42, rouge, 0, 0.95, 0.09, { parent: g, seg: 20 }); this.cyl(0.03, 0.06, mat('#1c1c22'), 0, 1.19, 0.09, { parent: g, seg: 12 });
    this.boite(0.1, 0.02, 0.03, mat('#1c1c22'), 0.02, 1.23, 0.09, { parent: g, ombre: false });
    this.boite(0.2, 0.2, 0.004, matLaque('#c8102e', 0.5), 0, 1.55, 0.004, { parent: g, ombre: false }); this.boite(0.07, 0.11, 0.006, matLaque('#ffffff', 0.5), 0, 1.55, 0.006, { parent: g, ombre: false });
  }
  issue(x, y, z, rotY) { // bloc lumineux de sortie
    const t = textureTexte([{ texte: 'SORTIE  →', taille: 120, gras: true, y: 100, x: 256, align: 'center', couleur: '#ffffff' }], { l: 512, h: 200, fond: '#1a9a55' });
    const g = this.bloc(x, y, z, rotY); this.boite(0.5, 0.2, 0.05, mat('#e8e8e8'), 0, 0, 0.025, { parent: g, ombre: false });
    const m = new THREE.MeshBasicMaterial({ map: t }); m.color.multiplyScalar(1.3); this.plan(0.46, 0.17, m, 0, 0, 0.052, 0, g);
  }
  lumieres(couleurCiel, couleurSol, intensite, dir = [6, 9, 5]) {
    this.groupe.add(new THREE.HemisphereLight(couleurCiel, couleurSol, intensite));
    const d = new THREE.DirectionalLight('#fff6ea', 0.7); d.position.set(...dir); d.castShadow = true; d.userData.ombre = true; d.shadow.radius = 3.5;
    d.shadow.mapSize.set(2048, 2048); const s = d.shadow.camera; s.left = -18; s.right = 18; s.top = 14; s.bottom = -14; s.near = 1; s.far = 40; d.shadow.bias = -0.0006; d.shadow.normalBias = 0.03;
    // la lumière directionnelle traverse le plafond (les ombres portées donnent le relief du mobilier)
    this.groupe.add(d); this.groupe.add(d.target);
  }

  // --- lieux ---------------------------------------------------------------
  construire(lieu) {
    this.vider();
    this[lieu]();
    return { depart: this.depart };
  }

  campus() {
    this.depart = { x: 0, z: 6.6, angle: 0 }; this.plinthe = '#3d3d47';
    this.solPlafond(30, 18, TX.carrelage('#b9b3aa', '#9a958e'), { taille: 1.8, rugosite: 0.36, relief: 0.4 });
    this.lumieres('#ffffff', '#b4aeb8', 0.38);
    for (const z of [-7.5, -3.5, 0.5, 4.5, 8.5]) this.boite(30, 0.14, 0.16, '#d2cfd4', 0, H - 0.07, z, { ombre: false });
    const M = '#f6f5f3';
    // enveloppe
    this.murPorte('x', -9, -15, 15, 0, { larg: 2.4, id: 'sortie', m: M, double: true });
    this.mur(-15, 9, 15, 9, { m: M }); this.mur(-15, -9, -15, 9, { m: M }); this.mur(15, -9, 15, 9, { m: M });
    { const t = TX.exterieur(0).clone(); t.needsUpdate = true; t.repeat.set(0.3, 0.9); t.offset.set(0.52, 0.05); const m = new THREE.MeshBasicMaterial({ map: t }); m.userData.jetable = true; this.plan(4, 2.6, m, 0, 1.3, -9.5, 0); }
    // ailes
    this.murPorte('z', -6, -9, 9, -2, { id: 'a08', m: M });
    this.mur(-15, 3, -6, 3, { m: M });
    this.murPorte('z', 6, -9, 1, -4, { id: 'b12', m: M });
    this.murPorte('z', 6, 1, 9, 5, { id: 'coord', m: M });
    this.mur(6, 1, 15, 1, { m: M });
    // hall : mur signature + accueil
    this.boite(5.4, 3.0, 0.3, memo('signature', () => new THREE.MeshStandardMaterial({ color: VIOLET, roughness: 0.55 })), 0, 1.5, -2.5, { coll: true });
    this.boite(3.5, 2.05, 0.04, matLaque('#ffffff', 0.4), 0, 1.75, -2.33, { ombre: false });
    this.logoMural(0, 1.75, -2.31, 0, 3.3);
    this.comptoir(0, -0.45, 3.6, 0.8);
    this.poste(this.bloc(-1.4, 1.1, -0.52, Math.PI - 0.35), { extras: false });
    this.boite(0.22, 0.05, 0.31, matLaque('#ffffff', 0.5), 1.2, 1.125, -0.4).rotation.y = 0.2; this.boite(0.21, 0.012, 0.297, matLaque(VIOLET, 0.5), 1.2, 1.156, -0.4, { ombre: false }).rotation.y = 0.32;
    for (const x of [-1.1, 0, 1.1]) this.suspension(x, -0.45, 2.35, '#2b2d33', x === 0 ? 3 : 0);
    this.places.nora = { x: 0, z: -1.45, angle: 0 };
    // signalétique
    this.enseigne('A08 · Pôle alternance', '1er interlocuteur', -5.88, -2, Math.PI / 2, VIOLET, 2.5);
    this.enseigne('B12 · Salle de cours', 'Émargement Edusign', 5.88, -4, -Math.PI / 2, CYAN, 2.5);
    this.enseigne('Coordination', 'Absences et justificatifs', 5.88, 5, -Math.PI / 2, CYAN, 2.5);
    this.enseigne('Sortie · Entreprise Nexus', 'Votre entreprise d’accueil', 0, -8.88, 0, '#16161d', 3.2);
    this.issue(1.9, 2.5, -8.9, 0);
    this.horloge(-5.9, 2.35, 1.2, Math.PI / 2); this.extincteur(5.9, -7.3, -Math.PI / 2); this.extincteur(-5.9, 6.9, Math.PI / 2);
    for (const [x, z, r] of [[-5.9, -0.8, Math.PI / 2], [5.9, -2.8, -Math.PI / 2], [5.9, 6.2, -Math.PI / 2], [1.5, -8.9, 0]]) this.interrupteur(x, 1.15, z, r);
    // lignes au sol, bancs, plantes, fenêtres
    this.tapis(0, 3.3, 1.1, 6.2, VIOLET); this.tapis(-0.75, 3.3, 0.12, 6.2, CYAN);
    this.fenetre(-3.6, 8.9, Math.PI, 3.2); this.fenetre(3.6, 8.9, Math.PI, 3.2); this.fenetre(-4, -8.9, 0, 2.6); this.fenetre(4, -8.9, 0, 2.6);
    for (const [x, z] of [[-5.3, 8.2], [5.3, 8.2], [-5.3, -8.2], [5.3, -8.2], [-3.1, -2.1], [3.1, -2.1]]) this.plante(x, z);
    this.banc(-4.9, 4.2, 2.2, 0.6); this.banc(4.9, 1.2, 2.2, 0.6);
    this.affiche('Bienvenue', ['Rentrée des', 'apprenti·es', '2026-2027', '', 'Votre badge', "s'active en", 'chemin.'], -5.87, 1.6, 5.8, Math.PI / 2, CYAN);
    for (const z of [-6, -1, 4]) for (const x of [-3, 3]) this.dalle(x, z, 1.2, 1.2, z === -1 ? 7 : 5);
    this.dalle(0, 7, 1.2, 1.2, 4);
    // A08 · pôle alternance
    this.places.karim = { x: -10.6, z: -2.4, angle: Math.PI / 2 };
    this.bureau(-12.6, -2.4, 0.9, 2.2, { ecran: 3 }); this.chaise(-13.4, -2.4, Math.PI / 2, VIOLET, 'bureau');
    this.etagere(-14.7, -6.2, 3.2, Math.PI / 2); this.etagere(-14.7, 0.6, 2.4, Math.PI / 2);
    this.cyl(0.55, 0.04, matBois('#e9dfd0'), -8.6, 0.74, -6.6, { coll: true, seg: 40 }); this.cyl(0.04, 0.72, matMetal('#4a4c54', 0.4), -8.6, 0.36, -6.6); this.cyl(0.26, 0.02, matMetal('#4a4c54', 0.4), -8.6, 0.01, -6.6);
    this.chaise(-8.6, -7.5, 0); this.chaise(-7.7, -6.6, -Math.PI / 2); this.chaise(-9.5, -6.6, Math.PI / 2);
    this.boite(0.21, 0.004, 0.297, matLaque('#fbfbf9', 0.8), -8.5, 0.763, -6.5, { ombre: false }).rotation.y = 0.4; this.cyl(0.036, 0.09, matLaque(CYAN, 0.3), -8.85, 0.805, -6.75, { r2: 0.04, seg: 20 });
    this.affiche('Pôle alternance', ['Votre 1er', 'interlocuteur', '', 'Bureau A08', 'apprentissage', '@imt-bs.eu'], -11, 1.65, -8.87, 0, VIOLET, 1.5, 1.9);
    this.affiche('Statut SFP', ['Sans contrat ?', 'Parlez-en', 'au CFA.', '', 'Bachelor :', 'fin octobre', 'PGE : mi-nov.'], -9, 1.65, 2.87, Math.PI, '#16161d');
    this.fenetre(-14.9, -2.6, Math.PI / 2, 2.6); this.plante(-7, 2.2); this.tapis(-10.6, -2.6, 4.4, 4.6, '#d9d0df');
    this.dalle(-10.5, -5.5, 1.2, 1.2, 6); this.dalle(-10.5, 0, 1.2, 1.2, 5);
    // B12 · salle de cours
    this.places.claire = { x: 12.7, z: -5.9, angle: -Math.PI / 2 };
    this.boite(0.08, 1.9, 3.3, mat('#17171c', { roughness: 0.3 }), 14.84, 1.85, -4, { ombre: false });
    this.plan(3.1, 1.74, new THREE.MeshBasicMaterial({ map: textureTexte([{ texte: 'Edusign', taille: 120, gras: true, y: 150, x: 70, couleur: '#fff' }, { texte: 'Sign and Scan', taille: 64, y: 280, x: 70, couleur: '#bfe9f5' }, { texte: 'Scannez le QR code', taille: 52, y: 410, x: 70, couleur: '#fff' }, { texte: 'pour émarger', taille: 52, y: 480, x: 70, couleur: '#fff' }], { l: 1024, h: 575, fond: '#12324a' }) }), 14.79, 1.85, -4, -Math.PI / 2);
    this.plan(1.05, 1.05, new THREE.MeshBasicMaterial({ map: textureQR() }), 14.78, 1.85, -3.2, -Math.PI / 2);
    for (const z of [-7.4, -0.6]) for (const x of [8.2, 10.4, 12.6]) {
      this.bureau(x, z, 1.5, 0.65, { plateau: '#efe9df' });
      this.chaise(x - 0.35, z + (z < -4 ? -0.55 : 0.55), z < -4 ? 0 : Math.PI, '#4a4a55'); this.chaise(x + 0.35, z + (z < -4 ? -0.55 : 0.55), z < -4 ? 0 : Math.PI, '#4a4a55');
      if (this.rnd() > 0.35) this.boite(0.21, 0.012, 0.297, matLaque(['#23324a', VIOLET, '#f4f2ee'][Math.floor(this.rnd() * 3)], 0.6), x - 0.3 + this.rnd() * 0.6, 0.776, z, { ombre: false }).rotation.y = this.rnd() - 0.5;
    }
    this.boite(0.34, 0.14, 0.3, matLaque('#f2f2f0', 0.4), 11.2, H - 0.3, -4, { rayon: 0.03 }); this.cyl(0.02, 0.24, matMetal(), 11.2, H - 0.12, -4, { seg: 8, ombre: false });
    this.affiche('En cours', ['Vous restez', 'salarié·e.', '', 'Ponctualité', 'Tenue', 'Comportement'], 9, 1.65, -8.87, 0, CYAN);
    this.affiche('Edusign', ['À chaque cours', 'Signature', 'officielle', '', 'Puis QR code'], 10.5, 1.65, 0.87, Math.PI, '#12324a');
    this.dalle(9.5, -4, 1.2, 1.2, 6); this.dalle(12.8, -4, 1.2, 1.2, 4);
    // coordination pédagogique
    this.places.ines = { x: 10.6, z: 5, angle: -Math.PI / 2 };
    this.bureau(12.5, 5, 0.9, 2.2, { ecran: 4 }); this.chaise(13.3, 5, -Math.PI / 2, CYAN, 'bureau');
    this.etagere(14.7, 2.6, 2.2, -Math.PI / 2); this.etagere(14.7, 7.6, 2.2, -Math.PI / 2);
    this.affiche('Malade ?', ['Arrêt de travail', '≠ certificat', 'médical', '', 'Précisez que', 'vous êtes', 'salarié·e.'], 9.5, 1.65, 1.13, 0, '#16161d');
    this.fenetre(10.5, 8.9, Math.PI, 3.2); this.plante(7, 8.2); this.tapis(10.4, 5, 4.2, 4, '#cfe6ec');
    this.dalle(10, 5, 1.2, 1.2, 6);
    this.interactifs.push({ type: 'sortie', id: 'sortie', pos: new THREE.Vector3(0, 1.4, -8.6) });
  }

  nexus() {
    this.depart = { x: 0, z: 6.4, angle: 0 };
    this.solPlafond(24, 16, TX.beton('#40444c'), { taille: 2.4, rugosite: 0.28, relief: 0.25, plafond: '#e4e5e8' });
    this.plinthe = '#20242c'; this.lumieres('#f2f6ff', '#5a5f6b', 0.36, [-7, 10, 6]);
    const M = '#eef0f2', BOIS = '#b98b5e', TEAL = '#14b8a6';
    this.mur(-12, -8, 12, -8, { m: '#20242c' }); this.mur(-12, 8, 12, 8, { m: M }); this.mur(-12, -8, -12, 8, { m: M });
    this.murPorte('z', 12, -8, 8, 4, { larg: 2.2, id: 'sortie', m: M, double: true });
    { const t = TX.exterieur(0).clone(); t.needsUpdate = true; t.repeat.set(0.3, 0.9); t.offset.set(0.18, 0.05); const m = new THREE.MeshBasicMaterial({ map: t }); m.userData.jetable = true; this.plan(4, 2.6, m, 12.5, 1.3, 4, -Math.PI / 2); }
    // enseigne lumineuse
    { const m = new THREE.MeshBasicMaterial({ map: textureTexte([{ texte: 'NEXUS', taille: 190, gras: true, y: 108, x: 512, align: 'center', couleur: '#5eead4' }], { l: 1024, h: 208, fond: '#20242c' }) }); m.color.multiplyScalar(1.5); this.plan(6.4, 1.3, m, 0, 2.35, -7.88, 0); }
    const neon = new THREE.PointLight(TEAL, 6, 10, 1.6); neon.position.set(0, 2.3, -7); this.groupe.add(neon);
    // salle de réunion (ouest) et bureau RH (est), cloisons vitrées
    const verre = matVerre('#cfeef2', 0.2);
    this.murPorte('z', -6, -8, -1, -4.5, { id: 'reunion', m: verre });
    this.mur(-12, -1, -6, -1, { m: verre });
    this.murPorte('z', 6, -8, -1, -4.5, { id: 'rh', m: verre });
    this.mur(6, -1, 12, -1, { m: verre });
    const montant = mat('#20242c', { roughness: 0.4, metalness: 0.6 });
    for (const x of [-6, 6]) { this.boite(0.24, 0.1, 7, montant, x, H - 0.05, -4.5, { ombre: false }); this.boite(0.24, 0.08, 7, montant, x, 0.04, -4.5, { ombre: false }); for (const z of [-7.9, -5.45, -3.55, -1.05]) this.boite(0.06, H, 0.06, montant, x, H / 2, z, { ombre: false }); }
    for (const s of [-1, 1]) { this.boite(6, 0.1, 0.24, montant, s * 9, H - 0.05, -1, { ombre: false }); this.boite(6, 0.08, 0.24, montant, s * 9, 0.04, -1, { ombre: false }); for (const x of [6.05, 8, 10, 11.9]) this.boite(0.06, H, 0.06, montant, s * x, H / 2, -1, { ombre: false }); }
    this.enseigne('Salle Horizon', 'Marc · manager', -5.88, -4.5, Math.PI / 2, TEAL, 2.2);
    this.enseigne('Ressources humaines', 'Léa', 5.88, -4.5, -Math.PI / 2, TEAL, 2.2);
    this.enseigne('Espace d’accompagnement', 'Retour vers IMT-BS', 11.88, 4, -Math.PI / 2, VIOLET, 2.6);
    this.issue(11.9, 2.5, 2.3, -Math.PI / 2); this.horloge(-11.9, 2.4, 6.9, Math.PI / 2); this.extincteur(11.9, 6.2, -Math.PI / 2);
    // îlot central : Samuel
    this.places.sam = { x: 0, z: -1.6, angle: 0 };
    for (const [x, z, e] of [[-0.85, -3.4, 2], [0.85, -3.4, 2], [-0.85, -4.75, 1], [0.85, -4.75, 1]]) this.bureau(x, z, 1.6, 1.2, { plateau: BOIS, ecran: e });
    this.chaise(-0.85, -2.5, Math.PI, '#14b8a6', 'bureau'); this.chaise(0.85, -5.7, 0, '#4a4f5a', 'bureau'); this.chaise(-0.85, -5.7, 0, '#4a4f5a', 'bureau');
    this.tapis(0, -3.6, 5.2, 5.6, '#2f333b');
    for (const x of [-1.2, 0, 1.2]) this.suspension(x, -4.1, 2.3, '#1c2026', x === 0 ? 3 : 0);
    // autres îlots
    for (const [x, z] of [[-7.5, 3.6], [-3.6, 5.6]]) { this.bureau(x, z, 1.6, 1.1, { plateau: BOIS, ecran: 2 }); this.chaise(x, z + 0.95, Math.PI, '#4a4f5a', 'bureau'); }
    // coin détente
    this.fauteuil(5.4, 6.6, Math.PI, TEAL); this.fauteuil(7, 6.6, Math.PI, '#4a4f5a');
    this.cyl(0.4, 0.035, matBois(BOIS), 6.2, 0.42, 5.4, { coll: true, seg: 36 }); this.cyl(0.03, 0.4, matMetal('#2a2d34', 0.4), 6.2, 0.2, 5.4); this.cyl(0.2, 0.015, matMetal('#2a2d34', 0.4), 6.2, 0.008, 5.4);
    this.cyl(0.036, 0.09, matLaque('#ffffff', 0.3), 6.05, 0.483, 5.45, { r2: 0.04, seg: 20 }); this.boite(0.2, 0.02, 0.27, matLaque('#14b8a6', 0.6), 6.35, 0.448, 5.3).rotation.y = 0.5;
    this.tapis(6.2, 6, 3.6, 2.8, '#22454a');
    for (const [x, z] of [[-11.2, 7.2], [11.2, 7.2], [-11.2, 0], [11.2, 0], [3.4, -7.2], [-3.4, -7.2]]) this.plante(x, z, 1.7);
    this.fenetre(-11.9, 4, Math.PI / 2, 4.5); this.fenetre(-5, 7.9, Math.PI, 4); this.fenetre(3, 7.9, Math.PI, 4);
    this.affiche('Nos codes', ['Ponctualité', 'Curiosité', 'Communication', '', 'On prévient,', 'on anticipe.'], 9.6, 1.6, 7.87, Math.PI, TEAL);
    // réunion : Marc
    this.places.marc = { x: -8.3, z: -4.5, angle: Math.PI / 2 };
    this.boite(1.3, 0.05, 3.4, matBois(BOIS), -10.3, 0.75, -4.5, { coll: true, rayon: 0.02 }); this.boite(0.5, 0.73, 2.2, mat('#20242c', { roughness: 0.5 }), -10.3, 0.365, -4.5);
    for (const z of [-5.6, -4.5, -3.4]) this.chaise(-11.2, z, Math.PI / 2, '#4a4f5a', 'bureau');
    this.tele(-10.2, 1.75, -7.88, 0, 1.7, 0);
    this.boite(0.32, 0.016, 0.22, mat('#2a2b31', { roughness: 0.4, metalness: 0.5 }), -10.4, 0.783, -4.9).rotation.y = 0.3;
    this.affiche('Sprint Q4', ['Projet Atlas', 'Livraison :', 'décembre', '', 'Semaine école', '= non dispo'], -8, 1.65, -7.87, 0, '#20242c', 1.2, 1.6);
    // RH : Léa
    this.places.lea = { x: 8.2, z: -4.5, angle: -Math.PI / 2 };
    this.bureau(10.3, -4.5, 0.9, 2.2, { plateau: '#f1ede6', ecran: 4 }); this.chaise(11.1, -4.5, -Math.PI / 2, TEAL, 'bureau');
    this.etagere(11.7, -7, 1.6, -Math.PI / 2, '#dfe3e6');
    this.affiche('Bienvenue', ['Mutuelle', 'Transport', 'Restauration', '', 'ameli.fr :', 'pensez à votre', 'statut.'], 9, 1.65, -7.87, 0, TEAL);
    for (const [x, z, i] of [[-4, 2, 5], [4, 2, 5], [0, 6, 4], [-9, -4.5, 5], [9, -4.5, 5], [-8, 4, 4], [8, 5.5, 4], [0, -3.5, 5]]) this.dalle(x, z, 1.6, 0.5, i, '#fff4e6');
    this.interactifs.push({ type: 'sortie', id: 'sortie', pos: new THREE.Vector3(11.6, 1.4, 4) });
  }

  accompagnement() {
    this.depart = { x: 0, z: 4.4, angle: 0 };
    this.solPlafond(18, 12, TX.parquet(), { taille: 1.68, rugosite: 0.42, relief: 0.5, plafond: '#f6f2ec' });
    this.plinthe = '#8a6a48'; this.lumieres('#fff6ea', '#bfa98f', 0.38, [5, 9, 6]);
    const M = '#f7f2ec';
    this.mur(-9, -6, 9, -6, { m: M }); this.mur(-9, 6, 9, 6, { m: M }); this.mur(-9, -6, -9, 6, { m: M }); this.mur(9, -6, 9, 6, { m: M });
    // mur du fond : lattes bois + logo + borne
    for (let i = 0; i < 28; i++) this.boite(0.09, H, 0.06, matBois('#b58a5c'), -2.9 + i * 0.215, H / 2, -5.86, { ombre: false });
    this.boite(2.5, 1.5, 0.05, matLaque('#ffffff', 0.4), 0, 2.45, -5.8, { ombre: false });
    this.logoMural(0, 2.45, -5.78, 0, 2.3);
    // borne
    this.boite(0.9, 1.15, 0.5, matLaque('#ffffff', 0.3), 0, 0.575, -5.2, { coll: true, rayon: 0.03 });
    this.colliders[this.colliders.length - 1] = { minX: -0.45, maxX: 0.45, minZ: -5.45, maxZ: -4.95, actif: true };
    this.boite(0.92, 0.1, 0.52, new THREE.MeshStandardMaterial({ color: VIOLET, emissive: VIOLET, emissiveIntensity: 0.9 }), 0, 0.12, -5.2, { ombre: false });
    const ecran = this.boite(0.78, 0.5, 0.05, mat('#17171c', { roughness: 0.3 }), 0, 1.36, -5.3, { ombre: false }); ecran.rotation.x = -0.35;
    this.ecranBorne = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.44), new THREE.MeshBasicMaterial());
    this.ecranBorne.position.set(0, 1.37, -5.27); this.ecranBorne.rotation.x = -0.35; this.groupe.add(this.ecranBorne);
    this.etatBorne(false);
    this.enseigne('Borne d’activation', 'Votre badge d’apprenti·e', 0, -5.5, 0, VIOLET, 0.86).position.set(0, 0.72, -4.94);
    // coin Hélène (ouest), salon
    this.places.helene = { x: -5, z: -1.4, angle: Math.PI / 4 };
    this.tapis(-5.2, -0.6, 5, 5.4, '#d9c6e2');
    this.fauteuil(-6.9, -1.6, Math.PI / 2, VIOLET); this.fauteuil(-3.6, 1.3, -Math.PI * 0.75, '#6b5b7a'); this.fauteuil(-6.3, 1.5, Math.PI * 0.75, '#6b5b7a');
    this.cyl(0.45, 0.04, matBois('#e9dfd0'), -5, 0.42, 0.4, { coll: true, seg: 40 }); this.cyl(0.035, 0.4, matMetal('#4a4c54', 0.4), -5, 0.2, 0.4); this.cyl(0.22, 0.015, matMetal('#4a4c54', 0.4), -5, 0.008, 0.4);
    this.cyl(0.036, 0.09, matLaque(VIOLET, 0.3), -4.8, 0.485, 0.3, { r2: 0.04, seg: 20 }); this.cyl(0.036, 0.09, matLaque('#ffffff', 0.3), -5.2, 0.485, 0.55, { r2: 0.04, seg: 20 });
    this.boite(0.2, 0.025, 0.27, matLaque('#23324a', 0.6), -5.05, 0.453, 0.18).rotation.y = -0.4;
    this.suspension(-5, 0.4, 2.15, '#b58a5c', 3);
    this.etagere(-8.7, -4, 2.6, Math.PI / 2, '#efe6da');
    this.affiche('Tutorat école', ['Un espace', 'de parole', 'confidentiel', '', '2 visites :', '28 février', '30 août'], -6.2, 1.65, -5.87, 0, VIOLET);
    // coin Yanis (est), comptoir CFA
    this.places.yanis = { x: 5, z: -1.7, angle: 0 };
    this.comptoir(5, -0.75, 3, 0.7, '#ffffff', CYAN);
    this.poste(this.bloc(5.95, 1.1, -0.8, Math.PI), { extras: false });
    this.boite(0.22, 0.04, 0.31, matLaque('#ffffff', 0.5), 4.1, 1.12, -0.72).rotation.y = -0.15;
    this.etagere(8.7, -3.6, 2.8, -Math.PI / 2, '#efe6da');
    this.affiche('CFA', ['Contrat', 'Financement', 'Statut SFP', '', 'Prêt de PC', 'portable'], 6.2, 1.65, -5.87, 0, CYAN);
    this.tapis(5, -1.2, 5, 4.2, '#c5e2ea');
    this.fenetre(-4.5, 5.9, Math.PI, 4); this.fenetre(4.5, 5.9, Math.PI, 4); this.fenetre(8.9, 2, -Math.PI / 2, 3);
    this.horloge(8.9, 2.4, -0.6, -Math.PI / 2);
    for (const [x, z] of [[-8.2, 5.2], [8.2, 5.2], [-8.2, -5.2], [8.2, -5.2], [-1.6, -5.3], [1.6, -5.3]]) this.plante(x, z, 1.6);
    this.banc(5.4, 4.6, 2.2, 0.6, '#6b5b7a');
    for (const [x, z, i] of [[-5, -1, 6], [5, -1, 6], [0, 2.5, 5], [0, -4, 5]]) this.dalle(x, z, 1.1, 1.1, i, '#fff1dc');
    this.interactifs.push({ type: 'borne', id: 'borne', pos: new THREE.Vector3(0, 1.3, -5.0) });
  }

  etatBorne(prete, activee = false) {
    if (!this.ecranBorne) return;
    const t = textureTexte([
      { texte: activee ? 'Badge activé' : prete ? 'Borne prête' : 'En attente', taille: 110, gras: true, y: 200, x: 512, align: 'center', couleur: '#fff' },
      { texte: activee ? 'Bienvenue !' : prete ? 'Saisissez vos 3 repères' : 'Rencontrez Hélène et Yanis', taille: 62, y: 390, x: 512, align: 'center', couleur: '#fff' },
    ], { l: 1024, h: 626, fond: activee ? '#1f9d5c' : prete ? VIOLET : '#3a3a44' });
    this.ecranBorne.material.map = t; this.ecranBorne.material.needsUpdate = true;
  }

  maj(dt) {
    for (const p of Object.values(this.portes)) {
      if (p.cible === undefined) continue;
      const o = p.panneau.position, base = p.base;
      const axe = p.axe === 'x' ? 'x' : 'z';
      const cible = base + p.cible;
      o[axe] += (cible - o[axe]) * Math.min(1, dt * 4);
    }
  }
}

// Résolution de collision cercle / boîtes alignées.
export function deplacer(pos, dx, dz, colliders, r = 0.36) {
  const essai = (x, z) => {
    for (const c of colliders) {
      if (!c.actif) continue;
      if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return false;
    }
    return true;
  };
  if (essai(pos.x + dx, pos.z)) pos.x += dx;
  if (essai(pos.x, pos.z + dz)) pos.z += dz;
}
