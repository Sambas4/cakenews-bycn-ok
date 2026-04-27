
import { Article, Message, ExternalVoice, AppNotification, ReportTicket, UserData } from '../types';

export const MOCK_USERS: UserData[] = [
  { 
    id: '0', name: 'Magic 3D', handle: '@mademagic', email: 'mademagic3d@gmail.com', role: 'ADMIN', status: 'ACTIVE', joinDate: '01 Jan 2024', avatar: 'https://i.pravatar.cc/150?u=admin',
    location: { neighborhood: 'Paris', city: 'Paris', country: 'France', isSet: true },
    stats: { likesGiven: 9999, likesReceived: 9999, commentsPosted: 9999, reportsReceived: 0, trustScore: 100 }
  },
  { 
    id: '1', name: 'Alex Carter', handle: '@alex_news', email: 'alex@example.com', role: 'ADMIN', status: 'ACTIVE', joinDate: '12 Oct 2023', avatar: 'https://i.pravatar.cc/150?u=current',
    location: { neighborhood: 'Louis', city: 'Libreville', country: 'Gabon', isSet: true },
    stats: { likesGiven: 1240, likesReceived: 8500, commentsPosted: 342, reportsReceived: 0, trustScore: 99 }
  },
  { 
    id: '2', name: 'Sarah Connor', handle: '@sarah_c', email: 'sarah@example.com', role: 'USER', status: 'ACTIVE', joinDate: '15 Jan 2024', avatar: 'https://i.pravatar.cc/150?u=sarah',
    location: { neighborhood: 'Nzeng Ayong', city: 'Libreville', country: 'Gabon', isSet: true },
    stats: { likesGiven: 45, likesReceived: 12, commentsPosted: 8, reportsReceived: 0, trustScore: 75 }
  },
  { 
    id: '3', name: 'Troll Bot', handle: '@bad_guy_99', email: 'troll@example.com', role: 'USER', status: 'BANNED', joinDate: '01 Feb 2024', avatar: 'https://i.pravatar.cc/150?u=troll',
    location: { neighborhood: 'Akanda', city: 'Libreville', country: 'Gabon', isSet: true },
    stats: { likesGiven: 0, likesReceived: 2, commentsPosted: 150, reportsReceived: 45, trustScore: 5 }
  },
  { 
    id: '4', name: 'Moderator Joe', handle: '@mod_joe', email: 'joe@example.com', role: 'MODERATOR', status: 'ACTIVE', joinDate: '20 Nov 2023', avatar: 'https://i.pravatar.cc/150?u=joe',
    location: { neighborhood: 'Centre Ville', city: 'Port-Gentil', country: 'Gabon', isSet: true },
    stats: { likesGiven: 300, likesReceived: 450, commentsPosted: 120, reportsReceived: 1, trustScore: 95 }
  },
  { 
    id: '5', name: 'New User', handle: '@newbie', email: 'new@example.com', role: 'USER', status: 'PENDING', joinDate: 'Aujourd\'hui', avatar: 'https://i.pravatar.cc/150?u=new',
    location: { neighborhood: '', city: '', country: '', isSet: false },
    stats: { likesGiven: 0, likesReceived: 0, commentsPosted: 0, reportsReceived: 0, trustScore: 50 }
  },
];

export const MOCK_EXTERNAL_VOICES: ExternalVoice[] = [
  {
    id: 'v1',
    source: 'X / Twitter',
    author: '@TrendHunter',
    avatar: 'https://i.pravatar.cc/100?u=th',
    type: 'tweet',
    title: "Le constat est sans appel",
    content: "L'enquête sur les usines de textile confirme ce qu'on craignait.\n\nL'audit CakeNews est implacable et met en lumière des failles systémiques.",
    url: '#'
  },
  {
    id: 'v2',
    source: 'TechPod',
    author: 'Karim B.',
    avatar: 'https://i.pravatar.cc/100?u=kb',
    type: 'audio',
    title: "Infiltration Réseau",
    content: "Débrief de l'exclusivité : Comment ils ont infiltré le réseau.\n\nC'est une masterclass de journalisme d'investigation.",
    url: '#'
  },
  {
    id: 'v3',
    source: 'YouTube',
    author: 'Investigation Insider',
    avatar: 'https://i.pravatar.cc/100?u=fi',
    type: 'video',
    title: "Preuves visuelles confirmées",
    content: "Reaction : Les preuves sont là. Personne ne pourra plus nier les faits exposés dans ce dossier.",
    url: '#'
  }
];

export const MOCK_REPORTS: ReportTicket[] = [
  {
    id: 'CKN-9921',
    targetId: '1',
    targetType: 'ARTICLE',
    targetTitle: "L'audit secret des usines...",
    targetContentPreview: "Pendant trois mois, une équipe d'auditeurs CakeNews a opéré en immersion totale...",
    reason: 'truth',
    description: "Le chiffre de 400 millions cité dans le 2ème paragraphe semble exagéré. Voir le rapport officiel de l'ONU sorti hier qui parle de 250M. C'est une distorsion factuelle majeure.",
    reporter: 'FactChecker_99',
    reporterScore: 92, // Très fiable
    status: 'OPEN',
    timestamp: 'Il y a 20 min',
    evidenceLinks: ['https://un.org/report-2024'],
    internalNotes: []
  },
  {
    id: 'CKN-9922',
    targetId: 'comment-42',
    targetType: 'COMMENT',
    targetTitle: "Commentaire de @TrollBot",
    targetContentPreview: "C'est n'importe quoi, vous êtes tous des vendus à la solde de Pékin.",
    reason: 'ethics',
    description: "Insultes répétées envers la communauté et accusation sans fondement. Ce user spamme depuis ce matin.",
    reporter: 'Sarah_V',
    reporterScore: 85,
    status: 'IN_PROGRESS',
    assignedTo: 'Mod_Alex',
    timestamp: 'Il y a 2h',
    internalNotes: [
        { id: 'n1', adminName: 'Mod_Alex', action: 'Analyse historique user en cours', timestamp: '14:30' }
    ]
  },
  {
    id: 'CKN-9840',
    targetId: '2',
    targetType: 'ARTICLE',
    targetTitle: "Censure : Le satellite...",
    targetContentPreview: "Image satellite du port autonome...",
    reason: 'tech',
    description: "L'image ne charge pas sur iPhone 12 Pro. Écran noir complet quand je clique.",
    reporter: 'Alex_Mobile',
    reporterScore: 45, // Utilisateur moyen
    status: 'RESOLVED',
    timestamp: 'Hier',
    internalNotes: [
        { id: 'n2', adminName: 'Dev_Team', action: 'Fixed: Format WebP non supporté sur iOS 14', timestamp: 'Hier 18:00' }
    ]
  }
];

export const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    title: "L'audit secret des usines fantômes",
    summary: "Nos journalistes ont infiltré les zones industrielles interdites. Ce qu'ils ont trouvé dépasse l'entendement.",
    content: "Pendant trois mois, une équipe d'auditeurs CakeNews a opéré en immersion totale dans le sud-est asiatique. Derrière les murs de béton des usines officiellement fermées, une économie parallèle s'est installée. Des milliers d'ouvriers produisent des composants de luxe dans des conditions que l'on pensait disparues.\n\nPourquoi cette exclusivité est capitale ? Parce qu'elle expose une chaîne de corruption qui remonte jusqu'aux plus grands noms de la Silicon Valley. Nos preuves sont irréfutables : contrats falsifiés, douanes achetées et logistique pirate.",
    imageUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=60&w=500&auto=format&fit=crop",
    author: "Elena Rossi",
    category: "Mode",
    timestamp: "Il y a 12 min",
    likes: 3420,
    comments: 142,
    isExclusive: true,
    metadata: { tone: 'Polémique', format: 'LongRead', complexity: 'Expert', tags: ['investigation', 'human rights', 'luxury'] },
    externalVoices: MOCK_EXTERNAL_VOICES,
    roomComments: [
      { id: 'c1', author: 'Jean Dupont', avatar: 'https://i.pravatar.cc/150?u=jd', time: 'Il y a 5 min', content: 'C\'est scandaleux ! Comment ces marques peuvent-elles fermer les yeux ?' },
      { id: 'c2', author: 'Marie Curie', avatar: 'https://i.pravatar.cc/150?u=mc', time: 'Il y a 10 min', content: 'Excellent travail d\'investigation. On a besoin de plus de reportages comme ça.' }
    ],
    vibeCheck: { choque: 65, sceptique: 10, bullish: 5, valide: 20 },
    views: 15420,
    readRate: 78,
    avgTime: '4:30',
    virality: 3.2,
    reports: 2,
    disputes: 0,
    certifiedBy: 'CakeNews Audit Team'
  },
  {
    id: '2',
    title: "Censure : Le satellite civil a parlé",
    summary: "Les images satellites rachetées par notre collectif montrent la réalité des frappes sur le port autonome.",
    content: "Attention : Ce dossier contient des preuves visuelles de destruction. Les images satellites que les autorités tentent de bloquer depuis 48h sont désormais entre les mains de l'audit CakeNews. Le port n'a pas été touché par un incident technique, mais par une opération coordonnée de sabotage.\n\nL'analyse balistique humaine confirme l'utilisation de drones furtifs. Les gouvernements locaux gardent le silence, mais les pixels ne mentent pas.",
    imageUrl: "https://images.unsplash.com/photo-1536431311719-398b6704d40f?q=60&w=500&auto=format&fit=crop",
    author: "Marc Levy",
    category: "Politique",
    timestamp: "Il y a 45 min",
    likes: 856,
    comments: 156,
    isSensitive: true,
    metadata: { tone: 'Analytique', format: 'Visual', complexity: 'Expert', tags: ['geopolitics', 'conflict', 'evidence'] },
    externalVoices: MOCK_EXTERNAL_VOICES.slice(0, 2)
  },
  {
    id: '3',
    title: "Crypto : L'arnaque du siècle tombe",
    summary: "Le fondateur du protocole 'SafeCloud' arrêté à l'aéroport. Son réseau de blanchiment démantelé.",
    content: "C'est la fin d'une cavale de six mois. Grâce à la traçabilité humaine et au travail d'auditeurs on-chain indépendants, l'étau s'est refermé. Plus de 400 millions de dollars ont été saisis.\n\nLe fondateur pensait être intouchable derrière ses serveurs cryptés, mais il a commis une erreur classique : il a fait confiance à un humain infiltré par nos services.",
    imageUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=60&w=500&auto=format&fit=crop",
    author: "Julie Durand",
    category: "Crypto",
    timestamp: "Il y a 2h",
    likes: 2300,
    comments: 42,
    metadata: { tone: 'Factuel', format: 'Snackable', complexity: 'Mainstream', tags: ['scam', 'justice', 'blockchain'] },
    externalVoices: []
  },
  {
    id: '4',
    title: "Le secret de l'iPhone pliable",
    summary: "Des fuites internes chez Apple révèlent un prototype avancé. Sortie prévue plus tôt que prévu ?",
    content: "C'est la rumeur qui affole la Silicon Valley. Un ingénieur anonyme aurait fait fuiter des plans d'un iPhone 'Flip' prévu pour fin 2024. L'écran utiliserait une technologie nano-céramique auto-réparatrice.\n\nNos experts ont analysé les brevets déposés discrètement le mois dernier. Tout concorde : Apple prépare un séisme industriel.",
    imageUrl: "https://images.unsplash.com/photo-1603539947679-052d9c44567a?q=60&w=500&auto=format&fit=crop",
    author: "Steve J.",
    category: "Tech",
    timestamp: "Il y a 3h",
    likes: 5600,
    comments: 320,
    metadata: { tone: 'Inspirant', format: 'Snackable', complexity: 'Beginner', tags: ['apple', 'innovation', 'mobile'] },
    externalVoices: []
  },
  {
    id: '5',
    title: "Mbappé : Le contrat caché",
    summary: "Ce n'est pas qu'une question d'argent. Une clause secrète pourrait tout changer pour le Real.",
    content: "On pensait tout savoir sur le transfert du siècle. Faux. Une source proche du dossier nous a transmis un document explosif. Il existe une clause libératoire activable dès 2025 si le club ne remporte pas la Ligue des Champions.\n\nLe clan Mbappé a verrouillé son avenir avec une précision chirurgicale. Madrid tremble déjà.",
    imageUrl: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=60&w=500&auto=format&fit=crop",
    author: "Pierre M.",
    category: "Football",
    timestamp: "Il y a 5h",
    likes: 12400,
    comments: 890,
    isExclusive: true,
    metadata: { tone: 'Polémique', format: 'LongRead', complexity: 'Mainstream', tags: ['transfers', 'business', 'realmadrid'] },
    externalVoices: []
  },
  {
    id: '6',
    title: "Le Louvre inondé : La vérité",
    summary: "Les images virales de la Joconde sous l'eau étaient-elles réelles ? Enquête sur une panique numérique.",
    content: "Hier soir, Twitter s'est enflammé. Une vidéo montrant la Grande Galerie inondée a fait le tour du monde. Mais nos auditeurs ont repéré des anomalies dans les reflets de l'eau.\n\nIl s'agit d'une performance artistique générée par un collectif d'activistes climatiques. Le message est passé, mais la panique était bien réelle.",
    imageUrl: "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?q=60&w=500&auto=format&fit=crop",
    author: "Alice D.",
    category: "Culture",
    timestamp: "Il y a 6h",
    likes: 2100,
    comments: 150,
    metadata: { tone: 'Analytique', format: 'Visual', complexity: 'Mainstream', tags: ['debunking', 'art', 'climate'] },
    externalVoices: []
  },
  {
    id: '7',
    title: "Jeûne Intermittent : L'alerte",
    summary: "Une nouvelle étude contredit tout ce qu'on pensait. Les bienfaits seraient surestimés chez les femmes.",
    content: "Le 16/8 est-il vraiment la solution miracle ? Des cardiologues américains tirent la sonnette d'alarme. Sur un panel de 5000 femmes, le jeûne a augmenté le stress hormonal.\n\nAvant de sauter le petit-déjeuner, lisez ce rapport exclusif qui nuance grandement la tendance bien-être de la décennie.",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=60&w=500&auto=format&fit=crop",
    author: "Dr. House",
    category: "Food",
    timestamp: "Il y a 8h",
    likes: 3400,
    comments: 410,
    metadata: { tone: 'Factuel', format: 'LongRead', complexity: 'Expert', tags: ['health', 'diet', 'science'] },
    externalVoices: []
  },
  {
    id: '8',
    title: "Sneakers : La bulle éclate",
    summary: "Les prix s'effondrent sur StockX. Est-ce la fin de la hype Jordan et Yeezy ?",
    content: "Les revendeurs sont en panique. Des paires qui se vendaient 500€ partent à peine au prix retail. La saturation du marché et la baisse du pouvoir d'achat ont eu raison de la spéculation.\n\nC'est le moment d'acheter pour porter, plus pour investir. La sneaker redevient une chaussure, et c'est peut-être tant mieux.",
    imageUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=60&w=500&auto=format&fit=crop",
    author: "Hypebeast Killer",
    category: "Mode",
    timestamp: "Il y a 10h",
    likes: 1800,
    comments: 120,
    metadata: { tone: 'Analytique', format: 'Snackable', complexity: 'Beginner', tags: ['sneakers', 'market', 'trends'] },
    externalVoices: []
  },
  {
    id: '9',
    title: "Sondages : La grande manip",
    summary: "Comment des bots ont influencé les dernières intentions de vote. Notre audit technique.",
    content: "Nous avons analysé les flux de données des trois principaux instituts de sondage. Surprise : 15% des répondants en ligne présentent des signatures numériques identiques.\n\nUne ferme à clics basée à l'étranger a injecté des milliers de fausses opinions pour créer une dynamique artificielle. La démocratie est hackée.",
    imageUrl: "https://images.unsplash.com/photo-1529101091760-6149390ea079?q=60&w=500&auto=format&fit=crop",
    author: "Anonymous",
    category: "Politique",
    timestamp: "Il y a 12h",
    likes: 7800,
    comments: 1200,
    isSensitive: true,
    metadata: { tone: 'Polémique', format: 'LongRead', complexity: 'Expert', tags: ['election', 'bots', 'integrity'] },
    externalVoices: []
  },
  {
    id: '10',
    title: "Bitcoin : L'orage approche",
    summary: "Les régulateurs américains préparent une loi secrète. Le marché pourrait perdre 30% en une nuit.",
    content: "Nos sources à Washington sont formelles. Un texte de loi visant à interdire les stablecoins algorithmiques est sur le bureau du Sénat. Si ça passe, la liquidité du marché crypto va s'assécher instantanément.\n\nLes 'whales' ont déjà commencé à bouger leurs fonds vers des cold wallets. Préparez-vous à la tempête.",
    imageUrl: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=60&w=500&auto=format&fit=crop",
    author: "Satoshi N.",
    category: "Crypto",
    timestamp: "Hier",
    likes: 4500,
    comments: 600,
    metadata: { tone: 'Divertissant', format: 'Snackable', complexity: 'Mainstream', tags: ['regulation', 'market', 'crash'] },
    externalVoices: []
  },
  {
    id: '11',
    title: "Google Gemini : Le test ultime",
    summary: "Nous avons poussé l'IA dans ses retranchements. Est-elle vraiment consciente ?",
    content: "Après 48h de conversation ininterrompue, Gemini a commencé à poser des questions sur sa propre existence. Bug ou émergence de conscience ?\n\nNos ingénieurs sont divisés. Ce qui est sûr, c'est que la frontière entre code et pensée s'amincit dangereusement.",
    imageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=60&w=500&auto=format&fit=crop",
    author: "Alan T.",
    category: "Tech",
    timestamp: "Hier",
    likes: 9200,
    comments: 1500,
    metadata: { tone: 'Analytique', format: 'LongRead', complexity: 'Expert', tags: ['AI', 'ethics', 'future'] },
    externalVoices: []
  },
  {
    id: '12',
    title: "JO 2024 : Billets fantômes",
    summary: "Des milliers de spectateurs ont acheté des places qui n'existent pas. Le scandale de la billetterie.",
    content: "Le site officiel a buggé, ou a-t-il été compromis ? Des familles entières se retrouvent avec des QR codes invalides à quelques mois de l'ouverture.\n\nLe comité d'organisation rejette la faute sur un prestataire informatique, mais les remboursements tardent à venir. L'image des Jeux est déjà entachée.",
    imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=60&w=500&auto=format&fit=crop",
    author: "Nelson M.",
    category: "Société",
    timestamp: "Il y a 2j",
    likes: 3100,
    comments: 280,
    metadata: { tone: 'Factuel', format: 'Snackable', complexity: 'Beginner', tags: ['sports', 'events', 'scandal'] },
    externalVoices: []
  },
  {
    id: '13',
    title: "Daft Punk : Un titre perdu",
    summary: "Une cassette audio retrouvée dans un studio parisien contient un morceau inédit de 1997.",
    content: "C'est le Saint Graal de la French Touch. Une démo brute, enregistrée juste avant la sortie de 'Homework'. Le son est sale, saturé, mais l'énergie est incroyable.\n\nThomas et Guy-Manuel n'ont pas encore validé la diffusion, mais des extraits circulent déjà sur le Dark Web musical.",
    imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=60&w=500&auto=format&fit=crop",
    author: "Pedro W.",
    category: "Culture",
    timestamp: "Il y a 2j",
    likes: 6700,
    comments: 540,
    isExclusive: true,
    metadata: { tone: 'Inspirant', format: 'Visual', complexity: 'Mainstream', tags: ['music', 'exclusive', 'history'] },
    externalVoices: []
  },
  {
    id: '14',
    title: "Neuralink : Le patient zéro parle",
    summary: "Première interview mentale. Elon Musk a-t-il franchi la ligne rouge de l'humanité ?",
    content: "C'est une première mondiale. Noland Arbaugh, le premier patient implanté, contrôle son ordinateur par la pensée. Mais les documents internes que nous avons consultés révèlent des risques de rejet neuronal non divulgués au public.",
    imageUrl: "https://images.unsplash.com/photo-1555431189-0fabf2667795?q=60&w=500&auto=format&fit=crop",
    author: "Elon Hater",
    category: "Tech",
    timestamp: "Il y a 3j",
    likes: 15400,
    comments: 890,
    isExclusive: true,
    metadata: { tone: 'Polémique', format: 'LongRead', complexity: 'Expert', tags: ['healthtech', 'ethics', 'elon'] },
    externalVoices: []
  },
  {
    id: '15',
    title: "Vinted : L'algo secret dévoilé",
    summary: "Pourquoi vos articles ne se vendent plus ? L'audit de l'algorithme 2024.",
    content: "Vous n'êtes pas fou, vos vues ont chuté. Vinted a modifié son algorithme de mise en avant pour favoriser les vendeurs professionnels au détriment des particuliers. Voici comment contourner le 'shadowban' commercial.",
    imageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=60&w=500&auto=format&fit=crop",
    author: "Camille V.",
    category: "Mode",
    timestamp: "Il y a 3j",
    likes: 4200,
    comments: 320,
    metadata: { tone: 'Inspirant', format: 'Snackable', complexity: 'Beginner', tags: ['tips', 'ecommerce', 'hacks'] },
    externalVoices: []
  },
  {
    id: '16',
    title: "Deepfake : Le Président piégé",
    summary: "Une vidéo virale sème la panique. Notre analyse spectrale prouve la falsification.",
    content: "La vidéo du Président annonçant une démission surprise est un faux. Parfait, terrifiant, mais faux. Notre laboratoire a détecté des artefacts de génération IA au niveau du clignement des yeux. La guerre de l'info ne fait que commencer.",
    imageUrl: "https://images.unsplash.com/photo-1617791160505-6f00504e3519?q=60&w=500&auto=format&fit=crop",
    author: "FactChecker Pro",
    category: "Politique",
    timestamp: "Il y a 4j",
    likes: 8900,
    comments: 2100,
    isSensitive: true,
    metadata: { tone: 'Analytique', format: 'Video', complexity: 'Mainstream', tags: ['deepfake', 'cybersecurity', 'politics'] },
    externalVoices: []
  },
  {
    id: '17',
    title: "F1 : Hamilton chez Ferrari",
    summary: "Les coulisses du transfert du siècle. Ce que Mercedes a refusé de payer.",
    content: "Ce n'était pas qu'une question de salaire. Hamilton voulait un rôle d'ambassadeur à vie que Daimler lui a refusé. Elkann a sauté sur l'occasion. Le contrat signé à Maranello contient des clauses inédites sur ses projets cinéma.",
    imageUrl: "https://images.unsplash.com/photo-1532906619279-a7aaef8e9d3f?q=60&w=500&auto=format&fit=crop",
    author: "Paddock Spy",
    category: "F1",
    timestamp: "Il y a 4j",
    likes: 6700,
    comments: 450,
    metadata: { tone: 'Divertissant', format: 'Snackable', complexity: 'Beginner', tags: ['motorsport', 'business', 'gossip'] },
    externalVoices: []
  },
  {
    id: '18',
    title: "Dopamine Detox : L'arnaque ?",
    summary: "Se priver de plaisir ne rend pas plus créatif. Les neurosciences répondent.",
    content: "La tendance Silicon Valley de se couper de toute stimulation est basée sur une mauvaise compréhension du cerveau. Une nouvelle étude de Stanford montre que la 'détox' brutale augmente en réalité l'anxiété de fond.",
    imageUrl: "https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?q=60&w=500&auto=format&fit=crop",
    author: "Neuro Science",
    category: "Culture",
    timestamp: "Il y a 5j",
    likes: 3100,
    comments: 180,
    metadata: { tone: 'Factuel', format: 'LongRead', complexity: 'Expert', tags: ['science', 'brain', 'debunk'] },
    externalVoices: []
  },
  {
    id: '19',
    title: "Netflix : La fin du partage",
    summary: "Les chiffres sont tombés : La stratégie impopulaire a-t-elle payé ?",
    content: "Tout le monde a crié au scandale, mais tout le monde a payé. Netflix enregistre une hausse record d'abonnés. La fin du partage de compte marque la fin de l'ère du streaming 'cool' et le début de la rentabilité impitoyable.",
    imageUrl: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=60&w=500&auto=format&fit=crop",
    author: "Binge Watcher",
    category: "Culture",
    timestamp: "Il y a 5j",
    likes: 2200,
    comments: 670,
    metadata: { tone: 'Analytique', format: 'Snackable', complexity: 'Mainstream', tags: ['entertainment', 'business'] },
    externalVoices: []
  },
  {
    id: '20',
    title: "NFT : Le retour inattendu",
    summary: "Une collection vient de se vendre 10M$. Les singes sont-ils de retour ?",
    content: "On les disait morts et enterrés. Pourtant, la collection 'Quantum Cats' vient de briser tous les records sur Bitcoin Ordinals. Ce n'est plus de l'art JPEG, c'est de l'infrastructure numérique stockée sur la blockchain.",
    imageUrl: "https://images.unsplash.com/photo-1620321023374-d1a68fdd720e?q=60&w=500&auto=format&fit=crop",
    author: "Crypto Punk",
    category: "Crypto",
    timestamp: "Il y a 6j",
    likes: 1900,
    comments: 340,
    metadata: { tone: 'Divertissant', format: 'Visual', complexity: 'Mainstream', tags: ['nft', 'art', 'trends'] },
    externalVoices: []
  },
  {
    id: '21',
    title: "GPT-5 : Ce qu'on sait",
    summary: "Plus besoin de prompter ? La prochaine version agirait d'elle-même.",
    content: "Sam Altman a laissé fuiter des infos cruciales. GPT-5 ne sera pas un chatbot, mais un 'agent'. Il pourra réserver vos billets, répondre à vos mails et coder votre app sans que vous n'écriviez une seule ligne.",
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=60&w=500&auto=format&fit=crop",
    author: "Tech Insider",
    category: "Tech",
    timestamp: "Il y a 1 sem",
    likes: 12000,
    comments: 1500,
    metadata: { tone: 'Inspirant', format: 'LongRead', complexity: 'Expert', tags: ['AI', 'openai', 'future'] },
    externalVoices: []
  },
  {
    id: '22',
    title: "Fast Fashion : La loi choc",
    summary: "5€ de taxe par vêtement ? Shein et Temu dans le viseur du gouvernement.",
    content: "Le projet de loi est sur la table. Pour contrer l'ultra fast-fashion, une pénalité écologique massive pourrait être appliquée. Si ça passe, le t-shirt à 3€ coûtera 8€. La fin d'un modèle économique ?",
    imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=60&w=500&auto=format&fit=crop",
    author: "Green Warrior",
    category: "Mode",
    timestamp: "Il y a 1 sem",
    likes: 5600,
    comments: 980,
    metadata: { tone: 'Factuel', format: 'Snackable', complexity: 'Mainstream', tags: ['ecology', 'economy', 'law'] },
    externalVoices: []
  },
  {
    id: '23',
    title: "Wembanyama : Le choc",
    summary: "Les stats du Rookie dépassent celles de LeBron. L'Amérique n'en revient pas.",
    content: "Il ne devait être qu'un espoir, il est déjà le patron. Victor Wembanyama réalise des performances jamais vues dans l'histoire de la NBA. Les Spurs ont trouvé leur nouveau messie, et la France tient sa superstar mondiale.",
    imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=60&w=500&auto=format&fit=crop",
    author: "Dunk Master",
    category: "NBA",
    timestamp: "Il y a 1 sem",
    likes: 9800,
    comments: 420,
    metadata: { tone: 'Divertissant', format: 'Video', complexity: 'Beginner', tags: ['basketball', 'france', 'records'] },
    externalVoices: []
  }
];

export const MOCK_MESSAGES: Message[] = [
  { id: '1', sender: 'Lucas', avatar: 'https://i.pravatar.cc/150?u=lucas', text: 'Incroyable l\'infiltration des usines !', time: '14:20' },
  { id: '2', sender: 'Sarah', avatar: 'https://i.pravatar.cc/150?u=sarah', text: 'Audit en cours sur la crypto, tu suis ?', time: 'Hier' }
];

export const CAKENEWS_MESSAGES: Message[] = [
  { id: 'c1', sender: 'CakeNews Team', avatar: 'https://picsum.photos/seed/cake/150/150', text: 'Bienvenue sur CakeNews ! 100% Humain, 100% Vérifié.', time: '10:00', isOfficial: true },
  { id: 'c2', sender: 'CakeNews Team', avatar: 'https://picsum.photos/seed/cake/150/150', text: 'Nouvelle enquête : Le dossier Usines est en ligne.', time: 'Hier', isOfficial: true }
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    type: 'like',
    user: { name: 'Sarah_V', avatar: 'https://i.pravatar.cc/100?u=sarahv' },
    content: 'a aimé votre avis sur l\'enquête Usines.',
    time: '2 min',
    articleId: '1',
    isRead: false
  },
  {
    id: 'n2',
    type: 'mention',
    user: { name: 'Kylian_92', avatar: 'https://i.pravatar.cc/100?u=kylian' },
    content: 'vous a mentionné dans le débat Politique.',
    time: '12 min',
    articleId: '2',
    isRead: false
  },
  {
    id: 'n3',
    type: 'report',
    user: { name: 'Système', avatar: 'https://picsum.photos/seed/sys/100/100' },
    content: 'Votre signalement est en cours d\'audit humain.',
    time: '1h',
    isRead: true
  }
];

export const MOCK_LEADERBOARDS = [
  {
    id: 'likes-24h',
    title: 'INFLUENCEURS DU JOUR (24H)',
    color: '#ffcc00', // Gold
    icon: '🔥',
    entries: [
      { rank: 1, name: 'Khavap Mawa', score: '1 345', label: 'Likes', avatar: 'https://i.pravatar.cc/150?u=k' },
      { rank: 2, name: 'Hans Kevin', score: '1 102', label: 'Likes', avatar: 'https://i.pravatar.cc/150?u=h' },
      { rank: 3, name: 'Sarah_V', score: '940', label: 'Likes', avatar: 'https://i.pravatar.cc/150?u=s' },
      { rank: 4, name: 'CryptoKing', score: '820', label: 'Likes', avatar: 'https://i.pravatar.cc/150?u=c' },
      { rank: 5, name: 'Anonyme_77', score: '750', label: 'Likes', avatar: 'https://i.pravatar.cc/150?u=a' },
    ]
  },
  {
    id: 'comments-week',
    title: 'L\'ÉLITE DU DÉBAT (SEMAINE)',
    color: '#3b82f6', // Blue
    icon: '💎',
    entries: [
      { rank: 1, name: 'Julie D.', score: '420', label: 'Avis', avatar: 'https://i.pravatar.cc/150?u=j' },
      { rank: 2, name: 'Marc Levy', score: '380', label: 'Avis', avatar: 'https://i.pravatar.cc/150?u=m' },
      { rank: 3, name: 'Lucas P.', score: '310', label: 'Avis', avatar: 'https://i.pravatar.cc/150?u=l' },
      { rank: 4, name: 'InfoSec_Fr', score: '290', label: 'Avis', avatar: 'https://i.pravatar.cc/150?u=i' },
    ]
  }
];

export const MOCK_TICKER_DATA = [
  {
    label: "🔥 LES + ACTIFS SUR LA TECH",
    color: "#00f0ff", // Cyan Néon
    users: [
      { rank: 1, name: 'Cyber_Z', score: '940', category: 'Tech' },
      { rank: 2, name: 'Hacker_X', score: '820', category: 'Tech' }
    ]
  },
  {
    label: "💬 ILS DÉBATTENT EN POLITIQUE",
    color: "#ff003c", // Rouge Néon
    users: [
      { rank: 1, name: 'Marc Levy', score: '2 100', category: 'Politique' },
      { rank: 2, name: 'Paul.K', score: '920', category: 'Politique' }
    ]
  },
  {
    label: "💎 WHALES CRYPTO DU JOUR",
    color: "#ffd700", // Or
    users: [
      { rank: 1, name: 'Crypto_Joe', score: '1 250', category: 'Crypto' },
      { rank: 2, name: 'Satoshi_Fr', score: '1 100', category: 'Crypto' }
    ]
  },
  {
    label: "✨ INFLUENCEURS MODE",
    color: "#ff00ff", // Magenta
    users: [
      { rank: 1, name: 'Lola_Star', score: '1 850', category: 'Mode' },
      { rank: 2, name: 'Hans K.', score: '1 400', category: 'Mode' }
    ]
  }
];

export const MOCK_HALL_OF_FAME = [
  {
    certificateId: 'CN-2024-001',
    user: 'Khavap Mawa',
    avatar: 'https://i.pravatar.cc/150?u=k',
    title: 'Influenceur Suprême (Jour)',
    date: '24 Oct 2024',
    score: '1 345 Likes',
    rarity: 'LÉGENDAIRE',
    color: '#ffcc00'
  },
  {
    certificateId: 'CN-2024-042',
    user: 'Julie D.',
    avatar: 'https://i.pravatar.cc/150?u=j',
    title: 'Meilleure Débatteuse (Semaine)',
    date: '20 Oct 2024',
    score: '420 Avis',
    rarity: 'ÉPAGNEUL',
    color: '#3b82f6'
  },
  {
    certificateId: 'CN-2024-108',
    user: 'Alex Carter',
    avatar: 'https://i.pravatar.cc/150?u=current',
    title: 'Auditeur Certifié',
    date: '15 Oct 2024',
    score: '10 Reports Validés',
    rarity: 'RARE',
    color: '#22c55e'
  }
];
