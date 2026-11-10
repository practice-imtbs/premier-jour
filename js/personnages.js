// Avatars stylisés : corps procédural, regard vers le joueur, bouche animée par la voix.
import * as THREE from 'three';

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });

function etiquette(nom, role) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 176;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: true, transparent: true }));
  sprite.material.map.colorSpace = THREE.SRGBColorSpace;
  sprite.scale.set(1.16, 0.319, 1); sprite.renderOrder = 10;
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

export function creerAvatar(p) {
  const L = p.look, g = new THREE.Group();
  const peau = M(L.peau, { roughness: 0.6 }), tenue = M(L.tenue), bas = M(L.bas), cheveux = M(L.cheveux, { roughness: 0.9 });
  const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };

  // jambes et chaussures
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.085, 0.075, 0.84, 14), bas, s * 0.1, 0.46, 0);
    add(new THREE.BoxGeometry(0.11, 0.07, 0.25), M('#141418'), s * 0.1, 0.035, 0.04);
  }
  // buste
  const buste = new THREE.Group(); buste.position.y = 0.88; g.add(buste);
  const torse = add(new THREE.CapsuleGeometry(0.2, 0.36, 6, 16), tenue, 0, 0.33, 0, buste); torse.scale.set(1.12, 1, 0.72);
  add(new THREE.CylinderGeometry(0.2, 0.19, 0.16, 16), bas, 0, 0.06, 0, buste).scale.z = 0.72;
  // badge
  add(new THREE.BoxGeometry(0.07, 0.095, 0.01), M('#ffffff'), 0.1, 0.42, 0.148, buste);
  add(new THREE.BoxGeometry(0.07, 0.025, 0.012), M(p.lieu === 'nexus' ? '#14b8a6' : '#AD1D89'), 0.1, 0.455, 0.149, buste);
  // bras
  const bras = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.27, 0.52, 0); pivot.rotation.z = s * 0.1; buste.add(pivot);
    add(new THREE.CapsuleGeometry(0.058, 0.44, 4, 10), tenue, 0, -0.26, 0, pivot);
    add(new THREE.SphereGeometry(0.062, 12, 10), peau, 0, -0.55, 0, pivot);
    bras.push(pivot);
  }
  // cou et tête
  add(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 12), peau, 0, 0.66, 0, buste);
  const tete = new THREE.Group(); tete.position.y = 0.83; buste.add(tete);
  const crane = add(new THREE.SphereGeometry(0.155, 24, 20), peau, 0, 0, 0, tete); crane.scale.set(0.94, 1.1, 1);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.03, 8, 8), peau, s * 0.148, -0.01, 0, tete);
  // cheveux
  const calotte = add(new THREE.SphereGeometry(0.166, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), cheveux, 0, 0.022, -0.012, tete);
  calotte.scale.set(0.97, 1.1, 1.04); calotte.rotation.x = -0.28;
  if (L.coiffure === 'carre' || L.coiffure === 'long') {
    const hl = L.coiffure === 'long' ? 0.42 : 0.24;
    const dos = add(new THREE.CapsuleGeometry(0.14, hl, 4, 14), cheveux, 0, -hl / 2 + 0.02, -0.075, tete); dos.scale.set(1.08, 1, 0.55);
    for (const s of [-1, 1]) add(new THREE.CapsuleGeometry(0.04, hl * 0.7, 4, 8), cheveux, s * 0.142, -hl * 0.35 + 0.02, -0.01, tete);
  }
  if (L.coiffure === 'chignon') add(new THREE.SphereGeometry(0.07, 12, 10), cheveux, 0, 0.13, -0.13, tete);
  if (L.barbe) { const b = add(new THREE.SphereGeometry(0.15, 20, 14, 0, Math.PI * 2, Math.PI * 0.66, Math.PI * 0.34), M(L.cheveux, { roughness: 1 }), 0, 0.0, 0.004, tete); b.scale.set(0.95, 1.12, 1.0); }
  // yeux, sourcils, bouche
  const yeux = [];
  for (const s of [-1, 1]) {
    add(new THREE.SphereGeometry(0.024, 12, 10), M('#ffffff', { roughness: 0.6 }), s * 0.055, 0.025, 0.134, tete).scale.z = 0.5;
    const iris = add(new THREE.SphereGeometry(0.0165, 10, 8), M('#2a1c14', { roughness: 0.35 }), s * 0.055, 0.024, 0.1415, tete); yeux.push(iris);
    add(new THREE.BoxGeometry(0.05, 0.009, 0.01), cheveux, s * 0.055, 0.064, 0.143, tete).rotation.z = -s * 0.1;
  }
  const paupieres = yeux.map((_, i) => { const o = add(new THREE.BoxGeometry(0.056, 0.05, 0.012), peau, (i ? 1 : -1) * 0.055, 0.03, 0.15, tete); o.visible = false; return o; });
  // sourire (au repos) et bouche ouverte (en parlant)
  const sourire = add(new THREE.TorusGeometry(0.03, 0.0055, 6, 14, Math.PI * 0.8), M('#8a2f3c', { roughness: 0.6 }), 0, -0.052, 0.147, tete);
  sourire.rotation.z = Math.PI + Math.PI * 0.1; sourire.castShadow = false;
  const bouche = add(new THREE.SphereGeometry(0.024, 14, 10), M('#5a1620', { roughness: 0.7 }), 0, -0.074, 0.146, tete);
  bouche.scale.set(1.1, 0.3, 0.35); bouche.visible = false; bouche.castShadow = false;
  if (L.lunettes) {
    const ml = M('#1c1c22', { roughness: 0.3 });
    for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.036, 0.005, 8, 20), ml, s * 0.055, 0.025, 0.152, tete);
    add(new THREE.BoxGeometry(0.04, 0.006, 0.006), ml, 0, 0.03, 0.152, tete);
  }
  const tag = etiquette(p.nom, p.role); tag.position.y = 2.02; g.add(tag); tag.dessiner('nouveau');

  let t = Math.random() * 10, clign = 2 + Math.random() * 3, ouverture = 0;
  const avatar = {
    id: p.id, groupe: g, etiquette: tag, angleBase: 0,
    tetePos: new THREE.Vector3(),
    // parle : bool ; niveau : 0..1 ; cible : position du joueur ; proche : bool
    maj(dt, parle, niveau, cible, proche) {
      t += dt;
      // orientation douce vers le joueur s'il est proche
      const dx = cible.x - g.position.x, dz = cible.z - g.position.z;
      const voulu = proche ? Math.atan2(dx, dz) : avatar.angleBase;
      let d = voulu - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      g.rotation.y += d * Math.min(1, dt * 3.5);
      // respiration, balancement
      buste.scale.y = 1 + Math.sin(t * 1.6) * 0.008;
      buste.rotation.z = Math.sin(t * 0.7) * 0.012;
      tete.rotation.y = Math.sin(t * 0.5) * 0.06;
      tete.rotation.x = parle ? Math.sin(t * 5.2) * 0.035 - 0.02 : Math.sin(t * 0.9) * 0.015;
      // gestes
      const geste = parle ? 1 : 0;
      bras[0].rotation.x += ((geste ? -0.55 - Math.sin(t * 3.1) * 0.25 : 0) - bras[0].rotation.x) * Math.min(1, dt * 5);
      bras[1].rotation.x += ((geste ? -0.25 - Math.sin(t * 2.3 + 1) * 0.3 : 0) - bras[1].rotation.x) * Math.min(1, dt * 5);
      // bouche
      const cibleB = parle ? 0.25 + Math.min(1, niveau * 3.2) : 0;
      ouverture += (cibleB - ouverture) * Math.min(1, dt * 22);
      bouche.visible = ouverture > 0.06; sourire.visible = !bouche.visible;
      bouche.scale.set(1.15 - ouverture * 0.25, 0.25 + ouverture * 0.75, 0.35);
      // clignement
      clign -= dt; const ferme = clign < 0.12; paupieres.forEach(o => o.visible = ferme); if (clign < 0) clign = 2.5 + Math.random() * 3.5;
      tete.getWorldPosition(avatar.tetePos);
    },
  };
  return avatar;
}
