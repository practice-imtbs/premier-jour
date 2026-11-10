// Personnages : silhouettes aux proportions humaines, visages modelés, tenues dessinées,
// regard tourné vers le joueur, clignements, bouche et gestes animés par la voix.
import * as THREE from 'three';
import { tissu, alea } from './textures.js';

const TAU = Math.PI * 2;
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const melange = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

// --- étiquette flottante (nom, rôle, état) -----------------------------------
function etiquette(nom, role) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 176;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: true, transparent: true }));
  sprite.material.map.colorSpace = THREE.SRGBColorSpace;
  sprite.scale.set(1.0, 0.275, 1); sprite.renderOrder = 10;
  sprite.dessiner = (etat) => { // 'nouveau' | 'vu' | 'valide'
    const g = c.getContext('2d'); g.clearRect(0, 0, 640, 176);
    g.fillStyle = 'rgba(18,18,26,0.82)'; g.beginPath(); g.roundRect(8, 8, 624, 160, 28); g.fill();
    g.fillStyle = etat === 'valide' ? '#2fbf71' : etat === 'vu' ? '#00B8DE' : '#AD1D89';
    g.beginPath(); g.arc(70, 88, 34, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = '700 44px "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(etat === 'valide' ? '✓' : etat === 'vu' ? '…' : '!', 70, 90);
    g.textAlign = 'left'; g.font = '700 56px "Helvetica Neue", Arial, sans-serif'; g.fillText(nom, 128, 66);
    g.font = '400 30px "Helvetica Neue", Arial, sans-serif'; g.fillStyle = '#d7d7e2';
    let r = role; while (g.measureText(r).width > 480 && r.length > 8) r = r.slice(0, -2); if (r !== role) r += '…';
    g.fillText(r, 128, 122);
    sprite.material.map.needsUpdate = true;
  };
  return sprite;
}

// --- forme de la tête ---------------------------------------------------------
// direction unitaire -> point de la surface (mètres), origine au centre du crâne ; k : gonflement (cheveux, barbe)
function pointTete(dx, dy, dz, k = 1) {
  let x = dx * 0.0765, y = dy * 0.113, z = dz * 0.095;
  if (dy < 0) {
    const t = -dy;
    x *= 1 - 0.36 * Math.pow(t, 1.5);              // la mâchoire se resserre vers le menton
    z *= dz < 0 ? 1 - 0.42 * t : 1 - 0.06 * t * t;  // nuque rentrée, menton à l'aplomb du front
    if (dz > 0) y *= 1 + 0.07 * dz;                 // menton un peu plus bas à l'avant
  } else {
    const f = 1 + 0.12 * Math.sin(Math.PI * dy) * (1 - dy * 0.35); x *= f; z *= f; // crâne plus ample au-dessus des oreilles
    if (dz < 0) { x *= 1 + 0.04 * -dz; z *= 1.05; }
  }
  if (dz > 0.45) z -= (dz - 0.45) * 0.014;         // visage légèrement aplani
  return [x * k, y * k, z * k];
}
// profondeur z de la surface du visage au point (x, y)
function surf(px, py) {
  let dx = px / 0.0765, dy = py / 0.113, z = 0.09;
  for (let i = 0; i < 8; i++) {
    const dz = Math.sqrt(Math.max(0.02, 1 - dx * dx - dy * dy)), n = Math.hypot(dx, dy, dz), p = pointTete(dx / n, dy / n, dz / n);
    if (Math.abs(px) > 1e-5 && Math.abs(p[0]) > 1e-6) dx *= px / p[0]; if (Math.abs(py) > 1e-5 && Math.abs(p[1]) > 1e-6) dy *= py / p[1];
    dx = Math.max(-0.97, Math.min(0.97, dx)); dy = Math.max(-0.97, Math.min(0.97, dy)); z = p[2];
  }
  return z;
}
const lisse = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// applique la forme de tête à une géométrie de directions unitaires ; k : gonflement (nombre ou fonction), meche : relief irrégulier
function modeler(geo, k = 1, meche = 0) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const n = Math.hypot(p.getX(i), p.getY(i), p.getZ(i)) || 1, dx = p.getX(i) / n, dy = p.getY(i) / n, dz = p.getZ(i) / n, a = Math.atan2(dx, dz);
    const kk = (typeof k === 'function' ? k(dx, dy, dz) : k) * (1 + meche * (Math.sin(a * 7 + 1.3) * Math.sin(dy * 9 + 0.4) + 0.5 * Math.sin(a * 13 + dy * 17)));
    const v = pointTete(dx, dy, dz, kk);
    p.setXYZ(i, v[0], v[1], v[2]);
  }
  geo.computeVertexNormals(); return geo;
}
// calotte de cheveux : portion de sphère basculée vers l'arrière puis moulée sur le crâne
function calotte(bascule, ouverture, k, meche = 0.006) {
  const g = new THREE.SphereGeometry(1, 48, 24, 0, TAU, 0, ouverture); g.rotateY(-Math.PI / 2); g.rotateX(bascule);
  return modeler(g, k, meche);
}
// pièce moulée sur la tête, définie par (azimut, élévation) : frange, barbe
function piece(nu, nv, f, k) {
  const g = new THREE.PlaneGeometry(1, 1, nu, nv), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const [a, dy] = f(p.getX(i) + 0.5, p.getY(i) + 0.5), c = Math.sqrt(Math.max(0, 1 - dy * dy)); p.setXYZ(i, Math.sin(a) * c, dy, Math.cos(a) * c); }
  return modeler(g, k);
}

let texTissuFin = null;
function tissuFin() { if (!texTissuFin) { texTissuFin = tissu().clone(); texTissuFin.repeat.set(56, 56); texTissuFin.needsUpdate = true; } return texTissuFin; }
let texCheveux = null;
function meches() { // relief de mèches (bumpMap), dans le sens racine -> pointe
  if (texCheveux) return texCheveux;
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), rnd = alea(77);
  g.fillStyle = '#808080'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 900; i++) { const x = rnd() * n, v = 60 + rnd() * 150; g.strokeStyle = `rgba(${v},${v},${v},0.5)`; g.lineWidth = 0.6 + rnd() * 1.6; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (rnd() - 0.5) * 10, n * 0.3, x + (rnd() - 0.5) * 10, n * 0.6, x + (rnd() - 0.5) * 14, n); g.stroke(); }
  texCheveux = new THREE.CanvasTexture(c); texCheveux.wrapS = texCheveux.wrapT = THREE.RepeatWrapping; texCheveux.repeat.set(3, 1); return texCheveux;
}

// --- tenue : dessin du haut du corps (u = tour de buste, 0.5 = milieu du devant ; v = 0 en bas) ---
function textureTenue(L, cordon) {
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
  const X = (u) => u * n, Y = (v) => (1 - v) * n, style = L.style || 'pull', fonce = melange(L.tenue, '#000000', 0.34), clair = melange(L.tenue, '#ffffff', 0.05);
  const poly = (pts, coul) => { g.fillStyle = coul; g.beginPath(); pts.forEach(([u, v], i) => i ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v))); g.closePath(); g.fill(); };
  const trait = (pts, coul, ep) => { g.strokeStyle = coul; g.lineWidth = ep; g.lineJoin = g.lineCap = 'round'; g.beginPath(); pts.forEach(([u, v], i) => i ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v))); g.stroke(); };
  const rond = (u, v, r, coul) => { g.fillStyle = coul; g.beginPath(); g.arc(X(u), Y(v), r, 0, 7); g.fill(); };
  g.fillStyle = L.tenue; g.fillRect(0, 0, n, n);
  const chemise = L.chemise || '#f4f4f2', ombreCh = melange(chemise, '#000000', 0.16);
  if (style === 'veste') {
    poly([[0.43, 1], [0.57, 1], [0.562, 0.9], [0.5, 0.4], [0.438, 0.9]], chemise);                 // chemise dans l'ouverture
    poly([[0.468, 1], [0.532, 1], [0.5, 0.86]], L.peau);                                               // col ouvert
    poly([[0.44, 1], [0.468, 1], [0.5, 0.86], [0.478, 0.8]], melange(chemise, '#000000', 0.06)); poly([[0.56, 1], [0.532, 1], [0.5, 0.86], [0.522, 0.8]], melange(chemise, '#000000', 0.06));
    trait([[0.5, 0.84], [0.5, 0.42]], ombreCh, 2); for (const v of [0.74, 0.62, 0.5]) rond(0.5, v, 2.6, ombreCh);
    for (const s of [-1, 1]) {                                                                         // revers
      poly([[0.5 + s * 0.07, 1], [0.5 + s * 0.118, 0.96], [0.5 + s * 0.128, 0.74], [0.5 + s * 0.01, 0.4], [0.5 + s * 0.062, 0.9]], clair);
      trait([[0.5 + s * 0.118, 0.96], [0.5 + s * 0.128, 0.74], [0.5 + s * 0.01, 0.4]], fonce, 2.5);
      trait([[0.5 + s * 0.128, 0.74], [0.5 + s * 0.09, 0.765]], fonce, 2);
      trait([[0.5 + s * 0.2, 0.13], [0.5 + s * 0.1, 0.13]], fonce, 3);                                 // poches
    }
    trait([[0.5, 0.4], [0.5, 0]], fonce, 3); rond(0.512, 0.3, 5.5, fonce); rond(0.512, 0.3, 2, clair);
    if (L.carrure !== 'f') { rond(0.512, 0.19, 5.5, fonce); rond(0.512, 0.19, 2, clair); }
  } else if (style === 'chemise') {
    poly([[0.468, 1], [0.532, 1], [0.5, 0.84]], L.peau);
    for (const s of [-1, 1]) { poly([[0.5 + s * 0.1, 1], [0.5 + s * 0.03, 1], [0.5, 0.84], [0.5 + s * 0.075, 0.78]], clair); trait([[0.5 + s * 0.1, 1], [0.5 + s * 0.075, 0.78], [0.5, 0.84]], fonce, 2.5); }
    g.fillStyle = melange(L.tenue, '#000000', 0.05); g.fillRect(X(0.487), Y(0.84), X(0.026), Y(0) - Y(0.84));
    trait([[0.487, 0.84], [0.487, 0]], fonce, 1.5); trait([[0.513, 0.84], [0.513, 0]], fonce, 1.5);
    for (let v = 0.76; v > 0.05; v -= 0.115) rond(0.5, v, 3.4, melange(L.tenue, '#000000', 0.3));
    if (L.carrure !== 'f') { poly([[0.585, 0.6], [0.655, 0.6], [0.655, 0.5], [0.62, 0.48], [0.585, 0.5]], melange(L.tenue, '#000000', 0.04)); trait([[0.585, 0.6], [0.655, 0.6], [0.655, 0.5], [0.62, 0.48], [0.585, 0.5], [0.585, 0.6]], fonce, 1.5); }
  } else { // pull
    const vcol = L.col === 'v';
    if (vcol) { poly([[0.43, 1], [0.57, 1], [0.5, 0.74]], chemise); poly([[0.468, 1], [0.532, 1], [0.5, 0.86]], L.peau); for (const s of [-1, 1]) { poly([[0.5 + s * 0.095, 1], [0.5 + s * 0.035, 1], [0.5, 0.86], [0.5 + s * 0.06, 0.82]], melange(chemise, '#000000', 0.05)); trait([[0.5 + s * 0.08, 1], [0.5, 0.72]], fonce, 9); } }
    else { g.fillStyle = L.peau; g.beginPath(); g.ellipse(X(0.5), Y(1), X(0.075), n * 0.085, 0, 0, 7); g.fill(); g.strokeStyle = fonce; g.lineWidth = 9; g.beginPath(); g.ellipse(X(0.5), Y(1), X(0.08), n * 0.092, 0, 0, 7); g.stroke(); g.strokeStyle = clair; g.lineWidth = 2; g.beginPath(); g.ellipse(X(0.5), Y(1), X(0.08), n * 0.092, 0, 0, 7); g.stroke(); }
    g.fillStyle = fonce; g.globalAlpha = 0.5; g.fillRect(0, Y(0.05), n, n * 0.05); g.globalAlpha = 1;
    g.strokeStyle = fonce; g.globalAlpha = 0.25; g.lineWidth = 1; for (let x = 0; x < n; x += 6) { g.beginPath(); g.moveTo(x, Y(0.05)); g.lineTo(x, n); g.stroke(); } g.globalAlpha = 1;
  }
  // cordon et badge
  trait([[0.445, 0.98], [0.5, 0.47], [0.555, 0.98]], cordon, 5);
  // modelé : flancs légèrement assombris
  const d = g.createLinearGradient(0, 0, n, 0); for (const [u, a] of [[0, 0], [0.2, 0.2], [0.33, 0.04], [0.5, 0], [0.67, 0.04], [0.8, 0.2], [1, 0]]) d.addColorStop(u, `rgba(0,0,0,${a})`);
  g.fillStyle = d; g.fillRect(0, 0, n, n);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// profils de révolution [rayon, hauteur] du bas vers le haut
const TORSE = {
  f: [[0.146, 0.86], [0.16, 0.93], [0.155, 1.0], [0.136, 1.08], [0.136, 1.16], [0.156, 1.26], [0.169, 1.34], [0.174, 1.39], [0.16, 1.425], [0.105, 1.455], [0.052, 1.474]],
  m: [[0.148, 0.86], [0.156, 0.93], [0.152, 1.0], [0.144, 1.08], [0.158, 1.18], [0.178, 1.28], [0.19, 1.36], [0.193, 1.4], [0.176, 1.435], [0.115, 1.462], [0.058, 1.48]],
};
const tour = (pts, seg = 40, debut = Math.PI, long = TAU) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, debut, long);

export function creerAvatar(p) {
  const L = { carrure: p.look.coiffure === 'court' ? 'm' : 'f', style: 'pull', ...p.look }, F = L.carrure === 'f', g = new THREE.Group();
  const ech = (F ? 0.962 : 1.03) * (L.taille || 1);
  const corps = new THREE.Group(); corps.scale.setScalar(ech); g.add(corps);
  const peau = std(L.peau, { roughness: 0.56 }), tisBump = tissuFin();
  const tenue = std('#ffffff', { map: textureTenue(L, p.lieu === 'nexus' ? '#14b8a6' : '#AD1D89'), roughness: 0.9, bumpMap: tisBump, bumpScale: 0.25 });
  const manche = std(L.tenue, { roughness: 0.9, bumpMap: tisBump, bumpScale: 0.25 }), bas = std(L.bas, { roughness: 0.85, bumpMap: tisBump, bumpScale: 0.2 });
  const cheveux = std(L.cheveux, { roughness: 0.55, bumpMap: meches(), bumpScale: 1.2, side: THREE.DoubleSide }), cuir = std('#17171c', { roughness: 0.4 });
  const add = (geo, m, x, y, z, parent, ombre = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = ombre; o.receiveShadow = true; parent.add(o); return o; };
  const boule = (r, sx, sy, sz, m, x, y, z, parent, seg = 16) => { const o = add(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.75 | 0)), m, x, y, z, parent); o.scale.set(sx, sy, sz); return o; };

  // --- jambes, bassin, chaussures
  const ecart = 0.088;
  boule(1, L.jupe ? 0.14 : 0.162, 0.1, L.jupe ? 0.095 : 0.108, bas, 0, 0.88, -0.004, corps, 24);
  if (L.jupe) {
    const jupe = add(tour([[0.118, 0.5], [0.132, 0.62], [0.156, 0.8], [0.162, 0.9], [0.15, 0.97]], 32), bas, 0, 0, 0, corps); jupe.scale.z = 0.7; jupe.material = std(L.bas, { roughness: 0.85, bumpMap: tisBump, bumpScale: 0.2, side: THREE.DoubleSide });
    const collant = std('#1f1b22', { roughness: 0.6 });
    for (const s of [-1, 1]) add(tour([[0.03, 0.06], [0.031, 0.12], [0.047, 0.32], [0.042, 0.47], [0.046, 0.6]], 16), collant, s * (ecart - 0.012), 0, 0, corps);
  } else {
    for (const s of [-1, 1]) { const j = add(tour([[0.058, 0.05], [0.058, 0.1], [0.063, 0.3], [0.066, 0.47], [0.08, 0.7], [0.086, 0.86], [0.07, 0.93]], 18), bas, s * ecart, 0, 0, corps); j.rotation.z = s * 0.012; }
  }
  for (const s of [-1, 1]) { boule(1, 0.046, 0.04, 0.122, cuir, s * (ecart + 0.004), 0.038, 0.045, corps, 18).rotation.y = s * 0.12; boule(1, 0.04, 0.05, 0.05, cuir, s * (ecart + 0.002), 0.05, -0.02, corps, 12); }

  // --- buste (pivote autour de la taille)
  const PIV = 1.0, buste = new THREE.Group(); buste.position.y = PIV; corps.add(buste);
  const gT = tour(TORSE[L.carrure], 44), pos = gT.attributes.position, prof = F ? 0.6 : 0.64;
  for (let i = 0; i < pos.count; i++) { // section ovale, poitrine et dos modelés
    const x = pos.getX(i), y = pos.getY(i); let z = pos.getZ(i) * prof;
    if (z > 0) z += (F ? 0.03 : 0.014) * Math.exp(-Math.pow((y - (F ? 1.275 : 1.3)) / 0.06, 2)) * Math.max(0, 1 - Math.pow(x / 0.15, 2));
    else z -= 0.012 * Math.exp(-Math.pow((y - 1.36) / 0.07, 2));
    pos.setZ(i, z);
  }
  gT.computeVertexNormals(); add(gT, tenue, 0, -PIV, 0, buste);
  // col de chemise en relief, badge
  if (L.style !== 'pull' || L.col === 'v') { const col = add(new THREE.TorusGeometry(0.056, 0.011, 8, 24, Math.PI * 1.25), std(L.style === 'chemise' ? melange(L.tenue, '#ffffff', 0.1) : (L.chemise || '#f4f4f2'), { roughness: 0.85 }), 0, 1.468 - PIV, -0.004, buste); col.rotation.set(Math.PI / 2, 0, Math.PI * 0.875); col.scale.set(1, 0.64, 0.9); }
  const zB = (F ? 0.094 : 0.108);
  add(new THREE.BoxGeometry(0.062, 0.09, 0.004), std('#ffffff', { roughness: 0.4 }), 0, 1.165 - PIV, zB + 0.006, buste, false).rotation.x = F ? -0.2 : -0.06;
  add(new THREE.BoxGeometry(0.062, 0.022, 0.005), std(p.lieu === 'nexus' ? '#14b8a6' : '#AD1D89', { roughness: 0.4 }), 0, 1.199 - PIV, zB + 0.008, buste, false).rotation.x = F ? -0.2 : -0.06;

  // --- bras : épaule -> coude -> main
  const xEp = F ? 0.15 : 0.172, bras = [];
  for (const s of [-1, 1]) {
    const epaule = new THREE.Group(); epaule.position.set(s * xEp, 1.39 - PIV, 0); epaule.rotation.z = s * 0.1; buste.add(epaule);
    boule(F ? 0.047 : 0.054, 1, 0.9, 1, manche, 0, 0.004, 0, epaule);
    add(new THREE.CylinderGeometry(F ? 0.044 : 0.05, F ? 0.037 : 0.042, 0.27, 16), manche, 0, -0.135, 0, epaule);
    const coude = new THREE.Group(); coude.position.y = -0.27; coude.rotation.x = -0.14; epaule.add(coude);
    boule(F ? 0.037 : 0.042, 1, 1, 1, L.manches === 'retroussees' ? peau : manche, 0, 0, 0, coude, 12);
    if (L.manches === 'retroussees') { add(new THREE.CylinderGeometry(0.039, 0.03, 0.25, 14), peau, 0, -0.125, 0, coude); add(new THREE.CylinderGeometry(0.046, 0.045, 0.05, 14), manche, 0, 0.012, 0, coude); }
    else { add(new THREE.CylinderGeometry(F ? 0.037 : 0.041, F ? 0.03 : 0.034, 0.25, 14), manche, 0, -0.125, 0, coude); if (L.style === 'veste') add(new THREE.CylinderGeometry(0.031, 0.031, 0.02, 14), std(L.chemise || '#f4f4f2'), 0, -0.258, 0, coude, false); }
    const main = new THREE.Group(); main.position.y = -0.26; coude.add(main);
    const e = F ? 1.02 : 1.14;
    boule(1, 0.016 * e, 0.046 * e, 0.036 * e, peau, 0, -0.04, 0, main, 12);
    boule(1, 0.013 * e, 0.04 * e, 0.031 * e, peau, -s * 0.004, -0.098, 0.004, main, 12).rotation.z = -s * 0.12;
    boule(1, 0.01 * e, 0.03 * e, 0.011 * e, peau, -s * 0.004, -0.05, 0.036, main, 10).rotation.x = -0.35;
    bras.push({ epaule, coude, s });
  }

  // --- cou et tête
  add(new THREE.CylinderGeometry(F ? 0.04 : 0.047, F ? 0.045 : 0.054, 0.1, 18), peau, 0, 1.505 - PIV, -0.008, buste);
  const tete = new THREE.Group(); tete.position.set(0, 1.607 - PIV, 0); buste.add(tete);
  const gCrane = new THREE.SphereGeometry(1, 48, 36); gCrane.rotateY(-Math.PI / 2); add(modeler(gCrane), peau, 0, 0, 0, tete);
  for (const s of [-1, 1]) boule(1, 0.007, 0.019, 0.012, peau, s * 0.077, -0.004, -0.006, tete, 10).rotation.z = -s * 0.14;
  // nez : arête effilée qui s'élargit vers la pointe, ailes discrètes
  const zN = surf(0, -0.03), eN = F ? 0.92 : 1.05;
  const arete = add(new THREE.CylinderGeometry(0.0034 * eN, 0.0068 * eN, 0.027, 12), peau, 0, -0.0185, zN - 0.0008, tete); arete.rotation.x = -0.3; arete.scale.z = 1.25;
  boule(1, 0.0076 * eN, 0.0064, 0.0074, peau, 0, -0.0328, zN + 0.004, tete, 14);
  for (const s of [-1, 1]) boule(1, 0.0052 * eN, 0.0042, 0.0055, peau, s * 0.0078 * eN, -0.0362, zN + 0.0012, tete, 10);
  // yeux : globe, iris, pupille, paupières
  const yO = 0.006, xO = 0.031, R = 0.0132, blanc = std('#f6f3ee', { roughness: 0.25 }), mIris = std(L.iris || '#4a3020', { roughness: 0.25 }), noir = std('#0c0c0e', { roughness: 0.2 });
  const yeux = [], paupieres = [], cils = std(melange(L.cheveux, '#000000', 0.6), { roughness: 0.6 });
  for (const s of [-1, 1]) {
    const o = new THREE.Group(); o.position.set(s * xO, yO, surf(xO, yO) - 0.0088); tete.add(o);
    boule(R, 1, 1, 1, blanc, 0, 0, 0, o, 16).castShadow = false;
    const regard = new THREE.Group(); o.add(regard);
    const calot = (r, ang, m) => { const c = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 6, 0, TAU, 0, ang), m); c.rotation.x = Math.PI / 2; regard.add(c); return c; };
    calot(R * 1.012, 0.56, mIris); calot(R * 1.022, 0.25, noir);
    const reflet = new THREE.Mesh(new THREE.SphereGeometry(0.0011, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffffff' })); reflet.position.set(0.0028, 0.003, R * 1.02); regard.add(reflet);
    const haut = new THREE.Group(); o.add(haut);
    haut.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.09, 16, 8, 0, TAU, 0, Math.PI * 0.44), peau));
    const cil = new THREE.Mesh(new THREE.TorusGeometry(R * 1.09 * Math.sin(Math.PI * 0.44), F ? 0.0008 : 0.0005, 5, 16, Math.PI * 0.9), cils);
    cil.rotation.set(Math.PI / 2, 0, 0); cil.rotation.z = Math.PI * 0.05; cil.position.y = R * 1.09 * Math.cos(Math.PI * 0.44); haut.add(cil);
    const basP = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 16, 6, 0, TAU, Math.PI * 0.7, Math.PI * 0.3), peau); o.add(basP);
    yeux.push(regard); paupieres.push(haut);
    // sourcil en arc
    const arc = 0.78, so = add(new THREE.TorusGeometry(0.03, 0.0021, 5, 12, arc), std(L.cheveux, { roughness: 0.8 }), s * (xO + 0.001), yO + 0.0255 - 0.03, surf(xO, yO + 0.024) + 0.0012, tete, false);
    so.rotation.z = Math.PI / 2 - arc / 2 - s * 0.1; so.rotation.y = s * 0.32; so.position.x -= s * 0.001; so.scale.set(1, 1, 0.6); so.scale.y = F ? 0.92 : 1.0; if (!F) so.geometry.scale(1, 1, 1.4);
  }
  // bouche : lèvres en arc (léger sourire), intérieur visible quand le personnage parle
  const yB = -0.066, zB2 = surf(0, yB), levre = std(melange(L.peau, F ? '#b03a52' : '#9c5750', F ? 0.55 : 0.3), { roughness: 0.42 });
  const interieur = boule(1, 0.0155, 0.001, 0.004, std('#35101a', { roughness: 0.6 }), 0, yB, zB2 - 0.0008, tete, 12); interieur.castShadow = false;
  const arcBouche = (rayon, tube, ouvert, y, z, m, parent, ez = 1.5) => { const o = add(new THREE.TorusGeometry(rayon, tube, 6, 18, ouvert), m, 0, y + rayon, z, parent, false); o.rotation.z = -Math.PI / 2 - ouvert / 2; o.scale.z = ez; return o; };
  arcBouche(0.04, 0.0034, 0.68, yB + 0.0028, zB2 + 0.0002, levre, tete);
  arcBouche(0.04, 0.0009, 0.72, yB, zB2 + 0.0022, std('#4a1c22', { roughness: 0.6 }), tete, 1);
  const machoire = new THREE.Group(); tete.add(machoire);
  arcBouche(0.03, 0.0042, 0.7, yB - 0.0042, zB2 - 0.0002, levre, machoire);
  // --- cheveux
  const C = L.coiffure;
  if (C === 'court') {
    const vol = L.volume || 0.03; add(calotte(-0.4 - (L.degarni ? 0.12 : 0), Math.PI * 0.53, (dx, dy, dz) => 1.022 + vol * lisse(0.05, 0.7, dy) * (1 + 0.5 * Math.max(0, dz)), 0.004), cheveux, 0, 0, 0, tete);
    for (const s of [-1, 1]) add(piece(18, 8, (u, v) => { const b = 0.45 - 0.55 * lisse(0, 0.32, u) - 0.25 * lisse(0.5, 1, u); return [s * (0.75 + u * 1.9), b + v * (0.74 - b)]; }, 1.014), cheveux, 0, 0, 0, tete);
  } else {
    add(calotte(-0.44, Math.PI * 0.5, (dx, dy) => 1.05 + 0.035 * lisse(-0.1, 0.7, dy), 0.006), cheveux, 0, 0, 0, tete);
    if (C === 'chignon') { boule(0.046, 1, 0.95, 1, cheveux, 0, 0.055, -0.098, tete, 18); add(piece(16, 6, (u, v) => [Math.PI + (u - 0.5) * 2.6, -0.05 - v * 0.42], 1.05), cheveux, 0, 0, 0, tete); }
    else {
      const bas2 = C === 'long' ? [[0.079, -0.31], [0.092, -0.24], [0.096, -0.15], [0.094, -0.07], [0.086, 0.0], [0.08, 0.035]] : [[0.07, -0.125], [0.086, -0.1], [0.092, -0.05], [0.087, 0.0], [0.08, 0.035]];
      const rideau = add(tour(bas2, 36, 0.92, TAU - 1.84), cheveux, 0, 0, -0.004, tete); rideau.scale.z = 1.2;
    }
    if (L.frange) add(piece(20, 6, (u, v) => [(u - 0.5) * 2.2, 0.66 - v * 0.42 + Math.abs(u - 0.5) * 0.1], 1.085), cheveux, 0, 0, 0, tete);
  }
  if (L.barbe) add(piece(26, 10, (u, v) => { const a = (u - 0.5) * 3.5; return [a, (-0.5 + Math.pow(Math.abs(a) / 1.75, 1.6) * 0.46) * (1 - v) + -0.985 * v]; }, 1.03), std(L.cheveux, { roughness: 1, side: THREE.DoubleSide }), 0, 0, 0, tete);
  if (L.lunettes) {
    const ml = std('#1c1c22', { roughness: 0.3 }), zL = surf(xO, yO) + 0.011;
    for (const s of [-1, 1]) {
      add(new THREE.TorusGeometry(0.02, 0.0016, 6, 28), ml, s * xO, yO, zL, tete, false).scale.y = 0.86;
      const br = add(new THREE.BoxGeometry(0.0025, 0.004, 0.085), ml, s * 0.064, yO + 0.003, zL - 0.047, tete, false); br.rotation.y = -s * 0.2;
      add(new THREE.BoxGeometry(0.016, 0.004, 0.003), ml, s * 0.057, yO + 0.003, zL - 0.003, tete, false);
    }
    add(new THREE.BoxGeometry(0.022, 0.0028, 0.0028), ml, 0, yO + 0.004, zL, tete, false);
  }

  const tag = etiquette(p.nom, p.role); tag.position.y = 1.72 * ech + 0.26; g.add(tag); tag.dessiner('nouveau');

  let t = Math.random() * 10, clign = 2 + Math.random() * 3, ouverture = 0, geste = 0, lacetTete = 0, tangTete = 0;
  const avatar = {
    id: p.id, groupe: g, etiquette: tag, angleBase: 0,
    tetePos: new THREE.Vector3(),
    // parle : bool ; niveau : 0..1 ; cible : position du joueur ; proche : bool
    maj(dt, parle, niveau, cible, proche) {
      t += dt;
      // le corps se tourne doucement vers le joueur, la tête achève le mouvement
      const dx = cible.x - g.position.x, dz = cible.z - g.position.z, dist = Math.hypot(dx, dz);
      const voulu = proche ? Math.atan2(dx, dz) : avatar.angleBase;
      let d = voulu - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      g.rotation.y += d * Math.min(1, dt * 2.6);
      const k = Math.min(1, dt * 5);
      lacetTete += ((proche ? Math.max(-0.55, Math.min(0.55, d)) : 0) - lacetTete) * k;
      tangTete += ((proche ? Math.max(-0.3, Math.min(0.3, Math.atan2(1.607 * ech - cible.y, Math.max(0.6, dist)))) : 0) - tangTete) * k;
      // respiration, léger balancement
      buste.scale.set(1, 1 + Math.sin(t * 1.5) * 0.006, 1 + Math.sin(t * 1.5) * 0.012);
      buste.rotation.z = Math.sin(t * 0.6) * 0.012; buste.rotation.x = Math.sin(t * 0.43) * 0.008;
      tete.rotation.y = lacetTete * 0.8 + Math.sin(t * 0.5) * 0.04;
      tete.rotation.x = tangTete + (parle ? Math.sin(t * 4.6) * 0.03 - 0.015 : Math.sin(t * 0.8) * 0.012);
      tete.rotation.z = Math.sin(t * 0.37) * 0.02;
      for (const o of yeux) { o.rotation.y = lacetTete * 0.25; o.rotation.x = tangTete * 0.3; }
      // gestes des bras quand le personnage parle
      geste += ((parle ? 1 : 0) - geste) * Math.min(1, dt * 4);
      for (const b of bras) {
        const ph = b.s > 0 ? 0 : 1.7;
        b.epaule.rotation.x = geste * (-0.22 - Math.sin(t * 2.1 + ph) * 0.1) + Math.sin(t * 0.7 + ph) * 0.012;
        b.epaule.rotation.z = b.s * (0.1 + geste * 0.05);
        b.coude.rotation.x = -0.14 - geste * (b.s > 0 ? 1.0 + Math.sin(t * 2.7) * 0.28 : 0.55 + Math.sin(t * 1.9 + 1) * 0.3);
        b.coude.rotation.z = -b.s * geste * 0.25;
      }
      // bouche
      const cibleB = parle ? 0.18 + Math.min(1, niveau * 3.4) : 0;
      ouverture += (cibleB - ouverture) * Math.min(1, dt * 22);
      machoire.position.y = -ouverture * 0.0075; interieur.scale.y = 0.001 + ouverture * 0.0062; interieur.position.y = yB - ouverture * 0.0035;
      // clignement
      clign -= dt; const ferme = clign < 0.13 ? 1 : 0; if (clign < 0) clign = 2.4 + Math.random() * 3.6;
      for (const h of paupieres) h.rotation.x += ((ferme ? 1.25 : -0.1) - h.rotation.x) * Math.min(1, dt * 30);
      tete.getWorldPosition(avatar.tetePos);
    },
  };
  return avatar;
}
