// Chaîne de rendu : éclairage d'ambiance par l'environnement, occlusion ambiante, anticrénelage,
// et adaptation automatique de la qualité aux capacités de l'ordinateur.
import * as THREE from 'three';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from '../vendor/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from '../vendor/jsm/environments/RoomEnvironment.js';

const CLE_QUALITE = 'imtbs_premier_jour_qualite';
// niveaux : 2 = élevée (occlusion ambiante), 1 = standard, 0 = légère (ordinateurs modestes)
const NIVEAUX = [
  { nom: 'Légère', ratio: 1, ao: false, ombres: false },
  { nom: 'Standard', ratio: 1.5, ao: false, ombres: true },
  { nom: 'Élevée', ratio: 1.5, ao: true, ombres: true },
];

export function creerRendu(renderer, scene, camera) {
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // une seule mise à jour des ombres par image (voir rendre)

  // reflets et lumière d'ambiance : une pièce claire générique, floutée
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.36;
  pmrem.dispose();

  const cible = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, cible);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, 1, 1);
  ao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.3, thickness: 1.2, scale: 1.25, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 2, rings: 2, samples: 12 });
  ao.blendIntensity = 0.9;
  // les vitres, étiquettes et autres objets transparents ne doivent ni recevoir ni projeter d'occlusion
  const base = ao.overrideVisibility.bind(ao);
  ao.overrideVisibility = () => {
    base();
    scene.traverse((o) => { if (o.isSprite || o.userData.sansAO || (o.isMesh && o.material && o.material.transparent)) o.visible = false; });
  };
  composer.addPass(ao);
  composer.addPass(new OutputPass());

  const param = new URLSearchParams(location.search).get('qualite');
  let choix = 'auto';
  try { choix = localStorage.getItem(CLE_QUALITE) || 'auto'; } catch { /* stockage indisponible */ }
  if (param !== null && NIVEAUX[+param]) choix = String(+param);
  let niveau = choix === 'auto' ? 2 : +choix;
  let l = 1, h = 1;

  function appliquer() {
    const n = NIVEAUX[niveau], ratio = Math.min(devicePixelRatio || 1, n.ratio);
    renderer.setPixelRatio(ratio); renderer.setSize(l, h, false);
    composer.setPixelRatio(ratio); composer.setSize(l, h);
    ao.enabled = n.ao;
    scene.traverse((o) => { if (o.isLight && o.shadow && o.userData.ombre) o.castShadow = n.ombres; });
    renderer.shadowMap.needsUpdate = true;
  }

  // mesure de fluidité : si l'ordinateur peine, on descend d'un niveau (une seule fois par palier)
  let cumul = 0, images = 0, lentes = 0;
  function mesurer(dt) {
    if (choix !== 'auto' || niveau === 0 || !dt) return;
    cumul += dt; images++;
    if (images < 45) return;
    const ips = images / cumul; cumul = 0; images = 0;
    lentes = ips < 26 ? lentes + 1 : 0;
    if (lentes >= 2) { niveau--; lentes = 0; appliquer(); console.info(`Premier jour · qualité graphique ajustée : ${NIVEAUX[niveau].nom}`); }
  }

  return {
    taille(largeur, hauteur) { l = largeur; h = hauteur; appliquer(); },
    rendre(dt) {
      mesurer(dt);
      renderer.shadowMap.needsUpdate = true;
      composer.render(dt);
    },
    sceneChangee() { appliquer(); },
    get niveau() { return niveau; },
    get choix() { return choix; },
    get nomNiveau() { return NIVEAUX[niveau].nom; },
    choisir(c) { // 'auto' | '0' | '1' | '2'
      choix = c; niveau = c === 'auto' ? 2 : +c; lentes = 0; cumul = 0; images = 0;
      try { localStorage.setItem(CLE_QUALITE, c); } catch { /* stockage indisponible */ }
      appliquer();
    },
  };
}
