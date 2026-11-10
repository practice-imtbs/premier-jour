// Construction des trois lieux en géométrie procédurale (aucun modèle externe).
import * as THREE from 'three';

export const H = 3.4; // hauteur sous plafond
const VIOLET = '#AD1D89', CYAN = '#00B8DE';

const mats = new Map();
export function mat(couleur, o = {}) {
  const k = couleur + JSON.stringify(o);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.85, metalness: 0, ...o }));
  return mats.get(k);
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

function textureCiel() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 128;
  const g = c.getContext('2d'); const d = g.createLinearGradient(0, 0, 0, 128);
  d.addColorStop(0, '#8fd0ee'); d.addColorStop(0.6, '#dff3fb'); d.addColorStop(1, '#f6fbfd');
  g.fillStyle = d; g.fillRect(0, 0, 16, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function textureSol(base, joint, pas = 64) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.035})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 6, 2); }
  g.strokeStyle = joint; g.lineWidth = 2;
  for (let i = 0; i <= 256; i += pas) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

export class Monde {
  constructor(scene) {
    this.scene = scene;
    this.groupe = new THREE.Group(); scene.add(this.groupe);
    this.logo = new THREE.TextureLoader().load('assets/logo-imtbs.png'); this.logo.colorSpace = THREE.SRGBColorSpace; this.logo.anisotropy = 8;
    this.ciel = textureCiel();
    this.vider();
  }

  vider() {
    this.groupe.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.groupe.clear();
    this.colliders = []; this.portes = {}; this.interactifs = []; this.places = {}; this.anim = [];
  }

  // --- primitives -----------------------------------------------------------
  boite(l, h, p, m, x, y, z, { coll = false, ombre = true, recoit = true } = {}) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), typeof m === 'string' ? mat(m) : m);
    o.position.set(x, y, z); o.castShadow = ombre; o.receiveShadow = recoit; this.groupe.add(o);
    if (coll) this.colliders.push({ minX: x - l / 2, maxX: x + l / 2, minZ: z - p / 2, maxZ: z + p / 2, actif: true });
    return o;
  }
  cyl(r, h, m, x, y, z, { coll = false, r2 = r } = {}) {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, 24), typeof m === 'string' ? mat(m) : m);
    o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; this.groupe.add(o);
    if (coll) this.colliders.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, actif: true });
    return o;
  }
  plan(l, h, m, x, y, z, rotY = 0) {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(l, h), m);
    o.position.set(x, y, z); o.rotation.y = rotY; this.groupe.add(o); return o;
  }
  // mur aligné sur un axe, de (x1,z1) à (x2,z2)
  mur(x1, z1, x2, z2, { h = H, y0 = 0, ep = 0.2, m = '#f4f3f1', coll = true } = {}) {
    const l = Math.abs(x2 - x1) + (x1 === x2 ? ep : 0), p = Math.abs(z2 - z1) + (z1 === z2 ? ep : 0);
    if (y0 === 0 && h > 1 && typeof m === 'string') this.boite(l + 0.03, 0.11, p + 0.03, this.plinthe || '#3d3d47', (x1 + x2) / 2, 0.055, (z1 + z2) / 2, { ombre: false });
    return this.boite(l, h, p, m, (x1 + x2) / 2, y0 + h / 2, (z1 + z2) / 2, { coll: coll && y0 < 1.8 });
  }
  // mur percé d'une porte ; axe 'x' = mur le long de x (z fixe), axe 'z' = mur le long de z (x fixe)
  murPorte(axe, fixe, de, a, centre, { larg = 1.8, id, m = '#f4f3f1', vitre = false, hPorte = 2.35 } = {}) {
    const A = centre - larg / 2, B = centre + larg / 2;
    const seg = (u, v, o) => axe === 'x' ? this.mur(u, fixe, v, fixe, o) : this.mur(fixe, u, fixe, v, o);
    if (A > de) seg(de, A, { m }); if (a > B) seg(B, a, { m });
    seg(A, B, { m, y0: hPorte, h: H - hPorte });
    const mPorte = vitre ? new THREE.MeshStandardMaterial({ color: '#bfe7f2', transparent: true, opacity: 0.38, roughness: 0.1, metalness: 0.2 })
      : mat('#d9d6d2', { roughness: 0.6 });
    const panneau = axe === 'x' ? this.boite(larg, hPorte, 0.08, mPorte, centre, hPorte / 2, fixe, { ombre: !vitre })
      : this.boite(0.08, hPorte, larg, mPorte, fixe, hPorte / 2, centre, { ombre: !vitre });
    const voyant = axe === 'x' ? this.boite(larg, 0.06, 0.24, new THREE.MeshStandardMaterial({ color: '#e04848', emissive: '#e04848', emissiveIntensity: 1.4 }), centre, hPorte + 0.03, fixe, { ombre: false })
      : this.boite(0.24, 0.06, larg, new THREE.MeshStandardMaterial({ color: '#e04848', emissive: '#e04848', emissiveIntensity: 1.4 }), fixe, hPorte + 0.03, centre, { ombre: false });
    const coll = axe === 'x' ? { minX: A, maxX: B, minZ: fixe - 0.15, maxZ: fixe + 0.15, actif: true } : { minX: fixe - 0.15, maxX: fixe + 0.15, minZ: A, maxZ: B, actif: true };
    this.colliders.push(coll);
    const porte = { id, panneau, voyant, coll, ouverte: false, axe, base: axe === 'x' ? centre : centre, larg, centre: axe === 'x' ? new THREE.Vector3(centre, 1.4, fixe) : new THREE.Vector3(fixe, 1.4, centre) };
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
    return this.plan(l, h, new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), x, y, z, rotY);
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
    this.boite(rotY % Math.PI === 0 ? l + 0.06 : 0.03, h + 0.06, rotY % Math.PI === 0 ? 0.03 : l + 0.06, '#2a2a30', x, y, z, { ombre: false });
    const d = 0.025;
    return this.plan(l, h, new THREE.MeshBasicMaterial({ map: tx, toneMapped: false }), x + Math.sin(rotY) * d, y, z + Math.cos(rotY) * d, rotY);
  }
  logoMural(x, y, z, rotY, l = 3) {
    const h = l * 335 / 600, d = 0.02;
    return this.plan(l, h, new THREE.MeshBasicMaterial({ map: this.logo, toneMapped: false }), x + Math.sin(rotY) * d, y, z + Math.cos(rotY) * d, rotY);
  }
  fenetre(x, z, rotY, l = 3, h = 1.9) {
    const sx = Math.sin(rotY), cz = Math.cos(rotY), versX = Math.abs(sx) > 0.5;
    this.boite(versX ? 0.04 : l + 0.14, h + 0.14, versX ? l + 0.14 : 0.04, mat('#3a3a42', { roughness: 0.5 }), x + sx * 0.01, 1.75, z + cz * 0.01, { ombre: false });
    this.plan(l, h, new THREE.MeshBasicMaterial({ map: this.ciel, toneMapped: false }), x + sx * 0.04, 1.75, z + cz * 0.04, rotY);
    this.boite(versX ? 0.05 : 0.05, h, versX ? 0.05 : 0.05, mat('#3a3a42'), x + sx * 0.05, 1.75, z + cz * 0.05, { ombre: false });
  }
  solPlafond(l, p, texSol, couleurPlafond = '#fafafa') {
    texSol.repeat.set(l / 2.4, p / 2.4);
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(l, p), new THREE.MeshStandardMaterial({ map: texSol, roughness: 0.55, metalness: 0.05 }));
    sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; this.groupe.add(sol);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(l, p), mat(couleurPlafond, { roughness: 1 }));
    pl.rotation.x = Math.PI / 2; pl.position.y = H; this.groupe.add(pl);
  }
  dalle(x, z, l = 1.2, p = 1.2, intensite = 5, couleur = '#ffffff') {
    const m = new THREE.MeshBasicMaterial({ color: couleur, toneMapped: false });
    const o = new THREE.Mesh(new THREE.PlaneGeometry(l, p), m); o.rotation.x = Math.PI / 2; o.position.set(x, H - 0.01, z); this.groupe.add(o);
    if (intensite) { const pt = new THREE.PointLight(couleur, intensite, 13, 1.6); pt.position.set(x, H - 0.4, z); this.groupe.add(pt); }
  }
  // --- mobilier ------------------------------------------------------------
  bureau(x, z, l, p, { h = 0.75, plateau = '#d8c3a5', pied = '#3a3a42', ecran = 0 } = {}) {
    this.boite(l, 0.05, p, mat(plateau, { roughness: 0.5 }), x, h, z, { coll: true });
    const dx = l / 2 - 0.06, dz = p / 2 - 0.06;
    for (const [a, b] of [[-dx, -dz], [dx, -dz], [-dx, dz], [dx, dz]]) this.boite(0.05, h, 0.05, pied, x + a, h / 2, z + b);
    if (ecran) { // ecran : 1 = face +z, 2 = face -z, 3 = face +x, 4 = face -x
      const versX = ecran > 2, sens = ecran % 2 ? 1 : -1;
      this.boite(versX ? 0.03 : 0.56, 0.34, versX ? 0.56 : 0.03, '#17171c', x, h + 0.33, z, { ombre: false });
      const e = this.plan(0.52, 0.3, new THREE.MeshBasicMaterial({ color: '#cfe9f5', toneMapped: false }), x + (versX ? sens * 0.017 : 0), h + 0.33, z + (versX ? 0 : sens * 0.017), versX ? sens * Math.PI / 2 : (sens > 0 ? 0 : Math.PI));
      this.boite(0.06, 0.14, 0.06, '#17171c', x, h + 0.09, z, { ombre: false });
      return e;
    }
  }
  comptoir(x, z, l, p, couleur = '#ffffff', bandeau = VIOLET, h = 1.05) {
    this.boite(l, h, p, mat(couleur, { roughness: 0.4 }), x, h / 2, z, { coll: true });
    this.boite(l + 0.08, 0.05, p + 0.12, mat('#2a2a30', { roughness: 0.7 }), x, h + 0.025, z);
    this.boite(l + 0.01, 0.12, p + 0.01, new THREE.MeshStandardMaterial({ color: bandeau, emissive: bandeau, emissiveIntensity: 0.35 }), x, 0.2, z, { ombre: false });
  }
  chaise(x, z, rotY = 0, couleur = '#3b3b45') {
    const g = new THREE.Group(); const m = mat(couleur, { roughness: 0.7 });
    const add = (l, h, p, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), m); o.position.set(px, py, pz); o.castShadow = true; g.add(o); };
    add(0.44, 0.05, 0.44, 0, 0.46, 0); add(0.44, 0.42, 0.05, 0, 0.7, -0.2);
    for (const [a, b] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) add(0.035, 0.46, 0.035, a, 0.23, b);
    g.position.set(x, 0, z); g.rotation.y = rotY; this.groupe.add(g);
  }
  fauteuil(x, z, rotY = 0, couleur = VIOLET) {
    const g = new THREE.Group(); const m = mat(couleur, { roughness: 0.9 });
    const add = (l, h, p, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), m); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; g.add(o); };
    add(0.8, 0.28, 0.75, 0, 0.3, 0); add(0.8, 0.55, 0.16, 0, 0.6, -0.32); add(0.13, 0.3, 0.75, -0.4, 0.5, 0); add(0.13, 0.3, 0.75, 0.4, 0.5, 0);
    g.position.set(x, 0, z); g.rotation.y = rotY; this.groupe.add(g);
    this.colliders.push({ minX: x - 0.45, maxX: x + 0.45, minZ: z - 0.45, maxZ: z + 0.45, actif: true });
  }
  plante(x, z, h = 1.5) {
    this.cyl(0.2, 0.42, mat('#eceae6', { roughness: 0.5 }), x, 0.21, z, { coll: true, r2: 0.26 });
    const vert = mat('#3f8f5a', { roughness: 0.9 }), vert2 = mat('#5aa86f', { roughness: 0.9 });
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.2 + (i % 3) * 0.06, 12, 10), i % 2 ? vert : vert2);
      const a = i * 2.4; s.position.set(x + Math.cos(a) * 0.17, 0.62 + (i / 7) * (h - 0.7), z + Math.sin(a) * 0.17); s.scale.y = 1.25; s.castShadow = true; this.groupe.add(s);
    }
  }
  etagere(x, z, l, rotY = 0, couleur = '#e9e6e1') {
    const versX = Math.abs(Math.sin(rotY)) > 0.5;
    this.boite(versX ? 0.36 : l, 1.9, versX ? l : 0.36, mat(couleur), x, 0.95, z, { coll: true });
    const cs = [VIOLET, CYAN, '#2d2d38', '#f1b434', '#7a7a86'];
    for (let n = 0; n < 4; n++) for (let i = 0; i < Math.floor(l / 0.13); i++) {
      if ((i * 7 + n * 3) % 5 === 0) continue;
      const u = -l / 2 + 0.1 + i * 0.13, d = Math.sin(rotY) * 0.16 + (versX ? 0 : 0), dz = Math.cos(rotY) * 0.16;
      this.boite(versX ? 0.06 : 0.09, 0.3, versX ? 0.09 : 0.06, cs[(i + n) % cs.length], x + (versX ? d : u), 0.42 + n * 0.42, z + (versX ? u : dz), { ombre: false, recoit: false });
    }
  }
  tapis(x, z, l, p, couleur) {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(l, p), mat(couleur, { roughness: 1 })); o.rotation.x = -Math.PI / 2; o.position.set(x, 0.012, z); o.receiveShadow = true; this.groupe.add(o);
  }
  lumieres(couleurCiel, couleurSol, intensite, dir = [6, 9, 5]) {
    this.groupe.add(new THREE.HemisphereLight(couleurCiel, couleurSol, intensite));
    const d = new THREE.DirectionalLight('#ffffff', 1.5); d.position.set(...dir); d.castShadow = true;
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
    this.solPlafond(30, 18, textureSol('#b9b3ab', 'rgba(0,0,0,0.16)', 128), '#eceae7');
    this.lumieres('#ffffff', '#a59fb0', 0.95);
    for (const z of [-7.5, -3.5, 0.5, 4.5, 8.5]) this.boite(30, 0.14, 0.16, '#d2cfd4', 0, H - 0.07, z, { ombre: false });
    const M = '#f6f5f3';
    // enveloppe
    this.murPorte('x', -9, -15, 15, 0, { larg: 2.4, id: 'sortie', vitre: true, m: M });
    this.mur(-15, 9, 15, 9, { m: M }); this.mur(-15, -9, -15, 9, { m: M }); this.mur(15, -9, 15, 9, { m: M });
    // ailes
    this.murPorte('z', -6, -9, 9, -2, { id: 'a08', m: M, vitre: true });
    this.mur(-15, 3, -6, 3, { m: M });
    this.murPorte('z', 6, -9, 1, -4, { id: 'b12', m: M, vitre: true });
    this.murPorte('z', 6, 1, 9, 5, { id: 'coord', m: M, vitre: true });
    this.mur(6, 1, 15, 1, { m: M });
    // hall : mur signature + accueil
    this.boite(5.4, 3.0, 0.3, mat(VIOLET, { roughness: 0.6 }), 0, 1.5, -2.5, { coll: true });
    this.boite(3.5, 2.05, 0.04, mat('#ffffff', { roughness: 0.4 }), 0, 1.75, -2.33, { ombre: false });
    this.logoMural(0, 1.75, -2.31, 0, 3.3);
    this.comptoir(0, -0.45, 3.6, 0.8);
    this.places.nora = { x: 0, z: -1.45, angle: 0 };
    // signalétique
    this.enseigne('A08 · Pôle alternance', '1er interlocuteur', -5.88, -2, Math.PI / 2, VIOLET, 2.5);
    this.enseigne('B12 · Salle de cours', 'Émargement Edusign', 5.88, -4, -Math.PI / 2, CYAN, 2.5);
    this.enseigne('Coordination', 'Absences et justificatifs', 5.88, 5, -Math.PI / 2, CYAN, 2.5);
    this.enseigne('Sortie · Entreprise Nexus', 'Votre entreprise d’accueil', 0, -8.88, 0, '#16161d', 3.2);
    // lignes au sol, bancs, plantes, fenêtres
    this.tapis(0, 3.3, 1.1, 6.2, VIOLET); this.tapis(-0.75, 3.3, 0.12, 6.2, CYAN);
    this.fenetre(-3.6, 8.9, Math.PI, 3.2); this.fenetre(3.6, 8.9, Math.PI, 3.2); this.fenetre(-4, -8.9, 0, 2.6); this.fenetre(4, -8.9, 0, 2.6);
    for (const [x, z] of [[-5.3, 8.2], [5.3, 8.2], [-5.3, -8.2], [5.3, -8.2], [-3.1, -2.1], [3.1, -2.1]]) this.plante(x, z);
    this.boite(2.2, 0.42, 0.6, mat('#2a2a30'), -4.9, 0.21, 4.2, { coll: true }); this.boite(2.2, 0.42, 0.6, mat('#2a2a30'), 4.9, 0.21, 1.2, { coll: true });
    this.affiche('Bienvenue', ['Rentrée des', 'apprenti·es', '2026-2027', '', 'Votre badge', "s'active en", 'chemin.'], -5.87, 1.6, 5.8, Math.PI / 2, CYAN);
    for (const z of [-6, -1, 4]) for (const x of [-3, 3]) this.dalle(x, z, 1.2, 1.2, z === -1 ? 7 : 5);
    this.dalle(0, 7, 1.2, 1.2, 4);
    // A08 · pôle alternance
    this.places.karim = { x: -10.6, z: -2.4, angle: Math.PI / 2 };
    this.bureau(-12.6, -2.4, 0.9, 2.2, { ecran: 3 }); this.chaise(-13.4, -2.4, Math.PI / 2, VIOLET);
    this.etagere(-14.7, -6.2, 3.2, Math.PI / 2); this.etagere(-14.7, 0.6, 2.4, Math.PI / 2);
    this.cyl(0.55, 0.05, mat('#ffffff', { roughness: 0.4 }), -8.6, 0.74, -6.6, { coll: true }); this.cyl(0.05, 0.74, '#3a3a42', -8.6, 0.37, -6.6);
    this.chaise(-8.6, -7.5, 0); this.chaise(-7.7, -6.6, -Math.PI / 2); this.chaise(-9.5, -6.6, Math.PI / 2);
    this.affiche('Pôle alternance', ['Votre 1er', 'interlocuteur', '', 'Bureau A08', 'apprentissage', '@imt-bs.eu'], -11, 1.65, -8.87, 0, VIOLET, 1.5, 1.9);
    this.affiche('Statut SFP', ['Sans contrat ?', 'Parlez-en', 'au CFA.', '', 'Bachelor :', 'fin octobre', 'PGE : mi-nov.'], -9, 1.65, 2.87, Math.PI, '#16161d');
    this.fenetre(-14.9, -2.6, Math.PI / 2, 2.6); this.plante(-7, 2.2); this.tapis(-10.6, -2.6, 4.4, 4.6, '#e6e0ea');
    this.dalle(-10.5, -5.5, 1.2, 1.2, 6); this.dalle(-10.5, 0, 1.2, 1.2, 5);
    // B12 · salle de cours
    this.places.claire = { x: 12.7, z: -5.9, angle: -Math.PI / 2 };
    this.boite(0.08, 1.9, 3.3, '#17171c', 14.84, 1.85, -4, { ombre: false });
    this.plan(3.1, 1.74, new THREE.MeshBasicMaterial({ map: textureTexte([{ texte: 'Edusign', taille: 120, gras: true, y: 150, x: 70, couleur: '#fff' }, { texte: 'Sign and Scan', taille: 64, y: 280, x: 70, couleur: '#bfe9f5' }, { texte: 'Scannez le QR code', taille: 52, y: 410, x: 70, couleur: '#fff' }, { texte: 'pour émarger', taille: 52, y: 480, x: 70, couleur: '#fff' }], { l: 1024, h: 575, fond: '#12324a' }), toneMapped: false }), 14.79, 1.85, -4, -Math.PI / 2);
    this.plan(1.05, 1.05, new THREE.MeshBasicMaterial({ map: textureQR(), toneMapped: false }), 14.78, 1.85, -3.2, -Math.PI / 2);
    for (const z of [-7.4, -0.6]) for (const x of [8.2, 10.4, 12.6]) { this.bureau(x, z, 1.5, 0.65, { plateau: '#f1ede6' }); this.chaise(x - 0.35, z + (z < -4 ? -0.55 : 0.55), z < -4 ? 0 : Math.PI, '#4a4a55'); this.chaise(x + 0.35, z + (z < -4 ? -0.55 : 0.55), z < -4 ? 0 : Math.PI, '#4a4a55'); }
    this.affiche('En cours', ['Vous restez', 'salarié·e.', '', 'Ponctualité', 'Tenue', 'Comportement'], 9, 1.65, -8.87, 0, CYAN);
    this.affiche('Edusign', ['À chaque cours', 'Signature', 'officielle', '', 'Puis QR code'], 10.5, 1.65, 0.87, Math.PI, '#12324a');
    this.dalle(9.5, -4, 1.2, 1.2, 6); this.dalle(12.8, -4, 1.2, 1.2, 4);
    // coordination pédagogique
    this.places.ines = { x: 10.6, z: 5, angle: -Math.PI / 2 };
    this.bureau(12.5, 5, 0.9, 2.2, { ecran: 4 }); this.chaise(13.3, 5, -Math.PI / 2, CYAN);
    this.etagere(14.7, 2.6, 2.2, -Math.PI / 2); this.etagere(14.7, 7.6, 2.2, -Math.PI / 2);
    this.affiche('Malade ?', ['Arrêt de travail', '≠ certificat', 'médical', '', 'Précisez que', 'vous êtes', 'salarié·e.'], 9.5, 1.65, 1.13, 0, '#16161d');
    this.fenetre(10.5, 8.9, Math.PI, 3.2); this.plante(7, 8.2); this.tapis(10.4, 5, 4.2, 4, '#dff1f6');
    this.dalle(10, 5, 1.2, 1.2, 6);
    this.interactifs.push({ type: 'sortie', id: 'sortie', pos: new THREE.Vector3(0, 1.4, -8.6) });
  }

  nexus() {
    this.depart = { x: 0, z: 6.4, angle: 0 };
    this.solPlafond(24, 16, textureSol('#3c4048', 'rgba(255,255,255,0.03)', 256), '#e9eaec');
    this.plinthe = '#20242c'; this.lumieres('#f2f6ff', '#5a5f6b', 1.0, [-7, 10, 6]);
    const M = '#eef0f2', BOIS = '#b98b5e', TEAL = '#14b8a6';
    this.mur(-12, -8, 12, -8, { m: '#20242c' }); this.mur(-12, 8, 12, 8, { m: M }); this.mur(-12, -8, -12, 8, { m: M });
    this.murPorte('z', 12, -8, 8, 4, { larg: 2.2, id: 'sortie', vitre: true, m: M });
    // enseigne lumineuse
    this.plan(6.4, 1.3, new THREE.MeshBasicMaterial({ map: textureTexte([{ texte: 'NEXUS', taille: 190, gras: true, y: 108, x: 512, align: 'center', couleur: '#5eead4' }], { l: 1024, h: 208, fond: '#20242c' }), toneMapped: false }), 0, 2.35, -7.88, 0);
    const neon = new THREE.PointLight(TEAL, 9, 10, 1.6); neon.position.set(0, 2.3, -7); this.groupe.add(neon);
    // salle de réunion (ouest) et bureau RH (est), cloisons vitrées
    const verre = new THREE.MeshStandardMaterial({ color: '#cfeef2', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.3 });
    this.murPorte('z', -6, -8, -1, -4.5, { id: 'reunion', m: verre, vitre: true });
    this.mur(-12, -1, -6, -1, { m: verre });
    this.murPorte('z', 6, -8, -1, -4.5, { id: 'rh', m: verre, vitre: true });
    this.mur(6, -1, 12, -1, { m: verre });
    for (const x of [-6, 6]) { this.boite(0.24, 0.1, 7, '#20242c', x, H - 0.05, -4.5, { ombre: false }); this.boite(0.24, 0.08, 7, '#20242c', x, 0.04, -4.5, { ombre: false }); }
    this.enseigne('Salle Horizon', 'Marc · manager', -5.88, -4.5, Math.PI / 2, TEAL, 2.2);
    this.enseigne('Ressources humaines', 'Léa', 5.88, -4.5, -Math.PI / 2, TEAL, 2.2);
    this.enseigne('Espace d’accompagnement', 'Retour vers IMT-BS', 11.88, 4, -Math.PI / 2, VIOLET, 2.6);
    // îlot central : Samuel
    this.places.sam = { x: 0, z: -1.6, angle: 0 };
    for (const [x, z, e] of [[-0.85, -3.4, 2], [0.85, -3.4, 2], [-0.85, -4.75, 1], [0.85, -4.75, 1]]) this.bureau(x, z, 1.6, 1.2, { plateau: BOIS, ecran: e });
    this.chaise(-0.85, -2.5, Math.PI, '#14b8a6'); this.chaise(0.85, -5.7, 0, '#4a4f5a'); this.chaise(-0.85, -5.7, 0, '#4a4f5a');
    this.tapis(0, -3.6, 5.2, 5.6, '#2f333b');
    // autres îlots
    for (const [x, z] of [[-7.5, 3.6], [-3.6, 5.6]]) { this.bureau(x, z, 1.6, 1.1, { plateau: BOIS, ecran: 2 }); this.chaise(x, z + 0.95, Math.PI, '#4a4f5a'); }
    // coin détente
    this.fauteuil(5.4, 6.6, Math.PI, TEAL); this.fauteuil(7, 6.6, Math.PI, '#4a4f5a');
    this.cyl(0.4, 0.04, mat(BOIS), 6.2, 0.42, 5.4, { coll: true }); this.cyl(0.04, 0.42, '#20242c', 6.2, 0.21, 5.4);
    this.tapis(6.2, 6, 3.6, 2.8, '#22454a');
    for (const [x, z] of [[-11.2, 7.2], [11.2, 7.2], [-11.2, 0], [11.2, 0], [3.4, -7.2], [-3.4, -7.2]]) this.plante(x, z, 1.7);
    this.fenetre(-11.9, 4, Math.PI / 2, 4.5); this.fenetre(-5, 7.9, Math.PI, 4); this.fenetre(3, 7.9, Math.PI, 4);
    this.affiche('Nos codes', ['Ponctualité', 'Curiosité', 'Communication', '', 'On prévient,', 'on anticipe.'], 9.6, 1.6, 7.87, Math.PI, TEAL);
    // réunion : Marc
    this.places.marc = { x: -8.3, z: -4.5, angle: Math.PI / 2 };
    this.boite(1.3, 0.06, 3.4, mat(BOIS, { roughness: 0.4 }), -10.3, 0.75, -4.5, { coll: true }); this.boite(0.5, 0.75, 2.2, '#20242c', -10.3, 0.375, -4.5);
    for (const z of [-5.6, -4.5, -3.4]) this.chaise(-11.2, z, Math.PI / 2, '#4a4f5a');
    this.affiche('Sprint Q4', ['Projet Atlas', 'Livraison :', 'décembre', '', 'Semaine école', '= non dispo'], -9, 1.65, -7.87, 0, '#20242c', 1.5, 1.9);
    // RH : Léa
    this.places.lea = { x: 8.2, z: -4.5, angle: -Math.PI / 2 };
    this.bureau(10.3, -4.5, 0.9, 2.2, { plateau: '#f1ede6', ecran: 4 }); this.chaise(11.1, -4.5, -Math.PI / 2, TEAL);
    this.etagere(11.7, -7, 1.6, -Math.PI / 2, '#dfe3e6');
    this.affiche('Bienvenue', ['Mutuelle', 'Transport', 'Restauration', '', 'ameli.fr :', 'pensez à votre', 'statut.'], 9, 1.65, -7.87, 0, TEAL);
    for (const [x, z, i] of [[-4, 2, 5], [4, 2, 5], [0, 6, 4], [-9, -4.5, 5], [9, -4.5, 5], [-8, 4, 4], [8, 5.5, 4], [0, -3.5, 5]]) this.dalle(x, z, 1.6, 0.5, i, '#fff4e6');
    this.interactifs.push({ type: 'sortie', id: 'sortie', pos: new THREE.Vector3(11.6, 1.4, 4) });
  }

  accompagnement() {
    this.depart = { x: 0, z: 4.4, angle: 0 };
    this.solPlafond(18, 12, textureSol('#c9a57c', 'rgba(60,30,0,0.10)', 42), '#fbf8f4');
    this.plinthe = '#8a6a48'; this.lumieres('#fff6ea', '#bfa98f', 1.0, [5, 9, 6]);
    const M = '#f7f2ec';
    this.mur(-9, -6, 9, -6, { m: M }); this.mur(-9, 6, 9, 6, { m: M }); this.mur(-9, -6, -9, 6, { m: M }); this.mur(9, -6, 9, 6, { m: M });
    // mur du fond : lattes bois + logo + borne
    for (let i = 0; i < 28; i++) this.boite(0.09, H, 0.06, mat('#b58a5c', { roughness: 0.7 }), -2.9 + i * 0.215, H / 2, -5.86, { ombre: false });
    this.boite(2.5, 1.5, 0.05, mat('#ffffff', { roughness: 0.4 }), 0, 2.45, -5.8, { ombre: false });
    this.logoMural(0, 2.45, -5.78, 0, 2.3);
    // borne
    this.boite(0.9, 1.15, 0.5, mat('#ffffff', { roughness: 0.35 }), 0, 0.575, -5.2, { coll: true });
    this.boite(0.92, 0.1, 0.52, new THREE.MeshStandardMaterial({ color: VIOLET, emissive: VIOLET, emissiveIntensity: 0.5 }), 0, 0.12, -5.2, { ombre: false });
    const ecran = this.boite(0.78, 0.5, 0.05, '#17171c', 0, 1.36, -5.3, { ombre: false }); ecran.rotation.x = -0.35;
    this.ecranBorne = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.44), new THREE.MeshBasicMaterial({ toneMapped: false }));
    this.ecranBorne.position.set(0, 1.37, -5.27); this.ecranBorne.rotation.x = -0.35; this.groupe.add(this.ecranBorne);
    this.etatBorne(false);
    this.enseigne('Borne d’activation', 'Votre badge d’apprenti·e', 0, -5.5, 0, VIOLET, 0.86).position.set(0, 0.72, -4.94);
    // coin Hélène (ouest), salon
    this.places.helene = { x: -5, z: -1.4, angle: Math.PI / 4 };
    this.tapis(-5.2, -0.6, 5, 5.4, '#e7d9ee');
    this.fauteuil(-6.9, -1.6, Math.PI / 2, VIOLET); this.fauteuil(-3.6, 1.3, -Math.PI * 0.75, '#6b5b7a'); this.fauteuil(-6.3, 1.5, Math.PI * 0.75, '#6b5b7a');
    this.cyl(0.45, 0.05, mat('#ffffff', { roughness: 0.4 }), -5, 0.42, 0.4, { coll: true }); this.cyl(0.05, 0.42, '#3a3a42', -5, 0.21, 0.4);
    this.etagere(-8.7, -4, 2.6, Math.PI / 2, '#efe6da');
    this.affiche('Tutorat école', ['Un espace', 'de parole', 'confidentiel', '', '2 visites :', '28 février', '30 août'], -6.2, 1.65, -5.87, 0, VIOLET);
    // coin Yanis (est), comptoir CFA
    this.places.yanis = { x: 5, z: -1.7, angle: 0 };
    this.comptoir(5, -0.75, 3, 0.7, '#ffffff', CYAN);
    this.etagere(8.7, -3.6, 2.8, -Math.PI / 2, '#efe6da');
    this.affiche('CFA', ['Contrat', 'Financement', 'Statut SFP', '', 'Prêt de PC', 'portable'], 6.2, 1.65, -5.87, 0, CYAN);
    this.tapis(5, -1.2, 5, 4.2, '#d8eef3');
    this.fenetre(-4.5, 5.9, Math.PI, 4); this.fenetre(4.5, 5.9, Math.PI, 4); this.fenetre(8.9, 2, -Math.PI / 2, 3);
    for (const [x, z] of [[-8.2, 5.2], [8.2, 5.2], [-8.2, -5.2], [8.2, -5.2], [-1.6, -5.3], [1.6, -5.3]]) this.plante(x, z, 1.6);
    this.boite(2.2, 0.42, 0.6, mat('#6b5b7a'), 5.4, 0.21, 4.6, { coll: true });
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
