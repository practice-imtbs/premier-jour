// PREMIER JOUR · orchestration du jeu (état, déplacements, dialogues, épreuves, carnet).
import * as THREE from 'three';
import { META, LIEUX, PERSONNAGES, BORNE, CALENDRIER, ANNUAIRE, BONS_A_SAVOIR, RELANCES } from '../contenu/contenu.js';
import { CONFIG } from '../config.js';
import { Monde, deplacer } from './monde.js';
import { creerAvatar } from './personnages.js';
import { Voix, Musique } from './audio.js';
import { creerRendu } from './rendu.js';

const $ = (s) => document.querySelector(s);
const CLE = 'imtbs_premier_jour_v1';
const HAUTEUR = 1.62, PORTEE = 2.7;

// élément DOM : el('button', {class:'btn', onclick}, 'texte' | [enfants])
function el(tag, attrs = {}, enfants = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(enfants)) if (c != null && c !== false) e.append(c);
  return e;
}
// affichage : « C F A » (écrit ainsi pour la voix) redevient « CFA »
const aff = (t) => t.replace(/\b(?:[A-Z] )+[A-Z]\b/g, (m) => m.replace(/ /g, ''));

// ------------------------------------------------------------------ état
const etatInitial = () => ({ v: 1, prenom: '', nom: '', programme: 'pge', lieu: 'campus', persos: {}, notes: [], badge: false, temps: 0, erreurs: 0 });
let etat = etatInitial();
const fiche = (id) => (etat.persos[id] ??= { vu: false, etape: 0, valide: false, poses: [] });
const valide = (id) => Boolean(etat.persos[id]?.valide);
const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* stockage indisponible */ } };
function lireSauvegarde() {
  try {
    const s = JSON.parse(localStorage.getItem(CLE) || 'null');
    if (s && s.v === 1 && LIEUX[s.lieu] && typeof s.prenom === 'string') return { ...etatInitial(), ...s };
  } catch { /* sauvegarde illisible */ }
  return null;
}

// ------------------------------------------------------------------ rendu
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const scene = new THREE.Scene(); scene.background = new THREE.Color('#dfe9ee');
const camera = new THREE.PerspectiveCamera(66, 1, 0.08, 80); camera.rotation.order = 'YXZ';
const rendu = creerRendu(renderer, scene, camera);
const monde = new Monde(scene);
const voix = new Voix(), musique = new Musique();
let avatars = [];
const joueur = { pos: new THREE.Vector3(0, HAUTEUR, 6), lacet: 0, tangage: 0 };
function taille() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); rendu.taille(innerWidth, innerHeight); }
addEventListener('resize', taille); taille();

// ------------------------------------------------------------------ lieux
function construireLieu(lieu) {
  avatars.forEach(a => scene.remove(a.groupe)); avatars = [];
  const { depart } = monde.construire(lieu);
  joueur.pos.set(depart.x, HAUTEUR, depart.z); joueur.lacet = depart.angle; joueur.tangage = 0;
  for (const p of PERSONNAGES.filter(x => x.lieu === lieu)) {
    const a = creerAvatar(p), pl = monde.places[p.id];
    a.groupe.position.set(pl.x, 0, pl.z); a.groupe.rotation.y = a.angleBase = pl.angle; a.perso = p;
    scene.add(a.groupe); avatars.push(a);
    monde.colliders.push({ minX: pl.x - 0.28, maxX: pl.x + 0.28, minZ: pl.z - 0.28, maxZ: pl.z + 0.28, actif: true });
    monde.interactifs.push({ type: 'perso', id: p.id, pos: new THREE.Vector3(pl.x, 1.6, pl.z), avatar: a });
  }
  scene.background.set(lieu === 'nexus' ? '#cfd6dc' : '#e6edf0');
  rendu.sceneChangee();
  majMonde(true);
}
const restants = (lieu, sauf = []) => PERSONNAGES.filter(p => p.lieu === lieu && !valide(p.id) && !sauf.includes(p.id));

function majMonde(immediat = false) {
  const l = etat.lieu;
  if (l === 'campus') {
    for (const id of ['a08', 'b12', 'coord']) monde.ouvrirPorte(id, valide('nora'));
    monde.ouvrirPorte('sortie', restants('campus').length === 0, true);
  } else if (l === 'nexus') {
    monde.ouvrirPorte('reunion', true); monde.ouvrirPorte('rh', true);
    monde.ouvrirPorte('sortie', restants('nexus').length === 0, true);
  } else monde.etatBorne(restants('accompagnement').length === 0, etat.badge);
  if (immediat) for (const p of Object.values(monde.portes)) if (p.cible !== undefined) p.panneau.position[p.axe === 'x' ? 'x' : 'z'] = p.base + p.cible;
  for (const a of avatars) a.etiquette.dessiner(valide(a.id) ? 'valide' : fiche(a.id).vu ? 'vu' : 'nouveau');
  majHud();
}

function objectif() {
  const l = etat.lieu, r = restants(l).map(p => p.nom);
  if (etat.badge) return 'Badge activé. Vous pouvez continuer à explorer et à poser vos questions.';
  if (l === 'campus') {
    if (!valide('nora')) return 'Allez voir Nora, à l’accueil, juste devant vous.';
    return r.length ? `Faites le tour du campus : ${r.join(', ')}.` : 'Campus bouclé ! Prenez la porte vitrée du fond, direction Nexus.';
  }
  if (l === 'nexus') return r.length ? `Présentez-vous à ${r.join(', ')}.` : 'Rejoignez l’espace d’accompagnement : porte à droite de l’entrée.';
  return r.length ? `Échangez avec ${r.join(' et ')}.` : 'Activez votre badge à la borne, au fond de la pièce.';
}
function majHud() {
  $('#hudLieu').textContent = LIEUX[etat.lieu].nom;
  $('#hudObjectif').textContent = objectif();
  const n = PERSONNAGES.filter(p => valide(p.id)).length;
  $('#hudProgres').textContent = n; $('#hudJauge').style.width = `${(n / PERSONNAGES.length) * 100}%`;
}

let mode = 'accueil'; // accueil | jeu | dialogue | fenetre | transition
async function allerA(lieu) {
  mode = 'transition'; document.exitPointerLock?.(); voix.stop();
  const t = $('#transition'), L = LIEUX[lieu];
  $('#trSur').textContent = `Étape ${Object.keys(LIEUX).indexOf(lieu) + 1} sur 3`; $('#trTitre').textContent = L.nom; $('#trTexte').textContent = L.accroche;
  t.hidden = false; requestAnimationFrame(() => t.classList.add('vu'));
  await new Promise(r => setTimeout(r, 550));
  etat.lieu = lieu; construireLieu(lieu); musique.jouer(lieu); sauver();
  await new Promise(r => setTimeout(r, 1500));
  t.classList.remove('vu'); await new Promise(r => setTimeout(r, 450)); t.hidden = true;
  mode = 'jeu'; canvas.focus();
}

// ------------------------------------------------------------------ commandes
const touches = new Set();
addEventListener('keydown', (e) => {
  if (e.target.matches?.('input, textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
  touches.add(e.code);
  if (mode === 'jeu') {
    if (e.code === 'KeyE' || e.code === 'Enter') { e.preventDefault(); interagir(); }
    else if (e.code === 'KeyC') ouvrirCarnet();
    else if (e.code === 'KeyH') ouvrirAide();
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  } else if (e.key === 'Escape') {
    if (mode === 'dialogue') fermerDialogue(); else if (mode === 'fenetre') fermerFenetre();
  } else if (mode === 'dialogue' && e.code === 'Space' && !e.target.matches?.('button')) { e.preventDefault(); voix.stop(); }
});
addEventListener('keyup', (e) => touches.delete(e.code));
addEventListener('blur', () => touches.clear());
canvas.addEventListener('click', () => {
  if (mode !== 'jeu') return;
  if (document.pointerLockElement === canvas) interagir();
  else canvas.requestPointerLock?.()?.catch?.(() => { });
});
let glisse = false;
canvas.addEventListener('mousedown', () => { glisse = true; });
addEventListener('mouseup', () => { glisse = false; });
addEventListener('mousemove', (e) => {
  if (mode !== 'jeu') return;
  const verrou = document.pointerLockElement === canvas;
  if (!verrou && !glisse) return;
  const k = verrou ? 0.0022 : -0.004; // glisser sans verrou : on « attrape » la scène
  joueur.lacet -= e.movementX * k; joueur.tangage = Math.max(-1.1, Math.min(1.1, joueur.tangage - e.movementY * k));
});
document.addEventListener('pointerlockchange', () => { $('#souris').hidden = mode !== 'jeu' || document.pointerLockElement === canvas; });

// ------------------------------------------------------------------ interactions
let cible = null;
function chercherCible() {
  const avant = new THREE.Vector3(-Math.sin(joueur.lacet), 0, -Math.cos(joueur.lacet));
  let meilleur = null, score = -1;
  for (const it of monde.interactifs) {
    const dx = it.pos.x - joueur.pos.x, dz = it.pos.z - joueur.pos.z, d = Math.hypot(dx, dz);
    if (d > PORTEE) continue;
    const face = (dx * avant.x + dz * avant.z) / (d || 1);
    if (face < 0.45) continue;
    const s = face - d * 0.15; if (s > score) { score = s; meilleur = it; }
  }
  return meilleur;
}
function libelleCible(it) {
  if (it.type === 'perso') return { texte: `Parler à ${it.avatar.perso.nom}`, ok: true };
  if (it.type === 'sortie') {
    const r = restants(etat.lieu), suite = LIEUX[LIEUX[etat.lieu].suite]?.nom;
    return r.length ? { texte: `Porte verrouillée · encore ${r.map(p => p.nom).join(', ')}`, ok: false } : { texte: `Aller vers : ${suite}`, ok: true };
  }
  const r = restants('accompagnement');
  if (etat.badge) return { texte: 'Revoir mon attestation', ok: true };
  return r.length ? { texte: `Borne en attente · encore ${r.map(p => p.nom).join(' et ')}`, ok: false } : { texte: 'Activer mon badge', ok: true };
}
function interagir() {
  if (!cible) return;
  const l = libelleCible(cible);
  if (!l.ok) { voix.erreur(); toast(l.texte); return; }
  voix.bip(520, 0.06);
  if (cible.type === 'perso') ouvrirDialogue(cible.avatar);
  else if (cible.type === 'sortie') allerA(LIEUX[etat.lieu].suite);
  else etat.badge ? ouvrirFin() : ouvrirBorne();
}
let tToast;
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('vu'); clearTimeout(tToast); tToast = setTimeout(() => e.classList.remove('vu'), 3200); }

// ------------------------------------------------------------------ dialogue
let dlg = null, direct = false, ecriture = 0;
const zone = $('#dlgZone'), texte = $('#dlgTexte');

function ecrire(t, prefixe = '') {
  const id = ++ecriture; texte.classList.remove('attente'); texte.textContent = '';
  if (prefixe) texte.append(el('span', { class: 'vous' }, prefixe));
  const corps = document.createTextNode(''); texte.append(corps);
  const complet = aff(t), debut = performance.now();
  (function pas() {
    if (id !== ecriture) return;
    const duree = Math.max(0.8, voix.duree * 0.92) * 1000;
    const n = Math.min(complet.length, Math.ceil(((performance.now() - debut) / duree) * complet.length) + 3);
    corps.data = complet.slice(0, n);
    if (n < complet.length && voix.active) requestAnimationFrame(pas); else corps.data = complet;
  })();
}
async function dire(idRep, t, prefixe) {
  const p = dlg; if (!p) return;
  $('#dlgPasser').hidden = false; $('#dlgPastille').classList.add('parle');
  const lecture = voix.jouer(`${p.perso.id}_${idRep}`, t);
  ecrire(t, prefixe);
  await lecture;
  if (dlg === p && !voix.active) { $('#dlgPasser').hidden = true; $('#dlgPastille').classList.remove('parle'); }
}

function ouvrirDialogue(avatar) {
  const p = avatar.perso, f = fiche(p.id);
  dlg = { perso: p, avatar, historique: [], erreurs: 0 };
  mode = 'dialogue'; document.exitPointerLock?.(); touches.clear();
  $('#dlgNom').textContent = p.nom; $('#dlgRole').textContent = p.role;
  $('#dialogue').hidden = false; $('#invite').hidden = true; $('#viseur').hidden = true; $('#souris').hidden = true;
  if (!f.vu) { f.vu = true; sauver(); majMonde(); dire('accueil', p.accueil); }
  else { texte.textContent = valide(p.id) ? `${p.nom} vous écoute. Une autre question ?` : `${p.nom} vous écoute.`; $('#dlgPasser').hidden = true; }
  menu();
}
function fermerDialogue() {
  if (!dlg) return;
  voix.stop(); ecriture++; dlg = null; mode = 'jeu';
  $('#dialogue').hidden = true; $('#viseur').hidden = false; $('#dlgPastille').classList.remove('parle');
  $('#souris').hidden = document.pointerLockElement === canvas;
  canvas.focus(); majHud();
}
$('#dlgFermer').onclick = fermerDialogue;
$('#dlgPasser').onclick = () => voix.stop();

function menu() {
  const p = dlg.perso, f = fiche(p.id);
  zone.replaceChildren(
    el('p', { class: 'choix-titre' }, 'Vos questions'),
    el('div', { class: 'grille' }, p.questions.map((q, i) => el('button', {
      type: 'button', class: 'opt' + (f.poses.includes(i) ? ' vu' : ''),
      onclick: (e) => { if (!f.poses.includes(i)) { f.poses.push(i); sauver(); } e.currentTarget.classList.add('vu'); dire(`q${i + 1}`, q.r, `Vous : ${q.q}`); },
    }, [el('span', { class: 'rang' }, f.poses.includes(i) ? '✓' : '?'), q.q]))),
    direct ? el('form', { class: 'ligne-libre', onsubmit: questionLibre }, [
      el('input', { name: 'q', maxlength: 300, placeholder: `Posez librement votre question à ${p.nom}…`, 'aria-label': `Question libre à ${p.nom}`, autocomplete: 'off' }),
      micro(),
      el('button', { class: 'btn', type: 'submit' }, 'Demander'),
    ]) : el('p', { class: 'choix-titre', style: 'text-transform:none;letter-spacing:0;font-weight:400' }, 'Questions libres indisponibles hors connexion au relais IA.'),
    el('div', { class: 'barre' }, [
      !f.valide && el('button', { type: 'button', class: 'btn primaire', onclick: lancerEpreuves }, f.etape ? `Reprendre ses questions (${f.etape + 1}/${p.epreuves.length})` : `Répondre aux questions de ${p.nom} ▸`),
      f.valide && el('span', { class: 'etape', style: 'color:#8fe6b6' }, '✓ Étape validée'),
      el('button', { type: 'button', class: 'btn pousse', onclick: fermerDialogue }, 'Au revoir'),
    ]),
  );
}

function micro() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  let rec = null;
  const b = el('button', { type: 'button', class: 'btn micro', title: 'Dicter ma question', 'aria-label': 'Dicter ma question' }, '🎙');
  b.onclick = () => {
    if (rec) { rec.stop(); return; }
    voix.stop(); rec = new SR(); rec.lang = 'fr-FR'; rec.interimResults = true;
    const champ = b.parentElement.querySelector('input');
    rec.onresult = (e) => { champ.value = [...e.results].map(r => r[0].transcript).join(' '); };
    rec.onend = () => { b.classList.remove('actif'); rec = null; if (champ.value.trim()) b.parentElement.requestSubmit(); };
    rec.onerror = () => { b.classList.remove('actif'); rec = null; };
    b.classList.add('actif'); rec.start();
  };
  return b;
}

async function questionLibre(e) {
  e.preventDefault();
  const champ = e.currentTarget.q, q = champ.value.trim(), p = dlg; if (q.length < 2 || !p) return;
  champ.value = ''; champ.disabled = true; voix.stop(); ecriture++;
  texte.replaceChildren(el('span', { class: 'vous' }, `Vous : ${q}`)); texte.classList.add('attente');
  try {
    const r = await fetch(`${CONFIG.relais}/api/question`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personnage: p.perso.id, programme: etat.programme, question: q, historique: p.historique }) });
    const d = await r.json(); if (!r.ok) throw new Error(d.erreur || 'Erreur');
    if (dlg !== p) return;
    p.historique.push({ role: 'user', content: q }, { role: 'assistant', content: d.reponse });
    // on affiche tout de suite, la voix suit dès qu'elle est prête
    texte.classList.remove('attente'); voix.duree = 0.6; ecrire(d.reponse, `Vous : ${q}`);
    const a = await fetch(`${CONFIG.relais}/api/voix`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personnage: p.perso.id, texte: d.reponse }) });
    if (a.ok && dlg === p && !voix.active) {
      $('#dlgPasser').hidden = false; $('#dlgPastille').classList.add('parle');
      await voix.jouerBlob(await a.blob(), d.reponse);
      if (dlg === p && !voix.active) { $('#dlgPasser').hidden = true; $('#dlgPastille').classList.remove('parle'); }
    }
  } catch (err) {
    texte.classList.remove('attente');
    if (dlg === p) texte.replaceChildren(el('span', { class: 'vous' }, `Vous : ${q}`), `Je n'arrive pas à vous répondre pour le moment. Essayez l'une des questions proposées, ou réessayez dans un instant.`);
    console.warn('Question libre :', err.message);
  } finally { champ.disabled = false; if (dlg === p) champ.focus(); }
}

// ------------------------------------------------------------------ épreuves
function lancerEpreuves() {
  const p = dlg.perso, f = fiche(p.id);
  if (f.etape === 0) dire('defi', p.defi); else { voix.stop(); texte.textContent = 'Reprenons où nous en étions.'; }
  epreuve(f.etape);
}
function epreuve(i) {
  const p = dlg.perso, f = fiche(p.id), e = p.epreuves[i]; dlg.erreurs = 0;
  const sel = []; // indices choisis (ordre conservé pour le type 'ordre')
  const opts = e.type === 'vf' ? ['Vrai', 'Faux'] : e.options;
  const multi = e.type === 'multi', ordre = e.type === 'ordre';
  const consigne = { choix: 'Une seule réponse', multi: 'Plusieurs réponses possibles', vf: 'Vrai ou faux ?', ordre: "Cliquez les étapes dans l'ordre" }[e.type];
  const boutons = opts.map((t, k) => el('button', { type: 'button', class: 'opt', onclick: () => choisir(k) }, [el('span', { class: 'rang' }, ordre ? '·' : String.fromCharCode(65 + k)), t]));
  const indice = el('p', { class: 'indice', hidden: true }, `Indice : ${e.indice}`);
  const btnValider = el('button', { type: 'button', class: 'btn primaire', disabled: true, onclick: verifier }, 'Valider');
  const btnEffacer = ordre ? el('button', { type: 'button', class: 'btn', onclick: () => { sel.length = 0; peindre(); } }, 'Recommencer') : null;

  function peindre() {
    boutons.forEach((b, k) => {
      const pos = sel.indexOf(k); b.classList.toggle('choisi', pos >= 0); b.setAttribute('aria-pressed', pos >= 0);
      if (ordre) b.firstChild.textContent = pos >= 0 ? pos + 1 : '·';
    });
    btnValider.disabled = ordre ? sel.length !== opts.length : sel.length === 0;
  }
  function choisir(k) {
    const pos = sel.indexOf(k);
    if (ordre) { if (pos >= 0) sel.splice(pos, 1); else sel.push(k); }
    else if (multi) { if (pos >= 0) sel.splice(pos, 1); else sel.push(k); }
    else { sel.length = 0; sel.push(k); }
    voix.bip(480, 0.04, 0.03); peindre();
  }
  function verifier() {
    let ok;
    if (e.type === 'vf') ok = (sel[0] === 0) === e.correct;
    else if (ordre) ok = sel.every((k, n) => k === e.correct[n]);
    else ok = sel.length === e.correct.length && e.correct.every(k => sel.includes(k));
    if (!ok) {
      dlg.erreurs++; etat.erreurs++; voix.erreur();
      const n = dlg.erreurs === 1 ? 0 : 1; dire(`non${n + 1}`, RELANCES[n]);
      if (dlg.erreurs >= 2) indice.hidden = false;
      if (ordre) { sel.length = 0; peindre(); }
      return;
    }
    voix.succes();
    boutons.forEach((b, k) => { b.disabled = true; if (sel.includes(k)) { b.classList.remove('choisi'); b.classList.add('juste'); } });
    f.etape = i + 1; if (!etat.notes.some(n => n.t === e.retenir)) etat.notes.push({ p: p.id, t: e.retenir });
    const dernier = f.etape >= p.epreuves.length;
    if (dernier) f.valide = true;
    sauver(); majMonde();
    const suite = el('button', { type: 'button', class: 'btn primaire', onclick: () => dernier ? conclure() : epreuve(i + 1) }, dernier ? 'Continuer ▸' : 'Question suivante ▸');
    barre.replaceChildren(el('span', { class: 'etape', style: 'color:#8fe6b6' }, '✓ Bonne réponse · ajouté au carnet'), el('span', { class: 'pousse' }), suite);
    indice.replaceWith(el('p', { class: 'retenir', html: `<b>À retenir</b>${e.retenir.replace(/</g, '&lt;')}` }));
    dire(`e${i + 1}`, e.bravo); suite.focus();
  }
  const barre = el('div', { class: 'barre' }, [btnValider, btnEffacer, el('button', { type: 'button', class: 'btn pousse', onclick: () => { voix.stop(); texte.textContent = `${p.nom} vous écoute.`; menu(); } }, '◂ Poser une question')]);
  zone.replaceChildren(
    el('p', { class: 'etape' }, `Question ${i + 1} sur ${p.epreuves.length} · ${consigne}`),
    el('p', { class: 'enonce' }, e.enonce),
    el('div', { class: 'grille' }, boutons), indice, barre,
  );
}
function conclure() {
  const p = dlg.perso;
  dire('fin', p.fin);
  const fini = restants(p.lieu).length === 0;
  toast(fini ? (p.lieu === 'accompagnement' ? 'La borne est prête : activez votre badge !' : 'Lieu terminé : la porte de sortie est déverrouillée.') : `${p.nom} : étape validée. Carnet mis à jour.`);
  zone.replaceChildren(el('div', { class: 'barre' }, [
    el('span', { class: 'etape', style: 'color:#8fe6b6' }, `✓ Étape validée avec ${p.nom}`), el('span', { class: 'pousse' }),
    el('button', { type: 'button', class: 'btn', onclick: () => { voix.stop(); texte.textContent = `${p.nom} vous écoute. Une autre question ?`; menu(); } }, 'Poser une autre question'),
    el('button', { type: 'button', class: 'btn primaire', onclick: fermerDialogue }, 'Poursuivre la visite ▸'),
  ]));
}

// ------------------------------------------------------------------ fenêtres
const fen = $('#fenetre');
function ouvrirFenetre(contenu, libelle) {
  mode = 'fenetre'; document.exitPointerLock?.(); touches.clear();
  fen.replaceChildren(el('button', { type: 'button', class: 'fermer', onclick: fermerFenetre }, 'Fermer · Échap'), ...contenu);
  fen.setAttribute('aria-label', libelle); fen.hidden = false; $('#voile').hidden = false; $('#invite').hidden = true; fen.scrollTop = 0;
  (fen.querySelector('[data-focus]') || fen.querySelector('.fermer')).focus();
}
function fermerFenetre() { fen.hidden = true; $('#voile').hidden = true; mode = 'jeu'; canvas.focus(); }
$('#voile').onclick = fermerFenetre;

function contacts() {
  return el('div', { class: 'fiches' }, ANNUAIRE.filter(a => a.prog.includes(etat.programme)).map(a => el('div', { class: 'fiche' + (a.prio ? ' prio' : '') }, [
    el('strong', {}, a.nom), el('em', {}, a.role), el('p', {}, a.quand),
    (a.email || a.tel || a.lieu) && el('p', {}, [a.lieu && `${a.lieu} · `, a.email && el('a', { href: `mailto:${a.email}` }, a.email), a.tel && ` · ${a.tel}`]),
  ])));
}
function notes() {
  if (!etat.notes.length) return el('p', { class: 'vide' }, 'Vos notes apparaîtront ici au fil de vos rencontres.');
  return el('ul', { class: 'notes' }, etat.notes.map(n => el('li', {}, [el('b', {}, `${PERSONNAGES.find(p => p.id === n.p).nom} · `), n.t])));
}
const frise = () => el('ol', { class: 'frise' }, CALENDRIER.map(c => el('li', {}, [el('b', {}, c.quand), el('div', {}, [c.quoi, el('small', {}, c.si)])])));

function ouvrirCarnet(onglet = 'notes') {
  if (mode !== 'jeu' && mode !== 'fenetre') return;
  const prog = etat.programme === 'bachelor' ? 'Bachelor' : 'Programme Grande École';
  const vues = {
    notes: ['Mes notes', notes],
    annuaire: ['Annuaire', () => valide('nora') ? contacts() : el('p', { class: 'vide' }, "Nora, à l'accueil, vous remettra l'annuaire.")],
    calendrier: ['Calendrier', frise],
    savoir: ['Bons à savoir', () => el('ul', { class: 'notes' }, BONS_A_SAVOIR.map(b => el('li', {}, b)))],
  };
  const corps = el('div');
  const barre = el('div', { class: 'onglets', role: 'tablist' }, Object.entries(vues).map(([k, [nom]]) => el('button', { type: 'button', role: 'tab', 'data-k': k, onclick: () => montrer(k) }, nom)));
  function montrer(k) { barre.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.k === k)); corps.replaceChildren(vues[k][1]()); }
  ouvrirFenetre([el('h2', { html: 'Mon carnet<span>.</span>' }), el('p', { class: 'sous' }, `${etat.prenom} · ${prog} · ${PERSONNAGES.filter(p => valide(p.id)).length} étape(s) validée(s) sur ${PERSONNAGES.length}`), barre, corps], 'Carnet');
  montrer(onglet);
}
function ouvrirAide() {
  if (mode !== 'jeu') return;
  ouvrirFenetre([
    el('h2', { html: 'Aide<span>.</span>' }), el('p', { class: 'sous' }, 'Aucune limite de temps, aucune pénalité : explorez à votre rythme.'),
    el('ul', { class: 'touches', html: `
      <li><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> ou <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> : avancer, reculer, pas de côté</li>
      <li><kbd>↑</kbd><kbd>↓</kbd> : avancer, reculer · <kbd>←</kbd><kbd>→</kbd> : tourner (tout le jeu est jouable au clavier)</li>
      <li>Souris : cliquez dans la scène pour regarder librement, <kbd>Échap</kbd> pour libérer le pointeur</li>
      <li><kbd>E</kbd> ou <kbd>Entrée</kbd> : parler à une personne, franchir une porte, utiliser la borne</li>
      <li><kbd>C</kbd> : carnet (notes, annuaire, calendrier) · <kbd>H</kbd> : cette aide · <kbd>Maj</kbd> : marcher vite</li>
      <li><kbd>Espace</kbd> pendant un dialogue : passer la réplique en cours</li>` }),
    el('h3', {}, 'Comment progresser ?'),
    el('p', { class: 'sous' }, "Chaque personne répond à vos questions, proposées ou libres, puis vous en pose quelques-unes. Les bonnes réponses s'ajoutent à votre carnet. Quand tout le monde est rencontré dans un lieu, la porte suivante s'ouvre."),
    el('h3', {}, 'Qualité graphique'),
    el('p', { class: 'sous' }, "En mode automatique, le jeu réduit lui-même les effets si l'ordinateur manque de puissance."),
    el('div', { class: 'barre', role: 'group', 'aria-label': 'Qualité graphique' }, [['auto', 'Automatique'], ['2', 'Élevée'], ['1', 'Standard'], ['0', 'Légère']].map(([c, nom]) => el('button', {
      type: 'button', class: 'btn' + (rendu.choix === c ? ' primaire' : ''), 'aria-pressed': rendu.choix === c,
      onclick: (e) => { rendu.choisir(c); for (const b of e.currentTarget.parentElement.children) { b.classList.toggle('primaire', b === e.currentTarget); b.setAttribute('aria-pressed', b === e.currentTarget); } },
    }, nom))),
    el('div', { class: 'barre' }, [el('button', { type: 'button', class: 'btn', onclick: () => { if (confirm('Effacer la progression et revenir à l’accueil ?')) { localStorage.removeItem(CLE); location.reload(); } } }, 'Recommencer une partie')]),
  ], 'Aide');
}

function ouvrirBorne() {
  const champs = BORNE.champs.map((c, i) => el('input', { inputmode: 'numeric', maxlength: 2, 'aria-label': c.label, 'data-focus': i === 0 ? true : null, autocomplete: 'off' }));
  const msg = el('p', { class: 'sous', role: 'status' }, 'Chaque nombre vous a été donné à voix haute. Un doute ? Vos notes sont dans le carnet.');
  const form = el('form', {
    onsubmit: (e) => {
      e.preventDefault();
      const ok = champs.map((c, i) => c.value.trim() === BORNE.champs[i].reponse);
      champs.forEach((c, i) => { c.classList.toggle('ok', ok[i]); c.classList.toggle('ko', !ok[i]); });
      if (ok.every(Boolean)) { etat.badge = true; etat.dateBadge = Date.now(); sauver(); majMonde(); voix.succes(); setTimeout(ouvrirFin, 700); }
      else { voix.erreur(); msg.textContent = `Ce n'est pas encore ça. Vérifiez le repère donné par ${BORNE.champs.filter((_, i) => !ok[i]).map(c => c.source).join(' et ')}.`; }
    },
  }, [
    el('div', { class: 'champs-borne' }, BORNE.champs.map((c, i) => el('label', {}, [el('span', {}, [c.label, el('small', {}, `Repère donné par ${c.source}`)]), champs[i]]))),
    el('div', { class: 'barre' }, [el('button', { class: 'btn primaire', type: 'submit' }, 'Activer mon badge'), el('button', { class: 'btn', type: 'button', onclick: () => ouvrirCarnet('notes') }, 'Consulter mes notes')]),
  ]);
  ouvrirFenetre([el('h2', { html: `${BORNE.titre}<span>.</span>` }), el('p', { class: 'sous' }, BORNE.consigne), form, msg], BORNE.titre);
}

function ouvrirFin() {
  const prog = etat.programme === 'bachelor' ? 'Bachelor' : 'Programme Grande École';
  const date = new Date(etat.dateBadge || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const saisie = { prenom: etat.prenom === 'Vous' ? '' : etat.prenom, nom: etat.nom || '' };
  const nomComplet = () => [saisie.prenom, saisie.nom.toUpperCase()].filter(Boolean).join(' ') || 'Prénom NOM';
  const titulaire = el('p', { class: 'nom' }, nomComplet());
  const champ = (cle, libelle, max) => el('label', {}, [el('span', {}, libelle), el('input', {
    value: saisie[cle], maxlength: max, autocomplete: 'off', placeholder: libelle, 'data-focus': cle === 'nom' ? true : null,
    oninput: (e) => { saisie[cle] = e.currentTarget.value.trim().slice(0, max); if (cle === 'nom' || saisie.prenom) etat[cle] = saisie[cle]; titulaire.textContent = nomComplet(); sauver(); },
  })]);
  ouvrirFenetre([
    el('p', { class: 'sur' }, 'Parcours terminé'), el('h2', { html: 'Votre attestation<span>.</span>' }),
    el('div', { class: 'badge attestation' }, [
      el('img', { src: 'assets/logo-imtbs.png', alt: 'Institut Mines-Télécom Business School' }),
      el('div', {}, [
        el('p', { class: 'intitule' }, 'Attestation de parcours'), titulaire,
        el('p', { class: 'ligne' }, `a suivi le parcours « ${META.titre} · ${META.sousTitre} » et activé son badge d’apprenti·e.`),
        el('p', { class: 'ligne' }, `${prog} · ${META.annee} · le ${date}`),
        el('span', { class: 'etat' }, '✓ Badge d’alternance activé'),
      ]),
    ]),
    el('div', { class: 'identite sans-impression' }, [champ('prenom', 'Prénom', 24), champ('nom', 'Nom', 40)]),
    el('div', { class: 'barre sans-impression' }, [el('button', { type: 'button', class: 'btn primaire', onclick: () => print() }, 'Imprimer ou enregistrer en PDF'), el('button', { type: 'button', class: 'btn', onclick: fermerFenetre }, 'Continuer à explorer')]),
    el('h3', {}, `Mes contacts · ${prog}`), contacts(),
    el('p', { class: 'sous', style: 'margin-top:18px' }, `Vos notes et vos dates clés restent disponibles dans le carnet. Contacts à confirmer auprès du Career Center (${META.contact}).`),
  ], 'Attestation');
}

// ------------------------------------------------------------------ boucle
const horloge = new THREE.Clock();
const vTmp = new THREE.Vector3();
let decalage = 0;
function boucle() {
  const brut = horloge.getDelta(), dt = Math.min(brut, 0.05);
  if (mode === 'jeu') {
    etat.temps += dt;
    const t = (c) => touches.has(c);
    const av = (t('KeyW') || t('ArrowUp') ? 1 : 0) - (t('KeyS') || t('ArrowDown') ? 1 : 0);
    const co = (t('KeyD') ? 1 : 0) - (t('KeyA') ? 1 : 0);
    joueur.lacet += ((t('ArrowLeft') ? 1 : 0) - (t('ArrowRight') ? 1 : 0)) * dt * 2.1;
    if (av || co) {
      const v = (t('ShiftLeft') || t('ShiftRight') ? 5.2 : 3.3) * dt / Math.hypot(av, co);
      const s = Math.sin(joueur.lacet), c = Math.cos(joueur.lacet);
      deplacer(joueur.pos, (-s * av + c * co) * v, (-c * av - s * co) * v, monde.colliders);
      joueur.pos.y = HAUTEUR + Math.sin(performance.now() / 95) * 0.018;
    }
    const n = chercherCible();
    if (n !== cible || n) {
      cible = n; const inv = $('#invite');
      if (n) { const l = libelleCible(n); inv.innerHTML = `<kbd>E</kbd>${l.texte}`; inv.classList.toggle('verrou', !l.ok); inv.hidden = false; } else inv.hidden = true;
    }
  } else if (mode === 'dialogue' && dlg) {
    // la caméra se tourne vers l'interlocuteur
    const h = dlg.avatar.tetePos, dx = h.x - joueur.pos.x, dz = h.z - joueur.pos.z;
    const lacet = Math.atan2(-dx, -dz), tang = Math.atan2(h.y - 0.06 - joueur.pos.y, Math.hypot(dx, dz));
    let d = lacet - joueur.lacet; d = Math.atan2(Math.sin(d), Math.cos(d));
    joueur.lacet += d * Math.min(1, dt * 4); joueur.tangage += (tang - joueur.tangage) * Math.min(1, dt * 4);
  }
  // en dialogue, l'image est décalée vers le haut pour que le visage reste visible au-dessus du panneau
  decalage += ((mode === 'dialogue' ? 0.26 : 0) - decalage) * Math.min(1, dt * 4);
  // en dialogue, le cadre se resserre sur l'interlocuteur
  const focale = mode === 'dialogue' ? 44 : 66;
  if (Math.abs(camera.fov - focale) > 0.05) { camera.fov += (focale - camera.fov) * Math.min(1, dt * 3.5); camera.updateProjectionMatrix(); }
  if (decalage > 0.002) camera.setViewOffset(innerWidth, innerHeight, 0, decalage * innerHeight, innerWidth, innerHeight); else if (camera.view) camera.clearViewOffset();
  camera.position.copy(joueur.pos); camera.rotation.set(joueur.tangage, joueur.lacet, 0);
  const niveau = voix.niveau();
  for (const a of avatars) {
    const proche = vTmp.copy(a.groupe.position).setY(HAUTEUR).distanceTo(joueur.pos) < 6;
    a.maj(dt, Boolean(dlg && dlg.avatar === a && voix.active), niveau, joueur.pos, proche);
    a.etiquette.visible = !(dlg && dlg.avatar === a) && vTmp.distanceTo(joueur.pos) < 9;
  }
  monde.maj(dt);
  musique.maj(dt, mode !== 'dialogue');
  rendu.rendre(mode === 'accueil' || brut > 0.5 ? 0 : brut);
  requestAnimationFrame(boucle);
}

// ------------------------------------------------------------------ démarrage
async function demarrer(reprise) {
  voix.deverrouiller(); musique.deverrouiller(reprise ? etat.lieu : 'campus');
  $('#accueil').hidden = true; $('#hud').hidden = false; $('#viseur').hidden = false; $('#souris').hidden = false;
  if (!reprise) { sauver(); await allerA('campus'); } else { construireLieu(etat.lieu); mode = 'jeu'; canvas.focus(); }
}
$('#formDepart').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  etat = etatInitial(); etat.prenom = String(f.get('prenom')).trim().slice(0, 24) || 'Vous'; etat.programme = f.get('programme') === 'bachelor' ? 'bachelor' : 'pge';
  demarrer(false);
});
$('#btnReprendre').onclick = () => { etat = lireSauvegarde() || etat; demarrer(true); };
$('#btnCarnet').onclick = () => ouvrirCarnet(); $('#btnAide').onclick = ouvrirAide;
$('#btnSon').onclick = (e) => { voix.muet = !voix.muet; if (voix.muet) voix.stop(); e.currentTarget.textContent = voix.muet ? 'Son coupé' : 'Son activé'; e.currentTarget.setAttribute('aria-pressed', !voix.muet); };
$('#btnMusique').onclick = (e) => { const a = musique.basculer(); e.currentTarget.textContent = a ? 'Musique activée' : 'Musique coupée'; e.currentTarget.setAttribute('aria-pressed', a); };
if (!musique.active) { $('#btnMusique').textContent = 'Musique coupée'; $('#btnMusique').setAttribute('aria-pressed', false); }
addEventListener('beforeunload', () => { if (mode !== 'accueil') sauver(); }); setInterval(() => { if (mode !== 'accueil') sauver(); }, 15000);

(async function init() {
  const s = lireSauvegarde();
  if (s?.prenom) { $('#btnReprendre').hidden = false; $('#btnReprendre').textContent = `Reprendre la partie de ${s.prenom}`; $('#prenom').value = s.prenom; }
  // décor d'accueil : le hall, vu depuis l'entrée
  etat.lieu = 'campus'; construireLieu('campus'); joueur.pos.set(3.6, 1.9, 7.4); joueur.lacet = 0.42; joueur.tangage = -0.05;
  $('#chargement').hidden = true;
  boucle();
  const [nVoix] = await Promise.all([
    voix.init(),
    fetch(`${CONFIG.relais}/api/etat`).then(r => r.ok ? r.json() : {}).then(d => { direct = Boolean(d.direct); }).catch(() => { direct = false; }),
  ]);
  console.info(`Premier jour · ${nVoix} voix pré-générées · questions libres : ${direct ? 'oui' : 'non'}`);
})();

// accès pour les tests automatisés
window.__jeu = { get etat() { return etat; }, joueur, monde, get mode() { return mode; }, get cible() { return cible; }, allerA, interagir, majMonde, voix, musique, rendu, scene, camera, get direct() { return direct; } };
