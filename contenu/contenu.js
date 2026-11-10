// ============================================================================
// PREMIER JOUR · contenu du jeu
// Tout le contenu pédagogique est ici : personnages, répliques, épreuves, carnet.
// Source : PropositionMarine2/.../content/content.json (L'Entreprise Mystère, 2026-2027).
// Les répliques parlées évitent le point médian pour rester naturelles à l'oral.
// Après toute modification d'une réplique : relancer `node outils/generer-voix.mjs`.
// ============================================================================

export const META = {
  titre: 'Premier jour',
  sousTitre: "L'alternance en immersion",
  annee: '2026-2027',
  contact: 'career-center@imt-bs.eu',
  code: '482845',
  modeleVoix: 'google/gemini-3.8-flash-tts',
  modeleVoixDirect: 'google/gemini-3.8-flash-lite-tts',
  modeleTexte: 'google/gemini-3.8-flash',
};

export const LIEUX = {
  campus: {
    nom: 'Campus IMT-BS',
    accroche: 'Le hall du campus, à Évry-Courcouronnes',
    objectif: 'Rencontrez Nora à l’accueil, puis faites le tour du campus.',
    suite: 'nexus',
  },
  nexus: {
    nom: 'Entreprise Nexus',
    accroche: 'Votre entreprise d’accueil, premier jour en open space',
    objectif: 'Présentez-vous à Samuel, Léa et Marc.',
    suite: 'accompagnement',
  },
  accompagnement: {
    nom: 'Espace d’accompagnement',
    accroche: 'Le Career Center, pour les situations délicates',
    objectif: 'Échangez avec Hélène et Yanis, puis activez votre badge à la borne.',
    suite: null,
  },
};

// Types d'épreuve : 'choix' (une réponse), 'multi' (plusieurs), 'vf' (vrai/faux), 'ordre' (remise en ordre).
// `bravo` est la réplique parlée de validation ; `retenir` est la note ajoutée au carnet.

export const PERSONNAGES = [
  // ------------------------------------------------------------------ CAMPUS
  {
    id: 'nora', nom: 'Nora', role: 'Accueil du campus', lieu: 'campus',
    voix: 'Aoede', ton: 'chaleureuse, souriante, dynamique',
    look: { peau: '#e8b796', cheveux: '#2b1d16', coiffure: 'carre', tenue: '#AD1D89', bas: '#23232b', carrure: 'f', style: 'veste', chemise: '#ffffff', frange: true, iris: '#3d2616' },
    accueil: "Bonjour et bienvenue à IMT Business School ! Moi, c'est Nora, de l'accueil. C'est votre premier jour d'alternance, n'est-ce pas ? Votre badge n'est pas encore activé. Pour l'activer, il va falloir rencontrer les bonnes personnes, ici sur le campus, puis dans votre entreprise. Posez-moi vos questions, je suis là pour ça.",
    questions: [
      { q: 'Où suis-je exactement ?', r: "Vous êtes dans le hall du campus d'Évry-Courcouronnes. Sur votre gauche, le bureau A08 du pôle alternance. Sur votre droite, la salle de cours B12 et le bureau de la coordination pédagogique. Et la porte vitrée du fond mène vers votre entreprise d'accueil, Nexus." },
      { q: 'Comment activer mon badge ?', r: "Chaque personne que vous rencontrez vous posera quelques questions sur la vie en alternance. Écoutez bien, interrogez-les, puis répondez. Aucune pénalité en cas d'erreur, vous pouvez toujours réessayer. Au bout du parcours, une borne activera votre badge." },
      { q: 'À quoi sert le carnet ?', r: "Le carnet rassemble l'annuaire, le calendrier de l'année et tout ce que vous aurez retenu en chemin. Vous l'ouvrez quand vous voulez avec la touche C. Et il vous servira bien après aujourd'hui." },
    ],
    defi: "Avant de vous laisser circuler, une petite question pour partir du bon pied.",
    epreuves: [
      {
        type: 'choix',
        enonce: "C'est votre premier jour à l'école et vous ne savez pas à qui vous adresser pour une question sur votre alternance. Vers qui allez-vous en premier ?",
        options: ['Votre responsable de programme', 'Votre coordinatrice pédagogique', 'Le pôle alternance', "La direction de l'école"],
        correct: [2],
        indice: "Regardez les panneaux du hall : un bureau porte la mention « 1er interlocuteur ».",
        bravo: "Exactement. Pour toute question liée à l'apprentissage, le pôle alternance est votre premier interlocuteur, avant les coordinatrices et les enseignants. Il est au bureau A08, juste là, sur votre gauche.",
        retenir: "Toute question sur l'apprentissage : d'abord le pôle alternance (bureau A08, apprentissage@imt-bs.eu).",
      },
    ],
    fin: "Les portes du campus sont ouvertes. Allez voir Karim au pôle alternance, Claire en salle B12 et Inès à la coordination. J'ai glissé l'annuaire dans votre carnet. Bonne première journée !",
  },
  {
    id: 'karim', nom: 'Karim', role: 'Conseiller du pôle alternance · bureau A08', lieu: 'campus',
    voix: 'Achird', ton: 'posé, bienveillant, rassurant',
    look: { peau: '#b98157', cheveux: '#15110f', coiffure: 'court', tenue: '#1f3a5f', bas: '#2a2a33', barbe: true, carrure: 'm', style: 'veste', chemise: '#dfe8f2', iris: '#2e1c10', volume: 0.035 },
    accueil: "Bonjour, entrez ! Karim, du pôle alternance. Ici, on répond à toutes vos questions sur votre statut d'apprenti. Contrat, absences, rythme, difficultés : commencez toujours par nous. Qu'est-ce que je peux vous expliquer ?",
    questions: [
      { q: 'Suis-je étudiant ou salarié ?', r: "Les deux à la fois, et c'est toute la particularité de l'alternance. Votre employeur finance votre formation et vous verse un salaire, y compris pendant vos semaines de cours. Donc même à l'école, vous restez salarié, avec les mêmes obligations : ponctualité, tenue, comportement." },
      { q: "Je n'ai pas encore signé de contrat. Que faire ?", r: "Pas de panique, mais il ne faut pas attendre. Activez le statut de stagiaire de la formation professionnelle, le statut S F P, auprès de votre référente au C F A. Sans lui, vous n'êtes pas couvert. La date limite, c'est fin octobre en Bachelor et mi-novembre en programme Grande École." },
      { q: 'Et si je traverse une période difficile ?', r: "Vous n'êtes jamais seul. L'école a tout ce qu'il faut en interne : le pôle d'accompagnement étudiant, l'infirmière du campus, et une référente handicap pour les apprentis. Le bon réflexe, c'est d'en parler tôt, sans attendre que les difficultés s'accumulent." },
    ],
    defi: "Voyons si les bases sont claires. Trois questions rapides.",
    epreuves: [
      {
        type: 'vf',
        enonce: "Pendant vos semaines de formation à l'école, vous êtes toujours considéré comme salarié de votre entreprise.",
        correct: true,
        indice: 'Qui vous verse un salaire, même pendant les cours ?',
        bravo: "Vrai. Même en cours, vous êtes salarié. Votre employeur paie la formation et votre salaire, et il est informé de vos retards et de vos absences injustifiées.",
        retenir: "En semaine école, je reste salarié : mêmes obligations qu'en entreprise.",
      },
      {
        type: 'choix',
        enonce: 'Vous devez vous absenter pendant une semaine de cours. Qui peut valider ou refuser cette absence ?',
        options: ["Votre employeur et le pôle alternance, ensemble", "L'enseignant du cours, s'il donne son accord", 'Votre coordinatrice pédagogique, seule', 'Vous-même, si le motif vous paraît légitime'],
        correct: [0],
        indice: 'Une absence en semaine école engage votre contrat de travail et votre formation.',
        bravo: "Oui. Seuls votre employeur et le pôle alternance peuvent valider une absence. L'accord oral d'un enseignant n'a aucune valeur administrative. En cas de doute, demandez-nous avant de vous engager.",
        retenir: "Absence en semaine école : validée par l'employeur ET le pôle alternance, jamais par un simple accord oral.",
      },
      {
        type: 'multi',
        enonce: "Santé, moral, situation personnelle ou financière : à qui pouvez-vous vous adresser dans l'école ? Plusieurs réponses.",
        options: ["Le pôle de coordination pédagogique et d'accompagnement étudiant", "L'infirmière du campus", "Personne : ces sujets ne concernent pas l'école", 'La référente handicap, si un aménagement est nécessaire'],
        correct: [0, 1, 3],
        indice: "Trois interlocuteurs existent en interne. Le carnet les liste dans l'annuaire.",
        bravo: "Parfait. Le pôle d'accompagnement étudiant, l'infirmière et la référente handicap sont là pour vous. Signalez votre situation le plus tôt possible.",
        retenir: "En cas de difficulté : accompagnement étudiant, infirmière, référente handicap. J'en parle tôt.",
      },
    ],
    fin: "Vous avez les bons réflexes. Et souvenez-vous : au moindre doute, le bureau A08 ou un mail au pôle alternance.",
  },
  {
    id: 'claire', nom: 'Claire', role: 'Enseignante · salle B12', lieu: 'campus',
    voix: 'Kore', ton: 'claire, précise, pédagogue',
    look: { peau: '#f0c9a8', cheveux: '#8a4b2a', coiffure: 'chignon', tenue: '#0f7c8c', bas: '#2d2d36', lunettes: true, carrure: 'f', style: 'pull', iris: '#4f6b3a' },
    accueil: "Bonjour, installez-vous. Je suis Claire, j'enseigne le marketing. Avant de commencer chaque cours, je vous demanderai d'émarger. C'est votre preuve de présence, et elle compte autant pour l'école que pour votre employeur.",
    questions: [
      { q: "Comment fonctionne l'émargement ?", r: "Tout passe par l'application Edusign. Vous ouvrez l'appli, vous cliquez sur le cours, puis sur Sign and Scan. Vous apposez votre signature officielle, et vous scannez le Q R code que j'affiche à l'écran. Et cela, à chaque cours, au moment où je le demande." },
      { q: "Et si j'oublie d'émarger ?", r: "Sans émargement valide, vous êtes noté absent. L'absence est signalée à votre employeur et peut entraîner une retenue sur salaire. Même chose si la signature n'est pas conforme : un dessin ou des initiales, et l'émargement peut être invalidé." },
      { q: 'Si le cours passe en visio, puis-je rester chez moi ?', r: "Non. Même si un cours bascule en visio à la dernière minute, vous devez être présent à l'école, dans la salle prévue. À domicile, vous ne seriez pas couvert en cas d'accident." },
    ],
    defi: "Le cours va commencer. Montrez-moi que vous savez émarger.",
    epreuves: [
      {
        type: 'choix',
        enonce: 'Sur quelle plateforme devez-vous émarger pour justifier votre présence en cours ?',
        options: ['Moodle', 'Edusign', '1 Jeune 1 Alternance', 'Mon espace CFA'],
        correct: [1],
        indice: "Le nom est affiché sur l'écran de la salle.",
        bravo: "Edusign, bien sûr. À chaque cours, au moment où l'intervenant le demande.",
        retenir: "J'émarge sur Edusign à chaque cours, quand l'intervenant le demande.",
      },
      {
        type: 'ordre',
        enonce: "Remettez dans l'ordre les étapes de l'émargement.",
        options: ['Scanner le QR code affiché par l’enseignant', 'Cliquer sur le cours, puis « Sign and Scan »', "Ouvrir l'application Edusign", 'Apposer sa signature officielle'],
        correct: [2, 1, 3, 0],
        indice: "On ouvre l'appli, on choisit le cours, on signe, et on termine par le QR code.",
        bravo: "C'est le bon enchaînement : l'appli, le cours, la signature, puis le Q R code.",
        retenir: 'Edusign : ouvrir l’appli → le cours → « Sign and Scan » → signature officielle → QR code.',
      },
      {
        type: 'vf',
        enonce: "Sur Edusign, vous pouvez signer avec vos initiales ou un petit dessin à la place d'une vraie signature.",
        correct: false,
        indice: 'On parle de signature « officielle ».',
        bravo: "Faux, en effet. C'est une signature officielle. Ni dessin, ni initiales, ni simple OK. Sinon l'émargement peut être invalidé et l'absence signalée à l'employeur.",
        retenir: 'Ma signature Edusign est une signature officielle : pas de dessin ni d’initiales.',
      },
    ],
    fin: "Très bien, vous êtes prêt pour votre premier cours. N'oubliez jamais votre téléphone chargé !",
  },
  {
    id: 'ines', nom: 'Inès', role: 'Coordinatrice pédagogique', lieu: 'campus',
    voix: 'Leda', ton: 'attentive, directe, à l’écoute',
    look: { peau: '#c98f6b', cheveux: '#1b1412', coiffure: 'long', tenue: '#f2f2f5', bas: '#3a2a4a', carrure: 'f', style: 'chemise', jupe: true, iris: '#3a2414' },
    accueil: "Bonjour ! Inès, coordinatrice pédagogique. Je suis votre contact pour le suivi au quotidien : absences, retards, justificatifs. Autant bien connaître la procédure avant d'en avoir besoin.",
    questions: [
      { q: 'Je suis malade un matin de cours. Que faire ?', r: "D'abord, prévenez-moi, puis prévenez votre employeur, le plus tôt possible. Ensuite, consultez un médecin en précisant bien que vous êtes salarié : il vous faut un arrêt de travail, pas un simple certificat médical. Et vous le transmettez sur Edusign et à votre employeur dans le délai prévu." },
      { q: 'Puis-je prendre un rendez-vous médical en semaine école ?', r: "Un rendez-vous chez un spécialiste ne justifie pas une absence en cours. Prenez-le plutôt sur une semaine en entreprise, en accord avec votre employeur. En revanche, une convocation officielle, à la préfecture par exemple, se transmet à votre coordinatrice." },
      { q: 'Et si j’arrive en retard en cours ?', r: "Prévenez votre coordinatrice et fournissez un justificatif. Rappelez-vous qu'en semaine école vous êtes salarié : tout retard ou absence injustifiée est signalé à votre employeur." },
    ],
    defi: "Mettons cela en pratique avec trois situations.",
    epreuves: [
      {
        type: 'ordre',
        enonce: "Vous êtes malade ce matin et ne pouvez pas venir en cours. Remettez ces actions dans le bon ordre.",
        options: ["Transmettre l'arrêt de travail via Edusign", 'Prévenir votre employeur', 'Consulter un médecin et demander un ARRÊT DE TRAVAIL', 'Prévenir votre coordinatrice pédagogique'],
        correct: [3, 1, 2, 0],
        indice: "Premier réflexe : prévenir l'école, puis l'employeur, avant toute autre démarche.",
        bravo: "C'est cela : la coordinatrice, l'employeur, le médecin pour un arrêt de travail, puis la transmission sur Edusign.",
        retenir: "Malade : prévenir la coordinatrice → l'employeur → médecin (ARRÊT DE TRAVAIL, pas un certificat) → Edusign.",
      },
      {
        type: 'choix',
        enonce: "Sous quel délai l'arrêt de travail doit-il être transmis sur Edusign et à l'employeur ?",
        options: ['24 heures', '48 heures', '72 heures', 'Une semaine'],
        correct: [1],
        indice: 'Deux jours, pas un de plus.',
        bravo: "Quarante-huit heures. Passé ce délai, l'absence peut être considérée comme injustifiée, avec une retenue sur salaire possible. Retenez bien ce nombre, quarante-huit : il vous servira pour activer votre badge.",
        retenir: "Arrêt de travail à transmettre sous 48 h à l'école (Edusign) et à l'employeur. ★ Repère badge : 48.",
        repere: '48',
      },
      {
        type: 'choix',
        enonce: 'Vous avez rendez-vous chez un spécialiste un mardi, en pleine semaine école. Que faites-vous ?',
        options: ["J'y vais : un rendez-vous médical justifie toujours une absence", 'Je déplace le rendez-vous sur une semaine en entreprise', "Je demande l'accord de l'enseignant du cours", "J'émarge puis je pars discrètement"],
        correct: [1],
        indice: 'Un rendez-vous de confort ne justifie pas une absence en cours.',
        bravo: "Oui. Un rendez-vous chez un spécialiste ne justifie pas une absence : on le place sur une semaine en entreprise, avec l'accord de l'employeur.",
        retenir: 'Rendez-vous médicaux non urgents : sur une semaine entreprise, pas en semaine école.',
      },
    ],
    fin: "Vous voilà au point sur les absences. Ma porte reste ouverte toute l'année.",
  },

  // ------------------------------------------------------------------- NEXUS
  {
    id: 'sam', nom: 'Samuel', role: 'Votre tuteur en entreprise · Nexus', lieu: 'nexus',
    voix: 'Orus', ton: 'franc, énergique, sympathique',
    look: { peau: '#8d5a3b', cheveux: '#0f0c0b', coiffure: 'court', tenue: '#e9eaee', bas: '#1d2a3a', carrure: 'm', style: 'chemise', manches: 'retroussees', iris: '#2a180e', volume: 0.012, taille: 1.02 },
    accueil: "Ah, vous voilà ! Bienvenue chez Nexus. Samuel, je suis votre tuteur en entreprise. Désolé pour ce matin, j'étais en déplacement. C'est moi qui vous accompagne sur vos missions toute l'année. Par quoi voulez-vous commencer ?",
    questions: [
      { q: 'Qu’attendez-vous de moi au quotidien ?', r: "De la ponctualité, d'abord, et le respect des horaires de l'équipe. Posez des questions, prenez des notes pendant les briefings, et dites-moi quand une tâche est terminée pour en demander une autre. Le premier jour, une tenue professionnelle, ensuite vous vous adapterez aux codes de la maison." },
      { q: "C'est quoi, le contrat d'objectif ?", r: "C'est le document qui fixe vos missions pour l'année. Vous le remplissez sur la plateforme Un Jeune Une Alternance, dans le carnet de liaison, après avoir fait le point avec moi. Il est signé par trois personnes : vous, moi, et votre tuteur école. Et il doit être signé avant la mi-novembre." },
      { q: 'Et si un imprévu me met en retard ?', r: "Ça arrive à tout le monde. Ce qui compte, c'est de me prévenir tout de suite, et de proposer de rattraper le temps manqué. C'est ça, le professionnalisme." },
    ],
    defi: "Je vous propose trois mises en situation, comme sur le terrain.",
    epreuves: [
      {
        type: 'choix',
        enonce: "Premier jour en entreprise : votre tuteur est absent toute la journée et personne ne vous a expliqué vos missions. Que faites-vous ?",
        options: ["J'attends que quelqu'un vienne me voir", 'Je contacte le pôle alternance pour signaler le problème', 'Je vais me présenter au manager ou aux RH et je demande les consignes', 'Je rentre chez moi, rien n’est prévu'],
        correct: [2],
        indice: 'Quelle attitude montre votre proactivité dès le premier jour ?',
        bravo: "Voilà, de l'initiative ! On va se présenter et on demande les consignes. Le pôle alternance, c'est un recours si la situation dure plusieurs jours, pas le premier réflexe.",
        retenir: "Tuteur absent le premier jour : je me présente au manager ou aux RH et je demande les consignes.",
      },
      {
        type: 'multi',
        enonce: "Un accident sur la route : vous allez arriver en retard au travail. Que faites-vous ? Plusieurs réponses.",
        options: ['Je préviens mon tuteur de ce retard', "En arrivant, je m'excuse et propose de rattraper le temps manqué", "Je ne préviens pas, je m'excuserai en arrivant", 'Je ne fais rien'],
        correct: [0, 1],
        indice: 'Deux bons réflexes : prévenir tout de suite, puis proposer une solution.',
        bravo: "Exactement : prévenir, puis proposer de rattraper. Un retard reste un retard, même de dix minutes, mais il se prévient.",
        retenir: 'Retard : je préviens immédiatement et je propose de rattraper.',
      },
      {
        type: 'ordre',
        enonce: "Remettez dans l'ordre les étapes pour remplir votre contrat d'objectif.",
        options: ['Remplir les informations demandées', 'Se connecter sur 1 Jeune 1 Alternance', "Signer le contrat d'objectif avant la mi-novembre", 'Faire le point avec son tuteur entreprise sur les missions', 'Aller dans « Carnet de liaison » → « Contrat d’objectif »'],
        correct: [1, 4, 3, 0, 2],
        indice: 'Tout commence par la connexion à la plateforme, et tout finit par la signature.',
        bravo: "Parfait. La plateforme, le carnet de liaison, le point avec moi, la saisie, puis les signatures avant la mi-novembre.",
        retenir: "Contrat d'objectif : 1 Jeune 1 Alternance → Carnet de liaison → point avec le tuteur → saisie → signature avant la mi-novembre (3 signataires).",
      },
    ],
    fin: "Bien joué. On va faire du bon travail ensemble. Passez voir Léa aux ressources humaines et Marc, notre manager.",
  },
  {
    id: 'lea', nom: 'Léa', role: 'Ressources humaines · Nexus', lieu: 'nexus',
    voix: 'Sulafat', ton: 'chaleureuse, professionnelle, précise',
    look: { peau: '#f3d2b8', cheveux: '#c9a25a', coiffure: 'long', tenue: '#7a2e8e', bas: '#26262e', carrure: 'f', style: 'veste', chemise: '#f4f0ea', iris: '#5f7f96' },
    accueil: "Bonjour et bienvenue dans l'équipe ! Léa, des ressources humaines. Contrat, bulletin de salaire, congés, avantages : c'est avec moi que ça se passe. Vous avez des questions pratiques ?",
    questions: [
      { q: 'À combien de congés ai-je droit ?', r: "Comme tout salarié, deux jours et demi de congés payés par mois travaillé. Vous avez en plus cinq jours de congé pour réviser, sur toute la durée du contrat. Attention, l'employeur peut imposer une partie des dates." },
      { q: 'Ai-je droit aux avantages de l’entreprise ?', r: "Oui, vous bénéficiez des mêmes avantages que vos collègues : restauration, transport, culture, selon ce qui existe chez nous. Côté école, vous pouvez aussi demander la carte d'étudiant des métiers auprès du pôle alternance." },
      { q: 'Qui me paie pendant les semaines de cours ?', r: "C'est nous, votre employeur. Votre salaire est versé tous les mois, que vous soyez en entreprise ou en formation. C'est pour cela que les absences injustifiées en cours peuvent apparaître sur votre bulletin." },
    ],
    defi: "Trois points administratifs à vérifier ensemble.",
    epreuves: [
      {
        type: 'choix',
        enonce: "Vous venez de signer votre contrat d'apprentissage. Que devez-vous faire pour votre couverture sociale ?",
        options: ["Rien : l'école met mon dossier à jour automatiquement", 'Mettre à jour moi-même mon statut sur ameli.fr', 'Attendre un courrier de la Sécurité sociale', 'Demander à mon employeur de faire la démarche'],
        correct: [1],
        indice: 'C’est une démarche personnelle.',
        bravo: "Oui, c'est à vous de mettre à jour votre statut sur Ameli. Personne ne le fera à votre place, et sans cela vous risquez d'être mal couvert.",
        retenir: 'Dès la signature du contrat : je mets à jour mon statut de salarié sur ameli.fr.',
      },
      {
        type: 'multi',
        enonce: 'Vous souhaitez poser des congés. Comment faire ? Plusieurs réponses.',
        options: ["Je les pose directement dans l'outil interne, sans en parler à personne", 'Je vérifie avec mes collègues que la période convient', "J'anticipe en demandant l'accord de mon responsable"],
        correct: [1, 2],
        indice: "Deux validations comptent : votre responsable et l'équipe.",
        bravo: "C'est cela : on en parle à l'équipe, on demande l'accord du responsable, et on attend la confirmation officielle avant de poser les jours.",
        retenir: "Congés : j'en parle à l'équipe, j'obtiens l'accord de mon responsable, j'attends la validation officielle.",
      },
      {
        type: 'ordre',
        enonce: "Vous n'avez pas reçu le bon montant de rémunération ce mois-ci. Dans quel ordre agir ?",
        options: ['Contacter le pôle alternance si la situation persiste', 'Contacter le tuteur entreprise ou les RH', 'Vérifier mon bulletin de salaire', 'Contacter ma référente au CFA', 'Garder une trace écrite de toutes mes démarches'],
        correct: [2, 1, 0, 3, 4],
        indice: 'On commence toujours par le bulletin, et on termine par la trace écrite.',
        bravo: "Très bien. Le bulletin d'abord, puis le tuteur ou les R H, le pôle alternance, votre référente au C F A, en gardant toujours une trace écrite.",
        retenir: 'Rémunération incomplète : bulletin → tuteur/RH → pôle alternance → référente CFA, avec une trace écrite.',
      },
    ],
    fin: "Tout est en ordre de mon côté. N'hésitez pas à passer me voir, mon bureau est toujours ouvert.",
  },
  {
    id: 'marc', nom: 'Marc', role: 'Manager de l’équipe · Nexus', lieu: 'nexus',
    voix: 'Charon', ton: 'assuré, exigeant mais juste',
    look: { peau: '#e3b38f', cheveux: '#5b5b60', coiffure: 'court', tenue: '#2b2f3a', bas: '#1b1b20', barbe: true, carrure: 'm', style: 'veste', chemise: '#ffffff', iris: '#4a5a66', degarni: true },
    accueil: "Bonjour. Marc, je dirige l'équipe. Ravi de vous compter parmi nous. On a de beaux projets cette année, et parfois des urgences. Je préfère qu'on se dise les choses clairement dès le départ.",
    questions: [
      { q: "Le rythme d'alternance peut-il changer ?", r: "Le rythme est fixé dans votre contrat. Je ne peux pas le modifier de mon côté. Si j'ai un besoin exceptionnel, je dois faire une demande écrite au pôle alternance, au moins une semaine avant, et c'est l'école qui décide." },
      { q: 'Que se passe-t-il en cas de manquement ?', r: "Les manquements de comportement, d'assiduité ou la fraude sont transmis au C F A par l'école. Il existe quatre niveaux de sanction : l'avertissement, le blâme, l'exclusion temporaire jusqu'à cinq jours, et l'exclusion définitive. Et en cas de plagiat, c'est zéro." },
      { q: 'Un conseil pour bien m’intégrer ?', r: "Soyez curieux et fiable. Tenez vos horaires, communiquez sur ce que vous faites, et n'attendez pas d'être bloqué pour demander de l'aide. La réputation se construit dans les premières semaines." },
    ],
    defi: "Trois situations que j'ai déjà vécues avec des alternants.",
    epreuves: [
      {
        type: 'choix',
        enonce: "Votre manager vous demande de rester tard ce soir pour aider l'équipe sur un gros dossier. Comment réagissez-vous ?",
        options: ['Je refuse, même exceptionnellement', "Je reste avec l'équipe pour aider sur ce dossier", "Je pars sans rien dire", 'Je reste tard systématiquement, sans jamais poser de limite'],
        correct: [1],
        indice: "Un coup de main ponctuel n'est pas un rythme systématique.",
        bravo: "Bonne réponse. Rester exceptionnellement, c'est de l'esprit d'équipe. Mais si cela devient habituel, il faut en parler plutôt que de laisser la situation s'installer.",
        retenir: 'Rester tard : oui exceptionnellement ; si cela devient habituel, j’en parle.',
      },
      {
        type: 'multi',
        enonce: "Nexus veut vous garder toute une semaine alors que c'est votre semaine école, pour un projet urgent. Que faites-vous ? Plusieurs réponses.",
        options: ["J'accepte pour faire bonne impression", 'Je refuse catégoriquement, sans explication', "J'explique que le planning est contractuel et j'alerte le pôle alternance", 'Je rappelle qu’il faut une demande écrite au pôle alternance, au moins une semaine avant'],
        correct: [2, 3],
        indice: 'Deux réponses complémentaires : alerter, et passer par une demande écrite.',
        bravo: "Exact, et vous avez raison de me le rappeler. Le rythme est contractuel. Toute modification passe par une demande écrite au pôle alternance, une semaine avant au minimum.",
        retenir: "Rythme d'alternance : contractuel. Modification = demande écrite au pôle alternance ≥ 1 semaine avant.",
      },
      {
        type: 'vf',
        enonce: "Sans contrat d'objectif signé, votre tuteur école peut quand même défendre facilement votre situation si vos missions ne correspondent pas à ce qui était prévu.",
        correct: false,
        indice: 'Sans document signé, c’est parole contre parole.',
        bravo: "Faux. Sans contrat d'objectif signé, c'est parole contre parole. Avec le document signé par toutes les parties, votre tuteur école dispose d'une base officielle.",
        retenir: "Le contrat d'objectif signé me protège : sans lui, c'est parole contre parole.",
      },
    ],
    fin: "On est d'accord sur les règles du jeu. Dernière étape pour vous : l'espace d'accompagnement de l'école. La porte est au fond, à droite.",
  },

  // --------------------------------------------------------- ACCOMPAGNEMENT
  {
    id: 'helene', nom: 'Hélène', role: 'Votre tutrice école', lieu: 'accompagnement',
    voix: 'Vindemiatrix', ton: 'douce, posée, rassurante',
    look: { peau: '#f1cdb0', cheveux: '#3b2a22', coiffure: 'carre', tenue: '#00a3c4', bas: '#2a2a33', lunettes: true, carrure: 'f', style: 'pull', col: 'v', chemise: '#ffffff', iris: '#6a5330', taille: 0.985 },
    accueil: "Bonjour, prenez place. Je suis Hélène, votre tutrice école. Mon rôle, c'est de suivre votre intégration et de faire le lien avec l'entreprise si besoin. Tout ce que vous me dites reste entre nous.",
    questions: [
      { q: 'À quoi sert la rencontre avec le tuteur école ?', r: "C'est un rendez-vous confidentiel entre vous et moi. Votre tuteur en entreprise n'y assiste pas et n'a pas accès au compte rendu. C'est l'occasion de signaler une difficulté sans pression et de vérifier que vos missions correspondent à ce qui était prévu." },
      { q: 'Comment se passent les visites en entreprise ?', r: "Il y a deux visites à trois dans l'année : vous, votre tuteur entreprise et moi. La première avant le vingt-huit février, la seconde avant le trente août, chacune avec une évaluation de l'entreprise. En dernière année, la note d'entreprise est obligatoire pour valider le diplôme." },
      { q: 'Et si je suis témoin ou victime de harcèlement ?', r: "Aucune atteinte à l'intégrité physique ou psychique n'est tolérée : menace, violence, harcèlement, discrimination. Dans ce cas, pas d'étapes intermédiaires : vous alertez sans attendre votre référente au C F A et le pôle alternance. Vous n'êtes jamais seul." },
    ],
    defi: "Voyons ensemble comment réagir quand les choses se compliquent.",
    epreuves: [
      {
        type: 'ordre',
        enonce: "Le dialogue est rompu avec votre tuteur entreprise depuis plusieurs semaines. Dans quel ordre activer vos recours ?",
        options: ['Saisir le pôle alternance pour une médiation formelle', 'Tenter un dialogue direct et calme avec le tuteur entreprise', 'Alerter le tuteur école, en toute confidentialité'],
        correct: [1, 2, 0],
        indice: 'La règle d’or : du plus direct au plus formel.',
        bravo: "Oui, c'est l'escalade progressive : le dialogue direct d'abord, puis votre tuteur école en toute confidentialité, et enfin le pôle alternance pour une médiation.",
        retenir: 'Désaccord : dialogue direct → tuteur école (confidentiel) → pôle alternance. Harcèlement : CFA + pôle alternance, immédiatement.',
      },
      {
        type: 'choix',
        enonce: "Avant quelle date la première visite en entreprise et la première évaluation doivent-elles être signées ?",
        options: ['La mi-novembre', 'Le 28 février', 'Le 30 juin', 'Le 30 août'],
        correct: [1],
        indice: 'La mi-novembre concerne le contrat d’objectif, le 30 août la seconde visite.',
        bravo: "Le vingt-huit février, tout à fait. Si votre tuteur tarde, relancez-le activement. Gardez ce nombre en tête, vingt-huit : c'est le deuxième repère de votre badge.",
        retenir: 'Visites entreprise + évaluations : avant le 28 février, puis avant le 30 août. ★ Repère badge : 28.',
        repere: '28',
      },
      {
        type: 'vf',
        enonce: 'Votre tuteur en entreprise peut lire le compte rendu de votre rencontre avec votre tuteur école.',
        correct: false,
        indice: 'Cette rencontre est un espace de parole protégé.',
        bravo: "Faux, heureusement. Cette rencontre est confidentielle : le tuteur entreprise n'a pas accès au compte rendu.",
        retenir: 'La rencontre tuteur école est confidentielle.',
      },
    ],
    fin: "Vous savez maintenant vers qui vous tourner. Allez voir Yanis, du C F A, juste en face.",
  },
  {
    id: 'yanis', nom: 'Yanis', role: 'Conseiller du CFA', lieu: 'accompagnement',
    voix: 'Iapetus', ton: 'clair, concret, encourageant',
    look: { peau: '#a8714c', cheveux: '#1a1310', coiffure: 'court', tenue: '#3d4a2f', bas: '#24242b', carrure: 'm', style: 'pull', col: 'v', chemise: '#e8e4da', iris: '#33200f', volume: 0.045 },
    accueil: "Bonjour ! Yanis, du C F A, le centre de formation d'apprentis. Je m'occupe des questions administratives et financières de votre contrat, et je vous accompagne si le contrat s'arrête. Parlons-en avant que cela n'arrive.",
    questions: [
      { q: 'Quel est le rôle du CFA ?', r: "Le C F A gère le volet administratif et financier de votre contrat, la procédure en cas de rupture et le statut S F P. Chaque programme a sa référente, vous la trouverez dans votre carnet. Et bon à savoir : nous pouvons vous prêter un ordinateur portable." },
      { q: "C'est quoi, la période d'essai ?", r: "Ce sont les premiers jours du contrat, pendant lesquels vous comme l'employeur pouvez y mettre fin sans vous justifier. Attention, on compte les jours de présence effective en entreprise. Les semaines d'école, les arrêts maladie et les congés ne comptent pas." },
      { q: 'Que se passe-t-il si mon contrat est rompu ?', r: "Vous n'êtes pas seul : le pôle alternance et le C F A continuent de vous accompagner et vous transmettent des offres. Mais il faut se relancer tout de suite, car trouver un employeur en cours d'année est difficile. Et si vous restez sans contrat, on active le statut S F P pour que vous restiez couvert." },
    ],
    defi: "Dernière ligne droite. Trois questions, et vous aurez tout ce qu'il faut pour la borne.",
    epreuves: [
      {
        type: 'choix',
        enonce: "Quelle est la durée de la période d'essai en apprentissage ?",
        options: ['30 jours calendaires', '45 jours travaillés en entreprise', '2 mois', '3 mois'],
        correct: [1],
        indice: 'Ce sont des jours travaillés en entreprise, pas des jours calendaires.',
        bravo: "Quarante-cinq jours de présence effective en entreprise. Les semaines d'école ne comptent pas. Et voilà votre troisième repère pour le badge : quarante-cinq.",
        retenir: "Période d'essai : 45 jours de présence effective en entreprise. ★ Repère badge : 45.",
        repere: '45',
      },
      {
        type: 'vf',
        enonce: "En cas de rupture de contrat, le pôle alternance et le CFA cessent de vous accompagner dans votre recherche d'entreprise.",
        correct: false,
        indice: 'L’accompagnement ne s’arrête pas avec le contrat.',
        bravo: "Faux. Nous continuons à vous suivre et à vous transmettre des opportunités. À vous de relancer vos recherches sans attendre.",
        retenir: 'Rupture : le pôle alternance et le CFA continuent de m’accompagner.',
      },
      {
        type: 'multi',
        enonce: "Votre contrat est rompu en cours d'année. Quels sont les bons réflexes ? Plusieurs réponses.",
        options: ['Prévenir immédiatement le pôle alternance et le CFA', "Relancer ma recherche d'entreprise sans attendre", 'Attendre la rentrée suivante pour reprendre mes recherches', 'Activer le statut SFP auprès du CFA si je reste sans contrat'],
        correct: [0, 1, 3],
        indice: 'Trois réflexes : prévenir, chercher, sécuriser son statut.',
        bravo: "Prévenir, chercher, sécuriser : vous avez tout bon. Une rupture ne se gère jamais seul.",
        retenir: 'Rupture : je préviens le pôle alternance et le CFA, je relance ma recherche, j’active le statut SFP.',
      },
    ],
    fin: "Vous avez vos trois repères. Direction la borne, au fond de la pièce, pour activer votre badge. Bravo pour ce parcours !",
  },
];

// Borne finale : trois repères entendus pendant le parcours.
export const BORNE = {
  titre: "Borne d'activation du badge",
  consigne: 'Saisissez vos trois repères, dans l’ordre du parcours.',
  champs: [
    { label: "Délai, en heures, pour transmettre un arrêt de travail", reponse: '48', source: 'Inès' },
    { label: 'Jour limite de la 1re visite en entreprise, en février', reponse: '28', source: 'Hélène' },
    { label: "Jours de période d'essai, en présence effective", reponse: '45', source: 'Yanis' },
  ],
};

export const CALENDRIER = [
  { quand: 'À chaque cours', quoi: 'Émarger sur Edusign.', si: "Sans émargement : absence signalée à l'employeur." },
  { quand: 'Dès la rentrée, si sans contrat', quoi: 'Activer le statut SFP auprès du CFA (formulaire P2S).', si: 'Échéance : fin octobre en Bachelor, mi-novembre en PGE.' },
  { quand: 'Avant la mi-novembre', quoi: "Contrat d'objectif signé sur 1 Jeune 1 Alternance (3 signataires) et rencontre tuteur école (2 signataires).", si: 'Sans ces documents : pas de protection en cas de litige.' },
  { quand: 'Avant le 28 février', quoi: '1re visite entreprise signée par les 3 parties + 1re évaluation.', si: 'Relancer activement le tuteur en cas de retard.' },
  { quand: 'Avant le 30 août', quoi: '2e visite entreprise + 2e évaluation.', si: 'Note obligatoire pour valider le diplôme en dernière année.' },
];

export const ANNUAIRE = [
  { nom: 'Pôle alternance', role: '1er interlocuteur', quand: "Toute question liée à l'apprentissage.", email: 'apprentissage@imt-bs.eu', lieu: 'Bureau A08', prog: ['bachelor', 'pge'], prio: true },
  { nom: 'Typhaine MILLOT', role: 'CFA · référente Bachelor', quand: 'Administratif et financier, rupture, statut SFP.', prog: ['bachelor'] },
  { nom: 'Cassandra CAVARD', role: 'Coordinatrice Bachelor', quand: 'Suivi pédagogique, absences, justificatifs.', email: 'cassandra.cavard@imt-bs.eu', tel: '01 60 76 47 29', prog: ['bachelor'] },
  { nom: 'Adeline PUJOL', role: 'CFA · référente PGE', quand: 'Administratif et financier, rupture, statut SFP.', email: 'a.pujol@cfa-eve.fr', tel: '06 24 14 04 02', prog: ['pge'] },
  { nom: 'Sandrine MARLAND DELPIERRE', role: 'Coordinatrice PGE2', quand: 'Suivi pédagogique, absences, justificatifs.', email: 'sandrine-marland_delpierre@imt-bs.eu', tel: '01 60 76 42 44', prog: ['pge'] },
  { nom: 'Sandy ANTUNES', role: 'Coordinatrice PGE3 · MISI', quand: 'Suivi pédagogique, absences, justificatifs.', email: 'sandy.antunes@imt-bs.eu', tel: '01 60 76 42 24', prog: ['pge'] },
  { nom: 'Sao VANG', role: 'Coordinatrice PGE3 · MSET / DDDM / MEIA', quand: 'Suivi pédagogique, absences, justificatifs.', email: 'sao.vang@imt-bs.eu', tel: '01 60 76 46 22', prog: ['pge'] },
  { nom: 'Nawel HERIZI', role: 'Coordinatrice PGE3 · BDIAT', quand: 'Suivi pédagogique, absences, justificatifs.', email: 'nawel.herizi@imt-bs.eu', tel: '01 60 76 47 53', prog: ['pge'] },
  { nom: 'Elodie DARRAC', role: 'Référente handicap', quand: 'Accompagnement individualisé des apprenti·es en situation de handicap.', email: 'e.darrac@cfa-eve.fr', tel: '01 60 79 54 00', prog: ['bachelor', 'pge'] },
  { nom: "Pôle de coordination pédagogique et d'accompagnement étudiant", role: 'Soutien étudiant', quand: 'Difficultés financières, personnelles, de santé.', email: 'accompagnement@imt-bs.eu', prog: ['bachelor', 'pge'] },
  { nom: 'Audrey GALLINEAU', role: 'Infirmière · pôle médical', quand: 'Questions de santé sur le campus.', email: 'audrey.gallineau@imtbs-tsp.eu', tel: '01 60 76 43 73', prog: ['bachelor', 'pge'] },
  { nom: 'Tuteur ou tutrice école', role: 'Référent pédagogique individuel', quand: 'Suivi, rencontres confidentielles, médiation avec l’entreprise. Contact par mail.', prog: ['bachelor', 'pge'] },
];

export const BONS_A_SAVOIR = [
  'Vous vous formez gratuitement, vous êtes rémunéré·e et vous bénéficiez d’un double suivi (tuteur école + tuteur entreprise).',
  '2,5 jours de congés payés par mois travaillé + 5 jours de congé de révision sur la durée du contrat.',
  'Le CFA peut vous prêter un PC portable : j.louchart@cfa-eve.fr.',
  'Carte d’étudiant des métiers : à demander au pôle alternance.',
  'Avantages de l’entreprise (restauration, transport, culture) : renseignez-vous auprès de votre employeur.',
];

// Répliques génériques en cas d'erreur (voix du personnage).
export const RELANCES = [
  "Pas tout à fait. Prenez le temps de relire, vous pouvez réessayer.",
  "Ce n'est pas encore ça. Je vous donne un indice.",
];

// Liste à plat de toutes les répliques à vocaliser : { id, perso, voix, ton, texte }.
export function repliques() {
  const out = [];
  for (const p of PERSONNAGES) {
    const add = (suffixe, texte) => out.push({ id: `${p.id}_${suffixe}`, perso: p.id, voix: p.voix, ton: p.ton, texte });
    add('accueil', p.accueil);
    p.questions.forEach((q, i) => add(`q${i + 1}`, q.r));
    add('defi', p.defi);
    p.epreuves.forEach((e, i) => add(`e${i + 1}`, e.bravo));
    RELANCES.forEach((t, i) => add(`non${i + 1}`, t));
    add('fin', p.fin);
  }
  return out;
}
